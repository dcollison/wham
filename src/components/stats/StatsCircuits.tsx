import React from 'react';
import { CircleDot } from 'lucide-react';
import { Profile, Grade, HOLD_COLORS, getHoldSwatchStyle } from '../../types';

export interface CircuitData {
  name: string;
  config: (typeof HOLD_COLORS)[string];
  gradeRange: string;
  distinctGrades: Grade[];
  minGradeIdx: number;
  hardestSend: Grade | null;
  totalActive: number;
  crewToppedCount: number;
  crewPct: number;
  memberSends: Array<{ climber: Profile; sentCount: number }>;
}

interface StatsCircuitsProps {
  circuitBreakdown: CircuitData[];
  activeColor: string;
}

export const StatsCircuits: React.FC<StatsCircuitsProps> = ({
  circuitBreakdown,
  activeColor
}) => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDot className="w-5 h-5" style={{ color: activeColor }} />
            <h3 className="text-sm sm:text-base font-bold text-white">Hold Colour Circuits</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Active Climbs & Progress</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {circuitBreakdown.map((circuit) => (
            <div
              key={circuit.name}
              className="p-4 rounded-xl bg-slate-850/60 border border-slate-800 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full border border-black/40 shadow-sm shrink-0"
                    style={getHoldSwatchStyle(circuit.name)}
                  />
                  <div>
                    <strong className="text-xs sm:text-sm text-white block font-bold">{circuit.name} Circuit</strong>
                    <span className="text-xs text-slate-200 font-mono font-bold">{circuit.gradeRange}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 block">
                    {circuit.crewToppedCount} / {circuit.totalActive} ({circuit.crewPct}%)
                  </span>
                  {circuit.hardestSend && (
                    <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                      Crew Top: <strong className="text-slate-200 font-bold">{circuit.hardestSend}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${circuit.crewPct}%`,
                    backgroundColor: circuit.config?.hex || activeColor
                  }}
                />
              </div>

              <div className="grid grid-cols-4 gap-1 pt-1 text-center border-t border-slate-800/60">
                {circuit.memberSends.map((ms) => (
                  <div key={ms.climber.id} className="text-[10px]">
                    <span className="text-slate-400 block truncate">{ms.climber.display_name}</span>
                    <strong className="font-mono text-slate-200">{ms.sentCount}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
