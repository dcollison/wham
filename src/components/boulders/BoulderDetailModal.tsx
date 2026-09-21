import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Boulder, Attempt, Comment, Profile, GymArea } from '../../types';
import { HoldBadge } from './HoldBadge';
import { ClimberStatusPills } from './ClimberStatusPills';
import { ClimberAvatar } from '../ClimberAvatar';
import { getBoulderAgeInfo } from '../../lib/resetStatus';
import {
  X,
  Send,
  Calendar,
  Zap,
  Check,
  Clock,
  Archive,
  MessageSquare,
  ZoomIn,
  Users,
  Compass,
  CornerDownRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  ArrowRightLeft
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface BoulderDetailModalProps {
  boulder: Boulder | null;
  isOpen: boolean;
  onClose: () => void;
  attempts: Attempt[];
  comments: Comment[];
  climbers: Profile[];
  currentUserId?: string;
  areaName?: string;
  areas?: GymArea[];
  gymName?: string;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
  onAddComment: (boulderId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onToggleArchive: (boulderId: string, archive: boolean) => Promise<void>;
  onMoveBoulder?: (boulderId: string, targetAreaId: string, unarchive?: boolean) => Promise<void>;
  filteredBoulders?: Boulder[];
  onNavigateBoulder?: (boulder: Boulder) => void;
}

export const BoulderDetailModal: React.FC<BoulderDetailModalProps> = ({
  boulder,
  isOpen,
  onClose,
  attempts,
  comments,
  climbers,
  currentUserId,
  areaName,
  areas,
  gymName,
  onQuickLog,
  onAddComment,
  onDeleteComment,
  onToggleArchive,
  onMoveBoulder,
  filteredBoulders,
  onNavigateBoulder
}) => {
  const { areas: contextAreas, gyms: contextGyms, moveBoulder: contextMoveBoulder } = useGym();
  const [newComment, setNewComment] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMoveOpen, setIsMoveOpen] = useState<boolean>(false);
  const [selectedTargetAreaId, setSelectedTargetAreaId] = useState<string>('');
  const [restoreOnMove, setRestoreOnMove] = useState<boolean>(true);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [moveSuccessMessage, setMoveSuccessMessage] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  useEffect(() => {
    setDragOffset(0);
    setIsDragging(false);
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  }, [isOpen, boulder?.id]);

  // Filter-aware navigation calculations
  const currentIndex = boulder && filteredBoulders ? filteredBoulders.findIndex(b => b.id === boulder.id) : -1;
  const totalFiltered = filteredBoulders ? filteredBoulders.length : 0;
  const hasFilter = currentIndex !== -1 && totalFiltered > 0;
  const prevBoulder = hasFilter && currentIndex > 0 ? filteredBoulders![currentIndex - 1] : null;
  const nextBoulder = hasFilter && currentIndex < totalFiltered - 1 ? filteredBoulders![currentIndex + 1] : null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    const deltaY = touchEndY.current - touchStartY.current;
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (
      touchStartX.current !== null &&
      touchEndX.current !== null &&
      touchStartY.current !== null &&
      touchEndY.current !== null
    ) {
      const deltaX = touchEndX.current - touchStartX.current;
      const deltaY = touchEndY.current - touchStartY.current;

      // Horizontal swipe detected (dx > 60 and dx is dominant)
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        if (deltaX < -60 && nextBoulder) {
          onNavigateBoulder?.(nextBoulder);
        } else if (deltaX > 60 && prevBoulder) {
          onNavigateBoulder?.(prevBoulder);
        }
      } else if (dragOffset > 75) {
        onClose();
      }
    }
    setDragOffset(0);
    setIsDragging(false);
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const allAreas = areas || contextAreas || [];
  const allGyms = contextGyms || [];
  const matchedArea = boulder ? allAreas.find((a) => a.id === boulder.area_id) : undefined;
  const resolvedAreaName = areaName || matchedArea?.name;
  const matchedGym = boulder ? allGyms.find((g) => g.id === boulder.gym_id || g.id === matchedArea?.gym_id) : undefined;
  const resolvedGymName = gymName || matchedGym?.name;
  const resetInfo = getBoulderAgeInfo(boulder?.date_added);

  const boulderComments = useMemo(() => {
    if (!boulder) return [];
    const matching = comments.filter(c => c.boulder_id === boulder.id);
    const unique = Array.from(new Map(matching.map(c => [c.id, c])).values());
    return unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments, boulder?.id]);
  const userAttempt = attempts.find(a => a.user_id === currentUserId);
  const activeColor = climbers.find(c => c.id === currentUserId)?.accent_color || '#3B82F6';

  useEffect(() => {
    if (boulder) {
      setSelectedTargetAreaId(boulder.area_id);
      setRestoreOnMove(boulder.is_archived);
    }
    setIsMoveOpen(false);
    setMoveSuccessMessage(null);
  }, [boulder?.id, isOpen]);

  const availableGymAreas = useMemo(() => {
    if (!boulder) return [];
    return allAreas
      .filter(a => a.gym_id === boulder.gym_id || a.gym_id === matchedArea?.gym_id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allAreas, boulder?.gym_id, matchedArea?.gym_id]);

  const handleConfirmMove = async () => {
    if (!boulder || !selectedTargetAreaId) return;
    const moveFn = onMoveBoulder || contextMoveBoulder;
    if (!moveFn) return;

    setIsMoving(true);
    try {
      await moveFn(boulder.id, selectedTargetAreaId, restoreOnMove);
      const targetArea = allAreas.find(a => a.id === selectedTargetAreaId);
      setMoveSuccessMessage(
        `Moved to ${targetArea?.name || 'target area'}${restoreOnMove && boulder.is_archived ? ' & restored to active wall' : ''}!`
      );
      setIsMoveOpen(false);
      setTimeout(() => {
        setMoveSuccessMessage(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to move boulder:', err);
    } finally {
      setIsMoving(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boulder || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      await onAddComment(boulder.id, newComment.trim());
      setNewComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!isOpen || !boulder) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden sheet-elevated pb-safe overscroll-contain"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile pull/drag handle */}
        <div
          className="w-full py-2.5 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
          title="Drag down or tap to dismiss"
        >
          <div className="w-12 h-1.5 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors" />
        </div>

        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
            <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="md" />
            <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded shrink-0 tabular-nums">
              #{boulder.display_order ?? Math.round(boulder.position_order)}
            </span>
            {resolvedAreaName && (
              <span
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-300 bg-slate-800/90 px-2 sm:px-2.5 py-0.5 rounded-lg border border-slate-700/70 truncate max-w-[120px] sm:max-w-[180px]"
                title={`Wall Sector: ${resolvedAreaName}${resolvedGymName ? ` • ${resolvedGymName}` : ''}`}
              >
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{resolvedAreaName}</span>
              </span>
            )}
          </div>

          {/* Filter navigation strip */}
          {hasFilter && (
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700/80 text-xs shrink-0">
              <button
                type="button"
                onClick={() => prevBoulder && onNavigateBoulder?.(prevBoulder)}
                disabled={!prevBoulder}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                title={prevBoulder ? `Previous Boulder: #${prevBoulder.display_order ?? Math.round(prevBoulder.position_order)} ${prevBoulder.hold_colour} ${prevBoulder.grade}` : 'First boulder in filter'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] text-slate-300 font-bold px-1 select-none">
                {currentIndex + 1} of {totalFiltered}
              </span>
              <button
                type="button"
                onClick={() => nextBoulder && onNavigateBoulder?.(nextBoulder)}
                disabled={!nextBoulder}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                title={nextBoulder ? `Next Boulder: #${nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade}` : 'Last boulder in filter'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleArchive(boulder.id, !boulder.is_archived)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={boulder.is_archived ? 'Restore / Unarchive Climb' : 'Archive Climb'}
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* Archived Climb Banner with Quick Restore & Move Sector options */}
          {boulder.is_archived && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-rose-900/60 text-rose-300 shrink-0 border border-rose-700/50">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-200">This climb is archived</p>
                  <p className="text-[11px] text-rose-300/80 leading-tight">
                    Reset from <span className="font-semibold text-rose-100">{resolvedAreaName}</span>. Move it if it belonged to another sector!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onToggleArchive(boulder.id, false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold active-press transition-all"
                >
                  Restore Here
                </button>
                <button
                  type="button"
                  onClick={() => setIsMoveOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow active-press transition-all flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Move Sector</span>
                </button>
              </div>
            </div>
          )}
          {/* Photo Section */}
          {boulder.image_url && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-72 group">
              <img
                src={boulder.image_url}
                alt={`${boulder.hold_colour} ${boulder.grade}`}
                className="w-full max-h-72 object-contain cursor-pointer transition-transform group-hover:scale-[1.01]"
                onClick={() => setIsLightboxOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/75 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow hover:bg-black transition-all active-press"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </button>
            </div>
          )}

          {/* Quick Log Action Bar */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Your Status</p>
              <div className="mt-0.5">
                {userAttempt?.status === 'flashed' ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Flashed (1 try)
                  </span>
                ) : userAttempt?.status === 'sent' ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Sent ({userAttempt.attempt_count} tries)
                  </span>
                ) : userAttempt?.status === 'attempted' ? (
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Projecting ({userAttempt.attempt_count} tries)
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not logged yet</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {climbers.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    // Open for first crew member who is not current user, or current user
                    const other = climbers.find(c => c.id !== currentUserId) || climbers[0];
                    onQuickLog(boulder, other.id);
                  }}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active-press transition-all flex items-center gap-1.5 shadow"
                  title="Log on behalf of someone in your crew"
                >
                  <Users className="w-3.5 h-3.5" style={{ color: activeColor }} />
                  <span>Log for Crew</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickLog(boulder, currentUserId);
                }}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold active-press transition-all shadow"
              >
                {userAttempt ? 'Update Log' : 'Quick Log'}
              </button>
            </div>
          </div>

          {/* Climb Details */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Climb Info</h3>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 space-y-2.5 text-xs">
              {/* Sector / Wall Area row */}
              <div className="flex flex-col gap-2 pb-2 border-b border-slate-800/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Sector / Wall:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <span className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60 text-slate-100 font-mono text-[11px]">
                        {resolvedAreaName || 'General Wall'}
                      </span>
                      {resolvedGymName && (
                        <span className="text-[11px] text-slate-400 font-normal">
                          • {resolvedGymName}
                        </span>
                      )}
                    </div>
                    {availableGymAreas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setIsMoveOpen(prev => !prev)}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700/80 text-[11px] font-bold active-press transition-colors flex items-center gap-1"
                        title="Move climb to another sector"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>{isMoveOpen ? 'Cancel' : 'Move'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Move Sector Panel */}
                {isMoveOpen && (
                  <div className="mt-1 p-3 rounded-xl bg-slate-900 border border-amber-400/40 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                        Move to Different Sector
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-400">Target Wall Area:</label>
                      <select
                        value={selectedTargetAreaId}
                        onChange={(e) => setSelectedTargetAreaId(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 font-medium outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {availableGymAreas.map(a => (
                          <option key={a.id} value={a.id} disabled={a.id === boulder.area_id}>
                            {a.name} {a.id === boulder.area_id ? '(Current Sector)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {boulder.is_archived && (
                      <label className="flex items-center gap-2 cursor-pointer pt-0.5 select-none">
                        <input
                          type="checkbox"
                          checked={restoreOnMove}
                          onChange={(e) => setRestoreOnMove(e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-0"
                        />
                        <span className="text-xs text-slate-200 font-medium">
                          Restore climb to active wall in target sector
                        </span>
                      </label>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsMoveOpen(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!selectedTargetAreaId || selectedTargetAreaId === boulder.area_id || isMoving}
                        onClick={handleConfirmMove}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow active-press disabled:opacity-40 disabled:pointer-events-none transition-all"
                      >
                        {isMoving ? 'Moving...' : 'Confirm Move'}
                      </button>
                    </div>
                  </div>
                )}

                {moveSuccessMessage && (
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{moveSuccessMessage}</span>
                  </div>
                )}
              </div>

              {boulder.notes && (
                <div>
                  <span className="text-slate-400 font-medium">Notes / Beta:</span>
                  <p className="text-slate-200 mt-0.5 leading-relaxed">{boulder.notes}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-400 pt-1 text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Added {boulder.date_added}
                  </span>
                  {resetInfo.isDueForReset && (
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded"
                      title={`Set ${resetInfo.weeksOld} weeks ago – this climb is due for a reset`}
                    >
                      <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>Reset soon ({resetInfo.weeksOld}w old)</span>
                    </span>
                  )}
                </div>
                {boulder.is_archived && (
                  <span className="text-rose-400 font-semibold uppercase font-mono">Archived</span>
                )}
              </div>
            </div>
          </div>

          {/* Group Climber Statuses */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Group Ticklist</h3>
              <span className="text-[11px] text-slate-500">Tap a climber to log for them</span>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
              <ClimberStatusPills
                climbers={climbers}
                attempts={attempts}
                currentUserId={currentUserId}
                size="md"
                onClimberClick={(climberId) => {
                  onClose();
                  onQuickLog(boulder, climberId);
                }}
              />
            </div>
          </div>

          {/* Beta Discussion / Threaded Comments */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Beta & Discussion ({boulderComments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-2">
              {boulderComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No beta notes yet. Share a foot placement or crux sequence!
                </p>
              ) : (
                boulderComments.map((comment) => {
                  const author = climbers.find(c => c.id === comment.user_id);
                  const isCurrent = comment.user_id === currentUserId;

                  return (
                    <div
                      key={comment.id}
                      style={isCurrent ? {
                        backgroundColor: `${author?.accent_color || activeColor}12`,
                        borderColor: `${author?.accent_color || activeColor}30`
                      } : undefined}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        isCurrent
                          ? ''
                          : 'bg-slate-800/50 border-slate-800'
                      }`}
                    >
                      <ClimberAvatar profile={author || comment.profile} size="xs" />
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className="font-bold"
                            style={{ color: author?.accent_color || (isCurrent ? activeColor : '#e2e8f0') }}
                          >
                            {author?.display_name || comment.profile?.display_name || 'Climber'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">
                              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isCurrent && onDeleteComment && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Delete this comment?')) {
                                    onDeleteComment(comment.id);
                                  }
                                }}
                                className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add beta, sequence advice, or hype..."
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="p-2.5 rounded-xl active-press transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Full-screen Photo Lightbox Modal */}
      {boulder.image_url && (
        <PhotoLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageUrl={boulder.image_url}
          title={`#${boulder.display_order ?? Math.round(boulder.position_order)} • ${boulder.hold_colour} ${boulder.grade}`}
          subtitle={resolvedAreaName}
        />
      )}
    </div>
  );
};
