import {
  ELO_DEMARCATIONS,
  getLevelDemarcation,
  getNextLevelDemarcation,
  getDemarcationProgress,
  getClimberTitleFromElo,
  computeCrewRatings,
  computeClimberRating,
  getRequiredPyramidDepth,
  hasPyramidDepthForDemarcation
} from '../src/lib/ratingEngine';
import { INITIAL_PROFILES, INITIAL_ATTEMPTS, INITIAL_BOULDERS } from '../src/lib/seedData';
import { Boulder, Attempt } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- 1. Testing ELO Demarcations Integrity ---');
assert(ELO_DEMARCATIONS.length === 13, `Expected 13 demarcations, got ${ELO_DEMARCATIONS.length}`);

// Test contiguous coverage with no gaps
for (let i = 0; i < ELO_DEMARCATIONS.length - 1; i++) {
  const current = ELO_DEMARCATIONS[i];
  const next = ELO_DEMARCATIONS[i + 1];
  assert(
    current.maxElo === next.minElo,
    `Gap or overlap between ${current.id} (${current.minElo}-${current.maxElo}) and ${next.id} (${next.minElo}-${next.maxElo})`
  );
}
assert(ELO_DEMARCATIONS[0].minElo === 0, 'First tier must start at 0');
assert(ELO_DEMARCATIONS[ELO_DEMARCATIONS.length - 1].maxElo === Infinity, 'Last tier must end at Infinity');

console.log('✓ Continuous range coverage verified: 0 to Infinity');

console.log('--- 2. Testing Exact Task Requirement (1450 - 1550 = Solid V4 Climber) ---');
const v4Demarcation = ELO_DEMARCATIONS.find((d) => d.id === 'v4');
assert(!!v4Demarcation, 'v4 demarcation must exist');
assert(v4Demarcation!.minElo === 1450, `V4 minElo must be 1450, got ${v4Demarcation!.minElo}`);
assert(v4Demarcation!.maxElo === 1550, `V4 maxElo must be 1550, got ${v4Demarcation!.maxElo}`);
assert(v4Demarcation!.title === 'Solid V4 Climber', `V4 title must be "Solid V4 Climber", got ${v4Demarcation!.title}`);
assert(v4Demarcation!.gradeEquivalent === 'V4', `V4 gradeEquivalent must be V4, got ${v4Demarcation!.gradeEquivalent}`);

// Test 1450 boundary
const at1450 = getLevelDemarcation(1450);
assert(at1450.id === 'v4', `1450 should be V4, got ${at1450.id}`);
assert(at1450.title === 'Solid V4 Climber', `1450 should be Solid V4 Climber, got ${at1450.title}`);

// Test 1500 middle
const at1500 = getLevelDemarcation(1500);
assert(at1500.id === 'v4', `1500 should be V4, got ${at1500.id}`);
const titleAt1500 = getClimberTitleFromElo(1500);
assert(titleAt1500.title === 'Solid V4 Climber', `1500 title should be Solid V4 Climber`);
assert(titleAt1500.gradeEquivalent === 'V4', `1500 gradeEquivalent should be V4`);

// Test 1520 (70% progress)
const at1520Progress = getDemarcationProgress(1520);
assert(at1520Progress.currentLevel.id === 'v4', `1520 should be V4`);
assert(at1520Progress.nextLevel?.id === 'v5', `Next level should be V5`);
assert(at1520Progress.pointsToNextLevel === 30, `1520 should be 30 pts from 1550, got ${at1520Progress.pointsToNextLevel}`);
assert(at1520Progress.levelProgress === 70, `1520 should be 70% progress, got ${at1520Progress.levelProgress}%`);

const titleAt1520 = getClimberTitleFromElo(1520);
assert(titleAt1520.gradeEquivalent === 'V4+', `1520 (70% progress) should be V4+`);

// Test 1549 (1 pt before V5)
const at1549Progress = getDemarcationProgress(1549);
assert(at1549Progress.currentLevel.id === 'v4', `1549 should be V4`);
assert(at1549Progress.pointsToNextLevel === 1, `1549 should be 1 pt from 1550`);
assert(at1549Progress.levelProgress === 99, `1549 should be 99%`);

