import React, { useState, useMemo } from 'react';
import { Boulder, Attempt, Comment, Profile } from '../../types';
import { HoldBadge } from './HoldBadge';
import { ClimberStatusPills } from './ClimberStatusPills';
import { ClimberAvatar } from '../ClimberAvatar';
import {
  X,
  Send,
  Calendar,
  Zap,
  Check,
  Clock,
  Archive,
  MessageSquare,
  ZoomIn,
  Users,
  Compass,
  CornerDownRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';

interface BoulderDetailModalProps {
  boulder: Boulder | null;
  isOpen: boolean;
  onClose: () => void;
  attempts: Attempt[];
  comments: Comment[];
  climbers: Profile[];
  currentUserId?: string;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
  onAddComment: (boulderId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onToggleArchive: (boulderId: string, archive: boolean) => Promise<void>;
  filteredBoulders?: Boulder[];
  onNavigateBoulder?: (boulder: Boulder) => void;
}

export const BoulderDetailModal: React.FC<BoulderDetailModalProps> = ({
  boulder,
  isOpen,
  onClose,
  attempts,
  comments,
  climbers,
  currentUserId,
  onQuickLog,
  onAddComment,
  onDeleteComment,
  onToggleArchive,
  filteredBoulders,
  onNavigateBoulder
}) => {
  const [newComment, setNewComment] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [photoZoom, setPhotoZoom] = useState<boolean>(false);

  if (!isOpen || !boulder) return null;

  const boulderComments = useMemo(() => {
    const matching = comments.filter(c => c.boulder_id === boulder.id);
    const unique = Array.from(new Map(matching.map(c => [c.id, c])).values());
    return unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments, boulder.id]);
  const userAttempt = attempts.find(a => a.user_id === currentUserId);
  const activeColor = climbers.find(c => c.id === currentUserId)?.accent_color || '#3B82F6';

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      await onAddComment(boulder.id, newComment.trim());
      setNewComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!isOpen || !boulder) return null;

  // Filter-aware navigation calculations
  const currentIndex = boulder && filteredBoulders ? filteredBoulders.findIndex(b => b.id === boulder.id) : -1;
  const totalFiltered = filteredBoulders ? filteredBoulders.length : 0;
  const hasFilter = currentIndex !== -1 && totalFiltered > 0;
  const prevBoulder = hasFilter && currentIndex > 0 ? filteredBoulders![currentIndex - 1] : null;
  const nextBoulder = hasFilter && currentIndex < totalFiltered - 1 ? filteredBoulders![currentIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="md" />
            <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded shrink-0">
              #{Math.round(boulder.position_order)}
            </span>
          </div>

          {/* Filter navigation strip */}
          {hasFilter && (
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700/80 text-xs shrink-0">
              <button
                type="button"
                onClick={() => prevBoulder && onNavigateBoulder?.(prevBoulder)}
                disabled={!prevBoulder}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                title={prevBoulder ? `Previous Boulder: #${Math.round(prevBoulder.position_order)} ${prevBoulder.hold_colour} ${prevBoulder.grade}` : 'First boulder in filter'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] text-slate-300 font-bold px-1 select-none">
                {currentIndex + 1} of {totalFiltered}
              </span>
              <button
                type="button"
                onClick={() => nextBoulder && onNavigateBoulder?.(nextBoulder)}
                disabled={!nextBoulder}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                title={nextBoulder ? `Next Boulder: #${Math.round(nextBoulder.position_order)} ${nextBoulder.hold_colour} ${nextBoulder.grade}` : 'Last boulder in filter'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleArchive(boulder.id, !boulder.is_archived)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={boulder.is_archived ? 'Restore / Unarchive Climb' : 'Archive Climb'}
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* Photo Section */}
          {boulder.image_url && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-72">
              <img
                src={boulder.image_url}
                alt={`${boulder.hold_colour} ${boulder.grade}`}
                className={`w-full object-contain cursor-pointer transition-all ${
                  photoZoom ? 'max-h-none' : 'max-h-72'
                }`}
                onClick={() => setPhotoZoom(!photoZoom)}
              />
              <button
                type="button"
                onClick={() => setPhotoZoom(!photoZoom)}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur text-xs flex items-center gap-1"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>{photoZoom ? 'Zoom Out' : 'Zoom'}</span>
              </button>
            </div>
          )}

          {/* Quick Log Action Bar */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Your Status</p>
              <div className="mt-0.5">
                {userAttempt?.status === 'flashed' ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Flashed (1 try)
                  </span>
                ) : userAttempt?.status === 'sent' ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Sent ({userAttempt.attempt_count} tries)
                  </span>
                ) : userAttempt?.status === 'attempted' ? (
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Projecting ({userAttempt.attempt_count} tries)
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not logged yet</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {climbers.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    // Open for first crew member who is not current user, or current user
                    const other = climbers.find(c => c.id !== currentUserId) || climbers[0];
                    onQuickLog(boulder, other.id);
                  }}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active-press transition-all flex items-center gap-1.5 shadow"
                  title="Log on behalf of someone in your crew"
                >
                  <Users className="w-3.5 h-3.5" style={{ color: activeColor }} />
                  <span>Log for Crew</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickLog(boulder, currentUserId);
                }}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold active-press transition-all shadow"
              >
                {userAttempt ? 'Update Log' : 'Quick Log'}
              </button>
            </div>
          </div>

          {/* Climb Details */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Climb Info</h3>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 space-y-2 text-xs">
              {boulder.notes && (
                <div>
                  <span className="text-slate-400 font-medium">Notes / Beta:</span>
                  <p className="text-slate-200 mt-0.5 leading-relaxed">{boulder.notes}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-400 pt-1 text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Added {boulder.date_added}
                </span>
                {boulder.is_archived && (
                  <span className="text-rose-400 font-semibold uppercase font-mono">Archived</span>
                )}
              </div>
            </div>
          </div>

          {/* Group Climber Statuses */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Group Ticklist</h3>
              <span className="text-[11px] text-slate-500">Tap a climber to log for them</span>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
              <ClimberStatusPills
                climbers={climbers}
                attempts={attempts}
                currentUserId={currentUserId}
                size="md"
                onClimberClick={(climberId) => {
                  onClose();
                  onQuickLog(boulder, climberId);
                }}
              />
            </div>
          </div>

          {/* Beta Discussion / Threaded Comments */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Beta & Discussion ({boulderComments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-2">
              {boulderComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No beta notes yet. Share a foot placement or crux sequence!
                </p>
              ) : (
                boulderComments.map((comment) => {
                  const author = climbers.find(c => c.id === comment.user_id);
                  const isCurrent = comment.user_id === currentUserId;

                  return (
                    <div
                      key={comment.id}
                      style={isCurrent ? {
                        backgroundColor: `${author?.accent_color || activeColor}12`,
                        borderColor: `${author?.accent_color || activeColor}30`
                      } : undefined}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        isCurrent
                          ? ''
                          : 'bg-slate-800/50 border-slate-800'
                      }`}
                    >
                      <ClimberAvatar profile={author || comment.profile} size="xs" />
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className="font-bold"
                            style={{ color: author?.accent_color || (isCurrent ? activeColor : '#e2e8f0') }}
                          >
                            {author?.display_name || comment.profile?.display_name || 'Climber'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">
                              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isCurrent && onDeleteComment && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Delete this comment?')) {
                                    onDeleteComment(comment.id);
                                  }
                                }}
                                className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add beta, sequence advice, or hype..."
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="p-2.5 rounded-xl active-press transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
