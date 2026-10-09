import { useState, useEffect, useCallback } from 'react';
import { type IUserProfile, DEFAULT_USER_PROFILE, SUGAR_OPTIONS, TEMPERATURE_OPTIONS, DIETARY_RESTRICTIONS, BUDGET_OPTIONS } from '@/data/userProfile';
import { readStoredJson, writeStoredJson, subscribeStorage, safeStorage } from '@/lib/storage';

const STORAGE_KEY = 'jicui_user_profile';

function isProfile(value: unknown): value is IUserProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as IUserProfile;
  return SUGAR_OPTIONS.includes(profile.sweetness) && TEMPERATURE_OPTIONS.includes(profile.temperature)
    && BUDGET_OPTIONS.some((item) => item.value === profile.budget)
    && Array.isArray(profile.dietary)
    && profile.dietary.every((item) => DIETARY_RESTRICTIONS.some((restriction) => restriction.value === item));
}

const readProfile = () => readStoredJson(STORAGE_KEY, DEFAULT_USER_PROFILE, isProfile);

export function useUserProfile() {
  const [profile, setProfile] = useState<IUserProfile>(readProfile);
  useEffect(() => {
    const unsubscribe = subscribeStorage(STORAGE_KEY, () => setProfile(readProfile()));
    setProfile(readProfile());
    return unsubscribe;
  }, []);

  const saveProfile = useCallback((newProfile: IUserProfile) => {
    if (!isProfile(newProfile)) return;
    const dietary = [...new Set(newProfile.dietary.filter((value) => value !== 'none'))];
    writeStoredJson(STORAGE_KEY, { ...newProfile, dietary });
  }, []);

  const updateProfile = useCallback((updates: Partial<IUserProfile>) => {
    saveProfile({ ...readProfile(), ...updates });
  }, [saveProfile]);

  const clearProfile = useCallback(() => safeStorage.removeItem(STORAGE_KEY), []);

  const getProfilePrompt = useCallback(() => {
    const parts = [`甜度偏好：${profile.sweetness}`, `温度偏好：${profile.temperature}`];
    const restrictions = profile.dietary.filter((value) => value !== 'none');
    if (restrictions.length) {
      parts.push(`饮用限制：${restrictions.map((value) => DIETARY_RESTRICTIONS.find((item) => item.value === value)?.label).join('、')}；配料信息不明确时请说明无法确认，不要猜测`);
    }
    const budget = BUDGET_OPTIONS.find((item) => item.value === profile.budget);
    if (budget && profile.budget !== 'unlimited') parts.push(`预算：${budget.label}`);
    return parts.join('；');
  }, [profile]);

  return { profile, loaded: true, saveProfile, updateProfile, clearProfile, getProfilePrompt };
}