// Test 1550 (V5 boundary)
const at1550 = getLevelDemarcation(1550);
assert(at1550.id === 'v5', `1550 should be V5, got ${at1550.id}`);
assert(at1550.title === 'Solid V5 Climber', `1550 should be Solid V5 Climber, got ${at1550.title}`);
const at1550Progress = getDemarcationProgress(1550);
assert(at1550Progress.nextLevel?.id === 'v6', `1550 next should be V6`);
assert(at1550Progress.pointsToNextLevel === 100, `1550 should be 100 pts from 1650`);
assert(at1550Progress.levelProgress === 0, `1550 should be 0%`);

// Test 1449 (1 pt before V4)
const at1449Progress = getDemarcationProgress(1449);
assert(at1449Progress.currentLevel.id === 'v3', `1449 should be V3`);
assert(at1449Progress.nextLevel?.id === 'v4', `1449 next should be V4`);
assert(at1449Progress.pointsToNextLevel === 1, `1449 should be 1 pt from 1450`);

console.log('✓ 1450 - 1550 = Solid V4 Climber and boundary checks verified');

console.log('--- 3. Testing Edge Cases (Floor, Lows, Highs, Apex, NaN, Negative) ---');
// 0 Elo
const at0 = getDemarcationProgress(0);
assert(at0.currentLevel.id === 'vb', `0 should be VB`);
assert(at0.nextLevel?.id === 'v0', `0 next should be V0`);
assert(at0.pointsToNextLevel === 1000, `0 should be 1000 pts from 1000`);

// Negative Elo
const atNeg = getDemarcationProgress(-50);
assert(atNeg.currentLevel.id === 'vb', `Negative should clamp to VB`);
assert(atNeg.levelProgress === 0, `Negative levelProgress should be 0%`);
assert(Number.isFinite(atNeg.pointsToNextLevel), `pointsToNextLevel should be finite`);

// NaN Elo
const atNaN = getDemarcationProgress(NaN);
assert(atNaN.currentLevel.id === 'v0', `NaN should safely default to 1000 (v0)`);
assert(Number.isFinite(atNaN.levelProgress), `NaN levelProgress should be finite`);
assert(Number.isFinite(atNaN.pointsToNextLevel), `NaN pointsToNextLevel should be finite`);

// 1000 Elo (V0 boundary)
const at1000 = getDemarcationProgress(1000);
assert(at1000.currentLevel.id === 'v0', `1000 should be V0`);
assert(at1000.nextLevel?.id === 'v1', `1000 next should be V1`);
assert(at1000.pointsToNextLevel === 150, `1000 should be 150 pts from 1150`);

// 2160 Elo (V10+ high progress: must NOT produce V10++)
const titleAt2160 = getClimberTitleFromElo(2160);
assert(titleAt2160.gradeEquivalent === 'V10+', `High V10+ must remain 'V10+', NOT '${titleAt2160.gradeEquivalent}'`);

// 800 Elo (VB high progress: must NOT produce VB+)
const titleAt800 = getClimberTitleFromElo(800);
assert(titleAt800.gradeEquivalent === 'VB', `High VB must remain 'VB', NOT '${titleAt800.gradeEquivalent}'`);

// 2200 Elo (Apex boundary)
const at2200 = getDemarcationProgress(2200);
assert(at2200.currentLevel.id === 'apex', `2200 should be apex`);
assert(at2200.nextLevel === null, `Apex should have null nextLevel`);
assert(at2200.pointsToNextLevel === 0, `Apex should have 0 pointsToNextLevel`);
assert(at2200.levelProgress === 100, `Apex should have 100% levelProgress`);

// 2850 Elo (Ultra-elite / Bosi)
const at2850 = getDemarcationProgress(2850);
assert(at2850.currentLevel.id === 'apex', `2850 should be apex`);
assert(at2850.nextLevel === null, `Apex should have null nextLevel`);
assert(at2850.pointsToNextLevel === 0, `Apex should have 0 pointsToNextLevel`);
assert(at2850.levelProgress === 100, `Apex should have 100% levelProgress`);

console.log('✓ Edge cases (0, -50, NaN, 1000, 2160 V10+, 2200, 2850) verified');

