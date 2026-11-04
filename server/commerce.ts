import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { formatVolumeLabel } from '../shared/catalog-display.js';
import type { AfterSalesRequest, Drink, Order, OrderItemInput, OrderLine, OrderQuote, OrderStatus, PromotionRule, TasteMemory } from '../shared/contracts.js';
import { ApiFailure } from './errors.js';

export interface OrderLimits {maxAmount: number; dailyLimit: number; maxCups: number; quoteTtlMs: number}
export const DEFAULT_LIMITS: OrderLimits = {maxAmount: 300, dailyLimit: 10, maxCups: 20, quoteTtlMs: 10 * 60_000};

/** Store-side ordering for this app's own pickup counter. It never takes payment. */
const SWEETNESS: Record<string, string> = {'0糖': '无糖', '零糖': '无糖', '不加糖': '无糖', '不要糖': '无糖', '3分糖': '三分糖', '三分甜': '三分糖', '5分糖': '五分糖', '半糖': '五分糖', '7分糖': '七分糖', '正常糖': '全糖'};
const TEMPERATURE: Record<string, string> = {'热的': '热饮', '热': '热饮', '常温的': '常温', '温的': '温饮', '温热': '温饮', '冰的': '正常冰', '冰饮': '正常冰', '不加冰': '去冰', '不冰': '去冰'};
const DEFAULT_CHOICE = /^(?:|随门店标准|按门店默认|门店标准|待门店确认|不指定|默认)$/;
export function normalizeChoice(value: string | null | undefined, type: 'sweetness' | 'temperature'): string {
  const text = (value || '').trim();
  return (type === 'sweetness' ? SWEETNESS : TEMPERATURE)[text] || text;
}
const round = (value: number) => Math.round(value * 100) / 100;
const yuan = (value: number) => `¥${round(value)}`;

export const DEFAULT_PROMOTIONS: PromotionRule[] = [
  {id: 'second-half', type: 'second_half', title: '第二杯半价', enabled: false, rate: 0.5, note: '示例规则：门店确认后由管理员启用。每两杯中价格较低的一杯按设定折扣计算。'},
  {id: 'spend-save', type: 'threshold', title: '满 30 减 5', enabled: false, threshold: 30, off: 5, note: '示例规则：门店确认后由管理员启用。'},
];

export function bestPromotion(unitPrices: number[], rules: PromotionRule[]): {discount: number; label?: string} {
  const subtotal = round(unitPrices.reduce((sum, value) => sum + value, 0));
  let best: {discount: number; label?: string} = {discount: 0};
  for (const rule of rules) {
    if (!rule.enabled) continue;
    let discount = 0;
    if (rule.type === 'second_half' && rule.rate !== undefined) {
      // The cheaper cup of each pair gets the discount, so the shop never discounts the pricier cup.
      const sorted = [...unitPrices].sort((a, b) => b - a);
      for (let index = 1; index < sorted.length; index += 2) discount += sorted[index] * (1 - rule.rate);
    } else if (rule.type === 'threshold' && rule.threshold !== undefined && rule.off !== undefined && subtotal >= rule.threshold) discount = rule.off;
    discount = Math.min(round(discount), subtotal);
    if (discount > best.discount) best = {discount, label: rule.title};
  }
  return best;
}

function eligibleForOrder(drink: Drink | undefined): drink is Drink {
  return Boolean(drink && drink.available && ['observed', 'managed'].includes(drink.catalogStatus || ''));
}

