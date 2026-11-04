import { formatVolumeLabel } from '@shared/catalog-display';
import { useMemo, useState } from 'react';
import type { Drink, OfficialOrderDraft, Order, OrderItemInput } from '@shared/contracts';
import { Bookmark, Check, Copy, MessageCircle, RefreshCw, ShoppingBag, SlidersHorizontal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TeaNameDIY from '@/components/TeaNameDIY';
import DrinkArtwork from '@/components/DrinkArtwork';
import TeaConfigurationDialog from '@/components/TeaConfigurationDialog';
import OrderConfirmDialog from '@/components/order/OrderConfirmDialog';
import { formatConfiguredOrder } from '@/lib/order-handoff';

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
  /** Server-prefilled order line from the conversation (cups, sweetness, ice, add-ons). */
  proposal?: OrderItemInput;
  onRefresh?: () => void;
  onAskMore?: () => void;
  onConfirm?: () => void;
  onNameChange?: (name: string, style: 'elegant' | 'fun') => void;
  onOrdered?: (order: Order) => void;
  /** Supply both props to share one configured draft between conversation and tea list. */
  configuredOrder?: OfficialOrderDraft;
  onConfigure?: (draft: OfficialOrderDraft) => void;
  compact?: boolean;
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

const DEFAULTISH = /随门店|门店标准|按门店|待/;
/** A saved configuration (strings) becomes an order line; store defaults stay unspecified. */
export function draftToItem(draft: OfficialOrderDraft): OrderItemInput {
  const pick = (value: string) => DEFAULTISH.test(value) ? undefined : value;
  const toppings = draft.options.toppings.split(/[、,，]/).map((value) => value.trim()).filter((value) => value && !/^(?:不额外加料|未加料|无)$/.test(value));
  return { drinkId: draft.drinkId, quantity: draft.quantity, ...(pick(draft.options.volume) ? { volume: draft.options.volume } : {}), ...(pick(draft.options.sweetness) ? { sweetness: draft.options.sweetness } : {}), ...(pick(draft.options.temperature) ? { temperature: draft.options.temperature } : {}), toppings, ...(draft.note ? { note: draft.note } : {}) };
}
function proposalToDraft(data: ITeaCardData, proposal: OrderItemInput): OfficialOrderDraft {
  return { drinkId: proposal.drinkId, drinkName: data.drinkName, quantity: proposal.quantity, options: { volume: proposal.volume || '', sweetness: proposal.sweetness || '随门店标准', temperature: proposal.temperature || '随门店标准', toppings: proposal.toppings?.length ? proposal.toppings.join('、') : '不额外加料' }, ...(proposal.note ? { note: proposal.note } : {}) };
}

function TeaCardContent({ data, proposal, onRefresh, onAskMore, onConfirm, onNameChange, onOrdered, configuredOrder, onConfigure, compact }: TeaCardProps) {
  const [copied, setCopied] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [localOrder, setLocalOrder] = useState<OfficialOrderDraft>();
  const candidate = onConfigure ? configuredOrder : configuredOrder || localOrder;
  const draft = candidate?.drinkId === data.drinkId ? candidate : undefined;
  const usableProposal = proposal?.drinkId === data.drinkId ? proposal : undefined;
  const item = useMemo<OrderItemInput | undefined>(() => !data.drinkId ? undefined : draft ? draftToItem(draft) : usableProposal || { drinkId: data.drinkId, quantity: 1, toppings: [] }, [data.drinkId, draft, usableProposal]);
  const items = useMemo(() => item ? [item] : [], [item]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft ? formatConfiguredOrder(draft) : formatTeaOrder(data));
      setCopied(true); toast.success('已复制，可以直接发给店员');
    } catch { toast.error('浏览器不允许自动复制，请长按文字复制'); }
  };
  const saveConfiguration = (value: OfficialOrderDraft) => { if (onConfigure) onConfigure(value); else setLocalOrder(value); setCopied(false); };
  const artCategory = /咖啡|拿铁|美式/.test(data.drinkName) ? '咖啡' : /奶|乳|芝士|酪/.test(data.drinkName) ? '鲜奶茶' : /桃|柠檬|葡萄|橙|果|莓|芒|椰/.test(data.drinkName) ? '鲜果茶' : '纯茶原叶';
  const chips = draft
    ? [draft.options.volume, draft.options.sweetness, draft.options.temperature, draft.options.toppings, `${draft.quantity} 杯`]
    : [formatVolumeLabel(data.volume) || '杯型待确认', data.sweetness && !/^待/.test(data.sweetness) ? data.sweetness : '', data.temperature && !/^待/.test(data.temperature) ? data.temperature : '', data.toppings && data.toppings !== '未加料' ? data.toppings : '', usableProposal && usableProposal.quantity > 1 ? `${usableProposal.quantity} 杯` : ''].filter(Boolean);
  const total = item ? Math.round(data.price * item.quantity * 100) / 100 : data.price;

  return <>
    <article className={cn('group/card overflow-hidden rounded-[28px] bg-cream ring-1 ring-line/70 transition-shadow', data.isMain ? 'shadow-[0_24px_60px_-36px_rgba(20,40,28,.45)]' : 'shadow-[0_10px_30px_-24px_rgba(20,40,28,.35)]')}>
      <div className={cn('flex gap-4 p-4 sm:gap-5 sm:p-5', compact && 'p-4')}>
        <div className="relative w-[112px] shrink-0 sm:w-[132px]">
          <DrinkArtwork category={artCategory} name={data.drinkName} className={cn('w-full rounded-[22px] bg-paper', compact ? 'h-[128px]' : 'h-[148px] sm:h-[164px]')} />
          {data.isMain && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-jade/90 px-2 py-0.5 text-[11px] text-cream backdrop-blur"><Sparkles className="size-3" />{draft ? '已配好' : '首选'}</span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-serif text-[21px] font-semibold leading-snug text-ink sm:text-[23px]">{data.drinkName}</h3>
          {data.drinkNameEn && <p className="mt-0.5 truncate text-[12px] tracking-wide text-stone/80">{data.drinkNameEn}</p>}
          {data.customName && <p className="mt-1 text-[13px] text-leaf">昵称：{data.customName}</p>}
          <div className="mt-2 flex items-baseline gap-1 text-ink"><span className="text-[13px]">¥</span><span className="font-serif text-[30px] font-semibold leading-none tabular-nums">{data.price}</span>{data.startingPrice && <span className="text-[13px]">起</span>}{item && item.quantity > 1 && <span className="ml-2 text-[13px] text-stone">× {item.quantity} = ¥{total}</span>}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">{chips.map((chip, index) => <span key={`${chip}-${index}`} className={cn('rounded-full px-2.5 py-1 text-[12px]', /待门店确认|待确认/.test(chip) ? 'bg-honey/55 text-[#7a5a1c]' : 'bg-mist text-jade')}>{chip}</span>)}</div>
        </div>
      </div>
      {!compact && (data.reason || data.funFact) && <div className="mx-4 mb-1 rounded-[20px] bg-paper px-4 py-3 text-[13px] leading-6 text-stone sm:mx-5">{data.funFact && <p className="mb-1 font-serif text-[15px] text-jade">“{data.funFact}”</p>}{data.reason}</div>}
      <div className="flex gap-2 p-4 pt-3 sm:p-5 sm:pt-3">
        <button type="button" disabled={!item} onClick={() => setOrdering(true)} className="btn-jade h-12 min-w-0 flex-1 whitespace-nowrap"><ShoppingBag className="size-4" />确认下单{item && item.quantity > 1 ? ` · ${item.quantity} 杯` : ''}</button>
        <button type="button" disabled={!data.drinkId} onClick={() => setConfiguring(true)} className="btn-ghost h-12 shrink-0 whitespace-nowrap"><SlidersHorizontal className="size-4" />{draft ? '调整' : '调口味'}</button>
      </div>
      <div className="flex flex-wrap items-center gap-0.5 border-t border-line/70 px-3 py-1.5">
        <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-stone hover:bg-mist hover:text-jade">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? '已复制' : '复制'}</button>
        {onConfirm && <button type="button" onClick={onConfirm} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-stone hover:bg-mist hover:text-jade"><Bookmark className="size-3.5" />收藏</button>}
        {onRefresh && <button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-stone hover:bg-mist hover:text-jade"><RefreshCw className="size-3.5" />换一杯</button>}
        {onAskMore && <button type="button" onClick={onAskMore} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-stone hover:bg-mist hover:text-jade"><MessageCircle className="size-3.5" />继续聊</button>}
        {onNameChange && <TeaNameDIY drinkName={data.drinkName} currentName={data.customName} onApply={onNameChange} trigger={<button type="button" className="inline-flex h-9 items-center rounded-full px-3 text-[12px] text-stone hover:bg-mist">起昵称</button>} />}
        <span className="ml-auto pr-2 text-[11px] text-stone/70">到店付款 · 图片仅供参考</span>
      </div>
    </article>
    {configuring && <TeaConfigurationDialog open onOpenChange={setConfiguring} data={data} category={artCategory} initialDraft={draft || (usableProposal ? proposalToDraft(data, usableProposal) : undefined)} onSave={saveConfiguration} />}
    {ordering && <OrderConfirmDialog open onOpenChange={setOrdering} items={items} onSubmitted={onOrdered} />}
  </>;
}

export default function TeaCard(props: TeaCardProps) {
  const { data } = props;
  // Reset temporary form and copy state when a recommendation changes its product or options.
  return <TeaCardContent key={JSON.stringify([data.drinkId, data.drinkName, data.volume, data.sweetness, data.temperature, data.toppings])} {...props} />;
}
