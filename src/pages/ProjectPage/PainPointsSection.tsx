import { motion } from 'framer-motion';
import { AlertCircle, Users, Clock, BookOpen } from 'lucide-react';
import {
  MOCK_PROJECT_OVERVIEW,
  MOCK_PROJECT_PAIN_POINTS,
} from '@/data/project';

const PAIN_ICONS = [AlertCircle, Clock, Users, BookOpen];

export default function PainPointsSection() {
  return (
    <section className="w-full py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* 项目背景 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium tracking-wider">
            PROJECT BACKGROUND
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
            {MOCK_PROJECT_OVERVIEW.title}
          </h2>
          {MOCK_PROJECT_OVERVIEW.subtitle && (
            <p className="mt-2 text-muted-foreground">{MOCK_PROJECT_OVERVIEW.subtitle}</p>
          )}
          <p className="mt-6 text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            {MOCK_PROJECT_OVERVIEW.content}
          </p>
        </motion.div>

        {/* 痛点 */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-foreground text-center mb-8">
            我们解决什么痛点？
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_PROJECT_PAIN_POINTS.map((pain, i) => {
              const Icon = PAIN_ICONS[i % PAIN_ICONS.length];
              return (
                <motion.div
                  key={pain.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-card border border-border/60 rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="size-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
                    <Icon className="size-5 text-destructive" />
                  </div>
                  <h4 className="font-semibold text-foreground">{pain.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {pain.content}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