console.log('--- 4. Testing Real Seed Data & Crew Ladder Distribution ---');
const crewRatings = computeCrewRatings(INITIAL_PROFILES, INITIAL_ATTEMPTS, INITIAL_BOULDERS);
assert(crewRatings.length === INITIAL_PROFILES.length, `Expected ${INITIAL_PROFILES.length} ratings`);

for (const r of crewRatings) {
  assert(typeof r.elo === 'number', `Rating elo should be number`);
  assert(!!r.currentLevel, `Rating should have currentLevel`);
  assert(typeof r.levelProgress === 'number', `Rating should have levelProgress`);
  assert(typeof r.pointsToNextLevel === 'number', `Rating should have pointsToNextLevel`);
  console.log(`Climber ${r.profile?.display_name || r.userId}: ${r.elo} pts | ${r.currentLevel.title} (${r.currentLevel.minElo} - ${r.currentLevel.maxElo}) | Next: ${r.nextLevel?.title || 'Apex'} (+${r.pointsToNextLevel} pts, ${r.levelProgress}%)`);
}

// Crew ladder positions
const v4Climbers = crewRatings.filter(r => r.currentLevel.id === 'v4');
assert(v4Climbers.length === 2, `Expected 2 climbers in V4 (Alex & Taiye), got ${v4Climbers.length}`);

const v3Climbers = crewRatings.filter(r => r.currentLevel.id === 'v3');
assert(v3Climbers.length === 1, `Expected 1 climber in V3 (Dale), got ${v3Climbers.length}`);
assert(v3Climbers[0].profile?.display_name === 'Dale', `Expected Dale in V3`);

const v2Climbers = crewRatings.filter(r => r.currentLevel.id === 'v2');
assert(v2Climbers.length === 1, `Expected 1 climber in V2 (Euan), got ${v2Climbers.length}`);
assert(v2Climbers[0].profile?.display_name === 'Euan', `Expected Euan in V2`);

// Closest to V5
const leader = [...crewRatings].sort((a, b) => b.elo - a.elo)[0];
assert(leader.profile?.display_name === 'Alex', `Expected Alex to be crew leader`);
const ptsToV5 = Math.max(0, 1550 - leader.elo);
assert(ptsToV5 === 25, `Expected Alex to be 25 pts from V5, got ${ptsToV5}`);

console.log('✓ Crew ladder distribution and leaderboard metrics verified');

console.log('--- 5. Testing Pyramid Volume & Depth Requirement (Task: Single V5 & Single V6 does NOT crown Solid/Strong V5) ---');
const taiyeProfile = INITIAL_PROFILES.find((p) => p.display_name === 'Taiye')!;
assert(!!taiyeProfile, 'Taiye profile must exist in seed data');

// Helper to create test boulder
function makeTestBoulder(id: string, grade: any, hold_colour = 'Black'): Boulder {
  return {
    id,
    gym_id: 'b0000000-0000-0000-0000-000000000001',
    area_id: 'c0000000-0000-0000-0000-000000000001',
    hold_colour,
    grade,
    position_order: 1,
    notes: null,
    image_url: null,
    date_added: '2026-10-01',
    is_archived: false,
    created_by: 'a0000000-0000-0000-0000-000000000001'
  };
}

// Helper to create test attempt
function makeTestAttempt(id: string, userId: string, boulderId: string, status: any, attempt_count = 1): Attempt {
  return {
    id,
    user_id: userId,
    boulder_id: boulderId,
    status,
    attempt_count,
    logged_at: '2026-10-10T19:00:00Z'
  };
}

// 5A: Depth rules table verification
assert(getRequiredPyramidDepth('vb') === 0, 'VB requires 0 depth');
assert(getRequiredPyramidDepth('v0') === 1, 'V0 requires 1 send depth');
assert(getRequiredPyramidDepth('v1') === 2, 'V1 requires 2 sends depth');
assert(getRequiredPyramidDepth('v4') === 3, 'V4 requires 3 sends depth');
assert(getRequiredPyramidDepth('v5') === 3, 'V5 requires 3 sends depth');
assert(getRequiredPyramidDepth('v6') === 3, 'V6 requires 3 sends depth');
console.log('✓ getRequiredPyramidDepth correctly maps tier volume thresholds');

