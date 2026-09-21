import React from 'react';
import { Crown, BarChart3, Swords } from 'lucide-react';
import { Profile, Grade, GRADES, Boulder, GymArea } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';

interface BattleClimberInfo {
  profile: Profile;
  color: { hex: string; bg: string };
  totalSends: number;
  totalFlashes: number;
  hardestSend: Grade | null;
  flashRate: number;
  sendRate: number;
  averageAttemptsOnSend: string;
  sentActiveCount: number;
  perGrade: Record<Grade, { sent: number; flashed: number; attempted: number }>;
}

export interface BattleData {
  climberA: BattleClimberInfo;
  climberB: BattleClimberInfo;
  sharedCount: number;
  aOnlyActiveBoulders: Boulder[];
  bOnlyActiveBoulders: Boulder[];
}

interface StatsBattleProps {
  battleData: BattleData | null;
  battleClimberAId: string;
  battleClimberBId: string;
  onSelectClimberA: (id: string) => void;
  onSelectClimberB: (id: string) => void;
  climberStatsList: BattleClimberInfo[];
  sortedLeaderboard: BattleClimberInfo[];
  activeGymBoulders: Boulder[];
  areas: GymArea[];
  climbers: Profile[];
  activeColor: string;
  activeGradeRange: Grade[];
  maxGradeOverall: number;
  maxSendsOverall: number;
  maxFlashesOverall: number;
}

