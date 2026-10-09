import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../server/database.js';
import {OFFICIAL_CATALOG} from '../server/data/official-catalog.js';
import {MOCK_MENU} from '../src/data/menu.js';
import type {Drink} from '../shared/contracts.js';
import {recommend} from '../server/recommend.js';
import {loadConfig} from '../server/config.js';

function legacyStore(t: TestContext): Store {
  const store = new Store(':memory:'); t.after(() => store.close());
  store.db.exec('DELETE FROM drinks; DELETE FROM metadata;');
  const insert = store.db.prepare('INSERT INTO drinks (id, value) VALUES (?, ?)');
  for (const item of MOCK_MENU) {
    const drink: Drink = {...item, available: true, verified: false, ingredients: [], allergens: null, caffeine: 'unknown', sweetnessOptions: [], temperatureOptions: [], toppings: [], source: '原交付包菜单（待品牌核实）', updatedAt: '2026-10-08T00:00:00.000Z'};
    insert.run(drink.id, JSON.stringify(drink));
  }
  return store;
}

function oldEdit(store: Store, id: string, patch: Partial<Drink>) {
  const drink = {...store.drink(id)!, ...patch};
  store.db.prepare('UPDATE drinks SET value = ? WHERE id = ?').run(JSON.stringify(drink), id);
}

test('official observations keep all historical records, add only one genuinely new item, and leave recipe facts unknown', t => {
  const store = legacyStore(t); const result = store.syncOfficialCatalog();
  assert.equal(result.observedCount, 24); assert.deepEqual(result.addedIds, ['wx_coffee_amber_latte']);
  assert.equal(store.drinks().length, 84);
  const observed = store.drinks().filter(drink => drink.catalogStatus === 'observed');
  assert.equal(observed.length, 24); assert.equal(observed.filter(drink => drink.available).length, 16);
  assert.equal(store.drinks().filter(drink => drink.catalogStatus === 'legacy').length, 60);
  for (const drink of observed) {
    assert.equal(drink.catalogEvidence?.storeName, '中华茉莉园店'); assert.equal(drink.catalogEvidence?.observedAt, '2026-10-09');
    assert.equal(drink.catalogEvidence?.priceKind, 'regular'); assert.ok(drink.catalogEvidence?.verifiedFields.includes('price'));
    assert.equal(drink.verified, false); assert.deepEqual(drink.ingredients, []); assert.equal(drink.allergens, null);
    assert.equal(drink.caffeine, 'unknown'); assert.deepEqual(drink.sweetnessOptions, []); assert.deepEqual(drink.temperatureOptions, []);
  }
  assert.equal(store.drink('p10')!.category, '招牌鲜奶茶'); assert.equal(store.drink('p10')!.volume, '中杯500cc / 大杯650cc');
  assert.equal(store.drink('p14')!.name, '萃.琥珀六堡');
  assert.equal(store.drink('wx_coffee_amber_latte')!.available, false); assert.equal(store.drink('wx_coffee_amber_latte')!.nameEn, '');
  // The 15-yuan campaign poster must never overwrite the 16-yuan store price.
  assert.equal(store.drink('o01')!.price, 16); assert.equal(store.drink('o01')!.catalogEvidence?.startingPrice, true);
  assert.equal(store.drink('m08')!.catalogStatus, 'legacy'); assert.equal(store.drink('m08')!.price, 17);
});

test('field-level sync preserves prior manager edits and does not mistake editorial cleanup for a menu override', t => {
  const store = legacyStore(t);
  oldEdit(store, 'p01', {price: 9, available: false});
  oldEdit(store, 'p10', {volume: '店内特别杯型'});
  oldEdit(store, 'm01', {price: 18, source: '管理员现场维护', verified: true, ingredients: ['茶', '牛乳'], allergens: ['乳']});
  oldEdit(store, 'p05', {description: '', tags: []});
  const result = store.syncOfficialCatalog();
  const cold = store.drink('p01')!;
  assert.equal(cold.price, 9); assert.equal(cold.available, false); assert.equal(cold.catalogStatus, 'managed');
  assert.equal(cold.catalogEvidence!.observedPrice, 4); assert.ok(!cold.catalogEvidence!.verifiedFields.includes('price'));
  assert.ok(result.preservedFields.some(item => item.id === 'p01' && item.fields.includes('price') && item.fields.includes('available')));
  assert.equal(store.drink('p10')!.volume, '店内特别杯型'); assert.ok(!store.drink('p10')!.catalogEvidence!.verifiedFields.includes('volume'));
  assert.equal(store.drink('m01')!.catalogStatus, 'managed'); assert.equal(store.drink('m01')!.source, '管理员现场维护'); assert.equal(store.drink('m01')!.verified, true);
  assert.equal(store.drink('p05')!.catalogStatus, 'observed'); assert.equal(store.drink('p05')!.description, ''); assert.deepEqual(store.drink('p05')!.tags, []);
});

