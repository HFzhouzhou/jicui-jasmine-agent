import { OFFICIAL_PROMOTIONS } from '@/data/officialPromotions';
import { useId } from 'react';

const featured = OFFICIAL_PROMOTIONS.filter(promotion => promotion.showOnHome);

export default function BrandPage() {
  const uid = useId().replace(/:/g, '');
  return <section className="mx-auto max-w-5xl px-4 pb-14 pt-5 text-primary sm:px-8 sm:pt-8">
    <h1 className="mb-5 font-serif text-[28px] font-semibold md:text-[36px]">品牌精选</h1>
    <div className="grid items-start gap-4 sm:grid-cols-2">{featured.map((promotion, index) => <article key={promotion.src} className="overflow-hidden rounded-2xl border border-line bg-cream">
      <svg viewBox={`${promotion.crop.x} ${promotion.crop.y} ${promotion.crop.width} ${promotion.crop.height}`} className="block w-full overflow-hidden" style={{aspectRatio:`${promotion.crop.width}/${promotion.crop.height}`}} role="img" aria-label={`${promotion.title}，品牌主题图片，仅供参考`}><defs><clipPath id={`${uid}-promo-${index}`}><rect x={promotion.crop.x} y={promotion.crop.y} width={promotion.crop.width} height={promotion.crop.height}/></clipPath></defs><image href={promotion.src} width={promotion.width} height={promotion.height} clipPath={`url(#${uid}-promo-${index})`}/></svg>
      <div className="px-4 py-4"><h2 className="font-serif text-xl">{promotion.title}</h2><p className="mt-1 text-sm leading-6 text-stone">{promotion.subtitle}</p></div>
    </article>)}</div>
    <p className="mt-4 text-xs leading-6 text-stone">图片仅供参考，活动价格与售卖情况以门店为准。</p>
  </section>;
}
