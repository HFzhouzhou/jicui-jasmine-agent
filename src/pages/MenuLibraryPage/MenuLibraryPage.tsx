import { BRAND_COLLECTION, BRAND_COLLECTION_CATEGORIES, BRAND_COLLECTION_SOURCE } from '@/data/brandCollection';
import { useState, useMemo } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Drink } from '@shared/contracts';
import { useMenu } from '@/hooks/useMenu';
import { Button } from '@/components/ui/button';
import MenuFilterBar from './MenuFilterBar';
import DrinkGrid from './DrinkGrid';
import BrandCollectionGrid from './BrandCollectionGrid';
import DrinkDetailDialog from './DrinkDetailDialog';

export default function MenuLibraryPage() {
  const { drinks, loading, error, refresh } = useMenu();
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogView = searchParams.get('catalog') === 'brand' ? 'brand' : 'store';
  const [category, setCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const storeDrinks = useMemo(() => drinks.filter((drink) => drink.catalogStatus !== 'legacy'), [drinks]);
  const isBrand = catalogView === 'brand';
  const categories = useMemo(() => ['全部', ...(isBrand ? BRAND_COLLECTION_CATEGORIES : new Set(storeDrinks.map((drink) => drink.category)))], [storeDrinks, isBrand]);
  const activeCategory = categories.includes(category) ? category : '全部';
  const filtered = useMemo(() => storeDrinks.filter((drink) => {
    const query = keyword.trim().toLocaleLowerCase();
    return (showUnavailable || drink.available) && (activeCategory === '全部' || drink.category === activeCategory)
      && (!query || `${drink.name} ${drink.nameEn} ${drink.category}`.toLocaleLowerCase().includes(query));
  }), [storeDrinks, activeCategory, keyword, showUnavailable]);
  const brandProducts = useMemo(() => BRAND_COLLECTION.filter((product) => (activeCategory === '全部' || product.category === activeCategory) && `${product.name} ${product.category}`.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase())), [activeCategory, keyword]);
  const select = (drink: Drink) => setSelectedId(drink.id);
  function changeCatalog(value: typeof catalogView) {
    if (value === catalogView) return;
    const next = new URLSearchParams(searchParams);
    if (value === 'brand') next.set('catalog', 'brand');
    else next.delete('catalog');
    setSearchParams(next);
    setCategory('全部');
    setKeyword('');
  }
  const displayedCount = isBrand ? brandProducts.length : filtered.length;
  return <div className="min-h-screen bg-background pb-16 md:pb-24">
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 md:px-10 md:pt-8">
      <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
        <div>
          <h1 className="font-serif text-3xl leading-tight text-primary md:text-4xl">茶单</h1>
          <p className="mt-1 text-xs text-muted-foreground">{BRAND_COLLECTION_SOURCE.storeName}</p>
        </div>
        {isBrand && <Link to="/brand" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline">品牌精选<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>}
      </div>
      <div className="mb-3 grid w-full grid-cols-2 rounded-full bg-mist p-1 sm:inline-flex sm:w-auto" role="group" aria-label="品牌目录">
        {([{ value: 'store', label: '门店茶单' }, { value: 'brand', label: '茶礼与香氛' }] as const).map((view) => <button key={view.value} type="button" aria-pressed={catalogView === view.value} onClick={() => changeCatalog(view.value)} className={`min-h-10 whitespace-nowrap rounded-full px-4 text-sm transition-colors md:px-5 ${catalogView === view.value ? 'bg-white font-medium text-primary shadow-sm' : 'text-primary/75 hover:text-primary'}`}>{view.label}</button>)}
      </div>
      <MenuFilterBar category={activeCategory} categories={categories} onCategoryChange={setCategory} keyword={keyword} onKeywordChange={setKeyword} searchLabel={isBrand ? '搜索茶礼与香氛' : '搜索饮品'} placeholder={isBrand ? '搜索茶礼与香氛' : '搜索饮品'} />
      <div className="mb-2 flex min-h-10 items-center justify-between gap-2 md:mb-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">{isBrand || (!loading && !error) ? `${displayedCount} 款${isBrand ? '产品' : '饮品'}` : ''}</p>
        {!isBrand && <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showUnavailable} onChange={(event) => setShowUnavailable(event.target.checked)} className="size-3.5 accent-primary" />显示暂不可选饮品</label>}
      </div>
      {isBrand ? <BrandCollectionGrid products={brandProducts} /> : loading ? <div className="rounded-[28px] bg-white/50 px-6 py-20 text-center text-sm text-muted-foreground" role="status"><RefreshCw className="mx-auto mb-4 size-6 animate-spin text-primary/40" />正在翻开茶单…</div> : error ? <div role="alert" className="rounded-[28px] bg-honey/60 p-9 text-center"><p className="mb-5 text-sm text-muted-foreground">{error}</p><Button variant="outline" className="rounded-full" onClick={() => void refresh()}>重新读取菜单</Button></div> : <DrinkGrid drinks={filtered} onDrinkClick={select} />}
      {(isBrand || (!loading && !error)) && <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 border-t border-primary/10 pt-3 text-xs leading-6 text-muted-foreground">
        <p>{isBrand ? '图片、价格仅供参考，具体包装、规格与售卖情况以门店为准。' : '图片仅供参考。价格、配料、规格与售卖情况以门店为准。'}</p>
        {!isBrand && <Button size="sm" variant="ghost" onClick={() => void refresh()} className="min-h-11 gap-1.5 rounded-full px-2 text-muted-foreground"><RefreshCw aria-hidden="true" className="size-3.5" />刷新茶单</Button>}
      </div>}
    </section>
    <DrinkDetailDialog drink={drinks.find((drink) => drink.id === selectedId) ?? null} open={selectedId !== null && !loading} onOpenChange={(open) => { if (!open) setSelectedId(null); }} />
  </div>;
}
