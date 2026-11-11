import {
  COMP_POINTS_CONFIG,
  getCompProblemPoints,
  computeCompWallStandings,
  computeCompWallScorecard
} from '../src/lib/compWallScoring';
import {
  WINTER_SERIES_POINTS_CONFIG,
  getWinterProblemPoints,
  computeWinterRoundStandings,
  computeWinterRoundScorecard,
  WINTER_SERIES_FORM_URL,
  WINTER_SERIES_ROUNDS,
  getWinterRoundStatus,
  getActiveWinterRound,
  isWinterRoundActiveForArea,
  isWinterSeriesBoulder,
  mergeWinterSeriesAreas,
  mergeWinterSeriesBoulders,
  getRoundBoulders,
  getWinterRoundBoulderId,
  computeWinterSeriesOverallStandings
} from '../src/lib/winterSeries';
import { INITIAL_PROFILES, INITIAL_AREAS, INITIAL_BOULDERS } from '../src/lib/seedData';
import { Attempt, Boulder } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- 1. Testing Winter Series (3 / 2 / 1 / 0 with Zones) vs Regular Comp Wall (10 / 7 / 4 / 0 without Zones) ---');
// Winter Series: 3 / 2 / 1 / 0 (has zones)
assert(WINTER_SERIES_POINTS_CONFIG.flash === 3, 'Winter Series Flash config should be 3');
assert(WINTER_SERIES_POINTS_CONFIG.top === 2, 'Winter Series Top config should be 2');
assert(WINTER_SERIES_POINTS_CONFIG.zone === 1, 'Winter Series Zone config should be 1');
assert(WINTER_SERIES_POINTS_CONFIG.none === 0, 'Winter Series None config should be 0');

assert(getWinterProblemPoints('flashed') === 3, 'Winter Series Flashed should return 3 points');
assert(getWinterProblemPoints('sent') === 2, 'Winter Series Sent (Top) should return 2 points');
assert(getWinterProblemPoints('attempted') === 1, 'Winter Series Attempted (Zone) should return 1 point');
assert(getWinterProblemPoints('untried') === 0, 'Winter Series Untried should return 0 points');
assert(getWinterProblemPoints(null) === 0, 'Winter Series Null status should return 0 points');
assert(getWinterProblemPoints(undefined) === 0, 'Winter Series Undefined status should return 0 points');

// Regular Comp Wall: 10 / 7 / 4 / 0 (no zones)
assert(COMP_POINTS_CONFIG.flash === 10, 'Regular Comp Flash config should be 10');
assert(COMP_POINTS_CONFIG.secondTry === 7, 'Regular Comp 2nd try config should be 7');
assert(COMP_POINTS_CONFIG.multiTry === 4, 'Regular Comp 3+ tries config should be 4');

assert(getCompProblemPoints('flashed', 1) === 10, 'Regular Comp Flashed should return 10 points');
assert(getCompProblemPoints('sent', 2) === 7, 'Regular Comp Sent (2 tries) should return 7 points');
assert(getCompProblemPoints('sent', 5) === 4, 'Regular Comp Sent (5 tries) should return 4 points');
assert(getCompProblemPoints('attempted', 1) === 0, 'Regular Comp Attempted (projecting, no zone) should return 0 points');
assert(getCompProblemPoints('attempted', 5) === 0, 'Regular Comp Attempted (5 tries, no zone) should return 0 points');
assert(getCompProblemPoints('untried', 0) === 0, 'Regular Comp Untried should return 0 points');
console.log('✓ Winter Series (3/2/1/0 with Zones) and Regular Comp (10/7/4/0 without Zones) point values verified');

