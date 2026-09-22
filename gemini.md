# ⚡ Wham – Developer & Agent Guide (gemini.md)

This document is the primary technical context and operational guide for Google Antigravity / Gemini agents and human contributors working on the **Wham** codebase.

---

## 1. Project Overview

- **Name**: Wham (⚡)
- **Purpose**: Fast, tactile, mobile-first bouldering tracker designed for a private friend group (**Alex, Dale, Taiye, and Euan**).
- **Hosting**: 100% static hosting on **GitHub Pages** (via GitHub Actions CI/CD) with zero custom backend servers.
- **Backend & Database**: **Supabase** (PostgreSQL with Row Level Security, Realtime, and Storage bucket for climb photos).
- **Offline / Zero-Config**: Complete offline fallback store seeded from localStorage and embedded mock data. The app is fully operational even without Supabase credentials configured.

---

## 2. Tech Stack & Environment

| Layer | Technologies |
| :--- | :--- |
| **Framework** | React 18, TypeScript, Vite 6 |
| **Styling** | Tailwind CSS 3, Custom CSS Variables |
| **Icons** | Lucide React |
| **Effects** | Canvas Confetti (flashes) |
| **Database** | Supabase (PostgreSQL 15+) |
| **Routing** | Client-side Hash Router (`#/boulders`, `#/feed`, `#/stats`, `#/settings`) for 404-free GitHub Pages hosting |

> [!IMPORTANT]
> **Windows Environment Command Guideline**:
> When running CLI commands in PowerShell on Windows, execution policies may block direct `npm` or `npx` invocations. Always invoke commands via `cmd.exe /c`:
> ```bash
> cmd.exe /c npm run dev
> cmd.exe /c npm run build
> ```

---

## 3. Design System & Typography

### Font Pairing
The app uses a distinctive editorial/utilitarian typography pairing:
1. **Space Mono** (`font-heading`, `font-mono`):
   - Used for **all headings** (`h1`, `h2`, `h3`, `h4`, `h5`, `h6`).
   - Used for **brand marks** (`Wham.`), banner titles, and modal headers.
   - Used for **grades** (`V4`, `6A+`), boulder position tags (`#12`), attempt counts (`2t`), leaderboard points (`1,250 pts`), and KPI numbers.
   - Gives the app an authentic climbing guidebook / field notebook aesthetic.
2. **Plus Jakarta Sans** (`font-sans`):
   - Default body typeface for all smaller text, paragraphs, climber names, notes, buttons, drop-downs, and tooltips.
   - Provides clean geometric apertures and high legibility on mobile screens.

### Color Palette & Dark Theme
- **Base Background**: `slate-950` (`#0b0f19` / `#020617`)
- **Cards & Surfaces**: `slate-900` (`#0f172a`), `slate-850`, `slate-800`
- **Borders**: `slate-800`, `slate-700/60`
- **Brand Accent**: Amber (`amber-400` / `#fbbf24`, `amber-500` / `#f59e0b`)
- **Status Colors**:
  - ⚡ **Flash**: Amber (`amber-400`)
  - ✅ **Sent**: Emerald (`emerald-400`)
  - ⏳ **Project / Attempt**: Blue (`blue-400`)
  - ⚪ **Untried**: Slate (`slate-400`)

### Hold Color Definitions (`src/types/index.ts`)
Hold colors are tuned for high contrast against dark backgrounds:
- **Red**: `#DC2626` (crisp crimson red, avoids pinkish tones)
- **Green**: `#16A34A` (pure grass/emerald green, avoids blueish/teal tones)
- **Bee**: `#DDA82B` split into **one yellow area and one black area** (half-and-half dual tone, no stripes) to immediately differentiate from pure Yellow holds.
- **Black, White, Yellow, Blue, Purple, Orange, Pink, Wood**: Defined in `HOLD_COLORS` with dedicated card styles, swatches, and badge gradients.

### Design Principles
- **No AI boilerplate looks**: Avoid generic hyper-saturated purple/cyan gradients and overuse of emojis. Use functional icons from `lucide-react`.
- **Chalky & Fast**: Inputs, chips, and stepper buttons must be large enough for quick mobile taps with chalk on climbers' hands.
- **Card Density**: Boulder cards are compact ticklist items. Beta notes are hidden on the main cards and viewable in the Boulder Detail modal.

