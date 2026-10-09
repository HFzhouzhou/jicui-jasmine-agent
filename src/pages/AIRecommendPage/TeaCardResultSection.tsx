import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import TeaCard, { ITeaCardData } from '@/components/TeaCard';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';

const PRODUCT_IMG = '/spark/app/app_17dszc02xwh/runtime/api/v1/storage/object/bucket_aadkufch4uwag_static/static%2Faadkue6azakhw_ve_miaoda';

interface TeaCardResultSectionProps {
  mainCard: ITeaCardData | null;
  altCards: ITeaCardData[];
  isLoading: boolean;
  onRefresh: () => void;
  onAskMore: () => void;
  onStart: () => void;
  onConfirm?: (card: ITeaCardData) => void;
  onNameChange?: (name: string, style: 'elegant' | 'fun') => void;
}

function TeaCardResultSection({
  mainCard,
  altCards,
  isLoading,
  onRefresh,
  onAskMore,
  onStart,
  onConfirm,
  onNameChange,
}: TeaCardResultSectionProps) {
  // 空态：还没开始选茶
  const isEmpty = !mainCard && !isLoading;

  if (isEmpty) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="relative mb-6">
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden shadow-xl border-4 border-background">
            <Image
              src={PRODUCT_IMG}
              alt="茉莉茶饮"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Sparkles className="size-5" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-foreground">选一杯合适的</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          从 84 款真实饮品中，
          <br />
          帮你挑一款最合适的。
        </p>
        <Button onClick={onStart} className="mt-6 gap-2">
          开始选茶
          <ChevronRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {mainCard && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <TeaCard
               data={mainCard}
               onRefresh={onRefresh}
               onAskMore={onAskMore}
               onConfirm={onConfirm ? () => onConfirm(mainCard) : undefined}
               onNameChange={onNameChange}
             />
          </motion.div>
        )}
      </AnimatePresence>

      {altCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border/60" />
            <span>备选推荐</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {altCards.map((card, i) => (
                <motion.div
                  key={card.drinkName + i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                >
                  <TeaCard data={card} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TeaCardResultSection);
