import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { RagConflict, RagStore, RagValidationError, splitKnowledgePages } from '../server/rag/store.js';
import { retrieveKnowledge } from '../server/rag/retrieval.js';
import type { KnowledgeDocument } from '../shared/rag.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function fixture(t: {after: (callback: () => void) => void}) { const db = new DatabaseSync(':memory:'); t.after(() => db.close()); return new RagStore(db); }
function add(rag: RagStore, title: string, text: string, publish = true): KnowledgeDocument {
  const {document} = rag.ingest({title, filename: `${title}.txt`, format: 'txt', source: '测试资料', hash: digest(`${title}|${text}`), pages: [{text, page: 1}], warnings: []});
  return publish ? rag.updateDocument(document.id, {status: 'published'}, document.version) : document;
}

test('RAG defaults to draft, duplicate imports are idempotent, source pages and canonical text remain intact', t => {
  const rag = fixture(t), input = {title: '茶叶指南', filename: 'manual.pdf', format: 'pdf', source: '培训手册', hash: digest('file'), pages: [{text: '# 储存方法\n密封避光，避免潮湿。', page: 3}, {text: '茉莉花茶采用窨制工艺。', page: 8}], warnings: []};
  const first = rag.ingest(input), second = rag.ingest(input);
  assert.equal(first.document.status, 'draft'); assert.equal(second.duplicate, true); assert.equal(second.document.id, first.document.id);
  assert.equal(rag.stats().documents, 1); assert.equal(rag.stats().published, 0);
  assert.equal(rag.search('储存方法').hits.length, 0);
  const preview = rag.search('储存方法', {includeDraft: true}); assert.equal(preview.hits[0].page, 3); assert.equal(preview.hits[0].section, '储存方法');
  const detail = rag.getDocument(first.document.id)!;
  assert.equal(detail.content, '# 储存方法\n密封避光，避免潮湿。\n\n茉莉花茶采用窨制工艺。'); assert.equal(detail.document.pageCount, 2);
});

test('Chinese FTS ranking finds specific facts, expands synonyms, supports English and rejects unrelated questions', t => {
  const rag = fixture(t);
  const storage = add(rag, '茶叶保存说明', '茶叶必须密封储存，放在阴凉干燥处，避免阳光照射和异味。');
  const process = add(rag, '窨制工艺', '茉莉花茶通过窨花工艺让茶坯吸收茉莉花香。窨制需要鲜花与茶坯混合后再进行分离。');
  add(rag, '极萃东方茉莉品牌介绍', '茉莉花茶是品牌的重要产品，茶汤有花香。');
  const caffeine = add(rag, 'Caffeine guide', 'Caffeine naturally occurs in tea leaves. Milk tea still contains caffeine unless specifically decaffeinated.');
  assert.equal(rag.search('茶叶怎么储藏').hits[0]?.documentId, storage.id);
  assert.equal(rag.search('茉莉花茶怎么窨制').hits[0]?.documentId, process.id);
  assert.equal(rag.search('What is caffeine in tea?').hits[0]?.documentId, caffeine.id);
  assert.ok(rag.search('咖啡因').hits.some(hit => hit.documentId === caffeine.id));
  assert.equal(rag.search('茉莉品牌的宇宙飞船如何降落火星').hits.length, 0);
  assert.equal(rag.search('极萃东方茉莉的量子计算机').hits.length, 0);
  assert.equal(rag.search('茉莉茶是否能包治糖尿病').hits.length, 0);
  assert.equal(rag.search('奶茶是否适合孕妇').hits.length, 0);
  assert.equal(rag.search('量子计算机退相干时间').hits.length, 0);
  assert.equal(rag.search('" OR * : NOT ( )').hits.length, 0);
});

