/**
 * The per-day total needed to finish a challenge. Round up: rounding down
 * would leave a shortfall on the last day. Incomplete form values return 0.
 */
export function challengePace(goal: number, totalDays: number): number {
  if (!Number.isFinite(goal) || !Number.isFinite(totalDays) || goal <= 0 || totalDays <= 0) return 0;
  return Math.ceil(goal / totalDays);
}
