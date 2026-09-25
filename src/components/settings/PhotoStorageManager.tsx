import React, { useState, useEffect, useCallback } from 'react';
import { Boulder, GymArea } from '../../types';
import { useGym } from '../../context/GymContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { HardDrive, Trash2, Check, AlertCircle, Info, Sparkles, RefreshCw, Eye, Image as ImageIcon, X } from 'lucide-react';
import { HoldSwatch } from '../boulders/HoldSwatch';

interface PhotoStorageManagerProps {
  boulders: Boulder[];
  areas?: GymArea[];
  activeColor: string;
}

export const PhotoStorageManager: React.FC<PhotoStorageManagerProps> = ({
  boulders,
  areas: propAreas,
  activeColor
}) => {
  const { areas: contextAreas, pruneArchivedClimbPhotos, removeAreaPhoto } = useGym();
  const areas = propAreas || contextAreas || [];

  const [pruningDays, setPruningDays] = useState<number>(0); // 0 = all archived
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [pruneResult, setPruneResult] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Live storage stats from Supabase Storage bucket
  const [liveBucketStats, setLiveBucketStats] = useState<{
    boulderCount: number;
    areaCount: number;
    totalBytes: number;
  } | null>(null);
  const [isQueryingBucket, setIsQueryingBucket] = useState<boolean>(false);

  // Lightbox preview for photos in storage
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; url: string } | null>(null);

  // Auto-prune preference stored locally
  const [autoPruneEnabled, setAutoPruneEnabled] = useState<boolean>(() => {
    return localStorage.getItem('wham_auto_prune_photos') === 'true';
  });

  const handleToggleAutoPrune = () => {
    const nextVal = !autoPruneEnabled;
    setAutoPruneEnabled(nextVal);
    localStorage.setItem('wham_auto_prune_photos', String(nextVal));
  };

  // Client-side tracked photos
  const wallPhotos = areas.filter((a) => Boolean(a.image_url));
  const climbsWithPhotos = boulders.filter((b) => Boolean(b.image_url));
  const activeClimbsWithPhotos = climbsWithPhotos.filter((b) => !b.is_archived);
  const archivedClimbsWithPhotos = climbsWithPhotos.filter((b) => b.is_archived);

  // Canvas compression targets ~115 KB per JPEG (wall panoramas target ~250 KB)
  const ESTIMATED_CLIMB_BYTES = 115 * 1024;
  const ESTIMATED_WALL_BYTES = 250 * 1024;
  const SUPABASE_FREE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB

  // Fetch live storage metrics directly from Supabase Storage if configured
  const fetchLiveStorageStats = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsQueryingBucket(true);
    try {
      const [bouldersRes, areasRes] = await Promise.all([
        supabase.storage.from('boulder-photos').list('boulders', { limit: 1000 }),
        supabase.storage.from('boulder-photos').list('areas', { limit: 1000 })
      ]);

      let bCount = 0;
      let aCount = 0;
      let bBytes = 0;
      let aBytes = 0;

      if (bouldersRes.data && Array.isArray(bouldersRes.data)) {
        for (const file of bouldersRes.data) {
          if (file.name && !file.name.startsWith('.')) {
            bCount++;
            bBytes += (file.metadata as any)?.size || ESTIMATED_CLIMB_BYTES;
          }
        }
      }

      if (areasRes.data && Array.isArray(areasRes.data)) {
        for (const file of areasRes.data) {
          if (file.name && !file.name.startsWith('.')) {
            aCount++;
            aBytes += (file.metadata as any)?.size || ESTIMATED_WALL_BYTES;
          }
        }
      }

      setLiveBucketStats({
        boulderCount: bCount,
        areaCount: aCount,
        totalBytes: bBytes + aBytes
      });
    } catch (err) {
      console.warn('Could not query Supabase storage bucket:', err);
    } finally {
      setIsQueryingBucket(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStorageStats();
  }, [fetchLiveStorageStats, boulders.length, areas.length]);

  // Combined metrics
  const totalWallPhotosCount = liveBucketStats !== null
    ? Math.max(liveBucketStats.areaCount, wallPhotos.length)
    : wallPhotos.length;

  const totalClimbPhotosCount = liveBucketStats !== null
    ? Math.max(liveBucketStats.boulderCount, climbsWithPhotos.length)
    : climbsWithPhotos.length;

  const totalPhotosCount = totalWallPhotosCount + totalClimbPhotosCount;

  const totalUsedBytes = liveBucketStats !== null && liveBucketStats.totalBytes > 0
    ? liveBucketStats.totalBytes
    : (wallPhotos.length * ESTIMATED_WALL_BYTES) + (climbsWithPhotos.length * ESTIMATED_CLIMB_BYTES);

  const archivedUsedBytes = archivedClimbsWithPhotos.length * ESTIMATED_CLIMB_BYTES;
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
            matchingArchivedPhotos.length * ESTIMATED_CLIMB_BYTES
          )} of Supabase storage.\n\nAll climb grades, ticklists, attempts, and beta notes will remain preserved!`
        : `Remove photos from ${matchingArchivedPhotos.length} climbs archived >${pruningDays} days ago?\n\nClimb ticklists and beta notes will remain preserved.`;

    if (!window.confirm(confirmMsg)) return;

    setIsPruning(true);
    setPruneResult(null);
    setErrorStatus(null);

    try {
      const res = await pruneArchivedClimbPhotos(pruningDays);
      setPruneResult(`Cleaned up ${res.removedCount} photos (freed ~${formatBytes(res.freedBytesEstimate)})!`);
      await fetchLiveStorageStats();
      setTimeout(() => setPruneResult(null), 4000);
    } catch (e: any) {
      setErrorStatus(e?.message || 'Failed to prune photos');
      setTimeout(() => setErrorStatus(null), 3500);
    } finally {
      setIsPruning(false);
    }
  };

  const handleRemoveWallPhoto = async (areaId: string, areaName: string) => {
    if (!window.confirm(`Remove panorama photo for "${areaName}"?`)) return;
    try {
      await removeAreaPhoto(areaId);
      setPruneResult(`Removed photo for ${areaName}`);
      await fetchLiveStorageStats();
      setTimeout(() => setPruneResult(null), 3000);
    } catch (e: any) {
      setErrorStatus(e?.message || 'Failed to remove wall photo');
      setTimeout(() => setErrorStatus(null), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Photo Storage &amp; Quota Manager
            </label>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Manage wall panorama and climb photos across Supabase Storage and offline cache.
          </p>
        </div>
        {isSupabaseConfigured && (
          <button
            type="button"
            onClick={fetchLiveStorageStats}
            disabled={isQueryingBucket}
            title="Refresh live storage metrics from Supabase bucket"
            className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isQueryingBucket ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        )}
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
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block truncate">Total</span>
            <span className="text-sm font-bold font-mono text-white">{totalPhotosCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block truncate">Wall Photos</span>
            <span className="text-sm font-bold font-mono text-cyan-400">{totalWallPhotosCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block truncate">Active Climbs</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{activeClimbsWithPhotos.length}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block truncate">Archived</span>
            <span className="text-sm font-bold font-mono text-amber-400">{archivedClimbsWithPhotos.length}</span>
          </div>
        </div>

        {/* Viability Note */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Wham compresses every climb and wall photo client-side to preserve storage. The Supabase 1 GB free tier easily fits <strong className="text-slate-300">~9,000 photos</strong> (approx. 8–10 years of weekly gym resets).
          </span>
        </div>
      </div>

      {/* Uploaded Photos Assets Breakdown */}
      {(wallPhotos.length > 0 || climbsWithPhotos.length > 0) && (
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-200">Active Photo Assets ({wallPhotos.length + climbsWithPhotos.length})</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {wallPhotos.length} wall • {climbsWithPhotos.length} climb
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
            {/* Wall Panorama Photos */}
            {wallPhotos.map((area) => (
              <div
                key={`area-${area.id}`}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    onClick={() => setPreviewPhoto({ title: `${area.name} (Wall Panorama)`, url: area.image_url! })}
                    className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0 cursor-pointer group relative"
                  >
                    <img src={area.image_url!} alt={area.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-200 text-xs truncate">{area.name}</span>
                    <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                      <span>Wall Panorama</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto({ title: `${area.name} (Wall Panorama)`, url: area.image_url! })}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View photo"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveWallPhoto(area.id, area.name)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Remove wall photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Climb Photos */}
            {climbsWithPhotos.slice(0, 10).map((boulder) => {
              const area = areas.find((a) => a.id === boulder.area_id);
              return (
                <div
                  key={`boulder-${boulder.id}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      onClick={() => setPreviewPhoto({ title: `${boulder.hold_colour} ${boulder.grade} (${area?.name || 'Climb'})`, url: boulder.image_url! })}
                      className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0 cursor-pointer group relative"
                    >
                      <img src={boulder.image_url!} alt={boulder.grade} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <HoldSwatch color={boulder.hold_colour} size="xs" />
                        <span className="font-bold text-white text-xs font-mono">{boulder.grade}</span>
                        <span className="text-[10px] text-slate-400 truncate">• {boulder.hold_colour}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">
                        {area?.name || 'Climb'} {boulder.is_archived && <span className="text-amber-400 font-semibold">(Archived)</span>}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewPhoto({ title: `${boulder.hold_colour} ${boulder.grade} (${area?.name || 'Climb'})`, url: boulder.image_url! })}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View photo"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {climbsWithPhotos.length > 10 && (
              <p className="text-[10px] text-slate-500 italic text-center py-1">
                + {climbsWithPhotos.length - 10} more climbs with photos
              </p>
            )}
          </div>
        </div>
      )}

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
                  matchingArchivedPhotos.length * ESTIMATED_CLIMB_BYTES
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

      {/* Lightbox Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/80">
              <span className="text-xs font-bold text-white truncate">{previewPhoto.title}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/40 max-h-[70vh] overflow-hidden">
              <img src={previewPhoto.url} alt={previewPhoto.title} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
