import { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Leaf, ArrowRight } from 'lucide-react';
import { MOCK_MENU, IDrinkItem } from '@/data/menu';
import { getDailyTeaSign, getSeasonTip } from '@/data/funFeatures';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOrderHistory } from '@/hooks/useOrderHistory';

interface RecommendedDrink {
  drink: IDrinkItem;
  reason: string;
  tag: string;
}

function GuessYouLike({ count = 3 }: { count?: number }) {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { orders } = useOrderHistory();
  const seasonTip = getSeasonTip();
  const dailySign = getDailyTeaSign();

  const recommendations = useMemo((): RecommendedDrink[] => {
    const results: RecommendedDrink[] = [];

    // 1. 如果有点单历史，推荐相似口味（基于同类目或同关键词）
    if (orders.length > 0) {
      const lastOrder = orders[0];
      const lastDrink = MOCK_MENU.find((d) => d.name === lastOrder.drinkName);
      if (lastDrink) {
        // 找同分类的相似饮品
        const similar = MOCK_MENU.filter(
          (d) =>
            d.category === lastDrink.category &&
            d.id !== lastDrink.id &&
            !orders.some((o) => o.drinkName === d.name)
        );
        if (similar.length > 0) {
          const pick = similar[Math.floor(Math.random() * similar.length)];
          results.push({
            drink: pick,
            reason: `你喜欢${lastDrink.name}，这杯${pick.tags[0]}的应该也合口味`,
             tag: '为你推荐',
          });
        }
      }
    }

    // 2. 根据茶韵档案推荐（匹配关键词）
    const profileMatched = MOCK_MENU.filter((d) => {
      // 预算匹配
      const budgetMap: Record<string, number> = {
        under10: 10,
        '10to15': 15,
        '15to20': 20,
        unlimited: 999,
      };
      const maxPrice = budgetMap[profile.budget] || 999;
      if (d.price > maxPrice) return false;

      // 忌口过滤
      if (profile.dietary.includes('caffeine_free') && d.category === '咖啡·拿铁') return false;
      if (profile.dietary.includes('lactose_intolerant') && d.category.includes('奶') && d.category.includes('茶')) return false;
      if (profile.dietary.includes('no_ginger') && d.tags.some((t) => t.includes('姜'))) return false;
      if (profile.dietary.includes('no_cold') && d.tags.some((t) => t.includes('冰') || t.includes('冷')))
        return false;

      return true;
    });

    // 从匹配的里面选2款不同分类的
    const selectedCategories = new Set<string>();
    const shuffled = [...profileMatched].sort(() => Math.random() - 0.5);
    for (const d of shuffled) {
      if (results.length >= count) break;
      if (results.some((r) => r.drink.id === d.id)) continue;
      if (selectedCategories.has(d.category) && selectedCategories.size > 1) continue;
      selectedCategories.add(d.category);
      results.push({
        drink: d,
        reason: profile.dietary.length > 0
          ? '契合你的口味偏好与忌口'
          : `根据你的${profile.sweetness}口味优选`,
        tag: '为你推荐',
      });
    }

    // 3. 如果还不够，按季节/今日茶签补充
    if (results.length < count) {
      const seasonDrinks = MOCK_MENU.filter(
        (d) =>
          d.category === seasonTip.recommendCategory &&
          !results.some((r) => r.drink.id === d.id)
      );
      if (seasonDrinks.length > 0) {
        const pick = seasonDrinks[Math.floor(Math.random() * seasonDrinks.length)];
        results.push({
          drink: pick,
          reason: `${seasonTip.season} · ${seasonTip.tip}`,
          tag: '当季推荐',
        });
      }
    }

    // 4. 兜底今日茶签
    if (results.length < count) {
      if (!results.some((r) => r.drink.id === dailySign.drink.id)) {
        results.push({
          drink: dailySign.drink,
          reason: dailySign.teaPhrase,
           tag: '每日推荐',
        });
      }
    }

    return results.slice(0, count);
  }, [profile, orders, seasonTip, dailySign, count]);

  const handleClick = (drink: IDrinkItem) => {
    const q = `我想喝${drink.name}，请帮我推荐最合适的甜度、温度和小料搭配`;
    navigate(`/ai-recommend?mode=chat&q=${encodeURIComponent(q)}`);
  };

  if (recommendations.length === 0) return null;

  return (
    <section id="guess-you-like" className="w-full py-12 md:py-16 bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
             <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
               <Heart className="size-3.5" />
               为你推荐
             </span>
             <h2 className="text-xl md:text-2xl font-bold text-foreground">
               按你点过的，推荐 {recommendations.length} 杯试试
             </h2>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec, i) => (
            <motion.button
              key={rec.drink.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              onClick={() => handleClick(rec.drink)}
              className="text-left group"
            >
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-300 h-full">
                {/* 顶部装饰 */}
                <div className="h-20 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 flex items-center justify-center relative">
                  <Leaf className="size-10 text-primary/40" />
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    {rec.tag}
                  </span>
                </div>

                <div className="p-4">
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {rec.drink.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-serif italic truncate">
                    {rec.drink.nameEn}
                  </p>
                  <p className="text-xs text-foreground/70 mt-2 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                    {rec.reason}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-black text-primary">¥{rec.drink.price}</span>
                    <span className="text-xs text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      看看
                      <ArrowRight className="size-3" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(GuessYouLike);