---

## 4. Key Architectural Concepts & Mechanics

### 4.1 Clockwise Spatial Wall Sequence
- Boulders within each gym area are sequenced in clockwise order around the wall.
- Each climb has a `position_order` float:
  - **Sequential insertion**: `position_order = N`
  - **Midpoint insertion** ("Insert Boulder Adjacent"): When inserting a problem between boulder $A$ and boulder $B$, the new climb's position order is calculated as:
    $$\text{position\_order} = \frac{\text{order}_A + \text{order}_B}{2}$$
    This keeps clockwise ordering intact without re-indexing the entire area.
- **Adjacent Indicators**: Boulder cards display `← [Hold Grade] • [Hold Grade] →` to help climbers navigate the physical wall.

### 4.2 Dynamic Hold Colour Circuits
- Instead of rigid or outdated London circuit tables, circuits are **computed dynamically from active gym boulders**.
- Boulders are grouped by `hold_colour`. The system calculates:
  - Total active climbs in the circuit
  - Dynamic grade range (e.g. `V1 – V3`) derived from min/max grades of active problems
  - Group and climber send completion percentages
  - Automatically updates whenever boulders are added or archived.

### 4.3 Redpoint Gym Comp Scoring & Monthly Competitions
- **Monthly Competitions**:
  - Automatically resets on the 1st of every calendar month at midnight with zero cron jobs or manual database resets needed.
  - Dynamically time-windows attempts by calendar month (`logged_at` timestamps).
  - Climbers can navigate past monthly competitions via the month stepper/selector to inspect historic podiums and scorecards.
  - Features a **Hall of Fame** tracking monthly champions and total tops across all past months.
  - Climbers can toggle between **Monthly Comp** and **Active Wall Set** (all problems currently physically on the wall).
- **Scoring Scale**:
  - Base points scale with grade: `VB` (50 pts), `V0` (100 pts), `V1` (200 pts) ... `V10+` (1200 pts).
  - **Flash Bonus**: $+25\%$ bonus points on first-try sends (`base * 1.25`).
  - Tie-breakers: 1st Total Points $\rightarrow$ 2nd Tops Count $\rightarrow$ 3rd Flashes Count $\rightarrow$ 4th Fewest Attempts on Tops.
- Real-time standings appear on the Gym Comp Banner (with days remaining in month) and full modal leaderboard.

### 4.4 Shared Device / Crew Logging
- Climbers frequently share a single phone at the gym.
- Users can log sends, flashes, and attempts on behalf of other crew members directly via:
  - Climber avatar chips on each card.
  - The Quick Log modal climber selector.
- Row Level Security (RLS) on `public.attempts` allows authenticated users to insert/update attempts for any crew profile.

### 4.5 Client-Side Canvas Image Compression
- Climb photos captured at the gym are compressed client-side before upload:
  - Maximum dimension: 1200px (width or height).
  - Format: JPEG, quality 0.75.
  - Handled in `src/lib/imageCompressor.ts`.
  - Ensures snappy uploads over weak gym Wi-Fi/cellular and conserves Supabase Storage bandwidth.

---

## 5. Repository Structure

