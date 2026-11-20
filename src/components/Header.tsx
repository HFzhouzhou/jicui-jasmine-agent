import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import JasmineMark from '@/components/brand/JasmineMark';
import { customerTabs, getCustomerNavigation } from '@/lib/customer-navigation';
import { isAppShell } from '@/lib/platform';
import { cn } from '@/lib/utils';

export default function Header() {
  const { pathname } = useLocation();
  const { current, parent } = getCustomerNavigation(pathname);

  return <header className={cn('glass sticky top-0 z-50 w-full border-b border-line/70', current?.id === 'recommend' && !isAppShell && 'hidden md:block')}>
    <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:h-16 md:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        {parent && <Link to={parent.id === 'menu' ? '/menu?catalog=brand' : parent.to} aria-label={`返回${parent.label}`} className={cn('flex size-11 shrink-0 items-center justify-center rounded-full text-jade hover:bg-mist', !isAppShell && 'md:hidden')}><ArrowLeft className="size-5" aria-hidden="true" /></Link>}
        <Link to="/menu" aria-label="茉莉娘子茶单" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-jade text-cream"><JasmineMark className="size-5" petal="#fffdf7" /></span>
          <span className="truncate font-serif text-[18px] font-semibold tracking-wide text-ink">{isAppShell ? '茉莉娘子' : '极萃东方茉莉'}</span>
        </Link>
      </div>
      {!isAppShell && <nav aria-label="主导航" className="hidden items-center gap-2 md:flex">
        {customerTabs.map(({ id, to, label }) => {
          const selected = current?.id === id;
          const primary = id === 'recommend';
          return <Link key={id} to={to} aria-current={selected ? 'page' : undefined} className={cn('inline-flex min-h-10 items-center rounded-full px-5 text-sm transition-colors', primary
            ? cn('gap-1.5 bg-jade font-semibold text-cream hover:bg-jade-soft', selected && 'ring-2 ring-jade/25 ring-offset-2 ring-offset-cream')
            : selected ? 'bg-mist font-semibold text-jade' : 'text-stone hover:bg-mist/60 hover:text-jade')}>
            {primary && <Sparkles className="size-4 text-honey" aria-hidden="true" />}
            {label}
          </Link>;
        })}
      </nav>}
    </div>
  </header>;
}
