import React, { useState, useEffect } from 'react';
import { Profile, CLIMBER_ACCENT_PALETTE, CLIMBER_ICONS, getClimberColor } from '../../types';
import { ClimberAvatar, CLIMBER_ICON_COMPONENTS } from '../ClimberAvatar';
import {
  UserPlus,
  Trash2,
  Palette,
  Smile,
  Info,
  Lock,
  Check
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
    if (!displayName.trim() || !selectedClimber) return;
    try {
      if (onUpdateClimber) {
        await onUpdateClimber(selectedClimber.id, { display_name: displayName.trim() });
      } else if (selectedClimber.id === currentUser?.id) {
        await onUpdateDisplayName(displayName.trim());
      }
      onShowSuccess(`Name updated for ${displayName.trim()}!`);
    } catch {
      onShowError('Failed to update display name');
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
      onShowSuccess(`Accent colour updated!`);
    } catch {
      onShowError('Failed to update accent color');
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
      onShowSuccess(`Icon updated!`);
    } catch {
      onShowError('Failed to update avatar icon');
    }
  };

  const handleCreateClimber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClimberName.trim()) return;
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
      onShowSuccess(`Welcome to the crew, ${created.display_name}!`);
    } catch {
      onShowError('Failed to add climber');
    }
  };

  return (
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
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full hover:brightness-125 transition-all active-press"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Climber</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {climbers.map((climber) => {
            const isActive = currentUser?.id === climber.id;
            const isSelectedForEdit = selectedClimber?.id === climber.id;
            const climberColor = getClimberColor(climber);
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
                          backgroundColor: `${climberColor.hex}18`,
                          boxShadow: `0 4px 14px -2px ${climberColor.hex}30`
                        }
                      : undefined
                  }
                  className={`w-full p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all active-press ${
                    isSelectedForEdit
                      ? 'ring-1'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <ClimberAvatar profile={climber} size="lg" showBorderRing={isSelectedForEdit} />

                  <span className="font-bold text-xs truncate max-w-full text-slate-100">
                    {climber.display_name}
                  </span>

                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {isActive && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${climberColor.hex}25`,
                          color: climberColor.hex
                        }}
                      >
                        Active
                      </span>
                    )}
                    {isSelectedForEdit && !isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
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
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="p-3.5 rounded-2xl border border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all active-press"
            >
              <div className="w-10 h-10 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-400">
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
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-full px-4 py-2.5 outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              style={{ backgroundColor: activeColor, color: '#000000' }}
              className="px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 active-press transition-colors shrink-0"
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
                    className={`w-7 h-7 rounded-2xl transition-all active:scale-95 flex items-center justify-center ${
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
                  className={`flex items-center gap-1.5 p-2 rounded-2xl border text-xs font-semibold transition-all active-press ${
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
                  className={`flex items-center gap-2 p-2 rounded-2xl border text-xs font-semibold transition-all active-press ${
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
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-full px-4 py-2.5 outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white active-press transition-colors"
            >
              Save Name
            </button>
          </div>
        </form>
      </div>

      {/* Information Note */}
      <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: activeColor }} />
        <span>
          <strong className="text-slate-300">Shared Gym Phone Tip:</strong> Tap any climber above to switch who is actively logging climbs, or update their personal accent colour and icon. Changes are saved instantly and preserved locally on this device.
        </span>
      </div>

      {/* Passcode Security & Lock App */}
      {onLockApp && (
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
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
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active-press transition-colors shrink-0 shadow-sm"
          >
            Lock Now
          </button>
        </div>
      )}
    </div>
  );
};
