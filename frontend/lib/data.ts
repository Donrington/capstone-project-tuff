import { cache } from "react";
import * as seed from "@/data/mock-data";
import type {
  Achievement,
  Activity,
  ActivityFeedEntry,
  AppNotification,
  Challenge,
  DayActivity,
  LeaderboardEntry,
  LeaderboardPeriod,
  PersonalBest,
  Profile,
  ProfileStats,
  TeamSummary,
  TodayStats,
  User,
} from "@/lib/types";

/**
 * The app's only data source. It stands in for the backend with an in-memory
 * mock DB, so wiring up real endpoints later means changing this file and
 * nothing else — every read below carries the call it will become.
 *
 * Server-only: import it from Server Components and server actions, never
 * from a `"use client"` file.
 *
 * The DB lives on `globalThis`, so it survives hot reloads. It resets when the
 * dev server restarts, and on a serverless deploy each instance keeps its own
 * copy. That's fine for a frontend demo — see README "What's not here yet".
 */

/** Bump when MockDb's shape changes, so a hot reload re-seeds instead of
 *  crashing on a field the surviving object doesn't have yet. */
const SEED_VERSION = 8;

interface MockDb {
  version: number;
  user: User;
  todayStats: Omit<TodayStats, "stepGoal">;
  weeklyActivity: DayActivity[];
  weeklyDeltaPct: number;
  team: TeamSummary;
  challenges: Challenge[];
  activities: Activity[];
  leaderboard: Record<LeaderboardPeriod, LeaderboardEntry[]>;
  notifications: AppNotification[];
  activityFeed: ActivityFeedEntry[];
  /** Everything at or before this moment counts as seen — see getActivityFeed. */
  activityFeedSeenAt: string;
  achievements: Achievement[];
  personalBests: PersonalBest[];
  profileStats: ProfileStats;
}

declare global {
  var __tuffDb: MockDb | undefined;
}

function seedDb(): MockDb {
  // Cloned so a mutation can never write back into the seed module.
  return structuredClone({
    version: SEED_VERSION,
    user: seed.currentUser,
    todayStats: seed.todayStats,
    weeklyActivity: seed.weeklyActivity,
    weeklyDeltaPct: seed.weeklyDeltaPct,
    team: seed.team,
    challenges: seed.challenges,
    activities: [],
    leaderboard: { week: seed.leaderboard, "all-time": seed.allTimeLeaderboard },
    notifications: [],
    activityFeed: seed.activityFeed,
    activityFeedSeenAt: seed.activityFeedSeenAt,
    achievements: seed.achievements,
    personalBests: seed.personalBests,
    profileStats: seed.profileStats,
  });
}

function db(): MockDb {
  if (globalThis.__tuffDb?.version !== SEED_VERSION) globalThis.__tuffDb = seedDb();
  return globalThis.__tuffDb;
}

/** Set MOCK_LATENCY_MS in .env.local to see the loading states (#8). */
async function settle<T>(value: T): Promise<T> {
  const ms = Number(process.env.MOCK_LATENCY_MS ?? 0);
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  return value;
}

/* ---------------------------------------------------------------- reads --- */

// TODO(backend): GET /me
export const getCurrentUser = cache(async (): Promise<User> => settle(db().user));

// TODO(backend): GET /me/stats/today
export const getTodayStats = cache(async (): Promise<TodayStats> => {
  const { todayStats, user } = db();
  return settle({ ...todayStats, stepGoal: user.stepGoal });
});

// TODO(backend): GET /me/activity/week
export const getWeeklyActivity = cache(
  async (): Promise<{ days: DayActivity[]; deltaPct: number }> => {
    const { weeklyActivity, weeklyDeltaPct } = db();
    return settle({ days: weeklyActivity, deltaPct: weeklyDeltaPct });
  },
);

// TODO(backend): GET /me/team
export const getTeamSummary = cache(async (): Promise<TeamSummary> => settle(db().team));

// TODO(backend): GET /challenges
export const getChallenges = cache(async (): Promise<Challenge[]> => settle(db().challenges));

// TODO(backend): GET /challenges/:id
export const getChallenge = cache(async (id: string): Promise<Challenge | undefined> =>
  settle(db().challenges.find((c) => c.id === id)),
);

