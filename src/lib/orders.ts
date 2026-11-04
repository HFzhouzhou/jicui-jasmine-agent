import type { Order, OrderItemInput, OrderQuote, OrderStatus, PromotionRule, TasteMemory } from '@shared/contracts';
import { apiRequest } from '@/lib/api';

export const quoteOrder = (items: OrderItemInput[]) => apiRequest<{ quote: OrderQuote }>('/api/orders/quote', { method: 'POST', body: JSON.stringify({ items }) }, 15000).then((value) => value.quote);
export const confirmOrder = (quote: OrderQuote) => apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(quote.id)}/confirm`, { method: 'POST', body: JSON.stringify({ expectedTotal: quote.total, confirm: true }) }, 15000).then((value) => value.order);
export const listOrders = (signal?: AbortSignal) => apiRequest<{ orders: Order[] }>('/api/orders', { signal }, 15000).then((value) => value.orders);
export const getOrder = (id: string, signal?: AbortSignal) => apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}`, { signal }, 15000).then((value) => value.order);
export const cancelOrder = (id: string) => apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: '{}' }, 15000).then((value) => value.order);
export const requestAfterSales = (id: string, type: 'remake' | 'refund' | 'other', reason: string) => apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/after-sales`, { method: 'POST', body: JSON.stringify({ type, reason }) }, 15000).then((value) => value.order);
export const getMemory = (signal?: AbortSignal) => apiRequest<{ memory: TasteMemory }>('/api/memory', { signal }, 10000).then((value) => value.memory);
/** Only editable preferences are sent; favourites and the last order are kept by the server. */
export const saveMemory = (memory: TasteMemory) => {
  const { sweetness, temperature, toppings, skipToppings, avoid, allergies, likes, budget } = memory;
  const body = Object.fromEntries(Object.entries({ sweetness, temperature, toppings, skipToppings, avoid, allergies, likes, budget })
    .filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && !value.length)));
  return apiRequest<{ memory: TasteMemory }>('/api/memory', { method: 'PUT', body: JSON.stringify(body) }, 10000).then((value) => value.memory);
};
export const clearMemory = () => apiRequest<{ memory: TasteMemory }>('/api/memory', { method: 'DELETE' }, 10000).then((value) => value.memory);
export const getPromotions = (signal?: AbortSignal) => apiRequest<{ rules: PromotionRule[]; limits: { maxAmount: number; dailyLimit: number; maxCups: number } }>('/api/promotions', { signal }, 10000);

export const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'submitted', label: '已提交' }, { status: 'accepted', label: '已接单' }, { status: 'making', label: '制作中' }, { status: 'ready', label: '待取餐' }, { status: 'completed', label: '已完成' },
];
export const STATUS_LABEL: Record<OrderStatus, string> = { quoted: '待确认', submitted: '等待门店接单', accepted: '门店已接单', making: '制作中', ready: '请取餐', completed: '已完成', cancelled: '已取消' };
export const ACTIVE_STATUSES: OrderStatus[] = ['submitted', 'accepted', 'making', 'ready'];
export const ORDERS_CHANGED = 'jicui:orders-changed';
export const notifyOrdersChanged = () => window.dispatchEvent(new Event(ORDERS_CHANGED));
