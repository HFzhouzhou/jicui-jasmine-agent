import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, ReceiptText, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import JasmineMark from '@/components/brand/JasmineMark';
import { useOrders } from '@/hooks/useActiveOrders';

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/ai-recommend', label: 'AI 随心配' },
  { path: '/menu', label: '茉莉茶单' },
  { path: '/orders', label: '我的订单' },
  { path: '/project', label: '关于' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { active } = useOrders(30000);
  const isActive = (path: string) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header className="glass sticky top-0 z-50 w-full border-b border-line/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[76px] md:px-8">
        <NavLink to="/" onClick={() => setMobileOpen(false)} aria-label="极萃东方茉莉，返回首页" className="group flex shrink-0 items-center gap-3">
          <span className="relative flex size-10 items-center justify-center rounded-2xl bg-jade text-cream shadow-[0_10px_24px_-12px_rgba(31,74,51,.9)] transition-transform duration-500 group-hover:rotate-[36deg] md:size-11"><JasmineMark className="size-6 md:size-7" petal="#fffdf7" /></span>
          <span className="flex flex-col leading-none"><span className="font-serif text-[18px] font-semibold tracking-[0.12em] text-ink md:text-[20px]">极萃东方茉莉</span><span className="mt-1.5 text-[10px] font-medium tracking-[0.24em] text-leaf">JICUI · JASMINE</span></span>
        </NavLink>
        <nav aria-label="主导航" className="hidden items-center gap-1 rounded-full border border-line/80 bg-cream/70 p-1 md:flex">
          {NAV_ITEMS.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={cn('relative rounded-full px-4 py-2 text-[14px] transition-colors lg:px-5', isActive(item.path) ? 'bg-jade text-cream shadow-sm' : 'text-stone hover:bg-mist hover:text-jade')}>
            {item.label}
            {item.path === '/orders' && active.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-gold text-[11px] font-semibold text-cream ring-2 ring-cream">{active.length}</span>}
          </NavLink>)}
        </nav>
        <div className="flex items-center gap-2">
          <NavLink to="/ai-recommend" className="btn-jade hidden h-11 lg:inline-flex"><Sparkles className="size-4" />一句话配一杯</NavLink>
          <NavLink to="/orders" aria-label="我的订单" className="relative flex size-11 items-center justify-center rounded-full border border-line bg-cream text-jade md:hidden"><ReceiptText className="size-5" />{active.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-gold text-[11px] font-semibold text-cream">{active.length}</span>}</NavLink>
          <button type="button" className="flex size-11 items-center justify-center rounded-full border border-line bg-cream text-jade md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileOpen} aria-controls="mobile-navigation">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {mobileOpen && <nav id="mobile-navigation" aria-label="手机导航" className="animate-rise-in border-t border-line bg-cream px-4 pb-5 pt-2 md:hidden">{NAV_ITEMS.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setMobileOpen(false)} className={cn('flex items-center justify-between rounded-2xl px-4 py-3.5 font-serif text-lg', isActive(item.path) ? 'bg-mist text-jade' : 'text-ink')}>{item.label}<JasmineMark className="size-4 text-sage" /></NavLink>)}</nav>}
    </header>
  );
}
