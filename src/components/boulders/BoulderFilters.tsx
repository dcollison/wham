import React, { useState } from 'react';
import { Grade, GRADES, HOLD_COLORS, Profile } from '../../types';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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
    (filters.searchQuery.trim() !== '' ? 1 : 0) +
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
          // Push max grade up to at least min
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
          // Push min grade down to at most max
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
    <div className="flex flex-col gap-2.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-sm">
      {/* ROW 1: Quick Grade Presets & Expand Toggle */}
      <div className="flex items-center justify-between gap-2">
        {/* Horizontal scrollable grade pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {GRADE_PRESETS.map((preset) => {
            const isSelected = activePreset?.label === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleSelectPreset(preset.min, preset.max)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-400 text-black shadow-sm font-extrabold'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
                title={preset.subtitle}
              >
                <span>{preset.label}</span>
              </button>
            );
          })}

          {isCustomGradeRange && (
            <div className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-amber-400 text-black shrink-0 flex items-center gap-1">
              <span>
                {filters.minGrade || 'VB'} – {filters.maxGrade || 'V10+'}
              </span>
              <button
                type="button"
                onClick={() => handleSelectPreset(null, null)}
                className="p-0.5 hover:bg-black/20 rounded-full"
                title="Clear custom grade range"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* More Filters / Expand Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active-press shrink-0 ${
            isExpanded || activeFilterCount > 0
              ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
          }`}
          title="Toggle grade range, colour, and search filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </button>
      </div>

      {/* ROW 2: Send Status Filter Tabs (All / Unsent To Do / Sent / Projecting) */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs">
        <button
          type="button"
          onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'all' }))}
          className={`py-1.5 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
            filters.statusFilter === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>All</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'unsent' }))}
          className={`py-1.5 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
            filters.statusFilter === 'unsent'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={`Show climbs ${targetClimberName} hasn't done yet`}
        >
          <CircleDashed className="w-3 h-3 text-amber-400" />
          <span>To Do</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'sent' }))}
          className={`py-1.5 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
            filters.statusFilter === 'sent'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={`Show climbs ${targetClimberName} has sent or flashed`}
        >
          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
          <span>Sent</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateFilters((p) => ({ ...p, statusFilter: 'projecting' }))}
          className={`py-1.5 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
            filters.statusFilter === 'projecting'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={`Show climbs ${targetClimberName} has attempted but not sent`}
        >
          <Clock className="w-3 h-3 text-blue-400" />
          <span>Projects</span>
        </button>
      </div>

      {/* EXPANDABLE ADVANCED FILTER DRAWER */}
      {isExpanded && (
        <div className="flex flex-col gap-3.5 pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
          {/* Section 1: Exact Grade Range (From Min to Max) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Custom Grade Range</span>
              </span>
              {(filters.minGrade || filters.maxGrade) && (
                <button
                  type="button"
                  onClick={() => handleSelectPreset(null, null)}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Reset Grade Range
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400 font-medium">From Min Grade</label>
                <select
                  value={filters.minGrade || 'ALL'}
                  onChange={(e) => handleMinGradeChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none focus:border-amber-400 cursor-pointer"
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
                <label className="text-[11px] text-slate-400 font-medium">To Max Grade</label>
                <select
                  value={filters.maxGrade || 'ALL'}
                  onChange={(e) => handleMaxGradeChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none focus:border-amber-400 cursor-pointer"
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

            {/* Interactive Visual Grade Strip */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {GRADES.map((g, idx) => {
                const minIdx = filters.minGrade ? GRADES.indexOf(filters.minGrade) : 0;
                const maxIdx = filters.maxGrade ? GRADES.indexOf(filters.maxGrade) : GRADES.length - 1;
                const isWithin = idx >= minIdx && idx <= maxIdx;
                const isExactBoundary = filters.minGrade === g || filters.maxGrade === g;

                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      // Tap to isolate single grade or set range
                      if (filters.minGrade === g && filters.maxGrade === g) {
                        handleSelectPreset(null, null);
                      } else {
                        handleSelectPreset(g, g);
                      }
                    }}
                    className={`flex-1 min-w-[34px] py-1 rounded-lg text-[10px] font-mono font-bold transition-all text-center ${
                      isExactBoundary
                        ? 'bg-amber-400 text-black shadow-sm ring-1 ring-amber-300 font-black'
                        : isWithin && (filters.minGrade || filters.maxGrade)
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950/60 text-slate-500 hover:text-slate-300 border border-slate-850'
                    }`}
                    title={`Click to isolate ${g}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Hold Colour / Circuit Swatches */}
          {availableColours.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Hold Colour / Circuit</span>
                {filters.selectedColour && (
                  <button
                    type="button"
                    onClick={() => onUpdateFilters((p) => ({ ...p, selectedColour: null }))}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Clear Colour
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onUpdateFilters((p) => ({ ...p, selectedColour: null }))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    filters.selectedColour === null
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border border-slate-850 hover:text-slate-200'
                  }`}
                >
                  All Colours
                </button>

                {availableColours.map((col) => {
                  const colorConfig = HOLD_COLORS[col];
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
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-slate-800 text-white border border-amber-400 shadow-sm ring-1 ring-amber-400/50'
                          : 'bg-slate-950 text-slate-300 border border-slate-850 hover:bg-slate-900'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30"
                        style={{ backgroundColor: colorConfig?.hex || '#94A3B8' }}
                      />
                      <span>{col}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Climber Perspective & Sorting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Climber perspective */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <User className="w-3 h-3 text-amber-400" />
                <span>Status for Climber:</span>
              </label>
              <select
                value={filters.targetClimberId}
                onChange={(e) => onUpdateFilters((p) => ({ ...p, targetClimberId: e.target.value }))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 outline-none focus:border-amber-400 cursor-pointer"
              >
                {climbers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} {c.id === currentUserId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>Sort Boulders By:</span>
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onUpdateFilters((p) => ({ ...p, sortBy: e.target.value as SortByType }))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="position">Wall Flow (Clockwise)</option>
                <option value="grade-asc">Grade: Low to High (VB → V10+)</option>
                <option value="grade-desc">Grade: High to Low (V10+ → VB)</option>
                <option value="most-sent">Most Sent by Crew</option>
                <option value="least-sent">Unsent by Crew First</option>
              </select>
            </div>
          </div>

          {/* Section 4: Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onUpdateFilters((p) => ({ ...p, searchQuery: e.target.value }))}
              placeholder="Search hold colour, grade, notes, or beta..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onUpdateFilters((p) => ({ ...p, searchQuery: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE FILTERS CHIPS & RESULT COUNT */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-850 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-slate-400 text-[11px]">
            Showing <strong className="text-amber-400">{filteredBouldersCount}</strong> of{' '}
            {totalBouldersCount} {totalBouldersCount === 1 ? 'climb' : 'climbs'}
          </span>

          {/* Active filter badges */}
          {(filters.minGrade || filters.maxGrade) && (
            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
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

          {filters.statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
              <span>
                {filters.statusFilter === 'unsent' && `To Do (${targetClimberName})`}
                {filters.statusFilter === 'sent' && `Sent (${targetClimberName})`}
                {filters.statusFilter === 'projecting' && `Projecting (${targetClimberName})`}
                {filters.statusFilter === 'untouched' && `Untouched (${targetClimberName})`}
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

          {filters.selectedColour && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: HOLD_COLORS[filters.selectedColour]?.hex || '#fff' }}
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

          {filters.searchQuery.trim() && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
              <span>"{filters.searchQuery.trim()}"</span>
              <button
                type="button"
                onClick={() => onUpdateFilters((p) => ({ ...p, searchQuery: '' }))}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {isAnyFilterActive && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
