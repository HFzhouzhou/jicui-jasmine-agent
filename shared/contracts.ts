import type { KnowledgeCitation } from './rag';
/** Public API contract. Secrets and model prompts never belong in this module. */
export interface CatalogEvidence {
  source: string;
  storeName: string;
  observedAt: string;
  scope: 'store-menu';
  priceKind: 'regular';
  startingPrice: boolean;
  observedName: string;
  observedPrice: number;
  observedCategory: string;
  observedVolume?: string;
  observedAvailable: boolean;
  /** Fields of the current record that still match the observed source. */
  verifiedFields: ('name' | 'price' | 'category' | 'volume')[];
}
export interface Drink {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  volume: string;
  category: string;
  tags: string[];
  description: string;
  available: boolean;
  verified: boolean;
  ingredients: string[];
  allergens: string[] | null;
  caffeine: 'unknown' | 'contains' | 'none';
  sweetnessOptions: string[];
  temperatureOptions: string[];
  toppings: { name: string; price: number }[];
  /** Verified kcal for the default cup. Missing/null means no verified data — never estimate. */
  calories?: number | null;
  source: string;
  updatedAt: string;
  /** Legacy records stay available to managers but are excluded from public recommendations. */
  catalogStatus?: 'observed' | 'managed' | 'legacy';
  catalogEvidence?: CatalogEvidence;
}
export interface Preferences {
  sweetness?: string;
  temperature?: string;
  dietary?: string[];
  budget?: string;
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
/** Structured shortcuts from UI buttons. Free text still goes through `message`. */
export type RecommendAction =
  | {type: 'blindbox'; mood: string; weather?: string}
  | {type: 'bundle'; /** 2–3 */ people: number; totalBudget?: number | null; tastes?: string[]}
  | {type: 'repeat'; change?: 'base' | 'none'}
  | {type: 'orders'};
export interface RecommendRequest {
  message: string;
  history?: ChatMessage[];
  profile?: Preferences;
  excludeIds?: string[];
  action?: RecommendAction;
}
export interface TeaCard {
  drinkId: string;
  drinkName: string;
  drinkNameEn: string;
  price: number;
  volume: string;
  sweetness: string;
  temperature: string;
  toppings: string;
  reason: string;
  message: string;
  funFact: string;
  orderPhrase: string;
  isMain?: boolean;
  matchTags?: string[];
  verified: boolean;
  startingPrice?: boolean;
  catalogStatus?: Drink['catalogStatus'];
  catalogEvidence?: CatalogEvidence;
}
export type RecommendIntent = 'knowledge' | 'recommend' | 'mixed' | 'catalog' | 'clarify'
  | 'bundle' | 'blindbox' | 'repeat' | 'order_status' | 'after_sales' | 'memory' | 'ingredient';
export interface RecommendResponse {
  /** Optional for compatibility with earlier saved conversations and API responses. */
  intent?: RecommendIntent;
  reply: string;
  cards: TeaCard[];
  notices: string[];
  mode: 'live' | 'preview';
  requestId: string;
  citations?: KnowledgeCitation[];
  /** Pre-filled order lines for the cards. The user still confirms a server quote before submitting. */
  proposal?: OrderItemInput[];
  bundle?: BundleProposal;
  blindbox?: BlindBoxResult;
  orders?: Order[];
  memory?: TasteMemory;
  /** Tappable follow-up replies for clarification. */
  suggestions?: string[];
}

/** Cross-session taste memory, keyed by an anonymous browser customer ID. */
export interface TasteMemory {
  sweetness?: string;
  temperature?: string;
  toppings?: string[];
  skipToppings?: string[];
  /** Soft dislikes ("不碰植脂末"). Never a safety claim: carried to the store as an order note. */
  avoid?: string[];
  /** Hard restrictions (allergy, intolerance, caffeine): only verified drinks can satisfy them. */
  allergies?: string[];
  likes?: string[];
  budget?: number | null;
  lastOrder?: OrderItemInput | null;
  favorites?: {drinkId: string; drinkName: string; count: number}[];
  updatedAt?: string;
}

export interface OrderItemInput {
  drinkId: string;
  quantity: number;
  volume?: string;
  sweetness?: string;
  temperature?: string;
  toppings?: string[];
  note?: string;
}
export interface OrderLine {
  drinkId: string;
  drinkName: string;
  quantity: number;
  volume: string;
  sweetness: string;
  temperature: string;
  toppings: {name: string; price: number}[];
  note?: string;
  unitPrice: number;
  lineTotal: number;
  startingPrice: boolean;
  /** Choices the store still has to confirm, e.g. unverified sweetness options. */
  pending: string[];
}
export type OrderStatus = 'quoted' | 'submitted' | 'accepted' | 'making' | 'ready' | 'completed' | 'cancelled';
export interface AfterSalesRequest {
  id: string;
  type: 'remake' | 'refund' | 'other';
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  reply?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Order {
  id: string;
  /** Short pickup code shown to the customer and staff. */
  code: string;
  status: OrderStatus;
  lines: OrderLine[];
  cups: number;
  subtotal: number;
  discount: number;
  discountLabel?: string;
  total: number;
  /** The read-back sentence the customer confirmed. */
  summary: string;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  timeline: {status: OrderStatus; at: string; note?: string}[];
  afterSales: AfterSalesRequest[];
}
export interface OrderQuote extends Order {status: 'quoted'; expiresAt: string; limits: {maxAmount: number; dailyRemaining: number}}

export interface PromotionRule {
  id: string;
  type: 'second_half' | 'threshold';
  title: string;
  enabled: boolean;
  /** second_half: rate applied to every second cup (0.5 = half price). threshold: spend `threshold`, save `off`. */
  rate?: number;
  threshold?: number;
  off?: number;
  note: string;
}

export interface BundleProposal {
  people: number;
  totalBudget: number | null;
  /** Taste asked for each person, in order (e.g. 清爽 / 浓郁 / 随意). */
  tastes: string[];
  items: {card: TeaCard; forWhom: string; why: string}[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  total: number;
}
export interface BlindBoxResult {
  mood: string;
  title: string;
  blessing: string;
  daypart: string;
  basis: string[];
}
/** Desired configuration only; names/options are not official SKU identifiers or a quote. */
export interface OfficialOrderDraft {
  drinkId: string;
  drinkName: string;
  quantity: number;
  storeName?: string;
  options: {
    volume: string;
    sweetness: string;
    temperature: string;
    toppings: string;
  };
  note?: string;
}
/** A ready handoff opens the official confirmation page; it never means an order was paid. */
export type OfficialOrderHandoffResponse =
  | {status: 'unavailable'; message: string}
  | {status: 'ready'; url: string};
export interface HealthResponse {
  status: 'ok';
  aiConfigured: boolean;
  provider: string;
  menuCount: number;
}
export interface ApiError { error: { code: string; message: string; requestId?: string } }
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  verified: boolean;
  updatedAt: string;
}
