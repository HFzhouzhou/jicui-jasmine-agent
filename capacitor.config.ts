import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell for the customer app. The web build in dist/client is bundled into the app;
 * API calls go to VITE_API_BASE (see .env.app.example), never to a path relative to the webview.
 *
 * Optional, for local testing only:
 *   CAP_SERVER_URL=http://192.168.x.x:5173  live-reload from the Mac's dev server
 *   CAP_ALLOW_HTTP=1                         allow a plain-HTTP API on the local network
 * Release builds must leave both unset and use an HTTPS API.
 */
const liveReload = process.env.CAP_SERVER_URL?.trim();
const allowHttp = Boolean(liveReload || process.env.CAP_ALLOW_HTTP);

const config: CapacitorConfig = {
  appId: 'cn.moliniangzi.app',
  appName: '茉莉娘子',
  webDir: 'dist/client',
  backgroundColor: '#f8f5ec',
  server: {
    androidScheme: 'https',
    ...(liveReload ? { url: liveReload } : {}),
    ...(allowHttp ? { cleartext: true } : {}),
  },
  android: { allowMixedContent: allowHttp },
  ios: { contentInset: 'never', scheme: 'Moliniangzi' },
  plugins: {
    SplashScreen: { launchShowDuration: 3000, launchAutoHide: false, backgroundColor: '#123B2C', showSpinner: false, androidScaleType: 'CENTER_CROP' },
    StatusBar: { overlaysWebView: false, style: 'LIGHT', backgroundColor: '#fffdf7' },
    Keyboard: { resizeOnFullScreen: true },
  },
};

export default config;
