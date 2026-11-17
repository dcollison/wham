import React, { useState, useMemo } from 'react';
import { Boulder, Attempt, Profile, Gym, GymArea, LogAttemptParams, HOLD_COLORS } from '../../types';
import {
  WINTER_SERIES_FORM_URL,
  WINTER_SERIES_ROUNDS,
  getWinterRoundsWithStatus,
  getRoundBoulders,
  computeWinterRoundStandings,
  getWinterProblemPoints,
  computeWinterSeriesOverallStandings,
  WinterSeriesRoundWithStatus
} from '../../lib/winterSeries';
import { ClimberAvatar } from '../ClimberAvatar';
import {
  Zap,
  Check,
  Trophy,
  ExternalLink,
  Calendar,
  MapPin,
  Target,
  Users,
  LayoutGrid,
  List,
  ChevronRight,
  Lock,
  Flame,
  TrendingUp,
  Clock,
  Loader2
} from 'lucide-react';

const COMP_WALL_MAX_BOULDERS = 25;
const COMP_WALL_MAX_POINTS = 75;

interface WinterSeriesViewProps {
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  currentUser: Profile | null;
  gyms: Gym[];
  areas: GymArea[];
  onLogAttempt: (params: LogAttemptParams) => Promise<void>;
  onDeleteAttempt: (boulderId: string, userId?: string) => Promise<void>;
  onSelectBoulder?: (boulder: Boulder) => void;
}

type ScoreFilter = 'all' | 'points_left' | 'untried' | 'zones' | 'topped' | 'crew_beat_me';
type SheetLayout = 'list' | 'grid' | 'matrix';

