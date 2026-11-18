/** One row in the example leaderboard. */
export interface DemoMember {
  name: string;
  initials: string;
  weeklyPoints: number;
  streakDays: number;
}

/**
 * Static, display-only content — the same kind of thing as
 * suggested-challenges.ts. Nothing here is an account, team, activity or
 * point total: it is never imported by lib/data/mock.ts (or any API), so the
 * example crew can't be written to a DB or mixed into a real board. The block
 * that shows it always carries an "Example" badge and an explanation line,
 * and no row carries a profile link or photo — that's what keeps it honest.
 */
export const demoCrew: {
  name: string;
  members: DemoMember[];
  activities: string[];
} = {
  name: "Morning Movers",
  members: [
    { name: "Ada", initials: "AD", weeklyPoints: 480, streakDays: 5 },
    { name: "Kofi", initials: "KO", weeklyPoints: 410, streakDays: 3 },
    { name: "Zainab", initials: "ZA", weeklyPoints: 365, streakDays: 7 },
    { name: "Tunde", initials: "TO", weeklyPoints: 290, streakDays: 2 },
    { name: "Ifeoma", initials: "IF", weeklyPoints: 240, streakDays: 4 },
  ],
  activities: [
    "Ada logged 40 squats",
    "Kofi held a 90 s plank — Camera-counted",
    "Zainab walked 8,000 steps",
    "Tunde logged 60 push-ups",
    "Ifeoma held a 75 s plank — Camera-counted",
  ],
};

/** A thin real board gets an example underneath it; a populated one never does. */
export function shouldShowDemoLeaderboard(realCount: number): boolean {
  return Number.isFinite(realCount) && realCount >= 0 && realCount < 3;
}
