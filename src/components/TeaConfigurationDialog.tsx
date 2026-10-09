import { useEffect, useId, useState } from 'react';
import type { Drink, OfficialOrderDraft } from '@shared/contracts';
import { formatVolumeLabel } from '@shared/catalog-display';
import { ArrowRight, Check, LoaderCircle, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import DrinkArtwork from '@/components/DrinkArtwork';
import type { ITeaCardData } from '@/components/TeaCard';
import { apiRequest } from '@/lib/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ITeaCardData;
  category: string;
  initialDraft?: OfficialOrderDraft;
  onSave: (draft: OfficialOrderDraft) => void;
}

function ChoiceGroup({ label, value, options, onChange, unconfirmed = [] }: { label: string; value: string; options: string[]; onChange: (value: string) => void; unconfirmed?: string[] }) {
  return <fieldset className="space-y-3">
    <legend className="text-xs font-medium text-[#526147]">{label}</legend>
    <div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`min-h-10 rounded-xl border px-3.5 py-2 text-xs transition-colors ${value === option ? 'border-[#627749] bg-[#edf1e2] text-[#314b2f] shadow-[inset_0_0_0_0.5px_#627749]' : 'border-[#e5e8db] bg-white text-[#7c886d] hover:border-[#94a67b]'}`}>{option}{unconfirmed.includes(option) && <span className="ml-1 text-[9px] opacity-65">· 待确认</span>}</button>)}</div>
  </fieldset>;
}

function volumeChoices(data: ITeaCardData, product: Drink | null) {
  const productVolume = product && (product.verified || product.catalogEvidence?.verifiedFields.includes('volume')) ? product.volume : '';
  const volume = formatVolumeLabel(productVolume || data.volume);
  return volume && !/待|未知/.test(volume) ? volume.split(/\s*[/／]\s*/).filter(Boolean) : ['随门店规格'];
}

function preserveToppings(value: string) {
  if (!value || /^(未加料|未添加|无|不额外加料)$/.test(value) || /待.*确认/.test(value)) return '不额外加料';
  return value.replace(/[（(][+＋]?¥[\d.]+[）)]/g, '').trim();
}

function meaningfulOption(value: string) {
  return value && !/待|未知|确认/.test(value) ? value : '';
}

