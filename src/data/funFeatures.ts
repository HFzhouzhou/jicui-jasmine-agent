// EXPORTS: DAILY_TEA_QUOTES, PERSONALITY_QUIZ_QUESTIONS, getDailyTeaSign, getDrinkById

import { MOCK_MENU, IDrinkItem } from './menu';

// 每日推荐配文（与饮品匹配后轮换，平实直接）
export const DAILY_TEA_QUOTES = {
  refreshing: [
    '今天气温偏高，推荐少冰少糖的清爽款',
    '饭后解腻来一杯，清润不厚重',
    '纯茶原叶，适合喜欢清淡口味的你',
    '口感清雅，下午喝不犯困也不腻',
  ],
  warm: [
    '今天降温了，推荐一杯热饮暖暖身子',
    '手脚容易凉的话，试试这款暖身茶',
    '天冷就喝热的，从喉咙暖到胃里',
    '来杯热的，喝完舒服一点',
  ],
  sweet: [
    '今天想喝点甜的，这款奶香足',
    '犒劳一下自己，甜一点也没关系',
    '喜欢奶香味的可以试试这款',
    '口感绵密，适合当下午茶',
  ],
  fruit: [
    '夏天喝果茶最解暑，冰的更爽',
    '果香浓郁，酸酸甜甜很开胃',
    '想换个口味就选果茶，清爽不腻',
    '和朋友一起喝果茶最搭',
  ],
  energizing: [
    '犯困了来一杯，提神效果不错',
    '早上通勤喝这个，能撑到中午',
    '下午要赶工，这款高咖能帮你',
    '熬夜或加班时的提神选择',
  ],
  light: [
    '怕胖就选这款，低卡无负担',
    '减脂期也能喝的轻负担选项',
    '少糖或无糖都好喝，没什么负罪感',
    '晚上喝也不怕睡不着，低咖轻乳',
  ],
};

// 根据饮品分类匹配茶语文案类型
function getQuotesCategory(drink: IDrinkItem): keyof typeof DAILY_TEA_QUOTES {
  if (drink.tags.some((t) => /提神|咖啡|解困/.test(t))) return 'energizing';
  if (drink.tags.some((t) => /暖身|姜|暖胃/.test(t))) return 'warm';
  if (drink.tags.some((t) => /低卡|零卡|清爽|冷萃|轻乳|纤体/.test(t))) return 'light';
  if (drink.category === '果茶' || drink.tags.some((t) => /果香|西瓜|芒果|荔枝|芭乐|凤梨|柠檬/.test(t)))
    return 'fruit';
  if (drink.category === '鲜奶茶·轻乳茶' || drink.tags.some((t) => /香甜|奶香|甜/.test(t)))
    return 'sweet';
  if (drink.category === '纯茶原叶' || drink.tags.some((t) => /清爽|清雅|清香|陈香/.test(t)))
    return 'refreshing';
  return 'refreshing';
}

// 根据日期计算每日茶签（确定性轮换）
export function getDailyTeaSign(date = new Date()) {
  // 用年月日作为种子，保证同一天同结果
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

  // 简单 hash：将日期映射到菜单索引
  const drinkIndex = seed % MOCK_MENU.length;
  const drink = MOCK_MENU[drinkIndex];

  // 茶语索引
  const quotesCategory = getQuotesCategory(drink);
  const quotes = DAILY_TEA_QUOTES[quotesCategory];
  const quoteIndex = Math.floor(seed / 7) % quotes.length;
  const teaPhrase = quotes[quoteIndex];

  // 日期格式化
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];

  return {
    drink,
    teaPhrase,
    dateLabel: `${month}月${day}日 ${weekday}`,
    seed,
  };
}

// 三题选茶测试题
export interface IQuizQuestion {
  id: string;
  question: string;
  options: { label: string; value: string; trait: string }[];
}

export const PERSONALITY_QUIZ_QUESTIONS: IQuizQuestion[] = [
  {
    id: 'q1',
    question: '平时喝饮料，更倾向于？',
    options: [
      { label: '清淡解渴的', value: 'home', trait: '静' },
      { label: '口味丰富的', value: 'social', trait: '动' },
      { label: '奶香浓郁的', value: 'cafe', trait: '雅' },
      { label: '提神有劲的', value: 'sport', trait: '活' },
    ],
  },
  {
    id: 'q2',
    question: '甜度你一般选？',
    options: [
      { label: '少糖/无糖', value: 'sweet', trait: '甜' },
      { label: '半糖/微糖', value: 'bitter', trait: '沉' },
      { label: '正常糖', value: 'sour', trait: '爽' },
      { label: '越甜越好', value: 'rich', trait: '暖' },
    ],
  },
  {
    id: 'q3',
    question: '一般什么时候喝？',
    options: [
      { label: '早上提神', value: 'leader', trait: '飒' },
      { label: '下午解乏', value: 'chill', trait: '柔' },
      { label: '饭后解腻', value: 'careful', trait: '温' },
      { label: '想喝就喝', value: 'adventurous', trait: '灵' },
    ],
  },
];

export function getSeasonTip() {
  const month = new Date().getMonth() + 1;
  let season = '';
  let tip = '';
  let recommendCategory = '果茶';

  if (month >= 3 && month <= 5) {
    season = '春日';
    tip = '万物复苏，宜饮清润花茶';
    recommendCategory = '纯茶原叶';
  } else if (month >= 6 && month <= 8) {
    season = '盛夏';
    tip = '烈日炎炎，宜饮冰爽果茶';
    recommendCategory = '果茶';
  } else if (month >= 9 && month <= 11) {
    season = '金秋';
    tip = '秋高气爽，宜饮醇厚暖茶';
    recommendCategory = '鲜奶茶·轻乳茶';
  } else {
    season = '暖冬';
    tip = '天寒地冻，宜饮温润热饮';
    recommendCategory = '鲜奶茶·轻乳茶';
  }

  return { season, tip, recommendCategory, month };
}

export function getDrinkById(id: string): IDrinkItem | undefined {
  return MOCK_MENU.find((d) => d.id === id);
}
