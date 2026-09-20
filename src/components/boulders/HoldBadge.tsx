import React from 'react';
import { Grade, HOLD_COLORS } from '../../types';

interface HoldBadgeProps {
  color: string;
  grade?: Grade;
  size?: 'sm' | 'md' | 'lg';
  showGrade?: boolean;
}

export const HoldBadge: React.FC<HoldBadgeProps> = ({
  color,
  grade,
  size = 'md',
  showGrade = true
}) => {
  const config = HOLD_COLORS[color] || {
    name: color,
    bgClass: 'bg-slate-500',
    textClass: 'text-white',
    borderClass: 'border-slate-600',
    hex: '#64748B'
  };

  const isWhite = color.toLowerCase() === 'white';
  const isBlack = color.toLowerCase() === 'black';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
    lg: 'text-base px-3.5 py-1.5 gap-2.5'
  };

  const dotSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <div
      className={`inline-flex items-center font-bold rounded-xl border ${sizeClasses[size]} shadow-sm transition-all`}
      style={{
        backgroundColor: `${config.hex}16`, // 9% opacity tint of hold colour
        borderColor: `${config.hex}50`, // vibrant matching border
        boxShadow: `0 1px 4px ${config.hex}15`
      }}
    >
      {/* Prominent hold color swatch */}
      <span
        className={`rounded-full shrink-0 shadow-sm ring-1.5 ring-black/30 ${dotSizes[size]} ${
          isWhite ? 'border border-slate-300' : isBlack ? 'border border-zinc-500 ring-white/30' : ''
        }`}
        style={{ backgroundColor: config.hex }}
      />

      {/* Bold Hold Colour Name */}
      <span className="font-extrabold text-white tracking-tight">
        {color}
      </span>

      {/* High-Contrast Grade Pill */}
      {showGrade && grade && (
        <>
          <span className="text-slate-500 text-[10px]">•</span>
          <span className="font-mono font-black tracking-tight text-amber-400 bg-slate-950/80 px-1.5 py-0.5 rounded-md border border-slate-700/80 text-[11px] leading-tight shadow-inner">
            {grade}
          </span>
        </>
      )}
    </div>
  );
};