// 5B: Taiye with 1x V5 and 1x V6 sends added to seed data
const extraBoulders5B = [
  makeTestBoulder('test-b-v6', 'V6', 'Black'),
  makeTestBoulder('test-b-v5', 'V5', 'Red')
];
const extraAttempts5B = [
  makeTestAttempt('test-att-v6', taiyeProfile.id, 'test-b-v6', 'flashed', 1),
  makeTestAttempt('test-att-v5', taiyeProfile.id, 'test-b-v5', 'flashed', 1)
];

const rating5B = computeClimberRating(
  taiyeProfile.id,
  [...INITIAL_ATTEMPTS, ...extraAttempts5B],
  [...INITIAL_BOULDERS, ...extraBoulders5B],
  taiyeProfile,
  new Date('2026-10-22')
);

// Verify exact conditions: Taiye has ONLY sent one V5 and one V6
const v6Sends5B = rating5B.topSends.filter((s) => s.grade === 'V6');
const v5Sends5B = rating5B.topSends.filter((s) => s.grade === 'V5');
assert(v6Sends5B.length === 1, `Expected exactly 1 V6 send, got ${v6Sends5B.length}`);
assert(v5Sends5B.length === 1, `Expected exactly 1 V5 send, got ${v5Sends5B.length}`);
const v5PlusSends5B = rating5B.topSends.filter((s) => s.grade === 'V5' || s.grade === 'V6');
assert(v5PlusSends5B.length === 2, `Expected 2 sends at V5+, got ${v5PlusSends5B.length}`);

// CRITICAL ASSERTION: Taiye MUST NOT be crowned a Solid V5 or Strong V5 Climber!
assert(
  rating5B.currentLevel.id === 'v4',
  `Taiye must NOT be crowned V5 (expected v4, got ${rating5B.currentLevel.id})`
);
assert(
  rating5B.currentLevel.title === 'Solid V4 Climber',
  `Taiye title must be Solid V4 Climber, got ${rating5B.currentLevel.title}`
);
assert(
  rating5B.title === 'Solid V4 Climber',
  `Taiye title must be Solid V4 Climber, got ${rating5B.title}`
);
assert(
  rating5B.gradeEquivalent === 'V4+',
  `Taiye gradeEquivalent should be V4+ (projecting V5), got ${rating5B.gradeEquivalent}`
);
assert(
  rating5B.nextLevel?.id === 'v5',
  `Next level must be V5, got ${rating5B.nextLevel?.id}`
);
assert(
  rating5B.depthNeededForNextLevel === 1,
  `Taiye must need 1 more send at V5+ to unlock V5, got ${rating5B.depthNeededForNextLevel}`
);
console.log(`✓ 5B Verified: Taiye (1x V6, 1x V5) is rated "${rating5B.title} (${rating5B.gradeEquivalent})" at ${rating5B.elo} pts; NOT crowned V5`);

// 5C: Taiye with 1x V6, 1x V5, and multiple V4 flashes pushing raw Elo past 1550
const extraBoulders5C = [
  makeTestBoulder('b-v6', 'V6', 'Black'),
  makeTestBoulder('b-v5', 'V5', 'Red'),
  makeTestBoulder('b-v4-1', 'V4', 'Blue'),
  makeTestBoulder('b-v4-2', 'V4', 'Blue')
];
const extraAttempts5C = [
  makeTestAttempt('att-v6', taiyeProfile.id, 'b-v6', 'flashed', 1),
  makeTestAttempt('att-v5', taiyeProfile.id, 'b-v5', 'flashed', 1),
  makeTestAttempt('att-v4-1', taiyeProfile.id, 'b-v4-1', 'flashed', 1),
  makeTestAttempt('att-v4-2', taiyeProfile.id, 'b-v4-2', 'flashed', 1)
];

const rating5C = computeClimberRating(
  taiyeProfile.id,
  [...INITIAL_ATTEMPTS, ...extraAttempts5C],
  [...INITIAL_BOULDERS, ...extraBoulders5C],
  taiyeProfile,
  new Date('2026-10-22')
);

