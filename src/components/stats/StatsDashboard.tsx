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
  getClimberColor
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS, getStorageJson, setStorageJson } from '../../lib/storage';
import {
  computeClimberStats,
  computeGroupStats,
  computeAccolades
} from '../../lib/statsEngine';
import { CompLeaderboard } from '../leaderboard/CompLeaderboard';
import { StatsOverview, AreaBreakdownItem } from './StatsOverview';
import { StatsBattle, BattleData } from './StatsBattle';
import { StatsTimeline, TimelineData } from './StatsTimeline';
import { StatsPyramid } from './StatsPyramid';
import { StatsCircuits, CircuitData } from './StatsCircuits';
import {
  BarChart3,
  Trophy,
  Swords,
  LineChart,
  Layers,
  CircleDot
} from 'lucide-react';

export { CLIMBER_COLORS, CLIMBER_ACCENT_PALETTE, getClimberColor };

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
  const [activeTab, setActiveTab] = useState<
    'overview' | 'leaderboard' | 'comparison' | 'timeline' | 'pyramid' | 'circuits'
  >(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [viewMode, setViewMode] = useState<'my' | 'group'>('my');
  const [selectedGymId, setSelectedGymId] = useState<string>('all');
  const [selectedClimberId, setSelectedClimberId] = useState<string>(
    currentUserId || climbers[0]?.id || ''
  );

  const { currentUser } = useAuth();
  const activeUser = climbers.find((c) => c.id === currentUserId) || currentUser;
  const activeColor = currentUser?.accent_color || activeUser?.accent_color || '#3B82F6';

  const [showAccolades, setShowAccolades] = useState<boolean>(() => {
    return getStorageJson(STORAGE_KEYS.SHOW_ACCOLADES, true);
  });

  const handleToggleAccolades = (show: boolean) => {
    setShowAccolades(show);
    setStorageJson(STORAGE_KEYS.SHOW_ACCOLADES, show);
  };

  const [timelineClimberFilter, setTimelineClimberFilter] = useState<string>('all');
  const [timelineChartMode, setTimelineChartMode] = useState<'grade' | 'cumulative' | 'volume'>('grade');
  const [expandedSessionDate, setExpandedSessionDate] = useState<string | null>(null);

  const [battleClimberAId, setBattleClimberAId] = useState<string>(
    currentUserId || climbers[0]?.id || ''
  );
  const [battleClimberBId, setBattleClimberBId] = useState<string>(
    climbers.find((c) => c.id !== (currentUserId || climbers[0]?.id))?.id || climbers[1]?.id || climbers[0]?.id || ''
  );

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

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => boulderIdSet.has(a.boulder_id));
  }, [attempts, boulderIdSet]);

  const activeGymBoulders = useMemo(() => {
    return filteredBoulders.filter((b) => !b.is_archived);
  }, [filteredBoulders]);

  // Climber stats computations
  const climberStatsList = useMemo(() => {
    return climbers.map((c, idx) => {
      const stats = computeClimberStats(c.id, filteredAttempts, filteredBoulders, activeGymBoulders);
      return {
        ...stats,
        profile: c,
        color: getClimberColor(c, idx)
      };
    });
  }, [climbers, filteredAttempts, filteredBoulders, activeGymBoulders]);

  const groupStats = useMemo(() => {
    return computeGroupStats(filteredAttempts, filteredBoulders, activeGymBoulders);
  }, [filteredAttempts, filteredBoulders, activeGymBoulders]);

  const activeStats = useMemo(() => {
    if (viewMode === 'group') return groupStats;
    const targetId = selectedClimberId || currentUserId;
    const found = climberStatsList.find((c) => c.profile.id === targetId);
    return found || climberStatsList[0] || groupStats;
  }, [viewMode, selectedClimberId, currentUserId, climberStatsList, groupStats]);

  const userSentActiveBoulders = useMemo(() => {
    const targetId = selectedClimberId || currentUserId;
    return activeGymBoulders.filter((b) => {
      if (viewMode === 'my') {
        return filteredAttempts.some(
          (a) => a.boulder_id === b.id && a.user_id === targetId && (a.status === 'sent' || a.status === 'flashed')
        );
      }
      return filteredAttempts.some(
        (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
      );
    });
  }, [activeGymBoulders, filteredAttempts, viewMode, selectedClimberId, currentUserId]);

  const completionPct = useMemo(() => {
    if (activeGymBoulders.length === 0) return 0;
    return Math.round((userSentActiveBoulders.length / activeGymBoulders.length) * 100);
  }, [userSentActiveBoulders.length, activeGymBoulders.length]);

  const accoladesList = useMemo(() => {
    return computeAccolades(climberStatsList);
  }, [climberStatsList]);

  const areaBreakdown = useMemo((): AreaBreakdownItem[] => {
    const relevantAreas = areas.filter((a) => selectedGymId === 'all' || a.gym_id === selectedGymId);
    const targetId = selectedClimberId || currentUserId;

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
  }, [areas, selectedGymId, activeGymBoulders, filteredAttempts, viewMode, currentUserId, selectedClimberId]);

  // Battle Data
  const battleData = useMemo((): BattleData | null => {
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

  // Timeline / Progression Data
  const timelineData = useMemo((): TimelineData => {
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

      const sendsList = sentAttempts.map((a) => ({
        attempt: a,
        boulder: filteredBoulders.find((b) => b.id === a.boulder_id),
        climber: climbers.find((c) => c.id === a.user_id)
      }));

      return {
        date: dateStr,
        totalSends: sentAttempts.length,
        totalFlashes: flashes.length,
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

  // Circuits Breakdown
  const circuitBreakdown = useMemo((): CircuitData[] => {
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
    }).filter(Boolean) as CircuitData[];

    return list.sort((a, b) => a.minGradeIdx - b.minGradeIdx);
  }, [activeGymBoulders, filteredAttempts, climbers]);

  const activeGradeRange = useMemo(() => {
    return GRADES.filter((g) => {
      return climberStatsList.some((c) => c.perGrade[g]?.sent > 0 || c.perGrade[g]?.attempted > 0);
    });
  }, [climberStatsList]);

  const sortedLeaderboard = useMemo(() => {
    return [...climberStatsList].sort((a, b) => {
      if (b.totalSends !== a.totalSends) return b.totalSends - a.totalSends;
      return b.totalFlashes - a.totalFlashes;
    });
  }, [climberStatsList]);

  const maxGradeOverall = useMemo(() => {
    return Math.max(
      ...climberStatsList.map((c) => (c.hardestSend ? GRADES.indexOf(c.hardestSend) : -1)),
      -1
    );
  }, [climberStatsList]);

  const maxSendsOverall = useMemo(() => {
    return Math.max(...climberStatsList.map((c) => c.totalSends), 0);
  }, [climberStatsList]);

  const maxFlashesOverall = useMemo(() => {
    return Math.max(...climberStatsList.map((c) => c.totalFlashes), 0);
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
            style={activeTab === 'overview' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'overview' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            style={activeTab === 'leaderboard' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'leaderboard' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Comp Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            style={activeTab === 'comparison' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'comparison' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Crew Showdown</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            style={activeTab === 'timeline' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'timeline' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Over Time</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pyramid')}
            style={activeTab === 'pyramid' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'pyramid' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Send Pyramid</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('circuits')}
            style={activeTab === 'circuits' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              activeTab === 'circuits' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
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
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-slate-500 font-medium"
          >
            <option value="all">All Gyms (Bond & Hub)</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB: COMP LEADERBOARD */}
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

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <StatsOverview
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          selectedClimberId={selectedClimberId}
          onSelectClimberId={setSelectedClimberId}
          activeStats={activeStats}
          climbers={climbers}
          currentUserId={currentUserId}
          activeColor={activeColor}
          showAccolades={showAccolades}
          onToggleAccolades={handleToggleAccolades}
          accoladesList={accoladesList}
          areaBreakdown={areaBreakdown}
          activeGymBoulders={activeGymBoulders}
          completionPct={completionPct}
          userSentActiveBouldersCount={userSentActiveBoulders.length}
        />
      )}

      {/* TAB: CREW SHOWDOWN */}
      {activeTab === 'comparison' && (
        <StatsBattle
          battleData={battleData}
          battleClimberAId={battleClimberAId}
          battleClimberBId={battleClimberBId}
          onSelectClimberA={setBattleClimberAId}
          onSelectClimberB={setBattleClimberBId}
          climberStatsList={climberStatsList}
          sortedLeaderboard={sortedLeaderboard}
          activeGymBoulders={activeGymBoulders}
          areas={areas}
          climbers={climbers}
          activeColor={activeColor}
          activeGradeRange={activeGradeRange}
          maxGradeOverall={maxGradeOverall}
          maxSendsOverall={maxSendsOverall}
          maxFlashesOverall={maxFlashesOverall}
        />
      )}

      {/* TAB: PERFORMANCE OVER TIME */}
      {activeTab === 'timeline' && (
        <StatsTimeline
          timelineData={timelineData}
          timelineChartMode={timelineChartMode}
          onSetTimelineChartMode={setTimelineChartMode}
          timelineClimberFilter={timelineClimberFilter}
          onSetTimelineClimberFilter={setTimelineClimberFilter}
          climbers={climbers}
          activeColor={activeColor}
          expandedSessionDate={expandedSessionDate}
          onToggleExpandSession={(date) =>
            setExpandedSessionDate(expandedSessionDate === date ? null : date)
          }
        />
      )}

      {/* TAB: SEND PYRAMID */}
      {activeTab === 'pyramid' && (
        <StatsPyramid
          activeStats={activeStats}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          selectedClimberId={selectedClimberId}
          onSelectClimberId={setSelectedClimberId}
          climbers={climbers}
          currentUserId={currentUserId}
          activeColor={activeColor}
        />
      )}

      {/* TAB: HOLD COLOUR CIRCUITS */}
      {activeTab === 'circuits' && (
        <StatsCircuits circuitBreakdown={circuitBreakdown} activeColor={activeColor} />
      )}
    </div>
  );
};
