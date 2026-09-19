import React from 'react';
import { Gym, GymArea, Profile } from '../types';
import { Zap, ChevronDown, Filter, Plus, Archive, Settings, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentGym: Gym | null;
  gyms: Gym[];
  onSelectGym: (gym: Gym) => void;
  currentArea: GymArea | null;
  areas: GymArea[];
  onSelectArea: (area: GymArea | null) => void;
  currentUser: Profile | null;
  climbers: Profile[];
  onOpenProfileSwitcher: () => void;
  onOpenAddBoulder: () => void;
  onOpenAreaReset: () => void;
  hideSent: boolean;
  onToggleHideSent: () => void;
  showArchived: boolean;
  onToggleShowArchived: () => void;
  isDemoMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentGym,
  gyms,
  onSelectGym,
  currentArea,
  areas,
  onSelectArea,
  currentUser,
  climbers,
  onOpenProfileSwitcher,
  onOpenAddBoulder,
  onOpenAreaReset,
  hideSent,
  onToggleHideSent,
  showArchived,
  onToggleShowArchived,
  isDemoMode
}) => {
  const currentGymAreas = areas
    .filter(a => a.gym_id === currentGym?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-2 flex flex-col gap-3">
      {/* Top Bar: Brand, Gym Selector, Profile & Settings */}
      <div className="flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black text-lg shadow-md shadow-amber-400/20 active:scale-95 transition-transform">
            ⚡
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white font-sans flex items-center gap-0.5">
              Wham<span className="text-amber-400">.</span>
            </span>
          </div>
          {isDemoMode && (
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
              Demo Mode
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
            className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-100 font-bold text-xs rounded-xl py-2 pl-3 pr-8 outline-none focus:border-amber-400 cursor-pointer shadow-sm"
          >
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                📍 {gym.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Climber Profile Avatar / Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenProfileSwitcher}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl py-1.5 px-2.5 transition-colors active-press"
            title="Switch Climber / Account"
          >
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.display_name}
                className="w-5 h-5 rounded-full bg-amber-400 shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-amber-400 text-black text-[11px] font-black flex items-center justify-center shrink-0">
                {currentUser?.display_name?.charAt(0) || 'C'}
              </div>
            )}
            <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
              {currentUser?.display_name || 'Climber'}
            </span>
          </button>
        </div>
      </div>

      {/* Area Tabs Slider with "All Areas" option */}
      {currentGymAreas.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Option to not filter by area, just gym */}
          <button
            type="button"
            onClick={() => onSelectArea(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 flex items-center gap-1.5 ${
              currentArea === null
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'bg-slate-900 border border-slate-850 text-slate-300 hover:text-white hover:bg-slate-850'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 ${
                  isSelected
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'bg-slate-900 border border-slate-850 text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                {area.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter & Action Controls: Hide Sent, Show Archived, Add Boulder, Area Reset */}
      <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-900 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Hide Sent Toggle (Requirement 4.B) */}
          <button
            type="button"
            onClick={onToggleHideSent}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors active-press ${
              hideSent
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle to hide boulders you have already flashed or sent"
          >
            <Filter className="w-3 h-3" />
            <span>Hide Sent</span>
          </button>

          {/* Show Archived Toggle */}
          <button
            type="button"
            onClick={onToggleShowArchived}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              showArchived
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            title="Show historically archived climbs from resets"
          >
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Area Reset Action (Requirement 4.C) */}
          <button
            type="button"
            onClick={onOpenAreaReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-rose-900/50 transition-colors"
            title="Bulk Reset: Archive Entire Area"
          >
            <Archive className="w-4 h-4" />
          </button>

          {/* Add Boulder Action */}
          <button
            type="button"
            onClick={onOpenAddBoulder}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-2.5 py-1.5 rounded-xl shadow transition-all active-press"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Climb</span>
          </button>
        </div>
      </div>
    </header>
  );
};
