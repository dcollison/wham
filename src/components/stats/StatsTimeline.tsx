import React from 'react';
import { Flame, TrendingUp, Activity, LineChart, Calendar, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Profile, Grade, GRADES, Boulder, Attempt, getClimberColor } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';

export interface TimelineSession {
  date: string;
  totalSends: number;
  totalFlashes: number;
  hardestSend: Grade | null;
  attendees: Profile[];
  sendsList: Array<{
    attempt: Attempt;
    boulder?: Boulder;
    climber?: Profile;
  }>;
}

export interface TimelineClimberSeries {
  climber: Profile;
  color: { hex: string; bg: string };
  points: Array<{
    date: string;
    sessionSends: number;
    sessionFlashes: number;
    sessionMaxGrade: Grade | null;
    sessionMaxIdx: number | null;
    allTimeMaxGrade: Grade | null;
    allTimeMaxIdx: number | null;
    cumulativeSends: number;
  }>;
}

export interface TimelineData {
  dates: string[];
  sessions: TimelineSession[];
  climberSeries: TimelineClimberSeries[];
  maxVolumeAnySession: number;
}

interface StatsTimelineProps {
  timelineData: TimelineData;
  timelineChartMode: 'grade' | 'cumulative' | 'volume';
  onSetTimelineChartMode: (mode: 'grade' | 'cumulative' | 'volume') => void;
  timelineClimberFilter: string;
  onSetTimelineClimberFilter: (filter: string) => void;
  climbers: Profile[];
  activeColor: string;
  expandedSessionDate: string | null;
  onToggleExpandSession: (date: string) => void;
}

