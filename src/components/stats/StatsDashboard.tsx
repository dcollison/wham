import React, { useState, useMemo, useEffect } from 'react';
import { Boulder, Attempt, Profile, Gym, GymArea, Grade, GRADES, HOLD_COLORS } from '../../types';
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
  Award
} from 'lucide-react';

interface StatsDashboardProps {
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  onSwitchClimber?: (id: string) => void;
}

// Consistent color palette for each climber in charts & comparisons
export const CLIMBER_COLORS = [
  { bg: 'bg-amber-400', text: 'text-amber-400', hex: '#F59E0B', border: 'border-amber-400', ring: 'ring-amber-400', badgeBg: 'bg-amber-400/20' },
  { bg: 'bg-orange-500', text: 'text-orange-400', hex: '#F97316', border: 'border-orange-500', ring: 'ring-orange-500', badgeBg: 'bg-orange-500/20' },
  { bg: 'bg-cyan-500', text: 'text-cyan-400', hex: '#06B6D4', border: 'border-cyan-500', ring: 'ring-cyan-500', badgeBg: 'bg-cyan-500/20' },
  { bg: 'bg-purple-500', text: 'text-purple-400', hex: '#8B5CF6', border: 'border-purple-500', ring: 'ring-purple-500', badgeBg: 'bg-purple-500/20' },
  { bg: 'bg-rose-500', text: 'text-rose-400', hex: '#F43F5E', border: 'border-rose-500', ring: 'ring-rose-500', badgeBg: 'bg-rose-500/20' },
  { bg: 'bg-emerald-500', text: 'text-emerald-400', hex: '#10B981', border: 'border-emerald-500', ring: 'ring-emerald-500', badgeBg: 'bg-emerald-500/20' },
  { bg: 'bg-blue-500', text: 'text-blue-400', hex: '#3B82F6', border: 'border-blue-500', ring: 'ring-blue-500', badgeBg: 'bg-blue-500/20' },
];

export const getClimberColor = (index: number) => {
  return CLIMBER_COLORS[index % CLIMBER_COLORS.length];
};

