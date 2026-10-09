import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, Settings, CreditCard, Share2, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    icon: MessageCircle,
    title: '需求输入',
    desc: '三问选茶 / 自由对话，说说你的口味和场景',
  },
  {
    icon: Sparkles,
    title: 'AI 智能匹配',
    desc: '从 84 款真实菜单中筛选合适的',
  },
  {
    icon: Settings,
    title: '定制化推荐',
    desc: '推荐甜度、温度、小料，帮你选合适的喝法',
  },
  {
    icon: CreditCard,
    title: '生成茶单卡',
    desc: '生成茶单卡，中英双语对照',
  },
  {
    icon: Share2,
    title: '到店 & 分享',
    desc: '到店点单或分享给朋友',
  },
];

export default function JourneySection() {
  return (
    <section className="w-full py-16 md:py-20 bg-gradient-to-b from-background to-primary/[0.03]">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm font-medium tracking-wider">
            USER JOURNEY
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
            功能架构与用户旅程
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            从一杯茶的选择开始，到社交传播的完整体验
          </p>
        </motion.div>

        {/* 流程图 */}
        <div className="relative">
          {/* 连线（桌面端） */}
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative text-center"
                >
                  <div className="size-16 md:size-20 mx-auto rounded-full bg-card border-2 border-primary/30 flex items-center justify-center relative z-10 shadow-lg">
                    <Icon className="size-6 md:size-7 text-primary" />
                    <div className="absolute -top-1 -right-1 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                  </div>
                  <h4 className="mt-4 font-semibold text-foreground">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed px-2">
                    {step.desc}
                  </p>
                  {/* 移动端箭头 */}
                  {i < STEPS.length - 1 && (
                    <div className="md:hidden flex justify-center my-3">
                      <ArrowRight className="size-5 text-primary/40 rotate-90" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