export const StatsTimeline: React.FC<StatsTimelineProps> = ({
  timelineData,
  timelineChartMode,
  onSetTimelineChartMode,
  timelineClimberFilter,
  onSetTimelineClimberFilter,
  climbers,
  activeColor,
  expandedSessionDate,
  onToggleExpandSession
}) => {
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const climberSeriesToDisplay =
    timelineClimberFilter === 'all'
      ? timelineData.climberSeries
      : timelineData.climberSeries.filter((s) => s.climber.id === timelineClimberFilter);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Controls: Chart Mode Switcher & Climber Filter */}
      <div className="flex flex-col gap-3 w-full">
        {/* Chart Mode Switcher */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar w-full">
          <button
            type="button"
            onClick={() => onSetTimelineChartMode('grade')}
            style={timelineChartMode === 'grade' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              timelineChartMode === 'grade' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Max Grade Curve</span>
          </button>

          <button
            type="button"
            onClick={() => onSetTimelineChartMode('cumulative')}
            style={timelineChartMode === 'cumulative' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              timelineChartMode === 'cumulative' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cumulative Sends</span>
          </button>

          <button
            type="button"
            onClick={() => onSetTimelineChartMode('volume')}
            style={timelineChartMode === 'volume' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all active-press ${
              timelineChartMode === 'volume' ? 'text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Session Volume</span>
          </button>
        </div>

        {/* Climber Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => onSetTimelineClimberFilter('all')}
            style={timelineClimberFilter === 'all' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 ${
              timelineClimberFilter === 'all' ? 'text-black shadow' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            All Crew
          </button>
          {climbers.map((c, idx) => {
            const isSelected = timelineClimberFilter === c.id;
            const color = getClimberColor(c, idx);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSetTimelineClimberFilter(c.id)}
                style={isSelected ? { backgroundColor: color.hex, color: '#000000' } : undefined}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active-press shrink-0 ${
                  isSelected ? `${color.bg} text-black shadow` : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                {c.display_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Visual Chart Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LineChart className="w-4 h-4" style={{ color: activeColor }} />
              <span>
                {timelineChartMode === 'grade' && 'Grade Breakthroughs & Top Grade Progression'}
                {timelineChartMode === 'cumulative' && 'Total Sends Growth Over Time'}
                {timelineChartMode === 'volume' && 'Climbs Sent Per Gym Session'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {timelineChartMode === 'grade' && 'Peak grade topped in each weekly gym session'}
              {timelineChartMode === 'cumulative' && 'Cumulative tick count trajectory across sessions'}
              {timelineChartMode === 'volume' && 'Total volume and flash proportion by session date'}
            </p>
          </div>

          {/* Climber Legend */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {climberSeriesToDisplay.map((series) => (
              <span key={series.climber.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: series.color.hex }} />
                <span className="text-slate-300 font-medium">{series.climber.display_name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="w-full bg-slate-950/70 rounded-2xl border border-slate-800/90 p-3 sm:p-4 flex flex-col gap-2">
          {timelineData.dates.length < 2 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
              <Calendar className="w-8 h-8 text-slate-600 mb-2" />
              <span>Log sends across multiple dates to view your progression curve.</span>
            </div>
          ) : (() => {
            const chartWidth = Math.max(680, timelineData.dates.length * 80);
            const chartHeight = 270;
            const plotLeft = 60;
            const plotRight = chartWidth - 45;
            const plotTop = 36;
            const plotBottom = 215;
            const plotHeight = plotBottom - plotTop;
            const plotWidth = plotRight - plotLeft;

            return (
              <>
                <div className="w-full overflow-x-auto no-scrollbar pb-1">
                  <div style={{ minWidth: `${chartWidth}px`, height: `${chartHeight}px` }} className="relative">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full block">
                      <defs>
                        <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#334155" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#1E293B" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines & Y-Axis Labels */}
                      {timelineChartMode === 'grade' &&
                        [0, 2, 4, 6, 8].map((gIndex) => {
                          const y = plotBottom - (gIndex / 8) * plotHeight;
                          return (
                            <g key={gIndex}>
                              <line
                                x1={plotLeft}
                                y1={y}
                                x2={plotRight}
                                y2={y}
                                stroke="#334155"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                                opacity="0.5"
                              />
                              <text
                                x={plotLeft - 12}
                                y={y + 4}
                                fill="#CBD5E1"
                                fontSize="11"
                                fontFamily="monospace"
                                fontWeight="bold"
                                textAnchor="end"
                              >
                                {GRADES[gIndex]}
                              </text>
                            </g>
                          );
                        })}

                      {timelineChartMode === 'cumulative' &&
                        [0, 25, 50, 75, 100].map((val) => {
                          const maxVal = Math.max(
                            ...timelineData.climberSeries.map(
                              (s) => s.points[s.points.length - 1]?.cumulativeSends || 1
                            ),
                            10
                          );
                          const y = plotBottom - (val / 100) * plotHeight;
                          const displayVal = Math.round((val / 100) * maxVal);
                          return (
                            <g key={val}>
                              <line
                                x1={plotLeft}
                                y1={y}
                                x2={plotRight}
                                y2={y}
                                stroke="#334155"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                                opacity="0.5"
                              />
                              <text
                                x={plotLeft - 12}
                                y={y + 4}
                                fill="#CBD5E1"
                                fontSize="11"
                                fontFamily="monospace"
                                fontWeight="bold"
                                textAnchor="end"
                              >
                                {displayVal}
                              </text>
                            </g>
                          );
                        })}

                      {/* X-Axis Dates */}
                      {timelineData.dates.map((dateStr, i) => {
                        const x =
                          plotLeft + (i / Math.max(timelineData.dates.length - 1, 1)) * plotWidth;
                        return (
                          <g key={dateStr}>
                            <line
                              x1={x}
                              y1={plotTop}
                              x2={x}
                              y2={plotBottom}
                              stroke="#334155"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                              opacity="0.3"
                            />
                            <text
                              x={x}
                              y={plotBottom + 26}
                              fill="#CBD5E1"
                              fontSize="11"
                              fontFamily="monospace"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {formatShortDate(dateStr)}
                            </text>
                          </g>
                        );
                      })}

                      {/* CHART MODE 1: Max Grade Progression Curves */}
                      {timelineChartMode === 'grade' &&
                        climberSeriesToDisplay.map((series) => {
                          const points = series.points.map((pt, i) => {
                            const x =
                              plotLeft + (i / Math.max(series.points.length - 1, 1)) * plotWidth;
                            const gradeIdx = pt.sessionMaxIdx !== null ? pt.sessionMaxIdx : 0;
                            const y = plotBottom - (gradeIdx / 8) * plotHeight;
                            return { x, y, pt };
                          });

                          const pathData = points.reduce((acc, p, idx) => {
                            return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                          }, '');

                          return (
                            <g key={series.climber.id}>
                              <path
                                d={pathData}
                                fill="none"
                                stroke={series.color.hex}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-all duration-500"
                              />
                              {points.map((p, idx) => (
                                <g key={idx}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={p.pt.sessionMaxGrade ? '5.5' : '3'}
                                    fill={p.pt.sessionMaxGrade ? series.color.hex : '#475569'}
                                    stroke="#0F172A"
                                    strokeWidth="2.5"
                                  />
                                  {p.pt.sessionMaxGrade && (
                                    <g>
                                      <rect
                                        x={p.x - 16}
                                        y={p.y - 25}
                                        width="32"
                                        height="16"
                                        rx="4"
                                        fill="#0F172A"
                                        stroke={series.color.hex}
                                        strokeWidth="1.5"
                                      />
                                      <text
                                        x={p.x}
                                        y={p.y - 13}
                                        fill="#FFFFFF"
                                        fontSize="10"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                      >
                                        {p.pt.sessionMaxGrade}
                                      </text>
                                    </g>
                                  )}
                                </g>
                              ))}
                            </g>
                          );
                        })}

                      {/* CHART MODE 2: Cumulative Sends Curves */}
                      {timelineChartMode === 'cumulative' &&
                        climberSeriesToDisplay.map((series) => {
                          const maxVal = Math.max(
                            ...timelineData.climberSeries.map(
                              (s) => s.points[s.points.length - 1]?.cumulativeSends || 1
                            ),
                            10
                          );
                          const points = series.points.map((pt, i) => {
                            const x =
                              plotLeft + (i / Math.max(series.points.length - 1, 1)) * plotWidth;
                            const y = plotBottom - (pt.cumulativeSends / maxVal) * plotHeight;
                            return { x, y, pt };
                          });

                          const pathData = points.reduce((acc, p, idx) => {
                            return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                          }, '');

                          return (
                            <g key={series.climber.id}>
                              <path
                                d={pathData}
                                fill="none"
                                stroke={series.color.hex}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-all duration-500"
                              />
                              {points.map((p, idx) => (
                                <g key={idx}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="5"
                                    fill={series.color.hex}
                                    stroke="#0F172A"
                                    strokeWidth="2.5"
                                  />
                                  {p.pt.cumulativeSends > 0 && (
                                    <text
                                      x={p.x}
                                      y={p.y - 10}
                                      fill="#CBD5E1"
                                      fontSize="11"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      {p.pt.cumulativeSends}
                                    </text>
                                  )}
                                </g>
                              ))}
                            </g>
                          );
                        })}

                      {/* CHART MODE 3: Session Volume Bars */}
                      {timelineChartMode === 'volume' &&
                        timelineData.sessions.map((sess, i) => {
                          const x =
                            plotLeft + (i / Math.max(timelineData.sessions.length - 1, 1)) * plotWidth;
                          const maxSessVolume = timelineData.maxVolumeAnySession;
                          const barWidth = 32;
                          const totalH = (sess.totalSends / maxSessVolume) * plotHeight;
                          const flashH = (sess.totalFlashes / maxSessVolume) * plotHeight;
                          const sendH = totalH - flashH;

                          return (
                            <g key={sess.date}>
                              {sendH > 0 && (
                                <rect
                                  x={x - barWidth / 2}
                                  y={plotBottom - totalH}
                                  width={barWidth}
                                  height={sendH}
                                  fill="#32A378"
                                  rx="4"
                                />
                              )}
                              {flashH > 0 && (
                                <rect
                                  x={x - barWidth / 2}
                                  y={plotBottom - flashH}
                                  width={barWidth}
                                  height={flashH}
                                  fill="#E2A336"
                                  rx="4"
                                />
                              )}
                              <text
                                x={x}
                                y={plotBottom - totalH - 8}
                                fill="#F8FAFC"
                                fontSize="11"
                                fontFamily="monospace"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {sess.totalSends}
                              </text>
                            </g>
                          );
                        })}
                    </svg>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-900 px-1">
                  <span>Progression Timeline ({timelineData.dates.length} sessions)</span>
                  <span className="sm:hidden text-slate-400 font-semibold">Swipe horizontally to explore →</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Session Log & Chronological Activity Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: activeColor }} />
            <h3 className="text-sm font-bold text-white">Chronological Session Log</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {timelineData.sessions.length} Recorded Sessions
          </span>
        </div>

        {/* Session Cards (Reverse chronological: newest first) */}
        <div className="space-y-3">
          {[...timelineData.sessions].reverse().map((sess) => {
            const isExpanded = expandedSessionDate === sess.date;

            return (
              <div
                key={sess.date}
                className="bg-slate-850/60 border border-slate-800 rounded-xl overflow-hidden transition-all"
              >
                <div
                  onClick={() => onToggleExpandSession(sess.date)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-mono">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {formatShortDate(sess.date).split(' ')[1]}
                      </span>
                      <span className="text-xs font-black" style={{ color: activeColor }}>
                        {formatShortDate(sess.date).split(' ')[0]}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{formatFullDate(sess.date)}</span>
                        {sess.hardestSend && (
                          <span
                            className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded"
                            style={{ color: activeColor, backgroundColor: `${activeColor}20` }}
                          >
                            Top: {sess.hardestSend}
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>
                          {sess.totalSends} sends ({sess.totalFlashes} flashes)
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {sess.attendees.map((c) => (
                            <span key={c.id} className="text-slate-300 font-medium">
                              {c.display_name}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" className="p-1 rounded text-slate-400 hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Detailed sends list when expanded */}
                {isExpanded && (
                  <div className="p-3.5 pt-0 border-t border-slate-800/80 bg-slate-900/40 space-y-2 animate-in fade-in">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Climbs Topped in This Session ({sess.sendsList.length}):
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {sess.sendsList.map((item, idx) => {
                        const isFlash = item.attempt.status === 'flashed';
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-850 border border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-white">{item.boulder?.grade || 'V?'}</span>
                              <span className="text-slate-300 font-medium truncate max-w-[90px]">
                                {item.boulder?.hold_colour || 'Hold'}
                              </span>
                              {isFlash && <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                            </div>

                            <div className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-300">
                              <ClimberAvatar profile={item.climber} size="xs" />
                              <span>{item.climber?.display_name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