```
wham-app/
├── .github/workflows/deploy.yml  # GitHub Pages CI/CD workflow
├── index.html                    # Google Fonts (Space Mono, Plus Jakarta Sans) & viewport setup
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Custom colors, fonts (sans, mono, heading, display)
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite build config with manual chunk splitting
├── supabase_schema.sql           # Canonical Supabase PostgreSQL schema & RLS policies
├── seed.sql                      # Seed data for gyms, areas, climbers, and initial problems
└── src/
    ├── main.tsx                  # App entry point
    ├── App.tsx                   # Main root view, hash routing, modal states
    ├── index.css                 # Base layer typography, dark theme variables, custom scrollbars
    ├── types/
    │   └── index.ts              # Interfaces (Boulder, Attempt, Profile, Gym) and hold color logic
    ├── context/
    │   ├── AuthContext.tsx       # Profile switcher, accent colors, Supabase auth
    │   └── GymContext.tsx        # Central data store (boulders, attempts, comments, sync)
    ├── lib/
    │   ├── compScoring.ts        # Gym competition points & leaderboard logic
    │   ├── imageCompressor.ts    # Canvas-based client photo compressor
    │   └── supabase.ts           # Supabase client initialization
    └── components/
        ├── Header.tsx            # Gym switcher, area selector, brand wordmark, quick actions
        ├── Navigation.tsx        # Bottom tab bar (Boulders, Feed, Stats, Settings)
        ├── ClimberAvatar.tsx     # Climber avatar with custom icons & accent colors
        ├── boulders/
        │   ├── BoulderCard.tsx           # Compact clockwise ticklist card
        │   ├── BoulderDetailModal.tsx    # Full details, beta notes, zoom photo, comments
        │   ├── BoulderFilters.tsx        # Grade strip, hold color filter, search
        │   ├── QuickLogModal.tsx         # Fast flash / sent / project logging stepper
        │   ├── AddBoulderModal.tsx       # Single boulder entry with photo upload
        │   ├── BulkAddBouldersModal.tsx  # Multi-climb bulk logger for resets
        │   ├── AreaResetModal.tsx        # Archive entire sector confirmation
        │   ├── GymCompBanner.tsx         # Top comp podium preview banner
        │   ├── HoldBadge.tsx             # Swatch and high-contrast grade pill
        │   └── ClimberStatusPills.tsx    # Small crew status chips
        ├── feed/
        │   ├── CrewFeedView.tsx          # Dual-tab view: Recent Sends & Beta Discussion
        │   └── RecentSendsFeed.tsx       # Chronological send stream with props reactions
        ├── leaderboard/
        │   ├── CompLeaderboard.tsx       # Podium view, points breakdown, standings
        │   └── CompLeaderboardModal.tsx  # Full-screen competition leaderboard modal
        ├── stats/
        │   └── StatsDashboard.tsx        # Personal & group analytics, dynamic circuits, 1v1 battle
        └── settings/
            └── SettingsModal.tsx         # Crew profiles, accent colors, icons, Supabase config
```

---

## 6. Database Reference (Supabase)

### Tables
1. **`public.profiles`**:
   - `id` (UUID, PK, references `auth.users`)
   - `display_name` (TEXT)
   - `avatar_url` (TEXT)
   - `avatar_icon` (TEXT) - e.g. `'flame'`, `'zap'`, `'target'`, `'crown'`
   - `accent_color` (TEXT) - e.g. `'#F59E0B'`, `'#3B82F6'`, `'#EC4899'`
2. **`public.gyms`**:
   - `id` (UUID, PK), `name` (TEXT), `location` (TEXT)
3. **`public.gym_areas`**:
   - `id` (UUID, PK), `gym_id` (UUID), `name` (TEXT), `sort_order` (INT)
4. **`public.boulders`**:
   - `id` (UUID, PK), `area_id` (UUID), `hold_colour` (TEXT), `grade` (TEXT)
   - `position_order` (DOUBLE PRECISION), `notes` (TEXT), `image_url` (TEXT)
   - `is_archived` (BOOLEAN), `date_added` (DATE)
5. **`public.attempts`**:
   - `id` (UUID, PK), `boulder_id` (UUID), `user_id` (UUID)
   - `status` (`'untried'` | `'attempted'` | `'sent'` | `'flashed'`)
   - `attempt_count` (INT), `logged_at` (TIMESTAMPTZ)
6. **`public.comments`**:
   - `id` (UUID, PK), `boulder_id` (UUID), `user_id` (UUID)
   - `content` (TEXT), `created_at` (TIMESTAMPTZ)
7. **`public.send_props`**:
   - `id` (UUID, PK), `attempt_id` (UUID, FK attempts), `user_id` (UUID, FK profiles)
   - `created_at` (TIMESTAMPTZ)
   - Unique constraint on `(attempt_id, user_id)`

