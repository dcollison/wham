import React from 'react';
import { Boulder, Attempt, Profile, HOLD_COLORS, getHoldCardStyle } from '../../types';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
import { ClimberStatusPills } from './ClimberStatusPills';
import { Zap, Check, Clock, MessageSquare, ChevronRight, Image as ImageIcon, FileText } from 'lucide-react';

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
  const userAttempt = attempts.find(a => a.user_id === currentUserId);
  const cardStyle = getHoldCardStyle(boulder.hold_colour);

  const isFlash = userAttempt?.status === 'flashed';
  const isSent = userAttempt?.status === 'sent';

  let borderShadowClass = 'border-slate-800 hover:border-slate-700/80 shadow-md shadow-black/20';
  if (isFlash) {
    borderShadowClass = 'border-amber-500/40 shadow-[0_0_18px_-2px_rgba(245,158,11,0.22)]';
  } else if (isSent) {
    borderShadowClass = 'border-emerald-500/35 shadow-[0_0_18px_-2px_rgba(16,185,129,0.18)]';
  }

  let statusBadge = (
    <span className="text-xs font-medium text-slate-400 bg-slate-800/90 hover:bg-slate-750 px-2.5 py-1 rounded-full border border-slate-700/80 transition-colors">
      Untried
    </span>
  );

  if (userAttempt?.status === 'flashed') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 transition-colors">
        <Zap className="w-3.5 h-3.5 fill-amber-400" /> Flash
      </span>
    );
  } else if (userAttempt?.status === 'sent') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30 transition-colors">
        <Check className="w-3.5 h-3.5 stroke-[3]" /> Sent (<span className="tabular-nums">{userAttempt.attempt_count}t</span>)
      </span>
    );
  } else if (userAttempt?.status === 'attempted') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30 transition-colors">
        <Clock className="w-3.5 h-3.5" /> Project (<span className="tabular-nums">{userAttempt.attempt_count}t</span>)
      </span>
    );
  }

  const isCompletedByActiveUser = isFlash || isSent;

  return (
    <div
      onClick={() => onQuickLog(boulder)}
      className={`group relative bg-slate-900/90 hover:bg-slate-850 border rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex flex-col gap-3.5 overflow-hidden surface-elevated ${borderShadowClass}`}
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 shrink-0 tabular-nums">
            #{boulder.display_order ?? Math.round(boulder.position_order)}
          </span>
          <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="md" />
          {areaName && (
            <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50 truncate max-w-[150px]">
              {areaName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* User Status Badge / Quick Log Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickLog(boulder);
            }}
            className="transition-transform active:scale-95 focus:outline-none"
            title="Log attempt or update status"
          >
            {statusBadge}
          </button>
        </div>
      </div>

      {/* Middle row: Clockwise Sequence Indicators & Photo Thumbnail Preview */}
      {(boulder.adjacent_prev || boulder.adjacent_next || boulder.image_url) && (
        <div className="flex items-center justify-between gap-3">
          {/* Adjacent Indicators (Clockwise Sequence) */}
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono flex-wrap">
            {boulder.adjacent_prev && (
              <span className="inline-flex items-center gap-1.5 text-slate-300 truncate max-w-[150px]">
                <span className="text-slate-500">←</span>
                <HoldSwatch color={boulder.adjacent_prev.hold_colour} size="sm" />
                <span className="text-slate-200 font-semibold">{boulder.adjacent_prev.hold_colour} {boulder.adjacent_prev.grade}</span>
              </span>
            )}
            {boulder.adjacent_prev && boulder.adjacent_next && (
              <span className="text-slate-600">•</span>
            )}
            {boulder.adjacent_next && (
              <span className="inline-flex items-center gap-1.5 text-slate-300 truncate max-w-[150px]">
                <HoldSwatch color={boulder.adjacent_next.hold_colour} size="sm" />
                <span className="text-slate-200 font-semibold">{boulder.adjacent_next.hold_colour} {boulder.adjacent_next.grade}</span>
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
              className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-800 shrink-0 relative group/thumb shadow"
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
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-0.5">
        <ClimberStatusPills
          climbers={climbers}
          attempts={attempts}
          currentUserId={currentUserId}
          size="sm"
          onClimberClick={(climberId) => onQuickLog(boulder, climberId)}
        />

        <div className="flex items-center gap-1 text-slate-400">
          {boulder.notes && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(boulder);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
              title="Has Beta Notes – Click to view details"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}

          {commentCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(boulder);
              }}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white font-mono font-medium px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
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
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 px-2 py-1 rounded-lg border border-slate-750 active-press transition-all shadow-xs"
            title="View Beta Notes, Photos & Comments"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
