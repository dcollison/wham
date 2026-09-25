-- =========================================================
-- WHAM! - Private Group Bouldering Tracker Web App
-- Supabase PostgreSQL Database Schema & Storage Configuration
-- =========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 1. TABLES
-- =========================================================

-- 1.1 Profiles table (Climbers)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    avatar_icon TEXT,
    accent_color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Drop auth.users FK constraint if present to allow shared crew profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_icon TEXT;

-- 1.2 Gyms table
CREATE TABLE IF NOT EXISTS public.gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.3 Gym Areas table (Sectors / Walls)
CREATE TABLE IF NOT EXISTS public.gym_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    image_url TEXT,
    is_comp_wall BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.4 Boulders table (Problems)
CREATE TABLE IF NOT EXISTS public.boulders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.gym_areas(id) ON DELETE CASCADE,
    hold_colour TEXT NOT NULL,
    grade TEXT NOT NULL, -- VB, V0, V1, V2, V3, V4, V5, V6, V7, V8, V9, V10+
    position_order FLOAT8 NOT NULL, -- Sequential clockwise ordering around the area
    notes TEXT,
    image_url TEXT,
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_comp BOOLEAN NOT NULL DEFAULT false,
    comp_number INT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_grade CHECK (grade IN ('VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10+'))
);

-- 1.5 Attempts table (Cumulative attempt / send status per climber)
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('flashed', 'sent', 'attempted')),
    attempt_count INT NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_boulder_user_attempt UNIQUE (boulder_id, user_id)
);

-- 1.6 Comments table (Beta discussion & notes)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.7 Send Props table (Social hype / props for sends)
CREATE TABLE IF NOT EXISTS public.send_props (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_attempt_user_prop UNIQUE (attempt_id, user_id)
);

-- 1.8 Feature Requests table (Crew feature suggestions & roadmap)
CREATE TABLE IF NOT EXISTS public.feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'feature',
    status TEXT NOT NULL DEFAULT 'backlog',
    upvotes TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.9 Boulder Reviews table (3-tier reviews & grade consensus opinions)
CREATE TABLE IF NOT EXISTS public.boulder_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating TEXT CHECK (rating IN ('good', 'ok', 'rough', 'love', 'like', 'meh', 'dislike')),
    grade_opinion TEXT CHECK (grade_opinion IN ('soft', 'fair', 'hard', 'sandbagged')),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_boulder_user_review UNIQUE (boulder_id, user_id)
);

-- 1.10 Safety Snapshots table (Cross-device safety snapshots & cloud backups)
CREATE TABLE IF NOT EXISTS public.safety_snapshots (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    boulder_count INT NOT NULL DEFAULT 0,
    attempt_count INT NOT NULL DEFAULT 0,
    climber_count INT NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    data JSONB NOT NULL
);

