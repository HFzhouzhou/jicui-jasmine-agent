import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, X, Utensils, Receipt, Wand2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ITeaCardData } from './TeaCard';
import TeaNameDIY from './TeaNameDIY';
import { toast } from 'sonner';

interface OrderReceiptProps {
  card: ITeaCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  onNameChange?: (name: string, style: 'elegant' | 'fun') => void;
}

function OrderReceipt({ card, open, onOpenChange, onConfirm, onNameChange }: OrderReceiptProps) {
  const [copied, setCopied] = useState(false);

  if (!card) return null;

  const receiptText = `————— 极萃东方茉莉 —————
   点单小票
 ${card.customName ? `
 【${card.customNameStyle === 'elegant' ? '雅致' : '个性'}定制名】
 「${card.customName}」
 ` : ''}
 饮品：${card.drinkName}
     ${card.drinkNameEn}
 甜度：${card.sweetness}
 温度：${card.temperature}
 小料：${card.toppings || '不加料'}
 容量：${card.volume}
 ———————————————————
 合计：¥${card.price}
 
 【到店点单说】
 「${card.orderPhrase || `${card.drinkName}，${card.sweetness}、${card.temperature}${card.toppings ? '、' + card.toppings : ''}，谢谢`}」
 
 ${card.orderPhraseEn ? `【English Order】
 ${card.orderPhraseEn}` : ''}
 ——— 以上是您的点单 ———`;

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    toast.success('小票已复制');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    onConfirm?.();
    toast.success('已加入「我的点单」记录');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-primary/10 to-background p-5 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Receipt className="size-5 text-primary" />
              点单小票
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* 小票主体 - 用等宽字体模拟热敏纸 */}
        <div className="px-5 py-4 font-mono text-xs text-foreground bg-[repeating-linear-gradient(transparent,transparent_20px,rgba(0_0_0_0.02)_20px,rgba(0_0_0_0.02)_21px)]">
          <div className="text-center text-[10px] text-muted-foreground mb-2">
            ——— 极萃东方茉莉 ———
          </div>
          <div className="text-center text-[10px] text-muted-foreground mb-3">
            茉莉娘子专属点单
          </div>

           <div className="space-y-1.5">
             {card.customName && (
               <div className="text-center mb-2 pb-2 border-b border-dashed border-border/60">
                 <div className="text-[10px] text-primary mb-1">
                   ✦ {card.customNameStyle === 'elegant' ? '雅致' : '玩梗'}定制名 ✦
                 </div>
                 <div className="text-sm font-bold text-primary">
                   「{card.customName}」
                 </div>
               </div>
             )}
             <div className="flex justify-between border-b border-dashed border-border/60 pb-2">
              <span>饮品</span>
              <span className="font-semibold text-right">{card.drinkName}</span>
            </div>
            <div className="text-[10px] text-muted-foreground text-right italic">
              {card.drinkNameEn}
            </div>

            <div className="flex justify-between">
              <span>甜度</span>
              <span>{card.sweetness}</span>
            </div>
            <div className="flex justify-between">
              <span>温度</span>
              <span>{card.temperature}</span>
            </div>
            <div className="flex justify-between">
              <span>小料</span>
              <span>{card.toppings || '不加料'}</span>
            </div>
            <div className="flex justify-between">
              <span>容量</span>
              <span>{card.volume}</span>
            </div>

            <div className="border-t border-dashed border-border/60 pt-2 mt-2 flex justify-between text-sm font-bold">
              <span>合计</span>
              <span className="text-primary">¥{card.price}</span>
            </div>
          </div>

          {/* 到店点单说 */}
          {card.orderPhrase && (
            <div className="mt-3 p-2.5 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-[10px] text-primary font-medium mb-1">
                🧾 到店点单说
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                「{card.orderPhrase}」
              </p>
              {card.orderPhraseEn && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  {card.orderPhraseEn}
                </p>
              )}
            </div>
          )}

          {/* 推荐标签 + 拍照提示 */}
          {card.youngTags && card.youngTags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mt-2 mb-1">
              {card.youngTags.slice(0, 3).map((tag, i) => {
                const isPhoto = tag.includes('颜值') || tag.includes('📸');
                return (
                  <span
                    key={i}
                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                      isPhoto
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {isPhoto ? '📸 ' : ''}{tag}
                  </span>
                );
              })}
            </div>
          )}

          <div className="text-center text-[10px] text-muted-foreground mt-2">
            ——— 以上是您的点单 ———
          </div>

          {/* 分享文案位 */}
          <div className="mt-2 p-2 bg-muted/40 rounded-lg border border-dashed border-border/60">
            <div className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1">
              <Share2 className="size-2.5" />
              分享文案（点右边复制）
            </div>
            <p className="text-[10px] text-foreground/80 leading-relaxed">
              {card.customName
                ? `今天喝的是「${card.customName}」，${card.drinkName}还不错`
                : `今天喝了${card.drinkName}，推荐`}
            </p>
          </div>

          {/* 撕边效果 */}
          <div className="flex justify-between mt-3 -mx-5">
            <div className="w-3 h-3 rounded-full bg-background -ml-1.5 border-r border-border/40" />
            <div className="flex-1 border-b border-dashed border-border/40 mb-1.5" />
            <div className="w-3 h-3 rounded-full bg-background -mr-1.5 border-l border-border/40" />
          </div>
        </div>

         {/* 底部操作 */}
         <div className="p-4 pt-3 space-y-2">
           {onNameChange && (
             <TeaNameDIY
               drinkName={card.drinkName}
               currentName={card.customName}
               onApply={onNameChange}
               trigger={
                 <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5">
                   <Wand2 className="size-4" />
                   {card.customName ? '换个定制名' : '给这杯茶起个名字'}
                 </Button>
               }
             />
           )}
           <Button
             variant="outline"
             className="w-full gap-2"
             onClick={handleCopy}
           >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? '已复制小票' : '复制小票'}
          </Button>
          <Button className="w-full gap-2" onClick={handleConfirm}>
            <Utensils className="size-4" />
            就这杯了·加入我的点单
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(OrderReceipt);
