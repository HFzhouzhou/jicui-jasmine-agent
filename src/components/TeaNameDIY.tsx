import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';
import { toast } from 'sonner';

const PLUGIN_ID = 'jasmine_lady_drink_recommendation_1';

interface TeaNameDIYProps {
  drinkName: string;
  currentName?: string;
  onApply: (name: string, style: 'elegant' | 'fun') => void;
  trigger?: React.ReactNode;
}

function TeaNameDIY({ drinkName, currentName, onApply, trigger }: TeaNameDIYProps) {
  const [open, setOpen] = useState(false);
  const [inputName, setInputName] = useState(currentName || '');
  const [style, setStyle] = useState<'elegant' | 'fun'>('elegant');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ elegant: string; fun: string }>({
    elegant: '',
    fun: '',
  });
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!inputName.trim()) {
      toast.info('先给你的茶起个名字');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `用户为饮品「${drinkName}」起了一个名字：「${inputName}」

请把这个名字润色成两种风格，每种只输出一个名字：

 【雅致东方风】：有东方茶韵感，简洁有诗意，2-6个字
 【轻松有梗风】：直白有趣，朗朗上口，2-8个字

输出格式：
 【雅致东方风】：名字
 【轻松有梗风】：名字

注意：
- 每种风格只给1个最终名字，不要解释、不要列表
- 要围绕饮品"${drinkName}"的特性来
- 名字要能记住、有传播感`;

      let full = '';
      const stream = capabilityClient
        .load(PLUGIN_ID)
        .callStream('textGenerate', { prompt });

      for await (const chunk of stream as AsyncIterable<{ content: string }>) {
        if (chunk.content) {
          full += chunk.content;
        }
      }

      const elegantMatch = full.match(/【雅致东方风】[：:]\s*「?(.+?)」?\s*(?:\n|$)/);
      const funMatch = full.match(/【轻松有梗风】[：:]\s*「?(.+?)」?\s*(?:\n|$)/);

      setGenerated({
        elegant: elegantMatch?.[1]?.trim() || inputName,
        fun: funMatch?.[1]?.trim() || inputName,
      });
    } catch (error) {
      logger.error('茶名DIY生成失败:', String(error));
      toast.error('名字生成失败，请稍后再试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    const name = style === 'elegant' ? generated.elegant : generated.fun;
    if (!name) return;
    onApply(name, style);
    setOpen(false);
    toast.success('已保存你的茶名');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('已复制');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5 text-primary" />
            给这杯茶起个名字
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 原饮品名 */}
          <div className="text-sm">
            <span className="text-muted-foreground">你正在命名的是：</span>
            <span className="text-foreground font-medium ml-1">{drinkName}</span>
          </div>

          {/* 输入名字 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              你想起的名字
            </label>
            <div className="flex gap-2">
              <Input
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="比如：夏天的风"
                maxLength={20}
              />
              <Button onClick={handleGenerate} disabled={isGenerating || !inputName.trim()}>
                {isGenerating ? (
                  <Sparkles className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                <span className="ml-1">润色</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
               会帮你把名字润成「雅致东方风」和「轻松有梗风」两种
            </p>
          </div>

          {/* 生成结果 */}
          {(generated.elegant || generated.fun) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <Tabs value={style} onValueChange={(v) => setStyle(v as 'elegant' | 'fun')}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="elegant">雅致东方风</TabsTrigger>
                   <TabsTrigger value="fun">轻松有梗风</TabsTrigger>
                </TabsList>

                <TabsContent value="elegant" className="mt-3">
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-5 text-center">
                     <p className="text-xs text-primary mb-2">雅致版</p>
                    <p className="text-2xl font-bold text-foreground tracking-wide">
                      「{generated.elegant}」
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="fun" className="mt-3">
                  <div className="bg-gradient-to-br from-amber-100/50 to-rose-100/50 border border-amber-300/30 rounded-xl p-5 text-center">
                     <p className="text-xs text-amber-700 mb-2">有梗版</p>
                    <p className="text-2xl font-bold text-foreground tracking-wide">
                      「{generated.fun}」
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() =>
                    handleCopy(style === 'elegant' ? generated.elegant : generated.fun)
                  }
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  复制名字
                </Button>
                <Button className="flex-1 gap-1.5" onClick={handleApply}>
                  <Sparkles className="size-3.5" />
                  就用这个
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(TeaNameDIY);
