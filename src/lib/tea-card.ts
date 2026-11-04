import type { TeaCard } from '../../shared/contracts.js';

/** Shape check for cards restored from storage or received from the API. */
export function isTeaCard(value: unknown): value is TeaCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Record<string, unknown>;
  return ['drinkId', 'drinkName', 'drinkNameEn', 'volume', 'sweetness', 'temperature', 'toppings', 'reason', 'message', 'funFact', 'orderPhrase'].every((field) => typeof card[field] === 'string')
    && typeof card.price === 'number' && Number.isFinite(card.price) && card.price >= 0
    && typeof card.verified === 'boolean';
}
