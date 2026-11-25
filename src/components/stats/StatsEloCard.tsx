import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Zap,
  CheckCircle2,
  Clock,
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  Target,
  TrendingUp,
  Milestone,
  Check,
  Crown,
  Award
} from 'lucide-react';
import { Boulder, Attempt, Profile, getClimberColor } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { HoldBadge } from '../boulders/HoldBadge';
import {
  computeClimberRating,
  computeCrewRatings,
  ClimberRating,
  ELO_DEMARCATIONS
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
  const [showExplanation, setShowExplanation] = useState(false);
  const [showDemarcations, setShowDemarcations] = useState(false);

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

  const formatPeakDate = (isoDate: string | null): string | null => {
    if (!isoDate) return null;
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
    const d = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(isoDate);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFormBadge = (status: ClimberRating['formStatus'], sendsCount: number) => {
    switch (status) {
      case 'peak':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Peak Form ({sendsCount}/15)
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Active Form ({sendsCount}/15)
          </span>
        );
      case 'calibrating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Calibrating ({sendsCount}/15)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-high text-slate-300 border border-white/[0.1] tabular-nums">
            Dormant (0/15)
          </span>
        );
    }
  };

  const renderDemarcationsTable = (mode: 'my' | 'group') => (
    <div className="p-4 rounded-lg bg-surface-elevated border border-amber-500/25 space-y-3 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <Milestone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            {mode === 'group' ? 'Crew Levels' : 'Level Demarcations'}
          </h4>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
          100-pt steps (Solid V4 = 1,450 – 1,550 pts)
        </p>
      </div>

      <div className="space-y-1.5 pt-1">
        {ELO_DEMARCATIONS.map((demarcation) => {
          if (mode === 'group') {
            // Find all crew members in this demarcation tier
            const climbersInTier = crewRatings.filter((r) => r.currentLevel.id === demarcation.id);
            const hasClimbers = climbersInTier.length > 0;

            // Check if all crew members have cleared/surpassed this tier
            const allCrewCleared = crewRatings.length > 0 && crewRatings.every((r) => r.elo >= demarcation.maxElo);

            // Find crew member closest to this tier (for tiers above the whole crew)
            const isAboveCrew = crewRatings.every((r) => r.elo < demarcation.minElo);
            const closestClimber = isAboveCrew
              ? [...crewRatings].sort((a, b) => b.elo - a.elo)[0]
              : null;
            const ptsNeeded = closestClimber ? Math.max(0, demarcation.minElo - closestClimber.elo) : 0;

            return (
              <div
                key={demarcation.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-md border transition-colors gap-2 ${
                  hasClimbers
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : allCrewCleared
                    ? 'bg-carbon/60 border-white/[0.05]'
                    : 'bg-carbon border-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-11 h-7 rounded-md font-mono tabular-nums font-bold text-xs flex items-center justify-center shrink-0 border ${
                      hasClimbers
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-surface-high text-slate-200 border-white/[0.08]'
                    }`}
                  >
                    {demarcation.shortGrade}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${hasClimbers ? 'text-amber-200' : 'text-white'}`}>
                        {demarcation.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {demarcation.tagline}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {demarcation.subGradeDescription}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-white/[0.04] flex-wrap">
                  <div className="font-mono tabular-nums text-xs font-bold text-slate-200">
                    {demarcation.minElo.toLocaleString()} –{' '}
                    {demarcation.maxElo === Infinity ? '∞' : demarcation.maxElo.toLocaleString()}{' '}
                    <span className="text-[10px] font-sans text-slate-400 font-normal">pts</span>
                  </div>

                  {hasClimbers ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {climbersInTier.map((cr) => {
                        const p = cr.profile || climbers.find((c) => c.id === cr.userId);
                        const climberIdx = climbers.findIndex((c) => c.id === cr.userId);
                        const color = p ? getClimberColor(p, climberIdx >= 0 ? climberIdx : 0) : { hex: '#f59e0b' };

                        return (
                          <button
                            key={cr.userId}
                            type="button"
                            onClick={() => {
                              onSetViewMode('my');
                              onSelectClimberId(cr.userId);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-transform active-press"
                            style={{
                              backgroundColor: `${color.hex}20`,
                              borderColor: `${color.hex}50`,
                              color: color.hex
                            }}
                            title={`View ${p?.display_name || 'climber'}'s detailed scorecard`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.hex }} />
                            <span>{p?.display_name || 'Climber'}</span>
                            <span className="font-mono tabular-nums text-slate-200">({cr.elo.toLocaleString()})</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : allCrewCleared ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      All cleared
                    </span>
                  ) : isAboveCrew && closestClimber ? (
                    <span className="tabular-nums text-[11px] font-semibold text-amber-300">
                      {closestClimber.nextLevel?.id === demarcation.id &&
                      closestClimber.depthNeededForNextLevel &&
                      closestClimber.pointsToNextLevel <= 1
                        ? `${closestClimber.depthNeededForNextLevel} ${closestClimber.depthNeededForNextLevel === 1 ? 'send' : 'sends'} to unlock`
                        : `+${ptsNeeded} pts to unlock`}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Unoccupied
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Individual Mode ('my')
          const isCurrent = activeRating.currentLevel.id === demarcation.id;
          const isPeakTier = activeRating.peakLevel?.id === demarcation.id && activeRating.peakElo !== null;
          const isAchieved = activeRating.elo >= demarcation.maxElo;
          const ptsNeeded = Math.max(0, demarcation.minElo - activeRating.elo);

          return (
            <div
              key={demarcation.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-md border transition-colors gap-2 ${
                isCurrent
                  ? 'bg-amber-950/25 border-amber-500/50'
                  : isPeakTier
                  ? 'bg-sky-950/20 border-sky-500/35'
                  : isAchieved
                  ? 'bg-carbon/60 border-white/[0.05]'
                  : 'bg-carbon border-white/[0.07]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-11 h-7 rounded-md font-mono tabular-nums font-bold text-xs flex items-center justify-center shrink-0 border ${
                    isCurrent
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : isPeakTier
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/35'
                      : 'bg-surface-high text-slate-200 border-white/[0.08]'
                  }`}
                >
                  {demarcation.shortGrade}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${isCurrent ? 'text-amber-200' : 'text-white'}`}>
                      {demarcation.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {demarcation.tagline}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {demarcation.subGradeDescription}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-white/[0.04] flex-wrap">
                <div className="font-mono tabular-nums text-xs font-bold text-slate-200">
                  {demarcation.minElo.toLocaleString()} –{' '}
                  {demarcation.maxElo === Infinity ? '∞' : demarcation.maxElo.toLocaleString()}{' '}
                  <span className="text-[10px] font-sans text-slate-400 font-normal">pts</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isPeakTier && !isCurrent && activeRating.peakElo !== null && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono tabular-nums">
                      <Award className="w-3 h-3 shrink-0" />
                      Peak ({activeRating.peakElo.toLocaleString()})
                    </span>
                  )}

                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 tabular-nums">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Current ({activeRating.elo.toLocaleString()} pts)
                    </span>
                  ) : isAchieved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      Achieved
                    </span>
                  ) : demarcation.id === activeRating.nextLevel?.id &&
                    activeRating.depthNeededForNextLevel &&
                    activeRating.pointsToNextLevel <= 1 ? (
                    <span className="tabular-nums text-[11px] font-semibold text-amber-300">
                      {activeRating.depthNeededForNextLevel} {activeRating.depthNeededForNextLevel === 1 ? 'send' : 'sends'} needed
                    </span>
                  ) : (
                    <span className="tabular-nums text-[11px] font-semibold text-amber-300">
                      +{ptsNeeded} pts needed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="ds-card p-5 flex flex-col gap-5">
      {/* CARD HEADER */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
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
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {viewMode === 'group' ? 'Crew Elo Standings' : 'Active Elo & Performance'}
              </h3>
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-slate-400 hover:text-white transition-colors"
                title="How is this rating calculated?"
                aria-label="How is this rating calculated?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              60-day tournament-style rolling scorecard (Top 15 sends)
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
        <div className="ds-well rounded-lg p-3.5 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>How Wham Elo Works</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>Level Demarcations</strong>: Elo ratings translate into calibrated bouldering levels (e.g. 1,450 – 1,550 pts = Solid V4 Climber). Every 100-pt demarcation marks a new climbing tier.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>Pyramid Depth Requirement</strong>: A climber cannot be crowned a solid climber of a grade without demonstrating consistent pyramid volume and depth (at least 3 sends at or above that level). One-off breakthrough sends reflect projecting ability but do not elevate your certified level.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>Next Level Target</strong>: Track exactly how many points you need to cross the next demarcation line. Flashes award +40 bonus Elo, and 2nd-try sends award +20.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>No Project Penalty</strong>: Trying hard boulders and falling never lowers your rating. Only your sends count.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>Top 15 in 60 Days</strong>: Your score is the weighted average of your best 15 sends over the last 60 days.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>All-Time Peak Elo</strong>: Tracks the highest rolling 60-day rating you have ever achieved across your send history (including archived sets), along with the date and tier reached—so gym resets or time off never erase your best form.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            • <strong>Regular Climber Tier</strong>: Calibrated against worldwide gym community data. The median regular gym climber is ~1,350 Elo (V3).
          </p>
        </div>
      )}

      {/* VIEW MODE 1: INDIVIDUAL CLIMBER VIEW */}
      {viewMode === 'my' ? (
        <div className="space-y-4">
          {/* Main Elo Banner */}
          <div className="rounded-lg bg-carbon border border-white/[0.07] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <ClimberAvatar profile={activeClimber} size="lg" />
                <div className="min-w-0">
                  <span className="font-bold text-white text-base block">{activeClimber.display_name}</span>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">
                    {activeRating.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {activeRating.subGradeDescription}
                  </div>
                </div>
              </div>

              {/* Elo Score Metric */}
              <div className="flex sm:flex-col items-baseline sm:items-end justify-between border-t sm:border-t-0 pt-2.5 sm:pt-0 border-white/[0.06] shrink-0">
                <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">Wham Elo</span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="font-mono tabular-nums text-3xl sm:text-4xl font-bold leading-none tracking-tight"
                    style={{ color: activeColor }}
                  >
                    {activeRating.elo.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">pts</span>
                </div>
                {activeRating.isProvisional && (
                  <span className="text-[11px] text-amber-300 font-medium mt-0.5">Provisional rating</span>
                )}
              </div>
            </div>

            {/* All-Time Peak Elo Sub-bar */}
            {activeRating.peakElo === null ? (
              <div className="px-4 py-2.5 border-t border-white/[0.06] bg-surface-elevated/40 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                  <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>All-Time Peak</span>
                </span>
                <span>No sends logged yet</span>
              </div>
            ) : (
              (() => {
                const peakDateLabel = formatPeakDate(activeRating.peakDate);
                const peakGradeLabel = activeRating.peakLevel?.shortGrade || activeRating.peakGradeEquivalent;
                return (
                  <div className="px-4 py-2.5 border-t border-white/[0.06] bg-surface-elevated/40 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                          <Award
                            className={`w-3.5 h-3.5 shrink-0 ${
                              activeRating.isAtPeak ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          />
                          <span>All-Time Peak</span>
                        </span>

                        {activeRating.isAtPeak ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Current Peak
                          </span>
                        ) : activeRating.eloDropFromPeak > 0 ? (
                          <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-400">
                            -{activeRating.eloDropFromPeak.toLocaleString()} pts from peak
                          </span>
                        ) : activeRating.sendsCount === 0 ? (
                          <span className="text-[10px] font-medium text-slate-400">
                            Inactive 60d
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-baseline gap-1 shrink-0">
                        <span
                          className={`font-mono tabular-nums text-sm font-bold ${
                            activeRating.isAtPeak ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          {activeRating.peakElo.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400">pts</span>
                        {activeRating.peakRawElo !== undefined && (
                          <span
                            className="font-mono tabular-nums text-[10px] text-amber-300/80 ml-0.5"
                            title="Uncapped tournament score at peak before pyramid depth gating"
                          >
                            (raw {activeRating.peakRawElo.toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {peakGradeLabel && (
                          <span className="font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-high text-slate-200 border border-white/[0.08]">
                            {peakGradeLabel}
                          </span>
                        )}
                        {activeRating.peakTitle && (
                          <span className="text-slate-300 font-medium truncate">
                            {activeRating.peakTitle}
                          </span>
                        )}
                        {activeRating.peakIsProvisional && (
                          <span className="text-[10px] text-amber-300/90 font-medium tabular-nums">
                            · Provisional ({activeRating.peakSendsCount}{' '}
                            {activeRating.peakSendsCount === 1 ? 'send' : 'sends'})
                          </span>
                        )}
                      </div>

                      {peakDateLabel && (
                        <span className="font-mono tabular-nums text-[10px] text-slate-400 shrink-0">
                          {peakDateLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* NEXT LEVEL PROGRESS */}
          <div className="p-3.5 rounded-lg bg-carbon border border-white/[0.07] space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-white truncate">
                {activeRating.nextLevel ? `Next: ${activeRating.nextLevel.title}` : 'Apex Tier (Max Level)'}
              </span>

              {activeRating.nextLevel && (
                <span className="tabular-nums text-xs font-bold text-amber-400 shrink-0">
                  {activeRating.depthNeededForNextLevel && activeRating.pointsToNextLevel <= 1
                    ? `${activeRating.depthNeededForNextLevel} ${activeRating.depthNeededForNextLevel === 1 ? 'send' : 'sends'} at ${activeRating.nextLevel.shortGrade}+ to unlock`
                    : `${activeRating.pointsToNextLevel} pts to ${activeRating.nextLevel.shortGrade}`}
                </span>
              )}
            </div>

            {/* Progress Bar with Demarcation Bounds */}
            <div className="space-y-1.5">
              <div className="relative w-full h-2.5 bg-surface-high rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-amber-400"
                  style={{ width: `${Math.min(100, Math.max(3, activeRating.levelProgress))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400 gap-2">
                <span>{activeRating.currentLevel.shortGrade} ({activeRating.currentLevel.minElo.toLocaleString()})</span>
                <span className="font-semibold text-slate-200">
                  {activeRating.elo.toLocaleString()} pts ({Math.round(activeRating.levelProgress)}%)
                  {activeRating.rawElo && (
                    <span className="text-[10px] text-amber-300 font-normal ml-1" title="Raw tournament score before pyramid depth gating">
                      (raw {activeRating.rawElo.toLocaleString()})
                    </span>
                  )}
                </span>
                <span>
                  {activeRating.nextLevel
                    ? `${activeRating.nextLevel.shortGrade} (${activeRating.nextLevel.minElo.toLocaleString()})`
                    : '∞'}
                </span>
              </div>
            </div>

            {/* View Demarcations toggle button */}
            <div className="flex items-center justify-end pt-0.5">
              <button
                type="button"
                onClick={() => setShowDemarcations(!showDemarcations)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 hover:text-amber-300 transition-colors active-press"
              >
                <Milestone className="w-3.5 h-3.5 text-amber-400" />
                <span>{showDemarcations ? 'Hide Demarcations' : 'View All Demarcations'}</span>
                {showDemarcations ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* EXPANDABLE: LEVEL DEMARCATIONS REFERENCE TABLE */}
          {showDemarcations && renderDemarcationsTable('my')}

          {/* Global Percentile Bar */}
          <div className="space-y-2 p-3.5 rounded-lg bg-carbon border border-white/[0.07]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Regular Climber Tier</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-amber-400">
                Top {activeRating.topPercentile}%
              </span>
            </div>

            {/* Progress meter */}
            <div className="relative w-full h-2.5 bg-surface-high rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-emerald-400"
                style={{ width: `${Math.min(100, Math.max(3, activeRating.percentile))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 tabular-nums">
              <span>Top 99% (Beginner)</span>
              <span>Top 50% (Median V3)</span>
              <span>Top 5% (Advanced)</span>
            </div>
          </div>

          {/* Toggle Top 15 Scorecard */}
          <button
            type="button"
            onClick={() => setShowScorecard(!showScorecard)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-white/[0.07] text-xs font-semibold text-slate-200 transition-colors active-press"
          >
            <div className="flex items-center gap-2 tabular-nums">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Top 15 Scorecard ({activeRating.topSends.length}/15 active)</span>
            </div>
            {showScorecard ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* EXPANDABLE: TOP 15 SCORECARD */}
          {showScorecard && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-semibold tabular-nums">
                <span>Active 60-Day Scorecard</span>
                <span>{activeRating.totalSendsInWindow} sends in window</span>
              </div>

              {activeRating.topSends.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-carbon rounded-lg border border-white/[0.07]">
                  No sends logged in the last 60 days. Bag a send at the gym to calibrate your Elo.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeRating.topSends.map((item, idx) => (
                    <div
                      key={item.attempt.id || `${item.boulder.id}-${idx}`}
                      onClick={() => onSelectBoulder && onSelectBoulder(item.boulder)}
                      className={`flex items-center justify-between p-2.5 rounded-lg bg-carbon border border-white/[0.07] hover:border-white/[0.14] transition-colors text-xs ${
                        onSelectBoulder ? 'cursor-pointer hover:bg-surface-elevated' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 text-center font-mono tabular-nums font-bold text-slate-400 text-[11px]">
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
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                            <Zap className="w-3 h-3 fill-current" />
                            Flash
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 tabular-nums">
                            <CheckCircle2 className="w-3 h-3" />
                            {item.attemptCount} tries
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono tabular-nums font-bold text-slate-100 text-xs">
                          {item.sendElo} pts
                        </span>

                        <span
                          className={`text-[11px] font-mono tabular-nums font-semibold flex items-center gap-1 ${
                            item.daysRemaining <= 7 ? 'text-amber-300' : 'text-slate-400'
                          }`}
                          title={`${item.daysRemaining} days left before falling out of 60-day window`}
                        >
                          <Clock className="w-3 h-3 stroke-[2.5]" />
                          <span>{item.daysRemaining}d</span>
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Empty slots placeholders if fewer than 15 */}
                  {Array.from({ length: Math.max(0, 15 - activeRating.topSends.length) }).map((_, i) => {
                    const slotNum = activeRating.topSends.length + i + 1;
                    return (
                      <div
                        key={`empty-${slotNum}`}
                        className="flex items-center justify-between p-2 rounded-lg border border-dashed border-white/[0.06] text-[11px] text-slate-400"
                      >
                        <span className="w-6 text-center font-mono tabular-nums">#{slotNum}</span>
                        <span className="truncate px-2">Empty slot — send another climb to fill scorecard</span>
                        <span className="font-mono tabular-nums text-[10px]">-- pts</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: CREW LEADERBOARD */
        <div className="space-y-3">
          <div className="text-xs text-slate-400 font-semibold px-1">
            Current 60-Day Crew Rankings & Level Status
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
                  className={`flex items-center justify-between p-3.5 rounded-lg border transition-colors cursor-pointer hover:bg-surface-elevated active-press ${
                    isFirst
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : 'bg-carbon border-white/[0.07] hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono tabular-nums font-bold text-sm w-6 text-center shrink-0 ${
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

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className="text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: `${color.hex}25`, color: color.hex }}
                        >
                          {rating.gradeEquivalent}
                        </span>
                        <span className="text-[11px] text-slate-300 truncate">
                          {rating.title}
                        </span>
                      </div>

                      {rating.nextLevel && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] tabular-nums font-semibold text-amber-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>
                              {rating.depthNeededForNextLevel && rating.pointsToNextLevel <= 1
                                ? `${rating.depthNeededForNextLevel} ${rating.depthNeededForNextLevel === 1 ? 'send' : 'sends'} to ${rating.nextLevel.shortGrade}`
                                : `${rating.pointsToNextLevel} pts to ${rating.nextLevel.shortGrade}`}
                            </span>
                          </span>
                          <div className="w-16 h-1.5 bg-surface-high rounded-full overflow-hidden border border-white/[0.06]">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(5, rating.levelProgress))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono tabular-nums font-bold text-sm text-slate-100">
                        {rating.elo.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Top {rating.topPercentile}%
                      </div>
                      {rating.peakElo !== null && (
                        <div
                          className={`text-[10px] font-mono tabular-nums font-semibold mt-0.5 ${
                            rating.isAtPeak ? 'text-emerald-400' : 'text-amber-300/90'
                          }`}
                          title={
                            rating.peakDate
                              ? `All-Time Peak: ${rating.peakElo.toLocaleString()} pts (${rating.peakTitle || rating.peakGradeEquivalent}) on ${formatPeakDate(rating.peakDate)}`
                              : undefined
                          }
                        >
                          {rating.isAtPeak ? (
                            <span className="inline-flex items-center justify-end gap-1">
                              <Award className="w-2.5 h-2.5 shrink-0" />
                              <span>At Peak</span>
                            </span>
                          ) : (
                            <>
                              Peak {rating.peakElo.toLocaleString()}
                              {rating.peakLevel?.shortGrade && (
                                <span className="hidden sm:inline text-slate-400"> · {rating.peakLevel.shortGrade}</span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="hidden sm:block">
                      {getFormBadge(rating.formStatus, rating.sendsCount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle Level Demarcations Table in Crew View */}
          <button
            type="button"
            onClick={() => setShowDemarcations(!showDemarcations)}
            className="w-full py-2.5 px-3 rounded-lg bg-surface-elevated hover:bg-surface-high border border-white/[0.06] text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors active-press"
          >
            <Milestone className="w-3.5 h-3.5 text-amber-400" />
            <span>{showDemarcations ? 'Hide Demarcations' : 'View All Demarcations'}</span>
            {showDemarcations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* EXPANDABLE: LEVEL DEMARCATIONS IN CREW VIEW */}
          {showDemarcations && renderDemarcationsTable('group')}
        </div>
      )}
    </div>
  );
};
