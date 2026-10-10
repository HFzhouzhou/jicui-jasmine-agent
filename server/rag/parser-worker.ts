import {execFile} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {promisify} from 'node:util';
import {CsvError, parse as parseCsv} from 'csv-parse/sync';
import WordExtractor from 'word-extractor';
import yauzl from 'yauzl';
import {DocumentParseError, PARSER_LIMITS, type ParsedDocument} from './parser.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const OLE_SIGNATURE = Buffer.from('d0cf11e0a1b11ae1', 'hex');
const ZIP_SIGNATURE = Buffer.from('504b0304', 'hex');
const maxExpandedBytes = 64 * 1024 * 1024;
const maxEntryBytes = 16 * 1024 * 1024;

function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex -- Intentionally remove non-printing document controls.
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000\u0008\u000b\u000e-\u001f\u007f]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
}

function finish(document: ParsedDocument): ParsedDocument {
  document.pages = document.pages.map(page => ({...page, text: cleanText(page.text)})).filter(page => page.text);
  if (document.pages.reduce((sum, page) => sum + page.text.length, 0) > PARSER_LIMITS.maxCharacters) {
    throw new DocumentParseError('TEXT_TOO_LARGE', '文档文字超过 50 万字，请拆分后上传。');
  }
  if (!document.pages.length) throw new DocumentParseError('EMPTY_DOCUMENT', '未找到可导入的文字，请检查文档内容。');
  return document;
}

function decodeText(buffer: Buffer, warnings: string[]): string {
  let text: string;
  try {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) text = new TextDecoder('utf-16le', {fatal: true}).decode(buffer);
    else if (buffer[0] === 0xfe && buffer[1] === 0xff) text = new TextDecoder('utf-16be', {fatal: true}).decode(buffer);
    else text = new TextDecoder('utf-8', {fatal: true}).decode(buffer);
  } catch {
    try {
      text = new TextDecoder('gb18030', {fatal: true}).decode(buffer);
      warnings.push('文件按 GB18030 编码读取，请在预览中检查文字。');
    } catch { throw new DocumentParseError('INVALID_ENCODING', '无法识别文字编码，请另存为 UTF-8 编码后上传。'); }
  }
  // eslint-disable-next-line no-control-regex -- Reject binary bytes masquerading as a text document.
  if (/[\u0000-\u0008\u000e-\u001f]/.test(text)) throw new DocumentParseError('INVALID_SIGNATURE', '文件内容不是纯文本，请使用文件的原始格式上传。');
  if (text.length > PARSER_LIMITS.maxCharacters) throw new DocumentParseError('TEXT_TOO_LARGE', '文档文字超过 50 万字，请拆分后上传。');
  return text;
}

