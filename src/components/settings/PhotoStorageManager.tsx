import React, { useState } from 'react';
import { Boulder } from '../../types';
import { useGym } from '../../context/GymContext';
import { HardDrive, Trash2, Check, AlertCircle, Info, Sparkles } from 'lucide-react';

interface PhotoStorageManagerProps {
  boulders: Boulder[];
  activeColor: string;
}

export const PhotoStorageManager: React.FC<PhotoStorageManagerProps> = ({
  boulders,
  activeColor
}) => {
  const { pruneArchivedClimbPhotos } = useGym();

  const [pruningDays, setPruningDays] = useState<number>(0); // 0 = all archived
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [pruneResult, setPruneResult] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Auto-prune preference stored locally
  const [autoPruneEnabled, setAutoPruneEnabled] = useState<boolean>(() => {
    return localStorage.getItem('wham_auto_prune_photos') === 'true';
  });

  const handleToggleAutoPrune = () => {
    const nextVal = !autoPruneEnabled;
    setAutoPruneEnabled(nextVal);
    localStorage.setItem('wham_auto_prune_photos', String(nextVal));
  };

  // Metrics
  const climbsWithPhotos = boulders.filter((b) => Boolean(b.image_url));
  const activeClimbsWithPhotos = climbsWithPhotos.filter((b) => !b.is_archived);
  const archivedClimbsWithPhotos = climbsWithPhotos.filter((b) => b.is_archived);

  // Estimated size: canvas compression targets ~110 KB per JPEG
  const ESTIMATED_AVG_BYTES = 115 * 1024;
  const SUPABASE_FREE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB

  const totalUsedBytes = climbsWithPhotos.length * ESTIMATED_AVG_BYTES;
  const archivedUsedBytes = archivedClimbsWithPhotos.length * ESTIMATED_AVG_BYTES;
  const percentUsed = Math.min((totalUsedBytes / SUPABASE_FREE_LIMIT_BYTES) * 100, 100);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Filter archived climbs matching pruning criteria
  const matchingArchivedPhotos = archivedClimbsWithPhotos.filter((b) => {
    if (pruningDays === 0) return true;
    const addedMs = new Date(b.date_added).getTime();
    if (isNaN(addedMs)) return true;
    const cutoff = Date.now() - pruningDays * 24 * 60 * 60 * 1000;
    return addedMs < cutoff;
  });

  const handlePrune = async () => {
    if (matchingArchivedPhotos.length === 0) return;

    const confirmMsg =
      pruningDays === 0
        ? `Remove photos from all ${matchingArchivedPhotos.length} archived climbs?\n\nThis will free ~${formatBytes(
            matchingArchivedPhotos.length * ESTIMATED_AVG_BYTES
          )} of Supabase storage.\n\nAll climb grades, ticklists, attempts, and beta notes will remain preserved!`
        : `Remove photos from ${matchingArchivedPhotos.length} climbs archived >${pruningDays} days ago?\n\nClimb ticklists and beta notes will remain preserved.`;

    if (!window.confirm(confirmMsg)) return;

    setIsPruning(true);
    setPruneResult(null);
    setErrorStatus(null);

    try {
      const res = await pruneArchivedClimbPhotos(pruningDays);
      setPruneResult(`Cleaned up ${res.removedCount} photos (freed ~${formatBytes(res.freedBytesEstimate)})!`);
      setTimeout(() => setPruneResult(null), 4000);
    } catch (e: any) {
      setErrorStatus(e?.message || 'Failed to prune photos');
      setTimeout(() => setErrorStatus(null), 3500);
    } finally {
      setIsPruning(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
      <div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Photo Storage &amp; Quota Manager
          </label>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Manage Supabase photo storage space and clean up photos on old archived resets.
        </p>
      </div>

      {pruneResult && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{pruneResult}</span>
        </div>
      )}

      {errorStatus && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* Storage Quota Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">Supabase Free Storage</span>
            <span className="text-[11px] text-slate-400">
              ~{formatBytes(totalUsedBytes)} used of 1.0 GB limit
            </span>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-cyan-500/30">
            {percentUsed < 0.1 ? '<0.1%' : `${percentUsed.toFixed(1)}%`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-cyan-400 transition-all duration-500 rounded-full"
            style={{ width: `${Math.max(percentUsed, 1.5)}%` }}
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block">Total Photos</span>
            <span className="text-sm font-bold font-mono text-white">{climbsWithPhotos.length}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block">Active Climbs</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{activeClimbsWithPhotos.length}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block">Archived Climbs</span>
            <span className="text-sm font-bold font-mono text-amber-400">{archivedClimbsWithPhotos.length}</span>
          </div>
        </div>

        {/* Viability Note */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Wham compresses every climb photo client-side to <strong className="text-slate-300">~115 KB JPEG</strong>. The Supabase 1 GB free tier easily fits <strong className="text-slate-300">~9,000 photos</strong> (approx. 8–10 years of weekly gym resets).
          </span>
        </div>
      </div>

      {/* Prune Archived Photos Action */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Prune Old Archived Photos</h4>
            <p className="text-[11px] text-slate-400">
              Free storage by removing photos from archived problem resets.
            </p>
          </div>
          {archivedClimbsWithPhotos.length > 0 && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              ~{formatBytes(archivedUsedBytes)} recoverable
            </span>
          )}
        </div>

        {/* Filter Selection */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setPruningDays(0)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
              pruningDays === 0
                ? 'bg-slate-800 text-white border-amber-400/60 ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Archived
          </button>
          <button
            type="button"
            onClick={() => setPruningDays(30)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
              pruningDays === 30
                ? 'bg-slate-800 text-white border-amber-400/60 ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            &gt; 30 Days Old
          </button>
          <button
            type="button"
            onClick={() => setPruningDays(60)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
              pruningDays === 60
                ? 'bg-slate-800 text-white border-amber-400/60 ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            &gt; 60 Days Old
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handlePrune}
          disabled={isPruning || matchingArchivedPhotos.length === 0}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 active-press transition-colors shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>
            {isPruning
              ? 'Pruning photos...'
              : matchingArchivedPhotos.length === 0
              ? 'No matching archived photos to prune'
              : `Prune ${matchingArchivedPhotos.length} archived photos (~${formatBytes(
                  matchingArchivedPhotos.length * ESTIMATED_AVG_BYTES
                )})`}
          </span>
        </button>

        {/* Auto-Prune Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-300 font-medium">Auto-prune photos on reset</span>
          </div>
          <button
            type="button"
            onClick={handleToggleAutoPrune}
            className={`w-9 h-5 rounded-full transition-colors relative ${
              autoPruneEnabled ? 'bg-cyan-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                autoPruneEnabled ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
