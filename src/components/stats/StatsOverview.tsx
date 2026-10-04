import React, { useMemo, useState } from 'react';
import {
  User,
  Users,
  Flame,
  CheckCircle2,
  Check,
  Zap,
  Target,
  Trophy,
  Award,
  Calendar,
  Layers,
  Activity,
  Feather,
  Scale,
  Sparkles,
  MessageSquareHeart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Percent,
  ArrowUpDown,
  LineChart,
  TrendingUp
} from 'lucide-react';
import { Profile, GymArea, Boulder, BoulderReview, Gym, Grade, GRADES, Attempt } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { ClimberStatsData, AccoladeItem } from '../../lib/statsEngine';
import { computeReviewAnalytics } from '../../lib/reviews';
import { HoldBadge } from '../boulders/HoldBadge';
import { StatsEloCard } from './StatsEloCard';

export interface AreaBreakdownItem {
  area: GymArea;
  gym?: Gym;
  total: number;
  sent: number;
  remaining: number;
  pct: number;
}

interface StatsOverviewProps {
  viewMode: 'my' | 'group';
  onSetViewMode: (mode: 'my' | 'group') => void;
  selectedClimberId: string;
  onSelectClimberId: (id: string) => void;
  activeStats: ClimberStatsData;
  climbers: Profile[];
  currentUserId?: string;
  activeColor: string;
  showAccolades: boolean;
  onToggleAccolades: (show: boolean) => void;
  accoladesList: AccoladeItem[];
  areaBreakdown: AreaBreakdownItem[];
  activeGymBoulders: Boulder[];
  completionPct: number;
  userSentActiveBouldersCount: number;
  reviews?: BoulderReview[];
  onSelectBoulder?: (boulder: Boulder) => void;
  gyms?: Gym[];
  selectedGymId?: string;
  onSelectGymId?: (id: string) => void;
  filteredAttempts?: Attempt[];
  allBoulders?: Boulder[];
}