/** Stream every ZIP member, validating actual expansion instead of trusting directory sizes. */
async function validateDocx(buffer: Buffer): Promise<{hasImages: boolean}> {
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => yauzl.fromBuffer(buffer, {lazyEntries: true, validateEntrySizes: true, strictFileNames: true}, (error, value) => error ? reject(error) : resolve(value)));
  return new Promise((resolve, reject) => {
    let declaredTotal = 0;
    let actualTotal = 0;
    let entries = 0;
    let documentFound = false;
    let typesFound = false;
    let hasImages = false;
    let failed = false;
    const names = new Set<string>();
    const fail = (error: Error) => { if (!failed) { failed = true; zip.close(); reject(error); } };
    zip.on('error', fail);
    zip.on('entry', (entry: yauzl.Entry) => {
      if (failed) return;
      const name = entry.fileName;
      declaredTotal += entry.uncompressedSize;
      entries++;
      if (entries > 2000 || declaredTotal > maxExpandedBytes || entry.uncompressedSize > maxEntryBytes || (entry.uncompressedSize > 1024 * 1024 && entry.uncompressedSize / Math.max(entry.compressedSize, 1) > 500)) {
        fail(new DocumentParseError('ARCHIVE_TOO_LARGE', 'Word 文件解压后过大或压缩异常，请拆分或重新另存后上传。')); return;
      }
      if (names.has(name)) { fail(new DocumentParseError('INVALID_DOCUMENT', 'Word 文件包含重复部件，请重新另存为 DOCX。')); return; }
      names.add(name);
      if (entry.isEncrypted()) { fail(new DocumentParseError('ENCRYPTED_DOCUMENT', '文件已加密，请移除密码后上传。')); return; }
      if (/vbaProject|vbaData|activeX/i.test(name)) { fail(new DocumentParseError('UNSAFE_DOCUMENT', '请移除宏和活动控件，另存为普通 DOCX 文件后上传。')); return; }
      if (name.startsWith('word/media/')) hasImages = true;
      if (name.endsWith('/')) { zip.readEntry(); return; }
      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) { fail(error ?? new Error('missing zip stream')); return; }
        let entryBytes = 0;
        let carry = '';
        const capture: Buffer[] = [];
        const isXml = /\.(xml|rels)$/i.test(name);
        stream.on('data', (chunk: Buffer) => {
          entryBytes += chunk.length;
          actualTotal += chunk.length;
          if (actualTotal > maxExpandedBytes || entryBytes > maxEntryBytes) {
            stream.destroy(new DocumentParseError('ARCHIVE_TOO_LARGE', 'Word 文件解压后过大，请拆分后上传。')); return;
          }
          if (isXml) {
            const part = carry + chunk.toString('utf8');
            if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(part)) { stream.destroy(new DocumentParseError('UNSAFE_DOCUMENT', '文档含不支持的 XML 实体，请另存为普通 DOCX 后上传。')); return; }
            carry = part.slice(-128);
          }
          if (name === '[Content_Types].xml' || name === 'word/document.xml' || name === 'docProps/app.xml') capture.push(chunk);
        });
        stream.on('error', fail);
        stream.on('end', () => {
          if (failed) return;
          if (name === '[Content_Types].xml') typesFound = /wordprocessingml\.document\.main\+xml/.test(Buffer.concat(capture).toString('utf8'));
          if (name === 'word/document.xml') {
            documentFound = true;
            const xml = Buffer.concat(capture).toString('utf8');
            const breaks = (xml.match(/<w:br\b[^>]*w:type\s*=\s*["']page["']/g) ?? []).length;
            if (breaks >= PARSER_LIMITS.maxPages) { fail(new DocumentParseError('TOO_MANY_PAGES', '文档超过 200 页，请分册上传。')); return; }
          }
          if (name === 'docProps/app.xml') {
            const pages = /<(?:\w+:)?Pages>(\d+)<\//.exec(Buffer.concat(capture).toString('utf8'));
            if (pages && Number(pages[1]) > PARSER_LIMITS.maxPages) { fail(new DocumentParseError('TOO_MANY_PAGES', '文档超过 200 页，请分册上传。')); return; }
          }
          zip.readEntry();
        });
      });
    });
    zip.on('end', () => {
      if (failed) return;
      if (!documentFound || !typesFound) { fail(new DocumentParseError('INVALID_SIGNATURE', '文件不是有效的 DOCX 文档，请勿直接修改扩展名。')); return; }
      resolve({hasImages});
    });
    zip.readEntry();
  });
}

async function parseWord(buffer: Buffer, format: string): Promise<ParsedDocument> {
  const warnings: string[] = ['Word 文档按内容段落解析，引用位置使用章节，不使用排版页码。'];
  if (format === 'docx') {
    if (buffer.subarray(0, 8).equals(OLE_SIGNATURE)) throw new DocumentParseError('ENCRYPTED_DOCUMENT', '该 DOCX 可能已加密，请移除密码并另存为 DOCX 后上传。');
    if (!buffer.subarray(0, 4).equals(ZIP_SIGNATURE)) throw new DocumentParseError('INVALID_SIGNATURE', '文件内容与 DOCX 格式不符，请重新另存后上传。');
    const info = await validateDocx(buffer);
    if (info.hasImages) warnings.push('Word 内嵌图片中的文字尚未识别；重要图片请转为 PDF 后上传，以便进行 OCR。');
  } else if (!buffer.subarray(0, 8).equals(OLE_SIGNATURE)) {
    throw new DocumentParseError('INVALID_SIGNATURE', '不支持此旧版 DOC 的内部格式，请用 Word 或 LibreOffice 另存为 DOCX 后上传。');
  }
  const document = await new WordExtractor().extract(buffer);
  const pages = [
    {section: '正文', text: document.getBody()},
    {section: '脚注', text: document.getFootnotes()},
    {section: '尾注', text: document.getEndnotes()},
    {section: '页眉', text: document.getHeaders({includeFooters: false})},
    {section: '页脚', text: document.getFooters()},
    {section: '文本框', text: document.getTextboxes()},
  ];
  return finish({format, pages, warnings});
}

