import type { KnowledgeHit, KnowledgeSearchResult } from '../../shared/rag.js';
import type { RagStore, SearchOptions } from './store.js';

const segmenter = new Intl.Segmenter('zh-CN', {granularity: 'word'});
const stopwords = new Set('我 你 他 她 它 我们 你们 他们 的 地 得 了 吗 呢 吧 啊 和 与 或 是 在 对 及 也 有 一个 一下 一些 这个 那个 什么 怎么 如何 为什么 哪个 哪些 哪里 是否 能 能否 能够 可以 不能 应该 请 请问 帮 帮我 告诉 告诉我 想 想要 想知道 知道 了解 介绍 说明 解释 有关 关于 知识 问题 内容 资料 相关 具体 详细 多少 时候 进行 以及 还是 然后 需要 我要 谢谢 你好 the a an of to in and or is are be what how why when where please tell me about can could do does it this that should would for with from by at on have has'.split(' '));
const generalTerms = new Set(['茉莉', '茉莉花', '茉莉茶', '茉莉花茶', '茶', '茶饮', '茶叶', '花茶', '奶茶', '红茶', '绿茶', '喝茶', '饮品', '品牌', '极萃', '极', '萃', '东方', '东方茉莉', 'jasmine', 'tea']);
const meaningfulSingleCharacters = new Set('奶糖冰冷热酸甜苦咸姜盐水茶花酒蛋豆果伞寄漏');
const compoundNounTails = new Set('香味汤汁粉皮籽油乳酪');
const questionWords = new Set('步骤 流程 方法 处理 办理 申请 进行 第一次 初次 几根 多久 时候 什么时候 啥时候 啥 咋 怎么办 怎么做 要 不要 又要 得 能不能 行不行 是不是 有没有 应该 准备 今天 明天 后天 现在 其实 比较 大概 大概要 概要 一般 通常 先 再 之后 之前 方面 东西 地方 出来 对应 完全 准确 直接 材料 证明 提交 提供 告诉 麻烦 担心 而且 并且 但是 可是 因此 所以 由于 这样 那样 仍然 一直 已经 正在 手上 手里 往外 往里 information need needs adding any please tell would could'.split(' '));
const singleNoise = new Set('我你他她它这那的地得了吗呢吧啊和与或是是在对及也有把被能会要该第几根次个等不怎么里上下到去来帮给让找落往很只挺总刚才更最太都还又再为因可所着过于以没每另别必店杯');
const synonymGroups = [
  ['咖啡因', 'caffeine'], ['过敏原', '过敏', 'allergen', 'allergens', 'allergy'],
  ['牛奶', '乳制品', 'milk', 'dairy'], ['配料', '成分', '原料', 'ingredients', 'ingredient'],
  ['产地', '原产地', '产区', '产自', 'origin'], ['窨制', '窨花', '窨茶', 'scenting'],
  ['工艺', '制作', '加工', 'process'], ['保存', '储存', '贮存', '储藏', '存放', '保管', 'storage', 'store', 'stored', 'storing'],
  ['保质期', '有效期', 'expiry', 'expiration'], ['隔夜', '过夜', '一宿', '一夜', '第二天', '明儿', 'overnight'],
  ['售后', '退换', '退款', '退货', '退钱', '退欵', 'refund', 'returns'],
  ['甜度', '糖度', '糖量', 'sweetness'], ['茉莉花', 'jasmine'],
  ['发票', '开票', 'invoice', 'invoices'], ['孩子', '儿童', '小孩', 'children', 'child'],
  ['茶礼', '礼盒'], ['快递', '寄送', '发货', '寄出', '邮寄', 'shipping'],
  ['洒漏', '漏液', '漏水'], ['杯口', '封口'], ['取餐', '自取', 'pickup'],
  ['雨伞', '伞'], ['丢失', '遗失', '失物', '遗落', '落下', '忘拿'],
  ['加冰', 'ice'], ['去除', 'remove'], ['营业', '开门', '打烊', '开店'],
];
// A compact domain glossary supplements ICU dictionaries. In particular ICU often splits 窨制/香氛
// into single Han characters; dropping those pieces must not erase the subject of a question.
const domainWords = [...new Set([...synonymGroups.flat().filter(term => isNaN(Number(term)) && term.length > 1), '香氛', '扩香棒', '封口膜', '取餐码', '茶坯', '饮品', '杯盖', '乳制品', '过敏原', '会员', '积分', '预约', '体验', '税号', '批次', '产地', '检测', '毫克'])].sort((a, b) => b.length - a.length);
const normalize = (text: string) => text.normalize('NFKC').toLowerCase();
const isHan = (text: string) => /^[\p{Script=Han}]+$/u.test(text);
const grams = (word: string) => Array.from({length: Math.max(0, word.length - 1)}, (_, index) => word.slice(index, index + 2));
export const normalizeForSearch = (text: string) => normalize(text).replace(/[^\p{L}\p{N}]+/gu, '');