assert(rating5C.currentLevel.id === 'v4', `Rating 5C must remain V4 without pyramid depth, got ${rating5C.currentLevel.id}`);
assert(rating5C.currentLevel.title === 'Solid V4 Climber', `Expected Solid V4 Climber, got ${rating5C.currentLevel.title}`);
assert(rating5C.elo <= 1549, `Elo must be capped within V4 boundary (<= 1549), got ${rating5C.elo}`);
assert(rating5C.rawElo !== undefined && rating5C.rawElo >= 1550, `rawElo must be preserved and >= 1550, got ${rating5C.rawElo}`);
assert(rating5C.levelProgress === 99, `Level progress must be 99%, got ${rating5C.levelProgress}`);
assert(rating5C.pointsToNextLevel === 1, `Points to next level must be 1 pt, got ${rating5C.pointsToNextLevel}`);
assert(rating5C.depthNeededForNextLevel === 1, `Must need 1 more send at V5+, got ${rating5C.depthNeededForNextLevel}`);
assert(
  rating5C.subGradeDescription.includes('needs pyramid depth at V5'),
  `Expected subGradeDescription to mention needing pyramid depth at V5, got "${rating5C.subGradeDescription}"`
);
console.log(`✓ 5C Verified: High raw score with only 2 V5+ sends is capped at ${rating5C.elo} pts (raw: ${rating5C.rawElo}, Solid V4 Climber, 99%, 1 send needed, coaching copy verified)`);

// 5D: Proving consistent pyramid volume by bagging a 3rd send at V5+ unlocks Solid V5
const extraBoulders5D = [
  makeTestBoulder('b-v6', 'V6', 'Black'),
  makeTestBoulder('b-v5-1', 'V5', 'Red'),
  makeTestBoulder('b-v5-2', 'V5', 'Red'), // 3rd send at V5 or higher!
  makeTestBoulder('b-v4-1', 'V4', 'Blue'),
  makeTestBoulder('b-v4-2', 'V4', 'Blue')
];
const extraAttempts5D = [
  makeTestAttempt('att-v6', taiyeProfile.id, 'b-v6', 'flashed', 1),
  makeTestAttempt('att-v5-1', taiyeProfile.id, 'b-v5-1', 'flashed', 1),
  makeTestAttempt('att-v5-2', taiyeProfile.id, 'b-v5-2', 'flashed', 1),
  makeTestAttempt('att-v4-1', taiyeProfile.id, 'b-v4-1', 'flashed', 1),
  makeTestAttempt('att-v4-2', taiyeProfile.id, 'b-v4-2', 'flashed', 1)
];

const rating5D = computeClimberRating(
  taiyeProfile.id,
  [...INITIAL_ATTEMPTS, ...extraAttempts5D],
  [...INITIAL_BOULDERS, ...extraBoulders5D],
  taiyeProfile,
  new Date('2026-10-22')
);

const v5PlusSends5D = rating5D.topSends.filter((s) => s.grade === 'V5' || s.grade === 'V6');
assert(v5PlusSends5D.length === 3, `Expected 3 sends at V5+, got ${v5PlusSends5D.length}`);
assert(rating5D.elo >= 1550, `Expected Elo >= 1550, got ${rating5D.elo}`);
assert(rating5D.currentLevel.id === 'v5', `Expected V5 after demonstrating pyramid volume, got ${rating5D.currentLevel.id}`);
assert(rating5D.title === 'Solid V5 Climber', `Expected Solid V5 Climber, got ${rating5D.title}`);
assert(rating5D.gradeEquivalent === 'V5', `Expected V5 grade equivalent, got ${rating5D.gradeEquivalent}`);
assert(rating5D.nextLevel?.id === 'v6', `Expected next level V6, got ${rating5D.nextLevel?.id}`);
assert(rating5D.rawElo === undefined, 'rawElo should not be set when unconstrained by depth');
console.log(`✓ 5D Verified: Bagging 3rd V5+ send proves pyramid volume and unlocks "${rating5D.title}" (${rating5D.elo} pts)`);

