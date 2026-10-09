import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Coffee,
  Target,
  Sunset,
  Tv,
  UsersRound,
  Heart,
  PartyPopper,
  CoffeeIcon,
} from 'lucide-react';

export interface YoungScene {
  id: string;
  label: string;
  icon: typeof Coffee;
  color: string; // tailwind bg class
  emoji: string;
  demand: string; // 发给 AI 的场景描述
}

export const YOUNG_SCENES: YoungScene[] = [
  {
    id: 'morning',
    label: '早八提神',
    icon: Coffee,
    color: 'from-amber-100 to-orange-100 text-amber-700',
    emoji: '☕',
    demand:
      '早上通勤或赶课，需要一杯提神的。快取方便，喝了能撑到中午不困，价格亲民。',
  },
  {
    id: 'focus',
    label: '工作学习',
    icon: Target,
    color: 'from-emerald-100 to-teal-100 text-emerald-700',
    emoji: '🎯',
    demand:
      '工作或学习时喝，需要提神但别太猛，不然晚上睡不着。轻负担不齁甜，大容量能喝一下午，性价比高。',
  },
  {
    id: 'offwork',
    label: '下班放松',
    icon: Sunset,
    color: 'from-orange-100 to-rose-100 text-orange-700',
    emoji: '🌇',
    demand:
      '下班了，想喝一杯犒劳一下自己。口味随意，好喝就行，有点特色更好。',
  },
  {
    id: 'drama',
    label: '追剧休闲',
    icon: Tv,
    color: 'from-pink-100 to-rose-100 text-pink-700',
    emoji: '🍿',
    demand:
      '追剧或休闲时喝，清爽不腻口，可以加小料慢慢喝，不要太撑。',
  },
  {
    id: 'friends',
    label: '朋友一起',
    icon: UsersRound,
    color: 'from-violet-100 to-purple-100 text-violet-700',
    emoji: '👯',
    demand:
      '和朋友 2-3 人一起点，要好喝不踩雷的组合，口味多样，每杯都标好价。',
  },
  {
    id: 'chill',
    label: '想喝点甜的',
    icon: Heart,
    color: 'from-rose-100 to-pink-100 text-rose-700',
    emoji: '💗',
    demand:
      '今天有点累或心情不好，想喝一杯甜一点暖一点的，允许自己甜一下。',
  },
  {
    id: 'celebrate',
    label: '庆祝一下',
    icon: PartyPopper,
    color: 'from-yellow-100 to-amber-100 text-yellow-700',
    emoji: '🎉',
    demand:
      '今天过节或想庆祝一下，要颜值高、有特色的款，拍照好看的优先。',
  },
];

interface YoungScenesStripProps {
  onSelect?: (scene: YoungScene) => void;
  variant?: 'home' | 'ai';
}

export default function YoungScenesStrip({
  onSelect,
  variant = 'home',
}: YoungScenesStripProps) {
  const navigate = useNavigate();

  const handleClick = (scene: YoungScene) => {
    if (onSelect) {
      onSelect(scene);
    } else {
       navigate(`/ai-recommend?mode=chat&q=${encodeURIComponent(scene.demand)}`);
    }
  };

  return (
    <div className="w-full">
      {variant === 'home' && (
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="text-sm font-semibold text-foreground">
            按场景选一杯
          </span>
          <span className="text-xs text-muted-foreground">
            一键生成，直接点单
          </span>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {YOUNG_SCENES.map((scene, i) => {
          const Icon = scene.icon;
          return (
            <motion.button
              key={scene.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleClick(scene)}
              className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br ${scene.color} px-4 py-3 w-[78px] transition-shadow hover:shadow-md`}
            >
              <span className="text-lg leading-none">{scene.emoji}</span>
              <Icon className="size-4" />
              <span className="text-[11px] font-medium leading-tight">
                {scene.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
