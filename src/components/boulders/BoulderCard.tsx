import React from 'react';
import { Boulder, Attempt, Profile, HOLD_COLORS, getHoldCardStyle, getHoldSwatchStyle } from '../../types';
import { HoldBadge } from './HoldBadge';
import { ClimberStatusPills } from './ClimberStatusPills';
import { Zap, Check, Clock, MessageSquare, ChevronRight, Image as ImageIcon } from 'lucide-react';

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

  let statusBadge = (
    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
      Untried
    </span>
  );

  if (userAttempt?.status === 'flashed') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
        <Zap className="w-3 h-3 fill-amber-400" /> Flash
      </span>
    );
  } else if (userAttempt?.status === 'sent') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
        <Check className="w-3 h-3 stroke-[3]" /> Sent ({userAttempt.attempt_count}t)
      </span>
    );
  } else if (userAttempt?.status === 'attempted') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
        <Clock className="w-3 h-3" /> Project ({userAttempt.attempt_count}t)
      </span>
    );
  }

  return (
    <div
      onClick={() => onQuickLog(boulder)}
      className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md active-press cursor-pointer flex flex-col gap-3 overflow-hidden"
      style={{
        background: cardStyle.gradientBackground
      }}
    >
      {/* Left colored accent bar (solid color or yellow/black hazard stripes for Bee) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px] z-10"
        style={{
          background: cardStyle.accentBarBackground
        }}
      />
      {/* Top row: Order #, Hold Color & Grade, Current User Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60 shrink-0">
            #{Math.round(boulder.position_order)}
          </span>
          <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="sm" />
          {areaName && (
            <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 truncate max-w-[140px]">
              {areaName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {statusBadge}
        </div>
      </div>

      {/* Middle row: Notes & Photo Thumbnail Preview */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {boulder.notes ? (
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {boulder.notes}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No beta notes added yet.
            </p>
          )}

          {/* Adjacent Indicators (Clockwise Sequence) */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-2 font-mono flex-wrap">
            {boulder.adjacent_prev && (
              <span className="inline-flex items-center gap-1 text-slate-300 truncate max-w-[140px]">
                <span className="text-slate-500">←</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40 shadow-xs"
                  style={getHoldSwatchStyle(boulder.adjacent_prev.hold_colour)}
                />
                <span className="text-slate-200 font-semibold">{boulder.adjacent_prev.hold_colour} {boulder.adjacent_prev.grade}</span>
              </span>
            )}
            {boulder.adjacent_prev && boulder.adjacent_next && (
              <span className="text-slate-600">•</span>
            )}
            {boulder.adjacent_next && (
              <span className="inline-flex items-center gap-1 text-slate-300 truncate max-w-[140px]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40 shadow-xs"
                  style={getHoldSwatchStyle(boulder.adjacent_next.hold_colour)}
                />
                <span className="text-slate-200 font-semibold">{boulder.adjacent_next.hold_colour} {boulder.adjacent_next.grade}</span>
                <span className="text-slate-500">→</span>
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Preview if photo exists */}
        {boulder.image_url ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(boulder);
            }}
            className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-800 shrink-0 relative group/thumb shadow"
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
          {commentCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(boulder);
              }}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{commentCount}</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(boulder);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="View Beta & Details"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
