/**
 * Standalone database seeding script for Wham bouldering tracker.
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Populates:
 * - 4 Climbers: Alex, Dale, Taiye, Euan
 * - Gyms: Bond, Hub
 * - Areas: Slab Wall, Gecko Prow, Back Corner, Cave, Comp Wall, Top-Out
 * - Clockwise Boulders (with 7 archived historical routes in Back Corner)
 * - Exact historical Google Sheet attempts (246 attempts parsed)
 */

import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_PROFILES,
  INITIAL_GYMS,
  INITIAL_AREAS,
  INITIAL_BOULDERS,
  INITIAL_ATTEMPTS,
  INITIAL_COMMENTS
} from '../src/lib/mockData';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('⚡ Seeding Wham database with full historical dataset...');

  // 1. Seed Profiles
  console.log(`Inserting ${INITIAL_PROFILES.length} profiles...`);
  const { error: profileErr } = await supabase.from('profiles').upsert(INITIAL_PROFILES);
  if (profileErr) console.warn('Note on profiles upsert:', profileErr.message);

  // 2. Seed Gyms
  console.log(`Inserting ${INITIAL_GYMS.length} gyms...`);
  const { error: gymErr } = await supabase.from('gyms').upsert(INITIAL_GYMS);
  if (gymErr) throw gymErr;

  // 3. Seed Areas
  console.log(`Inserting ${INITIAL_AREAS.length} gym areas...`);
  const { error: areaErr } = await supabase.from('gym_areas').upsert(INITIAL_AREAS);
  if (areaErr) throw areaErr;

  // 4. Seed Boulders in batches of 50
  console.log(`Inserting ${INITIAL_BOULDERS.length} boulders...`);
  const batchSize = 50;
  for (let i = 0; i < INITIAL_BOULDERS.length; i += batchSize) {
    const batch = INITIAL_BOULDERS.slice(i, i + batchSize).map(b => ({
      id: b.id,
      gym_id: b.gym_id,
      area_id: b.area_id,
      hold_colour: b.hold_colour,
      grade: b.grade,
      position_order: b.position_order,
      notes: b.notes || null,
      is_archived: b.is_archived,
      date_added: b.date_added,
      created_by: b.created_by
    }));
    const { error: boulderErr } = await supabase.from('boulders').upsert(batch);
    if (boulderErr) throw boulderErr;
  }

  // 5. Seed Attempts in batches of 50
  console.log(`Inserting ${INITIAL_ATTEMPTS.length} attempts...`);
  for (let i = 0; i < INITIAL_ATTEMPTS.length; i += batchSize) {
    const batch = INITIAL_ATTEMPTS.slice(i, i + batchSize).map(a => ({
      boulder_id: a.boulder_id,
      user_id: a.user_id,
      status: a.status,
      attempt_count: a.attempt_count,
      logged_at: a.logged_at
    }));
    const { error: attemptErr } = await supabase.from('attempts').upsert(batch, { onConflict: 'boulder_id,user_id' });
    if (attemptErr) throw attemptErr;
  }

  // 6. Seed Comments
  console.log(`Inserting ${INITIAL_COMMENTS.length} comments...`);
  const { error: commentErr } = await supabase.from('comments').upsert(INITIAL_COMMENTS);
  if (commentErr) console.warn('Note on comments upsert:', commentErr.message);

  console.log(`✅ Seeding completed successfully!`);
  console.log(`- ${INITIAL_PROFILES.length} profiles`);
  console.log(`- ${INITIAL_GYMS.length} gyms`);
  console.log(`- ${INITIAL_AREAS.length} areas`);
  console.log(`- ${INITIAL_BOULDERS.length} boulders`);
  console.log(`- ${INITIAL_ATTEMPTS.length} attempts`);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
