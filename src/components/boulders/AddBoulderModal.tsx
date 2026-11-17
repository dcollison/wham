import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Boulder, Grade, GRADES, HOLD_COLORS, GymArea } from '../../types';
import { compressImage, CompressionResult } from '../../lib/imageCompressor';
import { isWinterSeriesAreaId } from '../../lib/winterSeries';
import { HoldSwatch } from './HoldSwatch';
import { X, Camera, Plus, AlertCircle, Layers, Trophy, Loader2 } from 'lucide-react';

interface AddBoulderModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymId: string;
  areaId: string | null;
  areaName: string;
  areas?: GymArea[];
  existingBoulders: Boulder[];
  defaultInsertAfterId?: string | null;
  onSwitchToBulk?: () => void;
  onAdd: (params: {
    gymId: string;
    areaId: string;
    holdColour: string;
    grade: Grade;
    notes?: string;
    imageFile?: File | null;
    imageDataUrl?: string | null;
    insertAfterBoulderId?: string | null;
    isComp?: boolean;
    compNumber?: number;
  }) => Promise<void>;
}

export const AddBoulderModal: React.FC<AddBoulderModalProps> = ({
  isOpen,
  onClose,
  gymId,
  areaId,
  areaName,
  areas = [],
  existingBoulders,
  defaultInsertAfterId,
  onSwitchToBulk,
  onAdd
}) => {
  const { currentUser } = useAuth();
  const activeColor = currentUser?.accent_color || '#F59E0B';

  const gymAreas = useMemo(() => {
    return areas.filter(a => a.gym_id === gymId).sort((a, b) => a.sort_order - b.sort_order);
  }, [areas, gymId]);

  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (areaId && gymAreas.some(a => a.id === areaId)) return areaId;
    return gymAreas[0]?.id || '';
  });
  const [holdColour, setHoldColour] = useState<string>('Yellow');
  const [grade, setGrade] = useState<Grade>('V2');
  const [isComp, setIsComp] = useState<boolean>(false);
  const [compNumber, setCompNumber] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [insertAfterId, setInsertAfterId] = useState<string>(defaultInsertAfterId || '');
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  // Sync selected area and reset form ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const activeId = (areaId && gymAreas.some(a => a.id === areaId)) ? areaId : (gymAreas[0]?.id || '');
      setSelectedAreaId(activeId);
      const activeArea = gymAreas.find(a => a.id === activeId);
      const isCompMode = Boolean(activeArea?.is_comp_wall);
      setIsComp(isCompMode);

      const existingInArea = existingBoulders.filter(b => b.gym_id === gymId && b.area_id === activeId && !b.is_archived);
      const maxComp = Math.max(0, ...existingInArea.map(b => b.comp_number || 0));
      setCompNumber(maxComp + 1);

      setInsertAfterId(defaultInsertAfterId || '');
      setNotes('');
      setCompressionResult(null);
      setErrorMessage(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  // Ensure selectedAreaId is valid for the current gym, otherwise fallback to first gym area
  const effectiveAreaId = (selectedAreaId && gymAreas.some(a => a.id === selectedAreaId))
    ? selectedAreaId
    : (areaId && gymAreas.some(a => a.id === areaId) ? areaId : (gymAreas[0]?.id || ''));

  const currentSelectedArea = gymAreas.find(a => a.id === effectiveAreaId);
  const displayAreaName = currentSelectedArea?.name || areaName;

  // Active boulders in this specific gym & area sorted clockwise
  const areaBoulders = existingBoulders
    .filter(b => b.gym_id === gymId && b.area_id === effectiveAreaId && !b.is_archived)
    .sort((a, b) => a.position_order - b.position_order);

  const effectiveInsertAfterId = areaBoulders.some(b => b.id === insertAfterId) ? insertAfterId : '';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      const result = await compressImage(file, 1200, 0.75);
      setCompressionResult(result);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Failed to process image. Please try another image.');
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onAdd({
        gymId,
        areaId: effectiveAreaId,
        holdColour,
        grade: grade || 'VB',
        isComp,
        compNumber: isComp ? compNumber : undefined,
        notes: notes.trim() || undefined,
        imageFile: compressionResult?.file || null,
        imageDataUrl: compressionResult?.dataUrl || null,
        insertAfterBoulderId: effectiveInsertAfterId || null
      });
      onClose();
      // Reset form
      setNotes('');
      setCompressionResult(null);
      setInsertAfterId('');
    } catch (err: any) {
      console.error('Failed to add boulder:', err);
      setErrorMessage(err?.message || 'Failed to save climb to database. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg ds-sheet p-5 sm:p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-surface-higher rounded-full mx-auto sm:hidden -mt-1 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-3 gap-2">
          <h2 className="text-lg font-bold text-white flex items-start gap-2">
            <Plus className="w-5 h-5 shrink-0 mt-0.5" style={{ color: activeColor }} />
            <span>Add Boulder to {displayAreaName}</span>
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {onSwitchToBulk && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToBulk();
                }}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all active-press border"
                style={{ color: activeColor, backgroundColor: `${activeColor}15`, borderColor: `${activeColor}30` }}
              >
                <Layers className="w-3.5 h-3.5" style={{ color: activeColor }} />
                <span>Bulk Mode</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-surface-high active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-white">Database Sync Blocked</span>
              <span className="leading-relaxed text-xs text-rose-200">{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Target Sector Selector (Shown when browsing All Areas) */}
          {!areaId && gymAreas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="ds-label">
                Sector
              </label>
              <select
                value={effectiveAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setInsertAfterId('');
                }}
                className="ds-input text-xs rounded-lg p-3"
              >
                {gymAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Hold Colour Selection */}
          <div className="flex flex-col gap-2">
            <label className="ds-label">
              Hold Colour
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Object.keys(HOLD_COLORS).map((colorName) => {
                const isSelected = holdColour === colorName;
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => setHoldColour(colorName)}
                    style={isSelected ? { borderColor: activeColor } : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all active-press ${
                      isSelected
                        ? 'bg-surface-high text-white'
                        : 'border-white/[0.08] bg-carbon text-slate-300 hover:border-white/[0.16]'
                    }`}
                  >
                    <HoldSwatch color={colorName} size="sm" />
                    <span className="truncate">
                      {colorName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Switcher / Comp Wall indicator */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-surface-elevated border border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Trophy className={`w-4 h-4 shrink-0 ${isComp ? 'text-amber-400' : 'text-slate-400'}`} />
              <div>
                <span className="text-xs font-bold text-slate-100 block">
                  {isComp ? 'Numbered Comp Problem' : 'Standard V-Graded Problem'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isComp
                    ? isWinterSeriesAreaId(effectiveAreaId)
                      ? '3 / 2 / 1 comp points'
                      : '10 / 7 / 4 festival points'
                    : 'Includes career stats & grade charts'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsComp((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active-press shrink-0 ${
                isComp
                  ? 'bg-amber-400 text-black'
                  : 'bg-surface-high text-slate-200 hover:text-white border border-white/[0.1]'
              }`}
            >
              {isComp ? 'Comp #' : 'V-Grade'}
            </button>
          </div>

          {/* Grade Picker OR Comp Problem Number Input */}
          {isComp ? (
            <div className="flex flex-col gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 animate-fadeIn">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Comp Problem Number
              </label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-amber-400">#</span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={compNumber || ''}
                  onChange={(e) => setCompNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-28 bg-carbon border border-amber-500/50 text-amber-200 font-mono tabular-nums font-bold text-lg rounded-md py-2 px-3 outline-none focus:border-amber-400"
                />
                <span className="text-xs text-slate-300">
                  Next sequential problem
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="ds-label">
                Grade
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {GRADES.map((g) => {
                  const isSelected = grade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      style={isSelected ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                      className={`px-3.5 py-2 rounded-full font-mono tabular-nums text-xs font-bold shrink-0 transition-all active-press ${
                        isSelected
                          ? 'font-black'
                          : 'bg-surface-elevated border border-white/[0.08] text-slate-200 hover:bg-surface-high'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* "Insert Boulder Adjacent" Clockwise Order Selector */}
          <div className="flex flex-col gap-2 bg-surface-elevated p-3.5 rounded-lg border border-white/[0.08]">
            <label className="ds-label">
              Wall Position
            </label>
            <select
              value={effectiveInsertAfterId}
              onChange={(e) => setInsertAfterId(e.target.value)}
              className="ds-input text-xs rounded-md p-2.5"
            >
              <option value="">
                {areaBoulders.length === 0
                  ? 'First climb in this sector (Position #1)'
                  : `At the End of Area (Position #${areaBoulders.length + 1})`}
              </option>
              {areaBoulders.map((b, idx) => (
                <option key={b.id} value={b.id}>
                  Insert after #{idx + 1}: {b.hold_colour} {b.grade} {b.notes ? `("${b.notes.slice(0, 20)}...")` : ''}
                </option>
              ))}
            </select>
            {areaBoulders.length > 0 && (
              <p className="text-[11px] text-slate-400">
                Inserts between climbs without shifting existing numbers.
              </p>
            )}
          </div>

          {/* Single Photo Upload with Canvas Compression */}
          <div className="flex flex-col gap-2">
            <label className="ds-label">
              Photo
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {!compressionResult ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-white/[0.14] hover:border-white/[0.28] bg-surface-elevated text-slate-200 hover:bg-surface-high transition-all text-xs font-semibold active-press disabled:opacity-60"
              >
                {compressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: activeColor }} />
                    <span>Compressing image...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" style={{ color: activeColor }} />
                    <span>Snap Photo or Upload Image</span>
                  </>
                )}
              </button>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-white/[0.1] bg-carbon p-2 flex items-center gap-3">
                <img
                  src={compressionResult.dataUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-md border border-white/[0.1]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    Photo ready
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {(compressionResult.originalSize / 1024).toFixed(0)} KB → {(compressionResult.compressedSize / 1024).toFixed(0)} KB
                  </p>
                  <p className="text-[10px] text-emerald-400 tabular-nums">
                    {compressionResult.width}×{compressionResult.height}px JPEG
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompressionResult(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-surface-high transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Beta / Climb Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-label">
              Beta Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Low crimp start, high left heel, reachy top move..."
              className="ds-input text-xs rounded-lg p-3 resize-none"
            />
          </div>

          {/* Submit Action: Larger & More Prominent */}
          <button
            type="submit"
            disabled={submitting || compressing}
            style={{ backgroundColor: activeColor, color: '#000000' }}
            className="w-full mt-2 min-h-[52px] py-4 px-5 rounded-full font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl active-press disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5 stroke-[2.5]" />
            )}
            <span>{submitting ? 'Adding Boulder...' : 'Add Boulder'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