/** Server-side price and option check. Client text never sets a price. */
export function priceItems(items: OrderItemInput[], drinks: Drink[], rules: PromotionRule[]) {
  const problems: string[] = [];
  const lines: OrderLine[] = [];
  for (const item of items) {
    const drink = drinks.find(entry => entry.id === item.drinkId);
    if (!eligibleForOrder(drink)) {problems.push(`${drinks.find(entry => entry.id === item.drinkId)?.name || '所选商品'}当前无法下单（可能已售罄或不在本店茶单）。`); continue;}
    const pending: string[] = [];
    const startingPrice = Boolean(drink.catalogEvidence?.startingPrice && drink.catalogEvidence.verifiedFields.includes('price'));
    const knownVolume = drink.verified || drink.catalogEvidence?.verifiedFields.includes('volume') ? formatVolumeLabel(drink.volume) : '';
    const volumeOptions = knownVolume && !/待|未知/.test(knownVolume) ? knownVolume.split(/\s*[/／]\s*/) : [];
    let volume = (item.volume || '').trim();
    if (!volume || /随门店|待|门店标准/.test(volume)) volume = volumeOptions.length === 1 ? volumeOptions[0] : '门店标准杯型';
    if (volume === '门店标准杯型' || !volumeOptions.length) pending.push('杯型');
    else if (!volumeOptions.includes(volume)) pending.push(`杯型「${volume}」`);
    const options: Record<'sweetness' | 'temperature', string> = {sweetness: '门店标准', temperature: '门店标准'};
    for (const type of ['sweetness', 'temperature'] as const) {
      const requested = normalizeChoice(item[type], type);
      if (DEFAULT_CHOICE.test(requested)) continue;
      const registered = type === 'sweetness' ? drink.sweetnessOptions : drink.temperatureOptions;
      const label = type === 'sweetness' ? '甜度' : '冰量 / 温度';
      if (drink.verified && registered.length) {
        if (!registered.some(value => normalizeChoice(value, type) === requested)) {problems.push(`${drink.name}的${label}没有「${requested}」，可选：${registered.join('、')}。`); continue;}
      } else pending.push(`${label}「${requested}」`);
      options[type] = requested;
    }
    const toppings: {name: string; price: number}[] = [];
    for (const name of [...new Set((item.toppings || []).map(value => value.trim()).filter(value => value && !/^(?:不额外加料|未加料|无|不加)$/.test(value)))]) {
      const topping = drink.verified ? drink.toppings.find(entry => entry.name === name) : undefined;
      if (!topping) problems.push(`${drink.name}暂未登记可加「${name}」，需要换个小料或先不加。`);
      else toppings.push(topping);
    }
    if (startingPrice) pending.push('最终规格价（目录为起价）');
    const unitPrice = round(drink.price + toppings.reduce((sum, topping) => sum + topping.price, 0));
    lines.push({drinkId: drink.id, drinkName: drink.name, quantity: item.quantity, volume, sweetness: options.sweetness, temperature: options.temperature, toppings, ...(item.note?.trim() ? {note: item.note.trim()} : {}), unitPrice, lineTotal: round(unitPrice * item.quantity), startingPrice, pending});
  }
  const units = lines.flatMap(line => Array<number>(line.quantity).fill(line.unitPrice));
  const subtotal = round(units.reduce((sum, value) => sum + value, 0));
  const promotion = bestPromotion(units, rules);
  return {problems, lines, subtotal, discount: promotion.discount, discountLabel: promotion.label, total: round(subtotal - promotion.discount), cups: units.length};
}

/** The read-back the customer confirms before anything is submitted. */
export function readBack(priced: ReturnType<typeof priceItems>): string {
  const lines = priced.lines.map(line => {
    const details = [line.volume, line.sweetness, line.temperature, line.toppings.length ? `加${line.toppings.map(topping => topping.name).join('、')}` : '不加料', line.note ? `备注：${line.note}` : ''].filter(Boolean);
    return `${line.drinkName} × ${line.quantity}（${details.join('，')}）`;
  });
  const discount = priced.discount ? `，${priced.discountLabel} -${yuan(priced.discount)}` : '';
  return `我复述一下：${lines.join('；')}。共 ${priced.cups} 杯，小计 ${yuan(priced.subtotal)}${discount}，合计 ${yuan(priced.total)}。确认无误后提交到门店接单台，到店付款。`;
}

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  quoted: [], submitted: ['accepted', 'cancelled'], accepted: ['making', 'cancelled'], making: ['ready'], ready: ['completed'], completed: [], cancelled: [],
};
export const STATUS_TEXT: Record<OrderStatus, string> = {
  quoted: '待确认', submitted: '已提交，等待门店接单', accepted: '门店已接单', making: '制作中', ready: '已做好，请取餐', completed: '已完成', cancelled: '已取消',
};

