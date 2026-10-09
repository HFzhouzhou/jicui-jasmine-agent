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
  return { apiKey, baseUrl, model: env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash', timeoutMs: number('AI_TIMEOUT_MS', 30000, 100, 120000), adminToken, dataDir: resolve(env.DATA_DIR || 'data'), port: number('PORT', 3001, 0, 65535), host: env.HOST || '127.0.0.1', staticDir: resolve('dist/client'), rateLimit: 20, trustProxy };
}
