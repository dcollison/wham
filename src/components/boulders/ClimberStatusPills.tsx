import React from 'react';
import { Attempt, Profile } from '../../types';
import { ClimberAvatar } from '../ClimberAvatar';
import { Zap, Check, Clock, Minus } from 'lucide-react';

interface ClimberStatusPillsProps {
  climbers: Profile[];
  attempts: Attempt[];
  currentUserId?: string;
  size?: 'sm' | 'md';
  onClimberClick?: (climberId: string) => void;
}

export const ClimberStatusPills: React.FC<ClimberStatusPillsProps> = ({
  climbers,
  attempts,
  currentUserId,
  size = 'sm',
  onClimberClick
}) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {climbers.map((climber) => {
        const attempt = attempts.find(a => a.user_id === climber.id);
        const isCurrent = climber.id === currentUserId;
        const isClickable = Boolean(onClimberClick);

        let badgeBg = 'bg-slate-800/70 border-white/[0.06] text-slate-400';
        let icon = <Minus className="w-2.5 h-2.5 opacity-40 shrink-0" />;
        let label = climber.display_name;
        let detail = '';

        if (attempt?.status === 'flashed') {
          badgeBg = 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold';
          icon = <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />;
          detail = 'F';
        } else if (attempt?.status === 'sent') {
          badgeBg = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold';
          icon = <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3] shrink-0" />;
          detail = `S${attempt.attempt_count}`;
        } else if (attempt?.status === 'attempted') {
          badgeBg = 'bg-blue-500/15 border-blue-500/40 text-blue-300 font-medium';
          icon = <Clock className="w-2.5 h-2.5 text-blue-400 shrink-0" />;
          detail = `P${attempt.attempt_count}`;
        }

        const statusText = attempt?.status === 'flashed'
          ? 'Flashed (1 try)'
          : attempt?.status === 'sent'
          ? `Sent (${attempt.attempt_count} tries)`
          : attempt?.status === 'attempted'
          ? `Projecting (${attempt.attempt_count} tries)`
          : 'Untried';

        return (
          <div
            key={climber.id}
            onClick={(e) => {
              if (onClimberClick) {
                e.stopPropagation();
                onClimberClick(climber.id);
              }
            }}
            title={`${climber.display_name}: ${statusText}${isClickable ? ' (Click to log)' : ''}`}
            style={isCurrent ? { boxShadow: `0 0 0 1.5px ${climber.accent_color || '#E59846'}` } : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border leading-tight whitespace-nowrap shrink-0 transition-all ${
              size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-1 text-[11px]'
            } ${badgeBg} ${
              isClickable ? 'cursor-pointer hover:brightness-110 active-press' : ''
            }`}
          >
            {size === 'md' && <ClimberAvatar profile={climber} size="xs" />}
            <span className="font-semibold tracking-tight">{label}</span>
            {icon}
            {detail && <span className="font-mono text-[10px] font-bold">{detail}</span>}
          </div>
        );
      })}
    </div>
  );
};
