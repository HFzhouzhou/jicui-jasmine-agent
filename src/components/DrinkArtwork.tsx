import { useId } from 'react';
import { cn } from '@/lib/utils';
import { OFFICIAL_IMAGES } from '@/data/officialImages';

type Props = { category: string; name?: string; className?: string };
/** Preserve official screenshot pixels; use a category illustration only when no source exists. */
export default function DrinkArtwork({ category, name, className }: Props) {
  const uid = useId().replace(/:/g, '');
  const official = name ? OFFICIAL_IMAGES[name] : undefined;
  if (official) {
    const { crop } = official;
    return <div className={cn('drink-artwork relative isolate flex items-center justify-center overflow-hidden bg-[#fffef9]', className)} role="img" aria-label={`${name}商品图片，仅供参考`}>
      <svg viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`} className="h-full w-full overflow-hidden" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs><clipPath id={`${uid}-official`}><rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} /></clipPath></defs>
        <image href={official.src} x="0" y="0" width={official.width} height={official.height} clipPath={`url(#${uid}-official)`} />
      </svg>
    </div>;
  }
  const milky = /奶|乳|椰/.test(category);
  const coffee = /咖啡|拿铁/.test(category);
  const fruit = /果|能量/.test(category);
  const matcha = /抹茶/.test(category);
  const iceCream = /冰淇淋|小食/.test(category);
  const color = coffee ? '#825a3c' : matcha ? '#7b8f4c' : milky ? '#d2bb91' : fruit ? '#d8a553' : '#aeb75d';
  const backdrop = coffee ? '#ece2d5' : milky ? '#eee7d9' : fruit ? '#f0e8d5' : '#e6ebd8';
  return <div className={cn('drink-artwork relative isolate flex items-center justify-center overflow-hidden', className)} style={{backgroundColor: backdrop}} role="img" aria-label={`${category}系列意境插画，非实物图片`}>
    <svg viewBox="0 0 360 260" className="h-full w-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-tea`} x1="122" y1="82" x2="224" y2="223" gradientUnits="userSpaceOnUse"><stop stopColor={color} stopOpacity=".5"/><stop offset=".65" stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".8"/></linearGradient>
        <linearGradient id={`${uid}-glass`} x1="120" y1="70" x2="239" y2="209" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity=".75"/><stop offset=".5" stopColor="white" stopOpacity=".04"/><stop offset="1" stopColor="white" stopOpacity=".55"/></linearGradient>
        <radialGradient id={`${uid}-light`}><stop stopColor="#fffef5"/><stop offset="1" stopColor="#fffef5" stopOpacity="0"/></radialGradient>
        <filter id={`${uid}-blur`}><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <circle cx="172" cy="114" r="132" fill={`url(#${uid}-light)`}/>
      <path d="M-12 166 86 39M18 202 144 37M257 266 362 128" stroke="white" strokeOpacity=".14" strokeWidth="36"/>
      <ellipse cx="187" cy="220" rx="71" ry="9" fill="#69754a" opacity=".12" filter={`url(#${uid}-blur)`}/>
      {iceCream ? <g>
        <path d="m139 124 41 99 42-99Z" fill="#c5a878"/><path d="m145 144 40 14 23 9M155 170l38 12M165 195l19 7M154 132l-1 36M181 132l-12 72M207 132l-28 82" stroke="#b89864" strokeWidth="2"/>
        <path d="M135 125c-12-14 0-34 17-38-4-14 8-29 24-29 3-20 23-25 23-25-7 17 8 19 9 31 13 1 21 15 15 25 20 7 20 24 12 36Z" fill="#fdfbed"/><path d="M153 89c19 5 39 5 69 0M161 65c11 6 28 6 47-1M139 116c19 6 54 7 88 0" stroke="#e7e8cc" strokeWidth="4" strokeLinecap="round"/>
      </g> : <g>
        <path d="m125 64 11 138q1 17 44 17t44-17l11-138Z" fill={`url(#${uid}-glass)`} stroke="white" strokeOpacity=".85" strokeWidth="1.8"/>
        <path d="m129 91 10 109q1 13 41 13t41-13l9-109Z" fill={`url(#${uid}-tea)`}/>
        <ellipse cx="180" cy="91" rx="50" ry="11" fill={color} fillOpacity=".68"/>
        {milky || coffee || matcha ? <g><ellipse cx="180" cy="84" rx="51" ry="13" fill="#faf6e7"/><path d="M137 86c26 9 58 9 85 0" stroke="#eee5d1" strokeWidth="2"/></g> : <g fill="#fffdf0" fillOpacity=".42" stroke="white" strokeOpacity=".48" strokeWidth="1.2"><rect x="146" y="77" width="29" height="28" rx="6" transform="rotate(-14 146 77)"/><rect x="181" y="68" width="30" height="30" rx="6" transform="rotate(14 181 68)"/><rect x="165" y="111" width="31" height="29" rx="6" transform="rotate(20 165 111)"/><rect x="191" y="151" width="25" height="25" rx="6" transform="rotate(-13 191 151)"/></g>}
        <ellipse cx="180" cy="64" rx="55" ry="13" fill="white" fillOpacity=".12" stroke="white" strokeOpacity=".9" strokeWidth="2"/>
        <path d="m134 81 10 111" stroke="white" strokeOpacity=".62" strokeWidth="4" strokeLinecap="round"/>
        <path d="m224 111-7 82" stroke="white" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round"/>
        <path d="M147 203c16 7 48 7 65 0" stroke="white" strokeOpacity=".7" strokeWidth="2"/>
        <g fill="white" fillOpacity=".65"><ellipse cx="213" cy="115" rx="1.4" ry="2.5"/><ellipse cx="145" cy="126" rx="1.1" ry="2"/><ellipse cx="209" cy="170" rx="1.1" ry="1.8"/><ellipse cx="153" cy="175" rx="1" ry="1.7"/></g>
      </g>}
      <path d="M68 219c21-9 36-18 57-31" stroke="#718158" strokeWidth="1.5"/>
      <path d="M87 209c-20-3-25-13-20-19 14-3 24 4 20 19M99 204c-3-17 5-26 13-24 7 10 1 20-13 24M112 196c7-12 19-14 25-9-1 10-12 13-25 9" fill="#718158"/>
      <g transform="translate(113 212)" fill="#fffdf4" stroke="#dddcca" strokeWidth=".5">
        <ellipse cy="-8" rx="5.5" ry="10"/><ellipse cy="-8" rx="5.5" ry="10" transform="rotate(72)"/><ellipse cy="-8" rx="5.5" ry="10" transform="rotate(144)"/><ellipse cy="-8" rx="5.5" ry="10" transform="rotate(216)"/><ellipse cy="-8" rx="5.5" ry="10" transform="rotate(288)"/><circle r="3" fill="#c7b478" stroke="none"/>
      </g>
      <g transform="translate(251 213) rotate(25)" fill="#fffdf4"><ellipse cy="-5" rx="3" ry="6"/><ellipse cy="-5" rx="3" ry="6" transform="rotate(72)"/><ellipse cy="-5" rx="3" ry="6" transform="rotate(144)"/><ellipse cy="-5" rx="3" ry="6" transform="rotate(216)"/><ellipse cy="-5" rx="3" ry="6" transform="rotate(288)"/><circle r="2" fill="#c7b478"/></g>
    </svg>
  </div>;
}
