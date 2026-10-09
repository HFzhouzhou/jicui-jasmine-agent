import { useId, type ReactElement } from 'react';
import { X } from 'lucide-react';
import { OFFICIAL_IMAGES } from '@/data/officialImages';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Props = {
  name: string;
  price: number;
  source: { source: string; storeName: string; observedAt: string };
  children: ReactElement;
};

/** Enlarge only the recorded product viewport, preserving the official source pixels. */
export default function OfficialProductImageDialog({ name, price, source, children }: Props) {
  const clipId = `official-product-${useId().replace(/:/g, '')}`;
  const official = OFFICIAL_IMAGES[name];
  if (!official) return children;
  const { crop } = official;

  return <Dialog>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-[26px] border-primary/10 bg-[#fffef9] p-0 sm:max-w-[620px]">
      <div className="shrink-0 border-b border-primary/10 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
        <p className="mb-2 pr-12 text-[10px] tracking-[0.12em] text-primary/55">商品图片</p>
        <DialogTitle className="break-words pr-12 font-serif text-[23px] font-normal leading-[1.4] tracking-tight text-primary sm:text-[28px]">{name}</DialogTitle>
        <DialogDescription className="mt-2 text-xs leading-6 text-muted-foreground">图片仅供参考，具体包装、规格与售卖情况以门店为准。</DialogDescription>
        <DialogClose className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-primary/5 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="关闭商品大图">
          <X aria-hidden="true" className="size-5" />
        </DialogClose>
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <figure className="px-4 pb-4 pt-5 sm:px-7 sm:pt-6">
          <svg viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`} preserveAspectRatio="xMidYMid meet" className="mx-auto block max-h-[52dvh] w-full overflow-hidden" style={{ aspectRatio: `${crop.width} / ${crop.height}` }} role="img" aria-label={`${name}商品大图，仅供参考`}>
            <defs><clipPath id={clipId}><rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} /></clipPath></defs>
            <image href={official.src} x="0" y="0" width={official.width} height={official.height} clipPath={`url(#${clipId})`} />
          </svg>
          <figcaption className="mt-3 text-center text-[10px] leading-5 text-primary/50">图片仅供参考</figcaption>
        </figure>
        <div className="border-t border-primary/10 px-5 pb-5 pt-4 sm:px-7 sm:pb-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[28px] font-medium leading-none tabular-nums text-primary"><span className="mr-1 text-sm">¥</span>{price}</p>
            <p className="text-xs text-muted-foreground">门店普通参考价</p>
          </div>
          <p className="mt-3 break-words text-[11px] leading-6 text-muted-foreground">{source.storeName} · 价格与售卖情况以门店为准</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