// 5E: Provisional climber with ONLY 2 sends (1x V6, 1x V5) cannot leapfrog into crusher status
const provBoulders = [
  makeTestBoulder('p-v6', 'V6', 'Black'),
  makeTestBoulder('p-v5', 'V5', 'Red')
];
const provAttempts = [
  makeTestAttempt('p-att-v6', 'prov-user', 'p-v6', 'flashed', 1),
  makeTestAttempt('p-att-v5', 'prov-user', 'p-v5', 'flashed', 1)
];
const provRating = computeClimberRating('prov-user', provAttempts, provBoulders);

assert(provRating.isProvisional === true, 'Climber with 2 sends must be provisional');
assert(provRating.currentLevel.id !== 'v7', 'Must not be V7');
assert(provRating.currentLevel.id !== 'v6', 'Must not be V6');
assert(provRating.currentLevel.id !== 'v5', 'Must not be V5');
assert(provRating.currentLevel.id !== 'v4', 'Must not be V4');
assert(provRating.currentLevel.id !== 'v3', 'Must not be V3');
assert(provRating.currentLevel.id !== 'v2', 'Must not be V2');
assert(provRating.currentLevel.id === 'v1', `Expected V1 capped tier for 2 sends, got ${provRating.currentLevel.id}`);
console.log(`✓ 5E Verified: Climber with only 2 sends (1x V6, 1x V5) is provisional and capped at ${provRating.currentLevel.title}`);

// 5F: Zero sends climber: must be Base Builder (VB), NOT crowned Solid V0 Climber
const zeroSendRating = computeClimberRating('brand-new-user', [], []);
assert(zeroSendRating.currentLevel.id === 'vb', `Expected 0-send climber to be VB, got ${zeroSendRating.currentLevel.id}`);
assert(zeroSendRating.title === 'Base Builder', `Expected 0-send title to be Base Builder, got ${zeroSendRating.title}`);
assert(zeroSendRating.gradeEquivalent === 'VB', `Expected 0-send grade to be VB, got ${zeroSendRating.gradeEquivalent}`);
assert(zeroSendRating.nextLevel?.id === 'v0', `Expected 0-send next level to be V0, got ${zeroSendRating.nextLevel?.id}`);
assert(zeroSendRating.depthNeededForNextLevel === 1, `Expected 0-send climber to need 1 send for V0, got ${zeroSendRating.depthNeededForNextLevel}`);
assert(
  zeroSendRating.subGradeDescription === 'Learning the fundamentals & footwork',
  `Expected foundational description for 0-send climber, got "${zeroSendRating.subGradeDescription}"`
);
console.log(`✓ 5F Verified: Climber with 0 sends correctly defaults to "${zeroSendRating.title}" (${zeroSendRating.currentLevel.id}), NOT Solid V0`);

// 5G: 60-day aging window verification: demoting from V5 back to V4 when active V5+ send count drops below 3
const agingBoulders = [
  makeTestBoulder('age-v5-1', 'V5', 'Red'),
  makeTestBoulder('age-v5-2', 'V5', 'Red'),
  makeTestBoulder('age-v5-3', 'V5', 'Red'), // This send will age past 60 days
  makeTestBoulder('age-v4-1', 'V4', 'Blue'),
  makeTestBoulder('age-v4-2', 'V4', 'Blue'),
  makeTestBoulder('age-v4-3', 'V4', 'Blue')
];

// Reference date: Day 0 (2026-10-22)
const refDateDay0 = new Date('2026-10-22T12:00:00Z');

// Send 3 logged 55 days ago (2026-08-28) -> in window on Day 0
const agingAttemptsDay0: Attempt[] = [
  { id: 'att-a1', user_id: 'aging-climber', boulder_id: 'age-v5-1', status: 'flashed', attempt_count: 1, logged_at: '2026-10-15T12:00:00Z' }, // 7 days ago
  { id: 'att-a2', user_id: 'aging-climber', boulder_id: 'age-v5-2', status: 'flashed', attempt_count: 1, logged_at: '2026-10-01T12:00:00Z' }, // 21 days ago
  { id: 'att-a3', user_id: 'aging-climber', boulder_id: 'age-v5-3', status: 'flashed', attempt_count: 1, logged_at: '2026-08-28T12:00:00Z' }, // 55 days ago (< 60)
  { id: 'att-a4', user_id: 'aging-climber', boulder_id: 'age-v4-1', status: 'flashed', attempt_count: 1, logged_at: '2026-10-10T12:00:00Z' },
  { id: 'att-a5', user_id: 'aging-climber', boulder_id: 'age-v4-2', status: 'flashed', attempt_count: 1, logged_at: '2026-10-12T12:00:00Z' },
  { id: 'att-a6', user_id: 'aging-climber', boulder_id: 'age-v4-3', status: 'flashed', attempt_count: 1, logged_at: '2026-10-14T12:00:00Z' }
];

