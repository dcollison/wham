import { Boulder, GymArea, Attempt, Profile, AttemptStatus, CompWallStanding, CompWallScorecardItem, HOLD_COLORS } from '../types';

/**
 * Big Rock Winter Boulder Series 2026/27 Scoring (3 / 2 / 1 / 0 — with Zones):
 * - Flash (1st try top, status === 'flashed'): 3 points
 * - Top (2+ tries top, status === 'sent'): 2 points
 * - Zone (zone reached without top, status === 'attempted'): 1 point
 * - Unattempted / no zone or top: 0 points
 */
export const WINTER_SERIES_POINTS_CONFIG = {
  flash: 3,
  top: 2,
  zone: 1,
  none: 0
};

export function getWinterProblemPoints(status?: AttemptStatus | null): number {
  if (!status) return 0;
  if (status === 'flashed') return WINTER_SERIES_POINTS_CONFIG.flash;
  if (status === 'sent') return WINTER_SERIES_POINTS_CONFIG.top;
  if (status === 'attempted') return WINTER_SERIES_POINTS_CONFIG.zone;
  return 0;
}

export const WINTER_SERIES_FORM_URL =
  'https://forms.cloud.microsoft/pages/responsepage.aspx?id=jc7DhGPfuUG56XXC1_s5htRFwAzcQYhNm5hG2bwZBlFUNjJMVDZKWEY1QkE3TFNSWlVJN1BVRFBJWS4u&origin=QRCode&qrcodeorigin=presentation&route=shorturl';

export const BOND_GYM_ID = 'b0000000-0000-0000-0000-000000000001';
export const HUB_GYM_ID = 'b0000000-0000-0000-0000-000000000002';

export interface WinterSeriesRound {
  roundNumber: 1 | 2 | 3 | 4;
  id: string;
  areaId: string;
  gymId: string;
  gymName: 'Bond' | 'Hub';
  name: string;
  fullName: string;
  areaName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dateRangeLabel: string;
  shortDateLabel: string;
  boulderCount: number;
}

export type WinterRoundStatus = 'active' | 'completed' | 'upcoming';

export interface WinterSeriesRoundWithStatus extends WinterSeriesRound {
  status: WinterRoundStatus;
  isAvailable: boolean;
  daysRemaining?: number;
  daysUntilStart?: number;
}

export const WINTER_SERIES_ROUNDS: WinterSeriesRound[] = [
  {
    roundNumber: 1,
    id: 'wbs-2627-r1',
    areaId: 'c0000000-0000-0000-0000-000000000101',
    gymId: BOND_GYM_ID,
    gymName: 'Bond',
    name: 'Round 1',
    fullName: 'Round 1 • Bond',
    areaName: 'Winter Series R1',
    startDate: '2026-11-09',
    endDate: '2026-11-29',
    dateRangeLabel: '9 Nov – 29 Nov 2026',
    shortDateLabel: '9–29 Nov',
    boulderCount: 25
  },
  {
    roundNumber: 2,
    id: 'wbs-2627-r2',
    areaId: 'c0000000-0000-0000-0000-000000000102',
    gymId: HUB_GYM_ID,
    gymName: 'Hub',
    name: 'Round 2',
    fullName: 'Round 2 • Hub',
    areaName: 'Winter Series R2',
    startDate: '2026-11-30',
    endDate: '2026-12-20',
    dateRangeLabel: '30 Nov – 20 Dec 2026',
    shortDateLabel: '30 Nov–20 Dec',
    boulderCount: 25
  },
  {
    roundNumber: 3,
    id: 'wbs-2627-r3',
    areaId: 'c0000000-0000-0000-0000-000000000103',
    gymId: BOND_GYM_ID,
    gymName: 'Bond',
    name: 'Round 3',
    fullName: 'Round 3 • Bond',
    areaName: 'Winter Series R3',
    startDate: '2027-01-04',
    endDate: '2027-01-24',
    dateRangeLabel: '4 Jan – 24 Jan 2027',
    shortDateLabel: '4–24 Jan',
    boulderCount: 25
  },
  {
    roundNumber: 4,
    id: 'wbs-2627-r4',
    areaId: 'c0000000-0000-0000-0000-000000000104',
    gymId: HUB_GYM_ID,
    gymName: 'Hub',
    name: 'Round 4',
    fullName: 'Round 4 • Hub',
    areaName: 'Winter Series R4',
    startDate: '2027-01-25',
    endDate: '2027-02-14',
    dateRangeLabel: '25 Jan – 14 Feb 2027',
    shortDateLabel: '25 Jan–14 Feb',
    boulderCount: 25
  }
];

