import { useCallback, useEffect, useState } from 'react';
import type { Order } from '@shared/contracts';
import { ACTIVE_STATUSES, listOrders, ORDERS_CHANGED } from '@/lib/orders';

/** Polls this device's orders so status changes made at the store counter show up. */
export function useOrders(pollMs = 20000) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try { const value = await listOrders(signal); if (!signal?.aborted) { setOrders(value); setError(''); } }
    catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : '订单读取失败'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const onChange = () => void refresh();
    window.addEventListener(ORDERS_CHANGED, onChange);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, pollMs);
    return () => { controller.abort(); window.removeEventListener(ORDERS_CHANGED, onChange); window.clearInterval(timer); };
  }, [refresh, pollMs]);
  const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  return { orders, active, loading, error, refresh };
}
