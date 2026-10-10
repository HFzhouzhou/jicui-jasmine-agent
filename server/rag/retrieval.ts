import type { KnowledgeHit, KnowledgeSearchResult } from '../../shared/rag.js';
import type { RagStore, SearchOptions } from './store.js';

const segmenter = new Intl.Segmenter('zh-CN', {granularity: 'word'});
const stopwords = new Set('我 你 他 她 它 我们 你们 他们 的 地 得 了 吗 呢 吧 啊 和 与 或 是 在 对 及 也 有 一个 一下 一些 这个 那个 什么 怎么 如何 为什么 哪个 哪些 哪里 是否 能 能否 能够 可以 不能 应该 请 请问 帮 帮我 告诉 告诉我 想 想要 想知道 知道 了解 介绍 说明 解释 有关 关于 知识 问题 内容 资料 相关 具体 详细 多少 时候 进行 以及 还是 然后 需要 我要 谢谢 你好 the a an of to in and or is are be what how why when where please tell me about can could do does it this that should would for with from by at on have has'.split(' '));
const generalTerms = new Set(['茉莉', '茉莉花', '茉莉茶', '茉莉花茶', '茶', '茶饮', '茶叶', '花茶', '奶茶', '红茶', '绿茶', '喝茶', '饮品', '品牌', '极萃', '极', '萃', '东方', '东方茉莉', 'jasmine', 'tea']);
const meaningfulSingleCharacters = new Set('奶糖冰冷热酸甜苦咸姜盐水茶花酒蛋豆果');
const synonymGroups = [
  ['咖啡因', 'caffeine'], ['过敏原', '过敏', 'allergen', 'allergens', 'allergy'],
  ['牛奶', '乳制品', 'milk', 'dairy'], ['配料', '成分', '原料', 'ingredients', 'ingredient'],
  ['产地', '原产地', '产区', '产自', 'origin'], ['窨制', '窨花', '窨茶', 'scenting'],
  ['工艺', '制作', '加工', 'process'], ['保存', '储存', '贮存', '储藏', '存放', '保管', 'storage', 'store', 'stored', 'storing'],
  ['保质期', '有效期', 'expiry', 'expiration'], ['售后', '退换', '退款', '退货', 'refund', 'returns'],
  ['甜度', '糖度', '糖量', 'sweetness'], ['茉莉花', 'jasmine'],
];
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
export interface QueryPlan { terms: string[]; expanded: string[]; match: string; normalized: string }
export function planQuery(query: string): QueryPlan {
  const rawTerms = [...new Set(words(query.slice(0, 4000)))].slice(0, 48);
  // Segmentation can turn verbs into single letters such as 包/治. They must not match 包装/不能
  // as evidence for an unrelated multiword question. Keep meaningful product attributes like 糖/奶.
  const hasSpecificTerm = rawTerms.some(term => term.length > 1 && !generalTerms.has(term));
  const terms = hasSpecificTerm ? rawTerms.filter(term => term.length > 1 || meaningfulSingleCharacters.has(term)) : rawTerms;
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
  return {terms, expanded: [...expanded], match: [...tokens].slice(0, 144).map(term => `"${term.replaceAll('"', '""')}"`).join(' OR '), normalized: normalizeForSearch(query)};
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
/** Greedy diversity reranking keeps overlapping chunks from occupying the whole context. */
export function diversify(hits: KnowledgeHit[], limit: number): KnowledgeHit[] {
  const remaining = [...hits];
  const selected: KnowledgeHit[] = [];
  while (remaining.length && selected.length < limit) {
    let bestIndex = -1, bestScore = -Infinity;
    for (let index = 0; index < remaining.length; index++) {
      const candidate = remaining[index];
      const similar = selected.reduce((maximum, item) => Math.max(maximum, textSimilarity(item.text, candidate.text)), 0);
      if (similar > 0.86) continue;
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
