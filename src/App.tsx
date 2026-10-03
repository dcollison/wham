import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useGym } from './context/GymContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { BoulderCard } from './components/boulders/BoulderCard';
import { QuickLogModal } from './components/boulders/QuickLogModal';
import { AddBoulderModal } from './components/boulders/AddBoulderModal';
import { BulkAddBouldersModal } from './components/boulders/BulkAddBouldersModal';
import { BoulderDetailModal } from './components/boulders/BoulderDetailModal';
import { AreaResetModal } from './components/boulders/AreaResetModal';
import { StatsDashboard } from './components/stats/StatsDashboard';
import { CompLeaderboard } from './components/leaderboard/CompLeaderboard';
import { CompLeaderboardModal } from './components/leaderboard/CompLeaderboardModal';
import { GymCompBanner } from './components/boulders/GymCompBanner';
import { CompWallBanner } from './components/boulders/CompWallBanner';
import { CrewFeedView } from './components/feed/CrewFeedView';
import { CircleView } from './components/settings/CircleView';
import { AreaPhotoBanner } from './components/boulders/AreaPhotoBanner';
import { BoulderFilters, BoulderFiltersState } from './components/boulders/BoulderFilters';
import { ClimberAvatar } from './components/ClimberAvatar';
import { Boulder, Attempt, BoulderReview, GRADES } from './types';
import { Plus, Compass, Sparkles, Filter, RotateCcw, Layers, Zap, ChevronRight, Clock } from 'lucide-react';
import { WhamLogo, WhamBadge } from './components/WhamLogo';
import { PasscodeGate } from './components/PasscodeGate';
import { STORAGE_KEYS, getStorageString, setStorageString } from './lib/storage';
import { getAreaResetInfo } from './lib/resetStatus';
import { calcBoulderReviewSummary, BoulderReviewSummary } from './lib/reviews';

const EMPTY_ATTEMPTS: Attempt[] = [];

