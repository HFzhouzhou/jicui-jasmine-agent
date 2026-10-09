import { Flower2, ZoomIn } from 'lucide-react';
import DrinkArtwork from '@/components/DrinkArtwork';
import OfficialProductImageDialog from '@/components/OfficialProductImageDialog';
import { hasOfficialImage } from '@/data/officialImages';
import type { BrandCollectionItem } from '@/data/brandCollection';

export default function BrandCollectionGrid({ products }: { products: BrandCollectionItem[] }) {
  if (!products.length) return <div className="rounded-[28px] bg-white/60 px-6 py-20 text-center"><Flower2 className="mx-auto mb-5 size-10 stroke-[1.1] text-primary/40" /><p className="font-serif text-xl text-primary">再找一份茉莉心意</p><p className="mt-3 text-sm leading-7 text-muted-foreground">试试其他名称，或切换产品分类。</p></div>;
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">{products.map((product) => {
    const officialImage = hasOfficialImage(product.name);
    const isGift = product.category === '东方茶礼';
    return <article key={product.id} className="overflow-hidden rounded-[22px] bg-white md:rounded-[26px]">
      <div className={`relative overflow-hidden ${isGift ? 'bg-[#ecebdf]' : 'bg-[#f0e6e0]'}`}>
        {officialImage ? <OfficialProductImageDialog name={product.name} price={product.price} source={product.source}>
          <button type="button" className="group relative block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-label={`查看${product.name}商品大图`}>
            <DrinkArtwork category={product.category} name={product.name} className="h-[128px] w-full transition-transform duration-300 motion-safe:group-hover:scale-[1.035] md:h-[160px]" />
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] leading-4 text-primary/70"><ZoomIn aria-hidden="true" className="size-3" />查看大图</span>
          </button>
        </OfficialProductImageDialog> : <div className="relative flex h-[128px] items-center justify-center p-4 md:h-[160px]" aria-label="商品图片待更新">
          <div className={`absolute inset-3 rounded-[14px] border ${isGift ? 'border-[#879777]/20' : 'border-[#b5988a]/25'}`} />
          <div className="relative flex flex-col items-center gap-2 text-center text-primary/65 sm:flex-row sm:gap-3 sm:text-left"><Flower2 aria-hidden="true" className="size-7 shrink-0 stroke-[0.75] sm:size-10 md:size-12" /><div className="sm:border-l sm:border-primary/15 sm:pl-3"><p className="font-serif text-sm tracking-[0.2em] sm:text-lg md:text-xl">{isGift ? '东方茶礼' : '茉莉花语'}</p><p className="mt-2 text-[7px] tracking-[0.18em] text-primary/40">{isGift ? 'A GIFT OF JASMINE' : 'JASMINE IN EVERYDAY LIFE'}</p></div></div>
        </div>}
        <span className="pointer-events-none absolute bottom-2.5 right-3 rounded-full bg-white/65 px-2 py-0.5 text-[8px] text-primary/50">{officialImage ? '图片仅供参考' : '图片待更新'}</span>
      </div>
      <div className="px-3.5 pb-4 pt-4 md:px-5 md:pb-5">
        <p className="mb-2 text-[9px] leading-5 tracking-[0.05em] text-primary/55">{product.category}</p>
        <h2 className="min-h-[4.2em] break-words font-serif text-[17px] leading-[1.4] tracking-tight text-primary md:min-h-[2.8em] md:text-xl">{product.name}</h2>
        <p className="mt-3 text-[22px] font-medium tabular-nums text-primary"><span className="mr-0.5 text-[13px]">¥</span>{product.price}</p>
        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">门店普通参考价</p>
      </div>
    </article>;
  })}</div>;
}
