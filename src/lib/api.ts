import type { ApiError, HealthResponse, RecommendRequest, RecommendResponse, TeaCard } from '@shared/contracts';

export class RequestError extends Error {
  constructor(message: string, public code = 'REQUEST_FAILED', public requestId?: string) {
    super(message);
    this.name = 'RequestError';
  }
}

/** Same-origin requests: provider credentials only exist on the server. */
export async function apiRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 65000): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  if (init.signal?.aborted) controller.abort();
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(path, {
      ...init,
      headers: (() => {
        const headers = new Headers(init.headers);
        if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        return headers;
      })(),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = (payload as ApiError | null)?.error;
      throw new RequestError(error?.message || `服务暂时无法响应（${response.status}）`, error?.code, error?.requestId);
    }
    if (!payload || typeof payload !== 'object') throw new RequestError('服务返回了无法识别的内容，请检查服务器连接。', 'INVALID_RESPONSE');
    return payload as T;
  } catch (error) {
    if (timedOut) throw new RequestError('等待超时，请稍后重试。', 'TIMEOUT');
    if (controller.signal.aborted) throw new RequestError('本次请求已取消。', 'CANCELLED');
    if (error instanceof RequestError) throw error;
    throw new RequestError('暂时无法连接服务，请检查网络或服务器是否启动。', 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abort);
  }
}

export function isTeaCard(value: unknown): value is TeaCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Record<string, unknown>;
  return ['drinkId', 'drinkName', 'drinkNameEn', 'volume', 'sweetness', 'temperature', 'toppings', 'reason', 'message', 'funFact', 'orderPhrase'].every((field) => typeof card[field] === 'string')
    && typeof card.price === 'number' && Number.isFinite(card.price) && card.price >= 0
    && typeof card.verified === 'boolean';
}

export const getHealth = (signal?: AbortSignal) => apiRequest<HealthResponse>('/api/health', { signal }, 10000);

export async function recommend(body: RecommendRequest, mode: 'live' | 'preview', signal?: AbortSignal) {
  const result = await apiRequest<RecommendResponse>(mode === 'preview' ? '/api/recommend/preview' : '/api/recommend', {
    method: 'POST', body: JSON.stringify(body), signal,
  }, 110000);
  if (typeof result.reply !== 'string' || !Array.isArray(result.cards) || !result.cards.every(isTeaCard) || !Array.isArray(result.notices) || !result.notices.every((notice) => typeof notice === 'string') || !['live', 'preview'].includes(result.mode) || typeof result.requestId !== 'string') {
    throw new RequestError('推荐结果格式异常，请重试。', 'INVALID_RESPONSE');
  }
  return result;
}