/** The parent remounts this form for each edit, so cancelling never changes the saved draft. */
export default function TeaConfigurationDialog({ open, onOpenChange, data, category, initialDraft, onSave }: Props) {
  const noteId = useId();
  const [product, setProduct] = useState<Drink | null>(null);
  const [loading, setLoading] = useState(Boolean(data.drinkId));
  const [menuError, setMenuError] = useState('');
  const [volume, setVolume] = useState(initialDraft?.options.volume || volumeChoices(data, null)[0]);
  const [sweetness, setSweetness] = useState(initialDraft?.options.sweetness || meaningfulOption(data.sweetness) || '随门店标准');
  const [temperature, setTemperature] = useState(initialDraft?.options.temperature || meaningfulOption(data.temperature) || '随门店标准');
  const [toppings, setToppings] = useState(initialDraft?.options.toppings || preserveToppings(data.toppings));
  const [quantity, setQuantity] = useState(initialDraft?.quantity || 1);
  const [note, setNote] = useState(initialDraft?.note || '');
  useEffect(() => {
    if (!open || !data.drinkId) return;
    const controller = new AbortController();
    apiRequest<{ drinks: Drink[] }>('/api/menu', { signal: controller.signal }, 10000)
      .then((response) => {
        if (controller.signal.aborted) return;
        const found = response.drinks.find((item) => item.id === data.drinkId);
        if (!found) throw new Error('商品资料暂不可用，当前配置以推荐卡为参考。');
        setProduct(found);
      })
      .catch((error: unknown) => { if (!controller.signal.aborted) setMenuError(error instanceof Error ? error.message : '商品资料暂不可用。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, data.drinkId]);

  const knownVolumes = volumeChoices(data, product);
  const knownSweetness = product?.verified && product.sweetnessOptions.length ? product.sweetnessOptions : ['随门店标准', '无额外加糖', '微甜', '半糖', '正常甜'];
  const knownTemperatures = product?.verified && product.temperatureOptions.length ? product.temperatureOptions : ['随门店标准', '正常冰', '少冰', '去冰', '常温', '热饮'];
  const knownToppings = ['不额外加料', ...(product?.verified ? product.toppings.map((item) => item.name) : [])];
  const includeSelection = (options: string[], selected: string) => [...new Set([...options, selected])];
  const volumes = includeSelection(knownVolumes, volume);
  const sweetOptions = includeSelection(knownSweetness, sweetness);
  const tempOptions = includeSelection(knownTemperatures, temperature);
  const toppingOptions = includeSelection(knownToppings, toppings);
  const toppingConfirmed = toppings.split('、').every((name) => knownToppings.includes(name));
  // Retain previous choices verbatim; loading newer menu data must never silently change a draft.
  const selection = { volume, sweetness, temperature, toppings };
  const save = () => {
    if (!data.drinkId || loading || menuError) return;
    onSave({ drinkId: data.drinkId, drinkName: data.drinkName, quantity, ...(data.catalogEvidence?.storeName ? { storeName: data.catalogEvidence.storeName } : {}), options: selection, ...(note.trim() ? { note: note.trim() } : {}) });
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="!bottom-0 !top-auto flex max-h-[94dvh] !max-w-full !translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[28px] rounded-b-none border-0 bg-[#fbfcf5] p-0 sm:!bottom-auto sm:!top-1/2 sm:!max-w-[780px] sm:!-translate-y-1/2 sm:rounded-[28px]">
      <div className="shrink-0 border-b border-[#e8ebdf] px-6 pt-5 pb-4 sm:px-7">
        <p className="mb-2 text-[9px] tracking-[0.2em] text-[#93a27c]">MAKE IT YOURS</p>
        <DialogTitle className="font-serif text-xl font-normal text-[#263f2c]">把这杯，调成你的喜欢</DialogTitle>
        <DialogDescription className="mt-2 text-xs text-[#889379]">选好口味，茉莉娘子为你留好这份配置。</DialogDescription>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid sm:grid-cols-[240px_minmax(0,1fr)]">
          <div className="border-b border-[#e8ebdf] bg-[#eff2e5] p-5 sm:border-r sm:border-b-0 sm:p-6">
            <div className="flex items-center gap-5 sm:block">
              <DrinkArtwork category={product?.category || category} name={data.drinkName} className="h-28 w-28 shrink-0 rounded-2xl sm:mb-5 sm:h-48 sm:w-full" />
              <div className="min-w-0">
                <p className="mb-1.5 text-[9px] tracking-wider text-[#8c9a78]">{product?.category || '极萃东方茉莉'}</p>
                <h3 className="font-serif text-[23px] leading-snug text-[#2d4430]">{data.drinkName}</h3>
                <div className="mt-3 flex items-baseline gap-1.5 text-[#2d4430]"><span className="text-xs">¥</span><span className="font-serif text-3xl">{data.price}</span>{data.startingPrice && <span className="text-xs">起</span>}<span className="ml-1 text-[10px] text-[#8b977a]">原推荐参考价</span></div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-[#7c896a]">{(product?.verified && product.description) || data.reason || '一杯东方茉莉，留给此刻的自己。'}</p>
            {data.catalogEvidence?.storeName && <p className="mt-3 text-[10px] leading-5 text-[#919d80]">{data.catalogEvidence.storeName}</p>}
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            {loading && <p className="flex items-center gap-2 text-xs text-[#81926b]" role="status"><LoaderCircle className="size-3.5 animate-spin" />正在读取商品详情</p>}
            {menuError && <p role="status" className="text-xs leading-5 text-[#97793c]">{menuError}</p>}
            <ChoiceGroup label="杯型" value={selection.volume} options={volumes} unconfirmed={knownVolumes.includes(volume) ? [] : [volume]} onChange={setVolume} />
            <ChoiceGroup label={product?.verified && product.sweetnessOptions.length ? '甜度' : '甜度偏好'} value={selection.sweetness} options={sweetOptions} unconfirmed={knownSweetness.includes(sweetness) ? [] : [sweetness]} onChange={setSweetness} />
            <ChoiceGroup label={product?.verified && product.temperatureOptions.length ? '冰量 / 温度' : '冰量 / 温度偏好'} value={selection.temperature} options={tempOptions} unconfirmed={knownTemperatures.includes(temperature) ? [] : [temperature]} onChange={setTemperature} />
            {toppingOptions.length > 1 ? <ChoiceGroup label="小料" value={selection.toppings} options={toppingOptions} unconfirmed={toppingConfirmed ? [] : [toppings]} onChange={setToppings} /> : <div className="flex items-center justify-between border-y border-[#e5e8db] py-4 text-xs"><span className="text-[#526147]">小料</span><span className="text-[#879375]">不额外加料</span></div>}
            <div className="flex items-center justify-between"><span className="text-xs font-medium text-[#526147]">数量</span><div className="flex items-center gap-4 rounded-full border border-[#dfe5d3] bg-white p-1"><button type="button" aria-label="减少数量" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex size-10 items-center justify-center rounded-full text-[#526147] hover:bg-[#f0f3e7] disabled:opacity-30"><Minus className="size-4" /></button><output aria-label="饮品数量" className="min-w-4 text-center text-sm tabular-nums text-[#2d4430]">{quantity}</output><button type="button" aria-label="增加数量" disabled={quantity >= 20} onClick={() => setQuantity((value) => Math.min(20, value + 1))} className="flex size-10 items-center justify-center rounded-full text-[#526147] hover:bg-[#f0f3e7] disabled:opacity-30"><Plus className="size-4" /></button></div></div>
            <div><label htmlFor={noteId} className="mb-3 block text-xs font-medium text-[#526147]">给这杯的一点备注 <span className="font-normal text-[#a0aa91]">选填</span></label><textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} rows={2} placeholder="还有什么希望店员知道的？" className="w-full resize-none rounded-2xl border border-[#e0e5d5] bg-white p-3 text-xs leading-6 text-[#526147] outline-none placeholder:text-[#abb49d] focus:border-[#78945b]" /><div className="mt-1 text-right text-[9px] text-[#a0aa91]">{note.length} / 200</div></div>
            <p className="text-[10px] leading-5 text-[#99a18d]">甜度与冰量按你的偏好记录，实际可选项及价格以门店为准。</p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 border-t border-[#e4e9d9] bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
        <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-xs font-medium text-[#435b37]"><ShoppingBag className="size-3.5" />{quantity} 杯 · 我的配置</p><p className="mt-1 truncate text-[10px] text-[#8b9878]">{selection.volume} · {selection.sweetness} · {selection.temperature}</p></div>
        <Button onClick={save} disabled={!data.drinkId || loading || Boolean(menuError)} className="h-12 shrink-0 gap-2 rounded-full bg-[#2e4933] px-5 text-xs text-white hover:bg-[#3e5d3f]">{initialDraft ? <Check className="size-4" /> : <ArrowRight className="size-4" />}{initialDraft ? '保存这份配置' : '就这样配'}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
