import { Capacitor } from '@capacitor/core';

/** True inside the iOS / Android app built with Capacitor. */
export const isNativeApp = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION as string;

/**
 * App layout (tab bar, no website header/footer). Always on in the native app;
 * in a browser, open any page with ?app=1 to preview it (kept for this tab).
 */
export const isAppShell = (() => {
  if (isNativeApp) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === '0') sessionStorage.removeItem('jicui_app_preview');
    else if (params.has('app')) sessionStorage.setItem('jicui_app_preview', '1');
    return sessionStorage.getItem('jicui_app_preview') === '1';
  } catch { return false; }
})();

const configuredBase = String(import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');
/** Web builds call their own origin; the native app needs the server's full HTTPS origin. */
export const API_BASE = isNativeApp ? configuredBase : '';
export const apiConfigured = !isNativeApp || Boolean(configuredBase);
export const apiUrl = (path: string) => `${API_BASE}${path}`;
