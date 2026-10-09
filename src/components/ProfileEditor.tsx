import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  IUserProfile,
  SUGAR_OPTIONS,
  TEMPERATURE_OPTIONS,
  DIETARY_RESTRICTIONS,
  BUDGET_OPTIONS,
} from '@/data/userProfile';
import { cn } from '@/lib/utils';

interface ProfileEditorProps {
  profile: IUserProfile;
  onSave: (profile: IUserProfile) => void;
  trigger?: React.ReactNode;
}

export default function ProfileEditor({ profile, onSave, trigger }: ProfileEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<IUserProfile>(profile);

  const handleOpen = () => {
    setDraft(profile);
    setOpen(true);
  };

  const handleSave = () => {
    onSave(draft);
    setOpen(false);
  };

  const toggleDietary = (value: string) => {
    // 选 "无忌口" 时清空其他
    if (value === 'none') {
      setDraft({ ...draft, dietary: ['none'] });
      return;
    }
    // 选其他时去掉 "无忌口"
    const current = draft.dietary.filter((d) => d !== 'none');
    if (current.includes(value)) {
      setDraft({ ...draft, dietary: current.filter((d) => d !== value) });
    } else {
      setDraft({ ...draft, dietary: [...current, value] });
    }
  };

  const hasDietary =
    draft.dietary.length > 0 &&
    !(draft.dietary.length === 1 && draft.dietary.includes('none'));

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
        >
          <User className="size-4" />
          我的茶韵档案
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              我的茶韵档案
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              设置你的口味偏好，茉莉娘子每次推荐都会贴合你的档案
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* 甜度 */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                甜度偏好
              </label>
              <div className="flex flex-wrap gap-2">
                {SUGAR_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDraft({ ...draft, sweetness: opt })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                      draft.sweetness === opt
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border/60 hover:border-primary/30'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 温度冰度 */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                温度冰度偏好
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPERATURE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDraft({ ...draft, temperature: opt })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                      draft.temperature === opt
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border/60 hover:border-primary/30'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 忌口 */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                忌口（硬约束，AI 绝对避开）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DIETARY_RESTRICTIONS.map((opt) => {
                  const isSelected =
                    opt.value === 'none'
                      ? draft.dietary.includes('none') || draft.dietary.length === 0
                      : draft.dietary.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleDietary(opt.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all border',
                        isSelected
                          ? 'bg-primary/10 border-primary text-foreground'
                          : 'bg-card border-border/60 hover:border-primary/30'
                      )}
                    >
                      <div
                        className={cn(
                          'size-4 rounded flex items-center justify-center shrink-0',
                          isSelected ? 'bg-primary' : 'border border-border'
                        )}
                      >
                        {isSelected && <Check className="size-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasDietary && (
                <p className="text-xs text-primary mt-2">
                  ⚠️ 已选 {draft.dietary.length} 项忌口，AI 推荐时会严格避开
                </p>
              )}
            </div>

            {/* 预算 */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                常喝预算区间
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDraft({ ...draft, budget: opt.value })}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-center transition-all border',
                      draft.budget === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border/60 hover:border-primary/30'
                    )}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div
                      className={cn(
                        'text-[10px] mt-0.5',
                        draft.budget === opt.value
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="gap-1">
              <X className="size-4" />
              取消
            </Button>
            <Button onClick={handleSave} className="gap-1">
              <Check className="size-4" />
              保存档案
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
