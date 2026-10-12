import type { ChatMessage, OfficialOrderDraft, RecommendResponse, TeaCard } from '../../shared/contracts.js';
import type { KnowledgeCitation } from '../../shared/rag.js';

export interface ConversationMessage extends ChatMessage {
  cardContext?: string;
  productCard?: TeaCard;
  orderDraft?: OfficialOrderDraft;
  citations?: KnowledgeCitation[];
  notices?: string[];
  selectionId?: string;
}

/** A tea selection has its own lifetime: a knowledge answer must not replace it. */
export interface TeaSelection {
  response: RecommendResponse;
  activeDrinkId?: string;
  orders: Record<string, OfficialOrderDraft>;
}

const RESTORED_SELECTION_ID = 'local-restored-selection';

export function preservesTeaSelection(response: RecommendResponse) {
  if (response.intent) return ['knowledge', 'catalog', 'clarify'].includes(response.intent);
  return Array.isArray(response.citations) && response.cards.length === 0;
}

export function selectionAfterResponse(current: TeaSelection | null, response: RecommendResponse): TeaSelection | null {
  if (preservesTeaSelection(response)) return current;
  return { response, activeDrinkId: response.cards[0]?.drinkId, orders: {} };
}

export function lastProductMessageIndex(messages: ConversationMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'assistant' && messages[index].productCard) return index;
  }
  return -1;
}

export function selectionMessageIndex(selection: TeaSelection | null, messages: ConversationMessage[]) {
  if (!selection?.response.cards.length) return -1;
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'assistant' && messages[index].selectionId === selection.response.requestId) return index;
  }
  // Old browser histories did not record request IDs. This fallback is only for their migration.
  return selection.response.requestId === RESTORED_SELECTION_ID ? lastProductMessageIndex(messages) : -1;
}

export function selectionCard(selection: TeaSelection | null) {
  return selection?.response.cards.find(card => card.drinkId === selection.activeDrinkId) || selection?.response.cards[0];
}

/** Request-only context: keep the chosen product anchored even after its chat turn is trimmed. */
export function buildConversationHistory(messages: ConversationMessage[], selection: TeaSelection | null): ChatMessage[] {
  const history: ChatMessage[] = messages.slice(-18).map(({ role, content, cardContext }) => ({
    role, content: cardContext ? `${content.slice(0, 2000)}\n${cardContext.slice(0, 900)}` : content.slice(0, 3000),
  }));
  const card = selectionCard(selection);
  if (card && /^[a-zA-Z0-9_-]{1,64}$/.test(card.drinkId)) {
    // The server resolves this identity against the current menu; client snapshots are not prices.
    history.push({role: 'assistant', content: `当前选中的商品，仅供核对身份。\n目录记录：${JSON.stringify([{drinkId: card.drinkId}])}`});
  }
  const draft = card ? selection?.orders[card.drinkId] : undefined;
  if (card && draft && isSavedOrderDraft(draft, card.drinkId)) history.push({
    role: 'user', content: `我在商品卡中保存了这份期望配置：${draft.drinkName}，${draft.quantity}杯，${draft.options.volume}，甜度${draft.options.sweetness}，温度${draft.options.temperature}，小料${draft.options.toppings}${draft.note ? `，备注：${draft.note}` : ''}。这些是我的偏好，具体可选做法仍需门店确认。`,
  });
  return history;
}

export function selectionAfterConfiguration(selection: TeaSelection | null, card: TeaCard, draft: OfficialOrderDraft) {
  if (!selection || draft.drinkId !== card.drinkId || !selection.response.cards.some(item => item.drinkId === card.drinkId)) return selection;
  return { ...selection, activeDrinkId: card.drinkId, orders: { ...selection.orders, [draft.drinkId]: draft } };
}

export function configureConversationMessage(messages: ConversationMessage[], index: number, card: TeaCard, draft: OfficialOrderDraft) {
  if (draft.drinkId !== card.drinkId) return messages;
  return messages.map((message, messageIndex) => messageIndex === index && message.role === 'assistant'
    ? { ...message, productCard: card, orderDraft: draft } : message);
}

export function isSavedOrderDraft(value: unknown, drinkId: string): value is OfficialOrderDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as OfficialOrderDraft;
  return draft.drinkId === drinkId && typeof draft.drinkName === 'string' && draft.drinkName.length <= 160
    && Number.isInteger(draft.quantity) && draft.quantity >= 1 && draft.quantity <= 20
    && !!draft.options && ['volume', 'sweetness', 'temperature', 'toppings'].every(key => {
      const option = draft.options[key as keyof OfficialOrderDraft['options']];
      return typeof option === 'string' && option.trim().length > 0 && option.length <= (key === 'toppings' ? 300 : 80);
    }) && (draft.note === undefined || (typeof draft.note === 'string' && draft.note.length <= 500))
    && (draft.storeName === undefined || (typeof draft.storeName === 'string' && draft.storeName.length <= 160));
}

/** Validates the separately saved selection, including an explicit empty recommendation. */
export function restoreSelection(value: unknown, messages: ConversationMessage[], mode: RecommendResponse['mode'], isCard: (value: unknown) => value is TeaCard): TeaSelection | null {
  if (value !== undefined) {
    if (!value || typeof value !== 'object') return null;
    const saved = value as TeaSelection;
    const response = saved.response;
    if (!response || typeof response.reply !== 'string' || typeof response.requestId !== 'string'
      || !['live', 'preview'].includes(response.mode) || !Array.isArray(response.cards) || response.cards.length > 3
      || !response.cards.every(isCard) || !Array.isArray(response.notices) || !response.notices.every(notice => typeof notice === 'string')) return null;
    const orders = Object.fromEntries(response.cards.flatMap(card => {
      const draft = saved.orders?.[card.drinkId];
      return isSavedOrderDraft(draft, card.drinkId) ? [[card.drinkId, draft]] : [];
    }));
    return {
      response: { reply: response.reply.slice(0, 6000), requestId: response.requestId.slice(0, 200), mode: response.mode, cards: response.cards, notices: response.notices.slice(0, 6).map(notice => notice.slice(0, 2000)), ...(['knowledge', 'catalog', 'clarify', 'recommend', 'mixed'].includes(response.intent || '') ? { intent: response.intent } : {}) },
      activeDrinkId: response.cards.find(card => card.drinkId === saved.activeDrinkId)?.drinkId || response.cards[0]?.drinkId,
      orders,
    };
  }
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    if (message.productCard) {
      const card = message.productCard;
      return {
        response: { reply: message.content, cards: [card], notices: message.notices || [], mode, requestId: message.selectionId || RESTORED_SELECTION_ID },
        activeDrinkId: card.drinkId,
        orders: isSavedOrderDraft(message.orderDraft, card.drinkId) ? { [card.drinkId]: message.orderDraft } : {},
      };
    }
    // A legacy recommendation with no matches must not resurrect an older card.
    if (!Array.isArray(message.citations)) return null;
  }
  return null;
}
