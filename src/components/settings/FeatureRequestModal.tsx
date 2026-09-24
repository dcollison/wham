import React, { useState, useEffect } from 'react';
import { Profile, FeatureCategory } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { X, Lightbulb, Sparkles, Zap, Palette, Bug, Check } from 'lucide-react';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  climbers: Profile[];
  onSubmit: (params: {
    userId: string;
    title: string;
    description?: string;
    category: FeatureCategory;
  }) => Promise<void>;
}

const CATEGORIES: {
  id: FeatureCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: 'quality_of_life',
    label: 'QoL & Speed',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40'
  },
  {
    id: 'feature',
    label: 'New Feature',
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40'
  },
  {
    id: 'ui',
    label: 'UI & Polish',
    icon: Palette,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/40'
  },
  {
    id: 'bug',
    label: 'Bug / Glitch',
    icon: Bug,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40'
  }
];

export const FeatureRequestModal: React.FC<FeatureRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  climbers,
  onSubmit
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || climbers[0]?.id || '');
  const [category, setCategory] = useState<FeatureCategory>('quality_of_life');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentUser?.id) {
        setSelectedUserId(currentUser.id);
      }
      setTitle('');
      setDescription('');
      setCategory('quality_of_life');
      setError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const activeClimber = climbers.find((c) => c.id === selectedUserId) || currentUser || climbers[0];
  const activeColor = activeClimber?.accent_color || '#3B82F6';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a short title or summary for the idea.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        userId: selectedUserId,
        title: title.trim(),
        description: description.trim() || undefined,
        category
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface border border-slate-700/80 rounded-t-[32px] sm:rounded-4xl p-5 sm:p-6 sheet-elevated flex flex-col gap-4 max-h-[90vh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto sm:hidden -mt-1 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2.5 rounded-2xl"
              style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
            >
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Suggest a Feature</h2>
              <p className="text-xs text-slate-400">Add an idea, QoL improvement, or report a bug</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Submitter Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-heading">
              Proposed By
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {climbers.map((climber) => {
                const isSelected = climber.id === selectedUserId;
                const cColor = climber.accent_color || '#3B82F6';
                return (
                  <button
                    key={climber.id}
                    type="button"
                    onClick={() => setSelectedUserId(climber.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all active-press text-left ${
                      isSelected
                        ? 'bg-slate-800 shadow-sm ring-1'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    style={
                      isSelected
                        ? { borderColor: cColor }
                        : undefined
                    }
                  >
                    <ClimberAvatar profile={climber} size="sm" />
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {climber.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-heading">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all active-press ${
                      isSelected
                        ? `${cat.bg} ${cat.border} ${cat.color} shadow-sm ring-1 ring-current`
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label
              htmlFor="feature-title"
              className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-heading"
            >
              Title / Summary <span className="text-amber-400">*</span>
            </label>
            <input
              id="feature-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rest timer countdown on boulder card"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 font-mono transition-colors"
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label
              htmlFor="feature-desc"
              className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-heading"
            >
              Details / Beta <span className="text-slate-500 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              id="feature-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How should it work? What problem does it solve for the crew at the gym?"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3.5 text-white text-xs leading-relaxed focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black shadow-md transition-all active-press disabled:opacity-50 disabled:cursor-not-allowed font-heading"
              style={{ backgroundColor: activeColor, color: '#000000' }}
            >
              {submitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Post Idea</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
