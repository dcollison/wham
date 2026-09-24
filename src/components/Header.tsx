import React, { useState, useRef, useEffect } from 'react';
import { Gym, GymArea, Profile, Boulder } from '../types';
import { ClimberAvatar } from './ClimberAvatar';
import { Zap, ChevronDown, Plus, Archive, Layers, Trophy, MoreHorizontal, Check, Eye, ShieldCheck, Clock, Lightbulb } from 'lucide-react';
import { WhamLogo, WhamBadge } from './WhamLogo';
import { getAreaResetInfo } from '../lib/resetStatus';

interface HeaderProps {
  currentTab?: 'boulders' | 'beta' | 'stats' | 'settings';
  currentGym: Gym | null;
  gyms: Gym[];
  onSelectGym: (gym: Gym) => void;
  currentArea: GymArea | null;
  areas: GymArea[];
  onSelectArea: (area: GymArea | null) => void;
  currentUser: Profile | null;
  climbers: Profile[];
  boulders?: Boulder[];
  onOpenProfileSwitcher: () => void;
  onOpenLeaderboard?: () => void;
  onOpenAddBoulder: () => void;
  onOpenBulkAdd?: () => void;
  onOpenAreaReset: () => void;
  onOpenBackups?: () => void;
  onOpenIdeas?: () => void;
  openIdeasCount?: number;
  showArchived: boolean;
  onToggleShowArchived: () => void;
  onToggleAreaCompWall?: (areaId: string, isCompWall: boolean) => Promise<void>;
  isDemoMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab = 'boulders',
  currentGym,
  gyms,
  onSelectGym,
  currentArea,
  areas,
  onSelectArea,
  currentUser,
  climbers,
  boulders = [],
  onOpenProfileSwitcher,
  onOpenLeaderboard,
  onOpenAddBoulder,
  onOpenBulkAdd,
  onOpenAreaReset,
  onOpenBackups,
  onOpenIdeas,
  openIdeasCount = 0,
  showArchived,
  onToggleShowArchived,
  onToggleAreaCompWall,
  isDemoMode
}) => {
  const activeColor = currentUser?.accent_color || '#3B82F6';
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen]);

  const currentGymAreas = areas
    .filter(a => a.gym_id === currentGym?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.06] px-4 pb-3 flex flex-col gap-3 pt-safe shadow-xs">
      {/* Top Bar: Brand, Gym Selector, Profile & Settings */}
      <div className="flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <WhamBadge size="md" badgeColor={activeColor} logoColor="#000000" />
          <div>
            <span className="text-xl font-black tracking-tight text-white font-heading flex items-center gap-0.5">
              Wham<span style={{ color: activeColor }}>.</span>
            </span>
          </div>
          {isDemoMode ? (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('wham_force_demo');
                window.location.href = window.location.pathname;
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors shadow-xs active-press cursor-pointer"
              title="Viewing Demo Mode. Tap to switch back to Live App"
            >
              <span>Demo</span>
              <span className="text-[10px] text-amber-400/80 underline font-normal">Exit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('wham_force_demo', 'true');
                window.location.search = '?demo=true';
              }}
              className="hidden sm:inline-block text-[11px] font-medium px-3 py-1 rounded-full bg-slate-900 border border-white/[0.07] text-slate-400 hover:text-amber-300 hover:border-amber-400/30 transition-colors active-press cursor-pointer"
              title="View Demo Mode (Mock data with reset soon sample)"
            >
              Demo Mode
            </button>
          )}
        </div>

        {/* Gym Switcher Dropdown */}
        <div className="relative">
          <select
            value={currentGym?.id || ''}
            onChange={(e) => {
              const selected = gyms.find(g => g.id === e.target.value);
              if (selected) onSelectGym(selected);
            }}
            className="appearance-none bg-slate-900/90 hover:bg-slate-850 border border-white/[0.08] hover:border-white/[0.16] text-slate-100 font-bold text-xs sm:text-sm rounded-full py-1.5 pl-4 pr-8 outline-none cursor-pointer shadow-xs transition-colors"
          >
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Comp Leaderboard & Climber Profile Avatar */}
        <div className="flex items-center gap-2">
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-850 border border-white/[0.08] hover:border-white/[0.16] rounded-full py-1.5 px-3.5 transition-colors active-press shadow-xs group"
              title="Open Gym Comp Leaderboard"
            >
              <Trophy className="w-4 h-4 text-slate-300 group-hover:scale-110 transition-transform" />
              <span className="text-xs sm:text-sm font-bold text-slate-200 hidden sm:inline">Comp</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenProfileSwitcher}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-850 border border-white/[0.08] hover:border-white/[0.16] rounded-full py-1 pl-1.5 pr-3 transition-colors active-press shadow-xs"
            title="Switch Climber / Account"
          >
            <ClimberAvatar profile={currentUser} size="sm" showBorderRing />
            <span className="text-xs sm:text-sm font-bold text-slate-200 whitespace-nowrap flex items-center gap-1">
              <span>{currentUser?.display_name || 'Climber'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </button>
        </div>
      </div>

      {/* Area Tabs Slider & Boulder Controls (Only on Boulders tab) */}
      {currentTab === 'boulders' && (
        <div className="flex items-center justify-between gap-2.5 pt-0.5">
          {/* Area Tabs Slider with "All Areas" option */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onSelectArea(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 flex items-center gap-1 ${
                currentArea === null
                  ? 'text-slate-950 shadow-sm'
                  : 'bg-slate-900/90 border border-white/[0.07] text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
              style={currentArea === null ? { backgroundColor: activeColor, color: '#000' } : undefined}
            >
              <span>All Areas</span>
            </button>

            {currentGymAreas.map((area) => {
              const isSelected = currentArea?.id === area.id;
              const areaReset = getAreaResetInfo(area.id, boulders);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => onSelectArea(area)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-slate-950 shadow-sm'
                      : 'bg-slate-900/90 border border-white/[0.07] text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                  style={isSelected ? { backgroundColor: activeColor, color: '#000' } : undefined}
                  title={
                    areaReset.isDueForReset
                      ? `${area.name} (Set ${areaReset.weeksOld}w ago – reset soon)`
                      : area.name
                  }
                >
                  <span>{area.name}</span>
                  {area.is_comp_wall && (
                    <span
                      className={`inline-flex items-center shrink-0 ${
                        isSelected ? 'text-black' : 'text-amber-400'
                      }`}
                      title={`${area.name} (Comp Wall • Numbered climbs)`}
                    >
                      <Trophy className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                  {areaReset.isDueForReset && (
                    <span
                      className={`inline-flex items-center shrink-0 ${
                        isSelected ? 'text-black/80' : 'text-amber-400'
                      }`}
                      title={`Wall set ${areaReset.weeksOld} weeks ago – reset soon`}
                    >
                      <Clock className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Clean Action Cluster: Add Climb + More Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Action: Add Climb */}
            <button
              type="button"
              onClick={onOpenAddBoulder}
              className="flex items-center gap-1.5 font-bold text-xs px-4 py-1.5 rounded-full shadow-sm transition-all active-press"
              style={{ backgroundColor: activeColor, color: '#000000' }}
              title="Add a new problem to this area"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Climb</span>
            </button>

            {/* Overflow More Actions Menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`p-2 rounded-full border transition-all active-press ${
                  showArchived
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : isMoreMenuOpen
                    ? 'bg-slate-800 border-white/[0.15] text-white'
                    : 'bg-slate-900/90 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
                title="Area management options (Bulk log, Archive, Reset)"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Dropdown sheet */}
              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-2 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  {onOpenBulkAdd && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenBulkAdd();
                      }}
                      className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors"
                    >
                      <Layers className="w-4 h-4 text-slate-400" />
                      <span>Bulk Add Climbs</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onToggleShowArchived();
                    }}
                    className="flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span>Show Archived</span>
                    </span>
                    {showArchived && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>

                  {currentArea && onToggleAreaCompWall && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onToggleAreaCompWall(currentArea.id, !currentArea.is_comp_wall);
                      }}
                      className="flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Toggle between standard V-graded climbs and numbered comp wall problem tracking"
                    >
                      <span className="flex items-center gap-2.5">
                        <Trophy className={`w-4 h-4 ${currentArea.is_comp_wall ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>Comp Wall Mode</span>
                      </span>
                      {currentArea.is_comp_wall ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          ON
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-400">
                          OFF
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenIdeas && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenIdeas();
                      }}
                      className="flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span>Ideas & Requests</span>
                      </span>
                      {openIdeasCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/20 text-amber-300 font-bold">
                          {openIdeasCount}
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenBackups && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenBackups();
                      }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Backups & Safety</span>
                    </button>
                  )}

                  <div className="h-px bg-slate-800 my-0.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenAreaReset();
                    }}
                    className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition-colors"
                  >
                    <Archive className="w-4 h-4 text-rose-400" />
                    <span>Reset Area (Archive All)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
