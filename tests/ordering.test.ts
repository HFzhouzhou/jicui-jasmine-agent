import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp, type AppOptions } from '../server/index.js';
import { Store } from '../server/database.js';
import { bestPromotion, priceItems } from '../server/commerce.js';
import { detectFeature, solveBundle } from '../server/features.js';
import { parseLocalIntent } from '../server/recommend.js';

const token = 'local-test-admin-token-with-32-characters';
const customer = 'customer-0123456789abcdef';
const other = 'customer-fedcba9876543210';

async function setup(t: TestContext, options: AppOptions = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jasmine-order-'));
  const app = createApp({databasePath: join(dir, 'test.sqlite'), ...options, config: {apiKey: '', adminToken: token, rateLimit: 100, staticDir: join(dir, 'missing'), ...options.config}});
  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {const listener = app.listen(0, '127.0.0.1', () => resolve(listener));});
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  t.after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); app.locals.close(); rmSync(dir, {recursive: true, force: true}); });
  const call = async (path: string, {body, method, admin, as = customer}: {body?: unknown; method?: string; admin?: boolean; as?: string | null} = {}): Promise<{status: number; json: any}> => {
    const response = await fetch(`${origin}${path}`, {method: method || (body === undefined ? 'GET' : 'POST'), headers: {'Content-Type': 'application/json', ...(as ? {'X-Customer-Id': as} : {}), ...(admin ? {Authorization: `Bearer ${token}`} : {})}, ...(body !== undefined ? {body: JSON.stringify(body)} : {})});
    return {status: response.status, json: await response.json()};
  };
  return {app, call};
}

test('two-stage ordering: quote reads back, confirm submits, server owns prices', async t => {
  const {call} = await setup(t);
  const quote = await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 2, sweetness: '三分糖', temperature: '少冰'}]}});
  assert.equal(quote.status, 201);
  assert.equal(quote.json.quote.status, 'quoted'); assert.equal(quote.json.quote.total, 8);
  assert.match(quote.json.quote.summary, /我复述一下：茉莉冷萃水 × 2/); assert.match(quote.json.quote.summary, /三分糖/);
  assert.ok(quote.json.quote.lines[0].pending.some((text: string) => text.includes('甜度')), 'unverified sweetness is marked pending, not promised');
  assert.ok(quote.json.quote.warnings.some((text: string) => /不会由 AI 代付/.test(text)));
  assert.equal((await call('/api/orders')).json.orders.length, 0, 'a quote alone is not an order');
  assert.equal((await call(`/api/orders/${quote.json.quote.id}/confirm`, {body: {expectedTotal: 1, confirm: true}})).json.error.code, 'QUOTE_CHANGED');
  assert.equal((await call(`/api/orders/${quote.json.quote.id}/confirm`, {body: {expectedTotal: 8, confirm: true}, as: other})).status, 404);
  const confirmed = await call(`/api/orders/${quote.json.quote.id}/confirm`, {body: {expectedTotal: 8, confirm: true}});
  assert.equal(confirmed.status, 200); assert.equal(confirmed.json.order.status, 'submitted'); assert.match(confirmed.json.order.code, /^A\d{3}$/);
  assert.equal((await call(`/api/orders/${quote.json.quote.id}/confirm`, {body: {expectedTotal: 8, confirm: true}})).json.error.code, 'ORDER_ALREADY_SUBMITTED');
  assert.equal((await call('/api/orders', {as: other})).json.orders.length, 0, 'orders are scoped to the customer');
  const memory = (await call('/api/memory')).json.memory;
  assert.equal(memory.lastOrder.drinkId, 'p01'); assert.equal(memory.favorites[0].count, 2);
});

