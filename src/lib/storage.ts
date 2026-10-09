/** Browser storage with same-tab notifications and a session fallback when storage is blocked. */
const STORAGE_EVENT = 'jicui:storage';
const fallback = new Map<string, string | null>();

function notify(key: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (fallback.has(key)) return fallback.get(key) ?? null;
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): boolean {
    let persisted = false;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
        fallback.delete(key);
        persisted = true;
      }
    } catch { /* Private mode or a full storage quota: keep this session usable. */ }
    if (!persisted) fallback.set(key, value);
    notify(key);
    return persisted;
  },
  removeItem(key: string): boolean {
    let persisted = false;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        fallback.delete(key);
        persisted = true;
      }
    } catch { /* Preserve deletion in the current session. */ }
    if (!persisted) fallback.set(key, null);
    notify(key);
    return persisted;
  },
};

export function readStoredJson<T>(key: string, defaultValue: T, validate?: (value: unknown) => value is T): T {
  try {
    const raw = safeStorage.getItem(key);
    if (!raw) return defaultValue;
    const value: unknown = JSON.parse(raw);
    return (!validate || validate(value)) ? value as T : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function writeStoredJson(key: string, value: unknown): boolean {
  try {
    return safeStorage.setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function subscribeStorage(key: string, listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const sameTab = (event: Event) => {
    if ((event as CustomEvent<{ key: string }>).detail?.key === key) listener();
  };
  const otherTab = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      fallback.delete(key);
      listener();
    }
  };
  window.addEventListener(STORAGE_EVENT, sameTab);
  window.addEventListener('storage', otherTab);
  return () => {
    window.removeEventListener(STORAGE_EVENT, sameTab);
    window.removeEventListener('storage', otherTab);
  };
}