test('sync is idempotent and a later batch updates unchanged source fields without clobbering new edits', t => {
  const store = legacyStore(t); store.syncOfficialCatalog();
  store.updateDrink('p01', {price: 8});
  store.updateDrink('p07', {catalogStatus: 'legacy'});
  const snapshot = JSON.stringify(store.drinks());
  assert.equal(store.syncOfficialCatalog().applied, false); assert.equal(JSON.stringify(store.drinks()), snapshot);
  const batch = {...OFFICIAL_CATALOG, batchId: 'test-next-observation', observedAt: '2026-10-10', items: OFFICIAL_CATALOG.items.map(item => item.id === 'p01' || item.id === 'p05' ? {...item, price: item.price + 1} : item)};
  const result = store.syncOfficialCatalog(batch);
  assert.equal(store.drink('p01')!.price, 8); assert.equal(store.drink('p01')!.catalogEvidence!.observedPrice, 5);
  assert.equal(store.drink('p05')!.price, 11); assert.ok(store.drink('p05')!.catalogEvidence!.verifiedFields.includes('price'));
  assert.equal(store.drink('p07')!.catalogStatus, 'legacy'); // A later observation must not undo an explicit manager exclusion.
  assert.ok(result.preservedFields.some(item => item.id === 'p01'));
  const changed = JSON.stringify(store.drinks()); assert.equal(store.syncOfficialCatalog(batch).applied, false); assert.equal(JSON.stringify(store.drinks()), changed);
});

test('v1 to v2 fills observed cup sizes over untouched seed values while preserving manager overrides', t => {
  const store = legacyStore(t);
  const v1 = {
    ...OFFICIAL_CATALOG,
    batchId: 'zhonghua-jasmine-garden-2026-10-09-store-menu-24-v1',
    source: '极萃东方茉莉微信小程序 · 门店点单目录（普通价，非会员价）',
    items: OFFICIAL_CATALOG.items.map(item => {
      const original = {...item};
      if (item.id !== 'p10') delete original.volume;
      return original;
    }),
  };
  // Preserve a real volume edit from before v1, even though v1 did not observe that field.
  oldEdit(store, 'p07', {volume: '管理员确认的特别杯型'});
  store.syncOfficialCatalog(v1);
  assert.equal(store.drink('p01')!.volume, '500ml');
  assert.equal(store.drink('p05')!.volume, '700ml');
  assert.equal(store.drink('m18')!.volume, '标准杯');
  assert.equal(store.drink('p05')!.catalogEvidence!.observedVolume, undefined);
  // A later manager volume edit stays; unrelated edits must not block new cup-size evidence.
  store.updateDrink('m09', {volume: '管理员确认的限定杯'});
  store.updateDrink('p01', {price: 8});
  store.updateDrink('p09', {available: false});

  const result = store.syncOfficialCatalog();
  assert.equal(OFFICIAL_CATALOG.batchId, 'zhonghua-jasmine-garden-2026-10-09-store-menu-24-v2');
  assert.equal(result.applied, true);
  assert.equal(store.drink('p05')!.volume, '截图所见：纯茶700cc');
  assert.equal(store.drink('m18')!.volume, '中杯500cc / 大杯650cc');
  assert.equal(store.drink('p01')!.price, 8);
  assert.equal(store.drink('p09')!.available, false);
  for (const item of OFFICIAL_CATALOG.items.filter(item => item.volume)) {
    const drink = store.drink(item.id)!;
    assert.equal(drink.catalogEvidence!.observedVolume, item.volume);
    assert.equal(drink.verified, false);
    assert.deepEqual(drink.sweetnessOptions, []);
    assert.deepEqual(drink.temperatureOptions, []);
    if (item.id === 'm09' || item.id === 'p07') {
      assert.equal(drink.volume, item.id === 'm09' ? '管理员确认的限定杯' : '管理员确认的特别杯型');
      assert.ok(!drink.catalogEvidence!.verifiedFields.includes('volume'));
      assert.ok(result.preservedFields.some(entry => entry.id === item.id && entry.fields.includes('volume')));
    } else {
      assert.equal(drink.volume, item.volume);
      assert.ok(drink.catalogEvidence!.verifiedFields.includes('volume'));
      assert.ok(!result.preservedFields.some(entry => entry.id === item.id && entry.fields.includes('volume')));
    }
  }
  // Unseen capacities remain unobserved; a previous seed label is not new evidence.
  for (const id of ['c04', 'f09', 'wx_coffee_amber_latte']) {
    assert.equal(OFFICIAL_CATALOG.items.find(item => item.id === id)!.volume, undefined);
    assert.equal(store.drink(id)!.catalogEvidence!.observedVolume, undefined);
    assert.ok(!store.drink(id)!.catalogEvidence!.verifiedFields.includes('volume'));
  }
  assert.equal(store.drink('p05')!.source, `${OFFICIAL_CATALOG.source} · 中华茉莉园店 · 2026-10-09；仅核对目录显示字段，配方资料待品牌核实`);
  const afterV2 = JSON.stringify(store.drinks());
  assert.equal(store.syncOfficialCatalog().applied, false);
  assert.equal(JSON.stringify(store.drinks()), afterV2);
});

