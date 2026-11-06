import { resolve } from 'node:path';
import { isIP } from 'node:net';

export interface ServerConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  adminToken: string;
  dataDir: string;
  port: number;
  host: string;
  staticDir: string;
  rateLimit: number;
  trustProxy: false | number | string;
  embedding?: {baseUrl: string; apiKey: string; model: string; timeoutMs: number};
  /** Guardrails for the store pickup queue. The app never takes payment. */
  orders: {maxAmount: number; dailyLimit: number; maxCups: number; quoteTtlMs: number};
  /** Web origins of the native app shells (Capacitor) allowed to call the API cross-origin. */
  appOrigins: string[];
  /** Optional update notice for native app builds. */
  appRelease: {latest: string | null; minimum: string | null; downloadUrl: string | null};
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = env[key] ? Number(env[key]) : fallback;
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${key} 配置不正确`);
    return value;
  };
  const baseUrl = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const url = new URL(baseUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('DEEPSEEK_BASE_URL 配置不正确');
  const apiKey = env.DEEPSEEK_API_KEY?.trim() || '';
  if (apiKey && url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('远程模型地址必须使用 HTTPS');
  const proxy = env.TRUST_PROXY?.trim() || '';
  let trustProxy: false | number | string = false;
  if (proxy && proxy !== 'false') {
    if (/^[1-9]$|^10$/.test(proxy)) trustProxy = Number(proxy);
    else {
      const valid = proxy.split(',').map(value => value.trim()).every(value => {
        if (value === 'loopback') return true;
        const [address, mask, extra] = value.split('/'); const family = isIP(address);
        return Boolean(family) && extra === undefined && (mask === undefined || (/^\d+$/.test(mask) && Number(mask) > 0 && Number(mask) <= (family === 4 ? 32 : 128)));
      });
      if (!valid) throw new Error('TRUST_PROXY 仅接受 loopback、1–10 跳或明确可信 IP/CIDR；不能信任所有来源');
      trustProxy = proxy;
    }
  }
  const adminToken = env.ADMIN_TOKEN?.trim() || '';
  if (adminToken && adminToken.length < 24) throw new Error('ADMIN_TOKEN 至少需要 24 个字符');
  let embedding: ServerConfig['embedding'];
  const embeddingBase = env.RAG_EMBEDDING_BASE_URL?.trim();
  const embeddingModel = env.RAG_EMBEDDING_MODEL?.trim();
  if (embeddingBase || embeddingModel || env.RAG_EMBEDDING_API_KEY?.trim()) {
    if (!embeddingBase || !embeddingModel) throw new Error('向量检索需要同时设置 RAG_EMBEDDING_BASE_URL 和 RAG_EMBEDDING_MODEL');
    const endpoint = new URL(embeddingBase);
    if (!['https:', 'http:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) throw new Error('RAG_EMBEDDING_BASE_URL 必须为 HTTPS 或本地模型地址');
    embedding = {baseUrl: embeddingBase.replace(/\/+$/, ''), model: embeddingModel, apiKey: env.RAG_EMBEDDING_API_KEY?.trim() || '', timeoutMs: number('RAG_EMBEDDING_TIMEOUT_MS', 8000, 100, 15000)};
  }
  // Capacitor serves the bundled web app from https://localhost (Android) and capacitor://localhost (iOS).
  const appOrigins = (env.APP_ORIGINS ?? 'https://localhost,capacitor://localhost').split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of appOrigins) if (origin === '*' || !/^[a-z][a-z0-9+.-]*:\/\/[^/\s]+$/i.test(origin)) throw new Error(`APP_ORIGINS 中的来源无效：${origin}`);
  const version = (key: string) => {
    const value = env[key]?.trim();
    if (value && !/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`${key} 必须是形如 1.2.3 的版本号`);
    return value || null;
  };
  const downloadUrl = env.APP_DOWNLOAD_URL?.trim() || null;
  if (downloadUrl && !/^https:\/\//.test(downloadUrl)) throw new Error('APP_DOWNLOAD_URL 必须是 HTTPS 地址');
  const appRelease = {latest: version('APP_LATEST_VERSION'), minimum: version('APP_MIN_VERSION'), downloadUrl};
  return { apiKey, baseUrl, model: env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash', timeoutMs: number('AI_TIMEOUT_MS', 30000, 100, 120000), adminToken, dataDir: resolve(env.DATA_DIR || 'data'), port: number('PORT', 3001, 0, 65535), host: env.HOST || '127.0.0.1', staticDir: resolve('dist/client'), rateLimit: 20, trustProxy, orders: {maxAmount: number('ORDER_MAX_AMOUNT', 300, 1, 100000), dailyLimit: number('ORDER_DAILY_LIMIT', 10, 1, 1000), maxCups: number('ORDER_MAX_CUPS', 20, 1, 200), quoteTtlMs: 10 * 60_000}, appOrigins, appRelease, ...(embedding ? {embedding} : {}) };
}