console.log('--- 2. Testing Winter Series Rounds & Date Activation ---');
assert(WINTER_SERIES_ROUNDS.length === 4, 'Should have 4 Winter Series rounds');
assert(
  WINTER_SERIES_FORM_URL.startsWith('https://forms.cloud.microsoft/pages/responsepage.aspx?id=jc7DhGPfuUG56XXC1_s5htRFwAzcQYhNm5hG2bwZBlFUNjJMVDZKWEY1QkE3TFNSWlVJN1BVRFBJWS4u'),
  'Official Microsoft Forms URL must match'
);

// Check round schedule dates and gyms
const [r1, r2, r3, r4] = WINTER_SERIES_ROUNDS;
assert(r1.gymName === 'Bond' && r1.startDate === '2026-11-09' && r1.endDate === '2026-11-29' && r1.boulderCount === 25, 'R1 schedule mismatch');
assert(r2.gymName === 'Hub' && r2.startDate === '2026-11-30' && r2.endDate === '2026-12-20' && r2.boulderCount === 25, 'R2 schedule mismatch');
assert(r3.gymName === 'Bond' && r3.startDate === '2027-01-04' && r3.endDate === '2027-01-24' && r3.boulderCount === 25, 'R3 schedule mismatch');
assert(r4.gymName === 'Hub' && r4.startDate === '2027-01-25' && r4.endDate === '2027-02-14' && r4.boulderCount === 25, 'R4 schedule mismatch');

// Test status on Nov 11, 2026 (during Round 1)
const nov11 = new Date(2026, 10, 11, 14, 0, 0);
assert(getWinterRoundStatus(r1, nov11).status === 'active', 'R1 should be active on 2026-11-11');
assert(getWinterRoundStatus(r2, nov11).status === 'upcoming', 'R2 should be upcoming on 2026-11-11');
assert(getWinterRoundStatus(r3, nov11).status === 'upcoming', 'R3 should be upcoming on 2026-11-11');
assert(getWinterRoundStatus(r4, nov11).status === 'upcoming', 'R4 should be upcoming on 2026-11-11');
assert(getActiveWinterRound([], nov11).roundNumber === 1, 'Active round on 2026-11-11 should be R1');
assert(isWinterRoundActiveForArea(r1.areaId, nov11) === true, 'R1 area should be active on 2026-11-11');
assert(isWinterRoundActiveForArea(r2.areaId, nov11) === false, 'R2 area should not be active on 2026-11-11');

// Boundary: start and end of R2 (Nov 30, 2026 to Dec 20, 2026)
const nov30Start = new Date(2026, 10, 30, 0, 0, 0);
const dec20End = new Date(2026, 11, 20, 23, 59, 59);
assert(getWinterRoundStatus(r1, nov30Start).status === 'completed', 'R1 should be completed on 2026-11-30');
assert(getWinterRoundStatus(r2, nov30Start).status === 'active', 'R2 should be active at start of 2026-11-30');
assert(getWinterRoundStatus(r2, dec20End).status === 'active', 'R2 should be active at end of 2026-12-20');

// Gap between R2 and R3 (e.g. Dec 25, 2026)
const dec25 = new Date(2026, 11, 25, 12, 0, 0);
assert(getWinterRoundStatus(r2, dec25).status === 'completed', 'R2 should be completed on 2026-12-25');
assert(getWinterRoundStatus(r3, dec25).status === 'upcoming', 'R3 should be upcoming on 2026-12-25');
assert(getActiveWinterRound([], dec25).roundNumber === 2, 'During gap between R2 and R3, active fallback should be latest completed (R2)');

// During R3 (Jan 10, 2027) and R4 (Feb 1, 2027)
const jan10 = new Date(2027, 0, 10, 12, 0, 0);
const feb1 = new Date(2027, 1, 1, 12, 0, 0);
assert(getWinterRoundStatus(r3, jan10).status === 'active', 'R3 should be active on 2027-01-10');
assert(getWinterRoundStatus(r4, feb1).status === 'active', 'R4 should be active on 2027-02-01');
console.log('✓ Round date activation and boundary checks verified');

