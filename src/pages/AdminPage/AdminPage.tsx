import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookOpen, Check, Leaf, Loader2, LogOut, RefreshCw, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, RequestError } from '@/lib/api';
import { toast } from 'sonner';
import type { Drink } from '@shared/contracts';
import { KnowledgeWorkspace } from '@/components/admin/KnowledgeWorkspace';

type Conflict = { kind: 'menu'; drinkId: string };
type MenuDraft = {
  catalogStatus: NonNullable<Drink['catalogStatus']>; price: string; available: boolean; verified: boolean; ingredients: string; allergens: string;
  allergensKnown: boolean; caffeine: Drink['caffeine']; sweetnessOptions: string; temperatureOptions: string; toppings: string; source: string;
};
const splitList = (value: string) => value.split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean);
const selectStyle = 'min-h-11 w-full rounded-xl border border-primary/10 bg-background px-3 py-2 text-sm text-primary focus:outline-primary/40';
function draftFor(drink: Drink): MenuDraft {
  return {
    catalogStatus: drink.catalogStatus ?? 'managed', price: String(drink.price), available: drink.available, verified: drink.verified,
    ingredients: drink.ingredients.join('、'), allergens: drink.allergens?.join('、') || '', allergensKnown: drink.allergens !== null,
    caffeine: drink.caffeine, sweetnessOptions: drink.sweetnessOptions.join('、'), temperatureOptions: drink.temperatureOptions.join('、'),
    toppings: drink.toppings.map((topping) => `${topping.name}:${topping.price}`).join('\n'), source: drink.source,
  };
}

function menuBackupText(name: string, draft: MenuDraft): string {
  return [
    `商品：${name}`, `显示位置：${draft.catalogStatus === 'legacy' ? '原始资料' : '门店茶单'}`, `价格：${draft.price}`, `在售：${draft.available ? '是' : '否'}`, `已核准：${draft.verified ? '是' : '否'}`,
    `原料：${draft.ingredients || '未知'}`, `过敏原：${draft.allergensKnown ? draft.allergens || '已核准无已知过敏原' : '未知'}`,
    `咖啡因：${({ unknown: '未知', contains: '含咖啡因', none: '不含咖啡因' })[draft.caffeine]}`,
    `甜度：${draft.sweetnessOptions || '未知'}`, `温度：${draft.temperatureOptions || '未知'}`,
    `小料：\n${draft.toppings || '无'}`, `来源：${draft.source}`,
  ].join('\n');
}

