import React, { useState, useEffect } from 'react';
import { Profile, CLIMBER_ACCENT_PALETTE, CLIMBER_ICONS, getClimberColor } from '../../types';
import { ClimberAvatar, CLIMBER_ICON_COMPONENTS } from '../ClimberAvatar';
import {
  UserPlus,
  Trash2,
  Palette,
  Smile,
  Lock,
  Check,
  Loader2
} from 'lucide-react';

interface CrewSettingsTabProps {
  currentUser: Profile | null;
  climbers: Profile[];
  selectedClimber: Profile;
  onSelectClimber: (climberId: string) => void;
  onSwitchClimber: (profileId: string) => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onUpdateAccentColor: (accentColor: string) => Promise<void>;
  onUpdateAvatarIcon: (avatarIcon: string) => Promise<void>;
  onUpdateClimber?: (profileId: string, updates: { display_name?: string; accent_color?: string; avatar_icon?: string }) => Promise<void>;
  onAddClimber: (name: string, avatarUrl?: string, accentColor?: string, avatarIcon?: string) => Promise<Profile>;
  onRemoveClimber?: (profileId: string) => Promise<void>;
  onLockApp?: () => void;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export const CrewSettingsTab: React.FC<CrewSettingsTabProps> = ({
  currentUser,
  climbers,
  selectedClimber,
  onSelectClimber,
  onSwitchClimber,
  onUpdateDisplayName,
  onUpdateAccentColor,
  onUpdateAvatarIcon,
  onUpdateClimber,
  onAddClimber,
  onRemoveClimber,
  onLockApp,
  onShowSuccess,
  onShowError
}) => {
  const activeColor = selectedClimber?.accent_color || currentUser?.accent_color || '#F59E0B';
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
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [updatingColorHex, setUpdatingColorHex] = useState<string | null>(null);
  const [updatingIconId, setUpdatingIconId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClimber?.display_name) {
      setDisplayName(selectedClimber.display_name);
    }
  }, [selectedClimber]);

  useEffect(() => {
    if (isAddingClimber) {
      const existingColors = new Set(climbers.map((c) => c.accent_color?.toLowerCase()).filter(Boolean));
      const nextColor =
        CLIMBER_ACCENT_PALETTE.find((c) => !existingColors.has(c.hex.toLowerCase()))?.hex || '#32A378';
      setNewClimberColor(nextColor);
    }
  }, [isAddingClimber, climbers]);

  const selectedPreset = CLIMBER_ACCENT_PALETTE.find(
    (c) => c.hex.toLowerCase() === activeColor.toLowerCase()
  );

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !selectedClimber || isSavingName) return;
    setIsSavingName(true);
    try {
      if (onUpdateClimber) {
        await onUpdateClimber(selectedClimber.id, { display_name: displayName.trim() });
      } else if (selectedClimber.id === currentUser?.id) {
        await onUpdateDisplayName(displayName.trim());
      }
      onShowSuccess(`Name updated for ${displayName.trim()}`);
    } catch {
      onShowError('Failed to update display name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSelectColor = async (colorHex: string) => {
    if (!selectedClimber || updatingColorHex) return;
    setUpdatingColorHex(colorHex);
    try {
      if (onUpdateClimber) {
        await onUpdateClimber(selectedClimber.id, { accent_color: colorHex });
      } else if (selectedClimber.id === currentUser?.id) {
        await onUpdateAccentColor(colorHex);
      }
      onShowSuccess('Accent colour updated');
    } catch {
      onShowError('Failed to update accent color');
    } finally {
      setUpdatingColorHex(null);
    }
  };

  const handleSelectIcon = async (iconId: string) => {
    if (!selectedClimber || updatingIconId) return;
    setUpdatingIconId(iconId);
    try {
      if (onUpdateClimber) {
        await onUpdateClimber(selectedClimber.id, { avatar_icon: iconId });
      } else if (selectedClimber.id === currentUser?.id) {
        await onUpdateAvatarIcon(iconId);
      }
      onShowSuccess('Icon updated');
    } catch {
      onShowError('Failed to update avatar icon');
    } finally {
      setUpdatingIconId(null);
    }
  };

  const handleCreateClimber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClimberName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await onAddClimber(
        newClimberName.trim(),
        `icon:${newClimberIcon}`,
        newClimberColor,
        newClimberIcon
      );
      setNewClimberName('');
      setIsAddingClimber(false);
      onSelectClimber(created.id);
      onShowSuccess(`Welcome to the crew, ${created.display_name}`);
    } catch {
      onShowError('Failed to add climber');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-150">
      {/* Climber Profiles Grid */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="ds-label tabular-nums">
            The Crew ({climbers.length})
          </label>
          {!isAddingClimber && (
            <button
              type="button"
              onClick={() => setIsAddingClimber(true)}
              style={{ color: activeColor }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full hover:brightness-125 transition-all active-press"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Climber</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {climbers.map((climber) => {
            const isActive = currentUser?.id === climber.id;
            const isSelectedForEdit = selectedClimber?.id === climber.id;
            const climberColor = getClimberColor(climber);
            const isRemoving = removingId === climber.id;
            return (
              <div key={climber.id} className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    onSelectClimber(climber.id);
                    onSwitchClimber(climber.id);
                  }}
                  style={
                    isSelectedForEdit
                      ? {
                          borderColor: climberColor.hex,
                          backgroundColor: `${climberColor.hex}16`
                        }
                      : undefined
                  }
                  className={`w-full p-3.5 rounded-lg border flex flex-col items-center gap-2 transition-colors active-press ${
                    isSelectedForEdit
                      ? ''
                      : 'bg-surface-elevated border-white/[0.08] text-slate-300 hover:border-white/[0.16]'
                  }`}
                >
                  <ClimberAvatar profile={climber} size="lg" showBorderRing={isSelectedForEdit} />

                  <div className="flex flex-col items-center min-w-0 w-full">
                    <span className="font-bold text-xs truncate max-w-full text-slate-100">
                      {climber.display_name}
                    </span>
                    {isActive && (
                      <span
                        className="text-[11px] font-semibold mt-0.5"
                        style={{ color: climberColor.hex }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                </button>

                {/* Remove Climber Button */}
                {onRemoveClimber && climbers.length > 1 && !isActive && (
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm(`Remove ${climber.display_name} from the crew?`)) {
                        setRemovingId(climber.id);
                        try {
                          await onRemoveClimber(climber.id);
                        } finally {
                          setRemovingId(null);
                        }
                      }
                    }}
                    aria-label={`Remove ${climber.display_name}`}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-carbon border border-white/[0.12] text-slate-400 hover:text-rose-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:opacity-60"
                    title={`Remove ${climber.display_name}`}
                  >
                    {isRemoving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            );
          })}

          {/* Quick "Add Climber" Tile in Grid */}
          {!isAddingClimber && (
            <button
              type="button"
              onClick={() => setIsAddingClimber(true)}
              className="p-3.5 rounded-lg border border-dashed border-white/[0.16] hover:border-white/[0.3] bg-surface-elevated/40 hover:bg-surface-elevated text-slate-400 hover:text-slate-200 flex flex-col items-center justify-center gap-1.5 transition-colors active-press"
            >
              <div className="w-10 h-10 rounded-full border border-dashed border-white/[0.2] flex items-center justify-center text-slate-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Add New</span>
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
          className="p-4 rounded-lg border flex flex-col gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" style={{ color: activeColor }} />
              <span>Add Crew Member</span>
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
              placeholder="Climber name..."
              autoFocus
              className="ds-input flex-1 rounded-md text-xs"
            />
            <button
              type="submit"
              disabled={isCreating || !newClimberName.trim()}
              style={{ backgroundColor: activeColor, color: '#000000' }}
              className="px-4 py-2.5 rounded-md font-bold text-xs flex items-center gap-1.5 active-press transition-colors shrink-0 disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>{isCreating ? 'Adding…' : 'Add'}</span>
            </button>
          </div>

          {/* Accent Color picker for new climber */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="ds-label">
              Accent Colour
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CLIMBER_ACCENT_PALETTE.map((pal) => (
                <button
                  key={pal.hex}
                  type="button"
                  onClick={() => setNewClimberColor(pal.hex)}
                  className={`w-6 h-6 rounded-full transition-transform active:scale-95 flex items-center justify-center ${
                    newClimberColor.toLowerCase() === pal.hex.toLowerCase()
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                      : 'ring-1 ring-white/15 hover:ring-white/40'
                  }`}
                  style={{ backgroundColor: pal.hex }}
                  title={pal.name}
                  aria-label={pal.name}
                >
                  {newClimberColor.toLowerCase() === pal.hex.toLowerCase() && (
                    <Check className="w-3 h-3 text-black stroke-[2.5]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Climber Icon picker for new climber */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="ds-label">
              Climber Icon
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
                    className={`w-7 h-7 rounded-md transition-transform active:scale-95 flex items-center justify-center ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-surface text-black'
                        : 'bg-surface-elevated border border-white/[0.1] text-slate-300 hover:text-white'
                    }`}
                    style={isSelected ? { backgroundColor: newClimberColor } : undefined}
                    title={iconOpt.name}
                    aria-label={iconOpt.name}
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
      <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 shrink-0" style={{ color: activeColor }} />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {selectedClimber?.display_name} Profile
          </h3>
        </div>

        {/* Live Preview Card */}
        <div className="p-3.5 rounded-lg bg-carbon border border-white/[0.07] flex items-center justify-between gap-3">
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
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-carbon"
                style={{ backgroundColor: activeColor }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white truncate">
                  {selectedClimber?.display_name}
                </span>
                {selectedClimber?.id !== currentUser?.id && (
                  <button
                    type="button"
                    onClick={() => onSwitchClimber(selectedClimber.id)}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-surface-high hover:bg-surface-higher text-slate-200 border border-white/[0.08] transition-colors"
                  >
                    Switch Active
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {selectedPreset ? selectedPreset.name : 'Custom Colour'} ·{' '}
                {CLIMBER_ICONS.find((i) => i.id === activeIcon)?.name || 'Icon'}
              </p>
            </div>
          </div>
        </div>

        {/* Accent Colour Palette */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="ds-label">
            Accent Colour
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {CLIMBER_ACCENT_PALETTE.map((palette) => {
              const isSelected = activeColor.toLowerCase() === palette.hex.toLowerCase();
              const isSavingThisColor = updatingColorHex === palette.hex;
              return (
                <button
                  key={palette.hex}
                  type="button"
                  disabled={Boolean(updatingColorHex)}
                  onClick={() => handleSelectColor(palette.hex)}
                  className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-colors active-press disabled:opacity-60 ${
                    isSelected
                      ? 'bg-surface-high text-white'
                      : 'bg-carbon border-white/[0.07] text-slate-300 hover:border-white/[0.16]'
                  }`}
                  style={isSelected ? { borderColor: palette.hex } : undefined}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: palette.hex }}
                  >
                    {isSavingThisColor ? (
                      <Loader2 className="w-2.5 h-2.5 text-black animate-spin" />
                    ) : isSelected ? (
                      <Check className="w-2.5 h-2.5 text-black stroke-[2.5]" />
                    ) : null}
                  </span>
                  <span className="truncate text-[11px]">{palette.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Climber Icon Customization */}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5" style={{ color: activeColor }} />
            <label className="ds-label">
              Climber Icon
            </label>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {CLIMBER_ICONS.map((iconOpt) => {
              const IconComp = CLIMBER_ICON_COMPONENTS[iconOpt.id];
              const isSelected = activeIcon === iconOpt.id;
              const isSavingThisIcon = updatingIconId === iconOpt.id;
              if (!IconComp) return null;
              return (
                <button
                  key={iconOpt.id}
                  type="button"
                  disabled={Boolean(updatingIconId)}
                  onClick={() => handleSelectIcon(iconOpt.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-colors active-press disabled:opacity-60 ${
                    isSelected
                      ? 'bg-surface-high text-white'
                      : 'bg-carbon border-white/[0.07] text-slate-300 hover:border-white/[0.16]'
                  }`}
                  style={isSelected ? { borderColor: activeColor } : undefined}
                >
                  <span
                    className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-black"
                    style={{ backgroundColor: activeColor }}
                  >
                    {isSavingThisIcon ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <IconComp className="w-3 h-3 stroke-[2.5]" />
                    )}
                  </span>
                  <span className="truncate text-[11px]">{iconOpt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Display Name Edit for Selected Climber */}
        <form onSubmit={handleUpdateName} className="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
          <label className="ds-label">
            Display Name
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name..."
              className="ds-input flex-1 rounded-lg text-xs"
            />
            <button
              type="submit"
              disabled={isSavingName || !displayName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-bold text-xs bg-surface-high hover:bg-surface-higher text-white active-press transition-colors disabled:opacity-50 shrink-0"
            >
              {isSavingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSavingName ? 'Saving…' : 'Save Name'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Passcode Security & Lock App */}
      {onLockApp && (
        <div className="p-3.5 rounded-lg bg-carbon border border-white/[0.07] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Crew Passcode Lock
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 tabular-nums">Require PIN 2338 next time</span>
          </div>
          <button
            type="button"
            onClick={onLockApp}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-md text-xs font-bold bg-surface-elevated hover:bg-surface-high text-slate-200 border border-white/[0.08] active-press transition-colors shrink-0"
          >
            Lock Now
          </button>
        </div>
      )}
    </div>
  );
};
