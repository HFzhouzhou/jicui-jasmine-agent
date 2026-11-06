import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bookmark, ChevronDown, Gift, Info, LoaderCircle, MessageSquareText, ReceiptText, RotateCcw, Send, Settings2, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import TeaCard from '@/components/TeaCard';
import DrinkArtwork from '@/components/DrinkArtwork';
import JasmineMark from '@/components/brand/JasmineMark';
import KnowledgeSources, { isKnowledgeCitation } from '@/components/KnowledgeSources';
import BundleCard from '@/components/chat/BundleCard';
import BlindBoxCard from '@/components/chat/BlindBoxCard';
import MemoryPanel, { MemoryChips } from '@/components/chat/MemoryPanel';
import { BundleComposerDialog, MoodPickerDialog } from '@/components/chat/FeatureDialogs';
import OrderCard from '@/components/order/OrderCard';
import { apiRequest, getHealth, isTeaCard, recommend, RequestError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { isAppShell } from '@/lib/platform';
import { pickExtras, proposalFor } from '@/lib/chat-extras';
import { STATUS_LABEL } from '@/lib/orders';
import { useOrders } from '@/hooks/useActiveOrders';
import { announceMemory } from '@/hooks/useTasteMemory';
import { buildConversationHistory, configureConversationMessage, preservesTeaSelection, isSavedOrderDraft, lastProductMessageIndex, restoreSelection, selectionAfterConfiguration, selectionAfterResponse, selectionCard, selectionMessageIndex, type ConversationMessage, type TeaSelection } from '@/lib/conversation-selection';
import type { HealthResponse, OfficialOrderDraft, Order, Preferences, RecommendAction, RecommendRequest, RecommendResponse, TeaCard as CardData } from '@shared/contracts';

type Mode = 'live' | 'preview';
interface SavedConversation { messages: ConversationMessage[]; mode: Mode; selection: TeaSelection | null }
const HISTORY_KEY = 'jicui_conversation_v2';
const FAVORITES_KEY = 'jicui_favorites_v2';
const PREVIEW_PREFIX = '【规则预览，非 AI】\n';
function isConversationNotice(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
}
function readConversation(): SavedConversation {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    if (value && Array.isArray(value.messages)) {
      const mode: Mode = value.mode === 'preview' ? 'preview' : 'live';
      const messages: ConversationMessage[] = value.messages.filter((item: ConversationMessage) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-20).map((item: ConversationMessage) => ({ role: item.role, content: item.content.slice(0, 6000), ...(item.role === 'assistant' ? pickExtras(item) : {}), ...(item.role === 'assistant' && Array.isArray(item.citations) ? { citations: item.citations.filter(isKnowledgeCitation).slice(0, 6) } : {}), ...(item.role === 'assistant' && Array.isArray(item.notices) ? { notices: item.notices.filter(isConversationNotice).slice(0, 6) } : {}), ...(typeof item.cardContext === 'string' ? { cardContext: item.cardContext.slice(0, 2000) } : {}), ...(item.role === 'assistant' && typeof item.selectionId === 'string' ? { selectionId: item.selectionId.slice(0, 200) } : {}), ...(item.role === 'assistant' && isTeaCard(item.productCard) ? { productCard: item.productCard, ...(isSavedOrderDraft(item.orderDraft, item.productCard.drinkId) ? { orderDraft: item.orderDraft } : {}) } : {}) }));
      return { mode, messages, selection: restoreSelection(value.selection, messages, mode, isTeaCard) };
    }
  } catch { /* A blocked or full browser store must not prevent using the app. */ }
  return { messages: [], mode: 'live', selection: null };
}
function readFavorites(): CardData[] {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value.filter(isTeaCard).slice(0, 12) : [];
  } catch { return []; }
}
function greeting() {
  const hour = new Date().getHours();
  return hour < 5 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
}
const EXAMPLES = ['30 块以内，两杯解腻的', '来一杯芒芒椰椰，少冰', '有没有不含奶的？', '记住我默认三分糖、少冰', '订单做到哪了'];
const fieldStyle = 'h-11 w-full rounded-xl border border-line bg-cream px-3 text-[14px] text-ink outline-none focus:border-leaf';

