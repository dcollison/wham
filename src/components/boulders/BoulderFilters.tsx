import React, { useState } from 'react';
import { Grade, GRADES, HOLD_COLORS, Profile, getHoldSwatchStyle } from '../../types';
import {
  Filter,
  X,
  RotateCcw,
  Check,
  Zap,
  Clock,
  CircleDashed,
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  User
} from 'lucide-react';

export type StatusFilterType = 'all' | 'unsent' | 'sent' | 'projecting' | 'untouched';
export type SortByType = 'position' | 'grade-asc' | 'grade-desc' | 'most-sent' | 'least-sent';

export interface BoulderFiltersState {
  minGrade: Grade | null;
  maxGrade: Grade | null;
  statusFilter: StatusFilterType;
  selectedColour: string | null;
  targetClimberId: string;
  searchQuery: string;
  sortBy: SortByType;
}

interface BoulderFiltersProps {
  filters: BoulderFiltersState;
  onUpdateFilters: (updater: (prev: BoulderFiltersState) => BoulderFiltersState) => void;
  onResetFilters: () => void;
  availableColours: string[];
  colourCounts: Record<string, number>;
  climbers: Profile[];
  currentUserId?: string;
  totalBouldersCount: number;
  filteredBouldersCount: number;
}

// Common grade bracket presets
const GRADE_PRESETS: { label: string; min: Grade | null; max: Grade | null; subtitle?: string }[] = [
  { label: 'All Grades', min: null, max: null },
  { label: 'VB – V2', min: 'VB', max: 'V2', subtitle: 'Intro / Warmup' },
  { label: 'V3 – V5', min: 'V3', max: 'V5', subtitle: 'Intermediate' },
  { label: 'V6 – V8', min: 'V6', max: 'V8', subtitle: 'Advanced' },
  { label: 'V9+', min: 'V9', max: 'V10+', subtitle: 'Expert' }
];

