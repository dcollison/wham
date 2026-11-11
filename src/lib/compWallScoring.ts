import { Boulder, Attempt, Profile, AttemptStatus, CompWallStanding, CompWallScorecardItem } from '../types';

/**
 * Standard UK / Festival Climbing Comp Scoring (10 / 7 / 4 — no zones):
 * - Flashed (1st try send): 10 points
 * - Sent on 2nd try: 7 points
 * - Sent on 3+ tries: 4 points
 * - Untried or projecting (attempted): 0 points
 */
export const COMP_POINTS_CONFIG = {
  flash: 10,
  secondTry: 7,
  multiTry: 4
};

/**
 * Calculate the points awarded for a standard comp wall climb attempt (no zones).
 */
export function getCompProblemPoints(status?: AttemptStatus | null, attemptCount: number = 0): number {
  if (!status || status === 'attempted' || (status as string) === 'untried') return 0;
  if (status === 'flashed' || attemptCount <= 1) return COMP_POINTS_CONFIG.flash;
  if (attemptCount === 2) return COMP_POINTS_CONFIG.secondTry;
  return COMP_POINTS_CONFIG.multiTry;
}

/**
 * Computes crew standings for an active comp wall (10 / 7 / 4 scoring, no zones).
 * Ranked by:
 * 1st: Total Points (DESC)
 * 2nd: Total Tops (DESC)
 * 3rd: Total Flashes (DESC)
 * 4th: Attempts on Tops (ASC)
 */
export function computeCompWallStandings(
  compBoulders: Boulder[],
  attempts: Attempt[],
  climbers: Profile[],
  includeArchived: boolean = false
): CompWallStanding[] {
  const activeBoulders = includeArchived ? compBoulders : compBoulders.filter(b => !b.is_archived);
  const boulderIds = new Set(activeBoulders.map(b => b.id));

  // Filter attempts relevant to these comp boulders
  const compAttempts = attempts.filter(a => boulderIds.has(a.boulder_id));

  const standings: CompWallStanding[] = climbers.map(climber => {
    const climberAttempts = compAttempts.filter(
      a => a.user_id === climber.id && (a.status as string) !== 'untried'
    );
    let totalPoints = 0;
    let topsCount = 0;
    let flashesCount = 0;
    const zonesCount = 0;
    let unattemptedCount = 0;
    let projectingCount = 0;
    let attemptsOnTops = 0;
    let highestTopNumber: number | null = null;
    const completedBoulders: CompWallStanding['completedBoulders'] = [];

    // Deduplicate attempts per boulder by picking highest points, then fewest tries
    const bestAttemptByBoulder = new Map<string, Attempt>();
    for (const att of climberAttempts) {
      const existing = bestAttemptByBoulder.get(att.boulder_id);
      if (!existing) {
        bestAttemptByBoulder.set(att.boulder_id, att);
      } else {
        const newPts = getCompProblemPoints(att.status, att.attempt_count);
        const oldPts = getCompProblemPoints(existing.status, existing.attempt_count);
        if (
          newPts > oldPts ||
          (newPts === oldPts && (att.attempt_count || 1) < (existing.attempt_count || 1))
        ) {
          bestAttemptByBoulder.set(att.boulder_id, att);
        }
      }
    }

    activeBoulders.forEach(boulder => {
      const attempt = bestAttemptByBoulder.get(boulder.id);
      const num = boulder.comp_number ?? Math.round(boulder.position_order);

      if (attempt && (attempt.status === 'sent' || attempt.status === 'flashed')) {
        const tries = attempt.attempt_count || 1;
        const isFlash = attempt.status === 'flashed' || tries === 1;
        const pts = getCompProblemPoints(attempt.status, tries);

        totalPoints += pts;
        topsCount += 1;
        if (isFlash) flashesCount += 1;
        attemptsOnTops += tries;

        if (highestTopNumber === null || num > highestTopNumber) {
          highestTopNumber = num;
        }

        completedBoulders.push({
          boulderId: boulder.id,
          compNumber: num,
          points: pts,
          status: attempt.status,
          isFlash,
          isTop: true,
          isZone: false,
          attempts: tries
        });
      } else if (attempt && attempt.status === 'attempted') {
        projectingCount += 1;
      } else {
        unattemptedCount += 1;
      }
    });

    const pointsUpForGrabs =
      unattemptedCount * COMP_POINTS_CONFIG.flash +
      projectingCount * COMP_POINTS_CONFIG.secondTry;
    const maxPossiblePoints = totalPoints + pointsUpForGrabs;
    const bouldersLeftToScore = unattemptedCount + projectingCount;

    return {
      climber,
      rank: 1,
      totalPoints,
      topsCount,
      flashesCount,
      zonesCount,
      unattemptedCount,
      pointsUpForGrabs,
      maxPossiblePoints,
      bouldersLeftToScore,
      attemptsOnTops,
      highestTopNumber,
      completedBoulders
    };
  });

  // Sort: 1st Points -> 2nd Tops -> 3rd Flashes -> 4th Fewest Attempts on Tops
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.topsCount !== a.topsCount) return b.topsCount - a.topsCount;
    if (b.flashesCount !== a.flashesCount) return b.flashesCount - a.flashesCount;
    return a.attemptsOnTops - b.attemptsOnTops;
  });

  // Assign ranks
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0) {
      const prev = standings[i - 1];
      const curr = standings[i];
      const isTied =
        prev.totalPoints === curr.totalPoints &&
        prev.topsCount === curr.topsCount &&
        prev.flashesCount === curr.flashesCount &&
        prev.attemptsOnTops === curr.attemptsOnTops;

      if (!isTied) {
        currentRank = i + 1;
      }
    }
    standings[i].rank = currentRank;
  }

  return standings;
}

/**
 * Computes full scorecard grid items for active comp boulders (#1 through #N).
 */
export function computeCompWallScorecard(
  compBoulders: Boulder[],
  attempts: Attempt[],
  includeArchived: boolean = false
): CompWallScorecardItem[] {
  const activeBoulders = (includeArchived ? [...compBoulders] : compBoulders.filter(b => !b.is_archived))
    .sort((a, b) => {
      const numA = a.comp_number ?? Math.round(a.position_order);
      const numB = b.comp_number ?? Math.round(b.position_order);
      return numA - numB;
    });

  return activeBoulders.map(boulder => {
    const compNumber = boulder.comp_number ?? Math.round(boulder.position_order);
    const boulderAttempts = attempts.filter(
      a => a.boulder_id === boulder.id && (a.status as string) !== 'untried'
    );
    const userAttempts: Record<string, { status: AttemptStatus; attemptCount: number; points: number }> = {};

    boulderAttempts.forEach(att => {
      const pts = getCompProblemPoints(att.status, att.attempt_count);
      const existing = userAttempts[att.user_id];
      if (
        !existing ||
        pts > existing.points ||
        (pts === existing.points && (att.attempt_count || 1) < (existing.attemptCount || 1))
      ) {
        userAttempts[att.user_id] = {
          status: att.status,
          attemptCount: att.attempt_count,
          points: pts
        };
      }
    });

    return {
      boulder,
      compNumber,
      userAttempts
    };
  });
}

