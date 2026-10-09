import { motion } from 'framer-motion';
import { MOCK_TEAM_MEMBERS } from '@/data/project';
import { Image } from '@/components/ui/image';

export default function TeamSection() {
  return (
    <section className="w-full py-16 md:py-20 bg-gradient-to-b from-primary/[0.03] to-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm font-medium tracking-wider">
            OUR TEAM
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
            团队分工
          </h2>
          <p className="mt-3 text-muted-foreground">
            5 名大学生 + 1 名指导老师
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {MOCK_TEAM_MEMBERS.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-card border border-border/60 rounded-xl p-4 text-center hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="size-16 mx-auto rounded-full overflow-hidden border-2 border-primary/20 mb-3">
                <Image
                  src={member.avatarUrl}
                  alt={member.role}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-semibold text-foreground text-sm">{member.role}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{member.name}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-2 leading-tight">
                {member.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
