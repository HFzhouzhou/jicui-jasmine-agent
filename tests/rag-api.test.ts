import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createApp} from '../server/index.js';
import type {Store} from '../server/database.js';
import type {KnowledgeDocument, KnowledgeDocumentDetail, KnowledgeOverview, KnowledgeSearchResult} from '../shared/rag.js';
import {MAX_FILE_BYTES} from '../server/rag/parser.js';
import {docxFixture, pdfFixture} from './fixtures/rag/documents.js';

const adminToken = 'rag-api-tests-private-administrator-token';
const api = '/api/admin/rag';
type JsonResponse = Omit<Response, 'json'> & {json(): Promise<any>};

async function setup(t: TestContext) {
  const app = createApp({databasePath: ':memory:', config: {apiKey: '', embedding: undefined, adminToken, staticDir: '/tmp/jasmine-rag-tests-no-static'}, fetcher: async () => {throw new Error('RAG upload must not call a remote model');}});
  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {const instance = app.listen(0, '127.0.0.1', () => resolve(instance));});
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  t.after(async () => {
    app.locals.abortActiveParsers();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    app.locals.close();
  });
  const request = async (path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', authenticated = true) => await fetch(`${origin}${path}`, {
    method, headers: {'Content-Type': 'application/json', ...(authenticated ? {Authorization: `Bearer ${adminToken}`} : {})}, ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  }) as JsonResponse;
  const upload = async (buffer: Buffer, filename: string, metadata: Record<string, string> = {}, authenticated = true) => {
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(buffer)]), filename);
    for (const [key, value] of Object.entries(metadata)) form.set(key, value);
    return await fetch(`${origin}${api}/documents`, {method: 'POST', headers: authenticated ? {Authorization: `Bearer ${adminToken}`} : {}, body: form}) as JsonResponse;
  };
  const manual = async (overrides: Record<string, unknown> = {}) => {
    const response = await request(`${api}/text`, {title: '茉莉花茶保存指南', source: '品牌培训手册', content: '茉莉花茶应密封保存，避免潮湿和异味。开封后尽快饮用。', ...overrides});
    assert.equal(response.status, 201);
    return (await response.json()).document as KnowledgeDocument;
  };
  const search = async (query: string, options: Record<string, unknown> = {}) => {
    const response = await request(`${api}/search`, {query, ...options});
    assert.equal(response.status, 200);
    return await response.json() as KnowledgeSearchResult;
  };
  return {app, origin, request, upload, manual, search, store: app.locals.store as Store};
}

test('RAG administration requires authentication and capabilities never expose credentials', async t => {
  const {origin, request, upload, store} = await setup(t);
  const initial = store.rag.stats().documents;
  for (const path of [api, `${api}/documents/unknown`, `${api}/documents/unknown/file`]) {
    assert.equal((await request(path, undefined, 'GET', false)).status, 401);
  }
  assert.equal((await request(`${api}/text`, {title: '无权写入', source: '', content: '无权写入'}, 'POST', false)).status, 401);
  assert.equal((await upload(Buffer.from('不得导入'), 'private.txt', {}, false)).status, 401);
  assert.equal(store.rag.stats().documents, initial);
  const invalid = await fetch(`${origin}${api}`, {headers: {Authorization: 'Bearer invalid-token'}});
  assert.equal(invalid.status, 401);
  const overview = await request(api);
  assert.equal(overview.status, 200);
  const text = await overview.text();
  assert.ok(!text.includes(adminToken));
  const data = JSON.parse(text) as KnowledgeOverview;
  assert.deepEqual(data.capabilities.formats, ['pdf', 'docx', 'doc', 'txt', 'md', 'csv']);
  assert.equal(data.capabilities.maxFileBytes, MAX_FILE_BYTES);
  assert.equal(typeof data.capabilities.ocrAvailable, 'boolean');
  assert.equal(data.capabilities.embeddingsConfigured, false);
});

