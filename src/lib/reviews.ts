import { LucideIcon, Feather, Scale, Flame } from 'lucide-react';
import { Boulder, BoulderReview, ReviewRating, GradeOpinion } from '../types';

export interface BoulderReviewSummary {
  totalReviews: number;
  ratingCounts: Record<ReviewRating, number>;
  gradeOpinionCounts: Record<GradeOpinion, number>;
  totalRatings: number;
  totalGradeOpinions: number;
  positivePercentage: number | null; // good / totalRatings * 100
  dominantRating: ReviewRating | null;
  dominantKaomoji: string | null;
  consensusGrade: GradeOpinion | null;
  consensusCount: number;
  consensusPercentage: number | null;
}

export interface ReviewRatingConfig {
  value: ReviewRating;
  label: string;
  shortLabel: string;
  kaomoji: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const REVIEW_RATING_CONFIG: Record<ReviewRating, ReviewRatingConfig> = {
  good: {
    value: 'good',
    label: 'Good',
    shortLabel: 'Good',
    kaomoji: '(•‿•)',
    activeBg: 'bg-emerald-500/20',
    activeBorder: 'border-emerald-500',
    activeText: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400'
  },
  ok: {
    value: 'ok',
    label: 'Okay',
    shortLabel: 'Okay',
    kaomoji: '(•_•)',
    activeBg: 'bg-slate-700/60',
    activeBorder: 'border-slate-500',
    activeText: 'text-slate-200',
    badgeBg: 'bg-slate-800',
    badgeBorder: 'border-slate-700',
    badgeText: 'text-slate-300'
  },
  rough: {
    value: 'rough',
    label: 'Rough',
    shortLabel: 'Rough',
    kaomoji: '(>_<)',
    activeBg: 'bg-rose-500/20',
    activeBorder: 'border-rose-500',
    activeText: 'text-rose-400',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-400'
  }
};

export const REVIEW_RATING_LIST: ReviewRatingConfig[] = [
  REVIEW_RATING_CONFIG.good,
  REVIEW_RATING_CONFIG.ok,
  REVIEW_RATING_CONFIG.rough
];

// Backward-compatibility aliases
export const SMILEY_CONFIG = REVIEW_RATING_CONFIG;
export const SMILEY_LIST = REVIEW_RATING_LIST;

export interface GradeOpinionConfig {
  value: GradeOpinion;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
}

export const GRADE_OPINION_CONFIG: Record<GradeOpinion, GradeOpinionConfig> = {
  soft: {
    value: 'soft',
    label: 'Soft',
    shortLabel: 'Soft',
    icon: Feather,
    activeBg: 'bg-teal-500/20',
    activeBorder: 'border-teal-400',
    activeText: 'text-teal-300',
    badgeBg: 'bg-teal-500/15',
    badgeBorder: 'border-teal-500/35',
    badgeText: 'text-teal-300',
    description: 'Feels easier than the grade'
  },
  fair: {
    value: 'fair',
    label: 'Fair',
    shortLabel: 'Fair',
    icon: Scale,
    activeBg: 'bg-sky-500/20',
    activeBorder: 'border-sky-400',
    activeText: 'text-sky-300',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/35',
    badgeText: 'text-sky-300',
    description: 'Accurate for the grade'
  },
  hard: {
    value: 'hard',
    label: 'Hard',
    shortLabel: 'Hard',
    icon: Flame,
    activeBg: 'bg-amber-500/20',
    activeBorder: 'border-amber-400',
    activeText: 'text-amber-300',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/35',
    badgeText: 'text-amber-300',
    description: 'Feels harder than the grade'
  }
};

export const GRADE_OPINION_LIST: GradeOpinionConfig[] = [
  GRADE_OPINION_CONFIG.soft,
  GRADE_OPINION_CONFIG.fair,
  GRADE_OPINION_CONFIG.hard
];

export function normalizeRating(raw?: string | null): ReviewRating | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'good' || lower === 'love' || lower === 'like') return 'good';
  if (lower === 'ok' || lower === 'okay' || lower === 'meh') return 'ok';
  if (lower === 'rough' || lower === 'dislike') return 'rough';
  return null;
}

export function normalizeGradeOpinion(raw?: string | null): GradeOpinion | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'soft') return 'soft';
  if (lower === 'fair') return 'fair';
  if (lower === 'hard' || lower === 'sandbagged') return 'hard';
  return null;
}

