import type { Challenge } from "./types";

/**
 * Card copy is derived, not stored. A featured card leads with the
 * challenge name as its eyebrow and the day count as its title ("Push-Up
 * Power Week" / "Day 4 of 7"); a standard card is the other way round.
 */
export function challengeCardCopy(c: Challenge) {
  const dayLine = `Day ${c.dayIndex} of ${c.totalDays}`;
  return c.featured
    ? { eyebrow: c.name, title: dayLine }
    : { eyebrow: "Challenge", title: c.name };
}

export function challengePercent(c: Challenge) {
  return Math.min(100, Math.max(0, (c.current / c.target) * 100));
}

export function formatCount(n: number) {
  return n.toLocaleString("en-US");
}
