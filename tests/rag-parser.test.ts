import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {DocumentParseError, MAX_FILE_BYTES, parseDocument, parserCapabilities} from '../server/rag/parser.js';
import {docxFixture, pdfFixture, zipFixture} from './fixtures/rag/documents.js';

const rejection = (code: string) => (error: unknown) => {
  assert.ok(error instanceof DocumentParseError);
  assert.equal(error.code, code);
  assert.ok(error.message.length > 5);
  assert.ok(error.status >= 400);
  return true;
};

test('real PDF extraction preserves page provenance and actual text', async () => {
  const result = await parseDocument(pdfFixture([{text: 'Jasmine tea belongs to scented tea.'}, {text: 'Keep the opened tea dry and sealed.'}]), 'brand-guide.PDF');
  assert.equal(result.format, 'pdf');
  assert.deepEqual(result.pages.map(page => page.page), [1, 2]);
  assert.match(result.pages[0].text, /Jasmine tea/);
  assert.match(result.pages[1].text, /dry and sealed/);
});

test('real DOCX extraction preserves Chinese paragraphs, table cells and table rows', async () => {
  const fixture = docxFixture('<w:p><w:r><w:t>茉莉花茶知识手册</w:t></w:r></w:p><w:p><w:r><w:t>冷藏保存，开封后尽快饮用。</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>产品</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>价格</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>东方茉莉白</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>13元</w:t></w:r></w:p></w:tc></w:tr></w:tbl>');
  const result = await parseDocument(fixture, '产品手册.docx');
  assert.equal(result.format, 'docx');
  assert.match(result.pages[0].text, /茉莉花茶知识手册\n冷藏保存/);
  assert.match(result.pages[0].text, /产品\t价格\n东方茉莉白\t13元/);
  assert.equal(result.pages[0].section, '正文');
  assert.equal(result.pages[0].page, undefined);
});

test('real legacy OLE DOC extracts actual body text without Word or LibreOffice', async () => {
  const fixture = await readFile(new URL('./fixtures/rag/word-extractor-test01.doc', import.meta.url));
  const result = await parseDocument(fixture, 'legacy.doc');
  assert.equal(result.format, 'doc');
  assert.match(result.pages[0].text, /test|document/i);
  assert.ok(result.pages[0].text.length > 20);
});

test('UTF-8 and UTF-16 text, Markdown sections, quoted multiline CSV are parsed', async () => {
  const plain = await parseDocument(Buffer.from('茶叶保存\r\n避免潮湿和异味。'), '保存.txt');
  assert.equal(plain.pages[0].text, '茶叶保存\n避免潮湿和异味。');
  const utf16 = await parseDocument(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('中文说明', 'utf16le')]), '中文.txt');
  assert.equal(utf16.pages[0].text, '中文说明');
  const markdown = await parseDocument(Buffer.from('# 茶叶\n花香清雅\n## 保存\n密封\n```\n# 示例内容\n```'), '手册.md');
  assert.deepEqual(markdown.pages.map(page => page.section), ['茶叶', '保存']);
  assert.match(markdown.pages[1].text, /# 示例内容/);
  const csv = await parseDocument(Buffer.from('名称,说明\n东方茉莉白,"清香,鲜乳\n冷藏"'), '菜单.csv');
  assert.match(csv.pages[0].text, /名称：东方茉莉白；说明：清香,鲜乳\n冷藏/);
  await assert.rejects(parseDocument(Buffer.from('a,b\n"unclosed'), 'bad.csv'), rejection('INVALID_CSV'));
});

test('file signature, corruption, encrypted PDF and empty documents produce readable errors', async () => {
  await assert.rejects(parseDocument(Buffer.from('hello'), 'fake.pdf'), rejection('INVALID_SIGNATURE'));
  await assert.rejects(parseDocument(Buffer.from('%PDF-1.4\ninvalid'), 'broken.pdf'), rejection('INVALID_DOCUMENT'));
  await assert.rejects(parseDocument(pdfFixture([{text: 'secret'}], true), 'encrypted.pdf'), rejection('ENCRYPTED_DOCUMENT'));
  await assert.rejects(parseDocument(Buffer.from('hello'), 'fake.docx'), rejection('INVALID_SIGNATURE'));
  await assert.rejects(parseDocument(Buffer.from('hello'), 'fake.doc'), rejection('INVALID_SIGNATURE'));
  await assert.rejects(parseDocument(Buffer.from('hello'), 'script.exe'), rejection('UNSUPPORTED_FORMAT'));
  await assert.rejects(parseDocument(Buffer.alloc(0), 'empty.txt'), rejection('EMPTY_DOCUMENT'));
  await assert.rejects(parseDocument(Buffer.from(' \n\t '), 'blank.txt'), rejection('EMPTY_DOCUMENT'));
  await assert.rejects(parseDocument(docxFixture(), 'disguised.txt'), rejection('INVALID_SIGNATURE'));
  await assert.rejects(parseDocument(Buffer.from([1, 2, 0, 0, 3]), 'binary.txt'), rejection('INVALID_SIGNATURE'));
});