export const WINTER_SERIES_AREA_IDS = new Set(WINTER_SERIES_ROUNDS.map((r) => r.areaId));

export function isWinterSeriesAreaId(areaId?: string | null): boolean {
  return Boolean(areaId && WINTER_SERIES_AREA_IDS.has(areaId));
}

export function getWinterRoundBoulderId(roundNumber: number, compNumber: number): string {
  const rHex = String(roundNumber).padStart(4, '0');
  const bHex = String(compNumber).padStart(12, '0');
  return `d0000000-0000-0000-${rHex}-${bHex}`;
}

export function isWinterSeriesBoulderId(boulderId?: string | null): boolean {
  if (!boulderId) return false;
  return /^d0000000-0000-0000-000[1-4]-0000000000(0[1-9]|1[0-9]|2[0-5])$/i.test(boulderId);
}

export function isWinterSeriesBoulder(
  boulder?: Pick<Boulder, 'id' | 'area_id'> | null
): boolean {
  if (!boulder) return false;
  return isWinterSeriesBoulderId(boulder.id) || isWinterSeriesAreaId(boulder.area_id);
}

function parseLocalStartOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function parseLocalEndOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
}

export function getWinterRoundStatus(
  round: WinterSeriesRound,
  now: Date = new Date()
): WinterSeriesRoundWithStatus {
  const start = parseLocalStartOfDay(round.startDate);
  const end = parseLocalEndOfDay(round.endDate);
  const nowMs = now.getTime();

  if (nowMs >= start.getTime() && nowMs <= end.getTime()) {
    const diffDays = Math.max(0, Math.ceil((end.getTime() - nowMs) / (1000 * 60 * 60 * 24)));
    return {
      ...round,
      status: 'active',
      isAvailable: true,
      daysRemaining: diffDays
    };
  }

  if (nowMs > end.getTime()) {
    return {
      ...round,
      status: 'completed',
      isAvailable: true
    };
  }

  const daysUntilStart = Math.max(1, Math.ceil((start.getTime() - nowMs) / (1000 * 60 * 60 * 24)));
  return {
    ...round,
    status: 'upcoming',
    isAvailable: false,
    daysUntilStart
  };
}

export function getWinterRoundsWithStatus(
  attempts: Attempt[] = [],
  now: Date = new Date()
): WinterSeriesRoundWithStatus[] {
  const attemptBoulderIds = new Set(attempts.map((a) => a.boulder_id));

  const rounds = WINTER_SERIES_ROUNDS.map((round) => {
    const info = getWinterRoundStatus(round, now);
    // Also mark available if any attempt has already been logged on this round's boulders
    let hasAttempts = false;
    for (let i = 1; i <= round.boulderCount; i++) {
      if (attemptBoulderIds.has(getWinterRoundBoulderId(round.roundNumber, i))) {
        hasAttempts = true;
        break;
      }
    }
    return {
      ...info,
      isAvailable: info.isAvailable || hasAttempts
    };
  });

  // Ensure at least Round 1 is available if current date is before Round 1 start
  if (!rounds.some((r) => r.isAvailable) && rounds.length > 0) {
    rounds[0].isAvailable = true;
  }

  return rounds;
}

export function getActiveWinterRound(
  attempts: Attempt[] = [],
  now: Date = new Date()
): WinterSeriesRoundWithStatus {
  const rounds = getWinterRoundsWithStatus(attempts, now);
  const active = rounds.find((r) => r.status === 'active');
  if (active) return active;

  // If between rounds or after series, pick the latest completed round
  const completed = [...rounds].reverse().find((r) => r.status === 'completed');
  if (completed) return completed;

  return rounds[0];
}

