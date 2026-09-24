import React, { useMemo } from 'react';
import {
  User,
  Users,
  Flame,
  CheckCircle2,
  Zap,
  Target,
  Trophy,
  Award,
  Calendar,
  Layers,
  Activity,
  Feather,
  Scale,
  Sparkles,
  MessageSquareHeart,
  ChevronRight
} from 'lucide-react';
import { Profile, GymArea, Boulder, BoulderReview } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { ClimberStatsData, AccoladeItem } from '../../lib/statsEngine';
import { computeReviewAnalytics } from '../../lib/reviews';
import { HoldBadge } from '../boulders/HoldBadge';

export interface AreaBreakdownItem {
  area: GymArea;
  total: number;
  sent: number;
  remaining: number;
  pct: number;
}

interface StatsOverviewProps {
  viewMode: 'my' | 'group';
  onSetViewMode: (mode: 'my' | 'group') => void;
  selectedClimberId: string;
  onSelectClimberId: (id: string) => void;
  activeStats: ClimberStatsData;
  climbers: Profile[];
  currentUserId?: string;
  activeColor: string;
  showAccolades: boolean;
  onToggleAccolades: (show: boolean) => void;
  accoladesList: AccoladeItem[];
  areaBreakdown: AreaBreakdownItem[];
  activeGymBoulders: Boulder[];
  completionPct: number;
  userSentActiveBouldersCount: number;
  reviews?: BoulderReview[];
  onSelectBoulder?: (boulder: Boulder) => void;
}

