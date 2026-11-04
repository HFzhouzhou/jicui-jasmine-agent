import { useEffect, useState } from 'react';
import { Check, LoaderCircle, Percent, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PromotionRule } from '@shared/contracts';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';

const field = 'h-10 w-full rounded-xl border border-line bg-paper px-3 text-[14px] text-ink outline-none focus:border-leaf';
const newId = (type: PromotionRule['type']) => `${type === 'second_half' ? 'pair' : 'spend'}-${Math.random().toString(36).slice(2, 8)}`;

/** Store promotions the bundle planner and order quotes may apply. Only enabled rules count. */
export function PromotionsEditor({ token }: { token: string }) {
  const [rules, setRules] = useState<PromotionRule[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ rules: PromotionRule[] }>('/api/admin/promotions', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }, 15000)
      .then((value) => setRules(value.rules)).catch((cause) => { if (!controller.signal.aborted) toast.error(cause instanceof Error ? cause.message : '读取失败'); });
    return () => controller.abort();
  }, [token]);
  const update = (index: number, patch: Partial<PromotionRule>) => { setRules((current) => current!.map((rule, position) => position === index ? { ...rule, ...patch } : rule)); setDirty(true); };
  async function save() {
    if (!rules) return;
    for (const rule of rules) {
      if (!rule.title.trim()) { toast.error('每条优惠都需要名称'); return; }
      if (rule.type === 'threshold' && !(rule.off! > 0 && rule.off! < rule.threshold!)) { toast.error(`「${rule.title}」的立减金额需大于 0 且小于门槛`); return; }
      if (rule.type === 'second_half' && !(rule.rate! >= 0 && rule.rate! < 1)) { toast.error(`「${rule.title}」的折扣需在 0–0.99 之间`); return; }
    }
    setSaving(true);
    try {
      const value = await apiRequest<{ rules: PromotionRule[] }>('/api/admin/promotions', { method: 'PUT', headers, body: JSON.stringify({ rules: rules.map((rule) => ({ ...rule, title: rule.title.trim(), note: rule.note.trim() })) }) }, 15000);
      setRules(value.rules); setDirty(false); toast.success('优惠规则已保存，下一次配单和下单即生效');
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '保存失败'); }
    finally { setSaving(false); }
  }
  if (!rules) return <div className="flex min-h-48 items-center justify-center gap-2 text-stone"><LoaderCircle className="size-5 animate-spin text-leaf" />读取优惠规则…</div>;
  return <div className="space-y-5">
    <p className="max-w-3xl text-[13.5px] leading-6 text-stone">启用的规则会被「套餐随心配」自动比较，选出对顾客最划算的一条；下单核价时服务器会再算一次。请只启用门店真实执行的活动。每单只套用一条优惠。</p>
    <div className="grid gap-4 md:grid-cols-2">{rules.map((rule, index) => <article key={rule.id} className={cn('rounded-[24px] bg-cream p-5 ring-1 transition-colors', rule.enabled ? 'ring-jade/40' : 'ring-line')}>
      <div className="flex items-center gap-3">
        <span className={cn('flex size-10 items-center justify-center rounded-2xl', rule.type === 'second_half' ? 'bg-honey/70 text-[#6b4c12]' : 'bg-mist text-jade')}>{rule.type === 'second_half' ? <Percent className="size-5" /> : <TicketPercent className="size-5" />}</span>
        <input value={rule.title} onChange={(event) => update(index, { title: event.target.value.slice(0, 30) })} className="min-w-0 flex-1 bg-transparent font-serif text-[19px] font-semibold text-ink outline-none" aria-label="优惠名称" />
        <button type="button" role="switch" aria-checked={rule.enabled} aria-label={rule.enabled ? '停用' : '启用'} onClick={() => update(index, { enabled: !rule.enabled })} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', rule.enabled ? 'bg-jade' : 'bg-line')}><span className={cn('absolute top-1 size-5 rounded-full bg-cream shadow transition-all', rule.enabled ? 'left-6' : 'left-1')} /></button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {rule.type === 'second_half'
          ? <label className="col-span-2 space-y-1 text-[12.5px] text-stone">每两杯中较便宜一杯按 × 折扣计价<input className={field} inputMode="decimal" value={rule.rate ?? ''} onChange={(event) => update(index, { rate: Number(event.target.value) || 0 })} /><span className="block text-[12px]">0.5 = 第二杯半价</span></label>
          : <><label className="space-y-1 text-[12.5px] text-stone">满（元）<input className={field} inputMode="decimal" value={rule.threshold ?? ''} onChange={(event) => update(index, { threshold: Number(event.target.value) || 0 })} /></label><label className="space-y-1 text-[12.5px] text-stone">减（元）<input className={field} inputMode="decimal" value={rule.off ?? ''} onChange={(event) => update(index, { off: Number(event.target.value) || 0 })} /></label></>}
        <label className="col-span-2 space-y-1 text-[12.5px] text-stone">内部备注<input className={field} value={rule.note} maxLength={200} onChange={(event) => update(index, { note: event.target.value })} /></label>
      </div>
      <button type="button" onClick={() => { setRules(rules.filter((_, position) => position !== index)); setDirty(true); }} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-stone hover:text-[#a2552e]"><Trash2 className="size-3.5" />删除这条</button>
    </article>)}</div>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={rules.length >= 10} onClick={() => { setRules([...rules, { id: newId('second_half'), type: 'second_half', title: '第二杯半价', enabled: false, rate: 0.5, note: '' }]); setDirty(true); }} className="btn-ghost h-11"><Plus className="size-4" />第二杯折扣</button>
      <button type="button" disabled={rules.length >= 10} onClick={() => { setRules([...rules, { id: newId('threshold'), type: 'threshold', title: '满 30 减 5', enabled: false, threshold: 30, off: 5, note: '' }]); setDirty(true); }} className="btn-ghost h-11"><Plus className="size-4" />满减</button>
      <button type="button" disabled={!dirty || saving} onClick={() => void save()} className="btn-jade ml-auto h-11 px-6">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}保存优惠规则</button>
    </div>
  </div>;
}
