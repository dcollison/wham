import React from 'react';
import { User, Users, Flame, CheckCircle2, Zap, Target, Trophy, Award, Calendar, Layers, Activity } from 'lucide-react';
import { Profile, GymArea, Boulder } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { ClimberStatsData, AccoladeItem } from '../../lib/statsEngine';

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
  userSentActiveBouldersCount
}) => {
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
