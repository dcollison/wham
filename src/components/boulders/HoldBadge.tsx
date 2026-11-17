import React from 'react';
import { Grade, getHoldCardStyle } from '../../types';
import { HoldSwatch } from './HoldSwatch';

interface HoldBadgeProps {
  color: string;
  grade?: Grade;
  isComp?: boolean;
  compNumber?: number | null;
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
    sm: 'text-xs py-1 gap-1.5',
    md: 'text-sm py-1.5 gap-2',
    lg: 'text-base py-2 gap-2.5'
  };

  const hasCompNumber = compNumber !== undefined && compNumber !== null;
  const isNumberedComp = hasCompNumber && Boolean(isComp || !grade);
  const isUngradedCompWithoutNum = Boolean(isComp) && !hasCompNumber && !grade;
  const hasTrailingPill = showGrade && (isNumberedComp || isUngradedCompWithoutNum || Boolean(grade));

  const paddingClasses = {
    sm: hasTrailingPill ? 'pl-2.5 pr-1.5' : 'px-3',
    md: hasTrailingPill ? 'pl-3 pr-1.5' : 'px-3.5',
    lg: hasTrailingPill ? 'pl-3.5 pr-2' : 'px-4'
  };

  return (
    <div
      className={`inline-flex items-center font-bold rounded-full border ${sizeClasses[size]} ${paddingClasses[size]} shadow-xs transition-all shrink-0 whitespace-nowrap`}
      style={{
        background: cardStyle.badgeBackground,
        borderColor: cardStyle.badgeBorderColor
      }}
    >
      {/* Prominent hold color swatch */}
      <HoldSwatch color={color} size={size} />

      {/* Bold Hold Colour Name */}
      <span className="font-bold text-white tracking-tight">
        {color}
      </span>

      {/* High-Contrast Grade / Number Pill */}
      {showGrade && (
        isNumberedComp ? (
          <>
            <span className="text-slate-400 text-[10px]" aria-hidden="true">•</span>
            <span className="font-mono tabular-nums font-bold tracking-tight text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50 text-[11px] leading-tight">
              #{compNumber}
            </span>
          </>
        ) : isUngradedCompWithoutNum ? (
          <>
            <span className="text-slate-400 text-[10px]" aria-hidden="true">•</span>
            <span className="font-mono tabular-nums font-bold tracking-tight text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50 text-[11px] leading-tight">
              #?
            </span>
          </>
        ) : grade ? (
          <>
            <span className="text-slate-400 text-[10px]" aria-hidden="true">•</span>
            <span className="font-mono tabular-nums font-bold tracking-tight text-white bg-carbon/90 px-2 py-0.5 rounded-full border border-white/10 text-[11px] leading-tight">
              {grade}
            </span>
          </>
        ) : null
      )}
    </div>
  );
};