test('quotes reject sold-out items, unregistered add-ons, forged fields and limit breaches', async t => {
  const {app, call} = await setup(t, {config: {orders: {maxAmount: 30, dailyLimit: 1, maxCups: 5, quoteTtlMs: 600000}}});
  (app.locals.store as Store).updateDrink('p05', {available: false});
  assert.equal((await call('/api/orders/quote', {body: {items: [{drinkId: 'p05', quantity: 1}]}})).json.error.code, 'ORDER_NEEDS_CHANGE');
  const topping = await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1, toppings: ['芋圆']}]}});
  assert.equal(topping.json.error.code, 'ORDER_NEEDS_CHANGE'); assert.match(topping.json.error.message, /芋圆/);
  assert.equal((await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1, price: 0}]}})).status, 400);
  assert.equal((await call('/api/orders/quote', {body: {items: [{drinkId: 'm12', quantity: 2}]}})).json.error.code, 'ORDER_AMOUNT_LIMIT');
  assert.equal((await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 6}]}})).json.error.code, 'ORDER_TOO_MANY_CUPS');
  assert.equal((await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1}]}, as: null})).json.error.code, 'CUSTOMER_ID_REQUIRED');
  const first = (await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1}]}})).json.quote;
  const second = (await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1}]}})).json.quote;
  assert.equal((await call(`/api/orders/${first.id}/confirm`, {body: {expectedTotal: first.total, confirm: true}})).status, 200);
  assert.equal((await call(`/api/orders/${second.id}/confirm`, {body: {expectedTotal: second.total, confirm: true}})).json.error.code, 'ORDER_DAILY_LIMIT');
});

test('a price change between quote and confirm forces re-confirmation', async t => {
  const {app, call} = await setup(t);
  const quote = (await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1}]}})).json.quote;
  (app.locals.store as Store).updateDrink('p01', {price: 5});
  assert.equal((await call(`/api/orders/${quote.id}/confirm`, {body: {expectedTotal: quote.total, confirm: true}})).json.error.code, 'QUOTE_CHANGED');
});

test('store counter moves status forward; customer cancel and after-sales follow the rules', async t => {
  const {call} = await setup(t);
  const submit = async () => {
    const quote = (await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1}]}})).json.quote;
    return (await call(`/api/orders/${quote.id}/confirm`, {body: {expectedTotal: quote.total, confirm: true}})).json.order;
  };
  const cancellable = await submit();
  assert.equal((await call(`/api/orders/${cancellable.id}/after-sales`, {body: {type: 'remake', reason: '太甜了'}})).json.error.code, 'AFTER_SALES_UNAVAILABLE');
  assert.equal((await call(`/api/orders/${cancellable.id}/cancel`, {body: {}})).json.order.status, 'cancelled');
  const order = await submit();
  assert.equal((await call(`/api/admin/orders/${order.id}`, {body: {status: 'ready'}, method: 'PATCH', admin: true})).json.error.code, 'ORDER_TRANSITION');
  for (const status of ['accepted', 'making', 'ready']) assert.equal((await call(`/api/admin/orders/${order.id}`, {body: {status}, method: 'PATCH', admin: true})).json.order.status, status);
  assert.equal((await call(`/api/orders/${order.id}/cancel`, {body: {}})).json.error.code, 'ORDER_NOT_CANCELLABLE');
  const after = await call(`/api/orders/${order.id}/after-sales`, {body: {type: 'remake', reason: '太甜了，想改三分糖'}});
  assert.equal(after.status, 201); assert.equal(after.json.order.afterSales[0].status, 'pending');
  assert.equal((await call(`/api/orders/${order.id}/after-sales`, {body: {type: 'refund', reason: '再来一次'}})).json.error.code, 'AFTER_SALES_PENDING');
  const resolved = await call(`/api/admin/orders/${order.id}/after-sales/${after.json.order.afterSales[0].id}`, {body: {status: 'resolved', reply: '已为你重做一杯三分糖'}, method: 'PATCH', admin: true});
  assert.equal(resolved.json.order.afterSales[0].status, 'resolved');
  assert.equal((await call('/api/admin/orders', {admin: true})).json.orders.length, 2);
  assert.equal((await call('/api/admin/orders')).status, 401);
});

