import { cache } from "react";
import { suggestedChallenges } from "@/data/suggested-challenges";
import { api, apiOptional, ApiError, isObjectId } from "@/lib/api/client";
import { clearSessionCookies } from "@/lib/api/cookies";
import type {
  Achievement,
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
import type { CodeMatch, LoggedActivity, OnboardingAnswers, TeamMember, TeamResult } from "./mock";

/**
 * The real data source: every read and write goes to the Express backend
 * (lib/api/client.ts forwards the session cookies). Same exports and
 * signatures as ./mock, so pages don't know which one they're on —
 * lib/data/index.ts picks.
 *
 * Leaderboard-derived numbers (weekly points, ranks, rivals, team streaks)
 * come from GET /api/leaderboard and /api/leaderboard/teams. A team that
 * hasn't scored this week isn't in the standings, so its rank and points
 * are null and the UI leaves those bits out.
 */

/* ------------------------------------------------------- backend shapes --- */

interface RawUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  bio?: string;
  teamId: string | null;
  email: string;
  profilePicture: string | null;
  role: "member" | "admin";
  createdAt: string;
  stepGoal: number;
  workoutDaysPerWeek: number;
  notificationPrefs: NotificationPrefs;
  privacy: PrivacySettings;
  motivations?: Motivation[];
  dateOfBirth?: string;
  gender?: Gender;
  height?: number;
  weight?: number;
  fitnessLevel?: FitnessLevel;
  onboardingCompletedAt?: string | null;
}

interface RawChallenge {
  _id: string;
  title: string;
  description: string;
  teamId: string | null;
  type: string;
  inviteCode?: string;
  featured?: boolean;
  goal: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: string;
  current?: number;
  dayIndex?: number;
  totalDays?: number;
}

interface RawTeam {
  _id: string;
  name: string;
  description?: string;
  inviteCode: string;
  /** Populated by GET /api/teams; null once the creator has deleted their account. */
  createdBy: string | { _id: string } | null;
  maxMembers: number;
  memberCount?: number;
}

interface RawMember {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
}

interface RawParticipant {
  user: RawMember | null;
  progress: number;
}

interface RawEntry {
  id: string;
  person: { id: string | null; name: string; initials: string; profilePicture: string | null };
  challengeId: string | null;
  challengeName: string;
  value: number;
  unit: string;
  recordedAt: string;
}

interface RawStats {
  today: { steps: number; activeMinutes: number; calories: number };
  streakDays: number;
  bestStreak: number;
  week: { date: string; steps: number }[];
  weeklyDeltaPct: number | null;
  lifetime: { steps: number; reps: number };
  challengesCompleted: number;
  personalBests: Record<"mostStepsInADay" | "mostRepsInADay" | "longestHoldSeconds", { value: number; date: string } | null>;
}

/** GET /api/leaderboard/teams (backend/README.md). */
interface RawTeamStanding {
  id: string;
  name: string;
  rank: number;
  points: number;
  memberCount: number;
  streakDays?: number;
  members?: { id: string; points: number }[];
}

/* -------------------------------------------------------------- helpers --- */

