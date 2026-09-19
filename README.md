# ⚡ Wham – Private Group Bouldering Tracker

A responsive, mobile-first bouldering tracker web application built for a private friend group (**Alex, Dale, Taiye, and Euan**).

Hosted **100% statically on GitHub Pages** with zero custom backend servers, using **Supabase** for authentication, PostgreSQL database, real-time syncing, and image storage.

---

## 🧗 Key Features

1. **"At the Gym" Clockwise Ticklist View**:
   - Sequential clockwise spatial ordering of climbs around each gym sector.
   - Hold colour swatches/badges, font-mono grades, notes, and photo thumbnails.
   - **Adjacent Climbs Indicator**: Easily orient yourself on the wall with `Previous: [Color] [Grade] | Next: [Color] [Grade]`.
   - **"Needs Sending" Filter**: One-tap toggle button to hide all problems already flashed or sent by the active climber.
   - **"Insert Boulder Adjacent" Action**: Insert a new problem after any existing boulder; automatically calculates midpoint position order ($(p_1 + p_2) / 2$) to keep clockwise ordering intact without re-indexing.

2. **Chalky Fast Quick-Log Modal**:
   - ⚡ **Flash**: Instant 1st try log with gold celebration confetti.
   - ✅ **Send**: Tactile attempt stepper (2, 3, 4, 5+ tries).
   - ⏳ **Project / Attempt**: Track ongoing sessions without sending.
   - Pre-fills previous logs with option to clear/delete.

3. **Area Reset & Bulk Management**:
   - Area-level bulk action: **"Archive Entire Area"** with confirmation modal when a wall is reset.
   - "Show Archived" toggle to inspect historical sets and previous beta.

4. **Single Photo Upload with Canvas Compression**:
   - Take a photo directly from your device camera or upload from your gallery.
   - Automatic client-side canvas compression (JPEG, max width 1200px, 0.75 quality) to ensure fast uploads on gym Wi-Fi/cellular and minimize Supabase storage bandwidth.

5. **Beta Discussion & Feed**:
   - Full climb details view with photo zoom.
   - Threaded comments for beta spray, sequence discussions, and foot placement advice.
   - Global Beta Feed to see what problems your friends are talking about.

6. **Analytics & Statistics Dashboard**:
   - Filterable by gym (**Bond**, **Hub**, or All Gyms).
   - Toggle between **"My Stats"** and **"Group Stats"**.
   - **Grade Breakdown & Volume**: Bar charts of sends and flashes across all grades (VB to V10+).
   - **Efficiency Metrics**: Send % per grade, Flash Rate per grade, and Average Attempts per Send.
   - **Gym Completion Ring**: Visual progress ring of active gym completed and remaining climbs per area.
   - **Group Leaderboards & Accolades**: Group **Flash King/Queen** and hardest send per climber.

7. **Group Profiles & Auth**:
   - 4 Pre-populated profiles: **Alex**, **Dale**, **Taiye**, **Euan**.
   - Profile quick-switcher for shared device logging at the gym.
   - Supabase Magic Link (Email OTP) and Google OAuth login support.

---

## 🛠 Tech Stack & Architecture

- **Frontend**: Vite + React (TypeScript) + Tailwind CSS + Lucide Icons.
- **Routing**: Client-side `HashRouter` (`#/gyms`, `#/stats`, `#/beta`, `#/settings`) for 404-free GitHub Pages reloading.
- **Backend / DB**: Serverless Supabase (PostgreSQL with Row Level Security and Storage).
- **CI/CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`) building and deploying to GitHub Pages on every push to `main`.
- **Offline / Zero-Config Demo**: Comes with an embedded local mock store pre-seeded with the historical Google Sheet data. Works immediately out of the box even before configuring Supabase credentials!

---

## 🚀 Quick Start

### 1. Run Locally
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Connect Supabase

1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the contents of [`supabase_schema.sql`](./supabase_schema.sql).
3. Populate initial data by running [`seed.sql`](./seed.sql) in the Supabase SQL Editor.
4. Copy your project URL and Anon Key into `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
*(You can also configure them directly inside the app under **The Circle > Supabase Connection Config**).*

---

## 📦 Deployment to GitHub Pages

1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/wham-app.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings > Pages**.
   - Under **Build and deployment > Source**, select **GitHub Actions**.
3. In **Settings > Secrets and variables > Actions**, add the following repository secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon public API key
4. Push to `main` or manually trigger the **Deploy Wham App to GitHub Pages** workflow under the **Actions** tab.

---

## 🗄 Project Structure

```
wham-app/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Pages CI/CD workflow
├── scripts/
│   └── seed.ts                   # Standalone TypeScript DB seed script
├── src/
│   ├── components/
│   │   ├── beta/                 # Beta feed & discussion components
│   │   ├── boulders/             # BoulderCard, QuickLogModal, AddBoulderModal, etc.
│   │   ├── settings/             # Circle & profile switcher settings
│   │   ├── stats/                # Analytics charts, efficiency metrics, leaderboards
│   │   ├── Header.tsx            # Sticky header with gym/area selectors & brand logo
│   │   └── Navigation.tsx        # Mobile bottom navigation bar
│   ├── context/
│   │   ├── AuthContext.tsx       # Profile management and Supabase auth
│   │   └── GymContext.tsx        # Gym, Area, clockwise climbs, and attempts state
│   ├── lib/
│   │   ├── imageCompressor.ts    # Client-side HTML5 canvas image compression
│   │   ├── mockData.ts           # Historical seed dataset (Alex, Dale, Taiye, Euan)
│   │   └── supabase.ts           # Supabase client and storage upload handler
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces and constants
│   ├── App.tsx                   # Main app container and HashRouter
│   ├── index.css                 # Tailwind CSS directives and custom styling
│   └── main.tsx                  # React root mount
├── index.html                    # Mobile-optimized HTML shell
├── package.json
├── seed.sql                      # SQL seed file for Supabase SQL Editor
├── supabase_schema.sql           # Database schema, RLS policies, and triggers
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
