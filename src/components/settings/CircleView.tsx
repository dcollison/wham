import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../../types';
import {
  Users,
  Check,
  ShieldCheck,
  HardDrive,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import {
  createBackupPayload,
  downloadBackupFile,
  validateAndParseBackup,
  LocalSnapshotMeta
} from '../../lib/backup';
import { PhotoStorageManager } from './PhotoStorageManager';
import { CrewSettingsTab } from './CrewSettingsTab';
import { BackupsSettingsTab } from './BackupsSettingsTab';
import { RoadmapTab } from './RoadmapTab';
import { FeatureRequestModal } from './FeatureRequestModal';
import { ClimberAvatar } from '../ClimberAvatar';

interface CircleViewProps {
  currentUser: Profile | null;
  climbers: Profile[];
  onSwitchClimber: (profileId: string) => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onUpdateAccentColor: (accentColor: string) => Promise<void>;
  onUpdateAvatarIcon: (avatarIcon: string) => Promise<void>;
  onUpdateClimber?: (profileId: string, updates: { display_name?: string; accent_color?: string; avatar_icon?: string }) => Promise<void>;
  onAddClimber: (name: string, avatarUrl?: string, accentColor?: string, avatarIcon?: string) => Promise<Profile>;
  onRemoveClimber?: (profileId: string) => Promise<void>;
  onLockApp?: () => void;
  initialTab?: 'crew' | 'backups' | 'storage' | 'ideas';
}

export const CircleView: React.FC<CircleViewProps> = ({
  currentUser,
  climbers,
  onSwitchClimber,
  onUpdateDisplayName,
  onUpdateAccentColor,
  onUpdateAvatarIcon,
  onUpdateClimber,
  onAddClimber,
  onRemoveClimber,
  onLockApp,
  initialTab = 'crew'
}) => {
  const {
    gyms,
    areas,
    boulders,
    attempts,
    comments,
    propsMap,
    reviews,
    featureRequests,
    submitFeatureRequest,
    updateFeatureStatus,
    toggleFeatureUpvote,
    deleteFeatureRequest,
    restoreBackupData,
    createManualSnapshot,
    restoreSnapshotById,
    getSnapshotsList,
    snapshots: gymSnapshots,
    syncSnapshotsToCloud,
    deleteSnapshot
  } = useGym();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<LocalSnapshotMeta[]>([]);
  const [activeTab, setActiveTab] = useState<'crew' | 'backups' | 'storage' | 'ideas'>(initialTab);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState<boolean>(false);
  const [selectedClimberId, setSelectedClimberId] = useState<string>(
    currentUser?.id || climbers[0]?.id || ''
  );
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setSnapshots(getSnapshotsList());
    if (currentUser?.id) {
      setSelectedClimberId(currentUser.id);
    }
  }, [currentUser]);

  const selectedClimber =
    climbers.find((c) => c.id === selectedClimberId) || currentUser || climbers[0];
  const activeColor = selectedClimber?.accent_color || currentUser?.accent_color || '#3B82F6';

  const showSuccess = (msg: string) => {
    setSavedStatus(msg);
    setTimeout(() => setSavedStatus(null), 3000);
  };

  const showError = (msg: string) => {
    setErrorStatus(msg);
    setTimeout(() => setErrorStatus(null), 3500);
  };

  const handleExportBackup = () => {
    try {
      const payload = createBackupPayload({
        gyms,
        areas,
        boulders,
        attempts,
        comments,
        profiles: climbers,
        boulderReviews: reviews,
        propsMap
      });
      downloadBackupFile(payload);
      showSuccess(`Backup exported (${boulders.length} climbs, ${attempts.length} logs)!`);
    } catch (e: any) {
      showError(e?.message || 'Failed to export backup');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validateAndParseBackup(text);
      if (!parsed.valid || !parsed.data) {
        showError(parsed.error || 'Invalid backup file format');
        return;
      }
      const sum = parsed.summary!;
      const confirmMsg = `Restore backup from ${new Date(
        sum.exportedAt
      ).toLocaleDateString()}?\n\n• ${sum.boulderCount} climbs\n• ${sum.attemptCount} logs\n• ${
        sum.climberCount
      } crew profiles\n\nThis will restore your ticklists and attempts. Continue?`;
      if (window.confirm(confirmMsg)) {
        const res = await restoreBackupData(parsed.data);
        if (res.success) {
          showSuccess(res.message);
          setSnapshots(getSnapshotsList());
        } else {
          showError(res.message);
        }
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to read file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreSnapshot = async (snapId: string, timestamp: string) => {
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    if (
      window.confirm(
        `Roll back to safety snapshot from ${timeFormatted}? Current state will also be preserved in a safety snapshot.`
      )
    ) {
      const ok = await restoreSnapshotById(snapId);
      if (ok) {
        showSuccess(`Restored safety snapshot from ${timeFormatted}!`);
        setSnapshots(getSnapshotsList());
      } else {
        showError('Failed to restore snapshot');
      }
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      await createManualSnapshot();
      showSuccess('Safety snapshot saved and synced to cloud!');
    } catch (e: any) {
      showError(e?.message || 'Failed to create snapshot');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/90 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl shrink-0"
            style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
          >
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-heading">The Circle</h1>
              <span
                style={{
                  backgroundColor: `${activeColor}20`,
                  color: activeColor,
                  borderColor: `${activeColor}40`
                }}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
              >
                {climbers.length} Climbers
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Crew profiles, ideas roadmap, backups & gym photo storage
            </p>
          </div>
        </div>

        {/* Current Active Account Indicator */}
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 shrink-0 self-start sm:self-auto">
            <ClimberAvatar profile={currentUser} size="xs" showBorderRing />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-300">Logging as:</span>
              <span className="text-xs font-bold text-white">{currentUser.display_name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Subtab Segmented Switcher */}
      <div className="flex p-1 bg-surface border border-slate-800/80 rounded-full overflow-x-auto no-scrollbar shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('crew')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-bold transition-all active-press shrink-0 flex-1 sm:flex-none ${
            activeTab === 'crew'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>The Crew</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ideas')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-bold transition-all active-press shrink-0 flex-1 sm:flex-none relative ${
            activeTab === 'ideas'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Ideas & Roadmap</span>
          {featureRequests.filter((r) => r.status !== 'shipped').length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/20 text-amber-300 font-bold">
              {featureRequests.filter((r) => r.status !== 'shipped').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backups')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-bold transition-all active-press shrink-0 flex-1 sm:flex-none ${
            activeTab === 'backups'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Backups</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('storage')}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-bold transition-all active-press shrink-0 flex-1 sm:flex-none ${
            activeTab === 'storage'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Storage</span>
        </button>
      </div>

      {/* Status Toasts */}
      {savedStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedStatus}</span>
        </div>
      )}
      {errorStatus && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in">
          {errorStatus}
        </div>
      )}

      {/* Main Content Card Container */}
      <div className="bg-surface/90 border border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-sm surface-elevated">
        {/* TAB 1: CREW & PROFILES */}
        {activeTab === 'crew' && (
          <CrewSettingsTab
            currentUser={currentUser}
            climbers={climbers}
            selectedClimber={selectedClimber}
            onSelectClimber={setSelectedClimberId}
            onSwitchClimber={onSwitchClimber}
            onUpdateDisplayName={onUpdateDisplayName}
            onUpdateAccentColor={onUpdateAccentColor}
            onUpdateAvatarIcon={onUpdateAvatarIcon}
            onUpdateClimber={onUpdateClimber}
            onAddClimber={onAddClimber}
            onRemoveClimber={onRemoveClimber}
            onLockApp={onLockApp}
            onShowSuccess={showSuccess}
            onShowError={showError}
          />
        )}

        {/* TAB 2: IDEAS & ROADMAP */}
        {activeTab === 'ideas' && (
          <RoadmapTab
            featureRequests={featureRequests}
            climbers={climbers}
            currentUser={currentUser}
            activeColor={activeColor}
            onOpenSubmitModal={() => setIsFeatureModalOpen(true)}
            onUpdateStatus={updateFeatureStatus}
            onToggleUpvote={toggleFeatureUpvote}
            onDeleteRequest={deleteFeatureRequest}
            onShowSuccess={showSuccess}
            onShowError={showError}
          />
        )}

        {/* TAB 3: BACKUPS & SAFETY NET */}
        {activeTab === 'backups' && (
          <BackupsSettingsTab
            boulders={boulders}
            attempts={attempts}
            snapshots={gymSnapshots && gymSnapshots.length > 0 ? gymSnapshots : snapshots}
            climbers={climbers}
            onExportBackup={handleExportBackup}
            onRestoreSnapshot={handleRestoreSnapshot}
            onCreateSnapshot={handleCreateSnapshot}
            onSyncToCloud={syncSnapshotsToCloud}
            onDeleteSnapshot={deleteSnapshot}
            onFileSelected={handleFileSelected}
            fileInputRef={fileInputRef}
          />
        )}

        {/* TAB 4: PHOTO STORAGE MANAGER */}
        {activeTab === 'storage' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-150">
            <PhotoStorageManager boulders={boulders} areas={areas} activeColor={activeColor} />
          </div>
        )}
      </div>

      <FeatureRequestModal
        isOpen={isFeatureModalOpen}
        onClose={() => setIsFeatureModalOpen(false)}
        currentUser={currentUser}
        climbers={climbers}
        onSubmit={async (params) => {
          await submitFeatureRequest(params);
          showSuccess('Feature idea posted!');
        }}
      />
    </div>
  );
};
