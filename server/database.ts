import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MOCK_MENU } from '../src/data/menu.js';
import type { Drink, KnowledgeEntry } from '../shared/contracts.js';
import { OFFICIAL_CATALOG, type OfficialCatalogBatch } from './data/official-catalog.js';

export class StoreConflict extends Error {}
const nextTimestamp = (previous = '') => new Date(Math.max(Date.now(), (Date.parse(previous) || 0) + 1)).toISOString();
const seedSource = '原交付包菜单（待品牌核实）';
const recipeDefaults = {verified: false, ingredients: [], allergens: null, caffeine: 'unknown' as const, sweetnessOptions: [], temperatureOptions: [], toppings: []};
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
export interface CatalogSyncReport {batchId: string; applied: boolean; observedCount: number; addedIds: string[]; preservedFields: {id: string; fields: string[]}[]}

function hasAdminChanges(drink: Drink): boolean {
  const original = MOCK_MENU.find(item => item.id === drink.id);
  if (!original || drink.source !== seedSource) return true;
  // Earlier editorial cleanup of descriptions/tags is not a manager's operational override.
  const baseline = {...recipeDefaults, price: original.price, available: true};
  return Object.entries(baseline).some(([key, value]) => !same(drink[key as keyof Drink], value));
}

export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS drinks (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS knowledge (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, mode TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY, request_id TEXT NOT NULL, rating TEXT NOT NULL, comment TEXT NOT NULL, created_at TEXT NOT NULL);`);
    if ((this.db.prepare('SELECT COUNT(*) as count FROM drinks').get() as {count: number}).count === 0) {
      const insert = this.db.prepare('INSERT INTO drinks (id, value) VALUES (?, ?)');
      this.db.exec('BEGIN');
      try {
        for (const original of MOCK_MENU) {
          const drink: Drink = { ...original, available: true, ...recipeDefaults, source: seedSource, updatedAt: new Date().toISOString() };
          insert.run(drink.id, JSON.stringify(drink));
        }
        this.db.exec('COMMIT');
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    }
    this.syncOfficialCatalog();
  }
  /** Versioned, field-by-field import. Never delete legacy records or overwrite manager edits. */
  syncOfficialCatalog(batch: OfficialCatalogBatch = OFFICIAL_CATALOG): CatalogSyncReport {
    const key = `catalog_sync:${batch.batchId}`;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key);
      if (previous) {this.db.exec('COMMIT'); return {...JSON.parse(previous.value as string) as CatalogSyncReport, applied: false};}
      if (new Set(batch.items.map(item => item.id)).size !== batch.items.length) throw new Error('Duplicate catalog observation IDs');
      const report: CatalogSyncReport = {batchId: batch.batchId, applied: true, observedCount: batch.items.length, addedIds: [], preservedFields: []};
      const observations = new Map(batch.items.map(item => [item.id, item]));
      const save = this.db.prepare('INSERT INTO drinks (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value');
      for (const old of this.drinks()) {
        const observation = observations.get(old.id);
        const statusOverride = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(`catalog_status_override:${old.id}`)?.value as Drink['catalogStatus'];
        const managed = old.catalogStatus === 'managed' || (!old.catalogStatus && hasAdminChanges(old));
        const drink: Drink = {...old, catalogStatus: old.catalogStatus || (managed ? 'managed' : 'legacy'), updatedAt: nextTimestamp(old.updatedAt)};
        if (observation) {
          const original = MOCK_MENU.find(item => item.id === old.id);
          const prior = old.catalogEvidence;
          const baseline = {name: prior?.observedName ?? original?.name, price: prior?.observedPrice ?? original?.price, category: prior?.observedCategory ?? original?.category, volume: prior?.observedVolume ?? original?.volume, available: prior?.observedAvailable ?? true};
          const observed = {name: observation.name, price: observation.price, category: observation.category, ...(observation.volume ? {volume: observation.volume} : {}), available: observation.available ?? true};
          const preserved: string[] = [];
          for (const [field, value] of Object.entries(observed)) {
            if (same(old[field as keyof Drink], baseline[field as keyof typeof baseline])) Object.assign(drink, {[field]: value});
            else if (!same(old[field as keyof Drink], value)) preserved.push(field);
          }
          drink.catalogStatus = statusOverride || (managed || preserved.length ? 'managed' : 'observed');
          drink.catalogEvidence = {source: batch.source, storeName: batch.storeName, observedAt: batch.observedAt, scope: 'store-menu', priceKind: 'regular', startingPrice: observation.startingPrice ?? false, observedName: observation.name, observedPrice: observation.price, observedCategory: observation.category, ...(observation.volume ? {observedVolume: observation.volume} : {}), observedAvailable: observation.available ?? true, verifiedFields: (['name', 'price', 'category', 'volume'] as const).filter(field => field in observed && same(drink[field], observed[field]))};
          if (old.source === seedSource || old.source === `${prior?.source} · ${prior?.storeName} · ${prior?.observedAt}；仅核对目录显示字段，配方资料待品牌核实`) drink.source = `${batch.source} · ${batch.storeName} · ${batch.observedAt}；仅核对目录显示字段，配方资料待品牌核实`;
          if (preserved.length) report.preservedFields.push({id: old.id, fields: preserved});
          observations.delete(old.id);
        }
        save.run(drink.id, JSON.stringify(drink));
      }
      for (const observation of observations.values()) {
        const drink: Drink = {id: observation.id, name: observation.name, nameEn: '', price: observation.price, volume: observation.volume || '规格待门店确认', category: observation.category, tags: [], description: '', available: observation.available ?? true, ...recipeDefaults, source: `${batch.source} · ${batch.storeName} · ${batch.observedAt}；仅核对目录显示字段，配方资料待品牌核实`, updatedAt: nextTimestamp(), catalogStatus: 'observed', catalogEvidence: {source: batch.source, storeName: batch.storeName, observedAt: batch.observedAt, scope: 'store-menu', priceKind: 'regular', startingPrice: observation.startingPrice ?? false, observedName: observation.name, observedPrice: observation.price, observedCategory: observation.category, ...(observation.volume ? {observedVolume: observation.volume} : {}), observedAvailable: observation.available ?? true, verifiedFields: ['name', 'price', 'category', ...(observation.volume ? ['volume' as const] : [])]}};
        save.run(drink.id, JSON.stringify(drink)); report.addedIds.push(drink.id);
      }
      this.db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run(key, JSON.stringify(report));
      this.db.exec('COMMIT'); return report;
    } catch (error) {this.db.exec('ROLLBACK'); throw error;}
  }
  drinks(): Drink[] { return this.db.prepare('SELECT value FROM drinks ORDER BY rowid').all().map(row => JSON.parse(row.value as string) as Drink); }
  drink(id: string): Drink | undefined {
    const row = this.db.prepare('SELECT value FROM drinks WHERE id = ?').get(id);
    return row ? JSON.parse(row.value as string) as Drink : undefined;
  }
  updateDrink(id: string, patch: Partial<Drink>, expectedUpdatedAt?: string): Drink | undefined {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const old = this.drink(id);
      if (!old) {this.db.exec('COMMIT'); return undefined;}
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== old.updatedAt) throw new StoreConflict('menu version changed');
      const drink: Drink = {...old, ...patch, id, catalogStatus: patch.catalogStatus ?? old.catalogStatus ?? 'managed', updatedAt: nextTimestamp(old.updatedAt)};
      if (drink.catalogEvidence) {
        const evidence = drink.catalogEvidence;
        const observed = {name: evidence.observedName, price: evidence.observedPrice, category: evidence.observedCategory, volume: evidence.observedVolume};
        drink.catalogEvidence = {...evidence, verifiedFields: evidence.verifiedFields.filter(field => same(drink[field], observed[field]))};
      }
      this.db.prepare('UPDATE drinks SET value = ? WHERE id = ?').run(JSON.stringify(drink), id);
      if (patch.catalogStatus !== undefined) this.db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(`catalog_status_override:${id}`, patch.catalogStatus);
      this.db.exec('COMMIT');
      return drink;
    } catch (error) {this.db.exec('ROLLBACK'); throw error;}
  }
  knowledge(verifiedOnly = false): KnowledgeEntry[] {
    const entries = this.db.prepare('SELECT value FROM knowledge ORDER BY rowid').all().map(row => JSON.parse(row.value as string) as KnowledgeEntry);
    return verifiedOnly ? entries.filter(entry => entry.verified) : entries;
  }
  knowledgeVersion(): string {return this.db.prepare("SELECT value FROM metadata WHERE key = 'knowledge_version'").get()?.value as string || '0';}
  setKnowledge(entries: KnowledgeEntry[], expectedVersion?: string): KnowledgeEntry[] {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.knowledgeVersion();
      if (expectedVersion !== undefined && expectedVersion !== previous) throw new StoreConflict('knowledge version changed');
      const version = nextTimestamp(previous);
      const updated = entries.map(entry => ({...entry, updatedAt: version}));
      this.db.exec('DELETE FROM knowledge');
      const insert = this.db.prepare('INSERT INTO knowledge (id, value) VALUES (?, ?)');
      for (const entry of updated) insert.run(entry.id, JSON.stringify(entry));
      this.db.prepare("INSERT INTO metadata (key, value) VALUES ('knowledge_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(version);
      this.db.exec('COMMIT');
      return updated;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  recordRequest(id: string, mode: string) { this.db.prepare('INSERT INTO requests (id, mode, created_at) VALUES (?, ?, ?)').run(id, mode, new Date().toISOString()); }
  feedback(requestId: string, rating: string, comment: string): boolean {
    if (!this.db.prepare('SELECT id FROM requests WHERE id = ?').get(requestId)) return false;
    this.db.prepare('INSERT INTO feedback (request_id, rating, comment, created_at) VALUES (?, ?, ?, ?)').run(requestId, rating, comment, new Date().toISOString());
    return true;
  }
  close() { this.db.close(); }
}
