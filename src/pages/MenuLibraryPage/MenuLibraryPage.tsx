import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import MenuFilterBar from './MenuFilterBar';
import DrinkGrid from './DrinkGrid';
import DrinkDetailDialog from './DrinkDetailDialog';
import { MOCK_MENU, IDrinkItem } from '@/data/menu';

export default function MenuLibraryPage() {
  const [category, setCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [selectedDrink, setSelectedDrink] = useState<IDrinkItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredDrinks = useMemo(() => {
    return MOCK_MENU.filter((d) => {
      const matchCategory = category === '全部' || d.category === category;
      const matchKeyword =
        !keyword ||
        d.name.toLowerCase().includes(keyword.toLowerCase()) ||
        d.nameEn.toLowerCase().includes(keyword.toLowerCase()) ||
        d.tags.some((t) => t.toLowerCase().includes(keyword.toLowerCase())) ||
        d.description.toLowerCase().includes(keyword.toLowerCase());
      return matchCategory && matchKeyword;
    });
  }, [category, keyword]);

  const handleDrinkClick = (drink: IDrinkItem) => {
    setSelectedDrink(drink);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 页面标题 */}
      <section className="w-full bg-gradient-to-b from-primary/10 to-background pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <Sparkles className="size-3.5" />
              84 款真实在售饮品
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              极萃东方茉莉 <span className="text-primary">菜单库</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              从清爽原叶到浓郁奶茶，从果茶到咖啡，每一款都以横州茉莉花为引
            </p>
          </motion.div>
        </div>
      </section>

      {/* 筛选栏 */}
      <section className="w-full py-6 border-b border-border/40 sticky top-16 z-40 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <MenuFilterBar
            category={category}
            onCategoryChange={setCategory}
            keyword={keyword}
            onKeywordChange={setKeyword}
          />
        </div>
      </section>

      {/* 饮品网格 */}
      <section className="w-full py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-muted-foreground">
              共 <span className="font-semibold text-foreground">{filteredDrinks.length}</span> 款饮品
            </p>
          </div>
          <DrinkGrid drinks={filteredDrinks} onDrinkClick={handleDrinkClick} />
        </div>
      </section>

      {/* 详情弹层 */}
      <DrinkDetailDialog
        drink={selectedDrink}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
