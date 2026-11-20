import TeaPetPortrait, { type TeaPetPose } from '@/components/TeaPetPortrait';
import { cn } from '@/lib/utils';
import './tea-pet-moment.css';

const poses = {
  welcome: 'welcome',
  quiet: 'quiet',
  think: 'serve',
  offer: 'serve',
  celebrate: 'playful',
} satisfies Record<string, TeaPetPose>;

export default function TeaPetMoment({ motion, className, compact = false }: {
  motion: keyof typeof poses;
  className?: string;
  compact?: boolean;
}) {
  return <span data-pet-moment={motion} data-compact={compact || undefined} className={cn('tea-pet-moment relative isolate grid shrink-0 place-items-center', className)}>
    <TeaPetPortrait full={!compact} pose={poses[motion]} motion={motion} className="size-full" />
    {(motion === 'celebrate' || motion === 'offer') && <span className="tea-pet-moment__glints" aria-hidden="true"><i /><i /><i /></span>}
  </span>;
}
