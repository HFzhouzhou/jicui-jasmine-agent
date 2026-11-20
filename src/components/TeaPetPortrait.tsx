import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { createTeaPetRenderer, portraitSource, type TeaPetMotion, type TeaPetPose } from './tea-pet-motion';
import './tea-pet-portrait.css';

export type { TeaPetMotion, TeaPetPose } from './tea-pet-motion';

const descriptions: Record<TeaPetPose, string> = {
  welcome: '小茉抬手招呼，发髻旁别着一朵茉莉花',
  serve: '穿玉绿坎肩的瓷茶宠小茉，笑着奉上一杯茶',
  playful: '小茉歪头托腮，俏皮地眨了眨眼',
  quiet: '小茉双手捧着白瓷杯，安静陪坐',
};

interface PortraitProps {
  pose?: TeaPetPose;
  className?: string;
  full?: boolean;
  motion?: TeaPetMotion;
  revision?: number;
  preloadReactions?: boolean;
}

function PortraitImage({ pose = 'serve', className, full = false }: PortraitProps) {
  return <img
    src={portraitSource(pose, full)}
    alt={full ? descriptions[pose] : '茶宠小茉'}
    width={full ? 960 : 192}
    height={full ? 960 : 192}
    draggable={false}
    className={cn('block shrink-0 select-none', full ? 'object-contain' : 'rounded-full bg-[#f4eddd] object-cover', className)}
  />;
}

function AnimatedPortrait({ pose = 'serve', motion, revision, className, preloadReactions }: PortraitProps & { motion: TeaPetMotion }) {
  const wrapper = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createTeaPetRenderer>>(null);
  const selection = useRef({ pose, motion });
  const shouldPreload = useRef(preloadReactions);

  useEffect(() => {
    selection.current = { pose, motion };
    void renderer.current?.show(pose, motion);
  }, [pose, motion, revision]);

  useEffect(() => {
    const surface = canvas.current;
    const root = wrapper.current;
    if (!surface || !root) return;
    const drawingSurface: HTMLCanvasElement = surface;
    const portrait: HTMLSpanElement = root;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    let canAnimate = true;
    function updatePlayback() {
      renderer.current?.play(visible && !document.hidden);
    }
    function updatePreference() {
      if (preference.matches) {
        renderer.current?.dispose();
        renderer.current = null;
        delete portrait.dataset.renderer;
        return;
      }
      if (renderer.current || !canAnimate) return;
      try {
        renderer.current = createTeaPetRenderer(drawingSurface, () => { portrait.dataset.renderer = 'canvas'; });
      } catch {
        canAnimate = false;
      }
      const initial = selection.current;
      const engine = renderer.current;
      if (!engine) return;
      void engine.show(initial.pose, initial.motion).then(() => {
        if (renderer.current === engine && shouldPreload.current) engine.warm(['serve', 'playful', 'quiet']);
      });
      updatePlayback();
    }
    function onContextLoss() {
      canAnimate = false;
      renderer.current?.dispose();
      renderer.current = null;
      delete portrait.dataset.renderer;
    }
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updatePlayback();
    }) : null;
    observer?.observe(surface);
    preference.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', updatePlayback);
    surface.addEventListener('contextlost', onContextLoss);
    updatePreference();
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', updatePlayback);
      surface.removeEventListener('contextlost', onContextLoss);
      renderer.current?.dispose();
      renderer.current = null;
      delete root.dataset.renderer;
    };
  }, []);

  useEffect(() => {
    shouldPreload.current = preloadReactions;
    if (preloadReactions) renderer.current?.warm(['serve', 'playful', 'quiet']);
  }, [preloadReactions]);

  return <span ref={wrapper} data-motion={motion} className={cn('tea-pet-portrait', className)}>
    <PortraitImage key={revision} pose={pose} full className="tea-pet-portrait__image" />
    <canvas ref={canvas} width={640} height={640} aria-hidden="true" className="tea-pet-portrait__canvas" />
  </span>;
}

export default function TeaPetPortrait({ full = false, motion, ...props }: PortraitProps) {
  return full && motion
    ? <AnimatedPortrait {...props} motion={motion} />
    : <PortraitImage {...props} full={full} />;
}
