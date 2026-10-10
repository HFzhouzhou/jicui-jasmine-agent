import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Archive, ArrowDownToLine, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, FileText, Files, Layers3, Leaf, Loader2, Plus, RefreshCw, Search, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, RequestError } from '@/lib/api';
import { toast } from 'sonner';
import type { DocumentStatus, KnowledgeDocument, KnowledgeDocumentDetail, KnowledgeOverview, KnowledgeSearchResult } from '@shared/rag';

const statusNames: Record<DocumentStatus, string> = { draft: '待核准', published: '已发布', archived: '已归档' };
const statusStyles: Record<DocumentStatus, string> = { draft: 'bg-[#f4ebd7] text-[#88713b]', published: 'bg-[#e7eddc] text-[#37553b]', archived: 'bg-[#eeeeeb] text-[#777971]' };
const selectStyle = 'min-h-11 min-w-0 w-full rounded-xl border border-primary/10 bg-background px-3 py-2 text-sm text-primary focus:outline-primary/40';
const formatsFallback = ['pdf', 'docx', 'doc', 'txt', 'md', 'csv'];
const requestHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });
const messageFor = (error: unknown) => error instanceof Error ? error.message : '操作未完成，请稍后重试。';
const numberText = (value: number) => value.toLocaleString('zh-CN');
const byteText = (value: number) => value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
const dateText = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); };
function Status({ value }: { value: DocumentStatus }) { return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${statusStyles[value]}`}>{statusNames[value]}</span>; }
function ErrorMessage({ children }: { children: React.ReactNode }) { return <div role="alert" className="flex gap-2.5 rounded-2xl bg-destructive/5 p-4 text-xs leading-6 text-destructive"><CircleAlert className="mt-1 size-4 shrink-0" /><div className="min-w-0 break-words">{children}</div></div>; }

type QueueItem = { id: string; file: File; status: 'waiting' | 'processing' | 'done' | 'failed'; error?: string; duplicate?: boolean; documentId?: string };
type ContentDetail = KnowledgeDocumentDetail;

export function KnowledgeWorkspace({ token }: { token: string }) {
  const [overview, setOverview] = useState<KnowledgeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [view, setView] = useState<'documents' | 'search'>('documents');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const uploadRunning = useRef(false);
  const controllers = useRef(new Set<AbortController>());
  const latestLoad = useRef(0);
  useEffect(() => { mounted.current = true; const active = controllers.current; return () => { mounted.current = false; active.forEach((controller) => controller.abort()); }; }, []);
  const load = useCallback(async () => {
    const sequence = ++latestLoad.current;
    const controller = new AbortController(); controllers.current.add(controller);
    setLoading(true); setError('');
    try {
      const result = await apiRequest<KnowledgeOverview>('/api/admin/rag', { headers: requestHeaders(token), signal: controller.signal });
      if (mounted.current && sequence === latestLoad.current) setOverview(result);
    } catch (cause) { if (!controller.signal.aborted && mounted.current && sequence === latestLoad.current) setError(messageFor(cause)); }
    finally { controllers.current.delete(controller); if (mounted.current && sequence === latestLoad.current) setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || uploading || queue.some((item) => item.status === 'waiting' || item.status === 'failed')) event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading, queue]);
  const formats = overview?.capabilities.formats ?? formatsFallback;
  const maxFileBytes = overview?.capabilities.maxFileBytes ?? 20 * 1024 * 1024;
  function selectDocument(id: string) {
    if (editorBusy) { toast.info('资料正在保存，请完成后再切换。'); return; }
    if (id !== selectedId && dirty && !window.confirm('当前编辑尚未保存。离开后会丢弃这些修改，确定切换资料吗？')) return;
    if (id !== selectedId) { setSelectedId(id); setDirty(false); }
    setView('documents');
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function addFiles(files: File[]) {
    if (uploadRunning.current) return;
    setUploadError('');
    const open = queue.filter((item) => item.status !== 'done');
    const available = Math.max(0, 10 - open.length);
    if (files.length > available) setUploadError('每批最多处理 10 份资料，超出的文件未加入，请分批上传。');
    setQueue([...open, ...files.slice(0, available).map((file): QueueItem => {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        const issue = !formats.map((format) => format.toLowerCase().replace(/^\./, '')).includes(extension) ? '暂不支持此格式，请转换为 PDF、Word 或文本文件。' : file.size > maxFileBytes ? `文件超过 ${byteText(maxFileBytes)}，请拆分后上传。` : file.size === 0 ? '文件为空，请重新选择。' : undefined;
        return { id: crypto.randomUUID(), file, status: issue ? 'failed' : 'waiting', error: issue };
      })]);
    if (fileInput.current) fileInput.current.value = '';
  }
  async function processQueue() {
    if (uploadRunning.current) return;
    const tasks = queue.filter((item) => item.status === 'waiting' || (item.status === 'failed' && item.file.size > 0 && item.file.size <= maxFileBytes && formats.map((format) => format.toLowerCase().replace(/^\./, '')).includes(item.file.name.split('.').pop()?.toLowerCase() ?? '')));
    if (!tasks.length) return;
    uploadRunning.current = true; setUploading(true); setUploadError('');
    for (const task of tasks) {
      if (!mounted.current) break;
      setQueue((previous) => previous.map((item) => item.id === task.id ? { ...item, status: 'processing', error: undefined } : item));
      const controller = new AbortController(); controllers.current.add(controller);
      try {
        const body = new FormData(); body.append('file', task.file);
        const result = await apiRequest<{ document: KnowledgeDocument; duplicate: boolean }>('/api/admin/rag/documents', { method: 'POST', headers: requestHeaders(token), body, signal: controller.signal }, 210000);
        if (mounted.current) setQueue((previous) => previous.map((item) => item.id === task.id ? { ...item, status: 'done', duplicate: result.duplicate, documentId: result.document.id } : item));
      } catch (cause) {
        if (!controller.signal.aborted && mounted.current) setQueue((previous) => previous.map((item) => item.id === task.id ? { ...item, status: 'failed', error: messageFor(cause) } : item));
      } finally { controllers.current.delete(controller); }
    }
    uploadRunning.current = false;
    if (mounted.current) { setUploading(false); await load(); }
  }
  const visibleDocuments = (overview?.documents ?? []).filter((document) => (`${document.title} ${document.filename} ${document.source}`.toLowerCase().includes(query.trim().toLowerCase())) && (filter === 'all' || (filter === 'active' ? document.status !== 'archived' : document.status === filter)));
  const queuedCount = queue.filter((item) => (item.status === 'waiting' || item.status === 'failed') && item.file.size > 0 && item.file.size <= maxFileBytes && formats.map((format) => format.toLowerCase().replace(/^\./, '')).includes(item.file.name.split('.').pop()?.toLowerCase() ?? '')).length;
  return <div className="min-w-0 space-y-6">
    <section className="relative overflow-hidden rounded-[28px] bg-[#253b2d] p-6 text-[#f8f8f0] sm:p-8">
      <Leaf className="pointer-events-none absolute -right-12 -top-8 size-60 stroke-[0.55] text-[#dce6bd]/10" aria-hidden="true" />
      <div className="relative flex flex-wrap items-start justify-between gap-5"><div className="max-w-xl"><p className="mb-3 text-[10px] tracking-[0.22em] text-[#dce6bd]/70">THE JASMINE LIBRARY</p><h2 className="font-serif text-2xl sm:text-3xl">让每一次回答，有据可循。</h2><p className="mt-3 text-xs leading-7 text-[#f8f8f0]/65">把品牌故事、茶饮资料与门店手册汇成知识库。<br className="hidden sm:block" />上传后先核对，发布后茉莉娘子即可按问题查找资料，并附上出处。</p></div><Button variant="outline" className="shrink-0 gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" disabled={loading} onClick={() => void load()}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />刷新资料</Button></div>
      <div className="relative mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/10 pt-6 sm:grid-cols-4">
        {[{ label: '全部资料', value: overview?.stats.documents, icon: Files }, { label: '已发布资料', value: overview?.stats.published, icon: ShieldCheck }, { label: '知识片段', value: overview?.stats.chunks, icon: Layers3 }, { label: '收录字数', value: overview?.stats.characters, icon: BookOpen }].map(({ label, value, icon: Icon }) => <div key={label}><p className="flex items-center gap-2 text-[10px] text-white/50"><Icon className="size-3.5" />{label}</p><p className="mt-2 font-serif text-2xl tabular-nums sm:text-3xl">{value === undefined ? '—' : numberText(value)}</p></div>)}
      </div>
    </section>
    {error && <ErrorMessage>{error}<button type="button" className="ml-2 underline underline-offset-4" onClick={() => void load()}>重新加载</button></ErrorMessage>}
    <div className="flex flex-wrap gap-2"><Button variant={view === 'documents' ? 'default' : 'outline'} className="gap-2" onClick={() => setView('documents')}><Files className="size-4" />资料管理</Button><Button variant={view === 'search' ? 'default' : 'outline'} className="gap-2" onClick={() => setView('search')}><Search className="size-4" />检索试验台</Button></div>
    <div className={view === 'documents' ? 'space-y-6' : 'hidden'}>
      <section className="rounded-[26px] bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-xl text-primary">添一份新知识</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">品牌文件、产品手册、常见问答，都可以从这里开始。</p></div><Button variant="outline" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="size-4" />手动录入</Button></div>
        <div onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); addFiles(Array.from(event.dataTransfer.files)); }} className={`rounded-[22px] border border-dashed p-6 text-center transition-colors sm:p-8 ${dragActive ? 'border-primary bg-[#e7eddc]' : 'border-primary/20 bg-[#f7f8f1]'}`}>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#e7ecda]"><UploadCloud className="size-6 stroke-[1.3] text-primary" /></div><p className="text-sm font-medium text-primary">把资料拖到这里，或选择文件</p><p className="mt-2 break-words text-[11px] leading-6 text-muted-foreground">{formats.map((format) => format.replace(/^\./, '').toUpperCase()).join(' · ')}<br />每份最多 {byteText(maxFileBytes)}，每批最多 10 份</p><input ref={fileInput} className="sr-only" type="file" multiple accept={formats.map((format) => `.${format.replace(/^\./, '')}`).join(',')} aria-label="选择知识资料文件" disabled={uploading || !overview} onChange={(event) => addFiles(Array.from(event.target.files ?? []))} /><Button variant="outline" disabled={uploading || !overview} className="mt-4 gap-2 bg-white" onClick={() => fileInput.current?.click()}><Plus className="size-4" />选择资料文件</Button>
        </div>
        <div className="mt-4 grid gap-2 text-[11px] leading-6 text-muted-foreground sm:grid-cols-2"><p className="flex items-start gap-2"><ShieldCheck className="mt-1 size-3.5 shrink-0 text-primary/60" />新上传资料先保存为草稿，核准发布后才用于顾客问答。</p><p className="flex items-start gap-2"><FileText className="mt-1 size-3.5 shrink-0 text-primary/60" />{overview ? overview.capabilities.ocrAvailable ? '已启用图片文字识别，扫描资料解析后请核对文字。' : '支持文字型文档；扫描件请先识别成可选中文字的文件。' : '正在读取服务器支持的文件能力…'}</p></div>
        {uploadError && <div className="mt-4"><ErrorMessage>{uploadError}</ErrorMessage></div>}
        {!!queue.length && <div className="mt-5 space-y-3 border-t border-primary/10 pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-primary">导入队列 · {queue.filter((item) => item.status === 'done').length} / {queue.length} 已完成</p><Button size="sm" className="gap-2" disabled={uploading || !queuedCount} onClick={() => void processQueue()}>{uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowDownToLine className="size-3.5" />}{uploading ? '逐份解析中…' : queue.some((item) => item.status === 'failed') ? '导入 / 重试' : '开始导入'}</Button></div>
          <ul className="divide-y divide-primary/5">{queue.map((item) => <li key={item.id} className="flex min-w-0 items-start gap-3 py-3"><div className={`mt-1 ${item.status === 'failed' ? 'text-destructive' : 'text-primary/60'}`}>{item.status === 'processing' ? <Loader2 className="size-4 animate-spin" /> : item.status === 'done' ? <CheckCircle2 className="size-4" /> : item.status === 'failed' ? <CircleAlert className="size-4" /> : <FileText className="size-4" />}</div><div className="min-w-0 flex-1"><p className="break-all text-xs font-medium leading-6 text-primary">{item.file.name}</p><p className={`break-words text-[11px] leading-6 ${item.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>{byteText(item.file.size)} · {item.status === 'waiting' ? '等待导入' : item.status === 'processing' ? '正在上传、解析并整理片段，请稍候…' : item.status === 'done' ? item.duplicate ? '已存在相同文件，未重复导入' : '解析完成，等待核准' : item.error}</p>{item.documentId && <button type="button" className="min-h-8 text-[11px] text-primary underline underline-offset-4" onClick={() => selectDocument(item.documentId!)}>查看资料与解析结果</button>}</div>{item.status !== 'processing' && <button type="button" disabled={uploading} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background disabled:opacity-40" aria-label={`移除队列文件 ${item.file.name}`} onClick={() => setQueue((previous) => previous.filter((entry) => entry.id !== item.id))}><X className="size-4" /></button>}</li>)}</ul>
        </div>}
      </section>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.6fr)]">
        <section className="min-w-0 overflow-hidden rounded-[26px] bg-white"><div className="space-y-3 border-b border-primary/10 p-5"><div className="flex items-center justify-between"><h3 className="font-serif text-xl text-primary">资料书架</h3><span className="text-[10px] text-muted-foreground">{visibleDocuments.length} 份</span></div><label className="relative block"><Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input aria-label="搜索知识资料" className="pl-10" placeholder="搜索标题、文件名或来源" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="筛选知识资料状态" value={filter} onChange={(event) => setFilter(event.target.value)} className={selectStyle}><option value="active">全部在用资料</option><option value="draft">待核准</option><option value="published">已发布</option><option value="archived">已归档</option><option value="all">所有资料（含归档）</option></select></div>
          <div className="max-h-[420px] divide-y divide-primary/5 overflow-y-auto lg:max-h-[780px]">{loading && !overview ? <p className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在整理书架…</p> : !visibleDocuments.length ? <div className="px-5 py-12 text-center"><BookOpen className="mx-auto mb-4 size-8 stroke-[1.1] text-primary/30" /><p className="text-sm text-primary">{query || filter !== 'active' ? '没有符合条件的资料' : '书架等你添上第一份资料'}</p><p className="mt-2 text-[11px] leading-6 text-muted-foreground">{query || filter !== 'active' ? '试试其他关键词或资料状态。' : '上传一份文件，或手动录入品牌知识。'}</p></div> : visibleDocuments.map((document) => <button key={document.id} type="button" className={`block w-full min-w-0 px-5 py-4 text-left transition-colors ${selectedId === document.id ? 'bg-[#edf0e3]' : 'hover:bg-[#f8f9f3]'}`} onClick={() => selectDocument(document.id)}><div className="mb-2 flex items-center gap-2"><span className="rounded bg-primary/5 px-1.5 py-1 text-[9px] font-medium uppercase tracking-wider text-primary/60">{document.format}</span><Status value={document.status} /></div><h4 className="break-words font-serif text-base leading-7 text-primary">{document.title}</h4><p className="mt-2 text-[10px] leading-5 text-muted-foreground">{document.pageCount ? `${document.pageCount} 页 · ` : ''}{document.chunkCount} 个片段 · {numberText(document.charCount)} 字</p><p className="mt-1 text-[10px] text-muted-foreground/70">更新于 {dateText(document.updatedAt)}</p>{document.warnings.length > 0 && <p className="mt-2 flex items-center gap-1 text-[10px] text-[#92723e]"><CircleAlert className="size-3" />有 {document.warnings.length} 项解析提示</p>}</button>)}</div>
        </section>
        <div ref={editorRef} className="min-w-0 scroll-mt-24">{selectedId ? <DocumentEditor key={selectedId} id={selectedId} token={token} onSaved={load} onDirtyChange={setDirty} onBusyChange={setEditorBusy} /> : <section className="flex min-h-[330px] flex-col items-center justify-center rounded-[26px] border border-primary/5 bg-white px-5 py-12 text-center lg:min-h-[480px]"><div className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#f0f2e8]"><Leaf className="size-8 stroke-[1] text-primary/45" /></div><h3 className="font-serif text-xl text-primary">每份资料，都值得仔细核对</h3><p className="mt-3 max-w-64 text-xs leading-7 text-muted-foreground">选择一份资料，预览解析片段、补充出处，再核准发布给茉莉娘子。</p><div className="mt-7 flex items-center gap-3 text-[10px] text-primary/50"><span>上传整理</span><ChevronRight className="size-3" /><span>核准发布</span><ChevronRight className="size-3" /><span>有据回答</span></div></section>}</div>
      </div>
    </div>
    <div className={view === 'search' ? '' : 'hidden'}><RetrievalLab token={token} documents={overview?.documents ?? []} embeddingsConfigured={overview?.capabilities.embeddingsConfigured ?? false} onSelectDocument={selectDocument} /></div>
    <CreateDocumentDialog open={createOpen} onOpenChange={setCreateOpen} token={token} onCreated={async (document) => { await load(); selectDocument(document.id); }} />
  </div>;
}

