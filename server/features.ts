import { randomInt, randomUUID } from 'node:crypto';
import type { BlindBoxResult, BundleProposal, Drink, Order, OrderItemInput, Preferences, RecommendAction, RecommendRequest, RecommendResponse, TasteMemory, TeaCard } from '../shared/contracts.js';
import type { ServerConfig } from './config.js';
import type { Store } from './database.js';
import { STATUS_TEXT, bestPromotion } from './commerce.js';
import { answerKnowledge } from './rag/answer.js';
import { budgetDirective, card, eligible, namedDrinks, normalizeIngredient, parseCount, parseLocalIntent, TOPPING_WORDS, type Intent } from './recommend.js';

export type FeatureKind = 'order_status' | 'after_sales' | 'bundle' | 'blindbox' | 'repeat' | 'memory_set' | 'memory_clear' | 'memory_view' | 'ingredient';
export interface FeatureContext {input: RecommendRequest; mode: 'live' | 'preview'; store: Store; config: ServerConfig; fetcher: typeof fetch; signal?: AbortSignal; customerId?: string}
type FeatureReply = Omit<RecommendResponse, 'mode' | 'requestId'>;

const PEOPLE = /(\d|[两二三四])\s*(?:个人|个|位|人)(?:喝|一起|分|的话)?|我们(\d|[两二三四])(?:个|位)/;
export const MOODS = [
  {key: '刚刚苏醒', pattern: /苏醒|刚醒|睡醒|好困|犯困|困了|没睡醒/, categories: ['原叶纯茶', '柠檬系列'], taste: '清爽茶香', blessings: ['早安，先让一缕茉莉香把今天轻轻叫醒。', '慢慢醒来也没关系，这杯陪你进入状态。']},
  {key: '有点丧', pattern: /丧|难过|低落|不开心|心情不好|烦|累了|好累/, categories: ['茉莉茶酪', '招牌鲜奶茶'], taste: '醇厚温柔', blessings: ['今天辛苦了，允许自己慢一点，好好喝完这一杯。', '不开心的时候，就交给一杯柔软的茶来接住你。']},
  {key: '奖励自己', pattern: /奖励|犒劳|开心|庆祝|值得|好事/, categories: ['招牌鲜奶茶', '茉莉抹茶', '茉莉鲜果'], taste: '招牌颜值', blessings: ['你值得这一杯，为今天的自己举杯。', '小小的奖励，也是认真生活的证明。']},
  {key: '需要专注', pattern: /专注|加班|学习|赶工|续命|开会|干活/, categories: ['原叶纯茶', '现磨咖啡'], taste: '干净利落', blessings: ['把杂念放一放，这一杯陪你把事情一件件做完。', '专注的时间里，也记得抬头喝口茶。']},
  {key: '想要清爽', pattern: /燥|热死|好热|清爽|解腻|油腻|吃撑/, categories: ['柠檬系列', '原叶纯茶'], taste: '清爽解腻', blessings: ['让清清爽爽的一口，把闷热都散开。', '轻一点、凉一点，心情也跟着透亮起来。']},
  {key: '分享时刻', pattern: /约会|分享|拍照|朋友|闺蜜|聚会/, categories: ['招牌鲜奶茶', '茉莉鲜果', '茉莉抹茶'], taste: '颜值分享', blessings: ['好茶要和喜欢的人一起分享。', '这一杯，适合配上今天的好时光。']},
  {key: '随便来一杯', pattern: /随便|都行|无所谓|不知道/, categories: [], taste: '交给缘分', blessings: ['不必纠结，今天就让茉莉替你做一次决定。', '缘分抽中的这杯，也许就是今天的答案。']},
] as const;
const TASTES: {label: string; pattern: RegExp; categories: string[]; words: RegExp}[] = [
  {label: '清爽', pattern: /清爽|解腻|清新|爽口|清淡|不腻/, categories: ['原叶纯茶', '柠檬系列'], words: /柠|冷萃|纯茶|毛峰|龙井/},
  {label: '浓郁', pattern: /浓郁|醇厚|浓一点|厚重|奶香|奶茶|奶味/, categories: ['茉莉茶酪', '招牌鲜奶茶'], words: /酪|奶|拿铁/},
  {label: '果香', pattern: /果香|水果|果茶|酸甜|果味/, categories: ['茉莉鲜果', '柠檬系列'], words: /芒|果|柠|椰/},
  {label: '茶香', pattern: /茶香|纯茶|原叶|茶味/, categories: ['原叶纯茶'], words: /龙井|毛峰|六堡/},
  {label: '咖啡', pattern: /咖啡|拿铁|美式/, categories: ['现磨咖啡'], words: /拿铁|美式|咖啡/},
];

