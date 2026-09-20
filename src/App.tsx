import React, { useState, useEffect, useMemo } from 'react';
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
import { CrewFeedView } from './components/feed/CrewFeedView';
import { SettingsModal } from './components/settings/SettingsModal';
import { BoulderFilters, BoulderFiltersState } from './components/boulders/BoulderFilters';
import { ClimberAvatar } from './components/ClimberAvatar';
import { Boulder, GRADES } from './types';
import { Plus, Compass, Sparkles, Filter, RotateCcw, Layers, Zap, ChevronRight } from 'lucide-react';

export function App() {
  const {
    currentUser,
    climbers,
    isDemoMode,
    switchClimber,
    updateDisplayName,
    updateAccentColor,
    updateAvatarIcon,
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
    hideSent,
    setHideSent,
    showArchived,
    setShowArchived,
    logAttempt,
    deleteAttempt,
    addBoulder,
    bulkAddBoulders,
    archiveBoulder,
    archiveAreaBoulders,
    addComment,
    orderedActiveBouldersInCurrentArea,
    loading
  } = useGym();

  // Hash-based routing for 100% static hosting on GitHub Pages
  const [currentTab, setCurrentTab] = useState<'boulders' | 'beta' | 'stats' | 'settings'>('boulders');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('stats')) {
        setCurrentTab('stats');
      } else if (hash.includes('beta') || hash.includes('feed') || hash.includes('sends') || hash.includes('activity')) {
        setCurrentTab('beta');
      } else if (hash.includes('settings')) {
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

  const handleOpenQuickLog = (boulder: Boulder, targetUserId?: string) => {
    setQuickLogBoulder(boulder);
    setQuickLogTargetUserId(targetUserId || currentUser?.id);
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState<boolean>(false);
  const [isAreaResetOpen, setIsAreaResetOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [hasChosenClimber, setHasChosenClimber] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('wham_active_profile_id'));
  });

  // Boulder filters state (Grade Range, Status, Hold Colour, Climber, Search, Sort)
  const [boulderFilters, setBoulderFilters] = useState<BoulderFiltersState>(() => ({
    minGrade: null,
    maxGrade: null,
    statusFilter: hideSent ? 'unsent' : 'all',
    selectedColour: null,
    targetClimberId: currentUser?.id || '',
    searchQuery: '',
    sortBy: 'position'
  }));

  // Sync targetClimberId with currentUser when available
  useEffect(() => {
    if (currentUser?.id) {
      setBoulderFilters((prev) => {
        if (!prev.targetClimberId) {
          return { ...prev, targetClimberId: currentUser.id };
        }
        return prev;
      });
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
      targetClimberId: currentUser?.id || '',
      searchQuery: '',
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

      // Search Query
      if (boulderFilters.searchQuery.trim()) {
        const q = boulderFilters.searchQuery.toLowerCase().trim();
        const matchesNotes = boulder.notes?.toLowerCase().includes(q) || false;
        const matchesColour = boulder.hold_colour.toLowerCase().includes(q);
        const matchesGrade = boulder.grade.toLowerCase().includes(q);
        if (!matchesNotes && !matchesColour && !matchesGrade) return false;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
        onOpenProfileSwitcher={() => setIsSettingsOpen(true)}
        onOpenAddBoulder={() => setIsAddModalOpen(true)}
        onOpenBulkAdd={() => setIsBulkAddOpen(true)}
        onOpenAreaReset={() => {
          if (!currentArea) {
            alert('To archive an entire wall, please select a specific Area tab first.');
            return;
          }
          setIsAreaResetOpen(true);
        }}
        hideSent={hideSent}
        onToggleHideSent={() => setHideSent((prev) => !prev)}
        showArchived={showArchived}
        onToggleShowArchived={() => setShowArchived((prev) => !prev)}
        isDemoMode={isDemoMode}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-5 flex flex-col">
        {/* TAB 1: Clockwise Boulders View */}
        {currentTab === 'boulders' && (
          <div className="flex flex-col gap-4 pb-20 animate-in fade-in duration-200">
            {/* Area Header & Info Banner */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{currentArea?.name || `${currentGym?.name || 'Gym'} • All Areas`}</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  {orderedActiveBouldersInCurrentArea.length}{' '}
                  {orderedActiveBouldersInCurrentArea.length === 1 ? 'boulder' : 'boulders'} •{' '}
                  {currentArea ? 'Clockwise wall sequence' : 'All wall sectors'}
                </p>
              </div>
            </div>

            {/* Quick Live Send Ticker Banner */}
            {latestSendInfo && (
              <div
                onClick={() => {
                  window.location.hash = '#/feed';
                  setCurrentTab('beta');
                }}
                className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/25 hover:border-amber-500/50 cursor-pointer active-press transition-all shadow-sm group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-lg bg-amber-400/20 text-amber-400 shrink-0">
                    <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  </div>
                  <div className="text-xs truncate">
                    <span className="font-semibold text-slate-400">Latest Crew Send: </span>
                    <strong className="text-amber-400 font-bold">{latestSendInfo.climber.display_name}</strong>
                    <span className="text-slate-300"> {latestSendInfo.attempt.status === 'flashed' ? 'flashed' : 'topped'} </span>
                    <span className="text-white font-bold">{latestSendInfo.boulder.hold_colour} {latestSendInfo.boulder.grade}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform pl-2">
                  <span>Feed</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Boulder Filters: Grade Range, Status, Hold Colour, Search */}
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
              <div className="flex flex-col gap-3">
                {visibleBoulders.map((boulder) => {
                  const boulderAttempts = attempts.filter((a) => a.boulder_id === boulder.id);
                  const boulderComments = comments.filter((c) => c.boulder_id === boulder.id);
                  const boulderArea = areas.find((a) => a.id === boulder.area_id);

                  return (
                    <BoulderCard
                      key={boulder.id}
                      boulder={boulder}
                      attempts={boulderAttempts}
                      climbers={climbers}
                      currentUserId={currentUser?.id}
                      commentCount={boulderComments.length}
                      areaName={!currentArea ? boulderArea?.name : undefined}
                      onQuickLog={(b, targetUserId) => handleOpenQuickLog(b, targetUserId)}
                      onOpenDetails={(b) => setDetailBoulder(b)}
                    />
                  );
                })}
              </div>
            ) : orderedActiveBouldersInCurrentArea.length > 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center gap-3 my-4">
                <div className="p-3 bg-slate-800 text-amber-400 rounded-2xl">
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
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black active-press shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center gap-3 my-6">
                <div className="p-3 bg-slate-800 text-amber-400 rounded-2xl">
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
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black active-press shadow"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add Single Climb</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkAddOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 active-press shadow"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Bulk Log Wall Set</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
          />
        )}

        {/* TAB 3: Analytics & Stats Dashboard */}
        {currentTab === 'stats' && (
          <StatsDashboard
            boulders={boulders}
            attempts={attempts}
            climbers={climbers}
            gyms={gyms}
            areas={areas}
            currentUserId={currentUser?.id}
          />
        )}

        {/* TAB 4: The Circle & Settings View */}
        {currentTab === 'settings' && (
          <div className="flex flex-col gap-4 pb-20 animate-in fade-in duration-200">
            <h2 className="text-lg font-bold text-white">The Circle & Account</h2>
            <SettingsModal
              isOpen={true}
              onClose={() => {
                window.location.hash = '#/boulders';
                setCurrentTab('boulders');
              }}
              currentUser={currentUser}
              climbers={climbers}
              onSwitchClimber={switchClimber}
              onUpdateDisplayName={updateDisplayName}
              onUpdateAccentColor={updateAccentColor}
              onUpdateAvatarIcon={updateAvatarIcon}
              onAddClimber={addClimber}
              onRemoveClimber={removeClimber}
            />
          </div>
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
      />

      {/* Boulder Detail & Beta Modal */}
      <BoulderDetailModal
        boulder={detailBoulder}
        isOpen={Boolean(detailBoulder)}
        onClose={() => setDetailBoulder(null)}
        attempts={detailBoulder ? attempts.filter((a) => a.boulder_id === detailBoulder.id) : []}
        comments={detailBoulder ? comments.filter((c) => c.boulder_id === detailBoulder.id) : []}
        climbers={climbers}
        currentUserId={currentUser?.id}
        onQuickLog={(b, targetUserId) => handleOpenQuickLog(b, targetUserId)}
        onAddComment={addComment}
        onToggleArchive={archiveBoulder}
      />

      {/* Add Boulder Modal (with Adjacent Placement) */}
      <AddBoulderModal
        key={`${currentGym?.id || 'gym'}-${currentArea?.id || 'all'}-${isAddModalOpen ? 'open' : 'closed'}`}
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
        key={`bulk-${currentGym?.id || 'gym'}-${currentArea?.id || 'all'}-${isBulkAddOpen ? 'open' : 'closed'}`}
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

      {/* Profile Switcher & Settings Modal (from Header avatar) */}
      <SettingsModal
        isOpen={isSettingsOpen && currentTab !== 'settings'}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        climbers={climbers}
        onSwitchClimber={switchClimber}
        onUpdateDisplayName={updateDisplayName}
        onUpdateAccentColor={updateAccentColor}
        onUpdateAvatarIcon={updateAvatarIcon}
        onAddClimber={addClimber}
        onRemoveClimber={removeClimber}
      />

      {/* First-time Welcome Climber Selection Modal */}
      {!hasChosenClimber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-400/20">
              ⚡
            </div>
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
                  className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-amber-400 hover:text-black border border-slate-700/80 flex flex-col items-center gap-2 transition-all active-press group"
                >
                  <ClimberAvatar profile={climber} size="xl" />
                  <span className="font-bold text-sm text-slate-200 group-hover:text-black">
                    {climber.display_name}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setHasChosenClimber(true);
                setIsSettingsOpen(true);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline pt-1"
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
        unreadCommentsCount={comments.length}
      />
    </div>
  );
}
