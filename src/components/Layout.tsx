import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNavigation from '@/components/MobileNavigation';
import NativeBridge from '@/components/app/NativeBridge';
import { cn } from '@/lib/utils';
import { isAppShell } from '@/lib/platform';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({top: 0, left: 0, behavior: 'instant'}); }, [pathname]);
  // In the app the chat has its own header; other tabs get a compact top bar.
  const showHeader = !isAppShell || pathname !== '/ai-recommend';
  return (
    <div className={cn('app-shell min-h-screen flex flex-col bg-background', isAppShell && 'app-native')}>
      {showHeader ? <Header /> : <div className="app-safe-top" aria-hidden="true" />}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      {!isAppShell && <Footer />}
      <MobileNavigation />
      <NativeBridge />
    </div>
  );
}