test('ordinary storage paraphrases work without treating single-character verbs as topic evidence', t => {
  const rag = fixture(t), storage = add(rag, '包装与储存', '包装开封后及时封口，茶叶不能放在潮湿的地方。');
  assert.equal(rag.search('如何保管茶叶').hits[0]?.documentId, storage.id);
  assert.equal(rag.search('How should tea be stored?').hits[0]?.documentId, storage.id);
  assert.equal(rag.search('这包茶能包治失眠吗').hits.length, 0);
  assert.equal(rag.search('茶是不是包邮').hits.length, 0);
});

test('publishing, withdrawing, archiving, content revisions and title edits take effect immediately', t => {
  const rag = fixture(t); let document = add(rag, '门店说明', '冬季营业时间为九点至十八点。', false);
  assert.equal(rag.search('营业时间').hits.length, 0);
  document = rag.updateDocument(document.id, {status: 'published'}, document.version);
  assert.equal(rag.search('营业时间').hits.length, 1);
  const publishedVersion = document.version;
  document = rag.updateContent(document.id, '退款申请请提供订单编号，并联系原购买门店处理。', document.version);
  assert.equal(document.status, 'draft'); assert.equal(rag.search('营业时间').hits.length, 0); assert.equal(rag.search('退款').hits.length, 0);
  document = rag.updateDocument(document.id, {status: 'published'}, document.version);
  assert.equal(rag.search('退款').hits[0]?.documentId, document.id);
  assert.equal(rag.search('退款').hits[0]?.page, undefined); assert.equal(document.pageCount, 0); assert.ok(document.warnings.some(warning => warning.includes('页码')));
  assert.throws(() => rag.updateDocument(document.id, {status: 'archived'}, publishedVersion), RagConflict);
  document = rag.updateDocument(document.id, {title: '退款指引'}, document.version);
  assert.equal(rag.search('退款').hits[0]?.title, '退款指引');
  document = rag.updateDocument(document.id, {status: 'draft'}, document.version);
  assert.equal(rag.search('退款').hits.length, 0); assert.equal(rag.search('退款', {includeDraft: true}).hits.length, 1);
  document = rag.updateDocument(document.id, {status: 'archived'}, document.version);
  assert.equal(rag.search('退款', {includeDraft: true}).hits.length, 0);
  assert.equal(rag.getDocument(document.id)?.document.status, 'archived');
});

test('chunk overlap preserves boundary context without duplicating the canonical source or exceeding bounds', t => {
  const rag = fixture(t);
  const text = `${'一'.repeat(730)}退货需凭小票，原包装完整且未拆封。${'二'.repeat(900)}\n\n## 注意事项\n保质期以包装标示为准。`;
  const document = add(rag, '售后资料', text);
  const detail = rag.getDocument(document.id)!;
  assert.equal(detail.content, text); assert.ok(detail.chunks.length >= 3); assert.ok(detail.chunks.every(chunk => chunk.text.length <= 1000));
  assert.ok(detail.chunks.some(chunk => chunk.text.includes('原包装完整且未拆封')));
  assert.equal(detail.chunks.at(-1)?.section, '注意事项');
  assert.ok(rag.search('退货小票').hits.some(hit => hit.text.includes('退货需凭小票')));
  assert.equal(splitKnowledgePages('sample', [{text: '短文。', page: 2}]).length, 1);
});

test('similar chunks are diversified across documents and document-scoped previews stay scoped', t => {
  const rag = fixture(t);
  const content = '茉莉花茶的窨制需要花与茶接触，茶坯吸收花香。';
  const one = add(rag, '窨制甲', content); add(rag, '窨制乙', content);
  const other = add(rag, '窨制温度', '窨制期间要观察花堆温度，及时通花散热，避免温度过高造成品质变化。');
  const hits = rag.search('窨制', {limit: 5}).hits;
  assert.equal(hits.length, 2); assert.ok(hits.some(hit => hit.documentId === other.id));
  assert.ok(rag.search('窨制', {documentId: one.id}).hits.every(hit => hit.documentId === one.id));
});

