import { memo } from 'react';
import { motion } from 'framer-motion';
import { IDrinkItem } from '@/data/menu';
import { Badge } from '@/components/ui/badge';
import { Leaf } from 'lucide-react';

interface DrinkGridProps {
  drinks: IDrinkItem[];
  onDrinkClick: (drink: IDrinkItem) => void;
}

function DrinkGrid({ drinks, onDrinkClick }: DrinkGridProps) {
  if (drinks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="size-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
          <Leaf className="size-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">没有找到符合条件的饮品</p>
        <p className="text-sm text-muted-foreground/70 mt-1">试试其他关键词或分类吧</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {drinks.map((drink, i) => (
        <motion.div
          key={drink.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: i * 0.03 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          onClick={() => onDrinkClick(drink)}
          className="group cursor-pointer bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-300"
        >
          {/* 饮品图占位 - 用渐变色块 + 装饰 */}
          <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 flex items-center justify-center relative">
            <div className="text-5xl opacity-30">🍵</div>
            <Badge
              variant="outline"
              className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-[10px] border-primary/20 text-primary"
            >
              {drink.category}
            </Badge>
          </div>

          {/* 内容 */}
            <div className="p-4">
             <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {drink.name}
              </h4>
              <p className="text-xs text-muted-foreground font-serif italic truncate mt-0.5">
                {drink.nameEn}
              </p>

              {/* 风味小标签 */}
              <div className="mt-2 px-2 py-1 bg-primary/5 rounded-md border border-primary/10">
                <p className="text-[11px] text-primary/90 leading-snug line-clamp-1">
                  🍃 {drink.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-3">
              <div className="text-lg font-bold text-primary">
                ¥{drink.price}
              </div>
              <span className="text-xs text-muted-foreground">{drink.volume}</span>
            </div>

            {/* 标签 */}
            <div className="flex flex-wrap gap-1 mt-3">
              {drink.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default memo(DrinkGrid);
