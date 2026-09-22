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
  Filter
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

const STATUS_CONFIG: Record<
  FeatureStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  backlog: {
    label: 'Backlog',
    bg: 'bg-slate-800',
    text: 'text-slate-400',
    border: 'border-slate-700'
  },
  planned: {
    label: 'Planned',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30'
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30'
  },
  shipped: {
    label: 'Shipped',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30'
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
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter requests
  const filteredRequests = featureRequests.filter((req) => {
    if (selectedStatus === 'all') return true;
    return req.status === selectedStatus;
  });

  // Sort: Shipped at bottom, higher upvotes at top, newer at top
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (a.status === 'shipped' && b.status !== 'shipped') return 1;
    if (b.status === 'shipped' && a.status !== 'shipped') return -1;
    const votesDiff = (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
    if (votesDiff !== 0) return votesDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getStatusCount = (status: FeatureStatus | 'all') => {
    if (status === 'all') return featureRequests.length;
    return featureRequests.filter((r) => r.status === status).length;
  };

  const handleCopyAIPrompt = (req: FeatureRequest) => {
    const requester = climbers.find((c) => c.id === req.user_id)?.display_name || 'Crew member';
    const catLabel = CATEGORY_MAP[req.category]?.label || req.category;

    const promptText = `Implement this Wham feature request:
- Title: ${req.title}
- Category: ${catLabel}
- Proposed by: ${requester}
- Current Status: ${req.status}
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
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl shrink-0"
            style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
          >
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-heading">Ideas & Crew Roadmap</h3>
            <p className="text-xs text-slate-400">
              Suggest new features, vote on priorities, and copy AI prompts to code them.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSubmitModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all active-press shrink-0 font-heading"
          style={{ backgroundColor: activeColor, color: '#000000' }}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Suggest Idea</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {(['all', 'backlog', 'planned', 'in_progress', 'shipped'] as const).map((status) => {
          const isSelected = selectedStatus === status;
          const count = getStatusCount(status);
          const label =
            status === 'all'
              ? 'All'
              : status === 'backlog'
              ? 'Backlog'
              : status === 'planned'
              ? 'Planned'
              : status === 'in_progress'
              ? 'In Progress'
              : 'Shipped';

          return (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-slate-800 border-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-slate-500'
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
          <div className="p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center flex flex-col items-center gap-2">
            <Lightbulb className="w-8 h-8 text-slate-600" />
            <p className="text-xs text-slate-400 font-medium">
              {selectedStatus === 'all'
                ? 'No feature requests yet. Got an idea to make Wham faster?'
                : `No requests currently marked as "${selectedStatus}".`}
            </p>
            <button
              type="button"
              onClick={onOpenSubmitModal}
              className="text-xs font-bold hover:underline transition-colors mt-1"
              style={{ color: activeColor }}
            >
              + Suggest the first idea
            </button>
          </div>
        ) : (
          sortedRequests.map((req) => {
            const requester = climbers.find((c) => c.id === req.user_id);
            const cat = CATEGORY_MAP[req.category] || CATEGORY_MAP.feature;
            const CatIcon = cat.icon;
            const statusStyle = STATUS_CONFIG[req.status] || STATUS_CONFIG.backlog;
            const hasVoted = currentUser ? req.upvotes?.includes(currentUser.id) : false;
            const upvoteCount = req.upvotes?.length || 0;
            const isCopied = copiedId === req.id;

            return (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col gap-3 group"
              >
                {/* Card Top: Submitter + Category Badge + Date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClimberAvatar profile={requester} size="sm" />
                    <span className="text-xs font-bold text-slate-300 truncate">
                      {requester?.display_name || 'Climber'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      • {formatTimeAgo(req.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.border} ${cat.color}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </span>
                  </div>
                </div>

                {/* Card Body: Title + Description */}
                <div>
                  <h4 className="text-sm font-bold text-white font-heading tracking-tight leading-snug">
                    {req.title}
                  </h4>
                  {req.description && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">
                      {req.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Upvotes + Status Dropdown + AI Prompt Copy + Delete */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-850">
                  {/* Upvote Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser) {
                        onToggleUpvote(req.id, currentUser.id);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all active-press border ${
                      hasVoted
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                    title={hasVoted ? 'Remove your vote' : 'Upvote this idea'}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                    <span className="font-mono">{upvoteCount}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={req.status}
                        onChange={(e) => onUpdateStatus(req.id, e.target.value as FeatureStatus)}
                        className={`appearance-none text-[11px] font-bold rounded-xl py-1 pl-2.5 pr-6 border outline-none cursor-pointer transition-colors ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                        title="Change development status"
                      >
                        <option value="backlog">Backlog</option>
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="shipped">Shipped</option>
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] opacity-60">
                        ▼
                      </span>
                    </div>

                    {/* Copy AI Prompt Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyAIPrompt(req)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold border transition-colors active-press ${
                        isCopied
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      }`}
                      title="Copy formatted prompt for Antigravity / Gemini to implement this"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
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
                      onClick={async () => {
                        if (window.confirm(`Delete feature request "${req.title}"?`)) {
                          try {
                            await onDeleteRequest(req.id);
                            onShowSuccess('Feature request deleted');
                          } catch (err: any) {
                            if (onShowError) onShowError(err?.message || 'Failed to delete request');
                          }
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
