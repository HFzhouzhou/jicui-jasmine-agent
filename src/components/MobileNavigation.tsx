import { NavLink } from 'react-router-dom';
import { Flower2, MessageCircle, BookOpen, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  {to:'/', label:'首页', icon:Flower2},
  {to:'/ai-recommend', label:'随心配', icon:MessageCircle},
  {to:'/menu', label:'茶谱', icon:BookOpen},
  {to:'/project', label:'关于', icon:Sprout},
];
export default function MobileNavigation() {
  return <nav aria-label="手机底部导航" className="mobile-navigation fixed inset-x-0 bottom-0 z-40 border-t border-[#253b2d]/10 bg-[#fafaf3]/95 backdrop-blur-xl md:hidden">
    <div className="mx-auto grid max-w-md grid-cols-4 px-3 pt-2 pb-1">
      {tabs.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>cn('flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] tracking-[.08em] transition-colors',isActive?'bg-[#e6eccf] text-[#253b2d]':'text-[#747b6a]')}><Icon className="size-[19px]" strokeWidth={1.6}/><span>{label}</span></NavLink>)}
    </div>
  </nav>;
}
