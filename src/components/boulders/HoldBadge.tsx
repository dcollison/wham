import React from 'react';
import { Grade, getHoldCardStyle } from '../../types';
import { HoldSwatch } from './HoldSwatch';

interface HoldBadgeProps {
  color: string;
  grade?: Grade;
  isComp?: boolean;
  compNumber?: number;
  size?: 'sm' | 'md' | 'lg';
  showGrade?: boolean;
}

export const HoldBadge: React.FC<HoldBadgeProps> = ({
  color,
  grade,
  isComp = false,
  compNumber,
  size = 'md',
  showGrade = true
}) => {
  const cardStyle = getHoldCardStyle(color);

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
    lg: 'text-base px-3.5 py-1.5 gap-2.5'
  };

  const isNumberedComp = isComp || compNumber !== undefined;

  return (
    <div
      className={`inline-flex items-center font-bold rounded-xl border ${sizeClasses[size]} shadow-sm transition-all shrink-0 whitespace-nowrap`}
      style={{
        background: cardStyle.badgeBackground,
        borderColor: cardStyle.badgeBorderColor,
        boxShadow: `0 1px 5px ${cardStyle.hex}20`
      }}
    >
      {/* Prominent hold color swatch */}
      <HoldSwatch color={color} size={size} />

      {/* Bold Hold Colour Name */}
      <span className="font-extrabold text-white tracking-tight">
        {color}
      </span>

      {/* High-Contrast Grade / Number Pill */}
      {showGrade && (
        isNumberedComp ? (
          <>
            <span className="text-slate-500 text-[10px]">•</span>
            <span className="font-mono font-black tracking-tight text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded-md border border-amber-500/60 text-[11px] leading-tight shadow-inner">
              #{compNumber ?? '?'}
            </span>
          </>
        ) : grade ? (
          <>
            <span className="text-slate-500 text-[10px]">•</span>
            <span className="font-mono font-black tracking-tight text-white bg-slate-950/80 px-1.5 py-0.5 rounded-md border border-slate-700/80 text-[11px] leading-tight shadow-inner">
              {grade}
            </span>
          </>
        ) : null
      )}
    </div>
  );
};
