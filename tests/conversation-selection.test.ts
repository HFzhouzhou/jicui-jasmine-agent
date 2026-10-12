import test from 'node:test';
import assert from 'node:assert/strict';
import type { OfficialOrderDraft, RecommendResponse, TeaCard } from '../shared/contracts.js';
import { buildConversationHistory, configureConversationMessage, lastProductMessageIndex, preservesTeaSelection, restoreSelection, selectionAfterConfiguration, selectionAfterResponse, selectionCard, selectionMessageIndex, type ConversationMessage, type TeaSelection } from '../src/lib/conversation-selection.js';

const card = (id: string): TeaCard => ({drinkId: id, drinkName: `茉莉茶 ${id}`, drinkNameEn: 'Jasmine Tea', price: 15, volume: '500ml', sweetness: '随门店标准', temperature: '随门店标准', toppings: '不额外加料', reason: '清爽茶香', message: '选茶参考', funFact: '', orderPhrase: '请确认规格', verified: false});
const first = card('tea-1');
const second = card('tea-2');
const draft: OfficialOrderDraft = {drinkId: second.drinkId, drinkName: second.drinkName, quantity: 2, options: {volume: '500ml', sweetness: '半糖', temperature: '少冰', toppings: '不额外加料'}, note: '分开装袋'};
const response: RecommendResponse = {reply: '这两款可以看看。', cards: [first, second], notices: [], mode: 'live', requestId: 'recommend-1', intent: 'recommend'};
const knowledge: RecommendResponse = {reply: '茉莉花茶采用窨制工艺。[1]', cards: [], notices: [], mode: 'live', requestId: 'knowledge-1', intent: 'knowledge', citations: [{id: '1', documentId: 'doc-1', documentTitle: '茶知识', source: '品牌资料', excerpt: '茉莉花茶采用窨制工艺。'}]};
const validCard = (value: unknown): value is TeaCard => !!value && typeof value === 'object' && typeof (value as TeaCard).drinkId === 'string';
function configuredSelection() {
  return selectionAfterConfiguration(selectionAfterResponse(null, response), second, draft)!;
}

test('knowledge, catalog, and clarification preserve the selected tea and exact saved configuration', () => {
  const current = configuredSelection();
  for (const intent of ['knowledge', 'catalog', 'clarify'] as const) {
    const next = selectionAfterResponse(current, {...knowledge, intent});
    assert.equal(next, current);
    assert.deepEqual(selectionCard(next), second);
    assert.deepEqual(next?.orders[second.drinkId], draft);
  }
});

test('mixed and recommendation responses replace tea selection even when no cards match', () => {
  const current = configuredSelection();
  for (const intent of ['recommend', 'mixed'] as const) {
    const next = selectionAfterResponse(current, {...knowledge, intent, reply: '当前没有符合要求的商品。'});
    assert.notEqual(next, current);
    assert.deepEqual(next?.response.cards, []);
    assert.deepEqual(next?.orders, {});
    assert.equal(selectionCard(next), undefined);
    assert.deepEqual(restoreSelection(JSON.parse(JSON.stringify(next)), [], 'live', validCard)?.response.cards, []);
  }
});

test('legacy responses use citations as a fallback without overriding the explicit new intent', () => {
  assert.equal(preservesTeaSelection({...knowledge, intent: undefined}), true);
  assert.equal(preservesTeaSelection({...knowledge, intent: undefined, citations: []}), true);
  assert.equal(preservesTeaSelection({...knowledge, intent: 'recommend'}), false);
  assert.equal(preservesTeaSelection({...knowledge, intent: undefined, citations: undefined}), false);
  assert.equal(preservesTeaSelection({...knowledge, intent: undefined, cards: [first]}), false);
});

test('a new mixed recommendation resets prior options even when it recommends the same product', () => {
  const next = selectionAfterResponse(configuredSelection(), {...knowledge, intent: 'mixed', cards: [second]});
  assert.deepEqual(next?.response.cards, [second]);
  assert.deepEqual(next?.orders, {});
  assert.equal(next?.activeDrinkId, second.drinkId);
});

test('editing a tea after a knowledge answer updates its original message and retains source citations', () => {
  const messages: ConversationMessage[] = [
    {role: 'assistant', content: response.reply, productCard: first, selectionId: response.requestId},
    {role: 'user', content: '介绍一下窨制工艺'},
    {role: 'assistant', content: knowledge.reply, citations: knowledge.citations},
  ];
  const index = selectionMessageIndex(selectionAfterResponse(null, response), messages);
  assert.equal(index, 0);
  assert.equal(lastProductMessageIndex(messages), 0);
  const next = configureConversationMessage(messages, index, second, draft);
  assert.deepEqual(next[0].productCard, second);
  assert.deepEqual(next[0].orderDraft, draft);
  assert.equal(next[2], messages[2]);
  assert.equal(next[2].productCard, undefined);
  assert.equal(next[2].orderDraft, undefined);
  assert.deepEqual(next[2].citations, knowledge.citations);
});

test('refresh preserves all active tea cards, the selected alternative and drafts after history truncation', () => {
  const saved = configuredSelection();
  const knowledgeOnlyHistory: ConversationMessage[] = [{role: 'assistant', content: knowledge.reply, citations: knowledge.citations}];
  const restored = restoreSelection(JSON.parse(JSON.stringify(saved)), knowledgeOnlyHistory, 'live', validCard);
  assert.deepEqual(restored, saved);
  assert.equal(selectionMessageIndex(restored, knowledgeOnlyHistory), -1);
  assert.deepEqual(selectionCard(restored), second);
  assert.deepEqual(restored?.orders[second.drinkId], draft);
});

