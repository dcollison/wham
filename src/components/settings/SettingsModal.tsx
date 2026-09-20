import React, { useState, useEffect } from 'react';
import { Profile, CLIMBER_ACCENT_PALETTE, CLIMBER_ICONS, getClimberColor } from '../../types';
import { ClimberAvatar, CLIMBER_ICON_COMPONENTS } from '../ClimberAvatar';
import { Users, UserPlus, X, Check, Trash2, Palette, Sparkles, Smile } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  climbers: Profile[];
  onSwitchClimber: (profileId: string) => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onUpdateAccentColor: (accentColor: string) => Promise<void>;
  onUpdateAvatarIcon: (avatarIcon: string) => Promise<void>;
  onAddClimber: (name: string, avatarUrl?: string, accentColor?: string, avatarIcon?: string) => Promise<Profile>;
  onRemoveClimber?: (profileId: string) => Promise<void>;
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
  onAddClimber,
  onRemoveClimber
}) => {
  const activeColor = currentUser?.accent_color || '#F59E0B';
  const activeIcon =
    currentUser?.avatar_icon ||
    (currentUser?.avatar_url?.startsWith('icon:')
      ? currentUser.avatar_url.replace('icon:', '')
      : 'zap');

  const [displayName, setDisplayName] = useState<string>(currentUser?.display_name || '');
  const [isAddingClimber, setIsAddingClimber] = useState<boolean>(false);
  const [newClimberName, setNewClimberName] = useState<string>('');
  const [newClimberColor, setNewClimberColor] = useState<string>('#10B981');
  const [newClimberIcon, setNewClimberIcon] = useState<string>('zap');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Sync displayName when active climber changes
  useEffect(() => {
    if (currentUser?.display_name) {
      setDisplayName(currentUser.display_name);
    }
  }, [currentUser]);

  // Pick an unused default color when opening the Add Climber form
  useEffect(() => {
    if (isAddingClimber) {
      const existingColors = new Set(climbers.map((c) => c.accent_color?.toLowerCase()).filter(Boolean));
      const nextColor =
        CLIMBER_ACCENT_PALETTE.find((c) => !existingColors.has(c.hex.toLowerCase()))?.hex || '#10B981';
      setNewClimberColor(nextColor);
    }
  }, [isAddingClimber, climbers]);

  if (!isOpen) return null;

  const selectedPreset = CLIMBER_ACCENT_PALETTE.find(
    (c) => c.hex.toLowerCase() === activeColor.toLowerCase()
  );

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    try {
      await onUpdateDisplayName(displayName.trim());
      setSavedStatus('Name updated!');
      setTimeout(() => setSavedStatus(null), 2000);
    } catch (err: any) {
      setErrorStatus(err?.message || 'Failed to update name');
      setTimeout(() => setErrorStatus(null), 2500);
    }
  };

  const handleSelectColor = async (colorHex: string) => {
    try {
      await onUpdateAccentColor(colorHex);
      const matched = CLIMBER_ACCENT_PALETTE.find((p) => p.hex.toLowerCase() === colorHex.toLowerCase());
      setSavedStatus(`Accent colour updated${matched ? ` to ${matched.name}` : ''}!`);
      setTimeout(() => setSavedStatus(null), 2000);
    } catch (err: any) {
      setErrorStatus(err?.message || 'Failed to update accent colour');
      setTimeout(() => setErrorStatus(null), 2500);
    }
  };

  const handleSelectIcon = async (iconId: string) => {
    try {
      await onUpdateAvatarIcon(iconId);
      const matched = CLIMBER_ICONS.find((i) => i.id === iconId);
      setSavedStatus(`Icon updated${matched ? ` to ${matched.name}` : ''}!`);
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

    // Check for duplicate name
    if (climbers.some((c) => c.display_name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorStatus(`"${trimmed}" already exists in the crew`);
      setTimeout(() => setErrorStatus(null), 2500);
      return;
    }

    try {
      await onAddClimber(trimmed, undefined, newClimberColor, newClimberIcon);
      setNewClimberName('');
      setIsAddingClimber(false);
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
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">The Circle & Account</h2>
              <p className="text-xs text-slate-400">Manage crew members, active climber & custom accent colours</p>
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

        {/* Status Toast */}
        {savedStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{savedStatus}</span>
          </div>
        )}
        {errorStatus && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in">
            {errorStatus}
          </div>
        )}

        {/* Climber Profiles Grid */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Climber ({climbers.length})
            </label>
            {!isAddingClimber && (
              <button
                type="button"
                onClick={() => setIsAddingClimber(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 px-2 py-1 rounded-lg hover:bg-amber-400/10 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Climber</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {climbers.map((climber) => {
              const isSelected = currentUser?.id === climber.id;
              const climberColor = getClimberColor(climber);
              return (
                <div key={climber.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => onSwitchClimber(climber.id)}
                    style={
                      isSelected
                        ? {
                            borderColor: climberColor.hex,
                            backgroundColor: `${climberColor.hex}18`,
                            boxShadow: `0 4px 14px -2px ${climberColor.hex}30`
                          }
                        : undefined
                    }
                    className={`w-full p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all active-press ${
                      isSelected
                        ? 'ring-1'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <ClimberAvatar
                      profile={climber}
                      size="lg"
                      showBorderRing={isSelected}
                    />

                    <span className="font-bold text-xs truncate max-w-full text-slate-100">
                      {climber.display_name}
                    </span>

                    {isSelected ? (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: `${climberColor.hex}25`,
                          color: climberColor.hex
                        }}
                      >
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {climberColor.name || climberColor.hex}
                      </span>
                    )}
                  </button>

                  {/* Remove Climber Button */}
                  {onRemoveClimber && climbers.length > 1 && !isSelected && (
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
                className="p-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-400/60 bg-slate-800/30 hover:bg-amber-500/5 text-slate-400 hover:text-amber-300 flex flex-col items-center justify-center gap-1.5 transition-all active-press"
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
            className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-400" />
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
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-black flex items-center gap-1.5 active-press transition-colors shrink-0"
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

        {/* Accent Colour Customization */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: activeColor }} />
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Accent Colour (Charts & Stats)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Choose your personal colour used in comparison charts, timeline graphs, and 1v1 showdowns.
            </p>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <ClimberAvatar
                  profile={currentUser}
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
                  <span className="text-xs font-bold text-white truncate">{currentUser?.display_name}</span>
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded"
                    style={{ backgroundColor: `${activeColor}25`, color: activeColor }}
                  >
                    Active Profile
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {selectedPreset ? selectedPreset.name : 'Curated Colour'} • {CLIMBER_ICONS.find((i) => i.id === activeIcon)?.name || 'Icon'}
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
              <span className="text-[10px] font-mono font-bold" style={{ color: activeColor }}>
                8 Sends (6⚡)
              </span>
            </div>
          </div>

          {/* Preset Swatches Palette */}
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
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4" style={{ color: activeColor }} />
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Climber Icon (Avatar Badge)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Choose your personal badge icon displayed on your avatar and team leaderboards.
            </p>
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

        {/* Display Name Edit for Active Climber */}
        <form onSubmit={handleUpdateName} className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Edit Active Climber Name ({currentUser?.display_name})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name..."
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white active-press transition-colors"
            >
              Save
            </button>
          </div>
        </form>

        {/* Minimal Information Note */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          💡 <strong>Tip:</strong> Tap any climber above to instantly log climbs and track individual stats on this device. Your selected accent colour highlights your progress on comparison charts and timeline graphs.
        </div>
      </div>
    </div>
  );
};
