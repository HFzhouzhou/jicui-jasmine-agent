import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { Store, StoreConflict } from './database.js';
import { loadConfig, type ServerConfig } from './config.js';
import { ApiFailure } from './errors.js';
import { recommend, requestSchema } from './recommend.js';
import type { KnowledgeEntry, OfficialOrderDraft, OfficialOrderHandoffResponse } from '../shared/contracts.js';

const textItem = z.string().trim().min(1).max(160);
const drinkPatch = z.object({
  expectedUpdatedAt: z.string().max(100).optional(),
  price: z.number().finite().min(0).max(10000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, '价格最多两位小数'),
  available: z.boolean(), verified: z.boolean(), ingredients: z.array(textItem).max(50),
  allergens: z.array(textItem).max(30).nullable(), caffeine: z.enum(['unknown', 'contains', 'none']),
  sweetnessOptions: z.array(textItem).max(15), temperatureOptions: z.array(textItem).max(15),
  toppings: z.array(z.object({name: textItem, price: z.number().finite().min(0).max(1000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8)}).strict()).max(30),
  source: z.string().trim().min(1).max(1000),
  catalogStatus: z.enum(['observed', 'managed', 'legacy']),
}).partial().strict().refine(value => Object.keys(value).some(key => key !== 'expectedUpdatedAt'), '至少更新一个字段');
const knowledgeSchema = z.object({expectedVersion: z.string().max(100).optional(), entries: z.array(z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(8000), source: z.string().trim().max(1000), verified: z.boolean(),
  updatedAt: z.string().max(50).optional(),
}).strict().refine(entry => !entry.verified || Boolean(entry.source), '核准知识必须填写来源')).max(100)}).strict().refine(value => new Set(value.entries.map(entry => entry.id)).size === value.entries.length, '知识ID不能重复');
const feedbackSchema = z.object({requestId: z.string().uuid(), rating: z.enum(['up', 'down']), comment: z.string().trim().max(1000).optional()}).strict();
const orderOption = z.string().trim().min(1).max(80);
const orderDraftSchema: z.ZodType<OfficialOrderDraft> = z.object({
  drinkId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  drinkName: textItem,
  quantity: z.number().int().min(1).max(20),
  storeName: textItem.optional(),
  options: z.object({
    volume: orderOption, sweetness: orderOption, temperature: orderOption,
    toppings: z.string().trim().min(1).max(300),
  }).strict(),
  note: z.string().trim().max(500).optional(),
}).strict();

