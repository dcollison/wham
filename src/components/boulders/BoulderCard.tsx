import React, { useState } from 'react';
import { Boulder, Attempt, Profile, getHoldCardStyle, LogAttemptParams } from '../../types';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
import { ClimberStatusPills } from './ClimberStatusPills';
import { Zap, Check, Clock, MessageSquare, Camera, FileText, Plus, Loader2 } from 'lucide-react';
import { calcBoulderReviewSummary, GRADE_OPINION_CONFIG, REVIEW_RATING_CONFIG, BoulderReviewSummary } from '../../lib/reviews';
import { isWinterSeriesBoulder } from '../../lib/winterSeries';

const EMPTY_REVIEW_SUMMARY: BoulderReviewSummary = calcBoulderReviewSummary([]);

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
  onQuickLog,
  onOpenDetails,
  onLogAttempt
}) => {
  const [isLoggingInstant, setIsLoggingInstant] = useState<'inc' | 'send' | 'top' | null>(null);

  const reviewSummary = propReviewSummary ?? EMPTY_REVIEW_SUMMARY;

  const userAttempt = attempts.find(
    a => a.user_id === currentUserId && (a.status as string) !== 'untried'
  );
  const cardStyle = getHoldCardStyle(boulder.hold_colour);

  const isFlash = userAttempt?.status === 'flashed';
  const isSent = userAttempt?.status === 'sent';
  const isProject = userAttempt?.status === 'attempted';

  let borderClass = 'border-white/[0.07] hover:border-white/[0.14] surface-card';
  if (isFlash) {
    borderClass = 'border-amber-400/45 hover:border-amber-400/65';
  } else if (isSent) {
    borderClass = 'border-emerald-400/40 hover:border-emerald-400/60';
  } else if (isProject) {
    borderClass = 'border-sky-400/40 hover:border-sky-400/60';
  }

  // 1-Tap Quick "+" Increment: adds 1 attempt (falls off without sending)
  const handleQuickIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || isLoggingInstant || !onLogAttempt) return;
    setIsLoggingInstant('inc');
    try {
      const nextCount = userAttempt ? userAttempt.attempt_count + 1 : 1;
      await onLogAttempt({
        boulderId: boulder.id,
        status: 'attempted',
        attemptCount: nextCount,
        loggedAt: new Date().toISOString(),
        userId: currentUserId
      });
    } finally {
      setIsLoggingInstant(null);
    }
  };

  // 1-Tap Quick Send:
  // - On untried boulder: records 1st-try send as a FLASH (status: 'flashed', 1 try)
  // - On projecting boulder: increments tries (attempt_count + 1) and records send (status: 'sent')
  const handleQuickSend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || isLoggingInstant || !onLogAttempt) return;
    setIsLoggingInstant('send');
    try {
      if (!userAttempt) {
        await onLogAttempt({
          boulderId: boulder.id,
          status: 'flashed',
          attemptCount: 1,
          loggedAt: new Date().toISOString(),
          userId: currentUserId
        });
      } else {
        const sendCount = userAttempt.attempt_count + 1;
        await onLogAttempt({
          boulderId: boulder.id,
          status: 'sent',
          attemptCount: sendCount,
          loggedAt: new Date().toISOString(),
          userId: currentUserId
        });
      }
    } finally {
      setIsLoggingInstant(null);
    }
  };

  return (
    <div
      onClick={() => onQuickLog(boulder)}
      className={`group relative bg-surface hover:bg-surface-elevated border rounded-3xl pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5 transition-[border-color,background-color] duration-150 cursor-pointer flex flex-col gap-3 overflow-hidden boulder-card-deferred ${borderClass}`}
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
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-full border border-amber-300 transition-all active-press animate-pop tabular-nums"
              title="Flashed on 1st attempt. Tap to view or edit."
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isWinterSeriesBoulder(boulder) ? 'FLASH · 3pt' : 'FLASHED'}</span>
            </button>
          ) : isSent ? (
            /* COMPLETED: Solid Emerald Sent Pill */
            <button
              type="button"
              onClick={() => onQuickLog(boulder, currentUserId)}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-full border border-emerald-300 transition-all active-press animate-pop tabular-nums"
              title={`Sent in ${userAttempt.attempt_count} tries. Tap to view or edit.`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isWinterSeriesBoulder(boulder) ? 'TOP · 2pt' : `SENT ${userAttempt.attempt_count}`}</span>
            </button>
          ) : isProject ? (
            /* PROJECTING / ZONE */
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onQuickLog(boulder, currentUserId)}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1.5 rounded-full border border-sky-500/35 transition-all active-press animate-pop tabular-nums"
                title={isWinterSeriesBoulder(boulder) ? 'Zone reached (1 pt). Tap to edit.' : `Projecting with ${userAttempt.attempt_count} tries. Tap to view details.`}
              >
                <Clock className="w-3.5 h-3.5 text-sky-400 stroke-[2.5]" />
                <span>{isWinterSeriesBoulder(boulder) ? 'ZONE · 1pt' : `PROJ ${userAttempt.attempt_count}`}</span>
              </button>

              {!isWinterSeriesBoulder(boulder) && (
                /* Position 2: Quick '+' increment attempt */
                <button
                  type="button"
                  onClick={handleQuickIncrement}
                  disabled={Boolean(isLoggingInstant)}
                  className="w-7 h-7 rounded-full bg-surface-elevated hover:bg-surface-high border border-white/[0.1] hover:border-white/[0.18] text-slate-200 hover:text-white flex items-center justify-center transition-all active-press disabled:opacity-60"
                  title={`Add 1 try (now ${userAttempt.attempt_count + 1})`}
                >
                  {isLoggingInstant === 'inc' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </button>
              )}

              {/* Position 3: Quick Sent / Top action */}
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={Boolean(isLoggingInstant)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-200 hover:text-emerald-300 bg-surface-elevated hover:bg-emerald-500/15 border border-white/[0.1] hover:border-emerald-400/40 px-2.5 py-1.5 rounded-full transition-all active-press disabled:opacity-60 tabular-nums"
                title={isWinterSeriesBoulder(boulder) ? 'Upgrade to Top (2 pts)' : `Send on try ${userAttempt.attempt_count + 1}`}
              >
                {isLoggingInstant === 'send' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
                )}
                <span>{isWinterSeriesBoulder(boulder) ? 'TOP · 2' : 'SENT'}</span>
              </button>
            </div>
          ) : isWinterSeriesBoulder(boulder) ? (
            /* UNTRIED WINTER SERIES BOULDER: [ ZONE 1 ] | [ TOP 2 ] | [ FLASH 3 ] */
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleQuickIncrement}
                disabled={Boolean(isLoggingInstant)}
                className="px-2 py-1 rounded-full bg-surface-elevated hover:bg-sky-500/15 border border-white/[0.1] hover:border-sky-400/40 text-sky-300 text-[11px] font-bold tabular-nums transition-all active-press inline-flex items-center gap-1 disabled:opacity-60"
                title="Mark Zone (1 pt)"
              >
                {isLoggingInstant === 'inc' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Z·1</span>
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!currentUserId || isLoggingInstant || !onLogAttempt) return;
                  setIsLoggingInstant('top');
                  try {
                    await onLogAttempt({
                      boulderId: boulder.id,
                      status: 'sent',
                      attemptCount: 2,
                      loggedAt: new Date().toISOString(),
                      userId: currentUserId
                    });
                  } finally {
                    setIsLoggingInstant(null);
                  }
                }}
                disabled={Boolean(isLoggingInstant)}
                className="px-2 py-1 rounded-full bg-surface-elevated hover:bg-emerald-500/15 border border-white/[0.1] hover:border-emerald-400/40 text-emerald-300 text-[11px] font-bold tabular-nums transition-all active-press inline-flex items-center gap-1 disabled:opacity-60"
                title="Mark Top (2 pts)"
              >
                {isLoggingInstant === 'top' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>T·2</span>
              </button>
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={Boolean(isLoggingInstant)}
                className="px-2.5 py-1 rounded-full bg-surface-elevated hover:bg-amber-500/15 border border-white/[0.1] hover:border-amber-400/40 text-amber-300 text-[11px] font-bold tabular-nums transition-all active-press inline-flex items-center gap-1 disabled:opacity-60"
                title="Mark Flash (3 pts)"
              >
                {isLoggingInstant === 'send' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 fill-current" />
                )}
                <span>3</span>
              </button>
            </div>
          ) : (
            /* UNTRIED: [ + ] | [ SENT ] (Order is identical: Quick Increment -> Quick Send) */
            <div className="flex items-center gap-1.5">
              {/* Position 1: Quick '+' to record 1st attempt as a project (PROJ 1) */}
              <button
                type="button"
                onClick={handleQuickIncrement}
                disabled={Boolean(isLoggingInstant)}
                className="w-7 h-7 rounded-full bg-surface-elevated hover:bg-surface-high border border-white/[0.1] hover:border-white/[0.18] text-slate-200 hover:text-white flex items-center justify-center transition-all active-press disabled:opacity-60"
                title="Record 1st try (fall off / project)"
              >
                {isLoggingInstant === 'inc' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>

              {/* Position 2: Quick Sent action (1st try send = Flash!) */}
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={Boolean(isLoggingInstant)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-200 hover:text-emerald-300 bg-surface-elevated hover:bg-emerald-500/15 border border-white/[0.1] hover:border-emerald-400/40 px-2.5 py-1.5 rounded-full transition-all active-press disabled:opacity-60"
                title="Send on 1st try (Flash)"
              >
                {isLoggingInstant === 'send' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
                )}
                <span>SENT</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TIER 2: Spatial Cues & Metadata Subline */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap text-xs text-slate-400">
        {/* Clockwise Spatial Sequence Indicators */}
        <div className="flex items-center gap-1.5 text-xs min-w-0 bg-carbon/70 border border-white/[0.06] px-2.5 py-1 rounded-full">
          {boulder.adjacent_prev ? (
            <span className="inline-flex items-center gap-1.5 text-slate-300 truncate max-w-[130px] sm:max-w-[160px]">
              <span className="text-slate-400">←</span>
              <HoldSwatch color={boulder.adjacent_prev.hold_colour} size="xs" />
              <span className="text-slate-200 font-semibold font-mono tabular-nums text-[11px]">
                {boulder.adjacent_prev.comp_number != null
                  ? `#${boulder.adjacent_prev.comp_number}`
                  : boulder.adjacent_prev.grade}
              </span>
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">Start</span>
          )}

          <span className="text-slate-400">•</span>

          {boulder.adjacent_next ? (
            <span className="inline-flex items-center gap-1.5 text-slate-300 truncate max-w-[130px] sm:max-w-[160px]">
              <span className="text-slate-200 font-semibold font-mono tabular-nums text-[11px]">
                {boulder.adjacent_next.comp_number != null
                  ? `#${boulder.adjacent_next.comp_number}`
                  : boulder.adjacent_next.grade}
              </span>
              <HoldSwatch color={boulder.adjacent_next.hold_colour} size="xs" />
              <span className="text-slate-400">→</span>
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">End</span>
          )}
        </div>

        {/* Right side: Review Kaomojis, Beta Note, Photo & Comments */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {reviewSummary.dominantRating && (() => {
            const ratingCfg = REVIEW_RATING_CONFIG[reviewSummary.dominantRating];
            return (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ratingCfg.badgeBg} ${ratingCfg.badgeBorder} ${ratingCfg.badgeText}`}
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
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${gradeCfg.badgeBg} ${gradeCfg.badgeBorder} ${gradeCfg.badgeText}`}
                title={`Grade consensus: ${gradeCfg.label}`}
              >
                <GradeIcon className="w-3 h-3" />
                <span>{gradeCfg.shortLabel}</span>
              </span>
            );
          })()}

          {boulder.image_url && (
            <button
              type="button"
              onClick={() => onOpenDetails(boulder)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-surface-high transition-colors active-press"
              title="Climb has photo - Click to view"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {boulder.notes && (
            <button
              type="button"
              onClick={() => onOpenDetails(boulder)}
              className="p-1 rounded-full text-slate-400 hover:text-amber-300 hover:bg-surface-high transition-colors active-press"
              title="Climb has beta notes - Click to view"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}

          {commentCount > 0 && (
            <button
              type="button"
              onClick={() => onOpenDetails(boulder)}
              className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-medium text-slate-300 hover:text-white px-1.5 py-0.5 rounded-full hover:bg-surface-high transition-colors active-press"
              title={`${commentCount} beta comments - Click to view`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
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
          isWinterSeries={isWinterSeriesBoulder(boulder)}
          onClimberClick={(climberId) => onQuickLog(boulder, climberId)}
        />
      </div>
    </div>
  );
};

export const BoulderCard = React.memo(BoulderCardComponent);
