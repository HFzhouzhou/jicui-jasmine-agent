import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Flower2, Sparkles } from 'lucide-react';
import type { Drink } from '@shared/contracts';

export default function HeroSection({ drinks, loading, error }: { drinks: Drink[]; loading: boolean; error: string | null }) {
  const available = drinks.filter((drink) => drink.catalogStatus !== 'legacy' && drink.available).length;
  return (
    <section className="mx-auto max-w-7xl px-5 pb-10 pt-8 md:px-8 md:pb-16 md:pt-12 lg:pb-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.04fr_1fr] lg:gap-10 xl:gap-20">
        <div className="py-3 lg:py-10">
          <p className="flex items-center gap-3 text-[10px] font-medium tracking-[0.2em] text-[#66745f] sm:text-xs"><span className="h-px w-8 bg-[#839176]" />A LITTLE JASMINE, A LITTLE JOY</p>
          <h1 className="mt-7 font-serif text-[clamp(2.65rem,5.1vw,4.5rem)] font-medium leading-[1.35] tracking-[-0.055em] text-[#253b2d]">让一杯茉莉，<br /><span className="relative inline-block">懂你的心意<span className="ml-1 text-[#80955d]">。</span></span></h1>
          <p className="mt-6 max-w-sm text-[14px] leading-[1.95] text-[#73796a] sm:text-[15px]">清甜一点，花香浓一点，或是今天想要一点不同。<br className="hidden xl:block" />把心意告诉茉莉娘子，找到属于你的那杯茶。</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 sm:mt-10">
            <Link to="/ai-recommend?mode=chat" className="group inline-flex min-h-14 items-center gap-7 rounded-full bg-[#253b2d] py-4 pl-7 pr-5 text-sm text-[#f7f7ef] transition-all hover:bg-[#3d5540] hover:shadow-lg hover:shadow-[#253b2d]/10"><span>找一杯，我的茉莉</span><ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
            <Link to="/menu" className="inline-flex items-center gap-2 border-b border-[#253b2d]/30 pb-1.5 text-sm text-[#253b2d] transition-colors hover:border-[#253b2d]">先逛逛茶单<ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-10 border-t border-[#253b2d]/10 pt-5 lg:mt-14">
            <p className="mb-3 text-[10px] tracking-[0.16em] text-[#8a907e]">从一句话开始 · TRY SAYING</p>
            <div className="flex flex-wrap gap-2">
              {['15 元以内，清爽一点', '想要花香，不要浓奶味'].map((question) => <Link key={question} to={`/ai-recommend?mode=chat&q=${encodeURIComponent(question)}`} className="inline-flex items-center gap-2 rounded-full bg-[#ecefdf] px-3.5 py-2.5 text-[11px] text-[#54624b] transition-colors hover:bg-[#dce6bd]"><Sparkles className="size-3 stroke-[1.5]" />{question}</Link>)}
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="relative h-[320px] overflow-hidden rounded-[28px] bg-[#eee9da] sm:h-auto sm:aspect-[4/4.1] lg:aspect-[4/4.65] lg:rounded-[36px]">
            <img src="/images/jasmine-studio.jpg" alt="奶油色背景中的茉莉冰茶与花枝，茶饮意象图" className="h-full w-full object-cover" loading="eager" fetchPriority="high" />
            <span className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/50 bg-[#fbfbef]/70 px-3 py-2 text-[9px] tracking-[0.14em] text-[#506146] backdrop-blur-sm"><span className="size-1.5 rounded-full bg-[#687d4a]" />茉莉香为引 · 花样东方茶</span>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 rounded-2xl border border-white/40 bg-[#f8f8e9]/85 p-5 text-[#253b2d] backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6 sm:p-6"><div><p className="text-[9px] tracking-[0.24em] text-[#69745a]">YOUR PERSONAL TEA COMPANION</p><p className="mt-2 font-serif text-[23px] tracking-wide sm:text-[26px]">一杯茶，也是一种心情。</p></div><Flower2 aria-hidden="true" className="mb-1 size-8 shrink-0 stroke-[1] text-[#6e7f4f]" /></div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 px-1 text-[9px] tracking-[0.09em] text-[#87907c]"><span aria-live="polite">{loading ? '正在展开今日茶单…' : error ? '菜单暂不可用，请进入茶单页重试' : `${available} 款门店茶单候选 · 随心探索`}</span><span className="shrink-0">茶饮意象 · 非商品实拍</span></div>
        </div>
      </div>
    </section>
  );
}
