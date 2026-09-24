import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../../types';
import {
  Users,
  X,
  Check,
  ShieldCheck,
  HardDrive,
  Lightbulb
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
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
    featureRequests,
    submitFeatureRequest,
    updateFeatureStatus,
    toggleFeatureUpvote,
    deleteFeatureRequest,
    restoreBackupData,
    createManualSnapshot,
    restoreSnapshotById,
    getSnapshotsList
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
    if (isOpen) {
      setSnapshots(getSnapshotsList());
      if (currentUser?.id) {
        setSelectedClimberId(currentUser.id);
      }
    }
  }, [isOpen, currentUser]);

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

  const handleCreateSnapshot = () => {
    createManualSnapshot();
    setSnapshots(getSnapshotsList());
    showSuccess('Safety snapshot created!');
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface border border-slate-700/80 rounded-t-[32px] sm:rounded-4xl p-5 sm:p-6 sheet-elevated flex flex-col gap-4 max-h-[90vh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto sm:hidden -mt-1 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2.5 rounded-2xl"
              style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Settings & The Circle</h2>
              <p className="text-xs text-slate-400">Manage crew profiles, safety backups, and storage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-950/80 rounded-full border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('crew')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-full text-xs font-bold transition-all active-press ${
              activeTab === 'crew'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Crew</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ideas')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-full text-xs font-bold transition-all active-press relative ${
              activeTab === 'ideas'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Ideas</span>
            {featureRequests.filter((r) => r.status !== 'shipped').length > 0 && (
              <span className="hidden sm:inline text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/20 text-amber-300 font-bold">
                {featureRequests.filter((r) => r.status !== 'shipped').length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-full text-xs font-bold transition-all active-press ${
              activeTab === 'backups'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Backups</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-full text-xs font-bold transition-all active-press ${
              activeTab === 'storage'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Storage</span>
          </button>
        </div>

        {/* Status Toasts */}
        {savedStatus && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{savedStatus}</span>
          </div>
        )}
        {errorStatus && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in">
            {errorStatus}
          </div>
        )}

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
            snapshots={snapshots}
            onExportBackup={handleExportBackup}
            onRestoreSnapshot={handleRestoreSnapshot}
            onCreateSnapshot={handleCreateSnapshot}
            onFileSelected={handleFileSelected}
            fileInputRef={fileInputRef}
          />
        )}

        {/* TAB 4: PHOTO STORAGE MANAGER */}
        {activeTab === 'storage' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-150">
            <PhotoStorageManager boulders={boulders} activeColor={activeColor} />
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
