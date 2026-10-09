import { OFFICIAL_PROMOTIONS } from '@/data/officialPromotions';
import { useId } from 'react';

const homePromotions = OFFICIAL_PROMOTIONS.filter(promotion => promotion.showOnHome);

export default function BrandPromotions() {
  const uid = useId().replace(/:/g, '');
  if (!homePromotions.length) return null;
  return <section className="mx-auto max-w-7xl px-5 pb-14 text-primary md:px-8 md:pb-20">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] tracking-[0.22em] text-primary/45">FROM THE BRAND</p><h2 className="mt-3 font-serif text-[27px] md:text-[36px]">循着花香，看看新意。</h2></div><p className="text-[10px] leading-6 text-primary/45">品牌精选</p></div>
    <div className="grid items-start gap-5 sm:grid-cols-2">{homePromotions.map((promotion, index) => <article key={promotion.src} className="overflow-hidden rounded-[24px] bg-white">
      <svg viewBox={`${promotion.crop.x} ${promotion.crop.y} ${promotion.crop.width} ${promotion.crop.height}`} className="block w-full overflow-hidden" style={{aspectRatio:`${promotion.crop.width}/${promotion.crop.height}`}} role="img" aria-label={`${promotion.title}，品牌主题图片，仅供参考`}><defs><clipPath id={`${uid}-promo-${index}`}><rect x={promotion.crop.x} y={promotion.crop.y} width={promotion.crop.width} height={promotion.crop.height}/></clipPath></defs><image href={promotion.src} width={promotion.width} height={promotion.height} clipPath={`url(#${uid}-promo-${index})`}/></svg>
      <div className="px-5 py-5"><h3 className="font-serif text-xl">{promotion.title}</h3><p className="mt-2 text-xs leading-6 text-primary/55">{promotion.subtitle}</p></div>
    </article>)}</div>
    <p className="mt-4 text-[10px] leading-6 text-primary/45">图片仅供参考，活动价格与售卖情况以门店为准。</p>
  </section>;
}