### Idempotent Schema Migration
If provisioning a new Supabase environment or verifying database integrity:
```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS avatar_icon TEXT;

-- Drop foreign key constraint to auth.users if present for shared crew profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Enable Realtime replication for profiles
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- Send Props table for cross-device reaction sync
CREATE TABLE IF NOT EXISTS public.send_props (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_attempt_user_prop UNIQUE (attempt_id, user_id)
);

ALTER TABLE public.send_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_props REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_send_props_attempt ON public.send_props(attempt_id);
CREATE INDEX IF NOT EXISTS idx_send_props_user ON public.send_props(user_id);

DROP POLICY IF EXISTS "Public can view all props" ON public.send_props;
DROP POLICY IF EXISTS "Public can insert props" ON public.send_props;
DROP POLICY IF EXISTS "Public can delete props" ON public.send_props;

CREATE POLICY "Public can view all props" ON public.send_props FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert props" ON public.send_props FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can delete props" ON public.send_props FOR DELETE TO public USING (true);

-- Drop legacy restrictive authenticated-only policies
DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Users can delete their own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Authenticated users can view all attempts" ON public.attempts;
DROP POLICY IF EXISTS "Authenticated users can insert attempts" ON public.attempts;
DROP POLICY IF EXISTS "Authenticated users can update attempts" ON public.attempts;
DROP POLICY IF EXISTS "Authenticated users can delete attempts" ON public.attempts;

-- Enable public policies for zero-friction crew sync across shared and personal devices
CREATE POLICY "Public can view all attempts"
    ON public.attempts FOR SELECT TO public USING (true);

CREATE POLICY "Public can insert attempts"
    ON public.attempts FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can update attempts"
    ON public.attempts FOR UPDATE TO public USING (true);

CREATE POLICY "Public can delete attempts"
    ON public.attempts FOR DELETE TO public USING (true);

-- Ensure public profile updates work seamlessly without individual auth
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can update profiles" ON public.profiles;
CREATE POLICY "Public can update profiles" ON public.profiles FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;
CREATE POLICY "Public can insert profiles" ON public.profiles FOR INSERT TO public WITH CHECK (true);

-- Ensure boulders updates and archives work from shared devices
DROP POLICY IF EXISTS "Authenticated users can update boulders" ON public.boulders;
DROP POLICY IF EXISTS "Authenticated users can insert boulders" ON public.boulders;
DROP POLICY IF EXISTS "Authenticated users can delete boulders" ON public.boulders;
DROP POLICY IF EXISTS "Public can view boulders" ON public.boulders;
DROP POLICY IF EXISTS "Public can update boulders" ON public.boulders;
DROP POLICY IF EXISTS "Public can insert boulders" ON public.boulders;
DROP POLICY IF EXISTS "Public can delete boulders" ON public.boulders;

CREATE POLICY "Public can view boulders" ON public.boulders FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert boulders" ON public.boulders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update boulders" ON public.boulders FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete boulders" ON public.boulders FOR DELETE TO public USING (true);

-- Ensure gyms and gym_areas work seamlessly from shared devices
DROP POLICY IF EXISTS "Public can view gyms" ON public.gyms;
DROP POLICY IF EXISTS "Public can insert gyms" ON public.gyms;
DROP POLICY IF EXISTS "Public can update gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can view gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can insert gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can update gyms" ON public.gyms;

CREATE POLICY "Public can view gyms" ON public.gyms FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert gyms" ON public.gyms FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update gyms" ON public.gyms FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Public can insert gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Public can update gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Public can delete gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can view gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can insert gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can update gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can delete gym areas" ON public.gym_areas;

CREATE POLICY "Public can view gym areas" ON public.gym_areas FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert gym areas" ON public.gym_areas FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update gym areas" ON public.gym_areas FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete gym areas" ON public.gym_areas FOR DELETE TO public USING (true);

-- Ensure full replica identity for realtime sync
ALTER TABLE public.boulders REPLICA IDENTITY FULL;
ALTER TABLE public.gym_areas REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'boulders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boulders;
  END IF;
END $$;
```

---

## 7. Development & Contribution Guidelines

1. **Verify Builds Before Committing**:
   Always run `cmd.exe /c npm run build` to guarantee zero TypeScript or bundle issues before committing.
2. **Preserve Documentation & Comments**:
   Keep existing code comments, docstrings, and type definitions intact.
3. **Keep Commits Atomic & Well-Described**:
   Follow conventional commit style (e.g. `feat: ...`, `fix: ...`, `refactor: ...`).
4. **Testing Offline Fallback**:
   Ensure modifications don't break the app when Supabase is disconnected or in demo mode.