test('real Chinese TXT multipart upload creates a draft and original downloads preserve bytes privately', async t => {
  const {request, upload} = await setup(t);
  const buffer = Buffer.from('\ufeff茉莉花茶储存手册\r\n请保持容器干燥，密封后避光保存。');
  const response = await upload(buffer, '中文保存说明.txt', {title: '门店保存说明', source: '培训部文件'});
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.duplicate, false);
  const document = result.document as KnowledgeDocument;
  assert.equal(document.filename, '中文保存说明.txt');
  assert.equal(document.title, '门店保存说明');
  assert.equal(document.source, '培训部文件');
  assert.equal(document.status, 'draft');
  assert.equal(document.format, 'txt');
  assert.match(document.hash, /^[a-f0-9]{64}$/);
  const detail = await (await request(`${api}/documents/${document.id}`)).json() as KnowledgeDocumentDetail;
  assert.match(detail.content, /储存手册\n请保持容器干燥/);
  assert.ok(detail.chunks.length > 0);
  const denied = await request(`${api}/documents/${document.id}/file`, undefined, 'GET', false);
  assert.equal(denied.status, 401);
  const file = await request(`${api}/documents/${document.id}/file`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/octet-stream');
  assert.match(file.headers.get('content-disposition')!, /attachment;.*filename\*=UTF-8''/);
  assert.match(file.headers.get('content-security-policy')!, /sandbox/);
  assert.equal(file.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), buffer);
});

test('real DOCX multipart import preserves paragraphs and tables and identical reuploads deduplicate', async t => {
  const {request, upload, store} = await setup(t);
  const buffer = docxFixture('<w:p><w:r><w:t>东方茉莉茶培训资料</w:t></w:r></w:p><w:p><w:r><w:t>以下为产品规格。</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>容量</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>500毫升</w:t></w:r></w:p></w:tc></w:tr></w:tbl>');
  const response = await upload(buffer, '产品培训.docx');
  assert.equal(response.status, 201);
  const {document} = await response.json() as {document: KnowledgeDocument};
  const detail = await (await request(`${api}/documents/${document.id}`)).json() as KnowledgeDocumentDetail;
  assert.match(detail.content, /培训资料\n以下为产品规格/);
  assert.match(detail.content, /容量\t500毫升/);
  assert.equal(document.title, '产品培训');
  assert.equal(document.source, '产品培训.docx');
  const before = store.rag.stats();
  const duplicate = await upload(buffer, '另一个文件名.docx', {title: '不覆盖原来的标题'});
  assert.equal(duplicate.status, 200);
  const existing = await duplicate.json();
  assert.equal(existing.duplicate, true);
  assert.equal(existing.document.id, document.id);
  assert.equal(existing.document.title, document.title);
  assert.deepEqual(store.rag.stats(), before);
  const count = store.db.prepare('SELECT COUNT(*) n FROM rag_originals WHERE document_id=?').get(document.id)!;
  assert.equal(count.n, 1);
});

test('invalid files and multipart limits fail without adding partial documents and release the import lock', async t => {
  const {origin, request, upload, store} = await setup(t);
  const before = store.rag.stats().documents;
  const cases: [Buffer, string, number, string][] = [
    [Buffer.from('not a PDF'), 'fake.pdf', 422, 'INVALID_SIGNATURE'],
    [Buffer.alloc(0), 'empty.txt', 422, 'EMPTY_DOCUMENT'],
    [Buffer.from('not executable'), 'script.exe', 422, 'UNSUPPORTED_FORMAT'],
    [Buffer.from('茶'.repeat(500_001)), 'too-many-characters.txt', 413, 'TEXT_TOO_LARGE'],
    [Buffer.alloc(MAX_FILE_BYTES + 1), 'too-large.txt', 413, 'LIMIT_FILE_SIZE'],
  ];
  for (const [buffer, filename, status, code] of cases) {
    const response = await upload(buffer, filename);
    assert.equal(response.status, status, filename);
    assert.equal((await response.json()).error.code, code, filename);
    assert.equal(store.rag.stats().documents, before);
  }
  const multiple = new FormData();
  multiple.append('file', new Blob(['first']), 'first.txt');
  multiple.append('file', new Blob(['second']), 'second.txt');
  assert.equal((await fetch(`${origin}${api}/documents`, {method: 'POST', headers: {Authorization: `Bearer ${adminToken}`}, body: multiple})).status, 400);
  const missing = await request(`${api}/documents`, {});
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).error.code, 'FILE_REQUIRED');
  const recovered = await upload(Buffer.from('错误之后仍然可以正常导入。'), 'recovered.txt');
  assert.equal(recovered.status, 201);
});