test('body evidence outranks a short title-only cover page from the same manual', t => {
  const rag = fixture(t);
  const original = rag.ingest({title: '窨制手册', filename: 'manual.pdf', format: 'pdf', source: '培训资料', hash: digest('evidence-ranking'), warnings: [], pages: [{page: 1, text: '封面。'}, {page: 2, text: `窨制期间需控制花堆温度。${'保持通风，防止闷堆。'.repeat(70)}`}]}).document;
  rag.updateDocument(original.id, {status: 'published'}, original.version);
  assert.equal(rag.search('窨制').hits[0]?.page, 2);
});

test('legacy migration is idempotent, transactional, does not overwrite RAG edits on restart, and never touches uploads', t => {
  const rag = fixture(t), upload = add(rag, '独立文件', '独立文件的退款规则。');
  const entries = [{id: 'old', title: '手工条目', content: '窨制需要检查鲜花状态。', source: '旧资料', verified: true, updatedAt: ''}, {id: 'draft', title: '未发布资料', content: '尚待核实的窨制秘方。', source: '待核实', verified: false, updatedAt: ''}];
  rag.db.exec('BEGIN'); rag.syncEntries(entries); rag.db.exec('COMMIT');
  const migrated = rag.listDocuments().find(document => document.title === '手工条目')!;
  rag.syncEntries(entries); assert.equal(rag.getDocument(migrated.id)?.document.version, migrated.version);
  const revised = rag.updateContent(migrated.id, '更新后的保存规则需要密封。', migrated.version);
  rag.updateDocument(revised.id, {status: 'draft'}, revised.version);
  rag.syncEntries(entries); assert.match(rag.getDocument(migrated.id)!.content, /更新后的/); assert.equal(rag.getDocument(migrated.id)?.document.status, 'draft');
  assert.ok(rag.search('窨制').hits.every(hit => hit.title !== '未发布资料'));
  rag.syncEntries([{...entries[0], content: '退货需联系门店。', verified: false}]);
  assert.equal(rag.getDocument(migrated.id)?.document.status, 'draft');
  // A published upload about refunds may legitimately match the return synonym. The migrated
  // draft itself must remain absent regardless of other documents in the same library.
  assert.ok(rag.search('退货').hits.every(hit => hit.documentId !== migrated.id));
  rag.syncEntries([]); assert.equal(rag.listDocuments().length, 1); assert.equal(rag.listDocuments()[0].id, upload.id);
  assert.throws(() => rag.syncEntries([{...entries[0], content: ''}]), RagValidationError);
  assert.equal(rag.listDocuments().length, 1);
});

test('limits, missing documents, stale content updates, reindex versions and rollback are enforced', t => {
  const rag = fixture(t), doc = add(rag, '容量验证', '窨制工艺资料。');
  assert.throws(() => rag.updateContent(doc.id, '字'.repeat(500_001), doc.version), (error: unknown) => error instanceof RagValidationError && error.status === 413);
  assert.throws(() => rag.updateContent('missing', '正文', '0'), (error: unknown) => error instanceof RagValidationError && error.status === 404);
  const reindexed = rag.reindex(doc.id, doc.version); assert.notEqual(reindexed.version, doc.version);
  assert.throws(() => rag.updateContent(doc.id, '新正文', doc.version), RagConflict);
  assert.equal(rag.getDocument(doc.id)?.content, '窨制工艺资料。');
  assert.equal(rag.search('窨制').hits.length, 1);
});

