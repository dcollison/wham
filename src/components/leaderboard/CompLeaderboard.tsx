import React, { useState, useMemo } from 'react';
import { Boulder, Attempt, Profile, Gym, GymArea, LogAttemptParams } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { HoldBadge } from '../boulders/HoldBadge';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { WinterSeriesView } from './WinterSeriesView';
import {
  computeGymCompLeaderboard,
  computeMonthlyHallOfFame,
  getAvailableCompMonths,
  getCurrentCompMonth,
  GRADE_BASE_POINTS,
  FLASH_BONUS_MULTIPLIER
} from '../../lib/compScoring';
import {
  Trophy,
  Crown,
  Medal,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Award
} from 'lucide-react';

interface CompLeaderboardProps {
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  gyms: Gym[];
  areas?: GymArea[];
  initialGymId?: string;
  initialMonthKey?: string;
  initialMode?: 'winter_series' | 'monthly_comp';
  currentUserId?: string;
  onSelectBoulder?: (boulder: Boulder) => void;
  onLogAttempt?: (params: LogAttemptParams) => Promise<void>;
  onDeleteAttempt?: (boulderId: string, userId?: string) => Promise<void>;
  showGymSelector?: boolean;
}

export const CompLeaderboard: React.FC<CompLeaderboardProps> = ({
  boulders,
  attempts,
  climbers,
  gyms,
  areas: areasProp,
  initialGymId = 'all',
  initialMonthKey,
  initialMode = 'winter_series',
  currentUserId,
  onSelectBoulder,
  onLogAttempt,
  onDeleteAttempt,
  showGymSelector = true
}) => {
  const gymCtx = useGym();
  const effectiveAreas = areasProp || gymCtx.areas;
  const effectiveLogAttempt = onLogAttempt || gymCtx.logAttempt;
  const effectiveDeleteAttempt = onDeleteAttempt || gymCtx.deleteAttempt;

  const [compMode, setCompMode] = useState<'winter_series' | 'monthly_comp'>(initialMode);
  const currentMonth = useMemo(() => getCurrentCompMonth(), []);
  const availableMonths = useMemo(() => getAvailableCompMonths(attempts), [attempts]);

  const [selectedGymId, setSelectedGymId] = useState<string>(initialGymId);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => initialMonthKey || currentMonth.key);
  const [expandedClimberId, setExpandedClimberId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showHallOfFame, setShowHallOfFame] = useState<boolean>(false);

  const { currentUser } = useAuth();
  const activeUser = climbers.find((c) => c.id === currentUserId) || currentUser;
  const activeColor = currentUser?.accent_color || activeUser?.accent_color || '#F59E0B';

  // Compute leaderboard data for the selected gym & period
  const leaderboardData = useMemo(() => {
    return computeGymCompLeaderboard(
      selectedGymId,
      gyms,
      boulders,
      attempts,
      climbers,
      selectedPeriod
    );
  }, [selectedGymId, gyms, boulders, attempts, climbers, selectedPeriod]);

  // Compute historic Hall of Fame
  const hallOfFame = useMemo(() => {
    return computeMonthlyHallOfFame(selectedGymId, gyms, boulders, attempts, climbers);
  }, [selectedGymId, gyms, boulders, attempts, climbers]);

  const { standings, activeBouldersCount, gymName, monthInfo, isMonthly } =
    leaderboardData;

  const firstPlace = standings[0];
  const secondPlace = standings[1];
  const thirdPlace = standings[2];

  const toggleExpandClimber = (id: string) => {
    setExpandedClimberId((prev) => (prev === id ? null : id));
  };

  const currentMonthIndex = availableMonths.findIndex((m) => m.key === selectedPeriod);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Top Mode Switcher: Winter Boulder Series 2026/27 vs Monthly Redpoint Comp */}
      <div className="bg-surface border border-white/[0.08] rounded-2xl p-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCompMode('winter_series')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
            compMode === 'winter_series'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-surface-elevated'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Winter Boulder Series (3/2/1)</span>
        </button>

        <button
          type="button"
          onClick={() => setCompMode('monthly_comp')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
            compMode === 'monthly_comp'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-surface-elevated'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span>Monthly V-Grade Comp</span>
        </button>
      </div>

      {compMode === 'winter_series' ? (
        <WinterSeriesView
          boulders={boulders}
          attempts={attempts}
          climbers={climbers}
          currentUser={activeUser}
          gyms={gyms}
          areas={effectiveAreas}
          onLogAttempt={effectiveLogAttempt}
          onDeleteAttempt={effectiveDeleteAttempt}
          onSelectBoulder={onSelectBoulder}
        />
      ) : (
        <>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ds-card p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white">
              {gymName} Comp Leaderboard
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 tabular-nums">
            {isMonthly
              ? `${monthInfo?.label || 'This month'} • ${activeBouldersCount} climbs scored`
              : `${activeBouldersCount} active climbs scored`}
          </p>
        </div>

        {/* Controls: Hall of Fame, Rules toggle & Gym filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setShowHallOfFame(!showHallOfFame);
              if (showRules) setShowRules(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border active-press ${
              showHallOfFame
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-carbon border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Hall of Fame</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowRules(!showRules);
              if (showHallOfFame) setShowHallOfFame(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border active-press ${
              showRules
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-carbon border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Rules</span>
          </button>

          {showGymSelector && (
            <div className="flex p-1 bg-carbon border border-white/[0.08] rounded-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedGymId('all')}
                style={selectedGymId === 'all' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press ${
                  selectedGymId === 'all'
                    ? 'text-black font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Gyms
              </button>
              {gyms.map((gym) => (
                <button
                  key={gym.id}
                  type="button"
                  onClick={() => setSelectedGymId(gym.id)}
                  style={selectedGymId === gym.id ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press ${
                    selectedGymId === gym.id
                      ? 'text-black font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {gym.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Period Selection & Month Stepper Bar */}
      <div className="flex flex-col gap-3 ds-card p-4 shadow-xs">
        {/* Mode Switcher: Monthly Comp vs Wall Set */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-carbon border border-white/[0.08] rounded-full w-full">
          <button
            type="button"
            onClick={() => setSelectedPeriod(currentMonth.key)}
            className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 active-press ${
              selectedPeriod !== 'active_set'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly Comp</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('active_set')}
            className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 active-press ${
              selectedPeriod === 'active_set'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Wall Set</span>
          </button>
        </div>

        {/* If Monthly Mode: Stepper and Month Dropdown */}
        {selectedPeriod !== 'active_set' ? (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/[0.06]">
            {/* Stepper Buttons & Dropdown */}
            <div className="flex items-center gap-1 bg-carbon border border-white/[0.08] rounded-full p-1 max-w-full">
              <button
                type="button"
                onClick={() => {
                  if (currentMonthIndex !== -1 && currentMonthIndex < availableMonths.length - 1) {
                    setSelectedPeriod(availableMonths[currentMonthIndex + 1].key);
                  }
                }}
                disabled={currentMonthIndex >= availableMonths.length - 1}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month Dropdown Select */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-xs font-bold tabular-nums text-white py-1 px-2 focus:outline-none cursor-pointer truncate max-w-[160px] sm:max-w-none"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key} className="bg-surface text-white">
                    {m.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (currentMonthIndex > 0) {
                    setSelectedPeriod(availableMonths[currentMonthIndex - 1].key);
                  }
                }}
                disabled={currentMonthIndex <= 0}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Status Text */}
            {monthInfo?.isCurrent ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 shrink-0 tabular-nums">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Live • {monthInfo.daysRemaining ?? 0}d left</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-300 shrink-0">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Finalized</span>
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-2 border-t border-white/[0.06]">
            <span>Points from all problems on active walls</span>
            <span className="tabular-nums font-bold text-slate-200">{activeBouldersCount} active</span>
          </div>
        )}
      </div>

      {/* Hall of Fame Drawer */}
      {showHallOfFame && (
        <div className="ds-card border-amber-400/30 p-4 sm:p-5 flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Monthly Comp Hall of Fame
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowHallOfFame(false)}
              className="text-xs text-slate-300 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {hallOfFame.map((entry) => {
              const isSelected = selectedPeriod === entry.month.key;

              return (
                <div
                  key={entry.month.key}
                  onClick={() => {
                    setSelectedPeriod(entry.month.key);
                    setShowHallOfFame(false);
                  }}
                  className={`p-3.5 rounded-lg border flex flex-col gap-2 cursor-pointer transition-all hover:border-white/[0.2] ${
                    isSelected
                      ? 'bg-surface-high border-amber-400'
                      : 'bg-carbon border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {entry.month.label}
                    </span>
                    <span className={`text-[11px] font-semibold ${entry.month.isCurrent ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {entry.month.isCurrent ? 'Live' : 'Final'}
                    </span>
                  </div>

                  {entry.champion ? (
                    <div className="flex items-center gap-2.5 mt-1">
                      <div className="relative shrink-0">
                        <ClimberAvatar profile={entry.champion.climber} size="sm" />
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-surface-high border border-amber-400/50">
                          <Crown className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white truncate block">
                          {entry.champion.climber.display_name}
                        </span>
                        <span className="text-[11px] tabular-nums text-amber-300 font-bold">
                          {entry.champion.totalPoints.toLocaleString()} pts • {entry.champion.topsCount} tops
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 py-2">
                      No sends recorded
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Scoring Rules Card */}
      {showRules && (
        <div className="ds-card p-4 sm:p-5 flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: activeColor }} />
              <h3 className="text-sm font-bold text-white">How Gym Comp Scoring Works</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowRules(false)}
              className="text-xs text-slate-300 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="p-3 bg-surface-elevated rounded-lg border border-white/[0.07] flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1" style={{ color: activeColor }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Base Points by Grade
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Send any active problem to claim its grade value: VB (50), V0 (100), V1 (200), V2 (300)... up to V10+ (1200 pts).
              </p>
            </div>

            <div className="p-3 bg-surface-elevated rounded-lg border border-white/[0.07] flex flex-col gap-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" /> +25% Flash Bonus
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Send a climb on your very first try to earn an extra +25% bonus points on top of the base grade value.
              </p>
            </div>

            <div className="p-3 bg-surface-elevated rounded-lg border border-white/[0.07] flex flex-col gap-1">
              <span className="font-bold text-sky-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Monthly Comps &amp; Archive
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Monthly comps reset on the 1st of every month. Past winners are preserved in the Hall of Fame.
              </p>
            </div>
          </div>

          {/* Point Scale Table Preview */}
          <div className="mt-1 pt-3 border-t border-white/[0.06]">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Grade Point Scale
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 text-center font-mono tabular-nums">
              {Object.entries(GRADE_BASE_POINTS).map(([grade, pts]) => (
                <div key={grade} className="p-1.5 bg-surface-elevated rounded-lg border border-white/[0.07]">
                  <span className="block text-[11px] font-black text-white">{grade}</span>
                  <span className="block text-[10px] text-amber-400 font-bold">{pts}</span>
                  <span className="block text-[9px] text-emerald-400">+{Math.round(pts * FLASH_BONUS_MULTIPLIER)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* The Podium: Top 3 Climbers */}
      {standings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end pt-2">
          {/* 2nd Place (Silver) */}
          {secondPlace && (
            <div className="order-2 sm:order-1 ds-card p-4 flex flex-col items-center text-center gap-3 hover:border-white/[0.16] transition-all">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-surface-higher border border-white/30 text-slate-100 flex items-center justify-center font-mono tabular-nums font-black text-xs absolute -top-1.5 -left-1.5 shadow-md">
                  2
                </div>
                <ClimberAvatar profile={secondPlace.climber} size="lg" showBorderRing />
              </div>

              <span className="text-sm font-bold text-white truncate max-w-full">
                {secondPlace.climber.display_name}
              </span>

              <div className="w-full bg-surface-elevated rounded-lg p-3 flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-slate-100 leading-none">
                  {secondPlace.totalPoints.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 font-medium mt-1">pts</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 w-full text-xs">
                <div className="bg-surface-elevated/70 rounded-lg py-1.5 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Tops</span>
                  <strong className="text-white font-mono tabular-nums font-bold">{secondPlace.topsCount}</strong>
                </div>
                <div className="bg-surface-elevated/70 rounded-lg py-1.5 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Flashes</span>
                  <strong className="text-emerald-400 font-mono tabular-nums font-bold">{secondPlace.flashesCount}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {firstPlace && (
            <div className="order-1 sm:order-2 bg-surface border-2 border-amber-400/70 rounded-3xl p-4 sm:p-5 flex flex-col items-center text-center gap-3 hover:border-amber-400 transition-all">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm absolute -top-2 -left-2">
                  <Crown className="w-4 h-4 fill-slate-950" />
                </div>
                <ClimberAvatar profile={firstPlace.climber} size="xl" showBorderRing />
              </div>

              <span className="text-base font-black text-amber-300 truncate max-w-full">
                {firstPlace.climber.display_name}
              </span>

              <div className="w-full bg-amber-500/15 border border-amber-400/35 rounded-lg p-3.5 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-300 leading-none">
                  {firstPlace.totalPoints.toLocaleString()}
                </span>
                <span className="text-[11px] text-amber-200 font-semibold mt-1">pts</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 w-full text-xs">
                <div className="bg-surface-elevated rounded-lg py-1.5 px-1 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Tops</span>
                  <strong className="text-white font-mono tabular-nums font-bold">{firstPlace.topsCount}</strong>
                </div>
                <div className="bg-surface-elevated rounded-lg py-1.5 px-1 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Flashes</span>
                  <strong className="text-emerald-400 font-mono tabular-nums font-bold">{firstPlace.flashesCount}</strong>
                </div>
                <div className="bg-surface-elevated rounded-lg py-1.5 px-1 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Top Grade</span>
                  <strong className="text-rose-400 font-mono tabular-nums font-bold">{firstPlace.hardestSend || '—'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {thirdPlace && (
            <div className="order-3 sm:order-3 ds-card border-amber-700/40 p-4 flex flex-col items-center text-center gap-3 hover:border-amber-600/60 transition-all">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-amber-800 border border-amber-500 text-amber-100 flex items-center justify-center font-mono tabular-nums font-black text-xs absolute -top-1.5 -left-1.5">
                  3
                </div>
                <ClimberAvatar profile={thirdPlace.climber} size="lg" showBorderRing />
              </div>

              <span className="text-sm font-bold text-white truncate max-w-full">
                {thirdPlace.climber.display_name}
              </span>

              <div className="w-full bg-surface-elevated rounded-lg p-3 flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-amber-200 leading-none">
                  {thirdPlace.totalPoints.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 font-medium mt-1">pts</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 w-full text-xs">
                <div className="bg-surface-elevated/70 rounded-lg py-1.5 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Tops</span>
                  <strong className="text-white font-mono tabular-nums font-bold">{thirdPlace.topsCount}</strong>
                </div>
                <div className="bg-surface-elevated/70 rounded-lg py-1.5 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Flashes</span>
                  <strong className="text-emerald-400 font-mono tabular-nums font-bold">{thirdPlace.flashesCount}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Standings List & Scorecards */}
      <div className="ds-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4" style={{ color: activeColor }} />
            <h3 className="text-sm font-bold text-white">Standings</h3>
          </div>
          <span className="text-xs text-slate-400 tabular-nums">
            {standings.length} Climbers
          </span>
        </div>

        {/* Climbers List with Expandable Scorecards */}
        <div className="flex flex-col gap-2.5">
          {standings.map((standing) => {
            const isExpanded = expandedClimberId === standing.climber.id;
            const isMe = standing.climber.id === currentUserId;

            return (
              <div
                key={standing.climber.id}
                style={isMe ? {
                  borderColor: `${activeColor}80`
                } : undefined}
                className={`comp-card-deferred border rounded-lg transition-all overflow-hidden ${
                  isMe
                    ? 'bg-surface-elevated shadow-sm'
                    : 'border-white/[0.08] bg-carbon/60 hover:border-white/[0.16]'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpandClimber(standing.climber.id)}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-surface-high/40 transition-colors"
                >
                  {/* Left: Rank & Climber Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono tabular-nums text-xs font-black shrink-0 ${
                        standing.rank === 1
                          ? 'bg-amber-400 text-black'
                          : standing.rank === 2
                          ? 'bg-slate-300 text-black'
                          : standing.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-surface-elevated text-slate-300 border border-white/[0.1]'
                      }`}
                    >
                      {standing.rank}
                    </span>

                    <ClimberAvatar profile={standing.climber} size="md" />

                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-white truncate block">
                        {standing.climber.display_name}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums block">
                        {standing.topsCount} tops • {standing.flashesCount} flashes
                        {standing.hardestSend ? ` • Top ${standing.hardestSend}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Right: Total Points & Expand Toggle */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right tabular-nums">
                      <div
                        className="text-base sm:text-lg font-black font-mono leading-none"
                        style={isMe ? { color: activeColor } : { color: '#ffffff' }}
                      >
                        {standing.totalPoints.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {standing.basePoints.toLocaleString()} + {standing.flashBonusPoints.toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-surface-high"
                      title={isExpanded ? 'Collapse scorecard' : 'View scorecard'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Scorecard: Topped Boulders Breakdown */}
                {isExpanded && (
                  <div className="p-3.5 sm:p-4 bg-carbon/80 border-t border-white/[0.08] flex flex-col gap-3 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="font-bold text-slate-200">
                        {isMonthly
                          ? `Topped in ${monthInfo?.label || 'Month'} (${standing.toppedBoulders.length})`
                          : `Active Boulders Topped (${standing.toppedBoulders.length})`}
                      </span>

                      <span className="text-xs text-slate-400">
                        {isMonthly ? 'Score' : 'Completion'}:{' '}
                        <strong className="font-bold text-white">
                          {isMonthly ? `${standing.totalPoints.toLocaleString()} pts` : `${standing.completionPercentage}%`}
                        </strong>
                      </span>
                    </div>

                    {standing.toppedBoulders.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        {isMonthly
                          ? `No climbs topped during ${monthInfo?.label || 'this month'}.`
                          : 'No active boulders topped yet in this gym.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {standing.toppedBoulders.map((item) => (
                          <div
                            key={item.boulder.id}
                            onClick={() => onSelectBoulder && onSelectBoulder(item.boulder)}
                            className={`p-2 rounded-md bg-surface border border-white/[0.08] flex items-center justify-between gap-2 text-xs transition-colors ${
                              onSelectBoulder ? 'hover:border-white/[0.16] cursor-pointer' : ''
                            }`}
                          >
                            <HoldBadge
                              color={item.boulder.hold_colour}
                              grade={item.grade}
                              isComp={item.boulder.is_comp}
                              compNumber={item.boulder.comp_number}
                              size="sm"
                            />

                            <div className="flex items-center gap-2 shrink-0 tabular-nums">
                              {item.isFlash ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5 fill-emerald-400" /> Flash
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  {item.attemptsCount} {item.attemptsCount === 1 ? 'try' : 'tries'}
                                </span>
                              )}
                              <span className="font-bold text-slate-100 text-xs">
                                +{item.totalPoints} pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
