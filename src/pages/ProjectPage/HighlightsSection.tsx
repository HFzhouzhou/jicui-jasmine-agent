import { motion } from 'framer-motion';
import { MOCK_PROJECT_HIGHLIGHTS } from '@/data/project';

export default function HighlightsSection() {
  return (
    <section className="w-full py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm font-medium tracking-wider">
            HIGHLIGHTS
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
            特色与长处
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            六大核心亮点，打造差异化竞争优势
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_PROJECT_HIGHLIGHTS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group bg-card border border-border/60 rounded-xl p-6 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="size-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">{item.icon}</span>
              </div>
              <h4 className="text-lg font-semibold text-foreground">{item.title}</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
