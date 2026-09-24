import React from 'react';
import { Boulder, Attempt, Profile, HOLD_COLORS, getHoldCardStyle } from '../../types';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
import { ClimberStatusPills } from './ClimberStatusPills';
import { Zap, Check, Clock, MessageSquare, ChevronRight, Image as ImageIcon, FileText, Sparkles } from 'lucide-react';
import { getBoulderAgeInfo } from '../../lib/resetStatus';
import { useGym } from '../../context/GymContext';
import { calcBoulderReviewSummary, GRADE_OPINION_CONFIG, REVIEW_RATING_CONFIG } from '../../lib/reviews';

interface BoulderCardProps {
  boulder: Boulder;
  attempts: Attempt[];
  climbers: Profile[];
  currentUserId?: string;
  commentCount: number;
  areaName?: string;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
  onOpenDetails: (boulder: Boulder) => void;
}

export const BoulderCard: React.FC<BoulderCardProps> = ({
  boulder,
  attempts,
  climbers,
  currentUserId,
  commentCount,
  areaName,
  onQuickLog,
  onOpenDetails
}) => {
  const { reviews } = useGym();
  const boulderReviews = reviews.filter(r => r.boulder_id === boulder.id);
  const reviewSummary = calcBoulderReviewSummary(boulderReviews);

  const userAttempt = attempts.find(a => a.user_id === currentUserId);
  const cardStyle = getHoldCardStyle(boulder.hold_colour);
  const resetInfo = getBoulderAgeInfo(boulder.date_added);

  const isFlash = userAttempt?.status === 'flashed';
  const isSent = userAttempt?.status === 'sent';

  let borderShadowClass = 'border-white/[0.06] hover:border-white/[0.14] surface-card';
  if (isFlash) {
    borderShadowClass = 'border-amber-400/40 shadow-[0_4px_28px_-4px_rgba(245,158,11,0.22)]';
  } else if (isSent) {
    borderShadowClass = 'border-emerald-500/35 shadow-[0_4px_28px_-4px_rgba(66,156,122,0.2)]';
  }

  let statusBadge = (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-800/80 hover:bg-slate-750 px-3 py-1 rounded-full border border-white/[0.07] transition-colors shrink-0 whitespace-nowrap active-press">
      Untried
    </span>
  );

  if (userAttempt?.status === 'flashed') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-3.5 py-1 rounded-full border border-amber-500/35 transition-colors shrink-0 whitespace-nowrap active-press shadow-xs">
        <Zap className="w-3.5 h-3.5 fill-amber-300" /> Flash
      </span>
    );
  } else if (userAttempt?.status === 'sent') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-3.5 py-1 rounded-full border border-emerald-500/35 transition-colors shrink-0 whitespace-nowrap active-press shadow-xs">
        <Check className="w-3.5 h-3.5 stroke-[3]" /> Sent (<span className="tabular-nums">{userAttempt.attempt_count}t</span>)
      </span>
    );
  } else if (userAttempt?.status === 'attempted') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 px-3.5 py-1 rounded-full border border-cyan-500/35 transition-colors shrink-0 whitespace-nowrap active-press shadow-xs">
        <Clock className="w-3.5 h-3.5" /> Project (<span className="tabular-nums">{userAttempt.attempt_count}t</span>)
      </span>
    );
  }

  const isCompletedByActiveUser = isFlash || isSent;

  return (
    <div
      onClick={() => onQuickLog(boulder)}
      className={`group relative bg-slate-900/90 hover:bg-slate-850/95 border rounded-3xl p-5 sm:p-6 transition-all duration-200 cursor-pointer flex flex-col gap-3.5 overflow-hidden ${borderShadowClass}`}
      style={{
        background: cardStyle.gradientBackground
      }}
    >
      {/* Left colored accent bar (solid color or half yellow / half black for Bee) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px] z-10"
        style={{
          background: cardStyle.accentBarBackground
        }}
      />
      {/* Top row: Order #, Hold Color & Grade, Current User Status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-mono text-xs font-bold px-3 py-1 rounded-full border shrink-0 tabular-nums ${
              boulder.is_comp
                ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                : 'text-slate-300 bg-slate-800/90 border-white/[0.08]'
            }`}
          >
            #{boulder.comp_number ?? boulder.display_order ?? Math.round(boulder.position_order)}
          </span>
          <HoldBadge
            color={boulder.hold_colour}
            grade={boulder.grade}
            isComp={boulder.is_comp}
            compNumber={boulder.comp_number}
            size="md"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* User Status Badge / Quick Log Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickLog(boulder);
            }}
            className="transition-transform active:scale-95 focus:outline-none shrink-0"
            title="Log attempt or update status"
          >
            {statusBadge}
          </button>
        </div>
      </div>

      {/* Tier 2: Metadata Sub-line (Area Name, Reset Status & Review Consensus) */}
      {(areaName || resetInfo.isDueForReset || reviewSummary.consensusGrade || reviewSummary.dominantRating) && (
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium pl-0.5 flex-wrap">
          {areaName && (
            <span className="text-slate-400 truncate max-w-[180px]">
              {areaName}
            </span>
          )}
          {areaName && (resetInfo.isDueForReset || reviewSummary.consensusGrade || reviewSummary.dominantRating) && (
            <span className="text-slate-600 font-bold">•</span>
          )}
          {reviewSummary.consensusGrade && (() => {
            const gradeCfg = GRADE_OPINION_CONFIG[reviewSummary.consensusGrade];
            const GradeIcon = gradeCfg.icon;
            return (
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full select-none border ${gradeCfg.badgeBg} ${gradeCfg.badgeBorder} ${gradeCfg.badgeText}`}
                title={`${gradeCfg.label} (${reviewSummary.consensusCount}/${reviewSummary.totalGradeOpinions} votes)`}
              >
                <GradeIcon className="w-2.5 h-2.5" />
                <span>{gradeCfg.shortLabel}</span>
              </span>
            );
          })()}
          {reviewSummary.dominantRating && !reviewSummary.consensusGrade && (() => {
            const ratingCfg = REVIEW_RATING_CONFIG[reviewSummary.dominantRating];
            return (
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full select-none border ${ratingCfg.badgeBg} ${ratingCfg.badgeBorder} ${ratingCfg.badgeText}`}
                title={`${reviewSummary.totalRatings} ratings`}
              >
                <span>{ratingCfg.kaomoji}</span>
                <span>{ratingCfg.shortLabel}</span>
              </span>
            );
          })()}
          {resetInfo.isDueForReset && (
            <span
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-full shrink-0 select-none"
              title={`Set ${resetInfo.weeksOld} weeks ago (${boulder.date_added}) – this climb is due for a reset`}
            >
              <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span>Reset soon ({resetInfo.weeksOld}w)</span>
            </span>
          )}
        </div>
      )}

      {/* Middle row: Clockwise Sequence Indicators & Photo Thumbnail Preview */}
      {(boulder.adjacent_prev || boulder.adjacent_next || boulder.image_url) && (
        <div className="flex items-center justify-between gap-3">
          {/* Adjacent Indicators (Clockwise Sequence) */}
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono flex-wrap min-w-0 flex-1 bg-slate-950/40 border border-white/[0.04] px-3 py-1.5 rounded-2xl">
            {boulder.adjacent_prev && (
              <span className="inline-flex items-center gap-1.5 text-slate-300 truncate max-w-[140px] sm:max-w-[180px]">
                <span className="text-slate-500">←</span>
                <HoldSwatch color={boulder.adjacent_prev.hold_colour} size="sm" />
                <span className="text-slate-200 font-semibold">
                  {boulder.adjacent_prev.hold_colour}{' '}
                  {boulder.adjacent_prev.is_comp || boulder.adjacent_prev.comp_number
                    ? `#${boulder.adjacent_prev.comp_number}`
                    : boulder.adjacent_prev.grade}
                </span>
              </span>
            )}
            {boulder.adjacent_prev && boulder.adjacent_next && (
              <span className="text-slate-600">•</span>
            )}
            {boulder.adjacent_next && (
              <span className="inline-flex items-center gap-1.5 text-slate-300 truncate max-w-[140px] sm:max-w-[180px]">
                <HoldSwatch color={boulder.adjacent_next.hold_colour} size="sm" />
                <span className="text-slate-200 font-semibold">
                  {boulder.adjacent_next.hold_colour}{' '}
                  {boulder.adjacent_next.is_comp || boulder.adjacent_next.comp_number
                    ? `#${boulder.adjacent_next.comp_number}`
                    : boulder.adjacent_next.grade}
                </span>
                <span className="text-slate-500">→</span>
              </span>
            )}
          </div>

          {/* Thumbnail Preview if photo exists */}
          {boulder.image_url ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(boulder);
              }}
              className="w-12 h-12 rounded-2xl overflow-hidden border border-white/[0.08] bg-slate-800 shrink-0 relative group/thumb shadow-xs"
            >
              <img
                src={boulder.image_url}
                alt={`${boulder.hold_colour} ${boulder.grade}`}
                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Bottom row: Climber chips & quick actions */}
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mt-1 gap-2.5">
        <div className="min-w-0 flex-1">
          <ClimberStatusPills
            climbers={climbers}
            attempts={attempts}
            currentUserId={currentUserId}
            size="sm"
            onClimberClick={(climberId) => onQuickLog(boulder, climberId)}
          />
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
          {boulder.notes && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(boulder);
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition-colors active-press"
              title="Has Beta Notes – Click to view details"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}

          {boulderReviews.length > 0 && (() => {
            const dominantCfg = reviewSummary.dominantRating ? REVIEW_RATING_CONFIG[reviewSummary.dominantRating] : null;
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(boulder);
                }}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white font-mono font-medium px-2 py-1 rounded-full hover:bg-slate-800/80 transition-colors active-press"
                title="Crew Reviews"
              >
                <span className={`text-[11px] font-bold ${dominantCfg ? dominantCfg.activeText : 'text-slate-400'}`}>
                  {dominantCfg?.kaomoji || '(•‿•)'}
                </span>
                <span className="tabular-nums">{boulderReviews.length}</span>
              </button>
            );
          })()}

          {commentCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(boulder);
              }}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white font-mono font-medium px-2 py-1 rounded-full hover:bg-slate-800/80 transition-colors active-press"
              title="Crew Comments"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="tabular-nums">{commentCount}</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(boulder);
            }}
            className="inline-flex items-center justify-center h-7 px-3 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 rounded-full border border-white/[0.07] active-press transition-all shadow-xs gap-1 shrink-0"
            title="View Beta Notes, Photos & Comments"
          >
            <span className="hidden sm:inline text-[11px] font-semibold">Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
