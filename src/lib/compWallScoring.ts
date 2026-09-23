import { Boulder, Attempt, Profile, AttemptStatus, CompWallStanding, CompWallScorecardItem } from '../types';

/**
 * Standard UK / Festival Climbing Comp Scoring (Option B):
 * - Flashed (1st try send): 10 points
 * - Sent on 2nd try: 7 points
 * - Sent on 3+ tries: 4 points
 * - Untried or projecting: 0 points
 */
export const COMP_POINTS_CONFIG = {
  flash: 10,
  secondTry: 7,
  multiTry: 4
};

/**
 * Calculate the points awarded for a comp climb attempt.
 */
export function getCompProblemPoints(status?: AttemptStatus | null, attemptCount: number = 0): number {
  if (!status || status === 'attempted') return 0;
  if (status === 'flashed' || attemptCount <= 1) return COMP_POINTS_CONFIG.flash;
  if (attemptCount === 2) return COMP_POINTS_CONFIG.secondTry;
  return COMP_POINTS_CONFIG.multiTry;
}

/**
 * Computes crew standings for an active comp wall.
 * Ranked by:
 * 1st: Total Points (DESC)
 * 2nd: Total Tops (DESC)
 * 3rd: Total Flashes (DESC)
 * 4th: Attempts on Tops (ASC)
 */
export function computeCompWallStandings(
  compBoulders: Boulder[],
  attempts: Attempt[],
  climbers: Profile[]
): CompWallStanding[] {
  // Only consider active comp boulders
  const activeBoulders = compBoulders.filter(b => !b.is_archived);
  const boulderIds = new Set(activeBoulders.map(b => b.id));

  // Filter attempts relevant to these active comp boulders
  const compAttempts = attempts.filter(a => boulderIds.has(a.boulder_id));

  const standings: CompWallStanding[] = climbers.map(climber => {
    const climberAttempts = compAttempts.filter(a => a.user_id === climber.id);
    let totalPoints = 0;
    let topsCount = 0;
    let flashesCount = 0;
    let attemptsOnTops = 0;
    let highestTopNumber: number | null = null;
    const completedBoulders: CompWallStanding['completedBoulders'] = [];

    activeBoulders.forEach(boulder => {
      const attempt = climberAttempts.find(a => a.boulder_id === boulder.id);
      if (attempt && (attempt.status === 'sent' || attempt.status === 'flashed')) {
        const tries = attempt.attempt_count || 1;
        const isFlash = attempt.status === 'flashed' || tries === 1;
        const pts = getCompProblemPoints(attempt.status, tries);

        totalPoints += pts;
        topsCount += 1;
        if (isFlash) flashesCount += 1;
        attemptsOnTops += tries;

        const num = boulder.comp_number ?? Math.round(boulder.position_order);
        if (highestTopNumber === null || num > highestTopNumber) {
          highestTopNumber = num;
        }

        completedBoulders.push({
          boulderId: boulder.id,
          compNumber: num,
          points: pts,
          isFlash,
          attempts: tries
        });
      }
    });

    return {
      climber,
      rank: 1,
      totalPoints,
      topsCount,
      flashesCount,
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
  attempts: Attempt[]
): CompWallScorecardItem[] {
  const activeBoulders = compBoulders
    .filter(b => !b.is_archived)
    .sort((a, b) => {
      const numA = a.comp_number ?? Math.round(a.position_order);
      const numB = b.comp_number ?? Math.round(b.position_order);
      return numA - numB;
    });

  return activeBoulders.map(boulder => {
    const compNumber = boulder.comp_number ?? Math.round(boulder.position_order);
    const boulderAttempts = attempts.filter(a => a.boulder_id === boulder.id);
    const userAttempts: Record<string, { status: AttemptStatus; attemptCount: number; points: number }> = {};

    boulderAttempts.forEach(att => {
      userAttempts[att.user_id] = {
        status: att.status,
        attemptCount: att.attempt_count,
        points: getCompProblemPoints(att.status, att.attempt_count)
      };
    });

    return {
      boulder,
      compNumber,
      userAttempts
    };
  });
}
