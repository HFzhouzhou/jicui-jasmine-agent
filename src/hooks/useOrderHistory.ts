import { useState, useEffect, useCallback } from 'react';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';
import { ITeaCardData } from '@/components/TeaCard';

interface IOrderRecord {
  id: string;
  timestamp: number;
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

const STORAGE_KEY = 'jicui_order_history';
const MAX_RECORDS = 5;

export function useOrderHistory() {
  const [orders, setOrders] = useState<IOrderRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 加载历史
  useEffect(() => {
    try {
      const saved = scopedStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as IOrderRecord[];
        setOrders(parsed.slice(0, MAX_RECORDS));
      }
    } catch (error) {
      logger.warn('读取点单历史失败:', String(error));
    }
    setLoaded(true);
  }, []);

  // 保存一杯到历史
  const saveOrder = useCallback((card: ITeaCardData) => {
    const record: IOrderRecord = {
      id: `order_${Date.now()}`,
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

    setOrders((prev) => {
      // 去重（同名饮品更新）
      const filtered = prev.filter((o) => o.drinkName !== card.drinkName);
      const next = [record, ...filtered].slice(0, MAX_RECORDS);
      try {
        scopedStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        logger.warn('保存点单历史失败:', String(e));
      }
      return next;
    });
  }, []);

  // 清空
  const clearOrders = useCallback(() => {
    setOrders([]);
    try {
      scopedStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      logger.warn('清空点单历史失败:', String(e));
    }
  }, []);

  // 把最近一杯转成"再来一杯"的需求文本
  const getReorderDemand = (record: IOrderRecord): string => {
    return `再来一杯${record.drinkName}，${record.sweetness}、${record.temperature}，${record.toppings ? record.toppings + '，' : ''}跟上次一样的搭配。`;
  };

  return {
    orders,
    loaded,
    saveOrder,
    clearOrders,
    getReorderDemand,
  };
}
