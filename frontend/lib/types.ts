export type Theme = "dark" | "light";

export type Plan = "free" | "pro";

/* ------------------------------------------------------------- the user --- */

/** Matches backend/models/User.js's `motivations` enum (onboarding step 1). */
export type Motivation = "move_more" | "get_stronger" | "build_streak" | "compete" | "team";
export type Gender = "male" | "female" | "other";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type ProfileVisibility = "everyone" | "teammates" | "only_me";

/** Matches backend/models/User.js's `notificationPrefs` exactly. */
export interface NotificationPrefs {
  streakReminders: boolean;
  teamActivity: boolean;
  leaderboardChanges: boolean;
  challengeInvites: boolean;
  weeklySummary: boolean;
  /** "HH:MM", 24-hour. */
  reminderTime: string;
}

/** Matches backend/models/User.js's `privacy` exactly. */
export interface PrivacySettings {
  showOnLeaderboards: boolean;
  profileVisibility: ProfileVisibility;
}

export interface User {
  id: string;
  /** Matches backend/models/User.js — firstName/lastName are the stored
   *  fields; nothing computes or stores a combined "name" server-side. */
  firstName: string;
  lastName: string;
  /** Shown around the app instead of the full name — e.g. in the nav and on cards. */
  displayName: string;
  email: string;
  initials: string;
  teamId: string | null;
  /** Empty when there's no team. */
  teamName: string;
  plan: Plan;
  stepGoal: number;
  workoutDaysPerWeek: number;
  /** ISO date — drives "Member since March 2026" on the profile hero. */
  memberSince: string;
  /** Up to 160 characters, shown on the profile. */
  bio: string;
  /** A Cloudinary URL from the backend (a data URL in the mock). Undefined =
   *  show initials. Named to match backend/models/User.js's `profilePicture`. */
  profilePicture?: string;
  notificationPrefs: NotificationPrefs;
  privacy: PrivacySettings;
  motivations: Motivation[];
  /** Body stats, collected in onboarding — all optional, like the model. */
  dateOfBirth?: string;
  gender?: Gender;
  /** cm */
  height?: number;
  /** kg */
  weight?: number;
  fitnessLevel?: FitnessLevel;
  /** ISO timestamp, or null until onboarding is finished or skipped. */
  onboardingCompletedAt: string | null;
}

/** Someone else, as the UI shows them — a display projection, never edited. */
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  teamId: string | null;
  profilePicture?: string;
  weeklyPoints: number;
  /** Logged something today — drives the volt ring on their avatar. */
  activeToday: boolean;
}

/* ---------------------------------------------------------------- teams --- */

export interface HeadToHeadResult {
  /** ISO date of the Monday that week started. */
  weekOf: string;
  opponentId: string;
  opponentName: string;
  outcome: "won" | "lost";
  points: number;
  opponentPoints: number;
}

/** Named to match backend/models/Team.js (`inviteCode`, `createdBy`,
 *  `maxMembers`). `rank`, `weeklyPoints`, `streakDays` and `rivalId` come
 *  from the leaderboard and are `null` until it exists (see the proposed
 *  contract in backend/README.md). There's no captain: the creator is just
 *  a member who happened to start it. */
export interface Team {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  createdBy: string;
  maxMembers: number;
  memberCount: number;
  /** Only filled in for your own team — rosters are members-only. */
  memberIds: string[];
  rank: number | null;
  weeklyPoints: number | null;
  /** Days in a row that every member logged something. */
  streakDays: number | null;
  /** The team directly above (or, at #1, directly below) in the standings. */
  rivalId: string | null;
  headToHead: HeadToHeadResult[];
}

/** The dashboard's team tile, derived from `Team`. */
export interface TeamSummary {
  id: string;
  name: string;
  /** Invite code — e.g. "IRON-7Q4K". */
  code: string;
  rank: number | null;
  totalTeams: number;
  weeklyPoints: number | null;
  rivalName: string | null;
  /** Points between you and the rival. Positive = behind, negative = ahead. */
  gapToRival: number;
  members: { id: string; initials: string; profilePicture?: string }[];
  extraMembers: number;
}

/* ------------------------------------------------------- stats & charts --- */

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

/* ---------------------------------------------------- challenges & logs --- */

export interface Activity {
  id: string;
  userId: string;
  challengeId: string;
  /** Named to match backend/models/Activity.js's `recordedAt`. */
  recordedAt: string; // ISO timestamp
  value: number; // steps, reps, seconds — unit is defined by the challenge
  note?: string;
}

