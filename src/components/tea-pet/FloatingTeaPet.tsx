import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ChevronDown, Cookie, CupSoda, Hand, HandHeart, Leaf, MessageCircle } from 'lucide-react';
import TeaPetPortrait from '@/components/TeaPetPortrait';
import TeaPetAtmosphere from './TeaPetAtmosphere';
import { useTeaPetReactions } from './tea-pet-reactions';
import './floating-tea-pet.css';

const actions = [
  { id: 'welcome', label: '挥手', Icon: HandHeart },
  { id: 'pat', label: '摸摸头', Icon: Hand },
  { id: 'feed', label: '喂小料', Icon: Cookie },
  { id: 'offer', label: '奉茶', Icon: CupSoda },
  { id: 'quiet', label: '陪坐', Icon: Leaf },
  { id: 'chatter', label: '碎碎念', Icon: MessageCircle },
] as const;

function useComposerClearance(anchorRef: RefObject<HTMLElement | null>, inChat: boolean, close: () => void) {
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !inChat) return;
    const page = anchor.closest('.app-shell')?.querySelector('main');
    const gap = 12;
    let frame = 0;
    let composer: HTMLElement | null = null;
    let active = true;

    function update() {
      if (!anchor) return;
      const mountedComposer = document.getElementById('tea-chat-composer');
      if (mountedComposer !== composer) {
        if (composer) resizeObserver?.unobserve(composer);
        composer = mountedComposer;
        if (composer) resizeObserver?.observe(composer);
      }
      const target = composer?.getBoundingClientRect();
      // The fixed anchor keeps its original geometry while only its inner
      // dock moves. Every pass gets the same baseline, including on reload.
      const base = anchor.getBoundingClientRect();
      const intersects = target && target.height > 0 && target.width > 0
        && target.right + gap > base.left && target.left - gap < base.right
        && target.top - gap < base.bottom && target.bottom + gap > base.top;
      const clearance = intersects ? Math.ceil(base.bottom - target.top + gap) : 0;
      const obscured = clearance > 0 && base.top - clearance < 74;
      anchor.style.setProperty('--composer-clearance', `${clearance}px`);
      anchor.toggleAttribute('data-obscured', obscured);
      if (obscured) close();
    }

    function schedule() {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(anchor);
    if (page) resizeObserver?.observe(page);
    const routeObserver = page ? new MutationObserver(schedule) : null;
    if (page) routeObserver?.observe(page, { childList: true, subtree: true });
    void document.fonts?.ready.then(schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    update();
    schedule();
    return () => {
      active = false;
      resizeObserver?.disconnect();
      routeObserver?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      anchor.style.removeProperty('--composer-clearance');
      anchor.removeAttribute('data-obscured');
    };
  }, [anchorRef, inChat, close]);
}

export default function FloatingTeaPet({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const actionsId = useId();
  const close = useCallback(() => setOpen(false), []);
  const inChat = /^\/ai-recommend\/?$/i.test(pathname);
  const { pose, reaction, revision, line, chatter, act } = useTeaPetReactions(open);

  useEffect(close, [pathname, close]);
  useComposerClearance(anchor, inChat, close);
  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !anchor.current?.contains(event.target)) close();
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const returnFocus = anchor.current?.contains(document.activeElement);
      close();
      if (returnFocus) launcher.current?.focus({ preventScroll: true });
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [close, open]);

  function toggle() {
    if (open) {
      close();
    } else {
      act('welcome');
      setOpen(true);
    }
  }

  return <aside ref={anchor} className="floating-tea-pet" data-open={open ? '' : undefined} aria-label="互动茶宠">
    <div className="floating-tea-pet__dock">
      <button
        ref={launcher}
        type="button"
        className="floating-tea-pet__launcher"
        aria-label={open ? '收起茶宠小茉' : '打开茶宠小茉'}
        aria-expanded={open}
        aria-controls={actionsId}
        onClick={toggle}
      >
        <span className="floating-tea-pet__figure" aria-hidden="true">
          <TeaPetPortrait full pose={pose} motion={reaction} revision={revision} preloadReactions={open} className="size-full" />
          {open && <TeaPetAtmosphere reaction={reaction} revision={revision} pose={pose} />}
        </span>
        <span className="floating-tea-pet__label" aria-hidden="true">
          {open ? <ChevronDown className="size-3.5" /> : <MessageCircle className="size-3.5" />}
          {open ? '收起' : '小茉'}
        </span>
      </button>
      <div className="floating-tea-pet__actions" id={actionsId} role="group" aria-label="小茉的动作" inert={!open}>
        {actions.map(({ id, label, Icon }, index) => <button
          key={id}
          type="button"
          className="floating-tea-pet__action"
          style={{ '--action-index': index } as CSSProperties}
          aria-pressed={id === 'chatter' ? chatter : undefined}
          onClick={() => act(id)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>)}
      </div>
      <p className="floating-tea-pet__line" aria-live="polite" aria-atomic="true" aria-hidden={!open}>{open ? line : ''}</p>
    </div>
  </aside>;
}
