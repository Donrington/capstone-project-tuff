export type Theme = "dark" | "light";

export type Plan = "free" | "pro";

export interface User {
  id: string;
  name: string;
  firstName: string;
  /** Shown around the app instead of the full name — e.g. in the nav and on cards. */
  displayName: string;
  email: string;
  initials: string;
  teamId: string | null;
  teamName: string;
  plan: Plan;
  stepGoal: number;
  /** ISO date — drives "Member since March 2026" on the profile hero. */
  memberSince: string;
  /** Up to 160 characters, shown on the profile. */
  bio: string;
  /** A data URL today (resized client-side before upload) — swaps for a real
   *  object-storage URL once there's a backend. Undefined = show initials. */
  photoUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
}

export interface TodayStats {
  steps: number;
  stepGoal: number;
  activeMinutes: number;
  calories: number;
  streakDays: number;
}

export interface DayActivity {
  day: string;
  steps: number;
  today?: boolean;
}

export interface Activity {
  id: string;
  userId: string;
  challengeId: string;
  loggedAt: string; // ISO date
  value: number; // steps, reps, seconds — unit is defined by the challenge
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  unit: string; // "steps", "reps", "seconds"
  target: number;
  current: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  dayIndex: number; // 1-based
  totalDays: number;
  teamId: string | null;
  /** Exercise slug, e.g. "pushups" — links a challenge to the library (#21). */
  activity?: string;
  /** Invite code, team challenges only — e.g. "PUSH-9T3X". */
  code?: string;
  /** At most one challenge is `featured` at a time — see the Cards usage rules. */
  featured?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  user: Pick<User, "id" | "name" | "initials">;
  teamName: string;
  score: number;
  scoreUnit: string;
  isCurrentUser?: boolean;
}

export type LeaderboardPeriod = "week" | "all-time";

export type NotificationKind = "rank" | "streak" | "team" | "challenge";

/** Named `AppNotification` because plain `Notification` is a DOM type. */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  text: string;
  /** ISO timestamp — rendered as a relative time. */
  at: string;
  href: string;
  read: boolean;
}

/** The dashboard's team tile. Grows into a full `Team` with roadmap item #1. */
export interface TeamSummary {
  name: string;
  /** Invite code — e.g. "IRON-7Q4K". */
  code: string;
  rank: number;
  totalTeams: number;
  rivalName: string;
  gapToRival: number;
  members: { initials: string }[];
  extraMembers: number;
}

/** One row in the activity bell and the profile's recent-activity list. */
export interface ActivityFeedEntry {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  isCurrentUser: boolean;
  challengeId: string;
  challengeName: string;
  value: number;
  unit: string;
  loggedAt: string; // ISO
}

export interface Achievement {
  id: string;
  name: string;
  /** One-line rule, e.g. "Keep a streak alive for 30 days." */
  rule: string;
  /** ISO date, or null while it's still locked. */
  earnedAt: string | null;
  /** Locked achievements only — how close the user is. */
  progress?: { current: number; target: number };
}

export interface PersonalBest {
  id: string;
  label: string;
  value: string;
  achievedAt: string; // ISO date
}

export interface ProfileStats {
  currentStreak: number;
  bestStreak: number;
  lifetimeSteps: number;
  repsLogged: number;
  challengesCleared: number;
}

export interface Profile {
  user: User;
  stats: ProfileStats;
  achievements: Achievement[];
  personalBests: PersonalBest[];
  recentActivity: ActivityFeedEntry[];
  activeChallenges: Challenge[];
}