// Circuit grade guide for London Arch gyms
const CIRCUIT_GRADES: Record<string, string> = {
  Yellow: 'VB – V1',
  Mint: 'V1 – V2',
  Green: 'V2 – V4',
  Orange: 'V3 – V5',
  Blue: 'V4 – V6',
  Purple: 'V5 – V7',
  Red: 'V6 – V8',
  Pink: 'V7 – V9',
  Black: 'V8+',
  Bee: 'Comp Circuit',
  Wood: 'Board / Power',
  White: 'Mixed Circuit'
};

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  boulders,
  attempts,
  climbers,
  gyms,
  areas,
  currentUserId,
  onSwitchClimber
}) => {
  // Navigation tabs inside Stats Dashboard
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'pyramid' | 'circuits'>('overview');
  const [viewMode, setViewMode] = useState<'my' | 'group'>('my');
  const [selectedGymId, setSelectedGymId] = useState<string>('all');
  const [selectedClimberId, setSelectedClimberId] = useState<string>(currentUserId || climbers[0]?.id || '');

  // 1-on-1 Battle selections (defaults: Climber A = current user or first climber, Climber B = second climber)
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

    // Active gym climbs topped by this user
    const sentActiveCount = activeGymBoulders.filter((b) =>
      sentAttempts.some((a) => a.boulder_id === b.id)
    ).length;

    // Pyramid score calculation (VB=0, V0=1, V1=2... V8=9)
    const pyramidPoints = sentAttempts.reduce((sum, a) => {
      const b = filteredBoulders.find((item) => item.id === a.boulder_id);
      if (!b) return sum;
      const gIndex = GRADES.indexOf(b.grade);
      return sum + Math.max(gIndex, 0) + 1;
    }, 0);

    return {
      userId,
      totalSends,
      totalFlashes,
      totalAttempted,
      flashRate,
      sendRate,
      averageAttemptsOnSend,
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
      const color = getClimberColor(index);
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

  // Hall of Fame Accolades
  const accolades = useMemo(() => {
    if (climberStatsList.length === 0) return null;

    const flashKing = [...climberStatsList].sort((a, b) => b.totalFlashes - a.totalFlashes)[0];
    const volumeMachine = [...climberStatsList].sort((a, b) => b.totalSends - a.totalSends)[0];
    const hardestSender = [...climberStatsList].sort((a, b) => {
      const aIdx = a.hardestSend ? GRADES.indexOf(a.hardestSend) : -1;
      const bIdx = b.hardestSend ? GRADES.indexOf(b.hardestSend) : -1;
      return bIdx - aIdx;
    })[0];
    const efficiencyMaster = [...climberStatsList]
      .filter((c) => c.totalSends > 0)
      .sort((a, b) => parseFloat(a.averageAttemptsOnSend) - parseFloat(b.averageAttemptsOnSend))[0];
    const grinder = [...climberStatsList].sort((a, b) => b.totalAttempted - a.totalAttempted)[0];
    const gymMaster = [...climberStatsList].sort((a, b) => b.sentActiveCount - a.sentActiveCount)[0];

    return {
      flashKing,
      volumeMachine,
      hardestSender,
      efficiencyMaster,
      grinder,
      gymMaster
    };
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
      // Group mode
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

    // Shared sends
    const sharedIds = [...aSentBoulderIds].filter((id) => bSentBoulderIds.has(id));

    // Active climbs sent by A but not B
    const aOnlyActiveBoulders = activeGymBoulders.filter(
      (b) => aSentBoulderIds.has(b.id) && !bSentBoulderIds.has(b.id)
    );

    // Active climbs sent by B but not A
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

  // Hold colour circuit breakdown
  const circuitBreakdown = useMemo(() => {
    const colorKeys = Object.keys(HOLD_COLORS);

    return colorKeys.map((colorName) => {
      const circuitBoulders = activeGymBoulders.filter((b) => b.hold_colour.toLowerCase() === colorName.toLowerCase());
      if (circuitBoulders.length === 0) return null;

      const circuitIdSet = new Set(circuitBoulders.map((b) => b.id));

      // Crew member sends for this circuit
      const memberSends = climbers.map((c) => {
        const sentCount = filteredAttempts.filter(
          (a) => a.user_id === c.id && circuitIdSet.has(a.boulder_id) && (a.status === 'sent' || a.status === 'flashed')
        ).length;
        return {
          climber: c,
          sentCount
        };
      });

      // Combined crew unique topped
      const crewToppedCount = circuitBoulders.filter((b) =>
        filteredAttempts.some(
          (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
        )
      ).length;

      return {
        name: colorName,
        config: HOLD_COLORS[colorName],
        gradeGuide: CIRCUIT_GRADES[colorName] || 'Circuit',
        totalActive: circuitBoulders.length,
        crewToppedCount,
        crewPct: Math.round((crewToppedCount / circuitBoulders.length) * 100),
        memberSends
      };
    }).filter(Boolean) as Array<{
      name: string;
      config: (typeof HOLD_COLORS)[string];
      gradeGuide: string;
      totalActive: number;
      crewToppedCount: number;
      crewPct: number;
      memberSends: Array<{ climber: Profile; sentCount: number }>;
    }>;
  }, [activeGymBoulders, filteredAttempts, climbers]);

  // Active grades that have at least one send across the group
  const activeGradeRange = useMemo(() => {
    return GRADES.filter((g) => {
      return climberStatsList.some((c) => c.perGrade[g]?.sent > 0 || c.perGrade[g]?.attempted > 0);
    });
  }, [climberStatsList]);

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
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                ⚡ Crew Aggregate
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
                  const color = getClimberColor(idx);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClimberId(c.id);
                        if (onSwitchClimber) onSwitchClimber(c.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                        isSelected
                          ? `${color.bg} text-black shadow-md`
                          : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.display_name} className="w-4 h-4 rounded-full" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] flex items-center justify-center">
                          {c.display_name.charAt(0)}
                        </div>
                      )}
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
                <span>⚡ Combined Wham Crew Stats ({climbers.map((c) => c.display_name).join(', ')})</span>
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
          {accolades && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Crew Superlatives & Accolades</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Flash King */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5">
                  <span className="text-xl">⚡</span>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Flash King</span>
                  <strong className="text-xs text-white truncate max-w-full">
                    {accolades.flashKing?.profile.display_name}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400">
                    {accolades.flashKing?.totalFlashes} flashes
                  </span>
                </div>

                {/* Volume Machine */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5">
                  <span className="text-xl">🧗</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Volume Machine</span>
                  <strong className="text-xs text-white truncate max-w-full">
                    {accolades.volumeMachine?.profile.display_name}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400">
                    {accolades.volumeMachine?.totalSends} sends
                  </span>
                </div>

                {/* Hardest Sender */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5">
                  <span className="text-xl">🔥</span>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">The Crusher</span>
                  <strong className="text-xs text-white truncate max-w-full">
                    {accolades.hardestSender?.profile.display_name}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400">
                    {accolades.hardestSender?.hardestSend || '—'} top grade
                  </span>
                </div>

                {/* Efficiency Sniper */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5">
                  <span className="text-xl">🎯</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">The Sniper</span>
                  <strong className="text-xs text-white truncate max-w-full">
                    {accolades.efficiencyMaster?.profile.display_name}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400">
                    {accolades.efficiencyMaster?.averageAttemptsOnSend} tries/send
                  </span>
                </div>

                {/* Grinder */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5">
                  <span className="text-xl">🛡️</span>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">The Grinder</span>
                  <strong className="text-xs text-white truncate max-w-full">
                    {accolades.grinder?.profile.display_name}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400">
                    {accolades.grinder?.totalAttempted} tries logged
                  </span>
                </div>

                {/* Gym Master */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5">
                  <span className="text-xl">🗺️</span>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Gym Master</span>
                  <strong className="text-xs text-white truncate max-w-full">
                    {accolades.gymMaster?.profile.display_name}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400">
                    {accolades.gymMaster?.sentActiveCount} active climbs
                  </span>
                </div>
              </div>
            </div>
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

            {/* Side-by-side Table */}
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
                    const isTopHardest = item.hardestSend === accolades?.hardestSender?.hardestSend;
                    const isTopSends = item.totalSends === accolades?.volumeMachine?.totalSends;
                    const isTopFlashes = item.totalFlashes === accolades?.flashKing?.totalFlashes;

                    return (
                      <tr key={item.profile.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2 font-sans font-bold text-slate-100">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black bg-slate-800 text-slate-300">
                              {idx + 1}
                            </span>
                            {item.profile.avatar_url ? (
                              <img src={item.profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center">
                                {item.profile.display_name.charAt(0)}
                              </div>
                            )}
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

              {/* Legend of Climbers */}
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {climberStatsList.map((c) => (
                  <span key={c.profile.id} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color.hex }} />
                    <span className="text-slate-300 font-medium">{c.profile.display_name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Grouped Bar Chart */}
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
                                {sends} <span className="text-slate-500 font-normal">({flashes}⚡)</span>
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

          {/* 1-on-1 Head-to-Head Battle (The Friendly Rivalry) */}
          {battleData && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">1v1 Head-to-Head Showdown</h3>
                </div>
                <span className="text-xs text-slate-400">Pick any two crew members to compare</span>
              </div>

              {/* Climber Selectors Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-850/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
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
                {/* Total Sends Bar */}
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

                {/* Total Flashes Bar */}
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

                {/* Hardest Send & Shared Summary */}
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

              {/* Gym Banter: Friendly Challenge Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Topped by A, but not yet by B */}
                <div className="bg-slate-850/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: battleData.climberA.color.hex }}>
                      🎯 Sent by {battleData.climberA.profile.display_name} (not {battleData.climberB.profile.display_name})
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

                {/* Topped by B, but not yet by A */}
                <div className="bg-slate-850/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: battleData.climberB.color.hex }}>
                      🎯 Sent by {battleData.climberB.profile.display_name} (not {battleData.climberA.profile.display_name})
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
      {/* TAB 3: SEND PYRAMID & GRADE EFFICIENCY                                     */}
      {/* ========================================================================= */}
      {activeTab === 'pyramid' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Climber Switcher for Pyramid */}
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
                const color = getClimberColor(idx);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setViewMode('my');
                      setSelectedClimberId(c.id);
                      if (onSwitchClimber) onSwitchClimber(c.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                      isSelected
                        ? `${color.bg} text-black shadow-md`
                        : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
                    }`}
                  >
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

            {/* Pyramid Rows: Render from Highest Grade down to lowest */}
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

                    {/* Centered Bar Area */}
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
                            className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-black text-black transition-all"
                            style={{ width: `${(flashes / totalSends) * 100}%` }}
                            title={`Flashed: ${flashes}`}
                          >
                            {flashes}⚡
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

            {/* Pyramid Shape Analysis Banner */}
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

          {/* Efficiency Metrics Table: Send %, Flash Rate, Avg attempts */}
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
      {/* TAB 4: HOLD COLOUR CIRCUITS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'circuits' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Hold Colour Circuits & Team Completion</h3>
              </div>
              <span className="text-xs text-slate-400">Arch / London Circuit System</span>
            </div>

            {/* Circuit Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {circuitBreakdown.map((circuit) => (
                <div
                  key={circuit.name}
                  className="p-4 rounded-xl bg-slate-850/60 border border-slate-800 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: circuit.config.hex }}
                      />
                      <div>
                        <strong className="text-xs text-white block">{circuit.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{circuit.gradeGuide}</span>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {circuit.crewToppedCount} / {circuit.totalActive} ({circuit.crewPct}%)
                    </span>
                  </div>

                  {/* Circuit Progress Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${circuit.crewPct}%`,
                        backgroundColor: circuit.config.hex
                      }}
                    />
                  </div>

                  {/* Climber breakdown row for this circuit */}
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
