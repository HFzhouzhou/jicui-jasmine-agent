import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import JasmineMark from '@/components/brand/JasmineMark';
import './home-hero.css';

const TRY = ['来杯冰的、三分糖、不要珍珠', '30 块以内，两杯解腻的'];

export default function HeroSection() {
  return (
    <section aria-labelledby="pet-hero-title" className="pet-hero mx-auto max-w-7xl px-5 md:px-8">
      <div className="pet-hero__intro animate-rise-in">
        <p className="flex items-center gap-2.5 text-[13px] font-medium tracking-[.12em] text-jade"><JasmineMark className="size-5" />茉莉茶宠 · AI 随心配</p>
        <h1 id="pet-hero-title" className="pet-hero__title font-serif font-semibold text-ink">来坐坐，<br /><span>小茉</span>陪你选茶。</h1>
        <p className="pet-hero__detail text-stone">告诉小茉你的口味和预算，从门店茶单里挑一杯。</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/ai-recommend" className="btn-jade group min-h-12 px-6 text-[15px]">找小茉配茶<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          <Link to="/menu" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-jade hover:underline">先逛逛茶单<ArrowRight className="size-4" /></Link>
        </div>
        <div className="mt-5 border-t border-jade/15 pt-4">
          <p className="mb-2 text-[13px] font-medium text-jade">试试这样说</p>
          <div className="flex flex-wrap gap-2">
            {TRY.map((question) => <Link key={question} to={`/ai-recommend?q=${encodeURIComponent(question)}`} className="chip min-h-10">{question}<ArrowUpRight className="size-3.5 opacity-65" /></Link>)}
          </div>
        </div>
      </div>
      <img
        src="/images/jasmine-hero.jpg"
        width={1920}
        height={1080}
        alt="深色茶盏旁摆着一枝茉莉花"
        fetchPriority="high"
        className="pet-hero__image"
      />
    </section>
  );
}
