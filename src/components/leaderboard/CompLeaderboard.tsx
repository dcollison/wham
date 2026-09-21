import React, { useState, useMemo } from 'react';
import { Boulder, Attempt, Profile, Gym, HOLD_COLORS } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { useAuth } from '../../context/AuthContext';
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
  Info,
  Sparkles,
  Flame,
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
  initialGymId?: string;
  initialMonthKey?: string;
  currentUserId?: string;
  onSelectBoulder?: (boulder: Boulder) => void;
  showGymSelector?: boolean;
}

export const CompLeaderboard: React.FC<CompLeaderboardProps> = ({
  boulders,
  attempts,
  climbers,
  gyms,
  initialGymId = 'all',
  initialMonthKey,
  currentUserId,
  onSelectBoulder,
  showGymSelector = true
}) => {
  const currentMonth = useMemo(() => getCurrentCompMonth(), []);
  const availableMonths = useMemo(() => getAvailableCompMonths(attempts), [attempts]);

  const [selectedGymId, setSelectedGymId] = useState<string>(initialGymId);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => initialMonthKey || currentMonth.key);
  const [expandedClimberId, setExpandedClimberId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showHallOfFame, setShowHallOfFame] = useState<boolean>(false);

  const { currentUser } = useAuth();
  const activeUser = climbers.find((c) => c.id === currentUserId) || currentUser;
  const activeColor = currentUser?.accent_color || activeUser?.accent_color || '#3B82F6';

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

  const { standings, activeBouldersCount, totalPossiblePoints, totalBasePoints, gymName, monthInfo, isMonthly } =
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white font-heading">
              {gymName} Comp Leaderboard
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isMonthly
              ? `Points scored during ${monthInfo?.label || 'this month'} (${activeBouldersCount} climbs scored)`
              : `Real-time points scored on active wall set (${activeBouldersCount} active boulders)`}
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              showHallOfFame
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              showRules
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Rules</span>
          </button>

          {showGymSelector && (
            <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedGymId('all')}
                style={selectedGymId === 'all' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
                  selectedGymId === 'all'
                    ? 'text-black shadow-md font-black'
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
                    selectedGymId === gym.id
                      ? 'text-black shadow-md font-black'
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-3 shadow-sm">
        {/* Mode Switcher: Monthly Comp vs Wall Set */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedPeriod(currentMonth.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedPeriod !== 'active_set'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly Comp</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('active_set')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedPeriod === 'active_set'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Wall Set</span>
          </button>
        </div>

        {/* If Monthly Mode: Stepper and Month Dropdown */}
        {selectedPeriod !== 'active_set' && (
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Stepper Buttons */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  if (currentMonthIndex !== -1 && currentMonthIndex < availableMonths.length - 1) {
                    setSelectedPeriod(availableMonths[currentMonthIndex + 1].key);
                  }
                }}
                disabled={currentMonthIndex >= availableMonths.length - 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month Dropdown Select */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-xs font-bold font-mono text-white py-1 px-2 focus:outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key} className="bg-slate-900 text-white">
                    {m.label} {m.isCurrent ? '● LIVE' : ''}
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Status Pill */}
            {monthInfo?.isCurrent ? (
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE • {monthInfo.daysRemaining ?? 0}d left</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>FINALIZED</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hall of Fame Drawer */}
      {showHallOfFame && (
        <div className="bg-slate-900/95 border border-amber-400/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white font-heading">
                Monthly Comp Hall of Fame
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowHallOfFame(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
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
                  className={`p-3.5 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-400 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      {entry.month.label}
                    </span>
                    {entry.month.isCurrent ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                        FINAL
                      </span>
                    )}
                  </div>

                  {entry.champion ? (
                    <div className="flex items-center gap-2.5 mt-1">
                      <div className="relative shrink-0">
                        <ClimberAvatar profile={entry.champion.climber} size="sm" />
                        <span className="absolute -bottom-1 -right-1 text-xs">👑</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white truncate block">
                          {entry.champion.climber.display_name}
                        </span>
                        <span className="text-[11px] font-mono text-amber-400 font-bold">
                          {entry.champion.totalPoints.toLocaleString()} pts • {entry.champion.topsCount} tops
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic py-2">
                      No sends recorded
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Finalized Month Champion Banner */}
      {!monthInfo?.isCurrent && isMonthly && firstPlace && firstPlace.totalPoints > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border border-amber-400/50 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0 shadow-md">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] uppercase tracking-wider font-mono text-amber-400 font-bold block">
                {monthInfo?.label} Champion
              </span>
              <span className="text-sm sm:text-base font-black text-white font-heading truncate block">
                {firstPlace.climber.display_name} won with {firstPlace.totalPoints.toLocaleString()} pts ({firstPlace.topsCount} tops)!
              </span>
            </div>
          </div>
          <span className="text-2xl shrink-0">🏆</span>
        </div>
      )}

      {/* Collapsible Scoring Rules Card */}
      {showRules && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: activeColor }} />
              <h3 className="text-sm font-bold text-white">How Gym Comp Scoring Works</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowRules(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1" style={{ color: activeColor }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Base Points by Grade
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Send any active problem to claim its grade value: VB (50), V0 (100), V1 (200), V2 (300)... up to V10+ (1200 pts).
              </p>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex flex-col gap-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" /> +25% Flash Bonus
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Send a climb on your very first try to earn an extra +25% bonus points on top of the base grade value!
              </p>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex flex-col gap-1">
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Monthly Comps & Archive
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Monthly comps automatically reset on the 1st of every month! All climbs logged during the month count, and past winners are preserved in the Hall of Fame.
              </p>
            </div>
          </div>

          {/* Point Scale Table Preview */}
          <div className="mt-1 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
              Grade Point Scale
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 text-center font-mono">
              {Object.entries(GRADE_BASE_POINTS).map(([grade, pts]) => (
                <div key={grade} className="p-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
                  <span className="block text-[11px] font-black text-white">{grade}</span>
                  <span className="block text-[10px] text-amber-400 font-bold">{pts}</span>
                  <span className="block text-[9px] text-emerald-400/90">+{Math.round(pts * FLASH_BONUS_MULTIPLIER)} flash</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* The Podium: Top 3 Climbers */}
      {standings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-4 sm:pt-6">
          {/* 2nd Place (Silver) */}
          {secondPlace && (
            <div className="order-2 sm:order-1 bg-slate-900/90 border border-slate-700/70 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center gap-2 hover:border-slate-500 transition-all shadow-md">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-400 text-slate-200 flex items-center justify-center font-black text-xs absolute -top-2 -left-2 shadow-md">
                  2
                </div>
                <ClimberAvatar profile={secondPlace.climber} size="lg" showBorderRing />
              </div>

              <div className="min-w-0 w-full">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-bold text-white truncate">
                    {secondPlace.climber.display_name}
                  </span>
                  {secondPlace.climber.id === currentUserId && (
                    <span
                      style={{ backgroundColor: activeColor, color: '#000000' }}
                      className="text-[10px] px-1.5 py-0.2 font-bold rounded-full"
                    >
                      YOU
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">Silver Medal</span>
              </div>

              <div className="w-full bg-slate-800/60 rounded-xl p-2.5 flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-100">
                  {secondPlace.totalPoints.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider">COMP POINTS</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 w-full text-xs font-mono">
                <div className="bg-slate-800/40 rounded-lg py-1 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Tops</span>
                  <strong className="text-white font-bold">{secondPlace.topsCount}</strong>
                </div>
                <div className="bg-slate-800/40 rounded-lg py-1 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Flashes</span>
                  <strong className="text-emerald-400 font-bold">{secondPlace.flashesCount}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {firstPlace && (
            <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border-2 border-amber-400/70 rounded-2xl p-5 sm:p-6 flex flex-col items-center text-center gap-2.5 hover:border-amber-400 transition-all shadow-xl shadow-amber-400/10 sm:-translate-y-2">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm absolute -top-3 -left-3 shadow-lg shadow-amber-400/30">
                  <Crown className="w-4 h-4 fill-slate-950" />
                </div>
                <ClimberAvatar profile={firstPlace.climber} size="xl" showBorderRing />
              </div>

              <div className="min-w-0 w-full">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-base font-black text-amber-300 truncate">
                    {firstPlace.climber.display_name}
                  </span>
                  {firstPlace.climber.id === currentUserId && (
                    <span
                      style={{ backgroundColor: activeColor, color: '#000000' }}
                      className="text-[10px] px-1.5 py-0.2 font-bold rounded-full"
                    >
                      YOU
                    </span>
                  )}
                </div>
                <span className="text-xs text-amber-400/90 font-mono font-bold flex items-center justify-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gym Champion</span>
                </span>
              </div>

              <div className="w-full bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                  {firstPlace.totalPoints.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-amber-300/80 font-black tracking-wider">COMP POINTS</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 w-full text-xs font-mono">
                <div className="bg-slate-800/80 rounded-lg py-1 px-1 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Tops</span>
                  <strong className="text-white font-bold">{firstPlace.topsCount}</strong>
                </div>
                <div className="bg-slate-800/80 rounded-lg py-1 px-1 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Flashes</span>
                  <strong className="text-emerald-400 font-bold">{firstPlace.flashesCount}</strong>
                </div>
                <div className="bg-slate-800/80 rounded-lg py-1 px-1 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Top Grade</span>
                  <strong className="text-rose-400 font-bold">{firstPlace.hardestSend || '—'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {thirdPlace && (
            <div className="order-3 sm:order-3 bg-slate-900/90 border border-amber-900/60 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center gap-2 hover:border-amber-800 transition-all shadow-md">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-amber-800 border-2 border-amber-600 text-amber-100 flex items-center justify-center font-black text-xs absolute -top-2 -left-2 shadow-md">
                  3
                </div>
                <ClimberAvatar profile={thirdPlace.climber} size="lg" showBorderRing />
              </div>

              <div className="min-w-0 w-full">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-bold text-white truncate">
                    {thirdPlace.climber.display_name}
                  </span>
                  {thirdPlace.climber.id === currentUserId && (
                    <span
                      style={{ backgroundColor: activeColor, color: '#000000' }}
                      className="text-[10px] px-1.5 py-0.2 font-bold rounded-full"
                    >
                      YOU
                    </span>
                  )}
                </div>
                <span className="text-xs text-amber-600/90 font-mono">Bronze Medal</span>
              </div>

              <div className="w-full bg-slate-800/60 rounded-xl p-2.5 flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-200">
                  {thirdPlace.totalPoints.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider">COMP POINTS</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 w-full text-xs font-mono">
                <div className="bg-slate-800/40 rounded-lg py-1 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Tops</span>
                  <strong className="text-white font-bold">{thirdPlace.topsCount}</strong>
                </div>
                <div className="bg-slate-800/40 rounded-lg py-1 px-1.5 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">Flashes</span>
                  <strong className="text-emerald-400 font-bold">{thirdPlace.flashesCount}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Standings List & Scorecards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4" style={{ color: activeColor }} />
            <h3 className="text-sm font-bold text-white">Full Leaderboard Standings</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {standings.length} Climbers Ranked
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
                  borderColor: `${activeColor}80`,
                  boxShadow: `0 0 0 1px ${activeColor}40`
                } : undefined}
                className={`border rounded-xl transition-all overflow-hidden ${
                  isMe
                    ? 'bg-slate-850/90 shadow-sm'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpandClimber(standing.climber.id)}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
                >
                  {/* Left: Rank & Climber Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                        standing.rank === 1
                          ? 'bg-amber-400 text-black shadow-sm shadow-amber-400/30'
                          : standing.rank === 2
                          ? 'bg-slate-300 text-black'
                          : standing.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {standing.rank}
                    </span>

                    <ClimberAvatar profile={standing.climber} size="md" />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {standing.climber.display_name}
                        </span>
                        {isMe && (
                          <span
                            style={{ backgroundColor: activeColor, color: '#000000' }}
                            className="text-[9px] px-1.5 py-0.2 font-extrabold rounded-full"
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {standing.topsCount} tops • {standing.flashesCount} flashes
                        {standing.hardestSend ? ` • Top ${standing.hardestSend}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Right: Total Points & Expand Toggle */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className="text-base sm:text-lg font-black font-mono leading-none"
                        style={isMe ? { color: activeColor } : { color: '#ffffff' }}
                      >
                        {standing.totalPoints.toLocaleString()}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        {standing.basePoints.toLocaleString()} + {standing.flashBonusPoints.toLocaleString()} flash
                      </div>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
                  <div className="p-3.5 sm:p-4 bg-slate-950/70 border-t border-slate-800/80 flex flex-col gap-3 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span>
                          {isMonthly
                            ? `Scorecard: Climbs Topped in ${monthInfo?.label || 'Month'}`
                            : 'Scorecard: Active Boulders Topped'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-mono text-slate-400">
                          {standing.toppedBoulders.length} sent
                        </span>
                      </span>

                      <span className="text-xs font-mono text-slate-400">
                        {isMonthly ? 'Month Score' : 'Gym Completion'}:{' '}
                        <strong className="font-bold text-white">
                          {isMonthly ? `${standing.totalPoints.toLocaleString()} pts` : `${standing.completionPercentage}%`}
                        </strong>
                      </span>
                    </div>

                    {standing.toppedBoulders.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500 font-mono">
                        {isMonthly
                          ? `No climbs topped during ${monthInfo?.label || 'this month'}.`
                          : 'No active boulders topped yet in this gym.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {standing.toppedBoulders.map((item) => {
                          const colorCfg = HOLD_COLORS[item.boulder.hold_colour] || {
                            bgClass: 'bg-slate-700',
                            textClass: 'text-white',
                            borderClass: 'border-slate-600',
                            hex: '#94A3B8'
                          };

                          return (
                            <div
                              key={item.boulder.id}
                              onClick={() => onSelectBoulder && onSelectBoulder(item.boulder)}
                              className={`p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2 text-xs transition-colors ${
                                onSelectBoulder ? 'hover:border-slate-700 cursor-pointer' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-black text-[11px] border shrink-0 ${
                                    item.boulder.hold_colour.toLowerCase() === 'bee'
                                      ? 'text-white border-yellow-400'
                                      : `${colorCfg.bgClass} ${colorCfg.textClass} ${colorCfg.borderClass}`
                                  }`}
                                  style={
                                     item.boulder.hold_colour.toLowerCase() === 'bee'
                                       ? {
                                           background: 'linear-gradient(135deg, #DDA82B 0%, #DDA82B 50%, #27272A 50%, #27272A 100%)',
                                           textShadow: '0 1px 2px rgba(0,0,0,0.9)'
                                         }
                                       : undefined
                                  }
                                >
                                  {item.grade}
                                </span>
                                <span className="text-slate-200 font-medium truncate text-xs">
                                  {item.boulder.hold_colour}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 font-mono">
                                {item.isFlash ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-0.5">
                                    <Zap className="w-2.5 h-2.5 fill-emerald-400" /> Flash
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">
                                    {item.attemptsCount} {item.attemptsCount === 1 ? 'try' : 'tries'}
                                  </span>
                                )}
                                <span className="font-bold text-slate-200 text-xs">
                                  +{item.totalPoints} pts
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