export function calcBoulderReviewSummary(reviews: BoulderReview[]): BoulderReviewSummary {
  const ratingCounts: Record<ReviewRating, number> = { good: 0, ok: 0, rough: 0 };
  const gradeOpinionCounts: Record<GradeOpinion, number> = { soft: 0, fair: 0, hard: 0 };

  let totalRatings = 0;
  let totalGradeOpinions = 0;

  for (const r of reviews) {
    const normRating = normalizeRating(r.rating);
    if (normRating) {
      ratingCounts[normRating]++;
      totalRatings++;
    }
    const normGrade = normalizeGradeOpinion(r.grade_opinion);
    if (normGrade) {
      gradeOpinionCounts[normGrade]++;
      totalGradeOpinions++;
    }
  }

  const positivePercentage = totalRatings > 0 ? Math.round((ratingCounts.good / totalRatings) * 100) : null;

  // Dominant rating
  let dominantRating: ReviewRating | null = null;
  let maxRatingCount = 0;
  for (const key of ['good', 'ok', 'rough'] as ReviewRating[]) {
    if (ratingCounts[key] > maxRatingCount) {
      maxRatingCount = ratingCounts[key];
      dominantRating = key;
    }
  }

  // Consensus grade opinion
  let consensusGrade: GradeOpinion | null = null;
  let consensusCount = 0;
  for (const key of ['hard', 'soft', 'fair'] as GradeOpinion[]) {
    if (gradeOpinionCounts[key] > consensusCount) {
      consensusCount = gradeOpinionCounts[key];
      consensusGrade = key;
    }
  }

  const consensusPercentage =
    totalGradeOpinions > 0 && consensusGrade
      ? Math.round((consensusCount / totalGradeOpinions) * 100)
      : null;

  return {
    totalReviews: reviews.length,
    ratingCounts,
    gradeOpinionCounts,
    totalRatings,
    totalGradeOpinions,
    positivePercentage,
    dominantRating,
    dominantKaomoji: dominantRating ? REVIEW_RATING_CONFIG[dominantRating].kaomoji : null,
    consensusGrade,
    consensusCount,
    consensusPercentage
  };
}

export interface ReviewAnalyticsStats {
  totalReviews: number;
  totalRatings: number;
  totalGradeOpinions: number;
  ratingCounts: Record<ReviewRating, number>;
  gradeOpinionCounts: Record<GradeOpinion, number>;
  ratingPercentages: Record<ReviewRating, number>;
  gradePercentages: Record<GradeOpinion, number>;
  positivePercentage: number | null;
  tendency: 'tough' | 'generous' | 'spot-on' | 'balanced' | 'pending';
  tendencyLabel: string;
  topCrowdPleasers: Array<{ boulder: Boulder; goodCount: number; totalReviews: number }>;
  topSpicyBoulders: Array<{ boulder: Boulder; hardCount: number; totalVotes: number }>;
  topSoftBoulders: Array<{ boulder: Boulder; softCount: number; totalVotes: number }>;
  topRoughBoulders: Array<{ boulder: Boulder; roughCount: number; totalReviews: number }>;
}

