import { cache } from "react";
import { cookies } from "next/headers";
import { MOCK_ROLE_COOKIE } from "@/lib/api/config";
import * as seed from "@/data/mock-data";
import { suggestedChallenges } from "@/data/suggested-challenges";
import { DAILY_STEPS_ID } from "@/lib/daily-steps";
import type {
  Achievement,
  Activity,
  ActivityEntry,
  AdminChallenge,
  AdminOverview,
  AdminPage,
  AdminResult,
  AdminTeam,
  AdminUser,
  AdminUserQuery,
  AppNotification,
  Challenge,
  ChallengeDetail,
  DayActivity,
  FitnessLevel,
  Gender,
  LeaderboardEntry,
  LeaderboardPeriod,
  MemberContribution,
  Motivation,
  NotificationPrefs,
  Person,
  Persona,
  PersonalBest,
  PrivacySettings,
  Profile,
  SearchItem,
  SuggestedChallenge,
  Team,
  TeamSummary,
  TodayStats,
  User,
} from "@/lib/types";

/**
 * The mock data source (TUFF_DATA_SOURCE=mock). lib/data/index.ts picks this
 * or the real API (lib/data/api.ts); both export the same functions.
 *
 * Originally the app's only data source. It stands in for the backend with an in-memory
 * mock DB, so wiring up real endpoints later means changing this file and
 * nothing else — every read below carries the call it will become.
 *
 * Server-only: import it from Server Components and server actions, never
 * from a `"use client"` file.
 *
 * Like the backend, numbers that come from logging are computed on read and
 * never stored: a challenge's total, today's steps, the weekly chart, the
 * streak, team points. That's what keeps the dashboard, challenge pages,
 * teams and profile agreeing.
 *
 * The DB lives on `globalThis`, so it survives hot reloads. It resets when the
 * dev server restarts, and on a serverless deploy each instance keeps its own
 * copy. That's fine for a frontend demo — see README "What's not here yet".
 */

/** Bump when MockDb's shape changes, so a hot reload re-seeds instead of
 *  crashing on a field the surviving object doesn't have yet. */
const SEED_VERSION = 13;

/** Mock only (#20): `new` serves a just-signed-up account with nothing in it. */
export const PERSONA_COOKIE = "tuff-persona";

interface MockDb {
  version: number;
  persona: Persona;
  user: User;
  /** Everyone except the current user. */
  people: Person[];
  teams: seed.TeamSeed[];
  /** The challenges you're in. */
  challenges: seed.ChallengeSeed[];
  activities: Activity[];
  userWeeklyPoints: number;
  allTimePoints: Record<string, number>;
  previousRanks: Record<string, number>;
  notifications: AppNotification[];
  /** Achievement id → ISO date earned. */
  earnedAt: Record<string, string>;
  personalBests: PersonalBest[];
  history: typeof seed.returningHistory;
  /** What the admin pages changed: account status/role by id, challenges cancelled. */
  admin: { status: Record<string, "active" | "suspended">; role: Record<string, "member" | "admin">; cancelled: string[] };
  nextId: number;
}

declare global {
  var __tuffDbs: Partial<Record<Persona | "admin", MockDb>> | undefined;
}

const EMPTY_HISTORY: typeof seed.returningHistory = {
  bestStreak: 0,
  lifetimeStepsBefore: 0,
  repsBefore: 0,
  challengesCleared: 0,
  bestRepsInADay: 0,
  activeMinutesToday: 0,
  caloriesToday: 0,
  weeklyDeltaPct: 0,
};

function seedReturning(): MockDb {
  const now = Date.now();
  const { people, teams, allTimePoints, previousRanks } = seed.buildPeople(now);
  const challenges = seed.buildChallenges(now);
  const teammates = people.filter((p) => p.teamId === "ironclad").map((p) => p.id);
  const activities = seed.buildActivities(now, challenges, teammates);

  const db: MockDb = {
    version: SEED_VERSION,
    persona: "returning",
    user: seed.returningUser(now),
    people,
    teams,
    challenges,
    activities,
    userWeeklyPoints: 11940,
    allTimePoints,
    previousRanks,
    notifications: [],
    earnedAt: Object.fromEntries(
      Object.entries(seed.returningEarnedDaysAgo).map(([id, days]) => [id, seed.isoDay(now - days * seed.DAY_MS)]),
    ),
    personalBests: seed.returningPersonalBests(now),
    history: seed.returningHistory,
    admin: { status: {}, role: {}, cancelled: [] },
    nextId: activities.length + 1,
  };

  const pushups = challengeView(db, challenges.find((c) => c.id === "pushup-power-week")!);
  db.notifications = seed.returningNotifications(now, {
    streak: streakOf(db),
    teamName: db.user.teamName,
    pushupPct: Math.round((pushups.current / pushups.goal) * 100),
    pushupDaysLeft: pushups.totalDays - pushups.dayIndex,
  });
  return structuredClone(db);
}

const DEFAULT_NEW_USER = { firstName: "Ada", lastName: "Nwosu", email: "ada.nwosu@example.com" };

function seedNew(input: { firstName: string; lastName: string; email: string }): MockDb {
  const now = Date.now();
  const { people, teams, allTimePoints } = seed.buildPeople(now);
  return structuredClone({
    version: SEED_VERSION,
    persona: "new" as const,
    user: seed.newUser(now, input),
    people,
    teams,
    challenges: [],
    activities: [],
    userWeeklyPoints: 0,
    allTimePoints,
    previousRanks: {},
    notifications: seed.newUserNotifications(now),
    earnedAt: {},
    personalBests: [],
    history: EMPTY_HISTORY,
    admin: { status: {}, role: {}, cancelled: [] },
    nextId: 1,
  });
}

