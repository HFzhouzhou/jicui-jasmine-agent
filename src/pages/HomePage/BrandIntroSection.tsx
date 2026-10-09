import { Link } from 'react-router-dom';
import { Flower2, ArrowUpRight } from 'lucide-react';

export default function BrandIntroSection() {
  return <section className="relative mx-auto max-w-7xl overflow-hidden px-5 py-16 text-[#253b2d] md:px-8 md:py-24"><div className="relative z-10 grid gap-9 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-16"><div><p className="text-[10px] tracking-[0.25em] text-[#78816c]">ROOTED IN JASMINE. MADE FOR YOU.</p><h2 className="mt-5 font-serif text-[32px] leading-[1.5] tracking-wide md:text-[42px]">一缕东方茉莉，<br />与今天的你相遇。</h2></div><div className="max-w-md"><p className="text-[14px] leading-[2] text-[#737c69]">我们相信，一杯好茶从理解喜好开始。为极萃东方茉莉设计的选茶助手，把你随口的一句话，变成一份可以细细了解的茶单。</p><p className="mt-3 text-xs leading-7 text-[#8a917f]">品牌故事、茶底与工艺资料，将在核实后逐步补充。<br />关于茶的每一份心意，我们认真对待。</p><Link to="/project" className="mt-6 inline-flex items-center gap-7 border-b border-[#253b2d]/40 pb-2 text-xs">认识茉莉娘子<ArrowUpRight className="size-4" /></Link></div></div><Flower2 aria-hidden="true" className="pointer-events-none absolute -left-12 bottom-0 size-72 stroke-[0.5] text-[#dce6bd]/25" /></section>;
}
