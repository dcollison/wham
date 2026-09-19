import React, { useState } from 'react';
import { Comment, Boulder, Profile, Gym, GymArea } from '../../types';
import { HoldBadge } from '../boulders/HoldBadge';
import { MessageSquare, Send, Calendar, MapPin } from 'lucide-react';

interface BetaDiscussionViewProps {
  comments: Comment[];
  boulders: Boulder[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  onSelectBoulder: (boulder: Boulder) => void;
  onAddComment: (boulderId: string, content: string) => Promise<void>;
}

export const BetaDiscussionView: React.FC<BetaDiscussionViewProps> = ({
  comments,
  boulders,
  climbers,
  gyms,
  areas,
  currentUserId,
  onSelectBoulder,
  onAddComment
}) => {
  const [selectedBoulderId, setSelectedBoulderId] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sort comments by created_at descending
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoulderId || !newContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAddComment(selectedBoulderId, newContent.trim());
      setNewContent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-20 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            Beta Discussion & Spray
          </h2>
          <p className="text-xs text-slate-400">
            Crux sequences, foot placements, and beta from the crew
          </p>
        </div>
      </div>

      {/* Post Beta Quick Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Share Beta on a Boulder
        </span>

        <select
          value={selectedBoulderId}
          onChange={(e) => setSelectedBoulderId(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 outline-none focus:border-amber-400"
        >
          <option value="">Select a Boulder to drop beta on...</option>
          {boulders.filter(b => !b.is_archived).map(b => {
            const area = areas.find(a => a.id === b.area_id);
            const gym = gyms.find(g => g.id === b.gym_id);
            return (
              <option key={b.id} value={b.id}>
                {gym?.name} • {area?.name}: #{Math.round(b.position_order)} {b.hold_colour} {b.grade}
              </option>
            );
          })}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Right drop knee into the gaston makes the match easy..."
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!selectedBoulderId || !newContent.trim() || submitting}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black active-press transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Beta Feed Stream */}
      <div className="space-y-3">
        {sortedComments.map((comment) => {
          const boulder = boulders.find(b => b.id === comment.boulder_id);
          const author = climbers.find(c => c.id === comment.user_id);
          const area = boulder ? areas.find(a => a.id === boulder.area_id) : null;
          const isCurrentUser = comment.user_id === currentUserId;

          return (
            <div
              key={comment.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 hover:border-slate-700 transition-colors shadow-sm"
            >
              {/* Header with Boulder info */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                {boulder && (
                  <button
                    type="button"
                    onClick={() => onSelectBoulder(boulder)}
                    className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                  >
                    <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="sm" />
                    <span className="text-xs font-semibold text-slate-300">
                      {area?.name}
                    </span>
                  </button>
                )}

                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Author & Content */}
              <div>
                <span className={`text-xs font-bold ${isCurrentUser ? 'text-amber-400' : 'text-slate-200'}`}>
                  {author?.display_name || comment.profile?.display_name || 'Climber'}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
