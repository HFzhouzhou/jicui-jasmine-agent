import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNavigation from '@/components/MobileNavigation';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({top: 0, left: 0, behavior: 'instant'}); }, [pathname]);
  return (
    <div className="app-shell min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
      <MobileNavigation />
    </div>
  );
}