function DocumentEditor({ id, token, onSaved, onDirtyChange, onBusyChange }: { id: string; token: string; onSaved: () => Promise<void>; onDirtyChange: (value: boolean) => void; onBusyChange: (value: boolean) => void }) {
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [title, setTitle] = useState(''); const [source, setSource] = useState(''); const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true); const [pending, setPending] = useState(''); const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false); const [reconciled, setReconciled] = useState(false);
  const [downloading, setDownloading] = useState(false); const downloadController = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<'preview' | 'edit'>('preview'); const [page, setPage] = useState(1);
  const active = useRef<AbortController | null>(null);
  const dirtyMetadata = !!detail && (title !== detail.document.title || source !== detail.document.source);
  const dirtyContent = !!detail && detail.content !== undefined && content !== detail.content;
  const dirty = dirtyMetadata || dirtyContent;
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(!!pending); return () => onBusyChange(false); }, [pending, onBusyChange]);
  useEffect(() => () => { active.current?.abort(); downloadController.current?.abort(); }, []);
  const loadDetail = useCallback(async () => {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setLoading(true); setError('');
    try {
      const result = await apiRequest<ContentDetail>(`/api/admin/rag/documents/${encodeURIComponent(id)}`, { headers: requestHeaders(token), signal: controller.signal });
      if (!controller.signal.aborted) { setDetail(result); setTitle(result.document.title); setSource(result.document.source); setContent(result.content ?? ''); setPage(1); }
    } catch (cause) { if (!controller.signal.aborted) setError(messageFor(cause)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [id, token]);
  useEffect(() => { void loadDetail(); }, [loadDetail]);
  async function reloadConflict() {
    const controller = new AbortController(); active.current = controller; setPending('reload'); setError('');
    try {
      const latest = await apiRequest<ContentDetail>(`/api/admin/rag/documents/${encodeURIComponent(id)}`, { headers: requestHeaders(token), signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!dirtyMetadata || title === detail?.document.title) setTitle(latest.document.title);
      if (!dirtyMetadata || source === detail?.document.source) setSource(latest.document.source);
      if (!dirtyContent) setContent(latest.content);
      setDetail(latest); setConflict(false); setReconciled(true); setPage(1); await onSaved();
    } catch (cause) { if (!controller.signal.aborted) setError(messageFor(cause)); }
    finally { if (!controller.signal.aborted) setPending(''); }
  }
  async function downloadOriginal() {
    if (!detail || downloading) return;
    const controller = new AbortController(); downloadController.current = controller; setDownloading(true); setError('');
    const timeout = window.setTimeout(() => controller.abort(), 65000);
    try {
      const response = await fetch(`/api/admin/rag/documents/${encodeURIComponent(id)}/file`, { headers: requestHeaders(token), signal: controller.signal });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message || '原始文件暂时无法下载，请稍后重试。');
      }
      const blob = await response.blob(); if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob); const link = window.document.createElement('a'); link.href = url;
      link.download = (detail.document.filename || detail.document.title).replace(/[/\\]/g, '_');
      window.document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { if (!controller.signal.aborted) setError(messageFor(cause)); else if (downloadController.current === controller) setError('文件下载已取消或超时，请重试。'); }
    finally { window.clearTimeout(timeout); if (downloadController.current === controller) setDownloading(false); }
  }
  async function mutate(action: 'metadata' | 'content' | 'reindex' | DocumentStatus) {
    if (!detail || pending || conflict) return;
    if (action === 'metadata' && !title.trim()) { setError('请为资料填写一个标题。'); return; }
    if (action === 'content' && !content.trim()) { setError('正文不能为空。'); return; }
    if (action === 'published' && !source.trim()) { setError('发布前请补充可追溯的资料来源并保存。'); return; }
    const controller = new AbortController(); active.current = controller; setPending(action); setError('');
    const path = `/api/admin/rag/documents/${encodeURIComponent(id)}`;
    const body = { expectedVersion: detail.document.version, ...(action === 'metadata' ? { title: title.trim(), source: source.trim() } : action === 'content' ? { content } : action === 'reindex' ? {} : { status: action }) };
    try {
      await apiRequest<{ document: KnowledgeDocument }>(action === 'content' ? `${path}/content` : action === 'reindex' ? `${path}/reindex` : path, { method: action === 'content' ? 'PUT' : action === 'reindex' ? 'POST' : 'PATCH', headers: requestHeaders(token), body: JSON.stringify(body), signal: controller.signal }, 150000);
      if (controller.signal.aborted) return;
      const latest = await apiRequest<ContentDetail>(path, { headers: requestHeaders(token), signal: controller.signal });
      if (controller.signal.aborted) return;
      setDetail(latest);
      if (action !== 'content' || !dirtyMetadata) { setTitle(latest.document.title); setSource(latest.document.source); }
      if (action !== 'metadata' || !dirtyContent) setContent(latest.content ?? '');
      setReconciled(false); setPage(1);
      toast.success(action === 'published' ? '已发布，后续问答可检索这份资料' : action === 'archived' ? '已归档，资料已退出问答，可随时恢复' : action === 'draft' ? '已转为草稿，核准后可重新发布' : action === 'content' ? '正文已保存并重新整理片段，请核准后发布' : action === 'reindex' ? '检索索引已重新构建' : '标题与来源已保存');
      await onSaved();
    } catch (cause) {
      if (!controller.signal.aborted) { if (cause instanceof RequestError && cause.code === 'STALE_WRITE') { setConflict(true); setError('这份资料已被其他操作更新，本次保存未生效。你的输入已保留，请载入最新版本并对照后重新保存。'); } else setError(messageFor(cause)); }
    } finally { if (!controller.signal.aborted) setPending(''); }
  }
  if (loading) return <section className="flex min-h-80 items-center justify-center gap-2 rounded-[26px] bg-white text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在打开资料…</section>;
  if (!detail) return <section className="space-y-4 rounded-[26px] bg-white p-5"><ErrorMessage>{error || '资料暂时无法读取。'}</ErrorMessage><Button variant="outline" onClick={() => void loadDetail()}>重新加载</Button></section>;
  const { document, chunks } = detail;
  const pageSize = 6; const totalPages = Math.max(1, Math.ceil(chunks.length / pageSize)); const previewChunks = chunks.slice((page - 1) * pageSize, page * pageSize);
  const disabled = !!pending || conflict;
  return <section className="min-w-0 overflow-hidden rounded-[26px] bg-white">
    <header className="border-b border-primary/10 p-5 sm:p-6"><div className="mb-3 flex flex-wrap items-center gap-2"><Status value={document.status} /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{document.format}</span>{dirty && <span className="text-[10px] text-[#92723e]">有未保存修改</span>}</div><h3 className="break-words font-serif text-2xl leading-relaxed text-primary">{document.title}</h3><p className="mt-2 break-all text-[10px] leading-6 text-muted-foreground">{document.filename || '手动录入'} · 更新于 {dateText(document.updatedAt)}</p><p className="mt-1 text-[10px] leading-6 text-muted-foreground">{document.pageCount ? `${document.pageCount} 页 · ` : ''}{document.chunkCount} 个片段 · {numberText(document.charCount)} 字</p>{!!document.filename && !['manual', 'legacy', 'entry'].includes(document.format) && <Button size="sm" variant="outline" className="mt-4 gap-2" disabled={downloading} onClick={() => void downloadOriginal()}>{downloading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowDownToLine className="size-3.5" />}下载原始文件</Button>}</header>
    <div className="space-y-5 p-5 sm:p-6">
      {error && <ErrorMessage>{error}{conflict && <Button variant="outline" size="sm" className="mt-3 h-auto w-full whitespace-normal" disabled={!!pending} onClick={() => void reloadConflict()}>载入最新版本，并保留当前输入</Button>}</ErrorMessage>}
      {reconciled && <div className="space-y-2 rounded-2xl bg-[#f5efdf] p-4 text-xs leading-6 text-[#786443]"><p>已载入最新版本，编辑框仍保留你的输入。请对照后保存，避免覆盖他人的修改。</p><details><summary className="cursor-pointer font-medium">查看服务器最新内容</summary><p className="mt-3 break-words">标题：{document.title}<br />来源：{document.source || '未填写'}</p><pre className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[11px]">{detail.content ?? '暂不可读取正文'}</pre></details></div>}
      {!!document.warnings.length && <details className="rounded-2xl bg-[#f5efdf] p-4 text-xs leading-6 text-[#786443]" open><summary className="cursor-pointer font-medium">解析提示 · {document.warnings.length} 项</summary><ul className="mt-2 list-disc space-y-1 pl-4">{document.warnings.map((warning, index) => <li className="break-words" key={index}>{warning}</li>)}</ul></details>}
      <fieldset disabled={disabled} className="space-y-4"><label className="block space-y-2 text-xs text-primary">资料标题<Input maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block space-y-2 text-xs text-primary">资料来源<Input maxLength={1000} placeholder="例如：品牌产品手册（2026 年版）、官方资料链接" value={source} onChange={(event) => setSource(event.target.value)} /><span className="block text-[10px] leading-6 text-muted-foreground">填写便于核对的文件名称、版本或链接，回答引用时会显示出处。</span></label><Button size="sm" variant="outline" disabled={disabled || !dirtyMetadata} className="gap-2" onClick={() => void mutate('metadata')}>{pending === 'metadata' ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}保存标题与来源</Button></fieldset>
      <div className="border-t border-primary/10 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-full bg-[#f0f2e8] p-1"><button className={`min-h-9 rounded-full px-3 text-xs ${mode === 'preview' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`} onClick={() => setMode('preview')}>片段预览</button><button className={`min-h-9 rounded-full px-3 text-xs ${mode === 'edit' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`} onClick={() => setMode('edit')}>修订正文{dirtyContent ? ' ·' : ''}</button></div><Button size="sm" variant="ghost" disabled={disabled || dirty} className="gap-1.5 text-[11px]" onClick={() => void mutate('reindex')}><RefreshCw className={`size-3.5 ${pending === 'reindex' ? 'animate-spin' : ''}`} />重建索引</Button></div>
        {mode === 'preview' ? <div className="mt-4 space-y-3"><p className="text-[10px] leading-6 text-muted-foreground">资料已按内容整理为可检索片段，相邻片段可能保留少量重复内容以衔接语义。{document.format !== 'pdf' && ' Word 与文本的页数随排版变化，未推断固定页码。'}</p>{previewChunks.map((chunk) => <article key={chunk.id} className="rounded-2xl border border-primary/8 bg-[#fafbf6] p-4"><div className="mb-2 flex flex-wrap items-center gap-2 text-[9px] text-primary/55"><span className="font-medium">片段 {chunk.ordinal + 1}</span>{chunk.page !== undefined && <span>第 {chunk.page} 页</span>}{chunk.section && <span className="break-words">{chunk.section}</span>}<span className="ml-auto">{numberText(chunk.text.length)} 字</span></div><p className="whitespace-pre-wrap break-words text-xs leading-7 text-primary/85">{chunk.text}</p></article>)}{!chunks.length && <p className="rounded-2xl bg-background p-5 text-xs text-muted-foreground">暂无可检索的片段。请检查文档文字内容。</p>}<div className="flex items-center justify-between gap-2 pt-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="上一页片段"><ChevronLeft className="size-4" /></Button><span className="text-[10px] text-muted-foreground">第 {page} / {totalPages} 页 · 每页 {pageSize} 个片段</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} aria-label="下一页片段"><ChevronRight className="size-4" /></Button></div></div> : <div className="mt-4 space-y-3"><p className="rounded-2xl bg-[#f4efdf] p-3 text-[11px] leading-6 text-[#786443]">修改正文会重新整理片段，并转为待核准；重新发布后才会用于顾客问答。修订后的正文不再沿用原文件页码，原文件仍保留作历史来源。</p>{detail.content === undefined ? <ErrorMessage>当前服务尚未提供可编辑正文，请更新服务后再试。</ErrorMessage> : <><Textarea maxLength={500000} aria-label="修订知识正文" className="min-h-[360px] resize-y bg-[#fafbf6] text-xs leading-7" value={content} disabled={disabled} onChange={(event) => setContent(event.target.value)} /><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">{numberText(content.length)} 字</span><Button size="sm" disabled={disabled || !dirtyContent} className="gap-2" onClick={() => void mutate('content')}>{pending === 'content' ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}保存正文并重新整理</Button></div></>}</div>}
      </div>
      <div className="space-y-4 border-t border-primary/10 pt-5"><div className="flex items-start gap-2.5"><ShieldCheck className="mt-1 size-4 shrink-0 text-primary/65" /><p className="text-[11px] leading-6 text-muted-foreground">{document.status === 'published' ? '这份资料已发布，茉莉娘子可在问答中检索并引用。撤回后立即退出后续问答。' : document.status === 'archived' ? '资料已归档，不参与问答。恢复后将作为草稿保留，需要再次核准发布。' : '核对解析文字与来源后，点击核准发布。草稿不会出现在顾客问答中。'}{dirty && ' 请先保存当前修改，再变更发布状态。'}</p></div><div className="flex flex-wrap gap-2">{document.status === 'draft' && <Button className="gap-2" disabled={disabled || dirty} onClick={() => void mutate('published')}>{pending === 'published' ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}核准并发布</Button>}{document.status === 'published' && <Button variant="outline" disabled={disabled || dirty} onClick={() => void mutate('draft')}>撤回为草稿</Button>}{document.status === 'archived' ? <Button className="gap-2" disabled={disabled || dirty} onClick={() => void mutate('draft')}><RefreshCw className="size-4" />恢复为草稿</Button> : <Button variant="ghost" disabled={disabled || dirty} className="gap-2 text-muted-foreground" onClick={() => void mutate('archived')}><Archive className="size-4" />归档资料</Button>}</div></div>
    </div>
  </section>;
}

function CreateDocumentDialog({ open, onOpenChange, token, onCreated }: { open: boolean; onOpenChange: (value: boolean) => void; token: string; onCreated: (document: KnowledgeDocument) => Promise<void> }) {
  const [title, setTitle] = useState(''); const [source, setSource] = useState(''); const [content, setContent] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null); useEffect(() => () => active.current?.abort(), []);
  async function create(event: FormEvent) {
    event.preventDefault(); if (pending) return;
    const controller = new AbortController(); active.current = controller; setPending(true); setError('');
    try {
      const result = await apiRequest<{ document: KnowledgeDocument }>('/api/admin/rag/text', { method: 'POST', headers: requestHeaders(token), body: JSON.stringify({ title: title.trim(), source: source.trim(), content: content.trim() }), signal: controller.signal }, 150000);
      if (controller.signal.aborted) return;
      toast.success('文字资料已保存为草稿，请核对后发布'); setTitle(''); setSource(''); setContent(''); onOpenChange(false); await onCreated(result.document);
    } catch (cause) { if (!controller.signal.aborted) setError(messageFor(cause)); }
    finally { if (!controller.signal.aborted) setPending(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value); }}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-[26px] p-5 sm:p-7"><DialogHeader><DialogTitle className="font-serif text-2xl text-primary">手动录入知识</DialogTitle><DialogDescription className="text-xs leading-6">适合补充常见问答、品牌故事与资料修订。保存后先进入待核准状态。</DialogDescription></DialogHeader><form onSubmit={(event) => void create(event)}><fieldset disabled={pending} className="mt-4 space-y-4"><label className="block space-y-2 text-xs">标题<Input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="这份资料讲什么？" /></label><label className="block space-y-2 text-xs">来源<Input maxLength={1000} value={source} onChange={(event) => setSource(event.target.value)} placeholder="例如：品牌核准说明（日期）" /></label><label className="block space-y-2 text-xs">知识正文<Textarea maxLength={500000} className="min-h-64 text-xs leading-7" required value={content} onChange={(event) => setContent(event.target.value)} placeholder="按主题分段填写，可以保留小标题与问答结构…" /></label><p className="text-[10px] text-muted-foreground">{numberText(content.length)} 字 · 发布前需填写可追溯来源</p>{error && <ErrorMessage>{error}</ErrorMessage>}<Button type="submit" disabled={pending || !title.trim() || !content.trim()} className="w-full gap-2">{pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{pending ? '正在整理资料…' : '保存为草稿'}</Button></fieldset></form></DialogContent></Dialog>;
}

function RetrievalLab({ token, documents, embeddingsConfigured, onSelectDocument }: { token: string; documents: KnowledgeDocument[]; embeddingsConfigured: boolean; onSelectDocument: (id: string) => void }) {
  const [query, setQuery] = useState(''); const [includeDraft, setIncludeDraft] = useState(false); const [documentId, setDocumentId] = useState('');
  const [result, setResult] = useState<KnowledgeSearchResult | null>(null); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null); useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { if (documentId && !documents.some((document) => document.id === documentId && (document.status === 'published' || (includeDraft && document.status === 'draft')))) setDocumentId(''); }, [documents, documentId, includeDraft]);
  async function search(event: FormEvent) {
    event.preventDefault(); if (!query.trim() || pending) return;
    const controller = new AbortController(); active.current = controller; setPending(true); setError(''); setResult(null);
    try { const response = await apiRequest<KnowledgeSearchResult>('/api/admin/rag/search', { method: 'POST', headers: requestHeaders(token), body: JSON.stringify({ query: query.trim(), includeDraft, ...(documentId ? { documentId } : {}), limit: 8 }), signal: controller.signal }, 65000); if (!controller.signal.aborted) setResult(response); }
    catch (cause) { if (!controller.signal.aborted) setError(messageFor(cause)); }
    finally { if (!controller.signal.aborted) setPending(false); }
  }
  return <section className="min-w-0 rounded-[26px] bg-white p-5 sm:p-7"><div className="mb-6 flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf0e3]"><Sparkles className="size-5 text-primary/65" /></div><div><h3 className="font-serif text-2xl text-primary">试一试，知识找得准不准</h3><p className="mt-2 text-xs leading-7 text-muted-foreground">输入顾客可能问的问题，查看助手会检索到哪些资料。这里展示真实检索结果，不生成回答。</p></div></div><form onSubmit={(event) => void search(event)} className="space-y-4"><label className="block space-y-2 text-xs text-primary">测试问题<Textarea rows={2} maxLength={2000} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：茉莉花茶是怎样制作的？" /></label><div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]"><label className="block min-w-0 space-y-2 text-xs text-primary">检索范围<select className={selectStyle} value={documentId} onChange={(event) => setDocumentId(event.target.value)}><option value="">全部资料</option>{documents.filter((document) => document.status === 'published' || (includeDraft && document.status === 'draft')).map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label><Button type="submit" className="gap-2" disabled={pending || !query.trim()}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{pending ? '检索中…' : '测试检索'}</Button></div><label className="flex items-center gap-2 text-[11px] text-muted-foreground"><input type="checkbox" className="size-4 accent-primary" checked={includeDraft} onChange={(event) => { setIncludeDraft(event.target.checked); setDocumentId(''); }} />同时检索待核准草稿（仅用于后台测试）</label><p className="text-[10px] leading-6 text-muted-foreground">{embeddingsConfigured ? '已配置语义向量服务；本次实际使用的检索方式会显示在结果中。' : '当前使用中文全文与关键词检索；配置语义向量服务后可启用混合检索。'}</p></form>{error && <div className="mt-5"><ErrorMessage>{error}</ErrorMessage></div>}{result ? <div className="mt-7 border-t border-primary/10 pt-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h4 className="font-serif text-lg text-primary">检索结果 · {result.hits.length} 个片段</h4><span className="rounded-full bg-[#f0f2e8] px-3 py-1.5 text-[10px] text-primary/65">{result.mode === 'hybrid' ? '混合检索' : '全文检索'} · {Math.round(result.elapsedMs)} ms</span></div><p className="mb-4 break-words text-xs leading-6 text-muted-foreground">问题：{result.query}</p>{result.embeddingCoverage && <div className="mb-4 rounded-2xl bg-[#f1f4e9] p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-primary/70"><span>当前检索范围 · 语义索引覆盖</span><span className="tabular-nums">{numberText(result.embeddingCoverage.indexed)} / {numberText(result.embeddingCoverage.total)} 个片段</span></div><progress className="mt-3 block h-1.5 w-full overflow-hidden rounded-full accent-[#526c3b] [&::-webkit-progress-bar]:bg-[#e2e7d7] [&::-webkit-progress-value]:bg-[#526c3b]" aria-label="当前检索范围语义索引覆盖" value={result.embeddingCoverage.indexed} max={Math.max(1, result.embeddingCoverage.total)} /><p className="mt-2 text-[10px] leading-6 text-muted-foreground">{result.embeddingCoverage.indexed < result.embeddingCoverage.total ? '其余片段继续参与全文检索，语义索引会按检索需要逐步补齐。' : '此检索范围内的片段已有语义索引。本次实际采用的检索方式以上方结果为准。'}</p></div>}{!result.hits.length ? <div className="rounded-2xl bg-[#f7f8f1] p-7 text-center"><Search className="mx-auto mb-3 size-7 stroke-[1] text-primary/35" /><p className="text-sm text-primary">没有找到相关资料</p><p className="mt-2 text-[11px] leading-6 text-muted-foreground">试试更具体的关键词，检查资料是否已发布，或补充对应知识。</p></div> : <div className="space-y-4">{result.hits.map((hit, index) => <article key={hit.id} className="min-w-0 rounded-[22px] border border-primary/8 bg-[#fafbf6] p-4 sm:p-5"><div className="mb-3 flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e7ecda] font-serif text-xs text-primary">{index + 1}</span><div className="min-w-0 flex-1"><h5 className="break-words text-sm font-medium leading-6 text-primary">{hit.title}</h5><p className="mt-1 break-words text-[10px] leading-6 text-muted-foreground">{hit.source || '来源待补充'}{hit.page !== undefined ? ` · 第 ${hit.page} 页` : ''}{hit.section ? ` · ${hit.section}` : ''}</p></div><span className="shrink-0 text-[9px] leading-6 text-primary/50">评分 {hit.score.toFixed(3)}</span></div><p className="whitespace-pre-wrap break-words text-xs leading-7 text-primary/80">{hit.text}</p><button className="mt-3 inline-flex min-h-9 items-center gap-1 text-[11px] text-primary underline underline-offset-4" onClick={() => onSelectDocument(hit.documentId)}>打开来源资料<ArrowUpRight className="size-3" /></button></article>)}</div>}</div> : !pending && <div className="mt-7 rounded-[22px] border border-dashed border-primary/15 px-5 py-10 text-center"><Layers3 className="mx-auto mb-3 size-8 stroke-[1] text-primary/30" /><p className="text-xs leading-7 text-muted-foreground">用真实问题检验资料覆盖范围，<br />让缺失的知识在发布前被发现。</p></div>}</section>;
}
