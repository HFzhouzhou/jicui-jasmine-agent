import { motion } from 'framer-motion';
import { Leaf, MapPin, Award } from 'lucide-react';
import { Image } from '@/components/ui/image';

const BRAND_IMG = '/spark/app/app_17dszc02xwh/runtime/api/v1/storage/object/bucket_aadkufch4uwag_static/static%2Faadkue5jodkcu_ve_miaoda';
const CRAFT_IMG = '/spark/app/app_17dszc02xwh/runtime/api/v1/storage/object/bucket_aadkufch4uwag_static/static%2Faadkue66o46jw_ve_miaoda';

const FEATURES = [
  {
    icon: MapPin,
    title: '世界茉莉花都',
    desc: '广西横州市，全球最大茉莉花产地，茉莉花香甲天下',
  },
  {
    icon: Leaf,
    title: '传统窨制工艺',
    desc: '七窨一提，让茉莉花香深沁茶骨，韵味悠长',
  },
  {
    icon: Award,
    title: '东方茶新表达',
    desc: '2022 年创立，84 款创意茶饮，让传统焕发新生',
  },
];

export default function BrandIntroSection() {
  return (
    <section className="w-full py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* 左：图片 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3]">
              <Image
                src={BRAND_IMG}
                alt="横州茉莉花田"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-lg border-4 border-background">
              <Image
                src={CRAFT_IMG}
                alt="窨制工艺"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* 右：文字 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div>
              <span className="text-primary text-sm font-medium tracking-wider">BRAND STORY</span>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
                来自横州的
                <br />
                <span className="text-primary">东方茉莉茶香</span>
              </h2>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              极萃东方茉莉，2022 年创立于"世界茉莉花都"——广西横州市。
              我们坚持使用横州原产地茉莉花茶底，融合传承千年的窨制工艺与现代茶饮创意，
              只为将最纯净的茉莉花香，带到每一位东方茶客的日常。
            </p>

            <div className="space-y-4 pt-2">
              {FEATURES.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* 文化钩子 */}
            <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
              <p className="text-sm text-foreground/80 leading-relaxed italic font-serif">
                "七窨一提，花魂入骨。一盏清茶，藏着横州三月的春露与六月的花香。
                每一口，都是茉莉花与茶叶的千年之约。"
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