const DAY_MS = 86_400_000;
const utcDay = (date: string | number | Date) => {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();
const idOf = (ref: string | { _id: string } | null) => (ref === null ? "" : typeof ref === "string" ? ref : ref._id);

function toUser(raw: RawUser, teamName: string): User {
  return {
    id: raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    displayName: raw.displayName || raw.firstName,
    email: raw.email,
    initials: initials(raw.firstName, raw.lastName),
    teamId: raw.teamId ?? null,
    teamName,
    plan: "free",
    stepGoal: raw.stepGoal,
    workoutDaysPerWeek: raw.workoutDaysPerWeek,
    memberSince: raw.createdAt.slice(0, 10),
    bio: raw.bio ?? "",
    profilePicture: raw.profilePicture ?? undefined,
    notificationPrefs: raw.notificationPrefs,
    privacy: raw.privacy,
    motivations: raw.motivations ?? [],
    dateOfBirth: raw.dateOfBirth?.slice(0, 10),
    gender: raw.gender,
    height: raw.height,
    weight: raw.weight,
    fitnessLevel: raw.fitnessLevel,
    onboardingCompletedAt: raw.onboardingCompletedAt ?? null,
  };
}

/** Backend end dates are exclusive (midnight after the last day); the UI
 *  shows the last day itself. */
function toChallenge(raw: RawChallenge): Challenge {
  return {
    id: raw._id,
    title: raw.title,
    description: raw.description,
    unit: raw.unit,
    goal: raw.goal,
    current: raw.current ?? 0,
    startDate: raw.startDate.slice(0, 10),
    endDate: isoDay(Date.parse(raw.endDate) - 1),
    dayIndex: raw.dayIndex ?? 0,
    totalDays: raw.totalDays ?? 1,
    teamId: raw.teamId ?? null,
    activity: raw.type === "steps" ? "steps" : undefined,
    code: raw.inviteCode,
    featured: raw.featured || undefined,
  };
}

function toEntry(raw: RawEntry, meId: string): ActivityEntry {
  return {
    id: raw.id,
    person: {
      id: raw.person.id ?? "",
      name: raw.person.name,
      initials: raw.person.initials,
      profilePicture: raw.person.profilePicture ?? undefined,
    },
    isCurrentUser: raw.person.id === meId,
    challengeId: raw.challengeId ?? "",
    challengeName: raw.challengeName,
    value: raw.value,
    unit: raw.unit,
    recordedAt: raw.recordedAt,
  };
}

/** Wraps a mutation's backend error as a plain message for the UI. */
function messageOf(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback;
  throw err; // a redirect, or a real bug — not ours to swallow
}

/* ---------------------------------------------------------------- reads --- */

export const PERSONA_COOKIE = "tuff-persona";

/** Personas are a mock-only device; real accounts are just themselves. */
export const getPersona = cache(async (): Promise<Persona> => "returning");

const getRawMe = cache(() => api<RawUser>("/api/auth/me"));

export const getCurrentUser = cache(async (): Promise<User> => {
  const raw = await getRawMe();
  const team = raw.teamId && isObjectId(raw.teamId) ? await apiOptional<RawTeam>(`/api/teams/${raw.teamId}`) : null;
  return toUser(raw, team?.name ?? "");
});

const getStats = cache(() => api<RawStats>("/api/users/me/stats"));

export const getTodayStats = cache(async (): Promise<TodayStats> => {
  const [stats, user] = await Promise.all([getStats(), getCurrentUser()]);
  return { ...stats.today, stepGoal: user.stepGoal, streakDays: stats.streakDays };
});

export const getWeeklyActivity = cache(async (): Promise<{ days: DayActivity[]; deltaPct: number }> => {
  const stats = await getStats();
  const days = stats.week.map((d, i) => ({
    day: new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    steps: d.steps,
    today: i === stats.week.length - 1 || undefined,
  }));
  return { days, deltaPct: stats.weeklyDeltaPct ?? 0 };
});

/* teams */

/** The boards are a side dish. If the backend can't answer for them (it's mid-deploy and
 *  doesn't have the route yet, or the query fails), the page renders without ranks rather
 *  than taking the whole dashboard down with it. Sign-in redirects and real bugs still throw. */
async function boardOrEmpty<T>(read: () => Promise<T[]>): Promise<T[]> {
  try {
    return await read();
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    console.error(`Leaderboard unavailable (${err.status}): ${err.message}`);
    return [];
  }
}

const getRawTeams = cache(() => api<RawTeam[]>("/api/teams"));
const getTeamStandings = cache(() =>
  boardOrEmpty(() => api<RawTeamStanding[]>("/api/leaderboard/teams?period=week")),
);
const getRawMembers = cache((teamId: string) => api<RawMember[]>(`/api/teams/${teamId}/members`));

export const getTeams = cache(async (): Promise<Team[]> => {
  const [raw, standings, me] = await Promise.all([getRawTeams(), getTeamStandings(), getCurrentUser()]);
  const myMembers = me.teamId ? await getRawMembers(me.teamId) : [];
  const standing = new Map(standings.map((s) => [s.id, s]));

  const teams = raw.map((t): Team => {
    const s = standing.get(t._id);
    return {
      id: t._id,
      name: t.name,
      description: t.description ?? "",
      inviteCode: t.inviteCode,
      createdBy: idOf(t.createdBy),
      maxMembers: t.maxMembers,
      memberCount: s?.memberCount ?? t.memberCount ?? 0,
      memberIds: t._id === me.teamId ? myMembers.map((m) => m._id) : [],
      rank: s?.rank ?? null,
      weeklyPoints: s?.points ?? null,
      streakDays: s?.streakDays ?? null,
      rivalId: null,
      headToHead: [],
    };
  });

  // Ranked teams first, best first, then the rest by name; the rival is the
  // team just above (#1 watches #2).
  teams.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.name.localeCompare(b.name));
  const ranked = teams.filter((t) => t.rank !== null);
  ranked.forEach((t, i) => {
    t.rivalId = ranked.length < 2 ? null : (ranked[i === 0 ? 1 : i - 1]?.id ?? null);
  });
  return teams;
});

