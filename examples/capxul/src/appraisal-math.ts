// Appraisals' arithmetic (`design/decisions/CX-appraisals.md`, "Scores"), shared by the appraisal, goal and feedback
// handlers. Every number is a two-place BigDecimal; a worked-out score is rounded to two places half up, which for
// scores that are never negative is half away from zero.
import { BigDecimal } from "effect";

type D = BigDecimal.BigDecimal;

export const ZERO = BigDecimal.fromNumberUnsafe(0);
const FIVE = BigDecimal.fromNumberUnsafe(5);
const TWENTY = BigDecimal.fromNumberUnsafe(20);
export const HUNDRED = BigDecimal.fromNumberUnsafe(100);
const ONE = BigDecimal.fromNumberUnsafe(1);

/** A KRA line on an appraisal, and a rating line on an appraisal's self ratings or a feedback. */
export type KraLine = { readonly kra: string; readonly weightage: D; readonly score: D; readonly earned: D };
export type RatingLine = { readonly criteria: string; readonly weightage: D; readonly rating: D };

/** Two places, half up. */
export const r2 = (x: D): D => BigDecimal.round(x, { scale: 2, mode: "half-from-zero" });

/** Whether `x` lies in [lo, hi]. */
export const between = (x: D, lo: D, hi: D): boolean => BigDecimal.isGreaterThanOrEqualTo(x, lo) && BigDecimal.isLessThanOrEqualTo(x, hi);
export const inRating = (x: D): boolean => between(x, ZERO, ONE);
export const inKraScore = (x: D): boolean => between(x, ZERO, FIVE);
export const inPercent = (x: D): boolean => between(x, ZERO, HUNDRED);

/** The unrounded average, 0 for none. */
const mean = (xs: ReadonlyArray<D>): D => (xs.length === 0 ? ZERO : BigDecimal.divideUnsafe(BigDecimal.sumAll(xs), BigDecimal.fromNumberUnsafe(xs.length)));
/** The average to two places, 0 for none. */
export const avg = (xs: ReadonlyArray<D>): D => r2(mean(xs));

/** What `score` earns at `weightage` percent, unrounded. */
const share = (score: D, weightage: D): D => BigDecimal.divideUnsafe(BigDecimal.multiply(score, weightage), HUNDRED);
/** A line's stored earned score (`score_earned`, `goal_score`): score × weightage ÷ 100, to two places. */
export const earnedOf = (score: D, weightage: D): D => r2(share(score, weightage));

/**
 * An appraisal's total. Manual Rating sums the lines' unrounded shares and rounds once (HRMS's loop, so 4.25 at 30% and
 * 3.15 at 70% total 3.48); the automated method sums the rounded goal scores and divides by 20.
 */
export const totalOf = (method: string, kras: ReadonlyArray<KraLine>): D =>
  method === "Manual Rating"
    ? r2(BigDecimal.sumAll(kras.map((k) => share(k.score, k.weightage))))
    : r2(BigDecimal.divideUnsafe(BigDecimal.sumAll(kras.map((k) => k.earned)), TWENTY));

/** A self or feedback score: Σ rating × 5 × weightage ÷ 100, summed unrounded and rounded once. */
export const ratingScoreOf = (lines: ReadonlyArray<RatingLine>): D =>
  r2(BigDecimal.sumAll(lines.map((l) => share(BigDecimal.multiply(l.rating, FIVE), l.weightage))));

/** The final score: (total + self + average feedback) ÷ 3. */
export const finalOf = (total: D, self: D, feedback: D): D => r2(BigDecimal.divideUnsafe(BigDecimal.sumAll([total, self, feedback]), BigDecimal.fromNumberUnsafe(3)));

/** The status a goal's progress gives it: none is pending, all is completed, anything between is in progress. */
export const statusOf = (progress: D): "pending" | "inProgress" | "completed" =>
  BigDecimal.equals(progress, ZERO) ? "pending" : BigDecimal.equals(progress, HUNDRED) ? "completed" : "inProgress";

/**
 * Whether the given lines name each of `expected` exactly once: as many lines, no repeat, none outside. Capxul's
 * `ScoresDontMatchKras`, `SelfRatingsDontMatchCriteria` and `FeedbackRatingsDontMatchCriteria`.
 */
export const matchesOnce = (given: ReadonlyArray<string>, expected: ReadonlyArray<string>): boolean => {
  const want = new Set(expected);
  return given.length === expected.length && new Set(given).size === given.length && given.every((k) => want.has(k));
};

/**
 * A new appraisal's lines and scores, from its template: each KRA line scored 0, each criteria line a self rating of 0,
 * every score 0 (HRMS's `set_kras_and_rating_criteria`). Made by the cycle's start and by appraisal.create.
 */
export const draftFrom = (template: { readonly [field: string]: unknown }) => ({
  kras: (template["kras"] as ReadonlyArray<{ readonly kra: string; readonly weightage: D }>).map((l) => ({ kra: l.kra, weightage: l.weightage, score: ZERO, earned: ZERO })),
  selfRatings: (template["criteria"] as ReadonlyArray<{ readonly criteria: string; readonly weightage: D }>).map((l) => ({
    criteria: l.criteria,
    weightage: l.weightage,
    rating: ZERO,
  })),
  totalScore: ZERO,
  selfScore: ZERO,
  avgFeedbackScore: ZERO,
  finalScore: ZERO,
});

/** Ratings given as criteria and rating, rebuilt in the expected lines' order with their weightages. */
export const rateLines = (lines: ReadonlyArray<RatingLine>, given: ReadonlyArray<{ readonly criteria: string; readonly rating: D }>): ReadonlyArray<RatingLine> => {
  const byCriteria = new Map(given.map((g) => [g.criteria, g.rating]));
  return lines.map((l) => ({ criteria: l.criteria, weightage: l.weightage, rating: byCriteria.get(l.criteria) ?? ZERO }));
};
