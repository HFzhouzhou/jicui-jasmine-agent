import { Link } from 'react-router-dom';
import { LoaderCircle, ReceiptText, RefreshCw } from 'lucide-react';
import OrderCard from '@/components/order/OrderCard';
import { useOrders } from '@/hooks/useActiveOrders';

export default function OrdersPage() {
  const { orders, active, loading, error, refresh } = useOrders(15000);
  const history = orders.filter((order) => !active.includes(order));

  return <div className="mx-auto max-w-3xl px-4 pb-12 pt-5 sm:px-8 sm:pt-8">
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink sm:text-[36px]">我的订单</h1>
        <p className="mt-1 text-sm leading-6 text-stone">取餐时向门店付款。</p>
      </div>
      <button type="button" onClick={() => void refresh()} className="btn-ghost h-11 shrink-0"><RefreshCw className="size-4" aria-hidden="true" />刷新</button>
    </header>

    <div className="mt-5 space-y-6">
      {error && <p role="alert" className="rounded-2xl bg-blush px-4 py-3 text-sm text-[#8a4b2a]">{error}</p>}
      {loading ? <div className="card-soft flex min-h-40 items-center justify-center gap-3 text-stone" role="status"><LoaderCircle className="size-5 animate-spin text-leaf" aria-hidden="true" />正在读取订单…</div>
        : !orders.length && !error ? <div className="card-soft px-6 py-9 text-center">
          <ReceiptText className="mx-auto size-7 text-leaf" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-xl font-semibold text-ink">还没有订单</h2>
          <Link to="/ai-recommend" className="btn-jade mt-4 h-11 px-5">开始随心配</Link>
        </div> : <>
          {active.length > 0 && <section className="space-y-4"><h2 className="font-serif text-xl font-semibold text-ink">进行中</h2>{active.map((order) => <OrderCard key={order.id} order={order} />)}</section>}
          {history.length > 0 && <section className="space-y-4"><h2 className="font-serif text-xl font-semibold text-ink">历史订单</h2>{history.map((order) => <OrderCard key={order.id} order={order} live={false} />)}</section>}
        </>}
    </div>

    <details className="mt-6 rounded-2xl border border-line bg-cream px-4 text-sm leading-6 text-stone">
      <summary className="cursor-pointer py-3 font-medium text-jade">下单与售后说明</summary>
      <ul className="list-disc space-y-1 pb-4 pl-4">
        <li>按门店菜单核价，你确认后才提交。单笔金额和每日下单次数有上限。</li>
        <li>门店接单前可自行取消。接单后可申请重做或退款，由门店审核。</li>
        <li>订单关联当前设备，无需注册。</li>
      </ul>
    </details>
  </div>;
}
