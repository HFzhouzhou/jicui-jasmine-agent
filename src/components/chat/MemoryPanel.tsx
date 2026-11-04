import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Check, LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TasteMemory } from '@shared/contracts';
import { cn } from '@/lib/utils';
import { memoryLines } from '@/lib/chat-extras';
import { useTasteMemory } from '@/hooks/useTasteMemory';

const SWEETNESS = ['无糖', '三分糖', '五分糖', '七分糖', '全糖'];
const TEMPERATURE = ['热饮', '温饮', '常温', '去冰', '少冰', '正常冰'];
const list = (value: string) => [...new Set(value.split(/[,，、\s]+/).map((item) => item.trim()).filter(Boolean))].slice(0, 8);
const field = 'h-11 w-full rounded-xl border border-line bg-cream px-3 text-[14px] text-ink outline-none focus:border-leaf';

export function MemoryChips({ memory, className }: { memory: TasteMemory; className?: string }) {
  const lines = memoryLines(memory);
  if (!lines.length) return null;
  return <ul className={cn('flex flex-wrap gap-1.5', className)}>{lines.map((line) => <li key={line.label} className={cn('rounded-full px-2.5 py-1 text-[12.5px]', line.tone === 'strict' ? 'bg-[#f6e1d6] text-[#8a3f22]' : line.tone === 'soft' ? 'bg-honey/55 text-[#6b4c12]' : 'bg-mist text-jade')}><span className="opacity-70">{line.label}</span> {line.value}</li>)}</ul>;
}

/** "我记得你": view in the chat side panel, full editing on the orders page. */
export default function MemoryPanel({ editable = false, onAsk }: { editable?: boolean; onAsk?: (message: string) => void }) {
  const { memory, error, save, clear } = useTasteMemory();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState({ sweetness: '', temperature: '', toppings: '', skipToppings: '', avoid: '', allergies: '', budget: '' });
  const lines = memory ? memoryLines(memory) : [];

  function startEdit() {
    const value = memory || {};
    setDraft({ sweetness: value.sweetness || '', temperature: value.temperature || '', toppings: value.toppings?.join('、') || '', skipToppings: value.skipToppings?.join('、') || '', avoid: value.avoid?.join('、') || '', allergies: value.allergies?.join('、') || '', budget: value.budget ? String(value.budget) : '' });
    setEditing(true);
  }
  async function submit() {
    const budget = draft.budget.trim() ? Number(draft.budget) : null;
    if (budget !== null && (!Number.isFinite(budget) || budget <= 0 || budget > 1000)) { toast.error('预算请填写 1–1000 元'); return; }
    setPending(true);
    try {
      await save({ ...(memory?.likes ? { likes: memory.likes } : {}), sweetness: draft.sweetness || undefined, temperature: draft.temperature || undefined, toppings: list(draft.toppings), skipToppings: list(draft.skipToppings), avoid: list(draft.avoid), allergies: list(draft.allergies), budget });
      setEditing(false); toast.success('口味记忆已更新');
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '保存失败'); }
    finally { setPending(false); }
  }
  async function forget() {
    setPending(true);
    try { await clear(); setEditing(false); toast.success('已忘掉你的口味记忆'); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : '操作失败'); }
    finally { setPending(false); }
  }

  return <section id="memory" className="card-soft scroll-mt-24 p-5 sm:p-6" aria-label="口味记忆">
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-honey/70 text-[#6b4c12]"><Brain className="size-5" /></span>
      <div className="min-w-0 flex-1"><h2 className="font-serif text-[19px] font-semibold text-ink">我记得你</h2><p className="text-[12.5px] text-stone">跨次记住的口味习惯，当下说的要求优先</p></div>
    </div>
    {error && <p className="mt-3 text-[13px] text-[#a2552e]">{error}</p>}
    {!editing && (lines.length ? <MemoryChips memory={memory!} className="mt-4" />
      : <p className="mt-4 rounded-2xl bg-paper px-4 py-3 text-[13.5px] leading-6 text-stone">还没有记住什么。在对话里说<button type="button" disabled={!onAsk} onClick={() => onAsk?.('记住我默认三分糖、少冰，不要珍珠')} className="mx-1 font-medium text-jade underline decoration-sage underline-offset-4 disabled:no-underline">「记住我默认三分糖、少冰，不要珍珠」</button>，下次说「老样子」就行。</p>)}
    {editable && !editing && <div className="mt-4 flex gap-2 border-t border-line/70 pt-4">
      <button type="button" onClick={startEdit} className="btn-ghost h-10 whitespace-nowrap"><Pencil className="size-3.5" />{lines.length ? '编辑记忆' : '手动填写'}</button>
      {lines.length > 0 && <button type="button" onClick={() => void forget()} disabled={pending} className="btn-ghost h-10 whitespace-nowrap"><Trash2 className="size-3.5" />全部忘掉</button>}
    </div>}
    {!editable && lines.length > 0 && <div className="mt-4 flex items-center gap-3 text-[13px]">
      {onAsk && <button type="button" onClick={() => onAsk('老样子')} className="font-medium text-jade underline decoration-sage underline-offset-4">按老样子来一杯</button>}
      <Link to="/orders#memory" className="ml-auto text-stone hover:text-jade">管理记忆</Link>
    </div>}
    {editing && <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-[13px] text-stone">默认甜度<select className={field} value={draft.sweetness} onChange={(event) => setDraft({ ...draft, sweetness: event.target.value })}><option value="">不记</option>{SWEETNESS.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="space-y-1.5 text-[13px] text-stone">默认冰量 / 温度<select className={field} value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: event.target.value })}><option value="">不记</option>{TEMPERATURE.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <label className="block space-y-1.5 text-[13px] text-stone">爱加的小料<input className={field} value={draft.toppings} onChange={(event) => setDraft({ ...draft, toppings: event.target.value })} placeholder="例如：椰果、芋圆（不会自动加价）" /></label>
      <label className="block space-y-1.5 text-[13px] text-stone">不加的小料<input className={field} value={draft.skipToppings} onChange={(event) => setDraft({ ...draft, skipToppings: event.target.value })} placeholder="例如：珍珠" /></label>
      <label className="block space-y-1.5 text-[13px] text-stone">不太想要的原料<input className={field} value={draft.avoid} onChange={(event) => setDraft({ ...draft, avoid: event.target.value })} placeholder="例如：植脂末（写进订单备注，交门店确认）" /></label>
      <label className="block space-y-1.5 text-[13px] text-stone">严格避开（过敏 / 不耐 / 咖啡因）<input className={field} value={draft.allergies} onChange={(event) => setDraft({ ...draft, allergies: event.target.value })} placeholder="例如：芒果、乳制品、咖啡因" /><span className="block text-[12px] leading-5 text-stone/80">只会推荐配方已核准且确认不含的饮品；资料未核准时宁可不推荐。</span></label>
      <label className="block space-y-1.5 text-[13px] text-stone">每杯预算（元）<input className={field} inputMode="decimal" value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: event.target.value.replace(/[^\d.]/g, '').slice(0, 6) })} placeholder="不限" /></label>
      <div className="flex gap-2"><button type="button" className="btn-ghost h-11" onClick={() => setEditing(false)}>取消</button><button type="submit" disabled={pending} className="btn-jade h-11 flex-1">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}保存</button></div>
    </form>}
  </section>;
}
