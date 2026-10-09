import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/index.js';
import type { Store } from '../server/database.js';
import type { ApiError, OfficialOrderDraft, OfficialOrderHandoffResponse } from '../shared/contracts.js';

const draft: OfficialOrderDraft = {
  drinkId: 'p01', drinkName: '茉莉冷萃水', quantity: 1, storeName: '中华茉莉园店',
  options: {volume: '按门店规格', sweetness: '按门店默认', temperature: '按门店默认', toppings: '未加料'},
  note: '希望清爽一些',
};

async function setup(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'jasmine-handoff-test-'));
  let externalCalls = 0;
  const app = createApp({
    databasePath: join(dir, 'test.sqlite'),
    config: {apiKey: '', adminToken: '', staticDir: join(dir, 'missing')},
    fetcher: async () => {externalCalls++; throw new Error('Handoff placeholder must not call a provider');},
  });
  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    app.locals.close();
    rmSync(dir, {recursive: true, force: true});
  });
  return {
    store: app.locals.store as Store,
    externalCalls: () => externalCalls,
    request: (body: unknown) => fetch(`${origin}/api/order-handoff`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
    }),
  };
}

test('official handoff accepts a valid draft but explicitly leaves it unsubmitted with no side effects', async t => {
  const {store, request, externalCalls} = await setup(t);
  const changesBefore = store.db.prepare('SELECT total_changes() AS count').get();
  const drinksBefore = store.drinks();
  for (const quantity of [1, 20]) {
    const response = await request({...draft, quantity});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json() as OfficialOrderHandoffResponse;
    assert.ok(result.status === 'unavailable');
    assert.match(result.message, /尚未提交/);
    assert.deepEqual(Object.keys(result).sort(), ['message', 'status']);
  }
  assert.deepEqual(store.db.prepare('SELECT total_changes() AS count').get(), changesBefore);
  assert.deepEqual(store.drinks(), drinksBefore);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM requests').get()?.count, 0);
  assert.equal(externalCalls(), 0);
});

test('official handoff rejects malformed fields, price injection, and invalid quantities', async t => {
  const {request} = await setup(t);
  const invalidDrafts: unknown[] = [
    null, [], {}, {draft},
    {...draft, drinkId: ''}, {...draft, drinkId: '../p01'},
    {...draft, drinkName: ' '}, {...draft, drinkName: 'a'.repeat(161)},
    ...[0, -1, 21, 1.5, '1'].map(quantity => ({...draft, quantity})),
    {...draft, storeName: 'a'.repeat(161)}, {...draft, note: 'a'.repeat(501)},
    {...draft, options: {}},
    {...draft, options: {...draft.options, sweetness: ' '}},
    {...draft, options: {...draft.options, temperature: 'a'.repeat(81)}},
    {...draft, options: {...draft.options, toppings: 'a'.repeat(301)}},
    {...draft, options: {...draft.options, price: 0}},
    {...draft, price: 0}, {...draft, url: 'https://example.com/checkout'},
  ];
  for (const invalid of invalidDrafts) {
    const response = await request(invalid);
    assert.equal(response.status, 400);
    assert.match((await response.json() as ApiError).error.code, /^(INVALID_INPUT|INVALID_JSON)$/);
  }
});

test('official handoff rechecks missing, unavailable and legacy items against the current catalog', async t => {
  const {store, request} = await setup(t);
  const missing = await request({...draft, drinkId: 'not-a-product'});
  assert.equal(missing.status, 404);
  assert.equal((await missing.json() as ApiError).error.code, 'DRINK_NOT_FOUND');

  store.updateDrink(draft.drinkId, {available: false});
  const unavailable = await request(draft);
  assert.equal(unavailable.status, 409);
  assert.equal((await unavailable.json() as ApiError).error.code, 'DRINK_UNAVAILABLE');

  store.updateDrink(draft.drinkId, {available: true, catalogStatus: 'legacy'});
  const legacy = await request(draft);
  assert.equal(legacy.status, 409);
  assert.equal((await legacy.json() as ApiError).error.code, 'DRINK_UNAVAILABLE');
});

test('client labels and desired options cannot become an official quote or supported configuration', async t => {
  const {store, request} = await setup(t);
  const before = store.drink(draft.drinkId);
  const response = await request({
    ...draft, drinkName: '客户端自填名称', storeName: '尚未映射的门店',
    options: {volume: '9升', sweetness: '自定义甜度', temperature: '自定义温度', toppings: '未核实加料'},
  });
  assert.equal(response.status, 200);
  const result = await response.json() as OfficialOrderHandoffResponse;
  assert.equal(result.status, 'unavailable');
  assert.ok(!('url' in result));
  assert.ok(!('price' in result));
  assert.ok(!('orderId' in result));
  assert.deepEqual(store.drink(draft.drinkId), before);
});
