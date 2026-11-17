import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, AlertTriangle, Archive, Layers, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { ResetAgeInfo } from '../../lib/resetStatus';

interface AreaResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  activeCount: number;
  resetInfo?: ResetAgeInfo | null;
  onConfirm: () => Promise<void>;
  onConfirmAndBulkAdd?: () => Promise<void>;
}

export const AreaResetModal: React.FC<AreaResetModalProps> = ({
  isOpen,
  onClose,
  areaName,
  activeCount,
  resetInfo,
  onConfirm,
  onConfirmAndBulkAdd
}) => {
  const { currentUser } = useAuth();
  const activeColor = currentUser?.accent_color || '#F59E0B';
  const [resetting, setResetting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleReset = async (andBulkAdd = false) => {
    setResetting(true);
    try {
      if (andBulkAdd && onConfirmAndBulkAdd) {
        await onConfirmAndBulkAdd();
      } else {
        await onConfirm();
      }
      onClose();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md ds-sheet p-5 sm:p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-surface-higher rounded-full mx-auto sm:hidden -mt-1 mb-1 shrink-0" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-base font-bold text-white">Archive Entire Area?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-surface-high active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="ds-well rounded-lg p-4 text-xs text-slate-300 space-y-2">
          <p>
            You are about to archive all <strong className="text-white font-mono tabular-nums text-sm">{activeCount}</strong> active boulders in <strong className="text-white font-bold">{areaName}</strong>.
          </p>
          {resetInfo?.isDueForReset && (
            <p className="flex items-center gap-1.5 text-amber-300 font-semibold tabular-nums">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>This wall was set {resetInfo.weeksOld} weeks ago and is due for a reset.</span>
            </p>
          )}
          <p className="text-slate-400">
            Historical attempts and beta comments are preserved for stats and can be viewed with "Show Archived".
          </p>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>An automatic safety snapshot is saved before resetting.</span>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {onConfirmAndBulkAdd && (
            <button
              type="button"
              onClick={() => handleReset(true)}
              disabled={resetting || activeCount === 0}
              style={{ backgroundColor: activeColor, color: '#000000' }}
              className="w-full min-h-[48px] py-3 px-5 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active-press transition-all disabled:opacity-40"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              <span>{resetting ? 'Archiving...' : `Archive & Bulk Log New Set`}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={resetting}
              className="flex-1 min-h-[46px] py-2.5 px-4 rounded-full font-semibold text-xs bg-surface-elevated hover:bg-surface-high text-slate-200 border border-white/[0.08] active-press transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleReset(false)}
              disabled={resetting || activeCount === 0}
              className="flex-1 min-h-[46px] py-2.5 px-4 rounded-full font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 shadow-lg active-press transition-all disabled:opacity-40 tabular-nums"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              <span>{resetting ? 'Archiving...' : `Archive Only (${activeCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