export interface AppOptions {
  config?: Partial<ServerConfig>;
  databasePath?: string;
  fetcher?: typeof fetch;
}
/** Each app owns its database; call app.locals.close() after integration tests. */
export function createApp(options: AppOptions = {}) {
  const config = {...loadConfig(), ...options.config};
  const store = new Store(options.databasePath || join(config.dataDir, 'jasmine.sqlite'));
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.locals.store = store;
  app.locals.close = () => store.close();
  app.use((_req, res, next) => { res.set({'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY'}); next(); });
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({limit: '256kb', strict: true}));
  const requests = new Map<string, {expiresAt: number; count: number}>();
  const limiter = (limit: number, scope: string) => (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (requests.size > 5000) for (const [key, value] of requests) if (value.expiresAt < now) requests.delete(key);
    const key = `${scope}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const current = requests.get(key);
    if (!current || current.expiresAt <= now) {
      if (requests.size >= 10000 && !current) return next(new ApiFailure(429, 'RATE_LIMITED', '服务较忙，请稍后再试。'));
      requests.set(key, {count: 1, expiresAt: now + 60000}); return next();
    }
    current.count++;
    if (current.count > limit) { res.set('Retry-After', String(Math.ceil((current.expiresAt - now) / 1000))); return next(new ApiFailure(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试。')); }
    next();
  };
  app.get('/api/health', (_req, res) => res.json({status: 'ok', aiConfigured: Boolean(config.apiKey), provider: 'DeepSeek', menuCount: store.drinks().length}));
  app.use('/api', limiter(180, 'api'));
  app.get('/api/menu', (_req, res) => res.json({drinks: store.drinks()}));
  app.get('/api/knowledge', (_req, res) => res.json({entries: store.knowledge(true)}));
  let inFlight = 0;
  const recommendations = (mode: 'live' | 'preview') => async (req: Request, res: Response) => {
    const input = requestSchema.parse(req.body);
    if (inFlight >= 8) throw new ApiFailure(429, 'SERVICE_BUSY', '当前咨询较多，请稍后再试。');
    inFlight++;
    const controller = new AbortController();
    const disconnected = () => {if (!res.writableEnded) controller.abort();};
    res.once('close', disconnected);
    try { res.json(await recommend(input, mode, store, config, options.fetcher || fetch, controller.signal)); }
    finally { inFlight--; res.off('close', disconnected); }
  };
  app.post('/api/recommend', limiter(config.rateLimit, 'recommend'), recommendations('live'));
  app.post('/api/recommend/preview', limiter(config.rateLimit, 'recommend'), recommendations('preview'));
  app.post('/api/order-handoff', limiter(30, 'order-handoff'), (req, res) => {
    const input = orderDraftSchema.parse(req.body);
    const drink = store.drink(input.drinkId);
    if (!drink) throw new ApiFailure(404, 'DRINK_NOT_FOUND', '找不到这个商品，请重新选择。');
    if (!drink.available || !['observed', 'managed'].includes(drink.catalogStatus || '')) {
      throw new ApiFailure(409, 'DRINK_UNAVAILABLE', '这个商品当前无法选购，请重新选择。');
    }
    // This boundary is intentionally read-only until an official SKU/store adapter exists.
    // Client names and options express preferences, never validated availability or prices.
    const result: OfficialOrderHandoffResponse = {
      status: 'unavailable',
      message: '官方小程序下单暂未开通，这份配置尚未提交。你可以先保存或复制配置。',
    };
    res.json(result);
  });
  app.post('/api/feedback', limiter(30, 'feedback'), (req, res) => {
    const input = feedbackSchema.parse(req.body);
    if (!store.feedback(input.requestId, input.rating, input.comment || '')) throw new ApiFailure(404, 'REQUEST_NOT_FOUND', '找不到这次推荐记录。');
    res.status(201).json({ok: true});
  });
  app.use('/api/admin', limiter(30, 'admin'), (req, _res, next) => {
    if (!config.adminToken) return next(new ApiFailure(503, 'ADMIN_DISABLED', '管理功能尚未配置，请设置服务端 ADMIN_TOKEN。'));
    const header = req.get('Authorization') || '';
    const actual = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
    const expected = Buffer.from(config.adminToken);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return next(new ApiFailure(401, 'UNAUTHORIZED', '管理凭证不正确。'));
    next();
  });
  app.get('/api/admin/menu', (_req, res) => res.json({drinks: store.drinks()}));
  app.patch('/api/admin/menu/:id', (req, res) => {
    const {expectedUpdatedAt, ...input} = drinkPatch.parse(req.body);
    const existing = store.drink(String(req.params.id));
    if (input.catalogStatus === 'observed' && !existing?.catalogEvidence) throw new ApiFailure(400, 'CATALOG_EVIDENCE_REQUIRED', '没有小程序核对记录的商品，请选择管理员维护目录。');
    if (existing && (input.verified ?? existing.verified) && /待核实|待品牌核实|待确认|未知/.test(input.source ?? existing.source)) throw new ApiFailure(400, 'SOURCE_UNVERIFIED', '标记核准前，请填写实际核实来源，不能沿用待核实标记。');
    const drink = store.updateDrink(String(req.params.id), input, expectedUpdatedAt);
    if (!drink) throw new ApiFailure(404, 'DRINK_NOT_FOUND', '找不到这个商品。');
    res.json({drink});
  });
  app.get('/api/admin/knowledge', (_req, res) => res.json({entries: store.knowledge(), version: store.knowledgeVersion()}));
  app.put('/api/admin/knowledge', (req, res) => {
    const input = knowledgeSchema.parse(req.body);
    const entries = store.setKnowledge(input.entries.map(entry => ({...entry, updatedAt: ''})) as KnowledgeEntry[], input.expectedVersion);
    res.json({entries, version: store.knowledgeVersion()});
  });
  app.use('/api', (_req, _res, next) => next(new ApiFailure(404, 'NOT_FOUND', '接口不存在。')));
  if (existsSync(join(config.staticDir, 'index.html'))) {
    app.use(express.static(config.staticDir, {index: false, maxAge: 0}));
    app.get(/.*/, (req, res, next) => {
      let path: string;
      try {path = decodeURIComponent(req.path);} catch {return next();}
      if (path.split('/').some(segment => segment.startsWith('.')) || path === '/assets' || path.startsWith('/assets/') || extname(path) || !req.get('Accept')?.includes('text/html')) return next();
      res.sendFile(join(config.staticDir, 'index.html'));
    });
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return _next(error);
    if (error instanceof StoreConflict) return res.status(409).json({error: {code: 'STALE_WRITE', message: '资料已被其他操作更新，请重新载入最新版本后再保存。'}});
    if (error instanceof ApiFailure) return res.status(error.status).json({error: {code: error.code, message: error.message}});
    if (error instanceof z.ZodError) return res.status(400).json({error: {code: 'INVALID_INPUT', message: '请求格式或字段不正确，请检查输入。'}});
    const bodyError = error as {status?: number; type?: string};
    if (bodyError?.status === 413) return res.status(413).json({error: {code: 'BODY_TOO_LARGE', message: '请求内容过长。'}});
    if (bodyError?.type === 'entity.parse.failed') return res.status(400).json({error: {code: 'INVALID_JSON', message: '请求必须是有效 JSON。'}});
    // Do not log prompt text, bearer tokens or raw provider errors.
    console.error('API request failed');
    return res.status(500).json({error: {code: 'INTERNAL_ERROR', message: '服务暂时异常，请稍后再试。'}});
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const config = loadConfig();
  const app = createApp({config});
  const server = app.listen(config.port, config.host, () => console.log(`Jasmine Agent ready at http://${config.host}:${config.port} · DeepSeek ${config.apiKey ? 'configured' : 'not configured'}`));
  const shutdown = () => { server.close(() => { app.locals.close(); process.exit(0); }); setTimeout(() => process.exit(1), 5000).unref(); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
