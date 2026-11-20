import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, Brain, ChevronRight, Info, ReceiptText, Sparkles, Store, Trash2, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { TeaCard } from '@shared/contracts';
import DrinkArtwork from '@/components/DrinkArtwork';
import MemoryPanel from '@/components/chat/MemoryPanel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useOrders } from '@/hooks/useActiveOrders';
import { isTeaCard } from '@/lib/tea-card';
import { APP_VERSION, isNativeApp, nativePlatform } from '@/lib/platform';
import { cn } from '@/lib/utils';

const FAVORITES_KEY = 'jicui_favorites_v2';
/** Browsing data only. The customer ID stays, otherwise this device would lose its orders and memory. */
const LOCAL_KEYS = ['jicui_conversation_v2', FAVORITES_KEY, 'jicui_order_history', 'jicui_user_profile', 'jicui_newuser_guide_shown'];
function readFavorites(): TeaCard[] {
  try { const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); return Array.isArray(value) ? value.filter(isTeaCard).slice(0, 12) : []; }
  catch { return []; }
}
const platformName = isNativeApp ? (nativePlatform === 'ios' ? 'iOS' : 'Android') : '网页版';

type RowProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  tone?: 'danger';
} & ({ to: string } | { onClick: () => void; expanded?: boolean; controls?: string });

function Row({ icon: Icon, label, hint, tone, ...action }: RowProps) {
  const expanded = 'onClick' in action ? action.expanded : undefined;
  const body = <>
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl', tone === 'danger' ? 'bg-blush text-[#9a4a33]' : 'bg-mist text-jade')}><Icon className="size-4" aria-hidden="true" /></span>
    <span className={cn('min-w-0 flex-1 text-sm font-medium', tone === 'danger' ? 'text-[#9a4a33]' : 'text-ink')}>{label}</span>
    {hint && <span className="text-right text-xs text-stone">{hint}</span>}
    <ChevronRight aria-hidden="true" className={cn('size-4 shrink-0 text-stone/70 transition-transform motion-reduce:transition-none', expanded && 'rotate-90')} />
  </>;
  const className = 'flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jade';
  return 'to' in action ? <Link to={action.to} className={className}>{body}</Link>
    : <button type="button" onClick={action.onClick} aria-expanded={expanded} aria-controls={action.controls} className={className}>{body}</button>;
}

export default function MePage() {
  const navigate = useNavigate();
  const { hash, search } = useLocation();
  const { active } = useOrders(30000);
  const [favorites, setFavorites] = useState(readFavorites);
  const [clearTarget, setClearTarget] = useState<'favorites' | 'device' | null>(null);
  const showFavorites = hash === '#favorites';
  const showMemory = hash === '#memory';
  const clearFavorites = clearTarget === 'favorites';

  useEffect(() => {
    if (!showFavorites && !showMemory) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [hash, showFavorites, showMemory]);

  function togglePanel(panel: '#favorites' | '#memory') {
    navigate({ search, hash: hash === panel ? '' : panel }, { replace: true });
  }

  function clearLocal() {
    const keys = clearFavorites ? [FAVORITES_KEY] : LOCAL_KEYS;
    try {
      for (const key of keys) localStorage.removeItem(key);
      setFavorites([]);
      toast.success(clearFavorites ? '已清空收藏' : '已清除本机对话、收藏和临时偏好');
    } catch {
      toast.error('无法清除本机数据，请稍后重试');
    }
    setClearTarget(null);
  }

  return <div className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
    <h1 className="px-1 font-serif text-3xl font-semibold text-ink">我的</h1>

    <section className="card-soft divide-y divide-line/70 overflow-hidden" aria-label="我的茶饮">
      <Row to="/orders" icon={ReceiptText} label="我的订单" hint={active.length ? `${active.length} 单进行中` : undefined} />
      <div>
        <Row icon={Bookmark} label="收藏的茶" hint={favorites.length ? `${favorites.length} 杯` : undefined} expanded={showFavorites} controls="favorites" onClick={() => togglePanel('#favorites')} />
        <div id="favorites" hidden={!showFavorites} className="scroll-mt-24 px-4 pb-3">
          {!favorites.length ? <p className="rounded-xl bg-paper px-3 py-2.5 text-sm text-stone">在随心配的茶卡上点「收藏」，喜欢的茶会出现在这里。</p>
            : <>
              <ul className="divide-y divide-line/70">{favorites.map((card) => <li key={card.drinkId} className="flex items-center gap-3 py-2">
                <DrinkArtwork category="" name={card.drinkName} className="size-11 shrink-0 rounded-xl bg-paper" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink">{card.drinkName}</span><span className="text-xs text-stone">收藏时 ¥{card.price}</span></span>
                <Link to={`/ai-recommend?q=${encodeURIComponent(`来一杯${card.drinkName}`)}`} className="btn-ghost h-9 shrink-0 !px-3 text-[13px]">再来一杯</Link>
              </li>)}</ul>
              <button type="button" className="btn-ghost mt-1 h-9 !px-3 text-[13px]" onClick={() => setClearTarget('favorites')}>清空收藏</button>
            </>}
        </div>
      </div>
      <div>
        <Row icon={Brain} label="口味记忆" expanded={showMemory} controls="me-memory" onClick={() => togglePanel('#memory')} />
        <div id="me-memory" hidden={!showMemory} className="px-4 pb-4">
          {showMemory && <MemoryPanel editable onAsk={(message) => navigate(`/ai-recommend?q=${encodeURIComponent(message)}`)} />}
        </div>
      </div>
      <Row to="/personality" icon={Sparkles} label="茶人格" hint="三题选一杯" />
    </section>

    <section className="card-soft divide-y divide-line/70 overflow-hidden" aria-label="应用与设置">
      <Row to="/project" icon={Info} label="关于茉莉娘子" />
      <Row to="/admin" icon={Store} label="门店模式" />
      <Row icon={Trash2} label="清除本机对话与收藏" tone="danger" onClick={() => setClearTarget('device')} />
    </section>

    <p className="text-center text-xs text-stone">版本 {APP_VERSION} · {platformName}</p>

    <AlertDialog open={clearTarget !== null} onOpenChange={(open) => { if (!open) setClearTarget(null); }}>
      <AlertDialogContent className="rounded-[24px] border-0 bg-paper">
        <AlertDialogHeader><AlertDialogTitle className="font-serif text-ink">{clearFavorites ? '清空收藏？' : '清除本机对话与收藏？'}</AlertDialogTitle><AlertDialogDescription>{clearFavorites ? '将删除这台设备上收藏的茶卡。' : '将删除这台设备上的聊天记录、收藏和临时偏好，保留订单、取餐进度和口味记忆。'}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel className="rounded-full">再想想</AlertDialogCancel><AlertDialogAction className="rounded-full bg-[#a2552e] hover:bg-[#8a4626]" onClick={clearLocal}>清除</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
