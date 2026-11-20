export type TeaPetPose = 'welcome' | 'serve' | 'playful' | 'quiet';
export type TeaPetMotion = 'welcome' | 'pat' | 'poke' | 'feed' | 'quiet' | 'chatter' | 'think' | 'offer' | 'celebrate';

const PORTRAIT_SIZE = 960;
const IMAGE_DIR = '/images/xiaomo';

interface Eye {
  x: number;
  y: number;
  slope: number;
}

// Coordinates are on the 960 × 960 portraits, with the slope following the eyelashes.
const eyes: Record<TeaPetPose, Eye[]> = {
  welcome: [{ x: 421, y: 337, slope: -.28 }, { x: 531, y: 302, slope: -.44 }],
  serve: [{ x: 419, y: 333, slope: -.15 }, { x: 540, y: 312, slope: -.35 }],
  playful: [{ x: 523, y: 307, slope: -.52 }],
  quiet: [],
};

interface GestureArt {
  base: string;
  moving: string;
  pivot: readonly [number, number];
}

// Both images share the original canvas. Only the wrist or the cup-and-hands
// cutout is transformed, around a pivot measured inside that cutout.
const gestureArt: Partial<Record<TeaPetPose, GestureArt>> = {
  welcome: { base: 'welcome-wave-base', moving: 'welcome-wave-hand', pivot: [307, 470] },
  serve: { base: 'serve-cup-base', moving: 'serve-cup-hands', pivot: [488, 594] },
};

interface Eyelid {
  x: number;
  y: number;
  frames: HTMLCanvasElement[];
}

interface Portrait {
  base: HTMLImageElement;
  eyelids: Eyelid[];
  part?: {
    image: HTMLImageElement;
    pivot: GestureArt['pivot'];
  };
}

export function portraitSource(pose: TeaPetPose, full = true) {
  return `${IMAGE_DIR}/${pose}${full ? '' : '-avatar'}.webp`;
}

function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => image, () => null);
}

function gestureImage(name: string) {
  return loadImage(`${IMAGE_DIR}/${name}.webp`);
}

function makeEyelid(source: HTMLImageElement, eye: Eye): Eyelid {
  const radiusX = 30;
  const radiusY = 25;
  const innerWidth = 16;
  const lid = 9;
  const x = eye.x - radiusX;
  const y = eye.y - radiusY - Math.ceil(Math.abs(eye.slope) * radiusX);
  const width = radiusX * 2 + 1;
  const height = (eye.y - y) * 2 + 1;
  const crop = document.createElement('canvas');
  crop.width = width;
  crop.height = height;
  const context = crop.getContext('2d', { willReadFrequently: true });
  if (!context) return { x, y, frames: [] };
  context.drawImage(source, x, y, width, height, 0, 0, width, height);
  const original = context.getImageData(0, 0, width, height);

  // Prepare small eyelid patches once. Pixels outside the lids are never sampled
  // from another part of the face, and the patches leave all other layers untouched.
  const frames = [.38, .70, .92, 1].map(amount => {
    const frame = document.createElement('canvas');
    frame.width = width;
    frame.height = height;
    const pixels = new ImageData(width, height);
    pixels.data.set(original.data);
    for (let px = 0; px < width; px++) {
      const dx = px - radiusX;
      const edge = Math.max(0, (Math.abs(dx) - innerWidth) / (radiusX - innerWidth));
      const weight = (1 - edge * edge * (3 - 2 * edge)) * amount;
      const narrowed = lid * (1 - .90 * weight);
      const lash = eye.y - y + dx * eye.slope;
      for (let py = 0; py < height; py++) {
        const dy = py - lash;
        const distance = Math.abs(dy);
        if (distance >= radiusY || weight === 0) continue;
        const sourceDistance = distance <= narrowed
          ? distance * lid / narrowed
          : lid + (distance - narrowed) * (radiusY - lid) / (radiusY - narrowed);
        const row = lash + Math.sign(dy) * sourceDistance;
        const lower = Math.floor(row);
        const fraction = row - lower;
        const target = (py * width + px) * 4;
        const first = (lower * width + px) * 4;
        const second = first + width * 4;
        for (let channel = 0; channel < 3; channel++) {
          pixels.data[target + channel] = original.data[first + channel] * (1 - fraction) + original.data[second + channel] * fraction;
        }
      }
    }
    frame.getContext('2d')?.putImageData(pixels, 0, 0);
    return frame;
  });
  return { x, y, frames };
}

async function loadPortrait(pose: TeaPetPose): Promise<Portrait | null> {
  const gesture = gestureArt[pose];
  const [base, moving] = gesture
    ? await Promise.all([gestureImage(gesture.base), gestureImage(gesture.moving)])
    : [null, null];
  if (gesture && base && moving) {
    return {
      base,
      eyelids: eyes[pose].map(eye => makeEyelid(base, eye)),
      part: { image: moving, pivot: gesture.pivot },
    };
  }
  const fallback = await loadImage(portraitSource(pose));
  if (!fallback) return null;
  return { base: fallback, eyelids: eyes[pose].map(eye => makeEyelid(fallback, eye)) };
}