function resizeMessageInput(element: HTMLTextAreaElement) {
  if (!element.clientWidth) return;
  element.style.height = 'auto';
  element.style.height = `${Math.min(160, Math.max(48, element.scrollHeight))}px`;
}
function Avatar({ className }: { className?: string }) {
  return <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-jade text-cream shadow-[0_8px_18px_-10px_rgba(31,74,51,.9)]', className)}><JasmineMark className="size-[62%]" petal="#fffdf7" /></span>;
}
function FeatureTile({ icon: Icon, title, hint, tint, onClick, disabled }: { icon: typeof Gift; title: string; hint: string; tint: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="group relative flex min-h-[132px] flex-col rounded-[22px] border border-line bg-paper p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sage hover:bg-cream hover:shadow-[0_18px_40px_-28px_rgba(20,40,28,.5)] disabled:pointer-events-none disabled:opacity-50">
    <span className={cn('flex size-10 items-center justify-center rounded-2xl', tint)}><Icon className="size-5" /></span>
    <span className="mt-auto block pt-4 font-serif text-[17px] font-semibold text-ink">{title}</span>
    <span className="mt-0.5 block text-[12.5px] leading-5 text-stone">{hint}</span>
    <ArrowUpRight className="absolute right-4 top-4 size-4 text-stone/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-jade" />
  </button>;
}
function Panel({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn('space-y-3', className)}><div className="flex min-h-10 items-center justify-between gap-3 px-1"><h2 className="font-serif text-[20px] font-semibold text-ink">{title}</h2>{aside}</div>{children}</section>;
}

export default function AIRecommendPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [saved] = useState(readConversation);
  const [messages, setMessages] = useState<ConversationMessage[]>(saved.messages);
  const [mode, setMode] = useState<Mode>(saved.mode);
  const [input, setInput] = useState(searchParams.get('q')?.slice(0, 2000) || '');
  const [profile, setProfile] = useState<Preferences>({});
  const [showPreferences, setShowPreferences] = useState(searchParams.get('mode') === 'quiz');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState('');
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [selection, setSelection] = useState<TeaSelection | null>(saved.selection);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<{ body: RecommendRequest; mode: Mode; displayHistory: ConversationMessage[] } | null>(null);
  const [favorites, setFavorites] = useState(readFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [mobilePane, setMobilePane] = useState<'chat' | 'selection'>('chat');
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [dialog, setDialog] = useState<'mood' | 'bundle' | null>(null);
  const { active: activeOrders } = useOrders(20000);
  const activeRequest = useRef<AbortController | null>(null);
  const activeResultId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function refreshHealth(signal?: AbortSignal) {
    setHealthError('');
    try { setHealth(await getHealth(signal)); }
    catch (cause) { if (!signal?.aborted) { setHealth(null); setHealthError(cause instanceof Error ? cause.message : '无法连接服务器'); } }
  }
  useEffect(() => {
    const controller = new AbortController();
    void refreshHealth(controller.signal);
    return () => { controller.abort(); activeRequest.current?.abort(); };
  }, []);
  // Deep links from the home page: ?action=blindbox | bundle.
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'blindbox') setDialog('mood');
    else if (action === 'bundle') setDialog('bundle');
    if (action) { const next = new URLSearchParams(searchParams); next.delete('action'); setSearchParams(next, { replace: true }); }
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify({ messages: messages.slice(-20), mode, selection })); }
    catch { /* The conversation remains available in memory. */ }
  }, [messages, mode, selection]);
  const latestMessage = messages.at(-1);
  useEffect(() => { if (messages.length || loading) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length, latestMessage?.content, loading]);
  useLayoutEffect(() => { if (inputRef.current) resizeMessageInput(inputRef.current); }, [input, mobilePane]);
  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => { if (element.clientWidth !== width) { width = element.clientWidth; resizeMessageInput(element); } });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  async function run(body: RecommendRequest, selectedMode: Mode, retry = false, displayHistory = messages) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true); setError(''); activeResultId.current = null; setFeedback(null); setFeedbackComment('');
    setLastAttempt({ body, mode: selectedMode, displayHistory });
    if (!retry) setMessages([...displayHistory, { role: 'user' as const, content: body.message }].slice(-20));
    try {
      const value = await recommend(body, selectedMode, controller.signal);
      if (controller.signal.aborted || activeRequest.current !== controller) return;
      setResult(value); setSelection((current) => selectionAfterResponse(current, value)); activeResultId.current = value.requestId;
      if (value.memory) announceMemory(value.memory);
      const content = `${value.mode === 'preview' ? PREVIEW_PREFIX : ''}${value.reply}`;
      const catalogContext = value.cards.length ? `目录记录：${JSON.stringify(value.cards.map(({ drinkId, drinkName, price }) => ({ drinkId, drinkName, price })))}` : undefined;
      const extras = pickExtras(value);
      setMessages((current) => [...current, { role: 'assistant', content, cardContext: catalogContext, ...extras, ...(value.bundle ? {} : { productCard: value.cards[0] }), ...(!preservesTeaSelection(value) ? { selectionId: value.requestId } : {}), ...(Array.isArray(value.citations) ? { citations: value.citations.filter(isKnowledgeCitation).slice(0, 6) } : {}), notices: value.notices.filter(isConversationNotice).slice(0, 6) }].slice(-20) as ConversationMessage[]);
      if (value.cards.length > 1 && !value.bundle && window.matchMedia('(max-width: 1023px)').matches) toast.message(`另有 ${value.cards.length - 1} 款候选`, { description: '在「茶单」里可以对比和下单', action: { label: '去看看', onClick: () => setMobilePane('selection') } });
    } catch (cause) {
      if (activeRequest.current !== controller) return;
      setError(cause instanceof Error ? cause.message : '本次推荐失败，请重试。');
      if (cause instanceof RequestError && cause.code === 'AI_NOT_CONFIGURED') void refreshHealth();
    } finally {
      if (activeRequest.current === controller) { activeRequest.current = null; setLoading(false); }
    }
  }
  function ready() {
    if (!health) { setError('暂时无法连接服务器，请先点击重新连接。'); return false; }
    if (mode === 'live' && !health.aiConfigured) { setError('AI 尚未接通，请配置服务后重试，或切换到「规则预览（非 AI）」。'); return false; }
    return true;
  }
  function submit(message = input, excludeIds: string[] = [], action?: RecommendAction) {
    const value = message.trim();
    if (!value || loading || !ready()) return;
    if (!action) setInput('');
    setMobilePane('chat');
    const history = buildConversationHistory(messages, selection);
    void run({ message: value, history, profile, excludeIds, ...(action ? { action } : {}) }, mode);
  }
  const act = (action: RecommendAction, label: string, excludeIds: string[] = []) => submit(label, excludeIds, action);
  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next); setResult(null); activeResultId.current = null; setError(''); setLastAttempt(null);
  }
  function clearConversation() {
    activeRequest.current?.abort(); activeRequest.current = null;
    setMessages([]); setResult(null); setSelection(null); activeResultId.current = null; setLoading(false); setError(''); setLastAttempt(null); setFeedback(null);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* Nothing to remove if browser storage is unavailable. */ }
  }
  function saveFavorite(card: CardData) {
    const next = [card, ...favorites.filter((item) => item.drinkId !== card.drinkId)].slice(0, 12);
    setFavorites(next);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); toast.success('已收藏到这个浏览器'); }
    catch { toast.info('已暂存，本浏览器无法永久保存收藏'); }
  }
  function ordered(order: Order) {
    setMessages((current) => [...current, { role: 'assistant' as const, content: `已提交到门店接单台，取餐号 ${order.code}。门店接单后开始制作；付款在取餐时向门店完成，我不会经手任何付款。随时问我「订单做到哪了」。`, intent: 'order_status' as const, orders: [order], suggestions: ['订单做到哪了'] }].slice(-20));
    setMobilePane('chat');
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
  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  const canSend = !loading && !!health && (mode === 'preview' || health.aiConfigured);
  const latestProductIndex = lastProductMessageIndex(messages);
  const latestAssistantIndex = messages.reduce((found, message, index) => message.role === 'assistant' ? index : found, -1);
  const currentSelectionIndex = selectionMessageIndex(selection, messages);
  const currentCard = selectionCard(selection);
  const selectionResult = selection?.response;
  const configuredOrders = selection?.orders || {};
  const selectionCount = selectionResult?.bundle ? selectionResult.bundle.items.length : selectionResult?.cards.length || 0;
  const configureOrder = (draft: OfficialOrderDraft, card: CardData, messageIndex = currentSelectionIndex) => {
    if (messageIndex === currentSelectionIndex) setSelection((current) => selectionAfterConfiguration(current, card, draft));
    setMessages((current) => configureConversationMessage(current, messageIndex, card, draft));
  };
  const redrawBlindBox = (message: ConversationMessage) => {
    const weather = message.blindbox?.basis.find((item) => item.startsWith('天气：'))?.slice(3);
    act({ type: 'blindbox', mood: message.blindbox!.mood, ...(weather ? { weather } : {}) }, `再抽一次「${message.blindbox!.mood}」盲盒`, message.productCard ? [message.productCard.drinkId] : []);
  };
  const shuffleBundle = (message: ConversationMessage) => {
    const bundle = message.bundle!;
    act({ type: 'bundle', people: bundle.people, totalBudget: bundle.totalBudget, tastes: bundle.tastes || bundle.items.map(() => '随意') }, '换一组搭配', bundle.items.map((item) => item.card.drinkId));
  };
  const statusLine = !health && !healthError ? { tone: 'idle', text: '正在连接…' }
    : healthError ? { tone: 'error', text: healthError }
      : mode === 'preview' ? { tone: 'warn', text: '规则预览 · 非 AI' }
        : health?.aiConfigured ? { tone: 'ok', text: '在线 · DeepSeek' } : { tone: 'warn', text: 'AI 尚未接通' };

  return <div className="mx-auto max-w-[1360px] px-3 pb-6 pt-3 sm:px-6 sm:pt-6 lg:px-8">
    {/* Mobile switcher between the conversation and the tea list */}
    <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-mist p-1 lg:hidden" role="tablist" aria-label="选茶工作区">
      <button type="button" role="tab" aria-selected={mobilePane === 'chat'} aria-controls="tea-chat-panel" onClick={() => setMobilePane('chat')} className={cn('h-11 rounded-full text-[15px] transition-colors', mobilePane === 'chat' ? 'bg-cream font-semibold text-jade shadow-sm' : 'text-stone')}>对话</button>
      <button type="button" role="tab" aria-selected={mobilePane === 'selection'} aria-controls="tea-selection-panel" onClick={() => setMobilePane('selection')} className={cn('flex h-11 items-center justify-center gap-2 rounded-full text-[15px] transition-colors', mobilePane === 'selection' ? 'bg-cream font-semibold text-jade shadow-sm' : 'text-stone')}>茶单与记忆{selectionCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-jade text-[11px] text-cream">{selectionCount}</span>}</button>
    </div>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-7">
      <section id="tea-chat-panel" aria-label="选茶对话" className={cn('card-soft min-w-0 flex-col overflow-hidden lg:flex', mobilePane === 'chat' ? 'flex' : 'hidden', isAppShell ? 'h-[calc(100svh-164px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[460px] lg:max-h-[1040px]' : 'h-[calc(100svh-212px)] min-h-[520px] lg:h-[calc(100dvh-124px)] lg:min-h-[640px] lg:max-h-[1040px]')}>
        <header className="flex shrink-0 items-center gap-3 border-b border-line/80 px-4 py-3 sm:px-5">
          <Avatar className="size-10" />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[18px] font-semibold leading-tight text-ink">茉莉娘子 <span className="ml-1 hidden font-sans text-[12px] font-normal text-stone sm:inline">AI 随心配</span></h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-stone"><span className={cn('size-2 rounded-full', statusLine.tone === 'ok' ? 'bg-leaf shadow-[0_0_0_3px_rgba(111,154,88,.2)]' : statusLine.tone === 'error' ? 'bg-[#c4562f]' : statusLine.tone === 'warn' ? 'bg-gold' : 'bg-line')} />{statusLine.text}{healthError && <button type="button" onClick={() => void refreshHealth()} className="ml-1 font-medium text-jade underline underline-offset-2">重连</button>}</p>
          </div>
          <div className="flex items-center rounded-full bg-paper p-0.5 text-[12.5px] ring-1 ring-line" role="radiogroup" aria-label="对话模式">
            <button type="button" role="radio" aria-checked={mode === 'live'} disabled={loading} onClick={() => switchMode('live')} className={cn('h-8 rounded-full px-3 transition-colors', mode === 'live' ? 'bg-jade text-cream' : 'text-stone hover:text-jade')}>AI</button>
            <button type="button" role="radio" aria-checked={mode === 'preview'} disabled={loading || !health} onClick={() => switchMode('preview')} className={cn('h-8 rounded-full px-3 transition-colors', mode === 'preview' ? 'bg-gold text-cream' : 'text-stone hover:text-jade')}>规则预览<span className="hidden sm:inline">（非AI）</span></button>
          </div>
          <button type="button" onClick={clearConversation} disabled={!messages.length && !loading} className="flex size-10 items-center justify-center rounded-full text-stone transition-colors hover:bg-mist hover:text-jade disabled:opacity-30" aria-label="清空对话" title="清空对话"><Trash2 className="size-4" /></button>
        </header>
        {mode === 'preview' && <p className="shrink-0 border-b border-honey bg-honey/40 px-5 py-2 text-[12.5px] text-[#6b4c12]">规则预览 · 非 AI：只按菜单规则筛选<span className="hidden sm:inline">，没有调用 AI 模型，不能据此判断模型效果</span>。</p>}
        {mode === 'live' && health && !health.aiConfigured && <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-honey bg-honey/40 px-5 py-2 text-[12.5px] text-[#6b4c12]"><span>AI 尚未接通：服务器还没配置 DeepSeek 密钥。</span><button type="button" onClick={() => switchMode('preview')} className="font-medium underline underline-offset-2">先用规则预览（非 AI）体验</button></div>}

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" aria-live="polite" aria-busy={loading}>
          {!messages.length && <div className="animate-rise-in flex min-h-full flex-col justify-center py-2">
            <p className="eyebrow">{greeting()} · 茉莉娘子在这儿</p>
            <h2 className="mt-3 font-serif text-[32px] font-semibold leading-[1.2] text-ink sm:text-[42px]">一句话，<span className="text-leaf">配一杯</span>。</h2>
            <p className="mt-3 max-w-lg text-[15px] leading-7 text-stone">说出口味、甜度、冰量和预算，我来核对门店茶单，生成能直接下单的茶卡。<span className="text-ink">先复述、你确认，才提交。</span></p>
            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
              <FeatureTile icon={MessageSquareText} title="一句话配单" hint="“冰的、三分糖、不要珍珠”" tint="bg-mist text-jade" onClick={() => { setInput('来杯冰的、三分糖、不要珍珠，15 元以内'); focusInput(); }} />
              <FeatureTile icon={Gift} title="情绪盲盒" hint="不知道喝什么？按心情抽" tint="bg-[#f7e3dc] text-[#9a4a33]" onClick={() => setDialog('mood')} />
              <FeatureTile icon={Users} title="套餐随心配" hint="2–3 人，按预算一次配齐" tint="bg-honey/70 text-[#6b4c12]" onClick={() => setDialog('bundle')} />
              <FeatureTile icon={RotateCcw} title="老样子" hint="按上次的做法再来一杯" tint="bg-[#e4e9f1] text-[#3f5576]" onClick={() => act({ type: 'repeat' }, '老样子')} disabled={loading} />
            </div>
            <p className="mt-7 text-[13px] text-stone">也可以直接说</p>
            <div className="mt-2 flex flex-wrap gap-2">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => submit(example)} disabled={loading} className="chip">{example}</button>)}</div>
          </div>}

          {messages.map((message, index) => {
            if (message.role === 'user') return <div key={index} className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-[22px] rounded-tr-md bg-jade px-4 py-2.5 text-[15px] leading-7 text-cream [overflow-wrap:anywhere]">{message.content}</p></div>;
            const isPreview = message.content.startsWith(PREVIEW_PREFIX);
            const text = isPreview ? message.content.slice(PREVIEW_PREFIX.length) : message.content;
            const latest = index === latestAssistantIndex;
            return <div key={index} className="flex gap-2.5 sm:gap-3">
              <Avatar className="mt-0.5 size-8" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="w-fit max-w-full rounded-[22px] rounded-tl-md bg-paper px-4 py-3 ring-1 ring-line/70">
                  {isPreview && <span className="mb-1.5 inline-flex rounded-full bg-honey/70 px-2 py-0.5 text-[11.5px] font-medium text-[#6b4c12]">规则预览 · 非 AI</span>}
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink/90 [overflow-wrap:anywhere]">{text}</p>
                </div>
                {message.citations && <KnowledgeSources citations={message.citations} />}
                {message.bundle && <BundleCard bundle={message.bundle} proposal={message.proposal} disabled={loading} onOrdered={ordered} onShuffle={latest ? () => shuffleBundle(message) : undefined} />}
                {message.blindbox && <BlindBoxCard box={message.blindbox} drinkName={message.productCard?.drinkName} disabled={loading} onRedraw={latest ? () => redrawBlindBox(message) : undefined} />}
                {!message.bundle && message.productCard && (index === latestProductIndex || message.blindbox) && <div className="w-full min-w-0">
                  {index !== currentSelectionIndex && !message.blindbox && <p className="mb-2 text-[12.5px] text-stone">之前的茶卡 · 下单前会重新核对价格</p>}
                  <TeaCard data={{ ...message.productCard, isMain: true }} compact={!!message.blindbox} proposal={proposalFor(message.proposal, message.productCard)} onOrdered={ordered} configuredOrder={index === currentSelectionIndex ? configuredOrders[message.productCard.drinkId] : message.orderDraft} onConfigure={(draft) => configureOrder(draft, message.productCard!, index)} onConfirm={() => saveFavorite(message.productCard!)} />
                  {index === currentSelectionIndex && selectionCount > 1 && <button type="button" onClick={() => { if (window.matchMedia('(max-width: 1023px)').matches) setMobilePane('selection'); else document.getElementById('tea-selection-panel')?.scrollIntoView({ behavior: 'smooth' }); }} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-jade">另有 {selectionCount - 1} 款候选，去茶单里比一比<ArrowUpRight className="size-3.5" /></button>}
                </div>}
                {message.orders?.length ? (latest ? <OrderCard order={message.orders[0]} compact /> : <div className="flex flex-wrap gap-2">{message.orders.map((order) => <Link key={order.id} to="/orders" className="chip"><ReceiptText className="size-3.5" />取餐号 {order.code} · {STATUS_LABEL[order.status]}</Link>)}</div>) : null}
                {message.intent === 'memory' && message.memory && <MemoryChips memory={message.memory} />}
                {!!message.notices?.filter((notice) => !notice.startsWith('规则预览')).length && <details className="group w-fit max-w-full text-[12.5px] text-stone">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-2 py-1 hover:bg-mist hover:text-jade"><Info className="size-3.5" />核对说明 · {message.notices.filter((notice) => !notice.startsWith('规则预览')).length} 条<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /></summary>
                  <ul className="mt-1.5 space-y-1 rounded-2xl bg-paper px-3.5 py-2.5 leading-6">{message.notices.filter((notice) => !notice.startsWith('规则预览')).map((notice, noticeIndex) => <li key={noticeIndex} className="flex gap-2"><span className="mt-2.5 size-1 shrink-0 rounded-full bg-sage" />{notice}</li>)}</ul>
                </details>}
                {latest && !loading && !!message.suggestions?.length && <div className="flex flex-wrap gap-2">{message.suggestions.map((suggestion) => suggestion === '查看我的口味记忆'
                  ? <Link key={suggestion} to="/orders#memory" className="chip !border-jade/30">{suggestion}<ArrowUpRight className="size-3.5" /></Link>
                  : <button key={suggestion} type="button" onClick={() => submit(suggestion)} className="chip !border-jade/30">{suggestion}</button>)}</div>}
              </div>
            </div>;
          })}
          {currentSelectionIndex < 0 && currentCard && !selectionResult?.bundle && messages.length > 0 && <div className="w-full min-w-0 pl-10 sm:pl-11"><p className="mb-2 text-[12.5px] text-stone">为你保留的茶卡</p><TeaCard data={{ ...currentCard, isMain: true }} proposal={proposalFor(selectionResult?.proposal, currentCard)} onOrdered={ordered} configuredOrder={configuredOrders[currentCard.drinkId]} onConfigure={(draft) => configureOrder(draft, currentCard)} onConfirm={() => saveFavorite(currentCard)} /></div>}
          {loading && <div className="flex gap-2.5 sm:gap-3"><Avatar className="size-8" /><div className="flex items-center gap-3 rounded-[22px] rounded-tl-md bg-paper px-4 py-3 ring-1 ring-line/70"><span className="flex gap-1">{[0, 1, 2].map((dot) => <span key={dot} className="typing-dot size-1.5 rounded-full bg-leaf" />)}</span><span className="text-[13.5px] text-stone">{mode === 'preview' ? '正在核对菜单…' : '正在核对菜单、为你配茶…'}</span></div></div>}
        </div>

        <div className="shrink-0 space-y-2 border-t border-line/80 bg-cream/60 px-3 pb-3 pt-2.5 sm:px-4">
          <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
            <button type="button" disabled={loading} onClick={() => setDialog('mood')} className="chip shrink-0 !py-1.5"><Gift className="size-3.5" />情绪盲盒</button>
            <button type="button" disabled={loading} onClick={() => setDialog('bundle')} className="chip shrink-0 !py-1.5"><Users className="size-3.5" />套餐</button>
            <button type="button" disabled={loading} onClick={() => act({ type: 'repeat' }, '老样子')} className="chip shrink-0 !py-1.5"><RotateCcw className="size-3.5" />老样子</button>
            <button type="button" disabled={loading} onClick={() => act({ type: 'orders' }, '我的订单做到哪了？')} className="chip shrink-0 !py-1.5"><ReceiptText className="size-3.5" />订单{activeOrders.length > 0 && <span className="flex size-[18px] items-center justify-center rounded-full bg-gold text-[10.5px] font-semibold text-cream">{activeOrders.length}</span>}</button>
            <button type="button" onClick={() => setShowPreferences(!showPreferences)} aria-expanded={showPreferences} className={cn('chip shrink-0 !py-1.5', showPreferences && '!border-jade !bg-mist')}><Settings2 className="size-3.5" />偏好</button>
          </div>
          {showPreferences && <div className="animate-rise-in grid grid-cols-2 gap-2.5 rounded-[20px] bg-paper p-3.5">
            <label className="space-y-1 text-[12.5px] text-stone">每杯预算<select className={fieldStyle} value={profile.budget || ''} onChange={(event) => setProfile({ ...profile, budget: event.target.value })}><option value="">不指定</option>{['10元以内', '15元以内', '20元以内'].map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="space-y-1 text-[12.5px] text-stone">甜度<select className={fieldStyle} value={profile.sweetness || ''} onChange={(event) => setProfile({ ...profile, sweetness: event.target.value })}><option value="">不指定</option>{['无糖', '三分糖', '五分糖', '七分糖', '全糖'].map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="space-y-1 text-[12.5px] text-stone">温度<select className={fieldStyle} value={profile.temperature || ''} onChange={(event) => setProfile({ ...profile, temperature: event.target.value })}><option value="">不指定</option>{['热饮', '常温', '去冰', '少冰', '正常冰'].map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="space-y-1 text-[12.5px] text-stone">配料要求<select className={fieldStyle} value={profile.dietary?.[0] || ''} onChange={(event) => setProfile({ ...profile, dietary: event.target.value ? [event.target.value] : [] })}><option value="">不指定</option>{['不含乳制品', '不含咖啡因', '不含姜'].map((option) => <option key={option}>{option}</option>)}</select></label>
            <p className="col-span-2 text-[12px] leading-5 text-stone/80">本次对话有效；想长期记住，可以说「记住我…」。原料资料未核准时不会推断适合。</p>
          </div>}
          <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex items-end gap-2 rounded-[24px] bg-paper p-1.5 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-leaf/40">
            <label className="sr-only" htmlFor="tea-demand">你的选茶需求</label>
            <textarea ref={inputRef} id="tea-demand" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} rows={1} placeholder="比如：来杯冰的、三分糖、加椰果，20 块以内" className="min-h-12 max-h-40 flex-1 resize-none bg-transparent px-3 py-3 text-base leading-6 text-ink outline-none placeholder:text-stone/60 focus-visible:outline-none sm:text-[15px]" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
            {loading ? <button type="button" onClick={() => activeRequest.current?.abort()} className="btn-ghost size-12 shrink-0 !px-0" aria-label="取消"><X className="size-5" /></button>
              : <button type="submit" disabled={!canSend || !input.trim()} className="btn-jade size-12 shrink-0 !px-0" aria-label={mode === 'preview' ? '按规则筛选' : '发送'}><Send className="size-5" /></button>}
          </form>
          <p className="hidden items-center gap-1.5 px-2 text-[11.5px] text-stone/80 sm:flex"><ShieldCheck className="size-3.5" />对话只存在这个浏览器 · 下单需你确认复述 · 到店付款，AI 不代付</p>
          {error && <div role="alert" className="rounded-2xl bg-blush px-4 py-3 text-[13.5px] leading-6 text-[#8a4b2a]"><p>{error}</p>{lastAttempt && !loading && <button type="button" className="btn-ghost mt-2 h-9" onClick={() => void run(lastAttempt.body, lastAttempt.mode, true, lastAttempt.displayHistory)}>重试本次请求</button>}</div>}
        </div>
      </section>

      <aside id="tea-selection-panel" aria-label="茶单与记忆" className={cn('min-w-0 space-y-6 lg:block', mobilePane === 'selection' ? 'block' : 'hidden')}>
        <Panel title={<>本次茶单{selectionCount > 0 && <span className="ml-2 align-middle font-sans text-[13px] font-normal text-stone">{selectionCount} 款</span>}</>} aside={<button type="button" onClick={() => setShowFavorites(!showFavorites)} aria-expanded={showFavorites} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-stone hover:bg-mist hover:text-jade"><Bookmark className="size-3.5" />收藏 {favorites.length}</button>}>
          {showFavorites && <div className="card-soft space-y-1 p-4">{!favorites.length ? <p className="py-2 text-[13px] text-stone">还没有收藏的茶卡。</p> : <>
            {favorites.map((card) => <div key={card.drinkId} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper"><DrinkArtwork category="" name={card.drinkName} className="size-12 shrink-0 rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate font-serif text-[15px] font-semibold text-ink">{card.drinkName}</span><span className="text-[12px] text-stone">收藏时 ¥{card.price}</span></span><button type="button" className="btn-ghost h-9 shrink-0 !px-3 text-[12.5px]" onClick={() => submit(`来一杯${card.drinkName}`)}>再来一杯</button></div>)}
            <button type="button" className="px-2 pt-1 text-[12.5px] text-stone hover:text-jade" onClick={() => { setFavorites([]); try { localStorage.removeItem(FAVORITES_KEY); } catch { /* Browser storage may be unavailable. */ } }}>清空收藏</button>
          </>}</div>}
          {loading && !selectionResult ? <div className="card-soft flex min-h-[320px] flex-col items-center justify-center gap-4 text-stone"><LoaderCircle className="size-8 animate-spin text-leaf" strokeWidth={1.5} /><p className="font-serif text-[20px] text-ink">好茶，值得等一会。</p></div>
            : selectionResult ? <div className="space-y-4">
              {selectionResult.mode === 'preview' && <p className="rounded-2xl bg-honey/45 px-4 py-2.5 text-[12.5px] text-[#6b4c12]">以下为规则预览结果，非 AI 生成。</p>}
              {selectionResult.bundle ? <BundleCard bundle={selectionResult.bundle} proposal={selectionResult.proposal} disabled={loading} onOrdered={ordered} />
                : !selectionResult.cards.length ? <div className="card-soft p-6"><p className="whitespace-pre-wrap text-[14.5px] leading-7 text-stone">{selectionResult.reply}</p><Link className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-jade" to="/menu">去茶单里看看<ArrowUpRight className="size-3.5" /></Link></div>
                  : selectionResult.cards.map((card, index) => <TeaCard key={card.drinkId} data={{ ...card, isMain: index === 0 }} proposal={proposalFor(selectionResult.proposal, card)} onOrdered={ordered} configuredOrder={configuredOrders[card.drinkId]} onConfigure={(draft) => configureOrder(draft, card)} onConfirm={() => saveFavorite(card)} onRefresh={selectionResult.intent === 'blindbox' ? undefined : () => submit('在保留之前要求的前提下，换一款不同的饮品。', selectionResult.cards.map((item) => item.drinkId))} onAskMore={() => { setMobilePane('chat'); setInput(''); focusInput(); }} />)}
            </div>
              : <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#e6efdc_0%,#f3f0e2_60%,#f8f5ec_100%)] p-6 ring-1 ring-line/70">
                <DrinkArtwork category="纯茶原叶" name="茉莉" className="pointer-events-none absolute -right-10 -top-4 h-[230px] w-[250px] rotate-[-6deg] !bg-transparent opacity-90" />
                <p className="eyebrow relative">YOUR TEA TABLE</p>
                <h3 className="relative mt-3 max-w-[200px] font-serif text-[26px] font-semibold leading-snug text-ink">茶卡会出现在这里</h3>
                <ol className="relative mt-16 space-y-3">{[['说一句话', '口味、甜度、冰量、预算都可以'], ['核对复述', '价格和规格由门店菜单实时核算'], ['提交到门店', '拿取餐号，到店付款']].map(([title, hint], index) => <li key={title} className="flex items-start gap-3 rounded-2xl bg-cream/80 p-3 backdrop-blur"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-jade font-serif text-[13px] text-cream">{index + 1}</span><span><span className="block text-[14px] font-medium text-ink">{title}</span><span className="block text-[12.5px] text-stone">{hint}</span></span></li>)}</ol>
                <button type="button" onClick={() => { setMobilePane('chat'); focusInput(); }} className="btn-jade relative mt-5 h-11 lg:hidden"><Sparkles className="size-4" />开始聊聊</button>
              </div>}
          {result && <details className="rounded-2xl bg-paper px-4 py-1 text-[13px] text-stone ring-1 ring-line/60"><summary className="flex min-h-11 cursor-pointer items-center">这次回答有帮助吗？</summary><div className="pb-4"><input value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} placeholder="可选：哪里需要改善？" maxLength={500} disabled={!!feedback} className="mb-3 h-11 w-full rounded-xl border border-line bg-cream px-3 text-[14px] outline-none focus:border-leaf" /><div className="flex gap-2"><button type="button" disabled={feedbackPending || !!feedback} onClick={() => void sendFeedback('up')} className="btn-ghost h-10"><ThumbsUp className="size-3.5" />{feedback === 'up' ? '已记录' : '有帮助'}</button><button type="button" disabled={feedbackPending || !!feedback} onClick={() => void sendFeedback('down')} className="btn-ghost h-10"><ThumbsDown className="size-3.5" />{feedback === 'down' ? '已记录' : '待改善'}</button></div></div></details>}
        </Panel>

        <MemoryPanel onAsk={(message) => submit(message)} />

        {activeOrders.length > 0 && <Panel title="进行中的订单" aside={<Link to="/orders" className="text-[13px] text-stone hover:text-jade">全部订单</Link>}>
          <div className="space-y-2">{activeOrders.slice(0, 3).map((order) => <Link key={order.id} to="/orders" className="card-soft flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
            <span className="font-serif text-[26px] font-semibold tracking-wide text-ink">{order.code}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-stone">{order.lines.map((line) => `${line.drinkName}×${line.quantity}`).join('、')}</span>
            <span className={cn('shrink-0 rounded-full px-3 py-1 text-[12.5px] font-medium', order.status === 'ready' ? 'bg-gold text-cream' : 'bg-mist text-jade')}>{STATUS_LABEL[order.status]}</span>
          </Link>)}</div>
        </Panel>}
      </aside>
    </div>

    <MoodPickerDialog open={dialog === 'mood'} onOpenChange={(open) => setDialog(open ? 'mood' : null)} onPick={(action) => act(action, `开一个「${action.mood}」盲盒${action.weather ? `，今天${action.weather}` : ''}`)} />
    <BundleComposerDialog open={dialog === 'bundle'} onOpenChange={(open) => setDialog(open ? 'bundle' : null)} onCompose={(action) => act(action, `帮我们配 ${action.people} 杯：${action.tastes?.join('、')}${action.totalBudget ? `，总预算 ${action.totalBudget} 元` : ''}`)} />
  </div>;
}