async function currentPersona(): Promise<Persona> {
  try {
    return (await cookies()).get(PERSONA_COOKIE)?.value === "new" ? "new" : "returning";
  } catch {
    // Outside a request (e.g. a build-time render): the returning user.
    return "returning";
  }
}

/** Which in-memory DB this request reads. Someone looking at the app as an
 *  admin gets one of their own, so suspending a member or cancelling a
 *  challenge there never shows up in the other specs' data (and `/dev/reset`
 *  leaves it alone unless asked: `?scope=admin`). */
async function storeKey(): Promise<Persona | "admin"> {
  try {
    if ((await cookies()).get(MOCK_ROLE_COOKIE)?.value === "admin") return "admin";
  } catch {
    // Outside a request: fall through to the persona.
  }
  return currentPersona();
}

async function db(): Promise<MockDb> {
  const key = await storeKey();
  const store = (globalThis.__tuffDbs ??= {});
  const existing = store[key];
  if (existing?.version === SEED_VERSION) return existing;
  const fresh = key === "new" ? seedNew(DEFAULT_NEW_USER) : seedReturning();
  store[key] = fresh;
  return fresh;
}

/** Set MOCK_LATENCY_MS in .env.local to see the loading states (#8). */
async function settle<T>(value: T): Promise<T> {
  const ms = Number(process.env.MOCK_LATENCY_MS ?? 0);
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  return value;
}

/* ------------------------------------------------------ derived values --- */

const today = () => seed.startOfUtcDay(Date.now());
const dayOf = (iso: string) => seed.startOfUtcDay(Date.parse(iso));
const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();

function challengeView(d: MockDb, c: seed.ChallengeSeed): Challenge {
  const start = Date.parse(`${c.startDate}T00:00:00Z`);
  const raw = Math.floor((today() - start) / seed.DAY_MS) + 1;
  return {
    ...c,
    current: d.activities.filter((a) => a.challengeId === c.id).reduce((sum, a) => sum + a.value, 0),
    dayIndex: Math.min(c.totalDays, Math.max(0, raw)),
  };
}

function myActivities(d: MockDb) {
  return d.activities.filter((a) => a.userId === d.user.id);
}

/** Your total per UTC day for one unit, e.g. steps. */
function myDailyTotals(d: MockDb, unit: string): Map<number, number> {
  const units = new Map<string, string>(d.challenges.map((c) => [c.id, c.unit]));
  units.set(DAILY_STEPS_ID, "steps");
  const out = new Map<number, number>();
  for (const a of myActivities(d)) {
    if (units.get(a.challengeId) !== unit) continue;
    const day = dayOf(a.recordedAt);
    out.set(day, (out.get(day) ?? 0) + a.value);
  }
  return out;
}

/** Days in a row with anything logged, counting back from today — or from
 *  yesterday if nothing's in yet today, since the streak isn't broken until
 *  today ends. Same rule as backend/services/achievementService.js. */
function streakFrom(days: Set<number>) {
  let cursor = today();
  if (!days.has(cursor)) cursor -= seed.DAY_MS;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= seed.DAY_MS;
  }
  return streak;
}

function streakOf(d: MockDb) {
  return streakFrom(new Set(myActivities(d).map((a) => dayOf(a.recordedAt))));
}

function personFor(d: MockDb, id: string) {
  if (id === d.user.id) {
    return { id, name: fullName(d.user), initials: d.user.initials, profilePicture: d.user.profilePicture };
  }
  const p = d.people.find((x) => x.id === id);
  return p
    ? { id, name: fullName(p), initials: p.initials, profilePicture: p.profilePicture }
    : { id, name: "Someone", initials: "?" };
}

function toEntry(d: MockDb, a: Activity): ActivityEntry {
  const free = a.challengeId === DAILY_STEPS_ID;
  const c = d.challenges.find((x) => x.id === a.challengeId);
  return {
    id: a.id,
    person: personFor(d, a.userId),
    isCurrentUser: a.userId === d.user.id,
    challengeId: free ? "" : a.challengeId,
    challengeName: free ? "" : (c?.title ?? "a challenge"),
    value: a.value,
    unit: free ? "steps" : (c?.unit ?? "reps"),
    recordedAt: a.recordedAt,
  };
}

const newestFirst = (a: { recordedAt: string }, b: { recordedAt: string }) =>
  Date.parse(b.recordedAt) - Date.parse(a.recordedAt);

function activeToday(d: MockDb, personId: string) {
  const t = today();
  return d.activities.some((a) => a.userId === personId && dayOf(a.recordedAt) === t);
}

function memberIdsOf(d: MockDb, teamId: string) {
  const ids = d.people.filter((p) => p.teamId === teamId).map((p) => p.id);
  return d.user.teamId === teamId ? [d.user.id, ...ids] : ids;
}

function weeklyPointsOf(d: MockDb, personId: string) {
  if (personId === d.user.id) return d.userWeeklyPoints;
  return d.people.find((p) => p.id === personId)?.weeklyPoints ?? 0;
}

/** Every team with its computed numbers, best first. */
function teamViews(d: MockDb): Team[] {
  const totals = d.teams.map((t) => {
    const memberIds = memberIdsOf(d, t.id);
    return { t, memberIds, weeklyPoints: memberIds.reduce((sum, id) => sum + weeklyPointsOf(d, id), 0) };
  });
  totals.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
  return totals.map(({ t, memberIds, weeklyPoints }, i) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    inviteCode: t.inviteCode,
    createdBy: t.createdBy,
    maxMembers: t.maxMembers,
    memberCount: memberIds.length,
    memberIds,
    rank: i + 1,
    weeklyPoints,
    streakDays: t.streakDays,
    // The team just above you is who you're chasing; #1 watches #2.
    rivalId: totals.length < 2 ? null : (totals[i === 0 ? 1 : i - 1]?.t.id ?? null),
    headToHead: t.headToHead,
  }));
}

