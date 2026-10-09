import { useState, useEffect, useCallback } from 'react';
import { readStoredJson, writeStoredJson, safeStorage, subscribeStorage } from '@/lib/storage';

interface SavedTeaCard {
  drinkName: string;
  drinkNameEn: string;
  price: number;
  volume: string;
  sweetness: string;
  temperature: string;
  toppings: string;
  reason: string;
  message: string;
  orderPhrase?: string;
  orderPhraseEn?: string;
}
export interface IOrderRecord extends SavedTeaCard { id: string; timestamp: number }

const STORAGE_KEY = 'jicui_order_history';
const MAX_RECORDS = 20;

function isOrderList(value: unknown): value is IOrderRecord[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object'
    && ['id', 'drinkName', 'drinkNameEn', 'volume', 'sweetness', 'temperature', 'toppings', 'reason', 'message'].every((key) => typeof item[key] === 'string')
    && Number.isFinite(item.timestamp) && Number.isFinite(item.price) && item.price >= 0
    && (item.orderPhrase === undefined || typeof item.orderPhrase === 'string')
    && (item.orderPhraseEn === undefined || typeof item.orderPhraseEn === 'string'));
}
const readOrders = () => readStoredJson<IOrderRecord[]>(STORAGE_KEY, [], isOrderList).slice(0, MAX_RECORDS);

export function useOrderHistory() {
  const [orders, setOrders] = useState<IOrderRecord[]>(readOrders);
  useEffect(() => {
    const unsubscribe = subscribeStorage(STORAGE_KEY, () => setOrders(readOrders()));
    setOrders(readOrders());
    return unsubscribe;
  }, []);

  const saveOrder = useCallback((card: SavedTeaCard) => {
    const record: IOrderRecord = {
      id: `tea_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`,
      timestamp: Date.now(),
      drinkName: card.drinkName,
      drinkNameEn: card.drinkNameEn,
      price: card.price,
      volume: card.volume,
      sweetness: card.sweetness,
      temperature: card.temperature,
      toppings: card.toppings,
      reason: card.reason,
      message: card.message,
      orderPhrase: card.orderPhrase,
      orderPhraseEn: card.orderPhraseEn,
    };
    if (!isOrderList([record])) return;
    writeStoredJson(STORAGE_KEY, [record, ...readOrders()].slice(0, MAX_RECORDS));
  }, []);

  const clearOrders = useCallback(() => { safeStorage.removeItem(STORAGE_KEY); }, []);
  const getReorderDemand = (record: IOrderRecord) => `我之前保存过${record.drinkName}，${record.sweetness}、${record.temperature}。请根据当前菜单重新确认价格和可选规格。`;
  return { orders, loaded: true, saveOrder, clearOrders, getReorderDemand };
}
