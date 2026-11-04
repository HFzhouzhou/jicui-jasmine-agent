import type { BlindBoxResult, BundleProposal, Order, OrderItemInput, RecommendIntent, TasteMemory, TeaCard } from '../../shared/contracts.js';
import { isTeaCard } from './tea-card.js';

/** Ordering-related fields a chat turn can carry. They are re-validated when restored from storage. */
export interface ChatExtras {
  intent?: RecommendIntent;
  proposal?: OrderItemInput[];
  bundle?: BundleProposal;
  blindbox?: BlindBoxResult;
  orders?: Order[];
  memory?: TasteMemory;
  suggestions?: string[];
}

const INTENTS: RecommendIntent[] = ['knowledge', 'recommend', 'mixed', 'catalog', 'clarify', 'bundle', 'blindbox', 'repeat', 'order_status', 'after_sales', 'memory', 'ingredient'];
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const textList = (value: unknown, max = 12, length = 60): value is string[] => Array.isArray(value) && value.length <= max && value.every((item) => text(item, length));
const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 100000;

export function isOrderItem(value: unknown): value is OrderItemInput {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return text(item.drinkId, 64) && /^[a-zA-Z0-9_-]+$/.test(item.drinkId) && Number.isInteger(item.quantity) && (item.quantity as number) >= 1 && (item.quantity as number) <= 20
    && ['volume', 'sweetness', 'temperature'].every((key) => item[key] === undefined || text(item[key], 40))
    && (item.toppings === undefined || textList(item.toppings, 6, 40)) && (item.note === undefined || text(item.note, 120));
}
function isBundle(value: unknown): value is BundleProposal {
  if (!value || typeof value !== 'object') return false;
  const bundle = value as BundleProposal;
  return Number.isInteger(bundle.people) && bundle.people >= 2 && bundle.people <= 3 && (bundle.totalBudget === null || money(bundle.totalBudget))
    && money(bundle.subtotal) && money(bundle.discount) && money(bundle.total) && (bundle.discountLabel === undefined || text(bundle.discountLabel, 40))
    && (bundle.tastes === undefined || textList(bundle.tastes, 4, 20))
    && Array.isArray(bundle.items) && bundle.items.length <= 3 && bundle.items.every((item) => item && isTeaCard(item.card) && text(item.forWhom, 60) && text(item.why, 400));
}
function isBlindBox(value: unknown): value is BlindBoxResult {
  if (!value || typeof value !== 'object') return false;
  const box = value as BlindBoxResult;
  return text(box.mood, 30) && text(box.title, 40) && text(box.blessing, 120) && text(box.daypart, 10) && textList(box.basis, 6, 120);
}
function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') return false;
  const order = value as Order;
  return text(order.id, 80) && text(order.code, 12) && text(order.status, 20) && Array.isArray(order.lines) && Array.isArray(order.timeline) && Array.isArray(order.afterSales) && money(order.total);
}
function isMemory(value: unknown): value is TasteMemory {
  if (!value || typeof value !== 'object') return false;
  const memory = value as Record<string, unknown>;
  return ['sweetness', 'temperature'].every((key) => memory[key] === undefined || text(memory[key], 40))
    && ['toppings', 'skipToppings', 'avoid', 'allergies', 'likes'].every((key) => memory[key] === undefined || textList(memory[key]));
}

export function pickExtras(value: Partial<ChatExtras> | null | undefined): ChatExtras {
  if (!value) return {};
  return {
    ...(value.intent && INTENTS.includes(value.intent) ? { intent: value.intent } : {}),
    ...(Array.isArray(value.proposal) && value.proposal.length <= 3 && value.proposal.every(isOrderItem) ? { proposal: value.proposal } : {}),
    ...(isBundle(value.bundle) ? { bundle: value.bundle } : {}),
    ...(isBlindBox(value.blindbox) ? { blindbox: value.blindbox } : {}),
    ...(Array.isArray(value.orders) && value.orders.length <= 5 && value.orders.every(isOrder) ? { orders: value.orders } : {}),
    ...(isMemory(value.memory) ? { memory: value.memory } : {}),
    ...(textList(value.suggestions, 4, 80) ? { suggestions: value.suggestions } : {}),
  };
}

export function proposalFor(proposal: OrderItemInput[] | undefined, card: Pick<TeaCard, 'drinkId'> | undefined) {
  return card ? proposal?.find((item) => item.drinkId === card.drinkId) : undefined;
}

/** Human-readable memory lines, mirroring the server's wording. */
export function memoryLines(memory: TasteMemory): { label: string; value: string; tone?: 'strict' | 'soft' }[] {
  return [
    memory.sweetness && { label: '甜度', value: memory.sweetness },
    memory.temperature && { label: '冰量', value: memory.temperature },
    memory.toppings?.length && { label: '爱加', value: memory.toppings.join('、') },
    memory.skipToppings?.length && { label: '不加', value: memory.skipToppings.join('、'), tone: 'soft' as const },
    memory.allergies?.length && { label: '严格避开', value: memory.allergies.join('、'), tone: 'strict' as const },
    memory.avoid?.length && { label: '不太想要', value: memory.avoid.join('、'), tone: 'soft' as const },
    memory.likes?.length && { label: '口味', value: memory.likes.join('、') },
    memory.budget && { label: '预算', value: `¥${memory.budget} 以内` },
    memory.favorites?.length && { label: '常点', value: memory.favorites.slice(0, 3).map((item) => item.drinkName).join('、') },
  ].filter((value): value is { label: string; value: string; tone?: 'strict' | 'soft' } => Boolean(value));
}

/** Bottom sheet on phones, centred card on larger screens. */
export const sheetDialogClass = '!bottom-0 !top-auto flex max-h-[94dvh] !max-w-full !translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[32px] rounded-b-none border-0 bg-paper p-0 sm:!bottom-auto sm:!top-1/2 sm:!max-w-[560px] sm:!-translate-y-1/2 sm:rounded-[32px]';
