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
export interface RecommendRequest {
  message: string;
  history?: ChatMessage[];
  profile?: Preferences;
  excludeIds?: string[];
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
export interface RecommendResponse {
  /** Optional for compatibility with earlier saved conversations and API responses. */
  intent?: 'knowledge' | 'recommend' | 'mixed' | 'catalog' | 'clarify';
  reply: string;
  cards: TeaCard[];
  notices: string[];
  mode: 'live' | 'preview';
  requestId: string;
  citations?: KnowledgeCitation[];
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
