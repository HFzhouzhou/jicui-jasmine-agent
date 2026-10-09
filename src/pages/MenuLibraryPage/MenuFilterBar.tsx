import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props { category: string; categories: string[]; onCategoryChange: (value: string) => void; keyword: string; onKeywordChange: (value: string) => void; searchLabel?: string; placeholder?: string }
export default function MenuFilterBar({ category, categories, onCategoryChange, keyword, onKeywordChange, searchLabel = '搜索饮品', placeholder = '寻找一杯喜欢的茶…' }: Props) {
  return <div className="space-y-3 border-b border-primary/10 pb-3 md:space-y-5 md:pb-6">
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary/45" /><Input type="search" aria-label={searchLabel} value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-full md:h-12 border-transparent bg-white pl-11 pr-12 text-sm placeholder:text-muted-foreground/70 focus-visible:border-primary/20 focus-visible:ring-primary/10" />{keyword && <Button size="icon" variant="ghost" className="!absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full" onClick={() => onKeywordChange('')} aria-label="清除搜索"><X className="size-4" /></Button>}</div>
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="产品分类">{categories.map((value) => <button key={value} onClick={() => onCategoryChange(value)} aria-pressed={category === value} className={cn('min-h-11 shrink-0 rounded-full px-4 py-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary md:px-5 md:text-sm', category === value ? 'bg-primary text-primary-foreground' : 'bg-[#eceee3] text-primary/75 hover:bg-[#dce6bd]')}>{value}</button>)}</div>
  </div>;
}