test('legacy history recovers the latest tea through intervening knowledge answers', () => {
  const messages: ConversationMessage[] = [
    {role: 'assistant', content: response.reply, productCard: second, orderDraft: draft},
    {role: 'user', content: '茉莉花茶怎么保存？'},
    {role: 'assistant', content: knowledge.reply, citations: knowledge.citations},
  ];
  const restored = restoreSelection(undefined, messages, 'preview', validCard);
  assert.deepEqual(selectionCard(restored), second);
  assert.deepEqual(restored?.orders[second.drinkId], draft);
  assert.equal(restored?.response.mode, 'preview');
  assert.equal(selectionMessageIndex(restored, messages), 0);
});

test('legacy empty recommendations and explicit cleared storage do not resurrect old cards', () => {
  const messages: ConversationMessage[] = [
    {role: 'assistant', content: response.reply, productCard: second, orderDraft: draft},
    {role: 'assistant', content: '没有匹配商品。'},
    {role: 'assistant', content: knowledge.reply, citations: knowledge.citations},
  ];
  assert.equal(restoreSelection(undefined, messages, 'live', validCard), null);
  assert.equal(restoreSelection(null, messages.slice(0, 1), 'live', validCard), null);
});

test('historical card can keep its draft without replacing the current empty tea selection', () => {
  const empty = selectionAfterResponse(configuredSelection(), {...response, cards: [], requestId: 'no-match'});
  const messages: ConversationMessage[] = [{role: 'assistant', content: response.reply, productCard: second, selectionId: response.requestId}];
  assert.equal(selectionMessageIndex(empty, messages), -1);
  assert.equal(lastProductMessageIndex(messages), 0);
  const nextMessages = configureConversationMessage(messages, 0, second, draft);
  assert.deepEqual(nextMessages[0].orderDraft, draft);
  assert.equal(selectionAfterConfiguration(empty, second, draft), empty);
  assert.equal(selectionCard(empty), undefined);
});

test('restoration rejects mismatched drafts and unrelated product configurations', () => {
  const saved: TeaSelection = {...configuredSelection(), orders: {[second.drinkId]: {...draft, drinkId: first.drinkId}, unknown: draft}};
  const restored = restoreSelection(saved, [], 'live', validCard);
  assert.deepEqual(restored?.orders, {});
  assert.equal(selectionAfterConfiguration(restored, first, draft), restored);
  assert.equal(restoreSelection({...saved, response: {...response, cards: 'invalid'}}, [], 'live', validCard), null);
});

test('request history anchors the configured second candidate instead of the first recommendation', () => {
  const messages: ConversationMessage[] = [{role: 'assistant', content: response.reply, cardContext: `目录记录：${JSON.stringify([{drinkId: first.drinkId, price: 4}, {drinkId: second.drinkId, price: 10}])}`, productCard: first}];
  const history = buildConversationHistory(messages, configuredSelection());
  const anchor = [...history].reverse().find(message => message.role === 'assistant')!;
  assert.deepEqual(JSON.parse(anchor.content.split('目录记录：')[1]), [{drinkId: second.drinkId}]);
  assert.equal(anchor.content.includes('price'), false);
  assert.match(history.at(-1)!.content, /^我在商品卡中保存了这份期望配置：茉莉茶 tea-2，2杯/);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].productCard, first);
});

test('selection identity survives a long knowledge exchange without becoming a knowledge question', () => {
  const messages: ConversationMessage[] = Array.from({length: 30}, (_, index) => index % 2 === 0
    ? {role: 'user', content: `知识问题${index}：茶叶怎么保存？`}
    : {role: 'assistant', content: '知识答案'.repeat(1500), citations: knowledge.citations});
  const before = JSON.stringify(messages);
  const history = buildConversationHistory(messages, configuredSelection());
  assert.equal(history.length, 20);
  assert.ok(history.every(message => message.content.length <= 3000));
  assert.match(history.at(-2)!.content, /目录记录：\[\{"drinkId":"tea-2"\}\]/);
  assert.equal(history.at(-2)!.role, 'assistant');
  const questions = history.filter(message => message.role === 'user' && !message.content.startsWith('我在商品卡中保存了这份期望配置'));
  assert.equal(questions.at(-1)?.content, '知识问题28：茶叶怎么保存？');
  assert.equal(JSON.stringify(messages), before);
});

test('a preserved selection supplies an identity anchor even before any configuration was saved', () => {
  const history = buildConversationHistory([{role: 'assistant', content: knowledge.reply, citations: knowledge.citations}], selectionAfterResponse(null, response));
  assert.equal(history.length, 2);
  assert.equal(history.at(-1)!.role, 'assistant');
  assert.deepEqual(JSON.parse(history.at(-1)!.content.split('目录记录：')[1]), [{drinkId: first.drinkId}]);
  assert.equal(history.some(message => message.role === 'user'), false);
});

test('empty or cleared tea selections never append an old product anchor or draft', () => {
  const messages: ConversationMessage[] = [{role: 'assistant', content: '没有符合预算的商品。'}];
  for (const selection of [null, selectionAfterResponse(configuredSelection(), {...response, cards: [], requestId: 'empty'})]) {
    assert.deepEqual(buildConversationHistory(messages, selection), messages);
  }
});
