import {
  METRICS_WINDOW_DAYS,
  SCORING_NEEDLE_EXPONENT,
  SCORING_RECENCY_EXPONENT,
  SCORING_RECENCY_FLOOR,
} from "@/lib/constants";

export function computeFeaturedActionScore(needleScore: number, daysAgo: number): number {
  const x = needleScore / 100;
  return (
    Math.pow(x, SCORING_NEEDLE_EXPONENT) *
    Math.pow(Math.max(SCORING_RECENCY_FLOOR, 1 - daysAgo / METRICS_WINDOW_DAYS), SCORING_RECENCY_EXPONENT)
  );
}
