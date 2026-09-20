# Wham Tasks & Feature Tracking (TODO.md)

- [x] **1. Climber colour and icon saving bug**
  - **Issue**: Climber color and icon defaulted back to initial values (`zap` icon and initial preset) upon refresh, and rapid changes between color and icon suffered from race conditions.
  - **Resolution**: 
    - Fixed state handling in `AuthContext.tsx` by introducing `updateClimber(profileId, updates)` with atomic functional state updaters (`setClimbers(prev => ...)`).
    - Added instant local persistence in `wham_climber_customizations` and `wham_profiles` in `localStorage` before attempting remote Supabase sync.
    - Updated `enrichProfile` so local customizations always take precedence over Supabase defaults.
    - Fixed `onAuthStateChange` startup bug where `currentUser` was being clobbered with a stale closure.
    - Added the ability in `SettingsModal` to tap and customize any crew member's color, icon, and display name directly on shared devices.

- [x] **2. Filter-aware "Next Boulder" navigation when logging**
  - **Issue**: Needed a quick way to log climbs sequentially according to the current filter without having to close the modal, scroll, and reopen.
  - **Resolution**:
    - Updated `QuickLogModal.tsx` to receive `filteredBoulders`.
    - Added a filter-aware position badge in the header (e.g. `3 of 12` with previous/next hold color previews).
    - Added a prominent primary button `Save & Next Boulder →` displaying the next boulder's hold color, grade, and position tag `#N`.
    - Added navigation actions: `Save & Close`, `Next Climber` (for group sessions), and `Skip to Next Boulder` with seamless wrap-around navigation.

- [x] **3. Backup & restore safety net against accidental deletions**
  - **Issue**: Needed protection against accidental sector deletions or wall resets.
  - **Resolution**:
    - Reorganized `SettingsModal.tsx` with a dedicated **Backups & Safety** tab.
    - Full JSON snapshot export (`Export Backup`) and import restoration (`Restore from File`).
    - Automatic rolling safety snapshots taken whenever an area is reset (`archiveAreaBoulders`) and manual snapshots (`+ Snapshot Now`).
    - Added 1-click rollback restoration to any safety snapshot.
    - Added "Backups & Safety" quick access button directly in the persistent Header More menu.
    - Added reassurance banner in `AreaResetModal` confirming that an automatic snapshot is created before archiving.

- [x] **4. Storage viability & automated photo pruning for archived climbs**
  - **Issue**: Need to know if Supabase storage will fill up, and provide pruning for oldest archived climbs.
  - **Viability Assessment**:
    - Wham uses client-side canvas compression (`imageCompressor.ts`, JPEG quality 0.75, max 1200px) which yields an average of **~115 KB per photo**.
    - Supabase's free tier provides **1 GB (1,000 MB) of storage**.
    - **1 GB accommodates ~9,000 photos**, which represents **8–10+ years of active gym climbing** for a crew of 4.
  - **Resolution**:
    - Built `PhotoStorageManager.tsx` and embedded it inside the **Storage** tab in `SettingsModal`.
    - Live storage gauge showing total photos, estimated MB used, percentage of the 1 GB tier, and days of buffer remaining.
    - Added 1-click **"Prune Oldest Archived Photos"** tool with cutoff filters (>30 days, >60 days, or all archived climbs).
    - Implemented `pruneArchivedClimbPhotos` and `deleteStoragePhotos`: deletes storage bucket files and sets `image_url = null` while **preserving climb tick history, grades, attempt counts, and beta notes**.
    - Automatic safety snapshot is generated before any photo pruning operation.
    - Added auto-prune on reset toggle stored in `localStorage`.

- [x] **5. Upload photo of an entire area (Wall Overview Panorama)**
  - **Issue**: Needed ability to upload a wide overview photo of a sector/area.
  - **Resolution**:
    - Extended `GymArea` type with optional `image_url` property.
    - Added `uploadAreaPhoto` to `src/lib/supabase.ts` and `updateAreaPhoto` / `removeAreaPhoto` to `GymContext.tsx`.
    - Created `AreaPhotoBanner.tsx`: a responsive, collapsible wall banner rendered above the boulder list when viewing a specific sector.
    - Direct camera capture and photo upload with high-res 1600px panorama canvas compression.
    - Created `AreaPhotoModal.tsx`: full-screen pinch/scroll zoomable wall photo viewer.
    - Updated `supabase_schema.sql` with `ALTER TABLE public.gym_areas ADD COLUMN IF NOT EXISTS image_url TEXT;`.
