import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/platform';

const PREFIX = 'jicui_';
let installed = false;

/**
 * The app keeps using synchronous localStorage everywhere, but the operating system may clear a
 * WebView's storage. Every jicui_* key is therefore mirrored to native Preferences and restored
 * on launch, before the first render.
 */
export async function restoreNativeStorage() {
  if (!isNativeApp || installed) return;
  installed = true;
  try {
    const { keys } = await Preferences.keys();
    const saved = new Set(keys.filter((key) => key.startsWith(PREFIX)));
    for (const key of saved) {
      if (localStorage.getItem(key) !== null) continue;
      const { value } = await Preferences.get({ key });
      if (value !== null) localStorage.setItem(key, value);
    }
    // Data written before this bridge existed: copy it across once.
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX) && !saved.has(key)) await Preferences.set({ key, value: localStorage.getItem(key) ?? '' });
    }
  } catch { /* Native storage unavailable: the WebView copy still works for this session. */ }

  const proto = Storage.prototype;
  const setItem = proto.setItem;
  const removeItem = proto.removeItem;
  const clear = proto.clear;
  proto.setItem = function (key: string, value: string) {
    setItem.call(this, key, value);
    if (this === window.localStorage && key.startsWith(PREFIX)) void Preferences.set({ key, value: String(value) }).catch(() => undefined);
  };
  proto.removeItem = function (key: string) {
    removeItem.call(this, key);
    if (this === window.localStorage && key.startsWith(PREFIX)) void Preferences.remove({ key }).catch(() => undefined);
  };
  proto.clear = function () {
    clear.call(this);
    if (this === window.localStorage) void Preferences.clear().catch(() => undefined);
  };
}
