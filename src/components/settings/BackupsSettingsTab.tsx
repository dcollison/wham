import React, { useState } from 'react';
import { ShieldCheck, Download, Upload, History, RotateCcw, Cloud, Smartphone, Trash2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Boulder, Attempt, Profile } from '../../types';
import { LocalSnapshotMeta } from '../../lib/backup';
import { isSupabaseConfigured } from '../../lib/supabase';

interface BackupsSettingsTabProps {
  boulders: Boulder[];
  attempts: Attempt[];
  snapshots: LocalSnapshotMeta[];
  climbers?: Profile[];
  onExportBackup: () => void;
  onRestoreSnapshot: (snapId: string, timestamp: string) => Promise<void>;
  onCreateSnapshot: () => void | Promise<void>;
  onSyncToCloud?: () => Promise<{ syncedCount: number; error?: string }>;
  onDeleteSnapshot?: (snapId: string) => Promise<void>;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const BackupsSettingsTab: React.FC<BackupsSettingsTabProps> = ({
  boulders,
  attempts,
  snapshots,
  climbers = [],
  onExportBackup,
  onRestoreSnapshot,
  onCreateSnapshot,
  onSyncToCloud,
  onDeleteSnapshot,
  onFileSelected,
  fileInputRef
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const cloudCount = snapshots.filter((s) => s.is_cloud).length;
  const localOnlyCount = snapshots.filter((s) => !s.is_cloud).length;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCreateSnapshot = async () => {
    setIsCreating(true);
    try {
      await onCreateSnapshot();
      showFeedback('success', isSupabaseConfigured ? 'Snapshot saved locally & synced to cloud!' : 'Local safety snapshot saved!');
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to create snapshot');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (!onSyncToCloud) return;
    setIsSyncing(true);
    try {
      const res = await onSyncToCloud();
      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', `Synced ${res.syncedCount} snapshot(s) to cloud!`);
      }
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to sync to cloud');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSnapshot = async (snapId: string, reason?: string) => {
    if (!onDeleteSnapshot) return;
    if (!window.confirm(`Delete snapshot "${reason || 'Snapshot'}"? This cannot be undone.`)) return;
    try {
      await onDeleteSnapshot(snapId);
      showFeedback('success', 'Snapshot deleted');
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to delete snapshot');
    }
  };

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Data Backup &amp; Safety Net
          </label>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Protect ticklists, sends, and beta notes against accidental deletion with automatic cloud sync.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Export & Import Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExportBackup}
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
          onChange={onFileSelected}
          className="hidden"
        />
      </div>

      {/* Cross-Device Cloud Safety Snapshots */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" />
              Safety Snapshots &amp; Cloud Rollbacks
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {isSupabaseConfigured
                ? `${cloudCount} cloud synced • ${localOnlyCount} local`
                : 'Local device backups (offline mode)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isSupabaseConfigured && localOnlyCount > 0 && onSyncToCloud && (
              <button
                type="button"
                onClick={handleSyncToCloud}
                disabled={isSyncing}
                title="Sync local snapshots to Supabase cloud"
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync ({localOnlyCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={isCreating}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50 active-press"
            >
              <span>{isCreating ? 'Saving...' : '+ Snapshot Now'}</span>
            </button>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic py-2 text-center">No snapshots saved yet.</p>
        ) : (
          <div className="flex flex-col gap-2 pt-1 max-h-72 overflow-y-auto pr-1">
            {snapshots.map((snap, idx) => {
              const creator = climbers.find((c) => c.id === snap.created_by);
              return (
                <div
                  key={snap.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs gap-2"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-200 text-xs truncate">
                        {snap.reason || (idx === 0 ? 'Latest Snapshot' : 'Previous Snapshot')}
                      </span>
                      {snap.is_cloud ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Cloud className="w-2.5 h-2.5" />
                          <span>Cloud</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          <Smartphone className="w-2.5 h-2.5" />
                          <span>Local</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      <span>{new Date(snap.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>•</span>
                      <span>{snap.boulderCount} climbs, {snap.attemptCount} logs</span>
                      {creator && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300">by {creator.display_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRestoreSnapshot(snap.id, snap.timestamp)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 active-press transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>

                    {onDeleteSnapshot && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id, snap.reason)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
