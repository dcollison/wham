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
    sm: 'text-xs px-3 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5'
  };

  const isNumberedComp = isComp || compNumber !== undefined;

  return (
    <div
      className={`inline-flex items-center font-bold rounded-full border ${sizeClasses[size]} shadow-xs transition-all shrink-0 whitespace-nowrap`}
      style={{
        background: cardStyle.badgeBackground,
        borderColor: cardStyle.badgeBorderColor,
        boxShadow: `0 1px 8px ${cardStyle.hex}18`
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
            <span className="text-slate-500/80 text-[10px]">•</span>
            <span className="font-mono font-black tracking-tight text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50 text-[11px] leading-tight shadow-xs">
              #{compNumber ?? '?'}
            </span>
          </>
        ) : grade ? (
          <>
            <span className="text-slate-500/80 text-[10px]">•</span>
            <span className="font-mono font-black tracking-tight text-white bg-slate-950/80 px-2 py-0.5 rounded-full border border-white/10 text-[11px] leading-tight shadow-xs">
              {grade}
            </span>
          </>
        ) : null
      )}
    </div>
  );
};
