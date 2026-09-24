import React, { useState, useMemo } from 'react';
import { Comment, Boulder, Profile, Gym, GymArea } from '../../types';
import { HoldBadge } from '../boulders/HoldBadge';
import { ClimberAvatar } from '../ClimberAvatar';
import { MessageSquare, Send, Calendar, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BetaDiscussionViewProps {
  comments: Comment[];
  boulders: Boulder[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  onSelectBoulder: (boulder: Boulder) => void;
  onAddComment: (boulderId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export const BetaDiscussionView: React.FC<BetaDiscussionViewProps> = ({
  comments,
  boulders,
  climbers,
  gyms,
  areas,
  currentUserId,
  onSelectBoulder,
  onAddComment,
  onDeleteComment
}) => {
  const { currentUser } = useAuth();
  const activeColor = currentUser?.accent_color || '#3B82F6';
  const [selectedBoulderId, setSelectedBoulderId] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Deduplicate and sort comments by created_at descending (newest first)
  const sortedComments = useMemo(() => {
    const unique = Array.from(new Map(comments.map(c => [c.id, c])).values());
    return unique.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [comments]);

  // Group boulders by Gym and Area, sorted by Gym, Area sort_order, and position_order
  const groupedBoulders = useMemo(() => {
    const activeBoulders = boulders.filter(b => !b.is_archived);
    const areaMap = new Map<string, Boulder[]>();

    for (const b of activeBoulders) {
      if (!areaMap.has(b.area_id)) {
        areaMap.set(b.area_id, []);
      }
      areaMap.get(b.area_id)!.push(b);
    }

    const groupedList: Array<{
      areaId: string;
      areaName: string;
      gymName: string;
      boulders: Boulder[];
    }> = [];

    for (const [areaId, bList] of areaMap.entries()) {
      const area = areas.find(a => a.id === areaId);
      const gym = gyms.find(g => g.id === area?.gym_id || g.id === bList[0]?.gym_id);
      // Sort boulders clockwise within the area
      bList.sort((a, b) => a.position_order - b.position_order);

      groupedList.push({
        areaId,
        areaName: area?.name || 'Wall',
        gymName: gym?.name || 'Gym',
        boulders: bList
      });
    }

    // Sort groups by gym name then area sort_order
    groupedList.sort((gA, gB) => {
      if (gA.gymName !== gB.gymName) {
        return gA.gymName.localeCompare(gB.gymName);
      }
      const areaA = areas.find(a => a.id === gA.areaId);
      const areaB = areas.find(a => a.id === gB.areaId);
      const orderA = areaA?.sort_order ?? 999;
      const orderB = areaB?.sort_order ?? 999;
      return orderA - orderB;
    });

    return groupedList;
  }, [boulders, areas, gyms]);

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
            <MessageSquare className="w-5 h-5" style={{ color: activeColor }} />
            Discussion
          </h2>
          <p className="text-xs text-slate-400">
            General gym banter, beta, tips, sequences, and chat from the crew
          </p>
        </div>
      </div>

      {/* Post Beta Quick Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Start a Discussion on a Boulder
        </span>

        <select
          value={selectedBoulderId}
          onChange={(e) => setSelectedBoulderId(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 outline-none focus:border-slate-500"
        >
          <option value="">Select a Boulder to discuss...</option>
          {groupedBoulders.map(group => (
            <optgroup
              key={group.areaId}
              label={`${group.gymName} • ${group.areaName}`}
              className="bg-slate-900 text-slate-400 font-bold"
            >
              {group.boulders.map(b => (
                <option
                  key={b.id}
                  value={b.id}
                  className="bg-slate-800 text-slate-200 font-normal py-1"
                >
                  #{Math.round(b.position_order)} • {b.hold_colour} {b.grade}{b.notes ? ` (${b.notes})` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Share a thought, beta, or gym banter..."
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            disabled={!selectedBoulderId || !newContent.trim() || submitting}
            className="p-2.5 rounded-xl text-black active-press transition-colors disabled:opacity-30 font-semibold"
            style={{ backgroundColor: activeColor }}
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

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  {isCurrentUser && onDeleteComment && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this comment?')) {
                          onDeleteComment(comment.id);
                        }
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Author & Content */}
              <div className="flex items-start gap-2.5">
                <ClimberAvatar profile={author || comment.profile} size="sm" />
                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs font-bold"
                    style={isCurrentUser ? { color: activeColor } : { color: '#e2e8f0' }}
                  >
                    {author?.display_name || comment.profile?.display_name || 'Climber'}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