const getAccoladeIcon = (id: string, color?: string) => {
  switch (id) {
    case 'apex-crusher':
      return <Flame className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'flash-artist':
      return <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />;
    case 'project-battler':
      return <Activity className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'circuit-explorer':
      return <Layers className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'the-sniper':
      return <Target className="w-5 h-5" style={color ? { color } : undefined} />;
    case 'session-devotee':
      return <Calendar className="w-5 h-5" style={color ? { color } : undefined} />;
    default:
      return <Award className="w-5 h-5" style={color ? { color } : undefined} />;
  }
};

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  viewMode,
  onSetViewMode,
  selectedClimberId,
  onSelectClimberId,
  activeStats,
  climbers,
  currentUserId,
  activeColor,
  showAccolades,
  onToggleAccolades,
  accoladesList,
  areaBreakdown,
  activeGymBoulders,
  completionPct,
  userSentActiveBouldersCount,
  reviews = [],
  onSelectBoulder
}) => {
  const reviewStats = useMemo(() => {
    return computeReviewAnalytics(
      reviews,
      activeGymBoulders,
      viewMode === 'my' ? selectedClimberId : null
    );
  }, [reviews, activeGymBoulders, viewMode, selectedClimberId]);

  const selectedClimber = climbers.find((c) => c.id === selectedClimberId);
  const climberName = selectedClimber ? selectedClimber.display_name : 'Climber';

  const areaNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of areaBreakdown) {
      map.set(item.area.id, item.area.name);
    }
    return map;
  }, [areaBreakdown]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* My Stats vs Group Stats Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => onSetViewMode('my')}
            style={viewMode === 'my' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
              viewMode === 'my' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Stats</span>
          </button>
          <button
            type="button"
            onClick={() => onSetViewMode('group')}
            style={viewMode === 'group' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
              viewMode === 'group' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Stats</span>
          </button>
        </div>

        {viewMode === 'group' && (
          <span
            style={{ color: activeColor, backgroundColor: `${activeColor}15`, borderColor: `${activeColor}40` }}
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crew Aggregate</span>
          </span>
        )}
      </div>

      {/* Climber Selector Tabs (In 'My Stats' mode) */}
      {viewMode === 'my' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Viewing:</span>
          <div className="flex items-center gap-1.5">
            {climbers.map((c) => {
              const isSelected = c.id === selectedClimberId;
              const isYou = c.id === currentUserId;
              const climberColor = c.accent_color || activeColor;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectClimberId(c.id)}
                  style={
                    isSelected
                      ? { borderColor: climberColor, backgroundColor: `${climberColor}15`, color: climberColor }
                      : undefined
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <ClimberAvatar profile={c} size="xs" />
                  <span>{c.display_name}</span>
                  {isYou && <span className="text-[10px] opacity-75 font-normal">(You)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Group Header Banner (In 'Group Stats' mode) */}
      {viewMode === 'group' && (
        <div
          style={{ borderColor: `${activeColor}30`, backgroundColor: `${activeColor}15`, color: activeColor }}
          className="flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" style={{ color: activeColor }} />
            <span>Combined Wham Crew Stats ({climbers.map((c) => c.display_name).join(', ')})</span>
          </div>
          <span
            style={{ backgroundColor: `${activeColor}30`, color: activeColor }}
            className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full"
          >
            {climbers.length} Climbers
          </span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Hardest Send */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {viewMode === 'group' ? 'Crew Top Grade' : 'Hardest Send'}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black" style={{ color: activeColor }}>
              {activeStats.hardestSend || '—'}
            </span>
            <Flame className="w-5 h-5" style={{ color: activeColor }} />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {viewMode === 'group' ? 'Hardest topped by crew' : 'Top grade topped'}
          </span>
        </div>

        {/* Total Sends */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {viewMode === 'group' ? 'Total Crew Sends' : 'Total Sends'}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black text-emerald-400">{activeStats.totalSends}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {viewMode === 'group' ? `${activeStats.totalSends} combined tops` : `${activeStats.sendRate}% send efficiency`}
          </span>
        </div>

        {/* Flashes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {viewMode === 'group' ? 'Crew Flashes' : 'Total Flashes'}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black text-amber-400">{activeStats.totalFlashes}</span>
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">{activeStats.flashRate}% flash rate</span>
        </div>

        {/* Avg Attempts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Tries / Send</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-black text-cyan-400">{activeStats.averageAttemptsOnSend}</span>
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Attempts per send</span>
        </div>
      </div>

      {/* Active Gym Coverage & Sector Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Donut Chart: Gym Topped Percentage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-between gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 self-start">
            {viewMode === 'group' ? 'Crew Gym Coverage' : 'Gym Completion Rate'}
          </span>

          <div className="relative flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1E293B" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={activeColor}
                strokeWidth="10"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * completionPct) / 100}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-2xl font-black text-white">{completionPct}%</span>
              <span className="text-[10px] font-medium text-slate-400">
                {userSentActiveBouldersCount} / {activeGymBoulders.length}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            {viewMode === 'group'
              ? `${userSentActiveBouldersCount} of ${activeGymBoulders.length} active boulders topped by the crew (${
                  activeGymBoulders.length - userSentActiveBouldersCount
                } unclimbed)`
              : `${activeGymBoulders.length - userSentActiveBouldersCount} active boulders left to send`}
          </p>
        </div>

        {/* Breakdown of Active Climbs Remaining Per Area */}
        <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {viewMode === 'group' ? 'Crew Area Coverage' : 'Area Completion & Remaining Climbs'}
            </span>
            <span className="text-[11px] font-mono" style={{ color: activeColor }}>
              {viewMode === 'group' ? 'Team Progress' : 'Clockwise Sectors'}
            </span>
          </div>

          <div className="space-y-3">
            {areaBreakdown.map((item) => (
              <div key={item.area.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{item.area.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    <strong className="text-emerald-400">{item.sent}</strong> / {item.total}{' '}
                    {viewMode === 'group' ? 'topped by crew' : 'sent'} ({item.remaining} left)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, backgroundColor: activeColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Community Reviews & Grade Consensus Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-sm">
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${activeColor}15`,
                borderColor: `${activeColor}30`,
                color: activeColor
              }}
            >
              <MessageSquareHeart className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Reviews & Grade Consensus</h3>
                {reviewStats.totalReviews > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {viewMode === 'my'
                  ? `Quality kaomoji ratings and grade feel logged by ${climberName}`
                  : 'Crew-wide kaomoji vibe ratings and collective grade calibration'}
              </p>
            </div>
          </div>

          {/* Right badge: Tendency / Consensus Pill */}
          {reviewStats.totalGradeOpinions >= 2 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-850 border border-slate-750 text-xs font-semibold">
              {reviewStats.tendency === 'tough' && (
                <>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
              {reviewStats.tendency === 'generous' && (
                <>
                  <Feather className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-teal-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
              {reviewStats.tendency === 'spot-on' && (
                <>
                  <Scale className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-sky-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
              {reviewStats.tendency === 'balanced' && (
                <>
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300 font-mono text-[11px]">{reviewStats.tendencyLabel}</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">
              {reviewStats.totalReviews} logged
            </span>
          )}
        </div>

        {/* Content or Empty State */}
        {reviewStats.totalReviews === 0 ? (
          <div className="p-6 rounded-xl bg-slate-850/40 border border-slate-800 text-center flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 font-mono text-base font-black text-slate-400">
              <span className="text-emerald-400">(•‿•)</span>
              <span className="text-slate-400">(•_•)</span>
              <span className="text-rose-400">(&gt;_&lt;)</span>
            </div>
            <p className="text-xs font-semibold text-slate-300">
              {viewMode === 'my'
                ? `No reviews logged yet by ${climberName}`
                : 'No climb reviews logged yet'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Log sends or inspect any boulder card to rate its quality with kaomoji and calibrate whether the grade feels soft, fair, or hard.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Dual Grid: Quality (Kaomoji) & Grade Consensus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Column 1: Climb Quality (Kaomoji) */}
              <div className="p-4 rounded-xl bg-slate-850/60 border border-slate-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>Climb Quality</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {reviewStats.positivePercentage !== null
                      ? `${reviewStats.positivePercentage}% positive reception`
                      : `${reviewStats.totalRatings} ratings`}
                  </span>
                </div>

                {/* 3 Kaomoji Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Good */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-base font-black text-emerald-400 leading-tight">
                      (•‿•)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300/90 mt-1 uppercase tracking-wider">
                      Good
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.ratingCounts.good}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.ratingPercentages.good}%
                    </span>
                  </div>

                  {/* Okay */}
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-base font-black text-slate-300 leading-tight">
                      (•_•)
                    </span>
                    <span className="text-[10px] font-bold text-slate-300/90 mt-1 uppercase tracking-wider">
                      Okay
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.ratingCounts.ok}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.ratingPercentages.ok}%
                    </span>
                  </div>

                  {/* Rough */}
                  <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/25 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-base font-black text-rose-400 leading-tight">
                      (&gt;_&lt;)
                    </span>
                    <span className="text-[10px] font-bold text-rose-300/90 mt-1 uppercase tracking-wider">
                      Rough
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.ratingCounts.rough}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.ratingPercentages.rough}%
                    </span>
                  </div>
                </div>

                {/* Multi-segment distribution bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${reviewStats.ratingPercentages.good}%` }}
                      title={`Good: ${reviewStats.ratingPercentages.good}%`}
                    />
                    <div
                      className="h-full bg-slate-400 transition-all duration-500"
                      style={{ width: `${reviewStats.ratingPercentages.ok}%` }}
                      title={`Okay: ${reviewStats.ratingPercentages.ok}%`}
                    />
                    <div
                      className="h-full bg-rose-400 transition-all duration-500"
                      style={{ width: `${reviewStats.ratingPercentages.rough}%` }}
                      title={`Rough: ${reviewStats.ratingPercentages.rough}%`}
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Grade Consensus */}
              <div className="p-4 rounded-xl bg-slate-850/60 border border-slate-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>Grade Consensus</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {reviewStats.totalGradeOpinions} votes
                  </span>
                </div>

                {/* 3 Grade Opinion Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Soft */}
                  <div className="p-2.5 rounded-xl bg-teal-950/20 border border-teal-500/25 flex flex-col items-center justify-center text-center">
                    <Feather className="w-4 h-4 text-teal-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-teal-300/90 mt-1 uppercase tracking-wider">
                      Soft
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.gradeOpinionCounts.soft}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.gradePercentages.soft}%
                    </span>
                  </div>

                  {/* Fair */}
                  <div className="p-2.5 rounded-xl bg-sky-950/20 border border-sky-500/25 flex flex-col items-center justify-center text-center">
                    <Scale className="w-4 h-4 text-sky-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-sky-300/90 mt-1 uppercase tracking-wider">
                      Fair
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.gradeOpinionCounts.fair}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.gradePercentages.fair}%
                    </span>
                  </div>

                  {/* Hard */}
                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/25 flex flex-col items-center justify-center text-center">
                    <Flame className="w-4 h-4 text-amber-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-amber-300/90 mt-1 uppercase tracking-wider">
                      Hard
                    </span>
                    <span className="font-mono text-xs font-black text-white mt-0.5">
                      {reviewStats.gradeOpinionCounts.hard}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {reviewStats.gradePercentages.hard}%
                    </span>
                  </div>
                </div>

                {/* Multi-segment distribution bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-teal-400 transition-all duration-500"
                      style={{ width: `${reviewStats.gradePercentages.soft}%` }}
                      title={`Soft: ${reviewStats.gradePercentages.soft}%`}
                    />
                    <div
                      className="h-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${reviewStats.gradePercentages.fair}%` }}
                      title={`Fair: ${reviewStats.gradePercentages.fair}%`}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${reviewStats.gradePercentages.hard}%` }}
                      title={`Hard: ${reviewStats.gradePercentages.hard}%`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Spotlight Notable Boulders (Crowd Pleaser, Spiciest Testpiece, Softest Tick, Rough Test) */}
            {(reviewStats.topCrowdPleasers.length > 0 ||
              reviewStats.topSpicyBoulders.length > 0 ||
              reviewStats.topSoftBoulders.length > 0 ||
              reviewStats.topRoughBoulders.length > 0) && (
              <div className="pt-2 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Consensus Standouts</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Tap to inspect boulder</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Crowd Pleaser */}
                  {reviewStats.topCrowdPleasers[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topCrowdPleasers[0].boulder)}
                      className="p-3 rounded-xl bg-slate-850/50 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                          (•‿•) Crowd Pleaser
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topCrowdPleasers[0].boulder.hold_colour}
                          grade={reviewStats.topCrowdPleasers[0].boulder.grade}
                          isComp={reviewStats.topCrowdPleasers[0].boulder.is_comp}
                          compNumber={reviewStats.topCrowdPleasers[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topCrowdPleasers[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {reviewStats.topCrowdPleasers[0].goodCount} good {reviewStats.topCrowdPleasers[0].goodCount === 1 ? 'rating' : 'ratings'}
                      </span>
                    </button>
                  )}

                  {/* Spiciest Testpiece */}
                  {reviewStats.topSpicyBoulders[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topSpicyBoulders[0].boulder)}
                      className="p-3 rounded-xl bg-slate-850/50 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          <span>Spiciest Grade</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topSpicyBoulders[0].boulder.hold_colour}
                          grade={reviewStats.topSpicyBoulders[0].boulder.grade}
                          isComp={reviewStats.topSpicyBoulders[0].boulder.is_comp}
                          compNumber={reviewStats.topSpicyBoulders[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topSpicyBoulders[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        {reviewStats.topSpicyBoulders[0].hardCount} voted Hard
                      </span>
                    </button>
                  )}

                  {/* Softest Tick */}
                  {reviewStats.topSoftBoulders[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topSoftBoulders[0].boulder)}
                      className="p-3 rounded-xl bg-slate-850/50 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-950/60 border border-teal-500/30 text-teal-300 flex items-center gap-1">
                          <Feather className="w-2.5 h-2.5 text-teal-400" />
                          <span>Softest Tick</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topSoftBoulders[0].boulder.hold_colour}
                          grade={reviewStats.topSoftBoulders[0].boulder.grade}
                          isComp={reviewStats.topSoftBoulders[0].boulder.is_comp}
                          compNumber={reviewStats.topSoftBoulders[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topSoftBoulders[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-teal-400 font-bold">
                        {reviewStats.topSoftBoulders[0].softCount} voted Soft
                      </span>
                    </button>
                  )}

                  {/* Rough Problem or Second Crowd Pleaser */}
                  {reviewStats.topRoughBoulders[0] ? (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topRoughBoulders[0].boulder)}
                      className="p-3 rounded-xl bg-slate-850/50 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300">
                          (&gt;_&lt;) Rough &amp; Sharp
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topRoughBoulders[0].boulder.hold_colour}
                          grade={reviewStats.topRoughBoulders[0].boulder.grade}
                          isComp={reviewStats.topRoughBoulders[0].boulder.is_comp}
                          compNumber={reviewStats.topRoughBoulders[0].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topRoughBoulders[0].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-rose-400 font-bold">
                        {reviewStats.topRoughBoulders[0].roughCount} rough {reviewStats.topRoughBoulders[0].roughCount === 1 ? 'vote' : 'votes'}
                      </span>
                    </button>
                  ) : reviewStats.topCrowdPleasers[1] ? (
                    <button
                      type="button"
                      onClick={() => onSelectBoulder && onSelectBoulder(reviewStats.topCrowdPleasers[1].boulder)}
                      className="p-3 rounded-xl bg-slate-850/50 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                          (•‿•) Highly Rated
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <HoldBadge
                          color={reviewStats.topCrowdPleasers[1].boulder.hold_colour}
                          grade={reviewStats.topCrowdPleasers[1].boulder.grade}
                          isComp={reviewStats.topCrowdPleasers[1].boulder.is_comp}
                          compNumber={reviewStats.topCrowdPleasers[1].boulder.comp_number}
                          size="sm"
                        />
                        <span className="text-xs text-slate-300 truncate font-medium">
                          {areaNameMap.get(reviewStats.topCrowdPleasers[1].boulder.area_id) || 'Wall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {reviewStats.topCrowdPleasers[1].goodCount} good ratings
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hall of Fame & Superlatives Cards */}
      {accoladesList.length > 0 &&
        (showAccolades ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: activeColor }} />
                <div>
                  <h3 className="text-sm font-bold text-white">Crew Superlatives & Accolades</h3>
                  <p className="text-[11px] text-slate-400">Unique standout achievements across your crew</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleAccolades(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
                title="Hide crew accolades section"
              >
                Hide
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {accoladesList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center text-center gap-1.5 hover:border-slate-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-750 flex items-center justify-center">
                    {getAccoladeIcon(item.id, item.climber.accent_color || activeColor)}
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: item.climber.accent_color || activeColor }}
                  >
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1.5 max-w-full my-0.5">
                    <ClimberAvatar profile={item.climber} size="xs" />
                    <strong className="text-xs text-white truncate max-w-[85px]">{item.climber.display_name}</strong>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">{item.value}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{item.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-end animate-in fade-in">
            <button
              type="button"
              onClick={() => onToggleAccolades(true)}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm"
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: activeColor }} />
              <span>Show Crew Accolades</span>
            </button>
          </div>
        ))}
    </div>
  );
};
