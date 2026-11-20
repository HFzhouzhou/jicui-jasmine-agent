import { useLayoutEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { readStoredJson, writeStoredJson } from '@/lib/storage';

type Point = { x: number; y: number };
type Press = {
  id: number;
  start: Point;
  grab: Point;
  timer: number;
  moved: boolean;
  dragging: boolean;
};

const positionKey = 'jicui:tea-pet-position';
const holdDuration = 380;
const clamp = (value: number, limit: number) => Math.max(0, Math.min(value, limit));

function isPosition(value: unknown): value is Point {
  if (!value || typeof value !== 'object') return false;
  const { x, y } = value as Partial<Point>;
  return typeof x === 'number' && x >= 0 && x <= 1 && typeof y === 'number' && y >= 0 && y <= 1;
}

export function useFloatingTeaPetPosition(
  anchor: RefObject<HTMLElement | null>,
  dock: RefObject<HTMLDivElement | null>,
  inChat: boolean,
  close: () => void,
) {
  const preferred = useRef<Point | null>(null);
  const loaded = useRef(false);
  const place = useRef<(target?: Point) => void>(() => {});
  const press = useRef<Press | null>(null);
  const suppressClick = useRef(false);

  useLayoutEffect(() => {
    const area = anchor.current;
    const pet = dock.current;
    if (!area || !pet) return;
    if (!loaded.current) {
      preferred.current = readStoredJson<Point | null>(positionKey, null, isPosition);
      loaded.current = true;
    }

    let composer: HTMLElement | null = null;
    let frame = 0;
    let active = true;

    function schedule() {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place.current());
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(area);
    resizeObserver?.observe(pet);
    const shell = area.closest('.app-shell');
    const header = shell?.querySelector(':scope > header, :scope > .app-safe-top');
    if (header) resizeObserver?.observe(header);
    const page = inChat ? shell?.querySelector('main') : null;
    const routeObserver = page ? new MutationObserver(schedule) : null;
    if (page) {
      resizeObserver?.observe(page);
      routeObserver?.observe(page, { childList: true, subtree: true });
    }

    place.current = (target) => {
      const nextComposer = inChat ? document.getElementById('tea-chat-composer') : null;
      if (nextComposer !== composer) {
        if (composer) resizeObserver?.unobserve(composer);
        composer = nextComposer;
        if (composer) resizeObserver?.observe(composer);
      }

      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      area.style.setProperty('--pet-header-clearance', `${headerBottom > 0 ? Math.ceil(headerBottom + 6) : 0}px`);
      const bounds = area.getBoundingClientRect();
      const width = pet.offsetWidth;
      const height = pet.offsetHeight;
      const maxX = Math.max(0, bounds.width - width);
      const maxY = Math.max(0, bounds.height - height);
      const saved = preferred.current ?? { x: 1, y: 1 };
      let x = clamp(target ? target.x - bounds.left : saved.x * maxX, maxX);
      let y = clamp(target ? target.y - bounds.top : saved.y * maxY, maxY);
      let obscured = false;
      const field = composer?.getBoundingClientRect();
      const gap = 12;
      if (field?.width && field.height && field.right + gap > bounds.left + x && field.left - gap < bounds.left + x + width
          && field.top - gap < bounds.top + y + height && field.bottom + gap > bounds.top + y) {
        const above = Math.floor(field.top - bounds.top - gap - height);
        const below = Math.ceil(field.bottom - bounds.top + gap);
        const left = Math.floor(field.left - bounds.left - gap - width);
        const right = Math.ceil(field.right - bounds.left + gap);
        if (above >= 0) y = above;
        else if (below <= maxY) y = below;
        else if (left >= 0) x = left;
        else if (right <= maxX) x = right;
        else obscured = true;
      }

      if (target && !obscured) preferred.current = { x: maxX ? x / maxX : saved.x, y: maxY ? y / maxY : saved.y };
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const buttonWidth = pet.querySelector<HTMLElement>('.floating-tea-pet__action')?.offsetWidth ?? 5.1 * rem;
      const sideWidth = buttonWidth * 2 + 1.5 * rem;
      const spaceRight = maxX - x;
      const spaceBelow = maxY - y;
      const menu = Math.max(x, spaceRight) >= sideWidth
        ? x >= spaceRight ? 'left' : 'right'
        : y >= spaceBelow ? 'above' : 'below';
      const panelWidth = Math.min(bounds.width, 3 * buttonWidth + .8 * rem);
      const lineWidth = Math.min(bounds.width, 14 * rem);
      const center = x + width / 2;
      const centerOffset = (size: number) => clamp(center - size / 2, bounds.width - size) + size / 2 - center;

      pet.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      pet.style.setProperty('--pet-menu-offset', `${centerOffset(panelWidth)}px`);
      pet.style.setProperty('--pet-line-offset', `${centerOffset(lineWidth)}px`);
      pet.style.setProperty('--pet-line-width', `${lineWidth}px`);
      pet.style.setProperty('--pet-action-drop', `${Math.max(0, 10 * rem - y - height)}px`);
      area.dataset.menu = menu;
      const lineFitsBelow = spaceBelow >= 4 * rem;
      const lineFitsAbove = y >= 4 * rem;
      area.dataset.lineSide = (menu === 'above' && lineFitsBelow) || (!lineFitsAbove && lineFitsBelow) ? 'below' : 'above';
      area.toggleAttribute('data-obscured', obscured);
      if (obscured) close();
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    void document.fonts?.ready.then(schedule);
    place.current();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      routeObserver?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      if (press.current) window.clearTimeout(press.current.timer);
      press.current = null;
      area.removeAttribute('data-dragging');
    };
  }, [anchor, dock, inChat, close]);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || press.current) return;
    const button = event.currentTarget;
    const { left, top } = button.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    suppressClick.current = false;
    button.setPointerCapture(event.pointerId);
    const next: Press = {
      id: event.pointerId,
      start,
      grab: { x: start.x - left, y: start.y - top },
      moved: false,
      dragging: false,
      timer: window.setTimeout(() => {
        next.dragging = true;
        suppressClick.current = true;
        anchor.current?.setAttribute('data-dragging', '');
        close();
      }, holdDuration),
    };
    press.current = next;
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = press.current;
    if (!current || event.pointerId !== current.id) return;
    if (current.dragging) {
      if (!current.moved && event.clientX === current.start.x && event.clientY === current.start.y) return;
      current.moved = true;
      place.current({ x: event.clientX - current.grab.x, y: event.clientY - current.grab.y });
    } else if (!current.moved && Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) > 8) {
      current.moved = true;
      suppressClick.current = true;
      window.clearTimeout(current.timer);
    }
  }

  function finishPress(event: PointerEvent<HTMLButtonElement>) {
    const current = press.current;
    if (!current || event.pointerId !== current.id) return;
    if (current.dragging && event.type === 'pointerup') {
      onPointerMove(event);
      if (current.moved && preferred.current) writeStoredJson(positionKey, preferred.current);
    }
    window.clearTimeout(current.timer);
    press.current = null;
    anchor.current?.removeAttribute('data-dragging');
  }

  return {
    suppressClick,
    dragEvents: { onPointerDown, onPointerMove, onPointerUp: finishPress, onPointerCancel: finishPress, onLostPointerCapture: finishPress },
  };
}
