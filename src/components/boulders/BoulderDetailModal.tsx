import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Boulder, Attempt, Comment, Profile, GymArea, Grade, GRADES, HOLD_COLORS, ReviewRating, GradeOpinion } from '../../types';
import { REVIEW_RATING_CONFIG, GRADE_OPINION_CONFIG, REVIEW_RATING_LIST, calcBoulderReviewSummary, normalizeRating, normalizeGradeOpinion } from '../../lib/reviews';
import { BoulderReviewPicker } from './BoulderReviewPicker';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
import { ClimberStatusPills } from './ClimberStatusPills';
import { ClimberAvatar } from '../ClimberAvatar';
import { getBoulderAgeInfo } from '../../lib/resetStatus';
import { isWinterSeriesBoulder } from '../../lib/winterSeries';
import { getCompProblemPoints } from '../../lib/compWallScoring';
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
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  ArrowRightLeft,
  Pencil,
  AlertTriangle,
  AlertCircle,
  Trophy,
  Star,
  Scale,
  Loader2
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
  onUpdateBoulder?: (boulderId: string, updates: {
    holdColour?: string;
    grade?: Grade;
    notes?: string | null;
    isComp?: boolean;
    compNumber?: number;
  }) => Promise<void>;
  onDeleteBoulder?: (boulderId: string) => Promise<void>;
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
  onUpdateBoulder,
  onDeleteBoulder,
  filteredBoulders,
  onNavigateBoulder
}) => {
  const {
    areas: contextAreas,
    gyms: contextGyms,
    moveBoulder: contextMoveBoulder,
    updateBoulder: contextUpdateBoulder,
    deleteBoulder: contextDeleteBoulder,
    reviews,
    saveReview,
    deleteReview
  } = useGym();
  const [newComment, setNewComment] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [moveSuccessMessage, setMoveSuccessMessage] = useState<string | null>(null);

  // Edit Climb state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editHoldColour, setEditHoldColour] = useState<string>('');
  const [editGrade, setEditGrade] = useState<Grade>('VB');
  const [editAreaId, setEditAreaId] = useState<string>('');
  const [editRestoreOnMove, setEditRestoreOnMove] = useState<boolean>(true);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editIsComp, setEditIsComp] = useState<boolean>(false);
  const [editCompNumber, setEditCompNumber] = useState<number>(1);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Climb confirmation state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

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

  // Reviews data & summary for this boulder
  const boulderReviews = useMemo(() => {
    if (!boulder) return [];
    return reviews.filter(r => r.boulder_id === boulder.id);
  }, [boulder?.id, reviews]);

  const reviewSummary = useMemo(() => {
    return calcBoulderReviewSummary(boulderReviews);
  }, [boulderReviews]);

  const userReview = useMemo(() => {
    if (!currentUserId || !boulder) return undefined;
    return boulderReviews.find(r => r.user_id === currentUserId);
  }, [boulderReviews, currentUserId, boulder?.id]);

  const handleRatingChange = async (newRating: ReviewRating | null) => {
    if (!boulder || !currentUserId || isSavingReview) return;
    setIsSavingReview(true);
    try {
      if (newRating === null && !userReview?.grade_opinion && !userReview?.comment) {
        await deleteReview(boulder.id, currentUserId);
      } else {
        await saveReview({
          boulderId: boulder.id,
          userId: currentUserId,
          rating: newRating,
          gradeOpinion: userReview?.grade_opinion,
          comment: userReview?.comment
        });
      }
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleGradeOpinionChange = async (newGrade: GradeOpinion | null) => {
    if (!boulder || !currentUserId || isSavingReview) return;
    setIsSavingReview(true);
    try {
      if (newGrade === null && !userReview?.rating && !userReview?.comment) {
        await deleteReview(boulder.id, currentUserId);
      } else {
        await saveReview({
          boulderId: boulder.id,
          userId: currentUserId,
          rating: userReview?.rating,
          gradeOpinion: newGrade,
          comment: userReview?.comment
        });
      }
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleClearReview = async () => {
    if (!boulder || !currentUserId || isSavingReview) return;
    setIsSavingReview(true);
    try {
      await deleteReview(boulder.id, currentUserId);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleToggleArchive = async (archive: boolean) => {
    if (!boulder || isArchiving) return;
    setIsArchiving(true);
    try {
      await onToggleArchive(boulder.id, archive);
    } finally {
      setIsArchiving(false);
    }
  };

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
  const userAttempt = attempts.find(
    a => a.user_id === currentUserId && (a.status as string) !== 'untried'
  );
  const activeColor = climbers.find(c => c.id === currentUserId)?.accent_color || '#F59E0B';

  useEffect(() => {
    if (boulder) {
      setEditAreaId(boulder.area_id);
      setEditRestoreOnMove(boulder.is_archived);
      setEditHoldColour(boulder.hold_colour);
      setEditGrade(boulder.grade);
      setEditNotes(boulder.notes || '');
      setEditIsComp(Boolean(boulder.is_comp || matchedArea?.is_comp_wall));
      setEditCompNumber(boulder.comp_number ?? (boulder.display_order ?? Math.round(boulder.position_order) ?? 1));
    }
    setIsEditing(false);
    setIsConfirmingDelete(false);
    setEditError(null);
    setMoveSuccessMessage(null);
  }, [boulder?.id, isOpen]);

  useEffect(() => {
    if (boulder && !isEditing) {
      setEditAreaId(boulder.area_id);
      setEditRestoreOnMove(boulder.is_archived);
      setEditHoldColour(boulder.hold_colour);
      setEditGrade(boulder.grade);
      setEditNotes(boulder.notes || '');
      setEditIsComp(Boolean(boulder.is_comp || matchedArea?.is_comp_wall));
      setEditCompNumber(boulder.comp_number ?? (boulder.display_order ?? Math.round(boulder.position_order) ?? 1));
    }
  }, [boulder?.area_id, boulder?.is_archived, boulder?.hold_colour, boulder?.grade, boulder?.notes, boulder?.is_comp, boulder?.comp_number, isEditing, matchedArea?.is_comp_wall]);

  const availableGymAreas = useMemo(() => {
    if (!boulder) return [];
    return allAreas
      .filter(a => a.gym_id === boulder.gym_id || a.gym_id === matchedArea?.gym_id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allAreas, boulder?.gym_id, matchedArea?.gym_id]);

  const handleSaveEdit = async () => {
    if (!boulder) return;
    const updateFn = onUpdateBoulder || contextUpdateBoulder;
    const moveFn = onMoveBoulder || contextMoveBoulder;
    if (!updateFn) return;

    setIsSavingEdit(true);
    setEditError(null);
    try {
      const areaChanged = editAreaId && editAreaId !== boulder.area_id;
      if (areaChanged && moveFn) {
        await moveFn(boulder.id, editAreaId, editRestoreOnMove);
        const targetArea = allAreas.find(a => a.id === editAreaId);
        setMoveSuccessMessage(
          `Moved to ${targetArea?.name || 'target sector'}${editRestoreOnMove && boulder.is_archived ? ' & restored to active wall' : ''}!`
        );
        setTimeout(() => {
          setMoveSuccessMessage(null);
        }, 3500);
      }

      await updateFn(boulder.id, {
        holdColour: editHoldColour,
        grade: editGrade,
        notes: editNotes.trim() || null,
        isComp: editIsComp,
        compNumber: editIsComp ? editCompNumber : undefined
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update boulder:', err);
      setEditError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteBoulder = async () => {
    if (!boulder) return;
    const deleteFn = onDeleteBoulder || contextDeleteBoulder;
    if (!deleteFn) return;

    setIsDeleting(true);
    try {
      await deleteFn(boulder.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete boulder:', err);
      alert('Failed to delete climb: ' + (err?.message || 'Unknown error'));
      setIsDeleting(false);
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
        className="w-full max-w-lg ds-sheet shadow-2xl flex flex-col max-h-[92vh] overflow-hidden pb-safe overscroll-contain animate-in slide-in-from-bottom-6"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile pull/drag handle */}
        <div
          className="w-full py-2 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
          title="Drag down or tap to dismiss"
        >
          <div className="w-12 h-1.5 bg-surface-higher hover:bg-white/25 rounded-full transition-colors" />
        </div>

        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-surface/95 sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
            <HoldBadge
              color={isEditing ? editHoldColour : boulder.hold_colour}
              grade={isEditing ? editGrade : boulder.grade}
              isComp={isEditing ? editIsComp : boulder.is_comp}
              compNumber={isEditing ? editCompNumber : boulder.comp_number}
              size="md"
            />
            {!(isEditing ? editIsComp && editCompNumber != null : boulder.is_comp && boulder.comp_number != null) && (
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums text-slate-200 bg-surface-elevated border border-white/[0.08]">
                #{boulder.display_order ?? Math.round(boulder.position_order)}
              </span>
            )}
            {resolvedAreaName && (
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 truncate max-w-[130px] sm:max-w-[180px]"
                title={`Wall Sector: ${resolvedAreaName}${resolvedGymName ? ` • ${resolvedGymName}` : ''}`}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{resolvedAreaName}</span>
              </span>
            )}
          </div>

          {/* Filter navigation strip: Tactile Stepper */}
          {hasFilter && (
            <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-full border border-white/[0.08] text-xs shrink-0">
              <button
                type="button"
                onClick={() => prevBoulder && onNavigateBoulder?.(prevBoulder)}
                disabled={!prevBoulder}
                className="px-2.5 py-1 rounded-full hover:bg-surface-high text-slate-200 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors flex items-center gap-1.5 active-press touch-manipulation font-bold"
                title={prevBoulder ? `Previous Boulder: #${prevBoulder.display_order ?? Math.round(prevBoulder.position_order)} ${prevBoulder.hold_colour} ${prevBoulder.grade}` : 'First boulder in filter'}
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                {prevBoulder && <HoldSwatch color={prevBoulder.hold_colour} size="sm" />}
                <span className="hidden sm:inline text-xs">Prev</span>
              </button>
              <span className="font-mono tabular-nums text-xs sm:text-sm text-slate-200 font-bold px-2 select-none whitespace-nowrap">
                {currentIndex + 1}/{totalFiltered}
              </span>
              <button
                type="button"
                onClick={() => nextBoulder && onNavigateBoulder?.(nextBoulder)}
                disabled={!nextBoulder}
                className="px-2.5 py-1 rounded-full hover:bg-surface-high text-slate-200 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors flex items-center gap-1.5 active-press touch-manipulation font-bold"
                title={nextBoulder ? `Next Boulder: #${nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade}` : 'Last boulder in filter'}
              >
                <span className="hidden sm:inline text-xs">Next</span>
                {nextBoulder && <HoldSwatch color={nextBoulder.hold_colour} size="sm" />}
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsEditing(prev => !prev);
                setIsConfirmingDelete(false);
              }}
              className={`p-2 rounded-full transition-colors active-press ${
                isEditing
                  ? 'bg-amber-400 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-surface-high'
              }`}
              title={isEditing ? 'Cancel Editing' : 'Edit Climb (Colour, Grade, Beta)'}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isArchiving}
              onClick={() => handleToggleArchive(!boulder.is_archived)}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-surface-high transition-colors active-press disabled:opacity-50"
              title={boulder.is_archived ? 'Restore / Unarchive Climb' : 'Archive Climb'}
            >
              {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmingDelete(true);
                setIsEditing(false);
              }}
              className="p-2 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors active-press"
              title="Permanently Delete Climb"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-surface-high transition-colors active-press"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* Permanent Delete Confirmation Dialog */}
          {isConfirmingDelete && (
            <div className="p-4 rounded-lg bg-rose-950/80 border border-rose-500/70 text-rose-200 flex flex-col gap-3 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-rose-900 text-rose-200 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white tabular-nums">
                    Permanently delete climb #{boulder.display_order ?? Math.round(boulder.position_order)}?
                  </h4>
                  <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                    This will permanently remove <span className="font-bold text-white">{boulder.hold_colour} {boulder.grade}</span> from the gym wall, including all logged attempts, flashes, and beta comments.
                  </p>
                  <p className="text-[11px] text-rose-300 font-semibold mt-1">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-800/60">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3.5 py-2 rounded-md bg-surface-elevated hover:bg-surface-high text-slate-200 text-xs font-semibold active-press transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteBoulder}
                  className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs active-press transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Edit Climb Panel */}
          {isEditing && (
            <div className="bg-surface-elevated border border-amber-400/60 rounded-lg p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white tabular-nums">
                    Edit Climb #{boulder.display_order ?? Math.round(boulder.position_order)}
                  </span>
                </div>
                <HoldBadge color={editHoldColour} grade={editGrade} size="sm" />
              </div>

              {editError && (
                <div className="p-3 rounded-md bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Hold Colour Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label">
                  Hold Colour
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {Object.entries(HOLD_COLORS).map(([colorName]) => {
                    const isSelected = editHoldColour === colorName;
                    return (
                      <button
                        key={colorName}
                        type="button"
                        onClick={() => setEditHoldColour(colorName)}
                        style={isSelected ? { borderColor: activeColor } : undefined}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border text-xs font-semibold transition-all active-press ${
                          isSelected
                            ? 'bg-surface-high text-white'
                            : 'border-white/[0.08] bg-carbon text-slate-300 hover:border-white/[0.16]'
                        }`}
                      >
                        <HoldSwatch color={colorName} size="sm" />
                        <span className="truncate">{colorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comp Wall Problem Toggle & Number Picker */}
              <div className="flex flex-col gap-2 p-3 rounded-md bg-carbon border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Comp Wall Problem (Numbered)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditIsComp((prev) => !prev)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      editIsComp
                        ? 'bg-amber-400 text-black'
                        : 'bg-surface-elevated text-slate-300 hover:text-white border border-white/[0.1]'
                    }`}
                  >
                    {editIsComp ? 'On' : 'Off'}
                  </button>
                </div>

                {editIsComp ? (
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
                    <div>
                      <span className="text-xs text-slate-300 font-medium block">
                        Problem number on wall:
                      </span>
                      <span className="text-[11px] text-amber-300 tabular-nums">
                        {isWinterSeriesBoulder({ id: boulder.id, area_id: editAreaId || boulder.area_id })
                          ? '3 / 2 / 1 comp points (Flash / Top / Zone)'
                          : '10 / 7 / 4 festival points'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-base font-bold text-amber-400">#</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={editCompNumber || ''}
                        onChange={(e) => setEditCompNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-20 ds-input font-mono tabular-nums font-bold text-center text-sm rounded-md py-1.5 px-2 focus:border-amber-400"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Standard V-graded boulder. Appears in career grade charts.
                  </p>
                )}
              </div>

              {/* Grade Picker (Only when not in comp mode) */}
              {!editIsComp && (
                <div className="flex flex-col gap-1.5">
                  <label className="ds-label">
                    Grade
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {GRADES.map((g) => {
                      const isSelected = editGrade === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setEditGrade(g)}
                          style={isSelected ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                          className={`px-3 py-2 rounded-md font-mono tabular-nums text-xs font-bold shrink-0 transition-all active-press ${
                            isSelected
                              ? 'font-extrabold'
                              : 'bg-carbon text-slate-300 hover:bg-surface-high border border-white/[0.08]'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sector / Wall Area Dropdown */}
              {availableGymAreas.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="ds-label flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Sector / Wall Area
                    </label>
                    {editAreaId !== boulder.area_id && (
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3" />
                        Will move on save
                      </span>
                    )}
                  </div>
                  <select
                    value={editAreaId}
                    onChange={(e) => setEditAreaId(e.target.value)}
                    className="ds-input text-xs rounded-md p-2.5 font-medium cursor-pointer"
                  >
                    {availableGymAreas.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.id === boulder.area_id ? '(Current Sector)' : ''}
                      </option>
                    ))}
                  </select>
                  {boulder.is_archived && editAreaId !== boulder.area_id && (
                    <label className="flex items-center gap-2 cursor-pointer pt-0.5 select-none">
                      <input
                        type="checkbox"
                        checked={editRestoreOnMove}
                        onChange={(e) => setEditRestoreOnMove(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-carbon border-white/[0.2] text-amber-400 focus:ring-0"
                      />
                      <span className="text-xs text-slate-300 font-medium">
                        Restore climb to active wall in target sector
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Notes / Beta Input */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label">
                  Beta Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Crux beta, foot placements, or problem description..."
                  rows={2}
                  className="ds-input text-xs rounded-md p-3 resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons & Danger Zone */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsConfirmingDelete(true);
                  }}
                  className="px-2.5 py-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Climb</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => {
                      setIsEditing(false);
                      setEditHoldColour(boulder.hold_colour);
                      setEditGrade(boulder.grade);
                      setEditAreaId(boulder.area_id);
                      setEditRestoreOnMove(boulder.is_archived);
                      setEditNotes(boulder.notes || '');
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-surface-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={handleSaveEdit}
                    style={{ backgroundColor: activeColor, color: '#000000' }}
                    className="min-h-[44px] px-5 py-2.5 rounded-md font-black text-sm active-press transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
                    <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {moveSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5] shrink-0" />
              <span>{moveSuccessMessage}</span>
            </div>
          )}

          {/* Archived Climb Banner with Quick Restore & Edit options */}
          {boulder.is_archived && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-md bg-rose-900/60 text-rose-300 shrink-0 border border-rose-700/50">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-200">This climb is archived</p>
                  <p className="text-[11px] text-rose-200 leading-tight">
                    Reset from <span className="font-semibold text-white">{resolvedAreaName}</span>. Move it to another sector via Edit Climb.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={isArchiving}
                  onClick={() => handleToggleArchive(false)}
                  className="px-3 py-1.5 rounded-md bg-carbon hover:bg-surface-high text-slate-200 border border-white/[0.1] text-xs font-semibold active-press transition-all inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isArchiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isArchiving ? 'Restoring...' : 'Restore Here'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setIsConfirmingDelete(false);
                  }}
                  className="px-3 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs active-press transition-all flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit / Move</span>
                </button>
              </div>
            </div>
          )}
          {/* Photo Section */}
          {boulder.image_url && (
            <div className="relative rounded-lg overflow-hidden bg-carbon border border-white/[0.08] max-h-72 group">
              <img
                src={boulder.image_url}
                alt={`${boulder.hold_colour} ${boulder.grade}`}
                className="w-full max-h-72 object-contain cursor-pointer transition-transform group-hover:scale-[1.01]"
                onClick={() => setIsLightboxOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-md bg-black/75 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1.5 hover:bg-black transition-all active-press"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </button>
            </div>
          )}

          {/* Quick Log Action Bar: Prominent and tactile */}
          <div className="bg-surface-elevated border border-white/[0.08] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {userAttempt?.status === 'flashed' ? (
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 tabular-nums">
                  <Zap className="w-3.5 h-3.5 fill-current" /> Flashed (1 try{isWinterSeriesBoulder(boulder) ? ' • 3 pts' : (boulder.is_comp && boulder.comp_number != null) ? ` • ${getCompProblemPoints(userAttempt.status, userAttempt.attempt_count)} pts` : ''})
                </span>
              ) : userAttempt?.status === 'sent' ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 tabular-nums">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" /> {isWinterSeriesBoulder(boulder) ? `Topped (${userAttempt.attempt_count} tries • 2 pts)` : `Sent (${userAttempt.attempt_count} ${userAttempt.attempt_count === 1 ? 'try' : 'tries'}${(boulder.is_comp && boulder.comp_number != null) ? ` • ${getCompProblemPoints(userAttempt.status, userAttempt.attempt_count)} pts` : ''})`}
                </span>
              ) : userAttempt?.status === 'attempted' ? (
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" /> {isWinterSeriesBoulder(boulder) ? 'Zone reached (1 pt)' : `Projecting (${userAttempt.attempt_count} ${userAttempt.attempt_count === 1 ? 'try' : 'tries'}${(boulder.is_comp && boulder.comp_number != null) ? ' • 0 pts' : ''})`}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Not logged yet</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {nextBoulder && nextBoulder.id !== boulder.id && onNavigateBoulder && (
                <button
                  type="button"
                  onClick={() => onNavigateBoulder(nextBoulder)}
                  className="min-h-[44px] px-4 py-2 rounded-full text-xs font-bold bg-surface-high hover:bg-surface-higher text-slate-200 border border-white/[0.1] active-press transition-all flex items-center gap-1.5"
                  title={`Next in filter: #${nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade}`}
                >
                  <span>Next Climb</span>
                  <HoldSwatch color={nextBoulder.hold_colour} size="xs" />
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {climbers.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    // Open for first crew member who is not current user, or current user
                    const other = climbers.find(c => c.id !== currentUserId) || climbers[0];
                    onQuickLog(boulder, other.id);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-full text-xs font-bold bg-surface-high hover:bg-surface-higher text-slate-200 border border-white/[0.1] active-press transition-all flex items-center gap-1.5"
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
                className="min-h-[46px] px-6 py-2.5 rounded-full text-xs sm:text-sm font-black active-press transition-all flex items-center gap-1.5"
              >
                <span>{userAttempt ? 'Update Log' : 'Quick Log'}</span>
              </button>
            </div>
          </div>

          {/* Climb Details */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="ds-label">Details</h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setIsConfirmingDelete(false);
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-0.5 rounded-full hover:bg-surface-high transition-colors"
                  title="Edit hold colour, grade, sector, or notes"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Climb</span>
                </button>
              )}
            </div>
            <div className="ds-well rounded-lg p-3.5 space-y-2.5 text-xs">
              {boulder.notes && (
                <div>
                  <span className="text-slate-400 font-medium">Beta Notes</span>
                  <p className="text-slate-200 mt-1 leading-relaxed">{boulder.notes}</p>
                </div>
              )}
              <div className={`flex items-center justify-between text-slate-400 text-xs ${boulder.notes ? 'pt-2 border-t border-white/[0.06]' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="w-3.5 h-3.5" /> Added {boulder.date_added}
                  </span>
                  {resolvedGymName && (
                    <span className="text-slate-400">
                      • {resolvedGymName}
                    </span>
                  )}
                  {resetInfo.isDueForReset && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 tabular-nums"
                      title={`Set ${resetInfo.weeksOld} weeks ago – this climb is due for a reset`}
                    >
                      <Clock className="w-3 h-3 text-amber-400 stroke-[2.5] shrink-0" />
                      <span>Reset soon ({resetInfo.weeksOld}w)</span>
                    </span>
                  )}
                </div>
                {boulder.is_archived && (
                  <span className="text-rose-400 font-semibold uppercase">Archived</span>
                )}
              </div>
            </div>
          </div>

          {/* Group Climber Statuses */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="ds-label">Group Ticklist</h3>
            </div>
            <div className="px-1">
              <ClimberStatusPills
                climbers={climbers}
                attempts={attempts}
                currentUserId={currentUserId}
                size="md"
                isWinterSeries={isWinterSeriesBoulder(boulder)}
                onClimberClick={(climberId) => {
                  onClose();
                  onQuickLog(boulder, climberId);
                }}
              />
            </div>
          </div>

          {/* Section: Crew Reviews & Consensus */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="ds-label flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums">Crew Reviews ({boulderReviews.length})</span>
              </h3>
              {reviewSummary.positivePercentage !== null && (
                <span className="text-xs font-bold text-emerald-300 tabular-nums">
                  {reviewSummary.positivePercentage}% Good
                </span>
              )}
            </div>

            <div className="ds-well rounded-lg p-3 flex flex-col gap-3">
              {/* Consensus Highlights Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Grade Consensus */}
                <div className="p-2.5 rounded-md bg-carbon border border-white/[0.07] flex items-center gap-3">
                  {reviewSummary.consensusGrade ? (() => {
                    const gradeCfg = GRADE_OPINION_CONFIG[reviewSummary.consensusGrade];
                    const GradeIcon = gradeCfg.icon;
                    return (
                      <div className={`w-8 h-8 rounded flex items-center justify-center border shrink-0 ${gradeCfg.badgeBg} ${gradeCfg.badgeBorder} ${gradeCfg.badgeText}`}>
                        <GradeIcon className="w-4 h-4" />
                      </div>
                    );
                  })() : (
                    <div className="w-8 h-8 rounded flex items-center justify-center border border-white/[0.08] bg-surface text-slate-400 shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Grade Consensus
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {reviewSummary.consensusGrade ? (
                        <span className={GRADE_OPINION_CONFIG[reviewSummary.consensusGrade].activeText}>
                          {GRADE_OPINION_CONFIG[reviewSummary.consensusGrade].label}
                          <span className="text-slate-400 font-mono tabular-nums text-[11px] font-normal ml-1">
                            ({reviewSummary.consensusCount}/{reviewSummary.totalGradeOpinions})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Pending votes</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Quality Breakdown (Good / Okay / Rough) */}
                <div className="p-2.5 rounded-md bg-carbon border border-white/[0.07] flex items-center justify-around">
                  {REVIEW_RATING_LIST.map((r) => {
                    const count = reviewSummary.ratingCounts[r.value];
                    return (
                      <div key={r.value} className="flex flex-col items-center gap-0.5">
                        <span className={`text-sm font-black select-none ${count > 0 ? r.activeText : 'text-slate-400'}`}>
                          {r.kaomoji}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{r.shortLabel}</span>
                        <span className={`text-xs font-mono tabular-nums font-bold ${count > 0 ? r.activeText : 'text-slate-400'}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Quick Vote for current user */}
              {currentUserId && (
                <div className="bg-carbon rounded-md p-3 border border-white/[0.07]">
                  <BoulderReviewPicker
                    rating={userReview?.rating}
                    gradeOpinion={userReview?.grade_opinion}
                    onRatingChange={handleRatingChange}
                    onGradeOpinionChange={handleGradeOpinionChange}
                    onClear={handleClearReview}
                    title={isSavingReview ? 'Saving Review...' : 'Your Review'}
                    clearLabel="Clear"
                    size="sm"
                    showHeaders={false}
                  />
                </div>
              )}

              {/* Individual crew review tags */}
              {boulderReviews.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {boulderReviews.map((rev) => {
                    const author = climbers.find(c => c.id === rev.user_id) || rev.profile;
                    const normR = normalizeRating(rev.rating);
                    const normG = normalizeGradeOpinion(rev.grade_opinion);
                    const ratingCfg = normR ? REVIEW_RATING_CONFIG[normR] : null;
                    const gradeCfg = normG ? GRADE_OPINION_CONFIG[normG] : null;
                    const GradeIcon = gradeCfg?.icon;

                    return (
                      <div
                        key={rev.id}
                        className="p-2.5 rounded-md bg-carbon border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ClimberAvatar profile={author} size="xs" />
                          <span className="font-bold text-slate-200 truncate">
                            {author?.display_name || 'Climber'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {ratingCfg && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${ratingCfg.badgeBg} ${ratingCfg.badgeBorder} ${ratingCfg.badgeText}`}>
                              <span className="font-bold">{ratingCfg.kaomoji}</span>
                              <span>{ratingCfg.label}</span>
                            </span>
                          )}
                          {gradeCfg && GradeIcon && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${gradeCfg.badgeBg} ${gradeCfg.badgeBorder} ${gradeCfg.badgeText}`}>
                              <GradeIcon className="w-3 h-3" />
                              <span>{gradeCfg.label}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* General Discussion / Threaded Comments */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="ds-label flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="tabular-nums">Discussion ({boulderComments.length})</span>
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-2.5">
              {boulderComments.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 px-1">
                  No comments yet.
                </p>
              ) : (
                boulderComments.map((comment) => {
                  const author = climbers.find(c => c.id === comment.user_id);
                  const isCurrent = comment.user_id === currentUserId;
                  const isDeletingComment = deletingCommentId === comment.id;

                  return (
                    <div
                      key={comment.id}
                      style={isCurrent ? {
                        backgroundColor: `${author?.accent_color || activeColor}12`,
                        borderColor: `${author?.accent_color || activeColor}30`
                      } : undefined}
                      className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
                        isCurrent
                          ? ''
                          : 'bg-surface-elevated border-white/[0.07]'
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
                            <span className="text-slate-400 tabular-nums">
                              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isCurrent && onDeleteComment && (
                              <button
                                type="button"
                                disabled={isDeletingComment}
                                onClick={async () => {
                                  if (window.confirm('Delete this comment?')) {
                                    setDeletingCommentId(comment.id);
                                    try {
                                      await onDeleteComment(comment.id);
                                    } finally {
                                      setDeletingCommentId(null);
                                    }
                                  }
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-surface-high transition-colors disabled:opacity-50"
                                title="Delete comment"
                              >
                                {isDeletingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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
                placeholder="Write a comment or beta note..."
                className="flex-1 ds-input text-xs rounded-full px-4 py-2.5"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="p-2.5 rounded-full active-press transition-colors disabled:opacity-40 shadow-sm flex items-center justify-center"
                aria-label="Send comment"
              >
                {submittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 -translate-x-[0.5px] translate-y-[0.5px]" />
                )}
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