console.log('--- 3. Testing Pre-Populated 25 Boulders & Merging ---');
const mergedAreas = mergeWinterSeriesAreas(INITIAL_AREAS);
const mergedBoulders = mergeWinterSeriesBoulders(INITIAL_BOULDERS, nov11);
assert(mergedAreas.length === INITIAL_AREAS.length + 4, 'Should merge 4 Winter Series areas');
assert(mergedBoulders.length === INITIAL_BOULDERS.length + 100, 'Should merge 100 Winter Series boulders (4 rounds x 25)');

const r1Boulders = getRoundBoulders(r1, mergedBoulders, nov11);
assert(r1Boulders.length === 25, 'R1 should have 25 boulders');
assert(r1Boulders[0].comp_number === 1 && r1Boulders[24].comp_number === 25, 'R1 boulders should be numbered #1 to #25');
assert(r1Boulders.every(b => !b.is_archived), 'Active round R1 boulders should not be archived on 2026-11-11');
assert(r1Boulders.every(b => isWinterSeriesBoulder(b)), 'All R1 boulders should be identified as Winter Series boulders');
assert(INITIAL_BOULDERS.every(b => !isWinterSeriesBoulder(b)), 'Regular gym boulders should NOT be identified as Winter Series boulders');

const r2Boulders = getRoundBoulders(r2, mergedBoulders, nov11);
assert(r2Boulders.length === 25, 'R2 should have 25 pre-populated boulders');
assert(r2Boulders.every(b => b.is_archived), 'Upcoming round R2 boulders should be marked archived on wall on 2026-11-11');
console.log('✓ Pre-populated 25 boulders per round verified');

