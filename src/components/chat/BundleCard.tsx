import { useMemo, useState } from 'react';
import { RefreshCw, ShoppingBag, Users } from 'lucide-react';
import type { BundleProposal, Order, OrderItemInput } from '@shared/contracts';
import DrinkArtwork from '@/components/DrinkArtwork';
import OrderConfirmDialog from '@/components/order/OrderConfirmDialog';

/** A 2–3 person tea table: who gets what, why, and one confirm for the whole set. */
export default function BundleCard({ bundle, proposal, onShuffle, onOrdered, disabled }: { bundle: BundleProposal; proposal?: OrderItemInput[]; onShuffle?: () => void; onOrdered?: (order: Order) => void; disabled?: boolean }) {
  const [ordering, setOrdering] = useState(false);
  const items = useMemo(() => proposal?.length ? proposal : bundle.items.map((item) => ({ drinkId: item.card.drinkId, quantity: 1, toppings: [] })), [proposal, bundle.items]);
  const startingPrice = bundle.items.some((item) => item.card.startingPrice);
  return <article className="card-soft w-full overflow-hidden">
    <header className="relative overflow-hidden bg-jade px-5 py-4 text-cream sm:px-6">
      <div className="pointer-events-none absolute -right-6 -top-10 size-36 rounded-full bg-leaf/25 blur-2xl" />
      <p className="relative flex items-center gap-1.5 text-[11px] font-medium tracking-[0.2em] text-sage"><Users className="size-3.5" />TEA FOR {bundle.people}</p>
      <div className="relative mt-1 flex items-end justify-between gap-3">
        <h3 className="font-serif text-[22px] font-semibold">{bundle.people} 人茶桌</h3>
        {bundle.discount > 0
          ? <span className="rounded-full bg-honey px-3 py-1 text-[12px] font-medium text-[#6b4c12]">{bundle.discountLabel} · 省 ¥{bundle.discount}</span>
          : <span className="text-[12px] text-cream/70">{bundle.totalBudget !== null ? `预算 ¥${bundle.totalBudget} 以内` : '按口味搭配'}</span>}
      </div>
    </header>
    <ul className="divide-y divide-line/80 px-4 sm:px-5">
      {bundle.items.map((item) => <li key={item.card.drinkId} className="flex gap-3.5 py-4">
        <DrinkArtwork category="" name={item.card.drinkName} className="size-[72px] shrink-0 rounded-2xl bg-paper" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-mist px-2.5 py-0.5 text-[12px] text-jade">{item.forWhom}</span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2"><p className="truncate font-serif text-[18px] font-semibold text-ink">{item.card.drinkName}</p><p className="shrink-0 tabular-nums text-ink">¥{item.card.price}{item.card.startingPrice ? '起' : ''}</p></div>
          <p className="mt-0.5 text-[13px] leading-5 text-stone">{item.why.replace(/^给第 \d 位（[^）]*）：/, '')}</p>
        </div>
      </li>)}
    </ul>
    <div className="mx-4 mb-4 rounded-[20px] bg-paper px-4 py-3 sm:mx-5">
      <div className="flex justify-between text-[13px] text-stone"><span>小计 {bundle.items.length} 杯</span><span className="tabular-nums">¥{bundle.subtotal}</span></div>
      {bundle.discount > 0 && <div className="mt-1 flex justify-between text-[13px] text-gold"><span>{bundle.discountLabel}</span><span className="tabular-nums">-¥{bundle.discount}</span></div>}
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2"><span className="text-[14px] font-medium text-ink">合计{startingPrice ? '（起）' : ''}</span><span className="font-serif text-[26px] font-semibold tabular-nums text-ink">¥{bundle.total}</span></div>
    </div>
    <div className="flex gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
      <button type="button" disabled={disabled} onClick={() => setOrdering(true)} className="btn-jade h-12 min-w-0 flex-1 whitespace-nowrap"><ShoppingBag className="size-4" /><span className="hidden min-[400px]:inline">一键</span>下单 · {items.reduce((sum, item) => sum + item.quantity, 0)} 杯</button>
      {onShuffle && <button type="button" disabled={disabled} onClick={onShuffle} className="btn-ghost h-12 shrink-0 whitespace-nowrap"><RefreshCw className="size-4" />换一组</button>}
    </div>
    {ordering && <OrderConfirmDialog open onOpenChange={setOrdering} items={items} onSubmitted={onOrdered} />}
  </article>;
}