test('file, text and PDF page limits are enforced before publishing content', async () => {
  await assert.rejects(parseDocument(Buffer.alloc(MAX_FILE_BYTES + 1), 'large.txt'), rejection('FILE_TOO_LARGE'));
  await assert.rejects(parseDocument(Buffer.from('茶'.repeat(500_001)), 'large.txt'), rejection('TEXT_TOO_LARGE'));
  await assert.rejects(parseDocument(pdfFixture(Array.from({length: 201}, () => ({text: 'Page'}))), 'long.pdf'), rejection('TOO_MANY_PAGES'));
  await assert.rejects(parseDocument(docxFixture(undefined, [['docProps/app.xml', '<Properties><Pages>201</Pages></Properties>']]), 'long.docx'), rejection('TOO_MANY_PAGES'));
});

test('DOCX rejects zip bombs, duplicate members, XML entities, macros and renamed archives', async () => {
  await assert.rejects(parseDocument(docxFixture(undefined, [['word/media/bomb.bin', Buffer.alloc(17 * 1024 * 1024)]], true), 'bomb.docx'), rejection('ARCHIVE_TOO_LARGE'));
  await assert.rejects(parseDocument(docxFixture(undefined, [['word/document.xml', '<x/>']]), 'duplicate.docx'), rejection('INVALID_DOCUMENT'));
  await assert.rejects(parseDocument(docxFixture(undefined, [['word/evil.xml', '<!DOCTYPE root [<!ENTITY x SYSTEM "file:///etc/passwd">]><root>&x;</root>']]), 'entity.docx'), rejection('UNSAFE_DOCUMENT'));
  await assert.rejects(parseDocument(docxFixture(undefined, [['word/vbaProject.bin', 'macros']]), 'macro.docx'), rejection('UNSAFE_DOCUMENT'));
  await assert.rejects(parseDocument(zipFixture([['hello.txt', 'not word']]), 'archive.docx'), rejection('INVALID_SIGNATURE'));
});

test('Word external links and embedded pictures never fetch resources and pictures raise a warning', async () => {
  const document = docxFixture('<w:p><w:hyperlink r:id="rIdExternal" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:r><w:t>仅保留链接文字</w:t></w:r></w:hyperlink></w:p>', [
    ['word/_rels/document.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdExternal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="http://127.0.0.1:1/private" TargetMode="External"/></Relationships>'],
    ['word/media/unused.png', Buffer.from('not decoded or executed')],
  ]);
  const result = await parseDocument(document, 'external.docx');
  assert.equal(result.pages[0].text, '仅保留链接文字');
  assert.ok(result.warnings.some(warning => warning.includes('内嵌图片')));
});

test('scanned PDFs never silently disappear; text pages survive with missing-scan warnings', async () => {
  const capabilities = await parserCapabilities();
  assert.deepEqual(capabilities.formats, ['pdf', 'docx', 'doc', 'txt', 'md', 'csv']);
  assert.equal(typeof capabilities.ocrAvailable, 'boolean');
  // A black pixel contains no words even when OCR is installed.
  await assert.rejects(parseDocument(pdfFixture([{image: true}]), 'scan.pdf'), rejection('OCR_REQUIRED'));
  const mixed = await parseDocument(pdfFixture([{text: 'This is the readable first page about jasmine.'}, {image: true}]), 'mixed.pdf');
  assert.equal(mixed.pages.length, 1);
  assert.equal(mixed.pages[0].page, 1);
  assert.ok(mixed.warnings.some(warning => warning.includes('第 2 页') && warning.includes('未识别')));
});

test('cancellation stops the isolated parser and successful parses leave no temporary files', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(parseDocument(Buffer.from('cancel'), 'cancel.txt', controller.signal), rejection('PARSE_ABORTED'));
  const before = new Set((await readdir(tmpdir())).filter(name => name.startsWith('jasmine-parse-')));
  const during = new AbortController();
  const pending = parseDocument(pdfFixture(Array.from({length: 200}, () => ({text: 'Jasmine document.'}))), 'cancel.pdf', during.signal);
  setTimeout(() => during.abort(), 20);
  await assert.rejects(pending, rejection('PARSE_ABORTED'));
  await parseDocument(Buffer.from('temporary cleanup'), 'cleanup.txt');
  const after = (await readdir(tmpdir())).filter(name => name.startsWith('jasmine-parse-') && !before.has(name));
  assert.deepEqual(after, []);
});
