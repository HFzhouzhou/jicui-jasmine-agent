import { createHash } from 'node:crypto';
import type { KnowledgeHit, KnowledgeSearchResult } from '../../shared/rag.js';
import type { RagStore } from './store.js';
import { diversify, type EmbeddingConfig, type RetrievalOptions } from './retrieval.js';
export { retrieveKnowledge } from './retrieval.js';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const chunkText = (hit: KnowledgeHit) => `${hit.title}\n${hit.text}`;
const providerId = (config: EmbeddingConfig) => sha(`${config.baseUrl.replace(/\/+$/, '')}|${config.model}`);
const queryCache = new Map<string, {vector: number[]; expires: number}>();
const validVector = (vector: unknown): vector is number[] => Array.isArray(vector) && vector.length >= 2 && vector.length <= 4096 && vector.every(value => typeof value === 'number' && Number.isFinite(value)) && vector.some(value => value !== 0);

async function embed(texts: string[], options: RetrievalOptions): Promise<number[][]> {
  const config = options.embedding!;
  const timeout = AbortSignal.timeout(Math.max(500, Math.min(config.timeoutMs ?? 8000, 15_000)));
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await (options.fetcher ?? fetch)(`${config.baseUrl.replace(/\/+$/, '')}/embeddings`, {
    method: 'POST', signal, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}`},
    body: JSON.stringify({model: config.model, input: texts, encoding_format: 'float'}),
  });
  if (!response.ok || !response.body) throw new Error('Embedding provider unavailable');
  const reader = response.body.getReader();
  const buffers: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8 * 1024 * 1024) { await reader.cancel(); throw new Error('Embedding response exceeded limit'); }
      buffers.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = JSON.parse(Buffer.concat(buffers).toString('utf8')) as {data?: {index?: number; embedding?: unknown}[]};
  if (!Array.isArray(data.data) || data.data.length !== texts.length) throw new Error('Invalid embedding response');
  const vectors: number[][] = Array.from({length: texts.length});
  for (const item of data.data) {
    if (!Number.isInteger(item.index) || item.index! < 0 || item.index! >= texts.length || vectors[item.index!] || !validVector(item.embedding)) throw new Error('Invalid embedding vector');
    vectors[item.index!] = item.embedding;
  }
  if (vectors.some(vector => !vector || vector.length !== vectors[0].length)) throw new Error('Inconsistent embedding dimensions');
  return vectors;
}
function cosine(left: number[], right: number[]): number {
  if (left.length !== right.length) return -1;
  let product = 0, a = 0, b = 0;
  for (let index = 0; index < left.length; index++) { product += left[index] * right[index]; a += left[index] ** 2; b += right[index] ** 2; }
  return a && b ? product / Math.sqrt(a * b) : -1;
}

/** Each request indexes at most 32 missing chunks. This bounds time/cost on a small server. */
export async function hybridSearch(rag: RagStore, query: string, options: RetrievalOptions, lexical: KnowledgeSearchResult): Promise<KnowledgeSearchResult> {
  const started = performance.now();
  const budget = Math.max(500, Math.min(options.embedding?.timeoutMs ?? 8000, 8000));
  const deadline = AbortSignal.timeout(budget);
  options = {...options, signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline};
  const checkDeadline = () => { options.signal?.throwIfAborted(); if (performance.now() - started >= budget) throw new Error('Embedding retrieval timed out'); };
  try {
    const provider = providerId(options.embedding!);
    const candidates = rag.embeddingCandidates(options, 8000);
    if (!candidates.length) return {...lexical, hits: rag.currentHits(lexical.hits, options)};
    const cache = rag.db.prepare('SELECT content_hash FROM rag_embeddings WHERE chunk_id=? AND provider_key=?');
    const readVector = rag.db.prepare('SELECT content_hash,vector_json FROM rag_embeddings WHERE chunk_id=? AND provider_key=?');
    const missing: KnowledgeHit[] = [];
    const lexicalIds = new Set(lexical.hits.map(hit => hit.id));
    candidates.sort((a, b) => Number(lexicalIds.has(b.id)) - Number(lexicalIds.has(a.id)));
    for (const hit of candidates) {
      checkDeadline();
      const row = cache.get(hit.id, provider);
      if (row?.content_hash === sha(chunkText(hit))) continue;
      if (missing.length < 32) missing.push(hit);
    }
    const key = sha(`${provider}|${query.slice(0, 4000)}`), cachedQuery = queryCache.get(key);
    let queryVector = cachedQuery && cachedQuery.expires > Date.now() ? cachedQuery.vector : undefined;
    // Recheck publication immediately before uploading any chunk text to the configured provider.
    const upload = rag.currentHits(missing, options);
    const texts = [...(queryVector ? [] : [query.slice(0, 4000)]), ...upload.map(chunkText)];
    if (texts.length) {
      checkDeadline();
      const vectors = await embed(texts, options);
      let offset = 0;
      if (!queryVector) {
        queryVector = vectors[0]; offset = 1;
        queryCache.set(key, {vector: queryVector, expires: Date.now() + 15 * 60_000});
        while (queryCache.size > 64) queryCache.delete(queryCache.keys().next().value!);
      }
      const stillAllowed = new Set(rag.currentHits(upload, options).map(hit => hit.id));
      const save = rag.db.prepare('INSERT INTO rag_embeddings(chunk_id,provider_key,content_hash,vector_json) VALUES(?,?,?,?) ON CONFLICT(chunk_id,provider_key) DO UPDATE SET content_hash=excluded.content_hash,vector_json=excluded.vector_json');
      for (let index = 0; index < upload.length; index++) {
        const hit = upload[index], vector = vectors[index + offset];
        if (!stillAllowed.has(hit.id)) continue;
        save.run(hit.id, provider, sha(chunkText(hit)), JSON.stringify(vector));
        // Switching model/provider cannot grow an unbounded collection of obsolete vectors.
        rag.db.prepare('DELETE FROM rag_embeddings WHERE chunk_id=? AND provider_key<>?').run(hit.id, provider);
      }
    }
    if (!queryVector) return {...lexical, hits: rag.currentHits(lexical.hits, options)};
    // Score vectors one by one instead of loading thousands of high-dimensional arrays in RAM.
    const semanticCandidates: KnowledgeHit[] = [];
    const indexed: KnowledgeHit[] = [];
    let mismatchedDimensions = false;
    for (const hit of candidates) {
      checkDeadline();
      const row = readVector.get(hit.id, provider);
      if (!row || row.content_hash !== sha(chunkText(hit))) continue;
      try {
        const vector: unknown = JSON.parse(row.vector_json as string);
        if (!validVector(vector)) throw new Error('Invalid cached embedding');
        if (vector.length !== queryVector.length) {
          mismatchedDimensions = true;
          throw new Error('Embedding dimensions changed');
        }
        indexed.push(hit);
        const score = cosine(queryVector, vector);
        if (score >= 0.66) semanticCandidates.push({...hit, score});
      } catch { rag.db.prepare('DELETE FROM rag_embeddings WHERE chunk_id=? AND provider_key=?').run(hit.id, provider); }
    }
    if (mismatchedDimensions) { queryCache.delete(key); return rag.search(query, options); }
    const semantic = semanticCandidates.sort((a, b) => b.score - a.score).slice(0, 40);
    const merged = new Map<string, {hit: KnowledgeHit; rrf: number; quality: number}>();
    for (const list of [lexical.hits, semantic]) list.forEach((hit, index) => {
      const item = merged.get(hit.id) ?? {hit, rrf: 0, quality: 0};
      item.rrf += 1 / (61 + index); item.quality = Math.max(item.quality, hit.score); merged.set(hit.id, item);
    });
    const hits = [...merged.values()].map(item => ({...item.hit, score: Math.min(1, item.rrf / (2 / 61) * 0.9 + item.quality * 0.1)})).sort((a, b) => b.score - a.score);
    return {query, hits: diversify(rag.currentHits(hits, options), Math.max(1, Math.min(options.limit ?? 5, 12))), mode: 'hybrid', elapsedMs: Math.round((performance.now() - started + lexical.elapsedMs) * 100) / 100, embeddingCoverage: {indexed: rag.currentHits(indexed, options).length, total: rag.embeddingCandidates(options, 8000).length}};
  } catch {
    // Re-run retrieval so an intervening edit/unpublish never leaks stale provider context.
    return rag.search(query, options);
  }
}
