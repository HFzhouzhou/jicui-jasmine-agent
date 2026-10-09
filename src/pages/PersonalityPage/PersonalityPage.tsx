import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Leaf } from 'lucide-react';
import TeaPersonalityQuiz from '@/components/TeaPersonalityQuiz';
import { Card, CardContent } from '@/components/ui/card';

function PersonalityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-secondary/10">
      <main className="max-w-xl mx-auto px-4 py-8 md:py-12">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="size-3.5" />
            趣味选茶
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            三题帮你选一杯
          </h1>
          <p className="text-sm text-muted-foreground">
            根据你的口味习惯，推荐一款合适的
          </p>
        </motion.div>

        {/* 测试卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-0">
              <TeaPersonalityQuiz />
            </CardContent>
          </Card>
        </motion.div>

        {/* 底部装饰 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-6 leading-relaxed"
        >
          <Leaf className="size-3 inline mr-1 text-primary/50" />
           测试仅供参考，愿你喝到喜欢的茶
        </motion.p>
      </main>
    </div>
  );
}

export default memo(PersonalityPage);