function words(text: string): string[] {
  return [...segmenter.segment(normalize(text))].filter(part => part.isWordLike).map(part => part.segment).filter(word => !stopwords.has(word) && (word.length > 1 || /[\p{Script=Han}\d]/u.test(word)));
}
function tokenForWord(word: string): string { return `w${word}`; }
export function indexTokens(text: string): string {
  const terms = words(text);
  const tokens = terms.map(tokenForWord);
  for (const run of normalize(text).match(/[\p{Script=Han}]{2,}/gu) ?? []) tokens.push(...grams(run).map(gram => `g${gram}`));
  return tokens.join(' ');
}
export interface QueryPlan { terms: string[]; expanded: string[]; match: string; normalized: string; identifiers: string[] }
function focusedQuestion(query: string): string {
  const clauses = query.split(/[，,。；;！!]/).map(value => value.trim()).filter(Boolean);
  const useful = clauses.filter(clause => !/^(?:也|并|这次|现在|我)?(?:不是问|不是说|不想问|先不问|不是饮品|不是礼盒)/.test(clause));
  // Keep topic clauses even if only the following clause contains a question mark. Dropping
  // them loses the referent in ordinary ellipsis; only explicit excluded topics are removed.
  return useful.join('，');
}
export function planQuery(query: string): QueryPlan {
  const focused = normalize(focusedQuestion(query.slice(0, 4000)));
  const concepts = domainWords.filter(term => /[a-z]/i.test(term) ? new RegExp(`\\b${term}\\b`, 'i').test(focused) : focused.includes(term));
  const rawTerms = words(focused).filter(term => !questionWords.has(term));
  const phrases: string[] = [];
  let run = '';
  const flush = () => { if (run.length > 1) phrases.push(...grams(run)); run = ''; };
  const segments = [...segmenter.segment(focused)];
  for (let index = 0; index < segments.length; index++) {
    const part = segments[index], previous = segments[index - 1];
    // ICU may produce [茉莉花][香] or [桂花][香]. Keep the overlapping noun 花香
    // as well as the longer flower name; the singleton rule must not erase this subject.
    if (part.isWordLike && part.segment.length === 1 && compoundNounTails.has(part.segment)
      && previous?.isWordLike && previous.segment.length > 1 && isHan(previous.segment)
      && previous.index + previous.segment.length === part.index
      && meaningfulSingleCharacters.has(previous.segment.at(-1)!)) {
      phrases.push(previous.segment.at(-1)! + part.segment);
    }
    if (part.isWordLike && part.segment.length === 1 && isHan(part.segment) && !singleNoise.has(part.segment)) run += part.segment;
    else flush();
  }
  flush();
  const terms = [...new Set([...concepts, ...rawTerms.filter(term => term.length > 1 || meaningfulSingleCharacters.has(term)), ...phrases])]
    .filter(term => !questionWords.has(term) && !stopwords.has(term))
    .filter(term => !isHan(term) || ![...term].every(character => singleNoise.has(character)))
    .filter(term => !concepts.some(concept => concept !== term && concept.includes(term)))
    .slice(0, 48);
  const expanded = new Set<string>();
  for (const group of synonymGroups) {
    if (group.some(word => terms.some(term => term === word || (word.length > 2 && term.includes(word))))) {
      for (const term of group) if (!terms.includes(term)) expanded.add(term);
    }
  }
  const tokens = new Set<string>();
  for (const term of [...terms, ...expanded]) {
    tokens.add(tokenForWord(term));
    if (isHan(term)) for (const gram of grams(term)) tokens.add(`g${gram}`);
  }
  // Only generated alphanumeric tokens enter MATCH. User punctuation is never SQL/FTS syntax.
  return {terms, expanded: [...expanded], match: [...tokens].slice(0, 144).map(term => `"${term.replaceAll('"', '""')}"`).join(' OR '), normalized: normalizeForSearch(focused), identifiers: [...focused.matchAll(/(?:[a-z]+[-_]?)?\d{3,}(?:[-_][a-z\d]+)*/gi)].map(match => normalizeForSearch(match[0]))};
}
const relatedTerms = (term: string) => synonymGroups.filter(group => group.includes(term)).flat();
function termMatch(term: string, text: string): number {
  if (text.includes(term)) return 1;
  if (relatedTerms(term).some(synonym => text.includes(synonym))) return 0.8;
  if (isHan(term) && term.length >= 4) {
    const pieces = grams(term);
    const covered = pieces.filter(piece => text.includes(piece)).length / pieces.length;
    if (covered >= 0.66) return covered * 0.7;
  }
  return 0;
}
export function lexicalRelevance(plan: QueryPlan, hit: Pick<KnowledgeHit, 'title' | 'text'>, rank: number): number {
  const body = normalizeForSearch(hit.text), title = normalizeForSearch(hit.title), text = `${title}${body}`;
  if (plan.identifiers.some(identifier => !text.includes(identifier))) return 0;
  const important = plan.terms.filter(term => !generalTerms.has(term));
  const matches = plan.terms.map(term => ({term, match: termMatch(term, text), weight: generalTerms.has(term) ? 0.45 : 1}));
  const weight = matches.reduce((sum, item) => sum + item.weight, 0);
  const coverage = matches.reduce((sum, item) => sum + item.match * item.weight, 0) / Math.max(1, weight);
  const matched = matches.filter(item => item.match > 0);
  if (!matched.length || coverage < 0.24) return 0;
  // Sharing only a broad brand/tea word must not answer an otherwise unrelated question.
  if (important.length && !important.some(term => termMatch(term, text) >= 0.5)) return 0;
  const bodyCoverage = matches.reduce((sum, item) => sum + termMatch(item.term, body) * item.weight, 0) / Math.max(1, weight);
  const titleCoverage = matches.reduce((sum, item) => sum + termMatch(item.term, title) * item.weight, 0) / Math.max(1, weight);
  const exactPhrase = plan.normalized.length >= 2 && (body.includes(plan.normalized) || title.includes(plan.normalized)) ? 0.1 : 0;
  return Math.min(1, coverage * 0.5 + bodyCoverage * 0.25 + titleCoverage * 0.1 + exactPhrase + 0.05 / (1 + Math.max(0, rank)));
}
export function textSimilarity(left: string, right: string): number {
  const a = new Set(grams(normalizeForSearch(left))), b = new Set(grams(normalizeForSearch(right)));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const gram of a) if (b.has(gram)) overlap++;
  return overlap / (a.size + b.size - overlap);
}
/** Greedy diversity reranking keeps repeated chunks from occupying the whole context.
 * A near-duplicate can be a conflicting source (30 vs 45 minutes, or allowed vs forbidden),
 * so similarity alone must never erase it before the answer layer checks contradictions. */
