import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { RagStore } from '../server/rag/store.js';

const FROZEN_SHA = 'c3b45802c2d1b3f8f0dfb035b8dc30c27c004d4afaecefc9bc96ebc04ccbe4e8';
interface Question { id: string; split: 'dev' | 'holdout'; category: string; query: string; expectedDocumentIds: string[]; answerKeywords: string[] }
interface Dataset { documents: {id: string; title: string; text: string; source: string; status: 'draft' | 'published' | 'archived'}[]; questions: Question[] }
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const args = process.argv.slice(2);
const option = (name: string) => args[args.indexOf(name) + 1];
const split = args.includes('--split') ? option('--split') : 'dev';
if (!['dev', 'holdout', 'all'].includes(split)) throw new Error('Use --split dev|holdout|all');
const path = resolve('tests/fixtures/rag/retrieval-v2.json'), bytes = readFileSync(path);
if (sha(bytes) !== FROZEN_SHA) throw new Error('Frozen retrieval fixture SHA changed; do not adjust evaluation labels');
const fixture = JSON.parse(bytes.toString('utf8')) as Dataset;
const db = new DatabaseSync(':memory:'), rag = new RagStore(db), ids = new Map<string, string>();
try {
  for (const entry of fixture.documents) {
    let {document} = rag.ingest({title: entry.title, filename: `${entry.id}.txt`, format: 'txt', source: entry.source, hash: sha(entry.id + entry.text), pages: [{text: entry.text}], warnings: []});
    if (entry.status !== 'draft') document = rag.updateDocument(document.id, {status: entry.status}, document.version);
    ids.set(document.id, entry.id);
  }
  const results = fixture.questions.filter(question => split === 'all' || question.split === split).map(question => {
    const retrieval = rag.search(question.query, {limit: 3});
    const hits = retrieval.hits.map(hit => ({documentId: ids.get(hit.documentId)!, score: hit.score}));
    const expected = question.expectedDocumentIds;
    const first = hits.findIndex(hit => expected.includes(hit.documentId));
    return {...question, hits, rank: first < 0 ? 0 : first + 1, hit: first >= 0, allExpected: expected.length > 0 && expected.every(id => hits.some(hit => hit.documentId === id)), falsePositive: expected.length === 0 && hits.length > 0, elapsedMs: retrieval.elapsedMs};
  });
  const metrics = (rows: typeof results) => {
    const positives = rows.filter(row => row.expectedDocumentIds.length), negatives = rows.filter(row => !row.expectedDocumentIds.length);
    return {questions: rows.length, answerable: positives.length, negative: negatives.length, hitCount: positives.filter(row => row.hit).length, hitAt3: positives.length ? positives.filter(row => row.hit).length / positives.length : null, mrrAt3: positives.length ? positives.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0) / positives.length : null, allExpectedAt3: positives.length ? positives.filter(row => row.allExpected).length / positives.length : null, falsePositives: negatives.filter(row => row.falsePositive).length, falsePositiveRate: negatives.length ? negatives.filter(row => row.falsePositive).length / negatives.length : null};
  };
  const report = {evaluatedAt: new Date().toISOString(), mode: 'lexical-only-no-model', evaluationProtocol: 'fixed-regression-after-initial-holdout-revealed', limitations: 'Synthetic retrieval evaluation, not production answer accuracy. The first candidate regressed on the original holdout and was rejected; subsequent runs preserve its labels but are not independent holdout validation.', fixture: {path, sha256: FROZEN_SHA}, gitRevision: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), codeHashes: {retrieval: sha(readFileSync(resolve('server/rag/retrieval.ts'))), store: sha(readFileSync(resolve('server/rag/store.ts')))}, metrics: metrics(results), bySplit: Object.fromEntries(['dev', 'holdout'].map(part => [part, metrics(results.filter(row => row.split === part))])), byCategory: Object.fromEntries([...new Set(results.map(row => row.category))].map(category => [category, metrics(results.filter(row => row.category === category))])), results};
  if (args.includes('--output')) writeFileSync(option('--output'), JSON.stringify(report, null, 2) + '\n');
  // All-mode baseline may be recorded before tuning; only development failures are printed.
  console.log(JSON.stringify({fixtureSha256: FROZEN_SHA, ...report.bySplit, output: args.includes('--output') ? option('--output') : null, failures: results.filter(row => (split !== 'all' || row.split === 'dev') && (row.expectedDocumentIds.length ? !row.allExpected : row.falsePositive))}, null, 2));
} finally { db.close(); }
