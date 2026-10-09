import { memo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TeaNameDIYProps {
  drinkName: string;
  currentName?: string;
  onApply: (name: string, style: 'elegant' | 'fun') => void;
  trigger?: ReactNode;
}
function TeaNameDIY({ drinkName, currentName = '', onApply, trigger }: TeaNameDIYProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) setName(currentName); }}>
    <DialogTrigger asChild>{trigger || <Button variant="outline">给茶起昵称</Button>}</DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>给这杯茶起个昵称</DialogTitle><DialogDescription>本地文字编辑，不调用 AI，也不会更改门店商品名称。</DialogDescription></DialogHeader>
      <p className="text-sm">原商品：{drinkName}</p>
      <label className="space-y-2 text-sm">我的茶名<Input value={name} onChange={(event) => setName(event.target.value)} maxLength={20} placeholder="比如：今天的小确幸" /></label>
      <Button disabled={!name.trim()} onClick={() => { onApply(name.trim(), 'elegant'); setOpen(false); }}>使用这个昵称</Button>
    </DialogContent>
  </Dialog>;
}
export default memo(TeaNameDIY);
