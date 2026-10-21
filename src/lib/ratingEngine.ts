import { Boulder, Attempt, Profile, Grade } from '../types';

/**
 * Base Elo anchor for each V-grade.
 * Scaled so that:
 * - V3 is ~1,350 (the median regular gym climber)
 * - V4 is ~1,500 (solid seasoned gym regular)
 * - V8+ reaches ~2,100 (head routesetter / local crusher)
 * - V17 reaches ~2,950 (Will Bosi / world peak, matching Magnus Carlsen's chess ceiling)
 */
export const GRADE_ELO_BASE: Record<Grade, number> = {
  VB: 750,
  V0: 900,
  V1: 1050,
  V2: 1200,
  V3: 1350,
  V4: 1500,
  V5: 1650,
  V6: 1800,
  V7: 1950,
  V8: 2100,
  V9: 2250,
  'V10+': 2400
};

/**
 * Weights for top 15 sends in descending order of difficulty.
 * Gives higher weight to breakthrough sends while requiring depth across the pyramid.
 * Sum = 1.00
 */
export const TOP_15_WEIGHTS = [
  0.12, 0.10, 0.09, // Peak breakthrough sends (31%)
  0.08, 0.08, 0.07, 0.07, // Upper consolidation sends (30%)
  0.06, 0.06, 0.05, 0.05, // Bread & butter circuit sends (22%)
  0.05, 0.04, 0.04, 0.04 // Base volume sends (17%)
];

export const TOP_10_WEIGHTS = TOP_15_WEIGHTS.slice(0, 10);

/**
 * Bonus Elo awarded on each send based on attempt efficiency.
 */
export function getAttemptBonus(status: string, attemptCount: number): number {
  if (status === 'flashed' || attemptCount === 1) {
    return 40; // Flash bonus (+40 Elo)
  }
  if (attemptCount === 2) {
    return 20; // 2nd try send (+20 Elo)
  }
  if (attemptCount === 3) {
    return 10; // 3rd try send (+10 Elo)
  }
  return 0; // Standard working project send
}

export interface ScorecardSendItem {
  boulder: Boulder;
  attempt: Attempt;
  grade: Grade;
  holdColour: string;
  isFlash: boolean;
  attemptCount: number;
  sendElo: number;
  loggedAt: string;
  daysAgo: number;
  daysRemaining: number; // Days left before expiring from 60-day window
}

export interface EloDemarcation {
  id: string;
  minElo: number;
  maxElo: number; // Infinity for the top tier
  title: string;
  gradeEquivalent: string;
  shortGrade: string;
  subGradeDescription: string;
  tagline: string;
}

/**
 * Official Wham Elo Level Demarcations.
 * Calibrated around community benchmarks so that:
 * - 1,450 – 1,550 = Solid V4 Climber
 * - Clear 100-pt progression milestones from V0 to V10+
 */
