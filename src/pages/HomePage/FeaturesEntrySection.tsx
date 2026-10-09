import { Link } from 'react-router-dom';
import { ArrowUpRight, MessagesSquare, SlidersHorizontal, BookOpen } from 'lucide-react';

const FEATURES = [
  { icon: MessagesSquare, title: '说说，你的心意', english: 'TELL YOUR TASTE', desc: '把口味、预算和今天的小心情告诉我，选茶从一次轻松的对话开始。', path: '/ai-recommend?mode=chat', action: '开始一段对话' },
  { icon: SlidersHorizontal, title: '慢慢，调到喜欢', english: 'MAKE IT YOURS', desc: '清淡一点，或者换个口味。沿着你的偏好继续聊，直到更接近心中的那杯。', path: '/ai-recommend?mode=chat', action: '聊聊我的偏好' },
  { icon: BookOpen, title: '每一杯，都有来处', english: 'KNOW YOUR CUP', desc: '参考价格、菜单资料与核实状态，清楚呈现。让每一次选择都有依据。', path: '/menu', action: '了解茶单资料' },
];

export default function FeaturesEntrySection() {
  return (
    <section className="mx-3 overflow-hidden rounded-[28px] bg-[#253b2d] text-[#f7f7ef] sm:mx-5 lg:mx-8 lg:rounded-[36px]">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16 lg:px-12 lg:py-20">
        <div className="mb-10 flex flex-col justify-between gap-4 md:mb-14 md:flex-row md:items-end"><div><p className="text-[10px] tracking-[0.22em] text-[#b5c6a0]">A THOUGHTFUL WAY TO CHOOSE</p><h2 className="mt-4 font-serif text-[30px] tracking-wide md:text-[38px]">选一杯，也可以很从容。</h2></div><p className="max-w-[220px] text-xs leading-7 text-[#b3bba9]">茉莉娘子陪你，从纷繁的茶单里，<br />找到简单的喜欢。</p></div>
        <div className="grid gap-8 md:grid-cols-3 md:gap-0">
          {FEATURES.map(({ icon: Icon, title, english, desc, path, action }, index) => <Link key={title} to={path} className="group border-t border-[#f7f7ef]/20 pt-7 md:border-l md:border-t-0 md:px-8 md:pt-0 md:first:border-l-0 md:first:pl-0 md:last:pr-0"><div className="flex items-center justify-between"><Icon className="size-7 stroke-[1.15] text-[#dce6bd]" /><span className="font-serif text-[42px] font-light leading-none text-[#f7f7ef]/25">0{index + 1}</span></div><p className="mt-7 text-[9px] tracking-[0.18em] text-[#a5b597]">{english}</p><h3 className="mt-2 font-serif text-[23px] tracking-wide">{title}</h3><p className="mt-4 max-w-[300px] text-[13px] leading-[1.9] text-[#bcc5b3]">{desc}</p><span className="mt-7 inline-flex items-center gap-4 border-b border-[#b6c49f]/40 pb-1.5 text-xs text-[#dce6bd] transition-colors group-hover:border-[#dce6bd]">{action}<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span></Link>)}
        </div>
      </div>
    </section>
  );
}
