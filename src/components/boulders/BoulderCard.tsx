import React, { useState, useMemo } from 'react';
import { Boulder, Attempt, Profile, getHoldCardStyle, LogAttemptParams } from '../../types';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
import { ClimberStatusPills } from './ClimberStatusPills';
import { Zap, Check, Clock, MessageSquare, Camera, FileText, Plus } from 'lucide-react';
import { getBoulderAgeInfo } from '../../lib/resetStatus';
import { useGym } from '../../context/GymContext';
import { calcBoulderReviewSummary, GRADE_OPINION_CONFIG, REVIEW_RATING_CONFIG, BoulderReviewSummary } from '../../lib/reviews';

interface BoulderCardProps {
  boulder: Boulder;
  attempts: Attempt[];
  climbers: Profile[];
  currentUserId?: string;
  commentCount: number;
  reviewSummary?: BoulderReviewSummary;
  areaName?: string;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
  onOpenDetails: (boulder: Boulder) => void;
  onLogAttempt?: (params: LogAttemptParams) => Promise<void>;
}

const BoulderCardComponent: React.FC<BoulderCardProps> = ({
  boulder,
  attempts,
  climbers,
  currentUserId,
  commentCount,
  reviewSummary: propReviewSummary,
  areaName,
  onQuickLog,
  onOpenDetails,
  onLogAttempt
}) => {
  const gymCtx = useGym();
  const logAttempt = onLogAttempt || gymCtx.logAttempt;
  const [isLoggingInstant, setIsLoggingInstant] = useState(false);

  const reviewSummary = useMemo(() => {
    if (propReviewSummary) return propReviewSummary;
    const boulderReviews = gymCtx.reviews.filter(r => r.boulder_id === boulder.id);
    return calcBoulderReviewSummary(boulderReviews);
  }, [propReviewSummary, gymCtx.reviews, boulder.id]);

  const userAttempt = attempts.find(a => a.user_id === currentUserId);
  const cardStyle = getHoldCardStyle(boulder.hold_colour);
  const resetInfo = getBoulderAgeInfo(boulder.date_added);

  const isFlash = userAttempt?.status === 'flashed';
  const isSent = userAttempt?.status === 'sent';
  const isProject = userAttempt?.status === 'attempted';
  const isUntried = !userAttempt;

  let borderShadowClass = 'border-white/[0.06] hover:border-white/[0.12] surface-card';
  if (isFlash) {
    borderShadowClass = 'border-amber-400/40 shadow-glow-flash';
  } else if (isSent) {
    borderShadowClass = 'border-emerald-500/35 shadow-glow-sent';
  } else if (isProject) {
    borderShadowClass = 'border-sky-500/35 shadow-glow-project';
  }

  // 1-Tap Quick "+" Increment: adds 1 attempt (falls off without sending)
  const handleQuickIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || isLoggingInstant) return;
    setIsLoggingInstant(true);
    try {
      const nextCount = userAttempt ? userAttempt.attempt_count + 1 : 1;
      await logAttempt({
        boulderId: boulder.id,
        status: 'attempted',
        attemptCount: nextCount,
        loggedAt: new Date().toISOString(),
        userId: currentUserId
      });
    } finally {
      setIsLoggingInstant(false);
    }
  };

  // 1-Tap Quick Send:
  // - On untried boulder: records 1st-try send as a FLASH (status: 'flashed', 1 try)
  // - On projecting boulder: increments tries (attempt_count + 1) and records send (status: 'sent')
  const handleQuickSend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || isLoggingInstant) return;
    setIsLoggingInstant(true);
    try {
      if (!userAttempt) {
        await logAttempt({
          boulderId: boulder.id,
          status: 'flashed',
          attemptCount: 1,
          loggedAt: new Date().toISOString(),
          userId: currentUserId
        });
      } else {
        const sendCount = userAttempt.attempt_count + 1;
        await logAttempt({
          boulderId: boulder.id,
          status: 'sent',
          attemptCount: sendCount,
          loggedAt: new Date().toISOString(),
          userId: currentUserId
        });
      }
    } finally {
      setIsLoggingInstant(false);
    }
  };

  return (
    <div
      onClick={() => onQuickLog(boulder)}
      className={`group relative bg-carbon-surface/95 hover:bg-carbon-elevated/95 border rounded-3xl p-4 sm:p-5 transition-[border-color,box-shadow,background-color] duration-150 cursor-pointer flex flex-col gap-3 overflow-hidden boulder-card-deferred ${borderShadowClass}`}
      style={{
        background: cardStyle.gradientBackground
      }}
    >
      {/* Left colored accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] z-10"
        style={{
          background: cardStyle.accentBarBackground
        }}
      />

      {/* TIER 1: Order #, Hold Badge, and Direct Action Strip */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 tabular-nums ${
              boulder.is_comp && boulder.comp_number != null
                ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                : 'text-slate-300 bg-surface border-white/[0.08]'
            }`}
          >
            #{boulder.comp_number ?? boulder.display_order ?? Math.round(boulder.position_order)}
          </span>
          <HoldBadge
            color={boulder.hold_colour}
            grade={boulder.grade}
            isComp={boulder.is_comp}
            compNumber={boulder.comp_number}
            showGrade={!boulder.is_comp || boulder.comp_number == null}
            size="md"
          />
        </div>

        {/* Direct Action Strip on the Card */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isFlash ? (
            /* COMPLETED: Solid Gold Flashed Pill */
            <button
              type="button"
              onClick={() => onQuickLog(boulder, currentUserId)}
              className="inline-flex items-center gap-1.5 text-xs font-heading font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-full border border-amber-300 transition-all active-press shadow-glow-flash"
              title="Flashed on 1st attempt. Tap to view or edit."
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>FLASHED</span>
            </button>
          ) : isSent ? (
            /* COMPLETED: Solid Emerald Sent Pill with number of tries (no parentheses or t) */
            <button
              type="button"
              onClick={() => onQuickLog(boulder, currentUserId)}
              className="inline-flex items-center gap-1.5 text-xs font-heading font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-full border border-emerald-300 transition-all active-press shadow-glow-sent"
              title={`Sent in ${userAttempt.attempt_count} tries. Tap to view or edit.`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>SENT {userAttempt.attempt_count}</span>
            </button>
          ) : isProject ? (
            /* PROJECTING: [ PROJ N ] | [ + ] | [ SENT ] (Order: Status -> Quick Increment -> Quick Send) */
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onQuickLog(boulder, currentUserId)}
                className="inline-flex items-center gap-1 text-xs font-mono font-bold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1.5 rounded-full border border-sky-500/35 transition-all active-press"
                title={`Projecting with ${userAttempt.attempt_count} tries. Tap to view details.`}
              >
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>PROJ {userAttempt.attempt_count}</span>
              </button>

              {/* Position 2: Quick '+' increment attempt */}
              <button
                type="button"
                onClick={handleQuickIncrement}
                disabled={isLoggingInstant}
                className="w-7 h-7 rounded-full bg-surface hover:bg-surface-elevated border border-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white flex items-center justify-center transition-all active-press"
                title={`Add 1 try (now ${userAttempt.attempt_count + 1})`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Position 3: Quick Sent action (increments tries and logs send) */}
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={isLoggingInstant}
                className="inline-flex items-center gap-1 text-xs font-heading font-semibold text-slate-300 hover:text-emerald-300 bg-surface hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-400/40 px-2.5 py-1.5 rounded-full transition-all active-press"
                title={`Send on try ${userAttempt.attempt_count + 1}`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
                <span>SENT</span>
              </button>
            </div>
          ) : (
            /* UNTRIED: [ + ] | [ SENT ] (Order is identical: Quick Increment -> Quick Send) */
            <div className="flex items-center gap-1.5">
              {/* Position 1: Quick '+' to record 1st attempt as a project (PROJ 1) */}
              <button
                type="button"
                onClick={handleQuickIncrement}
                disabled={isLoggingInstant}
                className="w-7 h-7 rounded-full bg-surface hover:bg-surface-elevated border border-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white flex items-center justify-center transition-all active-press"
                title="Record 1st try (fall off / project)"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Position 2: Quick Sent action (1st try send = Flash!) */}
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={isLoggingInstant}
                className="inline-flex items-center gap-1 text-xs font-heading font-semibold text-slate-300 hover:text-emerald-300 bg-surface hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-400/40 px-2.5 py-1.5 rounded-full transition-all active-press"
                title="Send on 1st try (Flash)"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
                <span>SENT</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TIER 2: Spatial Cues & Metadata Subline */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap text-xs text-slate-400">
        {/* Clockwise Spatial Sequence Indicators */}
        <div className="flex items-center gap-1.5 text-xs font-mono min-w-0 bg-carbon/70 border border-white/[0.04] px-2.5 py-1 rounded-full">
          {boulder.adjacent_prev ? (
            <span className="inline-flex items-center gap-1 text-slate-300 truncate max-w-[130px] sm:max-w-[160px]">
              <span className="text-slate-500">←</span>
              <HoldSwatch color={boulder.adjacent_prev.hold_colour} size="xs" />
              <span className="text-slate-200 font-semibold font-mono text-[11px]">
                {boulder.adjacent_prev.comp_number != null
                  ? `#${boulder.adjacent_prev.comp_number}`
                  : boulder.adjacent_prev.grade}
              </span>
            </span>
          ) : (
            <span className="text-slate-600 text-[10px]">Start</span>
          )}

          <span className="text-slate-600">•</span>

          {boulder.adjacent_next ? (
            <span className="inline-flex items-center gap-1 text-slate-300 truncate max-w-[130px] sm:max-w-[160px]">
              <span className="text-slate-200 font-semibold font-mono text-[11px]">
                {boulder.adjacent_next.comp_number != null
                  ? `#${boulder.adjacent_next.comp_number}`
                  : boulder.adjacent_next.grade}
              </span>
              <HoldSwatch color={boulder.adjacent_next.hold_colour} size="xs" />
              <span className="text-slate-500">→</span>
            </span>
          ) : (
            <span className="text-slate-600 text-[10px]">End</span>
          )}
        </div>

        {/* Right side: Review Kaomojis, Beta Note, Photo & Comments */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {reviewSummary.dominantRating && (() => {
            const ratingCfg = REVIEW_RATING_CONFIG[reviewSummary.dominantRating];
            return (
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${ratingCfg.badgeBg} ${ratingCfg.badgeBorder} ${ratingCfg.badgeText}`}
                title={`Climb rating: ${ratingCfg.label}`}
              >
                <span>{ratingCfg.kaomoji}</span>
                <span>{ratingCfg.shortLabel}</span>
              </span>
            );
          })()}

          {reviewSummary.consensusGrade && (() => {
            const gradeCfg = GRADE_OPINION_CONFIG[reviewSummary.consensusGrade];
            const GradeIcon = gradeCfg.icon;
            return (
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${gradeCfg.badgeBg} ${gradeCfg.badgeBorder} ${gradeCfg.badgeText}`}
                title={`Grade consensus: ${gradeCfg.label}`}
              >
                <GradeIcon className="w-2.5 h-2.5" />
                <span>{gradeCfg.shortLabel}</span>
              </span>
            );
          })()}

          {resetInfo.isDueForReset && (
            <span
              className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-full"
              title={`Set ${resetInfo.weeksOld} weeks ago – sector is due for a reset`}
            >
              <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span>Reset soon ({resetInfo.weeksOld}w)</span>
            </span>
          )}

          {boulder.image_url && (
            <button
              type="button"
              onClick={() => onOpenDetails(boulder)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-surface transition-colors active-press"
              title="Climb has photo - Click to view"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {boulder.notes && (
            <button
              type="button"
              onClick={() => onOpenDetails(boulder)}
              className="p-1 rounded-full text-slate-400 hover:text-amber-300 hover:bg-surface transition-colors active-press"
              title="Climb has beta notes - Click to view"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}

          {commentCount > 0 && (
            <button
              type="button"
              onClick={() => onOpenDetails(boulder)}
              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-400 hover:text-white px-1.5 py-0.5 rounded-full hover:bg-surface transition-colors active-press"
              title={`${commentCount} beta comments - Click to view`}
            >
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span>{commentCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* TIER 3: Crew Status Strip */}
      <div className="border-t border-white/[0.05] pt-2.5 mt-0.5">
        <ClimberStatusPills
          climbers={climbers}
          attempts={attempts}
          currentUserId={currentUserId}
          size="sm"
          onClimberClick={(climberId) => onQuickLog(boulder, climberId)}
        />
      </div>
    </div>
  );
};

export const BoulderCard = React.memo(BoulderCardComponent);
