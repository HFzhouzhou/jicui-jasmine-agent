import { Link } from 'react-router-dom';
import { ArrowUpRight, Brain, Gift, MessageSquareText, ReceiptText, Users } from 'lucide-react';

const FEATURES = [
  { icon: MessageSquareText, title: '一句话配单', hint: '试填一条需求', to: '/ai-recommend?q=' + encodeURIComponent('来杯冰的、三分糖、加椰果，20 块以内') },
  { icon: Brain, title: '口味记忆', hint: '记住甜度与冰量', to: '/ai-recommend?q=' + encodeURIComponent('记住我默认三分糖、少冰') },
  { icon: Gift, title: '情绪盲盒', hint: '按心情抽一杯', to: '/ai-recommend?action=blindbox' },
  { icon: Users, title: '套餐随心配', hint: '按预算配多杯', to: '/ai-recommend?action=bundle' },
];

export default function FeaturesEntrySection() {
  return (
    <section aria-labelledby="tea-shortcuts-title" className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="rounded-[28px] bg-jade px-4 py-5 text-cream sm:px-7 sm:py-6">
        <h2 id="tea-shortcuts-title" className="font-serif text-[22px] font-semibold text-cream sm:text-[25px]">随心配快捷入口</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {FEATURES.map(({ icon: Icon, title, hint, to }) => (
            <Link key={title} to={to} className="group flex min-h-16 items-center gap-2 rounded-xl bg-cream/[0.06] px-2.5 py-2 transition-colors hover:bg-cream/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream sm:gap-3 sm:px-4">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-sage sm:size-5" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-snug sm:text-[15px]">{title}</span>
                <span className="mt-1 block text-[11px] leading-snug text-cream/75 sm:text-[12px]">{hint}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="hidden size-4 shrink-0 text-sage transition-colors group-hover:text-cream sm:block" />
            </Link>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 border-t border-cream/15 pt-3 text-[12px] leading-5 text-cream/80">
          <ReceiptText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage" />
          <span>先核对价格和规格，你确认后才提交门店，到店付款。</span>
        </p>
      </div>
    </section>
  );
}