/** Matches the backend's computeMetrics, over the mock's data. */
function achievementMetrics(d: MockDb): Record<string, number> {
  const challenges = d.challenges.map((c) => challengeView(d, c));
  const reps = [...myDailyTotals(d, "reps").values()];
  const steps = [...myDailyTotals(d, "steps").values()];
  return {
    activities_logged: myActivities(d).length + (d.persona === "returning" ? 600 : 0),
    team_joined: d.user.teamId ? 1 : 0,
    challenges_completed: d.history.challengesCleared + challenges.filter((c) => c.current >= c.goal).length,
    streak_days: streakOf(d),
    reps_in_day: Math.max(d.history.bestRepsInADay, ...reps, 0),
    steps_in_day: Math.max(d.persona === "returning" ? 14820 : 0, ...steps, 0),
  };
}

function parseRequirement(requirement: string) {
  const [metric, target] = requirement.split(":");
  return { metric, target: Number(target) };
}

/** Awards anything newly earned and drops an "unlocked" notification, like
 *  backend/services/achievementService.js evaluateAchievements. */
function evaluateAchievements(d: MockDb): string[] {
  const metrics = achievementMetrics(d);
  const awarded: string[] = [];
  for (const a of seed.achievementCatalog) {
    if (d.earnedAt[a.id]) continue;
    const { metric, target } = parseRequirement(a.requirement);
    if ((metrics[metric] ?? 0) < target) continue;
    d.earnedAt[a.id] = seed.isoDay(Date.now());
    notify(d, { type: "achievement", title: `${a.name} unlocked`, message: a.description });
    awarded.push(a.name);
  }
  return awarded;
}

function notify(d: MockDb, n: Pick<AppNotification, "type" | "title" | "message">) {
  d.notifications.push({ ...n, id: `notif-${d.nextId++}`, read: false, createdAt: new Date().toISOString() });
}

/* ---------------------------------------------------------------- reads --- */

/** Mock only (#20). */
export const getPersona = cache(async (): Promise<Persona> => (await db()).persona);

// TODO(backend): GET /api/auth/me
export const getCurrentUser = cache(async (): Promise<User> => settle((await db()).user));

// TODO(backend): GET /me/stats/today
export const getTodayStats = cache(async (): Promise<TodayStats> => {
  const d = await db();
  return settle({
    steps: myDailyTotals(d, "steps").get(today()) ?? 0,
    stepGoal: d.user.stepGoal,
    activeMinutes: d.history.activeMinutesToday,
    calories: d.history.caloriesToday,
    streakDays: streakOf(d),
  });
});

// TODO(backend): GET /me/activity/week
export const getWeeklyActivity = cache(
  async (): Promise<{ days: DayActivity[]; deltaPct: number }> => {
    const d = await db();
    const steps = myDailyTotals(d, "steps");
    const t = today();
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = t - (6 - i) * seed.DAY_MS;
      return {
        day: new Date(day).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        steps: steps.get(day) ?? 0,
        today: day === t || undefined,
      };
    });
    return settle({ days, deltaPct: d.history.weeklyDeltaPct });
  },
);

// TODO(backend): GET /api/teams (standings — the leaderboard work)
export const getTeams = cache(async (): Promise<Team[]> => settle(teamViews(await db())));

// TODO(backend): GET /api/teams/:id
export const getTeam = cache(async (id: string): Promise<Team | undefined> =>
  settle(teamViews(await db()).find((t) => t.id === id)),
);

export const getMyTeam = cache(async (): Promise<Team | null> => {
  const d = await db();
  if (!d.user.teamId) return settle(null);
  return settle(teamViews(d).find((t) => t.id === d.user.teamId) ?? null);
});

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  profilePicture?: string;
  /** Null until the leaderboard exists (real data only). */
  weeklyPoints: number | null;
  activeToday: boolean;
  isCurrentUser: boolean;
  /** Started the team. Shown as a quiet note, not a role. */
  isCreator: boolean;
}

// TODO(backend): GET /api/teams/:id/members
export const getTeamMembers = cache(async (teamId: string): Promise<TeamMember[]> => {
  const d = await db();
  const team = d.teams.find((t) => t.id === teamId);
  return settle(
    memberIdsOf(d, teamId)
      .map((id) => ({
        ...personFor(d, id),
        weeklyPoints: weeklyPointsOf(d, id),
        activeToday: activeToday(d, id),
        isCurrentUser: id === d.user.id,
        isCreator: team?.createdBy === id,
      }))
      .sort((a, b) => b.weeklyPoints - a.weeklyPoints),
  );
});

/** Everything your team has logged, newest first. */
// TODO(backend): GET /api/teams/:id/activity
export const getTeamActivity = cache(async (teamId: string, limit = 30): Promise<ActivityEntry[]> => {
  const d = await db();
  const members = new Set(memberIdsOf(d, teamId));
  return settle(
    d.activities
      .filter((a) => members.has(a.userId))
      .sort(newestFirst)
      .slice(0, limit)
      .map((a) => toEntry(d, a)),
  );
});

/** The dashboard's team tile. Null when you're not on a team. */
export const getTeamSummary = cache(async (): Promise<TeamSummary | null> => {
  const d = await db();
  const teams = teamViews(d);
  const team = teams.find((t) => t.id === d.user.teamId);
  if (!team) return settle(null);
  const rival = teams.find((t) => t.id === team.rivalId) ?? null;
  const members = team.memberIds.map((id) => personFor(d, id));
  return settle({
    id: team.id,
    name: team.name,
    code: team.inviteCode,
    rank: team.rank,
    totalTeams: teams.length,
    weeklyPoints: team.weeklyPoints,
    rivalName: rival?.name ?? null,
    gapToRival: rival ? (rival.weeklyPoints ?? 0) - (team.weeklyPoints ?? 0) : 0,
    members: members.slice(0, 4).map((m) => ({ id: m.id, initials: m.initials, profilePicture: m.profilePicture })),
    extraMembers: Math.max(0, members.length - 4),
  });
});

