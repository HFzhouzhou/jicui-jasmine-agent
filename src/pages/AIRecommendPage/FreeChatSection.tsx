import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { avatarImages } from '@lark-apaas/client-toolkit-lite';
import { Image } from '@/components/ui/image';
import { getRandomLoadingPhrase, getTimeGreeting } from '@/data/experience';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FreeChatSectionProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  messages: ChatMessage[];
}

function FreeChatSection({ onSubmit, isLoading, messages }: FreeChatSectionProps) {
  const [input, setInput] = useState('');
  const [loadingPhrase, setLoadingPhrase] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeGreeting = getTimeGreeting();

  useEffect(() => {
    if (isLoading) {
      setLoadingPhrase(getRandomLoadingPhrase());
    }
  }, [isLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
    setInput('');
  };

  const suggestions = [
    '我在减脂，想喝不超过15块的清爽果茶',
    '考研下午犯困，想喝杯提神的',
    '来杯热的，能暖肚子的',
    '约会拍照，要颜值高的',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 欢迎语（无消息时） */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="size-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
            <Image
              src={avatarImages.avatarImg1}
              alt="茉莉娘子"
              className="size-12 rounded-full object-cover"
            />
          </div>
           <h3 className="font-semibold text-foreground">{timeGreeting.greeting}，我是茉莉娘子</h3>
           <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
               {timeGreeting.tip}，说说你想喝什么
            </p>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSubmit(s)}
                className="px-3 py-1.5 text-xs rounded-full bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <Image
                  src={avatarImages.avatarImg1}
                  alt="茉莉娘子"
                  className="size-8 rounded-full object-cover mr-2 shrink-0 mt-0.5"
                />
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 加载中 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <Image
              src={avatarImages.avatarImg1}
              alt="茉莉娘子"
              className="size-8 rounded-full object-cover mr-2 shrink-0"
            />
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="size-4 text-primary animate-spin shrink-0" />
                 <span className="text-sm text-muted-foreground">{loadingPhrase || '正在为你选茶...'}</span>
              </div>
          </motion.div>
        )}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-border/40">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="和茉莉娘子说说你想喝什么..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default memo(FreeChatSection);