export const StatsBattle: React.FC<StatsBattleProps> = ({
  battleData,
  battleClimberAId,
  battleClimberBId,
  onSelectClimberA,
  onSelectClimberB,
  climberStatsList,
  sortedLeaderboard,
  activeGymBoulders,
  areas,
  climbers,
  activeColor,
  activeGradeRange,
  maxGradeOverall,
  maxSendsOverall,
  maxFlashesOverall
}) => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Crew Leaderboard & Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" style={{ color: activeColor }} />
            <h3 className="text-sm font-bold text-white">The Crew Comparison Matrix</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {climbers.length} Active Climbers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono">
                <th className="pb-3">Climber</th>
                <th className="pb-3 text-center">Top Grade</th>
                <th className="pb-3 text-center">Sends</th>
                <th className="pb-3 text-center">Flashes</th>
                <th className="pb-3 text-center">Flash %</th>
                <th className="pb-3 text-center">Efficiency</th>
                <th className="pb-3 text-center">Avg Tries</th>
                <th className="pb-3 text-center">Gym Topped</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedLeaderboard.map((item, idx) => {
                const isTopHardest = Boolean(item.hardestSend && GRADES.indexOf(item.hardestSend) === maxGradeOverall);
                const isTopSends = Boolean(item.totalSends > 0 && item.totalSends === maxSendsOverall);
                const isTopFlashes = Boolean(item.totalFlashes > 0 && item.totalFlashes === maxFlashesOverall);

                return (
                  <tr key={item.profile.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2 font-sans font-bold text-slate-100">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black bg-slate-800 text-slate-300">
                          {idx + 1}
                        </span>
                        <ClimberAvatar profile={item.profile} size="md" />
                        <span className="truncate max-w-[120px]">{item.profile.display_name}</span>
                      </div>
                    </td>

                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-black ${
                        isTopHardest ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'text-slate-200'
                      }`}>
                        {item.hardestSend || '—'}
                      </span>
                    </td>

                    <td className="py-3 text-center">
                      <span className={`font-bold ${isTopSends ? 'text-emerald-400 font-black' : 'text-slate-200'}`}>
                        {item.totalSends}
                      </span>
                    </td>

                    <td className="py-3 text-center">
                      <span className={`font-bold ${isTopFlashes ? 'text-amber-400 font-black' : 'text-slate-300'}`}>
                        {item.totalFlashes}
                      </span>
                    </td>

                    <td className="py-3 text-center text-slate-300">
                      {item.flashRate}%
                    </td>

                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.sendRate >= 70 ? 'bg-emerald-500/20 text-emerald-300' :
                        item.sendRate >= 50 ? 'bg-sky-500/20 text-sky-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {item.sendRate}%
                      </span>
                    </td>

                    <td className="py-3 text-center text-slate-300">
                      {item.averageAttemptsOnSend}
                    </td>

                    <td className="py-3 text-center text-slate-400">
                      <strong className="text-slate-200">{item.sentActiveCount}</strong> / {activeGymBoulders.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Climber Grade Comparison Bar Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: activeColor }} />
            <h3 className="text-sm font-bold text-white">Side-by-Side Sends per Grade</h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            {climberStatsList.map((c) => (
              <span key={c.profile.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color.hex }} />
                <span className="text-slate-300 font-medium">{c.profile.display_name}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {activeGradeRange.map((g) => {
            const maxSendsThisGrade = Math.max(
              ...climberStatsList.map((c) => c.perGrade[g]?.sent || 0),
              1
            );

            return (
              <div key={g} className="bg-slate-850/40 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-white">{g}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total {climberStatsList.reduce((sum, c) => sum + (c.perGrade[g]?.sent || 0), 0)} sends
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {climberStatsList.map((c) => {
                    const sends = c.perGrade[g]?.sent || 0;
                    const flashes = c.perGrade[g]?.flashed || 0;
                    const pct = Math.round((sends / maxSendsThisGrade) * 100);

                    return (
                      <div key={c.profile.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-medium">{c.profile.display_name}</span>
                          <span className="font-mono font-bold text-slate-200">
                            {sends} <span className="text-slate-500 font-normal">({flashes}f)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: c.color.hex
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1-on-1 Head-to-Head Battle */}
      {battleData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-white">1-on-1 Head to Head Battle</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Direct Climber Comparison</span>
          </div>

          {/* Climber Selectors */}
          <div className="flex flex-col gap-3">
            <div className="text-xs text-slate-400 font-medium">
              Select any two climbers to see head-to-head sent counts, shared sends, and problems where one has beta over the other:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-850/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: battleData.climberA.color.hex }} />
                <label className="text-xs font-bold text-slate-400 uppercase">Climber 1:</label>
                <select
                  value={battleClimberAId}
                  onChange={(e) => onSelectClimberA(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-slate-500 font-semibold"
                >
                  {climbers.map((c) => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: battleData.climberB.color.hex }} />
                <label className="text-xs font-bold text-slate-400 uppercase">Climber 2:</label>
                <select
                  value={battleClimberBId}
                  onChange={(e) => onSelectClimberB(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-slate-500 font-semibold"
                >
                  {climbers.map((c) => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Head to Head Visual Comparison Bar */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span style={{ color: battleData.climberA.color.hex }}>
                  {battleData.climberA.profile.display_name}: {battleData.climberA.totalSends} Sends
                </span>
                <span className="text-slate-400 uppercase text-[10px]">Total Sends</span>
                <span style={{ color: battleData.climberB.color.hex }}>
                  {battleData.climberB.totalSends} Sends :{battleData.climberB.profile.display_name}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(battleData.climberA.totalSends / Math.max(battleData.climberA.totalSends + battleData.climberB.totalSends, 1)) * 100}%`,
                    backgroundColor: battleData.climberA.color.hex
                  }}
                />
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(battleData.climberB.totalSends / Math.max(battleData.climberA.totalSends + battleData.climberB.totalSends, 1)) * 100}%`,
                    backgroundColor: battleData.climberB.color.hex
                  }}
                />
              </div>
            </div>

            {/* Shared Sends Counter */}
            <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Both Climbers Sent:</span>
              <span className="font-mono font-bold text-white text-sm">{battleData.sharedCount} climbs</span>
            </div>

            {/* Boulders only one climber has sent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-855/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: battleData.climberA.color.hex }}>
                    Sent by {battleData.climberA.profile.display_name} (not {battleData.climberB.profile.display_name})
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {battleData.aOnlyActiveBoulders.length} climbs
                  </span>
                </div>

                {battleData.aOnlyActiveBoulders.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No unique climbs to show.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {battleData.aOnlyActiveBoulders.map((boulder) => {
                      const area = areas.find((a) => a.id === boulder.area_id);
                      return (
                        <div
                          key={boulder.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-white">{boulder.grade}</span>
                            <span className="text-slate-300 font-medium">{boulder.hold_colour}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {area?.name || 'Wall'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-850/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: battleData.climberB.color.hex }}>
                    Sent by {battleData.climberB.profile.display_name} (not {battleData.climberA.profile.display_name})
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {battleData.bOnlyActiveBoulders.length} climbs
                  </span>
                </div>

                {battleData.bOnlyActiveBoulders.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No unique climbs to show.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {battleData.bOnlyActiveBoulders.map((boulder) => {
                      const area = areas.find((a) => a.id === boulder.area_id);
                      return (
                        <div
                          key={boulder.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-white">{boulder.grade}</span>
                            <span className="text-slate-300 font-medium">{boulder.hold_colour}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {area?.name || 'Wall'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