test('publishing, withdrawing and archiving immediately change search visibility', async t => {
  const {request, manual, search} = await setup(t);
  let document = await manual();
  const options = {documentId: document.id};
  assert.equal((await search('茉莉花茶保存', options)).hits.length, 0);
  assert.ok((await search('茉莉花茶保存', {...options, includeDraft: true})).hits.length > 0);
  let result = await request(`${api}/documents/${document.id}`, {status: 'published', expectedVersion: document.version}, 'PATCH');
  assert.equal(result.status, 200); document = (await result.json()).document;
  assert.ok((await search('茉莉花茶保存', options)).hits.every(hit => hit.documentVersion === document.version));
  assert.ok((await search('茉莉花茶保存', options)).hits.length > 0);
  result = await request(`${api}/documents/${document.id}`, {status: 'draft', expectedVersion: document.version}, 'PATCH');
  assert.equal(result.status, 200); document = (await result.json()).document;
  assert.equal((await search('茉莉花茶保存', options)).hits.length, 0);
  result = await request(`${api}/documents/${document.id}`, {status: 'archived', expectedVersion: document.version}, 'PATCH');
  assert.equal(result.status, 200);
  assert.equal((await search('茉莉花茶保存', {...options, includeDraft: true})).hits.length, 0);
});

test('reindex changes the version, rejects stale writes and preserves current source content', async t => {
  const {request, manual} = await setup(t);
  const original = await manual();
  const rebuilt = await request(`${api}/documents/${original.id}/reindex`, {expectedVersion: original.version});
  assert.equal(rebuilt.status, 200);
  const newer = (await rebuilt.json()).document as KnowledgeDocument;
  assert.notEqual(newer.version, original.version);
  assert.equal(newer.chunkCount, original.chunkCount);
  assert.equal(newer.status, original.status);
  const stale = await request(`${api}/documents/${original.id}/reindex`, {expectedVersion: original.version});
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error.code, 'STALE_WRITE');
  const staleTitle = await request(`${api}/documents/${original.id}`, {title: '过期覆盖', expectedVersion: original.version}, 'PATCH');
  assert.equal(staleTitle.status, 409);
  const detail = await (await request(`${api}/documents/${original.id}`)).json() as KnowledgeDocumentDetail;
  assert.equal(detail.document.title, original.title);
  assert.equal(detail.document.version, newer.version);
  assert.match(detail.content, /密封保存/);
});

test('editing published PDF text withdraws it automatically and drops invalid original page references', async t => {
  const {request, upload, search} = await setup(t);
  const uploaded = await upload(pdfFixture([{text: 'Jasmine storage: keep sealed and dry.'}, {text: 'Avoid direct sunlight during storage.'}]), 'storage.pdf');
  assert.equal(uploaded.status, 201);
  let document = (await uploaded.json()).document as KnowledgeDocument;
  assert.equal(document.pageCount, 2);
  const published = await request(`${api}/documents/${document.id}`, {status: 'published', expectedVersion: document.version}, 'PATCH');
  assert.equal(published.status, 200); document = (await published.json()).document;
  const before = await search('jasmine storage', {documentId: document.id});
  assert.ok(before.hits.some(hit => hit.page === 1));
  const edited = await request(`${api}/documents/${document.id}/content`, {content: '修订后的保存方式：使用防潮容器密封保存。', expectedVersion: document.version}, 'PUT');
  assert.equal(edited.status, 200);
  const revised = (await edited.json()).document as KnowledgeDocument;
  assert.equal(revised.status, 'draft');
  assert.equal(revised.pageCount, 0);
  assert.ok(revised.warnings.some(warning => warning.includes('原文页码不再适用')));
  assert.equal((await search('保存', {documentId: document.id})).hits.length, 0);
  const detail = await (await request(`${api}/documents/${document.id}`)).json() as KnowledgeDocumentDetail;
  assert.equal(detail.content, '修订后的保存方式：使用防潮容器密封保存。');
  assert.ok(detail.chunks.every(chunk => chunk.page === undefined));
  const stale = await request(`${api}/documents/${document.id}/content`, {content: '错误覆盖', expectedVersion: document.version}, 'PUT');
  assert.equal(stale.status, 409);
});

