import React, { useState } from 'react';
import { GymArea } from '../../types';
import { X, ZoomIn, ZoomOut, Maximize2, Download, Camera } from 'lucide-react';

interface AreaPhotoModalProps {
  area: GymArea | null;
  isOpen: boolean;
  onClose: () => void;
  activeColor?: string;
  onUploadNewPhoto?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AreaPhotoModal: React.FC<AreaPhotoModalProps> = ({
  area,
  isOpen,
  onClose,
  activeColor = '#3B82F6',
  onUploadNewPhoto
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!isOpen || !area || !area.image_url) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeColor }}
            />
            <div>
              <h3 className="text-sm sm:text-base font-black text-white font-heading truncate">
                {area.name} – Wall Overview
              </h3>
              <p className="text-[11px] text-slate-400">Full sector photo for physical wall navigation</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {onUploadNewPhoto && (
              <label
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                title="Replace Wall Photo"
              >
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadNewPhoto}
                  className="hidden"
                />
              </label>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zoomable Image Container */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center min-h-[300px] max-h-[75vh] bg-black/50 select-none">
          <div
            className="transition-transform duration-200 flex items-center justify-center origin-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={area.image_url}
              alt={`${area.name} wall overview`}
              className="max-h-[68vh] w-auto object-contain rounded-2xl shadow-2xl border border-slate-800/80 cursor-zoom-in"
              onClick={() => (zoomLevel === 1 ? handleZoomIn() : handleResetZoom())}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Tap or click image to toggle zoom</span>
          <span className="font-mono text-[11px] text-slate-500">Wham Sector Overview</span>
        </div>
      </div>
    </div>
  );
};
