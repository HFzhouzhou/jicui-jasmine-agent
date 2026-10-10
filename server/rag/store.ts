import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { KnowledgeEntry } from '../../shared/contracts.js';
import type { DocumentStatus, KnowledgeChunk, KnowledgeDocument, KnowledgeDocumentDetail, KnowledgeHit, KnowledgeOverview, KnowledgeSearchResult } from '../../shared/rag.js';
import { diversify, indexTokens, lexicalRelevance, planQuery } from './retrieval.js';

export const RAG_LIMITS = {documents: 200, characters: 3_000_000, chunks: 8000, documentCharacters: 500_000, documentChunks: 1200} as const;
export class RagConflict extends Error { readonly code = 'version_conflict'; readonly status = 409; }
export class RagValidationError extends Error {
  constructor(message: string, readonly code = 'invalid_document', readonly status = 400) { super(message); this.name = 'RagValidationError'; }
}
export interface KnowledgePage { text: string; page?: number; section?: string }
export interface IngestDocument { title: string; filename: string; format: string; source: string; hash: string; pages: KnowledgePage[]; warnings: string[] }
export interface SearchOptions { includeDraft?: boolean; documentId?: string; limit?: number }
interface DocumentRow { id: string; title: string; filename: string; format: string; source: string; status: DocumentStatus; version: string; created_at: string; updated_at: string; chunk_count: number; char_count: number; page_count: number; warnings_json: string; source_hash: string; pages_json: string; legacy_id: string | null; legacy_hash: string | null }
interface ChunkRow { id: string; document_id: string; ordinal: number; text: string; page: number | null; section: string | null }
const hashText = (text: string) => createHash('sha256').update(text).digest('hex');
const nextVersion = (previous = '') => new Date(Math.max(Date.now(), (Date.parse(previous) || 0) + 1)).toISOString();
const normalizedText = (text: string) => text.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\p{Cc}/gu, character => character === '\n' || character === '\t' ? character : '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
const heading = (line: string) => line.length <= 100 && /^(?:#{1,6}\s+|第[一二三四五六七八九十百\d]+[章节篇部分]|[一二三四五六七八九十]+[、．.]|\d+(?:\.\d+)*[、．.)\s])/.test(line);
const publicDocument = (row: DocumentRow): KnowledgeDocument => ({id: row.id, title: row.title, filename: row.filename, format: row.format, source: row.source, status: row.status, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at, chunkCount: row.chunk_count, charCount: row.char_count, pageCount: row.page_count, warnings: JSON.parse(row.warnings_json) as string[], hash: row.source_hash});
const publicChunk = (row: ChunkRow): KnowledgeChunk => ({id: row.id, documentId: row.document_id, ordinal: row.ordinal, text: row.text, ...(row.page !== null ? {page: row.page} : {}), ...(row.section ? {section: row.section} : {})});

function normalizePages(pages: KnowledgePage[]): KnowledgePage[] {
  if (!Array.isArray(pages) || pages.length > 3000) throw new RagValidationError('文档页数过多，请拆成较小的文件。', 'limit_exceeded', 413);
  const normalized = pages.map(item => ({text: normalizedText(item.text), ...(Number.isInteger(item.page) && item.page! > 0 ? {page: item.page} : {}), ...(item.section?.trim() ? {section: item.section.trim().slice(0, 180)} : {})})).filter(item => item.text);
  const size = normalized.reduce((sum, page) => sum + page.text.length, 0);
  if (!size) throw new RagValidationError('没有可检索的正文，请检查文件内容。');
  if (size > RAG_LIMITS.documentCharacters) throw new RagValidationError(`单份文档最多支持 ${RAG_LIMITS.documentCharacters.toLocaleString('zh-CN')} 字，请拆分后上传。`, 'limit_exceeded', 413);
  return normalized;
}

/** Respect page/section boundaries; overlap only within the same source section. */
export function splitKnowledgePages(documentId: string, pages: KnowledgePage[]): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  for (const page of pages) {
    let section = page.section;
    let buffer = '';
    let freshCharacters = 0;
    const flush = (overlap: boolean) => {
      if (buffer.trim() && freshCharacters > 0) chunks.push({id: `${documentId}:c${chunks.length}`, documentId, ordinal: chunks.length, text: buffer.trim(), ...(page.page ? {page: page.page} : {}), ...(section ? {section} : {})});
      buffer = overlap ? buffer.slice(-120).trim() : '';
      freshCharacters = 0;
    };
    const append = (unit: string) => {
      if (!unit.trim()) return;
      if (buffer && buffer.length + unit.length + 1 > 950) flush(true);
      buffer += `${buffer ? '\n' : ''}${unit}`;
      freshCharacters += unit.length;
      if (buffer.length >= 850) flush(true);
    };
    for (const paragraph of page.text.split(/\n+/).map(line => line.trim()).filter(Boolean)) {
      if (heading(paragraph)) {
        flush(false);
        section = paragraph.replace(/^#{1,6}\s+/, '').slice(0, 180);
      }
      let remaining = paragraph;
      while (remaining.length > 800) {
        const window = remaining.slice(0, 800);
        const boundaries = [...window.matchAll(/[。！？.!?；;](?:\s|$)?/g)];
        const lastBoundary = boundaries.at(-1)?.index;
        const cut = lastBoundary !== undefined && lastBoundary >= 550 ? lastBoundary + 1 : 800;
        append(remaining.slice(0, cut));
        remaining = remaining.slice(cut).trimStart();
      }
      append(remaining);
    }
    flush(false);
  }
  if (chunks.length > RAG_LIMITS.documentChunks) throw new RagValidationError('文档分段过多，请拆分文件后重试。', 'limit_exceeded', 413);
  return chunks;
}

export class RagStore {
  constructor(readonly db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS rag_documents (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, filename TEXT NOT NULL, format TEXT NOT NULL, source TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft','published','archived')), version TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, chunk_count INTEGER NOT NULL, char_count INTEGER NOT NULL,
      page_count INTEGER NOT NULL, warnings_json TEXT NOT NULL, source_hash TEXT NOT NULL UNIQUE, pages_json TEXT NOT NULL,
      legacy_id TEXT UNIQUE, legacy_hash TEXT);
      CREATE TABLE IF NOT EXISTS rag_chunks (
      rowid INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE, document_id TEXT NOT NULL, ordinal INTEGER NOT NULL,
      text TEXT NOT NULL, page INTEGER, section TEXT, body_tokens TEXT NOT NULL, title_tokens TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS rag_chunk_document ON rag_chunks(document_id, ordinal);
      CREATE INDEX IF NOT EXISTS rag_document_status ON rag_documents(status);
      CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(body_tokens, title_tokens, content='rag_chunks', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2');
      CREATE TRIGGER IF NOT EXISTS rag_chunks_insert AFTER INSERT ON rag_chunks BEGIN
        INSERT INTO rag_chunks_fts(rowid, body_tokens, title_tokens) VALUES(new.rowid,new.body_tokens,new.title_tokens); END;
      CREATE TRIGGER IF NOT EXISTS rag_chunks_delete AFTER DELETE ON rag_chunks BEGIN
        INSERT INTO rag_chunks_fts(rag_chunks_fts,rowid,body_tokens,title_tokens) VALUES('delete',old.rowid,old.body_tokens,old.title_tokens); END;
      CREATE TRIGGER IF NOT EXISTS rag_chunks_update AFTER UPDATE ON rag_chunks BEGIN
        INSERT INTO rag_chunks_fts(rag_chunks_fts,rowid,body_tokens,title_tokens) VALUES('delete',old.rowid,old.body_tokens,old.title_tokens);
        INSERT INTO rag_chunks_fts(rowid,body_tokens,title_tokens) VALUES(new.rowid,new.body_tokens,new.title_tokens); END;
      CREATE TABLE IF NOT EXISTS rag_embeddings (chunk_id TEXT NOT NULL, provider_key TEXT NOT NULL, content_hash TEXT NOT NULL, vector_json TEXT NOT NULL, PRIMARY KEY(chunk_id,provider_key));`);
  }
  private transaction<T>(callback: () => T): T {
    const point = `rag_${randomUUID().replaceAll('-', '')}`;
    this.db.exec(`SAVEPOINT ${point}`);
    try { const result = callback(); this.db.exec(`RELEASE ${point}`); return result; }
    catch (error) { this.db.exec(`ROLLBACK TO ${point}; RELEASE ${point}`); throw error; }
  }
  private row(id: string): DocumentRow | undefined { return this.db.prepare('SELECT * FROM rag_documents WHERE id=?').get(id) as unknown as DocumentRow | undefined; }
  private editable(id: string, expectedVersion: string): DocumentRow {
    const document = this.row(id);
    if (!document) throw new RagValidationError('知识文档不存在。', 'not_found', 404);
    if (!expectedVersion || document.version !== expectedVersion) throw new RagConflict('内容已更新，请刷新后重试。');
    return document;
  }
  listDocuments(): KnowledgeDocument[] { return (this.db.prepare('SELECT * FROM rag_documents ORDER BY updated_at DESC, id').all() as unknown as DocumentRow[]).map(publicDocument); }
  getDocument(id: string): KnowledgeDocumentDetail | undefined {
    const row = this.row(id);
    if (!row) return undefined;
    return {document: publicDocument(row), content: (JSON.parse(row.pages_json) as KnowledgePage[]).map(page => page.text).join('\n\n'), chunks: (this.db.prepare('SELECT * FROM rag_chunks WHERE document_id=? ORDER BY ordinal').all(id) as unknown as ChunkRow[]).map(publicChunk)};
  }
  stats(): KnowledgeOverview['stats'] {
    const row = this.db.prepare("SELECT COUNT(*) documents, COALESCE(SUM(status='published'),0) published, COALESCE(SUM(chunk_count),0) chunks, COALESCE(SUM(char_count),0) characters FROM rag_documents").get()!;
    return {documents: Number(row.documents), published: Number(row.published), chunks: Number(row.chunks), characters: Number(row.characters)};
  }
  private checkLimits(characters: number, chunks: number, old?: DocumentRow): void {
    const totals = this.stats();
    if (totals.documents + (old ? 0 : 1) > RAG_LIMITS.documents || totals.characters - (old?.char_count ?? 0) + characters > RAG_LIMITS.characters || totals.chunks - (old?.chunk_count ?? 0) + chunks > RAG_LIMITS.chunks) throw new RagValidationError('知识库容量已满，请整理文档或联系管理员扩容。', 'limit_exceeded', 413);
  }
  private replaceChunks(document: Pick<KnowledgeDocument, 'id' | 'title'>, chunks: KnowledgeChunk[]): void {
    this.db.prepare('DELETE FROM rag_embeddings WHERE chunk_id IN (SELECT id FROM rag_chunks WHERE document_id=?)').run(document.id);
    this.db.prepare('DELETE FROM rag_chunks WHERE document_id=?').run(document.id);
    const insert = this.db.prepare('INSERT INTO rag_chunks(id,document_id,ordinal,text,page,section,body_tokens,title_tokens) VALUES(?,?,?,?,?,?,?,?)');
    const title = indexTokens(document.title);
    for (const chunk of chunks) insert.run(chunk.id, document.id, chunk.ordinal, chunk.text, chunk.page ?? null, chunk.section ?? null, indexTokens(chunk.text), title);
  }
  ingest(input: IngestDocument): {document: KnowledgeDocument; duplicate: boolean} {
    return this.transaction(() => {
      if (!/^[a-f0-9]{64}$/i.test(input.hash)) throw new RagValidationError('文件摘要无效，请重新上传。');
      const duplicate = this.db.prepare('SELECT * FROM rag_documents WHERE source_hash=?').get(input.hash.toLowerCase()) as unknown as DocumentRow | undefined;
      if (duplicate) return {document: publicDocument(duplicate), duplicate: true};
      const title = input.title.trim(), source = input.source.trim();
      if (!title || title.length > 160 || source.length > 1000) throw new RagValidationError('标题不能为空且最多 160 字，来源最多 1000 字。');
      const pages = normalizePages(input.pages), id = `doc_${randomUUID()}`, version = nextVersion();
      const chunks = splitKnowledgePages(id, pages), characters = pages.reduce((sum, page) => sum + page.text.length, 0);
      this.checkLimits(characters, chunks.length);
      this.db.prepare('INSERT INTO rag_documents(id,title,filename,format,source,status,version,created_at,updated_at,chunk_count,char_count,page_count,warnings_json,source_hash,pages_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, title, input.filename.slice(0, 255), input.format.slice(0, 32), source, 'draft', version, version, version, chunks.length, characters, new Set(pages.flatMap(page => page.page ? [page.page] : [])).size, JSON.stringify(input.warnings.slice(0, 30).map(warning => warning.slice(0, 500))), input.hash.toLowerCase(), JSON.stringify(pages));
      this.replaceChunks({id, title}, chunks);
      return {document: publicDocument(this.row(id)!), duplicate: false};
    });
  }
  updateDocument(id: string, patch: {title?: string; source?: string; status?: DocumentStatus}, expectedVersion: string): KnowledgeDocument {
    return this.transaction(() => {
      const old = this.editable(id, expectedVersion);
      const title = patch.title?.trim() ?? old.title, source = patch.source?.trim() ?? old.source, status = patch.status ?? old.status;
      if (!title || title.length > 160 || source.length > 1000 || !['draft', 'published', 'archived'].includes(status)) throw new RagValidationError('文档标题、来源或状态无效。');
      if (status === 'published' && !source) throw new RagValidationError('请补充资料来源后再发布。');
      const version = nextVersion(old.version);
      this.db.prepare('UPDATE rag_documents SET title=?,source=?,status=?,version=?,updated_at=? WHERE id=?').run(title, source, status, version, version, id);
      if (title !== old.title) {
        this.db.prepare('UPDATE rag_chunks SET title_tokens=? WHERE document_id=?').run(indexTokens(title), id);
        this.db.prepare('DELETE FROM rag_embeddings WHERE chunk_id IN (SELECT id FROM rag_chunks WHERE document_id=?)').run(id);
      }
      return publicDocument(this.row(id)!);
    });
  }
  updateContent(id: string, text: string, expectedVersion: string): KnowledgeDocument {
    return this.transaction(() => {
      const old = this.editable(id, expectedVersion), pages = normalizePages([{text}]);
      const chunks = splitKnowledgePages(id, pages), characters = pages[0].text.length, version = nextVersion(old.version);
      this.checkLimits(characters, chunks.length, old);
      const warnings = JSON.parse(old.warnings_json) as string[];
      if (old.page_count && !warnings.includes('正文已手动修订，原文页码不再适用。')) warnings.push('正文已手动修订，原文页码不再适用。');
      this.db.prepare('UPDATE rag_documents SET pages_json=?,char_count=?,chunk_count=?,page_count=0,warnings_json=?,status=?,version=?,updated_at=? WHERE id=?').run(JSON.stringify(pages), characters, chunks.length, JSON.stringify(warnings), old.status === 'archived' ? 'archived' : 'draft', version, version, id);
      this.replaceChunks({id, title: old.title}, chunks);
      return publicDocument(this.row(id)!);
    });
  }
  reindex(id: string, expectedVersion: string): KnowledgeDocument {
    return this.transaction(() => {
      const old = this.editable(id, expectedVersion), pages = normalizePages(JSON.parse(old.pages_json) as KnowledgePage[]);
      const chunks = splitKnowledgePages(id, pages), version = nextVersion(old.version);
      this.checkLimits(old.char_count, chunks.length, old);
      this.replaceChunks({id, title: old.title}, chunks);
      this.db.prepare('UPDATE rag_documents SET chunk_count=?,version=?,updated_at=? WHERE id=?').run(chunks.length, version, version, id);
      return publicDocument(this.row(id)!);
    });
  }
  /** Legacy edits update only their own managed documents; normal uploaded files are never removed. */
  syncEntries(entries: KnowledgeEntry[]): void {
    this.transaction(() => {
      const entryIds = new Set(entries.map(entry => entry.id));
      if (entryIds.size !== entries.length) throw new RagValidationError('知识条目编号重复。');
      for (const row of this.db.prepare('SELECT id,legacy_id FROM rag_documents WHERE legacy_id IS NOT NULL').all()) {
        if (!entryIds.has(row.legacy_id as string)) {
          this.db.prepare('DELETE FROM rag_embeddings WHERE chunk_id IN (SELECT id FROM rag_chunks WHERE document_id=?)').run(row.id);
          this.db.prepare('DELETE FROM rag_chunks WHERE document_id=?').run(row.id);
          this.db.prepare('DELETE FROM rag_documents WHERE id=?').run(row.id);
        }
      }
      for (const entry of entries) {
        if (!entry.title.trim() || entry.title.length > 160 || entry.source.length > 1000) throw new RagValidationError('标题不能为空且最多 160 字，来源最多 1000 字。');
        const legacyHash = hashText(JSON.stringify([entry.title, entry.content, entry.source, entry.verified]));
        const old = this.db.prepare('SELECT * FROM rag_documents WHERE legacy_id=?').get(entry.id) as unknown as DocumentRow | undefined;
        // A RAG-editor revision survives a restart: only genuinely changed legacy input is reapplied.
        if (old?.legacy_hash === legacyHash) continue;
        const pages = normalizePages([{text: entry.content}]), id = old?.id ?? `legacy_${hashText(entry.id).slice(0, 24)}`;
        const chunks = splitKnowledgePages(id, pages), characters = pages[0].text.length, version = nextVersion(old?.version);
        this.checkLimits(characters, chunks.length, old);
        const status = entry.verified ? 'published' : 'draft';
        if (old) this.db.prepare('UPDATE rag_documents SET title=?,source=?,status=?,version=?,updated_at=?,chunk_count=?,char_count=?,page_count=0,pages_json=?,legacy_hash=? WHERE id=?').run(entry.title, entry.source, status, version, version, chunks.length, characters, JSON.stringify(pages), legacyHash, id);
        else this.db.prepare('INSERT INTO rag_documents(id,title,filename,format,source,status,version,created_at,updated_at,chunk_count,char_count,page_count,warnings_json,source_hash,pages_json,legacy_id,legacy_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, entry.title, '', 'entry', entry.source, status, version, version, version, chunks.length, characters, 0, '[]', hashText(`legacy:${entry.id}`), JSON.stringify(pages), entry.id, legacyHash);
        this.replaceChunks({id, title: entry.title}, chunks);
      }
    });
  }
  search(query: string, options: SearchOptions = {}): KnowledgeSearchResult {
    const started = performance.now(), plan = planQuery(query), limit = Math.max(1, Math.min(options.limit ?? 5, 12));
    const result: KnowledgeSearchResult = {query, hits: [], mode: 'lexical', elapsedMs: 0};
    if (plan.match) {
      const rows = this.db.prepare(`SELECT c.*,d.title,d.source,d.version,bm25(rag_chunks_fts,1,3) AS rank
        FROM rag_chunks_fts JOIN rag_chunks c ON c.rowid=rag_chunks_fts.rowid JOIN rag_documents d ON d.id=c.document_id
        WHERE rag_chunks_fts MATCH ? AND d.status IN (${options.includeDraft ? "'published','draft'" : "'published'"}) ${options.documentId ? 'AND d.id=?' : ''}
        ORDER BY rank ASC LIMIT 120`).all(...(options.documentId ? [plan.match, options.documentId] : [plan.match])) as unknown as (ChunkRow & {title: string; source: string; version: string; rank: number})[];
      const hits = rows.map((row, index): KnowledgeHit => {
        const hit = {...publicChunk(row), title: row.title, source: row.source, documentVersion: row.version, score: 0};
        hit.score = lexicalRelevance(plan, hit, index);
        return hit;
      }).filter(hit => hit.score >= 0.2).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
      result.hits = diversify(hits, limit);
    }
    result.elapsedMs = Math.round((performance.now() - started) * 100) / 100;
    return result;
  }
  /** Bounded candidate corpus for optional embedding retrieval; draft access must be explicit. */
  embeddingCandidates(options: SearchOptions = {}, maximum = 1200): KnowledgeHit[] {
    return (this.db.prepare(`SELECT c.*,d.title,d.source,d.version FROM rag_chunks c JOIN rag_documents d ON d.id=c.document_id
      WHERE d.status IN (${options.includeDraft ? "'published','draft'" : "'published'"}) ${options.documentId ? 'AND d.id=?' : ''}
      ORDER BY d.updated_at DESC,c.ordinal LIMIT ?`).all(...(options.documentId ? [options.documentId, Math.max(1, Math.min(maximum, 8000))] : [Math.max(1, Math.min(maximum, 8000))])) as unknown as (ChunkRow & {title: string; source: string; version: string})[]).map(row => ({...publicChunk(row), title: row.title, source: row.source, documentVersion: row.version, score: 0}));
  }
  /** Recheck permissions and content after every asynchronous provider call. */
  isCurrentHit(hit: KnowledgeHit, includeDraft = false): boolean {
    const row = this.db.prepare('SELECT d.status,d.version FROM rag_chunks c JOIN rag_documents d ON d.id=c.document_id WHERE c.id=? AND c.document_id=?').get(hit.id, hit.documentId);
    return Boolean(row && row.version === hit.documentVersion && (row.status === 'published' || (includeDraft && row.status === 'draft')));
  }
  currentHits(hits: KnowledgeHit[], options: SearchOptions = {}): KnowledgeHit[] {
    const read = this.db.prepare('SELECT d.status,d.version,c.text FROM rag_chunks c JOIN rag_documents d ON d.id=c.document_id WHERE c.id=?');
    return hits.filter(hit => {
      const row = read.get(hit.id);
      return row && row.version === hit.documentVersion && row.text === hit.text && (row.status === 'published' || (options.includeDraft === true && row.status === 'draft')) && (!options.documentId || options.documentId === hit.documentId);
    });
  }
}
