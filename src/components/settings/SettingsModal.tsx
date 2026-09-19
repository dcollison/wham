import React, { useState, useEffect } from 'react';
import { Profile } from '../../types';
import { Users, UserPlus, X, Check, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  climbers: Profile[];
  onSwitchClimber: (profileId: string) => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onAddClimber: (name: string) => Promise<Profile>;
  onRemoveClimber?: (profileId: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  climbers,
  onSwitchClimber,
  onUpdateDisplayName,
  onAddClimber,
  onRemoveClimber
}) => {
  const [displayName, setDisplayName] = useState<string>(currentUser?.display_name || '');
  const [isAddingClimber, setIsAddingClimber] = useState<boolean>(false);
  const [newClimberName, setNewClimberName] = useState<string>('');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Sync displayName when active climber changes
  useEffect(() => {
    if (currentUser?.display_name) {
      setDisplayName(currentUser.display_name);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    await onUpdateDisplayName(displayName.trim());
    setSavedStatus('Name updated!');
    setTimeout(() => setSavedStatus(null), 2000);
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
      await onAddClimber(trimmed);
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
              <p className="text-xs text-slate-400">Manage crew members and active climber</p>
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
              return (
                <div
                  key={climber.id}
                  className="relative group"
                >
                  <button
                    type="button"
                    onClick={() => onSwitchClimber(climber.id)}
                    className={`w-full p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all active-press ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {climber.avatar_url ? (
                      <img
                        src={climber.avatar_url}
                        alt={climber.display_name}
                        className="w-9 h-9 rounded-full border border-slate-600"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-400 text-black font-black flex items-center justify-center text-sm">
                        {climber.display_name.charAt(0)}
                      </div>
                    )}
                    <span className="font-bold text-xs truncate max-w-full">
                      {climber.display_name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/20 px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </button>

                  {/* Remove Climber Button (for custom added climbers when not the only climber) */}
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
          </form>
        )}

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
          💡 <strong>Tip:</strong> Tap any climber above to instantly log climbs and track individual stats on this device. New crew members are automatically included in team stats and Beta comments.
        </div>
      </div>
    </div>
  );
};
