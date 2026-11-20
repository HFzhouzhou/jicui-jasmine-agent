import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { ChevronDown, Cookie, CupSoda, Hand, HandHeart, Leaf, MessageCircle } from 'lucide-react';
import TeaPetPortrait from '@/components/TeaPetPortrait';
import TeaPetAtmosphere from './TeaPetAtmosphere';
import { useTeaPetReactions } from './tea-pet-reactions';
import { useFloatingTeaPetPosition } from './useFloatingTeaPetPosition';
import './floating-tea-pet.css';

const actions = [
  { id: 'welcome', label: '挥手', Icon: HandHeart },
  { id: 'pat', label: '摸摸头', Icon: Hand },
  { id: 'feed', label: '喂小料', Icon: Cookie },
  { id: 'offer', label: '奉茶', Icon: CupSoda },
  { id: 'quiet', label: '陪坐', Icon: Leaf },
  { id: 'chatter', label: '碎碎念', Icon: MessageCircle },
] as const;

export default function FloatingTeaPet({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const actionsId = useId();
  const close = useCallback(() => setOpen(false), []);
  const inChat = /^\/ai-recommend\/?$/i.test(pathname);
  const { pose, reaction, revision, line, chatter, act } = useTeaPetReactions(open);

  useEffect(close, [pathname, close]);
  const { dragEvents, suppressClick } = useFloatingTeaPetPosition(anchor, dock, inChat, close);
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

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail > 0 && suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (open) {
      close();
    } else {
      act('welcome');
      setOpen(true);
    }
  }

  return <aside ref={anchor} className="floating-tea-pet" data-open={open ? '' : undefined} aria-label="互动茶宠">
    <div ref={dock} className="floating-tea-pet__dock">
      <button
        ref={launcher}
        type="button"
        className="floating-tea-pet__launcher"
        aria-label={open ? '收起茶宠小茉' : '打开茶宠小茉'}
        aria-expanded={open}
        aria-controls={actionsId}
        title="长按拖动小茉"
        onClick={toggle}
        onContextMenu={(event) => event.preventDefault()}
        {...dragEvents}
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
