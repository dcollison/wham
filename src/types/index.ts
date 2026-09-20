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
  // Computed / joined fields for convenient UI usage
  adjacent_prev?: { hold_colour: string; grade: Grade } | null;
  adjacent_next?: { hold_colour: string; grade: Grade } | null;
}

export interface BulkAddBoulderItem {
  id?: string;
  holdColour: string;
  grade: Grade;
  notes?: string;
  imageFile?: File | null;
  imageDataUrl?: string | null;
}

export interface BulkAddBouldersParams {
  gymId: string;
  areaId: string;
  boulders: BulkAddBoulderItem[];
  archiveExistingAreaBoulders?: boolean;
  dateAdded?: string;
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
}

export const HOLD_COLORS: Record<string, HoldColorConfig> = {
  Yellow: { name: 'Yellow', bgClass: 'bg-amber-400', textClass: 'text-amber-950', borderClass: 'border-amber-500', hex: '#FACC15' },
  Mint: { name: 'Mint', bgClass: 'bg-emerald-300', textClass: 'text-emerald-950', borderClass: 'border-emerald-400', hex: '#6EE7B7' },
  Green: { name: 'Green', bgClass: 'bg-emerald-600', textClass: 'text-white', borderClass: 'border-emerald-700', hex: '#059669' },
  Orange: { name: 'Orange', bgClass: 'bg-orange-500', textClass: 'text-white', borderClass: 'border-orange-600', hex: '#F97316' },
  Blue: { name: 'Blue', bgClass: 'bg-blue-600', textClass: 'text-white', borderClass: 'border-blue-700', hex: '#2563EB' },
  Purple: { name: 'Purple', bgClass: 'bg-purple-600', textClass: 'text-white', borderClass: 'border-purple-700', hex: '#9333EA' },
  Red: { name: 'Red', bgClass: 'bg-rose-600', textClass: 'text-white', borderClass: 'border-rose-700', hex: '#E11D48' },
  Pink: { name: 'Pink', bgClass: 'bg-pink-500', textClass: 'text-white', borderClass: 'border-pink-600', hex: '#EC4899' },
  Black: { name: 'Black', bgClass: 'bg-zinc-900', textClass: 'text-white', borderClass: 'border-zinc-700', hex: '#18181B' },
  White: { name: 'White', bgClass: 'bg-slate-100', textClass: 'text-slate-900', borderClass: 'border-slate-300', hex: '#F1F5F9' },
  Bee: { name: 'Bee', bgClass: 'bg-yellow-400', textClass: 'text-black', borderClass: 'border-zinc-900', hex: '#EAB308' },
  Wood: { name: 'Wood', bgClass: 'bg-amber-800', textClass: 'text-white', borderClass: 'border-amber-900', hex: '#92400E' }
};

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
  { name: 'Amber', bg: 'bg-amber-400', text: 'text-amber-400', hex: '#F59E0B', border: 'border-amber-400', ring: 'ring-amber-400', badgeBg: 'bg-amber-400/20' },
  { name: 'Orange', bg: 'bg-orange-500', text: 'text-orange-400', hex: '#F97316', border: 'border-orange-500', ring: 'ring-orange-500', badgeBg: 'bg-orange-500/20' },
  { name: 'Cyan', bg: 'bg-cyan-500', text: 'text-cyan-400', hex: '#06B6D4', border: 'border-cyan-500', ring: 'ring-cyan-500', badgeBg: 'bg-cyan-500/20' },
  { name: 'Purple', bg: 'bg-purple-500', text: 'text-purple-400', hex: '#8B5CF6', border: 'border-purple-500', ring: 'ring-purple-500', badgeBg: 'bg-purple-500/20' },
  { name: 'Rose', bg: 'bg-rose-500', text: 'text-rose-400', hex: '#F43F5E', border: 'border-rose-500', ring: 'ring-rose-500', badgeBg: 'bg-rose-500/20' },
  { name: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-400', hex: '#10B981', border: 'border-emerald-500', ring: 'ring-emerald-500', badgeBg: 'bg-emerald-500/20' },
  { name: 'Blue', bg: 'bg-blue-500', text: 'text-blue-400', hex: '#3B82F6', border: 'border-blue-500', ring: 'ring-blue-500', badgeBg: 'bg-blue-500/20' },
  { name: 'Lime', bg: 'bg-lime-500', text: 'text-lime-400', hex: '#84CC16', border: 'border-lime-500', ring: 'ring-lime-500', badgeBg: 'bg-lime-500/20' },
  { name: 'Pink', bg: 'bg-pink-500', text: 'text-pink-400', hex: '#EC4899', border: 'border-pink-500', ring: 'ring-pink-500', badgeBg: 'bg-pink-500/20' },
  { name: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-400', hex: '#6366F1', border: 'border-indigo-500', ring: 'ring-indigo-500', badgeBg: 'bg-indigo-500/20' },
  { name: 'Teal', bg: 'bg-teal-500', text: 'text-teal-400', hex: '#14B8A6', border: 'border-teal-500', ring: 'ring-teal-500', badgeBg: 'bg-teal-500/20' },
  { name: 'Red', bg: 'bg-red-600', text: 'text-red-400', hex: '#EF4444', border: 'border-red-600', ring: 'ring-red-600', badgeBg: 'bg-red-500/20' }
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
