import { useEffect, useState, useCallback, useRef } from 'react';
import type { Drink } from '@shared/contracts';

export function useMenu() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch('/api/menu', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('菜单暂时无法读取，请稍后重试。');
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { drinks?: unknown }).drinks)) {
        throw new Error('菜单数据格式有误，请联系管理员。');
      }
      if (activeRequest.current !== controller) return;
      setDrinks((payload as { drinks: Drink[] }).drinks);
    } catch (cause) {
      if (activeRequest.current !== controller) return;
      setDrinks([]);
      setError(cause instanceof Error && cause.name !== 'AbortError' ? cause.message : '菜单请求超时，请重试。');
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      const controller = activeRequest.current;
      activeRequest.current = null;
      controller?.abort();
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { drinks, loading, error, refresh };
}
