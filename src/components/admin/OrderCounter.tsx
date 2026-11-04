import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Check, ChefHat, CircleAlert, Clock3, CupSoda, LoaderCircle, MessageSquareWarning, PackageCheck, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderStatus } from '@shared/contracts';
import { apiRequest } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/orders';
import { cn } from '@/lib/utils';

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; icon: typeof Check }>> = {
  submitted: { status: 'accepted', label: '接单', icon: Check },
  accepted: { status: 'making', label: '开始制作', icon: ChefHat },
  making: { status: 'ready', label: '出杯，通知取餐', icon: CupSoda },
  ready: { status: 'completed', label: '已取餐', icon: PackageCheck },
};
const COLUMNS: { key: string; title: string; statuses: OrderStatus[]; tone: string }[] = [
  { key: 'new', title: '待接单', statuses: ['submitted'], tone: 'bg-gold' },
  { key: 'making', title: '制作中', statuses: ['accepted', 'making'], tone: 'bg-leaf' },
  { key: 'ready', title: '待取餐', statuses: ['ready'], tone: 'bg-jade' },
];
const AFTER_SALES = { remake: '重做', refund: '退款', other: '其他' } as const;
function ago(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60000));
  return minutes < 1 ? '刚刚' : minutes < 60 ? `${minutes} 分钟前` : `${Math.floor(minutes / 60)} 小时前`;
}
const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString();

function Ticket({ order, busy, onMove, onCancel }: { order: Order; busy: boolean; onMove: (status: OrderStatus, note?: string) => void; onCancel: (note: string) => void }) {
  const next = NEXT[order.status];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const waited = (Date.now() - Date.parse(order.createdAt)) / 60000;
  return <article className={cn('rounded-[22px] bg-cream p-4 ring-1 transition-shadow', order.status === 'submitted' && waited > 5 ? 'ring-gold/70 shadow-[0_0_0_4px_rgba(179,132,47,.12)]' : 'ring-line')}>
    <div className="flex items-start justify-between gap-2">
      <div><p className="font-serif text-[28px] font-semibold leading-none tracking-wide text-ink">{order.code}</p><p className="mt-1.5 flex items-center gap-1 text-[12px] text-stone"><Clock3 className="size-3" />{ago(order.createdAt)} · {order.cups} 杯</p></div>
      <span className="rounded-full bg-mist px-2.5 py-1 text-[12px] text-jade">{STATUS_LABEL[order.status]}</span>
    </div>
    <ul className="mt-3 space-y-2.5 border-t border-dashed border-line pt-3">{order.lines.map((line, index) => <li key={index} className="text-[14px]">
      <p className="flex justify-between gap-2 font-medium text-ink"><span>{line.drinkName} <span className="text-leaf">×{line.quantity}</span></span><span className="tabular-nums text-stone">¥{line.lineTotal}</span></p>
      <p className="text-[12.5px] text-stone">{[line.volume, line.sweetness, line.temperature, line.toppings.length ? `加${line.toppings.map((item) => item.name).join('、')}` : '不加料'].join(' · ')}</p>
      {line.note && <p className="mt-1 inline-flex rounded-lg bg-honey/70 px-2 py-0.5 text-[12.5px] font-medium text-[#6b4c12]">备注：{line.note}</p>}
      {line.pending.length > 0 && <p className="mt-1 text-[12px] text-[#9a5a1e]">需确认：{line.pending.join('、')}</p>}
    </li>)}</ul>
    <p className="mt-3 flex items-baseline justify-between border-t border-line pt-2 text-[13px] text-stone"><span>{order.discount > 0 ? `${order.discountLabel} -¥${order.discount}` : '到店收款'}</span><span className="font-serif text-[20px] font-semibold text-ink">¥{order.total}</span></p>
    {rejecting ? <div className="mt-3 space-y-2"><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} placeholder="告诉顾客原因，例如：芒果售罄" className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[13.5px] outline-none focus:border-leaf" /><div className="flex gap-2"><button type="button" className="btn-ghost h-10 flex-1" onClick={() => setRejecting(false)}>返回</button><button type="button" disabled={busy || !reason.trim()} className="btn-jade h-10 flex-1 !bg-[#a2552e]" onClick={() => onCancel(reason.trim())}>确认拒单</button></div></div>
      : <div className="mt-3 flex gap-2">
        {next && <button type="button" disabled={busy} onClick={() => onMove(next.status)} className="btn-jade h-11 flex-1">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <next.icon className="size-4" />}{next.label}</button>}
        {['submitted', 'accepted'].includes(order.status) && <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="btn-ghost h-11 !px-3" aria-label="拒单"><X className="size-4" /></button>}
      </div>}
  </article>;
}

