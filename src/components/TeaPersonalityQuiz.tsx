import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ChevronLeft, Leaf, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PERSONALITY_QUIZ_QUESTIONS } from '@/data/funFeatures';
import { capabilityClient, logger, avatarImages } from '@lark-apaas/client-toolkit-lite';
import { MOCK_MENU, IDrinkItem } from '@/data/menu';
import { Image } from '@/components/ui/image';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/useUserProfile';

const PLUGIN_ID = 'jasmine_lady_drink_recommendation_1';

interface PersonalityResult {
  personalityName: string;
  personalityEn: string;
  description: string;
  drink: IDrinkItem;
  suggestion: string;
  mbtiType?: string; // 如 "INFP" / "ENFP"
  mbtiLine?: string; // MBTI 对号入座的梗
  vibeTag?: string; // 风格标签，如「清爽型」「浓郁型」
}

function TeaPersonalityQuiz() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=intro, 1..3=questions, 4=loading, 5=result
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PersonalityResult | null>(null);
  const { profile } = useUserProfile();

  const handleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // 自动下一步
    setTimeout(() => {
      if (step < PERSONALITY_QUIZ_QUESTIONS.length) {
        setStep(step + 1);
      }
    }, 300);
  };

  const handleStart = () => {
    setStep(1);
    setAnswers({});
    setResult(null);
  };

  const handleSubmit = useCallback(async () => {
    setStep(4); // loading

    const answersText = PERSONALITY_QUIZ_QUESTIONS.map(
      (q) =>
        `- ${q.question}：${q.options.find((o) => o.value === answers[q.id])?.label || ''}`
    ).join('\n');

    const menuText = MOCK_MENU.map(
      (d) =>
        `- ${d.name}（${d.nameEn}）¥${d.price} ${d.category} 关键词：${d.tags.join('、')}`
    ).join('\n');

    const prompt = `用户完成了三道选茶小测试，请根据答案为他/她推荐一款最合适的茶饮：

【用户答案】
${answersText}

【用户茶韵档案】
甜度偏好：${profile.sweetness}
温度偏好：${profile.temperature}
忌口：${profile.dietary.join('、') || '无'}
预算：${profile.budget} 元以内

【完整菜单 — 只能从以下84款中选择一款作为推荐】
${menuText}

【输出要求】
请按以下格式输出，严格按照字段：

【推荐名称】：如"清爽茉莉毛尖"这样的格式，前面是风格形容词，后面是真实饮品名
【推荐英文名】：对应英文
【推荐说明】：100字以内，平实说明为什么适合他/她，结合口味偏好和场景，不用比喻和梗
【对应饮品】：必须是菜单中真实存在的饮品全名
【定制建议】：一句话推荐甜度/温度/小料搭配
【MBTI 参考】：4 个字母，如 INFP / ENTP，根据性格倾向推断（E/I + N/S + T/F + J/P），可选
【MBTI 说明】：一句简单的性格和饮品关联说明，25字以内，可选
【风格标签】：1 个客观标签，如「清爽型」「浓郁型」「提神款」「轻负担」「性价比高」

风格参考专业茶饮店员推荐，平实直接。`;

    try {
      let full = '';
      const stream = capabilityClient
        .load(PLUGIN_ID)
        .callStream('textGenerate', { prompt });

      for await (const chunk of stream as AsyncIterable<{ content: string }>) {
        if (chunk.content) {
          full += chunk.content;
        }
      }

      // 解析结果
      const nameMatch = full.match(/【推荐名称】[：:]\s*(.+)/);
      const enMatch = full.match(/【推荐英文名】[：:]\s*(.+)/);
      const descMatch = full.match(/【推荐说明】[：:]\s*([\s\S]+?)(?=\n【|$)/);
      const drinkMatch = full.match(/【对应饮品】[：:]\s*(.+)/);
      const sugMatch = full.match(/【定制建议】[：:]\s*([\s\S]+?)(?=\n【|$)/);
      const mbtiMatch = full.match(/【MBTI 参考】[：:]\s*(.+)/);
      const mbtiLineMatch = full.match(/【MBTI 说明】[：:]\s*(.+)/);
      const vibeMatch = full.match(/【风格标签】[：:]\s*(.+)/);

      const drinkName = drinkMatch?.[1]?.trim() || '';
      const matchedDrink =
        MOCK_MENU.find((d) => d.name === drinkName) ||
        MOCK_MENU.find((d) => drinkName.includes(d.name) || d.name.includes(drinkName)) ||
        MOCK_MENU[0];

      setResult({
        personalityName: nameMatch?.[1]?.trim() || '茉莉清茶款',
        personalityEn: enMatch?.[1]?.trim() || 'Jasmine Green Tea',
        description: descMatch?.[1]?.trim() || '',
        drink: matchedDrink,
        suggestion: sugMatch?.[1]?.trim() || '',
        mbtiType: mbtiMatch?.[1]?.trim().toUpperCase() || undefined,
        mbtiLine: mbtiLineMatch?.[1]?.trim() || undefined,
        vibeTag: vibeMatch?.[1]?.trim() || undefined,
      });
      setStep(5);
    } catch (error) {
      logger.error('三题选茶失败:', String(error));
      toast.error('茉莉娘子正在煮茶，请稍后再试');
      setStep(3);
    }
  }, [answers, profile]);

  // 提交最后一题时触发 AI 生成
  const handleLastAnswer = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    setTimeout(() => handleSubmit(), 300);
  };

  const handleRetry = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  const handleTryDrink = () => {
    if (!result) return;
    const q = `我喜欢${result.personalityName}这种风格，请帮我定制${result.drink.name}的喝法`;
    navigate(`/ai-recommend?mode=chat&q=${encodeURIComponent(q)}`);
  };

  // === 渲染 ===

  // 介绍页
  if (step === 0) {
    return (
      <div className="text-center py-8 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="size-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-5 shadow-sm">
            <Sparkles className="size-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            三题帮你选一杯
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
            3 道简单小题，根据你的口味和习惯推荐一款
            <br />
            可以分享给朋友，看看他们选什么
          </p>
          <Button onClick={handleStart} className="gap-2">
            开始测试
            <ArrowRight className="size-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // 加载页
  if (step === 4) {
    return (
      <div className="text-center py-12 px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="size-16 mx-auto mb-4 text-primary"
        >
          <Leaf className="w-full h-full" />
        </motion.div>
        <p className="text-sm text-foreground font-medium">正在为你选茶...</p>
        <p className="text-xs text-muted-foreground mt-1">别急，好茶要慢慢品</p>
      </div>
    );
  }

  // 结果页
  if (step === 5 && result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="py-4"
      >
        {/* 结果卡 */}
        <div className="max-w-sm mx-auto">
          <div className="bg-gradient-to-b from-card to-primary/5 border-2 border-primary/30 rounded-2xl overflow-hidden shadow-lg">
            {/* 顶部 */}
            <div className="px-6 pt-6 pb-3 text-center">
              <div className="size-14 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <Sparkles className="size-7 text-primary" />
              </div>
              <p className="text-xs text-primary mb-1">为你推荐</p>
              <h3 className="text-2xl font-bold text-foreground mb-1">
                {result.personalityName}
              </h3>
              <p className="text-xs text-muted-foreground font-serif italic">
                {result.personalityEn}
              </p>
            </div>

            {/* 描述 + MBTI + vibe */}
            <div className="px-6 py-4 border-y border-primary/10 space-y-3">
              <p className="text-sm text-foreground leading-relaxed text-center">
                {result.description}
              </p>
              {(result.mbtiType || result.vibeTag) && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {result.mbtiType && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 text-xs font-semibold border border-violet-200">
                      ✨ {result.mbtiType} 参考
                    </span>
                  )}
                  {result.vibeTag && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                      {result.vibeTag}
                    </span>
                  )}
                </div>
              )}
              {result.mbtiLine && (
                <p className="text-xs text-muted-foreground text-center italic leading-relaxed">
                  「{result.mbtiLine}」
                </p>
              )}
            </div>

            {/* 对应饮品 */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Leaf className="size-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">对应饮品</div>
                  <div className="font-semibold text-foreground truncate">{result.drink.name}</div>
                  <div className="text-xs text-primary">¥{result.drink.price}</div>
                </div>
              </div>
              {result.suggestion && (
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed bg-primary/5 rounded-lg p-3 border border-primary/10">
                  💡 {result.suggestion}
                </p>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 space-y-2">
            <Button className="w-full gap-2" onClick={handleTryDrink}>
              <Leaf className="size-4" />
              去看看这款怎么喝
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => toast.success('已保存到相册')}
              >
                <Download className="size-3.5" />
                存图分享
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleRetry}
              >
                <Sparkles className="size-3.5" />
                再测一次
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 问题页
  const qIndex = step - 1;
  const question = PERSONALITY_QUIZ_QUESTIONS[qIndex];
  const isLast = step === PERSONALITY_QUIZ_QUESTIONS.length;

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="py-4"
    >
      {/* 进度 */}
      <div className="flex items-center gap-2 mb-5">
        {step > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 -ml-2"
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <div className="flex-1 flex gap-1.5">
          {PERSONALITY_QUIZ_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-10 text-right">
          {step}/{PERSONALITY_QUIZ_QUESTIONS.length}
        </span>
      </div>

      {/* 问题 */}
      <h3 className="text-lg font-bold text-foreground mb-4 text-center">
        {question.question}
      </h3>

      {/* 选项 */}
      <div className="space-y-2.5">
        {question.options.map((opt) => {
          const selected = answers[question.id] === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() =>
                isLast ? handleLastAnswer(question.id, opt.value) : handleSelect(question.id, opt.value)
              }
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                selected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border/60 bg-card hover:border-primary/40 hover:bg-primary/[0.03] text-foreground'
              }`}
            >
              <span className="font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default memo(TeaPersonalityQuiz);
