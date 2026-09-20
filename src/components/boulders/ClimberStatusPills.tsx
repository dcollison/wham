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

        let badgeBg = 'bg-slate-800/80 border-slate-700/60 text-slate-400';
        let icon = <Minus className="w-2.5 h-2.5 opacity-40 shrink-0" />;
        let label = climber.display_name;
        let detail = '';

        if (attempt?.status === 'flashed') {
          badgeBg = 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold';
          icon = <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />;
          detail = 'F';
        } else if (attempt?.status === 'sent') {
          badgeBg = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-semibold';
          icon = <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3] shrink-0" />;
          detail = `S${attempt.attempt_count}`;
        } else if (attempt?.status === 'attempted') {
          badgeBg = 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-medium';
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
            className={`inline-flex items-center gap-1 rounded-md border leading-tight whitespace-nowrap transition-all ${
              size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]'
            } ${badgeBg} ${
              isCurrent ? 'ring-1 ring-amber-400/50' : ''
            } ${
              isClickable ? 'cursor-pointer hover:brightness-125 hover:border-slate-500 active:scale-95' : ''
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
