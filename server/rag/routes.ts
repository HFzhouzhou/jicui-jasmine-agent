import { Router, json } from 'express';
import multer from 'multer';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Store } from '../database.js';
import type { ServerConfig } from '../config.js';
import { ApiFailure } from '../errors.js';
import { MAX_FILE_BYTES, parseDocument, parserCapabilities } from './parser.js';
import { retrieveKnowledge } from './embeddings.js';

const version = z.string().min(1).max(100);
const title = z.string().trim().min(1).max(160);
const source = z.string().trim().max(1000);
const content = z.string().trim().min(1).max(500_000);
const editSchema = z.object({title: title.optional(), source: source.optional(), status: z.enum(['draft', 'published', 'archived']).optional(), expectedVersion: version}).strict().refine(value => Object.keys(value).length > 1);
const searchSchema = z.object({query: z.string().trim().min(1).max(1000), includeDraft: z.boolean().default(false), documentId: z.string().min(1).max(100).optional(), limit: z.number().int().min(1).max(12).default(6)}).strict();
const ORIGINALS_LIMIT = 200 * 1024 * 1024;
const hash = (buffer: Buffer | string) => createHash('sha256').update(buffer).digest('hex');

function uploadName(name: string) {
  // Multipart filenames may be decoded as latin1; keep genuine Unicode unchanged.
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  const value = [...name].every(char => char.codePointAt(0)! <= 255) && !decoded.includes('\ufffd') ? decoded : name;
  return [...value.replaceAll('\\', '/').split('/').at(-1)!].filter(char => char.codePointAt(0)! >= 32 && char.codePointAt(0) !== 127).join('').slice(0, 240) || 'document';
}

/** Mounted only after the existing administrator authentication boundary. */
export function createRagRouter(store: Store, config: ServerConfig, fetcher: typeof fetch, activeParsers: Set<AbortController>) {
  const router = Router();
  router.use(json({limit: '2mb', strict: true}));
  store.db.exec('CREATE TABLE IF NOT EXISTS rag_originals (document_id TEXT PRIMARY KEY, filename TEXT NOT NULL, bytes INTEGER NOT NULL, data BLOB NOT NULL)');
  const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: MAX_FILE_BYTES, files: 1, fields: 2, fieldSize: 4000, parts: 3}}).single('file');
  let importing = false;
  router.get('/', async (_req, res) => res.json({documents: store.rag.listDocuments(), stats: store.rag.stats(), capabilities: {...await parserCapabilities(), embeddingsConfigured: Boolean(config.embedding), maxFileBytes: MAX_FILE_BYTES}}));
  router.post('/documents', (req, res, next) => {
    if (importing) return next(new ApiFailure(429, 'IMPORT_BUSY', '已有文档正在解析，请稍后重试。'));
    importing = true;
    const done = () => {importing = false; res.off('finish', done); res.off('close', done);};
    res.once('finish', done); res.once('close', done);
    upload(req, res, next);
  }, async (req, res) => {
    if (!req.file) throw new ApiFailure(400, 'FILE_REQUIRED', '请选择需要导入的文件。');
    const metadata = z.object({title: title.optional(), source: source.optional()}).strict().parse(req.body);
    const filename = uploadName(req.file.originalname);
    const digest = hash(req.file.buffer);
    const duplicate = store.rag.listDocuments().find(document => document.hash === digest);
    if (duplicate) {res.json({document: duplicate, duplicate: true}); return;}
    const used = (store.db.prepare('SELECT COALESCE(SUM(bytes),0) AS bytes FROM rag_originals').get() as {bytes: number}).bytes;
    if (used + req.file.size > ORIGINALS_LIMIT) throw new ApiFailure(413, 'KNOWLEDGE_STORAGE_FULL', '原始文件总量已达到 200 MB，请由管理员备份整理后继续导入。');
    const controller = new AbortController();
    const disconnect = () => {if (!res.writableEnded) controller.abort();};
    res.once('close', disconnect); activeParsers.add(controller);
    try {
      const parsed = await parseDocument(req.file.buffer, filename, controller.signal);
      if (controller.signal.aborted) throw new ApiFailure(499, 'REQUEST_CANCELLED', '导入已取消。');
      store.db.exec('BEGIN IMMEDIATE');
      try {
        const result = store.rag.ingest({title: metadata.title || filename.replace(/\.[^.]+$/, '').slice(0, 160), filename, format: parsed.format, source: metadata.source || filename, hash: digest, pages: parsed.pages, warnings: parsed.warnings});
        if (!result.duplicate) store.db.prepare('INSERT INTO rag_originals(document_id,filename,bytes,data) VALUES (?,?,?,?)').run(result.document.id, filename, req.file.size, req.file.buffer);
        store.db.exec('COMMIT');
        res.status(result.duplicate ? 200 : 201).json(result);
      } catch (error) {store.db.exec('ROLLBACK'); throw error;}
    } finally {res.off('close', disconnect); activeParsers.delete(controller);}
  });
  router.post('/text', (req, res) => {
    const input = z.object({title, source, content}).strict().parse(req.body);
    const result = store.rag.ingest({title: input.title, source: input.source, filename: '', format: 'manual', hash: hash(`manual\0${input.title}\0${input.content}`), pages: [{text: input.content}], warnings: []});
    res.status(result.duplicate ? 200 : 201).json(result);
  });
  router.post('/search', async (req, res) => {
    const {query, ...options} = searchSchema.parse(req.body);
    const controller = new AbortController();
    const disconnect = () => {if (!res.writableEnded) controller.abort();};
    res.once('close', disconnect);
    try {res.json(await retrieveKnowledge(store.rag, query, {...options, embedding: config.embedding, fetcher, signal: controller.signal}));}
    finally {res.off('close', disconnect);}
  });
  router.get('/documents/:id', (req, res) => {
    const result = store.rag.getDocument(String(req.params.id));
    if (!result) throw new ApiFailure(404, 'DOCUMENT_NOT_FOUND', '找不到这份资料。');
    res.json(result);
  });
  router.get('/documents/:id/file', (req, res) => {
    const row = store.db.prepare('SELECT filename,data FROM rag_originals WHERE document_id=?').get(String(req.params.id));
    if (!row) throw new ApiFailure(404, 'ORIGINAL_NOT_FOUND', '这份资料没有可下载的原始文件。');
    res.set({'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(row.filename as string).replace(/['()*]/g, value => `%${value.charCodeAt(0).toString(16)}`)}`, 'Content-Security-Policy': "sandbox; default-src 'none'"});
    res.send(Buffer.from(row.data as Uint8Array));
  });
  router.patch('/documents/:id', (req, res) => {
    const {expectedVersion, ...patch} = editSchema.parse(req.body);
    res.json({document: store.rag.updateDocument(String(req.params.id), patch, expectedVersion)});
  });
  router.put('/documents/:id/content', (req, res) => {
    const input = z.object({content, expectedVersion: version}).strict().parse(req.body);
    res.json({document: store.rag.updateContent(String(req.params.id), input.content, input.expectedVersion)});
  });
  router.post('/documents/:id/reindex', (req, res) => {
    const input = z.object({expectedVersion: version}).strict().parse(req.body);
    res.json({document: store.rag.reindex(String(req.params.id), input.expectedVersion)});
  });
  return router;
}
