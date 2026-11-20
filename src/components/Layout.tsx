import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import MobileNavigation from '@/components/MobileNavigation';
import NativeBridge from '@/components/app/NativeBridge';
import FloatingTeaPet from '@/components/tea-pet/FloatingTeaPet';
import { cn } from '@/lib/utils';
import { isAppShell } from '@/lib/platform';
import { getCustomerNavigation } from '@/lib/customer-navigation';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({top: 0, left: 0, behavior: 'instant'}); }, [pathname]);
  const showHeader = !isAppShell || getCustomerNavigation(pathname).current?.id !== 'recommend';
  return (
    <div className={cn('app-shell min-h-screen flex flex-col bg-background', isAppShell && 'app-native')}>
      {showHeader ? <Header /> : <div className="app-safe-top" aria-hidden="true" />}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <MobileNavigation />
      {!/^\/admin(?:\/|$)/i.test(pathname) && <FloatingTeaPet pathname={pathname} />}
      <NativeBridge />
    </div>
  );
}
