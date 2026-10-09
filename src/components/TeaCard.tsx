import { formatVolumeLabel } from '@shared/catalog-display';
import { useState } from 'react';
import type { Drink } from '@shared/contracts';
import { Bookmark, Check, Copy, MessageCircle, RefreshCw, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import TeaNameDIY from '@/components/TeaNameDIY';
import DrinkArtwork from '@/components/DrinkArtwork';

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
}

export function formatTeaOrder(data: ITeaCardData) {
  return [
    '极萃东方茉莉 · 选茶参考单',
    `饮品：${data.drinkName}${data.volume ? `（${formatVolumeLabel(data.volume)}）` : ''}`,
    `${data.startingPrice ? '参考起价' : '参考合计'}：¥${data.price}${data.startingPrice ? '起（随规格变动）' : ''}`,
    ...(data.catalogEvidence ? [`参考门店：${data.catalogEvidence.storeName}`] : []),
    `甜度：${data.sweetness || '待店员确认'}`,
    `温度：${data.temperature || '待店员确认'}`,
    `小料：${data.toppings || '不额外加料'}`,
    '请由店员确认价格、原料及可选规格。本茶单未提交门店订单。',
  ].join('\n');
}

export default function TeaCard({ data, onRefresh, onAskMore, onConfirm, onNameChange }: TeaCardProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatTeaOrder(data));
      setCopied(true);
      toast.success('参考茶单已复制，尚未向门店下单');
    } catch {
      toast.error('浏览器不允许自动复制，请长按茶单文字复制');
    }
  };
  const artCategory = /咖啡|拿铁|美式/.test(data.drinkName) ? '咖啡' : /奶|乳|芝士/.test(data.drinkName) ? '鲜奶茶' : /桃|柠檬|葡萄|橙|果|莓/.test(data.drinkName) ? '鲜果茶' : '纯茶原叶';
  return (
    <article className={`overflow-hidden rounded-[24px] ${data.isMain ? 'bg-white shadow-[0_10px_40px_-30px_#253b2d40]' : 'bg-[#eef0e4]'}`}>
      <div className="relative flex min-h-[158px] items-center gap-3 overflow-hidden p-5 sm:p-6">
        <div className="relative z-10 min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.14em] text-[#8b987b]"><Leaf strokeWidth={1.4} className="size-3" />{data.isMain ? '为你精选 / YOUR TEA' : '另一个选择 / ALSO LOVELY'}</span>
          <h3 className="mt-3 font-serif text-[25px] leading-snug text-[#253b2d] break-words">{data.drinkName}</h3>
          {data.drinkNameEn && <p className="mt-1.5 text-[9px] tracking-wider text-[#9ba28d]">{data.drinkNameEn}</p>}
          {data.customName && <p className="mt-2 text-xs text-[#7d8d65]">我的昵称：{data.customName}</p>}
          <div className="mt-4 flex items-baseline gap-2"><span className="text-sm text-[#536847]">¥</span><span className="font-serif text-3xl leading-none text-[#253b2d]">{data.price}</span>{data.startingPrice && <span className="text-xs text-[#536847]">起</span>}<span className="text-[9px] text-[#99a086]">{data.startingPrice ? '参考起价' : '参考合计'} · {formatVolumeLabel(data.volume) || '规格待确认'}</span></div>
        </div>
        <div className="relative -mr-4 w-[105px] shrink-0 self-stretch sm:w-[130px]"><DrinkArtwork category={artCategory} name={data.drinkName} className="h-full min-h-[145px] w-full !bg-transparent" /><span className="absolute bottom-0 left-1 right-1 text-center text-[7px] leading-3 text-[#879274]">图片仅供参考</span></div>
      </div>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {data.catalogEvidence && <p className="mb-4 text-[9px] leading-5 text-[#96a081]">{data.catalogEvidence.storeName}{data.startingPrice ? ' · 价格随规格变动' : ''}</p>}
        <dl className={`grid grid-cols-2 gap-3 rounded-2xl p-4 text-xs ${data.isMain ? 'bg-[#f3f5eb]' : 'bg-white/60'}`}>
          <div><dt className="mb-1.5 text-[9px] tracking-widest text-[#96a084]">甜度</dt><dd className="text-[#5d6d4e]">{data.sweetness || '待店员确认'}</dd></div>
          <div><dt className="mb-1.5 text-[9px] tracking-widest text-[#96a084]">温度</dt><dd className="text-[#5d6d4e]">{data.temperature || '待店员确认'}</dd></div>
          <div className="col-span-2 border-t border-[#253b2d]/[0.06] pt-3"><dt className="mb-1.5 text-[9px] tracking-widest text-[#96a084]">小料</dt><dd className="text-[#5d6d4e]">{data.toppings || '不额外加料'}</dd></div>
        </dl>
        {data.reason && <p className="mt-4 text-xs leading-7 text-[#738160]">{data.reason}</p>}
        {data.message && <p className="mt-2 text-[10px] leading-6 text-[#96a084]">{data.catalogEvidence ? '配料、可选规格与当日供应以门店为准。' : data.message}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={copy} className="h-11 gap-2 rounded-full border-0 bg-[#253b2d] px-4 text-[11px] text-[#f7f7ef] hover:bg-[#3c5334] hover:text-white">{copied ? <Check strokeWidth={1.3} className="size-3.5" /> : <Copy strokeWidth={1.3} className="size-3.5" />}{copied ? '已复制茶单' : '复制参考茶单'}</Button>
          {onConfirm && <Button variant="outline" onClick={onConfirm} className="h-11 gap-1.5 rounded-full border-[#253b2d]/10 bg-transparent px-4 text-[11px] text-[#748361] hover:bg-[#e6eccf]"><Bookmark strokeWidth={1.3} className="size-3.5" />收藏到本机</Button>}
          <div className="flex flex-wrap items-center gap-0.5">
            {onRefresh && <Button variant="ghost" onClick={onRefresh} className="h-11 gap-1.5 rounded-full px-3 text-[11px] text-[#8c987b] hover:bg-[#e6eccf]"><RefreshCw strokeWidth={1.3} className="size-3.5" />换一杯</Button>}
            {onAskMore && <Button variant="ghost" onClick={onAskMore} className="h-11 gap-1.5 rounded-full px-3 text-[11px] text-[#8c987b] hover:bg-[#e6eccf]"><MessageCircle strokeWidth={1.3} className="size-3.5" />继续调整</Button>}
            {onNameChange && <TeaNameDIY drinkName={data.drinkName} currentName={data.customName} onApply={onNameChange} trigger={<Button variant="ghost" className="h-11 rounded-full px-3 text-[11px] text-[#8c987b]">给茶起昵称</Button>} />}
          </div>
        </div>
        <p className="mt-4 text-[9px] leading-5 text-[#a4ac96]">选茶参考单 · 未向门店下单。到店后请确认配料、价格和可选规格。</p>
      </div>
    </article>
  );
}