-- =========================================================
-- 2. INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_gym_areas_gym ON public.gym_areas(gym_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_boulders_area_position ON public.boulders(area_id, position_order) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_boulders_gym ON public.boulders(gym_id);
CREATE INDEX IF NOT EXISTS idx_attempts_boulder ON public.attempts(boulder_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_boulder ON public.comments(boulder_id);
CREATE INDEX IF NOT EXISTS idx_send_props_attempt ON public.send_props(attempt_id);
CREATE INDEX IF NOT EXISTS idx_send_props_user ON public.send_props(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_user ON public.feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_boulder_reviews_boulder ON public.boulder_reviews(boulder_id);
CREATE INDEX IF NOT EXISTS idx_boulder_reviews_user ON public.boulder_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_snapshots_created_at ON public.safety_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_snapshots_user ON public.safety_snapshots(user_id);

-- =========================================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1),
            'Climber'
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture'
        )
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 4. ROW-LEVEL SECURITY (RLS)
-- =========================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boulders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_props REPLICA IDENTITY FULL;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests REPLICA IDENTITY FULL;
ALTER TABLE public.boulder_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boulder_reviews REPLICA IDENTITY FULL;

-- 4.1 Profiles policies
CREATE POLICY "Public can read all profiles"
    ON public.profiles FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert profiles"
    ON public.profiles FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update profiles"
    ON public.profiles FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- 4.2 Gyms policies
DROP POLICY IF EXISTS "Public can view gyms" ON public.gyms;
DROP POLICY IF EXISTS "Public can insert gyms" ON public.gyms;
DROP POLICY IF EXISTS "Public can update gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can view gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can insert gyms" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can update gyms" ON public.gyms;

CREATE POLICY "Public can view gyms"
    ON public.gyms FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert gyms"
    ON public.gyms FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update gyms"
    ON public.gyms FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- 4.3 Gym Areas policies
DROP POLICY IF EXISTS "Public can view gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Public can insert gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Public can update gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Public can delete gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can view gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can insert gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can update gym areas" ON public.gym_areas;
DROP POLICY IF EXISTS "Authenticated users can delete gym areas" ON public.gym_areas;

CREATE POLICY "Public can view gym areas"
    ON public.gym_areas FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert gym areas"
    ON public.gym_areas FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update gym areas"
    ON public.gym_areas FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public can delete gym areas"
    ON public.gym_areas FOR DELETE
    TO public
    USING (true);

-- 4.4 Boulders policies
DROP POLICY IF EXISTS "Public can view boulders" ON public.boulders;
DROP POLICY IF EXISTS "Public can insert boulders" ON public.boulders;
DROP POLICY IF EXISTS "Public can update boulders" ON public.boulders;
DROP POLICY IF EXISTS "Public can delete boulders" ON public.boulders;
DROP POLICY IF EXISTS "Authenticated users can view boulders" ON public.boulders;
DROP POLICY IF EXISTS "Authenticated users can view all boulders" ON public.boulders;
DROP POLICY IF EXISTS "Authenticated users can insert boulders" ON public.boulders;
DROP POLICY IF EXISTS "Authenticated users can update boulders" ON public.boulders;
DROP POLICY IF EXISTS "Authenticated users can delete boulders" ON public.boulders;

CREATE POLICY "Public can view boulders"
    ON public.boulders FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert boulders"
    ON public.boulders FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update boulders"
    ON public.boulders FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public can delete boulders"
    ON public.boulders FOR DELETE
    TO public
    USING (true);

-- 4.5 Attempts policies (Crew members can view, log, and sync attempts across devices)
CREATE POLICY "Public can view all attempts"
    ON public.attempts FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert attempts"
    ON public.attempts FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update attempts"
    ON public.attempts FOR UPDATE
    TO public
    USING (true);

CREATE POLICY "Public can delete attempts"
    ON public.attempts FOR DELETE
    TO public
    USING (true);

-- 4.6 Comments policies
CREATE POLICY "Public can view all comments"
    ON public.comments FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert comments"
    ON public.comments FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update comments"
    ON public.comments FOR UPDATE
    TO public
    USING (true);

CREATE POLICY "Public can delete comments"
    ON public.comments FOR DELETE
    TO public
    USING (true);

-- 4.7 Send Props policies
DROP POLICY IF EXISTS "Public can view all props" ON public.send_props;
DROP POLICY IF EXISTS "Public can insert props" ON public.send_props;
DROP POLICY IF EXISTS "Public can delete props" ON public.send_props;

CREATE POLICY "Public can view all props"
    ON public.send_props FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert props"
    ON public.send_props FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can delete props"
    ON public.send_props FOR DELETE
    TO public
    USING (true);

-- 4.8 Feature requests policies
CREATE POLICY "Public can view feature requests"
    ON public.feature_requests FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert feature requests"
    ON public.feature_requests FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update feature requests"
    ON public.feature_requests FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public can delete feature requests"
    ON public.feature_requests FOR DELETE
    TO public
    USING (true);

-- 4.9 Boulder Reviews policies
DROP POLICY IF EXISTS "Public can view boulder reviews" ON public.boulder_reviews;
DROP POLICY IF EXISTS "Public can insert boulder reviews" ON public.boulder_reviews;
DROP POLICY IF EXISTS "Public can update boulder reviews" ON public.boulder_reviews;
DROP POLICY IF EXISTS "Public can delete boulder reviews" ON public.boulder_reviews;

CREATE POLICY "Public can view boulder reviews"
    ON public.boulder_reviews FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can insert boulder reviews"
    ON public.boulder_reviews FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Public can update boulder reviews"
    ON public.boulder_reviews FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public can delete boulder reviews"
    ON public.boulder_reviews FOR DELETE
    TO public
    USING (true);

-- 4.10 Safety Snapshots policies
ALTER TABLE public.safety_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_snapshots REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Public can view safety snapshots" ON public.safety_snapshots;
DROP POLICY IF EXISTS "Public can insert safety snapshots" ON public.safety_snapshots;
DROP POLICY IF EXISTS "Public can update safety snapshots" ON public.safety_snapshots;
DROP POLICY IF EXISTS "Public can delete safety snapshots" ON public.safety_snapshots;

CREATE POLICY "Public can view safety snapshots" ON public.safety_snapshots FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert safety snapshots" ON public.safety_snapshots FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update safety snapshots" ON public.safety_snapshots FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete safety snapshots" ON public.safety_snapshots FOR DELETE TO public USING (true);

-- Ensure gym_areas image_url column exists for wall panorama photos
ALTER TABLE public.gym_areas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- =========================================================
-- 5. STORAGE BUCKET CONFIGURATION
-- =========================================================

-- Insert 'boulder-photos' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'boulder-photos',
    'boulder-photos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Storage bucket RLS policies
CREATE POLICY "Public access to boulder-photos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'boulder-photos');

CREATE POLICY "Public can upload boulder-photos"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'boulder-photos');

CREATE POLICY "Public can update boulder-photos"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'boulder-photos');

CREATE POLICY "Public can delete boulder-photos"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'boulder-photos');

-- =========================================================
-- 6. REALTIME REPLICATION ENABLEMENT
-- =========================================================
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.gym_areas REPLICA IDENTITY FULL;
ALTER TABLE public.boulders REPLICA IDENTITY FULL;
ALTER TABLE public.attempts REPLICA IDENTITY FULL;
ALTER TABLE public.boulder_reviews REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'boulders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boulders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attempts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gym_areas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_areas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'send_props') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.send_props;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feature_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'boulder_reviews') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boulder_reviews;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'safety_snapshots') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_snapshots;
  END IF;
END $$;

