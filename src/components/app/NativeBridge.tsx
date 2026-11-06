import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as NativeApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import JasmineMark from '@/components/brand/JasmineMark';
import { apiRequest } from '@/lib/api';
import { APP_VERSION, isNativeApp, nativePlatform } from '@/lib/platform';

type Release = { latest: string | null; minimum: string | null; downloadUrl: string | null };
const older = (a: string, b: string) => {
  const [x, y] = [a, b].map((value) => value.split('.').map(Number));
  for (let index = 0; index < 3; index++) if ((x[index] || 0) !== (y[index] || 0)) return (x[index] || 0) < (y[index] || 0);
  return false;
};
const openExternal = (url: string) => { window.location.href = url; };

/** Native-only glue: splash, status bar, Android back button and the update notice. Renders nothing on the web. */
export default function NativeBridge() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const path = useRef(pathname);
  const [required, setRequired] = useState<Release | null>(null);
  useEffect(() => { path.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!isNativeApp) return;
    void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    if (nativePlatform === 'android') void StatusBar.setBackgroundColor({ color: '#fffdf7' }).catch(() => undefined);
    requestAnimationFrame(() => void SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined));
    const back = NativeApp.addListener('backButton', () => {
      // An open sheet or dialog closes first, the same way Escape closes it on the web.
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }
      if (path.current !== '/') { if (window.history.length > 1) navigate(-1); else navigate('/', { replace: true }); return; }
      void NativeApp.minimizeApp().catch(() => undefined);
    });
    return () => { void back.then((handle) => handle.remove()); };
  }, [navigate]);

  useEffect(() => {
    if (!isNativeApp) return;
    const controller = new AbortController();
    apiRequest<Release>('/api/app/version', { signal: controller.signal }, 8000).then((release) => {
      if (release.minimum && older(APP_VERSION, release.minimum)) setRequired(release);
      else if (release.latest && older(APP_VERSION, release.latest)) toast.message(`新版本 ${release.latest} 可以更新`, { description: `当前 ${APP_VERSION}`, ...(release.downloadUrl ? { action: { label: '去更新', onClick: () => openExternal(release.downloadUrl!) } } : {}) });
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!required) return null;
  return <Dialog open>
    <DialogContent showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()} className="max-w-sm rounded-[28px] border-0 bg-paper p-7 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-[20px] bg-jade"><JasmineMark className="size-8" petal="#fffdf7" /></span>
      <DialogTitle className="mt-3 font-serif text-[22px] font-semibold text-ink">需要更新到 {required.latest || required.minimum}</DialogTitle>
      <DialogDescription className="text-[14px] leading-6 text-stone">当前版本 {APP_VERSION} 已不再支持下单。更新后订单和口味记忆都会保留。</DialogDescription>
      {required.downloadUrl ? <button type="button" onClick={() => openExternal(required.downloadUrl!)} className="btn-jade mt-2 h-12 w-full"><Download className="size-4" />下载新版本</button>
        : <p className="mt-2 text-[13px] text-stone">请联系门店获取新版本安装包。</p>}
    </DialogContent>
  </Dialog>;
}
