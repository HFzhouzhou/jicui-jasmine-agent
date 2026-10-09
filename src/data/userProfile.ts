// EXPORTS: IUserProfile, DEFAULT_USER_PROFILE, SUGAR_OPTIONS, ICE_OPTIONS, DIETARY_RESTRICTIONS, BUDGET_OPTIONS, HEALTH_GOALS

export interface IUserProfile {
  sweetness: string; // 甜度偏好
  temperature: string; // 温度冰度偏好
  dietary: string[]; // 忌口
  budget: string; // 预算区间
}

export const SUGAR_OPTIONS = [
  '不限',
  '无糖',
  '三分糖',
  '五分糖',
  '七分糖',
  '全糖',
];

export const TEMPERATURE_OPTIONS = [
  '不限',
  '常温',
  '温饮',
  '热饮',
  '去冰',
  '少冰',
  '正常冰',
  '多冰',
];

export const DIETARY_RESTRICTIONS = [
  { value: 'caffeine_free', label: '避开咖啡因', desc: '茶和咖啡都可能含咖啡因，需核实原料' },
  { value: 'lactose_intolerant', label: '避开乳制品', desc: '根据核实后的配料与过敏原信息筛选' },
  { value: 'no_cold', label: '不喝冰饮', desc: '需确认饮品支持热饮或常温' },
  { value: 'no_ginger', label: '姜味避雷', desc: '避开含姜饮品' },
  { value: 'none', label: '暂无限制', desc: '未设置饮用限制' },
];

export const BUDGET_OPTIONS = [
  { value: 'under10', label: '10 元内', desc: '极致性价比' },
  { value: '10to15', label: '10-15 元', desc: '日常口粮' },
  { value: '15to20', label: '15-20 元', desc: '品质之选' },
  { value: 'unlimited', label: '不限', desc: '好喝最重要' },
];

export const HEALTH_GOALS = [
  { value: 'none', label: '无特殊诉求', icon: '🌸' },
  { value: 'warm', label: '想喝热的', icon: '🔥' },
  { value: 'light', label: '口味清淡', icon: '🍃' },
  { value: 'awake', label: '偏爱茶味', icon: '⚡' },
  { value: 'gentle', label: '口感柔和', icon: '🌿' },
  { value: 'cool', label: '口感清爽', icon: '❄️' },
];

export const DEFAULT_USER_PROFILE: IUserProfile = {
  sweetness: '不限',
  temperature: '不限',
  dietary: [],
  budget: 'unlimited',
};
