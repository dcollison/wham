import React, { useState, useEffect } from 'react';
import { Boulder, Attempt, AttemptStatus } from '../../types';
import { HoldBadge } from './HoldBadge';
import { Zap, Check, Clock, X, Trash2, Plus, Minus } from 'lucide-react';

interface QuickLogModalProps {
  boulder: Boulder | null;
  existingAttempt?: Attempt;
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: { boulderId: string; status: AttemptStatus; attemptCount: number }) => Promise<void>;
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
  const [selectedStatus, setSelectedStatus] = useState<AttemptStatus>('flashed');
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (existingAttempt) {
      setSelectedStatus(existingAttempt.status);
      setAttemptCount(existingAttempt.attempt_count);
    } else {
      setSelectedStatus('flashed');
      setAttemptCount(1);
    }
  }, [existingAttempt, boulder, isOpen]);

  if (!isOpen || !boulder) return null;

  const handleSelectStatus = (status: AttemptStatus) => {
    setSelectedStatus(status);
    if (status === 'flashed') {
      setAttemptCount(1);
    } else if (status === 'sent' && attemptCount === 1) {
      setAttemptCount(2); // Sends are usually >= 2 attempts (otherwise it's a flash)
    }
  };

  const handleIncrement = () => {
    setAttemptCount(prev => Math.min(prev + 1, 99));
  };

  const handleDecrement = () => {
    const min = selectedStatus === 'flashed' ? 1 : 1;
    setAttemptCount(prev => Math.max(prev - 1, min));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        boulderId: boulder.id,
        status: selectedStatus,
        attemptCount
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="md" />
            <span className="text-xs font-mono text-slate-400">
              #{Math.round(boulder.position_order)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Climber context */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg">
          <span>Logging as: <strong className="text-amber-400 font-semibold">{climberName}</strong></span>
          {existingAttempt && (
            <span className="text-slate-400">
              Current: <span className="uppercase font-mono text-slate-200">{existingAttempt.status} ({existingAttempt.attempt_count}t)</span>
            </span>
          )}
        </div>

        {/* Status Selection Buttons - Tactile for Chalky Fingers */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Flash */}
          <button
            type="button"
            onClick={() => handleSelectStatus('flashed')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all active-press ${
              selectedStatus === 'flashed'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Zap className={`w-7 h-7 mb-1.5 ${selectedStatus === 'flashed' ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            <span className="font-bold text-sm">Flash</span>
            <span className="text-[10px] opacity-75 font-mono">1st Try Send</span>
          </button>

          {/* Send */}
          <button
            type="button"
            onClick={() => handleSelectStatus('sent')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all active-press ${
              selectedStatus === 'sent'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Check className={`w-7 h-7 mb-1.5 ${selectedStatus === 'sent' ? 'text-emerald-400 stroke-[3]' : 'text-slate-400'}`} />
            <span className="font-bold text-sm">Send</span>
            <span className="text-[10px] opacity-75 font-mono">2+ Tries</span>
          </button>

          {/* Project / Attempt */}
          <button
            type="button"
            onClick={() => handleSelectStatus('attempted')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all active-press ${
              selectedStatus === 'attempted'
                ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-lg shadow-blue-500/10'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Clock className={`w-7 h-7 mb-1.5 ${selectedStatus === 'attempted' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="font-bold text-sm">Project</span>
            <span className="text-[10px] opacity-75 font-mono">Attempts</span>
          </button>
        </div>

        {/* Attempt Stepper (Hidden for Flash as Flash is inherently 1 try) */}
        {selectedStatus !== 'flashed' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 flex flex-col items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Total Attempts / Tries
            </span>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={attemptCount <= (selectedStatus === 'sent' ? 2 : 1)}
                className="w-12 h-12 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-slate-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-transform"
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center min-w-[70px]">
                <span className="font-mono text-3xl font-black text-white">
                  {attemptCount}
                </span>
                <span className="text-[11px] text-slate-400">
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

            {/* Quick try presets */}
            <div className="flex items-center gap-2 mt-1">
              {[2, 3, 4, 5, 8].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAttemptCount(num)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                    attemptCount === num
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {num}t
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
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
              selectedStatus === 'flashed'
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                : selectedStatus === 'sent'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            {selectedStatus === 'flashed' && <Zap className="w-5 h-5 fill-current" />}
            {selectedStatus === 'sent' && <Check className="w-5 h-5 stroke-[3]" />}
            {selectedStatus === 'attempted' && <Clock className="w-5 h-5" />}
            <span>
              {saving
                ? 'Saving...'
                : selectedStatus === 'flashed'
                ? 'Log Flash! ⚡'
                : selectedStatus === 'sent'
                ? `Log Send (${attemptCount} tries) ✅`
                : `Save Project (${attemptCount} tries)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
