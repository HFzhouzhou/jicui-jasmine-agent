import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Share2, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDailyTeaSign } from '@/data/funFeatures';
import { Image } from '@/components/ui/image';
import { toast } from 'sonner';

interface DailyTeaSignProps {
  compact?: boolean;
}

function DailyTeaSign({ compact = false }: DailyTeaSignProps) {
  const navigate = useNavigate();
  const { drink, teaPhrase, dateLabel } = getDailyTeaSign();

  const handleDrink = () => {
    const q = `今天想喝${drink.name}，请帮我推荐最合适的甜度、温度和小料搭配`;
    navigate(`/ai-recommend?mode=chat&q=${encodeURIComponent(q)}`);
  };

  const handleShare = () => {
    toast.success('图片保存中');
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-primary/20 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        onClick={handleDrink}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Leaf className="size-3" />
                今日推荐
              </span>
            <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
          </div>
          <h4 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">
            {drink.name}
          </h4>
           <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
             {teaPhrase}
           </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-black text-primary">¥{drink.price}</span>
            <span className="text-xs text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              就喝它
              <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <section id="daily-sign" className="w-full py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* 左侧：茶签卡 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="relative mx-auto max-w-sm">
              {/* 茶签主体 - 仿签文质感 */}
              <div className="bg-gradient-to-b from-card to-primary/5 border-2 border-primary/30 rounded-2xl overflow-hidden shadow-lg">
                {/* 顶部印章 */}
                <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                  <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Leaf className="size-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{dateLabel}</div>
                    <div className="text-[10px] text-primary mt-0.5">今日推荐</div>
                  </div>
                </div>

                {/* 茶签主体 */}
                <div className="px-6 py-4 text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {drink.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-serif italic">
                    {drink.nameEn}
                  </p>
                  <div className="my-4 mx-auto w-24 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                   <p className="text-sm text-foreground leading-relaxed">
                     {teaPhrase}
                   </p>
                </div>

                {/* 底部标签 */}
                <div className="px-6 pb-5 pt-2 border-t border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {drink.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-lg font-black text-primary">¥{drink.price}</span>
                  </div>
                </div>
              </div>

              {/* 装饰飘带 */}
              <div className="absolute -left-3 top-8 size-6 bg-primary/20 rotate-12" />
              <div className="absolute -right-3 top-20 size-5 bg-secondary/40 -rotate-12" />
            </div>
          </motion.div>

          {/* 右侧：文案 + 按钮 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-3"
          >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Sparkles className="size-3.5" />
                每日推荐 · 今日一杯
              </span>
             <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
               今天，喝哪杯好？
             </h2>
             <p className="text-muted-foreground leading-relaxed mb-6 max-w-lg">
               每天从 84 款里挑一款，给你一个实在的推荐。
               拿不定主意的时候，就从这杯开始吧。
             </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="gap-2" onClick={handleDrink}>
                <Leaf className="size-4" />
                 就喝它 · 看看怎么喝
                 <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={handleShare}
              >
                <Share2 className="size-4" />
                 分享推荐
               </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default memo(DailyTeaSign);
