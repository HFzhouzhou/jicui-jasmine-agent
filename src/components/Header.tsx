import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Flower2, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: '首页', number: '01' },
  { path: '/ai-recommend', label: 'AI 随心配', number: '02' },
  { path: '/menu', label: '茉莉茶单', number: '03' },
  { path: '/project', label: '关于我们', number: '04' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const active = (path: string) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#253b2d]/[0.08] bg-[#f7f7ef]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-5 px-5 md:h-[82px] md:px-8 lg:h-[96px]">
        <NavLink to="/" onClick={() => setMobileOpen(false)} aria-label="极萃东方茉莉，返回首页" className="group flex shrink-0 items-center gap-3 text-[#253b2d]">
          <span className="flex size-10 items-center justify-center rounded-full border border-[#253b2d]/25 transition-transform duration-500 group-hover:rotate-45 lg:size-12"><Flower2 className="size-6 stroke-[1.25] lg:size-7" /></span>
          <span className="flex flex-col gap-1 leading-none"><span className="font-serif text-[19px] font-semibold tracking-[0.12em] lg:text-[21px]">极萃东方茉莉</span><span className="text-[8px] font-medium tracking-[0.21em] lg:text-[9px]">JICUI ORIENTAL JASMINE</span></span>
        </NavLink>
        <nav aria-label="主导航" className="hidden items-center gap-7 md:flex lg:gap-10">
          {NAV_ITEMS.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={cn('relative py-3 text-[13px] tracking-wide transition-colors after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-[#253b2d] after:transition-transform hover:text-[#253b2d] hover:after:scale-x-100', active(item.path) ? 'text-[#253b2d] after:scale-x-100' : 'text-[#70796c]')}>{item.label}</NavLink>)}
        </nav>
        <NavLink to="/ai-recommend?mode=chat" className="hidden items-center gap-5 rounded-full bg-[#253b2d] py-3 pl-5 pr-4 text-xs text-[#f7f7ef] transition-colors hover:bg-[#3d5540] lg:inline-flex">开始选茶<ArrowUpRight className="size-4" /></NavLink>
        <button type="button" className="flex size-11 items-center justify-center rounded-full border border-[#253b2d]/15 text-[#253b2d] transition-colors hover:bg-[#e8ecdc] md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileOpen} aria-controls="mobile-navigation">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
      {mobileOpen && <nav id="mobile-navigation" aria-label="手机导航" className="border-t border-[#253b2d]/10 bg-[#f7f7ef] px-5 pb-6 pt-3 md:hidden">{NAV_ITEMS.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setMobileOpen(false)} className={cn('flex items-center justify-between border-b border-[#253b2d]/10 py-4', active(item.path) ? 'text-[#253b2d]' : 'text-[#70796c]')}><span className="flex items-center gap-4"><span className="text-[10px] tracking-widest opacity-60">{item.number}</span><span className="font-serif text-xl">{item.label}</span></span><ArrowUpRight className="size-4" /></NavLink>)}</nav>}
    </header>
  );
}