/** At most one challenge is featured at a time — see the Cards usage rules. */
export const getFeaturedChallenge = cache(async (): Promise<Challenge | undefined> =>
  settle(db().challenges.find((c) => c.featured)),
);

// TODO(backend): GET /leaderboard?period=
export const getLeaderboard = cache(
  async (period: LeaderboardPeriod = "week"): Promise<LeaderboardEntry[]> =>
    settle(db().leaderboard[period]),
);

/** Dashboard preview: the top five, plus wherever the current user sits. */
export const getDashboardLeaderboard = cache(async (): Promise<LeaderboardEntry[]> =>
  settle(db().leaderboard.week.filter((entry) => entry.rank <= 5 || entry.isCurrentUser)),
);

/** Everyone on your team except you — for invites and team challenges. */
export const getTeammates = cache(async (): Promise<Pick<User, "id" | "name" | "initials">[]> => {
  const { user, leaderboard } = db();
  return settle(
    leaderboard.week
      .filter((entry) => entry.teamName === user.teamName && entry.user.id !== user.id)
      .map((entry) => entry.user),
  );
});

/** Anything you can still log against — the target isn't met yet. */
export const getActiveChallenges = cache(async (): Promise<Challenge[]> =>
  settle(db().challenges.filter((c) => c.current < c.target)),
);

/**
 * The activity bell and the profile's recent-activity list, newest first:
 * whatever's been freshly logged this session, merged with the seeded feed.
 * `seenAt` lets the caller work out how many of these are new.
 */
// TODO(backend): GET /activity?limit=
export const getActivityFeed = cache(
  async (limit = 8): Promise<{ entries: ActivityFeedEntry[]; seenAt: string }> => {
    const database = db();
    const live: ActivityFeedEntry[] = database.activities.map((a) => {
      const challenge = database.challenges.find((c) => c.id === a.challengeId);
      return {
        id: a.id,
        userId: a.userId,
        userName: database.user.name,
        userInitials: database.user.initials,
        isCurrentUser: true,
        challengeId: a.challengeId,
        challengeName: challenge?.name ?? "a challenge",
        value: a.value,
        unit: challenge?.unit ?? "reps",
        loggedAt: a.loggedAt,
      };
    });

    const merged = [...live, ...database.activityFeed].sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );

    return settle({ entries: merged.slice(0, limit), seenAt: database.activityFeedSeenAt });
  },
);

/** Called when the activity bell opens, so its unread dot clears. */
// TODO(backend): POST /activity/seen
export async function setActivityFeedSeen(): Promise<void> {
  db().activityFeedSeenAt = new Date().toISOString();
}

// TODO(backend): GET /me/profile
export const getProfile = cache(async (): Promise<Profile> => {
  const database = db();
  const [{ entries }, activeChallenges] = await Promise.all([
    getActivityFeed(20),
    getActiveChallenges(),
  ]);

  return settle({
    user: database.user,
    stats: { ...database.profileStats, currentStreak: database.todayStats.streakDays },
    achievements: database.achievements,
    personalBests: database.personalBests,
    recentActivity: entries.filter((entry) => entry.isCurrentUser).slice(0, 6),
    activeChallenges,
  });
});

/* ------------------------------------------------------------ mutations --- */

export interface LoggedActivity {
  challengeId: string;
  challengeName: string;
  /** Invite code, so the celebration can share a joinable link. */
  code: string | null;
  unit: string;
  /** The total before this entry, so the UI can show the jump. */
  previous: number;
  current: number;
  target: number;
  completed: boolean;
  daysLeft: number;
}

export interface CodeMatch {
  kind: "team" | "challenge";
  name: string;
  code: string;
  href: string;
  /** One line about what's happening, for the join preview. */
  detail: string;
}

/** Codes are compared without the dash and case-insensitively, so a typed or
 *  pasted code matches either way. */