test('catalog imports roll back as one transaction when the evidence manifest is invalid', t => {
  const store = legacyStore(t); const snapshot = JSON.stringify(store.drinks());
  assert.throws(() => store.syncOfficialCatalog({...OFFICIAL_CATALOG, items: [...OFFICIAL_CATALOG.items, OFFICIAL_CATALOG.items[0]]}), /Duplicate/);
  assert.equal(JSON.stringify(store.drinks()), snapshot);
  assert.equal(store.syncOfficialCatalog().applied, true);
});

test('legacy and sold-out products are excluded even if the model nominates them, while source starting prices remain explicit', async t => {
  const store = legacyStore(t); store.syncOfficialCatalog(); const config = {...loadConfig({}), apiKey: 'test-key'};
  const fetcher: typeof fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.ok(!body.messages[1].content.includes('Old Salt')); // No unverified English descriptions are sent.
    assert.ok(!body.messages[1].content.includes('老盐鸭屎鲜乳茶'));
    return new Response(JSON.stringify({choices: [{message: {content: JSON.stringify({intent: 'recommend', drinkIds: ['m01', 'k01', 'wx_coffee_amber_latte', 'p10']})}}]}));
  };
  const response = await recommend({message: '推荐一杯，预算15元'}, 'live', store, config, fetcher);
  assert.deepEqual(response.cards.map(card => card.drinkId), ['p10']);
  assert.equal(response.cards[0].price, 13); assert.equal(response.cards[0].startingPrice, true);
  assert.match(response.cards[0].orderPhrase, /参考起价/); assert.match(response.cards[0].reason, /最终价需门店确认/);
  assert.equal(response.cards[0].catalogEvidence?.storeName, '中华茉莉园店'); assert.equal(response.cards[0].verified, false);
  assert.ok(response.notices.some(notice => notice.includes('普通起价')));
  store.updateDrink('m01', {price: 3}); assert.equal(store.drink('m01')!.catalogStatus, 'legacy');
  const hidden = await recommend({message: '推荐一杯，最多3元'}, 'preview', store, config, fetcher); assert.deepEqual(hidden.cards, []);
  store.updateDrink('m01', {catalogStatus: 'managed'});
  const managed = await recommend({message: '推荐一杯，最多3元'}, 'preview', store, config, fetcher); assert.deepEqual(managed.cards.map(card => card.drinkId), ['m01']);
});
