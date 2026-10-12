import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {diversify, planQuery, textSimilarity} from '../server/rag/retrieval.js';
import {RagStore} from '../server/rag/store.js';
import type {KnowledgeHit} from '../shared/rag.js';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const frozenSha = 'c3b45802c2d1b3f8f0dfb035b8dc30c27c004d4afaecefc9bc96ebc04ccbe4e8';
function add(rag: RagStore, title: string, text: string) {
  const {document} = rag.ingest({title, filename: title + '.txt', format: 'txt', source: '虚构单测资料', hash: sha(title + text), pages: [{text}], warnings: []});
  return rag.updateDocument(document.id, {status: 'published'}, document.version);
}
function hit(id: string, text: string, documentId = id, ordinal = 0): KnowledgeHit {
  return {id, documentId, documentVersion: 'same-version', title: '虚构服务指南', text, source: '虚构资料', ordinal, score: 0.8};
}

test('frozen offline evaluation keeps its original labels and original development/holdout partition', () => {
  const bytes = readFileSync(new URL('./fixtures/rag/retrieval-v2.json', import.meta.url));
  assert.equal(sha(bytes), frozenSha);
  const fixture = JSON.parse(bytes.toString('utf8'));
  assert.equal(fixture.documents.length, 22);
  assert.equal(fixture.questions.filter((question: {split: string}) => question.split === 'dev').length, 48);
  assert.equal(fixture.questions.filter((question: {split: string}) => question.split === 'holdout').length, 24);
});

test('rare domain words survive ICU single-character segmentation and English maps to domain concepts', () => {
  assert.ok(planQuery('窨制要经过哪些步骤？').terms.includes('窨制'));
  assert.ok(planQuery('如何使用香氛扩香棒？').terms.includes('香氛'));
  assert.ok(planQuery('饮品杯口漏液怎么办？').terms.includes('漏液'));
  assert.ok(planQuery('How do I get an invoice?').expanded.includes('发票'));
  assert.ok(!planQuery('什么时候营业，到店自取去哪里？').terms.includes('店自'));
});

test('overlapping compound nouns remain searchable across an ICU multiword/singleton boundary', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close()); const rag = new RagStore(db);
  const process = add(rag, '虚构窨制说明', '鲜花与茶坯接触时，茶坯吸收花香；窨制后筛去花渣。');
  for (const query of ['茉莉花香如何传到茶叶里？', '桂花香为什么能留在茶里？']) {
    assert.ok(planQuery(query).terms.includes('花香'));
    assert.equal(rag.search(query).hits[0]?.documentId, process.id);
  }
  assert.ok(!planQuery('茉莉花，香味如何？').terms.includes('花香'));
});

test('numeric identifiers stay anchored instead of substituting a different batch', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close()); const rag = new RagStore(db);
  add(rag, '虚构茶批次追溯', '批次 LM-9876 的茶叶来自虚构山谷。');
  assert.equal(rag.search('批次 LM-9877 的茶叶来自哪里？').hits.length, 0);
  assert.equal(rag.search('批次 LM-9876 的茶叶来自哪里？').hits[0]?.title, '虚构茶批次追溯');
});

// Global word-coverage tightening rejected this false-positive but regressed paraphrase recall.
// It remains a documented lexical candidate limitation; the answer layer must not infer a
// medical effect from a child-safety notice. Keep this failure visible instead of retuning to it.
test('lexical retrieval may over-retrieve a child-safety notice for an unsupported medical question', {todo: 'Known lexical false-positive; requires evidence-aware answer refusal'}, t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close()); const rag = new RagStore(db);
  add(rag, '儿童接触注意', '茶饮门店的香氛须远离儿童，不能饮用。');
  assert.equal(rag.search('茶是否治疗儿童抑郁症？').hits.length, 0);
});

test('diversity retains near-duplicate numeric and negative facts across sources and within a document', () => {
  const background = '这是虚构的离线配送说明。门店需要先核对配送区域与当前接单安排，顾客下单后可以查看配送进度。异常时联系服务人员核对订单信息，工作人员按照门店记录检查相关情况。';
  const one = hit('one', background + '配送预计需要 30 分钟。');
  const two = hit('two', background + '配送预计需要 45 分钟。');
  assert.ok(textSimilarity(one.text, two.text) > 0.86);
  assert.equal(diversify([one, two], 3).length, 2);
  assert.equal(diversify([one, {...two, documentId: one.documentId, ordinal: 1}], 3).length, 2);
  const allowed = hit('allowed', background + '当日允许退货。');
  const forbidden = hit('forbidden', background + '当日不允许退货。');
  assert.ok(textSimilarity(allowed.text, forbidden.text) > 0.86);
  assert.equal(diversify([allowed, forbidden], 3).length, 2);
  assert.equal(diversify([one, hit('identical-copy', one.text), two], 3).length, 2);
});
