import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function BrandIntroSection() {
  return (
    <section aria-label="项目介绍" className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
      <Link to="/project" className="group flex min-h-12 items-center justify-between gap-4 rounded-xl px-2 text-jade transition-colors hover:bg-mist/70 sm:px-3">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-serif text-[18px] font-semibold">认识小茉</span>
          <span className="text-[12px] text-stone sm:text-[13px]">为极萃东方茉莉设计的选茶助手</span>
        </span>
        <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
