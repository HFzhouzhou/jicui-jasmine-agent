import { memo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MENU_CATEGORIES } from '@/data/menu';
import { cn } from '@/lib/utils';

interface MenuFilterBarProps {
  category: string;
  onCategoryChange: (cat: string) => void;
  keyword: string;
  onKeywordChange: (kw: string) => void;
}

function MenuFilterBar({
  category,
  onCategoryChange,
  keyword,
  onKeywordChange,
}: MenuFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div className="relative max-w-md mx-auto">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索饮品名称、口味关键词..."
          className="bg-background pl-9 pr-10 h-11"
        />
        {keyword && (
          <Button
            size="icon"
            variant="ghost"
            className="!absolute right-1 top-1/2 z-20 h-7 w-7 -translate-y-1/2"
            onClick={() => onKeywordChange('')}
            aria-label="清除"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap justify-center gap-2">
        {MENU_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              category === cat
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground border border-border/60 hover:border-primary/30 hover:text-primary'
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(MenuFilterBar);
