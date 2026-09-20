import React, { useState, useMemo, useEffect } from 'react';
import {
  Boulder,
  Attempt,
  Profile,
  Gym,
  GymArea,
  Grade,
  GRADES,
  HOLD_COLORS,
  CLIMBER_COLORS,
  CLIMBER_ACCENT_PALETTE,
  getClimberColor,
  getHoldSwatchStyle
} from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { CompLeaderboard } from '../leaderboard/CompLeaderboard';
import {
  Zap,
  Check,
  Trophy,
  Target,
  Flame,
  BarChart3,
  Users,
  User,
  Swords,
  Crown,
  Layers,
  Sparkles,
  TrendingUp,
  Percent,
  CheckCircle2,
  CircleDot,
  ArrowRight,
  Compass,
  Award,
  Calendar,
  Activity,
  LineChart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface StatsDashboardProps {
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  initialTab?: 'overview' | 'leaderboard' | 'comparison' | 'timeline' | 'pyramid' | 'circuits';
  onSelectBoulder?: (boulder: Boulder) => void;
}

export { CLIMBER_COLORS, CLIMBER_ACCENT_PALETTE, getClimberColor };

const getAccoladeIcon = (id: string) => {
  switch (id) {
    case 'apex-crusher':
      return <Flame className="w-5 h-5 text-amber-400" />;
    case 'flash-artist':
      return <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />;
    case 'project-battler':
      return <Activity className="w-5 h-5 text-amber-400" />;
    case 'circuit-explorer':
      return <Layers className="w-5 h-5 text-amber-400" />;
    case 'the-sniper':
      return <Target className="w-5 h-5 text-amber-400" />;
    case 'session-devotee':
      return <Calendar className="w-5 h-5 text-amber-400" />;
    default:
      return <Award className="w-5 h-5 text-amber-400" />;
  }
};

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  boulders,
  attempts,
  climbers,
  gyms,
  areas,
  currentUserId,
  initialTab,
  onSelectBoulder
}) => {
  // Navigation tabs inside Stats Dashboard
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'comparison' | 'timeline' | 'pyramid' | 'circuits'>(
    initialTab || 'overview'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [viewMode, setViewMode] = useState<'my' | 'group'>('my');
  const [selectedGymId, setSelectedGymId] = useState<string>('all');
  const [selectedClimberId, setSelectedClimberId] = useState<string>(currentUserId || climbers[0]?.id || '');

  // User preference to show or hide crew accolades
  const [showAccolades, setShowAccolades] = useState<boolean>(() => {
    const saved = localStorage.getItem('wham_show_accolades');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleAccolades = (show: boolean) => {
    setShowAccolades(show);
    localStorage.setItem('wham_show_accolades', String(show));
  };

  // Timeline / Over Time controls
  const [timelineClimberFilter, setTimelineClimberFilter] = useState<string>('all');
  const [timelineChartMode, setTimelineChartMode] = useState<'grade' | 'cumulative' | 'volume'>('grade');
  const [expandedSessionDate, setExpandedSessionDate] = useState<string | null>(null);

  // 1-on-1 Battle selections
  const [battleClimberAId, setBattleClimberAId] = useState<string>(
    currentUserId || climbers[0]?.id || ''
  );
  const [battleClimberBId, setBattleClimberBId] = useState<string>(
    climbers.find((c) => c.id !== (currentUserId || climbers[0]?.id))?.id || climbers[1]?.id || climbers[0]?.id || ''
  );

  // Sync selectedClimberId if currentUserId changes
  useEffect(() => {
    if (currentUserId) {
      setSelectedClimberId(currentUserId);
      if (!battleClimberAId) setBattleClimberAId(currentUserId);
    }
  }, [currentUserId]);

  // Filter boulders by selected gym
  const filteredBoulders = useMemo(() => {
    if (selectedGymId === 'all') return boulders;
    return boulders.filter((b) => b.gym_id === selectedGymId);
  }, [boulders, selectedGymId]);

  const boulderIdSet = useMemo(() => new Set(filteredBoulders.map((b) => b.id)), [filteredBoulders]);

  // Filter attempts matching filtered boulders
  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => boulderIdSet.has(a.boulder_id));
  }, [attempts, boulderIdSet]);

  const activeGymBoulders = useMemo(() => {
    return filteredBoulders.filter((b) => !b.is_archived);
  }, [filteredBoulders]);

  // Generator: Climber stats computation
  const computeClimberStats = (userId: string) => {
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

    const perGrade: Record<Grade, { sent: number; flashed: number; attempted: number; totalAttemptsSum: number }> =
      GRADES.reduce((acc, g) => {
        acc[g] = { sent: 0, flashed: 0, attempted: 0, totalAttemptsSum: 0 };
        return acc;
      }, {} as any);

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
  };

  // Group metrics generator (combined crew stats)
  const computeGroupStats = () => {
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

    const perGrade: Record<Grade, { sent: number; flashed: number; attempted: number; totalAttemptsSum: number }> =
      GRADES.reduce((acc, g) => {
        acc[g] = { sent: 0, flashed: 0, attempted: 0, totalAttemptsSum: 0 };
        return acc;
      }, {} as any);

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

    return {
      userId: 'group',
      totalSends,
      totalFlashes,
      totalAttempted,
      flashRate,
      sendRate,
      averageAttemptsOnSend,
      hardestSend,
      perGrade,
      sentActiveCount,
      uniqueBouldersTopped,
      pyramidPoints
    };
  };

  // Active target stats (either current user or aggregate group)
  const activeStats = useMemo(() => {
    if (viewMode === 'my') {
      const targetId = selectedClimberId || currentUserId || climbers[0]?.id || '';
      return computeClimberStats(targetId);
    }
    return computeGroupStats();
  }, [viewMode, selectedClimberId, currentUserId, filteredAttempts, filteredBoulders, climbers, activeGymBoulders]);

  // Full Leaderboard & Per-Climber Stats list
  const climberStatsList = useMemo(() => {
    return climbers.map((c, index) => {
      const stats = computeClimberStats(c.id);
      const color = getClimberColor(c, index);
      return {
        profile: c,
        color,
        ...stats
      };
    });
  }, [climbers, filteredAttempts, filteredBoulders, activeGymBoulders]);

  const sortedLeaderboard = useMemo(() => {
    return [...climberStatsList].sort((a, b) => b.totalSends - a.totalSends);
  }, [climberStatsList]);

  const maxGradeOverall = useMemo(() => {
    return climberStatsList.reduce((max, c) => {
      const idx = c.hardestSend ? GRADES.indexOf(c.hardestSend) : -1;
      return idx > max ? idx : max;
    }, -1);
  }, [climberStatsList]);

  const maxSendsOverall = useMemo(() => {
    return climberStatsList.reduce((max, c) => (c.totalSends > max ? c.totalSends : max), 0);
  }, [climberStatsList]);

  const maxFlashesOverall = useMemo(() => {
    return climberStatsList.reduce((max, c) => (c.totalFlashes > max ? c.totalFlashes : max), 0);
  }, [climberStatsList]);

  // Diverse Crew Superlatives: Each accolade highlights standout qualities across your crew
  const accoladesList = useMemo<{
    id: string;
    title: string;
    climber: Profile;
    value: string;
    subtitle: string;
  }[]>(() => {
    if (climberStatsList.length === 0) return [];

    const activeClimbers = climberStatsList.filter((c) => c.totalAttempted > 0);
    if (activeClimbers.length === 0) return [];

    const definitions = [
      {
        id: 'apex-crusher',
        title: 'Apex Crusher',
        subtitle: 'Hardest grade topped',
        score: (c: typeof climberStatsList[0]) => (c.hardestSend ? GRADES.indexOf(c.hardestSend) * 100 + c.totalSends : -1),
        formatValue: (c: typeof climberStatsList[0]) => `${c.hardestSend || 'V0'} Top Grade`,
        minThreshold: (c: typeof climberStatsList[0]) => Boolean(c.hardestSend)
      },
      {
        id: 'flash-artist',
        title: 'Flash Artist',
        subtitle: 'First-try on-sight rate',
        score: (c: typeof climberStatsList[0]) => (c.totalSends >= 2 ? c.flashOfSendsRate * 10 + c.totalFlashes : c.totalFlashes * 5),
        formatValue: (c: typeof climberStatsList[0]) => `${c.flashOfSendsRate}% (${c.totalFlashes} flashes)`,
        minThreshold: (c: typeof climberStatsList[0]) => c.totalFlashes > 0
      },
      {
        id: 'project-battler',
        title: 'Project Battler',
        subtitle: 'Tenacity & grit on a send',
        score: (c: typeof climberStatsList[0]) => (c.maxProjectFight > 1 ? c.maxProjectFight * 10 + c.totalAttempted : c.totalAttempted),
        formatValue: (c: typeof climberStatsList[0]) => (c.maxProjectFight > 1 ? `${c.maxProjectFight} tries fight` : `${c.totalAttempted} tries`),
        minThreshold: (c: typeof climberStatsList[0]) => c.totalAttempted > 0
      },
      {
        id: 'circuit-explorer',
        title: 'Circuit Explorer',
        subtitle: 'Hold variety across gym',
        score: (c: typeof climberStatsList[0]) => c.distinctColorsCount * 10 + c.totalSends,
        formatValue: (c: typeof climberStatsList[0]) => `${c.distinctColorsCount} circuits sent`,
        minThreshold: (c: typeof climberStatsList[0]) => c.distinctColorsCount > 0
      },
      {
        id: 'the-sniper',
        title: 'The Sniper',
        subtitle: 'Clean send efficiency',
        score: (c: typeof climberStatsList[0]) => (c.totalSends >= 2 ? Math.round((10 - Math.min(parseFloat(c.averageAttemptsOnSend), 9)) * 100) : 0),
        formatValue: (c: typeof climberStatsList[0]) => `${c.averageAttemptsOnSend} tries/send`,
        minThreshold: (c: typeof climberStatsList[0]) => c.totalSends >= 2
      },
      {
        id: 'session-devotee',
        title: 'Session Devotee',
        subtitle: 'Consistency on the mats',
        score: (c: typeof climberStatsList[0]) => c.sessionDaysCount * 10 + c.totalSends,
        formatValue: (c: typeof climberStatsList[0]) => `${c.sessionDaysCount} session days`,
        minThreshold: (c: typeof climberStatsList[0]) => c.sessionDaysCount > 0
      }
    ];

    const assignmentCounts: Record<string, number> = {};
    activeClimbers.forEach((c) => {
      assignmentCounts[c.userId] = 0;
    });

    const results: {
      id: string;
      title: string;
      climber: Profile;
      value: string;
      subtitle: string;
    }[] = [];

    definitions.forEach((def) => {
      const eligible = activeClimbers.filter((c) => (def.minThreshold ? def.minThreshold(c) : true));
      if (eligible.length === 0) return;

      // Find the minimum number of assignments among eligible climbers to prioritize underrepresented climbers
      const minAssignments = Math.min(...eligible.map((c) => assignmentCounts[c.userId] || 0));

      // Candidates with that minimum assignment count
      const pool = eligible.filter((c) => (assignmentCounts[c.userId] || 0) === minAssignments);

      // Best candidate by score
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
  }, [climberStatsList]);

  // Gym Completion Progress Ring
  const userSentActiveBoulders = useMemo(() => {
    return activeGymBoulders.filter((b) => {
      if (viewMode === 'my') {
        const targetId = selectedClimberId || currentUserId || climbers[0]?.id;
        return filteredAttempts.some(
          (a) => a.boulder_id === b.id && a.user_id === targetId && (a.status === 'sent' || a.status === 'flashed')
        );
      }
      return filteredAttempts.some(
        (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
      );
    });
  }, [activeGymBoulders, filteredAttempts, viewMode, selectedClimberId, currentUserId, climbers]);

  const completionPct = activeGymBoulders.length > 0
    ? Math.round((userSentActiveBoulders.length / activeGymBoulders.length) * 100)
    : 0;

  // Breakdown of active climbs remaining per area
  const areaBreakdown = useMemo(() => {
    const relevantAreas = selectedGymId === 'all'
      ? areas
      : areas.filter((a) => a.gym_id === selectedGymId);

    const targetId = selectedClimberId || currentUserId || climbers[0]?.id;

    return relevantAreas.map((area) => {
      const areaBoulders = activeGymBoulders.filter((b) => b.area_id === area.id);
      const sent = areaBoulders.filter((b) => {
        if (viewMode === 'my') {
          return filteredAttempts.some(
            (a) => a.boulder_id === b.id && a.user_id === targetId && (a.status === 'sent' || a.status === 'flashed')
          );
        }
        return filteredAttempts.some(
          (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
        );
      });
      return {
        area,
        total: areaBoulders.length,
        sent: sent.length,
        remaining: areaBoulders.length - sent.length,
        pct: areaBoulders.length > 0 ? Math.round((sent.length / areaBoulders.length) * 100) : 0
      };
    }).filter((ab) => ab.total > 0);
  }, [areas, selectedGymId, activeGymBoulders, filteredAttempts, viewMode, currentUserId, selectedClimberId, climbers]);

  // 1-on-1 Head-to-Head Battle Computations
  const battleData = useMemo(() => {
    const climberA = climberStatsList.find((c) => c.profile.id === battleClimberAId) || climberStatsList[0];
    const climberB = climberStatsList.find((c) => c.profile.id === battleClimberBId) || climberStatsList[1] || climberStatsList[0];

    if (!climberA || !climberB) return null;

    const aSentBoulderIds = new Set(
      filteredAttempts
        .filter((a) => a.user_id === climberA.profile.id && (a.status === 'sent' || a.status === 'flashed'))
        .map((a) => a.boulder_id)
    );

    const bSentBoulderIds = new Set(
      filteredAttempts
        .filter((a) => a.user_id === climberB.profile.id && (a.status === 'sent' || a.status === 'flashed'))
        .map((a) => a.boulder_id)
    );

    const sharedIds = [...aSentBoulderIds].filter((id) => bSentBoulderIds.has(id));

    const aOnlyActiveBoulders = activeGymBoulders.filter(
      (b) => aSentBoulderIds.has(b.id) && !bSentBoulderIds.has(b.id)
    );

    const bOnlyActiveBoulders = activeGymBoulders.filter(
      (b) => bSentBoulderIds.has(b.id) && !aSentBoulderIds.has(b.id)
    );

    return {
      climberA,
      climberB,
      sharedCount: sharedIds.length,
      aOnlyActiveBoulders,
      bOnlyActiveBoulders
    };
  }, [climberStatsList, battleClimberAId, battleClimberBId, filteredAttempts, activeGymBoulders]);

  // Timeline / Progression Over Time Computations
  const timelineData = useMemo(() => {
    const dateSet = new Set<string>();
    filteredAttempts.forEach((a) => {
      if (a.logged_at) {
        dateSet.add(a.logged_at.split('T')[0]);
      }
    });

    const sortedDates = [...dateSet].sort();

    if (sortedDates.length === 0) {
      return {
        dates: [],
        sessions: [],
        climberSeries: [],
        maxVolumeAnySession: 1
      };
    }

    const sessions = sortedDates.map((dateStr) => {
      const dayAttempts = filteredAttempts.filter(
        (a) => a.logged_at && a.logged_at.startsWith(dateStr)
      );
      const sentAttempts = dayAttempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
      const flashes = dayAttempts.filter((a) => a.status === 'flashed');

      let hardestSend: Grade | null = null;
      let maxIdx = -1;
      sentAttempts.forEach((a) => {
        const b = filteredBoulders.find((item) => item.id === a.boulder_id);
        if (b) {
          const gIdx = GRADES.indexOf(b.grade);
          if (gIdx > maxIdx) {
            maxIdx = gIdx;
            hardestSend = b.grade;
          }
        }
      });

      const attendeeIds = new Set(dayAttempts.map((a) => a.user_id));
      const attendees = climbers.filter((c) => attendeeIds.has(c.id));

      const sendsList = sentAttempts.map((a) => {
        const b = filteredBoulders.find((item) => item.id === a.boulder_id);
        const climber = climbers.find((c) => c.id === a.user_id);
        return {
          attempt: a,
          boulder: b,
          climber
        };
      });

      return {
        date: dateStr,
        totalAttempts: dayAttempts.length,
        totalSends: sentAttempts.length,
        totalFlashes: flashes.length,
        flashRate: sentAttempts.length > 0 ? Math.round((flashes.length / sentAttempts.length) * 100) : 0,
        hardestSend,
        attendees,
        sendsList
      };
    });

    const climberSeries = climbers.map((c, idx) => {
      let runningCumulativeSends = 0;
      let highestGradeSoFarIdx = -1;

      const points = sortedDates.map((dateStr) => {
        const dayAttempts = filteredAttempts.filter(
          (a) => a.user_id === c.id && a.logged_at && a.logged_at.startsWith(dateStr)
        );
        const daySends = dayAttempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
        runningCumulativeSends += daySends.length;

        let sessionMaxGrade: Grade | null = null;
        let sessionMaxIdx = -1;

        daySends.forEach((a) => {
          const b = filteredBoulders.find((item) => item.id === a.boulder_id);
          if (b) {
            const gIdx = GRADES.indexOf(b.grade);
            if (gIdx > sessionMaxIdx) {
              sessionMaxIdx = gIdx;
              sessionMaxGrade = b.grade;
            }
            if (gIdx > highestGradeSoFarIdx) {
              highestGradeSoFarIdx = gIdx;
            }
          }
        });

        return {
          date: dateStr,
          sessionSends: daySends.length,
          sessionFlashes: daySends.filter((a) => a.status === 'flashed').length,
          sessionMaxGrade,
          sessionMaxIdx: sessionMaxIdx >= 0 ? sessionMaxIdx : null,
          allTimeMaxGrade: highestGradeSoFarIdx >= 0 ? GRADES[highestGradeSoFarIdx] : null,
          allTimeMaxIdx: highestGradeSoFarIdx >= 0 ? highestGradeSoFarIdx : null,
          cumulativeSends: runningCumulativeSends
        };
      });

      return {
        climber: c,
        color: getClimberColor(c, idx),
        points
      };
    });

    const maxVolumeAnySession = Math.max(...sessions.map((s) => s.totalSends), 1);

    return {
      dates: sortedDates,
      sessions,
      climberSeries,
      maxVolumeAnySession
    };
  }, [filteredAttempts, filteredBoulders, climbers]);

  const climberSeriesToDisplay = useMemo(() => {
    if (timelineClimberFilter === 'all') {
      return timelineData.climberSeries;
    }
    return timelineData.climberSeries.filter((s) => s.climber.id === timelineClimberFilter);
  }, [timelineData, timelineClimberFilter]);

  // Hold colour circuit breakdown (dynamically computed from active boulders of each colour)
  const circuitBreakdown = useMemo(() => {
    const colorKeys = Object.keys(HOLD_COLORS);

    const list = colorKeys.map((colorName) => {
      const circuitBoulders = activeGymBoulders.filter((b) => b.hold_colour.toLowerCase() === colorName.toLowerCase());
      if (circuitBoulders.length === 0) return null;

      const circuitIdSet = new Set(circuitBoulders.map((b) => b.id));

      const memberSends = climbers.map((c) => {
        const sentCount = filteredAttempts.filter(
          (a) => a.user_id === c.id && circuitIdSet.has(a.boulder_id) && (a.status === 'sent' || a.status === 'flashed')
        ).length;
        return {
          climber: c,
          sentCount
        };
      });

      const crewToppedCount = circuitBoulders.filter((b) =>
        filteredAttempts.some(
          (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
        )
      ).length;

      // Dynamically determine the actual grade range of this hold colour circuit
      const distinctGrades = Array.from(new Set(circuitBoulders.map((b) => b.grade))).sort(
        (a, b) => GRADES.indexOf(a) - GRADES.indexOf(b)
      );

      const minGrade = distinctGrades[0];
      const maxGrade = distinctGrades[distinctGrades.length - 1];
      const minGradeIdx = minGrade ? GRADES.indexOf(minGrade) : 999;

      const gradeRange = distinctGrades.length === 0
        ? 'No active climbs'
        : minGrade === maxGrade
        ? minGrade
        : `${minGrade} – ${maxGrade}`;

      // Hardest grade topped by crew in this circuit
      let hardestSend: Grade | null = null;
      let maxToppedIdx = -1;
      circuitBoulders.forEach((b) => {
        const isTopped = filteredAttempts.some(
          (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
        );
        if (isTopped) {
          const gIdx = GRADES.indexOf(b.grade);
          if (gIdx > maxToppedIdx) {
            maxToppedIdx = gIdx;
            hardestSend = b.grade;
          }
        }
      });

      return {
        name: colorName,
        config: HOLD_COLORS[colorName],
        gradeRange,
        distinctGrades,
        minGradeIdx,
        hardestSend,
        totalActive: circuitBoulders.length,
        crewToppedCount,
        crewPct: Math.round((crewToppedCount / circuitBoulders.length) * 100),
        memberSends
      };
    }).filter(Boolean) as Array<{
      name: string;
      config: (typeof HOLD_COLORS)[string];
      gradeRange: string;
      distinctGrades: Grade[];
      minGradeIdx: number;
      hardestSend: Grade | null;
      totalActive: number;
      crewToppedCount: number;
      crewPct: number;
      memberSends: Array<{ climber: Profile; sentCount: number }>;
    }>;

    // Sort circuits progressively by their base difficulty (easiest to hardest)
    return list.sort((a, b) => a.minGradeIdx - b.minGradeIdx);
  }, [activeGymBoulders, filteredAttempts, climbers]);

  const activeGradeRange = useMemo(() => {
    return GRADES.filter((g) => {
      return climberStatsList.some((c) => c.perGrade[g]?.sent > 0 || c.perGrade[g]?.attempted > 0);
    });
  }, [climberStatsList]);

  // Format short date helper (e.g. "15 Sep")
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // Format full date helper (e.g. "Tuesday, 15 Sept 2026")
  const formatFullDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-300">
      {/* Top Controls: Sub-Tabs & Gym Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Sub-Tabs */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'overview'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'leaderboard'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Comp Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'comparison'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Crew Showdown</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'timeline'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Over Time</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pyramid')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'pyramid'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Send Pyramid</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('circuits')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'circuits'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Circuits</span>
          </button>
        </div>

        {/* Gym Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Gym:</span>
          <select
            value={selectedGymId}
            onChange={(e) => setSelectedGymId(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-medium"
          >
            <option value="all">All Gyms (Bond & Hub)</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB: COMP LEADERBOARD (REDPOINT COMP SCORING FOR ACTIVE BOULDERS)          */}
      {/* ========================================================================= */}
      {activeTab === 'leaderboard' && (
        <CompLeaderboard
          boulders={boulders}
          attempts={attempts}
          climbers={climbers}
          gyms={gyms}
          initialGymId={selectedGymId}
          currentUserId={currentUserId}
          onSelectBoulder={onSelectBoulder}
          showGymSelector={true}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & CORE METRICS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* My Stats vs Group Stats Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('my')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
                  viewMode === 'my'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Stats</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('group')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
                  viewMode === 'group'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group Stats</span>
              </button>
            </div>

            {viewMode === 'group' && (
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Crew Aggregate</span>
              </span>
            )}
          </div>

          {/* Climber Switcher Pill Bar (In 'My Stats' mode) */}
          {viewMode === 'my' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">Climber:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {climbers.map((c, idx) => {
                  const isSelected = (selectedClimberId || currentUserId) === c.id;
                  const isYou = currentUserId === c.id;
                  const color = getClimberColor(c, idx);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClimberId(c.id);
                      }}
                      style={isSelected ? { backgroundColor: color.hex, color: '#000000' } : undefined}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                        isSelected
                          ? `${color.bg} text-black shadow-md`
                          : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      <ClimberAvatar profile={c} size="xs" />
                      <span>{c.display_name}</span>
                      {isYou && <span className="text-[10px] opacity-75 font-normal">(You)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group Header Banner (In 'Group Stats' mode) */}
          {viewMode === 'group' && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Combined Wham Crew Stats ({climbers.map((c) => c.display_name).join(', ')})</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full">
                {climbers.length} Climbers
              </span>
            </div>
          )}

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Hardest Send */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {viewMode === 'group' ? 'Crew Top Grade' : 'Hardest Send'}
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-mono text-3xl font-black text-amber-400">
                  {activeStats.hardestSend || '—'}
                </span>
                <Flame className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {viewMode === 'group' ? 'Hardest topped by crew' : 'Top grade topped'}
              </span>
            </div>

            {/* Total Sends */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {viewMode === 'group' ? 'Total Crew Sends' : 'Total Sends'}
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-mono text-3xl font-black text-emerald-400">
                  {activeStats.totalSends}
                </span>
                <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {viewMode === 'group'
                  ? `${activeStats.uniqueBouldersTopped} unique climbs topped`
                  : `${activeStats.sendRate}% send efficiency`}
              </span>
            </div>

            {/* Flashes */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {viewMode === 'group' ? 'Crew Flashes' : 'Total Flashes'}
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-mono text-3xl font-black text-amber-400">
                  {activeStats.totalFlashes}
                </span>
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {activeStats.flashRate}% flash rate
              </span>
            </div>

            {/* Avg Attempts */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {viewMode === 'group' ? 'Crew Avg Tries' : 'Avg Tries / Send'}
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-mono text-3xl font-black text-blue-400">
                  {activeStats.averageAttemptsOnSend}
                </span>
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Attempts per send</span>
            </div>
          </div>

          {/* Gym Completion Progress & Sector Coverage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Progress Ring Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {viewMode === 'group' ? 'Crew Gym Coverage' : 'Active Gym Completion'}
              </span>

              {/* SVG Progress Ring */}
              <div className="relative w-36 h-36 flex items-center justify-center my-1">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#1E293B"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * completionPct) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-mono text-2xl font-black text-white">{completionPct}%</span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {userSentActiveBoulders.length} / {activeGymBoulders.length}
                  </span>
                </div>
              </div>

              <p className="text-center text-xs text-slate-400">
                {viewMode === 'group'
                  ? `${userSentActiveBoulders.length} of ${activeGymBoulders.length} active boulders topped by the crew (${activeGymBoulders.length - userSentActiveBoulders.length} unclimbed)`
                  : `${activeGymBoulders.length - userSentActiveBoulders.length} active boulders left to send`}
              </p>
            </div>

            {/* Breakdown of Active Climbs Remaining Per Area */}
            <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {viewMode === 'group' ? 'Crew Area Coverage' : 'Area Completion & Remaining Climbs'}
                </span>
                <span className="text-[11px] font-mono text-amber-400">
                  {viewMode === 'group' ? 'Team Progress' : 'Clockwise Sectors'}
                </span>
              </div>

              <div className="space-y-3">
                {areaBreakdown.map((item) => (
                  <div key={item.area.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{item.area.name}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        <strong className="text-emerald-400">{item.sent}</strong> / {item.total} {viewMode === 'group' ? 'topped by crew' : 'sent'} ({item.remaining} left)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hall of Fame & Superlatives Cards */}
          {accoladesList.length > 0 && (
            showAccolades ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Crew Superlatives & Accolades</h3>
                      <p className="text-[11px] text-slate-400">Unique standout achievements across your crew</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAccolades(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
                    title="Hide crew accolades section"
                  >
                    Hide
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {accoladesList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5 hover:border-slate-600 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-750 flex items-center justify-center">
                        {getAccoladeIcon(item.id)}
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 max-w-full my-0.5">
                        <ClimberAvatar profile={item.climber} size="xs" />
                        <strong className="text-xs text-white truncate max-w-[85px]">
                          {item.climber.display_name}
                        </strong>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        {item.value}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        {item.subtitle}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-end animate-in fade-in">
                <button
                  type="button"
                  onClick={() => handleToggleAccolades(true)}
                  className="text-xs font-semibold text-slate-400 hover:text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Show Crew Accolades</span>
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREW SHOWDOWN (SIDE-BY-SIDE COMPARISONS & 1V1 BATTLE)              */}
      {/* ========================================================================= */}
      {activeTab === 'comparison' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Crew Leaderboard & Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">The Crew Comparison Matrix</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {climbers.length} Active Climbers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono">
                    <th className="pb-3">Climber</th>
                    <th className="pb-3 text-center">Top Grade</th>
                    <th className="pb-3 text-center">Sends</th>
                    <th className="pb-3 text-center">Flashes</th>
                    <th className="pb-3 text-center">Flash %</th>
                    <th className="pb-3 text-center">Efficiency</th>
                    <th className="pb-3 text-center">Avg Tries</th>
                    <th className="pb-3 text-center">Gym Topped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {sortedLeaderboard.map((item, idx) => {
                    const isTopHardest = Boolean(item.hardestSend && GRADES.indexOf(item.hardestSend) === maxGradeOverall);
                    const isTopSends = Boolean(item.totalSends > 0 && item.totalSends === maxSendsOverall);
                    const isTopFlashes = Boolean(item.totalFlashes > 0 && item.totalFlashes === maxFlashesOverall);

                    return (
                      <tr key={item.profile.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2 font-sans font-bold text-slate-100">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black bg-slate-800 text-slate-300">
                              {idx + 1}
                            </span>
                            <ClimberAvatar profile={item.profile} size="md" />
                            <span className="truncate max-w-[120px]">{item.profile.display_name}</span>
                          </div>
                        </td>

                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-black ${
                            isTopHardest ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'text-slate-200'
                          }`}>
                            {item.hardestSend || '—'}
                          </span>
                        </td>

                        <td className="py-3 text-center">
                          <span className={`font-bold ${isTopSends ? 'text-emerald-400 font-black' : 'text-slate-200'}`}>
                            {item.totalSends}
                          </span>
                        </td>

                        <td className="py-3 text-center">
                          <span className={`font-bold ${isTopFlashes ? 'text-amber-400 font-black' : 'text-slate-300'}`}>
                            {item.totalFlashes}
                          </span>
                        </td>

                        <td className="py-3 text-center text-slate-300">
                          {item.flashRate}%
                        </td>

                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.sendRate >= 70 ? 'bg-emerald-500/20 text-emerald-300' :
                            item.sendRate >= 50 ? 'bg-amber-500/20 text-amber-300' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {item.sendRate}%
                          </span>
                        </td>

                        <td className="py-3 text-center text-slate-300">
                          {item.averageAttemptsOnSend}
                        </td>

                        <td className="py-3 text-center text-slate-400">
                          <strong className="text-slate-200">{item.sentActiveCount}</strong> / {activeGymBoulders.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Multi-Climber Grade Comparison Bar Chart */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Side-by-Side Sends per Grade</h3>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                {climberStatsList.map((c) => (
                  <span key={c.profile.id} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color.hex }} />
                    <span className="text-slate-300 font-medium">{c.profile.display_name}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {activeGradeRange.map((g) => {
                const maxSendsThisGrade = Math.max(
                  ...climberStatsList.map((c) => c.perGrade[g]?.sent || 0),
                  1
                );

                return (
                  <div key={g} className="bg-slate-850/40 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-amber-400">{g}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Total {climberStatsList.reduce((sum, c) => sum + (c.perGrade[g]?.sent || 0), 0)} sends
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {climberStatsList.map((c) => {
                        const sends = c.perGrade[g]?.sent || 0;
                        const flashes = c.perGrade[g]?.flashed || 0;
                        const pct = Math.round((sends / maxSendsThisGrade) * 100);

                        return (
                          <div key={c.profile.id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-300 truncate">{c.profile.display_name}</span>
                              <span className="font-mono font-bold text-slate-200">
                                {sends} <span className="text-slate-500 font-normal">({flashes} flash)</span>
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: c.color.hex
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1-on-1 Head-to-Head Battle */}
          {battleData && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">1v1 Head-to-Head Showdown</h3>
                </div>
                <span className="text-xs text-slate-400">Pick any two crew members to compare</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-850/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: battleData.climberA.color.hex }} />
                  <label className="text-xs font-bold text-slate-400 uppercase">Climber 1:</label>
                  <select
                    value={battleClimberAId}
                    onChange={(e) => setBattleClimberAId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-semibold"
                  >
                    {climbers.map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: battleData.climberB.color.hex }} />
                  <label className="text-xs font-bold text-slate-400 uppercase">Climber 2:</label>
                  <select
                    value={battleClimberBId}
                    onChange={(e) => setBattleClimberBId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-semibold"
                  >
                    {climbers.map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Head to Head Visual Comparison Bar */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span style={{ color: battleData.climberA.color.hex }}>
                      {battleData.climberA.profile.display_name}: {battleData.climberA.totalSends} Sends
                    </span>
                    <span className="text-slate-400 uppercase text-[10px]">Total Sends</span>
                    <span style={{ color: battleData.climberB.color.hex }}>
                      {battleData.climberB.totalSends} Sends :{battleData.climberB.profile.display_name}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(battleData.climberA.totalSends / Math.max(battleData.climberA.totalSends + battleData.climberB.totalSends, 1)) * 100}%`,
                        backgroundColor: battleData.climberA.color.hex
                      }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(battleData.climberB.totalSends / Math.max(battleData.climberA.totalSends + battleData.climberB.totalSends, 1)) * 100}%`,
                        backgroundColor: battleData.climberB.color.hex
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span style={{ color: battleData.climberA.color.hex }}>
                      {battleData.climberA.totalFlashes} Flashes
                    </span>
                    <span className="text-slate-400 uppercase text-[10px]">Flashes (1st Try)</span>
                    <span style={{ color: battleData.climberB.color.hex }}>
                      {battleData.climberB.totalFlashes} Flashes
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(battleData.climberA.totalFlashes / Math.max(battleData.climberA.totalFlashes + battleData.climberB.totalFlashes, 1)) * 100}%`,
                        backgroundColor: battleData.climberA.color.hex
                      }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(battleData.climberB.totalFlashes / Math.max(battleData.climberA.totalFlashes + battleData.climberB.totalFlashes, 1)) * 100}%`,
                        backgroundColor: battleData.climberB.color.hex
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Top Grade</span>
                    <strong className="font-mono text-base font-black" style={{ color: battleData.climberA.color.hex }}>
                      {battleData.climberA.hardestSend || '—'}
                    </strong>
                  </div>
                  <div className="border-x border-slate-800 px-2">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Shared Sends</span>
                    <strong className="font-mono text-base font-black text-amber-400">
                      {battleData.sharedCount}
                    </strong>
                    <span className="text-[9px] text-slate-500 block">climbs both sent</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Top Grade</span>
                    <strong className="font-mono text-base font-black" style={{ color: battleData.climberB.color.hex }}>
                      {battleData.climberB.hardestSend || '—'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Gym Banter Challenge Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-850/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: battleData.climberA.color.hex }}>
                      Sent by {battleData.climberA.profile.display_name} (not {battleData.climberB.profile.display_name})
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {battleData.aOnlyActiveBoulders.length} climbs
                    </span>
                  </div>

                  {battleData.aOnlyActiveBoulders.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No unique climbs to show.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {battleData.aOnlyActiveBoulders.map((boulder) => {
                        const area = areas.find((a) => a.id === boulder.area_id);
                        return (
                          <div
                            key={boulder.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-400">{boulder.grade}</span>
                              <span className="text-slate-300 font-medium">{boulder.hold_colour}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                              {area?.name || 'Wall'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-slate-850/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: battleData.climberB.color.hex }}>
                      Sent by {battleData.climberB.profile.display_name} (not {battleData.climberA.profile.display_name})
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {battleData.bOnlyActiveBoulders.length} climbs
                    </span>
                  </div>

                  {battleData.bOnlyActiveBoulders.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No unique climbs to show.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {battleData.bOnlyActiveBoulders.map((boulder) => {
                        const area = areas.find((a) => a.id === boulder.area_id);
                        return (
                          <div
                            key={boulder.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-400">{boulder.grade}</span>
                              <span className="text-slate-300 font-medium">{boulder.hold_colour}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                              {area?.name || 'Wall'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERFORMANCE & PROGRESSION OVER TIME                                 */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Controls: Chart Mode Switcher & Climber Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Chart Mode Switcher */}
            <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTimelineChartMode('grade')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
                  timelineChartMode === 'grade'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Max Grade Curve</span>
              </button>

              <button
                type="button"
                onClick={() => setTimelineChartMode('cumulative')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
                  timelineChartMode === 'cumulative'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Cumulative Sends</span>
              </button>

              <button
                type="button"
                onClick={() => setTimelineChartMode('volume')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
                  timelineChartMode === 'volume'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Session Volume</span>
              </button>
            </div>

            {/* Climber Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setTimelineClimberFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press ${
                  timelineClimberFilter === 'all'
                    ? 'bg-amber-400 text-black shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                All Crew
              </button>
              {climbers.map((c, idx) => {
                const isSelected = timelineClimberFilter === c.id;
                const color = getClimberColor(c, idx);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTimelineClimberFilter(c.id)}
                    style={isSelected ? { backgroundColor: color.hex, color: '#000000' } : undefined}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press ${
                      isSelected
                        ? `${color.bg} text-black shadow`
                        : 'bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    {c.display_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Visual Chart Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-amber-400" />
                  <span>
                    {timelineChartMode === 'grade' && 'Grade Breakthroughs & Top Grade Progression'}
                    {timelineChartMode === 'cumulative' && 'Total Sends Growth Over Time'}
                    {timelineChartMode === 'volume' && 'Climbs Sent Per Gym Session'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {timelineChartMode === 'grade' && 'Peak grade topped in each weekly gym session'}
                  {timelineChartMode === 'cumulative' && 'Cumulative tick count trajectory across sessions'}
                  {timelineChartMode === 'volume' && 'Total volume and flash proportion by session date'}
                </p>
              </div>

              {/* Climber Legend */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {climberSeriesToDisplay.map((series) => (
                  <span key={series.climber.id} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: series.color.hex }} />
                    <span className="text-slate-300 font-medium">{series.climber.display_name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* SVG Interactive Chart */}
            <div className="w-full h-64 bg-slate-950/60 rounded-xl border border-slate-800/80 p-3 pt-4 relative overflow-hidden">
              {timelineData.dates.length < 2 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                  <Calendar className="w-8 h-8 text-slate-600 mb-2" />
                  <span>Log sends across multiple dates to view your progression curve.</span>
                </div>
              ) : (
                <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#334155" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#1E293B" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-Axis Labels */}
                  {timelineChartMode === 'grade' &&
                    [0, 2, 4, 6, 8].map((gIndex) => {
                      const y = 170 - (gIndex / 8) * 140;
                      return (
                        <g key={gIndex}>
                          <line x1="45" y1={y} x2="580" y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                          <text x="35" y={y + 4} fill="#94A3B8" fontSize="10" fontFamily="monospace" textAnchor="end" fontWeight="bold">
                            {GRADES[gIndex]}
                          </text>
                        </g>
                      );
                    })}

                  {timelineChartMode === 'cumulative' &&
                    [0, 25, 50, 75, 100].map((val) => {
                      const maxVal = Math.max(...timelineData.climberSeries.map((s) => s.points[s.points.length - 1]?.cumulativeSends || 1), 10);
                      const y = 170 - (val / 100) * 140;
                      const displayVal = Math.round((val / 100) * maxVal);
                      return (
                        <g key={val}>
                          <line x1="45" y1={y} x2="580" y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                          <text x="35" y={y + 4} fill="#94A3B8" fontSize="10" fontFamily="monospace" textAnchor="end" fontWeight="bold">
                            {displayVal}
                          </text>
                        </g>
                      );
                    })}

                  {/* X-Axis Dates */}
                  {timelineData.dates.map((dateStr, i) => {
                    const x = 50 + (i / Math.max(timelineData.dates.length - 1, 1)) * 520;
                    return (
                      <g key={dateStr}>
                        <line x1={x} y1="30" x2={x} y2="170" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" opacity="0.2" />
                        <text x={x} y="190" fill="#94A3B8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                          {formatShortDate(dateStr)}
                        </text>
                      </g>
                    );
                  })}

                  {/* CHART MODE 1: Max Grade Progression Curves */}
                  {timelineChartMode === 'grade' &&
                    climberSeriesToDisplay.map((series) => {
                      const points = series.points.map((pt, i) => {
                        const x = 50 + (i / Math.max(series.points.length - 1, 1)) * 520;
                        const gradeIdx = pt.sessionMaxIdx !== null ? pt.sessionMaxIdx : 0;
                        const y = 170 - (gradeIdx / 8) * 140;
                        return { x, y, pt };
                      });

                      const pathData = points.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, '');

                      return (
                        <g key={series.climber.id}>
                          <path
                            d={pathData}
                            fill="none"
                            stroke={series.color.hex}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-500"
                          />
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={p.pt.sessionMaxGrade ? '4' : '2'}
                                fill={p.pt.sessionMaxGrade ? series.color.hex : '#475569'}
                                stroke="#0F172A"
                                strokeWidth="2"
                              />
                              {p.pt.sessionMaxGrade && (
                                <text
                                  x={p.x}
                                  y={p.y - 8}
                                  fill={series.color.hex}
                                  fontSize="9"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {p.pt.sessionMaxGrade}
                                </text>
                              )}
                            </g>
                          ))}
                        </g>
                      );
                    })}

                  {/* CHART MODE 2: Cumulative Sends Curves */}
                  {timelineChartMode === 'cumulative' &&
                    climberSeriesToDisplay.map((series) => {
                      const maxVal = Math.max(...timelineData.climberSeries.map((s) => s.points[s.points.length - 1]?.cumulativeSends || 1), 10);
                      const points = series.points.map((pt, i) => {
                        const x = 50 + (i / Math.max(series.points.length - 1, 1)) * 520;
                        const y = 170 - (pt.cumulativeSends / maxVal) * 140;
                        return { x, y, pt };
                      });

                      const pathData = points.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, '');

                      return (
                        <g key={series.climber.id}>
                          <path
                            d={pathData}
                            fill="none"
                            stroke={series.color.hex}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-500"
                          />
                          {points.map((p, idx) => (
                            <circle
                              key={idx}
                              cx={p.x}
                              cy={p.y}
                              r="3.5"
                              fill={series.color.hex}
                              stroke="#0F172A"
                              strokeWidth="1.5"
                            />
                          ))}
                        </g>
                      );
                    })}

                  {/* CHART MODE 3: Session Volume Bars */}
                  {timelineChartMode === 'volume' &&
                    timelineData.sessions.map((sess, i) => {
                      const x = 50 + (i / Math.max(timelineData.sessions.length - 1, 1)) * 520;
                      const maxSessVolume = timelineData.maxVolumeAnySession;
                      const barWidth = 24;
                      const totalH = (sess.totalSends / maxSessVolume) * 140;
                      const flashH = (sess.totalFlashes / maxSessVolume) * 140;
                      const sendH = totalH - flashH;

                      return (
                        <g key={sess.date}>
                          {sendH > 0 && (
                            <rect
                              x={x - barWidth / 2}
                              y={170 - totalH}
                              width={barWidth}
                              height={sendH}
                              fill="#10B981"
                              rx="2"
                            />
                          )}
                          {flashH > 0 && (
                            <rect
                              x={x - barWidth / 2}
                              y={170 - flashH}
                              width={barWidth}
                              height={flashH}
                              fill="#F59E0B"
                              rx="2"
                            />
                          )}
                          <text
                            x={x}
                            y={170 - totalH - 6}
                            fill="#F1F5F9"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {sess.totalSends}
                          </text>
                        </g>
                      );
                    })}
                </svg>
              )}
            </div>
          </div>

          {/* Session Log & Chronological Activity Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Chronological Session Log</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {timelineData.sessions.length} Recorded Sessions
              </span>
            </div>

            {/* Session Cards (Reverse chronological: newest first) */}
            <div className="space-y-3">
              {[...timelineData.sessions].reverse().map((sess) => {
                const isExpanded = expandedSessionDate === sess.date;

                return (
                  <div
                    key={sess.date}
                    className="bg-slate-850/60 border border-slate-800 rounded-xl overflow-hidden transition-all"
                  >
                    <div
                      onClick={() => setExpandedSessionDate(isExpanded ? null : sess.date)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-mono">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {formatShortDate(sess.date).split(' ')[1]}
                          </span>
                          <span className="text-xs font-black text-amber-400">
                            {formatShortDate(sess.date).split(' ')[0]}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{formatFullDate(sess.date)}</span>
                            {sess.hardestSend && (
                              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-400/20 px-1.5 py-0.2 rounded">
                                Top: {sess.hardestSend}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{sess.totalSends} sends ({sess.totalFlashes} flashes)</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {sess.attendees.map((c) => (
                                <span key={c.id} className="text-slate-300 font-medium">
                                  {c.display_name}
                                </span>
                              ))}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-1 rounded text-slate-400 hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Detailed sends list when expanded */}
                    {isExpanded && (
                      <div className="p-3.5 pt-0 border-t border-slate-800/80 bg-slate-900/40 space-y-2 animate-in fade-in">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                          Climbs Topped in This Session ({sess.sendsList.length}):
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {sess.sendsList.map((item, idx) => {
                            const isFlash = item.attempt.status === 'flashed';
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-850 border border-slate-800 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-amber-400">
                                    {item.boulder?.grade || 'V?'}
                                  </span>
                                  <span className="text-slate-300 font-medium truncate max-w-[90px]">
                                    {item.boulder?.hold_colour || 'Hold'}
                                  </span>
                                  {isFlash && <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                                </div>

                                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-300">
                                  <ClimberAvatar profile={item.climber} size="xs" />
                                  <span>{item.climber?.display_name}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SEND PYRAMID & GRADE EFFICIENCY                                     */}
      {/* ========================================================================= */}
      {activeTab === 'pyramid' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setViewMode('group')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                  viewMode === 'group'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Crew Pyramid</span>
              </button>

              {climbers.map((c, idx) => {
                const isSelected = viewMode === 'my' && (selectedClimberId || currentUserId) === c.id;
                const color = getClimberColor(c, idx);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setViewMode('my');
                      setSelectedClimberId(c.id);
                    }}
                    style={isSelected ? { backgroundColor: color.hex, color: '#000000' } : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                      isSelected
                        ? `${color.bg} text-black shadow-md`
                        : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <ClimberAvatar profile={c} size="xs" />
                    <span>{c.display_name}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-mono font-bold text-amber-400">
              Pyramid Score: {activeStats.pyramidPoints} pts
            </span>
          </div>

          {/* Visual Send Pyramid Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {viewMode === 'group' ? 'Combined Crew Send Pyramid' : `${climbers.find((c) => c.id === (selectedClimberId || currentUserId))?.display_name}'s Send Pyramid`}
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Flash
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Send
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {[...GRADES].reverse().map((g) => {
                const data = activeStats.perGrade[g];
                if (!data || (data.sent === 0 && data.attempted === 0)) return null;

                const flashes = data.flashed;
                const regularSends = data.sent - data.flashed;
                const totalSends = data.sent;
                const maxSendsAnyGrade = Math.max(...Object.values(activeStats.perGrade).map((p) => p.sent), 1);
                const widthPct = Math.max(Math.round((totalSends / maxSendsAnyGrade) * 100), totalSends > 0 ? 12 : 4);

                return (
                  <div key={g} className="flex items-center gap-3">
                    <span className="w-10 font-mono text-xs font-black text-amber-400 text-right shrink-0">
                      {g}
                    </span>

                    <div className="flex-1 flex justify-center">
                      <div
                        className="h-8 rounded-lg flex overflow-hidden shadow-sm transition-all duration-500"
                        style={{ width: `${widthPct}%`, minWidth: '48px' }}
                      >
                        {regularSends > 0 && (
                          <div
                            className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all"
                            style={{ width: `${(regularSends / totalSends) * 100}%` }}
                            title={`Sent: ${regularSends}`}
                          >
                            {regularSends}
                          </div>
                        )}
                        {flashes > 0 && (
                          <div
                            className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-black text-black transition-all gap-0.5"
                            style={{ width: `${(flashes / totalSends) * 100}%` }}
                            title={`Flashed: ${flashes}`}
                          >
                            <span>{flashes}</span>
                            <Zap className="w-2.5 h-2.5 fill-black text-black shrink-0" />
                          </div>
                        )}
                        {totalSends === 0 && (
                          <div className="w-full bg-slate-800/80 text-slate-500 flex items-center justify-center text-[10px]">
                            {data.attempted} tries
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="w-16 font-mono text-[11px] text-slate-400 shrink-0">
                      {totalSends} sends
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Pyramid Base:</strong> {activeStats.perGrade['V0']?.sent + activeStats.perGrade['V1']?.sent + activeStats.perGrade['V2']?.sent + activeStats.perGrade['V3']?.sent || 0} volume climbs (V0–V3)
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {activeStats.totalSends} Total Sends
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              Efficiency Metrics by Grade
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono">
                    <th className="pb-2">Grade</th>
                    <th className="pb-2">Attempted</th>
                    <th className="pb-2">Sent</th>
                    <th className="pb-2">Send %</th>
                    <th className="pb-2">Flash Rate</th>
                    <th className="pb-2">Avg Tries (Sends)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {GRADES.filter((g) => activeStats.perGrade[g].attempted > 0).map((g) => {
                    const data = activeStats.perGrade[g];
                    const sendPct = Math.round((data.sent / data.attempted) * 100);
                    const flashPct = Math.round((data.flashed / data.attempted) * 100);
                    const avgTries = data.sent > 0 ? (data.totalAttemptsSum / data.sent).toFixed(1) : '—';

                    return (
                      <tr key={g} className="hover:bg-slate-850/50">
                        <td className="py-2.5 font-bold text-amber-400">{g}</td>
                        <td className="py-2.5 text-slate-300">{data.attempted}</td>
                        <td className="py-2.5 text-emerald-400 font-semibold">{data.sent}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            sendPct >= 75 ? 'bg-emerald-500/20 text-emerald-300' :
                            sendPct >= 50 ? 'bg-amber-500/20 text-amber-300' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {sendPct}%
                          </span>
                        </td>
                        <td className="py-2.5 text-amber-300">{flashPct}%</td>
                        <td className="py-2.5 text-slate-200">{avgTries}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HOLD COLOUR CIRCUITS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'circuits' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Hold Colour Circuits</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Active Climbs & Progress</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {circuitBreakdown.map((circuit) => (
                <div
                  key={circuit.name}
                  className="p-4 rounded-xl bg-slate-850/60 border border-slate-800 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-5 h-5 rounded-full border border-black/40 shadow-sm shrink-0"
                        style={getHoldSwatchStyle(circuit.name)}
                      />
                      <div>
                        <strong className="text-xs sm:text-sm text-white block font-bold">{circuit.name} Circuit</strong>
                        <span className="text-xs text-amber-400 font-mono font-bold">{circuit.gradeRange}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 block">
                        {circuit.crewToppedCount} / {circuit.totalActive} ({circuit.crewPct}%)
                      </span>
                      {circuit.hardestSend && (
                        <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                          Crew Top: <strong className="text-slate-200 font-bold">{circuit.hardestSend}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${circuit.crewPct}%`,
                        backgroundColor: circuit.config.hex
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1 text-center border-t border-slate-800/60">
                    {circuit.memberSends.map((ms) => (
                      <div key={ms.climber.id} className="text-[10px]">
                        <span className="text-slate-400 block truncate">{ms.climber.display_name}</span>
                        <strong className="font-mono text-slate-200">{ms.sentCount}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