test('legacy public knowledge never exposes withdrawn or outdated RAG content', async t => {
  const {request, store} = await setup(t);
  store.setKnowledge([{id: 'legacy_review', title: '旧版保存说明', content: '旧内容：请密封保存。', source: '培训部', verified: true, updatedAt: ''}]);
  const row = store.db.prepare('SELECT id FROM rag_documents WHERE legacy_id=?').get('legacy_review')!;
  const id = row.id as string;
  let document = store.rag.getDocument(id)!.document;
  const initial = await (await request('/api/knowledge', undefined, 'GET', false)).json();
  assert.equal(initial.entries.find((entry: {id: string}) => entry.id === 'legacy_review').content, '旧内容：请密封保存。');
  const withdrawn = await request(`${api}/documents/${id}`, {status: 'archived', expectedVersion: document.version}, 'PATCH');
  assert.equal(withdrawn.status, 200); document = (await withdrawn.json()).document;
  const hidden = await (await request('/api/knowledge', undefined, 'GET', false)).json();
  assert.ok(!hidden.entries.some((entry: {id: string}) => entry.id === 'legacy_review'));
  let response = await request(`${api}/documents/${id}/content`, {content: '修订内容：避免潮湿，保持密封。', expectedVersion: document.version}, 'PUT');
  assert.equal(response.status, 200); document = (await response.json()).document;
  response = await request(`${api}/documents/${id}`, {status: 'published', expectedVersion: document.version}, 'PATCH');
  assert.equal(response.status, 200);
  const latest = await (await request('/api/knowledge', undefined, 'GET', false)).json();
  assert.equal(latest.entries.find((entry: {id: string}) => entry.id === 'legacy_review').content, '修订内容：避免潮湿，保持密封。');
  assert.ok(!JSON.stringify(latest).includes('旧内容：请密封保存'));
});

test('the 200 MB original-file quota rejects new files atomically but allows duplicate lookup', async t => {
  const {upload, store} = await setup(t);
  const buffer = Buffer.from('可重复上传的培训资料。');
  const first = await upload(buffer, 'first.txt');
  assert.equal(first.status, 201);
  const document = (await first.json()).document as KnowledgeDocument;
  // Exercise quota accounting without allocating hundreds of megabytes in the test database.
  store.db.prepare('UPDATE rag_originals SET bytes=? WHERE document_id=?').run(200 * 1024 * 1024, document.id);
  const stats = store.rag.stats();
  const rejected = await upload(Buffer.from('这是另一份新资料。'), 'other.txt');
  assert.equal(rejected.status, 413);
  assert.equal((await rejected.json()).error.code, 'KNOWLEDGE_STORAGE_FULL');
  assert.deepEqual(store.rag.stats(), stats);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM rag_originals').get()!.n, 1);
  const duplicate = await upload(buffer, 'first-again.txt');
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);
});

test('strict metadata, content, search and version validation rejects invalid admin input', async t => {
  const {request, upload, manual} = await setup(t);
  const document = await manual();
  for (const body of [
    {title: '', source: '手册', content: '正文'},
    {title: '标题', source: '手册', content: ''},
    {title: '标题', source: '手册', content: '正文', publish: true},
    {title: '标题', source: '手册', content: '字'.repeat(500_001)},
  ]) assert.equal((await request(`${api}/text`, body)).status, 400);
  for (const body of [
    {status: 'published'}, {expectedVersion: document.version},
    {status: 'unknown', expectedVersion: document.version},
    {title: '', expectedVersion: document.version},
    {source: 'x'.repeat(1001), expectedVersion: document.version},
    {filename: '../../private.env', expectedVersion: document.version},
  ]) assert.equal((await request(`${api}/documents/${document.id}`, body, 'PATCH')).status, 400);
  for (const body of [{query: ''}, {query: '保存', limit: 13}, {query: '保存', includeDraft: 'true'}, {query: '保存', secret: true}]) {
    assert.equal((await request(`${api}/search`, body)).status, 400);
  }
  assert.equal((await request(`${api}/documents/${document.id}/reindex`, {})).status, 400);
  assert.equal((await request(`${api}/documents/${document.id}/content`, {content: '', expectedVersion: document.version}, 'PUT')).status, 400);
  assert.equal((await upload(Buffer.from('正文'), 'metadata.txt', {source: '来源', unknown: '无效字段'})).status, 400);
  assert.equal((await request(`${api}/documents/not-found`)).status, 404);
  assert.equal((await request(`${api}/documents/not-found/file`)).status, 404);
  assert.equal((await request(`${api}/documents/${document.id}/file`)).status, 404);
  const withoutSource = await manual({title: '无来源手册', source: ''});
  const publish = await request(`${api}/documents/${withoutSource.id}`, {status: 'published', expectedVersion: withoutSource.version}, 'PATCH');
  assert.equal(publish.status, 400);
});
