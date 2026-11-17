import React, { useState, useRef } from 'react';
import { GymArea } from '../../types';
import { compressImage } from '../../lib/imageCompressor';
import { AreaPhotoModal } from './AreaPhotoModal';
import { Camera, Image as ImageIcon, Maximize2, Trash2, ChevronDown, ChevronUp, Upload, Loader2 } from 'lucide-react';
import { ResetAgeInfo } from '../../lib/resetStatus';

interface AreaPhotoBannerProps {
  currentArea: GymArea | null;
  activeBouldersCount: number;
  activeColor: string;
  resetInfo?: ResetAgeInfo | null;
  onUploadPhoto: (file: File, dataUrl: string) => Promise<void>;
  onRemovePhoto: () => Promise<void>;
}

export const AreaPhotoBanner: React.FC<AreaPhotoBannerProps> = ({
  currentArea,
  activeBouldersCount,
  activeColor,
  resetInfo: _resetInfo,
  onUploadPhoto,
  onRemovePhoto
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // If previously collapsed by user, retain state
    return localStorage.getItem('wham_area_banner_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('wham_area_banner_collapsed', String(nextVal));
  };

  if (!currentArea) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Compress with 1600px max width for crisp wide wall panorama
      const compressed = await compressImage(file, 1600, 0.8);
      await onUploadPhoto(compressed.file, compressed.dataUrl);
    } catch (err: any) {
      console.error('Failed to compress and upload area photo:', err);
      alert(err?.message || 'Failed to process wall photo. Please try a different image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRemoving) return;
    if (window.confirm(`Remove wall photo for ${currentArea.name}?`)) {
      setIsRemoving(true);
      try {
        await onRemovePhoto();
      } catch (err: any) {
        console.error('Failed to remove wall photo:', err);
        alert(err?.message || 'Failed to remove wall photo.');
      } finally {
        setIsRemoving(false);
      }
    }
  };

  const hasPhoto = Boolean(currentArea.image_url);

  return (
    <>
      <div className="w-full rounded-2xl border border-white/[0.08] bg-surface overflow-hidden shadow-sm transition-all mb-1">
        {/* If Area Has Photo */}
        {hasPhoto ? (
          <div>
            {/* Header strip */}
            <div
              className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-surface-elevated transition-colors select-none"
              onClick={toggleCollapse}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-slate-100 truncate">
                  {currentArea.name} Wall Photo
                </span>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">
                  ({activeBouldersCount})
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high text-slate-300 hover:text-white transition-colors"
                  title="Zoom Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high text-slate-300 hover:text-white transition-colors disabled:opacity-40"
                  title="Change Wall Photo"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <Camera className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="p-1.5 rounded-lg bg-surface-elevated hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 transition-colors disabled:opacity-40"
                  title="Remove Wall Photo"
                >
                  {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title={isCollapsed ? 'Expand Photo' : 'Collapse Photo'}
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Banner Image (if expanded) */}
            {!isCollapsed && (
              <div
                className="relative h-36 sm:h-48 w-full bg-carbon overflow-hidden cursor-pointer group"
                onClick={() => setIsModalOpen(true)}
              >
                <img
                  src={currentArea.image_url!}
                  alt={`${currentArea.name} wall overview`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute bottom-2.5 left-3 flex items-center text-white text-xs">
                  <span className="font-semibold flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Inspect wall photo</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* If Area Has No Photo Yet: Compact Upload Prompt */
          <div className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="p-2 rounded-lg shrink-0"
                style={{
                  backgroundColor: `${activeColor}15`,
                  color: activeColor
                }}
              >
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-100 block truncate">
                  {currentArea.name} Wall Photo
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  Add a wide photo to navigate this wall
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{ backgroundColor: activeColor, color: '#000000' }}
              className="py-1.5 px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 active-press transition-colors shrink-0 shadow-sm disabled:opacity-40"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>{isUploading ? 'Uploading...' : 'Add Photo'}</span>
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Fullscreen Zoom Modal */}
      <AreaPhotoModal
        area={currentArea}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeColor={activeColor}
        onUploadNewPhoto={handleFileChange}
        isUploading={isUploading}
      />
    </>
  );
};
