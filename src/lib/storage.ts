/**
 * Consolidated LocalStorage Key Names and Typed Storage Helpers for Wham.
 */

export const STORAGE_KEYS = {
  GYMS: 'wham_gyms',
  AREAS: 'wham_areas',
  BOULDERS: 'wham_boulders',
  ATTEMPTS: 'wham_attempts',
  COMMENTS: 'wham_comments',
  PROPS: 'wham_sends_props',
  ACTIVE_GYM: 'wham_active_gym_id',
  ACTIVE_PROFILE: 'wham_active_profile_id',
  PASSCODE_UNLOCKED: 'wham_passcode_unlocked',
  SHOW_ACCOLADES: 'wham_show_accolades',
  SNAPSHOTS_META: 'wham_snapshots_meta',
  LAST_VIEWED_FEED: 'wham_last_viewed_feed_time'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | string;

export function getStorageJson<T>(key: StorageKey, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Error reading localStorage key "${key}":`, err);
    return fallback;
  }
}

export function setStorageJson<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error setting localStorage key "${key}":`, err);
  }
}

export function getStorageString(key: StorageKey, fallback = ''): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setStorageString(key: StorageKey, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`Error setting string for localStorage key "${key}":`, err);
  }
}

export function removeStorageItem(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Error removing localStorage key "${key}":`, err);
  }
}