export function computeReviewAnalytics(
  allReviews: BoulderReview[],
  allBoulders: Boulder[],
  filterClimberId?: string | null
): ReviewAnalyticsStats {
  const scopedReviews = filterClimberId
    ? allReviews.filter((r) => r.user_id === filterClimberId)
    : allReviews;

  const ratingCounts: Record<ReviewRating, number> = { good: 0, ok: 0, rough: 0 };
  const gradeOpinionCounts: Record<GradeOpinion, number> = { soft: 0, fair: 0, hard: 0 };
  let totalRatings = 0;
  let totalGradeOpinions = 0;

  for (const r of scopedReviews) {
    const normRating = normalizeRating(r.rating);
    if (normRating) {
      ratingCounts[normRating]++;
      totalRatings++;
    }
    const normGrade = normalizeGradeOpinion(r.grade_opinion);
    if (normGrade) {
      gradeOpinionCounts[normGrade]++;
      totalGradeOpinions++;
    }
  }

  const ratingPercentages: Record<ReviewRating, number> = {
    good: totalRatings > 0 ? Math.round((ratingCounts.good / totalRatings) * 100) : 0,
    ok: totalRatings > 0 ? Math.round((ratingCounts.ok / totalRatings) * 100) : 0,
    rough: totalRatings > 0 ? Math.round((ratingCounts.rough / totalRatings) * 100) : 0
  };

  const gradePercentages: Record<GradeOpinion, number> = {
    soft: totalGradeOpinions > 0 ? Math.round((gradeOpinionCounts.soft / totalGradeOpinions) * 100) : 0,
    fair: totalGradeOpinions > 0 ? Math.round((gradeOpinionCounts.fair / totalGradeOpinions) * 100) : 0,
    hard: totalGradeOpinions > 0 ? Math.round((gradeOpinionCounts.hard / totalGradeOpinions) * 100) : 0
  };

  const positivePercentage = totalRatings > 0 ? ratingPercentages.good : null;

  let tendency: 'tough' | 'generous' | 'spot-on' | 'balanced' | 'pending' = 'pending';
  let tendencyLabel = 'Need more votes';

  if (totalGradeOpinions >= 2) {
    const hardRatio = gradeOpinionCounts.hard / totalGradeOpinions;
    const softRatio = gradeOpinionCounts.soft / totalGradeOpinions;
    const fairRatio = gradeOpinionCounts.fair / totalGradeOpinions;

    if (hardRatio >= 0.45 && gradeOpinionCounts.hard > gradeOpinionCounts.soft) {
      tendency = 'tough';
      tendencyLabel = `Tough Grader (${gradePercentages.hard}% Hard)`;
    } else if (softRatio >= 0.45 && gradeOpinionCounts.soft > gradeOpinionCounts.hard) {
      tendency = 'generous';
      tendencyLabel = `Generous Touch (${gradePercentages.soft}% Soft)`;
    } else if (fairRatio >= 0.5) {
      tendency = 'spot-on';
      tendencyLabel = `Spot-On Judge (${gradePercentages.fair}% Fair)`;
    } else {
      tendency = 'balanced';
      tendencyLabel = 'Balanced Consensus';
    }
  }

  // Aggregate by boulder for spotlight highlights
  const boulderStatsMap = new Map<string, {
    goodCount: number;
    roughCount: number;
    softCount: number;
    hardCount: number;
    totalReviews: number;
    totalGradeVotes: number;
  }>();

  for (const r of allReviews) {
    if (!boulderStatsMap.has(r.boulder_id)) {
      boulderStatsMap.set(r.boulder_id, {
        goodCount: 0,
        roughCount: 0,
        softCount: 0,
        hardCount: 0,
        totalReviews: 0,
        totalGradeVotes: 0
      });
    }
    const stat = boulderStatsMap.get(r.boulder_id)!;
    stat.totalReviews++;
    const normRating = normalizeRating(r.rating);
    if (normRating === 'good') stat.goodCount++;
    if (normRating === 'rough') stat.roughCount++;

    const normGrade = normalizeGradeOpinion(r.grade_opinion);
    if (normGrade) stat.totalGradeVotes++;
    if (normGrade === 'soft') stat.softCount++;
    if (normGrade === 'hard') stat.hardCount++;
  }

  const activeBouldersMap = new Map<string, Boulder>(allBoulders.map((b) => [b.id, b]));

  const topCrowdPleasers: Array<{ boulder: Boulder; goodCount: number; totalReviews: number }> = [];
  const topSpicyBoulders: Array<{ boulder: Boulder; hardCount: number; totalVotes: number }> = [];
  const topSoftBoulders: Array<{ boulder: Boulder; softCount: number; totalVotes: number }> = [];
  const topRoughBoulders: Array<{ boulder: Boulder; roughCount: number; totalReviews: number }> = [];

  for (const [boulderId, stats] of boulderStatsMap.entries()) {
    const boulder = activeBouldersMap.get(boulderId);
    if (!boulder || boulder.is_archived) continue;

    if (stats.goodCount > 0) {
      topCrowdPleasers.push({ boulder, goodCount: stats.goodCount, totalReviews: stats.totalReviews });
    }
    if (stats.hardCount > 0) {
      topSpicyBoulders.push({ boulder, hardCount: stats.hardCount, totalVotes: stats.totalGradeVotes });
    }
    if (stats.softCount > 0) {
      topSoftBoulders.push({ boulder, softCount: stats.softCount, totalVotes: stats.totalGradeVotes });
    }
    if (stats.roughCount > 0) {
      topRoughBoulders.push({ boulder, roughCount: stats.roughCount, totalReviews: stats.totalReviews });
    }
  }

  topCrowdPleasers.sort((a, b) => b.goodCount - a.goodCount || b.totalReviews - a.totalReviews);
  topSpicyBoulders.sort((a, b) => b.hardCount - a.hardCount || b.totalVotes - a.totalVotes);
  topSoftBoulders.sort((a, b) => b.softCount - a.softCount || b.totalVotes - a.totalVotes);
  topRoughBoulders.sort((a, b) => b.roughCount - a.roughCount || b.totalReviews - a.totalReviews);

  return {
    totalReviews: scopedReviews.length,
    totalRatings,
    totalGradeOpinions,
    ratingCounts,
    gradeOpinionCounts,
    ratingPercentages,
    gradePercentages,
    positivePercentage,
    tendency,
    tendencyLabel,
    topCrowdPleasers: topCrowdPleasers.slice(0, 3),
    topSpicyBoulders: topSpicyBoulders.slice(0, 3),
    topSoftBoulders: topSoftBoulders.slice(0, 3),
    topRoughBoulders: topRoughBoulders.slice(0, 3)
  };
}
