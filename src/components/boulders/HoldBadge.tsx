import React from 'react';
import { Grade, getHoldCardStyle } from '../../types';
import { HoldSwatch } from './HoldSwatch';

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
  const cardStyle = getHoldCardStyle(color);

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
    lg: 'text-base px-3.5 py-1.5 gap-2.5'
  };

  return (
    <div
      className={`inline-flex items-center font-bold rounded-xl border ${sizeClasses[size]} shadow-sm transition-all`}
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

      {/* High-Contrast Grade Pill */}
      {showGrade && grade && (
        <>
          <span className="text-slate-500 text-[10px]">•</span>
          <span className="font-mono font-black tracking-tight text-white bg-slate-950/80 px-1.5 py-0.5 rounded-md border border-slate-700/80 text-[11px] leading-tight shadow-inner">
            {grade}
          </span>
        </>
      )}
    </div>
  );
};