console.log('--- 4. Testing Winter Series Standings, Points Up For Grabs & Crew Tie-Breakers ---');
const [alex, dale, taiye, euan] = INITIAL_PROFILES;
const testAttempts: Attempt[] = [
  // Dale: 2 Flashes (6 pts), 3 Tops (6 pts), 4 Zones (4 pts) = 16 pts total
  // Remaining: 25 - (2 + 3 + 4) = 16 untried (16 * 3 = 48 pts) + 4 zones (4 * 1 = 4 pts) = 52 pts up for grabs, maxPossible = 68
  { id: 'a1', boulder_id: getWinterRoundBoulderId(1, 1), user_id: dale.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:00:00Z' },
  { id: 'a2', boulder_id: getWinterRoundBoulderId(1, 2), user_id: dale.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:05:00Z' },
  { id: 'a3', boulder_id: getWinterRoundBoulderId(1, 3), user_id: dale.id, status: 'sent', attempt_count: 2, logged_at: '2026-11-11T10:10:00Z' },
  { id: 'a4', boulder_id: getWinterRoundBoulderId(1, 4), user_id: dale.id, status: 'sent', attempt_count: 3, logged_at: '2026-11-11T10:15:00Z' },
  { id: 'a5', boulder_id: getWinterRoundBoulderId(1, 5), user_id: dale.id, status: 'sent', attempt_count: 4, logged_at: '2026-11-11T10:20:00Z' },
  { id: 'a6', boulder_id: getWinterRoundBoulderId(1, 6), user_id: dale.id, status: 'attempted', attempt_count: 1, logged_at: '2026-11-11T10:25:00Z' },
  { id: 'a7', boulder_id: getWinterRoundBoulderId(1, 7), user_id: dale.id, status: 'attempted', attempt_count: 2, logged_at: '2026-11-11T10:30:00Z' },
  { id: 'a8', boulder_id: getWinterRoundBoulderId(1, 8), user_id: dale.id, status: 'attempted', attempt_count: 1, logged_at: '2026-11-11T10:35:00Z' },
  { id: 'a9', boulder_id: getWinterRoundBoulderId(1, 9), user_id: dale.id, status: 'attempted', attempt_count: 1, logged_at: '2026-11-11T10:40:00Z' },

  // Alex: 5 Flashes (15 pts), 0 Tops, 1 Zone (1 pt) = 16 pts total (tied on points with Dale, but Dale has 5 tops vs Alex's 5 tops -> Alex has 5 flashes vs Dale's 2 flashes -> Alex wins tie-breaker!)
  { id: 'b1', boulder_id: getWinterRoundBoulderId(1, 1), user_id: alex.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:00:00Z' },
  { id: 'b2', boulder_id: getWinterRoundBoulderId(1, 2), user_id: alex.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:05:00Z' },
  { id: 'b3', boulder_id: getWinterRoundBoulderId(1, 3), user_id: alex.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:10:00Z' },
  { id: 'b4', boulder_id: getWinterRoundBoulderId(1, 4), user_id: alex.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:15:00Z' },
  { id: 'b5', boulder_id: getWinterRoundBoulderId(1, 5), user_id: alex.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:20:00Z' },
  { id: 'b6', boulder_id: getWinterRoundBoulderId(1, 6), user_id: alex.id, status: 'attempted', attempt_count: 1, logged_at: '2026-11-11T10:25:00Z' }
];

const standings = computeWinterRoundStandings(r1Boulders, testAttempts, INITIAL_PROFILES, true);
const alexStanding = standings.find(s => s.climber.id === alex.id)!;
const daleStanding = standings.find(s => s.climber.id === dale.id)!;
const taiyeStanding = standings.find(s => s.climber.id === taiye.id)!;
const euanStanding = standings.find(s => s.climber.id === euan.id)!;

assert(daleStanding.totalPoints === 16, `Expected Dale 16 pts, got ${daleStanding.totalPoints}`);
assert(daleStanding.flashesCount === 2, `Expected Dale 2 flashes, got ${daleStanding.flashesCount}`);
assert(daleStanding.topsCount === 5, `Expected Dale 5 tops (2F + 3T), got ${daleStanding.topsCount}`);
assert(daleStanding.zonesCount === 4, `Expected Dale 4 zones, got ${daleStanding.zonesCount}`);
assert(daleStanding.unattemptedCount === 16, `Expected Dale 16 untried, got ${daleStanding.unattemptedCount}`);
assert(daleStanding.bouldersLeftToScore === 20, `Expected Dale 20 boulders left to score (16 untried + 4 zones), got ${daleStanding.bouldersLeftToScore}`);
assert(daleStanding.pointsUpForGrabs === 52, `Expected Dale 52 pts up for grabs (16*3 + 4*1), got ${daleStanding.pointsUpForGrabs}`);
assert(daleStanding.maxPossiblePoints === 68, `Expected Dale 68 max possible pts (16 + 52), got ${daleStanding.maxPossiblePoints}`);

assert(alexStanding.totalPoints === 16, `Expected Alex 16 pts, got ${alexStanding.totalPoints}`);
assert(alexStanding.rank === 1 && daleStanding.rank === 2, 'Alex should rank #1 over Dale on Flash tie-breaker (5F vs 2F)');
assert(taiyeStanding.totalPoints === 0 && taiyeStanding.pointsUpForGrabs === 75 && taiyeStanding.maxPossiblePoints === 75, 'Untried climber should have 75 pts up for grabs');
assert(taiyeStanding.rank === 3 && euanStanding.rank === 3, 'Taiye and Euan should be tied at rank #3 with 0 pts');

const scorecard = computeWinterRoundScorecard(r1Boulders, testAttempts, true);
assert(scorecard.length === 25, 'Scorecard should have 25 problems');
assert(scorecard[0].userAttempts[dale.id]?.points === 3, 'Problem #1 Dale points should be 3');
assert(scorecard[2].userAttempts[dale.id]?.points === 2, 'Problem #3 Dale points should be 2');
assert(scorecard[5].userAttempts[dale.id]?.points === 1, 'Problem #6 Dale points should be 1');

const overall = computeWinterSeriesOverallStandings(mergedBoulders, testAttempts, INITIAL_PROFILES, nov11);
assert(overall[0].climber.id === alex.id && overall[0].totalPoints === 16, 'Overall standings should reflect active R1 scores');
console.log('✓ Winter Series standings, points up for grabs, max ceiling, scorecard, and tie-breakers verified');

console.log('--- 5. Testing Regular Comp Wall Standings (10 / 7 / 4 — No Zones) ---');
const regularCompBoulders: Boulder[] = [1, 2, 3].map(num => ({
  id: `reg-comp-${num}`,
  gym_id: INITIAL_AREAS[0].gym_id,
  area_id: INITIAL_AREAS[0].id,
  hold_colour: 'Red',
  grade: 'VB',
  position_order: num,
  notes: null,
  image_url: null,
  date_added: '2026-11-01',
  is_archived: false,
  is_comp: true,
  comp_number: num
}));

const regularCompAttempts: Attempt[] = [
  // Dale: #1 Flashed (10 pts), #2 Sent 2nd try (7 pts), #3 Attempted/Projecting (0 pts, NO zone) = 17 pts
  { id: 'rc1', boulder_id: 'reg-comp-1', user_id: dale.id, status: 'flashed', attempt_count: 1, logged_at: '2026-11-11T10:00:00Z' },
  { id: 'rc2', boulder_id: 'reg-comp-2', user_id: dale.id, status: 'sent', attempt_count: 2, logged_at: '2026-11-11T10:05:00Z' },
  { id: 'rc3', boulder_id: 'reg-comp-3', user_id: dale.id, status: 'attempted', attempt_count: 4, logged_at: '2026-11-11T10:10:00Z' },
  // Alex: #1 Sent 3rd try (4 pts)
  { id: 'rc4', boulder_id: 'reg-comp-1', user_id: alex.id, status: 'sent', attempt_count: 3, logged_at: '2026-11-11T10:00:00Z' }
];

const regStandings = computeCompWallStandings(regularCompBoulders, regularCompAttempts, INITIAL_PROFILES);
const daleReg = regStandings.find(s => s.climber.id === dale.id)!;
const alexReg = regStandings.find(s => s.climber.id === alex.id)!;
const taiyeReg = regStandings.find(s => s.climber.id === taiye.id)!;

assert(getCompProblemPoints('sent', 1) === 10, 'Regular Comp Sent with 1 try should return 10 points (Flash)');
assert(daleReg.totalPoints === 17, `Expected Dale 17 pts (10 + 7 + 0) on regular comp wall, got ${daleReg.totalPoints}`);
assert(daleReg.zonesCount === 0, `Expected Dale 0 zones on regular comp wall, got ${daleReg.zonesCount}`);
assert(daleReg.topsCount === 2 && daleReg.flashesCount === 1, 'Expected Dale 2 tops and 1 flash on regular comp wall');
assert(daleReg.pointsUpForGrabs === 7 && daleReg.maxPossiblePoints === 24, `Expected Dale 7 pts up for grabs (2nd try on projecting #3) and 24 max possible, got ${daleReg.pointsUpForGrabs} / ${daleReg.maxPossiblePoints}`);
assert(alexReg.totalPoints === 4, `Expected Alex 4 pts (3rd try send) on regular comp wall, got ${alexReg.totalPoints}`);
assert(taiyeReg.totalPoints === 0 && taiyeReg.pointsUpForGrabs === 30, 'Untried climber on 3-problem regular comp wall should have 30 pts up for grabs');
assert(regularCompBoulders.every(b => !isWinterSeriesBoulder(b)), 'Regular comp boulders must NOT be identified as Winter Series boulders');

const regScorecard = computeCompWallScorecard(regularCompBoulders, regularCompAttempts);
assert(regScorecard[0].userAttempts[dale.id]?.points === 10, 'Regular comp #1 Dale flash should be 10 pts');
assert(regScorecard[1].userAttempts[dale.id]?.points === 7, 'Regular comp #2 Dale 2nd try should be 7 pts');
assert(regScorecard[2].userAttempts[dale.id]?.points === 0, 'Regular comp #3 Dale projecting should be 0 pts (no zone)');
console.log('✓ Regular Comp Wall (10 / 7 / 4 without Zones) verified');

console.log('--- 6. Testing Edge Cases: Untried Records, Duplicate Attempts & Local Merge Preservation ---');
const edgeAttempts: Attempt[] = [
  ...testAttempts,
  // Explicit 'untried' record for Taiye on R1 #1 — should NOT reduce Taiye's unattemptedCount or pointsUpForGrabs
  { id: 'u1', boulder_id: getWinterRoundBoulderId(1, 1), user_id: taiye.id, status: 'untried' as unknown as Attempt['status'], attempt_count: 0, logged_at: '2026-11-11T11:00:00Z' },
  // Duplicate attempts for Euan on R1 #1 (first Zone, then Top) — should resolve to Top (2 pts)
  { id: 'd1', boulder_id: getWinterRoundBoulderId(1, 1), user_id: euan.id, status: 'attempted', attempt_count: 1, logged_at: '2026-11-11T11:00:00Z' },
  { id: 'd2', boulder_id: getWinterRoundBoulderId(1, 1), user_id: euan.id, status: 'sent', attempt_count: 2, logged_at: '2026-11-11T11:05:00Z' }
];

const edgeStandings = computeWinterRoundStandings(r1Boulders, edgeAttempts, INITIAL_PROFILES, true);
const taiyeEdge = edgeStandings.find(s => s.climber.id === taiye.id)!;
const euanEdge = edgeStandings.find(s => s.climber.id === euan.id)!;

assert(taiyeEdge.unattemptedCount === 25, `Expected Taiye 25 unattempted with 'untried' record, got ${taiyeEdge.unattemptedCount}`);
assert(taiyeEdge.pointsUpForGrabs === 75, `Expected Taiye 75 pts up for grabs with 'untried' record, got ${taiyeEdge.pointsUpForGrabs}`);
assert(taiyeEdge.completedBoulders.length === 0, `Expected Taiye 0 completedBoulders with 'untried' record, got ${taiyeEdge.completedBoulders.length}`);

assert(euanEdge.totalPoints === 2, `Expected Euan 2 pts from deduplicated Top over Zone, got ${euanEdge.totalPoints}`);
assert(euanEdge.topsCount === 1 && euanEdge.zonesCount === 0, 'Euan duplicate attempts should count as 1 Top and 0 Zones');

const edgeScorecard = computeWinterRoundScorecard(r1Boulders, edgeAttempts, true);
assert(edgeScorecard[0].userAttempts[taiye.id] === undefined, 'Scorecard should omit untried attempt records');
assert(edgeScorecard[0].userAttempts[euan.id]?.points === 2, 'Scorecard should pick highest-scoring attempt for duplicate records');

// Test local edits preservation in mergeWinterSeriesBoulders when remote DB does not have Winter Series boulders yet
const localEditedBoulders = mergedBoulders.map(b =>
  b.id === getWinterRoundBoulderId(1, 1)
    ? { ...b, hold_colour: 'Purple' as const, notes: 'Crimpy start beta' }
    : b
);
const remergedFromEmptyRemote = mergeWinterSeriesBoulders([], nov11, localEditedBoulders);
const r1b1AfterMerge = remergedFromEmptyRemote.find(b => b.id === getWinterRoundBoulderId(1, 1))!;
assert(r1b1AfterMerge.hold_colour === 'Purple', `Expected local hold_colour 'Purple' to be preserved, got ${r1b1AfterMerge.hold_colour}`);
assert(r1b1AfterMerge.notes === 'Crimpy start beta', `Expected local notes to be preserved, got ${r1b1AfterMerge.notes}`);
console.log('✓ Edge cases (untried records, duplicate attempts, local merge preservation) verified');


