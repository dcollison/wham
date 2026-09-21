import { Boulder } from '../types';

/**
 * Reset status helper functions.
 * Gym boulders/areas typically get reset on a 6-8 week cycle.
 * Boulders/areas 6 weeks (42 days) or older are flagged as "due for reset" / "reset soon".
 */
export const RESET_THRESHOLD_DAYS = 42; // 6 weeks (42 days)

export interface ResetAgeInfo {
  ageDays: number;
  weeksOld: number;
  isDueForReset: boolean;
  formattedAge: string;
}

/**
 * Safely computes the age in days and weeks from a date_added string (YYYY-MM-DD or ISO).
 */
export function getBoulderAgeInfo(dateAddedStr?: string | null, nowMs: number = Date.now()): ResetAgeInfo {
  if (!dateAddedStr) {
    return { ageDays: 0, weeksOld: 0, isDueForReset: false, formattedAge: '' };
  }

  // Parse YYYY-MM-DD safely
  const parts = dateAddedStr.split('T')[0].split('-').map(Number);
  let addedMs: number;
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    addedMs = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  } else {
    addedMs = new Date(dateAddedStr).getTime();
  }

  if (isNaN(addedMs)) {
    return { ageDays: 0, weeksOld: 0, isDueForReset: false, formattedAge: '' };
  }

  const diffMs = Math.max(0, nowMs - addedMs);
  const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeksOld = Math.floor(ageDays / 7);
  const isDueForReset = ageDays >= RESET_THRESHOLD_DAYS;

  let formattedAge = '';
  if (weeksOld >= 1) {
    formattedAge = `${weeksOld}w`;
  } else {
    formattedAge = `${ageDays}d`;
  }

  return {
    ageDays,
    weeksOld,
    isDueForReset,
    formattedAge
  };
}

/**
 * Computes reset information for an entire gym area based on its active (non-archived) boulders.
 * The area age is defined by the oldest active boulder in the current set.
 */
export function getAreaResetInfo(areaId: string, boulders: Boulder[], nowMs: number = Date.now()): ResetAgeInfo {
  const activeBoulders = boulders.filter((b) => b.area_id === areaId && !b.is_archived);
  if (activeBoulders.length === 0) {
    return { ageDays: 0, weeksOld: 0, isDueForReset: false, formattedAge: '' };
  }

  let maxAgeDays = 0;
  for (const b of activeBoulders) {
    const info = getBoulderAgeInfo(b.date_added, nowMs);
    if (info.ageDays > maxAgeDays) {
      maxAgeDays = info.ageDays;
    }
  }

  const weeksOld = Math.floor(maxAgeDays / 7);
  const isDueForReset = maxAgeDays >= RESET_THRESHOLD_DAYS;

  let formattedAge = '';
  if (weeksOld >= 1) {
    formattedAge = `${weeksOld}w`;
  } else {
    formattedAge = `${maxAgeDays}d`;
  }

  return {
    ageDays: maxAgeDays,
    weeksOld,
    isDueForReset,
    formattedAge
  };
}