export class CommerceStore {
  constructor(private readonly db: DatabaseSync, readonly limits: OrderLimits = DEFAULT_LIMITS) {
    db.exec(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, status TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL, submitted_at TEXT, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS orders_by_customer ON orders(customer_id, created_at);
      CREATE INDEX IF NOT EXISTS orders_by_status ON orders(status, submitted_at);
      CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, memory TEXT NOT NULL, updated_at TEXT NOT NULL);`);
  }

  promotions(): PromotionRule[] {
    const row = this.db.prepare("SELECT value FROM metadata WHERE key = 'promotions'").get();
    return row ? JSON.parse(row.value as string) as PromotionRule[] : DEFAULT_PROMOTIONS;
  }
  setPromotions(rules: PromotionRule[]) {
    this.db.prepare("INSERT INTO metadata (key, value) VALUES ('promotions', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(rules));
    return rules;
  }

  memory(customerId: string): TasteMemory {
    const row = this.db.prepare('SELECT memory FROM customers WHERE id = ?').get(customerId);
    return row ? JSON.parse(row.memory as string) as TasteMemory : {};
  }
  saveMemory(customerId: string, memory: TasteMemory): TasteMemory {
    const value = {...memory, updatedAt: new Date().toISOString()};
    this.db.prepare('INSERT INTO customers (id, memory, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET memory = excluded.memory, updated_at = excluded.updated_at').run(customerId, JSON.stringify(value), value.updatedAt);
    return value;
  }
  clearMemory(customerId: string) {this.db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);}

  private save(customerId: string, order: Order) {
    this.db.prepare(`INSERT INTO orders (id, customer_id, status, value, created_at, submitted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, value = excluded.value, submitted_at = excluded.submitted_at, updated_at = excluded.updated_at`)
      .run(order.id, customerId, order.status, JSON.stringify(order), order.createdAt, order.timeline.find(entry => entry.status === 'submitted')?.at ?? null, order.updatedAt);
  }
  private load(id: string): {customerId: string; order: Order} | undefined {
    const row = this.db.prepare('SELECT customer_id, value FROM orders WHERE id = ?').get(id);
    return row ? {customerId: row.customer_id as string, order: JSON.parse(row.value as string) as Order} : undefined;
  }
  private submittedSince(customerId: string, since: number) {
    return (this.db.prepare("SELECT COUNT(*) AS count FROM orders WHERE customer_id = ? AND submitted_at >= ? AND status != 'quoted'").get(customerId, new Date(since).toISOString()) as {count: number}).count;
  }
  dailyRemaining(customerId: string, now = Date.now()) {return Math.max(0, this.limits.dailyLimit - this.submittedSince(customerId, now - 86_400_000));}

  quote(customerId: string, items: OrderItemInput[], drinks: Drink[], now = Date.now()): OrderQuote {
    this.db.prepare("DELETE FROM orders WHERE status = 'quoted' AND created_at < ?").run(new Date(now - 86_400_000).toISOString());
    const priced = priceItems(items, drinks, this.promotions());
    if (priced.problems.length) throw new ApiFailure(409, 'ORDER_NEEDS_CHANGE', priced.problems.join(''));
    if (!priced.lines.length) throw new ApiFailure(400, 'ORDER_EMPTY', '请至少选择一杯饮品。');
    if (priced.cups > this.limits.maxCups) throw new ApiFailure(400, 'ORDER_TOO_MANY_CUPS', `单笔最多 ${this.limits.maxCups} 杯，请分开下单或联系门店。`);
    if (priced.total > this.limits.maxAmount) throw new ApiFailure(400, 'ORDER_AMOUNT_LIMIT', `单笔金额不能超过 ¥${this.limits.maxAmount}，请减少杯数或联系门店。`);
    const at = new Date(now).toISOString();
    const pending = priced.lines.filter(line => line.pending.length).map(line => `${line.drinkName}：${line.pending.join('、')}需门店确认`);
    const quote: OrderQuote = {id: randomUUID(), code: '', status: 'quoted', lines: priced.lines, cups: priced.cups, subtotal: priced.subtotal, discount: priced.discount, ...(priced.discountLabel ? {discountLabel: priced.discountLabel} : {}), total: priced.total,
      summary: readBack(priced), warnings: [...pending, '本系统不收款，也不会由 AI 代付；请在取餐时向门店付款。'], createdAt: at, updatedAt: at, expiresAt: new Date(now + this.limits.quoteTtlMs).toISOString(),
      timeline: [{status: 'quoted', at}], afterSales: [], limits: {maxAmount: this.limits.maxAmount, dailyRemaining: this.dailyRemaining(customerId, now)}};
    this.save(customerId, quote);
    return quote;
  }

  /** Second stage: the customer explicitly confirms the read-back. Prices are recomputed. */
  confirm(customerId: string, quoteId: string, expectedTotal: number, drinks: Drink[], now = Date.now()): Order {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const found = this.load(quoteId);
      if (!found || found.customerId !== customerId) throw new ApiFailure(404, 'ORDER_NOT_FOUND', '找不到这份待确认订单，请重新生成。');
      const {order} = found;
      if (order.status !== 'quoted') throw new ApiFailure(409, 'ORDER_ALREADY_SUBMITTED', '这份订单已经提交过了。');
      if (!order.expiresAt || Date.parse(order.expiresAt) < now) throw new ApiFailure(409, 'QUOTE_EXPIRED', '确认单已过期，请重新核对价格后再提交。');
      if (Math.abs(order.total - expectedTotal) > 0.001) throw new ApiFailure(409, 'QUOTE_CHANGED', '金额与确认单不一致，请重新核对。');
      const items = order.lines.map(line => ({drinkId: line.drinkId, quantity: line.quantity, volume: line.volume, sweetness: line.sweetness, temperature: line.temperature, toppings: line.toppings.map(topping => topping.name), ...(line.note ? {note: line.note} : {})}));
      const priced = priceItems(items, drinks, this.promotions());
      if (priced.problems.length || Math.abs(priced.total - order.total) > 0.001) throw new ApiFailure(409, 'QUOTE_CHANGED', '菜单价格、售卖状态或优惠刚刚有变化，请重新确认订单。');
      if (this.dailyRemaining(customerId, now) <= 0) throw new ApiFailure(429, 'ORDER_DAILY_LIMIT', `为防止误下单，同一设备 24 小时内最多提交 ${this.limits.dailyLimit} 单。`);
      const at = new Date(now).toISOString();
      const today = at.slice(0, 10);
      const sequence = (this.db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status != 'quoted' AND substr(submitted_at, 1, 10) = ?").get(today) as {count: number}).count + 1;
      const submitted: Order = {...order, status: 'submitted', code: `A${String(sequence).padStart(3, '0')}`, updatedAt: at, timeline: [...order.timeline, {status: 'submitted', at}]};
      delete submitted.expiresAt;
      delete (submitted as Partial<OrderQuote>).limits;
      this.save(customerId, submitted);
      this.learn(customerId, submitted);
      this.db.exec('COMMIT');
      return submitted;
    } catch (error) {this.db.exec('ROLLBACK'); throw error;}
  }

  private learn(customerId: string, order: Order) {
    const memory = this.memory(customerId);
    const first = order.lines[0];
    const favorites = [...(memory.favorites || [])];
    for (const line of order.lines) {
      const existing = favorites.find(entry => entry.drinkId === line.drinkId);
      if (existing) {existing.count += line.quantity; existing.drinkName = line.drinkName;} else favorites.push({drinkId: line.drinkId, drinkName: line.drinkName, count: line.quantity});
    }
    favorites.sort((a, b) => b.count - a.count);
    this.saveMemory(customerId, {...memory, favorites: favorites.slice(0, 5), lastOrder: {drinkId: first.drinkId, quantity: first.quantity, volume: first.volume, sweetness: first.sweetness, temperature: first.temperature, toppings: first.toppings.map(topping => topping.name), ...(first.note ? {note: first.note} : {})}});
  }

  orders(customerId: string, limit = 20): Order[] {
    return this.db.prepare("SELECT value FROM orders WHERE customer_id = ? AND status != 'quoted' ORDER BY created_at DESC LIMIT ?").all(customerId, limit).map(row => JSON.parse(row.value as string) as Order);
  }
  order(customerId: string, id: string): Order | undefined {
    const found = this.load(id);
    return found && found.customerId === customerId && found.order.status !== 'quoted' ? found.order : undefined;
  }

  cancel(customerId: string, id: string): Order {
    const order = this.order(customerId, id);
    if (!order) throw new ApiFailure(404, 'ORDER_NOT_FOUND', '找不到这笔订单。');
    if (order.status !== 'submitted') throw new ApiFailure(409, 'ORDER_NOT_CANCELLABLE', '门店已经接单，不能自助取消；可以申请售后或联系店员。');
    return this.transition(customerId, order, 'cancelled', '顾客自助取消');
  }

  private transition(customerId: string, order: Order, status: OrderStatus, note?: string): Order {
    const at = new Date().toISOString();
    const next: Order = {...order, status, updatedAt: at, timeline: [...order.timeline, {status, at, ...(note ? {note} : {})}]};
    this.save(customerId, next);
    return next;
  }

  requestAfterSales(customerId: string, id: string, type: AfterSalesRequest['type'], reason: string): Order {
    const order = this.order(customerId, id);
    if (!order) throw new ApiFailure(404, 'ORDER_NOT_FOUND', '找不到这笔订单。');
    if (!['accepted', 'making', 'ready', 'completed'].includes(order.status)) throw new ApiFailure(409, 'AFTER_SALES_UNAVAILABLE', order.status === 'submitted' ? '门店还没开始制作，可以直接取消后重新下单。' : '这笔订单当前不能申请售后。');
    if (order.afterSales.filter(entry => entry.status === 'pending').length) throw new ApiFailure(409, 'AFTER_SALES_PENDING', '这笔订单已有一个售后申请在处理，请稍候。');
    if (order.afterSales.length >= 3) throw new ApiFailure(409, 'AFTER_SALES_LIMIT', '这笔订单的售后申请次数已达上限，请直接联系门店。');
    const at = new Date().toISOString();
    const next: Order = {...order, updatedAt: at, afterSales: [...order.afterSales, {id: randomUUID(), type, reason, status: 'pending', createdAt: at, updatedAt: at}]};
    this.save(customerId, next);
    return next;
  }

  /** Admin queue: everything a store counter needs, newest first. */
  adminOrders(limit = 100): Order[] {
    return this.db.prepare("SELECT value FROM orders WHERE status != 'quoted' ORDER BY created_at DESC LIMIT ?").all(limit).map(row => JSON.parse(row.value as string) as Order);
  }
  adminUpdate(id: string, status: OrderStatus, note?: string): Order {
    const found = this.load(id);
    if (!found || found.order.status === 'quoted') throw new ApiFailure(404, 'ORDER_NOT_FOUND', '找不到这笔订单。');
    if (!ORDER_TRANSITIONS[found.order.status].includes(status)) throw new ApiFailure(409, 'ORDER_TRANSITION', `订单当前为「${STATUS_TEXT[found.order.status]}」，不能改为「${STATUS_TEXT[status]}」。`);
    return this.transition(found.customerId, found.order, status, note);
  }
  adminAfterSales(id: string, requestId: string, status: 'resolved' | 'rejected', reply: string): Order {
    const found = this.load(id);
    if (!found) throw new ApiFailure(404, 'ORDER_NOT_FOUND', '找不到这笔订单。');
    const request = found.order.afterSales.find(entry => entry.id === requestId);
    if (!request) throw new ApiFailure(404, 'AFTER_SALES_NOT_FOUND', '找不到这条售后申请。');
    if (request.status !== 'pending') throw new ApiFailure(409, 'AFTER_SALES_CLOSED', '这条售后申请已处理。');
    const at = new Date().toISOString();
    const next: Order = {...found.order, updatedAt: at, afterSales: found.order.afterSales.map(entry => entry.id === requestId ? {...entry, status, reply, updatedAt: at} : entry)};
    this.save(found.customerId, next);
    return next;
  }

  /** Recent store popularity from real submitted orders only. */
  popularity(days = 14): Map<string, number> {
    const counts = new Map<string, number>();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    for (const row of this.db.prepare("SELECT value FROM orders WHERE status NOT IN ('quoted', 'cancelled') AND submitted_at >= ?").all(since)) {
      for (const line of (JSON.parse(row.value as string) as Order).lines) counts.set(line.drinkId, (counts.get(line.drinkId) || 0) + line.quantity);
    }
    return counts;
  }
}
