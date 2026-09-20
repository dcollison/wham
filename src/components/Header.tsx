import React from 'react';
import { Gym, GymArea, Profile } from '../types';
import { ClimberAvatar } from './ClimberAvatar';
import { Zap, ChevronDown, Plus, Archive, Layers, Trophy } from 'lucide-react';

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
  const currentGymAreas = areas
    .filter(a => a.gym_id === currentGym?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-2.5 flex flex-col gap-3">
      {/* Top Bar: Brand, Gym Selector, Profile & Settings */}
      <div className="flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-md shadow-amber-400/20 active:scale-95 transition-transform">
            <Zap className="w-4 h-4 fill-black text-black stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white font-heading flex items-center gap-0.5">
              Wham<span className="text-amber-400">.</span>
            </span>
          </div>
          {isDemoMode && (
            <span className="hidden sm:inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800/90 text-amber-300 border border-slate-700">
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
            className="appearance-none bg-slate-900 hover:bg-slate-850 border border-slate-700/90 hover:border-slate-600 text-slate-100 font-bold text-xs sm:text-sm rounded-xl py-2 pl-3.5 pr-8 outline-none focus:border-amber-400 cursor-pointer shadow-sm transition-colors"
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
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-amber-400/50 rounded-xl py-2 px-3 transition-colors active-press shadow-sm group"
              title="Open Gym Comp Leaderboard"
            >
              <Trophy className="w-4 h-4 text-amber-400 stroke-[2.5] group-hover:scale-110 transition-transform" />
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
        <>
          {/* Area Tabs Slider with "All Areas" option */}
          {currentGymAreas.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => onSelectArea(null)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all active-press shrink-0 flex items-center gap-1.5 ${
                  currentArea === null
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
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
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all active-press shrink-0 ${
                      isSelected
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    {area.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter & Action Controls: Show Archived, Add Boulder, Area Reset */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900 text-xs">
            <div className="flex items-center gap-2">
              {/* Show Archived Toggle */}
              <button
                type="button"
                onClick={onToggleShowArchived}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  showArchived
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                }`}
                title="Show historically archived climbs from wall resets"
              >
                {showArchived ? 'Showing Archived' : 'Archived Climbs'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Area Reset Action */}
              <button
                type="button"
                onClick={onOpenAreaReset}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-rose-900/50 transition-colors"
                title="Bulk Reset: Archive Entire Area"
              >
                <Archive className="w-4 h-4" />
              </button>

              {/* Bulk Add Action */}
              {onOpenBulkAdd && (
                <button
                  type="button"
                  onClick={onOpenBulkAdd}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700/80 font-bold text-xs sm:text-sm px-3 py-2 rounded-xl shadow transition-all active-press"
                  title="Bulk add climbs to this area"
                >
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="hidden xs:inline">Bulk Log</span>
                </button>
              )}

              {/* Add Boulder Action */}
              <button
                type="button"
                onClick={onOpenAddBoulder}
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow transition-all active-press"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Climb</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