const ratingDay0 = computeClimberRating('aging-climber', agingAttemptsDay0, agingBoulders, undefined, refDateDay0);
assert(ratingDay0.currentLevel.id === 'v5', `Day 0: with 3 active V5 sends, expected V5, got ${ratingDay0.currentLevel.id}`);
assert(ratingDay0.title === 'Solid V5 Climber', `Day 0 title should be Solid V5 Climber`);

// Reference date: Day 10 (2026-11-01) -> Send 3 is now 65 days old (> 60 days) and expires!
const refDateDay10 = new Date('2026-11-01T12:00:00Z');
const ratingDay10 = computeClimberRating('aging-climber', agingAttemptsDay0, agingBoulders, undefined, refDateDay10);

assert(ratingDay10.currentLevel.id === 'v4', `Day 10: with expired 3rd V5 send, expected drop to V4, got ${ratingDay10.currentLevel.id}`);
assert(ratingDay10.title === 'Solid V4 Climber', `Day 10 title should drop to Solid V4 Climber`);
assert(ratingDay10.depthNeededForNextLevel === 1, `Day 10 should need 1 more send at V5+ to regain V5, got ${ratingDay10.depthNeededForNextLevel}`);
console.log(`✓ 5G Verified: 60-day window aging smoothly demotes from V5 back to V4 (needs 1 send at V5+ to regain)`);

// 5H: Provisional climber with 3 sends at V4+ (1x V6, 1x V5, 1x V4) qualifies for V4
const prov3Boulders = [
  makeTestBoulder('p3-v6', 'V6', 'Black'),
  makeTestBoulder('p3-v5', 'V5', 'Red'),
  makeTestBoulder('p3-v4', 'V4', 'Blue')
];
const prov3Attempts = [
  makeTestAttempt('p3-att-v6', 'prov3-user', 'p3-v6', 'flashed', 1),
  makeTestAttempt('p3-att-v5', 'prov3-user', 'p3-v5', 'flashed', 1),
  makeTestAttempt('p3-att-v4', 'prov3-user', 'p3-v4', 'flashed', 1)
];
const prov3Rating = computeClimberRating('prov3-user', prov3Attempts, prov3Boulders);

assert(prov3Rating.isProvisional === true, 'Climber with 3 sends must be provisional');
assert(prov3Rating.currentLevel.id === 'v4', `Expected V4 tier for 3 sends at V4+, got ${prov3Rating.currentLevel.id}`);
assert(prov3Rating.title === 'Solid V4 Climber', `Expected Solid V4 Climber, got ${prov3Rating.title}`);
assert(prov3Rating.nextLevel?.id === 'v5', `Expected next level V5, got ${prov3Rating.nextLevel?.id}`);
assert(prov3Rating.depthNeededForNextLevel === 1, `Expected 1 send needed at V5+, got ${prov3Rating.depthNeededForNextLevel}`);
assert(prov3Rating.rawElo !== undefined && prov3Rating.rawElo > 1650, `Expected rawElo > 1650, got ${prov3Rating.rawElo}`);
assert(prov3Rating.elo <= 1549, `Elo must be capped at 1549, got ${prov3Rating.elo}`);
console.log(`✓ 5H Verified: Provisional climber with 3 sends (1x V6, 1x V5, 1x V4) achieves Solid V4 Climber at 1549 pts (raw: ${prov3Rating.rawElo}, 1 send needed to unlock V5)`);

console.log('✓ All verification tests PASSED cleanly!');