export default function AdminPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState('');
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [backupText, setBackupText] = useState('');
  const [tab, setTab] = useState<'menu' | 'knowledge'>('menu');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('store');
  const [selected, setSelected] = useState<Drink | null>(null);
  const [draft, setDraft] = useState<MenuDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const requestController = useRef<AbortController | null>(null);
  const editPanel = useRef<HTMLElement | null>(null);
  useEffect(() => () => requestController.current?.abort(), []);

  const headers = (value = token) => ({ Authorization: `Bearer ${value}` });
  async function connect(event: FormEvent) {
    event.preventDefault();
    if (!tokenInput.trim() || pending) return;
    setPending(true); setError('');
    const controller = new AbortController(); requestController.current = controller;
    try {
      const menu = await apiRequest<{ drinks: Drink[] }>('/api/admin/menu', { headers: headers(tokenInput.trim()), signal: controller.signal }, 15000);
      if (controller.signal.aborted) return;
      setDrinks(menu.drinks); setToken(tokenInput.trim()); setTokenInput('');
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '管理服务连接失败'); }
    finally { if (!controller.signal.aborted) setPending(false); }
  }
  function logout() {
    requestController.current?.abort(); requestController.current = null;
    setToken(''); setTokenInput(''); setConflict(null); setBackupText(''); setDrinks([]); setSelected(null); setDraft(null); setPending(false); setError('');
  }
  async function patchDrink(id: string, update: Partial<Drink>, expectedUpdatedAt: string) {
    if (pending) return;
    setPending(true); setError('');
    const controller = new AbortController(); requestController.current = controller;
    try {
      const result = await apiRequest<{ drink: Drink }>(`/api/admin/menu/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ ...update, expectedUpdatedAt }), signal: controller.signal,
      }, 15000);
      if (controller.signal.aborted) return;
      setDrinks((previous) => previous.map((drink) => drink.id === id ? result.drink : drink));
      if (selected?.id === id) {
        setSelected(result.drink);
        const availabilityOnly = Object.keys(update).length === 1 && 'available' in update;
        setDraft((current) => availabilityOnly && current ? { ...current, available: result.drink.available } : draftFor(result.drink));
      }
      if (conflict?.kind === 'menu' && conflict.drinkId === id) setConflict(null);
      toast.success('菜单已保存，下次推荐会使用更新后的资料');
    } catch (cause) {
      if (!controller.signal.aborted) {
        if (cause instanceof RequestError && cause.code === 'STALE_WRITE') {
          setConflict({ kind: 'menu', drinkId: id });
          setError('这款商品已被其他操作更新，本次保存未生效，你的编辑内容仍在。请载入最新版本并重新核对后保存。');
        } else setError(cause instanceof Error ? cause.message : '菜单保存失败');
      }
    }
    finally { if (!controller.signal.aborted) setPending(false); }
  }
  function saveDrink(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft) return;
    const price = Number(draft.price);
    if (!draft.price.trim() || !Number.isFinite(price) || price < 0) { setError('请填写有效的非负价格'); return; }
    const toppings: Drink['toppings'] = [];
    for (const row of draft.toppings.split('\n').filter((line) => line.trim())) {
      const match = row.trim().match(/^(.+?)[:：]\s*(\d+(?:\.\d{1,2})?)$/);
      if (!match) { setError('小料每行按「名称:价格」填写，例如「珍珠:2」，不提供小料请留空'); return; }
      toppings.push({ name: match[1].trim(), price: Number(match[2]) });
    }
    if (!draft.source.trim()) { setError('请填写商品资料来源；未核准时可注明资料仍待品牌核实。'); return; }
    void patchDrink(selected.id, {
      catalogStatus: draft.catalogStatus, price, available: draft.available, verified: draft.verified, ingredients: splitList(draft.ingredients),
      allergens: draft.allergensKnown ? splitList(draft.allergens) : null, caffeine: draft.caffeine,
      sweetnessOptions: splitList(draft.sweetnessOptions), temperatureOptions: splitList(draft.temperatureOptions), toppings, source: draft.source.trim(),
    }, selected.updatedAt);
  }
  async function reloadConflict() {
    if (!conflict || pending) return;
    setPending(true); setError('');
    const controller = new AbortController(); requestController.current = controller;
    try {
      if (conflict.kind === 'menu') {
        const result = await apiRequest<{ drinks: Drink[] }>('/api/admin/menu', { headers: headers(), signal: controller.signal }, 15000);
        if (controller.signal.aborted) return;
        if (selected?.id === conflict.drinkId && draft) {
          const latest = result.drinks.find((drink) => drink.id === selected.id);
          if (!latest) throw new Error('该商品已不存在，当前草稿仍保留在编辑区。');
          setBackupText((previous) => [previous, menuBackupText(selected.name, draft)].filter(Boolean).join('\n\n—— 新一轮冲突草稿 ——\n\n'));
          setSelected(latest); setDraft(draftFor(latest));
        }
        setDrinks(result.drinks);
      }
      setConflict(null);
      toast.success('已载入最新资料。原编辑内容保留在草稿备份中，请对照后重新应用需要的修改。');
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '重新加载失败，原草稿仍保留'); }
    finally { if (!controller.signal.aborted) setPending(false); }
  }
  const visibleDrinks = drinks.filter((drink) => `${drink.name} ${drink.category}`.includes(search.trim()) && (filter === 'all' || (filter === 'store' ? drink.catalogStatus !== 'legacy' : filter === 'legacy' ? drink.catalogStatus === 'legacy' : filter === 'unverified' ? !drink.verified : drink.catalogStatus !== 'legacy' && !drink.available)));

  if (!token) return <div className="flex min-h-[78vh] items-center justify-center px-5 py-10 md:px-10 md:py-16">
    <div className="grid w-full max-w-4xl overflow-hidden rounded-[30px] bg-white md:grid-cols-[0.85fr_1fr] md:rounded-[36px]">
      <div className="relative overflow-hidden bg-[#253b2d] px-7 py-8 text-[#f7f7ef] md:flex md:flex-col md:justify-between md:p-10">
        <p className="relative z-10 text-[10px] tracking-[0.25em] text-[#dce6bd]/75">JICUI · BRAND STUDIO</p>
        <div className="relative z-10 mt-6 md:my-16"><h2 className="font-serif text-3xl leading-relaxed md:text-4xl">用心维护，<br className="hidden md:block" />每一杯的依据。</h2><p className="mt-4 max-w-60 text-xs leading-7 text-[#f7f7ef]/55">让菜单、配料与品牌知识，<br />在每一次对话里准确传递。</p></div>
        <Leaf className="pointer-events-none absolute -bottom-6 -right-6 size-44 stroke-[0.65] text-[#dce6bd]/10 md:size-60" aria-hidden="true" />
        <p className="relative z-10 mt-7 hidden text-[10px] tracking-widest text-[#f7f7ef]/35 md:block">极萃东方茉莉 · 品牌工作台</p>
      </div>
      <form onSubmit={connect} className="space-y-6 p-7 md:p-10">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eceee2]"><Settings2 className="size-5 text-primary/65" /></div>
        <div><h1 className="font-serif text-[28px] text-primary">品牌资料管理</h1><p className="mt-3 text-xs leading-7 text-muted-foreground">维护菜单、在售状态和品牌知识。<br />请输入服务器配置的管理口令。</p></div>
        <label className="block space-y-3 text-sm text-primary">管理口令<Input className="h-12 rounded-xl border-primary/10 bg-background px-4" type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} autoComplete="off" placeholder="输入管理口令" required /></label>
        <p className="text-[11px] leading-6 text-muted-foreground">口令仅保存在本次页面内存中，刷新后需重新输入。若尚未配置，请先在服务器设置 ADMIN_TOKEN。</p>
        {error && <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <Button className="min-h-12 w-full gap-2 rounded-full" disabled={pending || !tokenInput.trim()}>{pending && <Loader2 className="size-4 animate-spin" />}{pending ? '连接中…' : '进入品牌工作台'}</Button>
      </form>
    </div>
  </div>;

  return <div className="mx-auto max-w-7xl px-5 py-9 md:px-10 md:py-14 [&_input:not([type=checkbox])]:min-h-11 [&_input:not([type=checkbox])]:rounded-xl [&_input:not([type=checkbox])]:border-primary/10 [&_textarea]:rounded-xl [&_textarea]:border-primary/10 [&_button[data-slot=button]]:min-h-11 [&_button[data-slot=button]]:rounded-full">
    <header className="mb-9 flex flex-wrap items-center justify-between gap-5"><div><p className="mb-4 text-[10px] tracking-[0.26em] text-primary/55">JICUI · BRAND STUDIO</p><h1 className="font-serif text-[32px] text-primary md:text-[40px]">品牌资料管理</h1></div><Button variant="outline" size="sm" onClick={logout} className="gap-2"><LogOut className="size-4" />退出管理</Button></header>
    <div className="mb-7 flex w-fit flex-wrap gap-2 rounded-[24px] bg-[#eceee2] p-1.5"><Button variant={tab === 'menu' ? 'default' : 'outline'} onClick={() => { setTab('menu'); setError(''); }} className="gap-2"><Leaf className="size-4" />菜单（{drinks.length}）</Button><Button variant={tab === 'knowledge' ? 'default' : 'outline'} onClick={() => { setTab('knowledge'); setError(''); }} className="gap-2"><BookOpen className="size-4" />知识库</Button></div>
    {(error || conflict) && <div role="alert" className="mb-6 space-y-3 rounded-[22px] bg-destructive/5 p-5 text-sm text-destructive">
      <p>{error || '资料存在版本冲突，请载入最新版本后重新核对。当前草稿尚未保存到服务器。'}</p>
      {conflict && <><p className="text-xs leading-6">载入后会显示最新资料，并在下方保留这次编辑的草稿备份，方便对照；不会自动覆盖别人的修改。</p><Button size="sm" variant="outline" disabled={pending} onClick={() => void reloadConflict()} className="gap-2"><RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} />载入最新版本，保留草稿备份</Button></>}
    </div>}
    {backupText && <details className="mb-6 rounded-[22px] bg-[#eee6d3]/60 p-5" open>
      <summary className="cursor-pointer text-sm font-medium">冲突前的草稿备份（仅保留在本页）</summary>
      <p className="text-xs text-muted-foreground leading-6 my-3">下方编辑区已载入最新资料。请参照备份，重新填写仍需保留的修改后保存。可选中文字复制留存；退出或刷新页面会清除备份。</p>
      <Textarea aria-label="冲突前的草稿备份" value={backupText} readOnly rows={8} className="bg-background text-xs" />
    </details>}
    <div className={tab === 'menu' ? '' : 'hidden'}>
      <p className="mb-6 max-w-3xl text-xs leading-7 text-muted-foreground">菜单核对 {drinks.filter((drink) => drink.catalogStatus === 'observed').length} 款 · 商品资料核准 {drinks.filter((drink) => drink.verified).length} 款 · 原始资料 {drinks.filter((drink) => drink.catalogStatus === 'legacy').length} 款。菜单核对仅确认名称、普通价等列明字段；原料、过敏原和规格未知时请留空，仅在查证后标记商品资料核准。</p>
      <div className="grid items-start gap-6 md:grid-cols-5">
        <section className="overflow-hidden rounded-[26px] bg-white md:col-span-2">
          <div className="space-y-3 border-b border-primary/10 p-5"><label className="relative block"><Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input className="pl-9" aria-label="搜索菜单" placeholder="搜索商品或分类" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className={selectStyle} aria-label="筛选菜单" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="store">门店茶单</option><option value="legacy">原始资料 · 本店未核对</option><option value="all">全部资料</option><option value="unverified">商品资料待核准</option><option value="unavailable">已售罄 / 下架</option></select></div>
          <div className="max-h-[340px] divide-y divide-primary/5 overflow-y-auto md:max-h-[650px]">{!visibleDrinks.length && <p className="p-5 text-sm text-muted-foreground">没有匹配的商品</p>}{visibleDrinks.map((drink) => <div key={drink.id} className={`flex items-center gap-3 p-4 md:px-5 ${selected?.id === drink.id ? 'bg-[#e7ecd9]' : 'hover:bg-background'}`}>
            <button type="button" disabled={pending} className="min-h-12 min-w-0 flex-1 text-left" onClick={() => { setSelected(drink); setDraft(draftFor(drink)); setError(''); if (window.matchMedia('(max-width: 767px)').matches) requestAnimationFrame(() => editPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}><span className="block font-serif text-base text-primary">{drink.name}</span><span className="mt-1 block text-[10px] leading-5 text-muted-foreground">¥{drink.price}{drink.catalogEvidence?.startingPrice && drink.catalogEvidence.verifiedFields.includes('price') ? '起' : ''} · {drink.category} · {drink.catalogStatus === 'legacy' ? '未纳入门店茶单' : drink.verified ? '商品资料已核准' : drink.catalogStatus === 'observed' ? '菜单已核对' : '资料待核准'}</span></button>
            {drink.catalogStatus !== 'legacy' && <Button size="sm" variant="outline" disabled={pending} className={`shrink-0 text-xs ${drink.available ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => void patchDrink(drink.id, { available: !drink.available }, drink.updatedAt)}>{drink.available ? '设为售罄' : '恢复在售'}</Button>}
          </div>)}</div>
        </section>
        <section ref={editPanel} className="scroll-mt-24 rounded-[26px] bg-white p-5 md:col-span-3 md:p-8">
          {!selected || !draft ? <div className="flex min-h-60 flex-col items-center justify-center text-center text-muted-foreground md:min-h-96"><Leaf className="mb-5 size-10 stroke-[1.1] text-primary/40" /><p>选择一款商品，核对并补充资料</p><p className="text-xs mt-3">保存的变更会直接影响下一次推荐。</p></div> : <form onSubmit={saveDrink}><fieldset disabled={pending} className="space-y-5">
            <div><h2 className="font-serif text-2xl text-primary">{selected.name}</h2><p className="text-xs text-muted-foreground mt-2">{selected.id} · {selected.volume} · {selected.category}</p></div>
            {selected.catalogEvidence && <div className="rounded-2xl bg-[#e9eedb] p-4 text-xs leading-6 text-primary/75"><p>{selected.catalogEvidence.storeName} · {selected.catalogEvidence.observedAt.slice(0, 10)} 小程序核对</p><p>记录普通价：¥{selected.catalogEvidence.observedPrice}{selected.catalogEvidence.startingPrice ? '起' : ''}。这条记录不代表完整配料与规格已确认。</p></div>}
            {selected.catalogStatus === 'legacy' && <p className="rounded-2xl bg-[#eee6d3]/60 p-4 text-xs leading-6 text-muted-foreground">这条参考资料未纳入当前门店茶单，不代表停售。请先查证该店当前商品信息，并填写资料来源。</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="text-sm space-y-2">菜单价格（元）<Input type="number" min="0" step="0.01" required value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label><label className="text-sm space-y-2">咖啡因<select className={selectStyle} value={draft.caffeine} onChange={(event) => setDraft({ ...draft, caffeine: event.target.value as Drink['caffeine'] })}><option value="unknown">未知</option><option value="contains">含咖啡因</option><option value="none">经核准不含咖啡因</option></select></label></div>
            <label className="block text-sm space-y-2">原料清单<Input value={draft.ingredients} onChange={(event) => setDraft({ ...draft, ingredients: event.target.value })} placeholder="按实际资料填写，用顿号或逗号分隔" /><span className="text-xs text-muted-foreground">空白代表未知，不能据此判断不含某种原料。</span></label>
            <div className="space-y-3"><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={draft.allergensKnown} onChange={(event) => setDraft({ ...draft, allergensKnown: event.target.checked })} className="accent-primary size-4" />过敏原信息已经查证</label><label className="block text-sm space-y-2">已知过敏原<Input disabled={!draft.allergensKnown} value={draft.allergens} onChange={(event) => setDraft({ ...draft, allergens: event.target.value })} placeholder={draft.allergensKnown ? '例如：乳、坚果；核准无已知过敏原时留空' : '未查证，保留未知状态'} /></label></div>
            <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm space-y-2">支持的甜度<Input value={draft.sweetnessOptions} onChange={(event) => setDraft({ ...draft, sweetnessOptions: event.target.value })} placeholder="例如：三分糖、五分糖" /></label><label className="text-sm space-y-2">支持的温度<Input value={draft.temperatureOptions} onChange={(event) => setDraft({ ...draft, temperatureOptions: event.target.value })} placeholder="例如：热饮、少冰、正常冰" /></label></div>
            <label className="block text-sm space-y-2">可加小料及价格<Textarea rows={3} value={draft.toppings} onChange={(event) => setDraft({ ...draft, toppings: event.target.value })} placeholder={'每行一项，格式为 名称:价格\n例如 珍珠:2'} /></label>
            <label className="block text-sm space-y-2">资料来源<Textarea rows={2} maxLength={1000} value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="例如：品牌核准菜单（日期）、配料标签文档编号或来源链接" /></label>
            <label className="flex items-start gap-2 rounded-2xl bg-background p-4 text-sm leading-6"><input type="checkbox" className="mt-1.5 size-4 shrink-0 accent-primary" checked={draft.catalogStatus !== 'legacy'} onChange={(event) => setDraft({ ...draft, catalogStatus: event.target.checked ? selected.catalogStatus === 'observed' ? 'observed' : 'managed' : 'legacy' })} /><span>纳入门店茶单及推荐<span className="mt-1 block text-xs text-muted-foreground">请先查证商品仍在本店提供。取消后保留为原始资料，不表示商品停售。</span></span></label>
            <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary size-4" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} /> {draft.catalogStatus === 'legacy' ? '纳入茶单后标为在售' : '当前在售'}</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary size-4" checked={draft.verified} onChange={(event) => setDraft({ ...draft, verified: event.target.checked })} />已根据来源核准商品资料</label></div>
            <Button disabled={pending} type="submit" className="w-full gap-2">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}保存商品资料</Button>
          </fieldset></form>}
        </section>
      </div>
    </div>
    <div className={tab === 'knowledge' ? '' : 'hidden'}><KnowledgeWorkspace token={token} /></div>
  </div>;
}
