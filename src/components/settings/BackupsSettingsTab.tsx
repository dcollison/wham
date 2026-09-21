import React from 'react';
import { ShieldCheck, Download, Upload, History, RotateCcw, Database } from 'lucide-react';
import { Boulder, Attempt } from '../../types';
import { LocalSnapshotMeta } from '../../lib/backup';

interface BackupsSettingsTabProps {
  boulders: Boulder[];
  attempts: Attempt[];
  snapshots: LocalSnapshotMeta[];
  onExportBackup: () => void;
  onRestoreSnapshot: (snapId: string, timestamp: string) => Promise<void>;
  onCreateSnapshot: () => void;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const BackupsSettingsTab: React.FC<BackupsSettingsTabProps> = ({
  boulders,
  attempts,
  snapshots,
  onExportBackup,
  onRestoreSnapshot,
  onCreateSnapshot,
  onFileSelected,
  fileInputRef
}) => {
  return (
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

      {/* Automatic Rolling Snapshots */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-400" />
            Recent Safety Snapshots
          </span>
          <button
            type="button"
            onClick={onCreateSnapshot}
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
                  onClick={() => onRestoreSnapshot(snap.id, snap.timestamp)}
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
  );
};
