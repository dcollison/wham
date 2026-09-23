import { Boulder, Attempt, Profile, Gym, Grade, GRADES } from '../types';

/**
 * Standard bouldering competition base point values per grade.
 * Scales intuitively with difficulty.
 */
export const GRADE_BASE_POINTS: Record<Grade, number> = {
  VB: 50,
  V0: 100,
  V1: 200,
  V2: 300,
  V3: 400,
  V4: 500,
  V5: 600,
  V6: 700,
  V7: 800,
  V8: 900,
  V9: 1000,
  'V10+': 1200
};

/**
 * Flash bonus multiplier: +25% bonus points on first-try sends
 */
export const FLASH_BONUS_MULTIPLIER = 0.25;

export interface BoulderCompResult {
  boulder: Boulder;
  grade: Grade;
  basePoints: number;
  flashBonus: number;
  totalPoints: number;
  isFlash: boolean;
  attemptsCount: number;
  loggedAt?: string;
}

export interface ClimberCompStanding {
  climber: Profile;
  rank: number;
  totalPoints: number;
  basePoints: number;
  flashBonusPoints: number;
  topsCount: number;
  flashesCount: number;
  attemptsOnTops: number;
  hardestSend: Grade | null;
  pointsPercentage: number; // % of total available points in this gym
  completionPercentage: number; // % of total active boulders topped
  toppedBoulders: BoulderCompResult[];
}

export interface CompMonthInfo {
  key: string; // '2026-09'
  year: number;
  month: number; // 1-12
  label: string; // 'September 2026'
  shortLabel: string; // 'Sep 2026'
  isCurrent: boolean;
  daysRemaining?: number;
}

/**
 * Get info for the current calendar month
 */
export function getCurrentCompMonth(): CompMonthInfo {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const dateObj = new Date(year, month - 1, 1);
  const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const shortLabel = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });

  // Days remaining until end of the month
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(0, lastDayOfMonth - currentDay);

  return {
    key,
    year,
    month,
    label,
    shortLabel,
    isCurrent: true,
    daysRemaining
  };
}

/**
 * Extract all distinct calendar months containing attempts, ordered newest first.
 * Always includes the current month.
 */
export function getAvailableCompMonths(attempts: Attempt[]): CompMonthInfo[] {
  const current = getCurrentCompMonth();
  const monthMap = new Map<string, { year: number; month: number }>();
  monthMap.set(current.key, { year: current.year, month: current.month });

  attempts.forEach((a) => {
    if (!a.logged_at) return;
    const d = new Date(a.logged_at);
    if (isNaN(d.getTime())) return;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { year, month });
    }
  });

  const sortedKeys = Array.from(monthMap.keys()).sort().reverse();

  return sortedKeys.map((key) => {
    const { year, month } = monthMap.get(key)!;
    const isCurrent = key === current.key;
    const dateObj = new Date(year, month - 1, 1);
    const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const shortLabel = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });

    return {
      key,
      year,
      month,
      label,
      shortLabel,
      isCurrent,
      daysRemaining: isCurrent ? current.daysRemaining : undefined
    };
  });
}

export interface GymCompLeaderboardData {
  gymId: string;
  gymName: string;
  activeBouldersCount: number;
  totalPossiblePoints: number; // Maximum possible points if all active boulders are flashed
  totalBasePoints: number; // Maximum base points if all active boulders are topped
  standings: ClimberCompStanding[];
  monthInfo?: CompMonthInfo;
  isMonthly: boolean;
}

/**
 * Calculate comp points for a single boulder send.
 */
export function calculateBoulderCompPoints(
  grade: Grade,
  isFlash: boolean
): { basePoints: number; flashBonus: number; totalPoints: number } {
  const basePoints = GRADE_BASE_POINTS[grade] ?? 100;
  const flashBonus = isFlash ? Math.round(basePoints * FLASH_BONUS_MULTIPLIER) : 0;
  return {
    basePoints,
    flashBonus,
    totalPoints: basePoints + flashBonus
  };
}

/**
 * Compute competition leaderboard standings for a gym or across all gyms.
 * Supports:
 * - 'current': Current active monthly competition (default)
 * - 'YYYY-MM': Specific past or active month competition (e.g. '2026-08')
 * - 'active_set': All active (non-archived) boulders currently set in the gym
 */
