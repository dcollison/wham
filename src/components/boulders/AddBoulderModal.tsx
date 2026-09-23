import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Boulder, Grade, GRADES, HOLD_COLORS, GymArea, getHoldSwatchStyle } from '../../types';
import { compressImage, CompressionResult } from '../../lib/imageCompressor';
import { HoldSwatch } from './HoldSwatch';
import { X, Camera, Upload, Plus, AlertCircle, ArrowDown, Layers, Trophy } from 'lucide-react';

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
  const activeColor = currentUser?.accent_color || '#3B82F6';

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
        grade: isComp ? 'VB' : grade,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: activeColor }} />
              Add Boulder to {displayAreaName}
            </h2>
            <p className="text-xs text-slate-400">Positioned sequentially in clockwise order</p>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToBulk && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToBulk();
                }}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all active-press border"
                style={{ color: activeColor, backgroundColor: `${activeColor}15`, borderColor: `${activeColor}30` }}
              >
                <Layers className="w-3.5 h-3.5" style={{ color: activeColor }} />
                <span>Bulk Mode</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-white">Database Sync Blocked</span>
              <span className="leading-relaxed text-[11px] text-rose-300">{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Target Sector Selector (Shown when browsing All Areas) */}
          {!areaId && gymAreas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Wall Sector / Area
              </label>
              <select
                value={effectiveAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setInsertAfterId('');
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 outline-none focus:border-slate-500"
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
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Hold Colour
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Object.entries(HOLD_COLORS).map(([colorName, config]) => {
                const isSelected = holdColour === colorName;
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => setHoldColour(colorName)}
                    style={isSelected ? { borderColor: activeColor, boxShadow: `0 0 0 1px ${activeColor}80` } : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-all active-press ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <div className="flex items-center gap-2">
              <Trophy className={`w-4 h-4 ${isComp ? 'text-amber-400' : 'text-slate-400'}`} />
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  {isComp ? 'Numbered Comp Problem' : 'Standard V-Graded Problem'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isComp ? 'Scored with 10 / 7 / 4 points • No V-grade' : 'Standard circuit climb with career stats'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsComp((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                isComp
                  ? 'bg-amber-400 text-black shadow'
                  : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isComp ? 'Comp # Mode' : 'Switch to Comp #'}
            </button>
          </div>

          {/* Grade Picker OR Comp Problem Number Input */}
          {isComp ? (
            <div className="flex flex-col gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 animate-in fade-in">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                <span>Comp Problem Number:</span>
                <span className="font-mono text-sm font-black text-amber-400">#{compNumber}</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-amber-400">#</span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={compNumber || ''}
                  onChange={(e) => setCompNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-28 bg-slate-900 border border-amber-500/50 text-amber-200 font-mono font-bold text-lg rounded-xl py-2 px-3 outline-none focus:border-amber-400"
                />
                <span className="text-xs text-slate-400">
                  Next sequential problem on the comp wall
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Grade: <span className="font-mono text-sm font-black" style={{ color: activeColor }}>{grade}</span>
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
                      className={`px-3 py-2 rounded-xl font-mono text-xs font-bold shrink-0 transition-all active-press ${
                        isSelected
                          ? 'shadow-md font-black scale-105'
                          : 'bg-slate-800 border border-slate-700/60 text-slate-300 hover:bg-slate-750'
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
          <div className="flex flex-col gap-1.5 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Insert Sequential Order</span>
              <span className="text-[10px] font-mono" style={{ color: activeColor }}>Clockwise Positioning</span>
            </label>
            <select
              value={effectiveInsertAfterId}
              onChange={(e) => setInsertAfterId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-slate-500"
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
            <p className="text-[11px] text-slate-400 mt-0.5">
              {areaBoulders.length === 0
                ? 'No climbs logged in this sector yet. This will be climb #1.'
                : 'Inserts halfway between climbs without shifting existing indices.'}
            </p>
          </div>

          {/* Single Photo Upload with Canvas Compression */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Photo (Camera or Gallery)
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
                className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/40 text-slate-300 hover:bg-slate-800/70 transition-all text-xs font-semibold active-press"
              >
                {compressing ? (
                  <span>Compressing image on device...</span>
                ) : (
                  <>
                    <Camera className="w-4 h-4" style={{ color: activeColor }} />
                    <span>Snap Photo or Upload Image</span>
                  </>
                )}
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2 flex items-center gap-3">
                <img
                  src={compressionResult.dataUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    Photo ready (Compressed)
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {(compressionResult.originalSize / 1024).toFixed(0)} KB → {(compressionResult.compressedSize / 1024).toFixed(0)} KB
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    {compressionResult.width}×{compressionResult.height}px JPEG
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompressionResult(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Beta / Climb Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Beta / Setter Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Low crimp start, high left heel, reachy top move..."
              className="bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl p-3 outline-none focus:border-slate-500 resize-none"
            />
          </div>

          {/* Submit Action: Larger & More Prominent */}
          <button
            type="submit"
            disabled={submitting || compressing}
            style={{ backgroundColor: activeColor, color: '#000000' }}
            className="w-full mt-2 min-h-[50px] py-4 px-5 rounded-2xl font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl active-press disabled:opacity-50"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>{submitting ? 'Adding Boulder...' : 'Add Boulder'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