export function isWinterRoundActiveForArea(areaId: string, now: Date = new Date()): boolean {
  const round = WINTER_SERIES_ROUNDS.find((r) => r.areaId === areaId);
  if (!round) return true;
  return getWinterRoundStatus(round, now).status === 'active';
}

export function buildWinterSeriesAreas(): GymArea[] {
  return WINTER_SERIES_ROUNDS.map((round) => ({
    id: round.areaId,
    gym_id: round.gymId,
    name: round.areaName,
    sort_order: 20 + round.roundNumber,
    is_comp_wall: true
  }));
}

const DEFAULT_HOLD_COLOR_CYCLE = Object.keys(HOLD_COLORS);

export function buildWinterRoundBoulders(
  round: WinterSeriesRound,
  now: Date = new Date()
): Boulder[] {
  const roundInfo = getWinterRoundStatus(round, now);
  const isArchivedOnWall = roundInfo.status !== 'active';

  const items: Boulder[] = [];
  for (let num = 1; num <= round.boulderCount; num++) {
    const defaultColour = DEFAULT_HOLD_COLOR_CYCLE[(num - 1) % DEFAULT_HOLD_COLOR_CYCLE.length] || 'Yellow';
    items.push({
      id: getWinterRoundBoulderId(round.roundNumber, num),
      gym_id: round.gymId,
      area_id: round.areaId,
      hold_colour: defaultColour,
      grade: 'VB',
      position_order: num,
      notes: `Big Rock Winter Boulder Series • ${round.name} (${round.gymName}) #${num}`,
      image_url: null,
      date_added: round.startDate,
      is_archived: isArchivedOnWall,
      is_comp: true,
      comp_number: num
    });
  }
  return items;
}

export function buildWinterSeriesBoulders(now: Date = new Date()): Boulder[] {
  return WINTER_SERIES_ROUNDS.flatMap((round) => buildWinterRoundBoulders(round, now));
}

export function mergeWinterSeriesAreas(existingAreas: GymArea[]): GymArea[] {
  const winterAreas = buildWinterSeriesAreas();
  const existingMap = new Map(existingAreas.map((a) => [a.id, a]));
  const result = [...existingAreas];

  for (const wa of winterAreas) {
    if (!existingMap.has(wa.id)) {
      result.push(wa);
    } else {
      const idx = result.findIndex((a) => a.id === wa.id);
      if (idx !== -1 && !result[idx].is_comp_wall) {
        result[idx] = { ...result[idx], is_comp_wall: true };
      }
    }
  }
  return result;
}

export function mergeWinterSeriesBoulders(
  existingBoulders: Boulder[],
  now: Date = new Date(),
  localFallbackBoulders: Boulder[] = []
): Boulder[] {
  const winterBoulders = buildWinterSeriesBoulders(now);
  const existingMap = new Map(existingBoulders.map((b) => [b.id, b]));
  const localMap = new Map(localFallbackBoulders.map((b) => [b.id, b]));

  const result = existingBoulders.map((b) => {
    if (isWinterSeriesAreaId(b.area_id)) {
      const round = WINTER_SERIES_ROUNDS.find((r) => r.areaId === b.area_id);
      const isRoundActive = round ? getWinterRoundStatus(round, now).status === 'active' : false;
      return {
        ...b,
        is_comp: true,
        comp_number: b.comp_number ?? Math.round(b.position_order),
        is_archived: !isRoundActive
      };
    }
    return b;
  });

  for (const wb of winterBoulders) {
    if (!existingMap.has(wb.id)) {
      const localVersion = localMap.get(wb.id);
      if (localVersion) {
        result.push({
          ...localVersion,
          is_comp: true,
          comp_number: localVersion.comp_number ?? wb.comp_number,
          is_archived: wb.is_archived
        });
      } else {
        result.push(wb);
      }
    }
  }

  return result;
}