export function computeGymCompLeaderboard(
  gymId: string, // 'all' or specific gym id
  gyms: Gym[],
  boulders: Boulder[],
  attempts: Attempt[],
  climbers: Profile[],
  monthKey: string = 'current'
): GymCompLeaderboardData {
  const gymObj = gyms.find((g) => g.id === gymId);
  const gymName = gymId === 'all' ? 'All Gyms' : (gymObj?.name || 'Current Gym');

  const isMonthly = monthKey !== 'active_set';
  let monthInfo: CompMonthInfo | undefined = undefined;

  // 1. Resolve boulders and attempts based on mode
  let activeBoulders: Boulder[] = [];
  let attemptsToScore: Attempt[] = [];

  const gymBoulders = boulders.filter(
    (b) => (gymId === 'all' || b.gym_id === gymId) && !b.is_comp
  );
  const gymBoulderMap = new Map<string, Boulder>();
  gymBoulders.forEach((b) => gymBoulderMap.set(b.id, b));

  if (!isMonthly) {
    // Mode A: Active Wall Set (Only non-archived boulders currently on the wall)
    activeBoulders = gymBoulders.filter((b) => !b.is_archived);
    attemptsToScore = attempts;
  } else {
    // Mode B: Monthly Competition
    const currentMonth = getCurrentCompMonth();
    const targetKey = monthKey === 'current' ? currentMonth.key : monthKey;
    const isCurrent = targetKey === currentMonth.key;

    const [yStr, mStr] = targetKey.split('-');
    const year = parseInt(yStr, 10) || currentMonth.year;
    const month = parseInt(mStr, 10) || currentMonth.month;
    const dateObj = new Date(year, month - 1, 1);

    monthInfo = {
      key: targetKey,
      year,
      month,
      label: dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      shortLabel: dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      isCurrent,
      daysRemaining: isCurrent ? currentMonth.daysRemaining : undefined
    };

    // Filter attempts logged within this calendar month
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    attemptsToScore = attempts.filter((a) => {
      if (!a.logged_at) return false;
      const d = new Date(a.logged_at);
      return d >= startOfMonth && d <= endOfMonth;
    });

    // In-scope boulders for this month:
    // Any boulder topped this month + (if current month) all currently active boulders in the gym
    const monthBoulderIds = new Set<string>();
    if (isCurrent) {
      gymBoulders.filter((b) => !b.is_archived).forEach((b) => monthBoulderIds.add(b.id));
    }
    attemptsToScore.forEach((a) => {
      if ((a.status === 'sent' || a.status === 'flashed') && gymBoulderMap.has(a.boulder_id)) {
        monthBoulderIds.add(a.boulder_id);
      }
    });

    activeBoulders = Array.from(monthBoulderIds)
      .map((id) => gymBoulderMap.get(id)!)
      .filter(Boolean);
  }

  const activeBoulderMap = new Map<string, Boulder>();
  activeBoulders.forEach((b) => activeBoulderMap.set(b.id, b));

  // 2. Compute maximum available points in this set
  let totalBasePoints = 0;
  let totalPossiblePoints = 0;

  activeBoulders.forEach((b) => {
    const { basePoints, totalPoints } = calculateBoulderCompPoints(b.grade, true);
    totalBasePoints += basePoints;
    totalPossiblePoints += totalPoints;
  });

  // 3. Compute each climber's comp score
  const standings: ClimberCompStanding[] = climbers.map((climber) => {
    // Find all completed attempts by this climber on in-scope boulders
    const climberAttempts = attemptsToScore.filter(
      (a) =>
        a.user_id === climber.id &&
        activeBoulderMap.has(a.boulder_id) &&
        (a.status === 'sent' || a.status === 'flashed')
    );

    // If there are multiple attempts on the same boulder, pick the best one (flashed > sent, lowest attempts)
    const bestAttemptPerBoulder = new Map<string, Attempt>();
    climberAttempts.forEach((a) => {
      const existing = bestAttemptPerBoulder.get(a.boulder_id);
      if (!existing) {
        bestAttemptPerBoulder.set(a.boulder_id, a);
      } else {
        if (a.status === 'flashed' && existing.status !== 'flashed') {
          bestAttemptPerBoulder.set(a.boulder_id, a);
        } else if (
          a.status === existing.status &&
          a.attempt_count > 0 &&
          a.attempt_count < existing.attempt_count
        ) {
          bestAttemptPerBoulder.set(a.boulder_id, a);
        }
      }
    });

    const toppedBoulders: BoulderCompResult[] = [];
    let climberTotalPoints = 0;
    let climberBasePoints = 0;
    let climberFlashBonus = 0;
    let climberFlashesCount = 0;
    let attemptsOnTops = 0;
    let hardestSend: Grade | null = null;
    let hardestSendIdx = -1;

    bestAttemptPerBoulder.forEach((attempt, boulderId) => {
      const boulder = activeBoulderMap.get(boulderId);
      if (!boulder) return;

      const isFlash = attempt.status === 'flashed' || attempt.attempt_count === 1;
      const { basePoints, flashBonus, totalPoints } = calculateBoulderCompPoints(
        boulder.grade,
        isFlash
      );

      climberTotalPoints += totalPoints;
      climberBasePoints += basePoints;
      climberFlashBonus += flashBonus;
      attemptsOnTops += Math.max(attempt.attempt_count, 1);

      if (isFlash) {
        climberFlashesCount += 1;
      }

      const gIdx = GRADES.indexOf(boulder.grade);
      if (gIdx > hardestSendIdx) {
        hardestSendIdx = gIdx;
        hardestSend = boulder.grade;
      }

      toppedBoulders.push({
        boulder,
        grade: boulder.grade,
        basePoints,
        flashBonus,
        totalPoints,
        isFlash,
        attemptsCount: attempt.attempt_count,
        loggedAt: attempt.logged_at
      });
    });

    // Sort topped boulders by grade (highest first), then flash, then points
    toppedBoulders.sort((a, b) => {
      const gDiff = GRADES.indexOf(b.grade) - GRADES.indexOf(a.grade);
      if (gDiff !== 0) return gDiff;
      if (a.isFlash !== b.isFlash) return a.isFlash ? -1 : 1;
      return b.totalPoints - a.totalPoints;
    });

    const topsCount = toppedBoulders.length;
    const completionPercentage =
      activeBoulders.length > 0
        ? Math.round((topsCount / activeBoulders.length) * 100)
        : 0;
    const pointsPercentage =
      totalPossiblePoints > 0
        ? Math.round((climberTotalPoints / totalPossiblePoints) * 100)
        : 0;

    return {
      climber,
      rank: 1, // temporary, assigned below
      totalPoints: climberTotalPoints,
      basePoints: climberBasePoints,
      flashBonusPoints: climberFlashBonus,
      topsCount,
      flashesCount: climberFlashesCount,
      attemptsOnTops,
      hardestSend,
      pointsPercentage,
      completionPercentage,
      toppedBoulders
    };
  });

  // 4. Sort standings by competition rules:
  // 1st: Total Comp Points
  // 2nd: Tops Count
  // 3rd: Flashes Count
  // 4th: Fewest Attempts on Tops
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.topsCount !== a.topsCount) {
      return b.topsCount - a.topsCount;
    }
    if (b.flashesCount !== a.flashesCount) {
      return b.flashesCount - a.flashesCount;
    }
    return a.attemptsOnTops - b.attemptsOnTops;
  });

  // 5. Assign ranks (supporting ties)
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0) {
      const prev = standings[i - 1];
      const curr = standings[i];
      const isTied =
        curr.totalPoints === prev.totalPoints &&
        curr.topsCount === prev.topsCount &&
        curr.flashesCount === prev.flashesCount &&
        curr.attemptsOnTops === prev.attemptsOnTops;

      if (!isTied) {
        currentRank = i + 1;
      }
    }
    standings[i].rank = currentRank;
  }

  return {
    gymId,
    gymName,
    activeBouldersCount: activeBoulders.length,
    totalPossiblePoints,
    totalBasePoints,
    standings,
    monthInfo,
    isMonthly
  };
}

export interface MonthlyHallOfFameEntry {
  month: CompMonthInfo;
  champion: ClimberCompStanding | null;
  runnersUp: ClimberCompStanding[];
  totalTops: number;
  totalParticipants: number;
}

/**
 * Compute the historical Hall of Fame across all months.
 */
export function computeMonthlyHallOfFame(
  gymId: string,
  gyms: Gym[],
  boulders: Boulder[],
  attempts: Attempt[],
  climbers: Profile[]
): MonthlyHallOfFameEntry[] {
  const allMonths = getAvailableCompMonths(attempts);
  return allMonths.map((month) => {
    const data = computeGymCompLeaderboard(
      gymId,
      gyms,
      boulders,
      attempts,
      climbers,
      month.key
    );
    const activeParticipants = data.standings.filter((s) => s.totalPoints > 0);
    const champion = activeParticipants[0] || null;
    const runnersUp = activeParticipants.slice(1, 3);
    const totalTops = activeParticipants.reduce((sum, s) => sum + s.topsCount, 0);

    return {
      month,
      champion,
      runnersUp,
      totalTops,
      totalParticipants: activeParticipants.length
    };
  });
}

