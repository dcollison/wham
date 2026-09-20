import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, AlertTriangle, Archive, Layers } from 'lucide-react';

interface AreaResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  activeCount: number;
  onConfirm: () => Promise<void>;
  onConfirmAndBulkAdd?: () => Promise<void>;
}

export const AreaResetModal: React.FC<AreaResetModalProps> = ({
  isOpen,
  onClose,
  areaName,
  activeCount,
  onConfirm,
  onConfirmAndBulkAdd
}) => {
  const { currentUser } = useAuth();
  const activeColor = currentUser?.accent_color || '#3B82F6';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-base font-bold text-white">Archive Entire Area?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/60 text-xs text-slate-300 space-y-2">
          <p>
            You are about to archive all <strong className="text-white font-mono text-sm">{activeCount}</strong> active boulders in <strong className="text-white font-bold">{areaName}</strong>.
          </p>
          <p className="text-slate-400">
            This represents a complete wall reset. Historical attempts and beta comments will be saved for statistics and can still be reviewed by enabling "Show Archived".
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {onConfirmAndBulkAdd && (
            <button
              type="button"
              onClick={() => handleReset(true)}
              disabled={resetting || activeCount === 0}
              style={{ backgroundColor: activeColor, color: '#000000' }}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active-press transition-all disabled:opacity-40"
            >
              <Layers className="w-4 h-4" />
              <span>{resetting ? 'Archiving...' : `Archive & Bulk Log New Set`}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={resetting}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 active-press transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleReset(false)}
              disabled={resetting || activeCount === 0}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active-press transition-all disabled:opacity-40"
            >
              <Archive className="w-4 h-4" />
              <span>{resetting ? 'Archiving...' : `Archive Only (${activeCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
