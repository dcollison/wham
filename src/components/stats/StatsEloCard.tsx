import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Zap,
  CheckCircle2,
  Clock,
  Globe,
  ChevronDown,
  ChevronUp,
  Activity,
  Award,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Flame,
  Target
} from 'lucide-react';
import { Boulder, Attempt, Profile, getClimberColor } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { HoldBadge } from '../boulders/HoldBadge';
import {
  computeClimberRating,
  computeCrewRatings,
  WORLD_BENCHMARKS,
  ClimberRating,
  ScorecardSendItem
} from '../../lib/ratingEngine';

interface StatsEloCardProps {
  viewMode: 'my' | 'group';
  selectedClimberId: string;
  onSelectClimberId: (id: string) => void;
  onSetViewMode: (mode: 'my' | 'group') => void;
  climbers: Profile[];
  currentUserId?: string;
  activeColor: string;
  attempts: Attempt[];
  boulders: Boulder[];
  onSelectBoulder?: (boulder: Boulder) => void;
}

export const StatsEloCard: React.FC<StatsEloCardProps> = ({
  viewMode,
  selectedClimberId,
  onSelectClimberId,
  onSetViewMode,
  climbers,
  currentUserId,
  activeColor,
  attempts,
  boulders,
  onSelectBoulder
}) => {
  const [showScorecard, setShowScorecard] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Compute all crew ratings
  const crewRatings = useMemo(() => {
    return computeCrewRatings(climbers, attempts, boulders);
  }, [climbers, attempts, boulders]);

  // Active individual rating
  const targetId = selectedClimberId || currentUserId || climbers[0]?.id;
  const activeRating = useMemo(() => {
    const found = crewRatings.find((r) => r.userId === targetId);
    if (found) return found;
    const climber = climbers.find((c) => c.id === targetId);
    return computeClimberRating(targetId, attempts, boulders, climber);
  }, [crewRatings, targetId, attempts, boulders, climbers]);

  const activeClimber = climbers.find((c) => c.id === targetId) || climbers[0];

  const getFormBadge = (status: ClimberRating['formStatus'], sendsCount: number) => {
    switch (status) {
      case 'peak':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Peak Form ({sendsCount}/10)
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Active Form ({sendsCount}/10)
          </span>
        );
      case 'calibrating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Calibrating ({sendsCount}/10)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Dormant (0/10)
          </span>
        );
    }
  };

  return (
    <div className="bg-surface border border-white/[0.08] rounded-3xl p-5 shadow-xs flex flex-col gap-5">
      {/* CARD HEADER */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: `${activeColor}15`,
              borderColor: `${activeColor}30`,
              color: activeColor
            }}
          >
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                {viewMode === 'group' ? 'Crew Elo Standings' : 'Active Elo & Performance'}
              </h3>
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-slate-400 hover:text-white transition-colors"
                title="How is this rating calculated?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              60-day tournament-style rolling scorecard (Top 10 sends)
            </p>
          </div>
        </div>

        {/* Mode or Form Indicator */}
        <div className="flex items-center gap-2 self-start">
          {viewMode === 'my' && getFormBadge(activeRating.formStatus, activeRating.sendsCount)}
        </div>
      </div>

      {/* EXPLANATION ACCORDION */}
      {showExplanation && (
        <div className="bg-slate-900/90 border border-white/[0.08] rounded-2xl p-3.5 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>How Wham Elo Works</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>No Project Penalty</strong>: Trying hard boulders and falling never lowers your rating. Only your sends count.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>Top 10 in 60 Days</strong>: Your score is the weighted average of your best 10 sends over the last 60 days, rewarding flashes (⚡ +40) and quick sends.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>Global Percentile</strong>: Calibrated against worldwide gym community data. The median regular gym climber is ~1,350 Elo (V3).
          </p>
        </div>
      )}

      {/* VIEW MODE 1: INDIVIDUAL CLIMBER VIEW */}
      {viewMode === 'my' ? (
        <div className="space-y-5">
          {/* Main Elo Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/[0.05]">
            <div className="flex items-center gap-3.5">
              <ClimberAvatar profile={activeClimber} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{activeClimber.display_name}</span>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${activeColor}25`, color: activeColor }}
                  >
                    {activeRating.gradeEquivalent}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-300 mt-0.5">
                  {activeRating.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {activeRating.subGradeDescription}
                </div>
              </div>
            </div>

            {/* Elo Score Metric */}
            <div className="flex sm:flex-col items-baseline sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Wham Elo</span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="font-mono text-3xl sm:text-4xl font-black tracking-tight"
                  style={{ color: activeColor }}
                >
                  {activeRating.elo.toLocaleString()}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-400">pts</span>
              </div>
              {activeRating.isProvisional && (
                <span className="text-[10px] text-amber-400 font-medium">Provisional rating</span>
              )}
            </div>
          </div>

          {/* Global Percentile Bar */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.05]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Regular Climber Percentile</span>
              </span>
              <span className="font-mono font-black text-amber-400">
                Better than {activeRating.percentile}%
              </span>
            </div>

            {/* Progress meter */}
            <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400"
                style={{ width: `${Math.min(100, Math.max(3, activeRating.percentile))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-mono">
              <span>Beginner (VB)</span>
              <span className="text-slate-400">Median V3 (50%)</span>
              <span>Advanced (V6+)</span>
            </div>
          </div>

          {/* Action Row: Toggle Top 10 Scorecard & World Benchmarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setShowScorecard(!showScorecard)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/[0.06] text-xs font-semibold text-slate-200 transition-all active-press"
            >
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Top 10 Scorecard ({activeRating.topSends.length}/10)</span>
              </div>
              {showScorecard ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowBenchmarks(!showBenchmarks)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/[0.06] text-xs font-semibold text-slate-200 transition-all active-press"
            >
              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <span>World Benchmarks Ladder</span>
              </div>
              {showBenchmarks ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {/* EXPANDABLE: TOP 10 SCORECARD */}
          {showScorecard && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-semibold">
                <span>Active 60-Day Scorecard</span>
                <span>{activeRating.totalSendsInWindow} total sends in window</span>
              </div>

              {activeRating.topSends.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-mono bg-slate-900/50 rounded-2xl border border-white/[0.05]">
                  No sends logged in the last 60 days. Bag a send at the gym to calibrate your Elo!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeRating.topSends.map((item, idx) => (
                    <div
                      key={item.attempt.id || `${item.boulder.id}-${idx}`}
                      onClick={() => onSelectBoulder && onSelectBoulder(item.boulder)}
                      className={`flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-white/[0.05] hover:border-white/[0.12] transition-all text-xs ${
                        onSelectBoulder ? 'cursor-pointer hover:bg-slate-850' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-mono font-bold text-slate-400 text-[11px]">
                          #{idx + 1}
                        </span>

                        <HoldBadge
                          color={item.holdColour}
                          grade={item.grade}
                          isComp={item.boulder.is_comp}
                          compNumber={item.boulder.comp_number}
                          size="sm"
                        />

                        {item.isFlash ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            Flash
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {item.attemptCount} tries
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-100 text-xs">
                            {item.sendElo} pts
                          </div>
                        </div>

                        {/* Expiry pill */}
                        <div
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            item.daysRemaining <= 7
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                          title={`${item.daysRemaining} days left before falling out of 60-day window`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{item.daysRemaining}d left</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty slots placeholders if fewer than 10 */}
                  {Array.from({ length: Math.max(0, 10 - activeRating.topSends.length) }).map((_, i) => {
                    const slotNum = activeRating.topSends.length + i + 1;
                    return (
                      <div
                        key={`empty-${slotNum}`}
                        className="flex items-center justify-between p-2 rounded-xl border border-dashed border-white/[0.05] text-[11px] text-slate-400 font-mono"
                      >
                        <span className="w-5 text-center">#{slotNum}</span>
                        <span>Empty Slot — send another boulder to lock in rating depth</span>
                        <span className="text-[10px]">-- pts</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EXPANDABLE: WORLD BENCHMARKS LADDER */}
          {showBenchmarks && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <div className="text-[11px] text-slate-400 px-1 font-semibold">
                Global Reference Scale (Anchored to V17 World Peak)
              </div>
              <div className="space-y-1.5">
                {WORLD_BENCHMARKS.map((bench) => {
                  const isNearClimber = Math.abs(bench.elo - activeRating.elo) < 150;
                  return (
                    <div
                      key={bench.name}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        isNearClimber
                          ? 'bg-amber-950/20 border-amber-500/30 text-white'
                          : 'bg-slate-900/60 border-white/[0.05] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md ${
                            bench.category === 'pro'
                              ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                              : bench.category === 'setter'
                              ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {bench.grade}
                        </span>
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{bench.name}</span>
                            <span className="text-[10px] font-normal text-slate-400">({bench.tag})</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{bench.title}</div>
                        </div>
                      </div>

                      <div className="font-mono font-black text-right text-xs">
                        <span className={bench.category === 'pro' ? 'text-purple-300' : 'text-slate-200'}>
                          {bench.elo.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">Elo</span>
                      </div>
                    </div>
                  );
                })}

                {/* Climber's position marker in the ladder */}
                <div
                  className="flex items-center justify-between p-2.5 rounded-xl border text-xs"
                  style={{
                    backgroundColor: `${activeColor}15`,
                    borderColor: `${activeColor}40`
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md text-black"
                      style={{ backgroundColor: activeColor }}
                    >
                      {activeRating.gradeEquivalent}
                    </span>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{activeClimber.display_name} (You)</span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          Top {Math.max(1, Math.round(100 - activeRating.percentile))}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300">{activeRating.title}</div>
                    </div>
                  </div>

                  <div className="font-mono font-black text-right text-sm" style={{ color: activeColor }}>
                    {activeRating.elo.toLocaleString()}
                    <span className="text-[10px] text-slate-400 ml-1 font-normal">Elo</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: CREW LEADERBOARD */
        <div className="space-y-3">
          <div className="text-xs text-slate-400 font-semibold px-1">
            Current 60-Day Crew Rankings & Form
          </div>

          <div className="space-y-2">
            {crewRatings.map((rating, index) => {
              const climber = rating.profile || climbers.find((c) => c.id === rating.userId);
              if (!climber) return null;
              const color = getClimberColor(climber, index);
              const isFirst = index === 0;

              return (
                <div
                  key={rating.userId}
                  onClick={() => {
                    onSetViewMode('my');
                    onSelectClimberId(rating.userId);
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer hover:bg-slate-850 active-press ${
                    isFirst
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : 'bg-slate-900/60 border-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono font-black text-sm w-5 text-center ${
                        isFirst ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      #{index + 1}
                    </span>

                    <ClimberAvatar profile={climber} size="md" />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">
                          {climber.display_name}
                        </span>
                        {isFirst && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded"
                          style={{ backgroundColor: `${color.hex}25`, color: color.hex }}
                        >
                          {rating.gradeEquivalent}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {rating.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-black text-sm text-slate-100">
                        {rating.elo.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Better than {rating.percentile}%
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      {getFormBadge(rating.formStatus, rating.sendsCount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function Crown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}
