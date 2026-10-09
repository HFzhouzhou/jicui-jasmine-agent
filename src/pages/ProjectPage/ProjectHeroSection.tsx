import { motion } from 'framer-motion';
import { Sparkles, Award } from 'lucide-react';

export default function ProjectHeroSection() {
  return (
    <section className="w-full bg-gradient-to-br from-primary/15 via-primary/5 to-background pt-20 pb-16 md:pt-28 md:pb-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-5">
            <Award className="size-4" />
            大学生创新创业竞赛项目
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight">
            AI 茶饮随心配
            <br />
            <span className="text-primary">智能体项目方案</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            以「茉莉娘子」IP 为人格化入口，三问选茶 + 自由对话双模式，
            <br className="hidden md:block" />
            从 84 款真实横州茉莉茶饮中智能匹配专属推荐
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-foreground font-medium">IP 人格化</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-foreground font-medium">84 款真实菜单</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-foreground font-medium">四维智能匹配</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