export const getTeam = cache(async (id: string): Promise<Team | undefined> => {
  if (!isObjectId(id)) return undefined;
  const listed = (await getTeams()).find((t) => t.id === id);
  if (listed) return listed;
  const raw = await apiOptional<RawTeam>(`/api/teams/${id}`);
  if (!raw) return undefined;
  return {
    id: raw._id,
    name: raw.name,
    description: raw.description ?? "",
    inviteCode: raw.inviteCode,
    createdBy: idOf(raw.createdBy),
    maxMembers: raw.maxMembers,
    memberCount: raw.memberCount ?? 0,
    memberIds: [],
    rank: null,
    weeklyPoints: null,
    streakDays: null,
    rivalId: null,
    headToHead: [],
  };
});

export const getMyTeam = cache(async (): Promise<Team | null> => {
  const me = await getCurrentUser();
  return me.teamId ? ((await getTeam(me.teamId)) ?? null) : null;
});

export const getTeamActivity = cache(async (teamId: string, limit = 30): Promise<ActivityEntry[]> => {
  const me = await getCurrentUser();
  if (me.teamId !== teamId) return []; // members only
  const raw = await api<RawEntry[]>(`/api/teams/${teamId}/activity?limit=${limit}`);
  return raw.map((e) => toEntry(e, me.id));
});

export const getTeamMembers = cache(async (teamId: string): Promise<TeamMember[]> => {
  const me = await getCurrentUser();
  if (me.teamId !== teamId) return []; // rosters are members-only
  const [members, team, recent, standings] = await Promise.all([
    getRawMembers(teamId),
    getTeam(teamId),
    getTeamActivity(teamId, 200),
    getTeamStandings(),
  ]);
  const today = utcDay(Date.now());
  const activeToday = new Set(recent.filter((e) => utcDay(e.recordedAt) === today).map((e) => e.person.id));
  const points = new Map((standings.find((s) => s.id === teamId)?.members ?? []).map((m) => [m.id, m.points]));

  return members
    .map((m) => ({
      id: m._id,
      name: fullName(m),
      initials: initials(m.firstName, m.lastName),
      profilePicture: m.profilePicture ?? undefined,
      weeklyPoints: points.get(m._id) ?? null,
      activeToday: activeToday.has(m._id),
      isCurrentUser: m._id === me.id,
      isCreator: team?.createdBy === m._id,
    }))
    .sort((a, b) => (b.weeklyPoints ?? 0) - (a.weeklyPoints ?? 0) || a.name.localeCompare(b.name));
});

