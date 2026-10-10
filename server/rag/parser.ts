import {spawn, execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

export interface ParsedDocument {
  format: string;
  pages: {text: string; page?: number; section?: string}[];
  warnings: string[];
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const PARSER_LIMITS = {maxBytes: MAX_FILE_BYTES, maxPages: 200, maxCharacters: 500_000, timeoutMs: 180_000} as const;
export const DOCUMENT_FORMATS = ['pdf', 'docx', 'doc', 'txt', 'md', 'csv'] as const;

export class DocumentParseError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DocumentParseError';
    this.code = code;
    this.status = /TOO_LARGE|TOO_MANY_PAGES/.test(code) ? 413 : code === 'PARSER_UNAVAILABLE' ? 503 : code === 'PARSE_ABORTED' ? 499 : 422;
  }
}

const execFileAsync = promisify(execFile);
let capabilityCache: {expires: number; promise: Promise<{formats: string[]; ocrAvailable: boolean}>} | undefined;

/** OCR stays on this server. Neither documents nor page images are sent to a model provider. */
export function parserCapabilities(): Promise<{formats: string[]; ocrAvailable: boolean}> {
  if (capabilityCache && capabilityCache.expires > Date.now()) return capabilityCache.promise;
  const promise = (async () => {
    try {
      const [, languages] = await Promise.all([
        execFileAsync('pdftoppm', ['-v'], {timeout: 5_000, maxBuffer: 65_536}),
        execFileAsync('tesseract', ['--list-langs'], {timeout: 5_000, maxBuffer: 65_536}),
      ]);
      const available = `${languages.stdout}\n${languages.stderr}`.split(/\s+/);
      return {formats: [...DOCUMENT_FORMATS], ocrAvailable: available.includes('chi_sim') && available.includes('eng')};
    } catch {
      return {formats: [...DOCUMENT_FORMATS], ocrAvailable: false};
    }
  })();
  capabilityCache = {expires: Date.now() + 60_000, promise};
  return promise;
}

function workerFile(): string {
  // Source execution and the bundled production entry have different locations.
  const candidates = ['./parser-worker.ts', './parser-worker.js', './rag/parser-worker.js'];
  for (const relative of candidates) {
    const candidate = fileURLToPath(new URL(relative, import.meta.url));
    if (existsSync(candidate)) return candidate;
  }
  throw new DocumentParseError('PARSER_UNAVAILABLE', '文档解析服务未完整安装，请重新构建服务。');
}

/** A disposable process isolates CPU-heavy parsers and provides a hard timeout and heap cap. */
export async function parseDocument(buffer: Buffer, filename: string, signal?: AbortSignal): Promise<ParsedDocument> {
  if (signal?.aborted) throw new DocumentParseError('PARSE_ABORTED', '文档解析已取消。');
  if (buffer.length > PARSER_LIMITS.maxBytes) throw new DocumentParseError('FILE_TOO_LARGE', '单个文件不能超过 20 MB。');
  if (!buffer.length) throw new DocumentParseError('EMPTY_DOCUMENT', '文件为空，请上传有文字内容的文档。');
  const format = extname(filename).slice(1).toLowerCase();
  if (!(DOCUMENT_FORMATS as readonly string[]).includes(format)) {
    throw new DocumentParseError('UNSUPPORTED_FORMAT', '支持 PDF、Word（DOCX / DOC）、TXT、Markdown 和 CSV 文件。');
  }
  const entry = workerFile();
  const capabilities = await parserCapabilities();
  const workdir = await mkdtemp(join(tmpdir(), 'jasmine-parse-'));
  return new Promise<ParsedDocument>((resolve, reject) => {
    // Do not copy application credentials into parser subprocesses.
    const env = Object.fromEntries(['PATH', 'TMPDIR', 'TEMP', 'SYSTEMROOT', 'TESSDATA_PREFIX'].flatMap(key => process.env[key] ? [[key, process.env[key]!]] : []));
    const loader = entry.endsWith('.ts') ? ['--import', import.meta.resolve('tsx')] : [];
    const child = spawn(process.execPath, ['--max-old-space-size=256', ...loader, entry, format, capabilities.ocrAvailable ? 'ocr' : 'no-ocr', workdir], {
      env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32',
    });
    const output: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const kill = () => {
      try {
        if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch { /* The process may already have exited. */ }
    };
    const fail = (error: DocumentParseError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      kill();
      reject(error);
    };
    const timer = setTimeout(() => fail(new DocumentParseError('PARSE_TIMEOUT', '解析时间过长，请按章节拆分文件后重试；扫描文件可先进行 OCR。')), PARSER_LIMITS.timeoutMs);
    const abort = () => fail(new DocumentParseError('PARSE_ABORTED', '文档解析已取消。'));
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) abort();
    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > 8 * 1024 * 1024) fail(new DocumentParseError('TEXT_TOO_LARGE', '文档文字超过 50 万字，请拆分后上传。'));
      else output.push(chunk);
    });
    // Parser diagnostics may contain uploaded content. Do not forward them into server logs.
    child.stderr.resume();
    child.on('error', () => fail(new DocumentParseError('PARSER_UNAVAILABLE', '暂时无法启动文档解析，请稍后重试。')));
    child.stdin.on('error', () => { /* Early rejection can close the input stream. The exit handler reports the reason. */ });
    child.on('close', code => {
      signal?.removeEventListener('abort', abort);
      if (settled) return;
      clearTimeout(timer);
      try {
        if (code !== 0) throw new Error('parser process failed');
        const result = JSON.parse(Buffer.concat(output).toString('utf8')) as {document?: ParsedDocument; error?: {code: string; message: string}};
        if (result.error) {
          settled = true;
          reject(new DocumentParseError(result.error.code, result.error.message));
        } else if (result.document && Array.isArray(result.document.pages)) {
          settled = true;
          resolve(result.document);
        } else throw new Error('invalid parser response');
      } catch {
        fail(new DocumentParseError('PARSE_FAILED', '文件解析失败，可能已损坏或过于复杂。请另存为 PDF / DOCX 后重试。'));
      }
    });
    child.stdin.end(buffer);
  }).finally(() => rm(workdir, {recursive: true, force: true}));
}
