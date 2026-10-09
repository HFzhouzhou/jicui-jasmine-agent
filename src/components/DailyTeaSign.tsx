import { Link } from 'react-router-dom';
import { Leaf, ArrowRight } from 'lucide-react';

/** Editorial prompt only. This does not pretend a calendar rotation is an AI recommendation. */
export default function DailyTeaSign({ compact = false }: { compact?: boolean }) {
  return <div className={`rounded-xl border border-border bg-card ${compact ? 'p-4' : 'p-6'}`}><Leaf className="size-5 text-primary mb-3" /><h3 className="font-serif text-lg">今天，想喝什么口味？</h3><p className="text-sm text-muted-foreground mt-2">不妨从花香、茶味或果香说起。</p><Link to="/ai-recommend?mode=chat" className="mt-4 inline-flex items-center gap-2 text-sm text-primary">和茉莉娘子聊聊<ArrowRight className="size-4" /></Link></div>;
}
