import { Boulder, Attempt, Profile, Grade, GRADES } from '../types';

export interface GradeStat {
  sent: number;
  flashed: number;
  attempted: number;
  totalAttemptsSum: number;
}

export type GradeStatsMap = Record<Grade, GradeStat>;

export interface ClimberStatsData {
  userId: string;
  totalSends: number;
  totalFlashes: number;
  totalAttempted: number;
  flashRate: number;
  flashOfSendsRate: number;
  sendRate: number;
  averageAttemptsOnSend: string;
  maxProjectFight: number;
  distinctColorsCount: number;
  sessionDaysCount: number;
  hardestSend: Grade | null;
  perGrade: GradeStatsMap;
  sentActiveCount: number;
  uniqueBouldersTopped: number;
  pyramidPoints: number;
}

export interface AccoladeItem {
  id: string;
  title: string;
  subtitle: string;
  climber: Profile;
  value: string;
}

export function createEmptyPerGrade(): GradeStatsMap {
  return GRADES.reduce((acc, g) => {
    acc[g] = { sent: 0, flashed: 0, attempted: 0, totalAttemptsSum: 0 };
    return acc;
  }, {} as GradeStatsMap);
}

export function computeClimberStats(
  userId: string,
  filteredAttempts: Attempt[],
  filteredBoulders: Boulder[],
  activeGymBoulders: Boulder[]
): ClimberStatsData {
  const userAttempts = filteredAttempts.filter((a) => a.user_id === userId);
  const sentAttempts = userAttempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
  const flashedAttempts = userAttempts.filter((a) => a.status === 'flashed');

  const totalSends = sentAttempts.length;
  const totalFlashes = flashedAttempts.length;
  const totalAttempted = userAttempts.length;

  const flashRate = totalAttempted > 0 ? Math.round((totalFlashes / totalAttempted) * 100) : 0;
  const sendRate = totalAttempted > 0 ? Math.round((totalSends / totalAttempted) * 100) : 0;

  const totalAttemptsOnSend = sentAttempts.reduce((sum, a) => sum + a.attempt_count, 0);
  const averageAttemptsOnSend = totalSends > 0 ? (totalAttemptsOnSend / totalSends).toFixed(1) : '0';

  let hardestSend: Grade | null = null;
  let maxGradeIndex = -1;

  sentAttempts.forEach((a) => {
    const boulder = filteredBoulders.find((b) => b.id === a.boulder_id);
    if (boulder) {
      const gradeIdx = GRADES.indexOf(boulder.grade);
      if (gradeIdx > maxGradeIndex) {
        maxGradeIndex = gradeIdx;
        hardestSend = boulder.grade;
      }
    }
  });

  const perGrade = createEmptyPerGrade();

  userAttempts.forEach((a) => {
    const boulder = filteredBoulders.find((b) => b.id === a.boulder_id);
    if (boulder && perGrade[boulder.grade]) {
      perGrade[boulder.grade].attempted += 1;
      if (a.status === 'flashed') {
        perGrade[boulder.grade].flashed += 1;
        perGrade[boulder.grade].sent += 1;
        perGrade[boulder.grade].totalAttemptsSum += 1;
      } else if (a.status === 'sent') {
        perGrade[boulder.grade].sent += 1;
        perGrade[boulder.grade].totalAttemptsSum += a.attempt_count;
      }
    }
  });

  const sentActiveCount = activeGymBoulders.filter((b) =>
    sentAttempts.some((a) => a.boulder_id === b.id)
  ).length;

  const pyramidPoints = sentAttempts.reduce((sum, a) => {
    const b = filteredBoulders.find((item) => item.id === a.boulder_id);
    if (!b) return sum;
    const gIndex = GRADES.indexOf(b.grade);
    return sum + Math.max(gIndex, 0) + 1;
  }, 0);

  const flashOfSendsRate = totalSends > 0 ? Math.round((totalFlashes / totalSends) * 100) : 0;
  const maxProjectFight = sentAttempts.reduce((max, a) => Math.max(max, a.attempt_count), 0);
  const distinctColorsCount = new Set(
    sentAttempts.map((a) => filteredBoulders.find((b) => b.id === a.boulder_id)?.hold_colour).filter(Boolean)
  ).size;
  const sessionDaysCount = new Set(
    userAttempts.map((a) => (a.logged_at ? a.logged_at.split('T')[0] : '')).filter(Boolean)
  ).size;

  return {
    userId,
    totalSends,
    totalFlashes,
    totalAttempted,
    flashRate,
    flashOfSendsRate,
    sendRate,
    averageAttemptsOnSend,
    maxProjectFight,
    distinctColorsCount,
    sessionDaysCount,
    hardestSend,
    perGrade,
    sentActiveCount,
    uniqueBouldersTopped: totalSends,
    pyramidPoints
  };
}

