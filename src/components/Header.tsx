import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/ai-recommend', label: 'AI 随心配' },
  { path: '/menu', label: '菜单库' },
  { path: '/project', label: '项目方案' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Leaf className="size-5 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold text-foreground tracking-wide">极萃东方茉莉</span>
            <span className="text-[10px] text-muted-foreground">JICUI ORIENTAL JASMINE</span>
          </div>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === '/'
              ? pathname === '/'
              : pathname === item.path || pathname.startsWith(`${item.path}/`);
            const isHighlight = item.path === '/ai-recommend';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isHighlight && isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isHighlight
                      ? 'text-primary hover:bg-primary/10'
                      : isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="菜单"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.path === '/'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(`${item.path}/`);
              const isHighlight = item.path === '/ai-recommend';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    isHighlight && isActive
                      ? 'bg-primary text-primary-foreground'
                      : isHighlight
                        ? 'text-primary bg-primary/5'
                        : isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