export const getTeamSummary = cache(async (): Promise<TeamSummary | null> => {
  const [team, teams] = await Promise.all([getMyTeam(), getTeams()]);
  if (!team) return null;
  const members = await getTeamMembers(team.id);
  const rival = teams.find((t) => t.id === team.rivalId) ?? null;
  return {
    id: team.id,
    name: team.name,
    code: team.inviteCode,
    rank: team.rank,
    totalTeams: teams.length,
    weeklyPoints: team.weeklyPoints,
    rivalName: rival?.name ?? null,
    gapToRival: rival && rival.weeklyPoints !== null && team.weeklyPoints !== null ? rival.weeklyPoints - team.weeklyPoints : 0,
    members: members.slice(0, 4).map((m) => ({ id: m.id, initials: m.initials, profilePicture: m.profilePicture })),
    extraMembers: Math.max(0, members.length - 4),
  };
});

/* challenges */

const getRawChallenges = cache(() => api<RawChallenge[]>("/api/challenges"));
const getRawChallengeActivities = cache((id: string) =>
  api<RawEntry[]>(`/api/challenge-participants/${id}/activities?limit=1000`),
);

/** Still running and not finished. */
const isActive = (raw: RawChallenge) =>
  raw.status !== "completed" && raw.status !== "cancelled" && (raw.current ?? 0) < raw.goal;

export const getChallenges = cache(async (): Promise<Challenge[]> => (await getRawChallenges()).map(toChallenge));

export const getChallenge = cache(async (id: string): Promise<Challenge | undefined> => {
  if (!isObjectId(id)) return undefined;
  const raw = await apiOptional<RawChallenge>(`/api/challenges/get/${id}`);
  return raw ? toChallenge(raw) : undefined;
});

export const getFeaturedChallenge = cache(async (): Promise<Challenge | undefined> => {
  const raw = (await getRawChallenges()).filter(isActive);
  const pick = raw.find((c) => c.featured) ?? raw[0];
  return pick ? toChallenge(pick) : undefined;
});

export const getStepChallenge = cache(async (): Promise<Challenge | undefined> => {
  const featured = await getFeaturedChallenge();
  const pick = (await getRawChallenges()).filter(isActive).find((c) => c.unit === "steps" && c._id !== featured?.id);
  return pick ? toChallenge(pick) : undefined;
});

export const getTodayOnChallenge = cache(async (challengeId: string): Promise<number> => {
  if (!isObjectId(challengeId)) return 0;
  const today = utcDay(Date.now());
  return (await getRawChallengeActivities(challengeId))
    .filter((e) => utcDay(e.recordedAt) === today)
    .reduce((sum, e) => sum + e.value, 0);
});

