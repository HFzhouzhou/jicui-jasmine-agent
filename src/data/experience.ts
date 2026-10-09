// EXPORTS: getTimeGreeting, getSeasonTip, LOADING_PHRASES, QUICK_QUESTIONS

import { MOCK_MENU } from './menu';

// 根据当前时段返回问候语
export function getTimeGreeting(): { greeting: string; tip: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return {
      greeting: '早上好',
      tip: '新的一天，从一杯茉莉香开始',
    };
  }
  if (hour >= 11 && hour < 14) {
    return {
      greeting: '中午好',
      tip: '饭后解腻，来杯清爽的吧',
    };
  }
  if (hour >= 14 && hour < 18) {
    return {
      greeting: '下午好',
      tip: '下午茶时间，别让自己犯困',
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      greeting: '晚上好',
      tip: '辛苦了一天，喝杯茶放松一下',
    };
  }
  return {
    greeting: '夜深了',
    tip: '熬夜伤身，给你选杯温和的',
  };
}

// 根据当前月份返回应季提示
export function getSeasonTip(): { season: string; tip: string; recommendCategory: string; icon: string } {
  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 6 && month <= 8) {
    return {
      season: '盛夏时令',
      tip: '天气炎热，来杯冰爽果茶解解暑',
      recommendCategory: '果茶',
      icon: '☀️',
    };
  }
  if (month >= 11 || month <= 2) {
    return {
      season: '凛冬暖心',
      tip: '天寒地冻，来杯热饮暖暖身子',
      recommendCategory: '其他特色',
      icon: '🔥',
    };
  }
  if (month === 3 || month === 4 || month === 5) {
    return {
      season: '春日限定',
      tip: '万物复苏，来杯清甜花茶感受春意',
      recommendCategory: '纯茶原叶',
      icon: '🌸',
    };
  }
  // 9-10月 秋季
  return {
    season: '秋高气爽',
    tip: '天凉好个秋，醇厚陈香正当时',
    recommendCategory: '鲜奶茶·轻乳茶',
    icon: '🍂',
  };
}

// AI 加载文案（轮换）
export const LOADING_PHRASES = [
  '正在从 84 款茶饮中为你挑选...',
  '稍等，马上就好',
  '正在为你匹配最合适的一款...',
  '根据你的口味筛选中...',
  '找找看还有什么合适的',
  '在菜单里为你寻味...',
];

// 首页"试试这样问"快捷问题
export const QUICK_QUESTIONS = [
  '下午犯困，想喝杯提神的',
  '想喝热的，能暖肚子的',
  '减脂低卡推荐，不超过15块',
  '和朋友一起喝，要颜值高点的果茶',
];

export function getRandomLoadingPhrase(): string {
  return LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
}
