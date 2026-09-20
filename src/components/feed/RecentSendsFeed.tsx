import React, { useState, useMemo } from 'react';
import { Attempt, Boulder, Profile, Gym, GymArea, Grade } from '../../types';
import { HoldBadge } from '../boulders/HoldBadge';
import { ClimberAvatar } from '../ClimberAvatar';
import {
  Zap,
  Check,
  Clock,
  ChevronRight,
  Filter,
  Flame,
  Trophy,
  Sparkles,
  Calendar,
  Layers,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RecentSendsFeedProps {
  attempts: Attempt[];
  boulders: Boulder[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  onSelectBoulder: (boulder: Boulder) => void;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
}

export const RecentSendsFeed: React.FC<RecentSendsFeedProps> = ({
  attempts,
  boulders,
  climbers,
  gyms,
  areas,
  currentUserId,
  onSelectBoulder,
  onQuickLog
}) => {
  // Filter state
  const [selectedClimberId, setSelectedClimberId] = useState<string>('all');
  const [sendTypeFilter, setSendTypeFilter] = useState<'all' | 'flashes' | 'sends' | 'projects'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeClimber = climbers.find((c) => c.id === currentUserId);
  const activeColor = activeClimber?.accent_color || '#F59E0B';

  // Props / reactions state stored in local storage: map of attemptId -> string[] (user IDs)
  const [propsMap, setPropsMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('wham_sends_props');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const migrated: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (Array.isArray(val)) {
          migrated[key] = val.filter((id) => typeof id === 'string');
        } else if (typeof val === 'number' && val > 0) {
          // Backward compatibility for legacy numeric counts
          migrated[key] = Array.from({ length: val }, (_, i) => `legacy-climber-${i}`);
        }
      }
      return migrated;
    } catch {
      return {};
    }
  });

  const handleGiveProps = (attemptId: string) => {
    const userId = currentUserId || 'local-climber';
    setPropsMap((prev) => {
      const currentList = Array.isArray(prev[attemptId]) ? prev[attemptId] : [];
      const hasPropped = currentList.includes(userId);
      let updatedList: string[];
      if (hasPropped) {
        // Toggle off / remove prop
        updatedList = currentList.filter((id) => id !== userId);
      } else {
        // Add prop (strictly limited to 1 per climber)
        updatedList = [...currentList, userId];
        // Celebration confetti only when giving props
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 },
          colors: [activeColor, '#FACC15', '#EF4444']
        });
      }
      const updated = { ...prev, [attemptId]: updatedList };
      localStorage.setItem('wham_sends_props', JSON.stringify(updated));
      return updated;
    });
  };

  // Helper relative time formatter
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(date.getTime())) return 'Recently';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Helper date group formatter
  const getDateGroup = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Earlier';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Process & filter all sends
  const { filteredSends, stats } = useMemo(() => {
    // We care about attempts that are flashed or sent by default, or projects if selected
    let raw = attempts.map((att) => {
      const boulder = boulders.find((b) => b.id === att.boulder_id);
      const climber = climbers.find((c) => c.id === att.user_id) || att.profile;
      const area = boulder ? areas.find((a) => a.id === boulder.area_id) : null;
      const gym = boulder ? gyms.find((g) => g.id === boulder.gym_id) : null;
      return {
        attempt: att,
        boulder,
        climber,
        area,
        gym,
        loggedAt: att.logged_at ? new Date(att.logged_at).getTime() : 0
      };
    });

    // Valid items with existing boulder
    const valid = raw.filter((item) => item.boulder !== undefined);

    // Global stats across valid attempts
    const totalCrewSends = valid.filter((i) => i.attempt.status === 'sent' || i.attempt.status === 'flashed').length;
    const totalCrewFlashes = valid.filter((i) => i.attempt.status === 'flashed').length;

    // Filter by send type
    let filtered = valid;
    if (sendTypeFilter === 'all') {
      filtered = filtered.filter((i) => i.attempt.status === 'sent' || i.attempt.status === 'flashed');
    } else if (sendTypeFilter === 'flashes') {
      filtered = filtered.filter((i) => i.attempt.status === 'flashed');
    } else if (sendTypeFilter === 'sends') {
      filtered = filtered.filter((i) => i.attempt.status === 'sent');
    } else if (sendTypeFilter === 'projects') {
      filtered = filtered.filter((i) => i.attempt.status === 'attempted');
    }

    // Filter by climber
    if (selectedClimberId !== 'all') {
      filtered = filtered.filter((i) => i.attempt.user_id === selectedClimberId);
    }

    // Search query (grade, hold colour, notes, climber name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((i) => {
        const climberName = i.climber?.display_name?.toLowerCase() || '';
        const colour = i.boulder?.hold_colour?.toLowerCase() || '';
        const grade = i.boulder?.grade?.toLowerCase() || '';
        const notes = i.boulder?.notes?.toLowerCase() || '';
        const areaName = i.area?.name?.toLowerCase() || '';
        return (
          climberName.includes(q) ||
          colour.includes(q) ||
          grade.includes(q) ||
          notes.includes(q) ||
          areaName.includes(q)
        );
      });
    }

    // Sort descending by loggedAt
    filtered.sort((a, b) => b.loggedAt - a.loggedAt);

    return {
      filteredSends: filtered,
      stats: {
        totalCrewSends,
        totalCrewFlashes
      }
    };
  }, [attempts, boulders, climbers, gyms, areas, sendTypeFilter, selectedClimberId, searchQuery]);

  // Group by date string
  const groupedSends = useMemo(() => {
    const groups: Record<string, typeof filteredSends> = {};
    filteredSends.forEach((item) => {
      const label = item.attempt.logged_at ? getDateGroup(item.attempt.logged_at) : 'Earlier';
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  }, [filteredSends]);

  return (
    <div className="flex flex-col gap-4 pb-20 animate-in fade-in duration-300">
      {/* Header & Stats Banner */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              Recent Sends
            </h2>
            <p className="text-xs text-slate-400">
              Live crew tops, flashes, and gym sends stream
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>{stats.totalCrewFlashes} Flashes</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{stats.totalCrewSends} Sends</span>
            </span>
          </div>
        </div>

        {/* Climber Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setSelectedClimberId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active-press ${
              selectedClimberId === 'all'
                ? 'text-black shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/80'
            }`}
            style={selectedClimberId === 'all' ? { backgroundColor: activeColor, color: '#000' } : undefined}
          >
            All Crew
          </button>

          {climbers.map((c) => {
            const isSelected = selectedClimberId === c.id;
            const climberSendsCount = attempts.filter(
              (a) => a.user_id === c.id && (a.status === 'sent' || a.status === 'flashed')
            ).length;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClimberId(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all active-press border ${
                  isSelected
                    ? 'bg-slate-800 border-amber-400 text-white shadow ring-1 ring-amber-400/50'
                    : 'bg-slate-850/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClimberAvatar profile={c} size="xs" />
                <span>{c.display_name}</span>
                <span className="font-mono text-[10px] opacity-75 font-bold">
                  ({climberSendsCount})
                </span>
              </button>
            );
          })}
        </div>

        {/* Subfilters: Send Type Toggle & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSendTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sendTypeFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Sends
            </button>
            <button
              type="button"
              onClick={() => setSendTypeFilter('flashes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                sendTypeFilter === 'flashes' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
              Flashes
            </button>
            <button
              type="button"
              onClick={() => setSendTypeFilter('sends')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                sendTypeFilter === 'sends' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Check className="w-3 h-3 stroke-[3] text-emerald-400" />
              Sends Only
            </button>
            <button
              type="button"
              onClick={() => setSendTypeFilter('projects')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                sendTypeFilter === 'projects' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3 text-blue-400" />
              Working
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search climber, grade, hold..."
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500 text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Feed Stream */}
      {filteredSends.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center gap-3 my-6">
          <div className="p-3 bg-slate-800 text-amber-400 rounded-2xl">
            <Trophy className="w-6 h-6 opacity-60" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">No sends found</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              No logged climbs match your current filters. Try selecting "All Crew" or clearing the search.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSends).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">
                  {dateLabel}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  ({items.length} {items.length === 1 ? 'climb' : 'climbs'})
                </span>
                <div className="flex-1 h-px bg-slate-800/80 ml-2" />
              </div>

              {/* Items for this date */}
              <div className="space-y-3">
                {items.map(({ attempt, boulder, climber, area, gym }) => {
                  if (!boulder) return null;

                  const isFlash = attempt.status === 'flashed';
                  const isSent = attempt.status === 'sent';
                  const isYou = climber?.id === currentUserId;
                  const proppedUserIds = Array.isArray(propsMap[attempt.id]) ? propsMap[attempt.id] : [];
                  const propsCount = proppedUserIds.length;
                  const isProppedByMe = currentUserId ? proppedUserIds.includes(currentUserId) : false;

                  return (
                    <div
                      key={attempt.id}
                      className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col gap-3 transition-all shadow-md active-press"
                    >
                      {/* Top row: Climber Avatar & Name, Status Badge, Relative Time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ClimberAvatar profile={climber} size="sm" showBorderRing />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {climber?.display_name || 'Climber'}
                              </span>
                              {isYou && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0"
                                  style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {formatRelativeTime(attempt.logged_at)}
                            </span>
                          </div>
                        </div>

                        {/* Send Status Badge */}
                        <div className="shrink-0">
                          {isFlash ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 rounded-full shadow-sm">
                              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              Flash (1 try)
                            </span>
                          ) : isSent ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 rounded-full shadow-sm">
                              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
                              Sent ({attempt.attempt_count}t)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 rounded-full shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              Project ({attempt.attempt_count}t)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle row: Boulder Details Card */}
                      <div
                        onClick={() => onSelectBoulder(boulder)}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-850/60 border border-slate-800 hover:border-slate-700/80 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                              #{Math.round(boulder.position_order)}
                            </span>
                            <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="sm" />
                            <span className="text-[11px] font-medium text-slate-400 truncate">
                              {gym?.name} • {area?.name}
                            </span>
                          </div>

                          {boulder.notes && (
                            <p className="text-xs text-slate-300 line-clamp-1 mt-1.5 italic">
                              "{boulder.notes}"
                            </p>
                          )}
                        </div>

                        {/* Thumbnail image if available */}
                        {boulder.image_url && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-800 shrink-0 shadow">
                            <img
                              src={boulder.image_url}
                              alt={`${boulder.hold_colour} ${boulder.grade}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>

                      {/* Bottom action row: Props, Quick Log, and View Details */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                        {/* Props / Hype Button (Limited to 1 per user, toggles) */}
                        <button
                          type="button"
                          onClick={() => handleGiveProps(attempt.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all active-press ${
                            isProppedByMe
                              ? 'text-white shadow-sm ring-1'
                              : propsCount > 0
                              ? 'bg-slate-800 border-slate-700 text-slate-300'
                              : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200'
                          }`}
                          style={isProppedByMe ? {
                            backgroundColor: `${activeColor}20`,
                            borderColor: activeColor,
                            color: activeColor
                          } : undefined}
                          title={isProppedByMe ? 'You gave props! Tap to remove' : 'Give props (limit 1 per climber)'}
                        >
                          <Flame className={`w-3.5 h-3.5 ${isProppedByMe ? 'fill-current' : propsCount > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                          <span className="font-semibold text-xs">{isProppedByMe ? 'Propped' : 'Props'}</span>
                          {propsCount > 0 && (
                            <span
                              className="font-mono text-xs font-bold px-1.5 py-0.2 rounded-full"
                              style={isProppedByMe ? { backgroundColor: `${activeColor}30`, color: activeColor } : { backgroundColor: '#334155', color: '#f1f5f9' }}
                            >
                              {propsCount}
                            </span>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onQuickLog(boulder, currentUserId)}
                            className="text-xs font-semibold text-slate-400 hover:text-amber-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            Log Send
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectBoulder(boulder)}
                            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 px-2 py-1.5"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
