import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, LoaderCircle, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react';
import type { Order, OrderItemInput, OrderQuote } from '@shared/contracts';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import DrinkArtwork from '@/components/DrinkArtwork';
import { confirmOrder, notifyOrdersChanged, quoteOrder } from '@/lib/orders';
import { RequestError } from '@/lib/api';

type Stage = { kind: 'loading' } | { kind: 'review'; quote: OrderQuote } | { kind: 'submitting'; quote: OrderQuote } | { kind: 'done'; order: Order } | { kind: 'error'; message: string; retryable: boolean };

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!expiresAt) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [expiresAt]);
  if (!expiresAt) return null;
  const left = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
  return { left, text: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` };
}

/**
 * Stage 1: the server prices the items and reads them back. Stage 2: only an explicit tap submits.
 * Nothing here takes payment; payment happens at the store counter.
 */
export default function OrderConfirmDialog({ items, open, onOpenChange, onSubmitted }: { items: OrderItemInput[]; open: boolean; onOpenChange: (open: boolean) => void; onSubmitted?: (order: Order) => void }) {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setStage({ kind: 'loading' });
    quoteOrder(items).then((quote) => { if (active) setStage({ kind: 'review', quote }); })
      .catch((cause: unknown) => { if (active) setStage({ kind: 'error', message: cause instanceof Error ? cause.message : '暂时无法生成确认单', retryable: !(cause instanceof RequestError && ['ORDER_NEEDS_CHANGE', 'ORDER_AMOUNT_LIMIT', 'ORDER_TOO_MANY_CUPS'].includes(cause.code)) }); });
    return () => { active = false; };
  }, [open, items, attempt]);
  const quote = stage.kind === 'review' || stage.kind === 'submitting' ? stage.quote : undefined;
  const countdown = useCountdown(quote?.expiresAt);
  const expired = countdown?.left === 0;

  async function submit() {
    if (!quote || expired) return;
    setStage({ kind: 'submitting', quote });
    try {
      const order = await confirmOrder(quote);
      setStage({ kind: 'done', order }); notifyOrdersChanged(); onSubmitted?.(order);
    } catch (cause) {
      const changed = cause instanceof RequestError && ['QUOTE_CHANGED', 'QUOTE_EXPIRED'].includes(cause.code);
      setStage({ kind: 'error', message: cause instanceof Error ? cause.message : '提交失败，请重试', retryable: changed || !(cause instanceof RequestError && cause.code === 'ORDER_DAILY_LIMIT') });
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="!bottom-0 !top-auto flex max-h-[94dvh] !max-w-full !translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[32px] rounded-b-none border-0 bg-paper p-0 sm:!bottom-auto sm:!top-1/2 sm:!max-w-[560px] sm:!-translate-y-1/2 sm:rounded-[32px]">
      {stage.kind === 'done' ? <div className="flex flex-col items-center px-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-mist text-jade"><CheckCircle2 className="size-9" strokeWidth={1.6} /></span>
        <DialogTitle className="mt-5 font-serif text-2xl font-semibold text-ink">已提交到门店接单台</DialogTitle>
        <DialogDescription className="mt-2 text-[14px] leading-6 text-stone">门店接单后会开始制作，你可以随时问我「订单做到哪了」。</DialogDescription>
        <div className="mt-6 w-full rounded-[24px] bg-jade p-6 text-cream">
          <p className="text-[12px] tracking-[0.2em] text-sage">取餐号</p>
          <p className="mt-1 font-serif text-5xl font-semibold tracking-wider">{stage.order.code}</p>
          <p className="mt-3 text-[13px] text-cream/75">{stage.order.cups} 杯 · 合计 ¥{stage.order.total} · 取餐时向门店付款</p>
        </div>
        <div className="mt-5 grid w-full grid-cols-2 gap-2"><button type="button" onClick={() => onOpenChange(false)} className="btn-ghost h-12">继续逛逛</button><Link to="/orders" onClick={() => onOpenChange(false)} className="btn-jade h-12">查看订单进度<ArrowRight className="size-4" /></Link></div>
      </div> : <>
        <div className="shrink-0 border-b border-line px-6 pb-4 pt-6 sm:px-7">
          <p className="eyebrow flex items-center gap-1.5"><ShieldCheck className="size-3.5" />两步确认 · 防误下单</p>
          <DialogTitle className="mt-2 font-serif text-[24px] font-semibold text-ink">核对一下，再提交</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-stone">价格由门店菜单实时核算，确认后才会提交。</DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-7">
          {stage.kind === 'loading' && <div className="flex flex-col items-center gap-3 py-14 text-stone" role="status"><LoaderCircle className="size-7 animate-spin text-leaf" />正在核对价格和规格…</div>}
          {stage.kind === 'error' && <div role="alert" className="rounded-[22px] bg-blush p-5 text-[14px] leading-7 text-[#8a4b2a]"><p className="flex items-start gap-2"><AlertCircle className="mt-1 size-4 shrink-0" />{stage.message}</p>{stage.retryable ? <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-ghost mt-4 h-10">重新核对</button> : <p className="mt-2 text-[13px] text-[#8a4b2a]/80">可以回到对话里调整，比如换个小料或减少杯数。</p>}</div>}
          {quote && <div className="space-y-4">
            <div className="rounded-[22px] border border-sage/40 bg-mist/70 p-4 text-[14px] leading-7 text-jade"><p className="mb-1 flex items-center gap-1.5 text-[12px] font-medium tracking-wider text-leaf"><Sparkles className="size-3.5" />茉莉娘子复述</p>{quote.summary}</div>
            <ul className="divide-y divide-line rounded-[22px] bg-cream px-4">
              {quote.lines.map((line, index) => <li key={`${line.drinkId}-${index}`} className="flex gap-3 py-4">
                <DrinkArtwork category="" name={line.drinkName} className="size-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="font-serif text-[17px] font-semibold text-ink">{line.drinkName}</p><p className="shrink-0 tabular-nums text-ink">¥{line.lineTotal}</p></div>
                  <p className="mt-1 text-[13px] leading-6 text-stone">{[line.volume, line.sweetness, line.temperature, line.toppings.length ? line.toppings.map((item) => `${item.name}+¥${item.price}`).join('、') : '不加料'].join(' · ')} · ×{line.quantity}</p>
                  {line.note && <p className="text-[13px] text-stone">备注：{line.note}</p>}
                  {line.pending.length > 0 && <p className="mt-1.5 inline-flex rounded-full bg-honey/60 px-2.5 py-0.5 text-[12px] text-[#7a5a1c]">待门店确认：{line.pending.join('、')}</p>}
                </div>
              </li>)}
            </ul>
            <dl className="space-y-2 rounded-[22px] bg-cream p-4 text-[14px]">
              <div className="flex justify-between text-stone"><dt>小计（{quote.cups} 杯）</dt><dd className="tabular-nums">¥{quote.subtotal}</dd></div>
              {quote.discount > 0 && <div className="flex justify-between text-gold"><dt>{quote.discountLabel}</dt><dd className="tabular-nums">-¥{quote.discount}</dd></div>}
              <div className="flex items-baseline justify-between border-t border-line pt-2"><dt className="font-medium text-ink">合计</dt><dd className="font-serif text-2xl font-semibold tabular-nums text-ink">¥{quote.total}</dd></div>
            </dl>
            <ul className="space-y-1.5 text-[12px] leading-5 text-stone">{quote.warnings.map((warning) => <li key={warning} className="flex gap-1.5"><span className="mt-2 size-1 shrink-0 rounded-full bg-sage" />{warning}</li>)}<li className="flex gap-1.5"><span className="mt-2 size-1 shrink-0 rounded-full bg-sage" />单笔上限 ¥{quote.limits.maxAmount}，今日还可提交 {quote.limits.dailyRemaining} 单。</li></ul>
          </div>}
        </div>
        {quote && <div className="flex shrink-0 items-center gap-3 border-t border-line bg-cream px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
          <p className={`flex items-center gap-1.5 text-[12px] ${expired ? 'text-[#a2552e]' : 'text-stone'}`}><Clock3 className="size-3.5" />{expired ? '确认单已过期' : `${countdown?.text} 内有效`}</p>
          {expired ? <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-ghost ml-auto h-12">重新核对</button>
            : <button type="button" disabled={stage.kind === 'submitting' || quote.limits.dailyRemaining <= 0} onClick={() => void submit()} className="btn-jade ml-auto h-12 px-6">{stage.kind === 'submitting' ? <LoaderCircle className="size-4 animate-spin" /> : <ReceiptText className="size-4" />}确认无误，提交订单</button>}
        </div>}
      </>}
    </DialogContent>
  </Dialog>;
}
