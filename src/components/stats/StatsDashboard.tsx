import React, { useState, useMemo, useEffect } from 'react';
import { Boulder, Attempt, Profile, Gym, GymArea, Grade, GRADES } from '../../types';
import { Zap, Check, Clock, Trophy, Target, Award, Flame, BarChart3, Users, User, ArrowUpRight } from 'lucide-react';

interface StatsDashboardProps {
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  onSwitchClimber?: (id: string) => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  boulders,
  attempts,
  climbers,
  gyms,
  areas,
  currentUserId,
  onSwitchClimber
}) => {
  const [viewMode, setViewMode] = useState<'my' | 'group'>('my');
  const [selectedGymId, setSelectedGymId] = useState<string>('all');
  const [selectedClimberId, setSelectedClimberId] = useState<string>(currentUserId || climbers[0]?.id || '');

  // Keep selectedClimberId in sync if currentUserId changes
  useEffect(() => {
    if (currentUserId) {
      setSelectedClimberId(currentUserId);
    }
  }, [currentUserId]);

  // Filter boulders by selected gym
  const filteredBoulders = useMemo(() => {
    if (selectedGymId === 'all') return boulders;
    return boulders.filter(b => b.gym_id === selectedGymId);
  }, [boulders, selectedGymId]);

  const boulderIdSet = useMemo(() => new Set(filteredBoulders.map(b => b.id)), [filteredBoulders]);

  // Filter attempts matching the filtered boulders
  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => boulderIdSet.has(a.boulder_id));
  }, [attempts, boulderIdSet]);

  // Climber metrics generator
  const computeClimberStats = (userId: string) => {
    const userAttempts = filteredAttempts.filter(a => a.user_id === userId);
    const sentAttempts = userAttempts.filter(a => a.status === 'sent' || a.status === 'flashed');
    const flashedAttempts = userAttempts.filter(a => a.status === 'flashed');

    const totalSends = sentAttempts.length;
    const totalFlashes = flashedAttempts.length;
    const totalAttempted = userAttempts.length;

    const flashRate = totalAttempted > 0 ? Math.round((totalFlashes / totalAttempted) * 100) : 0;
    const sendRate = totalAttempted > 0 ? Math.round((totalSends / totalAttempted) * 100) : 0;

    const totalAttemptsOnSend = sentAttempts.reduce((sum, a) => sum + a.attempt_count, 0);
    const averageAttemptsOnSend = totalSends > 0 ? (totalAttemptsOnSend / totalSends).toFixed(1) : '0';

    let hardestSend: Grade | null = null;
    let maxGradeIndex = -1;

    sentAttempts.forEach(a => {
      const boulder = filteredBoulders.find(b => b.id === a.boulder_id);
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

    userAttempts.forEach(a => {
      const boulder = filteredBoulders.find(b => b.id === a.boulder_id);
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
      uniqueBouldersTopped: totalSends
    };
  };

  // Group metrics generator (aggregates all climbers together)
  const computeGroupStats = () => {
    const allAttempts = filteredAttempts;
    const sentAttempts = allAttempts.filter(a => a.status === 'sent' || a.status === 'flashed');
    const flashedAttempts = allAttempts.filter(a => a.status === 'flashed');

    const totalSends = sentAttempts.length;
    const totalFlashes = flashedAttempts.length;
    const totalAttempted = allAttempts.length;

    const flashRate = totalAttempted > 0 ? Math.round((totalFlashes / totalAttempted) * 100) : 0;
    const sendRate = totalAttempted > 0 ? Math.round((totalSends / totalAttempted) * 100) : 0;

    const totalAttemptsOnSend = sentAttempts.reduce((sum, a) => sum + a.attempt_count, 0);
    const averageAttemptsOnSend = totalSends > 0 ? (totalAttemptsOnSend / totalSends).toFixed(1) : '0';

    let hardestSend: Grade | null = null;
    let maxGradeIndex = -1;

    sentAttempts.forEach(a => {
      const boulder = filteredBoulders.find(b => b.id === a.boulder_id);
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

    allAttempts.forEach(a => {
      const boulder = filteredBoulders.find(b => b.id === a.boulder_id);
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

    const uniqueBouldersTopped = new Set(sentAttempts.map(a => a.boulder_id)).size;

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
      uniqueBouldersTopped
    };
  };

  // Active target stats (either current user or aggregate group)
  const activeStats = useMemo(() => {
    if (viewMode === 'my') {
      const targetId = selectedClimberId || currentUserId || climbers[0]?.id || '';
      return computeClimberStats(targetId);
    }
    return computeGroupStats();
  }, [viewMode, selectedClimberId, currentUserId, filteredAttempts, filteredBoulders, climbers]);

  // Group Leaderboard Computations
  const leaderboard = useMemo(() => {
    return climbers.map(c => {
      const stats = computeClimberStats(c.id);
      return {
        profile: c,
        ...stats
      };
    }).sort((a, b) => b.totalSends - a.totalSends);
  }, [climbers, filteredAttempts, filteredBoulders]);

  const flashKing = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.totalFlashes - a.totalFlashes)[0];
  }, [leaderboard]);

  // Gym Completion Progress Ring
  const activeGymBoulders = filteredBoulders.filter(b => !b.is_archived);
  const userSentActiveBoulders = activeGymBoulders.filter(b => {
    if (viewMode === 'my') {
      const targetId = selectedClimberId || currentUserId || climbers[0]?.id;
      const att = filteredAttempts.find(
        a => a.boulder_id === b.id &&
             a.user_id === targetId &&
             (a.status === 'sent' || a.status === 'flashed')
      );
      return Boolean(att);
    }
    // Group mode: any climber in the group topped this boulder
    return filteredAttempts.some(
      a => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
    );
  });

  const completionPct = activeGymBoulders.length > 0
    ? Math.round((userSentActiveBoulders.length / activeGymBoulders.length) * 100)
    : 0;

  // Breakdown of active climbs remaining per area
  const areaBreakdown = useMemo(() => {
    const relevantAreas = selectedGymId === 'all'
      ? areas
      : areas.filter(a => a.gym_id === selectedGymId);

    const targetId = selectedClimberId || currentUserId || climbers[0]?.id;

    return relevantAreas.map(area => {
      const areaBoulders = activeGymBoulders.filter(b => b.area_id === area.id);
      const sent = areaBoulders.filter(b => {
        if (viewMode === 'my') {
          return filteredAttempts.some(
            a => a.boulder_id === b.id &&
                 a.user_id === targetId &&
                 (a.status === 'sent' || a.status === 'flashed')
          );
        }
        return filteredAttempts.some(
          a => a.boulder_id === b.id &&
               (a.status === 'sent' || a.status === 'flashed')
        );
      });
      return {
        area,
        total: areaBoulders.length,
        sent: sent.length,
        remaining: areaBoulders.length - sent.length,
        pct: areaBoulders.length > 0 ? Math.round((sent.length / areaBoulders.length) * 100) : 0
      };
    }).filter(ab => ab.total > 0);
  }, [areas, selectedGymId, activeGymBoulders, filteredAttempts, viewMode, currentUserId, selectedClimberId]);

  const activeClimberProfile = climbers.find(c => c.id === (selectedClimberId || currentUserId)) || climbers[0];

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-300">
      {/* View Switcher & Gym Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* My Stats vs Group Stats */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('my')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all active-press ${
              viewMode === 'my'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Stats</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('group')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all active-press ${
              viewMode === 'group'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Group Stats</span>
          </button>
        </div>

        {/* Gym Selector Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Gym:</span>
          <select
            value={selectedGymId}
            onChange={(e) => setSelectedGymId(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-medium"
          >
            <option value="all">All Gyms (Bond & Hub)</option>
            {gyms.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Climber Switcher Pill Bar (In 'My Stats' mode) */}
      {viewMode === 'my' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">Viewing:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {climbers.map(c => {
              const isSelected = (selectedClimberId || currentUserId) === c.id;
              const isYou = currentUserId === c.id;
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
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  {c.avatar_url && (
                    <img src={c.avatar_url} alt={c.display_name} className="w-4 h-4 rounded-full" />
                  )}
                  <span>{c.display_name}</span>
                  {isYou && <span className="text-[10px] opacity-75 font-normal">(You)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Header Banner (In 'Group Stats' mode) */}
      {viewMode === 'group' && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span>⚡ Combined Wham Crew Stats ({climbers.map(c => c.display_name).join(', ')})</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
            All Climbers
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
            {viewMode === 'group' ? 'Hardest send by crew' : 'Top grade topped'}
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

      {/* Gym Completion Progress & Area Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Ring Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {viewMode === 'group' ? 'Crew Gym Coverage' : 'Active Gym Completion'}
          </span>

          {/* SVG Progress Ring */}
          <div className="relative w-36 h-36 flex items-center justify-center my-1">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#1E293B"
                strokeWidth="10"
              />
              {/* Progress stroke */}
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
            {areaBreakdown.map(item => (
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

      {/* Grade Breakdown & Volume Bar Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Sends & Volume per Grade (VB – V10+)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Flash
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Send
            </span>
          </div>
        </div>

        {/* Volume Bars */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
          {GRADES.map((g) => {
            const gradeData = activeStats.perGrade[g];
            const flashes = gradeData.flashed;
            const regularSends = gradeData.sent - gradeData.flashed;
            const totalSends = gradeData.sent;
            const maxSendsAnyGrade = Math.max(...Object.values(activeStats.perGrade).map(p => p.sent), 1);
            const heightPct = Math.round((totalSends / maxSendsAnyGrade) * 100);

            return (
              <div key={g} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {totalSends > 0 ? totalSends : ''}
                </span>

                {/* Vertical Bar Container */}
                <div className="w-full h-28 bg-slate-800/60 rounded-lg flex flex-col justify-end p-1 overflow-hidden">
                  {regularSends > 0 && (
                    <div
                      className="w-full bg-emerald-500 rounded-t-sm transition-all duration-300"
                      style={{ height: `${(regularSends / maxSendsAnyGrade) * 100}%` }}
                      title={`Sent: ${regularSends}`}
                    />
                  )}
                  {flashes > 0 && (
                    <div
                      className="w-full bg-amber-400 rounded-b-sm transition-all duration-300"
                      style={{ height: `${(flashes / maxSendsAnyGrade) * 100}%` }}
                      title={`Flashed: ${flashes}`}
                    />
                  )}
                </div>

                <span className="text-xs font-mono font-bold text-slate-300">
                  {g}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Efficiency Metrics Table: Send % per grade, Flash Rate, Avg attempts */}
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
              {GRADES.filter(g => activeStats.perGrade[g].attempted > 0).map(g => {
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

      {/* Leaderboard & Fun Group Metrics (Alex, Dale, Taiye, Euan) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Group Leaderboard & Accolades</h3>
          </div>
          {flashKing && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300">
              <span>⚡ Flash King: <strong>{flashKing.profile.display_name}</strong> ({flashKing.totalFlashes} flashes)</span>
            </div>
          )}
        </div>

        {/* Climber Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {leaderboard.map((item, idx) => (
            <div
              key={item.profile.id}
              onClick={() => setSelectedClimberId(item.profile.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedClimberId === item.profile.id
                  ? 'bg-slate-800/80 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${
                    idx === 0 ? 'bg-amber-400 text-black' :
                    idx === 1 ? 'bg-slate-300 text-black' :
                    idx === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm text-white">{item.profile.display_name}</span>
                </div>
                <span className="font-mono text-xs font-black text-amber-400">
                  {item.hardestSend || 'VB'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center border-t border-slate-800/80 pt-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Sends</span>
                  <strong className="text-emerald-400 font-mono text-sm">{item.totalSends}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Flashes</span>
                  <strong className="text-amber-400 font-mono text-sm">{item.totalFlashes}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Avg Tries</span>
                  <strong className="text-blue-400 font-mono text-sm">{item.averageAttemptsOnSend}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
