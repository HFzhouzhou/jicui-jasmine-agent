import { NavLink } from 'react-router-dom';
import { BookOpen, Home, ReceiptText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrders } from '@/hooks/useActiveOrders';

const tabs = [
  { to: '/', label: '首页', icon: Home },
  { to: '/menu', label: '茶单', icon: BookOpen },
  { to: '/ai-recommend', label: '随心配', icon: Sparkles, primary: true },
  { to: '/orders', label: '订单', icon: ReceiptText },
];
export default function MobileNavigation() {
  const { active } = useOrders(30000);
  return <nav aria-label="手机底部导航" className="mobile-navigation glass fixed inset-x-0 bottom-0 z-40 border-t border-line md:hidden">
    <div className="mx-auto grid max-w-md grid-cols-4 px-3 pb-1.5 pt-1.5">
      {tabs.map(({ to, label, icon: Icon, primary }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors', primary ? 'text-jade' : isActive ? 'text-jade' : 'text-stone')}>
        {({ isActive }) => <>
          {primary ? <span className={cn('flex size-11 -mt-6 items-center justify-center rounded-2xl bg-jade text-cream shadow-[0_12px_24px_-10px_rgba(31,74,51,.9)] ring-4 ring-cream transition-transform', isActive && 'scale-105')}><Icon className="size-5" /></span> : <Icon className="size-[21px]" strokeWidth={isActive ? 2.2 : 1.7} />}
          <span>{label}</span>
          {to === '/orders' && active.length > 0 && <span className="absolute right-6 top-1.5 flex size-[18px] items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-cream">{active.length}</span>}
        </>}
      </NavLink>)}
    </div>
  </nav>;
}
