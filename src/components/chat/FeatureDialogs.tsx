import { useState } from 'react';
import { CloudDrizzle, CloudRain, CloudSun, Gift, PartyPopper, Shuffle, Snowflake, Sun, Sunrise, Target, ThermometerSun, Users, Wind, type LucideIcon } from 'lucide-react';
import type { RecommendAction } from '@shared/contracts';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { sheetDialogClass } from '@/lib/chat-extras';

/** Mood keys must match the server's MOODS table. */
export const MOODS: { key: string; line: string; icon: LucideIcon; tint: string }[] = [
  { key: '刚刚苏醒', line: '先让茶香把我叫醒', icon: Sunrise, tint: 'bg-[#fbeccb] text-[#8a5a12]' },
  { key: '有点丧', line: '想要一杯温柔的', icon: CloudDrizzle, tint: 'bg-[#e4e9f1] text-[#3f5576]' },
  { key: '奖励自己', line: '今天值得好一点', icon: Gift, tint: 'bg-[#f7e3dc] text-[#9a4a33]' },
  { key: '需要专注', line: '干净利落，陪我做事', icon: Target, tint: 'bg-mist text-jade' },
  { key: '想要清爽', line: '把闷热都散开', icon: Wind, tint: 'bg-[#dff0ec] text-[#2c6b5e]' },
  { key: '分享时刻', line: '和朋友一起喝', icon: PartyPopper, tint: 'bg-[#efe4f3] text-[#6b4579]' },
  { key: '随便来一杯', line: '交给缘分', icon: Shuffle, tint: 'bg-honey/70 text-[#6b4c12]' },
];
const WEATHER: { label: string; icon: LucideIcon }[] = [
  { label: '晴天', icon: Sun }, { label: '多云', icon: CloudSun }, { label: '下雨', icon: CloudRain }, { label: '闷热', icon: ThermometerSun }, { label: '降温', icon: Snowflake },
];

export function MoodPickerDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (open: boolean) => void; onPick: (action: Extract<RecommendAction, { type: 'blindbox' }>) => void }) {
  const [mood, setMood] = useState('');
  const [weather, setWeather] = useState('');
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={sheetDialogClass}>
      <div className="shrink-0 px-6 pb-3 pt-7 sm:px-7">
        <p className="eyebrow flex items-center gap-1.5"><Gift className="size-3.5" />情绪盲盒</p>
        <DialogTitle className="mt-2 font-serif text-[26px] font-semibold text-ink">此刻的你，是哪一种？</DialogTitle>
        <DialogDescription className="mt-1 text-[14px] text-stone">按心情、时段和门店热度，从可选茶单里抽一杯，附一句专属寄语。</DialogDescription>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 sm:px-7">
        <div className="grid grid-cols-2 gap-2.5">
          {MOODS.map(({ key, line, icon: Icon, tint }) => <button key={key} type="button" onClick={() => setMood(key)} aria-pressed={mood === key}
            className={cn('flex items-center gap-3 rounded-[20px] border bg-cream p-3 text-left transition-all', key === '随便来一杯' && 'col-span-2', mood === key ? 'border-jade ring-2 ring-jade/15' : 'border-line hover:border-sage')}>
            <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', tint)}><Icon className="size-5" /></span>
            <span className="min-w-0"><span className="block font-serif text-[16px] font-semibold text-ink">{key}</span><span className="block truncate text-[12px] text-stone">{line}</span></span>
          </button>)}
        </div>
        <p className="mt-5 text-[13px] font-medium text-ink">今天的天气（可选）</p>
        <div className="mt-2 flex flex-wrap gap-2">{WEATHER.map(({ label, icon: Icon }) => <button key={label} type="button" aria-pressed={weather === label} onClick={() => setWeather(weather === label ? '' : label)} className={cn('chip', weather === label && '!border-jade !bg-jade !text-cream')}><Icon className="size-3.5" />{label}</button>)}</div>
      </div>
      <div className="shrink-0 border-t border-line bg-cream px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
        <button type="button" disabled={!mood} onClick={() => { onPick({ type: 'blindbox', mood, ...(weather ? { weather } : {}) }); onOpenChange(false); }} className="btn-jade h-12 w-full"><Gift className="size-4" />{mood ? `拆开「${mood}」盲盒` : '先选一种心情'}</button>
      </div>
    </DialogContent>
  </Dialog>;
}