test('embedding retrieval caches normalized chunk vectors, falls back safely, and never sends drafts', async t => {
  const rag = fixture(t), published = add(rag, '香气知识', '窨制能让茶坯吸收鲜花香气。');
  add(rag, '内部草稿', '绝不向外部服务发送的未核准配方。', false);
  const requests: string[][] = [];
  const fetcher = (async (_url, init) => {
    const input = JSON.parse(init!.body as string).input as string[]; requests.push(input);
    return new Response(JSON.stringify({data: input.map((_text, index) => ({index, embedding: [0.9, 0.1, 0.05]}))}), {headers: {'Content-Type': 'application/json'}});
  }) as typeof fetch;
  const options = {embedding: {baseUrl: 'https://embedding.example/v1', apiKey: 'test', model: 'test-cache'}, fetcher};
  const result = await retrieveKnowledge(rag, '花朵的气息是怎么进入茶叶的', options);
  assert.equal(result.mode, 'hybrid'); assert.equal(result.hits[0]?.documentId, published.id);
  assert.ok(requests.flat().every(text => !text.includes('未核准配方')));
  await retrieveKnowledge(rag, '花朵的气息是怎么进入茶叶的', options); assert.equal(requests.length, 1);
  assert.equal(Number(rag.db.prepare('SELECT COUNT(*) count FROM rag_embeddings').get()!.count), 1);
  const broken = await retrieveKnowledge(rag, '窨制', {...options, embedding: {...options.embedding, model: 'broken'}, fetcher: (async () => {throw new Error('provider down');}) as typeof fetch});
  assert.equal(broken.mode, 'lexical'); assert.equal(broken.hits[0]?.documentId, published.id);
});

test('asynchronous embedding results cannot return a document withdrawn or edited during the provider call', async t => {
  const rag = fixture(t); let doc = add(rag, '需撤回的知识', '窨制前检查鲜花。');
  const fetcher = (async (_url, init) => {
    const texts = JSON.parse(init!.body as string).input as string[];
    doc = rag.updateDocument(doc.id, {status: 'draft'}, doc.version);
    return new Response(JSON.stringify({data: texts.map((_text, index) => ({index, embedding: [1, 0.2]}))}));
  }) as typeof fetch;
  const result = await retrieveKnowledge(rag, '窨制', {embedding: {baseUrl: 'https://embedding.example/v1', apiKey: 'test', model: 'withdraw-test'}, fetcher});
  assert.equal(result.hits.length, 0); assert.equal(Number(rag.db.prepare('SELECT COUNT(*) count FROM rag_embeddings').get()!.count), 0);
});

test('progressive embedding coverage is truthful and a request uploads at most 32 published chunks', async t => {
  const rag = fixture(t);
  for (let index = 0; index < 40; index++) add(rag, `资料${index}`, `资料编号${index}，介绍茶叶保存与运输注意事项。`);
  const requests: string[][] = [];
  const options = {embedding: {baseUrl: 'https://embedding.example/v1', apiKey: 'test', model: 'coverage-test'}, fetcher: (async (_url, init) => {
    const texts = JSON.parse(init!.body as string).input as string[]; requests.push(texts);
    return new Response(JSON.stringify({data: texts.map((_text, index) => ({index, embedding: [0.8, 0.2]}))}));
  }) as typeof fetch};
  const first = await retrieveKnowledge(rag, '保存', options); assert.deepEqual(first.embeddingCoverage, {indexed: 32, total: 40}); assert.equal(requests[0].length, 33);
  const second = await retrieveKnowledge(rag, '保存', options); assert.deepEqual(second.embeddingCoverage, {indexed: 40, total: 40}); assert.equal(requests[1].length, 8);
  await retrieveKnowledge(rag, '保存', options); assert.equal(requests.length, 2);
});

