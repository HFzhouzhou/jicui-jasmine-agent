import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

const questions = [
  { title: '今天想喝什么风味？', options: ['清爽茶香', '花香明显', '果味酸甜', '醇厚奶香'] },
  { title: '每杯预算是多少？', options: ['10元以内', '15元以内', '20元以内', '预算不限'] },
  { title: '甜度有什么偏好？', options: ['不指定甜度', '无糖', '三分糖', '五分糖'] },
];
function TeaPersonalityQuiz() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(['', '', '']);
  return <div className="p-5 md:p-7 space-y-6">
    <div className="flex items-start gap-3"><Leaf className="size-6 text-primary shrink-0" /><p className="text-sm text-muted-foreground leading-6">这是口味小问卷。完成后可在选茶助手中确认需求，再获取菜单推荐。</p></div>
    {questions.map((question, index) => <fieldset key={question.title}>
      <legend className="font-medium mb-3">{index + 1}. {question.title}</legend>
      <div className="grid grid-cols-2 gap-2">{question.options.map((option) => <button key={option} type="button" aria-pressed={answers[index] === option} className={`rounded-xl text-sm border px-3 py-3 transition-colors ${answers[index] === option ? 'bg-primary/10 text-primary border-primary' : 'border-border hover:border-primary/40'}`} onClick={() => setAnswers((previous) => previous.map((answer, i) => i === index ? option : answer))}>{option}</button>)}</div>
    </fieldset>)}
    <Button disabled={answers.some((answer) => !answer)} className="w-full gap-2" onClick={() => navigate(`/ai-recommend?mode=chat&q=${encodeURIComponent(`我想喝${answers[0]}的饮品，${answers[1]}，${answers[2]}。请从当前菜单里帮我选茶。`)}`)}>确认需求，去选茶<ArrowRight className="size-4" /></Button>
  </div>;
}
export default memo(TeaPersonalityQuiz);
