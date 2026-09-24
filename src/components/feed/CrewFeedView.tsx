import React, { useState, useEffect } from 'react';
import { Comment, Attempt, Boulder, Profile, Gym, GymArea } from '../../types';
import { RecentSendsFeed } from './RecentSendsFeed';
import { BetaDiscussionView } from '../beta/BetaDiscussionView';
import { MessageSquare, Zap } from 'lucide-react';

interface CrewFeedViewProps {
  comments: Comment[];
  attempts: Attempt[];
  boulders: Boulder[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  onSelectBoulder: (boulder: Boulder) => void;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
  onAddComment: (boulderId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export const CrewFeedView: React.FC<CrewFeedViewProps> = ({
  comments,
  attempts,
  boulders,
  climbers,
  gyms,
  areas,
  currentUserId,
  onSelectBoulder,
  onQuickLog,
  onAddComment,
  onDeleteComment
}) => {
  // Determine default active sub-tab from hash if present
  const [activeSubTab, setActiveSubTab] = useState<'sends' | 'beta'>(() => {
    if (window.location.hash.includes('beta')) return 'beta';
    return 'sends';
  });

  // Listen for hash changes to sync subtab
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h.includes('beta')) {
        setActiveSubTab('beta');
      } else if (h.includes('sends') || h.includes('feed')) {
        setActiveSubTab('sends');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Total sends count for badge
  const totalSendsCount = attempts.filter(a => a.status === 'sent' || a.status === 'flashed').length;

  const activeClimber = climbers.find((c) => c.id === currentUserId);
  const activeColor = activeClimber?.accent_color || '#3B82F6';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Segmented Sub-Tab Switcher */}
      <div className="flex items-center justify-center p-1 rounded-full bg-surface border border-slate-800/80 shadow-sm max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('sends');
            window.location.hash = '#/sends';
          }}
          style={activeSubTab === 'sends' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-bold transition-all active-press ${
            activeSubTab === 'sends'
              ? 'shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Sends Feed</span>
          <span
            className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeSubTab === 'sends' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {totalSendsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('beta');
            window.location.hash = '#/beta';
          }}
          style={activeSubTab === 'beta' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-bold transition-all active-press ${
            activeSubTab === 'beta'
              ? 'shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Beta Spray</span>
          <span
            className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeSubTab === 'beta' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {comments.length}
          </span>
        </button>
      </div>

      {/* Sub-Tab 1: Recent Sends Feed */}
      {activeSubTab === 'sends' && (
        <RecentSendsFeed
          attempts={attempts}
          boulders={boulders}
          climbers={climbers}
          gyms={gyms}
          areas={areas}
          currentUserId={currentUserId}
          onSelectBoulder={onSelectBoulder}
          onQuickLog={onQuickLog}
        />
      )}

      {/* Sub-Tab 2: Beta Spray & Discussion Feed */}
      {activeSubTab === 'beta' && (
        <BetaDiscussionView
          comments={comments}
          boulders={boulders}
          climbers={climbers}
          gyms={gyms}
          areas={areas}
          currentUserId={currentUserId}
          onSelectBoulder={onSelectBoulder}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </div>
  );
};