export function computeGroupStats(
  filteredAttempts: Attempt[],
  filteredBoulders: Boulder[],
  activeGymBoulders: Boulder[]
): ClimberStatsData {
  const allAttempts = filteredAttempts;
  const sentAttempts = allAttempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
  const flashedAttempts = allAttempts.filter((a) => a.status === 'flashed');

  const totalSends = sentAttempts.length;
  const totalFlashes = flashedAttempts.length;
  const totalAttempted = allAttempts.length;

  const flashRate = totalAttempted > 0 ? Math.round((totalFlashes / totalAttempted) * 100) : 0;
  const sendRate = totalAttempted > 0 ? Math.round((totalSends / totalAttempted) * 100) : 0;

  const totalAttemptsOnSend = sentAttempts.reduce((sum, a) => sum + a.attempt_count, 0);
  const averageAttemptsOnSend = totalSends > 0 ? (totalAttemptsOnSend / totalSends).toFixed(1) : '0';

  let hardestSend: Grade | null = null;
  let maxGradeIndex = -1;

  sentAttempts.forEach((a) => {
    const boulder = filteredBoulders.find((b) => b.id === a.boulder_id);
    if (boulder) {
      const gradeIdx = GRADES.indexOf(boulder.grade);
      if (gradeIdx > maxGradeIndex) {
        maxGradeIndex = gradeIdx;
        hardestSend = boulder.grade;
      }
    }
  });

  const perGrade = createEmptyPerGrade();

  allAttempts.forEach((a) => {
    const boulder = filteredBoulders.find((b) => b.id === a.boulder_id);
    if (boulder && perGrade[boulder.grade]) {
      perGrade[boulder.grade].attempted += 1;
      if (a.status === 'flashed') {
        perGrade[boulder.grade].flashed += 1;
        perGrade[boulder.grade].sent += 1;
        perGrade[boulder.grade].totalAttemptsSum += 1;
      } else if (a.status === 'sent') {
        perGrade[boulder.grade].sent += 1;
        perGrade[boulder.grade].totalAttemptsSum += a.attempt_count;
      }
    }
  });

  const uniqueBouldersTopped = new Set(sentAttempts.map((a) => a.boulder_id)).size;
  const sentActiveCount = activeGymBoulders.filter((b) =>
    sentAttempts.some((a) => a.boulder_id === b.id)
  ).length;

  const pyramidPoints = sentAttempts.reduce((sum, a) => {
    const b = filteredBoulders.find((item) => item.id === a.boulder_id);
    if (!b) return sum;
    const gIndex = GRADES.indexOf(b.grade);
    return sum + Math.max(gIndex, 0) + 1;
  }, 0);

  const flashOfSendsRate = totalSends > 0 ? Math.round((totalFlashes / totalSends) * 100) : 0;
  const maxProjectFight = sentAttempts.reduce((max, a) => Math.max(max, a.attempt_count), 0);
  const distinctColorsCount = new Set(
    sentAttempts.map((a) => filteredBoulders.find((b) => b.id === a.boulder_id)?.hold_colour).filter(Boolean)
  ).size;
  const sessionDaysCount = new Set(
    allAttempts.map((a) => (a.logged_at ? a.logged_at.split('T')[0] : '')).filter(Boolean)
  ).size;

  return {
    userId: 'group',
    totalSends,
    totalFlashes,
    totalAttempted,
    flashRate,
    flashOfSendsRate,
    sendRate,
    averageAttemptsOnSend,
    maxProjectFight,
    distinctColorsCount,
    sessionDaysCount,
    hardestSend,
    perGrade,
    sentActiveCount,
    uniqueBouldersTopped,
    pyramidPoints
  };
}

