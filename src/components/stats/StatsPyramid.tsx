import React from 'react';
import { Layers, Users, Zap, Sparkles, Target } from 'lucide-react';
import { Profile, GRADES, getClimberColor } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { ClimberStatsData } from '../../lib/statsEngine';

interface StatsPyramidProps {
  activeStats: ClimberStatsData;
  viewMode: 'my' | 'group';
  onSetViewMode: (mode: 'my' | 'group') => void;
  selectedClimberId: string;
  onSelectClimberId: (id: string) => void;
  climbers: Profile[];
  currentUserId?: string;
  activeColor: string;
}

export const StatsPyramid: React.FC<StatsPyramidProps> = ({
  activeStats,
  viewMode,
  onSetViewMode,
  selectedClimberId,
  onSelectClimberId,
  climbers,
  currentUserId,
  activeColor
}) => {
  const currentClimber = climbers.find((c) => c.id === (selectedClimberId || currentUserId)) || climbers[0];

  const pyramidBaseVolume =
    (activeStats.perGrade['V0']?.sent || 0) +
    (activeStats.perGrade['V1']?.sent || 0) +
    (activeStats.perGrade['V2']?.sent || 0) +
    (activeStats.perGrade['V3']?.sent || 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Climber Picker & Pyramid Score Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => onSetViewMode('group')}
            style={viewMode === 'group' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
              viewMode === 'group'
                ? 'text-black shadow-md'
                : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crew Pyramid</span>
          </button>

          {climbers.map((c, idx) => {
            const isSelected = viewMode === 'my' && (selectedClimberId || currentUserId) === c.id;
            const color = getClimberColor(c, idx);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSetViewMode('my');
                  onSelectClimberId(c.id);
                }}
                style={isSelected ? { backgroundColor: color.hex, color: '#000000' } : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                  isSelected
                    ? `${color.bg} text-black shadow-md`
                    : 'bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                <ClimberAvatar profile={c} size="xs" />
                <span>{c.display_name}</span>
              </button>
            );
          })}
        </div>

        <span className="text-xs font-mono font-bold" style={{ color: activeColor }}>
          Pyramid Score: {activeStats.pyramidPoints} pts
        </span>
      </div>

      {/* Visual Send Pyramid Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5" style={{ color: activeColor }} />
            <h3 className="text-sm font-bold text-white">
              {viewMode === 'group' ? 'Combined Crew Send Pyramid' : `${currentClimber?.display_name}'s Send Pyramid`}
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Flash
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Send
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {[...GRADES].reverse().map((g) => {
            const data = activeStats.perGrade[g];
            if (!data || (data.sent === 0 && data.attempted === 0)) return null;

            const flashes = data.flashed;
            const regularSends = data.sent - data.flashed;
            const totalSends = data.sent;
            const maxSendsAnyGrade = Math.max(...Object.values(activeStats.perGrade).map((p) => p.sent), 1);
            const widthPct = Math.max(Math.round((totalSends / maxSendsAnyGrade) * 100), totalSends > 0 ? 12 : 4);

            return (
              <div key={g} className="flex items-center gap-3">
                <span className="w-10 font-mono text-xs font-black text-white text-right shrink-0">
                  {g}
                </span>

                <div className="flex-1 flex justify-center">
                  <div
                    className="h-8 rounded-lg flex overflow-hidden shadow-sm transition-all duration-500"
                    style={{ width: `${widthPct}%`, minWidth: '48px' }}
                  >
                    {regularSends > 0 && (
                      <div
                        className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all"
                        style={{ width: `${(regularSends / totalSends) * 100}%` }}
                        title={`Sent: ${regularSends}`}
                      >
                        {regularSends}
                      </div>
                    )}
                    {flashes > 0 && (
                      <div
                        className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-black text-black transition-all gap-0.5"
                        style={{ width: `${(flashes / totalSends) * 100}%` }}
                        title={`Flashed: ${flashes}`}
                      >
                        <span>{flashes}</span>
                        <Zap className="w-2.5 h-2.5 fill-black text-black shrink-0" />
                      </div>
                    )}
                    {totalSends === 0 && (
                      <div className="w-full bg-slate-800/80 text-slate-500 flex items-center justify-center text-[10px]">
                        {data.attempted} tries
                      </div>
                    )}
                  </div>
                </div>

                <span className="w-16 font-mono text-[11px] text-slate-400 shrink-0">
                  {totalSends} sends
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: activeColor }} />
            <span>
              <strong>Pyramid Base:</strong> {pyramidBaseVolume} volume climbs (V0–V3)
            </span>
          </div>
          <span className="font-mono text-emerald-400 font-bold">
            {activeStats.totalSends} Total Sends
          </span>
        </div>
      </div>

      {/* Grade Efficiency Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          Efficiency Metrics by Grade
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono">
                <th className="pb-2">Grade</th>
                <th className="pb-2">Attempted</th>
                <th className="pb-2">Sent</th>
                <th className="pb-2">Send %</th>
                <th className="pb-2">Flash Rate</th>
                <th className="pb-2">Avg Tries (Sends)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {GRADES.filter((g) => activeStats.perGrade[g]?.attempted > 0).map((g) => {
                const data = activeStats.perGrade[g];
                const sendPct = Math.round((data.sent / data.attempted) * 100);
                const flashPct = Math.round((data.flashed / data.attempted) * 100);
                const avgTries = data.sent > 0 ? (data.totalAttemptsSum / data.sent).toFixed(1) : '—';

                return (
                  <tr key={g} className="hover:bg-slate-850/50">
                    <td className="py-2.5 font-bold text-white font-mono">{g}</td>
                    <td className="py-2.5 text-slate-300">{data.attempted}</td>
                    <td className="py-2.5 text-emerald-400 font-semibold">{data.sent}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          sendPct >= 75
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : sendPct >= 50
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {sendPct}%
                      </span>
                    </td>
                    <td className="py-2.5 text-amber-300">{flashPct}%</td>
                    <td className="py-2.5 text-slate-200">{avgTries}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
