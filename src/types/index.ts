export type Grade =
  | 'VB'
  | 'V0'
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'V9'
  | 'V10+';

export const GRADES: Grade[] = [
  'VB',
  'V0',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'V7',
  'V8',
  'V9',
  'V10+'
];

export type AttemptStatus = 'flashed' | 'sent' | 'attempted';

/**
 * Automatically determine attempt status from whether it was sent and the number of tries:
 * - Sent + 1 try  -> flashed
 * - Sent + 2+ tries -> sent
 * - Not sent      -> attempted (projecting)
 */
export function determineAttemptStatus(isSent: boolean, tries: number): AttemptStatus {
  if (isSent) {
    return tries <= 1 ? 'flashed' : 'sent';
  }
  return 'attempted';
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  avatar_icon?: string | null;
  accent_color?: string | null;
  created_at?: string;
}

export interface Gym {
  id: string;
  name: string;
  created_at?: string;
}

export interface GymArea {
  id: string;
  gym_id: string;
  name: string;
  sort_order: number;
  image_url?: string | null;
  is_comp_wall?: boolean;
  created_at?: string;
}

export interface Boulder {
  id: string;
  gym_id: string;
  area_id: string;
  hold_colour: string;
  grade: Grade;
  position_order: number;
  notes?: string | null;
  image_url?: string | null;
  date_added: string;
  is_archived: boolean;
  created_by?: string | null;
  created_at?: string;
  // Comp problem fields (numbered climbs #1 - #N on comp walls)
  is_comp?: boolean;
  comp_number?: number;
  // Computed / joined fields for convenient UI usage
  display_order?: number;
  adjacent_prev?: { hold_colour: string; grade: Grade; is_comp?: boolean; comp_number?: number } | null;
  adjacent_next?: { hold_colour: string; grade: Grade; is_comp?: boolean; comp_number?: number } | null;
}

export interface BulkAddBoulderItem {
  id?: string;
  holdColour: string;
  grade: Grade;
  notes?: string;
  imageFile?: File | null;
  imageDataUrl?: string | null;
  isComp?: boolean;
  compNumber?: number;
}

export interface BulkAddBouldersParams {
  gymId: string;
  areaId: string;
  boulders: BulkAddBoulderItem[];
  archiveExistingAreaBoulders?: boolean;
  dateAdded?: string;
  isCompWall?: boolean;
}

export interface CompWallScorecardItem {
  boulder: Boulder;
  compNumber: number;
  userAttempts: Record<string, { status: AttemptStatus; attemptCount: number; points: number }>;
}

export interface CompWallStanding {
  climber: Profile;
  rank: number;
  totalPoints: number;
  topsCount: number;
  flashesCount: number;
  attemptsOnTops: number;
  highestTopNumber: number | null;
  completedBoulders: Array<{ boulderId: string; compNumber: number; points: number; isFlash: boolean; attempts: number }>;
}

export interface Attempt {
  id: string;
  boulder_id: string;
  user_id: string;
  status: AttemptStatus;
  attempt_count: number;
  logged_at: string;
  profile?: Profile;
}

