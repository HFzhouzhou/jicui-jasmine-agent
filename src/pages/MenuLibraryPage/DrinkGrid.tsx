import { formatVolumeLabel } from '@shared/catalog-display';
import type { Drink } from '@shared/contracts';
import { Leaf } from 'lucide-react';
import DrinkArtwork from '@/components/DrinkArtwork';

export default function DrinkGrid({ drinks, onDrinkClick }: { drinks: Drink[]; onDrinkClick: (drink: Drink) => void }) {
  if (!drinks.length) return <div className="rounded-[28px] bg-white/60 px-6 py-20 text-center"><div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-mist/60"><Leaf className="size-7 text-primary/60" /></div><p className="font-serif text-xl text-primary">还没有找到心意之选</p><p className="mt-3 text-sm leading-7 text-muted-foreground">试试其他名称或分类，或者清除筛选条件。</p></div>;
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">{drinks.map((drink) => <button key={drink.id} onClick={() => onDrinkClick(drink)} className={`group overflow-hidden rounded-[22px] bg-white text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-18px_rgba(37,59,45,0.25)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:rounded-[26px] ${drink.catalogStatus !== 'legacy' && !drink.available ? 'opacity-65' : ''}`}>
    <div className="relative overflow-hidden bg-mist">
      <DrinkArtwork category={drink.category} name={drink.name} className="h-[112px] w-full transition-transform duration-500 group-hover:scale-[1.04] md:h-[140px]" />
      {drink.catalogStatus !== 'legacy' && !drink.available && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] text-primary">暂不可选</span>}
    </div>
    <div className="p-3.5 md:px-5 md:py-4">
      <h2 className="font-serif text-[17px] leading-snug tracking-tight text-primary md:text-xl">{drink.name}</h2>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><span className="text-xl font-medium tabular-nums text-primary"><span className="mr-0.5 text-[13px]">¥</span>{drink.price}{drink.catalogEvidence?.startingPrice && drink.catalogEvidence.verifiedFields.includes('price') && <span className="ml-1 text-[11.5px] font-normal">起</span>}</span><span className="text-[11.5px] text-muted-foreground">{drink.verified || drink.catalogStatus === 'legacy' || drink.catalogEvidence?.verifiedFields.includes('volume') ? formatVolumeLabel(drink.volume) : '规格待确认'}</span></div>
    </div>
  </button>)}</div>;
}