test('chat: one sentence parses cups, preferences and negated toppings; clarifies unregistered add-ons', async t => {
  const {call} = await setup(t);
  const intent = parseLocalIntent({message: '来两杯冰的、三分糖、加芋圆，但不要珍珠'});
  assert.equal(intent.quantity, 2); assert.equal(intent.sweetness, '三分糖'); assert.equal(intent.temperature, '正常冰');
  assert.deepEqual(intent.toppings, ['芋圆']); assert.deepEqual(intent.avoidToppings, ['珍珠']); assert.deepEqual(intent.avoidIngredients, []);
  const clarify = (await call('/api/recommend/preview', {body: {message: '来杯冰的、三分糖、加芋圆，但不要珍珠'}})).json;
  assert.deepEqual(clarify.cards, []); assert.match(clarify.reply, /芋圆」还没有登记/); assert.ok(clarify.suggestions.includes('先不加小料，其他要求不变'));
  const plain = (await call('/api/recommend/preview', {body: {message: '来两杯茉莉冷萃水，三分糖少冰'}})).json;
  assert.equal(plain.cards[0].drinkId, 'p01', 'a named drink is chosen first');
  assert.equal(plain.cards[0].sweetness, '三分糖（待门店确认）');
  assert.deepEqual(plain.proposal[0], {drinkId: 'p01', quantity: 2, sweetness: '三分糖', temperature: '少冰', toppings: []});
});

test('chat: sold-out named drink asks to switch within the same series', async t => {
  const {app, call} = await setup(t);
  (app.locals.store as Store).updateDrink('p05', {available: false});
  const result = (await call('/api/recommend/preview', {body: {message: '来一杯极萃·茉莉毛峰'}})).json;
  assert.match(result.reply, /茉莉毛峰在菜单记录中暂不可选/); assert.ok(result.suggestions.some((text: string) => /换成极萃·茉莉/.test(text)));
});

test('chat: taste memory is remembered, applied, shown and forgotten', async t => {
  const {call} = await setup(t);
  const saved = (await call('/api/recommend/preview', {body: {message: '记住我默认三分糖、少冰，爱加椰果，不碰植脂末'}})).json;
  assert.equal(saved.intent, 'memory'); assert.equal(saved.memory.sweetness, '三分糖'); assert.equal(saved.memory.temperature, '少冰');
  assert.deepEqual(saved.memory.toppings, ['椰果']); assert.deepEqual(saved.memory.avoid, ['植脂末']);
  const view = (await call('/api/recommend/preview', {body: {message: '你还记得我的口味吗'}})).json;
  assert.match(view.reply, /三分糖/);
  await call('/api/recommend/preview', {body: {message: '忘掉我的口味'}});
  assert.deepEqual((await call('/api/memory')).json.memory, {});
  await call('/api/memory', {body: {sweetness: '五分糖'}, method: 'PUT'});
  const applied = (await call('/api/recommend/preview', {body: {message: '15元以内，清爽一点'}})).json;
  assert.ok(applied.notices.some((text: string) => /口味记忆/.test(text))); assert.match(applied.cards[0].sweetness, /五分糖/);
});

test('chat: 老样子 repeats the last confirmed order, and can swap the tea', async t => {
  const {call} = await setup(t);
  assert.match((await call('/api/recommend/preview', {body: {message: '老样子'}})).json.reply, /还没有你的下单记录/);
  const quote = (await call('/api/orders/quote', {body: {items: [{drinkId: 'p05', quantity: 1, sweetness: '无糖', temperature: '去冰'}]}})).json.quote;
  await call(`/api/orders/${quote.id}/confirm`, {body: {expectedTotal: quote.total, confirm: true}});
  const same = (await call('/api/recommend/preview', {body: {message: '老样子'}})).json;
  assert.equal(same.intent, 'repeat'); assert.equal(same.cards[0].drinkId, 'p05'); assert.equal(same.proposal[0].sweetness, '无糖');
  const swapped = (await call('/api/recommend/preview', {body: {message: '老样子，但换个茶底'}})).json;
  assert.notEqual(swapped.cards[0].drinkId, 'p05'); assert.equal(swapped.proposal[0].temperature, '去冰'); assert.match(swapped.reply, /同系列/);
});

