import { NavLink } from 'react-router-dom';
import { ArrowUpRight, Flower2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-[#253b2d]/10 bg-[#f0f1e5] text-[#253b2d]">
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-10 md:px-8 md:pt-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:gap-12"><div className="max-w-sm"><div className="flex items-center gap-3 font-serif text-xl tracking-wider"><Flower2 className="size-7 stroke-[1.2]" />极萃东方茉莉</div><p className="mt-4 text-xs leading-[1.9] text-[#7c8372]">以茉莉为约，寻一杯心意。<br />参考茶单用于到店沟通，商品与可选做法以门店确认为准。</p></div><nav aria-label="页脚导航" className="flex flex-wrap items-start gap-x-7 gap-y-4 text-xs text-[#68725d]"><NavLink className="inline-flex items-center gap-1.5 transition-colors hover:text-[#253b2d]" to="/ai-recommend">开始选茶<ArrowUpRight className="size-3" /></NavLink><NavLink className="transition-colors hover:text-[#253b2d]" to="/menu">茉莉茶单</NavLink><NavLink className="transition-colors hover:text-[#253b2d]" to="/project">项目说明</NavLink><NavLink className="transition-colors hover:text-[#253b2d]" to="/admin">菜单管理</NavLink></nav></div>
        <div className="mt-9 flex flex-col justify-between gap-3 border-t border-[#253b2d]/10 pt-5 text-[9px] tracking-[0.12em] text-[#919783] sm:flex-row"><p>© {new Date().getFullYear()} JICUI JASMINE · 茉莉娘子参赛项目</p><p>A LITTLE JASMINE, A LITTLE JOY.</p></div>
      </div>
    </footer>
  );
}
