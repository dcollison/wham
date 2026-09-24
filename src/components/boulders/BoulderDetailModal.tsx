import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Boulder, Attempt, Comment, Profile, GymArea, Grade, GRADES, HOLD_COLORS } from '../../types';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
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
  ArrowRightLeft,
  Pencil,
  AlertTriangle,
  AlertCircle,
  Trophy
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
    deleteBoulder: contextDeleteBoulder
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
        className="w-full max-w-lg bg-surface border-t sm:border border-slate-800/80 rounded-t-[32px] sm:rounded-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden sheet-elevated pb-safe overscroll-contain"
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
          <div className="w-12 h-1.5 bg-slate-700/80 hover:bg-slate-600 rounded-full transition-colors" />
        </div>

        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-surface/95 sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
            <HoldBadge
              color={isEditing ? editHoldColour : boulder.hold_colour}
              grade={isEditing ? editGrade : boulder.grade}
              isComp={isEditing ? editIsComp : boulder.is_comp}
              compNumber={isEditing ? editCompNumber : boulder.comp_number}
              size="md"
            />
            <span
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums ${
                (isEditing ? editIsComp : boulder.is_comp)
                  ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30'
                  : 'text-slate-300 bg-slate-800/90 border border-slate-700/60'
              }`}
            >
              #{(isEditing ? editCompNumber : boulder.comp_number) ?? boulder.display_order ?? Math.round(boulder.position_order)}
            </span>
            {resolvedAreaName && (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-300 bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700/70 truncate max-w-[120px] sm:max-w-[180px]"
                title={`Wall Sector: ${resolvedAreaName}${resolvedGymName ? ` • ${resolvedGymName}` : ''}`}
              >
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{resolvedAreaName}</span>
              </span>
            )}
          </div>

          {/* Filter navigation strip: Tactile Stepper */}
          {hasFilter && (
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-full border border-slate-700/80 text-xs shadow-md shrink-0">
              <button
                type="button"
                onClick={() => prevBoulder && onNavigateBoulder?.(prevBoulder)}
                disabled={!prevBoulder}
                className="px-3 py-1 sm:px-3.5 sm:py-1 rounded-full hover:bg-slate-700 text-slate-200 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors flex items-center gap-1.5 active-press touch-manipulation font-heading font-bold"
                title={prevBoulder ? `Previous Boulder: #${prevBoulder.display_order ?? Math.round(prevBoulder.position_order)} ${prevBoulder.hold_colour} ${prevBoulder.grade}` : 'First boulder in filter'}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                {prevBoulder && <HoldSwatch color={prevBoulder.hold_colour} size="sm" />}
                <span className="hidden sm:inline text-xs">Prev</span>
              </button>
              <span className="font-mono text-xs sm:text-sm text-slate-300 font-bold px-2 select-none whitespace-nowrap">
                {currentIndex + 1} / {totalFiltered}
              </span>
              <button
                type="button"
                onClick={() => nextBoulder && onNavigateBoulder?.(nextBoulder)}
                disabled={!nextBoulder}
                className="px-3 py-1 sm:px-3.5 sm:py-1 rounded-full hover:bg-slate-700 text-slate-200 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors flex items-center gap-1.5 active-press touch-manipulation font-heading font-bold"
                title={nextBoulder ? `Next Boulder: #${nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade}` : 'Last boulder in filter'}
              >
                <span className="hidden sm:inline text-xs">Next</span>
                {nextBoulder && <HoldSwatch color={nextBoulder.hold_colour} size="sm" />}
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
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
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isEditing ? 'Cancel Editing' : 'Edit Climb (Colour, Grade, Beta)'}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleArchive(boulder.id, !boulder.is_archived)}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors active-press"
              title={boulder.is_archived ? 'Restore / Unarchive Climb' : 'Archive Climb'}
            >
              <Archive className="w-4 h-4" />
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
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors active-press"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* Permanent Delete Confirmation Dialog */}
          {isConfirmingDelete && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 flex flex-col gap-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-900 text-rose-200 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white font-mono">
                    Permanently delete climb #{boulder.display_order ?? Math.round(boulder.position_order)}?
                  </h4>
                  <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                    This will permanently remove <span className="font-bold text-white">{boulder.hold_colour} {boulder.grade}</span> from the gym wall, including all logged attempts, flashes, and beta comments.
                  </p>
                  <p className="text-[11px] text-rose-400 font-semibold mt-1">
                    ⚠️ This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-800/60">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold active-press transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteBoulder}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg active-press transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Edit Climb Panel */}
          {isEditing && (
            <div className="bg-slate-900 border-2 border-amber-400/60 rounded-2xl p-4 flex flex-col gap-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Edit Climb #{boulder.display_order ?? Math.round(boulder.position_order)}
                  </span>
                </div>
                <HoldBadge color={editHoldColour} grade={editGrade} size="sm" />
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Hold Colour Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                        style={isSelected ? { borderColor: activeColor, boxShadow: `0 0 0 1px ${activeColor}80` } : undefined}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-all active-press ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow-md'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
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
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Comp Wall Problem (Numbered)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditIsComp((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                      editIsComp
                        ? 'bg-amber-400 text-black shadow'
                        : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {editIsComp ? 'Comp Problem ON' : 'Comp Problem OFF'}
                  </button>
                </div>

                {editIsComp ? (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <div>
                      <span className="text-xs text-slate-300 font-medium block">
                        Problem number on wall:
                      </span>
                      <span className="text-[11px] text-amber-400/90 font-mono">
                        Scored with 10 / 7 / 4 festival points
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
                        className="w-20 bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold text-center text-sm rounded-xl py-1.5 px-2 outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Standard V-graded boulder. Appears in career grade charts.
                  </p>
                )}
              </div>

              {/* Grade Picker (Only when not in comp mode) */}
              {!editIsComp && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Grade
                    </label>
                    <span className="font-mono text-xs font-black" style={{ color: activeColor }}>
                      Selected: {editGrade}
                    </span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {GRADES.map((g) => {
                      const isSelected = editGrade === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setEditGrade(g)}
                          style={isSelected ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                          className={`px-3 py-2 rounded-xl font-mono text-xs font-bold shrink-0 transition-all active-press ${
                            isSelected
                              ? 'shadow-md'
                              : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
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
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
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
                    className="bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 font-medium outline-none focus:border-amber-400 cursor-pointer"
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
                        className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-0"
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
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Notes & Beta Description
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Crux beta, foot placements, or problem description..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl p-3 outline-none focus:border-amber-400 resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons & Danger Zone */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsConfirmingDelete(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={handleSaveEdit}
                    style={{ backgroundColor: activeColor, color: '#000000' }}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl font-heading font-black text-sm shadow-md active-press transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {moveSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs font-medium flex items-center gap-2 shadow animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{moveSuccessMessage}</span>
            </div>
          )}

          {/* Archived Climb Banner with Quick Restore & Edit options */}
          {boulder.is_archived && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-rose-900/60 text-rose-300 shrink-0 border border-rose-700/50">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-200">This climb is archived</p>
                  <p className="text-[11px] text-rose-300/80 leading-tight">
                    Reset from <span className="font-semibold text-rose-100">{resolvedAreaName}</span>. Move it to another sector via Edit Climb!
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
                  onClick={() => {
                    setIsEditing(true);
                    setIsConfirmingDelete(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow active-press transition-all flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit / Move</span>
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

          {/* Quick Log Action Bar: Prominent and tactile */}
          <div className="bg-slate-850/70 border border-slate-800/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Your Status</p>
              <div className="mt-1">
                {userAttempt?.status === 'flashed' ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Flashed (1 try{boulder.is_comp ? ' • 10 pts' : ''})
                  </span>
                ) : userAttempt?.status === 'sent' ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Sent ({userAttempt.attempt_count} {userAttempt.attempt_count === 1 ? 'try' : 'tries'}{boulder.is_comp ? ` • ${userAttempt.attempt_count === 2 ? '7' : '4'} pts` : ''})
                  </span>
                ) : userAttempt?.status === 'attempted' ? (
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Projecting ({userAttempt.attempt_count} {userAttempt.attempt_count === 1 ? 'try' : 'tries'}{boulder.is_comp ? ' • 0 pts' : ''})
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not logged yet</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {nextBoulder && nextBoulder.id !== boulder.id && onNavigateBoulder && (
                <button
                  type="button"
                  onClick={() => onNavigateBoulder(nextBoulder)}
                  className="min-h-[44px] px-4 py-2 rounded-full text-xs font-heading font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 active-press transition-all flex items-center gap-1.5 shadow"
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
                  className="min-h-[44px] px-4 py-2 rounded-full text-xs font-heading font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 active-press transition-all flex items-center gap-1.5 shadow"
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
                className="min-h-[46px] px-6 py-2.5 rounded-full text-xs sm:text-sm font-heading font-black active-press transition-all shadow-md flex items-center gap-1.5"
              >
                <span>{userAttempt ? 'Update Log' : 'Quick Log'}</span>
              </button>
            </div>
          </div>

          {/* Climb Details */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Climb Info</h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setIsConfirmingDelete(false);
                  }}
                  className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-0.5 rounded-full hover:bg-slate-800 transition-colors"
                  title="Edit hold colour, grade, sector, or notes"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Climb</span>
                </button>
              )}
            </div>
            <div className="bg-slate-850/50 rounded-3xl p-4 border border-slate-800 space-y-3 text-xs">
              {/* Sector / Wall Area row */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Sector / Wall:
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <span className="bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700/60 text-slate-100 font-mono text-[11px]">
                    {resolvedAreaName || 'General Wall'}
                  </span>
                  {resolvedGymName && (
                    <span className="text-[11px] text-slate-400 font-normal">
                      • {resolvedGymName}
                    </span>
                  )}
                </div>
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
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-full"
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
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Group Ticklist</h3>
              <span className="text-[11px] text-slate-500">Tap a climber to log for them</span>
            </div>
            <div className="bg-slate-850/50 rounded-3xl p-4 border border-slate-800">
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
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Beta & Discussion ({boulderComments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-2.5">
              {boulderComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 px-1">
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
                      className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
                        isCurrent
                          ? ''
                          : 'bg-slate-850/60 border-slate-800/80'
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
                                className="p-1 rounded-full text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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
                className="flex-1 bg-slate-900 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 text-xs rounded-full px-4 py-2.5 outline-none focus:border-slate-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="p-2.5 rounded-full active-press transition-colors disabled:opacity-40 shadow-sm"
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