export interface Challenge {
  id: string;
  /** Named to match backend/models/Challenge.js's `title`. */
  title: string;
  description: string;
  unit: string; // "steps", "reps", "seconds"
  /** Named to match backend/models/Challenge.js's `goal`. */
  goal: number;
  /** Computed on read from activities — like the backend, never stored. */
  current: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  /** Computed on read: 0 before it starts, then 1-based, capped at totalDays. */
  dayIndex: number;
  totalDays: number;
  teamId: string | null;
  /** Exercise slug, e.g. "pushups" — links a challenge to the library (#21). */
  activity?: string;
  /** Invite code, team challenges only — e.g. "PUSH-9T3X". */
  code?: string;
  /** At most one challenge is `featured` at a time — see the Cards usage rules. */
  featured?: boolean;
}

/** One logged entry, with who logged it — challenge history, team feed,
 *  profile. */
export interface ActivityEntry {
  id: string;
  person: { id: string; name: string; initials: string; profilePicture?: string };
  isCurrentUser: boolean;
  challengeId: string;
  challengeName: string;
  value: number;
  unit: string;
  recordedAt: string; // ISO
}

export interface DailyTotal {
  /** 1-based day of the challenge. */
  dayIndex: number;
  /** ISO date. */
  date: string;
  total: number;
  /** Past, today, or not yet — drives how the column draws. */
  state: "past" | "today" | "future";
}

export interface MemberContribution {
  person: { id: string; name: string; initials: string; profilePicture?: string };
  isCurrentUser: boolean;
  total: number;
  /** 0–1 share of the challenge total. */
  share: number;
}

export interface ChallengeDetail {
  challenge: Challenge;
  daily: DailyTotal[];
  /** The even pace that finishes on the last day: goal / totalDays. */
  pacePerDay: number;
  /** Team challenges only, highest first. Sums to `challenge.current`. */
  contributions: MemberContribution[];
  /** Newest first. */
  activities: ActivityEntry[];
  /** Solo challenges only. */
  bestDays: { date: string; total: number }[];
  /** Solo challenges only: days in a row logged against this challenge. */
  streak: number;
}

/* ---------------------------------------------------------- leaderboard --- */

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  /** A read-only display projection, not a Pick<User, ...> — "other people"
   *  shown here never get edited, so there's no need to carry firstName/
   *  lastName separately; `name` is whatever the API already joined. */
  user: { id: string; name: string; initials: string; profilePicture?: string | null };
  teamName: string;
  score: number;
  scoreUnit: string;
  isCurrentUser?: boolean;
}

export type LeaderboardPeriod = "week" | "all-time";

/* -------------------------------------------------------- notifications --- */

/** Matches backend/models/Notification.js's `type` enum. */
export type NotificationType = "challenge" | "achievement" | "reminder" | "system" | "general";

/** Named `AppNotification` because plain `Notification` is a DOM type.
 *  Matches GET /api/notifications exactly: `type`, `createdAt`, no link
 *  (NotificationsButton derives one from `type`). */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  /** ISO timestamp — rendered as a relative time. */
  createdAt: string;
}

/* --------------------------------------------------------------- search --- */

export type SearchKind = "challenge" | "team" | "person";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  label: string;
  /** One quiet line under the label, e.g. "Team Ironclad" for a person. */
  sublabel: string;
  href: string;
  /** Extra words that should match but aren't shown. */
  keywords: string[];
}

/* -------------------------------------------------------------- profile --- */

/** Matches GET /api/achievements. */
export interface Achievement {
  id: string;
  name: string;
  /** One-line copy shown on the card. */
  description: string;
  /** Machine rule, "<metric>:<target>" — e.g. "streak_days:7". */
  requirement: string;
  /** A Lucide icon name, e.g. "flame". */
  icon: string | null;
  points: number;
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
  recentActivity: ActivityEntry[];
  activeChallenges: Challenge[];
}

/* ----------------------------------------------------------- onboarding --- */

/** A ready-made challenge offered in onboarding (#6) and first-run states. */
export interface SuggestedChallenge {
  id: string;
  title: string;
  description: string;
  unit: string;
  goal: number;
  totalDays: number;
  activity: string;
}

/* -------------------------------------------------------------- persona --- */

/** Mock only (#20): which dataset lib/data.ts serves. */
export type Persona = "returning" | "new";