export const ELO_DEMARCATIONS: EloDemarcation[] = [
  {
    id: 'vb',
    minElo: 0,
    maxElo: 1000,
    title: 'Base Builder',
    gradeEquivalent: 'VB',
    shortGrade: 'VB',
    subGradeDescription: 'Learning the fundamentals & footwork',
    tagline: 'Foundation'
  },
  {
    id: 'v0',
    minElo: 1000,
    maxElo: 1150,
    title: 'Solid V0 Climber',
    gradeEquivalent: 'V0',
    shortGrade: 'V0',
    subGradeDescription: 'Dialling in core gym movement',
    tagline: 'Intro'
  },
  {
    id: 'v1',
    minElo: 1150,
    maxElo: 1250,
    title: 'Solid V1 Climber',
    gradeEquivalent: 'V1',
    shortGrade: 'V1',
    subGradeDescription: 'Building body tension & flow',
    tagline: 'Developing'
  },
  {
    id: 'v2',
    minElo: 1250,
    maxElo: 1350,
    title: 'Solid V2 Climber',
    gradeEquivalent: 'V2',
    shortGrade: 'V2',
    subGradeDescription: 'Reliable on dynamic moves & crimps',
    tagline: 'Intermediate'
  },
  {
    id: 'v3',
    minElo: 1350,
    maxElo: 1450,
    title: 'Solid V3 Climber',
    gradeEquivalent: 'V3',
    shortGrade: 'V3',
    subGradeDescription: 'Consistent tickrate across V3 circuits',
    tagline: 'Gym Regular'
  },
  {
    id: 'v4',
    minElo: 1450,
    maxElo: 1550,
    title: 'Solid V4 Climber',
    gradeEquivalent: 'V4',
    shortGrade: 'V4',
    subGradeDescription: 'Solid tickrate across V4 circuits, projecting V5',
    tagline: 'Seasoned Regular'
  },
  {
    id: 'v5',
    minElo: 1550,
    maxElo: 1650,
    title: 'Solid V5 Climber',
    gradeEquivalent: 'V5',
    shortGrade: 'V5',
    subGradeDescription: 'Consistent on steep boards & technical beta',
    tagline: 'Strong Regular'
  },
  {
    id: 'v6',
    minElo: 1650,
    maxElo: 1750,
    title: 'Solid V6 Climber',
    gradeEquivalent: 'V6',
    shortGrade: 'V6',
    subGradeDescription: 'Unlocking difficult micro-crimps & power moves',
    tagline: 'Advanced'
  },
  {
    id: 'v7',
    minElo: 1750,
    maxElo: 1850,
    title: 'Solid V7 Climber',
    gradeEquivalent: 'V7',
    shortGrade: 'V7',
    subGradeDescription: 'High finger strength & high-angle board proficiency',
    tagline: 'High Advanced'
  },
  {
    id: 'v8',
    minElo: 1850,
    maxElo: 1950,
    title: 'Solid V8 Climber',
    gradeEquivalent: 'V8',
    shortGrade: 'V8',
    subGradeDescription: 'Local crusher benchmark; sends hardest sets with ease',
    tagline: 'Local Crusher'
  },
  {
    id: 'v9',
    minElo: 1950,
    maxElo: 2050,
    title: 'Solid V9 Climber',
    gradeEquivalent: 'V9',
    shortGrade: 'V9',
    subGradeDescription: 'Routesetter & competition-tier execution',
    tagline: 'Elite'
  },
  {
    id: 'v10_plus',
    minElo: 2050,
    maxElo: 2200,
    title: 'Solid V10+ Crusher',
    gradeEquivalent: 'V10+',
    shortGrade: 'V10+',
    subGradeDescription: 'National competition finalist territory',
    tagline: 'Master'
  },
  {
    id: 'apex',
    minElo: 2200,
    maxElo: Infinity,
    title: 'Apex World Class',
    gradeEquivalent: 'V12+',
    shortGrade: 'Apex',
    subGradeDescription: 'World cup & international peak performance',
    tagline: 'Legend'
  }
];

export interface ClimberRating {
  userId: string;
  profile?: Profile;
  elo: number;
  title: string;
  gradeEquivalent: string;
  subGradeDescription: string;
  percentile: number; // Estimated % of regular boulderers they climb better than
  topPercentile: number; // Estimated top % of regular boulderers (e.g. 26.6% -> Top 26.6%)
  isProvisional: boolean; // True if fewer than 5 sends in last 60 days
  sendsCount: number; // Number of sends in last 60 days (up to 10 used)
  totalSendsInWindow: number;
  topSends: ScorecardSendItem[];
  hardestSendGrade: Grade | null;
  formStatus: 'peak' | 'active' | 'calibrating' | 'dormant';
  // Level Demarcations
  currentLevel: EloDemarcation;
  nextLevel: EloDemarcation | null;
  pointsToNextLevel: number;
  levelProgress: number; // 0 to 100 percentage
}

/**
 * Finds the level demarcation corresponding to a given Elo rating.
 */
export function getLevelDemarcation(elo: number): EloDemarcation {
  const safeElo = Number.isFinite(elo) ? Math.max(0, elo) : 1000;
  const found = ELO_DEMARCATIONS.find((d) => {
    if (d.maxElo === Infinity) {
      return safeElo >= d.minElo;
    }
    return safeElo >= d.minElo && safeElo < d.maxElo;
  });
  return found || ELO_DEMARCATIONS[0];
}

/**
 * Gets the next level demarcation above the current rating (or null if max tier).
 */
export function getNextLevelDemarcation(elo: number): EloDemarcation | null {
  const current = getLevelDemarcation(elo);
  const currentIndex = ELO_DEMARCATIONS.findIndex((d) => d.id === current.id);
  if (currentIndex >= 0 && currentIndex < ELO_DEMARCATIONS.length - 1) {
    return ELO_DEMARCATIONS[currentIndex + 1];
  }
  return null;
}

/**
 * Computes exact progress metrics toward the next level demarcation.
 */
