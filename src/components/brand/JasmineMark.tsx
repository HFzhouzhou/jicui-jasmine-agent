import { cn } from '@/lib/utils';

/** Five-petal jasmine blossom used as the brand mark and as quiet decoration. */
export default function JasmineMark({ className, petal = 'currentColor', heart = '#e6c77a' }: { className?: string; petal?: string; heart?: string }) {
  return <svg viewBox="0 0 48 48" className={cn('size-6', className)} aria-hidden="true">
    <g transform="translate(24 24)">
      {[0, 72, 144, 216, 288].map((angle) => <path key={angle} transform={`rotate(${angle})`} d="M0-3C-5.6-7-6.4-15.5 0-20 6.4-15.5 5.6-7 0-3Z" fill={petal} />)}
      <circle r="3.6" fill={heart} />
    </g>
  </svg>;
}
