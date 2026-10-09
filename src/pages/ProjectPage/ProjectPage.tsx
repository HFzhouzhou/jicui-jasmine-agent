import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Flower2, Leaf, MessagesSquare, NotebookPen } from 'lucide-react';
import { PROJECT_CAPABILITIES, PROJECT_PENDING, PROJECT_DEMO_STEPS } from '@/data/project';

const icons = [MessagesSquare, Leaf, BookOpen, NotebookPen];

export default function ProjectPage() {
  return <div className="min-h-screen bg-background pb-16 md:pb-24">
    <section className="mx-auto max-w-7xl px-5 pb-12 pt-7 md:px-10 md:pb-20 md:pt-10">
      <div className="relative overflow-hidden rounded-[30px] bg-[#253b2d] px-7 py-12 text-[#f7f7ef] md:rounded-[36px] md:px-14 md:py-16">
        <div className="pointer-events-none absolute -bottom-32 -right-16 size-[430px] rounded-full border border-[#dce6bd]/10 md:size-[530px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 right-[-110px] size-[390px] rounded-full border border-[#dce6bd]/10 md:size-[490px]" aria-hidden="true" />
        <Flower2 className="pointer-events-none absolute bottom-6 right-8 size-40 stroke-[0.6] text-[#dce6bd]/15 md:bottom-10 md:right-20 md:size-64" aria-hidden="true" />
        <div className="relative z-10">
          <p className="mb-8 text-[10px] tracking-[0.28em] text-[#dce6bd]/80">ABOUT JICUI · 一杯茶的相遇</p>
          <h1 className="max-w-3xl font-serif text-[36px] leading-[1.45] tracking-tight md:text-[54px]">让茉莉的清香，<br /><span className="text-[#dce6bd]">多懂你一点。</span></h1>
          <p className="mt-6 max-w-[490px] text-sm leading-8 text-[#f7f7ef]/65">从“今天喝什么”，到有依据的一杯茶。茉莉娘子把你的口味与菜单连接起来，也把需要确认的细节，认真告诉你。</p>
          <Link to="/ai-recommend" className="mt-9 inline-flex items-center gap-8 rounded-full bg-[#dce6bd] px-6 py-3.5 text-sm text-[#253b2d] transition-colors hover:bg-[#edf3d5]">和茉莉娘子聊聊<ArrowUpRight className="size-4" /></Link>
        </div>
      </div>
    </section>

    <section className="mx-auto grid max-w-7xl gap-9 px-5 pb-14 md:grid-cols-[0.8fr_1.4fr] md:gap-16 md:px-10 md:pb-20">
      <div><p className="mb-4 text-[10px] tracking-[0.26em] text-primary/55">A THOUGHTFUL TEA COMPANION</p><h2 className="font-serif text-3xl leading-relaxed text-primary md:text-4xl">选茶有心意，<br />推荐有依据。</h2><p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">面向顾客的选茶助手，也是品牌可以持续维护的菜单与知识工具。</p></div>
      <div className="grid gap-x-7 gap-y-8 sm:grid-cols-2">{PROJECT_CAPABILITIES.map((item, index) => { const Icon = icons[index]; return <article key={item.title} className="border-t border-primary/15 pt-5"><div className="mb-5 flex items-center justify-between"><Icon className="size-5 stroke-[1.4] text-primary/65" /><span className="text-[10px] tracking-wider text-primary/35">0{index + 1}</span></div><h3 className="font-serif text-xl text-primary">{item.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p></article>; })}</div>
    </section>

    <section className="mx-auto max-w-7xl px-5 md:px-10">
      <div className="rounded-[30px] bg-[#eceee2] px-7 py-10 md:px-10 md:py-12">
        <div className="mb-9 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="mb-4 text-[10px] tracking-[0.26em] text-primary/55">FROM A CONVERSATION TO A CUP</p><h2 className="font-serif text-3xl text-primary">一杯茶，四步相遇。</h2></div><span className="text-xs text-muted-foreground">每一步，都可以亲自体验。</span></div>
        <ol className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">{PROJECT_DEMO_STEPS.map(([title, description], index) => <li key={title}><div className="mb-5 flex items-center gap-4"><span className="font-serif text-4xl text-primary/35">0{index + 1}</span><span className="h-px flex-1 bg-primary/10" /></div><h3 className="font-serif text-xl text-primary">{title}</h3><p className="mt-3 text-xs leading-7 text-muted-foreground">{description}</p></li>)}</ol>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 pt-14 md:px-10 md:pt-20">
      <div className="mb-8"><p className="mb-4 text-[10px] tracking-[0.26em] text-primary/55">GROWING, WITH THE BRAND</p><h2 className="font-serif text-3xl text-primary">把这一杯，慢慢完善。</h2></div>
      <div className="grid gap-4 sm:grid-cols-2">{PROJECT_PENDING.map((item, index) => <article key={item.title} className="flex gap-5 rounded-[24px] bg-white/75 p-6"><span className="pt-1 text-[10px] text-primary/35">0{index + 1}</span><div><h3 className="font-serif text-lg text-primary">{item.title}</h3><p className="mt-2 text-xs leading-7 text-muted-foreground">{item.description}</p></div></article>)}</div>
      <p className="mt-7 max-w-3xl text-[11px] leading-6 text-muted-foreground">当前版本用于项目体验与验证。页面可选状态由管理端维护，实际售卖情况以门店为准；未核准的种子资料不代表品牌正式菜单。</p>
    </section>
  </div>;
}