test('chat: order status and after-sales offer entries without acting on payment', async t => {
  const {call} = await setup(t);
  assert.match((await call('/api/recommend/preview', {body: {message: '订单做到哪了'}})).json.reply, /还没有找到/);
  const quote = (await call('/api/orders/quote', {body: {items: [{drinkId: 'p01', quantity: 1}]}})).json.quote;
  const order = (await call(`/api/orders/${quote.id}/confirm`, {body: {expectedTotal: quote.total, confirm: true}})).json.order;
  const status = (await call('/api/recommend/preview', {body: {message: '我的订单做到哪了'}})).json;
  assert.equal(status.intent, 'order_status'); assert.equal(status.orders[0].id, order.id); assert.match(status.reply, new RegExp(order.code));
  const early = (await call('/api/recommend/preview', {body: {message: '刚才那杯太甜了'}})).json;
  assert.equal(early.intent, 'after_sales'); assert.match(early.reply, /还没开始做/);
  await call(`/api/admin/orders/${order.id}`, {body: {status: 'accepted'}, method: 'PATCH', admin: true});
  const late = (await call('/api/recommend/preview', {body: {message: '刚才那杯太甜了'}})).json;
  assert.match(late.reply, /申请「重做」或「退款」/); assert.ok(late.suggestions.includes('记住我默认三分糖'));
  assert.equal((await call(`/api/orders/${order.id}`)).json.order.afterSales.length, 0, 'chat never files a request on its own');
});

test('bundles respect a total budget and apply only enabled promotions', async t => {
  const {app, call} = await setup(t);
  const store = app.locals.store as Store;
  const bundle = (await call('/api/recommend/preview', {body: {message: '两个人喝，30块以内，一个要清爽的，一个要浓郁的'}})).json;
  assert.equal(bundle.intent, 'bundle'); assert.equal(bundle.bundle.people, 2); assert.ok(bundle.bundle.total <= 30);
  assert.equal(bundle.bundle.discount, 0); assert.match(bundle.reply, /暂未登记可用优惠/);
  assert.equal(new Set(bundle.cards.map((card: {drinkId: string}) => card.drinkId)).size, 2);
  assert.match(bundle.bundle.items[0].forWhom, /清爽/); assert.match(bundle.bundle.items[1].forWhom, /浓郁/);
  await call('/api/admin/promotions', {body: {rules: [{id: 'half', type: 'second_half', title: '第二杯半价', enabled: true, rate: 0.5, note: '测试'}]}, method: 'PUT', admin: true});
  const promo = (await call('/api/recommend/preview', {body: {message: '帮我们配两杯', action: {type: 'bundle', people: 2, totalBudget: 25, tastes: ['浓郁', '浓郁']}}})).json;
  assert.ok(promo.bundle.discount > 0); assert.equal(promo.bundle.discountLabel, '第二杯半价'); assert.ok(promo.bundle.total <= 25);
  const tight = solveBundle(store.drinks().filter(drink => drink.catalogStatus !== 'legacy'), {...parseLocalIntent({message: '推荐'}), intent: 'recommend'}, 3, ['随意', '随意', '随意'], 5, []);
  assert.equal(tight.best, null); assert.ok((tight.cheapest ?? 0) > 5);
  assert.deepEqual(bestPromotion([16, 10], [{id: 'h', type: 'second_half', title: '半价', enabled: true, rate: 0.5, note: ''}]), {discount: 5, label: '半价'});
  assert.deepEqual(bestPromotion([16, 10], [{id: 't', type: 'threshold', title: '满30减5', enabled: true, threshold: 30, off: 5, note: ''}]), {discount: 0});
});

