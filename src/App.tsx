import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { useGym } from './context/GymContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { BoulderCard } from './components/boulders/BoulderCard';
import { QuickLogModal } from './components/boulders/QuickLogModal';
import { AddBoulderModal } from './components/boulders/AddBoulderModal';
import { BoulderDetailModal } from './components/boulders/BoulderDetailModal';
import { AreaResetModal } from './components/boulders/AreaResetModal';
import { StatsDashboard } from './components/stats/StatsDashboard';
import { BetaDiscussionView } from './components/beta/BetaDiscussionView';
import { SettingsModal } from './components/settings/SettingsModal';
import { Boulder } from './types';
import { Plus, Compass, Sparkles, Filter } from 'lucide-react';

export function App() {
  const {
    currentUser,
    climbers,
    isDemoMode,
    switchClimber,
    updateDisplayName,
    signInWithOtp,
    signInWithOAuth,
    signOut
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
    archiveBoulder,
    archiveAreaBoulders,
    addComment,
    orderedActiveBouldersInCurrentArea,
    loading
  } = useGym();

  // Hash-based routing for 100% static hosting on GitHub Pages
  const [currentTab, setCurrentTab] = useState<'ticklist' | 'beta' | 'stats' | 'settings'>('ticklist');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('stats')) {
        setCurrentTab('stats');
      } else if (hash.includes('beta')) {
        setCurrentTab('beta');
      } else if (hash.includes('settings')) {
        setCurrentTab('settings');
      } else {
        setCurrentTab('ticklist');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Modals state
  const [quickLogBoulder, setQuickLogBoulder] = useState<Boulder | null>(null);
  const [detailBoulder, setDetailBoulder] = useState<Boulder | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAreaResetOpen, setIsAreaResetOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [hasChosenClimber, setHasChosenClimber] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('wham_active_profile_id'));
  });

  // Filter climbs by "Hide Sent" if enabled
  const visibleBoulders = useMemo(() => {
    if (!hideSent || !currentUser) {
      return orderedActiveBouldersInCurrentArea;
    }

    return orderedActiveBouldersInCurrentArea.filter((boulder) => {
      const userAttempt = attempts.find(
        (a) => a.boulder_id === boulder.id && a.user_id === currentUser.id
      );
      // Hide if already flashed or sent
      return !(userAttempt && (userAttempt.status === 'flashed' || userAttempt.status === 'sent'));
    });
  }, [orderedActiveBouldersInCurrentArea, hideSent, currentUser, attempts]);

  // Existing attempt for quick log modal
  const activeBoulderAttempt = useMemo(() => {
    if (!quickLogBoulder || !currentUser) return undefined;
    return attempts.find(
      (a) => a.boulder_id === quickLogBoulder.id && a.user_id === currentUser.id
    );
  }, [quickLogBoulder, currentUser, attempts]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Persistent Header */}
      <Header
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
        {/* TAB 1: Clockwise Ticklist View */}
        {currentTab === 'ticklist' && (
          <div className="flex flex-col gap-4 pb-20 animate-in fade-in duration-200">
            {/* Area Header & Info Banner */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{currentArea?.name || `${currentGym?.name || 'Gym'} • All Areas`}</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  {visibleBoulders.length} {visibleBoulders.length === 1 ? 'boulder' : 'boulders'} • {currentArea ? 'Clockwise flow' : 'All wall sectors'}
                </p>
              </div>

              {hideSent && (
                <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <Filter className="w-3 h-3" />
                  <span>"Needs Sending" filtered</span>
                </div>
              )}
            </div>

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
                      onQuickLog={(b) => setQuickLogBoulder(b)}
                      onOpenDetails={(b) => setDetailBoulder(b)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center gap-3 my-6">
                <div className="p-3 bg-slate-800 text-amber-400 rounded-2xl">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    {hideSent ? 'All Active Problems Sent!' : 'No climbs here yet'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    {hideSent
                      ? 'You crushed everything in this area! Disable "Hide Sent" to review them.'
                      : 'Be the first to log a new problem in this sector.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black active-press shadow"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add First Problem</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Beta Discussion Feed */}
        {currentTab === 'beta' && (
          <BetaDiscussionView
            comments={comments}
            boulders={boulders}
            climbers={climbers}
            gyms={gyms}
            areas={areas}
            currentUserId={currentUser?.id}
            onSelectBoulder={(b) => setDetailBoulder(b)}
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
            onSwitchClimber={switchClimber}
          />
        )}

        {/* TAB 4: The Circle & Settings View */}
        {currentTab === 'settings' && (
          <div className="flex flex-col gap-4 pb-20 animate-in fade-in duration-200">
            <h2 className="text-lg font-bold text-white">The Circle & Account</h2>
            <SettingsModal
              isOpen={true}
              onClose={() => {
                window.location.hash = '#/gyms';
                setCurrentTab('ticklist');
              }}
              currentUser={currentUser}
              climbers={climbers}
              onSwitchClimber={switchClimber}
              onUpdateDisplayName={updateDisplayName}
              onSignInWithOtp={signInWithOtp}
              onSignInWithOAuth={signInWithOAuth}
              onSignOut={signOut}
              isDemoMode={isDemoMode}
            />
          </div>
        )}
      </main>

      {/* Floating Action Modals */}

      {/* Quick Log Modal */}
      <QuickLogModal
        boulder={quickLogBoulder}
        existingAttempt={activeBoulderAttempt}
        isOpen={Boolean(quickLogBoulder)}
        onClose={() => setQuickLogBoulder(null)}
        onSave={logAttempt}
        onDelete={deleteAttempt}
        climberName={currentUser?.display_name || 'Climber'}
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
        onQuickLog={(b) => setQuickLogBoulder(b)}
        onAddComment={addComment}
        onToggleArchive={archiveBoulder}
      />

      {/* Add Boulder Modal (with Adjacent Placement) */}
      <AddBoulderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        gymId={currentGym?.id || gyms[0]?.id || ''}
        areaId={currentArea?.id || null}
        areaName={currentArea?.name || `${currentGym?.name || 'Gym'} • All Areas`}
        areas={areas}
        existingBoulders={boulders}
        onAdd={async (p) => {
          await addBoulder(p);
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
      />

      {/* Profile Switcher & Settings Modal (from Header avatar) */}
      <SettingsModal
        isOpen={isSettingsOpen && currentTab !== 'settings'}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        climbers={climbers}
        onSwitchClimber={switchClimber}
        onUpdateDisplayName={updateDisplayName}
        onSignInWithOtp={signInWithOtp}
        onSignInWithOAuth={signInWithOAuth}
        onSignOut={signOut}
        isDemoMode={isDemoMode}
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
                  {climber.avatar_url ? (
                    <img
                      src={climber.avatar_url}
                      alt={climber.display_name}
                      className="w-10 h-10 rounded-full border border-slate-600 group-hover:border-black"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-400 text-black font-black flex items-center justify-center text-sm">
                      {climber.display_name.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold text-sm text-slate-200 group-hover:text-black">
                    {climber.display_name}
                  </span>
                </button>
              ))}
            </div>
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
