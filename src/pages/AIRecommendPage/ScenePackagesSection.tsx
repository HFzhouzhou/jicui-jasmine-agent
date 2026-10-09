import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Heart,
  Leaf,
  Sun,
  Flame,
  Sparkles,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SCENE_PACKAGES = [
  {
    id: 'study',
    name: '提神顶班套餐',
    desc: '提神 + 低负担，工作学习顶得住',
    icon: BookOpen,
    color: 'from-amber-500/20 to-orange-500/20',
    textColor: 'text-amber-700',
  },
  {
    id: 'date',
    name: '约会双人套餐',
    desc: '颜值高 + 可分享，拍照好看',
    icon: Heart,
    color: 'from-rose-400/20 to-pink-400/20',
    textColor: 'text-rose-600',
  },
  {
    id: 'fitness',
    name: '减脂轻体套餐',
    desc: '低卡 + 果蔬能量，轻盈无负担',
    icon: Leaf,
    color: 'from-emerald-400/20 to-teal-400/20',
    textColor: 'text-emerald-600',
  },
  {
    id: 'cool',
    name: '解暑生津套餐',
    desc: '冰爽果茶，一口降温 5 度',
    icon: Sun,
    color: 'from-sky-400/20 to-cyan-400/20',
    textColor: 'text-sky-600',
  },
  {
    id: 'warm',
    name: '暖冬驱寒套餐',
    desc: '热饮 + 姜茶/六堡，从内暖到外',
    icon: Flame,
    color: 'from-orange-400/20 to-red-400/20',
    textColor: 'text-orange-600',
  },
];

interface ScenePackagesProps {
  onSelect: (packageId: string, packageName: string) => void;
  isLoading?: boolean;
  loadingPackage?: string;
}

function ScenePackages({ onSelect, isLoading, loadingPackage }: ScenePackagesProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-lg font-bold text-foreground">场景套餐速配</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          一键匹配特定场景的精选搭配
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCENE_PACKAGES.map((pkg, idx) => {
          const Icon = pkg.icon;
          const isLoadingThis = isLoading && loadingPackage === pkg.id;
          return (
            <motion.button
              key={pkg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onClick={() => onSelect(pkg.id, pkg.name)}
              disabled={isLoading && loadingPackage !== pkg.id}
              className={`group relative p-4 rounded-xl border text-left transition-all duration-200 overflow-hidden
                ${isLoadingThis ? 'border-primary bg-primary/5' : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-40 group-hover:opacity-60 transition-opacity`}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`size-9 rounded-lg bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-sm`}
                  >
                    <Icon className={`size-5 ${pkg.textColor}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {pkg.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {pkg.desc}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs border-border/60 hover:border-primary/40"
                  disabled={isLoading}
                >
                  {isLoadingThis ? (
                    <>
                      <Clock className="size-3 mr-1 animate-spin" />
                      搭配中...
                    </>
                  ) : (
                    <>一键生成</>
                  )}
                </Button>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ScenePackages);