// TODO(backend): GET /api/challenges (the ones you're in)
export const getChallenges = cache(async (): Promise<Challenge[]> => {
  const d = await db();
  return settle(d.challenges.map((c) => challengeView(d, c)));
});

// TODO(backend): GET /api/challenges/get/:id
export const getChallenge = cache(async (id: string): Promise<Challenge | undefined> => {
  const d = await db();
  const c = d.challenges.find((x) => x.id === id);
  return settle(c ? challengeView(d, c) : undefined);
});

/** At most one challenge is featured at a time — see the Cards usage rules. */
export const getFeaturedChallenge = cache(async (): Promise<Challenge | undefined> => {
  const d = await db();
  const c = d.challenges.find((x) => x.featured) ?? d.challenges[0];
  return settle(c ? challengeView(d, c) : undefined);
});

/** The step challenge the dashboard's small tile shows, if you're in one. */
export const getStepChallenge = cache(async (): Promise<Challenge | undefined> => {
  const d = await db();
  const c = d.challenges.find((x) => x.unit === "steps" && !x.featured);
  return settle(c ? challengeView(d, c) : undefined);
});

/** Your total today on a challenge — the featured card's "+N today". */
export const getTodayOnChallenge = cache(async (challengeId: string): Promise<number> => {
  const d = await db();
  const t = today();
  return settle(
    d.activities
      .filter((a) => a.challengeId === challengeId && dayOf(a.recordedAt) === t)
      .reduce((sum, a) => sum + a.value, 0),
  );
});

