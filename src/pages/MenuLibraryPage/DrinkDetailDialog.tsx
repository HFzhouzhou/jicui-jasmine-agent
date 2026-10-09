import { formatVolumeLabel } from '@shared/catalog-display';
import { useNavigate } from 'react-router-dom';
import type { Drink } from '@shared/contracts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import DrinkArtwork from '@/components/DrinkArtwork';

export default function DrinkDetailDialog({ drink, open, onOpenChange }: { drink: Drink | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  if (!drink) return null;
  const evidence = drink.catalogEvidence;
  const isLegacy = drink.catalogStatus === 'legacy';
  const startingPrice = evidence?.startingPrice && evidence.verifiedFields.includes('price');
  const isObserved = drink.catalogStatus === 'observed';
  const ask = () => {
    onOpenChange(false);
    navigate(`/ai-recommend?mode=chat&q=${encodeURIComponent(`我想了解${drink.name}，请说明已有资料和仍需门店确认的价格、配料及可选规格。`)}`);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-[28px] border-0 p-0 sm:max-w-lg">
    <div className="relative overflow-hidden rounded-t-[28px] bg-[#eef0e4]"><DrinkArtwork category={drink.category} name={drink.name} className="h-[260px] w-full sm:h-[300px]" /><span className="absolute bottom-3 right-5 rounded-full bg-white/80 px-2 py-1 text-[9px] tracking-[0.08em] text-primary/55">图片仅供参考</span></div>
    <div className="space-y-6 p-6 md:p-8">
      <DialogHeader className="text-left"><p className="mb-1 text-[11px] tracking-wider text-primary/60">{drink.category}{!isLegacy && !drink.available ? ' · 暂不可选' : ''}</p><DialogTitle className="font-serif text-[28px] font-normal text-primary">{drink.name}</DialogTitle><DialogDescription className="text-xs">{drink.nameEn}</DialogDescription></DialogHeader>
      <div className="flex items-center justify-between"><p className="text-3xl font-medium tabular-nums text-primary"><span className="mr-1 text-base">¥</span>{drink.price}{startingPrice && <span className="ml-1 text-sm font-normal">起</span>}<span className="ml-3 text-[11px] font-normal text-muted-foreground">{isLegacy ? '原始资料价' : isObserved && evidence?.verifiedFields.includes('price') ? '门店普通价' : '参考价格'}</span></p><span className="text-xs text-muted-foreground">{drink.verified || drink.catalogStatus === 'legacy' || drink.catalogEvidence?.verifiedFields.includes('volume') ? formatVolumeLabel(drink.volume) : '规格待确认'}</span></div>
      {evidence && <div className="rounded-2xl bg-[#e9eedb] p-4 text-[11px] leading-6 text-primary/75"><p className="font-medium">{evidence.storeName}</p><p>价格与售卖情况以门店为准。</p>{startingPrice && <p>标注“起”的价格随规格变动。</p>}</div>}
      {!drink.verified && <p className="rounded-2xl bg-[#eee6d3]/65 p-4 text-xs leading-6 text-[#796344]">{isLegacy ? '这款资料未纳入当前门店茶单，不代表商品已停售。当前价格、配料与可选规格请向店员确认。' : isObserved ? '如有过敏或饮食限制，请先向店员确认完整配料、过敏原、咖啡因与可选做法。' : '完整商品资料尚待核准。配料、过敏原和可选规格请向店员确认，不能据此判断是否满足饮用限制。'}</p>}
      {drink.verified && drink.description && <p className="text-sm leading-7 text-muted-foreground">{drink.description}</p>}
      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-4 border-t border-primary/10 pt-5 text-xs leading-6"><dt className="text-muted-foreground">配料</dt><dd>{drink.verified && drink.ingredients.length ? drink.ingredients.join('、') : '待核实'}</dd><dt className="text-muted-foreground">过敏原</dt><dd>{drink.verified && drink.allergens !== null ? drink.allergens.length ? drink.allergens.join('、') : '已登记未含所列过敏原；交叉接触情况请向店员确认' : '待核实'}</dd><dt className="text-muted-foreground">咖啡因</dt><dd>{drink.verified && drink.caffeine !== 'unknown' ? drink.caffeine === 'none' ? '资料标注不含咖啡因' : '含咖啡因' : '待核实'}</dd><dt className="text-muted-foreground">甜度选项</dt><dd>{drink.verified && drink.sweetnessOptions.length ? drink.sweetnessOptions.join('、') : '待店员确认'}</dd><dt className="text-muted-foreground">温度选项</dt><dd>{drink.verified && drink.temperatureOptions.length ? drink.temperatureOptions.join('、') : '待店员确认'}</dd><dt className="text-muted-foreground">可选小料</dt><dd>{drink.verified ? drink.toppings.length ? drink.toppings.map((item) => `${item.name} +¥${item.price}`).join('、') : '未登记可选小料' : '待店员确认'}</dd></dl>
      <DialogFooter className="gap-2"><Button variant="ghost" className="min-h-11 rounded-full" onClick={() => onOpenChange(false)}>再看看</Button><Button onClick={ask} disabled={!isLegacy && !drink.available} className="min-h-11 gap-4 rounded-full px-5 py-3">{isLegacy ? '询问这款的资料' : drink.available ? '和茉莉娘子聊聊这杯' : '具体供应请咨询门店'}<ArrowUpRight className="size-4" /></Button></DialogFooter>
    </div>
  </DialogContent></Dialog>;
}