export const getChallengeDetail = cache(async (id: string): Promise<ChallengeDetail | undefined> => {
  const challenge = await getChallenge(id);
  if (!challenge) return undefined;
  const [rawEntries, participants, me] = await Promise.all([
    getRawChallengeActivities(id),
    api<RawParticipant[]>(`/api/challenge-participants/${id}`),
    getCurrentUser(),
  ]);
  const entries = rawEntries.map((e) => toEntry(e, me.id));

  const start = utcDay(`${challenge.startDate}T00:00:00Z`);
  const today = utcDay(Date.now());
  const byDay = new Map<number, number>();
  for (const e of entries) byDay.set(utcDay(e.recordedAt), (byDay.get(utcDay(e.recordedAt)) ?? 0) + e.value);
  const daily = Array.from({ length: challenge.totalDays }, (_, i) => {
    const day = start + i * DAY_MS;
    const state: "past" | "today" | "future" = day < today ? "past" : day === today ? "today" : "future";
    return { dayIndex: i + 1, date: isoDay(day), total: byDay.get(day) ?? 0, state };
  });

  const contributions: MemberContribution[] = challenge.teamId
    ? participants
        .filter((p) => p.user)
        .map((p) => ({
          person: {
            id: p.user!._id,
            name: fullName(p.user!),
            initials: initials(p.user!.firstName, p.user!.lastName),
            profilePicture: p.user!.profilePicture ?? undefined,
          },
          isCurrentUser: p.user!._id === me.id,
          total: p.progress,
          share: challenge.current > 0 ? p.progress / challenge.current : 0,
        }))
        .sort((a, b) => b.total - a.total)
    : [];

  const mine = new Set(entries.filter((e) => e.isCurrentUser).map((e) => utcDay(e.recordedAt)));
  let cursor = mine.has(today) ? today : today - DAY_MS;
  let streak = 0;
  while (mine.has(cursor)) {
    streak++;
    cursor -= DAY_MS;
  }

  return {
    challenge,
    daily,
    pacePerDay: Math.ceil(challenge.goal / challenge.totalDays),
    contributions,
    activities: entries,
    bestDays: challenge.teamId
      ? []
      : daily
          .filter((d) => d.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
          .map((d) => ({ date: d.date, total: d.total })),
    streak: challenge.teamId ? 0 : streak,
  };
});

export const getActiveChallenges = cache(async (): Promise<Challenge[]> =>
  (await getRawChallenges()).filter(isActive).map(toChallenge),
);

/* leaderboard */

export const getLeaderboard = cache(async (period: LeaderboardPeriod = "week"): Promise<LeaderboardEntry[]> => {
  const [board, me] = await Promise.all([
    boardOrEmpty(() => api<LeaderboardEntry[]>(`/api/leaderboard?period=${period}`)),
    getCurrentUser(),
  ]);
  return board.map((e) => ({ ...e, isCurrentUser: e.user.id === me.id || undefined }));
});

export const getDashboardLeaderboard = cache(async (): Promise<LeaderboardEntry[]> => {
  const board = await getLeaderboard("week");
  return board.filter((e) => e.rank <= 5 || e.isCurrentUser);
});

/* people, feeds, profile */

export const getTeammates = cache(async (): Promise<{ id: string; name: string; initials: string }[]> => {
  const me = await getCurrentUser();
  if (!me.teamId) return [];
  return (await getRawMembers(me.teamId))
    .filter((m) => m._id !== me.id)
    .map((m) => ({ id: m._id, name: fullName(m), initials: initials(m.firstName, m.lastName) }));
});

export const getActivityFeed = cache(async (limit = 8): Promise<ActivityEntry[]> => {
  const [raw, me] = await Promise.all([api<RawEntry[]>(`/api/users/me/activities?limit=${limit}`), getCurrentUser()]);
  return raw.map((e) => toEntry(e, me.id));
});

export const getNotifications = cache(() => api<AppNotification[]>("/api/notifications?limit=30"));

export const getAchievements = cache(() => api<Achievement[]>("/api/achievements"));

function personalBestsFrom(stats: RawStats): PersonalBest[] {
  const out: PersonalBest[] = [];
  const { mostStepsInADay, mostRepsInADay, longestHoldSeconds } = stats.personalBests;
  if (mostRepsInADay) {
    out.push({ id: "pb-reps", label: "Most reps in a day", value: `${mostRepsInADay.value.toLocaleString("en-US")} reps`, achievedAt: mostRepsInADay.date });
  }
  if (longestHoldSeconds) {
    const s = longestHoldSeconds.value;
    out.push({ id: "pb-hold", label: "Longest hold", value: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, achievedAt: longestHoldSeconds.date });
  }
  if (mostStepsInADay) {
    out.push({ id: "pb-steps", label: "Most steps in a day", value: `${mostStepsInADay.value.toLocaleString("en-US")} steps`, achievedAt: mostStepsInADay.date });
  }
  return out;
}

export const getProfile = cache(async (): Promise<Profile> => {
  const [user, stats, achievements, recentActivity, activeChallenges] = await Promise.all([
    getCurrentUser(),
    getStats(),
    getAchievements(),
    getActivityFeed(6),
    getActiveChallenges(),
  ]);
  return {
    user,
    stats: {
      currentStreak: stats.streakDays,
      bestStreak: stats.bestStreak,
      lifetimeSteps: stats.lifetime.steps,
      repsLogged: stats.lifetime.reps,
      challengesCleared: stats.challengesCompleted,
    },
    achievements,
    personalBests: personalBestsFrom(stats),
    recentActivity,
    activeChallenges,
  };
});

/** Your challenges, every team, and your teammates — filtered on the client.
 *  People are teammates only: nobody else's name is searchable. */
// TODO(backend): GET /search?q= if this outgrows a client-side index.
export const getSearchIndex = cache(async (): Promise<SearchItem[]> => {
  const [challenges, teams, me] = await Promise.all([getChallenges(), getTeams(), getCurrentUser()]);
  const members = me.teamId ? await getTeamMembers(me.teamId) : [];
  return [
    ...challenges.map((c): SearchItem => ({
      id: `challenge-${c.id}`,
      kind: "challenge",
      label: c.title,
      sublabel: `${c.teamId ? "Team" : "Solo"} · Day ${c.dayIndex} of ${c.totalDays}`,
      href: `/challenges/${c.id}`,
      keywords: [c.unit],
    })),
    ...teams.map((t): SearchItem => ({
      id: `team-${t.id}`,
      kind: "team",
      label: t.name,
      sublabel: `${t.rank ? `#${t.rank} of ${teams.length} · ` : ""}${t.memberCount} ${t.memberCount === 1 ? "member" : "members"}`,
      href: `/teams/${t.id}`,
      keywords: [t.inviteCode],
    })),
    ...members
      .filter((m) => !m.isCurrentUser)
      .map((m): SearchItem => ({
        id: `person-${m.id}`,
        kind: "person",
        label: m.name,
        sublabel: me.teamName,
        href: `/teams/${me.teamId}#member-${m.id}`,
        keywords: [],
      })),
  ];
});

export const getSuggestedChallenges = cache(async (): Promise<SuggestedChallenge[]> => suggestedChallenges);

const normalizeCode = (code: string) => code.replace(/[^a-z0-9]/gi, "").toUpperCase();

export const findByCode = cache(async (code: string): Promise<CodeMatch | null> => {
  const wanted = normalizeCode(code);
  if (!wanted) return null;

  const team = await apiOptional<{ id: string; name: string; inviteCode: string; memberCount: number }>(
    `/api/teams/code/${wanted}`,
  );
  if (team) {
    return {
      kind: "team",
      name: team.name,
      code: team.inviteCode,
      href: `/teams/${team.id}`,
      detail: `${team.memberCount} ${team.memberCount === 1 ? "member" : "members"}`,
    };
  }

  const raw = await apiOptional<RawChallenge>(`/api/challenges/getbyCode/${wanted}`);
  if (!raw) return null;
  const c = toChallenge(raw);
  return {
    kind: "challenge",
    name: c.title,
    code: raw.inviteCode ?? wanted,
    href: `/challenges/${c.id}`,
    detail: `${c.goal.toLocaleString("en-US")} ${c.unit} · ends ${new Date(`${c.endDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`,
  };
});

/* ------------------------------------------------------------ mutations --- */

/** Mock-only; real sign-ups are real accounts. */
export function startNewPersona(input: { firstName: string; lastName: string; email: string }) {
  void input;
}

async function userAfter(raw: RawUser): Promise<User> {
  const team = raw.teamId && isObjectId(raw.teamId) ? await apiOptional<RawTeam>(`/api/teams/${raw.teamId}`) : null;
  return toUser(raw, team?.name ?? "");
}

export async function updateProfile(input: { firstName: string; lastName: string; displayName: string; bio: string }) {
  return userAfter(await api<RawUser>("/api/users/me", { method: "PATCH", body: input }));
}

export async function updateProfilePhoto(dataUrl: string | null) {
  return userAfter(await api<RawUser>("/api/users/me/photo", { method: "PUT", body: { dataUrl } }));
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }) {
  try {
    // 204, plus a fresh session for this device (every other one is signed out).
    await api("/api/users/me/password", { method: "PATCH", body: input, session: true });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.details?.currentPassword) return { ok: false };
    throw err;
  }
}

export async function updateGoals(input: { stepGoal: number; workoutDaysPerWeek: number }) {
  return userAfter(await api<RawUser>("/api/users/me/goals", { method: "PATCH", body: input }));
}

export async function updateNotificationPrefs(prefs: NotificationPrefs) {
  return userAfter(await api<RawUser>("/api/users/me/notification-prefs", { method: "PATCH", body: prefs }));
}

export async function updatePrivacy(privacy: PrivacySettings) {
  return userAfter(await api<RawUser>("/api/users/me/privacy", { method: "PATCH", body: privacy }));
}

export async function completeOnboarding(answers: OnboardingAnswers) {
  const { challengeIds, ...about } = answers;
  const raw = await api<RawUser>("/api/users/me/onboarding", { method: "POST", body: about });
  for (const id of challengeIds) await joinSuggestedChallenge(id);
  return userAfter(raw);
}

/** Points per unit for challenges made here — what the leaderboard will sum. */
const POINTS_PER_UNIT: Record<string, number> = { steps: 0.01, reps: 1, seconds: 0.5 };

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
  const me = await getCurrentUser();
  const start = utcDay(Date.now()) + (input.startsTomorrow ? DAY_MS : 0);
  const raw = await api<RawChallenge>("/api/challenges/create", {
    method: "POST",
    body: {
      title: input.title,
      description: input.description,
      type: input.activity === "steps" || input.unit === "steps" ? "steps" : "workout",
      goal: input.goal,
      unit: input.unit,
      pointsPerUnit: POINTS_PER_UNIT[input.unit] ?? 1,
      startDate: new Date(start).toISOString(),
      // Exclusive: midnight after the last day.
      endDate: new Date(start + input.totalDays * DAY_MS).toISOString(),
      teamId: input.isTeam && me.teamId ? me.teamId : undefined,
    },
  });
  // Making a challenge means doing it — join it straight away.
  await api(`/api/challenge-participants/${raw._id}/join`, { method: "POST" });
  return (await getChallenge(raw._id)) ?? toChallenge(raw);
}

export async function joinSuggestedChallenge(suggestedId: string): Promise<Challenge | null> {
  const s = suggestedChallenges.find((x) => x.id === suggestedId);
  if (!s) return null;
  return createChallenge({
    title: s.title,
    description: s.description,
    unit: s.unit,
    goal: s.goal,
    totalDays: s.totalDays,
    startsTomorrow: false,
    isTeam: false,
    activity: s.activity,
  });
}

export async function addActivity(input: {
  challengeId: string;
  value: number;
  when: "today" | "yesterday";
  note?: string;
}): Promise<LoggedActivity | null> {
  const before = await getChallenge(input.challengeId);
  if (!before) return null;
  const recordedAt = new Date(Date.now() - (input.when === "yesterday" ? DAY_MS : 0)).toISOString();
  // TODO(backend): notes aren't stored yet — Activity has no field for them.
  const res = await api<{ newAchievements?: Achievement[] }>(`/api/challenge-participants/${input.challengeId}/activities`, {
    method: "POST",
    body: { value: input.value, recordedAt },
  });
  const after = (await apiOptional<RawChallenge>(`/api/challenges/get/${input.challengeId}`)) ?? null;
  const current = after?.current ?? before.current + input.value;
  return {
    challengeId: before.id,
    challengeName: before.title,
    code: before.code ?? null,
    unit: before.unit,
    previous: current - input.value,
    current,
    target: before.goal,
    // The shared total crossing the goal — for a team challenge, the team's.
    completed: current - input.value < before.goal && current >= before.goal,
    daysLeft: Math.max(0, before.totalDays - before.dayIndex),
    newAchievements: (res.newAchievements ?? []).map((a) => a.name),
  };
}

export async function createTeam(input: { name: string; description: string }): Promise<TeamResult> {
  const me = await getCurrentUser();
  if (me.teamId) return { ok: false, error: "You're already on a team. Leave it before starting a new one." };
  try {
    const team = await api<RawTeam>("/api/teams", { method: "POST", body: input });
    return { ok: true, teamId: team._id };
  } catch (err) {
    return { ok: false, error: messageOf(err, "Couldn't create the team. Try again.") };
  }
}

export async function joinTeamByCode(code: string): Promise<TeamResult> {
  try {
    const team = await api<RawTeam>("/api/teams/join", { method: "POST", body: { inviteCode: normalizeCode(code) } });
    return { ok: true, teamId: team._id };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return { ok: false, error: "That code doesn't match a team." };
      if (/already a member/i.test(err.message)) {
        return { ok: false, error: "You're already on a team. Leave it before joining another." };
      }
      if (/full/i.test(err.message)) return { ok: false, error: "That team is full." };
    }
    return { ok: false, error: messageOf(err, "Couldn't join that team. Try again.") };
  }
}

export async function leaveTeam() {
  try {
    await api("/api/teams/leave", { method: "DELETE" });
  } catch (err) {
    // Not on a team any more is the outcome we wanted anyway.
    if (!(err instanceof ApiError && err.status === 400)) throw err;
  }
}

export async function joinChallengeByCode(
  code: string,
): Promise<{ ok: true; challengeId: string } | { ok: false; error: string }> {
  const raw = await apiOptional<RawChallenge>(`/api/challenges/getbyCode/${normalizeCode(code)}`);
  if (!raw) return { ok: false, error: "That code doesn't match a challenge." };
  try {
    await api(`/api/challenge-participants/${raw._id}/join`, { method: "POST" });
  } catch (err) {
    if (!(err instanceof ApiError && /already joined/i.test(err.message))) {
      return { ok: false, error: messageOf(err, "Couldn't join that challenge.") };
    }
  }
  return { ok: true, challengeId: raw._id };
}

export async function markNotificationRead(id: string) {
  if (isObjectId(id)) await api(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  await api("/api/notifications/read-all", { method: "PATCH" });
}

export async function deleteAccount(): Promise<{ ok: boolean; message?: string }> {
  await api("/api/users/me", { method: "DELETE", body: { confirm: "DELETE" }, session: true });
  await clearSessionCookies();
  return { ok: true };
}

/* admin — every call is checked against the database by the backend, whatever the UI showed */

function pageQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

export const getAdminOverview = cache(() => api<AdminOverview>("/api/admin/overview"));

export const getAdminUsers = cache((query: AdminUserQuery = {}) =>
  api<AdminPage<AdminUser>>(`/api/admin/users${pageQuery({ ...query })}`),
);

export async function updateAdminUser(
  id: string,
  patch: { status?: "active" | "suspended"; role?: "member" | "admin" },
): Promise<AdminResult> {
  try {
    await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: messageOf(err, "Couldn't update that account. Try again.") };
  }
}

export const getAdminChallenges = cache((query: { status?: string; page?: number } = {}) =>
  api<AdminPage<AdminChallenge>>(`/api/admin/challenges${pageQuery({ ...query })}`),
);

export async function cancelAdminChallenge(id: string): Promise<AdminResult> {
  try {
    await api(`/api/admin/challenges/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: "cancelled" } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: messageOf(err, "Couldn't cancel that challenge. Try again.") };
  }
}

export const getAdminTeams = cache((query: { page?: number } = {}) =>
  api<AdminPage<AdminTeam>>(`/api/admin/teams${pageQuery({ ...query })}`),
);
