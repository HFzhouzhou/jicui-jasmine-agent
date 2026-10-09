import { motion } from 'framer-motion';
import { Phone, MapPin } from 'lucide-react';
import { MOCK_PROJECT_CONTACT } from '@/data/project';

export default function ContactSection() {
  const lines = MOCK_PROJECT_CONTACT.content.split('\n');

  return (
    <section className="w-full py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl p-8 md:p-12 text-center"
        >
          <span className="text-primary text-sm font-medium tracking-wider">
            CONTACT US
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
            {MOCK_PROJECT_CONTACT.title}
          </h2>
          {MOCK_PROJECT_CONTACT.subtitle && (
            <p className="mt-2 text-muted-foreground">{MOCK_PROJECT_CONTACT.subtitle}</p>
          )}

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="size-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">{lines[0]?.split('：')[0]}</div>
                <div className="text-lg font-semibold text-foreground">
                  {lines[0]?.split('：')[1]}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="size-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">项目地址</div>
                <div className="text-lg font-semibold text-foreground">
                  {lines[1]?.split('：')[1]}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-primary/10 text-sm text-muted-foreground">
            欢迎校企合作 · 欢迎投资洽谈 · 欢迎加入我们
          </div>
        </motion.div>
      </div>
    </section>
  );
}
