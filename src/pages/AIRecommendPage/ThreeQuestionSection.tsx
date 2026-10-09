import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Heart, Brain, Leaf, Sun, Moon, Coffee, Zap, PartyPopper, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThreeQuestionSectionProps {
  onSubmit: (answers: { mood: string; taste: string; scene: string }) => void;
  isLoading: boolean;
}

const MOOD_OPTIONS = [
  { value: '开心想庆祝', label: '开心想庆祝', icon: PartyPopper, color: 'from-amber-400/20 to-orange-400/20' },
  { value: '疲惫需提神', label: '疲惫需提神', icon: Coffee, color: 'from-amber-700/20 to-orange-800/20' },
  { value: '想喝点甜的', label: '想喝点甜的', icon: Heart, color: 'from-rose-400/20 to-pink-400/20' },
  { value: '烦躁想清爽', label: '烦躁想清爽', icon: Leaf, color: 'from-emerald-400/20 to-teal-400/20' },
  { value: '养生调理', label: '养生调理', icon: Sparkles, color: 'from-amber-300/20 to-yellow-400/20' },
  { value: '聚会分享', label: '聚会分享', icon: Zap, color: 'from-violet-400/20 to-fuchsia-400/20' },
];

const TASTE_OPTIONS = [
  { value: '清爽茶香', label: '清爽茶香', icon: Leaf, color: 'from-emerald-400/20 to-green-400/20' },
  { value: '奶香浓郁', label: '奶香浓郁', icon: Sun, color: 'from-amber-300/20 to-orange-300/20' },
  { value: '酸甜果味', label: '酸甜果味', icon: Heart, color: 'from-rose-400/20 to-pink-400/20' },
  { value: '微苦咖啡', label: '微苦咖啡', icon: Coffee, color: 'from-stone-500/20 to-stone-600/20' },
  { value: '清淡低卡', label: '清淡低卡', icon: Brain, color: 'from-sky-400/20 to-blue-400/20' },
  { value: '暖身姜茶', label: '暖身姜茶', icon: Thermometer, color: 'from-orange-400/20 to-red-400/20' },
];

const SCENE_OPTIONS = [
  { value: '工作学习', label: '工作学习', icon: Brain, color: 'from-blue-400/20 to-indigo-400/20' },
  { value: '加班提神', label: '加班提神', icon: Coffee, color: 'from-amber-600/20 to-stone-500/20' },
  { value: '饭后解腻', label: '饭后解腻', icon: Leaf, color: 'from-emerald-400/20 to-green-400/20' },
  { value: '运动健身', label: '运动健身', icon: Zap, color: 'from-orange-400/20 to-red-400/20' },
  { value: '朋友一起', label: '朋友一起', icon: Heart, color: 'from-pink-400/20 to-rose-400/20' },
  { value: '睡前放松', label: '睡前放松', icon: Moon, color: 'from-violet-400/20 to-indigo-400/20' },
  { value: '天气炎热', label: '天气炎热', icon: Sun, color: 'from-yellow-400/20 to-orange-400/20' },
  { value: '天冷想喝热饮', label: '天冷想喝热饮', icon: Thermometer, color: 'from-red-400/20 to-orange-400/20' },
];

function ThreeQuestionSection({ onSubmit, isLoading }: ThreeQuestionSectionProps) {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [taste, setTaste] = useState('');
  const [scene, setScene] = useState('');

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    onSubmit({ mood, taste, scene });
  };

  const canNext =
    (step === 1 && mood) || (step === 2 && taste) || (step === 3 && scene);

  const options =
    step === 1 ? MOOD_OPTIONS : step === 2 ? TASTE_OPTIONS : SCENE_OPTIONS;
  const selected = step === 1 ? mood : step === 2 ? taste : scene;
  const setSelected = step === 1 ? setMood : step === 2 ? setTaste : setScene;

  const stepTitles = [
    '今日心情如何？',
    '口味偏好呢？',
    '什么场景下喝？',
  ];

  return (
    <div className="space-y-6">
      {/* 进度条 */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-primary' : 'bg-border'
              }`}
            />
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs text-primary font-medium mb-2">第 {step} / 3 问</div>
        <h3 className="text-xl font-bold text-foreground">{stepTitles[step - 1]}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 1 && '选一个你现在最真实的状态'}
          {step === 2 && '告诉我你的口味偏好'}
          {step === 3 && '你打算在什么场景喝？'}
        </p>
      </div>

      {/* 选项网格 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={`grid gap-3 ${
            step === 3 ? 'grid-cols-2' : 'grid-cols-2'
          }`}
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`relative p-3 md:p-4 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm scale-[1.02]'
                    : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 size-4 rounded-full bg-primary flex items-center justify-center">
                    <svg className="size-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className={`size-8 rounded-lg bg-gradient-to-br ${opt.color} flex items-center justify-center mb-2`}>
                  <Icon className="size-4 text-foreground/70" />
                </div>
                <div className="text-sm font-medium text-foreground">{opt.label}</div>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-2">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={handlePrev}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            上一步
          </Button>
        )}
        {step < 3 ? (
          <Button
            onClick={handleNext}
            disabled={!canNext}
            className="flex-1 gap-1"
          >
            下一步
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canNext || isLoading}
            className="flex-1 gap-2"
          >
            <Sparkles className="size-4" />
            {isLoading ? '正在选茶...' : '为我选茶'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(ThreeQuestionSection);