function normalizeCode(code: string) {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

// TODO(backend): GET /invites/:code
export const findByCode = cache(async (code: string): Promise<CodeMatch | null> => {
  const wanted = normalizeCode(code);
  if (!wanted) return null;
  const database = db();

  if (normalizeCode(database.team.code) === wanted) {
    const { team } = database;
    return settle({
      kind: "team" as const,
      name: team.name,
      code: team.code,
      href: "/teams",
      detail: `#${team.rank} of ${team.totalTeams} · ${team.members.length + team.extraMembers} members`,
    });
  }

  const challenge = database.challenges.find(
    (c) => c.code && normalizeCode(c.code) === wanted,
  );
  if (!challenge) return settle(null);

  return settle({
    kind: "challenge" as const,
    name: challenge.name,
    code: challenge.code!,
    href: `/challenges/${challenge.id}`,
    detail: `Day ${challenge.dayIndex} of ${challenge.totalDays} · ${challenge.current.toLocaleString("en-US")} of ${challenge.target.toLocaleString("en-US")} ${challenge.unit}`,
  });
});

// TODO(backend): PATCH /me
export async function updateProfile(input: {
  name: string;
  displayName: string;
  bio: string;
}): Promise<User> {
  const database = db();
  database.user.name = input.name;
  database.user.firstName = input.name.split(" ")[0] || input.name;
  database.user.displayName = input.displayName;
  database.user.bio = input.bio;
  return database.user;
}

/** `dataUrl` is already resized/compressed client-side (see lib/image.ts) —
 *  `null` removes the photo. */
// TODO(backend): PUT /me/photo — swap the data URL for real object storage
// (S3/Cloudinary) plus a CDN URL; this only works because the mock DB is a
// single in-memory record, not a database column.
export async function updateProfilePhoto(dataUrl: string | null): Promise<User> {
  const database = db();
  database.user.photoUrl = dataUrl ?? undefined;
  return database.user;
}

/** Turns a name into a url-safe id, kept unique against what's already there. */
function slugify(name: string, taken: string[]) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "challenge";
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// TODO(backend): POST /challenges
export async function createChallenge(input: {
  name: string;
  description: string;
  unit: string;
  target: number;
  totalDays: number;
  startsTomorrow: boolean;
  isTeam: boolean;
  activity: string;
}): Promise<Challenge> {
  const database = db();
  const start = new Date();
  if (input.startsTomorrow) start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + input.totalDays);

  const challenge: Challenge = {
    id: slugify(input.name, database.challenges.map((c) => c.id)),
    name: input.name,
    description: input.description,
    unit: input.unit,
    target: input.target,
    current: 0,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    dayIndex: input.startsTomorrow ? 0 : 1,
    totalDays: input.totalDays,
    teamId: input.isTeam ? database.user.teamId : null,
    activity: input.activity,
  };

  database.challenges.push(challenge);
  return challenge;
}

/**
 * Adds an entry, bumps the challenge, and — for a step challenge logged
 * today — moves today's steps and the weekly chart with it.
 */
// TODO(backend): POST /challenges/:id/activities
export async function addActivity(input: {
  challengeId: string;
  value: number;
  when: "today" | "yesterday";
  note?: string;
}): Promise<LoggedActivity | null> {
  const database = db();
  const challenge = database.challenges.find((c) => c.id === input.challengeId);
  if (!challenge) return null;

  const loggedAt = new Date();
  if (input.when === "yesterday") loggedAt.setDate(loggedAt.getDate() - 1);

  database.activities.push({
    id: `activity-${database.activities.length + 1}`,
    userId: database.user.id,
    challengeId: challenge.id,
    loggedAt: loggedAt.toISOString(),
    value: input.value,
  });

  const previous = challenge.current;
  challenge.current += input.value;

  if (challenge.unit === "steps" && input.when === "today") {
    database.todayStats.steps += input.value;
    const today = database.weeklyActivity.find((day) => day.today);
    if (today) today.steps = database.todayStats.steps;
  }

  return {
    challengeId: challenge.id,
    challengeName: challenge.name,
    code: challenge.code ?? null,
    unit: challenge.unit,
    previous,
    current: challenge.current,
    target: challenge.target,
    completed: previous < challenge.target && challenge.current >= challenge.target,
    daysLeft: Math.max(0, challenge.totalDays - challenge.dayIndex),
  };
}
