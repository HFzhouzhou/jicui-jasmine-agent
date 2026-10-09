import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle, ArrowRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { QUICK_QUESTIONS, getTimeGreeting, getSeasonTip } from '@/data/experience';

const HERO_IMG = '/spark/app/app_17dszc02xwh/runtime/api/v1/storage/object/bucket_aadkufch4uwag_static/static%2Faadkuez5xielw_ve_miaoda';

export default function HeroSection() {
  const navigate = useNavigate();
  const timeGreeting = getTimeGreeting();
  const seasonTip = getSeasonTip();

  const handleQuickAsk = (q: string) => {
    navigate(`/ai-recommend?mode=chat&q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative w-full overflow-hidden">
      {/* 背景图 */}
      <div className="absolute inset-0 z-0">
        <Image
          src={HERO_IMG}
          alt="极萃东方茉莉 Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-32">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4"
          >
            <Sparkles className="size-4" />
            <span>{timeGreeting.greeting}，我是茉莉娘子</span>
          </motion.div>

          {/* 应季小提示 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-xs text-foreground mb-4"
          >
            <span>{seasonTip.icon}</span>
            <span className="text-primary font-medium">{seasonTip.season}</span>
            <span>{seasonTip.tip}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl font-bold text-foreground tracking-tight leading-tight"
          >
            茉莉香为引
            <br />
            <span className="text-primary">花样东方茶</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg text-muted-foreground leading-relaxed"
          >
             来自广西横州的东方茉莉茶饮品牌。
             <br className="hidden md:block" />
             84 款真实饮品，帮你选一杯合适的。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="gap-2 text-base h-12 px-8 shadow-lg shadow-primary/20"
              onClick={() => navigate('/ai-recommend?mode=quiz')}
            >
              <Sparkles className="size-5" />
              四问选茶
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base h-12 px-8 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => navigate('/ai-recommend?mode=chat')}
            >
              <MessageCircle className="size-5" />
               直接说需求
            </Button>
          </motion.div>

          {/* 试试这样问 - 快捷气泡 */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-8"
          >
            <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
              <Leaf className="size-3.5 text-primary" />
              试试这样问
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.slice(0, 4).map((q, i) => (
                <motion.button
                  key={q}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleQuickAsk(q)}
                  className="px-3.5 py-2 text-sm rounded-full bg-card/80 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:bg-primary/5 text-foreground/80 hover:text-primary transition-all shadow-sm"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  「{q}」
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-10 flex items-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">84</span>
              <span>款真实饮品</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">22</span>
              <span>家门店</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">6</span>
              <span>年横州品牌</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
