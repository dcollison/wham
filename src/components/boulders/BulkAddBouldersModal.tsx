import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Boulder, Grade, GRADES, HOLD_COLORS, GymArea, BulkAddBoulderItem, BulkAddBouldersParams, getHoldSwatchStyle } from '../../types';
import { compressImage } from '../../lib/imageCompressor';
import { HoldSwatch } from './HoldSwatch';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Camera,
  Layers,
  Sparkles,
  FileText,
  Check,
  AlertCircle,
  Copy,
  Calendar,
  RotateCcw,
  Trophy
} from 'lucide-react';

interface DraftBoulder extends BulkAddBoulderItem {
  id: string;
}

interface BulkAddBouldersModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymId: string;
  areaId: string | null;
  areaName: string;
  areas?: GymArea[];
  existingBoulders: Boulder[];
  onBulkAdd: (params: BulkAddBouldersParams) => Promise<void>;
  onSwitchToSingle?: () => void;
}

export const BulkAddBouldersModal: React.FC<BulkAddBouldersModalProps> = ({
  isOpen,
  onClose,
  gymId,
  areaId,
  areaName,
  areas = [],
  existingBoulders = [],
  onBulkAdd,
  onSwitchToSingle
}) => {
  const { currentUser } = useAuth();
  const activeColor = currentUser?.accent_color || '#3B82F6';

  const gymAreas = useMemo(() => {
    return areas.filter((a) => a.gym_id === gymId).sort((a, b) => a.sort_order - b.sort_order);
  }, [areas, gymId]);

  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (areaId && gymAreas.some((a) => a.id === areaId)) return areaId;
    return gymAreas[0]?.id || '';
  });

  const [archiveExisting, setArchiveExisting] = useState<boolean>(false);
  const [dateAdded, setDateAdded] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'visual' | 'paste'>('visual');
  const [isCompClimbs, setIsCompClimbs] = useState<boolean>(false);
  const [curCompNumber, setCurCompNumber] = useState<number>(1);

  // Visual fast logger inputs
  const [curHoldColour, setCurHoldColour] = useState<string>('Yellow');
  const [curGrade, setCurGrade] = useState<Grade>('V2');
  const [curNotes, setCurNotes] = useState<string>('');
  const [autoAddOnGrade, setAutoAddOnGrade] = useState<boolean>(false);

  // Queued draft climbs list
  const [draftQueue, setDraftQueue] = useState<DraftBoulder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Paste mode text
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteFeedback, setPasteFeedback] = useState<{ success: number; warnings: string[] } | null>(null);

  // Grade count breakdown for draft queue (must remain before early return to preserve hook order)
  const gradeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    draftQueue.forEach((item) => {
      counts[item.grade] = (counts[item.grade] || 0) + 1;
    });
    return counts;
  }, [draftQueue]);

  const prevIsOpenRef = useRef(false);

  // Sync selected area and reset queue ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const activeId = (areaId && gymAreas.some((a) => a.id === areaId)) ? areaId : (gymAreas[0]?.id || '');
      setSelectedAreaId(activeId);
      const activeArea = gymAreas.find((a) => a.id === activeId);
      setIsCompClimbs(Boolean(activeArea?.is_comp_wall));

      setDraftQueue([]);
      setCurCompNumber(1);
      setPasteText('');
      setPasteFeedback(null);
      setCurNotes('');
      setErrorMessage(null);
      setDateAdded(new Date().toISOString().split('T')[0]);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveAreaId =
    selectedAreaId && gymAreas.some((a) => a.id === selectedAreaId)
      ? selectedAreaId
      : areaId && gymAreas.some((a) => a.id === areaId)
      ? areaId
      : gymAreas[0]?.id || '';

  const currentArea = gymAreas.find((a) => a.id === effectiveAreaId);
  const displayAreaName = currentArea?.name || areaName;

  // Existing active climbs in this area
  const existingActiveInArea = existingBoulders.filter(
    (b) => b.gym_id === gymId && b.area_id === effectiveAreaId && !b.is_archived
  );

  // Add a single climb to draft queue along the wall clockwise
  const handleAddDraft = (
    hold: string = curHoldColour,
    gr: Grade = curGrade,
    notes: string = curNotes,
    compNum?: number
  ) => {
    const chosenCompNum = compNum !== undefined ? compNum : curCompNumber;
    const newItem: DraftBoulder = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      holdColour: hold,
      grade: isCompClimbs ? 'VB' : gr,
      isComp: isCompClimbs,
      compNumber: isCompClimbs ? chosenCompNum : undefined,
      notes: notes.trim() || undefined
    };
    setDraftQueue((prev) => [...prev, newItem]);
    setCurNotes('');
    if (isCompClimbs) {
      setCurCompNumber(chosenCompNum + 1);
    }
  };

  // Update comp problem number on a queued item
  const handleUpdateCompNumber = (id: string, num: number) => {
    setDraftQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, compNumber: isNaN(num) ? 1 : Math.max(1, num) } : item))
    );
  };

  // When autoAddOnGrade is enabled, tapping a grade immediately appends to the queue
  const handleSelectGrade = (gr: Grade) => {
    setCurGrade(gr);
    if (autoAddOnGrade) {
      handleAddDraft(curHoldColour, gr, curNotes);
    }
  };

  // Reorder climb in draft queue
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draftQueue.length) return;
    const updated = [...draftQueue];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setDraftQueue(updated);
  };

  // Duplicate climb in queue
  const handleDuplicate = (item: DraftBoulder, index: number) => {
    const clone: DraftBoulder = {
      ...item,
      id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      imageFile: undefined,
      imageDataUrl: undefined
    };
    const updated = [...draftQueue];
    updated.splice(index + 1, 0, clone);
    setDraftQueue(updated);
  };

  // Remove climb from queue
  const handleRemove = (id: string) => {
    setDraftQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Update note inline for queued climb
  const handleUpdateNotes = (id: string, notes: string) => {
    setDraftQueue((prev) => prev.map((item) => (item.id === id ? { ...item, notes } : item)));
  };

  // Attach photo to a draft climb
  const handlePhotoUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1200, 0.75);
      setDraftQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, imageFile: compressed.file, imageDataUrl: compressed.dataUrl }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('Failed to compress photo.');
    }
  };

  // Remove photo from draft climb
  const handleRemovePhoto = (id: string) => {
    setDraftQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, imageFile: undefined, imageDataUrl: undefined } : item
      )
    );
  };

  // Parse text lines from Setter Note / Spreadsheet
  const handleParseText = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const validColors = Object.keys(HOLD_COLORS);
    const parsedItems: DraftBoulder[] = [];
    const warnings: string[] = [];

    lines.forEach((line, idx) => {
      // Split tokens by space or comma
      const tokens = line.split(/[,\s]+/).filter(Boolean);
      if (tokens.length === 0) return;

      let foundColor: string | null = null;
      let foundGrade: Grade | null = null;
      let foundCompNum: number | null = null;
      const remainingTokens: string[] = [];

      for (const token of tokens) {
        const cleanToken = token.trim();

        // 1. Try matching Hold Colour
        if (!foundColor) {
          const matchedColor = validColors.find(
            (c) => c.toLowerCase() === cleanToken.toLowerCase()
          );
          if (matchedColor) {
            foundColor = matchedColor;
            continue;
          }
        }

        // 2. Try matching Grade (case insensitive, e.g. V3, v3, vb, VB, V10, V10+)
        if (!foundGrade) {
          const upper = cleanToken.toUpperCase();
          const normalized = upper === 'V10' ? 'V10+' : upper;
          const matchedGrade = GRADES.find((g) => g.toUpperCase() === normalized);
          if (matchedGrade) {
            foundGrade = matchedGrade;
            continue;
          }
        }

        // 3. Try matching Comp Number (#1, 1, #12, 12, etc.)
        if (foundCompNum === null) {
          const match = cleanToken.match(/^#?(\d+)$/);
          if (match) {
            foundCompNum = parseInt(match[1], 10);
            continue;
          }
        }

        remainingTokens.push(cleanToken);
      }

      if (isCompClimbs && foundColor && (foundCompNum !== null || foundGrade)) {
        const compNum = foundCompNum !== null ? foundCompNum : (parsedItems.length + 1);
        parsedItems.push({
          id: `draft-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          holdColour: foundColor,
          grade: 'VB',
          isComp: true,
          compNumber: compNum,
          notes: remainingTokens.join(' ').trim() || undefined
        });
      } else if (!isCompClimbs && foundColor && foundGrade) {
        parsedItems.push({
          id: `draft-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          holdColour: foundColor,
          grade: foundGrade,
          notes: remainingTokens.join(' ').trim() || undefined
        });
      } else {
        warnings.push(`Line ${idx + 1}: "${line}" - ${!foundColor ? 'Missing colour' : ''} ${!foundGrade && foundCompNum === null ? (isCompClimbs ? 'Missing problem number' : 'Missing grade') : ''}`);
      }
    });

    if (parsedItems.length > 0) {
      setDraftQueue((prev) => [...prev, ...parsedItems]);
      if (isCompClimbs) {
        const lastNum = parsedItems[parsedItems.length - 1].compNumber;
        if (lastNum) setCurCompNumber(lastNum + 1);
      }
      setPasteText('');
      setPasteFeedback({
        success: parsedItems.length,
        warnings
      });
      setActiveTab('visual');
    } else {
      setPasteFeedback({
        success: 0,
        warnings: warnings.length > 0 ? warnings : ['No valid climbs detected. Format example: "Yellow V2 dyno" or "Yellow #1 dyno"']
      });
    }
  };

  // Submit bulk batch
  const handleSaveAll = async () => {
    if (draftQueue.length === 0) return;
    if (!effectiveAreaId) {
      alert('Please select a wall sector/area before saving.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const startNum = archiveExisting ? 1 : existingActiveInArea.length + 1;
      await onBulkAdd({
        gymId,
        areaId: effectiveAreaId,
        boulders: draftQueue.map(({ holdColour, grade, notes, imageFile, imageDataUrl, isComp: itemIsComp, compNumber }, idx) => ({
          holdColour,
          grade: isCompClimbs ? 'VB' : grade,
          isComp: isCompClimbs || itemIsComp,
          compNumber: isCompClimbs || itemIsComp ? (compNumber ?? startNum + idx) : undefined,
          notes,
          imageFile,
          imageDataUrl
        })),
        isCompWall: isCompClimbs,
        archiveExistingAreaBoulders: archiveExisting,
        dateAdded
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to bulk add boulders:', err);
      setErrorMessage(err?.message || 'Failed to bulk add climbs to database. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: `${activeColor}15`,
                border: `1px solid ${activeColor}30`,
                color: activeColor
              }}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Bulk Log Wall Set</h2>
                <span
                  style={{
                    backgroundColor: `${activeColor}20`,
                    color: activeColor,
                    borderColor: `${activeColor}40`
                  }}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                >
                  Clockwise Sequence
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Log multiple problems in sequential order for {displayAreaName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onSwitchToSingle && (
              <button
                type="button"
                onClick={onSwitchToSingle}
                className="hidden sm:inline-block text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 transition-colors"
              >
                Single Add
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

        {/* Configuration Row: Area Selector, Date & Wall Reset Option */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
          {/* Target Sector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Wall Sector / Area
            </label>
            <select
              value={effectiveAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:border-slate-500 font-semibold"
            >
              {gymAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Added */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date Set</span>
            </label>
            <input
              type="date"
              value={dateAdded}
              onChange={(e) => setDateAdded(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl p-2 outline-none focus:border-slate-500 font-mono"
            />
          </div>

          {/* Wall Reset / Archive Toggle Banner */}
          <div className="sm:col-span-2 pt-1 border-t border-slate-800/80">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={archiveExisting}
                onChange={(e) => setArchiveExisting(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700"
                style={{ accentColor: activeColor }}
              />
              <div className="text-xs">
                <span className="font-bold text-slate-200">
                  Complete Wall Reset (Archive existing climbs first)
                </span>
                <p className="text-[11px] text-slate-400">
                  {archiveExisting
                    ? `All ${existingActiveInArea.length} current climbs in ${displayAreaName} will be archived. New set starts at #1.`
                    : existingActiveInArea.length > 0
                    ? `Will append after current ${existingActiveInArea.length} climbs (starting at #${existingActiveInArea.length + 1}).`
                    : `Area is currently empty. New climbs start at #1.`}
                </p>
              </div>
            </label>
          </div>

          {/* Comp Wall Toggle Banner */}
          <div className="sm:col-span-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className={`w-4 h-4 shrink-0 ${isCompClimbs ? 'text-amber-400' : 'text-slate-400'}`} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-200 block truncate">
                  Numbered Comp Wall Climbs (#1–#N)
                </span>
                <p className="text-[11px] text-slate-400 truncate">
                  {isCompClimbs
                    ? 'Switch from V-grades to numbered comp problems (10 / 7 / 4 festival points).'
                    : 'Standard V-graded set. Climbs appear in career grade charts.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCompClimbs((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all shrink-0 ${
                isCompClimbs
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {isCompClimbs ? 'Comp Mode ON' : 'Comp Mode OFF'}
            </button>
          </div>
        </div>

        {/* Entry Tabs: Visual Builder vs Quick Paste */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            style={activeTab === 'visual' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'visual'
                ? 'shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Wall Logger</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            style={activeTab === 'paste' ? { backgroundColor: activeColor, color: '#000000' } : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'paste'
                ? 'shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quick Text / Batch Paste</span>
          </button>
        </div>

        {/* TAB 1: Visual Interactive Wall Builder */}
        {activeTab === 'visual' && (
          <div className="flex flex-col gap-4">
            {/* Quick-Input Control Pad */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Select Hold Colour:
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAddOnGrade}
                    onChange={(e) => setAutoAddOnGrade(e.target.checked)}
                    style={{ accentColor: isCompClimbs ? '#F59E0B' : activeColor }}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700"
                  />
                  <span>{isCompClimbs ? '1-Tap Add on #' : '1-Tap Add on Grade'}</span>
                </label>
              </div>

              {/* Hold Colour Swatches Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Object.entries(HOLD_COLORS).map(([cName, cfg]) => {
                  const isSelected = curHoldColour === cName;
                  return (
                    <button
                      key={cName}
                      type="button"
                      onClick={() => setCurHoldColour(cName)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all active-press ${
                        isSelected
                          ? 'bg-slate-800 text-white ring-2 ring-white/60 shadow'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                      style={isSelected ? { borderColor: cfg.hex } : undefined}
                    >
                      <HoldSwatch color={cName} size="sm" />
                      <span className="truncate text-[11px]">
                        {cName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Grade Selector Pills OR Comp Problem Number Stepper & Quick Pills */}
              {isCompClimbs ? (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Comp Problem Number:</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-300/80 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      10 / 7 / 4 points
                    </span>
                  </div>

                  {/* Direct Number Input + Stepper & Quick Pills */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    {/* Stepper with number input */}
                    <div className="flex items-center bg-slate-900 border border-amber-500/40 focus-within:border-amber-400 rounded-xl p-1 shadow-sm shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurCompNumber((prev) => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-base active-press transition-colors"
                        title="Previous problem number"
                      >
                        -
                      </button>
                      <div className="flex items-center px-2">
                        <span className="font-mono font-bold text-amber-400 text-sm mr-1">#</span>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={curCompNumber || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCurCompNumber(isNaN(val) ? 1 : Math.max(1, val));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddDraft();
                            }
                          }}
                          className="w-14 bg-transparent text-center font-mono font-black text-amber-300 text-base outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurCompNumber((prev) => prev + 1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-base active-press transition-colors"
                        title="Next problem number"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick selection pills (#1 to #30 in a scrollable horizontal strip) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => {
                        const isSelected = curCompNumber === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setCurCompNumber(num);
                              if (autoAddOnGrade) {
                                handleAddDraft(curHoldColour, 'VB', curNotes, num);
                              }
                            }}
                            className={`h-8 min-w-[2.25rem] px-2 rounded-lg font-mono text-xs font-bold transition-all shrink-0 active-press ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-1 ring-amber-300'
                                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            #{num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Select Grade:
                  </span>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {GRADES.map((gr) => {
                      const isSelected = curGrade === gr;
                      return (
                        <button
                          key={gr}
                          type="button"
                          onClick={() => handleSelectGrade(gr)}
                          style={isSelected ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all active-press ${
                            isSelected
                              ? 'shadow-md ring-1'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {gr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Notes & "+ Add to Wall" Action */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={curNotes}
                  onChange={(e) => setCurNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDraft();
                    }
                  }}
                  placeholder="Optional notes (e.g. dyno, crimpy, slab volume)..."
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddDraft()}
                  style={{
                    backgroundColor: isCompClimbs ? '#F59E0B' : activeColor,
                    color: '#000000'
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 active-press transition-colors shadow shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>
                    {isCompClimbs ? `Add #${curCompNumber}` : `Add #${draftQueue.length + 1}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Quick Text / Batch Paste Mode */}
        {activeTab === 'paste' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white flex items-center gap-1">
                <FileText className="w-4 h-4" style={{ color: activeColor }} />
                <span>Paste Route Setter Notes or CSV</span>
              </p>
              <p className="text-slate-400 text-[11px]">
                Enter one boulder per line. Specify colour and grade in any order. Any extra words become climb notes.
              </p>
            </div>

            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Yellow V2\nBlue V3 Dyno\nGreen V1 Slab\nRed V4 Pinch problem\nBlack V6\nPurple V3 Heel hook`}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-xl p-3 font-mono outline-none focus:border-slate-500 placeholder:text-slate-600"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {pasteText.split('\n').filter((l) => l.trim()).length} lines detected
              </span>
              <button
                type="button"
                onClick={handleParseText}
                disabled={!pasteText.trim()}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 active-press transition-colors disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Parse & Add to Queue</span>
              </button>
            </div>

            {pasteFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  pasteFeedback.success > 0
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {pasteFeedback.success > 0 && (
                  <p className="font-bold">
                    ✓ Successfully parsed and added {pasteFeedback.success} climb
                    {pasteFeedback.success === 1 ? '' : 's'} to the queue!
                  </p>
                )}
                {pasteFeedback.warnings.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-rose-400">Warnings:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5 font-mono">
                      {pasteFeedback.warnings.slice(0, 3).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                      {pasteFeedback.warnings.length > 3 && (
                        <li>...and {pasteFeedback.warnings.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Queued Climbs Wall Sequence List */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Wall Sequence ({draftQueue.length} {draftQueue.length === 1 ? 'Climb' : 'Climbs'})
              </span>
              {draftQueue.length > 0 && (
                <span className="text-[10px] font-mono text-slate-400">
                  Numbered clockwise 1 → {draftQueue.length}
                </span>
              )}
            </div>

            {draftQueue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all queued climbs?')) {
                    setDraftQueue([]);
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear List</span>
              </button>
            )}
          </div>

          {/* Grade Distribution or Comp Summary */}
          {draftQueue.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {isCompClimbs ? (
                <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{draftQueue.length} comp problems • 10 / 7 / 4 festival points</span>
                </span>
              ) : (
                GRADES.map((gr) => {
                  const count = gradeBreakdown[gr];
                  if (!count) return null;
                  return (
                    <span
                      key={gr}
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {count}x {gr}
                    </span>
                  );
                })
              )}
            </div>
          )}

          {/* Draft Queue Item Cards */}
          {draftQueue.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {draftQueue.map((item, idx) => {
                const colorConfig = HOLD_COLORS[item.holdColour] || HOLD_COLORS.Yellow;
                const fileInputId = `bulk-photo-${item.id}`;
                const startNum = archiveExisting ? 1 : existingActiveInArea.length + 1;
                const itemCompNumber = item.compNumber ?? (startNum + idx);

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2.5 transition-all"
                  >
                    {/* Position Number & Hold Swatch */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-center font-mono text-xs font-bold text-slate-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`w-3.5 h-3.5 rounded-full shadow-sm ${
                            item.holdColour.toLowerCase() === 'white' ? 'border border-slate-400' : ''
                          }`}
                          style={{ backgroundColor: colorConfig.hex }}
                          title={item.holdColour}
                        />
                        <span className="text-xs font-semibold text-slate-200">{item.holdColour}</span>
                        {isCompClimbs || item.isComp || item.compNumber !== undefined ? (
                          <div className="flex items-center gap-0.5 bg-amber-950/80 text-amber-300 rounded border border-amber-500/50 px-1 py-0.5 shadow-inner">
                            <span className="text-[10px] font-mono font-bold text-amber-400">#</span>
                            <input
                              type="number"
                              min="1"
                              max="200"
                              value={item.compNumber ?? (startNum + idx)}
                              onChange={(e) => handleUpdateCompNumber(item.id, parseInt(e.target.value, 10))}
                              className="w-8 bg-transparent text-amber-300 font-mono font-bold text-xs text-center outline-none"
                              title="Edit problem number"
                            />
                          </div>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold text-xs border border-slate-700">
                            {item.grade}
                          </span>
                        )}
                      </div>

                      {/* Inline Note */}
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                        placeholder="Add note..."
                        className="bg-transparent text-xs text-slate-300 placeholder:text-slate-600 outline-none flex-1 min-w-[90px] border-b border-transparent focus:border-slate-600 px-1"
                      />
                    </div>

                    {/* Right Controls: Photo, Up/Down, Duplicate, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Photo Attachment */}
                      {item.imageDataUrl ? (
                        <div className="relative group">
                          <img
                            src={item.imageDataUrl}
                            alt="Preview"
                            className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(item.id)}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] font-bold"
                            title="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor={fileInputId}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Attach photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <input
                            id={fileInputId}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoUpload(item.id, e)}
                            className="hidden"
                          />
                        </label>
                      )}

                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 transition-colors"
                        title="Move clockwise earlier"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === draftQueue.length - 1}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 transition-colors"
                        title="Move clockwise later"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicate(item, idx)}
                        className="p-1 rounded-lg text-slate-500 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                        title="Duplicate climb"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Remove climb"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-300">Wall sequence is empty</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Pick hold colours and grades above, or paste your setter notes to rapidly build the clockwise sequence.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer / Save Action */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 active-press transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSubmitting || draftQueue.length === 0}
            style={{ backgroundColor: activeColor, color: '#000000' }}
            className="py-2.5 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active-press transition-all shadow-lg disabled:opacity-40"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isSubmitting
                ? 'Saving Wall Set...'
                : `Save All (${draftQueue.length} ${draftQueue.length === 1 ? 'Climb' : 'Climbs'})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
