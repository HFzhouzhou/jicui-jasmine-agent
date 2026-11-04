import { useCallback, useEffect, useState } from 'react';
import type { TasteMemory } from '@shared/contracts';
import { clearMemory, getMemory, saveMemory } from '@/lib/orders';

export const MEMORY_CHANGED = 'jicui:memory-changed';
export const announceMemory = (memory: TasteMemory) => window.dispatchEvent(new CustomEvent<TasteMemory>(MEMORY_CHANGED, { detail: memory }));

/** This browser's taste memory, kept in sync between the chat, the side panel and the orders page. */
export function useTasteMemory() {
  const [memory, setMemory] = useState<TasteMemory | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try { const value = await getMemory(signal); if (!signal?.aborted) { setMemory(value); setError(''); } }
    catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : '口味记忆读取失败'); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const onChange = (event: Event) => setMemory((event as CustomEvent<TasteMemory>).detail);
    window.addEventListener(MEMORY_CHANGED, onChange);
    return () => { controller.abort(); window.removeEventListener(MEMORY_CHANGED, onChange); };
  }, [refresh]);
  const save = useCallback(async (next: TasteMemory) => { const value = await saveMemory(next); announceMemory(value); return value; }, []);
  const clear = useCallback(async () => { const value = await clearMemory(); announceMemory(value); return value; }, []);
  return { memory, error, refresh, save, clear };
}