async function ocrPage(pdfPath: string, pageNumber: number, workdir: string): Promise<string> {
  const prefix = join(workdir, `page-${pageNumber}`);
  await execFileAsync('pdftoppm', ['-f', String(pageNumber), '-l', String(pageNumber), '-singlefile', '-scale-to', '2400', '-r', '200', '-png', pdfPath, prefix], {timeout: 20_000, maxBuffer: 65_536});
  try {
    const result = await execFileAsync('tesseract', [`${prefix}.png`, 'stdout', '-l', 'chi_sim+eng', '--psm', '3'], {timeout: 25_000, maxBuffer: 4 * 1024 * 1024, env: {...process.env, OMP_THREAD_LIMIT: '1'}});
    return cleanText(result.stdout);
  } finally { await rm(`${prefix}.png`, {force: true}); }
}

async function parsePdf(buffer: Buffer, ocrAvailable: boolean): Promise<ParsedDocument> {
  if (!/^%PDF-\d\.\d/.test(buffer.subarray(0, 16).toString('ascii'))) throw new DocumentParseError('INVALID_SIGNATURE', '文件内容与 PDF 格式不符，请使用原始 PDF 文件。');
  const {getDocument, OPS} = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfRoot = dirname(require.resolve('pdfjs-dist/package.json'));
  const loading = getDocument({
    data: new Uint8Array(buffer), disableFontFace: true, useSystemFonts: false,
    cMapUrl: join(pdfRoot, 'cmaps/'), cMapPacked: true, standardFontDataUrl: join(pdfRoot, 'standard_fonts/'),
    wasmUrl: join(pdfRoot, 'wasm/'), verbosity: 0, useWorkerFetch: false,
  });
  let workdir: string | undefined;
  try {
    const pdf = await loading.promise;
    if (pdf.numPages > PARSER_LIMITS.maxPages) throw new DocumentParseError('TOO_MANY_PAGES', 'PDF 超过 200 页，请分册上传。');
    const pages: ParsedDocument['pages'] = [];
    const warnings: string[] = [];
    const scanned: number[] = [];
    const blank: number[] = [];
    const illustrated: number[] = [];
    const imageCodes = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]);
    let totalCharacters = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      let text = '';
      let previousY: number | undefined;
      let previousEnd: number | undefined;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (previousY !== undefined && Math.abs(y - previousY) > 3 && !text.endsWith('\n')) text += '\n';
        else if (previousEnd !== undefined && item.transform[4] - previousEnd > 2 && text && !/\s$/.test(text)) text += ' ';
        text += item.str;
        if (item.hasEOL) text += '\n';
        previousY = y;
        previousEnd = item.transform[4] + item.width;
      }
      text = cleanText(text);
      const operations = await page.getOperatorList();
      const hasImage = operations.fnArray.some(code => imageCodes.has(code));
      const textLength = text.replace(/\s/g, '').length;
      const suspiciousCharacters = (text.match(/[\ufffd\ue000-\uf8ff]/g) ?? []).length;
      if (textLength < 80 || suspiciousCharacters > textLength * 0.2) {
        if (hasImage) {
          if (ocrAvailable) {
            if (!workdir) {
              workdir = await mkdtemp(join(process.argv[4], 'ocr-'));
              await writeFile(join(workdir, 'document.pdf'), buffer, {mode: 0o600});
            }
            const recognized = await ocrPage(join(workdir, 'document.pdf'), number, workdir);
            if (recognized) { text = recognized; warnings.push(`第 ${number} 页通过 OCR 识别，请核对专有名词、数字和配方。`); }
            else scanned.push(number);
          } else scanned.push(number);
        } else if (!text) blank.push(number);
      } else if (hasImage) illustrated.push(number);
      totalCharacters += text.length;
      if (totalCharacters > PARSER_LIMITS.maxCharacters) throw new DocumentParseError('TEXT_TOO_LARGE', '文档文字超过 50 万字，请拆分后上传。');
      if (text) pages.push({text, page: number});
      page.cleanup();
    }
    if (scanned.length) {
      const listed = scanned.slice(0, 20).join('、') + (scanned.length > 20 ? ' 等' : '');
      if (!pages.length) throw new DocumentParseError('OCR_REQUIRED', ocrAvailable ? '扫描页未识别到文字，请使用更清晰的扫描件或带文字层的 PDF。' : '这份 PDF 是扫描件，需要安装中文 OCR（Poppler、Tesseract 及 chi_sim + eng 语言包），或先转为带文字层的 PDF。');
      warnings.push(`第 ${listed} 页存在未识别的扫描图片，相关内容未完整导入。${ocrAvailable ? '请上传更清晰的页面。' : '请启用中文 OCR 或补充带文字层的 PDF。'}`);
    }
    if (blank.length) warnings.push(`第 ${blank.slice(0, 20).join('、')}${blank.length > 20 ? ' 等' : ''} 页未提取到文字，请核对是否为空白页、轮廓文字或图表。`);
    if (illustrated.length) warnings.push(`第 ${illustrated.slice(0, 20).join('、')}${illustrated.length > 20 ? ' 等' : ''} 页包含插图，已提取文字层；插图内部文字未单独识别，请检查预览。`);
    return finish({format: 'pdf', pages, warnings});
  } finally {
    await loading.destroy();
    if (workdir) await rm(workdir, {recursive: true, force: true});
  }
}

