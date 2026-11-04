import { Gift, Shuffle } from 'lucide-react';
import type { BlindBoxResult } from '@shared/contracts';
import JasmineMark from '@/components/brand/JasmineMark';

/** The reveal: mood, a short blessing and the honest basis of the draw. The drink card follows below. */
export default function BlindBoxCard({ box, drinkName, onRedraw, disabled }: { box: BlindBoxResult; drinkName?: string; onRedraw?: () => void; disabled?: boolean }) {
  return <section className="relative w-full overflow-hidden rounded-[28px] bg-[radial-gradient(120%_90%_at_100%_0%,#2f6a49_0%,#1f4a33_45%,#14281c_100%)] p-6 text-cream shadow-[0_24px_60px_-30px_rgba(20,40,28,.8)] sm:p-7">
    <JasmineMark className="pointer-events-none absolute -bottom-10 -right-8 size-48 opacity-[0.09]" petal="#fffdf7" heart="#fffdf7" />
    <div className="relative flex items-center justify-between gap-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.22em] text-sage"><Gift className="size-3.5" />{box.title} · {box.daypart}</p>
      <span className="rounded-full bg-honey/95 px-3 py-1 text-[12px] font-medium text-[#6b4c12]">{box.mood}</span>
    </div>
    {drinkName && <p className="relative mt-5 text-[13px] text-cream/70">拆开是——</p>}
    {drinkName && <p className="gold-sheen relative mt-0.5 font-serif text-[30px] font-semibold leading-tight">{drinkName}</p>}
    <blockquote className="relative mt-4 border-l-2 border-honey/70 pl-4 font-serif text-[18px] leading-8 text-cream">{box.blessing}</blockquote>
    <ul className="relative mt-5 flex flex-wrap gap-1.5">{box.basis.map((item) => <li key={item} className="rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] text-cream/80">{item}</li>)}</ul>
    {onRedraw && <button type="button" disabled={disabled} onClick={onRedraw} className="relative mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-white/25 px-4 text-[13px] text-cream transition-colors hover:bg-white/10 disabled:opacity-40"><Shuffle className="size-4" />再抽一次</button>}
  </section>;
}
