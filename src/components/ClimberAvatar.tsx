import React from 'react';
import { Profile } from '../types';
import {
  Zap,
  Flame,
  Mountain,
  Crown,
  Target,
  Rocket,
  Trophy,
  Skull,
  Compass,
  Sparkles,
  Heart,
  Shield,
  Star,
  Award,
  Coffee,
  Footprints,
  Smile,
  Activity,
  Anchor,
  Eye
} from 'lucide-react';

export const CLIMBER_ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  flame: Flame,
  mountain: Mountain,
  crown: Crown,
  target: Target,
  rocket: Rocket,
  trophy: Trophy,
  skull: Skull,
  compass: Compass,
  sparkles: Sparkles,
  heart: Heart,
  shield: Shield,
  star: Star,
  award: Award,
  coffee: Coffee,
  footprints: Footprints,
  smile: Smile,
  activity: Activity,
  anchor: Anchor,
  eye: Eye
};

export interface ClimberAvatarProps {
  profile?: Profile | null;
  name?: string;
  avatarUrl?: string | null;
  avatarIcon?: string | null;
  accentColor?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorderRing?: boolean;
}

const sizeClasses = {
  xs: 'w-4 h-4 text-[9px]',
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-12 h-12 text-base',
  '2xl': 'w-14 h-14 text-xl'
};

const iconSizeClasses = {
  xs: 'w-2.5 h-2.5 stroke-[2.5]',
  sm: 'w-3 h-3 stroke-[2.5]',
  md: 'w-4 h-4 stroke-[2.5]',
  lg: 'w-5 h-5 stroke-[2.5]',
  xl: 'w-6 h-6 stroke-[2.5]',
  '2xl': 'w-7 h-7 stroke-[2.5]'
};

export const ClimberAvatar: React.FC<ClimberAvatarProps> = ({
  profile,
  name,
  avatarUrl,
  avatarIcon,
  accentColor,
  size = 'md',
  className = '',
  showBorderRing = false
}) => {
  const effectiveName = name || profile?.display_name || 'Climber';
  const effectiveColor = accentColor || profile?.accent_color || '#F59E0B';

  // Check icon from profile.avatar_icon or avatar_url (e.g. "icon:zap")
  const rawUrl = avatarUrl !== undefined ? avatarUrl : profile?.avatar_url;
  const rawIcon = avatarIcon !== undefined ? avatarIcon : profile?.avatar_icon;

  let iconId: string | null = null;
  if (rawIcon) {
    iconId = rawIcon.toLowerCase().trim();
  } else if (rawUrl && rawUrl.startsWith('icon:')) {
    iconId = rawUrl.replace('icon:', '').toLowerCase().trim();
  }

  const IconComp = iconId ? CLIMBER_ICON_COMPONENTS[iconId] : null;

  const ringStyle = showBorderRing
    ? { borderColor: effectiveColor, boxShadow: `0 0 0 2px ${effectiveColor}40` }
    : undefined;

  // 1. Render Lucide Climber Icon
  if (IconComp) {
    return (
      <div
        className={`rounded-full shrink-0 flex items-center justify-center font-black text-black shadow-sm transition-transform ${sizeClasses[size]} ${className}`}
        style={{
          backgroundColor: effectiveColor,
          ...ringStyle
        }}
        title={`${effectiveName} (${iconId})`}
      >
        <IconComp className={iconSizeClasses[size]} />
      </div>
    );
  }

  // 2. Render standard Image URL (e.g. Dicebear or uploaded avatar) if not an icon: URL
  if (rawUrl && rawUrl.startsWith('http')) {
    return (
      <img
        src={rawUrl}
        alt={effectiveName}
        className={`rounded-full shrink-0 object-cover border ${sizeClasses[size]} ${className}`}
        style={{
          borderColor: effectiveColor,
          ...ringStyle
        }}
      />
    );
  }

  // 3. Fallback to Display Name Initial
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-black text-black shadow-sm transition-transform ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: effectiveColor,
        ...ringStyle
      }}
      title={effectiveName}
    >
      {effectiveName.charAt(0).toUpperCase()}
    </div>
  );
};
