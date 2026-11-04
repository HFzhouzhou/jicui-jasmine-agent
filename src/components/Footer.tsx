import { NavLink } from 'react-router-dom';
import JasmineMark from '@/components/brand/JasmineMark';

export default function Footer() {
  return (
    <footer className="mt-10 bg-ink text-cream/85">
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-12 md:px-8 md:pt-16">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <div className="flex items-center gap-3 font-serif text-2xl tracking-wider text-cream"><JasmineMark className="size-8" petal="#fffdf7" />极萃东方茉莉</div>
            <p className="mt-4 text-[14px] leading-7 text-cream/60">以茉莉为约，寻一杯心意。<br />AI 帮你配好，门店为你做好。</p>
          </div>
          <div className="grid grid-cols-2 gap-x-14 gap-y-3 text-[14px] sm:grid-cols-3">
            <p className="col-span-full mb-1 text-[11px] tracking-[0.22em] text-sage">EXPLORE</p>
            <NavLink className="text-cream/75 transition-colors hover:text-cream" to="/ai-recommend">AI 随心配</NavLink>
            <NavLink className="text-cream/75 transition-colors hover:text-cream" to="/menu">茉莉茶单</NavLink>
            <NavLink className="text-cream/75 transition-colors hover:text-cream" to="/orders">我的订单</NavLink>
            <NavLink className="text-cream/75 transition-colors hover:text-cream" to="/project">项目说明</NavLink>
            <NavLink className="text-cream/75 transition-colors hover:text-cream" to="/admin">门店后台</NavLink>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-cream/10 pt-6 text-[12px] text-cream/45 sm:flex-row">
          <p>© {new Date().getFullYear()} JICUI JASMINE · 茉莉娘子参赛项目</p>
          <p>价格与售卖情况以门店为准 · 付款在门店完成，AI 不代付</p>
        </div>
      </div>
    </footer>
  );
}
