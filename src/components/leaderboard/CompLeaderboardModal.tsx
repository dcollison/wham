import React, { useEffect } from 'react';
import { Boulder, Attempt, Profile, Gym } from '../../types';
import { CompLeaderboard } from './CompLeaderboard';
import { X, Trophy, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CompLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  gyms: Gym[];
  currentGymId?: string;
  currentUserId?: string;
  onSelectBoulder?: (boulder: Boulder) => void;
  onNavigateToStats?: () => void;
}

export const CompLeaderboardModal: React.FC<CompLeaderboardModalProps> = ({
  isOpen,
  onClose,
  boulders,
  attempts,
  climbers,
  gyms,
  currentGymId,
  currentUserId,
  onSelectBoulder,
  onNavigateToStats
}) => {
  const { currentUser } = useAuth();
  const activeUser = climbers.find(c => c.id === currentUserId) || currentUser;
  const activeColor = currentUser?.accent_color || activeUser?.accent_color || '#3B82F6';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-surface border-t sm:border border-slate-800/80 rounded-t-[32px] sm:rounded-4xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 no-scrollbar sheet-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Close Button */}
        <div className="flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-md pb-3 z-10 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5" style={{ color: activeColor }} />
            <span className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Gym Comp Standings
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToStats && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToStats();
                }}
                className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-750 border border-slate-750 transition-colors hidden sm:flex items-center gap-1.5 active-press"
                title="View in full Analytics tab"
              >
                <span>Analytics Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors active-press"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inner Comp Leaderboard Component */}
        <CompLeaderboard
          boulders={boulders}
          attempts={attempts}
          climbers={climbers}
          gyms={gyms}
          initialGymId={currentGymId || 'all'}
          currentUserId={currentUserId}
          onSelectBoulder={(b) => {
            onClose();
            if (onSelectBoulder) onSelectBoulder(b);
          }}
          showGymSelector={true}
        />
      </div>
    </div>
  );
};