function pulse(time: number, start: number, duration: number) {
  const progress = (time - start) / duration;
  return progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) : 0;
}

function blinkAt(time: number, start: number, duration = .23) {
  return Math.pow(pulse(time, start, duration), 1.25);
}

function movement(motion: TeaPetMotion, time: number) {
  let angle = 0;
  let cupLift = 0;
  let cupScale = 1;
  let hop = 0;
  let blink = 0;

  switch (motion) {
    case 'welcome': {
      const greeting = time % 9.4;
      angle = (-.117 + .11 * Math.sin(greeting * 12.8)) * pulse(greeting, .08, 2.1);
      blink = Math.max(blinkAt(greeting, 3.1), blinkAt(greeting, 6.4));
      break;
    }
    case 'pat':
      blink = Math.max(blinkAt(time, .09, .54), blinkAt(time % 4.8, 2.8));
      break;
    case 'poke':
      blink = Math.max(blinkAt(time, .02, .2), blinkAt(time, .31, .23), blinkAt(time % 4.8, 2.8));
      break;
    case 'feed': {
      const sip = pulse(time, .03, 1.56);
      cupLift = 21 * sip;
      blink = blinkAt(time % 4.8, 2.4);
      break;
    }
    case 'offer': {
      const serving = pulse(time, .05, 1.8);
      cupLift = 15 * serving;
      cupScale += .067 * serving;
      blink = blinkAt(time % 4.8, 2.55);
      break;
    }
    case 'think':
      blink = blinkAt(time % 3.9, 1.33, .30);
      break;
    case 'chatter':
      blink = Math.max(blinkAt(time, .12, .44), blinkAt(time % 5, 2.6));
      break;
    case 'celebrate':
      hop = 21 * (pulse(time, .04, .39) + .63 * pulse(time, .48, .37));
      blink = blinkAt(time % 4.6, 1.76);
      break;
    case 'quiet':
      break;
  }
  return { angle, cupLift, cupScale, hop, eyelid: Math.round(blink * 4) };
}

export function createTeaPetRenderer(canvas: HTMLCanvasElement, onDraw: () => void) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const paint: CanvasRenderingContext2D = context;
  const portraits = new Map<TeaPetPose, Promise<Portrait | null>>();
  let current: Portrait | null = null;
  let motion: TeaPetMotion = 'welcome';
  let disposed = false;
  let playing = false;
  let request = 0;
  let pending = 0;
  let time = 0;
  let previousFrame = 0;
  let lastFrame = '';

  function portraitFor(pose: TeaPetPose) {
    const ready = portraits.get(pose);
    if (ready) return ready;
    const loading = loadPortrait(pose);
    portraits.set(pose, loading);
    return loading;
  }

  function draw() {
    if (!current) return;
    const dimension = Math.min(canvas.clientWidth, canvas.clientHeight);
    const size = Math.min(PORTRAIT_SIZE, Math.max(96, Math.round(dimension * Math.min(devicePixelRatio, 2))));
    const { angle, cupLift, cupScale, hop, eyelid } = movement(motion, time);
    const frame = `${size}/${angle}/${cupLift}/${cupScale}/${hop}/${eyelid}`;
    if (lastFrame === frame) return;
    lastFrame = frame;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const scale = size / PORTRAIT_SIZE;
    paint.setTransform(scale, 0, 0, scale, 0, 0);
    paint.clearRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);

    // A celebration can move the whole sculpture as a rigid object. Each
    // other transform belongs to its own cutout, away from the base portrait.
    paint.translate(0, -hop);
    paint.drawImage(current.base, 0, 0);
    if (current.part) {
      const { image, pivot: [pivotX, pivotY] } = current.part;
      paint.save();
      paint.translate(pivotX, pivotY - cupLift);
      paint.rotate(angle);
      paint.scale(cupScale, cupScale);
      paint.drawImage(image, -pivotX, -pivotY);
      paint.restore();
    }
    if (eyelid) {
      for (const { x, y, frames } of current.eyelids) {
        const closed = frames[eyelid - 1];
        if (closed) paint.drawImage(closed, x, y);
      }
    }
  }

  function animate(now: number) {
    if (!playing) return;
    request = requestAnimationFrame(animate);
    const elapsed = (now - previousFrame) / 1000;
    if (elapsed < 1 / 42) return;
    previousFrame = now;
    time += Math.min(elapsed, .066);
    draw();
  }

  function play(active: boolean) {
    if (active === playing) return;
    playing = active;
    cancelAnimationFrame(request);
    if (active) {
      previousFrame = performance.now();
      request = requestAnimationFrame(animate);
    }
  }

  return {
    async show(pose: TeaPetPose, nextMotion: TeaPetMotion) {
      const seq = ++pending;
      const loaded = await portraitFor(pose);
      if (!loaded || disposed || seq !== pending) return;
      current = loaded;
      motion = nextMotion;
      time = 0;
      lastFrame = '';
      draw();
      onDraw();
    },
    warm(poses: TeaPetPose[]) {
      for (const pose of poses) void portraitFor(pose);
    },
    play,
    dispose() {
      play(false);
      disposed = true;
      portraits.clear();
    },
  };
}
