import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X } from 'lucide-react';
import { IDrinkItem } from '@/data/menu';

interface DrinkDetailDialogProps {
  drink: IDrinkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DrinkDetailDialog({ drink, open, onOpenChange }: DrinkDetailDialogProps) {
  const navigate = useNavigate();

  if (!drink) return null;

  const handleRecommend = () => {
    onOpenChange(false);
    navigate(`/ai-recommend?mode=chat&drink=${encodeURIComponent(drink.name)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-primary/30 text-primary text-[10px]">
                {drink.category}
              </Badge>
              <DialogTitle className="text-xl font-bold">{drink.name}</DialogTitle>
              <DialogDescription className="font-serif italic text-sm mt-1">
                {drink.nameEn}
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">¥{drink.price}</div>
              <div className="text-xs text-muted-foreground">{drink.volume}</div>
            </div>
          </div>
        </DialogHeader>

        {/* 饮品图占位 */}
        <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/10 flex items-center justify-center">
          <div className="text-6xl opacity-40">🍵</div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">口味特点</h4>
            <div className="flex flex-wrap gap-1.5">
              {drink.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">饮品简介</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {drink.description}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-1"
          >
            <X className="size-4" />
            关闭
          </Button>
          <Button onClick={handleRecommend} className="gap-1.5">
            <Sparkles className="size-4" />
            让茉莉娘子推荐喝法
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(DrinkDetailDialog);
