import { Link } from 'react-router-dom';
import { ArrowUpRight, Brain, Gift, MessageSquareText, ReceiptText, Users, type LucideIcon } from 'lucide-react';

const FEATURES: { icon: LucideIcon; title: string; say: string; get: string; to: string }[] = [
  { icon: MessageSquareText, title: '一句话配单', say: '冰的、三分糖、加椰果，20 块以内', get: '识别饮品、甜度、冰量、加料和预算；缺货或冲突时先问你，再生成能下单的茶卡。', to: '/ai-recommend?q=' + encodeURIComponent('来杯冰的、三分糖、加椰果，20 块以内') },
  { icon: Brain, title: '口味记忆', say: '记住我默认三分糖、少冰', get: '跨次记住你的习惯。下次只说「老样子，但换个茶底」就能微调。过敏忌口会严格执行。', to: '/ai-recommend?q=' + encodeURIComponent('记住我默认三分糖、少冰') },
  { icon: Gift, title: '情绪盲盒', say: '有点丧 · 下雨天', get: '按心情、时段、天气和门店热度抽一杯，附一句专属寄语。选择困难也能变成小惊喜。', to: '/ai-recommend?action=blindbox' },
  { icon: Users, title: '套餐随心配', say: '两个人，一杯清爽、一杯浓郁', get: '按人数、预算和各自口味组合 2–3 杯，并自动套用门店已启用的最优优惠。', to: '/ai-recommend?action=bundle' },
];

export default function FeaturesEntrySection() {
  return (
    <section className="mx-3 overflow-hidden rounded-[32px] bg-[radial-gradient(120%_100%_at_0%_0%,#2c5f42_0%,#1f4a33_40%,#14281c_100%)] text-cream sm:mx-5 lg:mx-8 lg:rounded-[44px]">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20 lg:px-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-[12px] font-medium tracking-[0.22em] text-sage">WHAT JASMINE CAN DO</p><h2 className="mt-3 font-serif text-[32px] font-semibold leading-tight md:text-[44px]">不用翻菜单，<br className="sm:hidden" />说就行。</h2></div>
          <p className="max-w-sm text-[15px] leading-7 text-cream/70">从一句模糊的需求，到门店接单台上的取餐号：AI 负责理解和核对，最后一步永远由你确认。</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, say, get, to }) => <Link key={title} to={to} className="group flex flex-col rounded-[26px] bg-white/[0.06] p-5 ring-1 ring-white/10 transition-all hover:-translate-y-1 hover:bg-white/[0.1] hover:ring-white/20">
            <div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-2xl bg-honey text-[#6b4c12]"><Icon className="size-5" /></span><ArrowUpRight className="size-5 text-cream/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cream" /></div>
            <h3 className="mt-5 font-serif text-[22px] font-semibold">{title}</h3>
            <p className="mt-3 w-fit rounded-[16px] rounded-bl-md bg-cream px-3 py-2 text-[13.5px] text-ink">“{say}”</p>
            <p className="mt-3 text-[13.5px] leading-6 text-cream/70">{get}</p>
          </Link>)}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-[13.5px] text-cream/70">
          <span className="inline-flex items-center gap-2"><ReceiptText className="size-4 text-sage" />下单前复述 → 你确认 → 提交门店</span>
          <span>单笔金额与每日次数有上限</span>
          <span>订单进度、重做与退款都能在对话里问</span>
          <span>AI 不代付，到店付款</span>
        </div>
      </div>
    </section>
  );
}
