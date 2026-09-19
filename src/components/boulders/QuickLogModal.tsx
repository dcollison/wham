import React, { useState, useEffect } from 'react';
import { Boulder, Attempt, AttemptStatus, determineAttemptStatus } from '../../types';
import { HoldBadge } from './HoldBadge';
import { Zap, Check, Clock, X, Trash2, Plus, Minus, CheckCircle2, CircleDashed, Calendar } from 'lucide-react';

interface QuickLogModalProps {
  boulder: Boulder | null;
  existingAttempt?: Attempt;
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: { boulderId: string; status: AttemptStatus; attemptCount: number; loggedAt?: string }) => Promise<void>;
  onDelete?: (boulderId: string) => Promise<void>;
  climberName: string;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  boulder,
  existingAttempt,
  isOpen,
  onClose,
  onSave,
  onDelete,
  climberName
}) => {
  const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

  // Core user inputs:
  // 1. Did you send it?
  // 2. How many attempts / tries?
  // 3. Session date
  const [isSent, setIsSent] = useState<boolean>(true);
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [logDate, setLogDate] = useState<string>(getTodayIsoDate());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Pre-fill state when opening
  useEffect(() => {
    if (existingAttempt) {
      setIsSent(existingAttempt.status === 'flashed' || existingAttempt.status === 'sent');
      setAttemptCount(existingAttempt.attempt_count);
      setLogDate(existingAttempt.logged_at ? existingAttempt.logged_at.split('T')[0] : getTodayIsoDate());
    } else {
      // Default for a new log: sent on 1st try (Flash) on today's date
      setIsSent(true);
      setAttemptCount(1);
      setLogDate(getTodayIsoDate());
    }
    setShowDatePicker(false);
  }, [existingAttempt, boulder, isOpen]);

  if (!isOpen || !boulder) return null;

  // Automatically determine if it is a flash, sent, or projecting from isSent + attemptCount
  const computedStatus: AttemptStatus = determineAttemptStatus(isSent, attemptCount);

  const handleIncrement = () => {
    setAttemptCount((prev) => Math.min(prev + 1, 99));
  };

  const handleDecrement = () => {
    setAttemptCount((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const dateObj = new Date(logDate + 'T19:00:00Z');
      await onSave({
        boulderId: boulder.id,
        status: computedStatus,
        attemptCount,
        loggedAt: isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString()
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete && existingAttempt) {
      setSaving(true);
      try {
        await onDelete(boulder.id);
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

        {/* Climber context */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-800">
          <span>
            Climber: <strong className="text-amber-400 font-semibold">{climberName}</strong>
          </span>
          {existingAttempt && (
            <span className="text-slate-400">
              Previous log:{' '}
              <strong className="uppercase font-mono text-slate-200">
                {existingAttempt.status} ({existingAttempt.attempt_count}t)
              </strong>
            </span>
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

        {/* Automatic Status Resolution Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
            computedStatus === 'flashed'
              ? 'bg-amber-500/15 border-amber-400/60 text-amber-300'
              : computedStatus === 'sent'
              ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
              : 'bg-blue-500/15 border-blue-400/60 text-blue-300'
          }`}
        >
          <div className="shrink-0 p-2 rounded-lg bg-black/30">
            {computedStatus === 'flashed' && <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />}
            {computedStatus === 'sent' && <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />}
            {computedStatus === 'attempted' && <Clock className="w-6 h-6 text-blue-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-black/40">
                Auto-Detected
              </span>
              <h4 className="font-bold text-sm tracking-tight text-white">
                {computedStatus === 'flashed' && '⚡ FLASH'}
                {computedStatus === 'sent' && '✅ SENT'}
                {computedStatus === 'attempted' && '⏳ PROJECTING'}
              </h4>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {computedStatus === 'flashed' && 'Topped on 1st attempt with no prior falls.'}
              {computedStatus === 'sent' && `Sent successfully in ${attemptCount} attempts.`}
              {computedStatus === 'attempted' && `Currently projecting with ${attemptCount} attempts logged.`}
            </p>
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
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  showDatePicker
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:text-white'
                }`}
              >
                Pick 📅
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
        <div className="flex items-center gap-3 pt-1">
          {existingAttempt && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="p-3.5 rounded-xl border border-rose-900/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 transition-colors flex items-center justify-center"
              title="Clear / Delete Log"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active-press ${
              computedStatus === 'flashed'
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                : computedStatus === 'sent'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            {computedStatus === 'flashed' && <Zap className="w-5 h-5 fill-current" />}
            {computedStatus === 'sent' && <Check className="w-5 h-5 stroke-[3]" />}
            {computedStatus === 'attempted' && <Clock className="w-5 h-5" />}
            <span>
              {saving
                ? 'Saving...'
                : computedStatus === 'flashed'
                ? 'Log Flash! ⚡'
                : computedStatus === 'sent'
                ? `Log Send (${attemptCount} tries) ✅`
                : `Save Project (${attemptCount} tries)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
