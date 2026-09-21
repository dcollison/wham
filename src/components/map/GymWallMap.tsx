import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Boulder, Attempt, Profile, Gym, GymArea, HOLD_COLORS } from '../../types';
import { MapPin, WallSegment } from '../../types/map';
import { getGymMapConfig, calculateWallPins } from '../../lib/gymMapData';
import { HoldBadge } from '../boulders/HoldBadge';
import { ClimberStatusPills } from '../boulders/ClimberStatusPills';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  MapPin as MapPinIcon,
  ChevronRight,
  Zap,
  Check,
  Clock,
  Layers
} from 'lucide-react';

interface GymWallMapProps {
  gym: Gym | null;
  areas: GymArea[];
  currentArea: GymArea | null;
  onSelectArea: (area: GymArea | null) => void;
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  currentUserId?: string;
  onQuickLog: (boulder: Boulder, targetUserId?: string) => void;
  onSelectBoulder: (boulder: Boulder) => void;
}

export const GymWallMap: React.FC<GymWallMapProps> = ({
  gym,
  areas,
  currentArea,
  onSelectArea,
  boulders,
  attempts,
  climbers,
  currentUserId,
  onQuickLog,
  onSelectBoulder
}) => {
  const mapConfig = useMemo(() => {
    return getGymMapConfig(gym?.id || gym?.name);
  }, [gym?.id, gym?.name]);

  const activeClimber = climbers.find((c) => c.id === currentUserId);
  const activeColor = activeClimber?.accent_color || '#3B82F6';

  // Map viewport transform (zoom and pan)
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map display settings
  const [showBlueprint, setShowBlueprint] = useState<boolean>(true);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [hoveredWall, setHoveredWall] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset viewport when gym changes
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSelectedPin(null);
  }, [gym?.id]);

  // When currentArea changes externally, focus on it if specific
  useEffect(() => {
    if (!currentArea || !mapConfig) return;
    const matchedWall = mapConfig.walls.find(
      (w) => w.areaId === currentArea.id || w.areaName.toLowerCase() === currentArea.name.toLowerCase()
    );
    if (matchedWall) {
      // Smoothly pan towards the sector centroid
      const centerX = mapConfig.width / 2;
      const centerY = mapConfig.height / 2;
      const targetPanX = (centerX - matchedWall.labelPos.x) * 0.5;
      const targetPanY = (centerY - matchedWall.labelPos.y) * 0.5;
      setPan({ x: targetPanX, y: targetPanY });
      setScale(1.25);
    }
  }, [currentArea?.id, mapConfig]);

  // Compute pins for each wall segment
  const wallPinsData = useMemo(() => {
    if (!mapConfig) return [];
    return mapConfig.walls.map((wall) => {
      // Find matching database area
      const dbArea = areas.find(
        (a) => a.id === wall.areaId || a.name.toLowerCase() === wall.areaName.toLowerCase()
      );
      const isSelected = currentArea ? dbArea?.id === currentArea.id : true;
      const pins = calculateWallPins(
        { ...wall, areaId: dbArea?.id || wall.areaId },
        boulders,
        attempts,
        currentUserId
      );

      return {
        wall,
        dbArea,
        isSelected,
        pins
      };
    });
  }, [mapConfig, areas, currentArea, boulders, attempts, currentUserId]);

  // All visible pins across walls
  const allPins = useMemo(() => {
    return wallPinsData.flatMap((w) => w.pins);
  }, [wallPinsData]);

  // Mouse & Touch Pan/Zoom Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...pan };
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / touchStartRef.current.dist;
      setScale((prev) => Math.min(3, Math.max(0.7, prev * factor)));
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchStartRef.current.dist = undefined;
  };

  const handleZoomIn = () => setScale((s) => Math.min(3, s + 0.25));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, s - 0.25));
  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSelectedPin(null);
  };

  const handleAreaClick = (dbArea: GymArea | undefined, wall: WallSegment) => {
    if (dbArea) {
      if (currentArea?.id === dbArea.id) {
        onSelectArea(null); // Toggle back to all areas
      } else {
        onSelectArea(dbArea);
      }
    }
  };

  if (!mapConfig) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
        No map available for this gym yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Map Control Bar: Area Selector Chips & Tool Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-sm">
        {/* Area Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            type="button"
            onClick={() => onSelectArea(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active-press ${
              !currentArea
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            All Walls ({allPins.length})
          </button>

          {mapConfig.walls.map((wall) => {
            const dbArea = areas.find(
              (a) => a.id === wall.areaId || a.name.toLowerCase() === wall.areaName.toLowerCase()
            );
            const isSelected = currentArea && dbArea?.id === currentArea.id;
            const wallClimbCount = boulders.filter(
              (b) => !b.is_archived && (b.area_id === dbArea?.id || b.area_id === wall.areaName)
            ).length;

            return (
              <button
                key={wall.areaId}
                type="button"
                onClick={() => onSelectArea(dbArea || null)}
                style={isSelected ? { backgroundColor: activeColor, color: '#000000' } : undefined}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active-press flex items-center gap-1.5 ${
                  isSelected
                    ? 'font-black shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{wall.areaName}</span>
                <span className="font-mono text-[10px] opacity-75">({wallClimbCount})</span>
              </button>
            );
          })}
        </div>

        {/* View Controls: Blueprint toggle, Zoom, Reset */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowBlueprint(!showBlueprint)}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              showBlueprint ? 'text-amber-400 bg-slate-850' : 'text-slate-400 hover:text-white'
            }`}
            title={showBlueprint ? 'Hide Blueprint Diagram' : 'Show Blueprint Diagram'}
          >
            {showBlueprint ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">Blueprint</span>
          </button>

          <div className="w-px h-3.5 bg-slate-800 mx-0.5" />

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Map Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full aspect-[4/3.5] sm:aspect-[16/11] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl select-none touch-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <svg
          viewBox={mapConfig.viewBox}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          <defs>
            {/* Split Bee Hold Swatch Gradient (Yellow / Black 50/50) */}
            <linearGradient id="beeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor="#DDA82B" />
              <stop offset="50%" stopColor="#27272A" />
            </linearGradient>

            {/* Glowing Accent Filter for Active Wall */}
            <filter id="wallGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={activeColor} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Layer 1: Optional Big Rock Blueprint Image Overlay */}
          {showBlueprint && mapConfig.imagePath && (
            <image
              href={mapConfig.imagePath}
              x="0"
              y="0"
              width={mapConfig.width}
              height={mapConfig.height}
              opacity="0.38"
              preserveAspectRatio="none"
            />
          )}

          {/* Layer 2: Wall Mat/Sector Polygons (Clickable & Hoverable) */}
          {wallPinsData.map(({ wall, dbArea, isSelected }) => {
            const isHovered = hoveredWall === wall.areaId;
            const isAreaActive = currentArea && (dbArea?.id === currentArea.id || wall.areaId === currentArea.id);

            return (
              <g
                key={`mat-${wall.areaId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAreaClick(dbArea, wall);
                }}
                onMouseEnter={() => setHoveredWall(wall.areaId)}
                onMouseLeave={() => setHoveredWall(null)}
                className="cursor-pointer transition-all"
              >
                {wall.polygonD && (
                  <path
                    d={wall.polygonD}
                    fill={
                      isAreaActive
                        ? `${activeColor}25`
                        : isHovered
                        ? 'rgba(51, 65, 85, 0.4)'
                        : 'rgba(30, 41, 59, 0.25)'
                    }
                    stroke={
                      isAreaActive
                        ? activeColor
                        : isHovered
                        ? '#94A3B8'
                        : 'rgba(71, 85, 105, 0.4)'
                    }
                    strokeWidth={isAreaActive ? 3 : 1.5}
                    strokeDasharray={isAreaActive ? 'none' : '4 3'}
                    filter={isAreaActive ? 'url(#wallGlow)' : undefined}
                    className="transition-colors duration-200"
                  />
                )}
              </g>
            );
          })}

          {/* Layer 3: Clockwise Perimeter Wall Lines */}
          {wallPinsData.map(({ wall, dbArea }) => {
            const isAreaActive = currentArea && (dbArea?.id === currentArea.id || wall.areaId === currentArea.id);

            return (
              <path
                key={`wall-${wall.areaId}`}
                d={wall.pathD}
                fill="none"
                stroke={isAreaActive ? activeColor : '#64748B'}
                strokeWidth={isAreaActive ? 4.5 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={currentArea && !isAreaActive ? 0.35 : 0.9}
                className="pointer-events-none transition-all duration-200"
              />
            );
          })}

          {/* Layer 4: Sector Labels */}
          {wallPinsData.map(({ wall, dbArea }) => {
            const isAreaActive = currentArea && (dbArea?.id === currentArea.id || wall.areaId === currentArea.id);
            const isHovered = hoveredWall === wall.areaId;

            return (
              <g
                key={`label-${wall.areaId}`}
                transform={`translate(${wall.labelPos.x}, ${wall.labelPos.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAreaClick(dbArea, wall);
                }}
                className="cursor-pointer select-none"
              >
                {/* Background pill behind label */}
                <rect
                  x="-75"
                  y="-14"
                  width="150"
                  height="28"
                  rx="14"
                  fill="rgba(11, 15, 25, 0.85)"
                  stroke={isAreaActive ? activeColor : isHovered ? '#94A3B8' : 'rgba(51, 65, 85, 0.7)'}
                  strokeWidth={isAreaActive ? 2 : 1}
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={isAreaActive ? activeColor : '#F8FAFC'}
                  fontSize="11"
                  fontWeight="800"
                  fontFamily="'Space Mono', monospace"
                  className="tracking-wider"
                >
                  {wall.areaName.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Layer 5: Equidistant Climb Pins along Perimeter */}
          {wallPinsData.map(({ pins, isSelected }) => {
            if (!isSelected && currentArea) return null;

            return pins.map((pin) => {
              const isSelectedClimb = selectedPin?.boulder.id === pin.boulder.id;
              const isBee = pin.boulder.hold_colour.toLowerCase() === 'bee';
              const config = HOLD_COLORS[pin.boulder.hold_colour];
              const holdHex = config?.hex || '#64748B';

              // Status ring color
              let ringColor = 'rgba(148, 163, 184, 0.6)'; // untried
              let ringWidth = 2;
              let isSent = false;
              let isFlashed = false;

              if (pin.userAttempt?.status === 'flashed') {
                ringColor = '#F59E0B'; // amber flash
                ringWidth = 3;
                isFlashed = true;
              } else if (pin.userAttempt?.status === 'sent') {
                ringColor = '#10B981'; // emerald sent
                ringWidth = 3;
                isSent = true;
              } else if (pin.userAttempt?.status === 'attempted') {
                ringColor = '#3B82F6'; // blue project
                ringWidth = 2.5;
              }

              return (
                <g
                  key={`pin-${pin.boulder.id}`}
                  transform={`translate(${pin.x}, ${pin.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPin(pin);
                  }}
                  className="cursor-pointer transition-transform hover:scale-125"
                >
                  {/* Outer selection pulse glow */}
                  {isSelectedClimb && (
                    <circle
                      r="20"
                      fill="none"
                      stroke={activeColor}
                      strokeWidth="2.5"
                      className="animate-ping opacity-60"
                    />
                  )}

                  {/* Outer Status Ring */}
                  <circle
                    r={isSelectedClimb ? 16 : 13}
                    fill="#0F172A"
                    stroke={isSelectedClimb ? '#FFFFFF' : ringColor}
                    strokeWidth={isSelectedClimb ? 3.5 : ringWidth}
                    className="transition-all"
                  />

                  {/* Inner Hold Color Swatch Circle */}
                  <circle
                    r={isSelectedClimb ? 10 : 8}
                    fill={isBee ? 'url(#beeGradient)' : holdHex}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                  />

                  {/* Position Order # Label */}
                  <text
                    x="0"
                    y={isSelectedClimb ? 26 : 22}
                    textAnchor="middle"
                    fill="#F1F5F9"
                    fontSize="9"
                    fontWeight="800"
                    fontFamily="'Space Mono', monospace"
                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  >
                    #{pin.order}
                  </text>

                  {/* Mini flash/sent icon badge if accomplished */}
                  {isFlashed && (
                    <circle cx="7" cy="-7" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="1" />
                  )}
                  {isSent && !isFlashed && (
                    <circle cx="7" cy="-7" r="4.5" fill="#10B981" stroke="#0F172A" strokeWidth="1" />
                  )}
                </g>
              );
            });
          })}
        </svg>

        {/* Floating Quick Action Card for Selected Pin */}
        {selectedPin && (
          <div
            className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 bg-slate-900/95 border border-slate-700/90 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-200 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Order, HoldBadge, Area, Close button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 tabular-nums">
                  #{selectedPin.order}
                </span>
                <HoldBadge
                  color={selectedPin.boulder.hold_colour}
                  grade={selectedPin.boulder.grade}
                  size="sm"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="text-xs text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Climber Status Pills */}
            <div className="pt-0.5">
              <ClimberStatusPills
                climbers={climbers}
                attempts={attempts}
                currentUserId={currentUserId}
                size="sm"
                onClimberClick={(climberId) => onQuickLog(selectedPin.boulder, climberId)}
              />
            </div>

            {/* Action buttons: Quick Log and Details */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onQuickLog(selectedPin.boulder, currentUserId)}
                style={{ backgroundColor: activeColor, color: '#000000' }}
                className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active-press"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Log Send</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectBoulder(selectedPin.boulder)}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center justify-center gap-1 active-press"
              >
                <span>Beta Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend & Navigation Help */}
      <div className="flex items-center justify-between px-2 text-[11px] text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Flashed</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Sent</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Project</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>Untried</span>
          </span>
        </div>

        <span className="text-slate-500">Pinch or drag to explore • Tap sector to filter</span>
      </div>
    </div>
  );
};
