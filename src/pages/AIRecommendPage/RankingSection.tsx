import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Zap,
  Leaf,
  Flame,
  Camera,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MOCK_MENU, IDrinkItem } from '@/data/menu';

interface RankItem {
  drink: IDrinkItem;
  reason: string;
}

interface RankingSectionProps {
  onSelectDrink?: (drink: IDrinkItem) => void;
}

// 基于菜单标签和价格客观生成各榜单
function getRankingList(type: string): RankItem[] {
  switch (type) {
    case 'value': {
      // 性价比榜：价格 ≤ 10 元 + 标签含「清爽/平价/好喝」等关键词
      const items = MOCK_MENU.filter(
        (d) => d.price <= 10 && d.category !== '冰淇淋·小食'
      )
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);
      return items.map((d) => ({ drink: d, reason: '¥' + d.price + ' 超划算' }));
    }
    case 'energy': {
      // 提神醒脑榜：咖啡/拿铁类 + 含提神标签
      const items = MOCK_MENU.filter(
        (d) =>
          d.category === '咖啡·拿铁' ||
          d.tags.some((t) => t.includes('提神') || t.includes('咖啡因'))
      )
        .sort((a, b) => {
          const aScore = a.tags.filter((t) => t.includes('提神') || t.includes('浓')).length;
          const bScore = b.tags.filter((t) => t.includes('提神') || t.includes('浓')).length;
          return bScore - aScore;
        })
        .slice(0, 5);
       return items.map((d) => ({ drink: d, reason: '提神效果好' }));
    }
    case 'lowcal': {
      // 低卡轻体榜：含低卡/零卡/轻体/健身 等标签
      const items = MOCK_MENU.filter((d) =>
        d.tags.some((t) =>
          ['低卡', '零卡', '清爽', '纤体', '轻体', '健身'].includes(t)
        )
      )
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);
      return items.map((d) => ({ drink: d, reason: '轻盈无负担' }));
    }
    case 'warm': {
      // 暖身养生榜：含暖身/姜/六堡/陈香 等标签
      const items = MOCK_MENU.filter((d) =>
        d.tags.some((t) => ['暖身', '暖胃', '陈香', '醇厚'].includes(t))
      ).slice(0, 5);
       return items.map((d) => ({ drink: d, reason: '喝着暖和' }));
    }
    case 'beauty': {
      // 颜值榜：含颜值/分层/颜色/烟雨/凝月/胭脂 等描述倾向
      const keywords = ['颜值', '分层', '颜色', '烟雨', '凝月', '胭脂'];
      const items = MOCK_MENU.filter((d) =>
        keywords.some((k) => d.name.includes(k) || d.description.includes(k))
      ).slice(0, 5);
       return items.map((d) => ({ drink: d, reason: '拍照好看' }));
    }
    default:
      return [];
  }
}

const RANKINGS = [
  { id: 'value', name: '性价比榜', icon: TrendingUp, color: 'text-amber-600', bg: 'from-amber-400/10 to-orange-400/10' },
  { id: 'energy', name: '提神醒脑榜', icon: Zap, color: 'text-amber-700', bg: 'from-amber-500/10 to-yellow-500/10' },
  { id: 'lowcal', name: '低卡轻体榜', icon: Leaf, color: 'text-emerald-600', bg: 'from-emerald-400/10 to-teal-400/10' },
  { id: 'warm', name: '暖身养生榜', icon: Flame, color: 'text-orange-600', bg: 'from-orange-400/10 to-red-400/10' },
  { id: 'beauty', name: '颜值榜', icon: Camera, color: 'text-rose-500', bg: 'from-rose-400/10 to-pink-400/10' },
];

function RankingSection({ onSelectDrink }: RankingSectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="size-4 text-primary" />
          <h3 className="text-lg font-bold text-foreground">茉莉点单榜</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          基于菜单真实标签客观生成的五大榜单
        </p>
      </div>

      <div className="space-y-4">
        {RANKINGS.map((rank, rankIdx) => {
          const Icon = rank.icon;
          const list = getRankingList(rank.id);
          return (
            <motion.div
              key={rank.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: rankIdx * 0.05 }}
              className="bg-card border border-border/60 rounded-xl overflow-hidden"
            >
              <div className={`px-4 py-3 bg-gradient-to-r ${rank.bg} border-b border-border/40 flex items-center gap-2`}>
                <Icon className={`size-4 ${rank.color}`} />
                <span className="text-sm font-semibold text-foreground">
                  {rank.name}
                </span>
              </div>
              <div className="p-2">
                {list.map((item, idx) => (
                  <button
                    key={item.drink.id}
                    onClick={() => onSelectDrink?.(item.drink)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors text-left group"
                  >
                    <div className={`size-6 shrink-0 rounded-full bg-gradient-to-br ${rank.bg} flex items-center justify-center text-xs font-bold ${rank.color}`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {item.drink.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.reason}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-primary">
                        ¥{item.drink.price}
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground/50 group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(RankingSection);
