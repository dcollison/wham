import React, { useState, useEffect, useRef } from 'react';
import { Profile, CLIMBER_ACCENT_PALETTE, CLIMBER_ICONS, getClimberColor } from '../../types';
import { ClimberAvatar, CLIMBER_ICON_COMPONENTS } from '../ClimberAvatar';
import {
  Users,
  UserPlus,
  X,
  Check,
  Trash2,
  Palette,
  Smile,
  Info,
  Lock,
  Download,
  Upload,
  ShieldCheck,
  History,
  RotateCcw,
  Database,
  HardDrive
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import {
  createBackupPayload,
  downloadBackupFile,
  validateAndParseBackup,
  LocalSnapshotMeta
} from '../../lib/backup';
import { PhotoStorageManager } from './PhotoStorageManager';

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
  initialTab?: 'crew' | 'backups' | 'storage';
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
    restoreBackupData,
    createManualSnapshot,
    restoreSnapshotById,
    getSnapshotsList
  } = useGym();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<LocalSnapshotMeta[]>([]);
  const [activeTab, setActiveTab] = useState<'crew' | 'backups' | 'storage'>(initialTab);

  // Selected climber to customize (defaults to currentUser)
  const [selectedClimberId, setSelectedClimberId] = useState<string>(currentUser?.id || climbers[0]?.id || '');

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

  const selectedClimber = climbers.find((c) => c.id === selectedClimberId) || currentUser || climbers[0];
  const activeColor = selectedClimber?.accent_color || currentUser?.accent_color || '#3B82F6';
  const activeIcon =
    selectedClimber?.avatar_icon ||
    (selectedClimber?.avatar_url?.startsWith('icon:')
      ? selectedClimber.avatar_url.replace('icon:', '')
      : 'zap');

  const [displayName, setDisplayName] = useState<string>(selectedClimber?.display_name || '');
  const [isAddingClimber, setIsAddingClimber] = useState<boolean>(false);
  const [newClimberName, setNewClimberName] = useState<string>('');
  const [newClimberColor, setNewClimberColor] = useState<string>('#32A378');
  const [newClimberIcon, setNewClimberIcon] = useState<string>('zap');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Sync displayName when selected climber changes
  useEffect(() => {
    if (selectedClimber?.display_name) {
      setDisplayName(selectedClimber.display_name);
    }
  }, [selectedClimber]);

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
      setSavedStatus(`Backup exported (${boulders.length} climbs, ${attempts.length} logs)!`);
      setTimeout(() => setSavedStatus(null), 3000);
    } catch (e: any) {
      setErrorStatus(e?.message || 'Failed to export backup');
      setTimeout(() => setErrorStatus(null), 3000);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validateAndParseBackup(text);
      if (!parsed.valid || !parsed.data) {
        setErrorStatus(parsed.error || 'Invalid backup file format');
        setTimeout(() => setErrorStatus(null), 3500);
        return;
      }
      const sum = parsed.summary!;
      const confirmMsg = `Restore backup from ${new Date(sum.exportedAt).toLocaleDateString()}?\n\n• ${sum.boulderCount} climbs\n• ${sum.attemptCount} logs\n• ${sum.climberCount} crew profiles\n\nThis will restore your ticklists and attempts. Continue?`;
      if (window.confirm(confirmMsg)) {
        const res = await restoreBackupData(parsed.data);
        if (res.success) {
          setSavedStatus(res.message);
          setSnapshots(getSnapshotsList());
          setTimeout(() => setSavedStatus(null), 4000);
        } else {
          setErrorStatus(res.message);
          setTimeout(() => setErrorStatus(null), 3500);
        }
      }
    } catch (err: any) {
      setErrorStatus(err?.message || 'Failed to read file');
      setTimeout(() => setErrorStatus(null), 3500);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreSnapshot = async (snapId: string, timestamp: string) => {
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (window.confirm(`Roll back to safety snapshot from ${timeFormatted}? Current state will also be preserved in a safety snapshot.`)) {
      const ok = await restoreSnapshotById(snapId);
      if (ok) {
        setSavedStatus(`Restored safety snapshot from ${timeFormatted}!`);
        setSnapshots(getSnapshotsList());
        setTimeout(() => setSavedStatus(null), 3000);
      } else {
        setErrorStatus('Failed to restore snapshot');
        setTimeout(() => setErrorStatus(null), 3000);
      }
    }
  };

  const handleCreateSnapshot = () => {
    createManualSnapshot();
    setSnapshots(getSnapshotsList());
    setSavedStatus('Safety snapshot created!');
    setTimeout(() => setSavedStatus(null), 2500);
  };

  // Pick an unused default color when opening the Add Climber form
  useEffect(() => {
    if (isAddingClimber) {
      const existingColors = new Set(climbers.map((c) => c.accent_color?.toLowerCase()).filter(Boolean));
      const nextColor =
        CLIMBER_ACCENT_PALETTE.find((c) => !existingColors.has(c.hex.toLowerCase()))?.hex || '#32A378';
      setNewClimberColor(nextColor);
    }
  }, [isAddingClimber, climbers]);

  if (!isOpen) return null;

  const selectedPreset = CLIMBER_ACCENT_PALETTE.find(
    (c) => c.hex.toLowerCase() === activeColor.toLowerCase()
  );

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !selectedClimber) return;
    try {
      if (onUpdateClimber) {
        await onUpdateClimber(selectedClimber.id, { display_name: displayName.trim() });
      } else if (selectedClimber.id === currentUser?.id) {
        await onUpdateDisplayName(displayName.trim());
      }
      setSavedStatus(`Name updated for ${displayName.trim()}!`);
      setTimeout(() => setSavedStatus(null), 2000);
    } catch (err: any) {
      setErrorStatus(err?.message || 'Failed to update name');
      setTimeout(() => setErrorStatus(null), 2500);
    }
  };

  const handleSelectColor = async (colorHex: string) => {
    if (!selectedClimber) return;
    try {
      if (onUpdateClimber) {
        await onUpdateClimber(selectedClimber.id, { accent_color: colorHex });
      } else if (selectedClimber.id === currentUser?.id) {
        await onUpdateAccentColor(colorHex);
      }
      const matched = CLIMBER_ACCENT_PALETTE.find((p) => p.hex.toLowerCase() === colorHex.toLowerCase());
      setSavedStatus(`Accent colour updated for ${selectedClimber.display_name}${matched ? ` to ${matched.name}` : ''}!`);
      setTimeout(() => setSavedStatus(null), 2000);
    } catch (err: any) {
      setErrorStatus(err?.message || 'Failed to update accent colour');
      setTimeout(() => setErrorStatus(null), 2500);
    }
  };

  const handleSelectIcon = async (iconId: string) => {
    if (!selectedClimber) return;
    try {
      if (onUpdateClimber) {
        await onUpdateClimber(selectedClimber.id, { avatar_icon: iconId });
      } else if (selectedClimber.id === currentUser?.id) {
        await onUpdateAvatarIcon(iconId);
      }
      const matched = CLIMBER_ICONS.find((i) => i.id === iconId);
      setSavedStatus(`Icon updated for ${selectedClimber.display_name}${matched ? ` to ${matched.name}` : ''}!`);
      setTimeout(() => setSavedStatus(null), 2000);
    } catch (err: any) {
      setErrorStatus(err?.message || 'Failed to update icon');
      setTimeout(() => setErrorStatus(null), 2500);
    }
  };

  const handleCreateClimber = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClimberName.trim();
    if (!trimmed) {
      setErrorStatus('Please enter a climber name');
      setTimeout(() => setErrorStatus(null), 2500);
      return;
    }

    if (climbers.some((c) => c.display_name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorStatus(`"${trimmed}" already exists in the crew`);
      setTimeout(() => setErrorStatus(null), 2500);
      return;
    }

    try {
      const created = await onAddClimber(trimmed, undefined, newClimberColor, newClimberIcon);
      setNewClimberName('');
      setIsAddingClimber(false);
      setSelectedClimberId(created.id);
      setSavedStatus(`Added ${trimmed} to the crew!`);
      setTimeout(() => setSavedStatus(null), 2500);
    } catch (err: any) {
      setErrorStatus(err?.message || 'Failed to add climber');
      setTimeout(() => setErrorStatus(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: `${activeColor}15`,
                border: `1px solid ${activeColor}30`,
                color: activeColor
              }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Wham Settings</h2>
              <p className="text-xs text-slate-400">Manage crew profiles, data backups & storage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('crew')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'crew'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crew & Profiles</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'backups'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backups</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'storage'
                ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Storage</span>
          </button>
        </div>

        {/* Status Toast */}
        {savedStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{savedStatus}</span>
          </div>
        )}
        {errorStatus && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in">
            {errorStatus}
          </div>
        )}

        {/* TAB 1: CREW & PROFILES */}
        {activeTab === 'crew' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-150">
            {/* Climber Profiles Grid */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  The Crew ({climbers.length})
                </label>
                {!isAddingClimber && (
                  <button
                    type="button"
                    onClick={() => setIsAddingClimber(true)}
                    style={{ color: activeColor }}
                    className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg hover:brightness-125 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add Climber</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {climbers.map((climber) => {
                  const isActive = currentUser?.id === climber.id;
                  const isSelectedForEdit = selectedClimber?.id === climber.id;
                  const climberColor = getClimberColor(climber);
                  return (
                    <div key={climber.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClimberId(climber.id);
                          onSwitchClimber(climber.id);
                        }}
                        style={
                          isSelectedForEdit
                            ? {
                                borderColor: climberColor.hex,
                                backgroundColor: `${climberColor.hex}18`,
                                boxShadow: `0 4px 14px -2px ${climberColor.hex}30`
                              }
                            : undefined
                        }
                        className={`w-full p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all active-press ${
                          isSelectedForEdit
                            ? 'ring-1'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <ClimberAvatar
                          profile={climber}
                          size="lg"
                          showBorderRing={isSelectedForEdit}
                        />

                        <span className="font-bold text-xs truncate max-w-full text-slate-100">
                          {climber.display_name}
                        </span>

                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          {isActive && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                              style={{
                                backgroundColor: `${climberColor.hex}25`,
                                color: climberColor.hex
                              }}
                            >
                              Active
                            </span>
                          )}
                          {isSelectedForEdit && !isActive && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-700 text-slate-200">
                              Editing
                            </span>
                          )}
                          {!isActive && !isSelectedForEdit && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {climberColor.name || climberColor.hex}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Remove Climber Button */}
                      {onRemoveClimber && climbers.length > 1 && !isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove ${climber.display_name} from the crew?`)) {
                              onRemoveClimber(climber.id);
                            }
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={`Remove ${climber.display_name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Quick "+ Add Climber" Tile in Grid */}
                {!isAddingClimber && (
                  <button
                    type="button"
                    onClick={() => setIsAddingClimber(true)}
                    className="p-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all active-press"
                  >
                    <div className="w-9 h-9 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-400">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">+ Add New</span>
                  </button>
                )}
              </div>
            </div>

            {/* Add New Climber Form (when expanded) */}
            {isAddingClimber && (
              <form
                onSubmit={handleCreateClimber}
                style={{
                  backgroundColor: `${activeColor}08`,
                  borderColor: `${activeColor}30`
                }}
                className="p-4 rounded-2xl border flex flex-col gap-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" style={{ color: activeColor }} />
                    <span>Add New Crew Member</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingClimber(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newClimberName}
                    onChange={(e) => setNewClimberName(e.target.value)}
                    placeholder="Enter climber name..."
                    autoFocus
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-slate-500"
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: activeColor, color: '#000000' }}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 active-press transition-colors shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Accent Color picker for new climber */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Accent Colour:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {CLIMBER_ACCENT_PALETTE.map((pal) => (
                      <button
                        key={pal.hex}
                        type="button"
                        onClick={() => setNewClimberColor(pal.hex)}
                        className={`w-6 h-6 rounded-full transition-transform active:scale-95 flex items-center justify-center ${
                          newClimberColor.toLowerCase() === pal.hex.toLowerCase()
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: pal.hex }}
                        title={pal.name}
                      >
                        {newClimberColor.toLowerCase() === pal.hex.toLowerCase() && (
                          <Check className="w-3 h-3 text-black stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Climber Icon picker for new climber */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Climber Icon:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CLIMBER_ICONS.map((iconOpt) => {
                      const IconComp = CLIMBER_ICON_COMPONENTS[iconOpt.id];
                      if (!IconComp) return null;
                      const isSelected = newClimberIcon === iconOpt.id;
                      return (
                        <button
                          key={iconOpt.id}
                          type="button"
                          onClick={() => setNewClimberIcon(iconOpt.id)}
                          className={`w-7 h-7 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                            isSelected
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105 text-black'
                              : 'bg-slate-850 border border-slate-700 text-slate-300 hover:text-white'
                          }`}
                          style={isSelected ? { backgroundColor: newClimberColor } : undefined}
                          title={iconOpt.name}
                        >
                          <IconComp className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}

            {/* Customizing Climber Section */}
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" style={{ color: activeColor }} />
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Customizing: {selectedClimber?.display_name}
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Personalize colours, avatar icons, and chart signatures for {selectedClimber?.display_name}.
                  </p>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <ClimberAvatar
                      profile={selectedClimber}
                      accentColor={activeColor}
                      avatarIcon={activeIcon}
                      size="lg"
                      showBorderRing
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-sm"
                      style={{ backgroundColor: activeColor }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">
                        {selectedClimber?.display_name}
                      </span>
                      {selectedClimber?.id === currentUser?.id ? (
                        <span
                          className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded"
                          style={{ backgroundColor: `${activeColor}25`, color: activeColor }}
                        >
                          Active Account
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSwitchClimber(selectedClimber.id)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        >
                          Switch Active
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {selectedPreset ? selectedPreset.name : 'Curated Colour'} •{' '}
                      {CLIMBER_ICONS.find((i) => i.id === activeIcon)?.name || 'Icon'}
                    </p>
                  </div>
                </div>

                {/* Mini Chart Mockup Preview */}
                <div className="hidden sm:flex flex-col gap-1 items-end shrink-0 pl-2">
                  <span className="text-[10px] text-slate-400 font-mono">Chart Preview</span>
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: '80%', backgroundColor: activeColor }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: activeColor }}>
                    8 Sends (6 flashes)
                  </span>
                </div>
              </div>

              {/* Accent Colour Palette */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Accent Colour:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {CLIMBER_ACCENT_PALETTE.map((palette) => {
                    const isSelected = activeColor.toLowerCase() === palette.hex.toLowerCase();
                    return (
                      <button
                        key={palette.hex}
                        type="button"
                        onClick={() => handleSelectColor(palette.hex)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all active-press ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow-md ring-2 ring-white/60'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                        style={isSelected ? { borderColor: palette.hex } : undefined}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: palette.hex }}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                        </span>
                        <span className="truncate text-[11px]">{palette.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Climber Icon Customization */}
              <div className="flex flex-col gap-1.5 pt-2">
                <div className="flex items-center gap-2">
                  <Smile className="w-3.5 h-3.5" style={{ color: activeColor }} />
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Climber Icon (Avatar Badge):
                  </label>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {CLIMBER_ICONS.map((iconOpt) => {
                    const IconComp = CLIMBER_ICON_COMPONENTS[iconOpt.id];
                    const isSelected = activeIcon === iconOpt.id;
                    if (!IconComp) return null;
                    return (
                      <button
                        key={iconOpt.id}
                        type="button"
                        onClick={() => handleSelectIcon(iconOpt.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all active-press ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow-md ring-2 ring-white/60'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                        style={isSelected ? { borderColor: activeColor } : undefined}
                      >
                        <span
                          className="w-5 h-5 rounded-lg shrink-0 flex items-center justify-center text-black"
                          style={{ backgroundColor: activeColor }}
                        >
                          <IconComp className="w-3 h-3 stroke-[2.5]" />
                        </span>
                        <span className="truncate text-[11px]">{iconOpt.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display Name Edit for Selected Climber */}
              <form onSubmit={handleUpdateName} className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Edit Name ({selectedClimber?.display_name}):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name..."
                    className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-slate-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white active-press transition-colors"
                  >
                    Save Name
                  </button>
                </div>
              </form>
            </div>

            {/* Information Note */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: activeColor }} />
              <span>
                <strong className="text-slate-300">Shared Gym Phone Tip:</strong> Tap any climber above to switch who is actively logging climbs, or update their personal accent colour and icon. Changes are saved instantly and preserved locally on this device.
              </span>
            </div>

            {/* Passcode Security & Lock App */}
            {onLockApp && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Crew Passcode Lock
                  </span>
                  <span className="text-[11px] text-slate-500">Lock app to require PIN 2338 next time</span>
                </div>
                <button
                  type="button"
                  onClick={onLockApp}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active-press transition-colors shrink-0 shadow-sm"
                >
                  Lock Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BACKUPS & SAFETY NET */}
        {activeTab === 'backups' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Data Backup & Safety Net
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Protect your ticklists, sends, and beta notes against accidental deletion.
              </p>
            </div>

            {/* Export & Import Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-between text-left transition-colors active-press group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Export Backup</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {boulders.length} climbs • {attempts.length} logs
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400">Download</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-between text-left transition-colors active-press group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Restore from File</span>
                    <span className="text-[10px] text-slate-400">Import backup .json</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-400">Choose File</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>

            {/* Automatic Rolling Snapshots */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  Recent Safety Snapshots
                </span>
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  + Snapshot Now
                </button>
              </div>

              {snapshots.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No snapshots saved yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {snapshots.slice(0, 4).map((snap, idx) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-slate-200 text-[11px] truncate">
                          {snap.reason || (idx === 0 ? 'Latest Snapshot' : 'Previous Snapshot')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(snap.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • {snap.boulderCount} climbs, {snap.attemptCount} logs
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap.id, snap.timestamp)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 active-press transition-colors shrink-0 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Database Backup & Archive Peace of Mind */}
            <div className="p-3 rounded-xl bg-slate-850/60 border border-slate-800 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
              <Database className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-200 font-bold text-[11px]">Database Peace of Mind:</span>
                <span className="text-[11px]">
                  Climbs in Wham use <strong className="text-slate-300">soft archiving</strong>—resets and deleted sectors are safely archived rather than destroyed. An automatic safety snapshot is also created before any area reset.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PHOTO STORAGE MANAGER */}
        {activeTab === 'storage' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-150">
            <PhotoStorageManager boulders={boulders} activeColor={activeColor} />
          </div>
        )}
      </div>
    </div>
  );
};
