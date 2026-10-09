import { useState, useEffect } from 'react';
import {
  IUserProfile,
  DEFAULT_USER_PROFILE,
  SUGAR_OPTIONS,
  TEMPERATURE_OPTIONS,
  DIETARY_RESTRICTIONS,
  BUDGET_OPTIONS,
} from '@/data/userProfile';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';

const STORAGE_KEY = 'jicui_user_profile';

export function useUserProfile() {
  const [profile, setProfile] = useState<IUserProfile>(DEFAULT_USER_PROFILE);
  const [loaded, setLoaded] = useState(false);

  // 加载档案
  useEffect(() => {
    try {
      const saved = scopedStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as IUserProfile;
        setProfile({ ...DEFAULT_USER_PROFILE, ...parsed });
      }
    } catch (error) {
      logger.warn('读取茶韵档案失败:', String(error));
    }
    setLoaded(true);
  }, []);

  // 保存档案
  const saveProfile = (newProfile: IUserProfile) => {
    setProfile(newProfile);
    try {
      scopedStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (error) {
      logger.warn('保存茶韵档案失败:', String(error));
    }
  };

  // 更新单个字段
  const updateProfile = (updates: Partial<IUserProfile>) => {
    const newProfile = { ...profile, ...updates };
    saveProfile(newProfile);
  };

  // 生成档案描述文本（传给 AI prompt）
  const getProfilePrompt = (): string => {
    const parts: string[] = [];
    parts.push(`甜度偏好：${profile.sweetness}`);
    parts.push(`温度冰度偏好：${profile.temperature}`);

    if (profile.dietary.length > 0 && !profile.dietary.includes('none')) {
      const labels = profile.dietary
        .map((d) => DIETARY_RESTRICTIONS.find((r) => r.value === d)?.label || d)
        .join('、');
      parts.push(`忌口：${labels}（这些必须绝对避开，不得推荐！）`);
    }

    const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === profile.budget)?.label;
    if (budgetLabel && profile.budget !== 'unlimited') {
      parts.push(`预算区间：${budgetLabel}`);
    }

    return parts.join('；');
  };

  return {
    profile,
    loaded,
    saveProfile,
    updateProfile,
    getProfilePrompt,
  };
}
