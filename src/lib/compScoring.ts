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

export interface GymCompLeaderboardData {
  gymId: string;
  gymName: string;
  activeBouldersCount: number;
  totalPossiblePoints: number; // Maximum possible points if all active boulders are flashed
  totalBasePoints: number; // Maximum base points if all active boulders are topped
  standings: ClimberCompStanding[];
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
 * Compute competition leaderboard standings for active boulders in a gym (or across all gyms).
 */
export function computeGymCompLeaderboard(
  gymId: string, // 'all' or specific gym id
  gyms: Gym[],
  boulders: Boulder[],
  attempts: Attempt[],
  climbers: Profile[]
): GymCompLeaderboardData {
  const gymObj = gyms.find((g) => g.id === gymId);
  const gymName = gymId === 'all' ? 'All Gyms' : (gymObj?.name || 'Current Gym');

  // 1. Filter only active (non-archived) boulders in the specified gym
  const activeBoulders = boulders.filter(
    (b) => !b.is_archived && (gymId === 'all' || b.gym_id === gymId)
  );

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

  // 3. Compute each climber's comp score on active boulders
  const standings: ClimberCompStanding[] = climbers.map((climber) => {
    // Find all completed attempts by this climber on active boulders in this gym
    const climberAttempts = attempts.filter(
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
        // If current is flashed and existing is not, prioritize flash
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
    standings
  };
}