export function App() {
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.PASSCODE_UNLOCKED) === 'true';
  });

  const handleLockApp = () => {
    localStorage.removeItem(STORAGE_KEYS.PASSCODE_UNLOCKED);
    setIsPasscodeUnlocked(false);
  };
  const {
    currentUser,
    climbers,
    isDemoMode,
    switchClimber,
    updateDisplayName,
    updateAccentColor,
    updateAvatarIcon,
    updateClimber,
    addClimber,
    removeClimber
  } = useAuth();

  const {
    gyms,
    currentGym,
    setCurrentGym,
    areas,
    currentArea,
    setCurrentArea,
    boulders,
    attempts,
    comments,
    featureRequests,
    hideSent,
    setHideSent,
    showArchived,
    setShowArchived,
    logAttempt,
    deleteAttempt,
    addBoulder,
    bulkAddBoulders,
    archiveBoulder,
    updateBoulder,
    deleteBoulder,
    moveBoulder,
    archiveAreaBoulders,
    updateAreaPhoto,
    removeAreaPhoto,
    addComment,
    deleteComment,
    toggleAreaCompWall,
    orderedActiveBouldersInCurrentArea,
    reviews,
    loading
  } = useGym();

  const activeColor = currentUser?.accent_color || '#3B82F6';

  // Hash-based routing for 100% static hosting on GitHub Pages
  const [currentTab, setCurrentTab] = useState<'boulders' | 'beta' | 'comp' | 'stats' | 'settings'>('boulders');
  const [settingsInitialTab, setSettingsInitialTab] = useState<'crew' | 'backups' | 'storage' | 'ideas'>('crew');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('leaderboard') || hash.includes('comp') || hash.includes('standings')) {
        setCurrentTab('comp');
      } else if (hash.includes('stats') || hash.includes('analytics')) {
        setCurrentTab('stats');
      } else if (
        hash.includes('beta') ||
        hash.includes('feed') ||
        hash.includes('sends') ||
        hash.includes('activity') ||
        hash.includes('discussion') ||
        hash.includes('comments')
      ) {
        setCurrentTab('beta');
      } else if (hash.includes('ideas') || hash.includes('features') || hash.includes('roadmap') || hash.includes('requests')) {
        setSettingsInitialTab('ideas');
        setCurrentTab('settings');
      } else if (hash.includes('backup') || hash.includes('restore')) {
        setSettingsInitialTab('backups');
        setCurrentTab('settings');
      } else if (hash.includes('storage') || hash.includes('photos')) {
        setSettingsInitialTab('storage');
        setCurrentTab('settings');
      } else if (hash.includes('settings')) {
        setSettingsInitialTab('crew');
        setCurrentTab('settings');
      } else {
        setCurrentTab('boulders');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Modals state
  const [quickLogBoulder, setQuickLogBoulder] = useState<Boulder | null>(null);
  const [quickLogTargetUserId, setQuickLogTargetUserId] = useState<string | undefined>(undefined);
  const [detailBoulder, setDetailBoulder] = useState<Boulder | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);

  const handleOpenQuickLog = useCallback((boulder: Boulder, targetUserId?: string) => {
    setQuickLogBoulder(boulder);
    setQuickLogTargetUserId(targetUserId || currentUser?.id);
  }, [currentUser?.id]);

  const handleOpenDetails = useCallback((boulder: Boulder) => {
    setDetailBoulder(boulder);
  }, []);

  // Track last viewed feed time for unread comments notification badge
  const [lastViewedFeedTime, setLastViewedFeedTime] = useState<string>(() => {
    const saved = getStorageString(STORAGE_KEYS.LAST_VIEWED_FEED, '');
    if (!saved) {
      const now = new Date().toISOString();
      setStorageString(STORAGE_KEYS.LAST_VIEWED_FEED, now);
      return now;
    }
    return saved;
  });

  // When visiting Crew Feed (tab 2 'beta'), mark all current comments as read
  useEffect(() => {
    if (currentTab === 'beta') {
      const now = new Date().toISOString();
      setLastViewedFeedTime(now);
      setStorageString(STORAGE_KEYS.LAST_VIEWED_FEED, now);
    }
  }, [currentTab]);

  const unreadFeedCommentsCount = useMemo(() => {
    if (!lastViewedFeedTime) return 0;
    const lastTimestamp = new Date(lastViewedFeedTime).getTime();
    return comments.filter(
      (c) => new Date(c.created_at).getTime() > lastTimestamp && c.user_id !== currentUser?.id
    ).length;
  }, [comments, lastViewedFeedTime, currentUser?.id]);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState<boolean>(false);
  const [isAreaResetOpen, setIsAreaResetOpen] = useState<boolean>(false);
  const [hasChosenClimber, setHasChosenClimber] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('wham_active_profile_id'));
  });

  // Boulder filters state (Grade Range, Status, Hold Colour, Climber, Sort)
  const [boulderFilters, setBoulderFilters] = useState<BoulderFiltersState>(() => {
    const savedUserId = localStorage.getItem('wham_active_profile_id') || currentUser?.id || '';
    return {
      minGrade: null,
      maxGrade: null,
      statusFilter: hideSent ? 'unsent' : 'all',
      selectedColour: null,
      targetClimberId: savedUserId,
      sortBy: 'position'
    };
  });

  // Track the previous user ID so we know when currentUser changes
  const prevUserIdRef = React.useRef<string | undefined>(currentUser?.id);

  // Sync targetClimberId with currentUser when active profile changes
  useEffect(() => {
    if (currentUser?.id) {
      setBoulderFilters((prev) => {
        // If targetClimberId was empty or was following the previous active user, follow new currentUser.id
        if (!prev.targetClimberId || prev.targetClimberId === prevUserIdRef.current) {
          return { ...prev, targetClimberId: currentUser.id };
        }
        return prev;
      });
      prevUserIdRef.current = currentUser.id;
    }
  }, [currentUser?.id]);

  // Sync statusFilter when hideSent is toggled from Header
  useEffect(() => {
    if (hideSent) {
      setBoulderFilters((prev) => (prev.statusFilter === 'unsent' ? prev : { ...prev, statusFilter: 'unsent' }));
    } else {
      setBoulderFilters((prev) => (prev.statusFilter === 'unsent' ? { ...prev, statusFilter: 'all' } : prev));
    }
  }, [hideSent]);

  const handleUpdateFilters = (updater: (prev: BoulderFiltersState) => BoulderFiltersState) => {
    setBoulderFilters((prev) => {
      const next = updater(prev);
      if (next.statusFilter === 'unsent' && !hideSent) {
        setHideSent(true);
      } else if (next.statusFilter !== 'unsent' && hideSent) {
        setHideSent(false);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setHideSent(false);
    setBoulderFilters({
      minGrade: null,
      maxGrade: null,
      statusFilter: 'all',
      selectedColour: null,
      targetClimberId: currentUser?.id || localStorage.getItem('wham_active_profile_id') || '',
      sortBy: 'position'
    });
  };

  // Compute available colours and counts for current area
  const { availableColours, colourCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    const coloursSet = new Set<string>();

    orderedActiveBouldersInCurrentArea.forEach((b) => {
      counts[b.hold_colour] = (counts[b.hold_colour] || 0) + 1;
      coloursSet.add(b.hold_colour);
    });

    const sortedColours = Array.from(coloursSet).sort();
    return { availableColours: sortedColours, colourCounts: counts };
  }, [orderedActiveBouldersInCurrentArea]);

  // Filter and sort climbs based on BoulderFiltersState
  const visibleBoulders = useMemo(() => {
    const targetId = boulderFilters.targetClimberId || currentUser?.id;

    // 1. Filter
    const filtered = orderedActiveBouldersInCurrentArea.filter((boulder) => {
      // Grade filtering
      const boulderGradeIdx = GRADES.indexOf(boulder.grade);
      if (boulderFilters.minGrade) {
        const minIdx = GRADES.indexOf(boulderFilters.minGrade);
        if (boulderGradeIdx < minIdx) return false;
      }
      if (boulderFilters.maxGrade) {
        const maxIdx = GRADES.indexOf(boulderFilters.maxGrade);
        if (boulderGradeIdx > maxIdx) return false;
      }

      // Status filtering (Done / Not Done / Projecting / Untouched)
      if (boulderFilters.statusFilter !== 'all') {
        const userAttempt = attempts.find(
          (a) => a.boulder_id === boulder.id && a.user_id === targetId
        );
        const isCompleted = userAttempt && (userAttempt.status === 'flashed' || userAttempt.status === 'sent');
        const isProject = userAttempt && userAttempt.status === 'attempted';

        if (boulderFilters.statusFilter === 'unsent') {
          // Boulders target climber hasn't done yet (not sent and not flashed)
          if (isCompleted) return false;
        } else if (boulderFilters.statusFilter === 'sent') {
          // Only boulders target climber has sent or flashed
          if (!isCompleted) return false;
        } else if (boulderFilters.statusFilter === 'projecting') {
          // Only boulders target climber has attempted without sending
          if (!isProject) return false;
        } else if (boulderFilters.statusFilter === 'untouched') {
          // Completely unattempted by target climber
          if (userAttempt) return false;
        }
      }

      // Hold Colour filtering
      if (boulderFilters.selectedColour) {
        if (boulder.hold_colour.toLowerCase() !== boulderFilters.selectedColour.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort
    if (boulderFilters.sortBy === 'position') {
      // Keep natural wall flow order
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (boulderFilters.sortBy === 'grade-asc') {
        return GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade);
      }
      if (boulderFilters.sortBy === 'grade-desc') {
        return GRADES.indexOf(b.grade) - GRADES.indexOf(a.grade);
      }
      if (boulderFilters.sortBy === 'most-sent' || boulderFilters.sortBy === 'least-sent') {
        const aSends = attempts.filter((att) => att.boulder_id === a.id && (att.status === 'sent' || att.status === 'flashed')).length;
        const bSends = attempts.filter((att) => att.boulder_id === b.id && (att.status === 'sent' || att.status === 'flashed')).length;
        return boulderFilters.sortBy === 'most-sent' ? bSends - aSends : aSends - bSends;
      }
      return 0;
    });
  }, [orderedActiveBouldersInCurrentArea, boulderFilters, currentUser, attempts]);

  // Latest crew send ticker for quick notification banner
  const latestSendInfo = useMemo(() => {
    const sends = attempts.filter((a) => a.status === 'sent' || a.status === 'flashed');
    if (sends.length === 0) return null;
    const sorted = [...sends].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
    const latest = sorted[0];
    const boulder = boulders.find((b) => b.id === latest.boulder_id);
    const climber = climbers.find((c) => c.id === latest.user_id) || latest.profile;
    if (!boulder || !climber) return null;
    return {
      attempt: latest,
      boulder,
      climber
    };
  }, [attempts, boulders, climbers]);

  // Pre-index attempts by boulder ID for O(1) card lookups
  const attemptsByBoulder = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    for (const a of attempts) {
      const list = map.get(a.boulder_id);
      if (list) {
        list.push(a);
      } else {
        map.set(a.boulder_id, [a]);
      }
    }
    return map;
  }, [attempts]);

  // Pre-index comment counts by boulder ID for O(1) card lookups
  const commentCountsByBoulder = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comments) {
      map.set(c.boulder_id, (map.get(c.boulder_id) || 0) + 1);
    }
    return map;
  }, [comments]);

  // Pre-calculate review summaries by boulder ID once
  const reviewSummariesByBoulder = useMemo(() => {
    const grouped = new Map<string, BoulderReview[]>();
    for (const r of reviews) {
      const list = grouped.get(r.boulder_id);
      if (list) {
        list.push(r);
      } else {
        grouped.set(r.boulder_id, [r]);
      }
    }
    const summaryMap = new Map<string, BoulderReviewSummary>();
    for (const [bId, revs] of grouped) {
      summaryMap.set(bId, calcBoulderReviewSummary(revs));
    }
    return summaryMap;
  }, [reviews]);

  // Sector reset info map for All Areas view
  const areaResetInfoMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAreaResetInfo>>();
    for (const a of areas) {
      map.set(a.id, getAreaResetInfo(a.id, boulders));
    }
    return map;
  }, [areas, boulders]);

  // Pre-calculate count of visible boulders per area for header counts
  const areaCountsByAreaId = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of visibleBoulders) {
      map.set(b.area_id, (map.get(b.area_id) || 0) + 1);
    }
    return map;
  }, [visibleBoulders]);

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  // Private crew access passcode gate (PIN 2338)
  if (!isPasscodeUnlocked) {
    return <PasscodeGate onUnlock={() => setIsPasscodeUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      {/* Subtle climbing gym chalk micro-grain texture overlay */}
      <div className="chalk-grain-overlay" aria-hidden="true" />

      {/* Persistent Header */}
      <Header
        currentTab={currentTab}
        currentGym={currentGym}
        gyms={gyms}
        onSelectGym={setCurrentGym}
        currentArea={currentArea}
        areas={areas}
        onSelectArea={setCurrentArea}
        currentUser={currentUser}
        climbers={climbers}
        boulders={boulders}
        onOpenProfileSwitcher={() => {
          setSettingsInitialTab('crew');
          window.location.hash = '#/settings';
          setCurrentTab('settings');
        }}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenAddBoulder={() => setIsAddModalOpen(true)}
        onOpenBulkAdd={() => setIsBulkAddOpen(true)}
        onOpenAreaReset={() => {
          if (!currentArea) {
            alert('To archive an entire wall, please select a specific Area tab first.');
            return;
          }
          setIsAreaResetOpen(true);
        }}
        onOpenBackups={() => {
          setSettingsInitialTab('backups');
          window.location.hash = '#/backup';
          setCurrentTab('settings');
        }}
        onOpenIdeas={() => {
          setSettingsInitialTab('ideas');
          window.location.hash = '#/ideas';
          setCurrentTab('settings');
        }}
        openIdeasCount={featureRequests.filter((r) => r.status !== 'shipped').length}
        showArchived={showArchived}
        onToggleShowArchived={() => setShowArchived((prev) => !prev)}
        onToggleAreaCompWall={toggleAreaCompWall}
        isDemoMode={isDemoMode}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 sm:pb-28 flex flex-col gap-6 sm:gap-8">
        {/* TAB 1: Clockwise Boulders View */}
        {currentTab === 'boulders' && (() => {
          const currentAreaResetInfo = currentArea ? getAreaResetInfo(currentArea.id, boulders) : null;
          return (
          <div className="flex flex-col gap-6 sm:gap-7 animate-in fade-in duration-200">
            {/* Area Header & Info */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{currentArea?.name || `${currentGym?.name || 'Gym'} • All Areas`}</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-2 flex-wrap mt-0.5">
                  <span>
                    {orderedActiveBouldersInCurrentArea.length}{' '}
                    {orderedActiveBouldersInCurrentArea.length === 1 ? 'boulder' : 'boulders'} •{' '}
                    {currentArea ? 'Clockwise wall sequence' : 'All wall sectors'}
                  </span>
                  {currentAreaResetInfo?.isDueForReset && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-full"
                      title={`Wall set ${currentAreaResetInfo.weeksOld} weeks ago – sector is due for a reset`}
                    >
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Reset soon ({currentAreaResetInfo.weeksOld}w old)</span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Area Wall Overview Photo */}
            {currentArea && (
              <AreaPhotoBanner
                currentArea={currentArea}
                activeBouldersCount={orderedActiveBouldersInCurrentArea.length}
                activeColor={activeColor}
                resetInfo={currentAreaResetInfo}
                onUploadPhoto={async (file, dataUrl) => {
                  if (currentArea) await updateAreaPhoto(currentArea.id, file, dataUrl);
                }}
                onRemovePhoto={async () => {
                  if (currentArea) await removeAreaPhoto(currentArea.id);
                }}
              />
            )}

            {/* Comp Wall Mini Comp Banner (Active when current sector is designated a Comp Wall) */}
            {currentArea?.is_comp_wall && orderedActiveBouldersInCurrentArea.length > 0 && (
              <CompWallBanner
                area={currentArea}
                compBoulders={orderedActiveBouldersInCurrentArea}
                attempts={attempts}
                climbers={climbers}
                currentUserId={currentUser?.id}
                onQuickLog={(b, targetUserId) => handleOpenQuickLog(b, targetUserId)}
                onOpenDetails={(b) => setDetailBoulder(b)}
              />
            )}

            {/* Compact Boulder Filters: Search Bar & Single Filters Icon */}
            <BoulderFilters
              filters={boulderFilters}
              onUpdateFilters={handleUpdateFilters}
              onResetFilters={handleResetFilters}
              availableColours={availableColours}
              colourCounts={colourCounts}
              climbers={climbers}
              currentUserId={currentUser?.id}
              totalBouldersCount={orderedActiveBouldersInCurrentArea.length}
              filteredBouldersCount={visibleBoulders.length}
            />

            {/* Boulders List */}
            {visibleBoulders.length > 0 ? (
              <div className="flex flex-col gap-4 sm:gap-5">
                {!currentArea ? (
                  // Group with sticky sector headers when viewing All Areas
                  (() => {
                    let lastAreaId: string | null = null;
                    return visibleBoulders.map((boulder) => {
                      const isNewArea = boulder.area_id !== lastAreaId;
                      lastAreaId = boulder.area_id;
                      const boulderArea = areaMap.get(boulder.area_id);
                      const areaBouldersCount = areaCountsByAreaId.get(boulder.area_id) || 0;
                      const sectorResetInfo = isNewArea && boulderArea ? areaResetInfoMap.get(boulderArea.id) : null;

                      return (
                        <React.Fragment key={boulder.id}>
                          {isNewArea && (
                            <div className="sticky top-[92px] sm:top-[96px] z-20 -mx-1 px-4 py-2.5 bg-carbon/95 backdrop-blur-md border-y border-white/[0.08] rounded-2xl my-2 flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
                                <span className="text-xs font-bold font-heading text-slate-200 uppercase tracking-wider">
                                  {boulderArea?.name || 'Wall Sector'}
                                </span>
                                {sectorResetInfo?.isDueForReset && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-full"
                                    title={`Wall set ${sectorResetInfo.weeksOld} weeks ago – reset soon`}
                                  >
                                    <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                    <span>Reset soon ({sectorResetInfo.weeksOld}w)</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono font-medium text-slate-300 bg-surface px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                                {areaBouldersCount} {areaBouldersCount === 1 ? 'climb' : 'climbs'}
                              </span>
                            </div>
                          )}
                          <BoulderCard
                            boulder={boulder}
                            attempts={attemptsByBoulder.get(boulder.id) || EMPTY_ATTEMPTS}
                            climbers={climbers}
                            currentUserId={currentUser?.id}
                            commentCount={commentCountsByBoulder.get(boulder.id) || 0}
                            reviewSummary={reviewSummariesByBoulder.get(boulder.id)}
                            areaName={boulderArea?.name}
                            onQuickLog={handleOpenQuickLog}
                            onOpenDetails={handleOpenDetails}
                            onLogAttempt={logAttempt}
                          />
                        </React.Fragment>
                      );
                    });
                  })()
                ) : (
                  visibleBoulders.map((boulder) => (
                    <BoulderCard
                      key={boulder.id}
                      boulder={boulder}
                      attempts={attemptsByBoulder.get(boulder.id) || EMPTY_ATTEMPTS}
                      climbers={climbers}
                      currentUserId={currentUser?.id}
                      commentCount={commentCountsByBoulder.get(boulder.id) || 0}
                      reviewSummary={reviewSummariesByBoulder.get(boulder.id)}
                      onQuickLog={handleOpenQuickLog}
                      onOpenDetails={handleOpenDetails}
                      onLogAttempt={logAttempt}
                    />
                  ))
                )}
              </div>
            ) : orderedActiveBouldersInCurrentArea.length > 0 ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-surface border border-slate-800/80 rounded-3xl text-center gap-3 my-4">
                <div className="p-3 bg-slate-800 rounded-2xl" style={{ color: activeColor }}>
                  <Filter className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    No matching boulders found
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    No climbs matched your filter criteria. Try adjusting your grade range or switching status to "All".
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{ backgroundColor: activeColor }}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black active-press shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center gap-3 my-6">
                <div className="p-3 bg-slate-800 rounded-2xl" style={{ color: activeColor }}>
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    No climbs here yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Be the first to log a new problem in this sector.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    style={{ backgroundColor: activeColor }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-black active-press shadow"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add Single Climb</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkAddOpen(true)}
                    style={{ color: activeColor, borderColor: `${activeColor}50` }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border active-press shadow"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Bulk Log Wall Set</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* TAB 2: Crew Feed (Recent Sends & Beta Spray) */}
        {currentTab === 'beta' && (
          <CrewFeedView
            comments={comments}
            attempts={attempts}
            boulders={boulders}
            climbers={climbers}
            gyms={gyms}
            areas={areas}
            currentUserId={currentUser?.id}
            onSelectBoulder={(b) => setDetailBoulder(b)}
            onQuickLog={(b, targetUserId) => handleOpenQuickLog(b, targetUserId)}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
          />
        )}

        {/* TAB 3: Comp Leaderboard & Standings */}
        {currentTab === 'comp' && (
          <CompLeaderboard
            boulders={boulders}
            attempts={attempts}
            climbers={climbers}
            gyms={gyms}
            initialGymId={currentGym?.id || 'all'}
            currentUserId={currentUser?.id}
            onSelectBoulder={(b) => setDetailBoulder(b)}
            showGymSelector={true}
          />
        )}

        {/* TAB 4: Analytics & Stats Dashboard */}
        {currentTab === 'stats' && (
          <StatsDashboard
            boulders={boulders}
            attempts={attempts}
            climbers={climbers}
            gyms={gyms}
            areas={areas}
            currentUserId={currentUser?.id}
            onSelectBoulder={(b) => setDetailBoulder(b)}
            reviews={reviews}
          />
        )}

        {/* TAB 4: The Circle Page View */}
        {currentTab === 'settings' && (
          <CircleView
            currentUser={currentUser}
            climbers={climbers}
            onSwitchClimber={switchClimber}
            onUpdateDisplayName={updateDisplayName}
            onUpdateAccentColor={updateAccentColor}
            onUpdateAvatarIcon={updateAvatarIcon}
            onUpdateClimber={updateClimber}
            onAddClimber={addClimber}
            onRemoveClimber={removeClimber}
            onLockApp={handleLockApp}
            initialTab={settingsInitialTab}
          />
        )}
      </main>

      {/* Floating Action Modals */}

      {/* Quick Log Modal */}
      <QuickLogModal
        boulder={quickLogBoulder}
        isOpen={Boolean(quickLogBoulder)}
        onClose={() => {
          setQuickLogBoulder(null);
          setQuickLogTargetUserId(undefined);
        }}
        onSave={logAttempt}
        onDelete={deleteAttempt}
        climbers={climbers}
        currentUserId={currentUser?.id}
        initialTargetUserId={quickLogTargetUserId}
        attempts={attempts}
        filteredBoulders={visibleBoulders}
        areas={areas}
        areaName={areas.find((a) => a.id === quickLogBoulder?.area_id)?.name}
        onNavigateBoulder={(next) => setQuickLogBoulder(next)}
        onOpenDetails={(b) => {
          setQuickLogBoulder(null);
          setQuickLogTargetUserId(undefined);
          setDetailBoulder(b);
        }}
      />

      {/* Boulder Detail & Beta Modal */}
      <BoulderDetailModal
        boulder={detailBoulder ? boulders.find((b) => b.id === detailBoulder.id) || detailBoulder : null}
        isOpen={Boolean(detailBoulder)}
        onClose={() => setDetailBoulder(null)}
        attempts={detailBoulder ? attempts.filter((a) => a.boulder_id === detailBoulder.id) : []}
        comments={detailBoulder ? comments.filter((c) => c.boulder_id === detailBoulder.id) : []}
        climbers={climbers}
        currentUserId={currentUser?.id}
        areas={areas}
        areaName={areas.find((a) => a.id === detailBoulder?.area_id)?.name}
        gymName={gyms.find((g) => g.id === detailBoulder?.gym_id)?.name}
        onQuickLog={(b, targetUserId) => handleOpenQuickLog(b, targetUserId)}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
        onToggleArchive={archiveBoulder}
        onUpdateBoulder={updateBoulder}
        onDeleteBoulder={deleteBoulder}
        onMoveBoulder={moveBoulder}
        filteredBoulders={visibleBoulders}
        onNavigateBoulder={(next) => setDetailBoulder(next)}
      />

      {/* Add Boulder Modal (with Adjacent Placement) */}
      <AddBoulderModal
        key="add-boulder-modal"
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        gymId={currentGym?.id || gyms[0]?.id || ''}
        areaId={currentArea?.id || null}
        areaName={currentArea?.name || `${currentGym?.name || 'Gym'} • All Areas`}
        areas={areas}
        existingBoulders={boulders.filter(b => b.gym_id === (currentGym?.id || gyms[0]?.id || ''))}
        onSwitchToBulk={() => setIsBulkAddOpen(true)}
        onAdd={async (p) => {
          await addBoulder(p);
        }}
      />

      {/* Bulk Add Boulders Modal (for wall resets or initial gym logging) */}
      <BulkAddBouldersModal
        key="bulk-add-boulders-modal"
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        gymId={currentGym?.id || gyms[0]?.id || ''}
        areaId={currentArea?.id || null}
        areaName={currentArea?.name || `${currentGym?.name || 'Gym'} • All Areas`}
        areas={areas}
        existingBoulders={boulders.filter(b => b.gym_id === (currentGym?.id || gyms[0]?.id || ''))}
        onBulkAdd={async (p) => {
          await bulkAddBoulders(p);
        }}
        onSwitchToSingle={() => {
          setIsBulkAddOpen(false);
          setIsAddModalOpen(true);
        }}
      />

      {/* Area Bulk Reset Confirmation Modal */}
      <AreaResetModal
        isOpen={isAreaResetOpen}
        onClose={() => setIsAreaResetOpen(false)}
        areaName={currentArea?.name || 'Current Area'}
        activeCount={orderedActiveBouldersInCurrentArea.length}
        resetInfo={currentArea ? getAreaResetInfo(currentArea.id, boulders) : null}
        onConfirm={async () => {
          if (currentArea) {
            await archiveAreaBoulders(currentArea.id);
          }
        }}
        onConfirmAndBulkAdd={async () => {
          if (currentArea) {
            await archiveAreaBoulders(currentArea.id);
            setIsBulkAddOpen(true);
          }
        }}
      />

      {/* Gym Comp Leaderboard Modal */}
      <CompLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        boulders={boulders}
        attempts={attempts}
        climbers={climbers}
        gyms={gyms}
        currentGymId={currentGym?.id}
        currentUserId={currentUser?.id}
        onSelectBoulder={(b) => setDetailBoulder(b)}
        onNavigateToStats={() => {
          setCurrentTab('comp');
          window.location.hash = '#/comp';
        }}
      />

      {/* First-time Welcome Climber Selection Modal */}
      {!hasChosenClimber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5 text-center">
            <WhamBadge size="lg" badgeColor={activeColor} logoColor="#000000" />
            <div>
              <h2 className="text-xl font-black text-white">Welcome to Wham!</h2>
              <p className="text-xs text-slate-400 mt-1">Who is climbing today? Select your profile:</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {climbers.map((climber) => (
                <button
                  key={climber.id}
                  type="button"
                  onClick={() => {
                    switchClimber(climber.id);
                    setHasChosenClimber(true);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 flex flex-col items-center gap-2 transition-all active-press group"
                >
                  <ClimberAvatar profile={climber} size="xl" />
                  <span className="font-bold text-sm text-slate-200 group-hover:text-white">
                    {climber.display_name}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setHasChosenClimber(true);
                window.location.hash = '#/settings';
                setCurrentTab('settings');
              }}
              className="text-xs text-slate-400 hover:text-white font-bold hover:underline pt-1 transition-colors"
            >
              + Add a new climber
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sticky Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        unreadCommentsCount={unreadFeedCommentsCount}
      />
    </div>
  );
}
