import { randomUUID } from 'node:crypto';
import type { RecommendRequest, RecommendResponse, TasteMemory } from '../shared/contracts.js';
import type { ServerConfig } from './config.js';
import type { Store } from './database.js';
import { describeMemory, detectFeature, handleFeature, profileWithMemory } from './features.js';
import { recommend } from './recommend.js';

/**
 * Remembered dislikes and "never add" toppings shape the pre-filled order lines.
 * Dislikes become a note for the store instead of a claim that the drink lacks the ingredient.
 */
export function applyMemoryToProposal(response: Pick<RecommendResponse, 'proposal' | 'notices'>, memory: TasteMemory, explicitMessage = '') {
  if (!response.proposal?.length) return;
  const dislikes = (memory.avoid || []).filter(name => !explicitMessage.includes(name));
  const skip = memory.skipToppings || [];
  let noted = false;
  response.proposal = response.proposal.map(item => {
    const toppings = (item.toppings || []).filter(name => !skip.includes(name) || explicitMessage.includes(name));
    const extra = dislikes.filter(name => !(item.note || '').includes(name)).map(name => `不要${name}`);
    if (extra.length) noted = true;
    const note = [item.note, extra.join('、')].filter(Boolean).join('；').slice(0, 120);
    return {...item, toppings, ...(note ? {note} : {})};
  });
  if (noted) response.notices.push(`已把「${dislikes.map(name => `不要${name}`).join('、')}」写进订单备注交给门店确认。`);
}

/** When a remembered hard restriction empties the menu, say so plainly and offer a way out. */
function explainRestriction(response: RecommendResponse, memory: TasteMemory, message: string) {
  const remembered = (memory.allergies || []).filter(name => !message.includes(name));
  if (response.cards.length || !remembered.length || !['recommend', 'blindbox', 'bundle', 'repeat', 'mixed'].includes(response.intent || '')) return;
  response.reply += `\n\n你让我记住了要严格避开「${remembered.join('、')}」。门店还没有核准这些饮品的完整配方，我无法确认哪一杯不含它，所以先不推荐。可以直接问店员，或在「我的订单 · 口味记忆」里调整。`;
  response.suggestions = [...new Set([...(response.suggestions || []), '查看我的口味记忆'])].slice(0, 4);
}

/** Chat entry: ordering features first, then the verified recommendation/knowledge pipeline. */
export async function assist(input: RecommendRequest, mode: 'live' | 'preview', store: Store, config: ServerConfig, fetcher: typeof fetch, signal?: AbortSignal, customerId?: string): Promise<RecommendResponse> {
  const drinks = store.drinks().filter(drink => ['observed', 'managed'].includes(drink.catalogStatus || ''));
  const memory = customerId ? store.commerce.memory(customerId) : {};
  const kind = detectFeature(input, drinks);
  if (kind) {
    const reply = await handleFeature(kind, {input, mode, store, config, fetcher, signal, customerId});
    const requestId = randomUUID(); store.recordRequest(requestId, mode);
    const notices = [...(mode === 'preview' ? ['规则预览：未调用 AI，仅演示菜单筛选；不能据此判断模型效果。'] : []), ...reply.notices];
    const response: RecommendResponse = {...reply, notices, mode, requestId};
    if (!kind.startsWith('memory')) {applyMemoryToProposal(response, memory, input.message); explainRestriction(response, memory, input.message);}
    return response;
  }
  const profile = profileWithMemory(input.profile, memory);
  const response = await recommend({...input, ...(profile ? {profile} : {})}, mode, store, config, fetcher, signal);
  const used = describeMemory({sweetness: !input.profile?.sweetness ? memory.sweetness : undefined, temperature: !input.profile?.temperature ? memory.temperature : undefined, allergies: memory.allergies});
  if (used.length && (response.intent === 'recommend' || response.intent === 'mixed')) response.notices.unshift(`已参考你的口味记忆（${used.join('；')}），当下说的要求优先。`);
  applyMemoryToProposal(response, memory, input.message);
  explainRestriction(response, memory, input.message);
  return response;
}
