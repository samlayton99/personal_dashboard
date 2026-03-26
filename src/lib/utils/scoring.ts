export function computeFeaturedActionScore(needleScore: number, daysAgo: number): number {
  const x = needleScore / 100;
  return Math.pow(x, 0.3) * Math.pow(Math.max(0.01, 1 - daysAgo / 90), 0.7);
}