export function detectFeature(input: RecommendRequest, drinks: Drink[] = []): FeatureKind | null {
  const action = input.action;
  if (action) return action.type === 'orders' ? 'order_status' : action.type;
  const text = input.message.replace(/\s+/g, '');
  if (/(?:忘(?:掉|记)|清除|删除|清空)(?:我的)?(?:口味|偏好|习惯|记忆)/.test(text)) return 'memory_clear';
  if (/^(?:你)?(?:还)?记得我(?:的)?(?:口味|习惯|偏好)?[吗吧呢？?]*$|^(?:查看|看看)?我的(?:口味|偏好)(?:记忆)?[？?。]*$/.test(text)) return 'memory_view';
  if (/(?:我的)?订单(?:到哪|做到|状态|进度|好了|怎么样|呢)|查(?:一下)?(?:我的)?订单|做到哪|做好了(?:吗|没)|取餐号|还要多久|多久(?:能)?好|到哪(?:一步|了)/.test(text)) return 'order_status';
  if (/(?:刚才|刚刚|上一?杯|那杯|这杯|我的).{0,12}(?:太甜|太淡|太苦|太冰|不够冰|不好喝|难喝|做错|洒了|漏了|少了|有问题|不对)|(?:申请|要|帮我|我想)(?:退款|退钱|重做)|售后/.test(text) && !/(?:如何|怎么|怎样|政策|规则)(?:申请)?(?:退款|售后)/.test(text)) return 'after_sales';
  if (/老样子|照旧|和上次一样|跟上次一样|上次那杯|还是(?:那|上次)(?:杯|款)/.test(text)) return 'repeat';
  if (/记住|记一下|以后(?:都|默认|就)|默认(?:都|给我)?(?:要|是)?|我(?:一般|平时|习惯)(?:都)?(?:喝|要|点)/.test(text) && /糖|甜|冰|热|温|不要|不加|不碰|不喝|过敏|小料|珍珠|椰果|芋圆|预算|以内|喜欢|爱/.test(text)) return 'memory_set';
  if (PEOPLE.test(text) && /喝|配|杯|搭|选|推荐/.test(text) || /(?:帮|给)我们(?:配|选|搭|推荐)|套餐|(?:两|三|[23])杯不(?:同|一样)|(?:两|三|[23])杯.{0,8}(?:以内|以下|预算|块|元)|(?:以内|以下|块钱).{0,8}(?:两|三|[23])杯/.test(text)) return 'bundle';
  if (/盲盒|再抽一(?:次|杯|个)|不知道(?:喝|点)(?:什么|啥)|帮我(?:决定|做决定|随便选)|随便来(?:一)?杯|给我(?:个|一个)?惊喜/.test(text)) return 'blindbox';
  if (namedDrinks(text, drinks).length === 0 && /热量|卡路里|大卡|千卡|低卡|(?:哪(?:款|些|个|杯)|有没有|有什么|推荐|能喝(?:什么|啥)|可以喝(?:什么|啥)).{0,10}(?:不含|无|没有|不加|低)(?:奶|乳|咖啡因|乳糖)|(?:咖啡因敏感|乳糖不耐|对(?:牛)?奶过敏|孕期|怀孕).{0,8}(?:喝什么|能喝|可以喝|推荐|哪)/.test(text)) return 'ingredient';
  return null;
}

/** Remembered defaults fill gaps; anything said in the current conversation still wins. */
export function profileWithMemory(profile: Preferences | undefined, memory: TasteMemory): Preferences | undefined {
  const merged: Preferences = {...profile};
  if (!merged.sweetness && memory.sweetness) merged.sweetness = memory.sweetness;
  if (!merged.temperature && memory.temperature) merged.temperature = memory.temperature;
  // Only hard restrictions filter the menu. Soft dislikes travel as a note for the store,
  // otherwise unverified recipes would make every remembered dislike return nothing.
  if (memory.allergies?.length) merged.dietary = [...new Set([...(merged.dietary || []), ...memory.allergies])];
  if (!merged.budget && memory.budget) merged.budget = `${memory.budget}元以内`;
  return Object.keys(merged).length ? merged : profile;
}
export function describeMemory(memory: TasteMemory): string[] {
  return [
    memory.sweetness && `甜度：${memory.sweetness}`, memory.temperature && `冰量 / 温度：${memory.temperature}`,
    memory.toppings?.length && `爱加：${memory.toppings.join('、')}`, memory.skipToppings?.length && `不加：${memory.skipToppings.join('、')}`,
    memory.allergies?.length && `严格避开：${memory.allergies.join('、')}`,
    memory.avoid?.length && `不太想要：${memory.avoid.join('、')}`, memory.likes?.length && `口味：${memory.likes.join('、')}`,
    memory.budget && `预算：¥${memory.budget} 以内`, memory.favorites?.length && `常点：${memory.favorites.slice(0, 3).map(item => item.drinkName).join('、')}`,
  ].filter((value): value is string => Boolean(value));
}

