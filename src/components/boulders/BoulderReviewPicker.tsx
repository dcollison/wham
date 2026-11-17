import React from 'react';
import { Star } from 'lucide-react';
import { ReviewRating, GradeOpinion } from '../../types';
import {
  REVIEW_RATING_LIST,
  GRADE_OPINION_LIST,
  normalizeRating,
  normalizeGradeOpinion
} from '../../lib/reviews';

export interface BoulderReviewPickerProps {
  rating?: ReviewRating | string | null;
  gradeOpinion?: GradeOpinion | string | null;
  onRatingChange: (rating: ReviewRating | null) => void;
  onGradeOpinionChange: (gradeOpinion: GradeOpinion | null) => void;
  onClear?: () => void;
  title?: string;
  showIcon?: boolean;
  showOptionalBadge?: boolean;
  clearLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
  showHeaders?: boolean;
  qualityLabel?: string;
  gradeLabel?: string;
}

export const BoulderReviewPicker: React.FC<BoulderReviewPickerProps> = ({
  rating,
  gradeOpinion,
  onRatingChange,
  onGradeOpinionChange,
  onClear,
  title,
  showIcon = false,
  showOptionalBadge: _showOptionalBadge = false,
  clearLabel = 'Clear Review',
  size = 'md',
  className = '',
  showHeaders = true,
  qualityLabel = 'Quality',
  gradeLabel = 'Grade Feel'
}) => {
  const normRating = normalizeRating(rating);
  const normGrade = normalizeGradeOpinion(gradeOpinion);
  const hasSelection = Boolean(normRating || normGrade);
  const isSm = size === 'sm';

  return (
    <div className={`flex flex-col ${isSm ? 'gap-2.5' : 'gap-4'} ${className}`}>
      {/* Optional Top Bar (Title & Clear button) */}
      {(title || (hasSelection && onClear)) && (
        <div className="flex items-center justify-between">
          {title ? (
            <label className={`${isSm ? 'text-xs' : 'ds-label'} font-bold text-slate-300 flex items-center gap-2`}>
              {showIcon && <Star className="w-4 h-4 text-amber-400 shrink-0" />}
              <span>{title}</span>
            </label>
          ) : <span />}

          {hasSelection && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-slate-400 hover:text-rose-400 underline font-semibold transition-colors"
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}

      {/* Quality: Good / Okay / Rough */}
      <div className="flex flex-col gap-2">
        {showHeaders && (
          <span className="text-[11px] font-semibold text-slate-400">{qualityLabel}</span>
        )}
        <div className={`grid grid-cols-3 ${isSm ? 'gap-1.5' : 'gap-2'}`}>
          {REVIEW_RATING_LIST.map((ratingOpt) => {
            const isSelected = normRating === ratingOpt.value;
            return (
              <button
                key={ratingOpt.value}
                type="button"
                onClick={() => onRatingChange(isSelected ? null : ratingOpt.value)}
                className={`flex flex-col items-center justify-center transition-all active-press border ${
                  isSm ? 'py-2 px-2 rounded text-xs font-semibold gap-0.5' : 'py-2.5 px-2 rounded-md'
                } ${
                  isSelected
                    ? `${ratingOpt.activeBg} ${ratingOpt.activeBorder} ${ratingOpt.activeText} shadow-xs animate-pop`
                    : 'bg-carbon hover:bg-surface-high border-white/[0.08] text-slate-300 hover:text-white'
                }`}
              >
                <span
                  className={`font-bold select-none tracking-tight ${
                    isSm ? 'text-xs' : 'text-base mb-1'
                  } ${isSelected ? ratingOpt.activeText : 'text-slate-200'}`}
                >
                  {ratingOpt.kaomoji}
                </span>
                <span
                  className={`font-bold tracking-tight ${isSm ? 'text-[10px]' : 'text-[11px]'} ${
                    isSelected ? ratingOpt.activeText : 'text-slate-400'
                  }`}
                >
                  {ratingOpt.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade Consensus: Soft / Fair / Hard */}
      <div className={`flex flex-col gap-2 ${!isSm ? 'pt-2 border-t border-white/[0.06]' : ''}`}>
        {showHeaders && (
          <span className="text-[11px] font-semibold text-slate-400">{gradeLabel}</span>
        )}
        <div className={`grid grid-cols-3 ${isSm ? 'gap-1.5' : 'gap-2'}`}>
          {GRADE_OPINION_LIST.map((opt) => {
            const isSelected = normGrade === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onGradeOpinionChange(isSelected ? null : opt.value)}
                className={`flex items-center justify-center gap-1.5 transition-all active-press border ${
                  isSm ? 'py-2 px-2 rounded text-xs font-semibold' : 'py-2.5 px-2.5 rounded-md text-xs font-bold'
                } ${
                  isSelected
                    ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-xs animate-pop`
                    : 'bg-carbon hover:bg-surface-high border-white/[0.08] text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{opt.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
