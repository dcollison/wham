import React, { useState, useEffect, useRef } from 'react';
import { Boulder, Attempt, AttemptStatus, determineAttemptStatus, Profile, GymArea } from '../../types';
import { HoldBadge } from './HoldBadge';
import { HoldSwatch } from './HoldSwatch';
import { ClimberAvatar } from '../ClimberAvatar';
import {
  Zap,
  Check,
  Clock,
  X,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  CircleDashed,
  Calendar,
  Users,
  CheckCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileText,
  Trophy
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
  const { areas: contextAreas, comments } = useGym();
  const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

  // Active target climber for this log
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return initialTargetUserId || currentUserId || climbers[0]?.id || '';
  });

  const [isSent, setIsSent] = useState<boolean>(true);
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [logDate, setLogDate] = useState<string>(getTodayIsoDate());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [justSavedName, setJustSavedName] = useState<string | null>(null);

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
  const selectedClimberColor = selectedClimber?.accent_color || '#3B82F6';
  const isLoggingForOther = Boolean(currentUserId && selectedClimber && selectedClimber.id !== currentUserId);

  // Selected climber's existing attempt on this boulder
  const selectedAttempt = boulder && selectedClimber
    ? attempts.find(a => a.boulder_id === boulder.id && a.user_id === selectedClimber.id)
    : undefined;

  // Pre-fill state whenever the selected climber or boulder changes
  useEffect(() => {
    if (selectedAttempt) {
      setIsSent(selectedAttempt.status === 'flashed' || selectedAttempt.status === 'sent');
      setAttemptCount(selectedAttempt.attempt_count);
      setLogDate(selectedAttempt.logged_at ? selectedAttempt.logged_at.split('T')[0] : getTodayIsoDate());
    } else {
      // Default for a fresh log: sent on 1st try (Flash) on today's date
      setIsSent(true);
      setAttemptCount(1);
      setLogDate(getTodayIsoDate());
    }
    setShowDatePicker(false);
  }, [selectedUserId, selectedAttempt, boulder, isOpen]);

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

  const handleSaveAttempt = async (closeAfter: boolean = true) => {
    if (!boulder || !selectedClimber) return;
    setSaving(true);
    try {
      const dateObj = new Date(logDate + 'T19:00:00Z');
      await onSave({
        boulderId: boulder.id,
        status: computedStatus,
        attemptCount,
        loggedAt: isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString(),
        userId: selectedClimber.id
      });
      if (closeAfter) {
        onClose();
      } else {
        setJustSavedName(selectedClimber.display_name);
        setTimeout(() => setJustSavedName(null), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNextBoulder = async () => {
    if (!boulder || !selectedClimber || !nextBoulder) return;
    const targetNext = nextBoulder;
    setSaving(true);
    try {
      const dateObj = new Date(logDate + 'T19:00:00Z');
      await onSave({
        boulderId: boulder.id,
        status: computedStatus,
        attemptCount,
        loggedAt: isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString(),
        userId: selectedClimber.id
      });
      if (onNavigateBoulder) {
        onNavigateBoulder(targetNext);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!boulder || !selectedClimber || !onDelete) return;
    if (window.confirm(`Clear logged attempt on this climb for ${selectedClimber.display_name}?`)) {
      setSaving(true);
      try {
        await onDelete(boulder.id, selectedClimber.id);
        onClose();
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-surface border-t sm:border border-slate-800/80 rounded-t-[32px] sm:rounded-4xl shadow-2xl flex flex-col max-h-[92vh] sheet-elevated overflow-hidden overscroll-contain"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header Section */}
        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-3 border-b border-slate-800/80 bg-surface">
          {/* Mobile pull/drag handle */}
          <div
            className="w-full py-1 mb-2 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden select-none touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={onClose}
            title="Drag down or tap to dismiss"
          >
            <div className="w-12 h-1.5 bg-slate-700/80 hover:bg-slate-600 rounded-full transition-colors" />
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
              <span
                className={`font-mono text-xs font-bold shrink-0 tabular-nums px-2.5 py-0.5 rounded-full ${
                  boulder.is_comp
                    ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30'
                    : 'text-slate-300 bg-slate-800/90 border border-slate-700/60'
                }`}
              >
                #{boulder.comp_number ?? boulder.display_order ?? Math.round(boulder.position_order)}
              </span>
            </div>

            {/* Right: Stepper with adjacent hold swatches + Close button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {hasFilter && totalFiltered > 1 && (
                <div className="flex items-center bg-slate-800/90 rounded-full border border-slate-700/80 p-1 text-xs shadow-md">
                  <button
                    type="button"
                    onClick={() => prevBoulder && onNavigateBoulder?.(prevBoulder)}
                    className="px-3 py-1 rounded-full hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 active-press touch-manipulation font-heading font-bold"
                    title={`Previous in filter: #${prevBoulder!.display_order ?? Math.round(prevBoulder!.position_order)} ${prevBoulder!.hold_colour} ${prevBoulder!.grade}`}
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
                    className="px-3 py-1 rounded-full hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 active-press touch-manipulation font-heading font-bold"
                    title={`Next in filter: #${nextBoulder!.display_order ?? Math.round(nextBoulder!.position_order)} ${nextBoulder!.hold_colour} ${nextBoulder!.grade}`}
                  >
                    <span className="hidden sm:inline text-xs">Next</span>
                    {nextBoulder && <HoldSwatch color={nextBoulder.hold_colour} size="sm" />}
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors active-press touch-manipulation shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-bar: Sector Location */}
          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs pt-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate text-xs text-slate-300">
              {resolvedAreaName || 'Wall Sector'}
            </span>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-5 scrollbar-thin">
          {/* Climber Selector / Context */}
          <div className="flex flex-col gap-2.5 bg-slate-850/60 p-3.5 rounded-3xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: selectedClimberColor }} />
                Log for Climber:
              </span>
              {isLoggingForOther ? (
                <span
                  style={{
                    color: selectedClimberColor,
                    backgroundColor: `${selectedClimberColor}15`,
                    borderColor: `${selectedClimberColor}40`
                  }}
                  className="text-[11px] font-semibold border px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in"
                >
                  On behalf of {selectedClimber.display_name}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">
                  Tap crew to switch
                </span>
              )}
            </div>

            {/* Climber Swatch Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
              {climbers.map((climber) => {
                const isSelected = climber.id === selectedUserId;
                const isMe = climber.id === currentUserId;
                const climberAttempt = attempts.find(
                  (a) => a.boulder_id === boulder.id && a.user_id === climber.id
                );

                return (
                  <button
                    key={climber.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(climber.id);
                      setJustSavedName(null);
                    }}
                    style={isSelected ? { borderColor: climber.accent_color || selectedClimberColor, boxShadow: `0 0 0 1px ${(climber.accent_color || selectedClimberColor)}80` } : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition-all active-press ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-slate-850/70 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <ClimberAvatar profile={climber} size="xs" />
                    <div className="flex flex-col items-start leading-none text-left">
                      <span className="flex items-center gap-1 font-bold">
                        {climber.display_name}
                        {isMe && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}
                      </span>
                      <span className="text-[10px] font-mono mt-0.5 opacity-80">
                        {climberAttempt?.status === 'flashed'
                          ? 'Flash'
                          : climberAttempt?.status === 'sent'
                          ? `Sent (${climberAttempt.attempt_count}t)`
                          : climberAttempt?.status === 'attempted'
                          ? `Proj (${climberAttempt.attempt_count}t)`
                          : 'Untried'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Climber Status Feedback Notice */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1.5 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <span>Active:</span>
                <strong className="font-semibold" style={{ color: selectedClimberColor }}>{selectedClimber?.display_name}</strong>
                {isLoggingForOther && (
                  <button
                    type="button"
                    onClick={() => currentUserId && setSelectedUserId(currentUserId)}
                    className="text-[10px] underline text-slate-400 hover:text-slate-200"
                  >
                    (switch back to you)
                  </button>
                )}
              </span>

              {selectedAttempt ? (
                <span className="text-slate-400 text-[11px]">
                  Previous log:{' '}
                  <strong className="uppercase font-mono text-slate-200">
                    {selectedAttempt.status} ({selectedAttempt.attempt_count}t)
                  </strong>
                </span>
              ) : (
                <span className="text-slate-500 text-[11px] italic">
                  Untried by {selectedClimber?.display_name}
                </span>
              )}
            </div>

            {justSavedName && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Successfully logged for <strong>{justSavedName}</strong>!{climbers.length > 1 ? ' Tap another climber above to log for them.' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Question 1: Did you send/top it? */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between px-1">
              <span>Did you send it?</span>
              <span className="text-[11px] font-normal text-slate-400">Topped vs Working</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Sent / Topped */}
              <button
                type="button"
                onClick={() => setIsSent(true)}
                className={`p-4 rounded-3xl border-2 flex items-center justify-center gap-3 transition-all active-press ${
                  isSent
                    ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                    : 'bg-slate-850/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${isSent ? 'text-emerald-400 stroke-[2.5]' : 'text-slate-500'}`} />
                <div className="text-left">
                  <span className="font-bold text-sm block font-heading">Sent / Topped</span>
                  <span className="text-[10px] opacity-75">Completed boulder</span>
                </div>
              </button>

              {/* Still Projecting */}
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className={`p-4 rounded-3xl border-2 flex items-center justify-center gap-3 transition-all active-press ${
                  !isSent
                    ? 'bg-blue-500/15 border-blue-400 text-blue-300 shadow-md ring-1 ring-blue-400/40'
                    : 'bg-slate-850/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CircleDashed className={`w-5 h-5 ${!isSent ? 'text-blue-400 stroke-[2.5]' : 'text-slate-500'}`} />
                <div className="text-left">
                  <span className="font-bold text-sm block font-heading">Still Projecting</span>
                  <span className="text-[10px] opacity-75">Work in progress</span>
                </div>
              </button>
            </div>
          </div>

          {/* Question 2: How many tries? (Pixel Calculator aesthetic) */}
          <div className="bg-slate-850/60 border border-slate-800/80 rounded-3xl p-5 flex flex-col items-center gap-4">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              How many tries?
            </label>

            {/* Tactile Calculator Circular Stepper */}
            <div className="flex items-center gap-7">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={attemptCount <= 1}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800/90 hover:bg-slate-750 border border-slate-700/60 flex items-center justify-center text-slate-100 active-press disabled:opacity-30 disabled:pointer-events-none transition-all surface-elevated shadow-md"
              >
                <Minus className="w-6 h-6 stroke-[2.5]" />
              </button>

              <div className="flex flex-col items-center min-w-[80px]">
                <span className="font-heading text-5xl sm:text-6xl font-black text-white tabular-nums tracking-tight">
                  {attemptCount}
                </span>
                <span className="text-xs text-slate-400 font-medium mt-1">
                  {attemptCount === 1 ? 'try' : 'tries'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800/90 hover:bg-slate-750 border border-slate-700/60 flex items-center justify-center text-slate-100 active-press transition-all surface-elevated shadow-md"
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all active-press ${
                    attemptCount === num
                      ? 'shadow-md'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-750 border border-slate-750'
                  }`}
                >
                  {num === 1 ? '1st try' : `${num}t`}
                </button>
              ))}
            </div>

            {/* Comp points or status pill preview */}
            {boulder.is_comp && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mt-1 animate-in fade-in">
                <Trophy className="w-3.5 h-3.5" />
                <span>
                  {computedStatus === 'flashed'
                    ? '⚡ Flashed: +10 Comp Points'
                    : computedStatus === 'sent'
                    ? attemptCount === 2
                      ? '✅ 2nd Try Send: +7 Comp Points'
                      : `✅ Send (${attemptCount} tries): +4 Comp Points`
                    : '⏳ Project: 0 Comp Points'}
                </span>
              </div>
            )}
          </div>

          {/* Session Date Selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-850/50 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: selectedClimberColor }} />
                <span className="font-semibold">Session Date:</span>
                <span className="font-mono font-bold" style={{ color: selectedClimberColor }}>
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
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setLogDate(yesterday.toISOString().split('T')[0]);
                    setShowDatePicker(false);
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 hover:text-white transition-colors active-press"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors active-press ${
                    showDatePicker
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Custom Date
                </button>
              </div>
            </div>

            {showDatePicker && (
              <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-750 flex items-center justify-between gap-2 animate-in fade-in">
                <label className="text-xs text-slate-300 font-medium">Choose Date:</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-full px-4 py-1.5 outline-none focus:border-slate-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Secondary Utility Row: Details & Beta, Quick Skip to Next, Delete */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 mt-1">
            <div className="flex items-center gap-2">
              {onOpenDetails && boulder && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDetails(boulder);
                  }}
                  className="py-2 px-3.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 active-press transition-all flex items-center gap-1.5 group shadow-xs touch-manipulation"
                  title="View full beta notes, photos, and crew discussion"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Details &amp; Beta</span>
                  {(boulder.notes || boulderCommentsCount > 0 || boulder.image_url) && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-amber-300/90 bg-amber-400/15 px-1.5 py-0.2 rounded-full">
                      {boulder.image_url && '📷'}
                      {boulder.notes && '📝'}
                      {boulderCommentsCount > 0 && `💬${boulderCommentsCount}`}
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
                  className="py-2 px-3.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 active-press transition-all flex items-center gap-1.5 shadow-xs touch-manipulation"
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
                  disabled={saving}
                  className="p-2 rounded-full border border-rose-900/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition-colors flex items-center justify-center shrink-0 active-press touch-manipulation"
                  title={`Clear / Delete Log for ${selectedClimber?.display_name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer: Tactile Pill Action Buttons */}
        <div className="shrink-0 p-4 sm:p-5 bg-surface/98 backdrop-blur-md border-t border-slate-800/90 pb-safe flex flex-col gap-2.5 shadow-2xl">
          {/* Primary Option: Save & Next Boulder (active when adjacent filtered boulders exist) */}
          {nextBoulder && nextBoulder.id !== boulder.id ? (
            <>
              <button
                type="button"
                onClick={handleSaveAndNextBoulder}
                disabled={saving}
                style={{ backgroundColor: selectedClimberColor, color: '#000000' }}
                className="w-full min-h-[54px] sm:min-h-[58px] py-3.5 sm:py-4 px-5 sm:px-6 rounded-full font-heading font-black text-sm sm:text-base flex items-center justify-between shadow-xl active-press hover:brightness-110 transition-all group"
                title={`Save log and advance to next boulder in filter (#${nextBoulder.display_order ?? Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade})`}
              >
                <span className="flex items-center gap-2">
                  {computedStatus === 'flashed' && <Zap className="w-5 h-5 fill-current shrink-0" />}
                  {computedStatus === 'sent' && <Check className="w-5 h-5 stroke-[3] shrink-0" />}
                  {computedStatus === 'attempted' && <Clock className="w-5 h-5 stroke-[2.5] shrink-0" />}
                  <span>{saving ? 'Saving...' : 'Save & Next Boulder'}</span>
                </span>

                <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 transition-colors">
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
                  disabled={saving}
                  className={`min-h-[46px] sm:min-h-[48px] py-3 px-4 rounded-full font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active-press border ${
                    justSavedName
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-750 text-slate-200 border-slate-700/80 hover:border-slate-650'
                  }`}
                  title="Save log and keep modal open to log for another crew member or edit"
                >
                  {saving ? (
                    <span>Saving...</span>
                  ) : justSavedName ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Save</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAttempt(true)}
                  disabled={saving}
                  className="min-h-[46px] sm:min-h-[48px] py-3 px-4 rounded-full font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active-press bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-650 hover:brightness-105"
                  title="Save log and close"
                >
                  {computedStatus === 'flashed' && <Zap className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}
                  {computedStatus === 'sent' && <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />}
                  {computedStatus === 'attempted' && <Clock className="w-4 h-4 text-blue-400 shrink-0" />}
                  <span>{saving ? 'Saving...' : 'Save & Close'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleSaveAttempt(true)}
                disabled={saving}
                className={`w-full min-h-[54px] sm:min-h-[58px] py-4 px-6 rounded-full font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition-all active-press ${
                  computedStatus === 'flashed'
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                    : computedStatus === 'sent'
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                }`}
                title="Save log and close"
              >
                {computedStatus === 'flashed' && <Zap className="w-5 h-5 fill-current shrink-0" />}
                {computedStatus === 'sent' && <Check className="w-5 h-5 stroke-[3] shrink-0" />}
                {computedStatus === 'attempted' && <Clock className="w-5 h-5 stroke-[2.5] shrink-0" />}
                <span>{saving ? 'Saving...' : 'Save & Close'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAttempt(false)}
                disabled={saving}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-full font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active-press border bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80"
                title="Save log and keep modal open to log for another crew member or edit"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : justSavedName ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-400 shrink-0" />
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
