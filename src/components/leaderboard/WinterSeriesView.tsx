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
  Sparkles,
  Target,
  Users,
  LayoutGrid,
  List,
  ChevronRight,
  Lock,
  Flame,
  TrendingUp
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
  };

  const isRoundUpcoming = currentRound.status === 'upcoming';
  const showScoreSheet = !isRoundUpcoming || unlockUpcomingPreview;

  return (
    <div className="space-y-4">
      {/* 1. Hero Banner: Winter Boulder Series 2026/27 + Official Score Submission Link */}
      <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Big Rock 2026/27
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded-md border border-slate-800">
                4 Rounds × 25 Boulders
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-heading mt-1.5">
              Winter Boulder Series
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Track Flash, Top &amp; Zone across all 25 problems, see points left up for grabs, and compare with the crew.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <a
              href={WINTER_SERIES_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs tracking-wide transition-all shadow-md shadow-amber-500/20 active:scale-[0.98]"
            >
              <span>Submit Official Scores</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                ⚡ Flash = 3pt
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ✓ Top = 2pt
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                ◐ Zone = 1pt
              </span>
            </div>
          </div>
        </div>

        {/* 2. Round Selector Pills (R1–R4 + Overall Series) */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {roundsWithStatus.map(r => {
            const isSelected = selectedView === r.roundNumber;
            const isLive = r.status === 'active';
            const isPast = r.status === 'completed';

            return (
              <button
                key={r.roundNumber}
                type="button"
                onClick={() => {
                  setSelectedView(r.roundNumber);
                  setUnlockUpcomingPreview(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-sm'
                    : isLive
                    ? 'bg-slate-900/90 border-emerald-500/30 text-slate-200 hover:border-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black font-mono">
                      R{r.roundNumber} · {r.gymName}
                    </span>
                    {isLive && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Active
                      </span>
                    )}
                    {isPast && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-400">
                        Done
                      </span>
                    )}
                    {r.status === 'upcoming' && (
                      <Lock className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {r.dateRangeLabel}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedView('overall')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-left transition-all shrink-0 border ${
              selectedView === 'overall'
                ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-black font-mono">Series Total</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">All 4 Rounds</div>
            </div>
          </button>
        </div>
      </div>

      {/* OVERALL SERIES VIEW */}
      {selectedView === 'overall' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Overall Winter Series Standings (Max 300 pts)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cumulative score across Round 1 (Bond), Round 2 (Hub), Round 3 (Bond) &amp; Round 4 (Hub)
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {overallStandings.map((entry, idx) => {
              const leaderPts = overallStandings[0]?.totalPoints || 0;
              const diff = leaderPts - entry.totalPoints;

              return (
                <div
                  key={entry.climber.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    idx === 0 && entry.totalPoints > 0
                      ? 'bg-amber-500/10 border-amber-500/35'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {entry.rank}
                      </span>
                      <ClimberAvatar profile={entry.climber} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {entry.climber.display_name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
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

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black font-mono text-amber-400">
                        {entry.totalPoints}{' '}
                        <span className="text-[10px] font-normal text-slate-400">pts</span>
                      </div>
                      {idx > 0 && diff > 0 && (
                        <div className="text-[10px] font-mono text-slate-500">
                          -{diff} pt{diff === 1 ? '' : 's'} behind #1
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Per-round breakdown */}
                  <div className="grid grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-800/70">
                    {WINTER_SERIES_ROUNDS.map(rMeta => {
                      const rs = entry.roundScores[rMeta.roundNumber];
                      return (
                        <button
                          key={rMeta.roundNumber}
                          type="button"
                          onClick={() => setSelectedView(rMeta.roundNumber)}
                          className="bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 rounded-lg p-2 text-left transition-colors"
                        >
                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                            <span>R{rMeta.roundNumber} ({rMeta.gymName})</span>
                          </div>
                          <div className="text-xs font-black font-mono text-white mt-0.5">
                            {rs?.points || 0} <span className="text-[10px] font-normal text-slate-500">/ 75</span>
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-white font-heading">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {currentRound.fullName}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {currentRound.dateRangeLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentRound.status === 'active' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Flame className="w-3 h-3 text-emerald-400" />
                  Active Round • {currentRound.daysRemaining}d left
                </span>
              )}
              {currentRound.status === 'upcoming' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Starts in {currentRound.daysUntilStart}d ({currentRound.startDate})
                </span>
              )}
              {currentRound.status === 'completed' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Round Completed
                </span>
              )}
            </div>
          </div>

          {/* If Round is Upcoming and not yet active, show schedule notice with optional preview button */}
          {!showScoreSheet ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-base font-black text-white font-heading">
                {currentRound.fullName} starts on {currentRound.dateRangeLabel.split(' – ')[0]}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All 25 boulders (#1 to #25) for {currentRound.gymName} are pre-populated and will automatically activate when the round begins ({currentRound.dateRangeLabel}).
              </p>
              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const active = roundsWithStatus.find(r => r.status === 'active');
                    setSelectedView(active ? active.roundNumber : 1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                >
                  Go to Active Round
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockUpcomingPreview(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  Preview 25-Boulder Sheet
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 3. Crew Comparison & Round Standings Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white font-heading">
                      Crew Standings &amp; Comparison — Round {currentRound.roundNumber}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Tap a climber to view or log their score sheet
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
                        className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden ${
                          isSelectedClimber
                            ? 'bg-slate-800/90 border-amber-500/60 ring-1 ring-amber-500/30 shadow-md'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md font-mono text-[11px] font-black flex items-center justify-center shrink-0 ${
                                idx === 0 && standing.totalPoints > 0
                                  ? 'bg-amber-500 text-slate-950'
                                  : idx === 1 && standing.totalPoints > 0
                                  ? 'bg-slate-300 text-slate-950'
                                  : idx === 2 && standing.totalPoints > 0
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {standing.rank}
                            </span>
                            <ClimberAvatar profile={standing.climber} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-white truncate">
                                  {standing.climber.display_name}
                                </span>
                                {isSelectedClimber && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Active Sheet
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="text-amber-300 font-bold">{standing.flashesCount}F</span>
                                <span>·</span>
                                <span className="text-emerald-300 font-bold">{topsOnlyCount}T</span>
                                <span>·</span>
                                <span className="text-sky-300 font-bold">{standing.zonesCount}Z</span>
                                <span>·</span>
                                <span className="text-slate-400">{standing.unattemptedCount} left</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-amber-400 leading-none">
                              {standing.totalPoints}
                              <span className="text-[10px] font-normal text-slate-500">/{COMP_WALL_MAX_POINTS}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
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
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex mt-2.5 border border-slate-800/80">
                          {flashPct > 0 && (
                            <div
                              style={{ width: `${flashPct}%` }}
                              className="bg-amber-400 h-full"
                              title={`${standing.flashesCount} Flashes`}
                            />
                          )}
                          {topPct > 0 && (
                            <div
                              style={{ width: `${topPct}%` }}
                              className="bg-emerald-400 h-full"
                              title={`${topsOnlyCount} Tops`}
                            />
                          )}
                          {zonePct > 0 && (
                            <div
                              style={{ width: `${zonePct}%` }}
                              className="bg-sky-400 h-full"
                              title={`${standing.zonesCount} Zones`}
                            />
                          )}
                        </div>

                        {/* Points still up for grabs & ceiling */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-1.5 border-t border-slate-800/60">
                          <span>
                            Up for grabs:{' '}
                            <strong className="text-emerald-300">+{standing.pointsUpForGrabs} pts</strong>
                          </span>
                          <span>
                            Max ceiling:{' '}
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white font-heading">
                        {activeClimberStanding.climber.display_name}&apos;s Points Up For Grabs &amp; What&apos;s Left
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                      Current: {activeClimberStanding.totalPoints} / {COMP_WALL_MAX_POINTS} pts
                    </span>
                  </div>

                  {/* 4-column KPI strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Points Up For Grabs
                      </div>
                      <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                        +{activeClimberStanding.pointsUpForGrabs}{' '}
                        <span className="text-xs font-normal text-slate-400">pts</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {activeClimberStanding.unattemptedCount}×3pt + {activeClimberStanding.zonesCount}×1pt
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Max Possible Score
                      </div>
                      <div className="text-lg font-black font-mono text-white mt-0.5">
                        {activeClimberStanding.maxPossiblePoints}{' '}
                        <span className="text-xs font-normal text-slate-500">/ 75</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        If remaining flashed &amp; zones topped
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Untried Boulders (0pt)
                      </div>
                      <div className="text-lg font-black font-mono text-amber-300 mt-0.5">
                        {activeClimberStanding.unattemptedCount}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          (+{activeClimberStanding.unattemptedCount * 3} pts)
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Up to 3 pts each on flash
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Zone Upgrades (1→2pt)
                      </div>
                      <div className="text-lg font-black font-mono text-sky-300 mt-0.5">
                        {activeClimberStanding.zonesCount}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          (+{activeClimberStanding.zonesCount} pts)
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        +1 pt each if finished to Top
                      </div>
                    </div>
                  </div>

                  {/* Quick summary of remaining boulder numbers */}
                  {(categorizedBoulders.untriedNumbers.length > 0 ||
                    categorizedBoulders.zoneNumbers.length > 0) && (
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 space-y-2">
                      {categorizedBoulders.untriedNumbers.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-mono font-bold text-slate-300 shrink-0 mt-0.5">
                            Untried ({categorizedBoulders.untriedNumbers.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {categorizedBoulders.untriedNumbers.map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setScoreFilter('untried')}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold border border-slate-700"
                              >
                                #{num}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {categorizedBoulders.zoneNumbers.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-mono font-bold text-sky-300 shrink-0 mt-0.5">
                            Zone Only — Can Top (+1pt):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {categorizedBoulders.zoneNumbers.map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setScoreFilter('zones')}
                                className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-mono text-[11px] font-bold border border-sky-500/30"
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                {/* Climber Switcher & Layout Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-mono uppercase text-slate-400 mr-1 shrink-0">
                      Logging for:
                    </span>
                    {climbers.map(c => {
                      const isCurrent = c.id === activeClimber?.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClimberId(c.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                            isCurrent
                              ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-xs'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <ClimberAvatar profile={c} size="xs" />
                          <span>{c.display_name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Layout Switcher: List / 5x5 Grid / Crew Matrix */}
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setSheetLayout('list')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                        sheetLayout === 'list'
                          ? 'bg-slate-800 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Score Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetLayout('grid')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                        sheetLayout === 'grid'
                          ? 'bg-slate-800 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>5×5 Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetLayout('matrix')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                        sheetLayout === 'matrix'
                          ? 'bg-slate-800 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Crew Matrix</span>
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
                      label: `Untried 0pt (${categorizedBoulders.untriedNumbers.length})`
                    },
                    {
                      id: 'zones' as ScoreFilter,
                      label: `Zones 1pt (${categorizedBoulders.zoneNumbers.length})`
                    },
                    {
                      id: 'topped' as ScoreFilter,
                      label: `Topped/Flashed (${
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
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold shrink-0 transition-all border ${
                        scoreFilter === pill.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
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
                      <div className="text-center py-8 text-xs font-mono text-slate-400">
                        No boulders match this filter.
                      </div>
                    ) : (
                      filteredItems.map(item => {
                        const { boulder, compNum, myStatus, myPoints, crewScores } = item;
                        const holdDef = HOLD_COLORS[boulder.hold_colour];

                        return (
                          <div
                            key={boulder.id}
                            className={`rounded-xl border p-2.5 sm:p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              myStatus === 'flashed'
                                ? 'bg-amber-500/[0.07] border-amber-500/40'
                                : myStatus === 'sent'
                                ? 'bg-emerald-500/[0.07] border-emerald-500/40'
                                : myStatus === 'attempted'
                                ? 'bg-sky-500/[0.07] border-sky-500/40'
                                : 'bg-slate-950/60 border-slate-800/90'
                            }`}
                          >
                            {/* Left: Problem Number + Crew Comparison Chips + Potential */}
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectBoulder?.(boulder)}
                                  className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500/50 flex flex-col items-center justify-center shrink-0 transition-colors"
                                  title="Open problem details / beta notes"
                                >
                                  <span className="text-sm font-black font-mono text-white leading-none">
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
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white font-mono">
                                      Boulder #{compNum}
                                    </span>
                                    {myPoints > 0 ? (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                                          myPoints === 3
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : myPoints === 2
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                        }`}
                                      >
                                        {myPoints} pt{myPoints === 1 ? '' : 's'}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                                        0 pt · +3 available
                                      </span>
                                    )}
                                    {myPoints === 1 && (
                                      <span className="text-[10px] font-mono text-sky-300">
                                        (+1 pt to Top)
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
                                          : 'bg-slate-900/80 text-slate-500 border-slate-800';
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
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeColor}`}
                                        >
                                          <span className="font-sans font-semibold">
                                            {cs.climber.display_name.slice(0, 4)}
                                          </span>
                                          <span className="font-bold">{symbol}</span>
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
                                onClick={() => handleToggleScore(boulder, 'attempted')}
                                className={`py-2 px-2.5 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center gap-1 border active:scale-95 ${
                                  myStatus === 'attempted'
                                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm shadow-sky-500/30'
                                    : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-slate-800'
                                }`}
                              >
                                <span>ZONE</span>
                                <span className="text-[10px] opacity-80">1</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleScore(boulder, 'sent')}
                                className={`py-2 px-2.5 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center gap-1 border active:scale-95 ${
                                  myStatus === 'sent'
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm shadow-emerald-500/30'
                                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-slate-800'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>TOP</span>
                                <span className="text-[10px] opacity-80">2</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleScore(boulder, 'flashed')}
                                className={`py-2 px-2.5 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center gap-1 border active:scale-95 ${
                                  myStatus === 'flashed'
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm shadow-amber-500/30'
                                    : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>FLASH</span>
                                <span className="text-[10px] opacity-80">3</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* LAYOUT 2: COMPACT 5x5 SCORECARD GRID (Tap to cycle 0 -> 3 Flash -> 2 Top -> 1 Zone -> 0) */}
                {sheetLayout === 'grid' && (
                  <div className="space-y-3 pt-1">
                    <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span>
                        Tap any tile to cycle: <strong className="text-amber-300">Flash (3)</strong> →{' '}
                        <strong className="text-emerald-300">Top (2)</strong> →{' '}
                        <strong className="text-sky-300">Zone (1)</strong> → Clear (0)
                      </span>
                    </div>

                    {filteredItems.length === 0 ? (
                      <div className="text-center py-8 text-xs font-mono text-slate-400">
                        No boulders match this filter.
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2">
                        {filteredItems.map(item => {
                          const { boulder, compNum, myStatus, myPoints } = item;
                          const handleCycle = () => {
                            if (myStatus === 'untried') {
                              handleToggleScore(boulder, 'flashed');
                            } else if (myStatus === 'flashed') {
                              handleToggleScore(boulder, 'sent');
                            } else if (myStatus === 'sent') {
                              handleToggleScore(boulder, 'attempted');
                            } else {
                              handleToggleScore(boulder, 'attempted'); // toggles off to 0
                            }
                          };

                          return (
                            <button
                              key={boulder.id}
                              type="button"
                              onClick={handleCycle}
                              className={`p-2.5 rounded-xl border font-mono flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                                myPoints === 3
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                                  : myPoints === 2
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                                  : myPoints === 1
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <span className="text-xs font-black text-white">#{compNum}</span>
                              <span className="text-[11px] font-black">
                                {myPoints === 3
                                  ? '⚡ 3pt'
                                  : myPoints === 2
                                  ? '✓ 2pt'
                                  : myPoints === 1
                                  ? '◐ 1pt'
                                  : '0pt'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* LAYOUT 3: HEAD-TO-HEAD CREW COMPARISON MATRIX (#1 to #25) */}
                {sheetLayout === 'matrix' && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-mono text-slate-400">
                      Tap any climber cell to cycle score: <strong className="text-amber-300">⚡ 3</strong> →{' '}
                      <strong className="text-emerald-300">✓ 2</strong> →{' '}
                      <strong className="text-sky-300">◐ 1</strong> → Clear
                    </div>
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-8 text-xs font-mono text-slate-400">
                        No boulders match this filter.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                              <th className="py-2 px-2">Boulder</th>
                              {climbers.map(c => (
                                <th key={c.id} className="py-2 px-2 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <ClimberAvatar profile={c} size="xs" />
                                    <span className="font-sans font-bold text-white text-[11px]">
                                      {c.display_name}
                                    </span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {filteredItems.map(item => (
                              <tr key={item.boulder.id} className="hover:bg-slate-950/40">
                                <td className="py-2 px-2 font-black text-white">
                                  <button
                                    type="button"
                                    onClick={() => onSelectBoulder?.(item.boulder)}
                                    className="hover:text-amber-400 transition-colors"
                                  >
                                    #{item.compNum}
                                  </button>
                                </td>
                                {item.crewScores.map(cs => {
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
                                        onClick={handleCellCycle}
                                        className="w-full py-1 rounded-lg hover:bg-slate-800/60 transition-colors active:scale-95"
                                        title={`Cycle score for ${cs.climber.display_name} on #${item.compNum}`}
                                      >
                                        {cs.points === 3 ? (
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[11px]">
                                            ⚡ 3
                                          </span>
                                        ) : cs.points === 2 ? (
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[11px]">
                                            ✓ 2
                                          </span>
                                        ) : cs.points === 1 ? (
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-black text-[11px]">
                                            ◐ 1
                                          </span>
                                        ) : (
                                          <span className="text-slate-600 hover:text-slate-400">–</span>
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
