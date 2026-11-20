import type { CSSProperties } from 'react';
import type { TeaPetPose } from '@/components/TeaPetPortrait';
import './tea-pet-atmosphere.css';

const motes = [
  { x: 20, y: 60, size: 4, drift: -17, delay: -2.6, duration: 6.5 },
  { x: 13, y: 43, size: 2, drift: 13, delay: -3.2, duration: 8.3 },
  { x: 79, y: 52, size: 4, drift: 14, delay: -5.2, duration: 7.4 },
  { x: 87, y: 65, size: 3, drift: -9, delay: -1.8, duration: 6.9 },
  { x: 77, y: 29, size: 2, drift: 18, delay: -4.6, duration: 8.9 },
];

const bursts = {
  welcome: { x: 29, y: 44, kind: 'petal' },
  pat: { x: 64, y: 15, kind: 'petal' },
  poke: { x: 68, y: 36, kind: 'glint' },
  chatter: { x: 66, y: 31, kind: 'glint' },
} as const;

const scatter = [
  { x: 29, y: -31, angle: 48, delay: 0 },
  { x: 44, y: -13, angle: 110, delay: 0.07 },
  { x: -17, y: -37, angle: -110, delay: 0.15 },
  { x: 18, y: 22, angle: 150, delay: 0.12 },
];

function isBurst(reaction: string): reaction is keyof typeof bursts {
  return Object.hasOwn(bursts, reaction);
}

export default function TeaPetAtmosphere({ reaction, revision, pose = 'welcome' }: {
  reaction: string;
  revision: number;
  pose?: TeaPetPose;
}) {
  const burst = isBurst(reaction) ? bursts[reaction] : null;
  return (
    <span className="tea-pet-atmosphere" data-reaction={reaction} data-pose={pose} aria-hidden="true">
      <span className="tea-pet-atmosphere__frame">
        <span key={reaction === 'feed' || reaction === 'offer' ? revision : 'brewing'} className="tea-pet-atmosphere__cup">
          <span className="tea-pet-atmosphere__steam">
            <i />
            <i />
            <i />
          </span>
          {reaction === 'feed' && <span className="tea-pet-atmosphere__feed"><i /><i /><i /></span>}
        </span>
        {motes.map(({ x, y, size, drift, delay, duration }) => <i key={x} className="tea-pet-atmosphere__mote" style={{
          left: `${x}%`, top: `${y}%`, width: size, height: size, animationDelay: `${delay}s`,
          animationDuration: `${duration}s`, '--mote-drift': `${drift}px`,
        } as CSSProperties} />)}
        <i className="tea-pet-atmosphere__floating-petal" />
        <i className="tea-pet-atmosphere__floating-petal tea-pet-atmosphere__floating-petal--right" />
        {burst && <span key={revision} className="tea-pet-atmosphere__burst" style={{ left: `${burst.x}%`, top: `${burst.y}%` }} data-kind={burst.kind}>
          {scatter.map(({ x, y, angle, delay }) => <i key={x} style={{
            '--burst-x': `${x}px`, '--burst-y': `${y}px`, '--burst-angle': `${angle}deg`,
            animationDelay: `${delay}s`,
          } as CSSProperties} />)}
        </span>}
      </span>
    </span>
  );
}