// TODO(backend): GET /api/challenges/get/:id + GET /api/challenge-participants/:id
// + an activities-by-challenge endpoint (not built yet).
export const getChallengeDetail = cache(async (id: string): Promise<ChallengeDetail | undefined> => {
  const d = await db();
  const stored = d.challenges.find((x) => x.id === id);
  if (!stored) return settle(undefined);
  const challenge = challengeView(d, stored);
  const logs = d.activities.filter((a) => a.challengeId === id);
  const start = Date.parse(`${challenge.startDate}T00:00:00Z`);
  const t = today();

  const byDay = new Map<number, number>();
  for (const a of logs) byDay.set(dayOf(a.recordedAt), (byDay.get(dayOf(a.recordedAt)) ?? 0) + a.value);

  const daily = Array.from({ length: challenge.totalDays }, (_, i) => {
    const day = start + i * seed.DAY_MS;
    const state: "past" | "today" | "future" = day < t ? "past" : day === t ? "today" : "future";
    return { dayIndex: i + 1, date: seed.isoDay(day), total: byDay.get(day) ?? 0, state };
  });

  let contributions: MemberContribution[] = [];
  if (challenge.teamId) {
    const totals = new Map<string, number>();
    for (const id of memberIdsOf(d, challenge.teamId)) totals.set(id, 0);
    for (const a of logs) totals.set(a.userId, (totals.get(a.userId) ?? 0) + a.value);
    contributions = [...totals.entries()]
      .map(([personId, total]) => ({
        person: personFor(d, personId),
        isCurrentUser: personId === d.user.id,
        total,
        share: challenge.current > 0 ? total / challenge.current : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  const bestDays = challenge.teamId
    ? []
    : daily
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map((x) => ({ date: x.date, total: x.total }));

  return settle({
    challenge,
    daily,
    pacePerDay: Math.ceil(challenge.goal / challenge.totalDays),
    contributions,
    activities: [...logs].sort(newestFirst).map((a) => toEntry(d, a)),
    bestDays,
    streak: challenge.teamId ? 0 : streakFrom(new Set(logs.map((a) => dayOf(a.recordedAt)))),
  });
});

function leaderboardFrom(d: MockDb, period: LeaderboardPeriod): LeaderboardEntry[] {
  const teamName = (teamId: string | null) => d.teams.find((t) => t.id === teamId)?.name ?? "No team";
  const rows = d.people.map((p) => ({
    id: p.id,
    name: fullName(p),
    initials: p.initials,
    profilePicture: p.profilePicture,
    teamName: teamName(p.teamId),
    score: period === "week" ? p.weeklyPoints : (d.allTimePoints[p.id] ?? 0),
    isCurrentUser: false,
  }));
  const myScore = period === "week" ? d.userWeeklyPoints : (d.allTimePoints[d.user.id] ?? 0);
  // Unranked until you've scored, and never if you've opted out (Settings → Privacy).
  if (myScore > 0 && d.user.privacy.showOnLeaderboards) {
    rows.push({
      id: d.user.id,
      name: fullName(d.user),
      initials: d.user.initials,
      profilePicture: d.user.profilePicture,
      teamName: teamName(d.user.teamId),
      score: myScore,
      isCurrentUser: true,
    });
  }
  rows.sort((a, b) => b.score - a.score);
  return rows.map((r, i) => ({
    rank: i + 1,
    previousRank: period === "week" ? d.previousRanks[r.id] : undefined,
    user: { id: r.id, name: r.name, initials: r.initials, profilePicture: r.profilePicture },
    teamName: r.teamName,
    score: r.score,
    scoreUnit: "pts",
    isCurrentUser: r.isCurrentUser || undefined,
  }));
}

export const getLeaderboard = cache(
  async (period: LeaderboardPeriod = "week"): Promise<LeaderboardEntry[]> =>
    settle(leaderboardFrom(await db(), period)),
);

/** Dashboard preview: the top five, plus wherever the current user sits. */
export const getDashboardLeaderboard = cache(async (): Promise<LeaderboardEntry[]> =>
  settle(leaderboardFrom(await db(), "week").filter((entry) => entry.rank <= 5 || entry.isCurrentUser)),
);

/** Everyone on your team except you — for invites and team challenges. */
export const getTeammates = cache(async (): Promise<{ id: string; name: string; initials: string }[]> => {
  const d = await db();
  if (!d.user.teamId) return settle([]);
  return settle(
    d.people
      .filter((p) => p.teamId === d.user.teamId)
      .map((p) => ({ id: p.id, name: fullName(p), initials: p.initials })),
  );
});

/** Anything you can still log against — the target isn't met yet. */
export const getActiveChallenges = cache(async (): Promise<Challenge[]> => {
  const d = await db();
  return settle(d.challenges.map((c) => challengeView(d, c)).filter((c) => c.current < c.goal));
});

/** Your own logged history, newest first. */
// TODO(backend): GET /activity?limit= (not built yet)
export const getActivityFeed = cache(async (limit = 8): Promise<ActivityEntry[]> => {
  const d = await db();
  return settle(myActivities(d).sort(newestFirst).slice(0, limit).map((a) => toEntry(d, a)));
});

/** Newest first — powers the nav bell. */
// TODO(backend): GET /api/notifications
export const getNotifications = cache(async (): Promise<AppNotification[]> => {
  const d = await db();
  return settle([...d.notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
});

// TODO(backend): GET /api/achievements
export const getAchievements = cache(async (): Promise<Achievement[]> => {
  const d = await db();
  const metrics = achievementMetrics(d);
  return settle(
    seed.achievementCatalog.map((a) => {
      const earnedAt = d.earnedAt[a.id] ?? null;
      if (earnedAt) return { ...a, earnedAt };
      const { metric, target } = parseRequirement(a.requirement);
      return { ...a, earnedAt: null, progress: { current: Math.min(metrics[metric] ?? 0, target), target } };
    }),
  );
});

// TODO(backend): GET /api/auth/me + GET /api/achievements + activity stats
export const getProfile = cache(async (): Promise<Profile> => {
  const d = await db();
  const [recentActivity, activeChallenges, achievements] = await Promise.all([
    getActivityFeed(6),
    getActiveChallenges(),
    getAchievements(),
  ]);
  const streak = streakOf(d);
  const sum = (unit: string) => [...myDailyTotals(d, unit).values()].reduce((a, b) => a + b, 0);

  return settle({
    user: d.user,
    stats: {
      currentStreak: streak,
      bestStreak: Math.max(d.history.bestStreak, streak),
      lifetimeSteps: d.history.lifetimeStepsBefore + sum("steps"),
      repsLogged: d.history.repsBefore + sum("reps"),
      challengesCleared: achievementMetrics(d).challenges_completed,
    },
    achievements,
    personalBests: d.personalBests,
    recentActivity,
    activeChallenges,
  });
});

/** A small index the search box filters on the client. */
// TODO(backend): GET /search?q= — server-side search once there's real data.
export const getSearchIndex = cache(async (): Promise<SearchItem[]> => {
  const d = await db();
  const teams = teamViews(d);
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "No team";

  const challengeItems: SearchItem[] = d.challenges.map((stored) => {
    const c = challengeView(d, stored);
    return {
      id: `challenge-${c.id}`,
      kind: "challenge",
      label: c.title,
      sublabel: `${c.teamId ? "Team" : "Solo"} · Day ${c.dayIndex} of ${c.totalDays}`,
      href: `/challenges/${c.id}`,
      keywords: [c.unit, c.activity ?? ""].filter(Boolean),
    };
  });

  const teamItems: SearchItem[] = teams.map((t) => ({
    id: `team-${t.id}`,
    kind: "team",
    label: t.name,
    sublabel: `#${t.rank} of ${teams.length} · ${t.memberIds.length} members`,
    href: `/teams/${t.id}`,
    keywords: [t.inviteCode],
  }));

  // Teammates only, same as the real search: nobody else's name is searchable.
  const personItems: SearchItem[] = d.people.filter((p) => p.teamId && p.teamId === d.user.teamId).map((p) => ({
    id: `person-${p.id}`,
    kind: "person",
    label: fullName(p),
    sublabel: teamName(p.teamId),
    href: p.teamId ? `/teams/${p.teamId}#member-${p.id}` : "/leaderboard",
    keywords: [p.firstName, p.lastName],
  }));

  return settle([...challengeItems, ...teamItems, ...personItems]);
});

export const getSuggestedChallenges = cache(async (): Promise<SuggestedChallenge[]> =>
  settle(suggestedChallenges),
);

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

// TODO(backend): GET /api/challenges/getbyCode/:code, and a team lookup by code
export const findByCode = cache(async (code: string): Promise<CodeMatch | null> => {
  const wanted = normalizeCode(code);
  if (!wanted) return null;
  const d = await db();
  const teams = teamViews(d);

  const team = teams.find((t) => normalizeCode(t.inviteCode) === wanted);
  if (team) {
    return settle({
      kind: "team" as const,
      name: team.name,
      code: team.inviteCode,
      href: `/teams/${team.id}`,
      detail: `#${team.rank} of ${teams.length} · ${team.memberIds.length} members`,
    });
  }

  const stored = d.challenges.find((c) => c.code && normalizeCode(c.code) === wanted);
  if (!stored) return settle(null);
  const challenge = challengeView(d, stored);
  return settle({
    kind: "challenge" as const,
    name: challenge.title,
    code: challenge.code!,
    href: `/challenges/${challenge.id}`,
    detail: `Day ${challenge.dayIndex} of ${challenge.totalDays} · ${challenge.current.toLocaleString("en-US")} of ${challenge.goal.toLocaleString("en-US")} ${challenge.unit}`,
  });
});

/* ------------------------------------------------------------ mutations --- */

/** Mock only (#20): reseeds the `new` dataset for whoever just signed up. */
export function startNewPersona(input: { firstName: string; lastName: string; email: string }) {
  (globalThis.__tuffDbs ??= {}).new = seedNew(input);
}

// TODO(backend): PATCH /api/users/me
export async function updateProfile(input: {
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
}): Promise<User> {
  const d = await db();
  Object.assign(d.user, input);
  d.user.initials = `${input.firstName[0] ?? ""}${input.lastName[0] ?? ""}`.toUpperCase();
  return d.user;
}

/** `dataUrl` is already resized/compressed client-side (see lib/image.ts) —
 *  `null` removes the photo. */
// TODO(backend): PUT /api/users/me/photo — the backend uploads to Cloudinary
// and stores the URL.
export async function updateProfilePhoto(dataUrl: string | null): Promise<User> {
  const d = await db();
  d.user.profilePicture = dataUrl ?? undefined;
  return d.user;
}

// TODO(backend): PATCH /api/users/me/password — the mock can't check the
// current password, so it accepts anything but the demo "wrong" one.
export async function updatePassword(input: { currentPassword: string; newPassword: string }) {
  return { ok: input.currentPassword !== "wrong-password" };
}

// TODO(backend): PATCH /api/users/me/goals
export async function updateGoals(input: { stepGoal: number; workoutDaysPerWeek: number }) {
  const d = await db();
  Object.assign(d.user, input);
  return d.user;
}

// TODO(backend): PATCH /api/users/me/notification-prefs
export async function updateNotificationPrefs(prefs: NotificationPrefs) {
  const d = await db();
  d.user.notificationPrefs = { ...prefs };
  return d.user;
}

// TODO(backend): PATCH /api/users/me/privacy
export async function updatePrivacy(privacy: PrivacySettings) {
  const d = await db();
  d.user.privacy = { ...privacy };
  return d.user;
}

export interface OnboardingAnswers {
  motivations: Motivation[];
  stepGoal?: number;
  dateOfBirth?: string;
  gender?: Gender;
  height?: number;
  weight?: number;
  fitnessLevel?: FitnessLevel;
  challengeIds: string[];
}

// TODO(backend): POST /api/users/me/onboarding, then POST
// /api/challenge-participants/:id/join for each picked challenge.
export async function completeOnboarding(answers: OnboardingAnswers) {
  const d = await db();
  const { challengeIds, ...about } = answers;
  for (const [key, value] of Object.entries(about)) {
    if (value !== undefined) (d.user as unknown as Record<string, unknown>)[key] = value;
  }
  d.user.onboardingCompletedAt = new Date().toISOString();
  for (const id of challengeIds) await joinSuggestedChallenge(id);
  return d.user;
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

function inviteCodeFor(name: string) {
  const letters = name.replace(/^team\s+/i, "").replace(/[^a-z]/gi, "").toUpperCase().padEnd(4, "X").slice(0, 4);
  const tail = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `${letters}-${tail}`;
}

// TODO(backend): POST /api/challenges/create
export async function createChallenge(input: {
  title: string;
  description: string;
  unit: string;
  goal: number;
  totalDays: number;
  startsTomorrow: boolean;
  isTeam: boolean;
  activity: string;
}): Promise<Challenge> {
  const d = await db();
  const start = today() + (input.startsTomorrow ? seed.DAY_MS : 0);
  const stored: seed.ChallengeSeed = {
    id: slugify(input.title, d.challenges.map((c) => c.id)),
    title: input.title,
    description: input.description,
    unit: input.unit,
    goal: input.goal,
    startDate: seed.isoDay(start),
    endDate: seed.isoDay(start + (input.totalDays - 1) * seed.DAY_MS),
    totalDays: input.totalDays,
    teamId: input.isTeam ? d.user.teamId : null,
    activity: input.activity,
    code: input.isTeam && d.user.teamId ? inviteCodeFor(input.title) : undefined,
  };
  d.challenges.push(stored);
  return challengeView(d, stored);
}

// TODO(backend): POST /api/challenge-participants/:id/join — for a suggested
// challenge the backend would create it first (or it'd already exist).
export async function joinSuggestedChallenge(suggestedId: string): Promise<Challenge | null> {
  const d = await db();
  const s = suggestedChallenges.find((x) => x.id === suggestedId);
  if (!s) return null;
  const existing = d.challenges.find((c) => c.id === s.id);
  if (existing) return challengeView(d, existing);
  const start = today();
  const stored: seed.ChallengeSeed = {
    id: s.id,
    title: s.title,
    description: s.description,
    unit: s.unit,
    goal: s.goal,
    startDate: seed.isoDay(start),
    endDate: seed.isoDay(start + (s.totalDays - 1) * seed.DAY_MS),
    totalDays: s.totalDays,
    teamId: null,
    activity: s.activity,
  };
  d.challenges.push(stored);
  return challengeView(d, stored);
}

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
  /** Achievement names this entry unlocked. */
  newAchievements: string[];
}

// TODO(backend): POST /api/challenge-participants/:id/activities
export async function addActivity(input: {
  challengeId: string;
  value: number;
  when: "today" | "yesterday";
  note?: string;
}): Promise<LoggedActivity | null> {
  const d = await db();
  const stored = d.challenges.find((c) => c.id === input.challengeId);
  if (!stored) return null;

  const before = challengeView(d, stored);
  const recordedAt = new Date();
  if (input.when === "yesterday") recordedAt.setUTCDate(recordedAt.getUTCDate() - 1);
  d.activities.push({
    id: `act-${d.nextId++}`,
    userId: d.user.id,
    challengeId: stored.id,
    recordedAt: recordedAt.toISOString(),
    value: input.value,
    note: input.note,
  });
  const after = challengeView(d, stored);
  const completed = before.current < after.goal && after.current >= after.goal;
  if (completed) {
    notify(d, {
      type: "challenge",
      title: `You finished ${after.title}`,
      message: `You hit the goal of ${after.goal.toLocaleString("en-US")} ${after.unit}. Nice work.`,
    });
  }

  return {
    challengeId: after.id,
    challengeName: after.title,
    code: after.code ?? null,
    unit: after.unit,
    previous: before.current,
    current: after.current,
    target: after.goal,
    completed,
    daysLeft: Math.max(0, after.totalDays - after.dayIndex),
    newAchievements: evaluateAchievements(d),
  };
}

/** What logging steps without a challenge reports back. */
export interface DailyStepsLogged {
  /** Today's steps across everything, including this entry. */
  todaySteps: number;
  newAchievements: string[];
}

// TODO(backend): POST /api/users/me/activities
export async function addDailySteps(input: { value: number; when: "today" | "yesterday" }): Promise<DailyStepsLogged> {
  const d = await db();
  const recordedAt = new Date();
  if (input.when === "yesterday") recordedAt.setUTCDate(recordedAt.getUTCDate() - 1);
  d.activities.push({
    id: `act-${d.nextId++}`,
    userId: d.user.id,
    challengeId: DAILY_STEPS_ID,
    recordedAt: recordedAt.toISOString(),
    value: input.value,
  });
  return {
    todaySteps: myDailyTotals(d, "steps").get(today()) ?? 0,
    newAchievements: evaluateAchievements(d),
  };
}

export type TeamResult = { ok: true; teamId: string } | { ok: false; error: string };

// TODO(backend): POST /api/teams
export async function createTeam(input: { name: string; description: string }): Promise<TeamResult> {
  const d = await db();
  if (d.user.teamId) return { ok: false, error: "You're already on a team. Leave it before starting a new one." };
  const id = slugify(input.name, d.teams.map((t) => t.id));
  d.teams.push({
    id,
    name: input.name,
    description: input.description,
    inviteCode: inviteCodeFor(input.name),
    createdBy: d.user.id,
    maxMembers: 10,
    streakDays: 0,
    headToHead: [],
  });
  d.user.teamId = id;
  d.user.teamName = input.name;
  evaluateAchievements(d);
  return { ok: true, teamId: id };
}

// TODO(backend): POST /api/teams/join { inviteCode }
export async function joinTeamByCode(code: string): Promise<TeamResult> {
  const d = await db();
  const team = d.teams.find((t) => normalizeCode(t.inviteCode) === normalizeCode(code));
  if (!team) return { ok: false, error: "That code doesn't match a team." };
  if (d.user.teamId === team.id) return { ok: true, teamId: team.id };
  if (d.user.teamId) return { ok: false, error: "You're already on a team. Leave it before joining another." };
  if (memberIdsOf(d, team.id).length >= team.maxMembers) return { ok: false, error: "That team is full." };
  d.user.teamId = team.id;
  d.user.teamName = team.name;
  notify(d, {
    type: "system",
    title: `Welcome to ${team.name}`,
    message: "You're on the team. Log activity to climb the team leaderboard together.",
  });
  evaluateAchievements(d);
  return { ok: true, teamId: team.id };
}

// TODO(backend): DELETE /api/teams/leave
export async function leaveTeam() {
  const d = await db();
  d.user.teamId = null;
  d.user.teamName = "";
}

// TODO(backend): PATCH /api/notifications/:id/read
export async function markNotificationRead(id: string) {
  const d = await db();
  const n = d.notifications.find((x) => x.id === id);
  if (n) n.read = true;
}

/** Mock: nothing to join — the returning user is already in every seeded
 *  challenge. */
export async function joinChallengeByCode(code: string): Promise<{ ok: true; challengeId: string } | { ok: false; error: string }> {
  const d = await db();
  const c = d.challenges.find((x) => x.code && normalizeCode(x.code) === normalizeCode(code));
  return c ? { ok: true, challengeId: c.id } : { ok: false, error: "That code doesn't match a challenge." };
}

/** Mock: the stub answer the settings page has always shown. */
export async function deleteAccount(): Promise<{ ok: boolean; message?: string }> {
  return { ok: false, message: "Account deletion goes live with the backend." };
}

// TODO(backend): PATCH /api/notifications/read-all
export async function markAllNotificationsRead() {
  const d = await db();
  for (const n of d.notifications) n.read = true;
}

/* ----------------------------------------------------------------- admin --- */

// TODO(backend): GET/PATCH /api/admin/* — see backend/controllers/adminController.js.
// Mock only: whoever is signed in is the admin (the session seam decides who
// gets to the pages), and their own account can't be changed, as on the backend.

const ADMIN_PAGE_SIZE = 20;

/** The mock has no real accounts, so these are the demo people with made-up
 *  join dates, spread over the last weeks. */
function adminUsersOf(d: MockDb): AdminUser[] {
  const now = Date.now();
  const lastActive = (id: string) =>
    d.activities.filter((a) => a.userId === id).sort(newestFirst)[0]?.recordedAt ?? null;
  const people = [
    { id: d.user.id, firstName: d.user.firstName, lastName: d.user.lastName, teamId: d.user.teamId, profilePicture: d.user.profilePicture },
    ...d.people,
  ];
  return people.map((p, i) => ({
    id: p.id,
    name: fullName(p),
    email: p.id === d.user.id ? d.user.email : `${p.firstName}.${p.lastName}@example.com`.toLowerCase(),
    role: p.id === d.user.id ? "admin" : (d.admin.role[p.id] ?? "member"),
    status: d.admin.status[p.id] ?? "active",
    createdAt: new Date(now - (i * 2 + 1) * seed.DAY_MS).toISOString(),
    profilePicture: p.profilePicture ?? null,
    teamName: d.teams.find((t) => t.id === p.teamId)?.name ?? null,
    activityCount: d.activities.filter((a) => a.userId === p.id).length,
    lastActiveAt: lastActive(p.id),
  }));
}

function adminChallengeStatus(d: MockDb, c: seed.ChallengeSeed): AdminChallenge["status"] {
  if (d.admin.cancelled.includes(c.id)) return "cancelled";
  const view = challengeView(d, c);
  return view.current >= view.goal || Date.parse(`${c.endDate}T23:59:59Z`) < Date.now() ? "completed" : "active";
}

function adminPage<T>(all: T[], page = 1): AdminPage<T> {
  const pages = Math.max(1, Math.ceil(all.length / ADMIN_PAGE_SIZE));
  const at = Math.min(Math.max(1, page), pages);
  return { rows: all.slice((at - 1) * ADMIN_PAGE_SIZE, at * ADMIN_PAGE_SIZE), total: all.length, page: at, pages };
}

export const getAdminOverview = cache(async (): Promise<AdminOverview> => {
  const d = await db();
  const users = adminUsersOf(d);
  const now = Date.now();
  const weekAgo = now - 7 * seed.DAY_MS;
  const byStatus: Record<string, number> = { draft: 0, upcoming: 0, active: 0, completed: 0, cancelled: 0 };
  for (const c of d.challenges) byStatus[adminChallengeStatus(d, c)]++;

  const firstDay = seed.startOfUtcDay(now) - 13 * seed.DAY_MS;
  const signups = Array.from({ length: 14 }, (_, i) => {
    const day = firstDay + i * seed.DAY_MS;
    return { date: new Date(day).toISOString().slice(0, 10), count: users.filter((u) => dayOf(u.createdAt) === day).length };
  });

  return settle({
    users: {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      newLast7Days: users.filter((u) => Date.parse(u.createdAt) >= weekAgo).length,
      activeLast7Days: users.filter((u) => u.lastActiveAt && Date.parse(u.lastActiveAt) >= weekAgo).length,
    },
    teams: d.teams.length,
    challenges: { total: d.challenges.length, byStatus },
    activities: {
      total: d.activities.length,
      last7Days: d.activities.filter((a) => Date.parse(a.recordedAt) >= weekAgo).length,
    },
    signups,
  });
});

export const getAdminUsers = cache(async (query: AdminUserQuery = {}): Promise<AdminPage<AdminUser>> => {
  const d = await db();
  const q = (query.q ?? "").trim().toLowerCase();
  const rows = adminUsersOf(d).filter(
    (u) =>
      (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)) &&
      (!query.status || query.status === "all" || u.status === query.status) &&
      (!query.role || query.role === "all" || u.role === query.role),
  );
  return settle(adminPage(rows, query.page));
});

export async function updateAdminUser(
  id: string,
  patch: { status?: "active" | "suspended"; role?: "member" | "admin" },
): Promise<AdminResult> {
  const d = await db();
  if (id === d.user.id) return { ok: false, error: "You can't change your own role or status." };
  if (!adminUsersOf(d).some((u) => u.id === id)) return { ok: false, error: "That account isn't there any more." };
  if (patch.status) d.admin.status[id] = patch.status;
  if (patch.role) d.admin.role[id] = patch.role;
  return { ok: true };
}

export const getAdminChallenges = cache(
  async (query: { status?: string; page?: number } = {}): Promise<AdminPage<AdminChallenge>> => {
    const d = await db();
    const rows = d.challenges
      .map((c): AdminChallenge => {
        const team = d.teams.find((t) => t.id === c.teamId);
        return {
          id: c.id,
          title: c.title,
          type: c.activity ?? c.unit,
          unit: c.unit,
          goal: c.goal,
          status: adminChallengeStatus(d, c),
          teamName: team?.name ?? null,
          createdBy: fullName(d.user),
          participants: c.teamId ? memberIdsOf(d, c.teamId).length : 1,
          startDate: c.startDate,
          endDate: c.endDate,
          createdAt: `${c.startDate}T00:00:00.000Z`,
        };
      })
      .filter((c) => !query.status || query.status === "all" || c.status === query.status);
    return settle(adminPage(rows, query.page));
  },
);

export async function cancelAdminChallenge(id: string): Promise<AdminResult> {
  const d = await db();
  const challenge = d.challenges.find((c) => c.id === id);
  if (!challenge) return { ok: false, error: "That challenge isn't there any more." };
  const status = adminChallengeStatus(d, challenge);
  if (status === "completed" || status === "cancelled") return { ok: false, error: `That challenge is already ${status}.` };
  d.admin.cancelled.push(id);
  return { ok: true };
}

export const getAdminTeams = cache(async (query: { page?: number } = {}): Promise<AdminPage<AdminTeam>> => {
  const d = await db();
  const rows = teamViews(d).map(
    (t, i): AdminTeam => ({
      id: t.id,
      name: t.name,
      status: "active",
      members: t.memberCount,
      maxMembers: t.maxMembers,
      createdBy: fullName(t.createdBy === d.user.id ? d.user : (d.people.find((p) => p.id === t.createdBy) ?? d.user)),
      createdAt: new Date(Date.now() - (i * 3 + 2) * seed.DAY_MS).toISOString(),
    }),
  );
  return settle(adminPage(rows, query.page));
});