export const BoulderFilters: React.FC<BoulderFiltersProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  availableColours,
  colourCounts,
  climbers,
  currentUserId,
  totalBouldersCount,
  filteredBouldersCount
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const activeClimber = climbers.find((c) => c.id === currentUserId);
  const activeColor = activeClimber?.accent_color || '#F59E0B';

  // Check which preset matches current min/max grade
  const activePreset = GRADE_PRESETS.find((p) => {
    if (p.min === null && p.max === null) {
      return filters.minGrade === null && filters.maxGrade === null;
    }
    return filters.minGrade === p.min && filters.maxGrade === p.max;
  });

  const isCustomGradeRange =
    (filters.minGrade !== null || filters.maxGrade !== null) && !activePreset;

  // Count how many non-default filter settings are active
  const activeFilterCount =
    (filters.minGrade !== null || filters.maxGrade !== null ? 1 : 0) +
    (filters.statusFilter !== 'all' ? 1 : 0) +
    (filters.selectedColour !== null ? 1 : 0) +
    (filters.sortBy !== 'position' ? 1 : 0) +
    (currentUserId && filters.targetClimberId !== currentUserId ? 1 : 0);

  const isAnyFilterActive =
    filters.minGrade !== null ||
    filters.maxGrade !== null ||
    filters.statusFilter !== 'all' ||
    filters.selectedColour !== null ||
    filters.searchQuery.trim() !== '' ||
    filters.sortBy !== 'position';

  const targetClimber = climbers.find((c) => c.id === filters.targetClimberId);
  const targetClimberName =
    filters.targetClimberId === currentUserId
      ? 'You'
      : targetClimber?.display_name || 'Climber';

  const handleSelectPreset = (min: Grade | null, max: Grade | null) => {
    onUpdateFilters((prev) => ({
      ...prev,
      minGrade: min,
      maxGrade: max
    }));
  };

  const handleMinGradeChange = (gradeStr: string) => {
    const newMin = gradeStr === 'ALL' ? null : (gradeStr as Grade);
    onUpdateFilters((prev) => {
      let newMax = prev.maxGrade;
      if (newMin && newMax) {
        const minIdx = GRADES.indexOf(newMin);
        const maxIdx = GRADES.indexOf(newMax);
        if (minIdx > maxIdx) {
          newMax = newMin;
        }
      }
      return {
        ...prev,
        minGrade: newMin,
        maxGrade: newMax
      };
    });
  };

  const handleMaxGradeChange = (gradeStr: string) => {
    const newMax = gradeStr === 'ALL' ? null : (gradeStr as Grade);
    onUpdateFilters((prev) => {
      let newMin = prev.minGrade;
      if (newMin && newMax) {
        const minIdx = GRADES.indexOf(newMin);
        const maxIdx = GRADES.indexOf(newMax);
        if (maxIdx < minIdx) {
          newMin = newMax;
        }
      }
      return {
        ...prev,
        minGrade: newMin,
        maxGrade: newMax
      };
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* COMPACT FILTER BAR: Search + Single Filter Icon/Button */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onUpdateFilters((p) => ({ ...p, searchQuery: e.target.value }))}
            placeholder="Search climbs, beta, holds..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-colors"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onUpdateFilters((p) => ({ ...p, searchQuery: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Single Filter Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active-press shrink-0 border ${
            activeFilterCount > 0
              ? 'bg-slate-850 text-white shadow-sm'
              : 'bg-slate-900/90 hover:bg-slate-850 text-slate-300 border-slate-800'
          }`}
          style={activeFilterCount > 0 ? { borderColor: `${activeColor}80` } : undefined}
          title="Filter and sort boulders"
        >
          <Filter
            className="w-3.5 h-3.5"
            style={activeFilterCount > 0 ? { color: activeColor } : undefined}
          />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span
              className="w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center text-black"
              style={{ backgroundColor: activeColor }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ACTIVE FILTER CHIPS & COUNT SUMMARY (Only shown when filters are applied or count needed) */}
      {isAnyFilterActive ? (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <span className="font-mono text-slate-400 text-[11px] shrink-0">
            <strong className="text-white">{filteredBouldersCount}</strong>/{totalBouldersCount}
          </span>

          {/* Grade filter chip */}
          {(filters.minGrade || filters.maxGrade) && (
            <span className="inline-flex items-center gap-1 bg-slate-850 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0">
              <span>
                {filters.minGrade || 'VB'} – {filters.maxGrade || 'V10+'}
              </span>
              <button
                type="button"
                onClick={() => handleSelectPreset(null, null)}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Status filter chip */}
          {filters.statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-slate-850 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0">
              <span>
                {filters.statusFilter === 'unsent' && `To Do (${targetClimberName})`}
                {filters.statusFilter === 'sent' && `Sent (${targetClimberName})`}
                {filters.statusFilter === 'projecting' && `Projecting (${targetClimberName})`}
              </span>
              <button
                type="button"
                onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'all' }))}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Colour chip */}
          {filters.selectedColour && (
            <span className="inline-flex items-center gap-1 bg-slate-850 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0">
              <span
                className="w-2 h-2 rounded-full"
                style={getHoldSwatchStyle(filters.selectedColour)}
              />
              <span>{filters.selectedColour}</span>
              <button
                type="button"
                onClick={() => onUpdateFilters((p) => ({ ...p, selectedColour: null }))}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Sort chip */}
          {filters.sortBy !== 'position' && (
            <span className="inline-flex items-center gap-1 bg-slate-850 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0">
              <span>
                {filters.sortBy === 'grade-asc' && 'Grade: Easy First'}
                {filters.sortBy === 'grade-desc' && 'Grade: Hard First'}
                {filters.sortBy === 'most-sent' && 'Most Sent'}
                {filters.sortBy === 'least-sent' && 'Unsent First'}
              </span>
              <button
                type="button"
                onClick={() => onUpdateFilters((p) => ({ ...p, sortBy: 'position' }))}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Reset all button */}
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors ml-auto shrink-0 pl-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
          <span>{totalBouldersCount} {totalBouldersCount === 1 ? 'climb' : 'climbs'} in wall flow order</span>
        </div>
      )}

      {/* DEDICATED FILTER MODAL / SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" style={{ color: activeColor }} />
                <h2 className="text-base font-bold text-white">Filter & Sort Wall</h2>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Climber Perspective */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" style={{ color: activeColor }} />
                <span>Filter Status for Climber:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {climbers.map((c) => {
                  const isSelected = filters.targetClimberId === c.id;
                  const isCurrent = c.id === currentUserId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onUpdateFilters((p) => ({ ...p, targetClimberId: c.id }))}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all active-press ${
                        isSelected
                          ? 'bg-slate-800 text-white shadow-sm ring-1'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      style={isSelected ? { borderColor: c.accent_color || activeColor, color: '#fff' } : undefined}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.accent_color || '#F59E0B' }}
                      />
                      <span>{c.display_name}</span>
                      {isCurrent && <span className="text-[10px] opacity-75 font-mono">(You)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Send Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Send Status ({targetClimberName})
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'all' }))}
                  className={`py-2 rounded-xl transition-all text-center border ${
                    filters.statusFilter === 'all'
                      ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'unsent' }))}
                  className={`py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1 border ${
                    filters.statusFilter === 'unsent'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <CircleDashed className="w-3 h-3 text-amber-400" />
                  <span>To Do</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'sent' }))}
                  className={`py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1 border ${
                    filters.statusFilter === 'sent'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                  <span>Sent</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'projecting' }))}
                  className={`py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1 border ${
                    filters.statusFilter === 'projecting'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>Projects</span>
                </button>
              </div>
            </div>

            {/* Section 3: Grade Range Presets */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Grade Range
                </label>
                {(filters.minGrade || filters.maxGrade) && (
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(null, null)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1">
                {GRADE_PRESETS.map((preset) => {
                  const isSelected = activePreset?.label === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectPreset(preset.min, preset.max)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all text-center border ${
                        isSelected
                          ? 'text-black shadow-sm font-extrabold'
                          : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:text-white'
                      }`}
                      style={isSelected ? { backgroundColor: activeColor, borderColor: activeColor } : undefined}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Min & Max Dropdown selectors */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">From Min</span>
                  <select
                    value={filters.minGrade || 'ALL'}
                    onChange={(e) => handleMinGradeChange(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="ALL">Any (from VB)</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">To Max</span>
                  <select
                    value={filters.maxGrade || 'ALL'}
                    onChange={(e) => handleMaxGradeChange(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="ALL">Any (up to V10+)</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Hold Colour / Circuit */}
            {availableColours.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Hold Colour / Circuit
                  </label>
                  {filters.selectedColour && (
                    <button
                      type="button"
                      onClick={() => onUpdateFilters((p) => ({ ...p, selectedColour: null }))}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onUpdateFilters((p) => ({ ...p, selectedColour: null }))}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                      filters.selectedColour === null
                        ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    All Holds
                  </button>

                  {availableColours.map((col) => {
                    const isSelected = filters.selectedColour?.toLowerCase() === col.toLowerCase();
                    const count = colourCounts[col] || 0;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() =>
                          onUpdateFilters((p) => ({
                            ...p,
                            selectedColour: isSelected ? null : col
                          }))
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-slate-800 text-white border-slate-600 shadow-sm ring-1'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                        style={isSelected ? { borderColor: activeColor } : undefined}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30"
                          style={getHoldSwatchStyle(col)}
                        />
                        <span>{col}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 5: Sort Order */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" style={{ color: activeColor }} />
                <span>Sort Boulders By:</span>
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onUpdateFilters((p) => ({ ...p, sortBy: e.target.value as SortByType }))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 outline-none cursor-pointer"
              >
                <option value="position">Wall Flow (Clockwise)</option>
                <option value="grade-asc">Grade: Low to High (VB → V10+)</option>
                <option value="grade-desc">Grade: High to Low (V10+ → VB)</option>
                <option value="most-sent">Most Sent by Crew</option>
                <option value="least-sent">Unsent by Crew First</option>
              </select>
            </div>

            {/* Modal Footer: Reset All & Apply */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800 mt-1">
              <button
                type="button"
                onClick={onResetFilters}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Reset All
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md active-press transition-transform"
                style={{ backgroundColor: activeColor, color: '#000000' }}
              >
                Apply ({filteredBouldersCount} climbs)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