test('blind box picks an available drink with a blessing and explains its basis', async t => {
  const {app, call} = await setup(t);
  (app.locals.store as Store).updateDrink('p01', {available: false});
  const box = (await call('/api/recommend/preview', {body: {message: '开个盲盒', action: {type: 'blindbox', mood: '有点丧', weather: '下雨'}}})).json;
  assert.equal(box.intent, 'blindbox'); assert.equal(box.cards.length, 1); assert.notEqual(box.cards[0].drinkId, 'p01');
  assert.ok(box.blindbox.blessing.length > 4); assert.ok(box.blindbox.basis.some((text: string) => /有点丧/.test(text)));
  assert.ok(box.notices.some((text: string) => /未调用 AI/.test(text)));
  assert.equal(detectFeature({message: '不知道喝什么，有点丧'}), 'blindbox');
});

test('ingredient questions never invent calories or dairy-free claims', async t => {
  const {app, call} = await setup(t);
  const empty = (await call('/api/recommend/preview', {body: {message: '哪款热量最低？'}})).json;
  assert.equal(empty.intent, 'ingredient'); assert.match(empty.reply, /没有核准过的热量数据/); assert.deepEqual(empty.cards, []);
  const store = app.locals.store as Store;
  store.updateDrink('p05', {verified: true, ingredients: ['茉莉花茶', '水'], allergens: [], caffeine: 'contains', calories: 5});
  store.updateDrink('p01', {verified: true, ingredients: ['茶', '牛乳'], allergens: ['乳'], caffeine: 'contains', calories: 2});
  const calories = (await call('/api/recommend/preview', {body: {message: '哪款热量最低'}})).json;
  assert.match(calories.reply, /茉莉冷萃水 约 2 千卡/);
  const dairy = (await call('/api/recommend/preview', {body: {message: '有没有不含奶的？'}})).json;
  assert.match(dairy.reply, /极萃·茉莉毛峰/); assert.doesNotMatch(dairy.reply.split('另外')[0], /茉莉冷萃水/);
  assert.equal(detectFeature({message: '为什么无咖啡因的茶很少？'}), null);
});

test('feature routing leaves knowledge questions alone', () => {
  for (const message of ['如何申请退款？', '退款政策是什么', '不要太甜，15元以内', '茶叶应该怎么保存？', '我想喝清爽的']) assert.equal(detectFeature({message}), null, message);
  assert.equal(detectFeature({message: '老样子，但换个茶底'}), 'repeat');
  assert.equal(detectFeature({message: '30块以内，两杯解腻的'}), 'bundle');
  assert.equal(detectFeature({message: '订单做到哪了'}), 'order_status');
});

test('priceItems enforces verified option lists when they exist', () => {
  const store = new Store(':memory:');
  try {
    store.updateDrink('p01', {verified: true, sweetnessOptions: ['无糖', '五分糖'], temperatureOptions: ['少冰'], toppings: [{name: '椰果', price: 2}]});
    const ok = priceItems([{drinkId: 'p01', quantity: 1, sweetness: '半糖', temperature: '少冰', toppings: ['椰果']}], store.drinks(), []);
    assert.deepEqual(ok.problems, []); assert.equal(ok.lines[0].sweetness, '五分糖'); assert.equal(ok.total, 6);
    assert.ok(!ok.lines[0].pending.some(text => /甜度/.test(text)));
    const bad = priceItems([{drinkId: 'p01', quantity: 1, sweetness: '全糖'}], store.drinks(), []);
    assert.match(bad.problems[0], /没有「全糖」/);
  } finally {store.close();}
});

