import React, { useState } from 'react';
import { ShieldCheck, Download, Upload, History, RotateCcw, Cloud, Smartphone, Trash2, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
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
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
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
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const cloudCount = snapshots.filter((s) => s.is_cloud).length;
  const localOnlyCount = snapshots.filter((s) => !s.is_cloud).length;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCreateSnapshot = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await onCreateSnapshot();
      showFeedback('success', isSupabaseConfigured ? 'Snapshot saved locally & synced to cloud' : 'Local safety snapshot saved');
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to create snapshot');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (!onSyncToCloud || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await onSyncToCloud();
      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', `Synced ${res.syncedCount} snapshot(s) to cloud`);
      }
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to sync to cloud');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreSnapshot = async (snapId: string, timestamp: string) => {
    if (restoringId) return;
    setRestoringId(snapId);
    try {
      await onRestoreSnapshot(snapId, timestamp);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteSnapshot = async (snapId: string, reason?: string) => {
    if (!onDeleteSnapshot || deletingId) return;
    if (!window.confirm(`Delete snapshot "${reason || 'Snapshot'}"? This cannot be undone.`)) return;
    setDeletingId(snapId);
    try {
      await onDeleteSnapshot(snapId);
      showFeedback('success', 'Snapshot deleted');
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to delete snapshot');
    } finally {
      setDeletingId(null);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsImporting(true);
    try {
      await Promise.resolve(onFileSelected(e));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <label className="ds-label">
            Data Backup &amp; Safety Net
          </label>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Protect ticklists, sends, and beta notes against accidental deletion with cloud sync.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4 stroke-[2.5] shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Export & Import Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onExportBackup}
          className="p-3 rounded-lg bg-surface-elevated hover:bg-surface-high border border-white/[0.08] flex items-center justify-between text-left transition-colors active-press group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Export Backup</span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {boulders.length} climbs · {attempts.length} logs
              </span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400">Download</span>
        </button>

        <button
          type="button"
          disabled={isImporting}
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-lg bg-surface-elevated hover:bg-surface-high border border-white/[0.08] flex items-center justify-between text-left transition-colors active-press group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Restore from File</span>
              <span className="text-[11px] text-slate-400">Import backup .json</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-sky-400">
            {isImporting ? 'Importing…' : 'Choose File'}
          </span>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* Cross-Device Cloud Safety Snapshots */}
      <div className="p-3.5 rounded-lg bg-carbon border border-white/[0.07] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" />
              Safety Snapshots &amp; Cloud Rollbacks
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              {isSupabaseConfigured
                ? `${cloudCount} cloud synced · ${localOnlyCount} local`
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
                className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex items-center gap-1 transition-colors disabled:opacity-50 tabular-nums"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync ({localOnlyCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={isCreating}
              className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface-high text-slate-200 hover:text-white border border-white/[0.08] transition-colors flex items-center gap-1.5 disabled:opacity-50 active-press"
            >
              {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{isCreating ? 'Saving…' : '+ Snapshot'}</span>
            </button>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No snapshots saved yet.</p>
        ) : (
          <div className="flex flex-col gap-2 pt-1 max-h-72 overflow-y-auto pr-1">
            {snapshots.map((snap, idx) => {
              const creator = climbers.find((c) => c.id === snap.created_by);
              const isRestoring = restoringId === snap.id;
              const isDeleting = deletingId === snap.id;
              return (
                <div
                  key={snap.id}
                  className="flex items-center justify-between p-2.5 rounded-md bg-surface border border-white/[0.07] text-xs gap-2"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-200 text-xs truncate">
                        {snap.reason || (idx === 0 ? 'Latest Snapshot' : 'Previous Snapshot')}
                      </span>
                      {snap.is_cloud ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400">
                          <Cloud className="w-3 h-3" />
                          <span>Cloud</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Smartphone className="w-3 h-3" />
                          <span>Local</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums mt-0.5 truncate">
                      <span>{new Date(snap.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>·</span>
                      <span>{snap.boulderCount} climbs, {snap.attemptCount} logs</span>
                      {creator && (
                        <>
                          <span>·</span>
                          <span className="text-slate-300">by {creator.display_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={Boolean(restoringId) || isDeleting}
                      onClick={() => handleRestoreSnapshot(snap.id, snap.timestamp)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-surface-elevated hover:bg-surface-high text-amber-400 border border-amber-500/30 active-press transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isRestoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      <span>{isRestoring ? 'Restoring…' : 'Restore'}</span>
                    </button>

                    {onDeleteSnapshot && (
                      <button
                        type="button"
                        disabled={isDeleting || isRestoring}
                        onClick={() => handleDeleteSnapshot(snap.id, snap.reason)}
                        aria-label="Delete snapshot"
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Delete snapshot"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
