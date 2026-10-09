import { BRAND_COLLECTION, BRAND_COLLECTION_CATEGORIES, BRAND_COLLECTION_SOURCE } from '@/data/brandCollection';
import { useState, useMemo } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Drink } from '@shared/contracts';
import { useMenu } from '@/hooks/useMenu';
import { Button } from '@/components/ui/button';
import MenuFilterBar from './MenuFilterBar';
import DrinkGrid from './DrinkGrid';
import BrandCollectionGrid from './BrandCollectionGrid';
import DrinkDetailDialog from './DrinkDetailDialog';

export default function MenuLibraryPage() {
  const { drinks, loading, error, refresh } = useMenu();
  const [catalogView, setCatalogView] = useState<'store' | 'brand'>('store');
  const [category, setCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const storeDrinks = useMemo(() => drinks.filter((drink) => drink.catalogStatus !== 'legacy'), [drinks]);
  const isBrand = catalogView === 'brand';
  const catalogDrinks = storeDrinks;
  const categories = useMemo(() => ['全部', ...(isBrand ? BRAND_COLLECTION_CATEGORIES : new Set(catalogDrinks.map((drink) => drink.category)))], [catalogDrinks, isBrand]);
  const activeCategory = categories.includes(category) ? category : '全部';
  const filtered = useMemo(() => catalogDrinks.filter((drink) => {
    const query = keyword.trim().toLocaleLowerCase();
    return (showUnavailable || drink.available) && (activeCategory === '全部' || drink.category === activeCategory)
      && (!query || `${drink.name} ${drink.nameEn} ${drink.category}`.toLocaleLowerCase().includes(query));
  }), [catalogDrinks, activeCategory, keyword, showUnavailable]);
  const brandProducts = useMemo(() => BRAND_COLLECTION.filter((product) => (activeCategory === '全部' || product.category === activeCategory) && `${product.name} ${product.category}`.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase())), [activeCategory, keyword]);
  const select = (drink: Drink) => setSelectedId(drink.id);
  const changeCatalog = (value: typeof catalogView) => { setCatalogView(value); setCategory('全部'); };
  const displayedCount = isBrand ? brandProducts.length : filtered.length;
  return <div className="min-h-screen bg-background pb-16 md:pb-24">
    <section className="mx-auto max-w-7xl px-5 pb-3 pt-4 md:px-10 md:pb-12 md:pt-16">
      <div className="flex flex-col justify-between gap-0 md:flex-row md:items-end md:gap-7">
        <div>
          <p className="mb-3 hidden text-[9px] font-medium tracking-[0.2em] md:block text-primary/65 md:mb-5 md:text-[10px] md:tracking-[0.28em]">THE JASMINE COLLECTION · {isBrand ? '茉莉好物' : '茉莉茶谱'}</p>
          <h1 className="font-serif text-[29px] leading-tight tracking-tight text-primary md:text-[54px]"><span className="md:hidden">{isBrand ? '把茉莉，带回日常。' : '翻开茉莉茶谱。'}</span><span className="hidden md:inline">{isBrand ? '把一缕茉莉，带回日常。' : '翻开茶谱，遇见这一杯。'}</span></h1>
          <p className="mt-5 hidden max-w-xl text-sm leading-7 text-muted-foreground md:block">{isBrand ? '从一份东方茶礼，到一缕花语香氛。慢慢挑选，让茉莉陪伴生活。' : '从一缕花香，到一口清爽。慢慢挑选，也可以把今天的心情交给茉莉娘子。'}</p>
          <div className="mt-1 flex items-center justify-between gap-3 md:hidden"><p className="text-xs text-muted-foreground">{isBrand ? '茶礼与花语，慢慢挑选。' : '一缕花香，一杯心意。'}</p>{isBrand ? <button type="button" onClick={() => changeCatalog('store')} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-xs text-primary">逛茶饮<ArrowUpRight className="size-3.5" /></button> : <Link to="/ai-recommend" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-xs text-primary">帮我选<ArrowUpRight className="size-3.5" /></Link>}</div>
        </div>
        {!isBrand && <Link to="/ai-recommend" className="group hidden w-fit items-center gap-7 rounded-full md:flex bg-[#dce6bd] px-6 py-3.5 text-sm text-primary transition-colors hover:bg-[#d1dea9]">让茉莉娘子帮我选<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>}
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 md:px-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 md:mb-5">
        <div className="grid w-full grid-cols-2 rounded-full bg-[#eceee3] p-1 sm:inline-flex sm:w-auto" aria-label="品牌目录">
          {([{ value: 'store', label: '门店茶单', count: storeDrinks.length }, { value: 'brand', label: '茶礼与香氛', count: BRAND_COLLECTION.length }] as const).map((view) => <button key={view.value} type="button" aria-pressed={catalogView === view.value} onClick={() => changeCatalog(view.value)} className={`min-h-11 whitespace-nowrap rounded-full px-2 text-[11px] transition-colors sm:px-4 sm:text-xs md:px-5 ${catalogView === view.value ? 'bg-white text-primary shadow-sm' : 'text-primary/55 hover:text-primary'}`}>{view.label}<span className="ml-2 hidden text-[10px] tabular-nums opacity-55 sm:inline">{view.count}</span></button>)}
        </div>
        <p className="text-[10px] leading-5 text-primary/60">中华茉莉园店 · <span className="whitespace-nowrap">价格与售卖情况以门店为准</span></p>
      </div>
      <MenuFilterBar category={activeCategory} categories={categories} onCategoryChange={setCategory} keyword={keyword} onKeywordChange={setKeyword} searchLabel={isBrand ? '搜索茶礼与香氛' : '搜索饮品'} placeholder={isBrand ? '寻找一份茉莉心意…' : '寻找一杯喜欢的茶…'} />
      <div className="mb-3 mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0 md:mb-7 md:mt-6 md:gap-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">{!isBrand && loading ? '正在翻开茶单…' : !isBrand && error ? '菜单尚未读取' : <>共 <span className="font-medium tabular-nums text-primary">{displayedCount}</span> 款{isBrand ? '品牌产品' : '饮品'} <span className="hidden md:inline"><span className="mx-2 text-primary/20">/</span> {isBrand ? '品牌展示目录' : '点击了解这一杯'}</span></>}</p>
        <div className="flex items-center gap-2 md:gap-4">
          {catalogView === 'store' && <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" aria-label="显示暂不可选饮品" checked={showUnavailable} onChange={(event) => setShowUnavailable(event.target.checked)} className="size-3.5 accent-primary" />显示更多饮品</label>}
          {!isBrand && <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading} className="min-h-11 gap-1.5 rounded-full px-2 text-muted-foreground"><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />刷新</Button>}
        </div>
      </div>
      {isBrand ? <BrandCollectionGrid products={brandProducts} /> : loading ? <div className="rounded-[28px] bg-white/50 px-6 py-20 text-center text-sm text-muted-foreground" role="status"><RefreshCw className="mx-auto mb-4 size-6 animate-spin text-primary/40" />正在翻开茶单…</div> : error ? <div role="alert" className="rounded-[28px] bg-[#eee6d3]/60 p-9 text-center"><p className="mb-5 text-sm text-muted-foreground">{error}</p><Button variant="outline" className="rounded-full" onClick={() => void refresh()}>重新读取菜单</Button></div> : <DrinkGrid drinks={filtered} onDrinkClick={select} />}
      {(isBrand || (!loading && !error)) && <div className="mt-8 flex flex-col justify-between gap-3 border-t border-primary/10 pt-5 text-[11px] leading-6 text-muted-foreground sm:flex-row"><p>{isBrand ? `${BRAND_COLLECTION_SOURCE.storeName} · 价格仅供参考，具体包装、规格与售卖情况以门店为准。` : '价格仅供参考，标注“起”的商品随规格变动；配料、可选规格与售卖情况以门店为准。'}</p><p className="max-w-xs shrink-0">图片仅供参考，商品以门店实物为准。</p></div>}
    </section>
    <DrinkDetailDialog drink={drinks.find((drink) => drink.id === selectedId) ?? null} open={selectedId !== null && !loading} onOpenChange={(open) => { if (!open) setSelectedId(null); }} />
  </div>;
}
