import { motion } from 'framer-motion';
import { Clock, Mic, Play, Monitor, Users, Lightbulb } from 'lucide-react';

const DEMO_TIMELINE = [
  {
    time: '0:00 - 0:30',
    title: '开场与痛点',
    action: '站定 → 打开首页 → 指向「三问选茶」按钮',
    script: [
      '「评委老师好，我们是极萃东方茉莉团队。」',
      '「今天带大家认识一位特别的茶艺师——茉莉娘子。」',
      '「你有没有过这种体验：站在茶饮店菜单前 5 分钟还选不好？84 款产品，选择困难症直接发作。」',
      '「而且，每个人的口味、体质、场景都不一样——同样一杯茶，甲之蜜糖乙之砒霜。」',
    ],
    icon: Mic,
    color: 'from-rose-400 to-pink-400',
  },
  {
    time: '0:30 - 1:30',
    title: '现场演示：四问选茶',
    action: '点击「四问选茶」→ 依次选 4 个选项 → 等待结果 → 展示茶单卡',
    script: [
      '「让茉莉娘子帮你——四问选茶，30 秒配好一杯。」',
      '「第一问，心情；第二问，口味；第三问，场景；第四问，体质诉求。」',
      '「大家看——茶单卡顶部有契合度和匹配标签，告诉用户为什么这杯适合你。」',
      '「下面有到店点单暗号，中文一句、英文一句，到店直接出示给店员，呼应品牌出海战略。」',
      '「一键复制茶单、存图分享，社交传播性很强。」',
    ],
    icon: Play,
    color: 'from-primary to-emerald-500',
  },
  {
    time: '1:30 - 2:10',
    title: '自由对话 + 忌口拦截',
    action: '切到「自由对话」→ 输入"我乳糖不耐，想喝提神的" → 展示 AI 避开奶类的推荐',
    script: [
      '「如果你觉得四问还不够，直接和茉莉娘子聊。」',
      '「我们试一下——"我乳糖不耐，想喝提神的"。」',
      '「注意看，用户档案里设置的忌口是硬约束——乳糖不耐就绝对不推鲜奶、奶昔、奶酪类。」',
      '「茉莉娘子会主动说明："因为你乳糖不耐，我帮你避开了所有奶制品～"」',
      '「还支持对比类问题，比如"茉莉美式和宋韵茉莉拿铁哪个提神"，AI 基于菜单知识客观回答。」',
    ],
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-500',
  },
  {
    time: '2:10 - 2:40',
    title: '多人拼单 + 双语点单暗号',
    action: '切「多人拼单」→ 填 3 人需求 → 展示拼单结果 + 英文点单句',
    script: [
      '「大学生高频场景——宿舍拼单。2 到 4 人，一次性配齐。」',
      '「看，每个人一杯专属推荐，还自动算总价。」',
      '「为什么要有中英双语点单暗号？因为我们品牌的战略是出海——东方茉莉，走向世界。」',
      '「每款饮品都有雅致英文名，到店点单一句英文搞定，留学生、外国游客都能用。」',
    ],
    icon: Users,
    color: 'from-violet-500 to-indigo-500',
  },
  {
    time: '2:40 - 3:00',
    title: '总结特色 + 团队',
    action: '切「项目方案」页 → 指向特色版块 → 鞠躬致意',
    script: [
      '「总结一下茉莉娘子的三大差异化优势：」',
      '「第一，IP 人格化——不只是工具，而是有温度的茶艺师。」',
      '「第二，真实菜单知识库——84 款真实在售，不是假推荐。」',
      '「第三，轻量架构快速落地——学生团队就能做，已经可以直接对接门店使用。」',
      '「我们的团队 5 名大学生 + 1 位指导老师，来自产品、技术、内容、视觉、商分五个方向。」',
      '「茉莉香为引，花样东方茶。谢谢评委老师！」',
    ],
    icon: Monitor,
    color: 'from-primary to-teal-500',
  },
];

export default function DemoTimelineSection() {
  return (
    <section className="w-full py-16 md:py-20 bg-gradient-to-b from-background to-primary/[0.02]">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Clock className="size-4" />
            3 分钟答辩演示动线
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            三分钟讲完一个好故事
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            按时间轴设计的演示脚本，每段明确操作动作与讲解要点
          </p>
        </motion.div>

        <div className="relative">
          {/* 时间轴线 */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />

          <div className="space-y-8">
            {DEMO_TIMELINE.map((item, i) => {
              const Icon = item.icon;
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`relative flex ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* 圆点 */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 size-4 rounded-full bg-background border-2 border-primary z-10" />

                  {/* 卡片 */}
                  <div
                    className={`ml-14 md:ml-0 md:w-[calc(50%-2rem)] ${
                      isLeft ? 'md:pr-8' : 'md:pl-8'
                    }`}
                  >
                    <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`size-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}
                        >
                          <Icon className="size-4 text-white" />
                        </div>
                        <div>
                          <div className="text-xs text-primary font-medium font-mono">
                            {item.time}
                          </div>
                          <h3 className="font-semibold text-foreground">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      <div className="mb-3 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
                        <span className="font-medium text-foreground">操作动作：</span>
                        {item.action}
                      </div>

                      <div className="space-y-1.5">
                        {item.script.map((line, j) => (
                          <p
                            key={j}
                            className="text-sm text-foreground/80 leading-relaxed flex gap-2"
                          >
                            <span className="text-primary shrink-0">「</span>
                            <span>{line.replace(/^「|」$/g, '')}</span>
                            <span className="text-primary shrink-0">」</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
