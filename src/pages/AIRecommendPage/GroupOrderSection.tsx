import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, Sparkles, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TeaCard, { ITeaCardData } from '@/components/TeaCard';

interface GroupMember {
  id: number;
  nickname: string;
  demand: string;
}

interface GroupOrderSectionProps {
  onSubmit: (members: GroupMember[]) => void;
  isLoading: boolean;
  results?: ITeaCardData[]; // 每一位的推荐
  totalPrice?: number;
  sameCategoryNote?: string;
}

function GroupOrderSection({
  onSubmit,
  isLoading,
  results = [],
  totalPrice,
  sameCategoryNote,
}: GroupOrderSectionProps) {
  const [members, setMembers] = useState<GroupMember[]>([
    { id: 1, nickname: '1 号', demand: '' },
    { id: 2, nickname: '2 号', demand: '' },
  ]);

  const addMember = () => {
    if (members.length >= 4) return;
    const nextId = members.length + 1;
    setMembers([...members, { id: nextId, nickname: `${nextId} 号`, demand: '' }]);
  };

  const removeMember = (id: number) => {
    if (members.length <= 2) return;
    setMembers(
      members
        .filter((m) => m.id !== id)
        .map((m, idx) => ({ ...m, nickname: `${idx + 1} 号` }))
    );
  };

  const updateDemand = (id: number, demand: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, demand } : m)));
  };

  const canSubmit = members.every((m) => m.demand.trim().length > 0);

  const handleSubmit = () => {
    onSubmit(members);
  };

  // 结果展示模式
  if (results.length > 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">拼单结果</h3>
          </div>
          <Badge className="bg-primary/10 text-primary border-0">
            共 {results.length} 杯 · 合计 ¥{totalPrice || results.reduce((s, r) => s + r.price, 0)}
          </Badge>
        </div>

        {sameCategoryNote && (
          <div className="text-sm text-primary bg-primary/5 px-3 py-2 rounded-lg border border-primary/20">
            ✨ {sameCategoryNote}
          </div>
        )}

        <div className="space-y-4">
          {results.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                  {i + 1} 号拼单
                </Badge>
                <span className="text-xs text-muted-foreground">
                  「{members[i]?.demand.slice(0, 20)}
                  {members[i]?.demand.length > 20 ? '...' : ''}」
                </span>
              </div>
              <TeaCard data={{ ...card, isMain: false }} />
            </motion.div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">拼单合计</span>
            <span className="text-2xl font-black text-primary">
              ¥{totalPrice || results.reduce((s, r) => s + r.price, 0)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            到店可以一起点单，也可以各自下单
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="size-4 text-primary" />
          <h3 className="text-lg font-bold text-foreground">多人拼单</h3>
        </div>
        <p className="text-sm text-muted-foreground">
            多人一起点单，一次推荐每个人的选择
        </p>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {members.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="flex items-start gap-3 p-3 bg-card border border-border/60 rounded-xl">
                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">
                    {member.nickname}想喝什么？
                  </div>
                  <input
                    type="text"
                    value={member.demand}
                    onChange={(e) => updateDemand(member.id, e.target.value)}
                    placeholder="例如：减脂想喝低卡果茶"
                    className="w-full text-sm bg-background border border-border/60 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
                  />
                </div>
                {members.length > 2 && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="shrink-0 size-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="移除拼单人"
                  >
                    <Minus className="size-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {members.length < 4 && (
        <button
          onClick={addMember}
          className="w-full py-2.5 border border-dashed border-border/60 rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="size-4" />
          再加一位
        </button>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || isLoading}
        className="w-full gap-2"
        size="lg"
      >
        <Sparkles className="size-4" />
        {isLoading ? '茉莉娘子搭配中...' : '生成拼单组合'}
      </Button>
    </div>
  );
}

export default memo(GroupOrderSection);