export interface Comment {
  id: string;
  boulder_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export interface HoldColorConfig {
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;
  isBee?: boolean;
  isStriped?: boolean;
}

export const HOLD_COLORS: Record<string, HoldColorConfig> = {
  Yellow: { name: 'Yellow', bgClass: 'bg-amber-400', textClass: 'text-amber-950', borderClass: 'border-amber-500', hex: '#E5B83B' },
  Mint: { name: 'Mint', bgClass: 'bg-emerald-300', textClass: 'text-emerald-950', borderClass: 'border-emerald-400', hex: '#5ECE9D' },
  Green: { name: 'Green', bgClass: 'bg-green-600', textClass: 'text-white', borderClass: 'border-green-700', hex: '#32A378' },
  Orange: { name: 'Orange', bgClass: 'bg-orange-500', textClass: 'text-white', borderClass: 'border-orange-600', hex: '#E07638' },
  Blue: { name: 'Blue', bgClass: 'bg-blue-600', textClass: 'text-white', borderClass: 'border-blue-700', hex: '#4682D7' },
  Purple: { name: 'Purple', bgClass: 'bg-purple-600', textClass: 'text-white', borderClass: 'border-purple-700', hex: '#8B6BD6' },
  Red: { name: 'Red', bgClass: 'bg-red-600', textClass: 'text-white', borderClass: 'border-red-700', hex: '#D85454' },
  Pink: { name: 'Pink', bgClass: 'bg-pink-500', textClass: 'text-white', borderClass: 'border-pink-600', hex: '#D45C8E' },
  Black: { name: 'Black', bgClass: 'bg-zinc-900', textClass: 'text-white', borderClass: 'border-zinc-700', hex: '#27272A' },
  White: { name: 'White', bgClass: 'bg-slate-100', textClass: 'text-slate-900', borderClass: 'border-slate-300', hex: '#E2E8F0' },
  Bee: {
    name: 'Bee',
    bgClass: 'bg-yellow-400',
    textClass: 'text-black',
    borderClass: 'border-zinc-900',
    hex: '#DDA82B',
    isBee: true,
    isStriped: false
  },
  Wood: { name: 'Wood', bgClass: 'bg-amber-800', textClass: 'text-white', borderClass: 'border-amber-900', hex: '#8C4E26' }
};

/**
 * Helper to get CSS style for a hold color swatch (dot/circle/pill).
 * Handles special hold colors like Bee (split into one yellow area and one black area, no stripes).
 */
export function getHoldSwatchStyle(colorName: string): React.CSSProperties {
  const isBee = colorName.toLowerCase() === 'bee';
  if (isBee) {
    return {
      background: 'linear-gradient(90deg, #DDA82B 0% 50%, #18181B 50% 100%)',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%'
    };
  }
  const config = HOLD_COLORS[colorName];
  return {
    backgroundColor: config?.hex || '#64748B'
  };
}

/**
 * Helper to get card background/border styling for a hold.
 */
export function getHoldCardStyle(colorName: string): {
  accentBarBackground: string;
  gradientBackground: string;
  borderLeftColor: string;
  badgeBackground: string;
  badgeBorderColor: string;
  hex: string;
} {
  const isBee = colorName.toLowerCase() === 'bee';
  if (isBee) {
    return {
      accentBarBackground: 'linear-gradient(180deg, #DDA82B 0%, #DDA82B 50%, #27272A 50%, #27272A 100%)',
      gradientBackground: 'linear-gradient(90deg, rgba(221, 168, 43, 0.18) 0%, rgba(39, 39, 42, 0.4) 14%, rgba(15, 23, 42, 0.95) 26%, rgba(15, 23, 42, 0.92) 100%)',
      borderLeftColor: '#DDA82B',
      badgeBackground: 'linear-gradient(135deg, rgba(221, 168, 43, 0.25) 0%, rgba(221, 168, 43, 0.25) 50%, rgba(39, 39, 42, 0.6) 50%, rgba(39, 39, 42, 0.6) 100%)',
      badgeBorderColor: '#DDA82B',
      hex: '#DDA82B'
    };
  }

  const config = HOLD_COLORS[colorName] || { hex: '#64748B' };
  const hex = config.hex;
  return {
    accentBarBackground: hex,
    gradientBackground: `linear-gradient(90deg, ${hex}14 0%, rgba(15, 23, 42, 0.95) 26%, rgba(15, 23, 42, 0.92) 100%)`,
    borderLeftColor: hex,
    badgeBackground: `${hex}12`,
    badgeBorderColor: `${hex}40`,
    hex
  };
}

export interface ClimberStats {
  profile: Profile;
  totalSends: number;
  totalFlashes: number;
  totalAttempts: number;
  flashRate: number; // percentage
  sendRate: number; // percentage
  averageAttemptsOnSend: number;
  hardestSend: Grade | null;
  gradeCounts: Record<Grade, { sent: number; flashed: number; attempted: number }>;
}

export interface ClimberColorConfig {
  name: string;
  bg: string;
  text: string;
  hex: string;
  border: string;
  ring: string;
  badgeBg: string;
}

export const CLIMBER_ACCENT_PALETTE: ClimberColorConfig[] = [
  { name: 'Terracotta', bg: 'bg-amber-500/90', text: 'text-amber-300', hex: '#E58C56', border: 'border-amber-500/60', ring: 'ring-amber-500/70', badgeBg: 'bg-amber-500/15' },
  { name: 'Warm Amber', bg: 'bg-amber-400', text: 'text-amber-300', hex: '#EAA838', border: 'border-amber-400/60', ring: 'ring-amber-400/70', badgeBg: 'bg-amber-400/15' },
  { name: 'Sage Olive', bg: 'bg-emerald-500', text: 'text-emerald-300', hex: '#82A77D', border: 'border-emerald-500/60', ring: 'ring-emerald-500/70', badgeBg: 'bg-emerald-500/15' },
  { name: 'Mineral Sky', bg: 'bg-cyan-500', text: 'text-cyan-300', hex: '#529DBB', border: 'border-cyan-500/60', ring: 'ring-cyan-500/70', badgeBg: 'bg-cyan-500/15' },
  { name: 'Lilac', bg: 'bg-purple-400', text: 'text-purple-300', hex: '#9D85D6', border: 'border-purple-400/60', ring: 'ring-purple-400/70', badgeBg: 'bg-purple-400/15' },
  { name: 'Dusty Rose', bg: 'bg-rose-400', text: 'text-rose-300', hex: '#D97086', border: 'border-rose-400/60', ring: 'ring-rose-400/70', badgeBg: 'bg-rose-400/15' },
  { name: 'Emerald', bg: 'bg-emerald-400', text: 'text-emerald-300', hex: '#429C7A', border: 'border-emerald-400/60', ring: 'ring-emerald-400/70', badgeBg: 'bg-emerald-400/15' },
  { name: 'Electric Lime', bg: 'bg-lime-400', text: 'text-lime-300', hex: '#88B832', border: 'border-lime-400/60', ring: 'ring-lime-400/70', badgeBg: 'bg-lime-400/15' },
  { name: 'Coral Clay', bg: 'bg-orange-400', text: 'text-orange-300', hex: '#E27B66', border: 'border-orange-400/60', ring: 'ring-orange-400/70', badgeBg: 'bg-orange-400/15' },
  { name: 'Warm Sand', bg: 'bg-amber-300', text: 'text-amber-200', hex: '#D4B282', border: 'border-amber-300/60', ring: 'ring-amber-300/70', badgeBg: 'bg-amber-300/15' },
  { name: 'Deep Dusk', bg: 'bg-indigo-400', text: 'text-indigo-300', hex: '#6D79C7', border: 'border-indigo-400/60', ring: 'ring-indigo-400/70', badgeBg: 'bg-indigo-400/15' },
  { name: 'Berry Plum', bg: 'bg-pink-500', text: 'text-pink-300', hex: '#C25E9B', border: 'border-pink-500/60', ring: 'ring-pink-500/70', badgeBg: 'bg-pink-500/15' }
];

export const CLIMBER_COLORS = CLIMBER_ACCENT_PALETTE;

export const getClimberColor = (
  climberOrIndex: Profile | number | undefined,
  indexFallback = 0
): ClimberColorConfig => {
  if (typeof climberOrIndex === 'object' && climberOrIndex !== null) {
    const profile = climberOrIndex;
    if (profile.accent_color) {
      const match = CLIMBER_ACCENT_PALETTE.find(
        (c) => c.hex.toLowerCase() === profile.accent_color!.toLowerCase()
      );
      if (match) return match;
      return {
        name: 'Custom',
        bg: 'bg-amber-400',
        text: 'text-amber-400',
        hex: profile.accent_color,
        border: 'border-amber-400',
        ring: 'ring-amber-400',
        badgeBg: 'bg-amber-400/20'
      };
    }
    return CLIMBER_ACCENT_PALETTE[indexFallback % CLIMBER_ACCENT_PALETTE.length];
  }

  const idx = typeof climberOrIndex === 'number' ? climberOrIndex : indexFallback;
  return CLIMBER_ACCENT_PALETTE[idx % CLIMBER_ACCENT_PALETTE.length];
};

export interface ClimberIconOption {
  id: string;
  name: string;
}

export const CLIMBER_ICONS: ClimberIconOption[] = [
  { id: 'zap', name: 'Flash' },
  { id: 'flame', name: 'Fire' },
  { id: 'mountain', name: 'Peak' },
  { id: 'crown', name: 'Crown' },
  { id: 'target', name: 'Target' },
  { id: 'rocket', name: 'Dyno' },
  { id: 'trophy', name: 'Trophy' },
  { id: 'skull', name: 'Crusher' },
  { id: 'compass', name: 'Beta' },
  { id: 'sparkles', name: 'Flow' },
  { id: 'heart', name: 'Heart' },
  { id: 'shield', name: 'Solid' },
  { id: 'star', name: 'Star' },
  { id: 'award', name: 'Award' },
  { id: 'coffee', name: 'Fuel' },
  { id: 'footprints', name: 'Footwork' },
  { id: 'smile', name: 'Vibes' },
  { id: 'activity', name: 'Pulse' },
  { id: 'anchor', name: 'Core' },
  { id: 'eye', name: 'Reader' }
];

export type FeatureCategory = 'feature' | 'quality_of_life' | 'ui' | 'bug';
export type FeatureStatus = 'backlog' | 'planned' | 'in_progress' | 'shipped';

export interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  category: FeatureCategory;
  status: FeatureStatus;
  upvotes: string[]; // List of profile IDs
  created_at: string;
}

