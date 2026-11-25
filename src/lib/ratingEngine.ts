import { Boulder, Attempt, Profile, Grade, GRADES } from '../types';

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
  rawElo?: number; // Uncapped tournament score before pyramid depth gating
  title: string;
  gradeEquivalent: string;
  subGradeDescription: string;
  percentile: number; // Estimated % of regular boulderers they climb better than
  topPercentile: number; // Estimated top % of regular boulderers (e.g. 26.6% -> Top 26.6%)
  isProvisional: boolean; // True if fewer than 6 sends in last 60 days
  sendsCount: number; // Number of sends in last 60 days (up to 15 used)
  totalSendsInWindow: number;
  topSends: ScorecardSendItem[];
  hardestSendGrade: Grade | null;
  formStatus: 'peak' | 'active' | 'calibrating' | 'dormant';
  // Level Demarcations
  currentLevel: EloDemarcation;
  nextLevel: EloDemarcation | null;
  pointsToNextLevel: number;
  levelProgress: number; // 0 to 100 percentage
  depthNeededForNextLevel?: number; // Sends needed at nextLevel grade to prove pyramid depth
  // All-Time Peak Elo (highest rolling 60-day window rating across full send history)
  peakElo: number | null; // Highest rolling 60-day Elo ever achieved (null if 0 valid non-comp sends ever)
  peakRawElo?: number; // Uncapped tournament score at peak if peak was capped by pyramid depth
  peakDate: string | null; // ISO timestamp when peakElo was first achieved (null if peakElo is null)
  peakLevel: EloDemarcation | null; // Qualified demarcation tier at peak (null if peakElo is null)
  peakTitle: string | null; // Level title at peak (null if peakElo is null)
  peakGradeEquivalent: string | null; // Grade equivalent at peak, e.g. 'V4' or 'V4+' (null if peakElo is null)
  peakIsProvisional: boolean; // True if the peak 60-day window had fewer than 6 sends
  peakSendsCount: number; // Number of top sends (up to 15) in the peak 60-day window (0 if no sends ever)
  isAtPeak: boolean; // True if climber has active sends and current elo >= peakElo
  eloDropFromPeak: number; // Points below peakElo (0 when at peak, dormant above peak, or no sends ever)
}

/**
 * Minimum number of sends at or above grade required in the active scorecard
 * to demonstrate consistent pyramid volume and depth for that level demarcation.
 * Without consistent pyramid depth, one-off breakthrough or outlier sends cannot
 * crown a climber as a solid/strong climber of that grade.
 */
export function getRequiredPyramidDepth(demarcationId: string): number {
  switch (demarcationId) {
    case 'vb':
      return 0; // Base builder entry tier
    case 'v0':
      return 1; // 1 send needed to establish gym baseline
    case 'v1':
      return 2; // 2 sends to confirm out of intro
    default:
      // For V2 through V10+ and Apex: requires consistent pyramid depth
      // of at least 3 sends at or above that grade.
      return 3;
  }
}

/**
 * Checks if a climber has demonstrated consistent pyramid volume and depth
 * for a given level demarcation.
 */
export function hasPyramidDepthForDemarcation(
  demarcation: EloDemarcation,
  topSends?: Pick<ScorecardSendItem, 'grade'>[]
): boolean {
  if (topSends === undefined) return true;
  const requiredCount = getRequiredPyramidDepth(demarcation.id);
  if (requiredCount === 0) return true;

  const targetGradeIndex = GRADES.indexOf(demarcation.gradeEquivalent as Grade);
  const minGradeIdx = targetGradeIndex >= 0 ? targetGradeIndex : GRADES.indexOf('V10+');

  const sendsAtOrAbove = topSends.filter((s) => {
    const gIdx = GRADES.indexOf(s.grade);
    return gIdx >= minGradeIdx;
  }).length;

  return sendsAtOrAbove >= requiredCount;
}

/**
 * Finds the level demarcation corresponding to a given Elo rating,
 * gated by consistent pyramid volume and depth when top sends are provided.
 */
