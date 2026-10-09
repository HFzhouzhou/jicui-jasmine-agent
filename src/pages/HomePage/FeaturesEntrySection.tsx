import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  MessageCircle,
  Users,
  Grid3X3,
  Trophy,
  ArrowRight,
  Flower2,
  Wand2,
  Heart,
  Bookmark,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const FEATURES = [
  {
    icon: Sparkles,
    title: '四问选茶',
    desc: '4个问题，帮你快速选到合适的茶',
    path: '/ai-recommend?mode=quiz',
    color: 'from-primary/10 to-primary/5',
    textColor: 'text-primary',
    highlight: true,
  },
  {
    icon: MessageCircle,
    title: '自由对话',
    desc: '说需求就推荐，口味/价格/场景都行',
    path: '/ai-recommend?mode=chat',
    color: 'from-emerald-400/10 to-teal-400/10',
    textColor: 'text-emerald-600',
  },
  {
    icon: Flower2,
    title: '三题选一杯',
    desc: '3道题帮你选一款，简单直接',
    path: '/personality',
    color: 'from-fuchsia-400/10 to-purple-400/10',
    textColor: 'text-fuchsia-600',
    isNew: true,
  },
  {
    icon: Users,
    title: '多人一起点',
    desc: '2-3人一次配齐，口味各有所好',
    path: '/ai-recommend?mode=group',
    color: 'from-rose-400/10 to-pink-400/10',
    textColor: 'text-rose-600',
  },
  {
    icon: Grid3X3,
    title: '场景速配',
    desc: '通勤/加班/追剧/放松，一键配好',
    path: '/ai-recommend?mode=packages',
    color: 'from-amber-400/10 to-orange-400/10',
    textColor: 'text-amber-600',
  },
  {
    icon: Trophy,
    title: '点单榜单',
    desc: '提神/低卡/性价比/颜值/暖饮五大榜',
    path: '/ai-recommend?mode=ranking',
    color: 'from-violet-400/10 to-indigo-400/10',
    textColor: 'text-violet-600',
  },
  {
    icon: Bookmark,
    title: '每日推荐',
    desc: '今天喝什么？给你一杯实在的推荐',
    anchor: 'daily-sign',
    color: 'from-teal-400/10 to-cyan-400/10',
    textColor: 'text-teal-600',
    isNew: true,
  },
  {
    icon: Wand2,
    title: '给茶起个名',
    desc: '给你喜欢的茶起个别名，方便记',
    path: '/ai-recommend?mode=chat',
    color: 'from-orange-400/10 to-red-400/10',
    textColor: 'text-orange-600',
    isNew: true,
  },
  {
    icon: Heart,
    title: '为你推荐',
    desc: '按你点过的和口味偏好，推荐下次喝的',
    anchor: 'guess-you-like',
    color: 'from-pink-400/10 to-rose-400/10',
    textColor: 'text-pink-600',
    isNew: true,
  },
];

export default function FeaturesEntrySection() {
  const navigate = useNavigate();

  return (
    <section className="w-full py-16 md:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
             <span className="inline-block text-xs font-medium text-primary mb-3">
              ✦ 九种饮茶打开方式 ✦
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              提神解渴 · 轻负担好喝 · 价格实在
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              四问选茶 / 自由对话 / 多人拼单 / 场景速配
              <br className="hidden md:block" />
              从 84 款真实横州茉莉茶饮中，帮你选一杯合适的
            </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
             const Icon = f.icon;
             const handleClick = () => {
               if (f.anchor) {
                 // 页内锚点滚动
                 const el = document.getElementById(f.anchor!);
                 if (el) {
                   el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                 }
               } else if (f.path) {
                 navigate(f.path);
               }
             };
             return (
              <motion.button
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                 onClick={handleClick}
                className="group text-left"
              >
                <Card className="border-border/60 h-full overflow-hidden hover:border-primary/30 transition-all duration-300 relative">
                   {f.isNew && (
                     <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium z-10">
                       NEW
                     </span>
                   )}
                   <CardContent className="p-5">
                    <div
                      className={`size-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className={`size-6 ${f.textColor}`} />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {f.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {f.desc}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      立即体验
                      <ArrowRight className="size-3" />
                    </div>
                  </CardContent>
                </Card>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