async function parse(buffer: Buffer, format: string, ocrAvailable: boolean): Promise<ParsedDocument> {
  if (buffer.length > PARSER_LIMITS.maxBytes) throw new DocumentParseError('FILE_TOO_LARGE', '单个文件不能超过 20 MB。');
  if (format === 'pdf') return parsePdf(buffer, ocrAvailable);
  if (format === 'docx' || format === 'doc') return parseWord(buffer, format);
  if (buffer.subarray(0, 4).equals(ZIP_SIGNATURE) || buffer.subarray(0, 8).equals(OLE_SIGNATURE) || buffer.subarray(0, 5).toString() === '%PDF-') {
    throw new DocumentParseError('INVALID_SIGNATURE', '文件内容与扩展名不符，请使用原始文件格式上传。');
  }
  const warnings: string[] = [];
  const text = decodeText(buffer, warnings);
  if (format === 'csv') {
    const rows = parseCsv(text, {bom: true, skip_empty_lines: true, max_record_size: 100_000}) as string[][];
    if (!rows.length) return finish({format, pages: [], warnings});
    const headers = rows[0];
    const structured = rows.slice(1).map(row => row.map((cell, index) => `${headers[index] || `第 ${index + 1} 列`}：${cell}`).join('；')).join('\n');
    return finish({format, pages: [{text: structured || headers.join('；'), section: '数据表'}], warnings});
  }
  if (format === 'md') {
    const pages: ParsedDocument['pages'] = [];
    let section = '正文';
    let lines: string[] = [];
    let fence: string | undefined;
    for (const line of text.split('\n')) {
      const codeFence = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      if (codeFence && (!fence || codeFence.startsWith(fence[0]))) fence = fence ? undefined : codeFence;
      const heading = !fence && /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) { if (lines.join('\n').trim()) pages.push({section, text: lines.join('\n')}); section = heading[1]; lines = [line]; }
      else lines.push(line);
    }
    pages.push({section, text: lines.join('\n')});
    return finish({format, pages, warnings});
  }
  return finish({format, pages: [{text, section: '正文'}], warnings});
}

try {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > PARSER_LIMITS.maxBytes) throw new DocumentParseError('FILE_TOO_LARGE', '单个文件不能超过 20 MB。');
    chunks.push(chunk);
  }
  const document = await parse(Buffer.concat(chunks), process.argv[2], process.argv[3] === 'ocr');
  process.stdout.write(JSON.stringify({document}));
} catch (error) {
  let result = error instanceof DocumentParseError ? error : new DocumentParseError('INVALID_DOCUMENT', '无法解析该文件，可能已损坏或格式不受支持；请用原软件另存为 PDF / DOCX 后重试。');
  if (error instanceof Error && /password|encrypt/i.test(`${error.name} ${error.message}`)) result = new DocumentParseError('ENCRYPTED_DOCUMENT', '文件已加密，请移除密码后上传。');
  if (error instanceof CsvError) result = new DocumentParseError('INVALID_CSV', 'CSV 的引号、列数或记录长度不正确，请检查表格后重新导出。');
  process.stdout.write(JSON.stringify({error: {code: result.code, message: result.message}}));
}
