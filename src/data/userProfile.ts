// EXPORTS: IUserProfile, DEFAULT_USER_PROFILE, SUGAR_OPTIONS, ICE_OPTIONS, DIETARY_RESTRICTIONS, BUDGET_OPTIONS, HEALTH_GOALS

export interface IUserProfile {
  sweetness: string; // 甜度偏好
  temperature: string; // 温度冰度偏好
  dietary: string[]; // 忌口
  budget: string; // 预算区间
}

export const SUGAR_OPTIONS = [
  '无糖',
  '三分糖',
  '五分糖',
  '七分糖',
  '全糖',
];

export const TEMPERATURE_OPTIONS = [
  '热饮',
  '去冰',
  '少冰',
  '正常冰',
  '多冰',
];

export const DIETARY_RESTRICTIONS = [
  { value: 'caffeine_free', label: '咖啡因敏感', desc: '避开咖啡/美式/拿铁类' },
  { value: 'lactose_intolerant', label: '乳糖不耐', desc: '避开鲜奶/奶昔/生椰/奶酪类' },
  { value: 'no_cold', label: '经期/孕期避冰', desc: '只推热饮或常温' },
  { value: 'no_ginger', label: '姜味避雷', desc: '避开含姜饮品' },
  { value: 'none', label: '无忌口', desc: '什么都能喝' },
];

export const BUDGET_OPTIONS = [
  { value: 'under10', label: '10 元内', desc: '极致性价比' },
  { value: '10to15', label: '10-15 元', desc: '日常口粮' },
  { value: '15to20', label: '15-20 元', desc: '品质之选' },
  { value: 'unlimited', label: '不限', desc: '好喝最重要' },
];

export const HEALTH_GOALS = [
  { value: 'none', label: '无特殊诉求', icon: '🌸' },
  { value: 'warm', label: '暖身驱寒', icon: '🔥' },
  { value: 'light', label: '低卡轻体', icon: '🍃' },
  { value: 'awake', label: '熬夜提神', icon: '⚡' },
  { value: 'gentle', label: '肠胃温和', icon: '🌿' },
  { value: 'cool', label: '解暑生津', icon: '❄️' },
];

export const DEFAULT_USER_PROFILE: IUserProfile = {
  sweetness: '五分糖',
  temperature: '少冰',
  dietary: [],
  budget: '10to15',
};
