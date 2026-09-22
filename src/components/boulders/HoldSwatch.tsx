import React from 'react';
import { HOLD_COLORS } from '../../types';

interface HoldSwatchProps {
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a crisp hold color swatch dot.
 * Uses exact vector SVG geometry for dual-tone Bee holds (50/50 vertical split yellow/black)
 * to guarantee zero gradient antialiasing bleed, zero tiling artifacts, and pixel-sharp rendering.
 */
export const HoldSwatch: React.FC<HoldSwatchProps> = ({
  color,
  size = 'sm',
  className = '',
  style
}) => {
  const safeColor = typeof color === 'string' && color ? color : 'Yellow';
  const isBee = safeColor.toLowerCase() === 'bee';
  const isWhite = safeColor.toLowerCase() === 'white';
  const isBlack = safeColor.toLowerCase() === 'black';

  const sizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size] || 'w-3 h-3';

  if (isBee) {
    return (
      <svg
        viewBox="0 0 16 16"
        className={`${sizeClasses} shrink-0 rounded-full overflow-hidden shadow-xs select-none ${className}`}
        style={style}
        aria-label="Bee hold color (half yellow, half black)"
      >
        {/* Left half: Pure Yellow */}
        <path d="M8 0 A8 8 0 0 0 8 16 Z" fill="#DDA82B" />
        {/* Right half: Pure Black */}
        <path d="M8 0 A8 8 0 0 1 8 16 Z" fill="#18181B" />
        {/* Crisp enclosing rim border */}
        <circle cx="8" cy="8" r="7.5" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
      </svg>
    );
  }

  const hex = HOLD_COLORS[safeColor]?.hex || '#64748B';

  return (
    <span
      className={`${sizeClasses} rounded-full shrink-0 shadow-xs select-none ${
        isWhite
          ? 'border border-slate-300'
          : isBlack
          ? 'border border-zinc-600'
          : 'border border-black/35'
      } ${className}`}
      style={{
        backgroundColor: hex,
        ...style
      }}
      aria-label={`${color} hold color`}
    />
  );
};