export function getRoundBoulders(
  round: WinterSeriesRound,
  boulders: Boulder[],
  now: Date = new Date()
): Boulder[] {
  const existingForRound = boulders.filter((b) => b.area_id === round.areaId);
  const byNumber = new Map<number, Boulder>();
  for (const b of existingForRound) {
    const num = b.comp_number ?? Math.round(b.position_order);
    if (num >= 1 && num <= round.boulderCount && !byNumber.has(num)) {
      byNumber.set(num, b);
    }
  }

  const defaults = buildWinterRoundBoulders(round, now);
  return defaults.map((def) => byNumber.get(def.comp_number!) || def);
}

/**
 * Computes crew standings for a Winter Series round (3 / 2 / 1 / 0 scoring with Zones).
 * Ranked by:
 * 1st: Total Points (DESC)
 * 2nd: Total Tops (DESC)
 * 3rd: Total Flashes (DESC)
 * 4th: Total Zones (DESC)
 * 5th: Fewest Attempts on Tops (ASC)
 */
export function computeWinterRoundStandings(
  compBoulders: Boulder[],
  attempts: Attempt[],
  climbers: Profile[],
  includeArchived: boolean = true
): CompWallStanding[] {
  const activeBoulders = includeArchived ? compBoulders : compBoulders.filter(b => !b.is_archived);
  const boulderIds = new Set(activeBoulders.map(b => b.id));

  const compAttempts = attempts.filter(a => boulderIds.has(a.boulder_id));

  const standings: CompWallStanding[] = climbers.map(climber => {
    const climberAttempts = compAttempts.filter(
      a => a.user_id === climber.id && getWinterProblemPoints(a.status) > 0
    );
    let totalPoints = 0;
    let topsCount = 0;
    let flashesCount = 0;
    let zonesCount = 0;
    let unattemptedCount = 0;
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
        const newPts = getWinterProblemPoints(att.status);
        const oldPts = getWinterProblemPoints(existing.status);
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

      if (attempt && getWinterProblemPoints(attempt.status) > 0) {
        const tries = attempt.attempt_count || 1;
        const isFlash = attempt.status === 'flashed';
        const isTop = attempt.status === 'flashed' || attempt.status === 'sent';
        const isZone = attempt.status === 'attempted';
        const pts = getWinterProblemPoints(attempt.status);

        totalPoints += pts;
        if (isFlash) {
          flashesCount += 1;
          topsCount += 1;
          attemptsOnTops += 1;
        } else if (attempt.status === 'sent') {
          topsCount += 1;
          attemptsOnTops += Math.max(2, tries);
        } else if (isZone) {
          zonesCount += 1;
        }

        if (isTop && (highestTopNumber === null || num > highestTopNumber)) {
          highestTopNumber = num;
        }

        completedBoulders.push({
          boulderId: boulder.id,
          compNumber: num,
          points: pts,
          status: attempt.status,
          isFlash,
          isTop,
          isZone,
          attempts: tries
        });
      } else {
        unattemptedCount += 1;
      }
    });

    // Untried boulders can still yield up to 3 pts (Flash); Zone-only boulders (1 pt) can be topped for 2 pts (+1 pt gain)
    const pointsUpForGrabs =
      unattemptedCount * WINTER_SERIES_POINTS_CONFIG.flash +
      zonesCount * (WINTER_SERIES_POINTS_CONFIG.top - WINTER_SERIES_POINTS_CONFIG.zone);
    const maxPossiblePoints = totalPoints + pointsUpForGrabs;
    const bouldersLeftToScore = unattemptedCount + zonesCount;

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

  // Sort: 1st Points -> 2nd Tops -> 3rd Flashes -> 4th Zones -> 5th Fewest Attempts on Tops
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.topsCount !== a.topsCount) return b.topsCount - a.topsCount;
    if (b.flashesCount !== a.flashesCount) return b.flashesCount - a.flashesCount;
    if (b.zonesCount !== a.zonesCount) return b.zonesCount - a.zonesCount;
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
        prev.zonesCount === curr.zonesCount &&
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
 * Computes full scorecard grid items for Winter Series boulders (#1 through #25).
 */
export function computeWinterRoundScorecard(
  compBoulders: Boulder[],
  attempts: Attempt[],
  includeArchived: boolean = true
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
      a => a.boulder_id === boulder.id && getWinterProblemPoints(a.status) > 0
    );
    const userAttempts: Record<string, { status: AttemptStatus; attemptCount: number; points: number }> = {};

    boulderAttempts.forEach(att => {
      const pts = getWinterProblemPoints(att.status);
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

export interface WinterSeriesOverallStanding {
  climber: Profile;
  rank: number;
  totalPoints: number;
  topsCount: number;
  flashesCount: number;
  zonesCount: number;
  unattemptedCount: number;
  pointsUpForGrabs: number;
  maxPossiblePoints: number;
  bouldersLeftToScore: number;
  roundScores: Record<number, {
    points: number;
    flashes: number;
    tops: number;
    zones: number;
    untried: number;
    pointsUpForGrabs: number;
  }>;
}

export function computeWinterSeriesOverallStandings(
  boulders: Boulder[],
  attempts: Attempt[],
  climbers: Profile[],
  now: Date = new Date()
): WinterSeriesOverallStanding[] {
  const rounds = getWinterRoundsWithStatus(attempts, now);
  const availableRounds = rounds.filter((r) => r.isAvailable);

  const standingsByRound = new Map<number, ReturnType<typeof computeWinterRoundStandings>>();
  for (const round of WINTER_SERIES_ROUNDS) {
    const roundBoulders = getRoundBoulders(round, boulders, now);
    standingsByRound.set(
      round.roundNumber,
      computeWinterRoundStandings(roundBoulders, attempts, climbers, true)
    );
  }

  const overall: WinterSeriesOverallStanding[] = climbers.map((climber) => {
    let totalPoints = 0;
    let topsCount = 0;
    let flashesCount = 0;
    let zonesCount = 0;
    let unattemptedCount = 0;
    let pointsUpForGrabs = 0;
    let bouldersLeftToScore = 0;

    const roundScores: WinterSeriesOverallStanding['roundScores'] = {};

    for (const round of WINTER_SERIES_ROUNDS) {
      const rStandings = standingsByRound.get(round.roundNumber) || [];
      const cs = rStandings.find((s) => s.climber.id === climber.id);
      const pts = cs?.totalPoints || 0;
      const flashes = cs?.flashesCount || 0;
      const tops = cs?.topsCount || 0;
      const zones = cs?.zonesCount || 0;
      const untried = cs?.unattemptedCount ?? round.boulderCount;
      const upForGrabs =
        cs?.pointsUpForGrabs ?? round.boulderCount * WINTER_SERIES_POINTS_CONFIG.flash;

      roundScores[round.roundNumber] = {
        points: pts,
        flashes,
        tops,
        zones,
        untried,
        pointsUpForGrabs: upForGrabs
      };

      const isRoundActiveOrPast = availableRounds.some((ar) => ar.roundNumber === round.roundNumber);
      if (isRoundActiveOrPast) {
        totalPoints += pts;
        topsCount += tops;
        flashesCount += flashes;
        zonesCount += zones;
        unattemptedCount += untried;
        pointsUpForGrabs += upForGrabs;
        bouldersLeftToScore += untried + zones;
      }
    }

    return {
      climber,
      rank: 1,
      totalPoints,
      topsCount,
      flashesCount,
      zonesCount,
      unattemptedCount,
      pointsUpForGrabs,
      maxPossiblePoints: totalPoints + pointsUpForGrabs,
      bouldersLeftToScore,
      roundScores
    };
  });

  overall.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.topsCount !== a.topsCount) return b.topsCount - a.topsCount;
    if (b.flashesCount !== a.flashesCount) return b.flashesCount - a.flashesCount;
    return b.zonesCount - a.zonesCount;
  });

  let currentRank = 1;
  for (let i = 0; i < overall.length; i++) {
    if (i > 0) {
      const prev = overall[i - 1];
      const curr = overall[i];
      const isTied =
        prev.totalPoints === curr.totalPoints &&
        prev.topsCount === curr.topsCount &&
        prev.flashesCount === curr.flashesCount &&
        prev.zonesCount === curr.zonesCount;
      if (!isTied) {
        currentRank = i + 1;
      }
    }
    overall[i].rank = currentRank;
  }

  return overall;
}
