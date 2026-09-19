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

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
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