export function getLevelDemarcation(
  elo: number,
  topSends?: Pick<ScorecardSendItem, 'grade'>[]
): EloDemarcation {
  const safeElo = Number.isFinite(elo) ? Math.max(0, elo) : 1000;
  const nominal = ELO_DEMARCATIONS.find((d) => {
    if (d.maxElo === Infinity) {
      return safeElo >= d.minElo;
    }
    return safeElo >= d.minElo && safeElo < d.maxElo;
  }) || ELO_DEMARCATIONS[0];

  if (topSends === undefined) {
    return nominal;
  }

  // Check if climber has consistent pyramid volume and depth for nominal tier
  if (hasPyramidDepthForDemarcation(nominal, topSends)) {
    return nominal;
  }

  // If not, step down to the highest demarcation tier where pyramid depth is proven
  const nominalIndex = ELO_DEMARCATIONS.findIndex((d) => d.id === nominal.id);
  for (let i = nominalIndex - 1; i >= 0; i--) {
    const lowerTier = ELO_DEMARCATIONS[i];
    if (hasPyramidDepthForDemarcation(lowerTier, topSends)) {
      return lowerTier;
    }
  }

  return ELO_DEMARCATIONS[0];
}

/**
 * Gets the next level demarcation above the current rating (or null if max tier),
 * taking into account pyramid depth.
 */
export function getNextLevelDemarcation(
  elo: number,
  topSends?: Pick<ScorecardSendItem, 'grade'>[]
): EloDemarcation | null {
  const current = getLevelDemarcation(elo, topSends);
  const currentIndex = ELO_DEMARCATIONS.findIndex((d) => d.id === current.id);
  if (currentIndex >= 0 && currentIndex < ELO_DEMARCATIONS.length - 1) {
    return ELO_DEMARCATIONS[currentIndex + 1];
  }
  return null;
}

/**
 * Computes exact progress metrics toward the next level demarcation.
 */
export function getDemarcationProgress(
  elo: number,
  topSends?: Pick<ScorecardSendItem, 'grade'>[]
): {
  currentLevel: EloDemarcation;
  nextLevel: EloDemarcation | null;
  pointsToNextLevel: number;
  levelProgress: number;
  depthNeededForNextLevel?: number;
} {
  const safeElo = Number.isFinite(elo) ? Math.max(0, elo) : 1000;
  const currentLevel = getLevelDemarcation(safeElo, topSends);
  const nextLevel = getNextLevelDemarcation(safeElo, topSends);

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

  let depthNeededForNextLevel: number | undefined;
  if (topSends && nextLevel) {
    const required = getRequiredPyramidDepth(nextLevel.id);
    const nextGradeIdx = GRADES.indexOf(nextLevel.gradeEquivalent as Grade);
    const minG = nextGradeIdx >= 0 ? nextGradeIdx : GRADES.indexOf('V10+');
    const existing = topSends.filter((s) => GRADES.indexOf(s.grade) >= minG).length;
    depthNeededForNextLevel = Math.max(0, required - existing);
  }

  return {
    currentLevel,
    nextLevel,
    pointsToNextLevel,
    levelProgress,
    depthNeededForNextLevel
  };
}

/**
 * Translates an Elo number into an intuitive bouldering title and bracket,
 * taking into account pyramid depth when available.
 */
