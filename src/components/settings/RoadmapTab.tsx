import React, { useState } from 'react';
import {
  Profile,
  FeatureRequest,
  FeatureStatus,
  FeatureCategory
} from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import {
  Lightbulb,
  Plus,
  ThumbsUp,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Zap,
  Palette,
  Bug,
  Monitor,
  Loader2,
  ArrowUpRight
} from 'lucide-react';

interface RoadmapTabProps {
  featureRequests: FeatureRequest[];
  climbers: Profile[];
  currentUser: Profile | null;
  activeColor: string;
  onOpenSubmitModal: () => void;
  onUpdateStatus: (id: string, status: FeatureStatus) => Promise<void>;
  onToggleUpvote: (id: string, userId: string) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError?: (msg: string) => void;
}

const CATEGORY_MAP: Record<
  FeatureCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  quality_of_life: {
    label: 'QoL',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  feature: {
    label: 'Feature',
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  },
  ui: {
    label: 'UI & Style',
    icon: Palette,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30'
  },
  bug: {
    label: 'Bug',
    icon: Bug,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30'
  }
};


export const RoadmapTab: React.FC<RoadmapTabProps> = ({
  featureRequests,
  climbers,
  currentUser,
  activeColor,
  onOpenSubmitModal,
  onUpdateStatus,
  onToggleUpvote,
  onDeleteRequest,
  onShowSuccess,
  onShowError
}) => {
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCount = featureRequests.filter((r) => r.status !== 'shipped').length;
  const doneCount = featureRequests.filter((r) => r.status === 'shipped').length;

  // Filter requests
  const filteredRequests = featureRequests.filter((req) => {
    if (filter === 'open') return req.status !== 'shipped';
    if (filter === 'done') return req.status === 'shipped';
    return true;
  });

  // Sort: open items first (if in 'all' view), then higher upvotes, then newer
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (a.status === 'shipped' && b.status !== 'shipped') return 1;
    if (b.status === 'shipped' && a.status !== 'shipped') return -1;
    const votesDiff = (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
    if (votesDiff !== 0) return votesDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleCopyAIPrompt = (req: FeatureRequest) => {
    const requester = climbers.find((c) => c.id === req.user_id)?.display_name || 'Crew member';
    const catLabel = CATEGORY_MAP[req.category]?.label || req.category;

    const promptText = `Implement this Wham feature request:
- Title: ${req.title}
- Category: ${catLabel}
- Proposed by: ${requester}
- Status: ${req.status === 'shipped' ? 'Done' : 'Open'}
- Details: ${req.description || 'N/A'}`;

    navigator.clipboard.writeText(promptText);
    setCopiedId(req.id);
    onShowSuccess('Copied AI prompt to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths}mo ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
      {/* Top Banner & Submit CTA */}
      <div className="p-4 rounded-lg bg-carbon border border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-md shrink-0"
            style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
          >
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ideas &amp; Crew Roadmap</h3>
            <p className="text-xs text-slate-400">
              Suggest features, vote on priorities, and copy AI prompts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSubmitModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black transition-all active-press shrink-0"
          style={{ backgroundColor: activeColor, color: '#000000' }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Suggest Idea</span>
        </button>
      </div>

      {/* 80s / 90s CRT Retro Themes Exploration Banner */}
      <a
        href="./retro-themes.html"
        target="_blank"
        rel="noopener noreferrer"
        className="p-3.5 rounded-lg bg-carbon border border-amber-500/30 flex items-center justify-between gap-3 text-xs hover:border-amber-400/60 transition-colors active-press"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 text-amber-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-amber-300 block">80s &amp; 90s CRT Retheming Lab</span>
            <p className="text-slate-400 text-[11px] mt-0.5 truncate sm:whitespace-normal">
              Explore 4 bold retro designs: Arcade &apos;84, Studio Rack &apos;93, Trinitron &apos;97, and Rad VHS &apos;91.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0">
          <span>Launch</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </a>

      {/* Filter Tabs: Open, Done, All */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {(
          [
            { key: 'open', label: 'Open', count: openCount },
            { key: 'done', label: 'Done', count: doneCount },
            { key: 'all', label: 'All', count: featureRequests.length }
          ] as const
        ).map(({ key, label, count }) => {
          const isSelected = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors active-press flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-surface-high border-white/[0.18] text-white'
                  : 'bg-carbon border-white/[0.07] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  isSelected ? 'text-amber-300' : 'text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      <div className="flex flex-col gap-2.5">
        {sortedRequests.length === 0 ? (
          <div className="p-8 rounded-lg bg-carbon border border-dashed border-white/[0.08] text-center flex flex-col items-center gap-2">
            <Lightbulb className="w-8 h-8 text-slate-400" />
            <p className="text-xs text-slate-300 font-medium">
              {filter === 'open'
                ? 'All caught up — no open ideas right now.'
                : filter === 'done'
                ? 'No completed ideas yet.'
                : 'No feature requests yet. Got an idea to make Wham faster?'}
            </p>
            {filter !== 'done' && (
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="text-xs font-bold hover:underline transition-colors mt-1"
                style={{ color: activeColor }}
              >
                + Suggest an idea
              </button>
            )}
          </div>
        ) : (
          sortedRequests.map((req) => {
            const requester = climbers.find((c) => c.id === req.user_id);
            const cat = CATEGORY_MAP[req.category] || CATEGORY_MAP.feature;
            const CatIcon = cat.icon;
            const isDone = req.status === 'shipped';
            const hasVoted = currentUser ? req.upvotes?.includes(currentUser.id) : false;
            const upvoteCount = req.upvotes?.length || 0;
            const isCopied = copiedId === req.id;
            const isUpdatingStatus = pendingStatusId === req.id;
            const isUpdatingVote = pendingVoteId === req.id;
            const isDeleting = deletingId === req.id;

            return (
              <div
                key={req.id}
                className={`p-4 rounded-lg border transition-colors flex flex-col gap-3 group ${
                  isDone
                    ? 'bg-carbon/60 border-white/[0.05]'
                    : 'bg-carbon border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {/* Card Top: Submitter + Category Badge + Date + Done Tick Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClimberAvatar profile={requester} size="sm" />
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {requester?.display_name || 'Climber'}
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                      · {formatTimeAgo(req.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.border} ${cat.color}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </span>

                    {/* Tick button for done */}
                    <button
                      type="button"
                      disabled={isUpdatingStatus || isDeleting}
                      onClick={async () => {
                        setPendingStatusId(req.id);
                        try {
                          await onUpdateStatus(req.id, isDone ? 'backlog' : 'shipped');
                          onShowSuccess(isDone ? 'Marked as open' : 'Marked as done');
                        } catch (err: any) {
                          if (onShowError) onShowError(err?.message || 'Failed to update status');
                        } finally {
                          setPendingStatusId(null);
                        }
                      }}
                      aria-label={isDone ? 'Mark idea as open' : 'Mark idea as done'}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors active-press disabled:opacity-60 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 animate-pop'
                          : 'border-white/[0.12] bg-surface-elevated text-slate-400 hover:border-emerald-500 hover:text-emerald-400'
                      }`}
                      title={isDone ? 'Click to uncheck (mark open)' : 'Click to mark as done'}
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Body: Title + Description */}
                <div>
                  <h4
                    className={`text-sm font-bold tracking-tight leading-snug transition-colors ${
                      isDone ? 'line-through text-slate-400' : 'text-white'
                    }`}
                  >
                    {req.title}
                  </h4>
                  {req.description && (
                    <p
                      className={`text-xs mt-1 leading-relaxed whitespace-pre-wrap ${
                        isDone ? 'text-slate-400' : 'text-slate-300'
                      }`}
                    >
                      {req.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Upvotes + AI Prompt Copy + Delete */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                  {/* Upvote Button */}
                  <button
                    type="button"
                    disabled={isUpdatingVote || !currentUser}
                    onClick={async () => {
                      if (!currentUser) return;
                      setPendingVoteId(req.id);
                      try {
                        await onToggleUpvote(req.id, currentUser.id);
                      } finally {
                        setPendingVoteId(null);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-colors active-press border disabled:opacity-60 ${
                      hasVoted
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pop'
                        : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:text-white hover:bg-surface-high'
                    }`}
                    title={hasVoted ? 'Remove your vote' : 'Upvote this idea'}
                  >
                    {isUpdatingVote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                    )}
                    <span className="font-mono tabular-nums">{upvoteCount}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Copy AI Prompt Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyAIPrompt(req)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors active-press ${
                        isCopied
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pop'
                          : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:text-white hover:bg-surface-high'
                      }`}
                      title="Copy formatted prompt for Antigravity / Gemini to implement this"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                          <span className="hidden sm:inline">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="hidden sm:inline">Copy Prompt</span>
                        </>
                      )}
                    </button>

                    {/* Delete Request */}
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        if (window.confirm(`Delete feature request "${req.title}"?`)) {
                          setDeletingId(req.id);
                          try {
                            await onDeleteRequest(req.id);
                            onShowSuccess('Feature request deleted');
                          } catch (err: any) {
                            if (onShowError) onShowError(err?.message || 'Failed to delete request');
                          } finally {
                            setDeletingId(null);
                          }
                        }
                      }}
                      aria-label="Delete request"
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                      title="Delete request"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
