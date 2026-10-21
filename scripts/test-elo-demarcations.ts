import {
  ELO_DEMARCATIONS,
  getLevelDemarcation,
  getNextLevelDemarcation,
  getDemarcationProgress,
  getClimberTitleFromElo,
  computeCrewRatings
} from '../src/lib/ratingEngine';
import { INITIAL_PROFILES, INITIAL_ATTEMPTS, INITIAL_BOULDERS } from '../src/lib/seedData';

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
console.log('✓ All verification tests PASSED cleanly!');