export function getClimberTitleFromElo(
  elo: number,
  topSends?: Pick<ScorecardSendItem, 'grade'>[],
  rawElo?: number
): {
  title: string;
  gradeEquivalent: string;
  subGradeDescription: string;
  levelDemarcation: EloDemarcation;
} {
  const safeElo = Number.isFinite(elo) ? Math.max(0, elo) : 1000;
  const demarcation = getLevelDemarcation(safeElo, topSends);

  let subGradeDescription = demarcation.subGradeDescription;
  let gradeEquivalent = demarcation.gradeEquivalent;

  // Nuance for progress within demarcation band
  if (demarcation.maxElo !== Infinity && demarcation.maxElo - demarcation.minElo >= 100) {
    const range = demarcation.maxElo - demarcation.minElo;
    const progress = (safeElo - demarcation.minElo) / range;

    if (progress >= 0.7 && (!topSends || topSends.length > 0)) {
      gradeEquivalent = demarcation.gradeEquivalent.endsWith('+') || demarcation.id === 'vb'
        ? demarcation.gradeEquivalent
        : `${demarcation.gradeEquivalent}+`;

      // Check if they need pyramid depth for the next tier
      const nextTier = getNextLevelDemarcation(safeElo, topSends);
      const isPointsQualifiedForNext =
        (rawElo !== undefined && nextTier && rawElo >= nextTier.minElo) ||
        (demarcation.maxElo !== Infinity && safeElo >= demarcation.maxElo - 1);

      if (topSends && nextTier && isPointsQualifiedForNext && !hasPyramidDepthForDemarcation(nextTier, topSends)) {
        subGradeDescription = `High flash confidence on ${demarcation.gradeEquivalent}, projecting ${nextTier.gradeEquivalent} (needs pyramid depth at ${nextTier.gradeEquivalent})`;
      } else {
        subGradeDescription = `High flash confidence on ${demarcation.gradeEquivalent}, projecting the next level`;
      }
    } else if (progress <= 0.25 || (topSends && topSends.length === 0)) {
      subGradeDescription = demarcation.subGradeDescription;
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

const WINDOW_DAYS = 60;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

interface CompactSend {
  boulder: Boulder;
  attempt: Attempt;
  grade: Grade;
  sendElo: number;
  sendTime: number;
  loggedAt: string;
}

interface WindowScoreResult {
  elo: number;
  rawElo: number | undefined;
  top15: CompactSend[];
  isProvisional: boolean;
}

/**
 * Scores a set of sends inside a 60-day rolling window using Top-15 weighted
 * averaging and consistent pyramid depth gating.
 */
function scoreWindowSends(windowSends: CompactSend[]): WindowScoreResult {
  if (windowSends.length === 0) {
    const qualifiedDemarcation = getLevelDemarcation(1000, []);
    const cappedElo =
      qualifiedDemarcation.maxElo !== Infinity && 1000 >= qualifiedDemarcation.maxElo
        ? qualifiedDemarcation.maxElo - 1
        : 1000;
    return {
      elo: cappedElo,
      rawElo: 1000 > cappedElo ? 1000 : undefined,
      top15: [],
      isProvisional: true
    };
  }

  const sorted = [...windowSends].sort((a, b) => b.sendElo - a.sendElo);
  const top15 = sorted.slice(0, 15);
  const isProvisional = top15.length < 6;

  // Normalize weights for the actual number of sends available
  const weightsSlice = TOP_15_WEIGHTS.slice(0, top15.length);
  const weightSum = weightsSlice.reduce((sum, w) => sum + w, 0);

  const weightedScore = top15.reduce((acc, item, idx) => {
    const normalizedWeight = weightsSlice[idx] / weightSum;
    return acc + item.sendElo * normalizedWeight;
  }, 0);

  let calculatedElo = Math.round(weightedScore);

  // Consistent Pyramid Volume & Depth Requirement:
  // A climber cannot be crowned a solid/strong climber of a grade without demonstrating
  // consistent pyramid volume and depth at that level (at least 3 sends at or above grade).
  // If their raw Elo score would nominally place them in a higher tier than their proven
  // pyramid depth qualifies for, cap their Elo at the upper boundary of their qualified tier
  // (e.g. 1549 for V4) until consistent volume is proven.
  const uncappedElo = calculatedElo;
  const qualifiedDemarcation = getLevelDemarcation(calculatedElo, top15);
  if (qualifiedDemarcation.maxElo !== Infinity && calculatedElo >= qualifiedDemarcation.maxElo) {
    calculatedElo = qualifiedDemarcation.maxElo - 1;
  }

  return {
    elo: calculatedElo,
    rawElo: uncappedElo > calculatedElo ? uncappedElo : undefined,
    top15,
    isProvisional
  };
}

interface PeakSummary {
  peakElo: number | null;
  peakRawElo?: number;
  peakDate: string | null;
  peakLevel: EloDemarcation | null;
  peakTitle: string | null;
  peakGradeEquivalent: string | null;
  peakIsProvisional: boolean;
  peakSendsCount: number;
}

/**
 * Evaluates all rolling 60-day windows across the climber's chronological send history
 * (at every send timestamp, every 60-day expiration boundary <= referenceTime, and referenceTime)
 * to determine their all-time peak Elo without schema changes.
 *
 * Empty windows (0 sends) are excluded so dormant floors never create artificial peaks.
 */
function computeHistoricalPeakElo(
  sortedSendsAsc: CompactSend[],
  referenceTime: number
): PeakSummary {
  if (sortedSendsAsc.length === 0) {
    return {
      peakElo: null,
      peakRawElo: undefined,
      peakDate: null,
      peakLevel: null,
      peakTitle: null,
      peakGradeEquivalent: null,
      peakIsProvisional: false,
      peakSendsCount: 0
    };
  }

  // Collect all distinct event boundaries <= referenceTime where the active window set can change
  const eventTimes: number[] = [referenceTime];
  for (let i = 0; i < sortedSendsAsc.length; i++) {
    const sendTime = sortedSendsAsc[i].sendTime;
    eventTimes.push(sendTime);
    const expiryTime = sendTime + WINDOW_MS + 1;
    if (expiryTime <= referenceTime) {
      eventTimes.push(expiryTime);
    }
  }
  eventTimes.sort((a, b) => a - b);

  let left = 0;
  let right = 0;
  let prevLeft = -1;
  let prevRight = -1;
  let prevTime = NaN;

  let best: { time: number; score: WindowScoreResult } | null = null;

  for (let i = 0; i < eventTimes.length; i++) {
    const t = eventTimes[i];
    if (t === prevTime) continue;
    prevTime = t;

    while (right < sortedSendsAsc.length && sortedSendsAsc[right].sendTime <= t) {
      right++;
    }
    const windowCutoff = t - WINDOW_MS;
    while (left < right && sortedSendsAsc[left].sendTime < windowCutoff) {
      left++;
    }

    // Only re-score when the active window slice actually changed and has at least 1 send
    if (left === prevLeft && right === prevRight) continue;
    prevLeft = left;
    prevRight = right;
    if (right <= left) continue;

    const score = scoreWindowSends(sortedSendsAsc.slice(left, right));

    // Strict '>' preserves the earliest date the peak Elo was first reached,
    // except when solidifying an identical provisional peak into an established (6+ send) one.
    if (
      best === null ||
      score.elo > best.score.elo ||
      (score.elo === best.score.elo && best.score.isProvisional && !score.isProvisional)
    ) {
      best = { time: t, score };
    }
  }

  if (!best) {
    return {
      peakElo: null,
      peakRawElo: undefined,
      peakDate: null,
      peakLevel: null,
      peakTitle: null,
      peakGradeEquivalent: null,
      peakIsProvisional: false,
      peakSendsCount: 0
    };
  }

  const peakMeta = getClimberTitleFromElo(best.score.elo, best.score.top15, best.score.rawElo);

  return {
    peakElo: best.score.elo,
    peakRawElo: best.score.rawElo,
    peakDate: new Date(best.time).toISOString(),
    peakLevel: peakMeta.levelDemarcation,
    peakTitle: peakMeta.title,
    peakGradeEquivalent: peakMeta.gradeEquivalent,
    peakIsProvisional: best.score.isProvisional,
    peakSendsCount: best.score.top15.length
  };
}

/**
 * Computes a climber's tournament-style Elo rating over a rolling 60-day window,
 * along with their historical all-time Peak Elo across past 60-day windows.
 */
export function computeClimberRating(
  userId: string,
  attempts: Attempt[],
  boulders: Boulder[],
  profile?: Profile,
  referenceDate: Date = new Date()
): ClimberRating {
  const referenceTime = Number.isNaN(referenceDate.getTime()) ? Date.now() : referenceDate.getTime();
  const cutoffTime = referenceTime - WINDOW_MS;

  const boulderMap = new Map<string, Boulder>();
  boulders.forEach((b) => boulderMap.set(b.id, b));

  // Deduplicate by boulder across all valid non-comp sends <= referenceTime
  const bestAttemptPerBoulder = new Map<string, Attempt>();

  attempts.forEach((a) => {
    if (a.user_id !== userId) return;
    if (a.status !== 'sent' && a.status !== 'flashed') return;

    const b = boulderMap.get(a.boulder_id);
    if (!b || b.is_comp) return;

    const dateStr = a.logged_at || b.date_added;
    if (!dateStr) return;
    const sendDate = new Date(dateStr);
    const sendTime = sendDate.getTime();
    if (isNaN(sendTime) || sendTime > referenceTime) return;

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

  const allUserSends: CompactSend[] = [];
  bestAttemptPerBoulder.forEach((attempt, boulderId) => {
    const boulder = boulderMap.get(boulderId);
    if (!boulder || boulder.is_comp) return;
    const dateStr = attempt.logged_at || boulder.date_added;
    const sendTime = new Date(dateStr).getTime();
    const grade = boulder.grade;
    const baseElo = GRADE_ELO_BASE[grade] ?? 1000;
    const bonus = getAttemptBonus(attempt.status, attempt.attempt_count);

    allUserSends.push({
      boulder,
      attempt,
      grade,
      sendElo: baseElo + bonus,
      sendTime,
      loggedAt: dateStr
    });
  });

  // Sort chronologically for peak window sweep
  allUserSends.sort((a, b) => a.sendTime - b.sendTime);

  // Current 60-day window sends
  const currentWindowSends = allUserSends.filter((s) => s.sendTime >= cutoffTime);
  const currentScore = scoreWindowSends(currentWindowSends);
  const calculatedElo = currentScore.elo;
  const uncappedElo = currentScore.rawElo ?? calculatedElo;
  const totalSendsInWindow = currentWindowSends.length;

  const top15: ScorecardSendItem[] = currentScore.top15.map((s) => {
    const daysAgo = Math.max(0, Math.floor((referenceTime - s.sendTime) / (24 * 60 * 60 * 1000)));
    const daysRemaining = Math.max(0, WINDOW_DAYS - daysAgo);
    return {
      boulder: s.boulder,
      attempt: s.attempt,
      grade: s.grade,
      holdColour: s.boulder.hold_colour,
      isFlash: s.attempt.status === 'flashed' || s.attempt.attempt_count === 1,
      attemptCount: s.attempt.attempt_count,
      sendElo: s.sendElo,
      loggedAt: s.loggedAt,
      daysAgo,
      daysRemaining
    };
  });

  const { title, gradeEquivalent, subGradeDescription } = getClimberTitleFromElo(
    calculatedElo,
    top15,
    uncappedElo
  );
  const { currentLevel, nextLevel, pointsToNextLevel, levelProgress, depthNeededForNextLevel } =
    getDemarcationProgress(calculatedElo, top15);
  const percentile = calculateClimberPercentile(uncappedElo > calculatedElo ? uncappedElo : calculatedElo);
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

  // Historical Peak Elo across rolling 60-day windows
  const peak = computeHistoricalPeakElo(allUserSends, referenceTime);
  const isAtPeak = totalSendsInWindow > 0 && peak.peakElo !== null && calculatedElo >= peak.peakElo;
  const eloDropFromPeak = peak.peakElo !== null ? Math.max(0, peak.peakElo - calculatedElo) : 0;

  return {
    userId,
    profile,
    elo: calculatedElo,
    rawElo: currentScore.rawElo,
    title,
    gradeEquivalent,
    subGradeDescription,
    percentile,
    topPercentile,
    isProvisional: currentScore.isProvisional,
    sendsCount: top15.length,
    totalSendsInWindow,
    topSends: top15,
    hardestSendGrade,
    formStatus,
    currentLevel,
    nextLevel,
    pointsToNextLevel,
    levelProgress,
    depthNeededForNextLevel,
    peakElo: peak.peakElo,
    peakRawElo: peak.peakRawElo,
    peakDate: peak.peakDate,
    peakLevel: peak.peakLevel,
    peakTitle: peak.peakTitle,
    peakGradeEquivalent: peak.peakGradeEquivalent,
    peakIsProvisional: peak.peakIsProvisional,
    peakSendsCount: peak.peakSendsCount,
    isAtPeak,
    eloDropFromPeak
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
