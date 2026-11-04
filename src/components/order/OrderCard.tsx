import { useEffect, useState } from 'react';
import { Check, LoaderCircle, MessageSquareWarning, RefreshCw, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Order } from '@shared/contracts';
import { cn } from '@/lib/utils';
import { cancelOrder, getOrder, notifyOrdersChanged, requestAfterSales, STATUS_LABEL, STATUS_STEPS } from '@/lib/orders';

const AFTER_SALES_LABEL = { remake: '申请重做', refund: '申请退款', other: '其他问题' } as const;
const REQUEST_STATUS = { pending: '门店处理中', resolved: '已处理', rejected: '未通过' } as const;

function Progress({ order }: { order: Order }) {
  if (order.status === 'cancelled') return <p className="rounded-full bg-muted px-3 py-1.5 text-center text-[13px] text-stone">订单已取消</p>;
  const current = STATUS_STEPS.findIndex((step) => step.status === order.status);
  return <ol className="grid grid-cols-5 gap-1" aria-label="订单进度">
    {STATUS_STEPS.map((step, index) => <li key={step.status} className="flex flex-col items-center gap-1.5">
      <span className={cn('h-1.5 w-full rounded-full', index <= current ? 'bg-jade' : 'bg-line')} />
      <span className={cn('text-[11px]', index === current ? 'font-semibold text-jade' : index < current ? 'text-stone' : 'text-stone/60')}>{step.label}</span>
    </li>)}
  </ol>;
}

/** Live order card: refreshes from the server, so a chat snapshot never shows a stale status. */
export default function OrderCard({ order: initial, compact = false, live = true }: { order: Order; compact?: boolean; live?: boolean }) {
  const [order, setOrder] = useState(initial);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<'remake' | 'refund' | 'other' | null>(null);
  const [reason, setReason] = useState('');
  useEffect(() => setOrder(initial), [initial]);
  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    getOrder(initial.id, controller.signal).then(setOrder).catch(() => undefined);
    return () => controller.abort();
  }, [initial.id, live]);

  async function run(action: () => Promise<Order>, success: string) {
    setPending(true);
    try { setOrder(await action()); notifyOrdersChanged(); toast.success(success); setForm(null); setReason(''); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : '操作失败'); }
    finally { setPending(false); }
  }
  const canAfterSales = ['accepted', 'making', 'ready', 'completed'].includes(order.status) && !order.afterSales.some((item) => item.status === 'pending') && order.afterSales.length < 3;

  return <article className="card-soft overflow-hidden">
    <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-mist to-cream px-5 py-4">
      <div><p className="text-[12px] text-stone">取餐号</p><p className="font-serif text-[28px] font-semibold leading-none tracking-wide text-ink">{order.code}</p></div>
      <div className="text-right"><span className={cn('inline-flex rounded-full px-3 py-1 text-[13px] font-medium', order.status === 'ready' ? 'bg-gold text-cream' : order.status === 'cancelled' ? 'bg-muted text-stone' : 'bg-jade text-cream')}>{STATUS_LABEL[order.status]}</span><p className="mt-1.5 text-[12px] text-stone">{new Date(order.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
    </div>
    <div className="space-y-4 px-5 py-4">
      <Progress order={order} />
      {!compact && <ul className="space-y-2 text-[14px]">{order.lines.map((line, index) => <li key={index} className="flex justify-between gap-3"><span className="min-w-0 text-ink">{line.drinkName} <span className="text-stone">×{line.quantity}</span><span className="block text-[12px] text-stone">{[line.sweetness, line.temperature, line.toppings.map((item) => item.name).join('、')].filter(Boolean).join(' · ')}</span></span><span className="shrink-0 tabular-nums text-stone">¥{line.lineTotal}</span></li>)}</ul>}
      <div className="flex items-baseline justify-between border-t border-line pt-3 text-[14px]"><span className="text-stone">{order.cups} 杯{order.discount > 0 ? ` · ${order.discountLabel} -¥${order.discount}` : ''}</span><span className="font-serif text-xl font-semibold text-ink">¥{order.total}</span></div>
      {order.timeline.at(-1)?.note && <p className="rounded-2xl bg-muted px-3 py-2 text-[13px] text-stone">门店备注：{order.timeline.at(-1)?.note}</p>}
      {order.afterSales.map((item) => <div key={item.id} className="rounded-2xl border border-line bg-paper px-3.5 py-3 text-[13px] leading-6"><p className="flex justify-between gap-2"><span className="font-medium text-ink">{AFTER_SALES_LABEL[item.type]}</span><span className={item.status === 'pending' ? 'text-gold' : 'text-stone'}>{REQUEST_STATUS[item.status]}</span></p><p className="text-stone">{item.reason}</p>{item.reply && <p className="mt-1 text-jade">门店回复：{item.reply}</p>}</div>)}
      {form && <div className="space-y-2 rounded-2xl bg-paper p-3.5">
        <p className="text-[13px] font-medium text-ink">{AFTER_SALES_LABEL[form]}：说说遇到了什么</p>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={2} placeholder={form === 'remake' ? '比如：太甜了，想改成三分糖' : '比如：饮品洒了一半'} className="w-full resize-none rounded-xl border border-line bg-cream p-3 text-[14px] outline-none focus:border-leaf" />
        <div className="flex gap-2"><button type="button" className="btn-ghost h-10" onClick={() => { setForm(null); setReason(''); }}>取消</button><button type="button" disabled={pending || reason.trim().length < 2} className="btn-jade h-10" onClick={() => void run(() => requestAfterSales(order.id, form, reason.trim()), '已提交，门店会尽快处理')}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}提交申请</button></div>
      </div>}
      {!form && <div className="flex flex-wrap gap-2">
        {order.status === 'submitted' && <button type="button" disabled={pending} className="btn-ghost h-10" onClick={() => void run(() => cancelOrder(order.id), '订单已取消')}><X className="size-4" />取消订单</button>}
        {canAfterSales && <><button type="button" className="btn-ghost h-10" onClick={() => setForm('remake')}><RotateCcw className="size-4" />申请重做</button><button type="button" className="btn-ghost h-10" onClick={() => setForm('refund')}><MessageSquareWarning className="size-4" />申请退款</button></>}
        {live && <button type="button" aria-label="刷新订单状态" className="btn-ghost ml-auto size-10 !px-0" onClick={() => void getOrder(order.id).then(setOrder).catch(() => toast.error('刷新失败'))}><RefreshCw className="size-4" /></button>}
      </div>}
    </div>
  </article>;
}
