import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, ReceiptText, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import OrderCard from '@/components/order/OrderCard';
import MemoryPanel from '@/components/chat/MemoryPanel';
import { useOrders } from '@/hooks/useActiveOrders';

/** This device's pickup orders, after-sales requests and taste memory. */
export default function OrdersPage() {
  const { orders, active, loading, error, refresh } = useOrders(15000);
  const { hash } = useLocation();
  const history = orders.filter((order) => !active.includes(order));
  useEffect(() => { if (hash === '#memory') requestAnimationFrame(() => document.getElementById('memory')?.scrollIntoView({ behavior: 'smooth' })); }, [hash, loading]);

  return <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-8 sm:pt-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">MY ORDERS · 取餐与售后</p>
        <h1 className="mt-2 font-serif text-[34px] font-semibold leading-tight text-ink sm:text-[44px]">我的订单</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-7 text-stone">门店接单、制作、出杯都会实时更新。付款在取餐时向门店完成，AI 不代付。</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void refresh()} className="btn-ghost h-11"><RefreshCw className="size-4" />刷新</button>
        <Link to="/ai-recommend" className="btn-jade h-11"><Sparkles className="size-4" />再配一杯</Link>
      </div>
    </header>

    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-8">
        {error && <p role="alert" className="rounded-2xl bg-blush px-4 py-3 text-[14px] text-[#8a4b2a]">{error}</p>}
        {loading ? <div className="card-soft flex min-h-60 items-center justify-center gap-3 text-stone"><LoaderCircle className="size-5 animate-spin text-leaf" />正在读取订单…</div>
          : !orders.length ? <div className="card-soft relative overflow-hidden px-6 py-12 text-center sm:px-10">
            <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-mist text-jade"><ReceiptText className="size-8" strokeWidth={1.5} /></span>
            <h2 className="mt-5 font-serif text-[24px] font-semibold text-ink">还没有订单</h2>
            <p className="mx-auto mt-2 max-w-sm text-[14.5px] leading-7 text-stone">和茉莉娘子说一句想喝什么，确认复述后就能提交到门店，拿到取餐号。</p>
            <Link to="/ai-recommend" className="btn-jade mx-auto mt-6 h-12 w-fit px-6"><Sparkles className="size-4" />开始随心配<ArrowUpRight className="size-4" /></Link>
          </div>
            : <>
              {active.length > 0 && <section className="space-y-4"><h2 className="flex items-center gap-2 font-serif text-[22px] font-semibold text-ink">进行中<span className="flex size-6 items-center justify-center rounded-full bg-gold font-sans text-[12px] text-cream">{active.length}</span></h2>{active.map((order) => <OrderCard key={order.id} order={order} />)}</section>}
              {history.length > 0 && <section className="space-y-4"><h2 className="font-serif text-[22px] font-semibold text-ink">历史订单</h2>{history.map((order) => <OrderCard key={order.id} order={order} live={false} />)}</section>}
            </>}
      </div>
      <aside className="space-y-5 lg:sticky lg:top-24">
        <MemoryPanel editable />
        <div className="rounded-[24px] bg-paper p-5 text-[13.5px] leading-6 text-stone ring-1 ring-line/70">
          <p className="mb-2 flex items-center gap-2 font-medium text-ink"><ShieldCheck className="size-4 text-leaf" />下单护栏</p>
          <ul className="space-y-1.5">
            <li>· 每笔订单先由门店菜单核价、复述，你确认后才提交。</li>
            <li>· 单笔金额和每日下单次数有上限，防止误下单。</li>
            <li>· 门店接单前可自助取消；接单后可申请重做或退款，由门店审核。</li>
            <li>· 订单与口味记忆只关联这个浏览器，不需要注册账号。</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>;
}