const getAccoladeIcon = (id: string, color?: string) => {
  switch (id) {
    case 'apex-crusher':
      return <Flame className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'flash-artist':
      return <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />;
    case 'project-battler':
      return <Activity className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'circuit-explorer':
      return <Layers className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'the-sniper':
      return <Target className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'session-devotee':
      return <Calendar className="w-5 h-5" style={color ? { color } : undefined} />;
    default:
      return <Award className="w-5 h-5" style={color ? { color } : undefined} />;
  }
};

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  viewMode,
  onSetViewMode,
  selectedClimberId,
  onSelectClimberId,
  activeStats,
  climbers,
  currentUserId,
  activeColor,
  showAccolades,
  onToggleAccolades,
  accoladesList,
  areaBreakdown,
  activeGymBoulders,
  completionPct,
  userSentActiveBouldersCount,
  reviews = [],
  onSelectBoulder,
  gyms = [],
  selectedGymId = 'all',
  onSelectGymId,
  filteredAttempts = [],
  allBoulders = []
}) => {
  const reviewStats = useMemo(() => {
    return computeReviewAnalytics(
      reviews,
      activeGymBoulders,
      viewMode === 'my' ? selectedClimberId : null
    );
  }, [reviews, activeGymBoulders, viewMode, selectedClimberId]);

  // Attempt Efficiency metrics: Flashes (1 try) vs Quick Sends (2-3 tries) vs Project Battles (4+ tries)
  const efficiencyMetrics = useMemo(() => {
    const targetUserId = viewMode === 'my' ? (selectedClimberId || currentUserId) : null;
    const relevantAttempts = filteredAttempts.filter((a) => {
      if (targetUserId) return a.user_id === targetUserId;
      return true;
    });

    const sentAttempts = relevantAttempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
    const totalSents = sentAttempts.length;

    const flashCount = sentAttempts.filter((a) => a.status === 'flashed' || a.attempt_count === 1).length;
    const quickSendCount = sentAttempts.filter((a) => a.status === 'sent' && a.attempt_count >= 2 && a.attempt_count <= 3).length;
    const projectSendCount = sentAttempts.filter((a) => a.status === 'sent' && a.attempt_count >= 4).length;

    const flashPct = totalSents > 0 ? Math.round((flashCount / totalSents) * 100) : 0;
    const quickSendPct = totalSents > 0 ? Math.round((quickSendCount / totalSents) * 100) : 0;
    const projectSendPct = totalSents > 0 ? Math.max(0, 100 - flashPct - quickSendPct) : 0;

    return {
      totalSents,
      flashCount,
      quickSendCount,
      projectSendCount,
      flashPct,
      quickSendPct,
      projectSendPct
    };
  }, [filteredAttempts, viewMode, selectedClimberId, currentUserId]);

  const pyramidBaseVolume = useMemo(() => {
    return (
      (activeStats.perGrade['V0']?.sent || 0) +
      (activeStats.perGrade['V1']?.sent || 0) +
      (activeStats.perGrade['V2']?.sent || 0) +
      (activeStats.perGrade['V3']?.sent || 0)
    );
  }, [activeStats.perGrade]);

  const activeGradesList = useMemo(() => {
    return [...GRADES].reverse().filter((g) => {
      const data = activeStats.perGrade[g];
      return data && (data.sent > 0 || data.attempted > 0);
    });
  }, [activeStats.perGrade]);

  const [gradeSortOrder, setGradeSortOrder] = useState<'asc' | 'desc'>('asc');

  const conversionGradesList = useMemo(() => {
    const list = GRADES.filter((g) => {
      const data = activeStats.perGrade[g];
      return data && (data.sent > 0 || data.attempted > 0);
    });
    return gradeSortOrder === 'asc' ? list : [...list].reverse();
  }, [activeStats.perGrade, gradeSortOrder]);

  const [timelineMode, setTimelineMode] = useState<'grade' | 'cumulative' | 'volume'>('grade');
  const [expandedSessionDate, setExpandedSessionDate] = useState<string | null>(null);

  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
    } catch {}
    return dateStr;
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    } catch {}
    return dateStr;
  };

  const timelineData = useMemo(() => {
    const targetUserId = viewMode === 'my' ? (selectedClimberId || currentUserId) : null;

    const relevantAttempts = filteredAttempts.filter((a) => {
      if (!a.logged_at) return false;
      if (targetUserId) return a.user_id === targetUserId;
      return true;
    });

    const dateMap = new Map<string, Attempt[]>();
    relevantAttempts.forEach((a) => {
      const dateStr = a.logged_at.split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push(a);
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    const boulderMap = new Map(allBoulders.map((b) => [b.id, b]));

    let runningCumulative = 0;
    let allTimeHighGradeIdx = -1;

    const sessions = sortedDates.map((dateStr) => {
      const dayAttempts = dateMap.get(dateStr) || [];
      const sentAttempts = dayAttempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
      const flashedAttempts = dayAttempts.filter((a) => a.status === 'flashed');

      let sessionMaxGrade: Grade | null = null;
      let sessionMaxIdx = -1;

      sentAttempts.forEach((a) => {
        const b = boulderMap.get(a.boulder_id);
        if (b) {
          const gIdx = GRADES.indexOf(b.grade);
          if (gIdx > sessionMaxIdx) {
            sessionMaxIdx = gIdx;
            sessionMaxGrade = b.grade;
          }
        }
      });

      if (sessionMaxIdx > allTimeHighGradeIdx) {
        allTimeHighGradeIdx = sessionMaxIdx;
      }

      runningCumulative += sentAttempts.length;

      const sendsList = sentAttempts
        .map((a) => ({
          attempt: a,
          boulder: boulderMap.get(a.boulder_id),
          climber: climbers.find((c) => c.id === a.user_id)
        }))
        .filter((item) => Boolean(item.boulder));

      return {
        date: dateStr,
        totalAttempts: dayAttempts.length,
        totalSends: sentAttempts.length,
        totalFlashes: flashedAttempts.length,
        sessionMaxGrade,
        sessionMaxIdx,
        allTimeMaxGrade: allTimeHighGradeIdx >= 0 ? GRADES[allTimeHighGradeIdx] : null,
        cumulativeSends: runningCumulative,
        sendsList
      };
    });

    // Multi-climber comparison series for Group view
    const climberSeries = climbers.map((c) => {
      let climberCumul = 0;
      let climberMaxIdx = -1;

      const points = sortedDates.map((dateStr) => {
        const dayAttempts = (dateMap.get(dateStr) || []).filter((a) => a.user_id === c.id);
        const daySends = dayAttempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
        const dayFlashes = dayAttempts.filter((a) => a.status === 'flashed');

        let dayMaxGrade: Grade | null = null;
        let dayMaxIdx = -1;

        daySends.forEach((a) => {
          const b = boulderMap.get(a.boulder_id);
          if (b) {
            const gIdx = GRADES.indexOf(b.grade);
            if (gIdx > dayMaxIdx) {
              dayMaxIdx = gIdx;
              dayMaxGrade = b.grade;
            }
          }
        });

        if (dayMaxIdx > climberMaxIdx) {
          climberMaxIdx = dayMaxIdx;
        }

        climberCumul += daySends.length;

        return {
          date: dateStr,
          sends: daySends.length,
          flashes: dayFlashes.length,
          sessionMaxGrade: dayMaxGrade,
          sessionMaxIdx: dayMaxIdx,
          cumulativeSends: climberCumul
        };
      });

      return {
        climber: c,
        color: c.accent_color || activeColor,
        points
      };
    });

    const validGradeIndices = sessions.map((s) => s.sessionMaxIdx).filter((idx) => idx >= 0);
    const minGradeIdx = validGradeIndices.length > 0 ? Math.max(0, Math.min(...validGradeIndices) - 1) : 0;
    const maxGradeIdx = validGradeIndices.length > 0 ? Math.max(minGradeIdx + 3, Math.max(...validGradeIndices)) : 5;

    const maxVolume = Math.max(...sessions.map((s) => s.totalSends), 1);
    const maxCumulative = Math.max(...sessions.map((s) => s.cumulativeSends), 1);

    return {
      sortedDates,
      sessions,
      climberSeries,
      minGradeIdx,
      maxGradeIdx,
      maxVolume,
      maxCumulative
    };
  }, [filteredAttempts, viewMode, selectedClimberId, currentUserId, allBoulders, climbers, activeColor]);

  const maxSendsAnyGrade = useMemo(() => {
    return Math.max(...Object.values(activeStats.perGrade).map((p) => p.sent), 1);
  }, [activeStats.perGrade]);

  const selectedClimber = climbers.find((c) => c.id === selectedClimberId);
  const climberName = selectedClimber ? selectedClimber.display_name : 'Climber';

  const areaNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of areaBreakdown) {
      const gymName = item.gym?.name || gyms.find((g) => g.id === item.area.gym_id)?.name;
      const label = gymName ? `${gymName} • ${item.area.name}` : item.area.name;
      map.set(item.area.id, label);
    }
    return map;
  }, [areaBreakdown, gyms]);

  // Group area breakdown items by gym
  const gymGroups = useMemo(() => {
    const map = new Map<string, { gym: Gym | undefined; items: AreaBreakdownItem[] }>();
    for (const item of areaBreakdown) {
      const gymId = item.area.gym_id || 'unknown';
      if (!map.has(gymId)) {
        const matchedGym = item.gym || gyms.find((g) => g.id === gymId);
        map.set(gymId, { gym: matchedGym, items: [] });
      }
      map.get(gymId)!.items.push(item);
    }
    return Array.from(map.values());
  }, [areaBreakdown, gyms]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Controls: Climber / Group Switcher & Gym Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {climbers.map((c) => {
            const isSelected = viewMode === 'my' && (selectedClimberId || currentUserId) === c.id;
            const isYou = c.id === currentUserId;
            const climberColor = c.accent_color || activeColor;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSetViewMode('my');
                  onSelectClimberId(c.id);
                }}
                style={
                  isSelected
                    ? { backgroundColor: climberColor, color: '#000000' }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active-press border shrink-0 ${
                  isSelected
                    ? 'border-transparent shadow-xs font-extrabold'
                    : 'bg-surface hover:bg-surface-elevated border-white/[0.08] text-slate-300 hover:text-white'
                }`}
              >
                <ClimberAvatar profile={c} size="xs" />
                <span>{c.display_name}</span>
                {isYou && (
                  <span
                    className={`text-[10px] font-semibold px-1 py-0.2 rounded-full ${
                      isSelected ? 'bg-black/20 text-black' : 'text-slate-400'
                    }`}
                  >
                    Me
                  </span>
                )}
              </button>
            );
          })}

          {/* Group / Crew Aggregate Chip */}
          <button
            type="button"
            onClick={() => onSetViewMode('group')}
            style={
              viewMode === 'group'
                ? { backgroundColor: activeColor, color: '#000000' }
                : undefined
            }
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active-press border shrink-0 ${
              viewMode === 'group'
                ? 'border-transparent shadow-xs font-extrabold'
                : 'bg-surface hover:bg-surface-elevated border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Stats</span>
          </button>
        </div>

        {/* Gym Selector */}
        {gyms.length > 1 && onSelectGymId && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Gym:</span>
            <select
              value={selectedGymId}
              onChange={(e) => onSelectGymId(e.target.value)}
              className="bg-surface border border-white/[0.08] text-slate-100 text-xs rounded-full px-3 py-1.5 outline-none font-medium cursor-pointer shadow-xs"
            >
              <option value="all" className="bg-surface text-slate-100">All Gyms</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id} className="bg-surface text-slate-100">
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Group Header Banner (In 'Group Stats' mode) */}
      {viewMode === 'group' && (
        <div
          style={{ borderColor: `${activeColor}30`, backgroundColor: `${activeColor}15`, color: activeColor }}
          className="flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" style={{ color: activeColor }} />
            <span>Combined Wham Crew Stats ({climbers.map((c) => c.display_name).join(', ')})</span>
          </div>
          <span
            style={{ backgroundColor: `${activeColor}30`, color: activeColor }}
            className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full"
          >
            {climbers.length} Climbers
          </span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Hardest Send */}
        <div className="bg-surface border border-white/[0.08] rounded-3xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {viewMode === 'group' ? 'Crew Top Grade' : 'Hardest Send'}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black" style={{ color: activeColor }}>
              {activeStats.hardestSend || '—'}
            </span>
            <Flame className="w-5 h-5" style={{ color: activeColor }} />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {viewMode === 'group' ? 'Hardest topped by crew' : 'Top grade topped'}
          </span>
        </div>

        {/* Total Sends */}
        <div className="bg-surface border border-white/[0.08] rounded-3xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {viewMode === 'group' ? 'Total Crew Sends' : 'Total Sends'}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black text-emerald-400">{activeStats.totalSends}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {viewMode === 'group' ? `${activeStats.totalSends} combined tops` : `${activeStats.sendRate}% send efficiency`}
          </span>
        </div>

        {/* Flashes */}
        <div className="bg-surface border border-white/[0.08] rounded-3xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {viewMode === 'group' ? 'Crew Flashes' : 'Total Flashes'}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black text-amber-400">{activeStats.totalFlashes}</span>
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">{activeStats.flashRate}% flash rate</span>
        </div>

        {/* Avg Attempts */}
        <div className="bg-surface border border-white/[0.08] rounded-3xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Tries / Send</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black text-cyan-400">{activeStats.averageAttemptsOnSend}</span>
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Attempts per send</span>
        </div>
      </div>

      {/* SECTION: Tournament Elo Rating & Global Percentiles */}
      <StatsEloCard
        viewMode={viewMode}
        selectedClimberId={selectedClimberId}
        onSelectClimberId={onSelectClimberId}
        onSetViewMode={onSetViewMode}
        climbers={climbers}
        currentUserId={currentUserId}
        activeColor={activeColor}
        attempts={filteredAttempts}
        boulders={allBoulders}
        onSelectBoulder={onSelectBoulder}
      />

      {/* SECTION: Visual Climbing Graphs (Grade Pyramid & Attempt Efficiency) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Graph 1: Grade Pyramid */}
        <div className="stats-section-deferred lg:col-span-7 bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-heading font-bold text-white">
                Grade Pyramid
              </h3>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1 text-amber-300 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Flash
              </span>
              <span className="flex items-center gap-1 text-emerald-300 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Send
              </span>
            </div>
          </div>

          {activeGradesList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No boulder sends recorded yet to form a pyramid.
            </div>
          ) : (
            <div className="space-y-2 py-1">
              {activeGradesList.map((g) => {
                const data = activeStats.perGrade[g];
                if (!data) return null;
                const flashes = data.flashed;
                const regularSends = data.sent - data.flashed;
                const totalSends = data.sent;
                const widthPct = Math.max(Math.round((totalSends / maxSendsAnyGrade) * 100), totalSends > 0 ? 14 : 6);

                return (
                  <div key={g} className="flex items-center gap-2.5">
                    <span className="w-8 font-mono text-xs font-black text-slate-200 text-right shrink-0">
                      {g}
                    </span>

                    <div className="flex-1 flex items-center">
                      <div
                        className="h-7 rounded-lg flex overflow-hidden shadow-xs transition-all duration-500"
                        style={{ width: `${widthPct}%`, minWidth: '40px' }}
                      >
                        {flashes > 0 && (
                          <div
                            className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-heading font-black text-slate-950 transition-all gap-0.5"
                            style={{ width: `${(flashes / totalSends) * 100}%` }}
                            title={`Flashed: ${flashes}`}
                          >
                            <span>{flashes}</span>
                            <Zap className="w-2.5 h-2.5 fill-current shrink-0" />
                          </div>
                        )}
                        {regularSends > 0 && (
                          <div
                            className="bg-emerald-400 h-full flex items-center justify-center text-[10px] font-heading font-black text-slate-950 transition-all"
                            style={{ width: `${(regularSends / totalSends) * 100}%` }}
                            title={`Sent: ${regularSends}`}
                          >
                            {regularSends}
                          </div>
                        )}
                        {totalSends === 0 && (
                          <div className="w-full bg-surface-elevated text-slate-500 flex items-center justify-center text-[10px] font-mono">
                            {data.attempted} tries
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-20 font-mono text-right shrink-0 tabular-nums flex flex-col items-end justify-center">
                      <span className="text-xs text-slate-200 font-bold">{totalSends} tops</span>
                      {data.attempted > 0 && (
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {Math.round((totalSends / data.attempted) * 100)}% send
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>
              Base: <strong className="text-white font-mono">{pyramidBaseVolume}</strong> climbs (V0–V3)
            </span>
            <span className="font-mono text-amber-300 font-bold">
              {activeStats.pyramidPoints} pts
            </span>
          </div>
        </div>

        {/* Graph 2: Attempt Efficiency */}
        <div className="stats-section-deferred lg:col-span-5 bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-heading font-bold text-white">
                Attempt Efficiency
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Distribution of sends by attempts needed
            </p>
          </div>

          {/* Segmented Distribution Bar */}
          <div className="space-y-3">
            <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-surface-elevated p-0.5 gap-0.5 border border-white/[0.06]">
              {efficiencyMetrics.flashPct > 0 && (
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${efficiencyMetrics.flashPct}%` }}
                  title={`Flash (1 Try): ${efficiencyMetrics.flashCount} (${efficiencyMetrics.flashPct}%)`}
                />
              )}
              {efficiencyMetrics.quickSendPct > 0 && (
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${efficiencyMetrics.quickSendPct}%` }}
                  title={`Quick Send (2-3 Tries): ${efficiencyMetrics.quickSendCount} (${efficiencyMetrics.quickSendPct}%)`}
                />
              )}
              {efficiencyMetrics.projectSendPct > 0 && (
                <div
                  className="h-full rounded-full bg-sky-400 transition-all duration-500"
                  style={{ width: `${efficiencyMetrics.projectSendPct}%` }}
                  title={`Project (4+ Tries): ${efficiencyMetrics.projectSendCount} (${efficiencyMetrics.projectSendPct}%)`}
                />
              )}
            </div>

            {/* 3 Metrics Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-surface-elevated/70 border border-white/[0.06] rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Flash
                </span>
                <span className="font-mono text-base font-black text-white block mt-0.5">
                  {efficiencyMetrics.flashCount}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {efficiencyMetrics.flashPct}%
                </span>
              </div>

              <div className="bg-surface-elevated/70 border border-white/[0.06] rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  2–3 Tries
                </span>
                <span className="font-mono text-base font-black text-white block mt-0.5">
                  {efficiencyMetrics.quickSendCount}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {efficiencyMetrics.quickSendPct}%
                </span>
              </div>

              <div className="bg-surface-elevated/70 border border-white/[0.06] rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                  4+ Tries
                </span>
                <span className="font-mono text-base font-black text-white block mt-0.5">
                  {efficiencyMetrics.projectSendCount}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {efficiencyMetrics.projectSendPct}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>
              Average Tries / Send
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {activeStats.averageAttemptsOnSend} tries
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: Send % and Flash % Conversion Rates by Grade */}
      <div className="stats-section-deferred bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Percent className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-heading font-bold text-white">
                  Send &amp; Flash % per Grade
                </h3>
                {conversionGradesList.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-elevated border border-white/[0.08] text-slate-300">
                    {conversionGradesList.length} {conversionGradesList.length === 1 ? 'grade' : 'grades'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {viewMode === 'my'
                  ? `Success and first-try rates by grade for ${climberName}`
                  : 'Crew-wide send and flash conversion rates by grade'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Order Toggle */}
            {conversionGradesList.length > 1 && (
              <button
                type="button"
                onClick={() => setGradeSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-surface-elevated hover:bg-surface-elevated/80 border border-white/[0.08] text-slate-300 hover:text-white transition-colors active-press"
                title={`Sort ${gradeSortOrder === 'asc' ? 'Lowest to Highest' : 'Highest to Lowest'}`}
              >
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>{gradeSortOrder === 'asc' ? 'V0 → Hardest' : 'Hardest → V0'}</span>
              </button>
            )}

            {/* Legend */}
            <div className="flex items-center gap-2.5 text-xs bg-surface-elevated border border-white/[0.08] px-3 py-1 rounded-full">
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Send %
              </span>
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Flash %
              </span>
            </div>
          </div>
        </div>

        {conversionGradesList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 font-mono bg-surface-elevated/40 rounded-2xl border border-white/[0.06]">
            No boulder attempts logged yet to calculate grade conversion rates.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {conversionGradesList.map((g) => {
              const data = activeStats.perGrade[g];
              if (!data || data.attempted === 0) return null;

              const sendPct = Math.round((data.sent / data.attempted) * 100);
              const flashPct = Math.round((data.flashed / data.attempted) * 100);

              return (
                <div
                  key={g}
                  className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-white/[0.06] flex flex-col justify-between gap-3 hover:border-white/[0.12] transition-colors"
                >
                  {/* Top row: Grade pill & Attempts count */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-white px-2.5 py-1 rounded-lg bg-surface border border-white/[0.08] shadow-xs">
                      {g}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      <strong className="text-emerald-400">{data.sent}</strong>/{data.attempted} topped • <strong className="text-amber-400">{data.flashed}</strong> flashed
                    </span>
                  </div>

                  {/* Dual Progress Bars: Send % & Flash % */}
                  <div className="space-y-2">
                    {/* Send Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Send %</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {sendPct}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-white/[0.04]">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${sendPct}%` }}
                          title={`Send Rate: ${sendPct}% (${data.sent}/${data.attempted} topped)`}
                        />
                      </div>
                    </div>

                    {/* Flash Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          <span>Flash %</span>
                        </span>
                        <span className="font-mono font-bold text-amber-400">
                          {flashPct}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-white/[0.04]">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${flashPct}%` }}
                          title={`Flash Rate: ${flashPct}% (${data.flashed}/${data.attempted} flashed)`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: Progress Over Time (Progression Chart & Session Log) */}
      <div className="stats-section-deferred bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-5 shadow-xs">
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${activeColor}15`,
                borderColor: `${activeColor}30`,
                color: activeColor
              }}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-heading font-bold text-white">
                  Progress Over Time
                </h3>
                {timelineData.sessions.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-elevated border border-white/[0.08] text-slate-300">
                    {timelineData.sessions.length} {timelineData.sessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {viewMode === 'my'
                  ? `Session trajectory and grade progression for ${climberName}`
                  : 'Crew progression and milestone trajectory across gym visits'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex p-1 bg-surface-elevated border border-white/[0.08] rounded-full overflow-x-auto no-scrollbar shadow-xs">
            <button
              type="button"
              onClick={() => setTimelineMode('grade')}
              style={timelineMode === 'grade' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press ${
                timelineMode === 'grade' ? 'text-black font-extrabold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Max Grade</span>
            </button>

            <button
              type="button"
              onClick={() => setTimelineMode('cumulative')}
              style={timelineMode === 'cumulative' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press ${
                timelineMode === 'cumulative' ? 'text-black font-extrabold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Cumulative</span>
            </button>

            <button
              type="button"
              onClick={() => setTimelineMode('volume')}
              style={timelineMode === 'volume' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press ${
                timelineMode === 'volume' ? 'text-black font-extrabold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Session Volume</span>
            </button>
          </div>
        </div>

        {/* Chart View */}
        {timelineData.sessions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-elevated/40 border border-white/[0.06] text-center flex flex-col items-center gap-2">
            <Calendar className="w-6 h-6 text-slate-500 mb-1" />
            <p className="text-xs font-bold text-slate-300">No session history recorded yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Log boulder attempts and sends to automatically map out your progression over time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* SVG Visual Progression Chart */}
            <div className="w-full bg-surface-elevated/30 rounded-2xl border border-white/[0.06] p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-medium text-slate-300">
                  {timelineMode === 'grade' && 'Peak Grade Sent per Session'}
                  {timelineMode === 'cumulative' && 'Total Sends Trajectory'}
                  {timelineMode === 'volume' && 'Tops Logged per Gym Visit'}
                </span>

                {/* Climber legend in group mode */}
                {viewMode === 'group' && (
                  <div className="flex items-center gap-2.5 text-[11px]">
                    {climbers.map((c) => (
                      <span key={c.id} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.accent_color || activeColor }} />
                        <span className="text-slate-300 font-medium">{c.display_name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Responsive SVG Chart */}
              <div className="w-full overflow-x-auto no-scrollbar py-1">
                {(() => {
                  const numPoints = timelineData.sessions.length;
                  const chartWidth = Math.max(500, numPoints * 65);
                  const chartHeight = 190;
                  const plotLeft = 45;
                  const plotRight = chartWidth - 25;
                  const plotTop = 20;
                  const plotBottom = 155;
                  const plotHeight = plotBottom - plotTop;
                  const plotWidth = plotRight - plotLeft;

                  const getX = (idx: number) => {
                    if (numPoints <= 1) return plotLeft + plotWidth / 2;
                    return plotLeft + (idx / (numPoints - 1)) * plotWidth;
                  };

                  return (
                    <div style={{ minWidth: `${Math.min(chartWidth, 680)}px`, height: `${chartHeight}px` }} className="relative w-full">
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full block">
                        <defs>
                          <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={activeColor} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={activeColor} stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34D399" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#34D399" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* MODE 1: MAX GRADE PROGRESSION */}
                        {timelineMode === 'grade' && (() => {
                          const minG = timelineData.minGradeIdx;
                          const maxG = timelineData.maxGradeIdx;
                          const range = Math.max(maxG - minG, 1);

                          const gradeIndicesToLabel: number[] = [];
                          for (let g = minG; g <= maxG; g++) {
                            if (range <= 6 || g % 2 === 0 || g === maxG || g === minG) {
                              gradeIndicesToLabel.push(g);
                            }
                          }

                          return (
                            <>
                              {/* Horizontal Gridlines */}
                              {gradeIndicesToLabel.map((gIdx) => {
                                const y = plotBottom - ((gIdx - minG) / range) * plotHeight;
                                return (
                                  <g key={gIdx}>
                                    <line
                                      x1={plotLeft}
                                      y1={y}
                                      x2={plotRight}
                                      y2={y}
                                      stroke="#334155"
                                      strokeWidth="1"
                                      strokeDasharray="4 4"
                                      opacity="0.4"
                                    />
                                    <text
                                      x={plotLeft - 8}
                                      y={y + 3.5}
                                      fill="#94A3B8"
                                      fontSize="10"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                      textAnchor="end"
                                    >
                                      {GRADES[gIdx]}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Multi-line series in Group Mode */}
                              {viewMode === 'group' ? (
                                timelineData.climberSeries.map((series) => {
                                  const validPoints = series.points
                                    .map((p, idx) => ({
                                      x: getX(idx),
                                      y: p.sessionMaxIdx >= 0 ? plotBottom - ((p.sessionMaxIdx - minG) / range) * plotHeight : null,
                                      grade: p.sessionMaxGrade
                                    }))
                                    .filter((pt) => pt.y !== null) as Array<{ x: number; y: number; grade: Grade | null }>;

                                  if (validPoints.length === 0) return null;

                                  const linePath = validPoints
                                    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                                    .join(' ');

                                  return (
                                    <g key={series.climber.id}>
                                      <path
                                        d={linePath}
                                        fill="none"
                                        stroke={series.color}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      {validPoints.map((pt, i) => (
                                        <circle
                                          key={i}
                                          cx={pt.x}
                                          cy={pt.y}
                                          r="4"
                                          fill={series.color}
                                          stroke="#0F172A"
                                          strokeWidth="1.5"
                                        />
                                      ))}
                                    </g>
                                  );
                                })
                              ) : (() => {
                                /* Single Climber Progression Line */
                                const validPoints = timelineData.sessions
                                  .map((s, idx) => ({
                                    x: getX(idx),
                                    y: s.sessionMaxIdx >= 0 ? plotBottom - ((s.sessionMaxIdx - minG) / range) * plotHeight : null,
                                    grade: s.sessionMaxGrade,
                                    date: s.date
                                  }))
                                  .filter((pt) => pt.y !== null) as Array<{ x: number; y: number; grade: Grade | null; date: string }>;

                                if (validPoints.length === 0) {
                                  return (
                                    <text x={plotLeft + plotWidth / 2} y={plotTop + plotHeight / 2} fill="#64748B" fontSize="11" textAnchor="middle">
                                      No topped boulders in this period
                                    </text>
                                  );
                                }

                                const linePath = validPoints
                                  .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                                  .join(' ');

                                const areaPath = `${linePath} L ${validPoints[validPoints.length - 1].x} ${plotBottom} L ${validPoints[0].x} ${plotBottom} Z`;

                                return (
                                  <>
                                    <path d={areaPath} fill="url(#progressionGradient)" />
                                    <path
                                      d={linePath}
                                      fill="none"
                                      stroke={activeColor}
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    {validPoints.map((pt, i) => (
                                      <g key={i}>
                                        <circle
                                          cx={pt.x}
                                          cy={pt.y}
                                          r="5"
                                          fill={activeColor}
                                          stroke="#0B0F19"
                                          strokeWidth="2"
                                        />
                                        <text
                                          x={pt.x}
                                          y={pt.y - 10}
                                          fill="#FFFFFF"
                                          fontSize="10"
                                          fontFamily="monospace"
                                          fontWeight="bold"
                                          textAnchor="middle"
                                        >
                                          {pt.grade}
                                        </text>
                                      </g>
                                    ))}
                                  </>
                                );
                              })()}
                            </>
                          );
                        })()}

                        {/* MODE 2: CUMULATIVE SENDS */}
                        {timelineMode === 'cumulative' && (() => {
                          const maxC = timelineData.maxCumulative;
                          const gridVals = [0, Math.round(maxC / 2), maxC];

                          const pts = timelineData.sessions.map((s, idx) => ({
                            x: getX(idx),
                            y: plotBottom - (s.cumulativeSends / maxC) * plotHeight,
                            sends: s.cumulativeSends
                          }));

                          const linePath = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
                          const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${plotBottom} L ${pts[0].x} ${plotBottom} Z`;

                          return (
                            <>
                              {gridVals.map((val, i) => {
                                const y = plotBottom - (val / maxC) * plotHeight;
                                return (
                                  <g key={i}>
                                    <line
                                      x1={plotLeft}
                                      y1={y}
                                      x2={plotRight}
                                      y2={y}
                                      stroke="#334155"
                                      strokeWidth="1"
                                      strokeDasharray="4 4"
                                      opacity="0.4"
                                    />
                                    <text
                                      x={plotLeft - 8}
                                      y={y + 3.5}
                                      fill="#94A3B8"
                                      fontSize="10"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                      textAnchor="end"
                                    >
                                      {val}
                                    </text>
                                  </g>
                                );
                              })}

                              <path d={areaPath} fill="url(#cumulativeGradient)" />
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#34D399"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {pts.map((pt, i) => (
                                <g key={i}>
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="4.5"
                                    fill="#34D399"
                                    stroke="#0B0F19"
                                    strokeWidth="2"
                                  />
                                  <text
                                    x={pt.x}
                                    y={pt.y - 9}
                                    fill="#FFFFFF"
                                    fontSize="10"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {pt.sends}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}

                        {/* MODE 3: SESSION VOLUME BARS */}
                        {timelineMode === 'volume' && (() => {
                          const maxVol = timelineData.maxVolume;
                          const gridVals = [0, Math.round(maxVol / 2), maxVol];
                          const barWidth = Math.max(14, Math.min(28, (plotWidth / numPoints) * 0.5));

                          return (
                            <>
                              {gridVals.map((val, i) => {
                                const y = plotBottom - (val / maxVol) * plotHeight;
                                return (
                                  <g key={i}>
                                    <line
                                      x1={plotLeft}
                                      y1={y}
                                      x2={plotRight}
                                      y2={y}
                                      stroke="#334155"
                                      strokeWidth="1"
                                      strokeDasharray="4 4"
                                      opacity="0.4"
                                    />
                                    <text
                                      x={plotLeft - 8}
                                      y={y + 3.5}
                                      fill="#94A3B8"
                                      fontSize="10"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                      textAnchor="end"
                                    >
                                      {val}
                                    </text>
                                  </g>
                                );
                              })}

                              {timelineData.sessions.map((s, idx) => {
                                const cx = getX(idx);
                                const totalH = (s.totalSends / maxVol) * plotHeight;
                                const flashH = s.totalSends > 0 ? (s.totalFlashes / s.totalSends) * totalH : 0;
                                const regularH = totalH - flashH;

                                const yBase = plotBottom;
                                const yFlashTop = yBase - flashH;
                                const yTotalTop = yBase - totalH;

                                return (
                                  <g key={idx}>
                                    {/* Regular sends (emerald) */}
                                    {regularH > 0 && (
                                      <rect
                                        x={cx - barWidth / 2}
                                        y={yTotalTop}
                                        width={barWidth}
                                        height={regularH}
                                        fill="#34D399"
                                        rx={flashH > 0 ? 0 : 3}
                                      />
                                    )}
                                    {/* Flashes (amber) */}
                                    {flashH > 0 && (
                                      <rect
                                        x={cx - barWidth / 2}
                                        y={yFlashTop}
                                        width={barWidth}
                                        height={flashH}
                                        fill="#FBBF24"
                                        rx={regularH > 0 ? 0 : 3}
                                      />
                                    )}
                                    {/* Total sends count label */}
                                    {s.totalSends > 0 && (
                                      <text
                                        x={cx}
                                        y={yTotalTop - 6}
                                        fill="#FFFFFF"
                                        fontSize="10"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                      >
                                        {s.totalSends}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}

                        {/* X-Axis Date Labels */}
                        {timelineData.sessions.map((s, idx) => {
                          const x = getX(idx);
                          return (
                            <text
                              key={idx}
                              x={x}
                              y={plotBottom + 18}
                              fill="#94A3B8"
                              fontSize="10"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {formatShortDate(s.date)}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Recent Sessions Activity Cards */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Recent Sessions Log
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[...timelineData.sessions].reverse().slice(0, 4).map((s) => {
                  const isExpanded = expandedSessionDate === s.date;
                  return (
                    <div
                      key={s.date}
                      className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/[0.06] flex flex-col justify-between gap-2.5 hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {formatFullDate(s.date)}
                        </span>
                        {s.sessionMaxGrade && (
                          <span
                            style={{ backgroundColor: `${activeColor}20`, borderColor: `${activeColor}40`, color: activeColor }}
                            className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          >
                            Top: {s.sessionMaxGrade}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-mono font-bold">
                          {s.totalSends} {s.totalSends === 1 ? 'send' : 'sends'}
                        </span>
                        {s.totalFlashes > 0 && (
                          <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-amber-400" />
                            <span>{s.totalFlashes} flashed</span>
                          </span>
                        )}
                      </div>

                      {s.sendsList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedSessionDate(isExpanded ? null : s.date)}
                          className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px] text-slate-400 hover:text-white transition-colors"
                        >
                          <span>{isExpanded ? 'Hide climbed problems' : `View ${s.sendsList.length} problems`}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Expanded Boulders list */}
                      {isExpanded && s.sendsList.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1.5 animate-in fade-in">
                          {s.sendsList.slice(0, 5).map((item, idx) => item.boulder && (
                            <div
                              key={idx}
                              onClick={() => onSelectBoulder && onSelectBoulder(item.boulder!)}
                              className="flex items-center justify-between p-1.5 rounded-lg bg-surface hover:bg-surface-elevated cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <HoldBadge
                                  color={item.boulder.hold_colour}
                                  grade={item.boulder.grade}
                                  isComp={item.boulder.is_comp}
                                  compNumber={item.boulder.comp_number}
                                  size="sm"
                                />
                                {viewMode === 'group' && item.climber && (
                                  <span className="text-[10px] text-slate-300 font-medium">
                                    {item.climber.display_name}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {item.attempt.status === 'flashed' ? 'Flash' : `${item.attempt.attempt_count}t`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Gym Coverage & Sector Breakdown */}
      <div className="stats-section-deferred grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Donut Chart: Gym Topped Percentage */}
        <div className="bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {viewMode === 'group' ? 'Crew Gym Coverage' : 'Gym Completion Rate'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-surface-elevated border border-white/[0.08] text-slate-300">
              <MapPin className="w-2.5 h-2.5 text-amber-400" />
              <span>{selectedGymId === 'all' ? 'All Gyms' : gyms.find((g) => g.id === selectedGymId)?.name || 'Gym'}</span>
            </span>
          </div>

          <div className="relative flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1E293B" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={activeColor}
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
                {userSentActiveBouldersCount} / {activeGymBoulders.length}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            {viewMode === 'group'
              ? `${userSentActiveBouldersCount} of ${activeGymBoulders.length} active boulders topped by the crew (${
                  activeGymBoulders.length - userSentActiveBouldersCount
                } unclimbed)`
              : `${activeGymBoulders.length - userSentActiveBouldersCount} active boulders left to send across ${
                  selectedGymId === 'all'
                    ? 'all gyms'
                    : gyms.find((g) => g.id === selectedGymId)?.name || 'the gym'
                }`}
          </p>
        </div>

        {/* Breakdown of Active Climbs Remaining Per Area */}
        <div className="md:col-span-2 bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {viewMode === 'group' ? 'Crew Area Coverage' : 'Area Completion & Remaining Climbs'}
              </span>
              <span className="text-[11px] text-slate-400">
                Clockwise sector ticklists organized by climbing gym
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold" style={{ color: activeColor }}>
              {selectedGymId && selectedGymId !== 'all'
                ? `${gyms.find((g) => g.id === selectedGymId)?.name || 'Selected Gym'} Sectors`
                : `${gymGroups.length} ${gymGroups.length === 1 ? 'Gym' : 'Gyms'} • All Sectors`}
            </span>
          </div>

          {areaBreakdown.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono bg-surface-elevated/40 rounded-2xl border border-white/[0.06]">
              No active boulders or wall sectors found.
            </div>
          ) : (
            <div className="space-y-5">
              {gymGroups.map((group, groupIdx) => {
                const totalGymSent = group.items.reduce((acc, i) => acc + i.sent, 0);
                const totalGymTotal = group.items.reduce((acc, i) => acc + i.total, 0);
                const gymPct = totalGymTotal > 0 ? Math.round((totalGymSent / totalGymTotal) * 100) : 0;
                const gymName = group.gym?.name || 'Gym';

                return (
                  <div key={group.gym?.id || groupIdx} className="space-y-3">
                    {/* Gym Section Header */}
                    <div className="flex items-center justify-between gap-2 pt-2 first:pt-0 pb-1.5 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 shadow-xs">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider">
                          {gymName}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        <strong className="text-slate-200">{group.items.length}</strong> {group.items.length === 1 ? 'sector' : 'sectors'} •{' '}
                        <strong className="text-emerald-400">{totalGymSent}</strong>/{totalGymTotal} ({gymPct}%)
                      </span>
                    </div>

                    {/* Sectors inside this Gym */}
                    <div className="space-y-3 pl-0.5">
                      {group.items.map((item) => (
                        <div key={item.area.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-slate-200 truncate">
                                {item.area.name}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400/90 border border-slate-700/60 shrink-0 uppercase tracking-wider">
                                {gymName}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-400 shrink-0">
                              <strong className="text-emerald-400">{item.sent}</strong> / {item.total}{' '}
                              {viewMode === 'group' ? 'topped by crew' : 'sent'} ({item.remaining} left)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${item.pct}%`, backgroundColor: activeColor }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Community Reviews & Grade Consensus Section */}
      <div className="stats-section-deferred bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-5 shadow-xs">
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${activeColor}15`,
                borderColor: `${activeColor}30`,
                color: activeColor
              }}
            >
              <MessageSquareHeart className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Reviews & Grade Consensus</h3>
                {reviewStats.totalReviews > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-elevated border border-white/[0.08] text-slate-300">
                    {reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {viewMode === 'my'
                  ? `Quality kaomoji ratings and grade feel logged by ${climberName}`
                  : 'Crew-wide kaomoji vibe ratings and collective grade calibration'}
              </p>
            </div>
          </div>

          {/* Right badge: Tendency / Consensus Pill */}
          {reviewStats.totalGradeOpinions >= 2 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-elevated border border-white/[0.08] text-xs font-semibold">
              {reviewStats.tendency === 'tough' && (
                <>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
              {reviewStats.tendency === 'generous' && (
                <>
                  <Feather className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-teal-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
              {reviewStats.tendency === 'spot-on' && (
                <>
                  <Scale className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-sky-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
              {reviewStats.tendency === 'balanced' && (
                <>
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">
              {reviewStats.totalReviews} logged
            </span>
          )}
        </div>

        {/* Content or Empty State */}
        {reviewStats.totalReviews === 0 ? (
          <div className="p-6 rounded-2xl bg-surface-elevated/40 border border-white/[0.06] text-center flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 font-mono text-base font-black text-slate-400">
              <span className="text-emerald-400">(•‿•)</span>
              <span className="text-slate-400">(•_•)</span>
              <span className="text-rose-400">(&gt;_&lt;)</span>
            </div>
            <p className="text-xs font-semibold text-slate-300">
              {viewMode === 'my'
                ? `No reviews logged yet by ${climberName}`
                : 'No climb reviews logged yet'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Log sends or inspect any boulder card to rate its quality with kaomoji and calibrate whether the grade feels soft, fair, or hard.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Dual Grid: Quality (Kaomoji) & Grade Consensus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Column 1: Climb Quality (Kaomoji) */}
              <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-white/[0.06] flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>Climb Quality</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {reviewStats.positivePercentage !== null
                      ? `${reviewStats.positivePercentage}% positive reception`
                      : `${reviewStats.totalRatings} ratings`}
                  </span>
                </div>

                {/* 3 Kaomoji Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Good */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-base font-black text-emerald-400 leading-tight">
                      (•‿•)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300/90 mt-1 uppercase tracking-wider">
                      Good
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.ratingCounts.good}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.ratingPercentages.good}%
                    </span>
                  </div>

                  {/* Okay */}
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-base font-black text-slate-300 leading-tight">
                      (•_•)
                    </span>
                    <span className="text-[10px] font-bold text-slate-300/90 mt-1 uppercase tracking-wider">
                      Okay
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.ratingCounts.ok}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.ratingPercentages.ok}%
                    </span>
                  </div>

                  {/* Rough */}
                  <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/25 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-base font-black text-rose-400 leading-tight">
                      (&gt;_&lt;)
                    </span>
                    <span className="text-[10px] font-bold text-rose-300/90 mt-1 uppercase tracking-wider">
                      Rough
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.ratingCounts.rough}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.ratingPercentages.rough}%
                    </span>
                  </div>
                </div>

                {/* Multi-segment distribution bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${reviewStats.ratingPercentages.good}%` }}
                      title={`Good: ${reviewStats.ratingPercentages.good}%`}
                    />
                    <div
                      className="h-full bg-slate-400 transition-all duration-500"
                      style={{ width: `${reviewStats.ratingPercentages.ok}%` }}
                      title={`Okay: ${reviewStats.ratingPercentages.ok}%`}
                    />
                    <div
                      className="h-full bg-rose-400 transition-all duration-500"
                      style={{ width: `${reviewStats.ratingPercentages.rough}%` }}
                      title={`Rough: ${reviewStats.ratingPercentages.rough}%`}
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Grade Consensus */}
              <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-white/[0.06] flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>Grade Consensus</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {reviewStats.totalGradeOpinions} votes
                  </span>
                </div>

                {/* 3 Grade Opinion Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Soft */}
                  <div className="p-2.5 rounded-xl bg-teal-950/20 border border-teal-500/25 flex flex-col items-center justify-center text-center">
                    <Feather className="w-4 h-4 text-teal-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-teal-300/90 mt-1 uppercase tracking-wider">
                      Soft
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.gradeOpinionCounts.soft}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.gradePercentages.soft}%
                    </span>
                  </div>

                  {/* Fair */}
                  <div className="p-2.5 rounded-xl bg-sky-950/20 border border-sky-500/25 flex flex-col items-center justify-center text-center">
                    <Scale className="w-4 h-4 text-sky-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-sky-300/90 mt-1 uppercase tracking-wider">
                      Fair
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.gradeOpinionCounts.fair}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.gradePercentages.fair}%
                    </span>
                  </div>

                  {/* Hard */}
                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/25 flex flex-col items-center justify-center text-center">
                    <Flame className="w-4 h-4 text-amber-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-amber-300/90 mt-1 uppercase tracking-wider">
                      Hard
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.gradeOpinionCounts.hard}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.gradePercentages.hard}%
                    </span>
                  </div>
                </div>

                {/* Multi-segment distribution bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-teal-400 transition-all duration-500"
                      style={{ width: `${reviewStats.gradePercentages.soft}%` }}
                      title={`Soft: ${reviewStats.gradePercentages.soft}%`}
                    />
                    <div
                      className="h-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${reviewStats.gradePercentages.fair}%` }}
                      title={`Fair: ${reviewStats.gradePercentages.fair}%`}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${reviewStats.gradePercentages.hard}%` }}
                      title={`Hard: ${reviewStats.gradePercentages.hard}%`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Spotlight Notable Boulders (Crowd Pleaser, Spiciest Testpiece, Softest Tick, Rough Test) */}
            {(reviewStats.topCrowdPleasers.length > 0 ||
              reviewStats.topSpicyBoulders.length > 0 ||
              reviewStats.topSoftBoulders.length > 0 ||
              reviewStats.topRoughBoulders.length > 0) && (
              <div className="pt-2 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Consensus Standouts</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Tap to inspect boulder</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Crowd Pleaser */}
                  {reviewStats.topCrowdPleasers[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topCrowdPleasers[0].boulder)}
                      className="p-3 rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                          (•‿•) Crowd Pleaser
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topCrowdPleasers[0].boulder.hold_colour}
                          grade={reviewStats.topCrowdPleasers[0].boulder.grade}
                          isComp={reviewStats.topCrowdPleasers[0].boulder.is_comp}
                          compNumber={reviewStats.topCrowdPleasers[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topCrowdPleasers[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {reviewStats.topCrowdPleasers[0].goodCount} good {reviewStats.topCrowdPleasers[0].goodCount === 1 ? 'rating' : 'ratings'}
                      </span>
                    </button>
                  )}

                  {/* Spiciest Testpiece */}
                  {reviewStats.topSpicyBoulders[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topSpicyBoulders[0].boulder)}
                      className="p-3 rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-amber-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          <span>Spiciest Grade</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topSpicyBoulders[0].boulder.hold_colour}
                          grade={reviewStats.topSpicyBoulders[0].boulder.grade}
                          isComp={reviewStats.topSpicyBoulders[0].boulder.is_comp}
                          compNumber={reviewStats.topSpicyBoulders[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topSpicyBoulders[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        {reviewStats.topSpicyBoulders[0].hardCount} voted Hard
                      </span>
                    </button>
                  )}

                  {/* Softest Tick */}
                  {reviewStats.topSoftBoulders[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topSoftBoulders[0].boulder)}
                      className="p-3 rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-teal-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-950/60 border border-teal-500/30 text-teal-300 flex items-center gap-1">
                          <Feather className="w-2.5 h-2.5 text-teal-400" />
                          <span>Softest Tick</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topSoftBoulders[0].boulder.hold_colour}
                          grade={reviewStats.topSoftBoulders[0].boulder.grade}
                          isComp={reviewStats.topSoftBoulders[0].boulder.is_comp}
                          compNumber={reviewStats.topSoftBoulders[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topSoftBoulders[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-teal-400 font-bold">
                        {reviewStats.topSoftBoulders[0].softCount} voted Soft
                      </span>
                    </button>
                  )}

                  {/* Rough Problem or Second Crowd Pleaser */}
                  {reviewStats.topRoughBoulders[0] ? (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topRoughBoulders[0].boulder)}
                      className="p-3 rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-rose-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300">
                          (&gt;_&lt;) Rough &amp; Sharp
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topRoughBoulders[0].boulder.hold_colour}
                          grade={reviewStats.topRoughBoulders[0].boulder.grade}
                          isComp={reviewStats.topRoughBoulders[0].boulder.is_comp}
                          compNumber={reviewStats.topRoughBoulders[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topRoughBoulders[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-rose-400 font-bold">
                        {reviewStats.topRoughBoulders[0].roughCount} rough {reviewStats.topRoughBoulders[0].roughCount === 1 ? 'vote' : 'votes'}
                      </span>
                    </button>
                  ) : reviewStats.topCrowdPleasers[1] ? (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topCrowdPleasers[1].boulder)}
                      className="p-3 rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                          (•‿•) Highly Rated
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topCrowdPleasers[1].boulder.hold_colour}
                          grade={reviewStats.topCrowdPleasers[1].boulder.grade}
                          isComp={reviewStats.topCrowdPleasers[1].boulder.is_comp}
                          compNumber={reviewStats.topCrowdPleasers[1].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topCrowdPleasers[1].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {reviewStats.topCrowdPleasers[1].goodCount} good ratings
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hall of Fame & Superlatives Cards */}
      {accoladesList.length > 0 &&
        (showAccolades ? (
          <div className="bg-surface border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-4 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: activeColor }} />
                <div>
                  <h3 className="text-sm font-bold text-white">Crew Superlatives & Accolades</h3>
                  <p className="text-[11px] text-slate-400">Unique standout achievements across your crew</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleAccolades(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-surface-elevated transition-colors border border-transparent hover:border-white/[0.08]"
                title="Hide crew accolades section"
              >
                Hide
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {accoladesList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/[0.06] flex flex-col items-center text-center gap-1.5 hover:border-white/[0.15] transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-white/[0.08] flex items-center justify-center">
                    {getAccoladeIcon(item.id, item.climber.accent_color || activeColor)}
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: item.climber.accent_color || activeColor }}
                  >
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1.5 max-w-full my-0.5">
                    <ClimberAvatar profile={item.climber} size="xs" />
                    <strong className="text-xs text-white truncate max-w-[85px]">{item.climber.display_name}</strong>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">{item.value}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{item.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-end animate-in fade-in">
            <button
              type="button"
              onClick={() => onToggleAccolades(true)}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-white/[0.08] hover:bg-surface-elevated transition-colors shadow-xs"
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: activeColor }} />
              <span>Show Crew Accolades</span>
            </button>
          </div>
        ))}
    </div>
  );
};