test('embedding dimension changes and malformed provider data downgrade to lexical results', async t => {
  const rag = fixture(t), doc = add(rag, '向量维度', '窨制使用鲜花。');
  const config = {baseUrl: 'https://embedding.example/v1', apiKey: 'test', model: 'dimension-test'};
  const options = {embedding: config, fetcher: (async (_url, init) => {
    const texts = JSON.parse(init!.body as string).input as string[];
    return new Response(JSON.stringify({data: texts.map((_text, index) => ({index, embedding: [1, 0.1]}))}));
  }) as typeof fetch};
  const first = await retrieveKnowledge(rag, '窨制', options); assert.equal(first.mode, 'hybrid');
  rag.db.prepare('UPDATE rag_embeddings SET vector_json=?').run('[1,0.2,0.3]');
  const changed = await retrieveKnowledge(rag, '窨制', options); assert.equal(changed.mode, 'lexical'); assert.equal(changed.hits[0]?.documentId, doc.id);
  assert.equal(Number(rag.db.prepare('SELECT COUNT(*) count FROM rag_embeddings').get()!.count), 0);
  const rebuilt = await retrieveKnowledge(rag, '窨制', options); assert.equal(rebuilt.mode, 'hybrid');
  const malformed = await retrieveKnowledge(rag, '窨制', {...options, embedding: {...config, model: 'malformed'}, fetcher: (async () => new Response(JSON.stringify({data: [{index: 0, embedding: [1, 2]}, {index: 0, embedding: [1, 2]}]}))) as typeof fetch});
  assert.equal(malformed.mode, 'lexical'); assert.equal(malformed.hits[0]?.documentId, doc.id);
});

test('documents, FTS indexes, publication status and version checks survive database reopen', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jasmine-rag-')), path = join(directory, 'knowledge.sqlite');
  let db = new DatabaseSync(path);
  try {
    let rag = new RagStore(db); const document = add(rag, '保存指南', '保存茶叶应当密封并避免潮湿。');
    const hit = rag.search('保存茶叶').hits[0]; assert.equal(rag.isCurrentHit(hit), true);
    db.close(); db = new DatabaseSync(path); rag = new RagStore(db);
    assert.equal(rag.search('保存茶叶').hits[0]?.documentId, document.id); assert.equal(rag.isCurrentHit(hit), true);
    const next = rag.updateContent(document.id, '保存茶叶需要远离异味。', document.version); assert.equal(rag.isCurrentHit(hit), false);
    assert.throws(() => rag.reindex(document.id, document.version), RagConflict);
    assert.equal(rag.getDocument(document.id)?.document.version, next.version);
  } finally { db.close(); rmSync(directory, {recursive: true, force: true}); }
});

test('long valid sources are preserved and oversized metadata is rejected without truncation', t => {
  const rag = fixture(t), source = '来'.repeat(900);
  const document = rag.ingest({title: '来源验证', filename: 'source.txt', format: 'txt', source, hash: digest('long source'), pages: [{text: '可以检索的保存知识。'}], warnings: []}).document;
  assert.equal(document.source, source);
  assert.throws(() => rag.updateDocument(document.id, {source: '来'.repeat(1001)}, document.version), RagValidationError);
  assert.equal(rag.getDocument(document.id)?.document.source, source);
});

test('publishing requires a source, editing published text withdraws it, and archived edits remain archived', t => {
  const rag = fixture(t);
  let document = rag.ingest({title: '发布审核', filename: '', format: 'manual', source: '', hash: digest('source-required'), pages: [{text: '窨制工艺原文。'}], warnings: []}).document;
  assert.throws(() => rag.updateDocument(document.id, {status: 'published'}, document.version), RagValidationError);
  document = rag.updateDocument(document.id, {source: '品牌培训记录', status: 'published'}, document.version);
  assert.equal(rag.search('窨制').hits.length, 1);
  assert.throws(() => rag.updateDocument(document.id, {source: ''}, document.version), RagValidationError);
  document = rag.updateContent(document.id, '窨制工艺修订后的内容。', document.version);
  assert.equal(document.status, 'draft'); assert.equal(rag.search('窨制').hits.length, 0);
  document = rag.updateDocument(document.id, {status: 'archived'}, document.version);
  document = rag.updateContent(document.id, '归档中的窨制补充记录。', document.version);
  assert.equal(document.status, 'archived'); assert.equal(rag.search('窨制', {includeDraft: true}).hits.length, 0);
});
