import React, { useState, useEffect, useRef } from 'react';
import { Boulder, Attempt, AttemptStatus, determineAttemptStatus, Profile, GymArea, ReviewRating, GradeOpinion } from '../../types';
import { normalizeRating, normalizeGradeOpinion } from '../../lib/reviews';
import { BoulderReviewPicker } from './BoulderReviewPicker';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
import { ClimberAvatar } from '../ClimberAvatar';
import { isWinterSeriesBoulder } from '../../lib/winterSeries';
import {
  Zap,
  Check,
  Clock,
  X,
  Trash2,
  Plus,
  Minus,
  Calendar,
  Users,
  CheckCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileText,
  Trophy,
  Camera,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { useGym } from '../../context/GymContext';

interface QuickLogModalProps {
  boulder: Boulder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: { boulderId: string; status: AttemptStatus; attemptCount: number; loggedAt?: string; userId?: string }) => Promise<void>;
  onDelete?: (boulderId: string, userId?: string) => Promise<void>;
  onOpenDetails?: (boulder: Boulder) => void;
  climbers: Profile[];
  currentUserId?: string;
  initialTargetUserId?: string;
  attempts: Attempt[];
  filteredBoulders?: Boulder[];
  onNavigateBoulder?: (boulder: Boulder) => void;
  areaName?: string;
  areas?: GymArea[];
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  boulder,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onOpenDetails,
  climbers,
  currentUserId,
  initialTargetUserId,
  attempts,
  filteredBoulders,
  onNavigateBoulder,
  areaName,
  areas
}) => {
  const { areas: contextAreas, comments, reviews, saveReview, deleteReview } = useGym();
  const getTodayIsoDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getLocalDateFromIso = (isoString?: string): string => {
    if (!isoString) return getTodayIsoDate();
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return getTodayIsoDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Active target climber for this log
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return initialTargetUserId || currentUserId || climbers[0]?.id || '';
  });

  const [isSent, setIsSent] = useState<boolean>(true);
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [logDate, setLogDate] = useState<string>(getTodayIsoDate());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [justSavedName, setJustSavedName] = useState<string | null>(null);

  // Review states for this climb
  const [selectedRating, setSelectedRating] = useState<ReviewRating | null>(null);
  const [selectedGradeOpinion, setSelectedGradeOpinion] = useState<GradeOpinion | null>(null);

  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  // Sync selected climber when modal opens or initial target changes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(initialTargetUserId || currentUserId || climbers[0]?.id || '');
      setJustSavedName(null);
      setDragOffset(0);
      setIsDragging(false);
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
    }
  }, [isOpen, initialTargetUserId, currentUserId]);

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

  const selectedClimber = climbers.find(c => c.id === selectedUserId) || climbers[0];
  const selectedClimberColor = selectedClimber?.accent_color || '#F59E0B';
  const isLoggingForOther = Boolean(currentUserId && selectedClimber && selectedClimber.id !== currentUserId);

  // Selected climber's existing attempt on this boulder
  const selectedAttempt = boulder && selectedClimber
    ? attempts.find(
        a =>
          a.boulder_id === boulder.id &&
          a.user_id === selectedClimber.id &&
          (a.status as string) !== 'untried'
      )
    : undefined;

  // Selected climber's existing review on this boulder
  const selectedReview = boulder && selectedClimber
    ? reviews.find(r => r.boulder_id === boulder.id && r.user_id === selectedClimber.id)
    : undefined;

  // Pre-fill state whenever the selected climber or boulder changes
  useEffect(() => {
    if (selectedAttempt) {
      setIsSent(selectedAttempt.status === 'flashed' || selectedAttempt.status === 'sent');
      setAttemptCount(Math.max(1, selectedAttempt.attempt_count || 1));
      // If it was already sent/flashed in the past, display the date it was sent.
      // If it was an unfinished project ('attempted') from a past session, default session date to today
      // because the climber is continuing or sending the project in their current gym session.
      if (selectedAttempt.status === 'flashed' || selectedAttempt.status === 'sent') {
        setLogDate(getLocalDateFromIso(selectedAttempt.logged_at));
      } else {
        setLogDate(getTodayIsoDate());
      }
    } else {
      // Default for a fresh log: sent on 1st try (Flash) on today's date
      setIsSent(true);
      setAttemptCount(1);
      setLogDate(getTodayIsoDate());
    }
    setShowDatePicker(false);
  }, [selectedUserId, selectedAttempt, boulder, isOpen]);

  // Pre-fill review state
  useEffect(() => {
    if (selectedReview) {
      setSelectedRating(normalizeRating(selectedReview.rating));
      setSelectedGradeOpinion(normalizeGradeOpinion(selectedReview.grade_opinion));
    } else {
      setSelectedRating(null);
      setSelectedGradeOpinion(null);
    }
  }, [selectedUserId, selectedReview, boulder?.id, isOpen]);

  if (!isOpen || !boulder) return null;

  const allAreas = areas || contextAreas || [];
  const matchedArea = allAreas.find((a) => a.id === boulder.area_id);
  const resolvedAreaName = areaName || matchedArea?.name;
  const boulderCommentsCount = boulder ? (comments || []).filter(c => c.boulder_id === boulder.id).length : 0;

  // Filter-aware navigation calculations
  const currentIndex = boulder && filteredBoulders ? filteredBoulders.findIndex(b => b.id === boulder.id) : -1;
  const totalFiltered = filteredBoulders ? filteredBoulders.length : 0;
  const hasFilter = currentIndex !== -1 && totalFiltered > 0;

  // Direct adjacent or wrap-around for smooth wall circuit progression
  const directPrev = hasFilter && currentIndex > 0 ? filteredBoulders![currentIndex - 1] : null;
  const directNext = hasFilter && currentIndex < totalFiltered - 1 ? filteredBoulders![currentIndex + 1] : null;

  const prevBoulder = directPrev || (totalFiltered > 1 ? filteredBoulders![totalFiltered - 1] : null);
  const nextBoulder = directNext || (totalFiltered > 1 ? filteredBoulders![0] : null);

  // Automatically determine if it is a flash, sent, or projecting from isSent + attemptCount
  const computedStatus: AttemptStatus = determineAttemptStatus(isSent, attemptCount);

  const handleIncrement = () => {
    setAttemptCount((prev) => Math.min(prev + 1, 99));
  };

  const handleDecrement = () => {
    setAttemptCount((prev) => Math.max(prev - 1, 1));
  };

  const computeLoggedAt = (): string => {
    const todayStr = getTodayIsoDate();
    if (logDate === todayStr) {
      // Real-time log today at the gym: record the exact current timestamp
      return new Date().toISOString();
    }
    if (selectedAttempt?.logged_at && getLocalDateFromIso(selectedAttempt.logged_at) === logDate) {
      // Editing an existing log on that specific past day: retain original time
      return selectedAttempt.logged_at;
    }
    // Explicitly logging for a past date (e.g. yesterday or custom past session):
    // Set to 19:00 in the user's LOCAL time (not UTC 'Z'), ensuring the date doesn't drift across timezones
    const [y, m, d] = logDate.split('-').map(Number);
    const targetDate = new Date(y, (m || 1) - 1, d || 1, 19, 0, 0);
    return isNaN(targetDate.getTime()) ? new Date().toISOString() : targetDate.toISOString();
  };

  const handleSaveAttempt = async (closeAfter: boolean = true) => {
    if (!boulder || !selectedClimber) return;
    setSaving(true);
    try {
      // Execute save and review update with a safety timeout to guarantee zero modal freeze
      await Promise.race([
        (async () => {
          await onSave({
            boulderId: boulder.id,
            status: computedStatus,
            attemptCount,
            loggedAt: computeLoggedAt(),
            userId: selectedClimber.id
          });

          // Save/update review if user provided rating or grade feel
          if (selectedRating !== null || selectedGradeOpinion !== null) {
            await saveReview({
              boulderId: boulder.id,
              userId: selectedClimber.id,
              rating: selectedRating,
              gradeOpinion: selectedGradeOpinion
            });
          } else {
            const hadReview = reviews.some(r => r.boulder_id === boulder.id && r.user_id === selectedClimber.id);
            if (hadReview) {
              await deleteReview(boulder.id, selectedClimber.id);
            }
          }
        })(),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);

      if (closeAfter) {
        onClose();
      } else {
        setJustSavedName(selectedClimber.display_name);
        setTimeout(() => setJustSavedName(null), 3000);
      }
    } catch (err) {
      console.warn('QuickLog save handled with fallback:', err);
      if (closeAfter) onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNextBoulder = async () => {
    if (!boulder || !selectedClimber || !nextBoulder) return;
    const targetNext = nextBoulder;
    setSaving(true);
    try {
      await Promise.race([
        (async () => {
          await onSave({
            boulderId: boulder.id,
            status: computedStatus,
            attemptCount,
            loggedAt: computeLoggedAt(),
            userId: selectedClimber.id
          });

          // Save/update review if user provided rating or grade feel
          if (selectedRating !== null || selectedGradeOpinion !== null) {
            await saveReview({
              boulderId: boulder.id,
              userId: selectedClimber.id,
              rating: selectedRating,
              gradeOpinion: selectedGradeOpinion
            });
          } else {
            const hadReview = reviews.some(r => r.boulder_id === boulder.id && r.user_id === selectedClimber.id);
            if (hadReview) {
              await deleteReview(boulder.id, selectedClimber.id);
            }
          }
        })(),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);

      if (onNavigateBoulder) {
        onNavigateBoulder(targetNext);
      }
    } catch (err) {
      console.warn('QuickLog save and next handled with fallback:', err);
      if (onNavigateBoulder) {
        onNavigateBoulder(targetNext);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!boulder || !selectedClimber || !onDelete || deleting || saving) return;
    if (window.confirm(`Clear logged attempt on this climb for ${selectedClimber.display_name}?`)) {
      setDeleting(true);
      try {
        await Promise.race([
          (async () => {
            await onDelete(boulder.id, selectedClimber.id);
            if (reviews.some(r => r.boulder_id === boulder.id && r.user_id === selectedClimber.id)) {
              await deleteReview(boulder.id, selectedClimber.id);
            }
          })(),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
        onClose();
      } catch (err) {
        console.warn('QuickLog delete handled with fallback:', err);
        onClose();
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg ds-sheet shadow-2xl flex flex-col max-h-[92vh] overflow-hidden overscroll-contain animate-in slide-in-from-bottom-6"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header Section */}
        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-3 border-b border-white/[0.08] bg-surface">
          {/* Mobile pull/drag handle */}
          <div
            className="w-full py-1 mb-2 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden select-none touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={onClose}
            title="Drag down or tap to dismiss"
          >
            <div className="w-12 h-1.5 bg-surface-higher hover:bg-white/25 rounded-full transition-colors" />
          </div>

          {/* Header with Boulder info & Filter Navigation */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Hold color badge + Climb number */}
            <div className="flex items-center gap-2.5 min-w-0">
              <HoldBadge
                color={boulder.hold_colour}
                grade={boulder.grade}
                isComp={boulder.is_comp}
                compNumber={boulder.comp_number}
                size="md"
              />
              {!(boulder.is_comp && boulder.comp_number != null) && (
                <span className="font-mono text-xs font-bold shrink-0 tabular-nums px-2.5 py-0.5 rounded-full text-slate-200 bg-surface-elevated border border-white/[0.08]">
                  #{boulder.display_order ?? Math.round(boulder.position_order)}
                </span>
              )}
            </div>

            {/* Right: Stepper with adjacent hold swatches + Close button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {hasFilter && totalFiltered > 1 && (
                <div className="flex items-center bg-surface-elevated rounded-full border border-white/[0.1] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => prevBoulder && onNavigateBoulder?.(prevBoulder)}
                    className="px-2.5 py-1 rounded-full hover:bg-surface-high text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 active-press touch-manipulation font-bold"
                    title={`Previous in filter: #${prevBoulder!.display_order ?? Math.round(prevBoulder!.position_order)} ${prevBoulder!.hold_colour} ${prevBoulder!.grade}`}
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
                    className="px-2.5 py-1 rounded-full hover:bg-surface-high text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 active-press touch-manipulation font-bold"
                    title={`Next in filter: #${nextBoulder!.display_order ?? Math.round(nextBoulder!.position_order)} ${nextBoulder!.hold_colour} ${nextBoulder!.grade}`}
                  >
                    <span className="hidden sm:inline text-xs">Next</span>
                    {nextBoulder && <HoldSwatch color={nextBoulder.hold_colour} size="sm" />}
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-surface-high transition-colors active-press touch-manipulation shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-bar: Sector Location */}
          <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs pt-2">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate text-xs text-slate-300">
              {resolvedAreaName || 'Wall Sector'}
            </span>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-5 scrollbar-thin">
          {/* Climber Selector / Context */}
          <div className="flex flex-col gap-3 bg-surface-elevated p-3.5 rounded-lg border border-white/[0.07]">
            <div className="flex items-center justify-between text-xs">
              <span className="ds-label flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: selectedClimberColor }} />
                <span>Climber</span>
              </span>
              {isLoggingForOther && (
                <div className="flex items-center gap-2">
                  <span
                    style={{ color: selectedClimberColor }}
                    className="text-[11px] font-semibold animate-fadeIn"
                  >
                    Logging for {selectedClimber.display_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => currentUserId && setSelectedUserId(currentUserId)}
                    className="text-[11px] underline text-slate-300 hover:text-white"
                  >
                    Switch back
                  </button>
                </div>
              )}
            </div>

            {/* Climber Swatch Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {climbers.map((climber) => {
                const isSelected = climber.id === selectedUserId;
                const isMe = climber.id === currentUserId;
                const climberAttempt = attempts.find(
                  (a) =>
                    a.boulder_id === boulder.id &&
                    a.user_id === climber.id &&
                    (a.status as string) !== 'untried'
                );

                return (
                  <button
                    key={climber.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(climber.id);
                      setJustSavedName(null);
                    }}
                    style={isSelected ? { borderColor: climber.accent_color || selectedClimberColor } : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition-all active-press ${
                      isSelected
                        ? 'bg-surface-high text-white'
                        : 'bg-carbon border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16]'
                    }`}
                  >
                    <ClimberAvatar profile={climber} size="xs" />
                    <div className="flex flex-col items-start leading-none text-left">
                      <span className="flex items-center gap-1 font-bold">
                        {climber.display_name}
                        {isMe && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}
                      </span>
                      <span className="text-[10px] tabular-nums mt-0.5 text-slate-400">
                        {climberAttempt?.status === 'flashed'
                          ? (isWinterSeriesBoulder(boulder) ? 'Flash · 3pt' : 'Flash')
                          : climberAttempt?.status === 'sent'
                          ? (isWinterSeriesBoulder(boulder) ? 'Top · 2pt' : `Sent ${climberAttempt.attempt_count}`)
                          : climberAttempt?.status === 'attempted'
                          ? (isWinterSeriesBoulder(boulder) ? 'Zone · 1pt' : `Proj ${climberAttempt.attempt_count}`)
                          : 'Untried'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Climber Status Feedback Notice */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              {selectedAttempt ? (
                <span className="text-slate-300 text-xs">
                  Previous log:{' '}
                  <strong className="uppercase tabular-nums text-white">
                    {isWinterSeriesBoulder(boulder)
                      ? selectedAttempt.status === 'flashed'
                        ? 'Flash (3 pts)'
                        : selectedAttempt.status === 'sent'
                        ? 'Top (2 pts)'
                        : 'Zone (1 pt)'
                      : `${selectedAttempt.status} ${selectedAttempt.attempt_count}`}
                  </strong>
                </span>
              ) : (
                <span className="text-slate-400 text-xs">
                  Untried by {selectedClimber?.display_name}
                </span>
              )}
            </div>

            {justSavedName && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-md animate-pop">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Logged for <strong>{justSavedName}</strong>.{climbers.length > 1 ? ' Tap another climber above to log for them.' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Winter Series 3 / 2 / 1 Quick Score Selector when logging a Winter Series boulder */}
          {isWinterSeriesBoulder(boulder) ? (
            <div className="flex flex-col gap-2">
              <label className="ds-label px-1">
                <span>Winter Series Score</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSent(true);
                    setAttemptCount(1);
                  }}
                  className={`p-3.5 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all active-press ${
                    computedStatus === 'flashed'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pop'
                      : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:border-white/[0.16]'
                  }`}
                >
                  <span className="tabular-nums font-black text-base inline-flex items-center gap-1">
                    <Zap className="w-4 h-4 fill-current" />
                    <span>3 <span className="text-xs font-bold">pts</span></span>
                  </span>
                  <span className="font-bold text-xs">Flash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSent(true);
                    if (attemptCount < 2) setAttemptCount(2);
                  }}
                  className={`p-3.5 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all active-press ${
                    computedStatus === 'sent'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pop'
                      : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:border-white/[0.16]'
                  }`}
                >
                  <span className="tabular-nums font-black text-base inline-flex items-center gap-1">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>2 <span className="text-xs font-bold">pts</span></span>
                  </span>
                  <span className="font-bold text-xs">Top</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSent(false);
                    if (attemptCount < 1) setAttemptCount(1);
                  }}
                  className={`p-3.5 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all active-press ${
                    computedStatus === 'attempted'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 animate-pop'
                      : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:border-white/[0.16]'
                  }`}
                >
                  <span className="tabular-nums font-black text-base inline-flex items-center gap-1">
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                    <span>1 <span className="text-xs font-bold">pt</span></span>
                  </span>
                  <span className="font-bold text-xs">Zone</span>
                </button>
              </div>
            </div>
          ) : (
            /* Outcome */
            <div className="grid grid-cols-2 gap-3">
              {/* Sent / Topped */}
              <button
                type="button"
                onClick={() => setIsSent(true)}
                className={`p-3.5 rounded-lg border-2 flex items-center justify-center gap-2 transition-all active-press ${
                  isSent
                    ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 animate-pop'
                    : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:border-white/[0.16]'
                }`}
              >
                <Check className={`w-5 h-5 stroke-[2.5] ${isSent ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="font-bold text-sm">Sent</span>
              </button>

              {/* Still Projecting */}
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className={`p-3.5 rounded-lg border-2 flex items-center justify-center gap-2 transition-all active-press ${
                  !isSent
                    ? 'bg-sky-500/15 border-sky-400 text-sky-300 animate-pop'
                    : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:border-white/[0.16]'
                }`}
              >
                <Clock className={`w-5 h-5 stroke-[2.5] ${!isSent ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="font-bold text-sm">Projecting</span>
              </button>
            </div>
          )}

          {/* Attempts */}
          <div className="bg-surface-elevated border border-white/[0.07] rounded-lg p-5 flex flex-col items-center gap-4">
            {/* Tactile Calculator Circular Stepper */}
            <div className="flex items-center gap-7">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={attemptCount <= 1}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-high hover:bg-surface-higher border border-white/[0.1] flex items-center justify-center text-slate-100 active-press disabled:opacity-30 disabled:pointer-events-none transition-all"
                aria-label="Decrease attempts"
              >
                <Minus className="w-6 h-6 stroke-[2.5]" />
              </button>

              <div className="flex flex-col items-center justify-center min-w-[80px]">
                <span className="font-mono text-5xl sm:text-6xl font-black text-white tabular-nums tracking-tight leading-none">
                  {attemptCount}
                </span>
                <span className="text-xs text-slate-400 font-medium mt-1.5">
                  {attemptCount === 1 ? 'try' : 'tries'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-high hover:bg-surface-higher border border-white/[0.1] flex items-center justify-center text-slate-100 active-press transition-all"
                aria-label="Increase attempts"
              >
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Quick Preset Buttons (Pill shape) */}
            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAttemptCount(num)}
                  style={attemptCount === num ? { backgroundColor: selectedClimberColor, color: '#000000' } : undefined}
                  className={`px-3.5 py-1.5 rounded-full text-xs tabular-nums font-bold transition-all active-press ${
                    attemptCount === num
                      ? 'font-extrabold'
                      : 'bg-carbon text-slate-200 hover:bg-surface-high border border-white/[0.1]'
                  }`}
                >
                  {num === 1 ? (
                    <>1 {isSent ? '(Flash)' : 'try'}</>
                  ) : (
                    <span className="font-mono">{num}t</span>
                  )}
                </button>
              ))}
            </div>

            {/* Comp points preview */}
            {(boulder.is_comp && boulder.comp_number != null) && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tabular-nums mt-1 animate-fadeIn">
                <Trophy className="w-3.5 h-3.5" />
                <span>
                  {isWinterSeriesBoulder(boulder)
                    ? computedStatus === 'flashed'
                      ? 'Flashed: +3 pts'
                      : computedStatus === 'sent'
                      ? `Topped (${attemptCount} tries): +2 pts`
                      : 'Zone Reached: +1 pt'
                    : computedStatus === 'flashed'
                    ? 'Flashed: +10 pts'
                    : computedStatus === 'sent'
                    ? attemptCount === 2
                      ? '2nd Try Send: +7 pts'
                      : `Send (${attemptCount} tries): +4 pts`
                    : 'Project: 0 pts'}
                </span>
              </div>
            )}
          </div>

          {/* Climb Review */}
          <div className="bg-surface-elevated border border-white/[0.07] rounded-lg p-3.5 sm:p-4">
            <BoulderReviewPicker
              rating={selectedRating}
              gradeOpinion={selectedGradeOpinion}
              onRatingChange={setSelectedRating}
              onGradeOpinionChange={setSelectedGradeOpinion}
              onClear={() => {
                setSelectedRating(null);
                setSelectedGradeOpinion(null);
              }}
              title="Climb Review"
              showIcon={true}
              clearLabel="Clear"
              size="sm"
            />
          </div>

          {/* Session Date Selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-elevated border border-white/[0.07] text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: selectedClimberColor }} />
                <span className="font-semibold">Date</span>
                <span className="tabular-nums font-bold" style={{ color: selectedClimberColor }}>
                  {logDate === getTodayIsoDate() ? 'Today' : logDate}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setLogDate(getTodayIsoDate());
                    setShowDatePicker(false);
                  }}
                  style={logDate === getTodayIsoDate() ? { backgroundColor: selectedClimberColor, color: '#000000' } : undefined}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors active-press ${
                    logDate === getTodayIsoDate()
                      ? 'shadow'
                      : 'bg-surface-high text-slate-300 hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                    setLogDate(yestStr);
                    setShowDatePicker(false);
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold bg-surface-high text-slate-300 hover:text-white transition-colors active-press"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors active-press ${
                    showDatePicker
                      ? 'bg-surface-higher text-white'
                      : 'bg-surface-high text-slate-300 hover:text-white'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {showDatePicker && (
              <div className="p-3.5 rounded-lg bg-surface-elevated border border-white/[0.08] flex items-center justify-between gap-2 animate-fadeIn">
                <label className="text-xs text-slate-300 font-medium">Choose Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="ds-input w-auto text-xs rounded-full px-4 py-1.5 font-mono tabular-nums"
                />
              </div>
            )}
          </div>

          {/* Secondary Utility Row: Details & Beta, Quick Skip to Next, Delete */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {onOpenDetails && boulder && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDetails(boulder);
                  }}
                  className="py-2 px-3.5 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-surface-elevated hover:bg-surface-high border border-white/[0.1] active-press transition-all flex items-center gap-1.5 group shadow-xs touch-manipulation"
                  title="View full beta notes, photos, and crew discussion"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Details &amp; Beta</span>
                  {(boulder.notes || boulderCommentsCount > 0 || boulder.image_url) && (
                    <span className="flex items-center gap-1.5 text-[10px] font-mono tabular-nums text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-full">
                      {boulder.image_url && <Camera className="w-3 h-3 text-amber-400" />}
                      {boulder.notes && <FileText className="w-3 h-3 text-amber-400" />}
                      {boulderCommentsCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3 text-amber-400" />
                          <span>{boulderCommentsCount}</span>
                        </span>
                      )}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {nextBoulder && nextBoulder.id !== boulder.id && onNavigateBoulder && (
                <button
                  type="button"
                  onClick={() => onNavigateBoulder(nextBoulder)}
                  className="py-2 px-3.5 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-surface-elevated hover:bg-surface-high border border-white/[0.1] active-press transition-all flex items-center gap-1.5 shadow-xs touch-manipulation"
                  title={`Skip to next boulder without logging (#${nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade})`}
                >
                  <span>Skip to Next</span>
                  <HoldSwatch color={nextBoulder.hold_colour} size="xs" />
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {selectedAttempt && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="p-2 rounded-full border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition-colors flex items-center justify-center shrink-0 active-press touch-manipulation disabled:opacity-50"
                  title={`Clear / Delete Log for ${selectedClimber?.display_name}`}
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer: Tactile Pill Action Buttons */}
        <div className="shrink-0 p-4 sm:p-5 bg-surface/98 backdrop-blur-md border-t border-white/[0.08] pb-safe flex flex-col gap-2.5 shadow-2xl">
          {/* Primary Option: Save & Next Boulder (active when adjacent filtered boulders exist) */}
          {nextBoulder && nextBoulder.id !== boulder.id ? (
            <>
              <button
                type="button"
                onClick={handleSaveAndNextBoulder}
                disabled={saving || deleting}
                style={{ backgroundColor: selectedClimberColor, color: '#000000' }}
                className="w-full min-h-[54px] sm:min-h-[58px] py-3.5 sm:py-4 px-5 sm:px-6 rounded-full font-extrabold text-sm sm:text-base flex items-center justify-between shadow-lg active-press hover:brightness-110 transition-all group disabled:opacity-70"
                title={`Save log and advance to next boulder in filter (#${nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade})`}
              >
                <span className="flex items-center gap-2">
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  ) : (
                    <>
                      {computedStatus === 'flashed' && <Zap className="w-5 h-5 fill-current shrink-0" />}
                      {computedStatus === 'sent' && <Check className="w-5 h-5 stroke-[2.5] shrink-0" />}
                      {computedStatus === 'attempted' && <Clock className="w-5 h-5 stroke-[2.5] shrink-0" />}
                    </>
                  )}
                  <span>{saving ? 'Saving...' : 'Save & Next Boulder'}</span>
                </span>

                <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-full text-xs font-mono tabular-nums font-bold shrink-0 transition-colors">
                  <HoldSwatch color={nextBoulder.hold_colour} size="xs" />
                  <span>#{nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} {nextBoulder.grade}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Secondary Options: Save (keep open) and Save & Close */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveAttempt(false)}
                  disabled={saving || deleting}
                  className={`min-h-[46px] sm:min-h-[48px] py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active-press border disabled:opacity-60 ${
                    justSavedName
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 shadow-sm animate-pop'
                      : 'bg-surface-elevated hover:bg-surface-high text-slate-200 border-white/[0.1] hover:border-white/[0.18]'
                  }`}
                  title="Save log and keep modal open to log for another crew member or edit"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Saving...</span>
                    </>
                  ) : justSavedName ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-slate-300 shrink-0" />
                      <span>Save</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAttempt(true)}
                  disabled={saving || deleting}
                  className="min-h-[46px] sm:min-h-[48px] py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active-press bg-surface-elevated hover:bg-surface-high text-white border border-white/[0.12] hover:border-white/[0.2] disabled:opacity-60"
                  title="Save log and close"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <>
                      {computedStatus === 'flashed' && <Zap className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}
                      {computedStatus === 'sent' && <Check className="w-4 h-4 text-emerald-400 stroke-[2.5] shrink-0" />}
                      {computedStatus === 'attempted' && <Clock className="w-4 h-4 text-sky-400 stroke-[2.5] shrink-0" />}
                    </>
                  )}
                  <span>{saving ? 'Saving...' : 'Save & Close'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleSaveAttempt(true)}
                disabled={saving || deleting}
                className={`w-full min-h-[54px] sm:min-h-[58px] py-4 px-6 rounded-full font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active-press disabled:opacity-70 ${
                  computedStatus === 'flashed'
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : computedStatus === 'sent'
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                    : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                }`}
                title="Save log and close"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                ) : (
                  <>
                    {computedStatus === 'flashed' && <Zap className="w-5 h-5 fill-current shrink-0" />}
                    {computedStatus === 'sent' && <Check className="w-5 h-5 stroke-[2.5] shrink-0" />}
                    {computedStatus === 'attempted' && <Clock className="w-5 h-5 stroke-[2.5] shrink-0" />}
                  </>
                )}
                <span>{saving ? 'Saving...' : 'Save & Close'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAttempt(false)}
                disabled={saving || deleting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active-press border bg-surface-elevated hover:bg-surface-high text-slate-200 border-white/[0.1] disabled:opacity-60"
                title="Save log and keep modal open to log for another crew member or edit"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Saving...</span>
                  </>
                ) : justSavedName ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Save &amp; Keep Open</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
