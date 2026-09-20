import React, { useState, useEffect } from 'react';
import { Boulder, Attempt, AttemptStatus, determineAttemptStatus, Profile } from '../../types';
import { HoldBadge } from './HoldBadge';
import { ClimberAvatar } from '../ClimberAvatar';
import { Zap, Check, Clock, X, Trash2, Plus, Minus, CheckCircle2, CircleDashed, Calendar, Users, CheckCircle } from 'lucide-react';

interface QuickLogModalProps {
  boulder: Boulder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: { boulderId: string; status: AttemptStatus; attemptCount: number; loggedAt?: string; userId?: string }) => Promise<void>;
  onDelete?: (boulderId: string, userId?: string) => Promise<void>;
  climbers: Profile[];
  currentUserId?: string;
  initialTargetUserId?: string;
  attempts: Attempt[];
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  boulder,
  isOpen,
  onClose,
  onSave,
  onDelete,
  climbers,
  currentUserId,
  initialTargetUserId,
  attempts
}) => {
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

  // Sync selected climber when modal opens or initial target changes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(initialTargetUserId || currentUserId || climbers[0]?.id || '');
      setJustSavedName(null);
    }
  }, [isOpen, initialTargetUserId, currentUserId]);

  const selectedClimber = climbers.find(c => c.id === selectedUserId) || climbers[0];
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

  const handleDelete = async () => {
    if (onDelete && selectedAttempt && selectedClimber) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="md" />
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              #{Math.round(boulder.position_order)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Climber Selector / Context */}
        <div className="flex flex-col gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Log for Climber:
            </span>
            {isLoggingForOther ? (
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
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
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-semibold shrink-0 transition-all active-press ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 text-white shadow-md ring-1 ring-amber-400/50'
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
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-750/50">
            <span className="flex items-center gap-1.5">
              <span>Active:</span>
              <strong className="text-amber-400 font-semibold">{selectedClimber?.display_name}</strong>
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
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Successfully logged for <strong>{justSavedName}</strong>! Switch climber above to log another.</span>
            </div>
          )}
        </div>

        {/* Question 1: Did you send/top it? */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Did you send it?</span>
            <span className="text-[11px] font-normal text-slate-400">Topped vs Working</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Sent / Topped */}
            <button
              type="button"
              onClick={() => setIsSent(true)}
              className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2.5 transition-all active-press ${
                isSent
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${isSent ? 'text-emerald-400 stroke-[2.5]' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="font-bold text-sm block">Sent / Topped</span>
                <span className="text-[10px] opacity-75">Completed boulder</span>
              </div>
            </button>

            {/* Still Projecting */}
            <button
              type="button"
              onClick={() => setIsSent(false)}
              className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2.5 transition-all active-press ${
                !isSent
                  ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-md ring-1 ring-blue-400/40'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <CircleDashed className={`w-5 h-5 ${!isSent ? 'text-blue-400 stroke-[2.5]' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="font-bold text-sm block">Still Projecting</span>
                <span className="text-[10px] opacity-75">Work in progress</span>
              </div>
            </button>
          </div>
        </div>

        {/* Question 2: How many tries? */}
        <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-4 flex flex-col items-center gap-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            How many tries?
          </label>

          {/* Stepper */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={attemptCount <= 1}
              className="w-12 h-12 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-slate-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-transform"
            >
              <Minus className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center min-w-[70px]">
              <span className="font-mono text-4xl font-black text-white">
                {attemptCount}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {attemptCount === 1 ? 'try' : 'tries'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleIncrement}
              className="w-12 h-12 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-slate-200 active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setAttemptCount(num)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  attemptCount === num
                    ? 'bg-amber-400 text-black shadow'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {num === 1 ? '1st try' : `${num}t`}
              </button>
            ))}
          </div>
        </div>

        {/* Session Date Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold">Session Date:</span>
              <span className="font-mono font-bold text-amber-400">
                {logDate === getTodayIsoDate() ? 'Today' : logDate}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setLogDate(getTodayIsoDate());
                  setShowDatePicker(false);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  logDate === getTodayIsoDate()
                    ? 'bg-amber-400 text-black shadow'
                    : 'bg-slate-700/60 text-slate-300 hover:text-white'
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
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-700/60 text-slate-300 hover:text-white transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  showDatePicker
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:text-white'
                }`}
              >
                Custom Date
              </button>
            </div>
          </div>

          {showDatePicker && (
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-700 flex items-center justify-between gap-2 animate-in fade-in">
              <label className="text-xs text-slate-300 font-medium">Choose Date:</label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-amber-400 font-mono"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          {selectedAttempt && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="p-3.5 rounded-xl border border-rose-900/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 transition-colors flex items-center justify-center shrink-0"
              title={`Clear / Delete Log for ${selectedClimber?.display_name}`}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          {climbers.length > 1 && (
            <button
              type="button"
              onClick={() => handleSaveAttempt(false)}
              disabled={saving}
              className="py-3.5 px-3.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active-press transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Save this climber's log and keep modal open to log for another"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Save & Log Next</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveAttempt(true)}
            disabled={saving}
            className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active-press ${
              computedStatus === 'flashed'
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                : computedStatus === 'sent'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            {computedStatus === 'flashed' && <Zap className="w-5 h-5 fill-current shrink-0" />}
            {computedStatus === 'sent' && <Check className="w-5 h-5 stroke-[3] shrink-0" />}
            {computedStatus === 'attempted' && <Clock className="w-5 h-5 shrink-0" />}
            <span className="truncate">
              {saving
                ? 'Saving...'
                : computedStatus === 'flashed'
                ? isLoggingForOther
                  ? `Log Flash for ${selectedClimber?.display_name}`
                  : 'Log Flash'
                : computedStatus === 'sent'
                ? isLoggingForOther
                  ? `Log Send for ${selectedClimber?.display_name} (${attemptCount}t)`
                  : `Log Send (${attemptCount} tries)`
                : isLoggingForOther
                ? `Save Project for ${selectedClimber?.display_name} (${attemptCount}t)`
                : `Save Project (${attemptCount} tries)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
