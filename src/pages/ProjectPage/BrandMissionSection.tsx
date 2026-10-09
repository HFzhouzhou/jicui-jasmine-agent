import { motion } from 'framer-motion';
import { MapPin, Heart, Store, Award, Leaf, Globe } from 'lucide-react';

const FACTS = [
  {
    icon: Store,
    number: '22',
    suffix: '家',
    label: '全国门店',
    desc: '覆盖全国 8 个城市，让茉莉花香走进日常',
  },
  {
    icon: MapPin,
    number: '6',
    suffix: '家',
    label: '横州本源店',
    desc: '世界茉莉花都广西横州，源头品质保障',
  },
  {
    icon: Leaf,
    number: '84',
    suffix: '款',
    label: '真实在售饮品',
    desc: '从纯茶到特调，每一杯都有东方茶韵',
  },
  {
    icon: Award,
    number: '6',
    suffix: '年',
    label: '横州本土品牌',
    desc: '深耕横州茉莉花产业链，匠心做茶',
  },
];

export default function BrandMissionSection() {
  return (
    <section className="w-full py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* 品牌使命 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <Heart className="size-3.5" />
            品牌使命
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            让茉莉花香
            <br className="md:hidden" />
            <span className="text-primary mx-2">成为东方茶客日常的温暖记忆</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            源自世界茉莉花都广西横州，以六窨一提的传统窨制工艺为本，
            融合东方茶文化与现代轻生活方式，做一杯有温度、有文化、有品质的中国茶。
          </p>
        </motion.div>

        {/* 数据卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FACTS.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-card border border-border/60 rounded-xl p-5 text-center hover:border-primary/30 transition-all"
              >
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-black text-primary tracking-tight">
                  {f.number}
                  <span className="text-sm font-medium text-foreground ml-0.5">
                    {f.suffix}
                  </span>
                </div>
                <div className="text-sm font-medium text-foreground mt-1">
                  {f.label}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