const TASTES = ['清爽', '浓郁', '果香', '茶香', '咖啡', '随意'];
const BUDGETS: (number | null)[] = [null, 30, 40, 50];

export function BundleComposerDialog({ open, onOpenChange, onCompose }: { open: boolean; onOpenChange: (open: boolean) => void; onCompose: (action: Extract<RecommendAction, { type: 'bundle' }>) => void }) {
  const [people, setPeople] = useState(2);
  const [tastes, setTastes] = useState<string[]>(['清爽', '浓郁', '随意']);
  const [budget, setBudget] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const totalBudget = custom.trim() ? Number(custom) : budget;
  const validBudget = totalBudget === null || (Number.isFinite(totalBudget) && totalBudget > 0 && totalBudget <= 1000);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={sheetDialogClass}>
      <div className="shrink-0 px-6 pb-3 pt-7 sm:px-7">
        <p className="eyebrow flex items-center gap-1.5"><Users className="size-3.5" />套餐随心配</p>
        <DialogTitle className="mt-2 font-serif text-[26px] font-semibold text-ink">几个人喝？各自想要什么？</DialogTitle>
        <DialogDescription className="mt-1 text-[14px] text-stone">我会在预算内为每个人挑一杯，并自动套用门店已启用的最优优惠。</DialogDescription>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-2 sm:px-7">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-mist p-1">{[2, 3].map((value) => <button key={value} type="button" aria-pressed={people === value} onClick={() => setPeople(value)} className={cn('h-11 rounded-full text-[15px] transition-colors', people === value ? 'bg-cream font-semibold text-jade shadow-sm' : 'text-stone')}>{value} 个人</button>)}</div>
        <div className="space-y-3">{Array.from({ length: people }, (_, index) => <div key={index}>
          <p className="mb-1.5 text-[13px] font-medium text-ink">第 {index + 1} 位</p>
          <div className="flex flex-wrap gap-1.5">{TASTES.map((taste) => <button key={taste} type="button" aria-pressed={tastes[index] === taste} onClick={() => setTastes((current) => current.map((value, position) => position === index ? taste : value))} className={cn('chip !py-1.5', tastes[index] === taste && '!border-jade !bg-jade !text-cream')}>{taste}</button>)}</div>
        </div>)}</div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">总预算</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {BUDGETS.map((value) => <button key={String(value)} type="button" aria-pressed={!custom && budget === value} onClick={() => { setBudget(value); setCustom(''); }} className={cn('chip !py-1.5', !custom && budget === value && '!border-jade !bg-jade !text-cream')}>{value === null ? '不限' : `¥${value} 以内`}</button>)}
            <label className="flex items-center gap-1 rounded-full border border-line bg-cream pl-3 pr-1 text-[13px] text-stone focus-within:border-leaf">¥<input inputMode="decimal" value={custom} onChange={(event) => setCustom(event.target.value.replace(/[^\d.]/g, '').slice(0, 6))} placeholder="自定义" className="h-9 w-20 bg-transparent text-ink outline-none" aria-label="自定义总预算" /></label>
          </div>
          {!validBudget && <p className="mt-1.5 text-[12px] text-[#a2552e]">请填写 1–1000 元之间的金额。</p>}
        </div>
      </div>
      <div className="shrink-0 border-t border-line bg-cream px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
        <button type="button" disabled={!validBudget} onClick={() => { onCompose({ type: 'bundle', people, totalBudget: totalBudget ?? null, tastes: tastes.slice(0, people) }); onOpenChange(false); }} className="btn-jade h-12 w-full"><Users className="size-4" />帮我们配 {people} 杯</button>
      </div>
    </DialogContent>
  </Dialog>;
}