export function getDemarcationProgress(elo: number): {
  currentLevel: EloDemarcation;
  nextLevel: EloDemarcation | null;
  pointsToNextLevel: number;
  levelProgress: number;
} {
  const safeElo = Number.isFinite(elo) ? Math.max(0, elo) : 1000;
  const currentLevel = getLevelDemarcation(safeElo);
  const nextLevel = getNextLevelDemarcation(safeElo);

  if (!nextLevel || currentLevel.maxElo === Infinity) {
    return {
      currentLevel,
      nextLevel: null,
      pointsToNextLevel: 0,
      levelProgress: 100
    };
  }

  const range = currentLevel.maxElo - currentLevel.minElo;
  const progressRaw = range > 0 ? ((safeElo - currentLevel.minElo) / range) * 100 : 0;
  const levelProgress = Math.min(100, Math.max(0, Math.round(progressRaw * 10) / 10));
  const pointsToNextLevel = Math.max(0, currentLevel.maxElo - safeElo);

  return {
    currentLevel,
    nextLevel,
    pointsToNextLevel,
    levelProgress
  };
}

/**
 * Translates an Elo number into an intuitive bouldering title and bracket.
 */
export function getClimberTitleFromElo(elo: number): {
  title: string;
  gradeEquivalent: string;
  subGradeDescription: string;
  levelDemarcation: EloDemarcation;
} {
  const safeElo = Number.isFinite(elo) ? Math.max(0, elo) : 1000;
  const demarcation = getLevelDemarcation(safeElo);

  let subGradeDescription = demarcation.subGradeDescription;
  let gradeEquivalent = demarcation.gradeEquivalent;

  // Nuance for progress within demarcation band
  if (demarcation.maxElo !== Infinity && demarcation.maxElo - demarcation.minElo >= 100) {
    const range = demarcation.maxElo - demarcation.minElo;
    const progress = (safeElo - demarcation.minElo) / range;

    if (progress >= 0.7) {
      gradeEquivalent = demarcation.gradeEquivalent.endsWith('+') || demarcation.id === 'vb'
        ? demarcation.gradeEquivalent
        : `${demarcation.gradeEquivalent}+`;
      subGradeDescription = `High flash confidence on ${demarcation.gradeEquivalent}, projecting the next level`;
    } else if (progress <= 0.25) {
      subGradeDescription = `Consolidating ${demarcation.gradeEquivalent} tickrate across gym circuits`;
    }
  }

  return {
    title: demarcation.title,
    gradeEquivalent,
    subGradeDescription,
    levelDemarcation: demarcation
  };
}

/**
 * Calculates estimated percentile of regular gym climbers (climbs >= 1x / week)
 * using a cumulative normal distribution model.
 * Calibrated against community benchmark data (Lattice Training, 8a.nu):
 * - Median regular climber = V3 (~1,350 Elo, 50th percentile)
 * - Solid V4 = ~1,500 Elo (~73rd percentile, top ~27%)
 * - Solid V5 = ~1,650 Elo (~90th percentile, top ~10%)
 * - Solid V6 = ~1,800 Elo (~97th percentile, top ~3%)
 */
export function calculateClimberPercentile(elo: number): number {
  const mean = 1350; // Median regular gym climber
  const stdDev = 240; // Standard deviation

  const z = (elo - mean) / stdDev;

  // Abramowitz and Stegun numerical approximation for normal CDF
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));

  const percentile = z > 0 ? (1.0 - prob) * 100 : prob * 100;

  // Clamp between 1.0% and 99.9%
  return Math.min(99.9, Math.max(1.0, Math.round(percentile * 10) / 10));
}

/**
 * Computes a climber's tournament-style Elo rating over a rolling 60-day window.
 */