export function diversify(hits: KnowledgeHit[], limit: number): KnowledgeHit[] {
  const remaining = [...hits];
  const selected: KnowledgeHit[] = [];
  while (remaining.length && selected.length < limit) {
    let bestIndex = -1, bestScore = -Infinity;
    for (let index = 0; index < remaining.length; index++) {
      const candidate = remaining[index];
      const similar = selected.reduce((maximum, item) => Math.max(maximum, textSimilarity(item.text, candidate.text)), 0);
      const candidateText = normalize(candidate.text).replace(/\s+/g, ' ').trim();
      const duplicate = selected.some(item => {
        const selectedText = normalize(item.text).replace(/\s+/g, ' ').trim();
        if (candidateText === selectedText) return true;
        return item.documentId === candidate.documentId && item.documentVersion === candidate.documentVersion && candidateText.length >= 200 && Math.abs(item.ordinal - candidate.ordinal) <= 1 && selectedText.includes(candidateText);
      });
      if (duplicate) continue;
      const sameDocument = selected.filter(item => item.documentId === candidate.documentId).length;
      if (sameDocument >= 3) continue;
      const score = candidate.score - similar * 0.18 - sameDocument * 0.055;
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    }
    if (bestIndex < 0) break;
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
}

export interface EmbeddingConfig { baseUrl: string; apiKey: string; model: string; timeoutMs?: number }
export interface RetrievalOptions extends SearchOptions { embedding?: EmbeddingConfig; fetcher?: typeof fetch; signal?: AbortSignal }
/** Optional provider-independent embeddings; failures fall back to the local index. */
export async function retrieveKnowledge(rag: RagStore, query: string, options: RetrievalOptions = {}): Promise<KnowledgeSearchResult> {
  const lexical = rag.search(query, options);
  if (!options.embedding || !query.trim() || options.signal?.aborted) return lexical;
  const {hybridSearch} = await import('./embeddings.js');
  return hybridSearch(rag, query, options, lexical);
}