/** Store-side queue: accept, make, hand over. Customers see each step on their order page. */
export function OrderCounter({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const known = useRef<Set<string> | null>(null);
  const headers = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const value = await apiRequest<{ orders: Order[] }>('/api/admin/orders', { headers: headers(), signal }, 15000);
      if (signal?.aborted) return;
      const fresh = value.orders.filter((order) => order.status === 'submitted' && known.current && !known.current.has(order.id));
      if (fresh.length) toast.info(`新订单 ${fresh.map((order) => order.code).join('、')}`, { icon: <BellRing className="size-4" /> });
      known.current = new Set(value.orders.map((order) => order.id));
      setOrders(value.orders); setError('');
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : '订单读取失败'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [headers]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 8000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [load]);

  async function move(order: Order, status: OrderStatus, note?: string) {
    setBusy(order.id);
    try {
      const value = await apiRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status, ...(note ? { note } : {}) }) }, 15000);
      setOrders((current) => current.map((item) => item.id === order.id ? value.order : item));
      toast.success(`${order.code} · ${STATUS_LABEL[status]}`);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '更新失败'); void load(); }
    finally { setBusy(null); }
  }
  async function answer(order: Order, requestId: string, status: 'resolved' | 'rejected') {
    const reply = replies[requestId]?.trim();
    if (!reply) { toast.error('请先写一句给顾客的回复'); return; }
    setBusy(requestId);
    try {
      const value = await apiRequest<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(order.id)}/after-sales/${encodeURIComponent(requestId)}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status, reply }) }, 15000);
      setOrders((current) => current.map((item) => item.id === order.id ? value.order : item));
      toast.success('已回复顾客');
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '处理失败'); }
    finally { setBusy(null); }
  }

  const pendingAfterSales = orders.flatMap((order) => order.afterSales.filter((item) => item.status === 'pending').map((item) => ({ order, item })));
  const today = orders.filter((order) => isToday(order.createdAt));
  const done = today.filter((order) => ['completed', 'cancelled'].includes(order.status));
  const stats = [
    { label: '待接单', value: orders.filter((order) => order.status === 'submitted').length, tone: 'text-gold' },
    { label: '制作中', value: orders.filter((order) => ['accepted', 'making'].includes(order.status)).length, tone: 'text-leaf' },
    { label: '待取餐', value: orders.filter((order) => order.status === 'ready').length, tone: 'text-jade' },
    { label: '今日完成', value: today.filter((order) => order.status === 'completed').length, tone: 'text-ink' },
    { label: '今日营业额', value: `¥${Math.round(today.filter((order) => order.status === 'completed').reduce((sum, order) => sum + order.total, 0) * 100) / 100}`, tone: 'text-ink' },
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-[13.5px] leading-6 text-stone">顾客确认复述后的订单会出现在这里，每 8 秒自动刷新。状态只能按 接单 → 制作 → 出杯 → 取餐 顺序推进；本系统不收款，取餐时在门店收银。</p>
      <button type="button" onClick={() => void load()} className="btn-ghost h-10"><RefreshCw className="size-4" />刷新</button>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{stats.map((stat) => <div key={stat.label} className="rounded-[20px] bg-cream p-4 ring-1 ring-line"><p className="text-[12.5px] text-stone">{stat.label}</p><p className={cn('mt-1 font-serif text-[28px] font-semibold tabular-nums', stat.tone)}>{stat.value}</p></div>)}</div>
    {error && <p role="alert" className="flex items-center gap-2 rounded-2xl bg-blush px-4 py-3 text-[14px] text-[#8a4b2a]"><CircleAlert className="size-4" />{error}</p>}

    {pendingAfterSales.length > 0 && <section className="rounded-[26px] bg-blush/60 p-5 ring-1 ring-[#efcdb9]">
      <h3 className="flex items-center gap-2 font-serif text-[19px] font-semibold text-[#7a3d22]"><MessageSquareWarning className="size-5" />售后待处理 · {pendingAfterSales.length}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{pendingAfterSales.map(({ order, item }) => <div key={item.id} className="rounded-[20px] bg-cream p-4 ring-1 ring-line">
        <p className="flex items-center justify-between text-[14px]"><span className="font-serif text-[20px] font-semibold text-ink">{order.code}</span><span className="rounded-full bg-[#f6e1d6] px-2.5 py-0.5 text-[12.5px] text-[#8a3f22]">申请{AFTER_SALES[item.type]}</span></p>
        <p className="mt-1 text-[12.5px] text-stone">{order.lines.map((line) => `${line.drinkName}×${line.quantity}`).join('、')} · ¥{order.total} · {ago(item.createdAt)}</p>
        <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-[14px] text-ink">“{item.reason}”</p>
        <textarea value={replies[item.id] || ''} onChange={(event) => setReplies({ ...replies, [item.id]: event.target.value })} rows={2} maxLength={300} placeholder={item.type === 'remake' ? '例如：已为你重做一杯三分糖，请到柜台取' : '例如：已原路退款，1–3 个工作日到账'} className="mt-2 w-full resize-none rounded-xl border border-line bg-paper p-3 text-[13.5px] outline-none focus:border-leaf" />
        <div className="mt-2 flex gap-2"><button type="button" disabled={busy === item.id} onClick={() => void answer(order, item.id, 'rejected')} className="btn-ghost h-10 flex-1">不同意</button><button type="button" disabled={busy === item.id} onClick={() => void answer(order, item.id, 'resolved')} className="btn-jade h-10 flex-1">{busy === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}已处理</button></div>
      </div>)}</div>
    </section>}

    {loading ? <div className="flex min-h-60 items-center justify-center gap-2 text-stone"><LoaderCircle className="size-5 animate-spin text-leaf" />正在读取订单…</div>
      : <div className="grid gap-4 lg:grid-cols-3">{COLUMNS.map((column) => {
        const items = orders.filter((order) => column.statuses.includes(order.status)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        return <section key={column.key} className="rounded-[26px] bg-mist/50 p-3 ring-1 ring-line/60">
          <h3 className="flex items-center gap-2 px-2 pb-3 pt-1 font-serif text-[18px] font-semibold text-ink"><span className={cn('size-2.5 rounded-full', column.tone)} />{column.title}<span className="ml-auto font-sans text-[13px] font-normal text-stone">{items.length}</span></h3>
          <div className="space-y-3">{items.length ? items.map((order) => <Ticket key={order.id} order={order} busy={busy === order.id} onMove={(status, note) => void move(order, status, note)} onCancel={(note) => void move(order, 'cancelled', note)} />) : <p className="rounded-[20px] border border-dashed border-line px-4 py-8 text-center text-[13px] text-stone">暂无</p>}</div>
        </section>;
      })}</div>}

    {done.length > 0 && <details className="rounded-[22px] bg-cream px-5 py-1 ring-1 ring-line"><summary className="flex min-h-12 cursor-pointer items-center text-[14px] text-stone">今日已结束 · {done.length} 单</summary>
      <ul className="divide-y divide-line pb-3">{done.map((order) => <li key={order.id} className="flex items-center gap-4 py-2.5 text-[13.5px]"><span className="w-14 font-serif text-[17px] font-semibold text-ink">{order.code}</span><span className="min-w-0 flex-1 truncate text-stone">{order.lines.map((line) => `${line.drinkName}×${line.quantity}`).join('、')}</span><span className={order.status === 'cancelled' ? 'text-stone' : 'text-jade'}>{STATUS_LABEL[order.status]}</span><span className="w-14 text-right tabular-nums text-ink">¥{order.total}</span></li>)}</ul>
    </details>}
  </div>;
}
