import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bookmark, ChevronRight, FlaskConical, Leaf, Loader2, Send, Settings2, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TeaCard from '@/components/TeaCard';
import DrinkArtwork from '@/components/DrinkArtwork';
import { toast } from 'sonner';
import { apiRequest, getHealth, isTeaCard, recommend, RequestError } from '@/lib/api';
import type { ChatMessage, HealthResponse, KnowledgeEntry, Preferences, RecommendRequest, RecommendResponse, TeaCard as CardData } from '@shared/contracts';

type Mode = 'live' | 'preview';
interface ConversationMessage extends ChatMessage { cardContext?: string }
interface SavedConversation { messages: ConversationMessage[]; mode: Mode }
const HISTORY_KEY = 'jicui_conversation_v2';
const FAVORITES_KEY = 'jicui_favorites_v2';
function readConversation(): SavedConversation {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    if (value && Array.isArray(value.messages)) return {
      mode: value.mode === 'preview' ? 'preview' : 'live',
      messages: value.messages.filter((item: ConversationMessage) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-20).map((item: ConversationMessage) => ({ role: item.role, content: item.content.slice(0, 6000), ...(typeof item.cardContext === 'string' ? { cardContext: item.cardContext.slice(0, 2000) } : {}) })),
    };
  } catch { /* A blocked or full browser store must not prevent using the app. */ }
  return { messages: [], mode: 'live' };
}
function readFavorites(): CardData[] {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value.filter(isTeaCard).slice(0, 12) : [];
  } catch { return []; }
}
const examples = ['15元以内，想喝清爽的茶', '我想试试茉莉花香明显的饮品', '介绍一下你们的茉莉茶'];
const fieldStyle = 'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function AIRecommendPage() {
  const [searchParams] = useSearchParams();
  const [saved] = useState(readConversation);
  const [messages, setMessages] = useState<ConversationMessage[]>(saved.messages);
  const [mode, setMode] = useState<Mode>(saved.mode);
  const [input, setInput] = useState(searchParams.get('q')?.slice(0, 2000) || '');
  const [profile, setProfile] = useState<Preferences>({});
  const [showPreferences, setShowPreferences] = useState(searchParams.get('mode') === 'quiz');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState('');
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<{ body: RecommendRequest; mode: Mode; displayHistory: ConversationMessage[] } | null>(null);
  const [favorites, setFavorites] = useState(readFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [mobilePane, setMobilePane] = useState<'chat' | 'selection'>('chat');
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const activeRequest = useRef<AbortController | null>(null);
  const activeResultId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workspaceTabsRef = useRef<HTMLDivElement>(null);

  async function refreshHealth(signal?: AbortSignal) {
    setHealthError('');
    try { setHealth(await getHealth(signal)); }
    catch (cause) { if (!signal?.aborted) { setHealth(null); setHealthError(cause instanceof Error ? cause.message : '无法连接服务器'); } }
  }
  useEffect(() => {
    const controller = new AbortController();
    void refreshHealth(controller.signal);
    apiRequest<{ entries: KnowledgeEntry[] }>('/api/knowledge', { signal: controller.signal }, 10000)
      .then((value) => setKnowledge(value.entries.filter((entry) => entry.verified && entry.source)))
      .catch(() => {});
    return () => { controller.abort(); activeRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify({ messages: messages.slice(-20), mode })); }
    catch { /* The conversation remains available in memory. */ }
  }, [messages, mode]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const tabs = workspaceTabsRef.current;
    if (!tabs) return;
    const top = tabs.getBoundingClientRect().top;
    const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 68;
    if (top < headerBottom + 4 || top > window.innerHeight * 0.45) {
      tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [mobilePane]);

  async function run(body: RecommendRequest, selectedMode: Mode, retry = false, displayHistory = messages) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true); setError(''); setResult(null); activeResultId.current = null; setFeedback(null); setFeedbackComment('');
    setLastAttempt({ body, mode: selectedMode, displayHistory });
    if (!retry) setMessages([...displayHistory, { role: 'user' as const, content: body.message }].slice(-20));
    try {
      const value = await recommend(body, selectedMode, controller.signal);
      if (controller.signal.aborted || activeRequest.current !== controller) return;
      setResult(value); activeResultId.current = value.requestId;
      if (value.cards.length) setMobilePane('selection');
      const cardContext = value.cards.length ? `\n\n${value.cards.map((card) => `${card.drinkName} ¥${card.price} · ${card.sweetness} · ${card.temperature}`).join('\n')}` : '';
      const content = `${value.mode === 'preview' ? '【规则预览，非 AI】\n' : ''}${value.reply}${cardContext}`;
      const catalogContext = value.cards.length ? `目录记录：${JSON.stringify(value.cards.map(({ drinkId, drinkName, price }) => ({ drinkId, drinkName, price })))}` : undefined;
      setMessages([...displayHistory, { role: 'user', content: body.message }, { role: 'assistant', content, cardContext: catalogContext }].slice(-20) as ConversationMessage[]);
    } catch (cause) {
      if (activeRequest.current !== controller) return;
      setError(cause instanceof Error ? cause.message : '本次推荐失败，请重试。');
      if (cause instanceof RequestError && cause.code === 'AI_NOT_CONFIGURED') void refreshHealth();
    } finally {
      if (activeRequest.current === controller) { activeRequest.current = null; setLoading(false); }
    }
  }
  function submit(message = input, excludeIds: string[] = []) {
    const value = message.trim();
    if (!value || loading) return;
    if (!health) { setError('暂时无法连接服务器，请先点击重新连接。'); return; }
    if (mode === 'live' && !health?.aiConfigured) { setError('AI 尚未接通，请配置服务后重试，或主动切换到「规则预览（非AI）」。'); return; }
    setInput('');
    setMobilePane('chat');
    void run({ message: value, history: messages.slice(-18).map(({ role, content, cardContext }) => ({ role, content: cardContext ? `${content.slice(0, 2000)}\n${cardContext.slice(0, 900)}` : content.slice(0, 3000) })), profile, excludeIds }, mode);
  }
  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next); setResult(null); activeResultId.current = null; setError(''); setLastAttempt(null);
  }
  function clearConversation() {
    activeRequest.current?.abort(); activeRequest.current = null;
    setMessages([]); setResult(null); activeResultId.current = null; setLoading(false); setError(''); setLastAttempt(null); setFeedback(null);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* Nothing to remove if browser storage is unavailable. */ }
  }
  function saveFavorite(card: CardData) {
    const next = [card, ...favorites.filter((item) => item.drinkId !== card.drinkId)].slice(0, 12);
    setFavorites(next);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); toast.success('已收藏到此浏览器，未向门店下单'); }
    catch { toast.info('已暂存，本浏览器无法永久保存收藏'); }
  }
  async function sendFeedback(rating: 'up' | 'down') {
    if (!result || feedbackPending) return;
    setFeedbackPending(true);
    try {
      await apiRequest('/api/feedback', { method: 'POST', body: JSON.stringify({ requestId: result.requestId, rating, comment: feedbackComment.trim() || undefined }) });
      if (activeResultId.current === result.requestId) setFeedback(rating);
      toast.success('反馈已记录');
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '反馈提交失败'); }
    finally { setFeedbackPending(false); }
  }
  const canSend = !loading && !!health && (mode === 'preview' || health.aiConfigured);

  return <div className="min-h-screen bg-[#f7f7ef] text-[#253b2d]">
    <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-5 sm:px-8 md:pt-6 lg:px-12">
      <header className="mb-4 flex flex-col justify-between gap-5 md:mb-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 hidden text-[10px] font-medium sm:block tracking-[0.28em] text-[#6d7d62]">JASMINE TEA ATELIER / 01</p>
          <h1 className="font-serif text-[26px] leading-[1.35] tracking-tight sm:text-[40px]"><span className="sm:hidden">聊聊，今天的那杯茶。</span><span className="hidden sm:inline">让一杯茶，更懂你的此刻。</span></h1>
          <p className="mt-2 hidden text-[13px] leading-6 text-[#7b8273] sm:block">说说口味与预算，和茉莉娘子一起，找到今天的那杯茶。</p>
        </div>
        <Link to="/menu" className="group hidden w-fit items-center gap-3 text-xs sm:inline-flex text-[#53644a]">先逛逛完整茶单<span className="flex size-9 items-center justify-center rounded-full border border-[#253b2d]/15 transition-colors group-hover:bg-[#dce6bd]"><ArrowUpRight className="size-4" /></span></Link>
      </header>

      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] sm:mb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 leading-5">
          <span className={`size-1.5 shrink-0 rounded-full ${health?.aiConfigured && mode === 'live' ? 'bg-[#6c8950]' : 'bg-[#b6a073]'}`} />
          {!health && !healthError ? <span className="text-[#7b8273]">正在连接服务…</span> : healthError ? <span className="text-destructive">{healthError}</span> : mode === 'preview' ? <span className="flex items-center gap-1.5 text-[#8c6c37]"><FlaskConical className="size-3.5" /><span>规则预览 · 非 AI<span className="hidden sm:inline">，本模式没有调用 AI</span></span></span> : health?.aiConfigured ? <span className="text-[#647258]">DeepSeek 已配置<span className="hidden sm:inline"> · 茉莉娘子在线</span></span> : <span className="text-[#8c6c37]">AI 尚未接通，请在服务器配置 DeepSeek 密钥后启用。</span>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          {healthError && <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => void refreshHealth()}>重新连接</button>}
          {mode === 'live' ? <button type="button" className="min-h-11 text-[#7b8273] underline decoration-[#7b8273]/30 underline-offset-4 disabled:opacity-40" disabled={loading || !health} onClick={() => switchMode('preview')}>规则预览（非AI）</button> : <button type="button" className="min-h-11 underline underline-offset-4 disabled:opacity-40" disabled={loading} onClick={() => switchMode('live')}>切回 AI 对话</button>}
        </div>
      </div>

      <div ref={workspaceTabsRef} className="mb-4 grid scroll-mt-[80px] grid-cols-2 rounded-full bg-[#e9eddd] p-1 lg:hidden" role="tablist" aria-label="选茶工作区">
        <button type="button" id="chat-tab" role="tab" aria-controls="tea-chat-panel" aria-selected={mobilePane === 'chat'} onClick={() => setMobilePane('chat')} className={`min-h-11 rounded-full text-sm transition-colors ${mobilePane === 'chat' ? 'bg-white text-[#253b2d] shadow-sm' : 'text-[#8a957a]'}`}>聊聊口味</button>
        <button type="button" id="selection-tab" role="tab" aria-controls="tea-selection-panel" aria-selected={mobilePane === 'selection'} onClick={() => setMobilePane('selection')} className={`flex min-h-11 items-center justify-center gap-2 rounded-full text-sm transition-colors ${mobilePane === 'selection' ? 'bg-white text-[#253b2d] shadow-sm' : 'text-[#8a957a]'}`}>我的茶单{Boolean(result?.cards.length) && <span className="flex size-5 items-center justify-center rounded-full bg-[#253b2d] text-[10px] text-white">{result?.cards.length}</span>}</button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.04fr_1fr] lg:gap-8">
        <section id="tea-chat-panel" className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} ${showPreferences ? 'h-auto' : 'h-[calc(100svh-330px)]'} min-h-[350px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_8px_50px_-32px_#253b2d40] sm:rounded-[28px] lg:flex lg:h-auto`} aria-label="选茶对话">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#253b2d]/[0.07] px-5 py-3 sm:py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#eef2e1]"><Leaf strokeWidth={1.2} className="size-5" /></span>
              <div><h2 className="font-serif text-lg">{mode === 'preview' ? '规则筛选体验' : '和茉莉娘子聊聊'}</h2><p className="mt-0.5 hidden text-[9px] tracking-[0.16em] sm:block text-[#909581]">YOUR PERSONAL TEA COMPANION</p></div>
            </div>
            <button type="button" onClick={clearConversation} disabled={!messages.length && !loading} className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full p-2 text-[11px] text-[#8b9281] transition-colors hover:bg-[#f4f5ee] disabled:opacity-35" aria-label="清空对话"><Trash2 strokeWidth={1.4} className="size-3.5" /><span className="hidden sm:inline">清空对话</span></button>
          </div>
          <div ref={scrollRef} className={`${showPreferences ? 'h-[240px] flex-none' : 'min-h-0 flex-1'} space-y-5 overflow-y-auto px-5 py-5 sm:px-7 lg:h-[clamp(180px,calc(100dvh-620px),320px)] lg:flex-none`} aria-live="polite" aria-busy={loading}>
            {!messages.length && <div className="pt-3">
              <p className="mb-2 font-serif text-[25px] leading-relaxed">今天，想喝点什么？</p>
              <p className="max-w-sm text-xs leading-6 text-[#8b9281]">不必懂茶，从一个简单的喜好开始。<br />我会为你核对菜单，慢慢找到合适的选择。</p>
              <div className="mt-7 space-y-2">{examples.map((example, index) => <button type="button" key={example} onClick={() => { setInput(example); inputRef.current?.focus(); }} className="group flex w-full items-center justify-between gap-3 rounded-xl bg-[#f6f7f1] px-4 py-3.5 text-left text-[13px] text-[#5a6a4f] transition-colors hover:bg-[#eaf0d9]"><span><span className="mr-3 font-serif text-[#a1ae87]">0{index + 1}</span>{example}</span><ArrowUpRight strokeWidth={1.3} className="size-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></button>)}</div>
            </div>}
            {messages.map((message, index) => <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[94%] whitespace-pre-wrap break-words px-4 py-3 text-sm leading-7 ${message.role === 'user' ? 'rounded-[20px] rounded-br-md bg-[#253b2d] text-[#f7f7ef]' : 'rounded-[20px] rounded-bl-md bg-[#f4f5ed] text-[#53624b]'}`}>{message.role === 'assistant' && <span className="mb-1 block text-[10px] tracking-wider text-[#8c977a]">茉莉娘子</span>}{message.content}</div>
            </div>)}
            {loading && <div className="flex items-center gap-2 pl-2 text-xs text-[#7a8867]"><Loader2 className="size-3.5 animate-spin" />{mode === 'preview' ? '正在核对菜单…' : '正在理解你的口味，挑选一杯好茶…'}</div>}
          </div>
          <div className="shrink-0 space-y-2 border-t border-[#253b2d]/[0.07] px-4 pb-4 pt-1 sm:space-y-2 sm:p-4">
            <button type="button" onClick={() => setShowPreferences(!showPreferences)} className="flex min-h-11 items-center gap-1.5 text-[11px] text-[#7f8b70]" aria-expanded={showPreferences}><Settings2 strokeWidth={1.5} className="size-3.5" />偏好参考（可选）<ChevronRight className={`size-3 transition-transform ${showPreferences ? 'rotate-90' : ''}`} /></button>
            {showPreferences && <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f2f4e9] p-4">
              <label className="block space-y-1.5 text-[11px] text-[#6e795f]">预算<select className={fieldStyle} value={profile.budget || ''} onChange={(event) => setProfile({ ...profile, budget: event.target.value })}><option value="">不指定</option>{['10元以内', '15元以内', '20元以内'].map((option) => <option key={option}>{option}</option>)}</select></label>
              <label className="block space-y-1.5 text-[11px] text-[#6e795f]">甜度<select className={fieldStyle} value={profile.sweetness || ''} onChange={(event) => setProfile({ ...profile, sweetness: event.target.value })}><option value="">不指定</option>{['无糖', '三分糖', '五分糖', '七分糖', '全糖'].map((option) => <option key={option}>{option}</option>)}</select></label>
              <label className="block space-y-1.5 text-[11px] text-[#6e795f]">温度<select className={fieldStyle} value={profile.temperature || ''} onChange={(event) => setProfile({ ...profile, temperature: event.target.value })}><option value="">不指定</option>{['热饮', '常温', '去冰', '少冰', '正常冰'].map((option) => <option key={option}>{option}</option>)}</select></label>
              <label className="block space-y-1.5 text-[11px] text-[#6e795f]">配料要求<select className={fieldStyle} value={profile.dietary?.[0] || ''} onChange={(event) => setProfile({ ...profile, dietary: event.target.value ? [event.target.value] : [] })}><option value="">不指定</option>{['不含乳制品', '不含咖啡因', '不含姜'].map((option) => <option key={option}>{option}</option>)}</select></label>
              <p className="col-span-2 text-[10px] leading-5 text-[#8a927e]">对话中更新的要求优先。原料未知时不会推断适合，其他要求可直接写在对话里。</p>
            </div>}
            <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <label className="sr-only" htmlFor="tea-demand">你的选茶需求</label>
              <div className="rounded-2xl bg-[#f5f6ef] p-1.5 ring-1 ring-transparent transition-shadow focus-within:ring-[#a1b17e]/50">
                <Textarea ref={inputRef} id="tea-demand" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} rows={2} placeholder="比如：15元以内，想喝清爽的茶…" className="min-h-[64px] resize-none border-0 bg-transparent px-3 pt-3 text-base sm:text-[13px] shadow-none placeholder:text-[#a0a593] focus-visible:ring-0" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
                <div className="flex items-center justify-between gap-2 px-3 pb-2"><span className="text-[9px] text-[#a0a593]">对话仅存本机 · 清空可删除</span>{loading ? <Button type="button" variant="outline" onClick={() => activeRequest.current?.abort()} className="h-11 gap-1.5 rounded-full border-0 bg-white px-4 text-xs"><X className="size-3.5" />取消</Button> : <Button disabled={!canSend || !input.trim()} type="submit" className="h-11 gap-2 rounded-full bg-[#253b2d] px-4 text-xs text-[#f7f7ef] hover:bg-[#3c5334] disabled:opacity-30">{mode === 'preview' ? '按规则筛选' : '发送'}<Send strokeWidth={1.3} className="size-3.5" /></Button>}</div>
              </div>
            </form>
            {error && <div role="alert" className="rounded-xl bg-[#fbefe7] p-3 text-xs leading-6 text-[#9b5e41]"><p>{error}</p>{lastAttempt && !loading && <Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={() => void run(lastAttempt.body, lastAttempt.mode, true, lastAttempt.displayHistory)}>重试本次请求</Button>}</div>}
          </div>
        </section>

        <section id="tea-selection-panel" className={`${mobilePane === 'selection' ? 'block' : 'hidden'} space-y-4 lg:block`} aria-label="推荐茶单">
          <div className="flex items-center justify-between px-1 py-1"><h2 className="flex items-baseline gap-2 font-serif text-xl">本次茶单<span className="hidden font-sans text-[9px] tracking-[0.2em] text-[#9ba48b] sm:inline">YOUR SELECTION</span></h2><button type="button" onClick={() => setShowFavorites(!showFavorites)} className="inline-flex min-h-11 items-center gap-1.5 text-[11px] text-[#7a8767]" aria-expanded={showFavorites}><Bookmark strokeWidth={1.3} className="size-3.5" />本机收藏（{favorites.length}）</button></div>
          {showFavorites && <div className="space-y-3 rounded-[22px] bg-white p-5"><div className="flex justify-between text-xs"><span className="text-[#7b866d]">收藏快照 · 价格可能已更新</span>{favorites.length > 0 && <button type="button" className="min-h-11 text-[#9ba48b]" onClick={() => { setFavorites([]); try { localStorage.removeItem(FAVORITES_KEY); } catch { /* Browser storage may be unavailable. */ } }}>清空收藏</button>}</div>{!favorites.length ? <p className="py-4 text-xs text-[#9ba48b]">还没有收藏的茶单。</p> : favorites.map((card) => <div key={card.drinkId} className="flex items-center justify-between gap-2 border-t border-[#253b2d]/[0.07] pt-3 text-sm"><span>{card.drinkName} <span className="ml-1 text-xs text-[#9ba48b]">¥{card.price}</span></span><Button size="sm" variant="outline" className="h-11 shrink-0 rounded-full border-[#253b2d]/10 text-[11px]" onClick={() => { setInput(`我想再看看${card.drinkName}，请检查当前菜单并推荐。`); setMobilePane('chat'); requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })); }}>重新核对</Button></div>)}</div>}
          {loading ? <div className="flex min-h-[440px] flex-col items-center justify-center gap-4 rounded-[28px] bg-[#e6eccf] text-[#68774f]"><div className="flex size-20 items-center justify-center rounded-full border border-[#a0af7a]/30"><Loader2 strokeWidth={1} className="size-8 animate-spin" /></div><p className="font-serif text-2xl">好茶，值得等一会。</p><p className="text-xs">正在为这次需求准备茶单</p></div> : result ? <>
            {result.mode === 'preview' && <p className="rounded-xl bg-[#eee6d3] px-4 py-3 text-[11px] text-[#8c7447]">以下为规则预览结果，非 AI 生成。</p>}
            {result.notices.length > 0 && <details className="rounded-2xl bg-[#eee6d3]/70 px-4 py-3 text-xs leading-6 text-[#8c7447]" open={!result.cards.length}><summary className="cursor-pointer">茶单使用说明 · {result.notices.length} 条</summary><div className="mt-2 space-y-1">{result.notices.map((notice, index) => <p key={index}>{notice}</p>)}</div></details>}
            {!result.cards.length && <div className="rounded-[24px] bg-[#e8edd7] p-7"><Leaf strokeWidth={1} className="mb-4 size-7 text-[#7f8f62]" /><p className="whitespace-pre-wrap text-sm leading-8 text-[#586649]">{result.reply}</p><Link className="mt-5 inline-flex items-center gap-2 text-xs text-[#53664a]" to="/menu">查看菜单资料<ArrowUpRight className="size-3.5" /></Link></div>}
            {result.cards.map((card, index) => <TeaCard key={card.drinkId} data={{ ...card, isMain: index === 0 }} onConfirm={() => saveFavorite(card)} onRefresh={() => submit('在保留之前要求的前提下，换一款不同的饮品。', result.cards.map((item) => item.drinkId))} onAskMore={() => { setMobilePane('chat'); setInput(''); requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })); }} />)}
            <details className="rounded-2xl bg-[#edeee3] px-5 py-4 text-xs text-[#818b73]"><summary className="min-h-11 cursor-pointer py-2 leading-7">这次推荐有帮助吗？</summary><div className="mt-4"><p className="mb-3 text-[11px]">你的反馈会用于后续人工审核与改进。</p><Input value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} placeholder="可选：哪里需要改善？" maxLength={500} disabled={!!feedback} className="mb-3 rounded-xl border-0 bg-white/75 text-xs shadow-none" /><div className="flex gap-2"><Button variant="outline" size="sm" disabled={feedbackPending || !!feedback} onClick={() => void sendFeedback('up')} className="h-11 gap-1.5 rounded-full border-0 bg-white/75 text-xs"><ThumbsUp className="size-3" />{feedback === 'up' ? '已记录' : '有帮助'}</Button><Button variant="outline" size="sm" disabled={feedbackPending || !!feedback} onClick={() => void sendFeedback('down')} className="h-11 gap-1.5 rounded-full border-0 bg-white/75 text-xs"><ThumbsDown className="size-3" />{feedback === 'down' ? '已记录' : '待改善'}</Button></div></div></details>
          </> : <div className="relative min-h-[490px] lg:min-h-[580px] overflow-hidden rounded-[28px] bg-[#dce6bd] px-7 pb-7 pt-9 sm:px-9">
            <div className="relative z-10"><p className="text-[9px] tracking-[0.25em] text-[#718357]">A LITTLE JASMINE. A LITTLE JOY.</p><h3 className="mt-5 font-serif text-[34px] leading-[1.5] text-[#415433]">一杯茶，<br />刚刚好。</h3><p className="mt-3 max-w-[230px] text-[11px] leading-6 text-[#7a8a62]">花香、茶韵，还有你的偏爱。<br />专属于你的茶单，从一句话开始。</p></div>
            <div className="absolute -right-9 top-[158px] h-[370px] w-[350px] rotate-[-6deg] opacity-95 sm:-right-3 sm:top-[130px] sm:h-[390px] sm:w-[390px]"><DrinkArtwork category="纯茶原叶" name="茉莉" className="size-full !bg-transparent" /></div>
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 bg-gradient-to-t from-[#dce6bd] via-[#dce6bd]/90 to-transparent px-7 pb-7 pt-16 sm:px-9"><div><span className="block font-serif text-2xl tracking-widest text-[#647a49]">慢一点，香一点。</span><p className="mt-3 text-[10px] text-[#7a8a62]">先说说你的喜好，茶单将在这里呈现。</p><button type="button" onClick={() => setMobilePane('chat')} className="mt-3 min-h-11 rounded-full bg-[#253b2d] px-5 text-xs text-[#f7f7ef] lg:hidden">开始聊聊<ArrowUpRight className="ml-2 inline size-3" /></button></div><span className="mb-1 text-[8px] tracking-widest text-[#8a9c71] [writing-mode:vertical-rl]">JICUI · JASMINE</span></div>
            <span className="absolute right-5 top-5 text-[8px] text-[#889b6c]">图片仅供参考</span>
          </div>}
          {knowledge.length > 0 && <div className="rounded-[22px] bg-white p-5"><h3 className="mb-3 font-serif text-lg">茉莉小笺 <span className="ml-2 font-sans text-[10px] text-[#8b967b]">品牌资料 · 已核准</span></h3>{knowledge.map((entry) => <details key={entry.id} className="border-t border-[#253b2d]/[0.07] py-3 text-xs"><summary className="cursor-pointer text-[#68795a]">{entry.title}</summary><p className="mt-3 whitespace-pre-wrap leading-7">{entry.content}</p><p className="mt-2 break-words text-[10px] text-[#96a086]">来源：{entry.source}</p></details>)}</div>}
        </section>
      </div>
    </div>
  </div>;
}
