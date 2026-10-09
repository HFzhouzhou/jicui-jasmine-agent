import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

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
}

interface OrderHistoryPanelProps {
  orders: IOrderRecord[];
  onReorder: (order: IOrderRecord) => void;
  onClear: () => void;
  trigger?: React.ReactNode;
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}

function OrderHistoryPanel({ orders, onReorder, onClear, trigger }: OrderHistoryPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-[85%] sm:max-w-md p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-5 pb-3 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              我的点单
              <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary">
                {orders.length} 杯
              </Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="size-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                  <History className="size-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">还没有点单记录</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  推荐一款合心意的，点「就这杯了」加入记录
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {orders.map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="bg-card border border-border/60 rounded-xl p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-foreground truncate">
                          {order.drinkName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-serif italic truncate">
                          {order.drinkNameEn}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-primary">
                          ¥{order.price}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground/70">
                        {order.sweetness}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground/70">
                        {order.temperature}
                      </span>
                      {order.toppings && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground/70">
                          {order.toppings}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(order.timestamp)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => {
                          onReorder(order);
                          setOpen(false);
                        }}
                      >
                        <RotateCcw className="size-3" />
                        再来一杯
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {orders.length > 0 && (
            <div className="p-4 border-t border-border/40">
              <Button
                variant="outline"
                className="w-full gap-2 text-muted-foreground"
                size="sm"
                onClick={onClear}
              >
                <Trash2 className="size-3.5" />
                清空记录
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default memo(OrderHistoryPanel);