export const WinterSeriesView: React.FC<WinterSeriesViewProps> = ({
  boulders,
  attempts,
  climbers,
  currentUser,
  onLogAttempt,
  onDeleteAttempt,
  onSelectBoulder
}) => {
  const roundsWithStatus = useMemo(() => getWinterRoundsWithStatus(attempts, new Date()), [attempts]);

  // Default to the currently active round (or Round 1)
  const [selectedView, setSelectedView] = useState<number | 'overall'>(() => {
    const active = roundsWithStatus.find(r => r.status === 'active');
    return active ? active.roundNumber : 1;
  });

  // Climber whose score sheet is being tapped (defaults to currentUser, switchable for shared phone)
  const [selectedClimberId, setSelectedClimberId] = useState<string>(
    currentUser?.id || climbers[0]?.id || ''
  );
  const prevUserIdRef = React.useRef<string | undefined>(currentUser?.id);

  // Sync if currentUser changes externally (e.g. header profile switcher)
  React.useEffect(() => {
    if (currentUser?.id && (currentUser.id !== prevUserIdRef.current || !selectedClimberId)) {
      prevUserIdRef.current = currentUser.id;
      setSelectedClimberId(currentUser.id);
    }
  }, [currentUser?.id, selectedClimberId]);

  const activeClimber = useMemo(
    () => climbers.find(c => c.id === selectedClimberId) || currentUser || climbers[0] || null,
    [climbers, selectedClimberId, currentUser]
  );

  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>('list');
  const [unlockUpcomingPreview, setUnlockUpcomingPreview] = useState<boolean>(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const currentRound: WinterSeriesRoundWithStatus = useMemo(() => {
    const rNum = typeof selectedView === 'number' ? selectedView : 1;
    return roundsWithStatus.find(r => r.roundNumber === rNum) || roundsWithStatus[0];
  }, [roundsWithStatus, selectedView]);

  const roundBoulders = useMemo(
    () => getRoundBoulders(currentRound, boulders),
    [currentRound, boulders]
  );

  const roundStandings = useMemo(
    () => computeWinterRoundStandings(roundBoulders, attempts, climbers, true),
    [roundBoulders, attempts, climbers]
  );

  const overallStandings = useMemo(
    () => computeWinterSeriesOverallStandings(boulders, attempts, climbers),
    [boulders, attempts, climbers]
  );

  const activeClimberStanding = useMemo(
    () =>
      roundStandings.find(s => s.climber.id === activeClimber?.id) ||
      roundStandings[0] ||
      null,
    [roundStandings, activeClimber]
  );

  // Build fast lookup: boulderId -> userId -> highest-scoring non-untried Attempt
  const attemptLookup = useMemo(() => {
    const map = new Map<string, Map<string, Attempt>>();
    for (const b of roundBoulders) {
      map.set(b.id, new Map());
    }
    for (const a of attempts) {
      if (getWinterProblemPoints(a.status) <= 0) continue;
      const bMap = map.get(a.boulder_id);
      if (bMap) {
        const existing = bMap.get(a.user_id);
        if (
          !existing ||
          getWinterProblemPoints(a.status) > getWinterProblemPoints(existing.status)
        ) {
          bMap.set(a.user_id, a);
        }
      }
    }
    return map;
  }, [roundBoulders, attempts]);

  // Categorize all 25 boulders for the active climber
  const categorizedBoulders = useMemo(() => {
    const targetId = activeClimber?.id || '';
    const untriedNumbers: number[] = [];
    const zoneNumbers: number[] = [];
    const crewBeatMeNumbers: number[] = [];

    const items = roundBoulders.map(boulder => {
      const compNum = boulder.comp_number || Math.round(boulder.position_order);
      const bAttempts = attemptLookup.get(boulder.id);
      const myAttempt = bAttempts?.get(targetId);
      const myPoints = myAttempt ? getWinterProblemPoints(myAttempt.status) : 0;
      const myStatus = myAttempt?.status || 'untried';

      const crewScores = climbers.map(c => {
        const att = bAttempts?.get(c.id);
        const pts = att ? getWinterProblemPoints(att.status) : 0;
        return {
          climber: c,
          attempt: att,
          points: pts,
          status: att?.status || 'untried'
        };
      });

      const bestOtherPoints = crewScores
        .filter(cs => cs.climber.id !== targetId)
        .reduce((max, cs) => Math.max(max, cs.points), 0);

      const crewBeatMe = bestOtherPoints > myPoints;

      if (myPoints === 0) untriedNumbers.push(compNum);
      if (myPoints === 1) zoneNumbers.push(compNum);
      if (crewBeatMe) crewBeatMeNumbers.push(compNum);

      return {
        boulder,
        compNum,
        myAttempt,
        myPoints,
        myStatus,
        crewScores,
        bestOtherPoints,
        crewBeatMe
      };
    });

    return {
      items,
      untriedNumbers,
      zoneNumbers,
      crewBeatMeNumbers
    };
  }, [roundBoulders, attemptLookup, activeClimber?.id, climbers]);

  const filteredItems = useMemo(() => {
    return categorizedBoulders.items.filter(item => {
      if (scoreFilter === 'points_left') return item.myPoints === 0 || item.myPoints === 1;
      if (scoreFilter === 'untried') return item.myPoints === 0;
      if (scoreFilter === 'zones') return item.myPoints === 1;
      if (scoreFilter === 'topped') return item.myPoints >= 2;
      if (scoreFilter === 'crew_beat_me') return item.crewBeatMe;
      return true;
    });
  }, [categorizedBoulders.items, scoreFilter]);

  const handleToggleScore = async (
    boulder: Boulder,
    targetStatus: 'flashed' | 'sent' | 'attempted',
    forUserId?: string
  ) => {
    const targetUserId = forUserId || activeClimber?.id;
    if (!targetUserId) return;
    const key = `${boulder.id}:${targetUserId}`;
    if (pendingKey === key) return;
    setPendingKey(key);
    try {
      const existing = attemptLookup.get(boulder.id)?.get(targetUserId);
      if (existing?.status === targetStatus) {
        await onDeleteAttempt(boulder.id, targetUserId);
      } else {
        const attemptCount = targetStatus === 'flashed' ? 1 : targetStatus === 'sent' ? 2 : 1;
        await onLogAttempt({
          boulderId: boulder.id,
          status: targetStatus,
          attemptCount,
          userId: targetUserId
        });
      }
    } finally {
      setPendingKey(null);
    }
  };

  const isRoundUpcoming = currentRound.status === 'upcoming';
  const showScoreSheet = !isRoundUpcoming || unlockUpcomingPreview;

  return (
    <div className="space-y-5">
      {/* 1. Hero Banner: Winter Boulder Series 2026/27 + Official Score Submission Link */}
      <div className="bg-surface border border-amber-500/35 rounded-3xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-amber-300 tabular-nums">
              Big Rock 2026/27 · 4 Rounds × 25 Boulders
            </p>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              Winter Boulder Series
            </h2>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <a
              href={WINTER_SERIES_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs tracking-wide transition-all shadow-sm active-press"
            >
              <span>Submit Official Scores</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>
            <div className="flex items-center gap-3 text-[11px] font-semibold tabular-nums text-slate-300">
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Zap className="w-3 h-3 fill-current" />
                <span>Flash 3</span>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Top 2</span>
              </span>
              <span className="inline-flex items-center gap-1 text-sky-300">
                <Clock className="w-3 h-3 stroke-[2.5]" />
                <span>Zone 1</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Round Selector Pills (R1–R4 + Overall Series) */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {roundsWithStatus.map(r => {
            const isSelected = selectedView === r.roundNumber;
            const isLive = r.status === 'active';

            return (
              <button
                key={r.roundNumber}
                type="button"
                onClick={() => {
                  setSelectedView(r.roundNumber);
                  setUnlockUpcomingPreview(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500/50 text-white'
                    : isLive
                    ? 'bg-surface-elevated border-emerald-500/35 text-slate-100 hover:border-emerald-500/60'
                    : 'bg-carbon border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tabular-nums">
                      R{r.roundNumber} · {r.gymName}
                    </span>
                    {isLive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active round" />
                    )}
                    {r.status === 'upcoming' && (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    {r.dateRangeLabel}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedView('overall')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all shrink-0 border ${
              selectedView === 'overall'
                ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-sm'
                : 'bg-carbon border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold">Series Total</div>
              <div className="text-[11px] text-slate-400 mt-0.5">All 4 Rounds</div>
            </div>
          </button>
        </div>
      </div>

      {/* OVERALL SERIES VIEW */}
      {selectedView === 'overall' ? (
        <div className="ds-card p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 tabular-nums">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Overall Standings (Max 300 pts)</span>
          </h3>

          <div className="space-y-3">
            {overallStandings.map((entry, idx) => {
              const leaderPts = overallStandings[0]?.totalPoints || 0;
              const diff = leaderPts - entry.totalPoints;

              return (
                <div
                  key={entry.climber.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    idx === 0 && entry.totalPoints > 0
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-carbon border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md font-mono tabular-nums text-xs font-black flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-surface-elevated text-slate-300'
                        }`}
                      >
                        {entry.rank}
                      </span>
                      <ClimberAvatar profile={entry.climber} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {entry.climber.display_name}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-400 flex items-center gap-2 flex-wrap">
                          <span className="text-amber-300">{entry.flashesCount}F</span>
                          <span>•</span>
                          <span className="text-emerald-300">
                            {entry.topsCount - entry.flashesCount}T
                          </span>
                          <span>•</span>
                          <span className="text-sky-300">{entry.zonesCount}Z</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-lg font-black font-mono text-amber-400 leading-none">
                        {entry.totalPoints}{' '}
                        <span className="text-xs font-sans font-normal text-slate-400">pts</span>
                      </div>
                      {idx > 0 && diff > 0 && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          -{diff} pt{diff === 1 ? '' : 's'} behind #1
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Per-round breakdown */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {WINTER_SERIES_ROUNDS.map(rMeta => {
                      const rs = entry.roundScores[rMeta.roundNumber];
                      return (
                        <button
                          key={rMeta.roundNumber}
                          type="button"
                          onClick={() => setSelectedView(rMeta.roundNumber)}
                          className="bg-surface hover:bg-surface-elevated border border-white/[0.08] rounded-md p-2 text-left transition-colors"
                        >
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            R{rMeta.roundNumber} ({rMeta.gymName})
                          </div>
                          <div className="text-xs font-black font-mono tabular-nums text-white mt-0.5">
                            {rs?.points || 0} <span className="text-[10px] font-normal text-slate-400">/ 75</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Round Status Bar */}
          <div className="bg-surface border border-white/[0.08] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {currentRound.fullName}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentRound.dateRangeLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentRound.status === 'active' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 tabular-nums">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Active • {currentRound.daysRemaining}d left</span>
                </span>
              )}
              {currentRound.status === 'upcoming' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 tabular-nums">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Starts in {currentRound.daysUntilStart}d ({currentRound.startDate})</span>
                </span>
              )}
              {currentRound.status === 'completed' && (
                <span className="text-xs font-semibold text-slate-300">
                  Completed
                </span>
              )}
            </div>
          </div>

          {/* If Round is Upcoming and not yet active, show schedule notice with optional preview button */}
          {!showScoreSheet ? (
            <div className="ds-card p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-base font-black text-white">
                {currentRound.fullName} starts {currentRound.dateRangeLabel.split(' – ')[0]}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All 25 boulders for {currentRound.gymName} activate automatically when the round begins ({currentRound.dateRangeLabel}).
              </p>
              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const active = roundsWithStatus.find(r => r.status === 'active');
                    setSelectedView(active ? active.roundNumber : 1);
                  }}
                  className="px-4 py-2 rounded-full bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                >
                  Go to Active Round
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockUpcomingPreview(true)}
                  className="px-4 py-2 rounded-full bg-surface-elevated text-slate-200 font-bold text-xs hover:bg-surface-high border border-white/[0.1] transition-colors"
                >
                  Preview Sheet
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 3. Crew Comparison & Round Standings Card */}
              <div className="ds-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Round {currentRound.roundNumber} Standings
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Tap a climber to switch sheet
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {roundStandings.map((standing, idx) => {
                    const isSelectedClimber = standing.climber.id === activeClimber?.id;
                    const leaderPoints = roundStandings[0]?.totalPoints || 0;
                    const pointsBehind = leaderPoints - standing.totalPoints;
                    const topsOnlyCount = standing.topsCount - standing.flashesCount;
                    const flashPct = (standing.flashesCount / COMP_WALL_MAX_BOULDERS) * 100;
                    const topPct = (topsOnlyCount / COMP_WALL_MAX_BOULDERS) * 100;
                    const zonePct = (standing.zonesCount / COMP_WALL_MAX_BOULDERS) * 100;

                    return (
                      <button
                        key={standing.climber.id}
                        type="button"
                        onClick={() => setSelectedClimberId(standing.climber.id)}
                        className={`text-left p-3 rounded-lg border transition-all relative overflow-hidden ${
                          isSelectedClimber
                            ? 'bg-surface-elevated border-amber-500/60 shadow-md'
                            : 'bg-carbon border-white/[0.08] hover:border-white/[0.16]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md font-mono tabular-nums text-[11px] font-black flex items-center justify-center shrink-0 ${
                                idx === 0 && standing.totalPoints > 0
                                  ? 'bg-amber-500 text-slate-950'
                                  : idx === 1 && standing.totalPoints > 0
                                  ? 'bg-slate-300 text-slate-950'
                                  : idx === 2 && standing.totalPoints > 0
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-surface-elevated text-slate-300'
                              }`}
                            >
                              {standing.rank}
                            </span>
                            <ClimberAvatar profile={standing.climber} size="sm" />
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-white truncate block">
                                {standing.climber.display_name}
                              </span>
                              <div className="text-[11px] font-mono tabular-nums text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="text-amber-300 font-bold">{standing.flashesCount}F</span>
                                <span>·</span>
                                <span className="text-emerald-300 font-bold">{topsOnlyCount}T</span>
                                <span>·</span>
                                <span className="text-sky-300 font-bold">{standing.zonesCount}Z</span>
                                <span>·</span>
                                <span className="font-sans text-slate-400">{standing.unattemptedCount} left</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 tabular-nums">
                            <div className="text-base font-black font-mono text-amber-400 leading-none">
                              {standing.totalPoints}
                              <span className="text-[11px] font-normal text-slate-400">/{COMP_WALL_MAX_POINTS}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              {idx === 0 && standing.totalPoints > 0 ? (
                                <span className="text-emerald-400 font-bold">Leader</span>
                              ) : pointsBehind > 0 ? (
                                <span>-{pointsBehind} pt{pointsBehind === 1 ? '' : 's'}</span>
                              ) : (
                                <span>Tied</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stacked progress bar of 25 boulders */}
                        <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden flex mt-2.5">
                          {flashPct > 0 && (
                            <div
                              style={{ width: `${flashPct}%` }}
                              className="bg-amber-400 h-full transition-all duration-500"
                              title={`${standing.flashesCount} Flashes`}
                            />
                          )}
                          {topPct > 0 && (
                            <div
                              style={{ width: `${topPct}%` }}
                              className="bg-emerald-400 h-full transition-all duration-500"
                              title={`${topsOnlyCount} Tops`}
                            />
                          )}
                          {zonePct > 0 && (
                            <div
                              style={{ width: `${zonePct}%` }}
                              className="bg-sky-400 h-full transition-all duration-500"
                              title={`${standing.zonesCount} Zones`}
                            />
                          )}
                        </div>

                        {/* Points still up for grabs & ceiling */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 tabular-nums">
                          <span>
                            Available:{' '}
                            <strong className="text-emerald-300">+{standing.pointsUpForGrabs} pts</strong>
                          </span>
                          <span>
                            Max:{' '}
                            <strong className="text-slate-200">{standing.maxPossiblePoints}/75</strong>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. "Points Still Up For Grabs & What's Left" Tactical Card for Active Climber */}
              {activeClimberStanding && (
                <div className="ds-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {activeClimberStanding.climber.display_name}&apos;s Remaining Points
                      </h3>
                    </div>
                  </div>

                  {/* 4-column KPI strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-carbon border border-white/[0.08] rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Available
                      </div>
                      <div className="text-lg font-black font-mono tabular-nums text-emerald-400 mt-1">
                        +{activeClimberStanding.pointsUpForGrabs}{' '}
                        <span className="text-xs font-sans font-normal text-slate-400">pts</span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                        {activeClimberStanding.unattemptedCount}×3 + {activeClimberStanding.zonesCount}×1
                      </div>
                    </div>

                    <div className="bg-carbon border border-white/[0.08] rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Max Ceiling
                      </div>
                      <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
                        {activeClimberStanding.maxPossiblePoints}{' '}
                        <span className="text-xs font-normal text-slate-400">/ 75</span>
                      </div>
                    </div>

                    <div className="bg-carbon border border-white/[0.08] rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Untried
                      </div>
                      <div className="text-lg font-black font-mono tabular-nums text-amber-300 mt-1">
                        {activeClimberStanding.unattemptedCount}
                      </div>
                      <div className="text-[11px] tabular-nums text-slate-400 mt-0.5">
                        +{activeClimberStanding.unattemptedCount * 3} pts max
                      </div>
                    </div>

                    <div className="bg-carbon border border-white/[0.08] rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Zone Upgrades
                      </div>
                      <div className="text-lg font-black font-mono tabular-nums text-sky-300 mt-1">
                        {activeClimberStanding.zonesCount}
                      </div>
                      <div className="text-[11px] tabular-nums text-slate-400 mt-0.5">
                        +{activeClimberStanding.zonesCount} pts on top
                      </div>
                    </div>
                  </div>

                  {/* Quick summary of remaining boulder numbers */}
                  {(categorizedBoulders.untriedNumbers.length > 0 ||
                    categorizedBoulders.zoneNumbers.length > 0) && (
                    <div className="bg-carbon border border-white/[0.07] rounded-lg p-3 space-y-2">
                      {categorizedBoulders.untriedNumbers.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-semibold text-slate-300 shrink-0 mt-0.5 tabular-nums">
                            Untried ({categorizedBoulders.untriedNumbers.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {categorizedBoulders.untriedNumbers.map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setScoreFilter('untried')}
                                className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-high text-slate-200 font-mono tabular-nums text-[11px] font-bold border border-white/[0.08]"
                              >
                                #{num}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {categorizedBoulders.zoneNumbers.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-semibold text-sky-300 shrink-0 mt-0.5 tabular-nums">
                            Zone (+1 pt):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {categorizedBoulders.zoneNumbers.map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setScoreFilter('zones')}
                                className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-mono tabular-nums text-[11px] font-bold border border-sky-500/30"
                              >
                                #{num}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Score Sheet Controls: Climber Switcher, Filter Pills, and View Mode Toggle */}
              <div className="ds-card p-4 space-y-3">
                {/* Climber Switcher & Layout Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">
                      Climber
                    </span>
                    {climbers.map(c => {
                      const isCurrent = c.id === activeClimber?.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClimberId(c.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                            isCurrent
                              ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-xs'
                              : 'bg-carbon border-white/[0.08] text-slate-300 hover:text-white'
                          }`}
                        >
                          <ClimberAvatar profile={c} size="xs" />
                          <span>{c.display_name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Layout Switcher: List / 5x5 Grid / Crew Matrix */}
                  <div className="flex items-center bg-carbon p-1 rounded-lg border border-white/[0.08] self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setSheetLayout('list')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                        sheetLayout === 'list'
                          ? 'bg-surface-high text-amber-300'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetLayout('grid')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                        sheetLayout === 'grid'
                          ? 'bg-surface-high text-amber-300'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>5×5 Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetLayout('matrix')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                        sheetLayout === 'matrix'
                          ? 'bg-surface-high text-amber-300'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Matrix</span>
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    {
                      id: 'all' as ScoreFilter,
                      label: `All (25)`
                    },
                    {
                      id: 'points_left' as ScoreFilter,
                      label: `Points Left (${
                        categorizedBoulders.untriedNumbers.length +
                        categorizedBoulders.zoneNumbers.length
                      })`
                    },
                    {
                      id: 'untried' as ScoreFilter,
                      label: `Untried (${categorizedBoulders.untriedNumbers.length})`
                    },
                    {
                      id: 'zones' as ScoreFilter,
                      label: `Zones (${categorizedBoulders.zoneNumbers.length})`
                    },
                    {
                      id: 'topped' as ScoreFilter,
                      label: `Topped (${
                        25 -
                        categorizedBoulders.untriedNumbers.length -
                        categorizedBoulders.zoneNumbers.length
                      })`
                    },
                    {
                      id: 'crew_beat_me' as ScoreFilter,
                      label: `Crew Beat Me (${categorizedBoulders.crewBeatMeNumbers.length})`
                    }
                  ].map(pill => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setScoreFilter(pill.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border tabular-nums ${
                        scoreFilter === pill.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-carbon text-slate-300 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* LAYOUT 1: FAST 1-TAP SCORE SHEET LIST */}
                {sheetLayout === 'list' && (
                  <div className="space-y-2 pt-1">
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No boulders match this filter.
                      </div>
                    ) : (
                      filteredItems.map(item => {
                        const { boulder, compNum, myStatus, myPoints, crewScores } = item;
                        const holdDef = HOLD_COLORS[boulder.hold_colour];
                        const isItemPending = pendingKey === `${boulder.id}:${activeClimber?.id || ''}`;

                        return (
                          <div
                            key={boulder.id}
                            className={`rounded-lg border p-2.5 sm:p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              myStatus === 'flashed'
                                ? 'bg-amber-500/[0.07] border-amber-500/40'
                                : myStatus === 'sent'
                                ? 'bg-emerald-500/[0.07] border-emerald-500/40'
                                : myStatus === 'attempted'
                                ? 'bg-sky-500/[0.07] border-sky-500/40'
                                : 'bg-carbon border-white/[0.08]'
                            }`}
                          >
                            {/* Left: Problem Number + Crew Comparison Chips + Potential */}
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectBoulder?.(boulder)}
                                  className="w-11 h-11 rounded-md bg-surface-elevated border border-white/[0.1] hover:border-amber-500/50 flex flex-col items-center justify-center shrink-0 transition-colors"
                                  title="Open problem details / beta notes"
                                >
                                  <span className="text-sm font-black font-mono tabular-nums text-white leading-none">
                                    #{compNum}
                                  </span>
                                  {boulder.hold_colour && holdDef && (
                                    <span
                                      className="w-2.5 h-1 rounded-full mt-1"
                                      style={{ backgroundColor: holdDef.hex }}
                                    />
                                  )}
                                </button>

                                <div>
                                  <div className="flex items-center gap-2 tabular-nums">
                                    <span className="text-xs font-bold text-white">
                                      {boulder.hold_colour || `Problem #${compNum}`}
                                    </span>
                                    {myPoints > 0 && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                          myPoints === 3
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : myPoints === 2
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                        }`}
                                      >
                                        {myPoints} pt{myPoints === 1 ? '' : 's'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Crew mini badges on this boulder */}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {crewScores.map(cs => {
                                      const badgeColor =
                                        cs.points === 3
                                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                          : cs.points === 2
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                          : cs.points === 1
                                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                          : 'bg-surface text-slate-400 border-white/[0.08]';
                                      const symbol =
                                        cs.points === 3
                                          ? '3·F'
                                          : cs.points === 2
                                          ? '2·T'
                                          : cs.points === 1
                                          ? '1·Z'
                                          : '–';

                                      return (
                                        <span
                                          key={cs.climber.id}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] border tabular-nums ${badgeColor}`}
                                        >
                                          <span className="font-semibold">
                                            {cs.climber.display_name.slice(0, 4)}
                                          </span>
                                          <span className="font-mono font-bold">{symbol}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {onSelectBoulder && (
                                <button
                                  type="button"
                                  onClick={() => onSelectBoulder(boulder)}
                                  className="sm:hidden p-1.5 text-slate-400 hover:text-white"
                                  aria-label={`Details for boulder #${compNum}`}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Right: Large Chalky-Finger 1-Tap Buttons for ZONE (1) / TOP (2) / FLASH (3) */}
                            <div className="grid grid-cols-3 gap-1.5 sm:w-64 shrink-0">
                              <button
                                type="button"
                                disabled={isItemPending}
                                onClick={() => handleToggleScore(boulder, 'attempted')}
                                className={`py-2 px-2.5 rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-1 border active-press tabular-nums disabled:opacity-60 ${
                                  myStatus === 'attempted'
                                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm animate-pop'
                                    : 'bg-surface-elevated hover:bg-surface-high text-sky-300 border-white/[0.08]'
                                }`}
                              >
                                {isItemPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3 stroke-[2.5]" />}
                                <span>ZONE</span>
                                <span className="font-mono text-[10px]">1</span>
                              </button>

                              <button
                                type="button"
                                disabled={isItemPending}
                                onClick={() => handleToggleScore(boulder, 'sent')}
                                className={`py-2 px-2.5 rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-1 border active-press tabular-nums disabled:opacity-60 ${
                                  myStatus === 'sent'
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm animate-pop'
                                    : 'bg-surface-elevated hover:bg-surface-high text-emerald-300 border-white/[0.08]'
                                }`}
                              >
                                {isItemPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                <span>TOP</span>
                                <span className="font-mono text-[10px]">2</span>
                              </button>

                              <button
                                type="button"
                                disabled={isItemPending}
                                onClick={() => handleToggleScore(boulder, 'flashed')}
                                className={`py-2 px-2.5 rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-1 border active-press tabular-nums disabled:opacity-60 ${
                                  myStatus === 'flashed'
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm animate-pop'
                                    : 'bg-surface-elevated hover:bg-surface-high text-amber-300 border-white/[0.08]'
                                }`}
                              >
                                {isItemPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                                <span>FLASH</span>
                                <span className="font-mono text-[10px]">3</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* LAYOUT 2: COMPACT 5x5 SCORECARD GRID */}
                {sheetLayout === 'grid' && (
                  <div className="space-y-3 pt-1">
                    <div className="text-xs text-slate-400">
                      Tap to cycle: <strong className="text-amber-300">Flash (3)</strong> →{' '}
                      <strong className="text-emerald-300">Top (2)</strong> →{' '}
                      <strong className="text-sky-300">Zone (1)</strong> → Clear
                    </div>

                    {filteredItems.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No boulders match this filter.
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2">
                        {filteredItems.map(item => {
                          const { boulder, compNum, myStatus, myPoints } = item;
                          const isItemPending = pendingKey === `${boulder.id}:${activeClimber?.id || ''}`;
                          const handleCycle = () => {
                            if (myStatus === 'untried') {
                              handleToggleScore(boulder, 'flashed');
                            } else if (myStatus === 'flashed') {
                              handleToggleScore(boulder, 'sent');
                            } else if (myStatus === 'sent') {
                              handleToggleScore(boulder, 'attempted');
                            } else {
                              handleToggleScore(boulder, 'attempted');
                            }
                          };

                          return (
                            <button
                              key={boulder.id}
                              type="button"
                              disabled={isItemPending}
                              onClick={handleCycle}
                              className={`p-2.5 rounded-lg border font-mono tabular-nums flex flex-col items-center justify-center gap-1 transition-all active-press disabled:opacity-60 ${
                                myPoints === 3
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm animate-pop'
                                  : myPoints === 2
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm animate-pop'
                                  : myPoints === 1
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm animate-pop'
                                  : 'bg-carbon border-white/[0.08] text-slate-300 hover:border-white/[0.16]'
                              }`}
                            >
                              <span className="text-xs font-black text-white">#{compNum}</span>
                              <span className="text-[11px] font-bold inline-flex items-center gap-0.5">
                                {isItemPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : myPoints === 3 ? (
                                  <>
                                    <Zap className="w-3 h-3 fill-current" />
                                    <span>3pt</span>
                                  </>
                                ) : myPoints === 2 ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                    <span>2pt</span>
                                  </>
                                ) : myPoints === 1 ? (
                                  <>
                                    <Clock className="w-3 h-3 stroke-[2.5]" />
                                    <span>1pt</span>
                                  </>
                                ) : (
                                  <span>0pt</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* LAYOUT 3: HEAD-TO-HEAD CREW COMPARISON MATRIX */}
                {sheetLayout === 'matrix' && (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs text-slate-400">
                      Tap cell to cycle: <strong className="text-amber-300">Flash (3)</strong> →{' '}
                      <strong className="text-emerald-300">Top (2)</strong> →{' '}
                      <strong className="text-sky-300">Zone (1)</strong> → Clear
                    </div>
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No boulders match this filter.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/[0.08] text-xs text-slate-300">
                              <th className="py-2 px-2">Boulder</th>
                              {climbers.map(c => (
                                <th key={c.id} className="py-2 px-2 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <ClimberAvatar profile={c} size="xs" />
                                    <span className="font-bold text-white text-[11px]">
                                      {c.display_name}
                                    </span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {filteredItems.map(item => (
                              <tr key={item.boulder.id} className="hover:bg-carbon/40">
                                <td className="py-2 px-2 font-mono tabular-nums font-black text-white">
                                  <button
                                    type="button"
                                    onClick={() => onSelectBoulder?.(item.boulder)}
                                    className="hover:text-amber-400 transition-colors"
                                  >
                                    #{item.compNum}
                                  </button>
                                </td>
                                {item.crewScores.map(cs => {
                                  const isCellPending = pendingKey === `${item.boulder.id}:${cs.climber.id}`;
                                  const handleCellCycle = () => {
                                    if (cs.status === 'untried') {
                                      handleToggleScore(item.boulder, 'flashed', cs.climber.id);
                                    } else if (cs.status === 'flashed') {
                                      handleToggleScore(item.boulder, 'sent', cs.climber.id);
                                    } else if (cs.status === 'sent') {
                                      handleToggleScore(item.boulder, 'attempted', cs.climber.id);
                                    } else {
                                      handleToggleScore(item.boulder, 'attempted', cs.climber.id);
                                    }
                                  };

                                  return (
                                    <td key={cs.climber.id} className="py-1.5 px-1.5 text-center">
                                      <button
                                        type="button"
                                        disabled={isCellPending}
                                        onClick={handleCellCycle}
                                        className="w-full py-1 rounded-lg hover:bg-surface-elevated transition-colors active-press disabled:opacity-60"
                                        title={`Cycle score for ${cs.climber.display_name} on #${item.compNum}`}
                                      >
                                        {isCellPending ? (
                                          <span className="inline-flex items-center justify-center py-0.5">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                          </span>
                                        ) : cs.points === 3 ? (
                                          <span className="inline-flex items-center justify-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono tabular-nums font-black text-[11px]">
                                            <Zap className="w-2.5 h-2.5 fill-current" />
                                            <span>3</span>
                                          </span>
                                        ) : cs.points === 2 ? (
                                          <span className="inline-flex items-center justify-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono tabular-nums font-black text-[11px]">
                                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                            <span>2</span>
                                          </span>
                                        ) : cs.points === 1 ? (
                                          <span className="inline-flex items-center justify-center gap-0.5 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono tabular-nums font-black text-[11px]">
                                            <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                                            <span>1</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 hover:text-white">–</span>
                                        )}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