export function computeClimberRating(
  userId: string,
  attempts: Attempt[],
  boulders: Boulder[],
  profile?: Profile,
  referenceDate: Date = new Date()
): ClimberRating {
  const windowDays = 60;
  const cutoffTime = referenceDate.getTime() - windowDays * 24 * 60 * 60 * 1000;

  const boulderMap = new Map<string, Boulder>();
  boulders.forEach((b) => boulderMap.set(b.id, b));

  // Filter attempts for this user within the 60-day window that are sends/flashes
  const userSendsInWindow: { attempt: Attempt; boulder: Boulder; sendDate: Date }[] = [];

  // Group by boulder to keep only the best attempt per boulder in this window
  const bestAttemptPerBoulder = new Map<string, Attempt>();

  attempts.forEach((a) => {
    if (a.user_id !== userId) return;
    if (a.status !== 'sent' && a.status !== 'flashed') return;

    const b = boulderMap.get(a.boulder_id);
    if (!b || b.is_comp) return;

    // Determine send date
    const dateStr = a.logged_at || b.date_added;
    if (!dateStr) return;
    const sendDate = new Date(dateStr);
    if (isNaN(sendDate.getTime()) || sendDate.getTime() < cutoffTime) return;

    const existing = bestAttemptPerBoulder.get(b.id);
    if (!existing) {
      bestAttemptPerBoulder.set(b.id, a);
    } else {
      // Prefer flash over sent, or lower attempt count
      const isExistingFlash = existing.status === 'flashed' || existing.attempt_count === 1;
      const isNewFlash = a.status === 'flashed' || a.attempt_count === 1;
      if (isNewFlash && !isExistingFlash) {
        bestAttemptPerBoulder.set(b.id, a);
      } else if (a.attempt_count < existing.attempt_count) {
        bestAttemptPerBoulder.set(b.id, a);
      }
    }
  });

  bestAttemptPerBoulder.forEach((attempt, boulderId) => {
    const boulder = boulderMap.get(boulderId);
    if (!boulder || boulder.is_comp) return;
    const dateStr = attempt.logged_at || boulder.date_added;
    userSendsInWindow.push({
      attempt,
      boulder,
      sendDate: new Date(dateStr)
    });
  });

  // Score each send
  const scoredSends: ScorecardSendItem[] = userSendsInWindow.map(({ attempt, boulder, sendDate }) => {
    const grade = boulder.grade;
    const baseElo = GRADE_ELO_BASE[grade] ?? 1000;
    const bonus = getAttemptBonus(attempt.status, attempt.attempt_count);
    const sendElo = baseElo + bonus;

    const daysAgo = Math.max(0, Math.floor((referenceDate.getTime() - sendDate.getTime()) / (24 * 60 * 60 * 1000)));
    const daysRemaining = Math.max(0, windowDays - daysAgo);

    return {
      boulder,
      attempt,
      grade,
      holdColour: boulder.hold_colour,
      isFlash: attempt.status === 'flashed' || attempt.attempt_count === 1,
      attemptCount: attempt.attempt_count,
      sendElo,
      loggedAt: attempt.logged_at || boulder.date_added,
      daysAgo,
      daysRemaining
    };
  });

  // Sort descending by send Elo (hardest/highest-scoring sends first)
  scoredSends.sort((a, b) => b.sendElo - a.sendElo);

  const top15 = scoredSends.slice(0, 15);
  const totalSendsInWindow = scoredSends.length;

  let calculatedElo = 1000; // Default floor
  const isProvisional = top15.length < 6;

  if (top15.length > 0) {
    // Normalize weights for the actual number of sends available
    const weightsSlice = TOP_15_WEIGHTS.slice(0, top15.length);
    const weightSum = weightsSlice.reduce((sum, w) => sum + w, 0);

    const weightedScore = top15.reduce((acc, item, idx) => {
      const normalizedWeight = weightsSlice[idx] / weightSum;
      return acc + item.sendElo * normalizedWeight;
    }, 0);

    calculatedElo = Math.round(weightedScore);
  }

  const { title, gradeEquivalent, subGradeDescription } = getClimberTitleFromElo(calculatedElo);
  const { currentLevel, nextLevel, pointsToNextLevel, levelProgress } = getDemarcationProgress(calculatedElo);
  const percentile = calculateClimberPercentile(calculatedElo);
  const topPercentile = Math.max(0.1, Math.round((100 - percentile) * 10) / 10);

  let formStatus: 'peak' | 'active' | 'calibrating' | 'dormant' = 'dormant';
  if (top15.length >= 12) {
    formStatus = 'peak';
  } else if (top15.length >= 7) {
    formStatus = 'active';
  } else if (top15.length > 0) {
    formStatus = 'calibrating';
  }

  const hardestSendGrade = top15.length > 0 ? top15[0].grade : null;

  return {
    userId,
    profile,
    elo: calculatedElo,
    title,
    gradeEquivalent,
    subGradeDescription,
    percentile,
    topPercentile,
    isProvisional,
    sendsCount: top15.length,
    totalSendsInWindow,
    topSends: top15,
    hardestSendGrade,
    formStatus,
    currentLevel,
    nextLevel,
    pointsToNextLevel,
    levelProgress
  };
}

/**
 * Computes rankings and ratings for all climbers in the crew.
 */
export function computeCrewRatings(
  climbers: Profile[],
  attempts: Attempt[],
  boulders: Boulder[],
  referenceDate: Date = new Date()
): ClimberRating[] {
  const ratings = climbers.map((c) => computeClimberRating(c.id, attempts, boulders, c, referenceDate));
  // Sort by Elo descending
  return ratings.sort((a, b) => b.elo - a.elo);
}
