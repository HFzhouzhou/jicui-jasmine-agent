import { useEffect, useRef, useState } from 'react';
import type { TeaPetPose } from '@/components/TeaPetPortrait';

const reactions = {
  welcome: { pose: 'welcome', lines: ['你来啦，今天想喝点什么？', '见到你啦，来喝杯茶吧。'] },
  pat: { pose: 'playful', lines: ['哎呀，茉莉花要被摸掉啦～', '轻一点，花还别在发髻上呢。', '嗯，再坐一会儿吧。'] },
  poke: { pose: 'playful', lines: ['茶杯要端不稳啦。', '有事慢慢说，我在听。'] },
  feed: { pose: 'serve', lines: ['给我的？那我尝一小口。', '谢谢你呀，这口留给小茉。', '收到，我用小茶杯接住啦。'] },
  offer: { pose: 'serve', lines: ['给你奉杯茶，慢慢喝。', '来，先捧一捧茶杯。'] },
  quiet: { pose: 'quiet', lines: ['我在这儿陪你，想好了再说。', '捧杯坐一会儿，也很好。'] },
  chatter: { pose: 'playful', lines: ['花香淡淡的，也很耐闻。', '要不要慢慢喝，慢慢聊？', '捧着茶杯，心里也暖乎乎。'] },
} satisfies Record<string, { pose: TeaPetPose; lines: string[] }>;
type Reaction = keyof typeof reactions;

interface Moment { reaction: Reaction; line: number; revision: number }
const welcome: Moment = { reaction: 'welcome', line: 0, revision: 0 };

export function useTeaPetReactions(open: boolean) {
  const [moment, setMoment] = useState(welcome);
  const [chatter, setChatter] = useState(false);
  const lastPat = useRef(-Infinity);
  const counts = useRef({ welcome: 0, pat: 0, poke: 0, feed: 0, offer: 0, quiet: 0, chatter: 0 });
  const current = open ? moment : welcome;
  const { pose, lines } = reactions[current.reaction];

  function respond(reaction: Reaction) {
    const line = counts.current[reaction]++ % reactions[reaction].lines.length;
    setMoment(previous => ({ reaction, line, revision: previous.revision + 1 }));
  }

  useEffect(() => {
    if (!open) return;
    let idleTimer: number;
    let chatterTimer: number;
    function speak() {
      const line = counts.current.chatter++ % reactions.chatter.lines.length;
      setMoment(previous => ({ reaction: 'chatter', line, revision: previous.revision + 1 }));
    }
    function resetIdle() {
      window.clearTimeout(idleTimer);
      window.clearInterval(chatterTimer);
      if (document.visibilityState !== 'visible') return;
      idleTimer = window.setTimeout(() => setMoment(previous => previous.reaction === 'quiet' ? previous : {
        reaction: 'quiet', line: 0, revision: previous.revision + 1,
      }), 30_000);
      if (chatter) chatterTimer = window.setInterval(speak, 300_000);
    }
    resetIdle();
    window.addEventListener('pointerdown', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('scroll', resetIdle, { passive: true });
    document.addEventListener('visibilitychange', resetIdle);
    return () => {
      window.clearTimeout(idleTimer);
      window.clearInterval(chatterTimer);
      window.removeEventListener('pointerdown', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('scroll', resetIdle);
      document.removeEventListener('visibilitychange', resetIdle);
    };
  }, [open, chatter]);

  function act(action: Exclude<Reaction, 'poke'>) {
    if (action === 'pat') {
      const now = performance.now();
      respond(now - lastPat.current < 550 ? 'poke' : 'pat');
      lastPat.current = now;
    } else if (action === 'chatter') {
      setChatter(!chatter);
      if (!chatter) respond('chatter');
    } else {
      if (action === 'quiet') setChatter(false);
      respond(action);
    }
  }

  return { pose, reaction: current.reaction, revision: current.revision, line: lines[current.line], chatter, act };
}