const storeDrinks = (store: Store) => store.drinks().filter(drink => ['observed', 'managed'].includes(drink.catalogStatus || ''));
function baseIntent(message: string, profile?: Preferences): Intent {
  const intent = parseLocalIntent({message, profile});
  return {...intent, intent: 'recommend', drinkIds: [], knowledgeIds: [], searchQuery: ''};
}
function proposalFor(cardData: TeaCard, intent: Intent, quantity = 1): OrderItemInput {
  return {drinkId: cardData.drinkId, quantity, ...(intent.sweetness ? {sweetness: intent.sweetness} : {}), ...(intent.temperature ? {temperature: intent.temperature} : {}), toppings: intent.toppings};
}
function shanghaiHour(now = new Date()) {return Number(new Intl.DateTimeFormat('en-US', {hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Shanghai'}).format(now));}
export function daypart(hour: number) {return hour < 5 ? '深夜' : hour < 10 ? '早晨' : hour < 14 ? '午间' : hour < 18 ? '下午' : hour < 22 ? '晚上' : '深夜';}

const UNSAFE_COPY = /治|疗|功效|减肥|瘦|降(?:糖|压|脂)|养生|药|排毒|助眠|提神|醒脑|健康|保健|孕|医/;
/** Short warm copy from the model in live mode. Any failure or risky wording uses the template. */
async function aiLine(ctx: FeatureContext, instruction: string, fallback: string): Promise<string> {
  if (ctx.mode !== 'live' || !ctx.config.apiKey) return fallback;
  const controller = new AbortController();
  const abort = () => controller.abort();
  ctx.signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(abort, Math.min(ctx.config.timeoutMs, 12000));
  try {
    const response = await ctx.fetcher(`${ctx.config.baseUrl}/chat/completions`, {method: 'POST', signal: controller.signal, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${ctx.config.apiKey}`},
      body: JSON.stringify({model: ctx.config.model, thinking: {type: 'disabled'}, temperature: 0.8, max_tokens: 200, response_format: {type: 'json_object'}, stream: false, messages: [
        {role: 'system', content: '你是茶饮店的文案助手，只输出 JSON：{"text":"..."}。一句中文，不超过 40 字，温暖自然。不能提及健康、功效、医疗、减肥、提神、咖啡因、配料或价格，不能使用表情符号。'},
        {role: 'user', content: instruction}]})});
    if (!response.ok) return fallback;
    const body = await response.text();
    if (body.length > 20_000) return fallback;
    const text = String((JSON.parse(JSON.parse(body).choices?.[0]?.message?.content || '{}') as {text?: unknown}).text || '').trim();
    return text && text.length <= 60 && !UNSAFE_COPY.test(text) ? text : fallback;
  } catch {return fallback;} finally {clearTimeout(timer); ctx.signal?.removeEventListener('abort', abort);}
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function memoryFromMessage(message: string, previous: TasteMemory): {memory: TasteMemory; learned: string[]} {
  const parsed = parseLocalIntent({message: message.replace(/不碰/g, '不要')});
  const memory: TasteMemory = {...previous};
  const learned: string[] = [];
  if (parsed.sweetness) {memory.sweetness = parsed.sweetness; learned.push(parsed.sweetness);}
  if (parsed.temperature) {memory.temperature = parsed.temperature; learned.push(parsed.temperature);}
  const liked = parsed.toppings.filter(name => !/尚未明确|暂不支持/.test(name));
  for (const match of message.matchAll(/(?:爱|喜欢|常)(?:加)?(珍珠|椰果|布丁|奶盖|芝士|红豆|芋圆|芋泥|仙草|西米)/g)) liked.push(match[1]);
  if (liked.length) {memory.toppings = [...new Set([...(memory.toppings || []), ...liked])]; learned.push(`爱加${[...new Set(liked)].join('、')}`);}
  if (parsed.avoidToppings.length) {memory.skipToppings = [...new Set([...(memory.skipToppings || []), ...parsed.avoidToppings])]; memory.toppings = memory.toppings?.filter(name => !parsed.avoidToppings.includes(name)); learned.push(`不加${parsed.avoidToppings.join('、')}`);}
  // Allergy / intolerance / caffeine wording is a hard restriction; "不要、不碰 X" is a dislike.
  const hard: string[] = parsed.caffeineFree ? ['咖啡因'] : [];
  const soft: string[] = [];
  for (const raw of parsed.avoidIngredients.filter(name => name !== '未明确的过敏原')) {
    const name = normalizeIngredient(raw);
    const token = escapeRegExp(raw.replace(/(过敏|不耐受?|不能|不要|不碰|不吃|不喝|不加|不含|避免|忌口)/g, '') || raw);
    const key = escapeRegExp(name);
    const strict = new RegExp(`(?:对|有)?[^，。！？,;]{0,4}(?:${token}|${key})[^，。！？,;]{0,4}(?:过敏|不耐)|(?:过敏|不耐)[^，。！？,;]{0,6}(?:${token}|${key})|(?:不能|不可以)(?:吃|喝|碰)?[^，。！？,;]{0,3}(?:${token}|${key})`).test(message);
    (strict ? hard : soft).push(name);
  }
  if (hard.length) {
    memory.allergies = [...new Set([...(memory.allergies || []), ...hard])];
    memory.avoid = memory.avoid?.filter(name => !hard.includes(name));
    learned.push(`严格避开${hard.join('、')}`);
  }
  // "不要珍珠" next to an allergy clause is still about an add-on, not an ingredient.
  const toppingDislikes = soft.filter(name => TOPPING_WORDS.includes(name) && !parsed.avoidToppings.includes(name));
  if (toppingDislikes.length) {memory.skipToppings = [...new Set([...(memory.skipToppings || []), ...toppingDislikes])]; memory.toppings = memory.toppings?.filter(name => !toppingDislikes.includes(name)); learned.push(`不加${toppingDislikes.join('、')}`);}
  const dislikes = soft.filter(name => !memory.allergies?.includes(name) && !TOPPING_WORDS.includes(name));
  if (dislikes.length) {memory.avoid = [...new Set([...(memory.avoid || []), ...dislikes])]; learned.push(`不要${dislikes.join('、')}`);}
  if (parsed.tags.length) {memory.likes = [...new Set([...(memory.likes || []), ...parsed.tags])].slice(-6); learned.push(`偏爱${parsed.tags.join('、')}`);}
  const budget = budgetDirective(message);
  if (typeof budget === 'number') {memory.budget = budget; learned.push(`¥${budget} 以内`);}
  return {memory, learned};
}

function ordersReply(orders: Order[]): string {
  return orders.map(order => {
    const items = order.lines.map(line => `${line.drinkName}×${line.quantity}`).join('、');
    const latest = order.timeline.at(-1);
    return `取餐号 ${order.code}｜${STATUS_TEXT[order.status]}\n${items}，合计 ¥${order.total}${latest?.note ? `（门店备注：${latest.note}）` : ''}`;
  }).join('\n\n');
}

function bundleTastes(message: string, people: number, preset?: string[]): string[] {
  if (preset?.length) return Array.from({length: people}, (_, index) => preset[index] || '随意');
  const segments = message.split(/[，,；;。]|一(?:个|位|杯)|另(?:一)?(?:个|位|杯)|还有(?:一)?(?:个|位)?|再(?:来)?一杯/).filter(Boolean);
  const found: string[] = [];
  for (const segment of segments) {
    const taste = TASTES.find(entry => entry.pattern.test(segment));
    if (taste) found.push(taste.label);
  }
  // "两杯解腻的" describes every cup; "一位要清爽" describes only that person.
  const perPerson = /一(?:个|位)|另(?:一)?(?:个|位|杯)|还有(?:一)?(?:个|位)|分别/.test(message);
  return Array.from({length: people}, (_, index) => found[index] || (found.length === 1 && !perPerson ? found[0] : '随意'));
}
function tasteScore(drink: Drink, taste: string): number {
  const entry = TASTES.find(item => item.label === taste);
  if (!entry) return /招牌/.test(`${drink.name}${drink.category}`) ? 2 : 1;
  return (entry.categories.includes(drink.category) ? 3 : 0) + (entry.words.test(drink.name) ? 2 : 0);
}

export function solveBundle(drinks: Drink[], intent: Intent, people: number, tastes: string[], totalBudget: number | null, promotions: ReturnType<Store['commerce']['promotions']>, excluded: string[] = []) {
  const pool = drinks.filter(drink => eligible(drink, {...intent, maxBudget: null, toppings: []}, excluded));
  const options = tastes.map(taste => pool.map(drink => ({drink, score: tasteScore(drink, taste)})).sort((a, b) => b.score - a.score || a.drink.price - b.drink.price).slice(0, 8));
  let best: {picks: Drink[]; score: number; total: number; discount: number; label?: string} | null = null;
  let cheapest = Infinity;
  const walk = (index: number, picks: {drink: Drink; score: number}[]) => {
    if (index === people) {
      const units = picks.map(pick => pick.drink.price);
      const promo = bestPromotion(units, promotions);
      const total = Math.round((units.reduce((sum, value) => sum + value, 0) - promo.discount) * 100) / 100;
      cheapest = Math.min(cheapest, total);
      if (totalBudget !== null && total > totalBudget + 1e-9) return;
      const score = picks.reduce((sum, pick) => sum + pick.score, 0) * 10 + new Set(picks.map(pick => pick.drink.category)).size * 2;
      if (!best || score > best.score || (score === best.score && total < best.total)) best = {picks: picks.map(pick => pick.drink), score, total, discount: promo.discount, label: promo.label};
      return;
    }
    for (const option of options[index]) if (!picks.some(pick => pick.drink.id === option.drink.id)) walk(index + 1, [...picks, option]);
  };
  walk(0, []);
  return {best: best as {picks: Drink[]; score: number; total: number; discount: number; label?: string} | null, cheapest: Number.isFinite(cheapest) ? cheapest : null};
}

function pickBlindBox(ctx: FeatureContext, drinks: Drink[], intent: Intent, mood: typeof MOODS[number], weather: string | undefined, hour: number) {
  const popularity = ctx.store.commerce.popularity();
  const hot = [...popularity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  const part = daypart(hour);
  const pool = drinks.filter(drink => eligible(drink, intent, ctx.input.excludeIds || []));
  const basis = [`心情「${mood.key}」→ ${mood.taste}`, `时段：${part}`];
  if (weather) basis.push(`天气：${weather}`);
  basis.push(hot.length ? '参考门店近 14 天真实订单热度' : '门店近期订单不足，未使用热销加权');
  const scored = pool.map(drink => {
    let score = (mood.categories as readonly string[]).includes(drink.category) ? 4 : mood.categories.length ? 0 : 2;
    if (hot.includes(drink.id)) score += 3 - hot.indexOf(drink.id);
    else if (!hot.length && /招牌/.test(`${drink.name}${drink.category}`)) score += 1;
    if ((part === '晚上' || part === '深夜') && drink.category === '现磨咖啡') score -= 4;
    if (weather && /晴|热/.test(weather) && ['柠檬系列', '茉莉鲜果'].includes(drink.category)) score += 2;
    if (weather && /雨|冷|降温/.test(weather) && ['茉莉茶酪', '招牌鲜奶茶'].includes(drink.category)) score += 2;
    return {drink, score};
  }).sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 4).filter(item => item.score >= (scored[0]?.score ?? 0) - 3);
  if (!top.length) return {drink: undefined, basis};
  const weights = top.map(item => Math.max(1, item.score + 1));
  let roll = randomInt(weights.reduce((sum, value) => sum + value, 0));
  for (let index = 0; index < top.length; index++) {roll -= weights[index]; if (roll < 0) return {drink: top[index].drink, basis};}
  return {drink: top[0].drink, basis};
}

function ingredientAnswer(text: string, drinks: Drink[]): {reply: string; matches: Drink[]} {
  const available = drinks.filter(drink => drink.available);
  const verified = available.filter(drink => drink.verified);
  const unknownCount = available.length - verified.length;
  const parts: string[] = []; let matches: Drink[] = [];
  if (/热量|卡路里|大卡|千卡|低卡/.test(text)) {
    const known = verified.filter(drink => typeof drink.calories === 'number').sort((a, b) => (a.calories ?? 0) - (b.calories ?? 0));
    if (known.length) {matches = known.slice(0, 3); parts.push(`已核准热量的饮品（标准杯）：${known.slice(0, 5).map(drink => `${drink.name} 约 ${drink.calories} 千卡`).join('；')}。`);}
    else parts.push('门店茶单目前还没有核准过的热量数据，我不能估算，也不能把宣传里的“低卡”当作事实。在意热量的话，建议向店员确认配方，并选择不额外加料。');
  }
  if (/奶|乳/.test(text)) {
    const dairyFree = verified.filter(drink => drink.ingredients.length && drink.allergens !== null && ![...drink.ingredients, ...drink.allergens].some(item => /奶|乳|芝士|酪/.test(item)));
    matches = [...matches, ...dairyFree];
    parts.push(dairyFree.length ? `资料已核准、未登记乳制品的有：${dairyFree.map(drink => drink.name).join('、')}（交叉接触仍请向店员确认）。` : '还没有饮品被核准为“不含乳制品”。名字里没有“奶”不代表不含乳，涉及过敏请直接问店员。');
  }
  if (/咖啡因/.test(text)) {
    const free = verified.filter(drink => drink.caffeine === 'none');
    matches = [...matches, ...free];
    parts.push(free.length ? `资料核准为不含咖啡因的有：${free.map(drink => drink.name).join('、')}。` : '还没有饮品被核准为不含咖啡因。茶和咖啡通常都含咖啡因，敏感的话请先向店员确认。');
  }
  if (/孕/.test(text)) parts.push('孕期饮食请以医生建议为准，我不能判断哪款适合。');
  if (unknownCount) parts.push(`另外有 ${unknownCount} 款在售饮品的配料、过敏原、咖啡因和热量资料尚待门店核准。`);
  return {reply: parts.join('\n') || '你想了解哪方面的成分？比如“哪款不含奶”“有没有不含咖啡因的”。', matches: [...new Map(matches.map(drink => [drink.id, drink])).values()].slice(0, 3)};
}

export async function handleFeature(kind: FeatureKind, ctx: FeatureContext): Promise<FeatureReply> {
  const {input, store, customerId} = ctx;
  const memory = customerId ? store.commerce.memory(customerId) : {};
  const drinks = storeDrinks(store);
  const action = input.action as RecommendAction | undefined;
  const needId = (): FeatureReply => ({intent: 'memory', reply: '这个浏览器还没有顾客编号，暂时无法记录或查询。刷新页面后再试试。', cards: [], notices: []});

  if (kind === 'memory_clear') {
    if (!customerId) return needId();
    store.commerce.clearMemory(customerId);
    return {intent: 'memory', reply: '已忘掉你的口味记忆和常点记录。之后的推荐只按你当下说的要求来。', cards: [], notices: [], memory: {}};
  }
  if (kind === 'memory_view') {
    const lines = describeMemory(memory);
    return {intent: 'memory', reply: lines.length ? `我记得你：\n${lines.map(line => `· ${line}`).join('\n')}\n\n随时可以说「记住我…」更新，或说「忘掉我的口味」清除。` : '我还没有记住你的口味。可以说「记住我默认三分糖、少冰、不要珍珠」，以后点单就不用每次重复了。', cards: [], notices: [], memory, suggestions: lines.length ? ['老样子', '忘掉我的口味'] : ['记住我默认三分糖、少冰']};
  }
  if (kind === 'memory_set') {
    if (!customerId) return needId();
    const {memory: next, learned} = memoryFromMessage(input.message, memory);
    if (!learned.length) return {intent: 'memory', reply: '想让我记住什么呢？比如「记住我默认三分糖、少冰，爱加椰果，不碰植脂末」。', cards: [], notices: [], suggestions: ['记住我默认三分糖、少冰']};
    const saved = store.commerce.saveMemory(customerId, next);
    const notices: string[] = [];
    if (next.allergies?.length) notices.push('过敏、不耐受和咖啡因会作为硬性条件：配方资料未核准的饮品不会被推荐，涉及过敏仍请向店员确认。');
    if (next.avoid?.length) notices.push(`「不要${next.avoid.join('、')}」会写进订单备注交给门店；配方未核准前我不会声称某杯不含它。`);
    if (next.toppings?.length) notices.push('爱加的小料只作参考，不会自动加价；下单时由你确认要不要加。');
    return {intent: 'memory', reply: `记住了：${learned.join('、')}。以后你没特别说明时，我会按这些习惯来配；当下说的要求永远优先。`, cards: [], notices, memory: saved, suggestions: ['老样子', '来一杯清爽的']};
  }
  if (kind === 'order_status') {
    const orders = customerId ? store.commerce.orders(customerId, 5) : [];
    const active = orders.filter(order => ['submitted', 'accepted', 'making', 'ready'].includes(order.status));
    const shown = (active.length ? active : orders).slice(0, 3);
    if (!shown.length) return {intent: 'order_status', reply: '还没有找到你在这台设备上提交的订单。确认下单后，随时问我「订单做到哪了」就行。', cards: [], notices: [], orders: [], suggestions: ['来一杯清爽的', '帮我开个盲盒']};
    return {intent: 'order_status', reply: `${active.length ? '你正在进行中的订单：' : '最近没有进行中的订单，最近一笔是：'}\n\n${ordersReply(shown)}`, cards: [], notices: ['订单状态由门店在接单台更新；付款在取餐时向门店完成。'], orders: shown};
  }
  if (kind === 'after_sales') {
    const recent = customerId ? store.commerce.orders(customerId, 5).filter(order => order.status !== 'cancelled' && Date.now() - Date.parse(order.createdAt) < 86_400_000) : [];
    const order = recent[0];
    if (!order) return {intent: 'after_sales', reply: '抱歉让你不满意了。我没有找到你 24 小时内在这台设备提交的订单；如果是在门店直接点的，请把小票给店员，他们会处理。', cards: [], notices: [], orders: []};
    const complaint = input.message.match(/太甜|太淡|太苦|太冰|不够冰|不好喝|难喝|做错|洒了|漏了|少了/)?.[0];
    const sorry = complaint ? `抱歉，这杯${/洒|漏|少|错/.test(complaint) ? `${complaint}，给你添麻烦了` : `${complaint}，没做到你喜欢的样子`}。` : '收到，抱歉让你不满意。';
    if (order.status === 'submitted') return {intent: 'after_sales', reply: `${sorry}取餐号 ${order.code} 门店还没开始做，可以直接取消，再按你想要的改好重新下单。`, cards: [], notices: [], orders: [order], suggestions: ['订单做到哪了']};
    const next = complaint === '太甜' ? ['记住我默认三分糖'] : complaint === '太冰' ? ['记住我默认少冰'] : [];
    return {intent: 'after_sales', reply: `${sorry}取餐号 ${order.code} 可以在下方申请「重做」或「退款」，说明一下情况，门店店员会处理并回复。我不会替门店答应结果，也不会经手任何付款。`, cards: [], notices: ['售后申请提交后由门店审核；退款按门店收款渠道原路处理。'], orders: [order], suggestions: next};
  }
  if (kind === 'repeat') {
    const last = memory.lastOrder;
    if (!last) return {intent: 'repeat', reply: '我还没有你的下单记录，所以不知道“老样子”是哪杯。先说说今天想喝什么，下单后我就记住了。', cards: [], notices: [], suggestions: ['来一杯清爽的', '帮我开个盲盒']};
    const previous = drinks.find(drink => drink.id === last.drinkId);
    const intent = baseIntent('推荐', undefined);
    const sweetness = last.sweetness && !/门店标准/.test(last.sweetness) ? last.sweetness : null;
    const temperature = last.temperature && !/门店标准/.test(last.temperature) ? last.temperature : null;
    Object.assign(intent, {sweetness, temperature});
    const change = action?.type === 'repeat' ? action.change === 'base' : /换(?:个|一个|一下)?(?:茶底|茶|口味|一款|别的|款)|但(?:是)?换/.test(input.message);
    let drink: Drink | undefined = previous && previous.available ? previous : undefined;
    let reply: string;
    if (change || !drink) {
      const pool = drinks.filter(item => item.id !== last.drinkId && eligible(item, {...intent, toppings: []}, input.excludeIds || []));
      drink = pool.find(item => item.category === previous?.category) || pool[0];
      reply = !previous?.available && !change ? `你常点的${previous?.name || '那杯'}在菜单记录中暂不可选，` : '';
      reply += drink ? `${reply ? '' : '好，'}保留你上次的做法（${[sweetness, temperature].filter(Boolean).join('、') || '门店标准'}），茶换成同系列的${drink.name}。` : '暂时找不到合适的替换款。';
    } else reply = `老样子：${drink.name}${[sweetness, temperature].filter(Boolean).length ? `，${[sweetness, temperature].filter(Boolean).join('、')}` : ''}。确认下单前我会再复述一遍。`;
    if (!drink) return {intent: 'repeat', reply, cards: [], notices: []};
    const chosen = drink;
    const toppings = (last.toppings || []).filter(name => chosen.verified && chosen.toppings.some(item => item.name === name));
    intent.toppings = toppings;
    const cardData = card(drink, intent, true);
    const notices = (last.toppings || []).length > toppings.length ? ['上次的部分小料在这杯没有登记，已先不加。'] : [];
    return {intent: 'repeat', reply, cards: [cardData], notices, proposal: [{...proposalFor(cardData, intent, last.quantity || 1), ...(last.note ? {note: last.note} : {})}], suggestions: change ? ['还是老样子'] : ['老样子，但换个茶底']};
  }
  if (kind === 'bundle') {
    const bundleAction = action?.type === 'bundle' ? action : undefined;
    const match = input.message.replace(/\s+/g, '').match(PEOPLE);
    const cupMatch = input.message.match(/(\d|[两二三])杯/);
    const people = Math.min(3, Math.max(2, bundleAction?.people ?? (match ? parseCount(match[1] || match[2]) : cupMatch ? parseCount(cupMatch[1]) : 2)));
    const directive = budgetDirective(input.message);
    const totalBudget = bundleAction ? bundleAction.totalBudget ?? null : typeof directive === 'number' ? directive : null;
    const tastes = bundleTastes(input.message, people, bundleAction?.tastes);
    const intent = baseIntent(input.message, profileWithMemory(input.profile, memory));
    const promotions = store.commerce.promotions();
    const {best, cheapest} = solveBundle(drinks, intent, people, tastes, totalBudget, promotions, input.excludeIds || []);
    if (!best) {
      const reply = cheapest !== null ? `¥${totalBudget} 的总预算有点紧，按${people}人的口味，最省的组合也要 ¥${cheapest}。要不要放宽一点预算？` : `现在凑不出 ${people} 杯都满足条件的组合，可以放宽一下口味或忌口限制再试试。`;
      return {intent: 'bundle', reply, cards: [], notices: [], suggestions: cheapest !== null ? [`${people}个人喝，${Math.ceil(cheapest)}块以内`] : []};
    }
    const cards = best.picks.map((drink, index) => ({...card(drink, intent, index === 0), reason: `给第 ${index + 1} 位（${tastes[index]}）：按品类「${drink.category}」匹配${tastes[index] === '随意' ? '，选了门店茶单里的稳妥款' : `${tastes[index]}口味`}。`}));
    const subtotal = Math.round(best.picks.reduce((sum, drink) => sum + drink.price, 0) * 100) / 100;
    const bundle: BundleProposal = {people, totalBudget, tastes, subtotal, discount: best.discount, ...(best.label ? {discountLabel: best.label} : {}), total: best.total,
      items: cards.map((cardData, index) => ({card: cardData, forWhom: `第 ${index + 1} 位 · ${tastes[index]}`, why: cardData.reason}))};
    const enabled = promotions.filter(rule => rule.enabled);
    const fallback = `${people} 位的搭配好了：${best.picks.map(drink => drink.name).join(' + ')}。`;
    const intro = await aiLine(ctx, `为${people}位朋友的茶饮组合写一句搭配推荐语，饮品：${best.picks.map(drink => drink.name).join('、')}，口味分别：${tastes.join('、')}。`, fallback);
    const priceLine = best.discount ? `小计 ¥${subtotal}，已自动套用最优优惠「${best.label}」-¥${best.discount}，合计 ¥${best.total}。` : `合计 ¥${best.total}${enabled.length ? '（这个组合用不上门店现有优惠）' : '（门店暂未登记可用优惠）'}。`;
    const notices = ['价格为门店普通参考价，标“起”的按所选规格可能变化，最终以门店为准。'];
    if (intent.sweetness || intent.temperature) notices.push('甜度和冰量会作为偏好带进订单，资料未核准的需门店确认。');
    return {intent: 'bundle', reply: `${intro === fallback ? intro : `${fallback}\n${intro}`}\n${priceLine}${totalBudget !== null ? ` 在你 ¥${totalBudget} 的预算内。` : ''}`, cards, notices, bundle,
      proposal: cards.map(cardData => proposalFor(cardData, intent))};
  }
  if (kind === 'blindbox') {
    const boxAction = action?.type === 'blindbox' ? action : undefined;
    const mood = MOODS.find(entry => entry.key === boxAction?.mood) || MOODS.find(entry => entry.pattern.test(input.message)) || MOODS.at(-1)!;
    const intent = baseIntent(boxAction ? '推荐' : input.message, profileWithMemory(input.profile, memory));
    const hour = shanghaiHour();
    const {drink, basis} = pickBlindBox(ctx, drinks, intent, mood, boxAction?.weather, hour);
    if (!drink) return {intent: 'blindbox', reply: '这次盲盒没抽到满足你条件的饮品，可能是忌口或预算限制比较多，放宽一点再抽一次？', cards: [], notices: []};
    const template = mood.blessings[randomInt(mood.blessings.length)];
    const blessing = await aiLine(ctx, `顾客此刻的心情是「${mood.key}」，现在是${daypart(hour)}${boxAction?.weather ? `，天气${boxAction.weather}` : ''}，抽到的茶饮是「${drink.name}」。写一句专属寄语。`, template);
    const cardData = {...card(drink, intent, true), reason: `盲盒依据：${basis.join('；')}`, funFact: blessing};
    const blindbox: BlindBoxResult = {mood: mood.key, title: '今日茉莉盲盒', blessing, daypart: daypart(hour), basis};
    return {intent: 'blindbox', reply: `拆开你的盲盒——是「${drink.name}」！\n${blessing}`, cards: [cardData], notices: ['盲盒在符合你条件的门店茶单里抽取；口味归类按品类，不代表配方或功效。'], blindbox, proposal: [proposalFor(cardData, intent)]};
  }
  // ingredient
  const {reply, matches} = ingredientAnswer(input.message, drinks);
  const intent = baseIntent('推荐', undefined);
  const cards = matches.filter(drink => drink.available).map((drink, index) => card(drink, intent, index === 0));
  let knowledge: Awaited<ReturnType<typeof answerKnowledge>> | null;
  try {knowledge = await answerKnowledge(input, ctx.mode, store.rag, ctx.config, ctx.fetcher, ctx.signal);} catch {knowledge = null;}
  const cited = knowledge?.citations.length ? knowledge : null;
  return {intent: 'ingredient', reply: cited ? `${reply}\n\n知识库资料：\n${cited.reply}` : reply, cards, notices: ['成分信息只采用门店核准的资料；未知不等于不含，过敏或特殊饮食请先问店员。', ...(cited?.notices || [])], ...(cited ? {citations: cited.citations} : {}), ...(cards.length ? {proposal: cards.map(item => proposalFor(item, intent))} : {})};
}

export function newRequestId() {return randomUUID();}
