import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { Drink } from '@shared/contracts';
import JasmineMark from '@/components/brand/JasmineMark';

const TRY = ['来杯冰的、三分糖、不要珍珠', '30 块以内，两杯解腻的', '今天好困，想喝点清爽的'];

export default function HeroSection({ drinks, loading, error }: { drinks: Drink[]; loading: boolean; error: string | null }) {
  const available = drinks.filter((drink) => drink.catalogStatus !== 'legacy' && drink.available).length;
  return (
    <section className="mx-auto max-w-7xl px-5 pb-12 pt-8 md:px-8 md:pb-16 md:pt-12 lg:pb-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] xl:gap-16">
        <div className="animate-rise-in py-2 lg:py-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-mist px-3.5 py-1.5 text-[12.5px] font-medium text-ink"><Sparkles className="size-3.5" />AI 随心配 · 一句话配一杯</p>
          <h1 className="mt-6 font-serif text-[clamp(2.6rem,5.2vw,4.6rem)] font-semibold leading-[1.2] tracking-[-0.03em] text-ink">让一杯茉莉，<br />懂你的<span className="relative whitespace-nowrap text-leaf">心意<svg aria-hidden="true" viewBox="0 0 200 16" className="absolute -bottom-2 left-0 h-3 w-full text-honey" preserveAspectRatio="none"><path d="M2 12 C 50 2, 150 2, 198 10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></svg></span>。</h1>
          <p className="mt-7 max-w-md text-[16px] leading-8 text-stone">说出口味、甜度、冰量和预算，茉莉娘子会核对门店茶单，配好一杯能直接下单的茶。记得你的习惯，下次说「老样子」就行。</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/ai-recommend" className="btn-jade group h-14 px-7 text-[15px]">开始随心配<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
            <Link to="/menu" className="btn-ghost h-14 px-6 text-[15px]">先逛逛茶单<ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-10 border-t border-line pt-6">
            <p className="mb-3 text-[13px] text-stone">试试这样说</p>
            <div className="flex flex-wrap gap-2">{TRY.map((question) => <Link key={question} to={`/ai-recommend?q=${encodeURIComponent(question)}`} className="chip">“{question}”</Link>)}</div>
          </div>
        </div>
        <div className="relative">
          <div className="relative h-[360px] overflow-hidden rounded-[32px] bg-paper shadow-[0_40px_80px_-50px_rgba(20,40,28,.55)] sm:h-auto sm:aspect-[4/4.3] lg:aspect-[4/4.7] lg:rounded-[40px]">
            <img src="/images/jasmine-studio.jpg" alt="奶油色背景中的茉莉冰茶与花枝，茶饮意象图" className="h-full w-full object-cover" loading="eager" fetchPriority="high" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/35 to-transparent" />
            {/* An illustrative exchange, labelled as an example, not a live order. */}
            <div className="absolute inset-x-4 bottom-4 space-y-2 sm:inset-x-6 sm:bottom-6" aria-label="示例对话">
              <p className="ml-auto w-fit max-w-[80%] rounded-[20px] rounded-br-md bg-jade px-4 py-2.5 text-[14px] text-cream shadow-lg">来杯冰的，三分糖，不要珍珠</p>
              <div className="glass flex max-w-[92%] items-start gap-3 rounded-[22px] rounded-bl-md p-3.5 shadow-lg">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-jade"><JasmineMark className="size-5" petal="#fffdf7" /></span>
                <div className="min-w-0 text-[13.5px] leading-6 text-ink"><p className="font-medium">好的，已按门店茶单核对。</p><p className="text-stone">先复述给你确认，确认后才提交门店。</p></div>
              </div>
            </div>
            <span className="absolute left-4 top-4 rounded-full bg-cream/80 px-3 py-1.5 text-[11.5px] text-stone backdrop-blur sm:left-6 sm:top-6">示例对话 · 图片为茶饮意象</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[12.5px] text-stone"><span aria-live="polite">{loading ? '正在展开今日茶单…' : error ? '菜单暂不可用，请进入茶单页重试' : `今日 ${available} 款可选 · 价格以门店为准`}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-leaf" />确认后下单 · 到店付款</span></div>
        </div>
      </div>
    </section>
  );
}
