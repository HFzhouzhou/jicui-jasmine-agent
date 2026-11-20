import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Sparkles, UserRound } from 'lucide-react';
import { customerTabs, getCustomerNavigation } from '@/lib/customer-navigation';
import { isAppShell } from '@/lib/platform';
import { cn } from '@/lib/utils';

const icons = { menu: BookOpen, recommend: Sparkles, me: UserRound };

export default function MobileNavigation() {
  const { pathname } = useLocation();
  const { current } = getCustomerNavigation(pathname);

  return <nav aria-label="底部导航" className={cn('mobile-navigation glass fixed inset-x-0 bottom-0 z-40 border-t border-line', !isAppShell && 'md:hidden')}>
    <div className="mx-auto grid h-[var(--tab-bar-height)] max-w-md grid-cols-3 gap-1 px-2 py-1">
      {customerTabs.map(({ id, to, label }) => {
        const Icon = icons[id];
        const selected = current?.id === id;
        const primary = id === 'recommend';
        return <Link key={id} to={to} aria-current={selected ? 'page' : undefined} className={cn('flex items-center justify-center whitespace-nowrap transition-colors', primary
          ? cn('min-h-11 w-full max-w-28 gap-1.5 self-center justify-self-center rounded-full bg-jade px-2 text-[13px] font-semibold text-cream shadow-sm hover:bg-jade-soft', selected && 'ring-2 ring-jade/25 ring-offset-2 ring-offset-cream')
          : cn('flex-col gap-0.5 rounded-xl text-[11.5px]', selected ? 'font-semibold text-jade' : 'font-medium text-stone hover:text-jade'))}>
          {primary ? <Icon className="size-[18px] text-honey" strokeWidth={1.8} aria-hidden="true" />
            : <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', selected && 'bg-mist')}><Icon className="size-5" strokeWidth={selected ? 2 : 1.7} aria-hidden="true" /></span>}
          {label}
        </Link>;
      })}
    </div>
  </nav>;
}
