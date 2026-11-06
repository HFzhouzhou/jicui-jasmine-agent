import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, ChevronRight, Info, ReceiptText, ShieldCheck, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TeaCard } from '@shared/contracts';
import JasmineMark from '@/components/brand/JasmineMark';
import DrinkArtwork from '@/components/DrinkArtwork';
import MemoryPanel from '@/components/chat/MemoryPanel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useOrders } from '@/hooks/useActiveOrders';
import { isTeaCard } from '@/lib/tea-card';
import { customerId } from '@/lib/customer';
import { APP_VERSION, isNativeApp, nativePlatform } from '@/lib/platform';

const FAVORITES_KEY = 'jicui_favorites_v2';
/** Browsing data only. The customer ID stays, otherwise this device would lose its orders and memory. */
const LOCAL_KEYS = ['jicui_conversation_v2', FAVORITES_KEY, 'jicui_order_history', 'jicui_user_profile', 'jicui_newuser_guide_shown'];
function readFavorites(): TeaCard[] {
  try { const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); return Array.isArray(value) ? value.filter(isTeaCard).slice(0, 12) : []; }
  catch { return []; }
}
const platformName = isNativeApp ? (nativePlatform === 'ios' ? 'iOS' : 'Android') : '网页版';

function Row({ to, icon: Icon, label, hint, onClick, tone }: { to?: string; icon: typeof Info; label: string; hint?: string; onClick?: () => void; tone?: 'danger' }) {
  const body = <><span className={`flex size-10 items-center justify-center rounded-2xl ${tone === 'danger' ? 'bg-blush text-[#9a4a33]' : 'bg-mist text-jade'}`}><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className={`block text-[15px] ${tone === 'danger' ? 'text-[#9a4a33]' : 'text-ink'}`}>{label}</span>{hint && <span className="block truncate text-[12.5px] text-stone">{hint}</span>}</span><ChevronRight className="size-4 text-stone/60" /></>;
  const className = 'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-mist/60 hover:bg-paper';
  return to ? <Link to={to} className={className}>{body}</Link> : <button type="button" onClick={onClick} className={className}>{body}</button>;
}

/** "我的": this device's identity, taste memory, favourites and settings. No account needed. */
export default function MePage() {
  const navigate = useNavigate();
  const { active } = useOrders(30000);
  const [favorites, setFavorites] = useState(readFavorites);
  const [confirmClear, setConfirmClear] = useState(false);
  const id = customerId();

  function clearLocal() {
    try { for (const key of LOCAL_KEYS) localStorage.removeItem(key); } catch { /* Nothing stored. */ }
    setFavorites([]); setConfirmClear(false);
    toast.success('已清除本机对话、收藏和偏好；订单与口味记忆保留');
  }

  return <div className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-5 sm:px-6">
    <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(120%_120%_at_0%_0%,#2c5f42_0%,#1f4a33_45%,#14281c_100%)] p-6 text-cream">
      <JasmineMark className="pointer-events-none absolute -right-8 -top-8 size-40 opacity-[0.08]" petal="#fffdf7" heart="#fffdf7" />
      <div className="relative flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-[22px] bg-cream/10 ring-1 ring-white/15"><JasmineMark className="size-9" petal="#fffdf7" /></span>
        <div className="min-w-0"><h1 className="font-serif text-[24px] font-semibold">本机顾客</h1><p className="mt-0.5 text-[13px] text-cream/70">编号尾号 {id.replace(/-/g, '').slice(-6).toUpperCase()} · 无需注册</p></div>
      </div>
      <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/[0.07] py-3 text-center">
        <Link to="/orders" className="px-2"><p className="font-serif text-[22px] font-semibold">{active.length}</p><p className="text-[12px] text-cream/70">进行中订单</p></Link>
        <a href="#favorites" className="px-2"><p className="font-serif text-[22px] font-semibold">{favorites.length}</p><p className="text-[12px] text-cream/70">收藏</p></a>
        <Link to="/ai-recommend" className="px-2"><p className="font-serif text-[22px] font-semibold">配</p><p className="text-[12px] text-cream/70">随心配一杯</p></Link>
      </div>
    </section>

    <MemoryPanel editable onAsk={(message) => navigate(`/ai-recommend?q=${encodeURIComponent(message)}`)} />

    <section id="favorites" className="card-soft scroll-mt-20 p-5">
      <h2 className="flex items-center gap-2 font-serif text-[19px] font-semibold text-ink"><Bookmark className="size-5 text-leaf" />收藏的茶</h2>
      {!favorites.length ? <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-[13.5px] text-stone">在茶卡上点「收藏」，喜欢的茶会出现在这里。</p>
        : <ul className="mt-3 divide-y divide-line/70">{favorites.map((card) => <li key={card.drinkId} className="flex items-center gap-3 py-2.5">
          <DrinkArtwork category="" name={card.drinkName} className="size-12 shrink-0 rounded-xl bg-paper" />
          <span className="min-w-0 flex-1"><span className="block truncate font-serif text-[16px] font-semibold text-ink">{card.drinkName}</span><span className="text-[12px] text-stone">收藏时 ¥{card.price}</span></span>
          <button type="button" className="btn-ghost h-9 shrink-0 !px-3 text-[13px]" onClick={() => navigate(`/ai-recommend?q=${encodeURIComponent(`来一杯${card.drinkName}`)}`)}>再来一杯</button>
        </li>)}</ul>}
    </section>

    <section className="card-soft divide-y divide-line/70 overflow-hidden">
      <Row to="/orders" icon={ReceiptText} label="我的订单" hint={active.length ? `${active.length} 单进行中` : '取餐进度、重做与退款'} />
      <Row to="/admin" icon={Store} label="门店模式" hint="店员登录接单台、维护菜单" />
      <Row to="/project" icon={Info} label="关于茉莉娘子" />
      <Row icon={Trash2} label="清除本机对话与收藏" hint="订单和口味记忆会保留" tone="danger" onClick={() => setConfirmClear(true)} />
    </section>

    <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-stone"><ShieldCheck className="size-3.5 text-leaf" />版本 {APP_VERSION} · {platformName} · 到店付款，AI 不代付</p>

    <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
      <AlertDialogContent className="rounded-[24px] border-0 bg-paper">
        <AlertDialogHeader><AlertDialogTitle className="font-serif text-ink">清除本机对话与收藏？</AlertDialogTitle><AlertDialogDescription>会删除这台设备上的聊天记录、收藏和临时偏好。订单、取餐进度和口味记忆保存在门店服务器上，不会被删除。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel className="rounded-full">再想想</AlertDialogCancel><AlertDialogAction className="rounded-full bg-[#a2552e] hover:bg-[#8a4626]" onClick={clearLocal}>清除</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
