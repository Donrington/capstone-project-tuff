/**
 * Returns just the noun — callers print the count themselves. Pass an explicit
 * plural for words that don't simply take an "s" (e.g. `pluralize(1, "rep", "reps")`).
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return Math.abs(count) === 1 ? singular : plural;
}
