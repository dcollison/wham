import React, { useState, useRef, useEffect } from 'react';
import { Gym, GymArea, Profile } from '../types';
import { ClimberAvatar } from './ClimberAvatar';
import { Zap, ChevronDown, Plus, Archive, Layers, Trophy, MoreHorizontal, Check, Eye } from 'lucide-react';
import { WhamLogo } from './WhamLogo';

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
  onOpenProfileSwitcher: () => void;
  onOpenLeaderboard?: () => void;
  onOpenAddBoulder: () => void;
  onOpenBulkAdd?: () => void;
  onOpenAreaReset: () => void;
  showArchived: boolean;
  onToggleShowArchived: () => void;
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
  onOpenProfileSwitcher,
  onOpenLeaderboard,
  onOpenAddBoulder,
  onOpenBulkAdd,
  onOpenAreaReset,
  showArchived,
  onToggleShowArchived,
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
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-2.5 flex flex-col gap-2.5">
      {/* Top Bar: Brand, Gym Selector, Profile & Settings */}
      <div className="flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl text-black flex items-center justify-center font-black shadow-md active:scale-95 transition-transform"
            style={{ backgroundColor: activeColor, boxShadow: `0 4px 14px ${activeColor}30` }}
          >
            <WhamLogo className="w-4 h-4" color="#000000" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white font-heading flex items-center gap-0.5">
              Wham<span style={{ color: activeColor }}>.</span>
            </span>
          </div>
          {isDemoMode && (
            <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
              Demo
            </span>
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
            className="appearance-none bg-slate-900 hover:bg-slate-850 border border-slate-700/90 hover:border-slate-600 text-slate-100 font-bold text-xs sm:text-sm rounded-xl py-2 pl-3.5 pr-8 outline-none cursor-pointer shadow-sm transition-colors"
          >
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Comp Leaderboard & Climber Profile Avatar */}
        <div className="flex items-center gap-2">
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700/80 rounded-xl py-2 px-3 transition-colors active-press shadow-sm group"
              title="Open Gym Comp Leaderboard"
            >
              <Trophy className="w-4 h-4 text-slate-300 group-hover:scale-110 transition-transform" />
              <span className="text-xs sm:text-sm font-bold text-slate-200 hidden sm:inline">Comp</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenProfileSwitcher}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-700/80 rounded-xl py-1.5 px-2.5 sm:px-3 transition-colors active-press"
            title="Switch Climber / Account"
          >
            <ClimberAvatar profile={currentUser} size="sm" showBorderRing />
            <span className="text-xs sm:text-sm font-bold text-slate-200 whitespace-nowrap flex items-center gap-1.5">
              <span>{currentUser?.display_name || 'Climber'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </button>
        </div>
      </div>

      {/* Area Tabs Slider & Boulder Controls (Only on Boulders tab) */}
      {currentTab === 'boulders' && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Area Tabs Slider with "All Areas" option */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onSelectArea(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 flex items-center gap-1 ${
                currentArea === null
                  ? 'text-black shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
              style={currentArea === null ? { backgroundColor: activeColor, color: '#000' } : undefined}
            >
              <span>All Areas</span>
            </button>

            {currentGymAreas.map((area) => {
              const isSelected = currentArea?.id === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => onSelectArea(area)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 ${
                    isSelected
                      ? 'text-black shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                  style={isSelected ? { backgroundColor: activeColor, color: '#000' } : undefined}
                >
                  {area.name}
                </button>
              );
            })}
          </div>

          {/* Clean Action Cluster: Add Climb + More Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Primary Action: Add Climb */}
            <button
              type="button"
              onClick={onOpenAddBoulder}
              className="flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-xl shadow transition-all active-press"
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
                className={`p-2 rounded-xl border transition-colors ${
                  showArchived
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : isMoreMenuOpen
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
                title="Area management options (Bulk log, Archive, Reset)"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Dropdown sheet */}
              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/90 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  {onOpenBulkAdd && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenBulkAdd();
                      }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
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
