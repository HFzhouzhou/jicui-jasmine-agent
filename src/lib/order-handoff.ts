import type { OfficialOrderDraft, OfficialOrderHandoffResponse } from '@shared/contracts';
import { apiRequest, RequestError } from '@/lib/api';

const OFFICIAL_LINK_HOSTS = new Set(['wxaurl.cn', 'wxmpurl.cn', 'mp.weixin.qq.com']);

/** Only server-issued WeChat HTTPS links may leave this application. */
export function isOfficialOrderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      && !url.port && OFFICIAL_LINK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export async function requestOfficialOrder(draft: OfficialOrderDraft): Promise<OfficialOrderHandoffResponse> {
  const result = await apiRequest<OfficialOrderHandoffResponse>('/api/order-handoff', {
    method: 'POST', body: JSON.stringify(draft),
  }, 15000);
  if (result.status === 'unavailable' && typeof result.message === 'string') return result;
  if (result.status === 'ready' && typeof result.url === 'string' && isOfficialOrderUrl(result.url)) return result;
  throw new RequestError('暂时无法打开官方下单，请稍后再试。', 'INVALID_HANDOFF');
}

export function formatConfiguredOrder(draft: OfficialOrderDraft): string {
  return [
    '极萃东方茉莉 · 我的选茶配置',
    `饮品：${draft.drinkName} × ${draft.quantity}`,
    ...(draft.storeName ? [`门店：${draft.storeName}`] : []),
    `杯型：${draft.options.volume}`,
    `甜度偏好：${draft.options.sweetness}`,
    `冰量 / 温度偏好：${draft.options.temperature}`,
    `小料：${draft.options.toppings}`,
    ...(draft.note ? [`备注：${draft.note}`] : []),
    '最终规格与价格以门店为准，当前尚未提交订单。',
  ].join('\n');
}
