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

  const { standings, activeBouldersCount, gymName } = leaderboardData;

  const topThree = standings.slice(0, 3);
  const currentUserStanding = standings.find((s) => s.climber.id === currentUserId);

  if (activeBouldersCount === 0 || standings.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all shadow-md">
      {/* Top Main Bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
        {/* Left: Trophy & Gym Title */}
        <div
          onClick={onOpenFullLeaderboard}
          className="flex items-center gap-3 min-w-0 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0 shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform">
            <Trophy className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-amber-300 tracking-tight flex items-center gap-1 group-hover:text-amber-200 transition-colors">
                <span>{gym?.name || 'Gym'} Comp Standings</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-400/20 text-amber-400 font-mono font-bold rounded-md border border-amber-400/30">
                ACTIVE
              </span>
            </div>

            {/* Quick text summary for mobile */}
            <div className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-2">
              {topThree[0] && (
                <span className="truncate">
                  <span className="text-amber-400 font-bold mr-1">#1</span>
                  <strong className="text-white font-bold">{topThree[0].climber.display_name}</strong> ({topThree[0].totalPoints.toLocaleString()} pts)
                </span>
              )}
              {currentUserStanding && (
                <span className="text-slate-400 hidden sm:inline">
                  • You: <strong className="text-amber-400">#{currentUserStanding.rank}</strong> ({currentUserStanding.totalPoints.toLocaleString()} pts)
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
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-black active-press shadow-sm transition-all"
          >
            <span>Leaderboard</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Expanded Podium Mini-View */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 pt-0 border-t border-amber-500/20 mt-1 bg-slate-950/50 flex flex-col gap-3 animate-in slide-in-from-top-1 duration-150">
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
              Scored on {activeBouldersCount} active climbs
            </span>
            <button
              type="button"
              onClick={onOpenFullLeaderboard}
              className="text-amber-400 hover:underline font-bold flex items-center gap-1"
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
