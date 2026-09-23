import React, { useState, useMemo } from 'react';
import { GymArea, Boulder, Attempt, Profile } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { HoldSwatch } from './HoldSwatch';
import { computeCompWallStandings, computeCompWallScorecard } from '../../lib/compWallScoring';
import { Trophy, ChevronDown, ChevronUp, Zap, Check, Clock, Plus, Award } from 'lucide-react';

interface CompWallBannerProps {
  area: GymArea;
  compBoulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  currentUserId?: string;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
  onOpenDetails: (boulder: Boulder) => void;
}

export const CompWallBanner: React.FC<CompWallBannerProps> = ({
  area,
  compBoulders,
  attempts,
  climbers,
  currentUserId,
  onQuickLog,
  onOpenDetails
}) => {
  const [isMatrixOpen, setIsMatrixOpen] = useState<boolean>(false);

  const activeCompBoulders = useMemo(() => {
    return compBoulders
      .filter((b) => !b.is_archived)
      .sort((a, b) => {
        const numA = a.comp_number ?? Math.round(a.position_order);
        const numB = b.comp_number ?? Math.round(b.position_order);
        return numA - numB;
      });
  }, [compBoulders]);

  const standings = useMemo(() => {
    return computeCompWallStandings(activeCompBoulders, attempts, climbers);
  }, [activeCompBoulders, attempts, climbers]);

  const scorecard = useMemo(() => {
    return computeCompWallScorecard(activeCompBoulders, attempts);
  }, [activeCompBoulders, attempts]);

  const activeUser = climbers.find((c) => c.id === currentUserId);
  const activeColor = activeUser?.accent_color || '#F59E0B';

  if (activeCompBoulders.length === 0) {
    return null;
  }

  const leader = standings[0];
  const hasAnySends = leader && leader.totalPoints > 0;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div
      style={{
        borderColor: `${activeColor}40`,
        boxShadow: `0 4px 20px -2px ${activeColor}15`
      }}
      className="bg-slate-900/90 border rounded-2xl overflow-hidden transition-all shadow-md"
    >
      {/* Top Banner Header */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{ backgroundColor: activeColor }}
            className="w-9 h-9 rounded-xl text-black flex items-center justify-center font-black shrink-0 shadow-md"
          >
            <Trophy className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white tracking-tight font-heading flex items-center gap-1.5">
                <span>{area.name} Comp</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 font-mono font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                10 / 7 / 4 festival pts
              </span>
            </div>

            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 truncate">
              <span>{activeCompBoulders.length} problems (#1–#{activeCompBoulders.length})</span>
              {hasAnySends && leader && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="truncate text-slate-300">
                    <strong className="text-amber-400">{leader.climber.display_name}</strong> leading with {leader.totalPoints} pts
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scorecard Matrix Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMatrixOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold active-press transition-colors shrink-0 shadow-xs"
        >
          <span>Matrix</span>
          {isMatrixOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
      </div>

      {/* Podium Grid */}
      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 border-t border-slate-800/80 pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {standings.map((standing) => {
            const isMe = standing.climber.id === currentUserId;
            const climberColor = standing.climber.accent_color || activeColor;

            return (
              <div
                key={standing.climber.id}
                className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                  isMe
                    ? 'bg-slate-850/90 border-amber-500/40 shadow-xs'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs shrink-0 select-none">
                      {getRankBadge(standing.rank)}
                    </span>
                    <ClimberAvatar profile={standing.climber} size="xs" />
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {standing.climber.display_name}
                    </span>
                  </div>
                  {isMe && (
                    <span
                      style={{ color: climberColor }}
                      className="text-[9px] font-mono font-bold uppercase shrink-0"
                    >
                      You
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="font-mono text-base font-black text-amber-300 tabular-nums">
                    {standing.totalPoints}{' '}
                    <span className="text-[10px] font-sans font-normal text-slate-400">pts</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {standing.topsCount}T • {standing.flashesCount}F
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Scorecard Matrix Grid */}
      {isMatrixOpen && (
        <div className="border-t border-slate-800 bg-slate-950/80 p-3 sm:p-4 flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Full Problem Scorecard Matrix</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Tap cell to log for crew
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3 font-semibold text-slate-300">#</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-300">Hold</th>
                  {climbers.map((climber) => (
                    <th key={climber.id} className="py-2.5 px-3 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <ClimberAvatar profile={climber} size="xs" />
                        <span className="truncate max-w-[65px] hidden sm:inline">
                          {climber.display_name}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {scorecard.map((item) => {
                  return (
                    <tr
                      key={item.boulder.id}
                      className="hover:bg-slate-900/50 transition-colors"
                    >
                      {/* Comp Number */}
                      <td className="py-2 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        #{item.compNumber}
                      </td>

                      {/* Hold Colour */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <HoldSwatch color={item.boulder.hold_colour} size="sm" />
                          <span className="text-slate-300 text-xs font-medium">
                            {item.boulder.hold_colour}
                          </span>
                        </div>
                      </td>

                      {/* Climber Attempts */}
                      {climbers.map((climber) => {
                        const att = item.userAttempts[climber.id];
                        const isFlash = att?.status === 'flashed';
                        const isSent = att?.status === 'sent';
                        const isProj = att?.status === 'attempted';

                        return (
                          <td
                            key={climber.id}
                            onClick={() => onQuickLog(item.boulder, climber.id)}
                            className="py-2 px-2 text-center cursor-pointer hover:bg-slate-800/60 transition-colors"
                            title={`Log attempt on #${item.compNumber} for ${climber.display_name}`}
                          >
                            {isFlash ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Zap className="w-2.5 h-2.5 fill-current" />
                                <span>10</span>
                              </span>
                            ) : isSent ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>{att.points}</span>
                              </span>
                            ) : isProj ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{att.attemptCount}t</span>
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-[11px]">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* View Details */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenDetails(item.boulder)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
