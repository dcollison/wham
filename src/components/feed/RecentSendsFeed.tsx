import React, { useState, useMemo, useEffect } from 'react';
import { Attempt, Boulder, Profile, Gym, GymArea } from '../../types';
import { HoldBadge } from '../boulders/HoldBadge';
import { ClimberAvatar } from '../ClimberAvatar';
import {
  Zap,
  Check,
  Clock,
  ChevronRight,
  Trophy,
  Calendar,
  Search
} from 'lucide-react';

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

  // Periodic ticker to refresh relative time labels every 30 seconds
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
  const { filteredSends, stats, climberCounts } = useMemo(() => {
    const boulderMap = new Map(boulders.map((b) => [b.id, b]));
    const climberMap = new Map(climbers.map((c) => [c.id, c]));
    const areaMap = new Map(areas.map((a) => [a.id, a]));
    const gymMap = new Map(gyms.map((g) => [g.id, g]));

    const climberSendCounts: Record<string, number> = {};
    for (const att of attempts) {
      if (att.status === 'sent' || att.status === 'flashed') {
        climberSendCounts[att.user_id] = (climberSendCounts[att.user_id] || 0) + 1;
      }
    }

    type SendItem = {
      attempt: Attempt;
      boulder: Boulder;
      climber: Profile | undefined;
      area: GymArea | null;
      gym: Gym | null;
      loggedAt: number;
    };

    const valid: SendItem[] = [];
    for (const att of attempts) {
      const boulder = boulderMap.get(att.boulder_id);
      if (!boulder) continue;
      const climber = climberMap.get(att.user_id) || att.profile;
      const area = areaMap.get(boulder.area_id) || null;
      const gym = boulder.gym_id ? gymMap.get(boulder.gym_id) || null : null;
      valid.push({
        attempt: att,
        boulder,
        climber,
        area,
        gym,
        loggedAt: att.logged_at ? new Date(att.logged_at).getTime() : 0
      });
    }

    const totalCrewSends = valid.filter((i) => i.attempt.status === 'sent' || i.attempt.status === 'flashed').length;
    const totalCrewFlashes = valid.filter((i) => i.attempt.status === 'flashed').length;

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

    if (selectedClimberId !== 'all') {
      filtered = filtered.filter((i) => i.attempt.user_id === selectedClimberId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((i) => {
        const climberName = i.climber?.display_name?.toLowerCase() || '';
        const colour = i.boulder.hold_colour.toLowerCase();
        const grade = i.boulder.grade.toLowerCase();
        const notes = i.boulder.notes?.toLowerCase() || '';
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

    filtered.sort((a, b) => b.loggedAt - a.loggedAt);

    return {
      filteredSends: filtered,
      stats: {
        totalCrewSends,
        totalCrewFlashes
      },
      climberCounts: climberSendCounts
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
      {/* Header & Stats Strip */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              Recent Sends
            </h2>
            <p className="text-xs text-slate-400">
              Live crew activity stream
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 tabular-nums">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>{stats.totalCrewFlashes} Flashes</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 tabular-nums">
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all active-press ${
              selectedClimberId === 'all'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'bg-surface hover:bg-surface-elevated text-slate-400 hover:text-white border border-white/[0.08]'
            }`}
          >
            All Crew
          </button>

          {climbers.map((c) => {
            const isSelected = selectedClimberId === c.id;
            const climberSendsCount = climberCounts[c.id] || 0;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClimberId(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all active-press border ${
                  isSelected
                    ? 'bg-surface-elevated text-white border-white/[0.25] shadow-xs'
                    : 'bg-surface hover:bg-surface-elevated text-slate-400 hover:text-slate-200 border-white/[0.08]'
                }`}
                style={isSelected ? { borderColor: c.accent_color || activeColor } : undefined}
              >
                <ClimberAvatar profile={c} size="xs" />
                <span>{c.display_name}</span>
                <span className="font-mono text-[10px] opacity-75 font-bold tabular-nums">
                  {climberSendsCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subfilters: Send Type Toggle & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-0.5">
          <div className="flex items-center gap-1 bg-surface border border-white/[0.08] p-1 rounded-full overflow-x-auto no-scrollbar shadow-xs">
            <button
              type="button"
              onClick={() => setSendTypeFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all active-press ${
                sendTypeFilter === 'all' ? 'bg-surface-elevated text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Sends
            </button>
            <button
              type="button"
              onClick={() => setSendTypeFilter('flashes')}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all active-press ${
                sendTypeFilter === 'flashes' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Flashes</span>
            </button>
            <button
              type="button"
              onClick={() => setSendTypeFilter('sends')}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all active-press ${
                sendTypeFilter === 'sends' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Check className="w-3 h-3 stroke-[3] text-emerald-400" />
              <span>Sends Only</span>
            </button>
            <button
              type="button"
              onClick={() => setSendTypeFilter('projects')}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all active-press ${
                sendTypeFilter === 'projects' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3 text-sky-400" />
              <span>Working</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search climber, grade, hold..."
              className="w-full bg-surface border border-white/[0.08] text-slate-100 placeholder:text-slate-500 text-xs rounded-full pl-9 pr-4 py-1.5 outline-none focus:border-white/[0.2] focus:ring-1 focus:ring-white/[0.1] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Condensed Send List */}
      {filteredSends.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-surface border border-white/[0.08] rounded-2xl text-center gap-3 my-6">
          <div className="p-3 bg-surface-elevated rounded-2xl" style={{ color: activeColor }}>
            <Trophy className="w-6 h-6 opacity-60" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">No sends found</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              No logged climbs match your current filters. Try selecting "All Crew" or clearing your search.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedSends).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-2">
              {/* Date Group Header */}
              <div className="flex items-center gap-2 px-1 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">
                  {dateLabel}
                </span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {items.length} {items.length === 1 ? 'send' : 'sends'}
                </span>
                <div className="flex-1 h-px bg-white/[0.06] ml-2" />
              </div>

              {/* Condensed Items List */}
              <div className="flex flex-col gap-1.5">
                {items.map(({ attempt, boulder, climber, area, gym }) => {
                  if (!boulder) return null;

                  const isFlash = attempt.status === 'flashed';
                  const isSent = attempt.status === 'sent';
                  const isYou = climber?.id === currentUserId;

                  return (
                    <div
                      key={attempt.id}
                      onClick={() => onSelectBoulder(boulder)}
                      className="feed-card-deferred group flex items-center justify-between gap-3 p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-surface/90 hover:bg-surface-elevated border border-white/[0.06] hover:border-white/[0.14] transition-all cursor-pointer active-press"
                    >
                      {/* Left: Climber & Action info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ClimberAvatar profile={climber} size="xs" showBorderRing />
                        
                        <div className="flex flex-col min-w-0">
                          {/* Row 1: Climber Name + Status Pill */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">
                              {climber?.display_name || 'Climber'}
                            </span>
                            {isYou && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full"
                                style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
                              >
                                You
                              </span>
                            )}

                            {/* Status badge: Short form "F", "S 2", "P 2" */}
                            {isFlash ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-heading font-black text-slate-950 bg-amber-400 px-2 py-0.5 rounded-full shadow-xs"
                                title="Flashed on 1st try"
                              >
                                <Zap className="w-3 h-3 fill-current" />
                                <span>F</span>
                              </span>
                            ) : isSent ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-heading font-black text-slate-950 bg-emerald-400 px-2 py-0.5 rounded-full shadow-xs"
                                title={`Sent on try ${attempt.attempt_count}`}
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>S {attempt.attempt_count}</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-sky-300 bg-sky-500/15 border border-sky-500/35 px-2 py-0.5 rounded-full"
                                title={`Projecting on try ${attempt.attempt_count}`}
                              >
                                <Clock className="w-3 h-3 text-sky-400" />
                                <span>P {attempt.attempt_count}</span>
                              </span>
                            )}
                          </div>

                          {/* Row 2: Boulder details (position, hold badge, area) */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 min-w-0">
                            <span className="font-mono text-[10px] text-slate-400 font-semibold tabular-nums">
                              #{boulder.comp_number ?? Math.round(boulder.position_order)}
                            </span>
                            <HoldBadge color={boulder.hold_colour} grade={boulder.grade} size="sm" />
                            <span className="truncate text-slate-400 text-[11px]">
                              {area?.name || 'Wall'}{gym ? ` • ${gym.name}` : ''}
                            </span>
                            {boulder.notes && (
                              <span className="hidden sm:inline text-[11px] text-slate-500 truncate max-w-xs italic">
                                "{boulder.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Photo thumbnail, Timestamp, Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        {boulder.image_url && (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/[0.08] bg-carbon shrink-0">
                            <img
                              src={boulder.image_url}
                              alt={`${boulder.hold_colour} ${boulder.grade}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {formatRelativeTime(attempt.logged_at)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
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
