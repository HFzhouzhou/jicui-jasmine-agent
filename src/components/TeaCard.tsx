import { useState, useRef } from 'react';
import {
  RefreshCw,
  MessageCircle,
  Sparkles,
  Copy,
  Check,
  Download,
  Share2,
  Utensils,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import TeaNameDIY from '@/components/TeaNameDIY';

export interface ITeaCardData {
  drinkName: string;
  drinkNameEn: string;
  price: number;
  volume: string;
  sweetness: string;
  temperature: string;
  toppings: string;
  reason: string;
  message: string;
  funFact: string;
  isMain?: boolean;
  // 新增字段
  matchScore?: number; // 契合度百分比
  matchTags?: string[]; // 匹配标签，如 ["低卡✓", "热饮✓", "预算内✓"]
  orderPhrase?: string; // 到店点单暗号（中文）
  orderPhraseEn?: string; // 英文点单
  customName?: string; // 用户定制的茶名
  customNameStyle?: 'elegant' | 'fun'; // 茶名风格
  youngTags?: string[]; // 年轻标签，如 ["学生友好", "提神", "出片"]
}

interface TeaCardProps {
  data: ITeaCardData;
  onRefresh?: () => void;
  onAskMore?: () => void;
  onConfirm?: () => void;
  onNameChange?: (name: string, style: 'elegant' | 'fun') => void;
}

export default function TeaCard({ data, onRefresh, onAskMore, onConfirm, onNameChange }: TeaCardProps) {
  const [copied, setCopied] = useState(false);
  const [allCopied, setAllCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { isMain } = data;

  const copyOrderPhrase = () => {
    if (!data.orderPhrase) return;
    navigator.clipboard.writeText(data.orderPhrase);
    setCopied(true);
    toast.success('点单暗号已复制');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAllText = () => {
    const text = `🌸 ${data.drinkName}（${data.drinkNameEn}）
💰 价格：¥${data.price} ｜ 容量：${data.volume}
🍯 甜度：${data.sweetness} ｜ ❄️ 温度：${data.temperature}
🥤 小料：${data.toppings}
✨ 推荐理由：${data.reason}
💡 小贴士：${data.message}
📜 横州茉莉小科普：${data.funFact}
${data.orderPhrase ? `\n🧾 到店点单暗号：${data.orderPhrase}` : ''}
${data.orderPhraseEn ? `🇬🇧 English Order: ${data.orderPhraseEn}` : ''}
—— 极萃东方茉莉 · 门店推荐`;

    navigator.clipboard.writeText(text);
    setAllCopied(true);
    toast.success('整张茶单已复制');
    setTimeout(() => setAllCopied(false), 2000);
  };

  const shareImage = () => {
    toast.info('图片分享功能开发中，先复制文本分享吧');
  };

  if (!isMain) {
    // 备选小卡
    return (
      <div className="group relative bg-card border border-border/60 rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-primary/30 text-primary"
              >
                备选
              </Badge>
              {data.matchScore && (
                <span className="text-[10px] text-primary font-medium">
                  契合 {data.matchScore}%
                </span>
              )}
            </div>
            <h4 className="font-semibold text-foreground truncate">
              {data.drinkName}
            </h4>
            <p className="text-xs text-muted-foreground font-serif italic truncate">
              {data.drinkNameEn}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-primary">¥{data.price}</div>
            <div className="text-[10px] text-muted-foreground">
              {data.volume}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {data.reason}
        </p>
        {data.matchTags && data.matchTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {data.matchTags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 主推大卡
  return (
    <div
      ref={cardRef}
      className="relative bg-gradient-to-br from-card via-background to-primary/[0.03] border border-primary/20 rounded-2xl overflow-hidden shadow-lg"
    >
      {/* 装饰茉莉花 */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
        <svg
          viewBox="0 0 100 100"
          fill="currentColor"
          className="w-full h-full text-primary"
        >
          <circle cx="50" cy="50" r="8" />
          <ellipse cx="50" cy="25" rx="8" ry="14" />
          <ellipse cx="50" cy="75" rx="8" ry="14" />
          <ellipse cx="25" cy="50" rx="14" ry="8" />
          <ellipse cx="75" cy="50" rx="14" ry="8" />
          <ellipse cx="30" cy="30" rx="10" ry="12" transform="rotate(-45 30 30)" />
          <ellipse cx="70" cy="30" rx="10" ry="12" transform="rotate(45 70 30)" />
          <ellipse cx="30" cy="70" rx="10" ry="12" transform="rotate(45 30 70)" />
          <ellipse cx="70" cy="70" rx="10" ry="12" transform="rotate(-45 70 70)" />
        </svg>
      </div>

      {/* 顶部标题区 + 契合度 */}
      <div className="p-6 pb-4 border-b border-border/40">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
               <Badge className="bg-primary/10 text-primary border-0 text-xs">
                 <Sparkles className="size-3 mr-1" />
                 茉莉娘子推荐
               </Badge>
               <span className="text-xs text-muted-foreground">· 主推款</span>
             </div>
             {data.customName ? (
               <div>
                 <h3 className="text-xl font-bold text-foreground/60 line-through tracking-wide">
                   {data.drinkName}
                 </h3>
                 <h2 className="text-2xl font-bold text-primary mt-1 tracking-wide">
                   「{data.customName}」
                   <span className="text-[10px] ml-1 text-primary/60 font-normal">
                     {data.customNameStyle === 'elegant' ? '雅致' : '玩梗'}
                   </span>
                 </h2>
               </div>
             ) : (
               <h3 className="text-2xl font-bold text-foreground tracking-wide">
                 {data.drinkName}
               </h3>
             )}
             <p className="text-sm text-muted-foreground font-serif italic mt-1">
               {data.drinkNameEn}
             </p>
          </div>
          {data.matchScore && (
            <div className="text-right shrink-0">
              <div className="text-3xl font-black text-primary">
                {data.matchScore}%
              </div>
              <div className="text-[10px] text-muted-foreground">契合度</div>
            </div>
          )}
        </div>

        {/* 匹配标签 */}
        {data.matchTags && data.matchTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.matchTags.map((tag, i) => (
              <span
                key={i}
                className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 推荐标签（性价比高/提神/轻负担/颜值款等） */}
        {data.youngTags && data.youngTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.youngTags.map((tag, i) => {
              const isPhoto = tag.includes('颜值') || tag.includes('📸');
              const isBudget = tag.includes('性价比') || tag.includes('平价');
              const isLight = tag.includes('轻负担') || tag.includes('低卡') || tag.includes('零卡');
              const isBoost = tag.includes('提神') || tag.includes('高咖') || tag.includes('浓');
              const isTreat = tag.includes('甜') || tag.includes('奶香') || tag.includes('绵密');
              const tagClass = isPhoto
                ? 'bg-pink-100 text-pink-700 border-pink-200'
                : isBudget
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : isLight
                    ? 'bg-teal-100 text-teal-700 border-teal-200'
                    : isBoost
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : isTreat
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-violet-100 text-violet-700 border-violet-200';
              const prefix = isPhoto ? '📸 ' : isBudget ? '💰 ' : isLight ? '🍃 ' : isBoost ? '⚡ ' : isTreat ? '✨ ' : '🍡 ';
              return (
                <span
                  key={i}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${tagClass}`}
                >
                  {prefix}{tag}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-baseline gap-3 mt-4">
          <span className="text-3xl font-black text-primary">¥{data.price}</span>
          <span className="text-sm text-muted-foreground">{data.volume}</span>
        </div>
      </div>

      {/* 中部参数区 */}
      <div className="p-6 grid grid-cols-2 gap-4 border-b border-border/40">
        <div>
          <div className="text-[11px] text-muted-foreground mb-1">
            推荐甜度
          </div>
          <div className="text-sm font-medium text-foreground">
            {data.sweetness}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground mb-1">
            温度冰度
          </div>
          <div className="text-sm font-medium text-foreground">
            {data.temperature}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-[11px] text-muted-foreground mb-1">
            建议小料
          </div>
          <div className="text-sm font-medium text-foreground">
            {data.toppings}
          </div>
        </div>
      </div>

      {/* 点单暗号区 */}
      {data.orderPhrase && (
        <div className="px-6 py-4 border-b border-border/40 bg-secondary/30">
          <div className="text-[11px] text-primary font-medium mb-2">
            🧾 到店点单暗号（直接出示给店员）
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground flex-1 leading-relaxed">
              「{data.orderPhrase}」
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-primary hover:bg-primary/10"
              onClick={copyOrderPhrase}
              aria-label="复制点单暗号"
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
          {data.orderPhraseEn && (
            <div className="mt-2 pt-2 border-t border-border/40">
              <div className="text-[10px] text-muted-foreground mb-1">
                🇬🇧 English Order
              </div>
              <p className="text-xs text-foreground/80 font-serif italic">
                {data.orderPhraseEn}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 推荐理由 */}
      <div className="px-6 py-4 border-b border-border/40">
        <div className="text-[11px] text-primary font-medium mb-1.5">
          ✦ 推荐理由
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          {data.reason}
        </p>
      </div>

      {/* 小贴士 */}
      <div className="px-6 py-4 border-b border-border/40 bg-primary/[0.02]">
        <div className="text-[11px] text-primary font-medium mb-1.5">
          💡 小贴士
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed italic font-serif">
          「{data.message}」
        </p>
      </div>

      {/* 横州茉莉小科普 */}
      <div className="px-6 py-4">
        <div className="text-[11px] text-muted-foreground font-medium mb-1.5">
          📜 横州茉莉小知识
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {data.funFact}
        </p>
      </div>

      {/* 底部操作按钮 */}
      <div className="px-6 pb-6 pt-2 space-y-3">
        {/* 就这杯了 - 主按钮 */}
         {onConfirm && (
           <Button className="w-full gap-2" onClick={onConfirm}>
             <Utensils className="size-4" />
             就这杯了 · 生成点单小票
           </Button>
         )}

        {/* 茶名DIY + 分享 */}
         <div className="flex gap-2">
           {onNameChange && (
             <TeaNameDIY
               drinkName={data.drinkName}
               currentName={data.customName}
               onApply={onNameChange}
               trigger={
                 <Button
                   variant="outline"
                   size="sm"
                   className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                 >
                   <Wand2 className="size-3.5" />
                   {data.customName ? '换个名字' : '茶名DIY'}
                 </Button>
               }
             />
           )}
           <Button
             variant="outline"
             size="sm"
             className="flex-1 gap-1.5 border-border/60"
             onClick={copyAllText}
           >
             {allCopied ? (
               <Check className="size-3.5" />
             ) : (
               <Copy className="size-3.5" />
             )}
             {allCopied ? '已复制' : '复制茶单'}
           </Button>
           <Button
             variant="outline"
             size="sm"
             className="gap-1.5 border-border/60"
             onClick={shareImage}
           >
             <Download className="size-3.5" />
           </Button>
         </div>

        {/* 换一杯 / 再问问 */}
        {onRefresh && onAskMore && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              onClick={onRefresh}
            >
              <RefreshCw className="size-3.5" />
              换一杯
            </Button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={onAskMore}>
              <MessageCircle className="size-3.5" />
              再问问
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