test('memory: dislikes stay soft and travel as an order note; allergies stay hard and are explained', async t => {
  const {call} = await setup(t);
  const saved = (await call('/api/recommend/preview', {body: {message: '记住我不碰植脂末，对芒果过敏，不要珍珠'}})).json.memory;
  assert.deepEqual(saved.avoid, ['植脂末']); assert.deepEqual(saved.allergies, ['芒果']); assert.deepEqual(saved.skipToppings, ['珍珠']);
  const blocked = (await call('/api/recommend/preview', {body: {message: '来一杯清爽的'}})).json;
  assert.deepEqual(blocked.cards, [], 'an unverified recipe can never satisfy a remembered allergy');
  assert.match(blocked.reply, /严格避开「芒果」/); assert.ok(blocked.suggestions.includes('查看我的口味记忆'));
  await call('/api/memory', {body: {avoid: ['植脂末'], skipToppings: ['珍珠']}, method: 'PUT'});
  const soft = (await call('/api/recommend/preview', {body: {message: '来一杯清爽的'}})).json;
  assert.ok(soft.cards.length > 0, 'a dislike does not empty the menu');
  assert.ok(soft.proposal.every((item: {note?: string}) => item.note === '不要植脂末'));
  assert.ok(soft.notices.some((text: string) => /写进订单备注/.test(text)));
  const box = (await call('/api/recommend/preview', {body: {message: '开盲盒', action: {type: 'blindbox', mood: '有点丧'}}})).json;
  assert.equal(box.cards.length, 1); assert.equal(box.proposal[0].note, '不要植脂末');
  const quote = (await call('/api/orders/quote', {body: {items: [soft.proposal[0]]}})).json.quote;
  assert.equal(quote.lines[0].note, '不要植脂末'); assert.match(quote.summary, /备注：不要植脂末/);
});

test('chat: a named drink becomes one order card; a verified-rule or budget conflict asks first', async t => {
  const {app, call} = await setup(t);
  const direct = (await call('/api/recommend/preview', {body: {message: '来一杯芒芒椰椰，三分糖'}})).json;
  assert.deepEqual(direct.cards.map((card: {drinkId: string}) => card.drinkId), ['c03']);
  assert.match(direct.reply, /^好的，芒芒椰椰/); assert.equal(direct.proposal[0].sweetness, '三分糖');
  const browse = (await call('/api/recommend/preview', {body: {message: '有没有类似芒芒椰椰的推荐'}})).json;
  assert.ok(browse.cards.length > 1, 'asking for alternatives still browses');
  const budget = (await call('/api/recommend/preview', {body: {message: '10块以内来一杯芒芒椰椰'}})).json;
  assert.equal(budget.intent, 'clarify'); assert.deepEqual(budget.cards, []); assert.match(budget.reply, /超出你 ¥10 的预算/);
  (app.locals.store as Store).updateDrink('c03', {verified: true, ingredients: ['芒果', '椰乳'], allergens: ['芒果'], caffeine: 'none', sweetnessOptions: ['五分糖', '全糖'], temperatureOptions: ['少冰']});
  const rule = (await call('/api/recommend/preview', {body: {message: '来一杯芒芒椰椰，三分糖'}})).json;
  assert.equal(rule.intent, 'clarify'); assert.match(rule.reply, /甜度没有「三分糖」，可选：五分糖、全糖/);
  assert.deepEqual(rule.suggestions, ['芒芒椰椰，五分糖', '芒芒椰椰，全糖']);
});

test('bundle: one taste for "两杯解腻的" applies to every cup, per-person tastes stay separate', async t => {
  const {call} = await setup(t);
  const both = (await call('/api/recommend/preview', {body: {message: '30 块以内，两杯解腻的'}})).json;
  assert.deepEqual(both.bundle.tastes, ['清爽', '清爽']); assert.ok(both.bundle.total <= 30);
  const split = (await call('/api/recommend/preview', {body: {message: '两个人喝，一位要清爽，一位随意'}})).json;
  assert.deepEqual(split.bundle.tastes, ['清爽', '随意']);
});
