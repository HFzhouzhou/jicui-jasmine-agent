import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeStorage } from '@/lib/storage';

const GUIDE_KEY = 'jicui_newuser_guide_shown';

const GUIDE_STEPS = [
  {
    icon: Sparkles,
    title: '这是什么？',
    desc: '我是茉莉娘子。告诉我口味、预算和饮用限制，我会根据当前菜单帮你选茶。',
  },
  {
    icon: ChevronRight,
    title: '怎么用？',
    desc: '先说你的需求，再用“换一杯”“便宜一点”继续调整。推荐卡会显示价格、规格与需要店员确认的信息。',
  },
  {
    icon: User,
    title: '茶韵档案在哪？',
    desc: '在选茶页设置甜度、温度、饮用限制与预算，或直接在对话中说明。需求有变化时，随时告诉我。',
  },
];

interface NewUserGuideProps {
  forceShow?: boolean;
}

function NewUserGuide({ forceShow = false }: NewUserGuideProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setShow(true);
      return;
    }
    const shown = safeStorage.getItem(GUIDE_KEY);
    if (!shown) {
      // 延迟一点再出现，不打断首屏体验
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleSkip = () => {
    safeStorage.setItem(GUIDE_KEY, '1');
    setShow(false);
  };

  const handleNext = () => {
    if (step < GUIDE_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      safeStorage.setItem(GUIDE_KEY, '1');
      setShow(false);
    }
  };

  if (!show) return null;

  const currentStep = GUIDE_STEPS[step];
  const Icon = currentStep.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card border border-primary/20 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 关闭按钮 */}
          <button
            onClick={handleSkip}
            className="absolute right-3 top-3 size-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground z-10"
            aria-label="跳过引导"
          >
            <X className="size-4" />
          </button>

          {/* 装饰茉莉 */}
          <div className="absolute -top-4 -right-4 size-20 opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-primary">
              <circle cx="50" cy="50" r="8" />
              <ellipse cx="50" cy="25" rx="8" ry="14" />
              <ellipse cx="50" cy="75" rx="8" ry="14" />
              <ellipse cx="25" cy="50" rx="14" ry="8" />
              <ellipse cx="75" cy="50" rx="14" ry="8" />
            </svg>
          </div>

          {/* 内容区 */}
          <div className="p-6 pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="size-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {currentStep.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentStep.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 进度 + 按钮 */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                {GUIDE_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? 'w-6 bg-primary'
                        : i < step
                          ? 'w-3 bg-primary/40'
                          : 'w-3 bg-border'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                跳过
              </button>
            </div>

            <Button className="w-full gap-2" onClick={handleNext}>
              {step < GUIDE_STEPS.length - 1 ? (
                <>
                  下一步
                  <ChevronRight className="size-4" />
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  开始选茶
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(NewUserGuide);