export interface ClimberStatsEntry extends ClimberStatsData {
  profile: Profile;
  color: { hex: string; bg: string; text: string; border: string; ring: string; badgeBg: string; name: string };
}

export function computeAccolades(climberStatsList: ClimberStatsEntry[]): AccoladeItem[] {
  if (climberStatsList.length === 0) return [];

  const activeClimbers = climberStatsList.filter((c) => c.totalAttempted > 0);
  if (activeClimbers.length === 0) return [];

  const definitions = [
    {
      id: 'apex-crusher',
      title: 'Apex Crusher',
      subtitle: 'Hardest grade topped',
      score: (c: ClimberStatsEntry) => (c.hardestSend ? GRADES.indexOf(c.hardestSend) * 100 + c.totalSends : -1),
      formatValue: (c: ClimberStatsEntry) => `${c.hardestSend || 'V0'} Top Grade`,
      minThreshold: (c: ClimberStatsEntry) => Boolean(c.hardestSend)
    },
    {
      id: 'flash-artist',
      title: 'Flash Artist',
      subtitle: 'First-try on-sight rate',
      score: (c: ClimberStatsEntry) => (c.totalSends >= 2 ? c.flashOfSendsRate * 10 + c.totalFlashes : c.totalFlashes * 5),
      formatValue: (c: ClimberStatsEntry) => `${c.flashOfSendsRate}% (${c.totalFlashes} flashes)`,
      minThreshold: (c: ClimberStatsEntry) => c.totalFlashes > 0
    },
    {
      id: 'project-battler',
      title: 'Project Battler',
      subtitle: 'Tenacity & grit on a send',
      score: (c: ClimberStatsEntry) => (c.maxProjectFight > 1 ? c.maxProjectFight * 10 + c.totalAttempted : c.totalAttempted),
      formatValue: (c: ClimberStatsEntry) => (c.maxProjectFight > 1 ? `${c.maxProjectFight} tries fight` : `${c.totalAttempted} tries`),
      minThreshold: (c: ClimberStatsEntry) => c.totalAttempted > 0
    },
    {
      id: 'circuit-explorer',
      title: 'Circuit Explorer',
      subtitle: 'Hold variety across gym',
      score: (c: ClimberStatsEntry) => c.distinctColorsCount * 10 + c.totalSends,
      formatValue: (c: ClimberStatsEntry) => `${c.distinctColorsCount} circuits sent`,
      minThreshold: (c: ClimberStatsEntry) => c.distinctColorsCount > 0
    },
    {
      id: 'the-sniper',
      title: 'The Sniper',
      subtitle: 'Clean send efficiency',
      score: (c: ClimberStatsEntry) => (c.totalSends >= 2 ? Math.round((10 - Math.min(parseFloat(c.averageAttemptsOnSend), 9)) * 100) : 0),
      formatValue: (c: ClimberStatsEntry) => `${c.averageAttemptsOnSend} tries/send`,
      minThreshold: (c: ClimberStatsEntry) => c.totalSends >= 2
    },
    {
      id: 'session-devotee',
      title: 'Session Devotee',
      subtitle: 'Consistency on the mats',
      score: (c: ClimberStatsEntry) => c.sessionDaysCount * 10 + c.totalSends,
      formatValue: (c: ClimberStatsEntry) => `${c.sessionDaysCount} session days`,
      minThreshold: (c: ClimberStatsEntry) => c.sessionDaysCount > 0
    }
  ];

  const assignmentCounts: Record<string, number> = {};
  activeClimbers.forEach((c) => {
    assignmentCounts[c.userId] = 0;
  });

  const results: AccoladeItem[] = [];

  definitions.forEach((def) => {
    const eligible = activeClimbers.filter((c) => (def.minThreshold ? def.minThreshold(c) : true));
    if (eligible.length === 0) return;

    const minAssignments = Math.min(...eligible.map((c) => assignmentCounts[c.userId] || 0));
    const pool = eligible.filter((c) => (assignmentCounts[c.userId] || 0) === minAssignments);
    const winner = [...pool].sort((a, b) => def.score(b) - def.score(a))[0];

    if (winner && def.score(winner) >= 0) {
      assignmentCounts[winner.userId] = (assignmentCounts[winner.userId] || 0) + 1;
      results.push({
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        climber: winner.profile,
        value: def.formatValue(winner)
      });
    }
  });

  return results;
}
