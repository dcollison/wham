import React, { useState, useMemo } from 'react';
import { Boulder, Attempt, Profile, Gym } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { computeGymCompLeaderboard } from '../../lib/compScoring';
import { Trophy, ChevronRight, Crown, ChevronDown, ChevronUp, Zap, Sparkles } from 'lucide-react';

interface GymCompBannerProps {
  gym: Gym | null;
  gyms: Gym[];
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  currentUserId?: string;
  onOpenFullLeaderboard: () => void;
}

export const GymCompBanner: React.FC<GymCompBannerProps> = ({
  gym,
  gyms,
  boulders,
  attempts,
  climbers,
  currentUserId,
  onOpenFullLeaderboard
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem('wham_comp_banner_expanded') === 'true';
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('wham_comp_banner_expanded', String(next));
      return next;
    });
  };

  const gymId = gym?.id || 'all';

  const leaderboardData = useMemo(() => {
    return computeGymCompLeaderboard(gymId, gyms, boulders, attempts, climbers);
  }, [gymId, gyms, boulders, attempts, climbers]);

  const { standings, activeBouldersCount, gymName, monthInfo } = leaderboardData;

  const topThree = standings.slice(0, 3);
  const currentUserStanding = standings.find((s) => s.climber.id === currentUserId);
  const activeUser = climbers.find((c) => c.id === currentUserId);
  const activeColor = activeUser?.accent_color || '#3B82F6';

  if (activeBouldersCount === 0 || standings.length === 0) {
    return null;
  }

  const hasAnySends = topThree[0] && topThree[0].totalPoints > 0;

  return (
    <div
      style={{
        borderColor: `${activeColor}40`,
        boxShadow: `0 4px 20px -2px ${activeColor}15`
      }}
      className="bg-slate-900/90 border rounded-2xl overflow-hidden transition-all"
    >
      {/* Top Main Bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
        {/* Left: Trophy & Gym Title */}
        <div
          onClick={onOpenFullLeaderboard}
          className="flex items-center gap-3 min-w-0 cursor-pointer group select-none"
        >
          <div
            style={{ backgroundColor: activeColor }}
            className="w-9 h-9 rounded-xl text-black flex items-center justify-center font-black shrink-0 shadow-md group-hover:scale-105 transition-transform"
          >
            <Trophy className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1 font-heading">
                <span>{monthInfo?.shortLabel || 'Monthly'} Comp</span>
              </span>
              <span
                style={{
                  backgroundColor: `${activeColor}20`,
                  color: activeColor,
                  borderColor: `${activeColor}40`
                }}
                className="text-[10px] px-2 py-0.5 font-mono font-bold rounded-md border flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{monthInfo?.daysRemaining ?? 0}d left</span>
              </span>
            </div>

            {/* Quick text summary for mobile */}
            <div className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-2">
              {hasAnySends && topThree[0] ? (
                <span className="truncate">
                  <span className="text-amber-400 font-bold mr-1">#1</span>
                  <strong className="text-white font-bold">{topThree[0].climber.display_name}</strong> ({topThree[0].totalPoints.toLocaleString()} pts)
                </span>
              ) : (
                <span className="text-slate-400 italic">
                  Comp active • Be the first to score this month!
                </span>
              )}
              {currentUserStanding && hasAnySends && (
                <span className="text-slate-400 hidden sm:inline">
                  • You: <strong style={{ color: activeColor }}>#{currentUserStanding.rank}</strong> ({currentUserStanding.totalPoints.toLocaleString()} pts)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions: Expand Toggle & Open Full Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleExpanded}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1"
            title={isExpanded ? 'Collapse podium' : 'Expand podium'}
          >
            <span className="hidden sm:inline text-xs">
              {isExpanded ? 'Hide' : 'Podium'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenFullLeaderboard}
            style={{ backgroundColor: activeColor, color: '#000000' }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold active-press shadow-sm transition-all"
          >
            <span>Leaderboard</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Expanded Podium Mini-View */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 pt-0 border-t border-slate-800/80 mt-1 bg-slate-950/50 flex flex-col gap-3 animate-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-3 gap-2.5 text-center pt-2">
            {topThree.map((standing, index) => {
              const isGold = index === 0;
              const isSilver = index === 1;
              const isBronze = index === 2;

              return (
                <div
                  key={standing.climber.id}
                  onClick={onOpenFullLeaderboard}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                    isGold
                      ? 'bg-amber-500/15 border border-amber-400/50 shadow-sm'
                      : isSilver
                      ? 'bg-slate-800/60 border border-slate-700/60'
                      : 'bg-slate-800/40 border border-slate-800'
                  }`}
                >
                  <div className="relative">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black absolute -top-1 -left-1 ${
                        isGold
                          ? 'bg-amber-400 text-black'
                          : isSilver
                          ? 'bg-slate-300 text-black'
                          : 'bg-amber-700 text-white'
                      }`}
                    >
                      {standing.rank}
                    </span>
                    <ClimberAvatar profile={standing.climber} size="sm" />
                  </div>

                  <span className="text-xs font-bold text-white truncate max-w-full">
                    {standing.climber.display_name}
                  </span>

                  <span
                    className={`text-sm font-black font-mono leading-none ${
                      isGold ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    {standing.totalPoints.toLocaleString()}
                  </span>

                  <span className="text-[11px] font-mono text-slate-400">
                    {standing.topsCount} tops • {standing.flashesCount} flashes
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs pt-1 text-slate-400 font-mono">
            <span>
              {monthInfo?.label || 'This Month'} • {activeBouldersCount} climbs scored
            </span>
            <button
              type="button"
              onClick={onOpenFullLeaderboard}
              style={{ color: activeColor }}
              className="hover:underline font-bold flex items-center gap-1"
            >
              <span>Full Scorecards</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
