import { formatVolumeLabel } from '@shared/catalog-display';
import { useEffect, useState } from 'react';
import type { Drink, OfficialOrderDraft, OfficialOrderHandoffResponse } from '@shared/contracts';
import { ArrowUpRight, Bookmark, Check, CheckCheck, ChevronRight, Copy, Leaf, LoaderCircle, MessageCircle, RefreshCw, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import TeaNameDIY from '@/components/TeaNameDIY';
import DrinkArtwork from '@/components/DrinkArtwork';
import TeaConfigurationDialog from '@/components/TeaConfigurationDialog';
import { formatConfiguredOrder, requestOfficialOrder } from '@/lib/order-handoff';

// Optional legacy fields are retained for saved cards from earlier versions.
export interface ITeaCardData {
  drinkId?: string;
  verified?: boolean;
  startingPrice?: boolean;
  catalogStatus?: Drink['catalogStatus'];
  catalogEvidence?: Drink['catalogEvidence'];
  drinkName: string;
  drinkNameEn: string;
  price: number;
  volume: string;
  sweetness: string;
  temperature: string;
  toppings: string;
  reason: string;
  message: string;
  funFact: string;
  isMain?: boolean;
  matchScore?: number;
  matchTags?: string[];
  orderPhrase?: string;
  orderPhraseEn?: string;
  customName?: string;
  customNameStyle?: 'elegant' | 'fun';
  youngTags?: string[];
}

interface TeaCardProps {
  data: ITeaCardData;
  onRefresh?: () => void;
  onAskMore?: () => void;
  onConfirm?: () => void;
  onNameChange?: (name: string, style: 'elegant' | 'fun') => void;
  /** Supply both props to share one configured draft between conversation and tea list. */
  configuredOrder?: OfficialOrderDraft;
  onConfigure?: (draft: OfficialOrderDraft) => void;
}

export function formatTeaOrder(data: ITeaCardData) {
  return [
    '极萃东方茉莉 · 选茶参考单',
    `饮品：${data.drinkName}${data.volume ? `（${formatVolumeLabel(data.volume)}）` : ''}`,
    `${data.startingPrice ? '参考起价' : '参考单价'}：¥${data.price}${data.startingPrice ? '起（随规格变动）' : ''}`,
    ...(data.catalogEvidence ? [`参考门店：${data.catalogEvidence.storeName}`] : []),
    `甜度：${data.sweetness || '待店员确认'}`,
    `温度：${data.temperature || '待店员确认'}`,
    `小料：${data.toppings || '不额外加料'}`,
    '请由店员确认价格、原料及可选规格。本茶单未提交门店订单。',
  ].join('\n');
}

function OfficialCheckoutDialog({ draft, onClose }: { draft: OfficialOrderDraft; onClose: () => void }) {
  const [response, setResponse] = useState<OfficialOrderHandoffResponse | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    requestOfficialOrder(draft).then((result) => { if (active) setResponse(result); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : '暂时无法打开官方下单，请稍后再试。'); });
    return () => { active = false; };
  }, [draft, attempt]);
  const pending = !response && !error;
  const copy = async () => {
    try { await navigator.clipboard.writeText(formatConfiguredOrder(draft)); toast.success('这份配置已复制'); } catch { toast.error('暂时无法复制，请长按配置文字复制'); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] border-0 bg-[#fbfcf5] p-6 sm:p-8">
      <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-[#eaf0df] text-[#5b7341]"><ShoppingBag strokeWidth={1.4} className="size-6" /></div>
      <DialogTitle className="font-serif text-2xl font-normal text-[#2c442e]">带上这份喜欢，去下单</DialogTitle>
      <DialogDescription className="text-xs leading-6 text-[#8b9879]">{response?.status === 'ready' ? '配置已准备好，前往官方小程序确认门店与订单。' : '你的口味已经配好，先为你留在这里。'}</DialogDescription>
      <div className="rounded-2xl border border-[#e3e9d7] bg-white p-5">
        <div className="flex items-start justify-between gap-3"><h3 className="font-serif text-xl text-[#2c442e]">{draft.drinkName}</h3><span className="rounded-full bg-[#eff3e6] px-2.5 py-1 text-xs text-[#6f8258]">× {draft.quantity}</span></div>
        <p className="mt-3 text-xs leading-6 text-[#7b8c65]">{draft.options.volume} · {draft.options.sweetness} · {draft.options.temperature}</p>
        <p className="mt-1 text-xs leading-6 text-[#7b8c65]">{draft.options.toppings}</p>
        {draft.storeName && <p className="mt-3 border-t border-[#edf0e5] pt-3 text-[10px] leading-5 text-[#8d997d]">{draft.storeName}</p>}
        {draft.note && <p className="mt-2 break-words text-xs leading-6 text-[#7b8c65]">备注：{draft.note}</p>}
      </div>
      <div role="status" aria-live="polite" className="rounded-2xl bg-[#eff2e6] px-4 py-3 text-xs leading-6 text-[#788b61]">
        {pending ? <span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />正在准备官方下单入口…</span> : error || (response?.status === 'unavailable' ? '官方小程序下单暂未开放，配置已保留，你可以先复制这份茶单。' : '最终规格、库存和金额请在官方小程序确认。')}
      </div>
      {response?.status === 'ready' ? <Button asChild className="h-12 rounded-full bg-[#2e4933] text-xs text-white hover:bg-[#405d3f]"><a href={response.url}>前往官方小程序<ArrowUpRight className="size-4" /></a></Button> : <Button onClick={copy} className="h-12 gap-2 rounded-full bg-[#2e4933] text-xs text-white hover:bg-[#405d3f]"><Copy className="size-4" />复制这份配置</Button>}
      {error && <Button variant="ghost" onClick={() => { setError(''); setResponse(null); setAttempt((value) => value + 1); }} className="h-10 text-xs text-[#78925b]">重新尝试</Button>}
      <p className="text-center text-[10px] text-[#a1ac91]">当前尚未提交订单</p>
    </DialogContent>
  </Dialog>;
}

function TeaCardContent({ data, onRefresh, onAskMore, onConfirm, onNameChange, configuredOrder, onConfigure }: TeaCardProps) {
  const [copied, setCopied] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [localOrder, setLocalOrder] = useState<OfficialOrderDraft>();
  const candidate = onConfigure ? configuredOrder : configuredOrder || localOrder;
  const draft = candidate?.drinkId === data.drinkId ? candidate : undefined;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft ? formatConfiguredOrder(draft) : formatTeaOrder(data));
      setCopied(true);
      toast.success(draft ? '这份配置已复制' : '参考茶单已复制');
    } catch { toast.error('浏览器不允许自动复制，请长按茶单文字复制'); }
  };
  const saveConfiguration = (value: OfficialOrderDraft) => {
    if (onConfigure) onConfigure(value); else setLocalOrder(value);
    setCopied(false);
  };
  const artCategory = /咖啡|拿铁|美式/.test(data.drinkName) ? '咖啡' : /奶|乳|芝士/.test(data.drinkName) ? '鲜奶茶' : /桃|柠檬|葡萄|橙|果|莓/.test(data.drinkName) ? '鲜果茶' : '纯茶原叶';
  return <>
    <article className={`overflow-hidden rounded-[24px] border ${data.isMain ? 'border-[#dfe7d2] bg-white shadow-[0_12px_40px_-25px_#253b2d40]' : 'border-[#e0e7d5] bg-[#f7f9f0]'}`}>
      <div className="flex min-h-[178px] gap-4 border-b border-[#e9eddf] bg-[#f4f7ec] p-5 sm:gap-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.14em] text-[#83966f]">{draft ? <CheckCheck strokeWidth={1.4} className="size-3.5" /> : <Leaf strokeWidth={1.4} className="size-3.5" />}{draft ? '按你的喜欢，配好了' : data.isMain ? '为你精选 / YOUR TEA' : '也许你也喜欢 / ALSO LOVELY'}</span>
          <h3 className="mt-3 break-words font-serif text-[25px] leading-snug text-[#253b2d]">{data.drinkName}</h3>
          {data.drinkNameEn && <p className="mt-1.5 text-[9px] tracking-wider text-[#9ba28d]">{data.drinkNameEn}</p>}
          {data.customName && <p className="mt-2 text-xs text-[#7d8d65]">我的昵称：{data.customName}</p>}
          <div className="mt-4 flex flex-wrap items-baseline gap-1.5"><span className="text-xs text-[#536847]">¥</span><span className="font-serif text-3xl leading-none text-[#253b2d]">{data.price}</span>{data.startingPrice && <span className="text-xs text-[#536847]">起</span>}<span className="ml-1 text-[9px] text-[#99a086]">{draft ? '原推荐参考价' : '参考单价'}</span></div>
        </div>
        <div className="w-[110px] shrink-0 sm:w-[135px]"><DrinkArtwork category={artCategory} name={data.drinkName} className="h-[140px] w-full rounded-[18px] sm:h-[156px]" /></div>
      </div>
      <div className="p-5 sm:p-6">
        {draft ? <div className="rounded-2xl border border-[#e4ead8] bg-[#f6f8ef] p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-[10px] tracking-wide text-[#799061]"><Check className="size-3" />我的专属配置</p><span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-[#6f8554]">{draft.quantity} 杯</span></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs"><div><dt className="mb-1 text-[9px] text-[#9ca58c]">杯型</dt><dd className="text-[#50653e]">{draft.options.volume}</dd></div><div><dt className="mb-1 text-[9px] text-[#9ca58c]">甜度偏好</dt><dd className="text-[#50653e]">{draft.options.sweetness}</dd></div><div><dt className="mb-1 text-[9px] text-[#9ca58c]">冰量 / 温度偏好</dt><dd className="text-[#50653e]">{draft.options.temperature}</dd></div><div><dt className="mb-1 text-[9px] text-[#9ca58c]">小料</dt><dd className="text-[#50653e]">{draft.options.toppings}</dd></div></dl>
          {draft.note && <p className="mt-3 break-words border-t border-[#e3e9d7] pt-3 text-[11px] leading-6 text-[#7e8f6b]">备注：{draft.note}</p>}
        </div> : <>
          <div className="flex flex-wrap gap-2">{[formatVolumeLabel(data.volume) || '杯型待确认', ...(data.matchTags || []).slice(0, 2)].map((tag, index) => <span key={`${tag}-${index}`} className="rounded-full bg-[#eef2e4] px-3 py-1.5 text-[10px] text-[#7c9062]">{tag}</span>)}</div>
          {data.reason && <p className="mt-4 text-xs leading-7 text-[#738160]">{data.reason}</p>}
        </>}
        {data.catalogEvidence && <p className="mt-3 text-[9px] leading-5 text-[#96a081]">{data.catalogEvidence.storeName}</p>}
        <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => draft ? setCheckoutOpen(true) : setConfiguring(true)} disabled={!data.drinkId} className="h-12 min-w-0 w-full gap-2 rounded-full sm:flex-1 bg-[#2e4933] px-4 text-xs text-[#fbfcf5] hover:bg-[#405d3f]">{draft ? <ShoppingBag strokeWidth={1.4} className="size-4" /> : <SlidersHorizontal strokeWidth={1.4} className="size-4" />}{draft ? '去官方小程序下单' : '配置这杯'}<ChevronRight strokeWidth={1.4} className="ml-auto size-4" /></Button>
          {draft && <Button variant="outline" onClick={() => setConfiguring(true)} className="h-11 shrink-0 rounded-full border-[#d9e2cb] sm:h-12 bg-transparent px-4 text-[11px] text-[#748a5b] hover:bg-[#e9efde]">调整配置</Button>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-0.5">
          <Button variant="ghost" onClick={copy} className="h-10 gap-1.5 rounded-full px-2.5 text-[10px] text-[#8c987b] hover:bg-[#e9efde]">{copied ? <Check strokeWidth={1.3} className="size-3.5" /> : <Copy strokeWidth={1.3} className="size-3.5" />}{copied ? '已复制' : '复制茶单'}</Button>
          {onConfirm && <Button variant="ghost" onClick={onConfirm} className="h-10 gap-1.5 rounded-full px-2.5 text-[10px] text-[#8c987b] hover:bg-[#e9efde]"><Bookmark strokeWidth={1.3} className="size-3.5" />收藏</Button>}
          {onRefresh && <Button variant="ghost" onClick={onRefresh} className="h-10 gap-1.5 rounded-full px-2.5 text-[10px] text-[#8c987b] hover:bg-[#e9efde]"><RefreshCw strokeWidth={1.3} className="size-3.5" />换一杯</Button>}
          {onAskMore && <Button variant="ghost" onClick={onAskMore} className="h-10 gap-1.5 rounded-full px-2.5 text-[10px] text-[#8c987b] hover:bg-[#e9efde]"><MessageCircle strokeWidth={1.3} className="size-3.5" />继续调整</Button>}
          {onNameChange && <TeaNameDIY drinkName={data.drinkName} currentName={data.customName} onApply={onNameChange} trigger={<Button variant="ghost" className="h-10 rounded-full px-2.5 text-[10px] text-[#8c987b]">给茶起昵称</Button>} />}
        </div>
        <p className="mt-2 text-[9px] leading-5 text-[#a0ac90]">{!data.drinkId ? '此茶单暂无法配置，请重新选一杯。' : draft ? '最终规格与价格以门店为准，当前尚未提交订单。' : '选好口味，再带着配置前往官方下单。'}</p>
      </div>
    </article>
    {configuring && <TeaConfigurationDialog open onOpenChange={setConfiguring} data={data} category={artCategory} initialDraft={draft} onSave={saveConfiguration} />}
    {checkoutOpen && draft && <OfficialCheckoutDialog key={JSON.stringify(draft)} draft={draft} onClose={() => setCheckoutOpen(false)} />}
  </>;
}

export default function TeaCard(props: TeaCardProps) {
  const { data } = props;
  // Reset temporary form and copy state when a recommendation changes its product or options.
  return <TeaCardContent key={JSON.stringify([data.drinkId, data.drinkName, data.volume, data.sweetness, data.temperature, data.toppings])} {...props} />;
}
