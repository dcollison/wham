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

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
    lg: 'text-base px-3.5 py-1.5 gap-2.5'
  };

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <div
      className={`inline-flex items-center font-bold rounded-full border border-slate-700/60 bg-slate-900/90 text-slate-100 ${sizeClasses[size]} shadow-sm`}
    >
      {/* Color swatch dot */}
      <span
        className={`rounded-full shrink-0 ${dotSizes[size]} ${isWhite ? 'border border-slate-400' : ''}`}
        style={{ backgroundColor: config.hex }}
      />
      <span className="font-semibold text-slate-200">{color}</span>
      {showGrade && grade && (
        <>
          <span className="text-slate-500">•</span>
          <span className="font-mono font-black tracking-tight text-amber-400">
            {grade}
          </span>
        </>
      )}
    </div>
  );
};
