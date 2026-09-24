import type {
  Achievement,
  ActivityFeedEntry,
  Challenge,
  DayActivity,
  LeaderboardEntry,
  PersonalBest,
  ProfileStats,
  TeamSummary,
  TodayStats,
  User,
} from "@/lib/types";

// Seed data for the in-memory mock DB in lib/data.ts, which is the only file
// that should import this one. Shapes match lib/types.ts, so swapping in the
// real backend touches lib/data.ts alone.

export const currentUser: User = {
  id: "u4",
  name: "Kelechi Obi",
  firstName: "Kelechi",
  displayName: "Kelechi",
  // example.com is reserved for documentation, so this can never reach a real inbox.
  email: "kelechi.obi@example.com",
  initials: "KO",
  teamId: "ironclad",
  teamName: "Team Ironclad",
  plan: "free",
  stepGoal: 10000,
  memberSince: "2026-03-02",
  bio: "Chasing a 30-day streak. Push-ups are the enemy.",
};

/** The goal lives on the user, so Settings (#3) can move the dashboard ring. */
export const todayStats: Omit<TodayStats, "stepGoal"> = {
  steps: 7502,
  activeMinutes: 46,
  calories: 512,
  streakDays: 9,
};

export const weeklyActivity: DayActivity[] = [
  { day: "Mon", steps: 8420 },
  { day: "Tue", steps: 10240 },
  { day: "Wed", steps: 6310 },
  { day: "Thu", steps: 11870 },
  { day: "Fri", steps: 9150 },
  { day: "Sat", steps: 12400 },
  { day: "Sun", steps: 7502, today: true },
];

export const weeklyDeltaPct = 12;

export const team: TeamSummary = {
  name: "Team Ironclad",
  code: "IRON-7Q4K",
  rank: 2,
  totalTeams: 14,
  rivalName: "Team Voltage",
  gapToRival: 340,
  members: [{ initials: "CO" }, { initials: "AB" }, { initials: "KO" }, { initials: "EN" }],
  extraMembers: 8,
};

export const challenges: Challenge[] = [
  {
    id: "10k-steps",
    name: "10K Steps Challenge",
    description:
      "Every step counts toward the team total — sync your tracker to log today's walk.",
    unit: "steps",
    target: 10000,
    current: 3840,
    startDate: "2026-09-19",
    endDate: "2026-09-26",
    dayIndex: 3,
    totalDays: 7,
    teamId: "ironclad",
    activity: "steps",
    code: "STEP-4K2M",
  },
  {
    id: "pushup-power-week",
    name: "Push-Up Power Week",
    description:
      "You're 60 reps ahead of pace. One more clean set closes today out.",
    unit: "reps",
    target: 400,
    current: 296,
    startDate: "2026-09-16",
    endDate: "2026-09-23",
    dayIndex: 4,
    totalDays: 7,
    teamId: "ironclad",
    activity: "pushups",
    code: "PUSH-9T3X",
    featured: true,
  },
  {
    id: "plank-ladder",
    name: "Plank Ladder",
    description: "Add ten seconds a day. Today's hold: 1 minute 40.",
    unit: "seconds",
    target: 140,
    current: 100,
    startDate: "2026-09-14",
    endDate: "2026-09-28",
    dayIndex: 9,
    totalDays: 14,
    teamId: null,
    activity: "plank",
  },
];

export const leaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    previousRank: 3,
    user: { id: "u1", name: "Chiamaka Okafor", initials: "CO" },
    teamName: "Team Ironclad",
    score: 14204,
    scoreUnit: "pts",
  },
  {
    rank: 2,
    user: { id: "u2", name: "Tunde Bakare", initials: "TB" },
    teamName: "Team Voltage",
    score: 13880,
    scoreUnit: "pts",
  },
  {
    rank: 3,
    previousRank: 2,
    user: { id: "u3", name: "Aisha Bello", initials: "AB" },
    teamName: "Team Ironclad",
    score: 13412,
    scoreUnit: "pts",
  },
  {
    rank: 4,
    previousRank: 4,
    user: { id: "u5", name: "Emeka Nwachukwu", initials: "EN" },
    teamName: "Team Ironclad",
    score: 12980,
    scoreUnit: "pts",
  },
  {
    rank: 5,
    previousRank: 7,
    user: { id: "u6", name: "Funmilayo Adebayo", initials: "FA" },
    teamName: "Team Voltage",
    score: 12615,
    scoreUnit: "pts",
  },
  {
    rank: 6,
    previousRank: 5,
    user: { id: "u7", name: "Ibrahim Musa", initials: "IM" },
    teamName: "Team Harmattan",
    score: 12210,
    scoreUnit: "pts",
  },
  {
    rank: 7,
    previousRank: 11,
    user: { id: "u4", name: "Kelechi Obi", initials: "KO" },
    teamName: "Team Ironclad",
    score: 11940,
    scoreUnit: "pts",
    isCurrentUser: true,
  },
  {
    rank: 8,
    previousRank: 6,
    user: { id: "u8", name: "Zainab Yusuf", initials: "ZY" },
    teamName: "Team Harmattan",
    score: 11705,
    scoreUnit: "pts",
  },
  {
    rank: 9,
    user: { id: "u9", name: "Ngozi Eze", initials: "NE" },
    teamName: "Team Voltage",
    score: 11320,
    scoreUnit: "pts",
  },
  {
    rank: 10,
    previousRank: 12,
    user: { id: "u10", name: "Seun Akinola", initials: "SA" },
    teamName: "Team Harmattan",
    score: 10990,
    scoreUnit: "pts",
  },
];

/** Same people, ordered by everything they've ever logged. No `previousRank`,
 *  because an all-time board has no week-on-week movement to show. */
export const allTimeLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    user: { id: "u2", name: "Tunde Bakare", initials: "TB" },
    teamName: "Team Voltage",
    score: 128400,
    scoreUnit: "pts",
  },
  {
    rank: 2,
    user: { id: "u1", name: "Chiamaka Okafor", initials: "CO" },
    teamName: "Team Ironclad",
    score: 124910,
    scoreUnit: "pts",
  },
  {
    rank: 3,
    user: { id: "u7", name: "Ibrahim Musa", initials: "IM" },
    teamName: "Team Harmattan",
    score: 119540,
    scoreUnit: "pts",
  },
  {
    rank: 4,
    user: { id: "u4", name: "Kelechi Obi", initials: "KO" },
    teamName: "Team Ironclad",
    score: 112300,
    scoreUnit: "pts",
    isCurrentUser: true,
  },
  {
    rank: 5,
    user: { id: "u3", name: "Aisha Bello", initials: "AB" },
    teamName: "Team Ironclad",
    score: 108760,
    scoreUnit: "pts",
  },
  {
    rank: 6,
    user: { id: "u8", name: "Zainab Yusuf", initials: "ZY" },
    teamName: "Team Harmattan",
    score: 104220,
    scoreUnit: "pts",
  },
  {
    rank: 7,
    user: { id: "u5", name: "Emeka Nwachukwu", initials: "EN" },
    teamName: "Team Ironclad",
    score: 99180,
    scoreUnit: "pts",
  },
  {
    rank: 8,
    user: { id: "u10", name: "Seun Akinola", initials: "SA" },
    teamName: "Team Harmattan",
    score: 95640,
    scoreUnit: "pts",
  },
  {
    rank: 9,
    user: { id: "u6", name: "Funmilayo Adebayo", initials: "FA" },
    teamName: "Team Voltage",
    score: 91050,
    scoreUnit: "pts",
  },
  {
    rank: 10,
    user: { id: "u9", name: "Ngozi Eze", initials: "NE" },
    teamName: "Team Voltage",
    score: 88470,
    scoreUnit: "pts",
  },
];

/** Seeds the activity bell and the profile's recent-activity list. Newly
 *  logged activity (via addActivity) is merged in ahead of this at read
 *  time — see getActivityFeed in lib/data.ts. */
export const activityFeed: ActivityFeedEntry[] = [
  {
    id: "feed-1",
    userId: "u3",
    userName: "Aisha Bello",
    userInitials: "AB",
    isCurrentUser: false,
    challengeId: "pushup-power-week",
    challengeName: "Push-Up Power Week",
    value: 30,
    unit: "reps",
    loggedAt: "2026-09-22T19:15:00.000Z",
  },
  {
    id: "feed-2",
    userId: "u4",
    userName: "Kelechi Obi",
    userInitials: "KO",
    isCurrentUser: true,
    challengeId: "10k-steps",
    challengeName: "10K Steps Challenge",
    value: 1200,
    unit: "steps",
    loggedAt: "2026-09-22T09:40:00.000Z",
  },
  {
    id: "feed-3",
    userId: "u1",
    userName: "Chiamaka Okafor",
    userInitials: "CO",
    isCurrentUser: false,
    challengeId: "10k-steps",
    challengeName: "10K Steps Challenge",
    value: 4200,
    unit: "steps",
    loggedAt: "2026-09-21T12:05:00.000Z",
  },
  {
    id: "feed-4",
    userId: "u5",
    userName: "Emeka Nwachukwu",
    userInitials: "EN",
    isCurrentUser: false,
    challengeId: "pushup-power-week",
    challengeName: "Push-Up Power Week",
    value: 40,
    unit: "reps",
    loggedAt: "2026-09-20T18:22:00.000Z",
  },
  {
    id: "feed-5",
    userId: "u4",
    userName: "Kelechi Obi",
    userInitials: "KO",
    isCurrentUser: true,
    challengeId: "plank-ladder",
    challengeName: "Plank Ladder",
    value: 90,
    unit: "seconds",
    loggedAt: "2026-09-20T06:50:00.000Z",
  },
  {
    id: "feed-6",
    userId: "u3",
    userName: "Aisha Bello",
    userInitials: "AB",
    isCurrentUser: false,
    challengeId: "pushup-power-week",
    challengeName: "Push-Up Power Week",
    value: 25,
    unit: "reps",
    loggedAt: "2026-09-19T20:10:00.000Z",
  },
  {
    id: "feed-7",
    userId: "u1",
    userName: "Chiamaka Okafor",
    userInitials: "CO",
    isCurrentUser: false,
    challengeId: "10k-steps",
    challengeName: "10K Steps Challenge",
    value: 5100,
    unit: "steps",
    loggedAt: "2026-09-18T08:30:00.000Z",
  },
  {
    id: "feed-8",
    userId: "u4",
    userName: "Kelechi Obi",
    userInitials: "KO",
    isCurrentUser: true,
    challengeId: "pushup-power-week",
    challengeName: "Push-Up Power Week",
    value: 50,
    unit: "reps",
    loggedAt: "2026-09-17T17:00:00.000Z",
  },
];

/** Before feed-1 — seeds one "new" teammate entry so the bell's unread dot
 *  has something to demonstrate on a fresh load. */
export const activityFeedSeenAt = "2026-09-22T10:00:00.000Z";

export const profileStats: ProfileStats = {
  currentStreak: 0, // overwritten at read time from todayStats.streakDays — see getProfile
  bestStreak: 21,
  lifetimeSteps: 1842600,
  repsLogged: 9340,
  challengesCleared: 4,
};

export const achievements: Achievement[] = [
  { id: "first-log", name: "First Log", rule: "Log your first activity.", earnedAt: "2026-03-02" },
  {
    id: "streak-7",
    name: "7-Day Streak",
    rule: "Keep a streak alive for 7 days.",
    earnedAt: "2026-03-10",
  },
  { id: "team-player", name: "Team Player", rule: "Join a team.", earnedAt: "2026-03-02" },
  {
    id: "century-club",
    name: "Century Club",
    rule: "Log 100 push-ups in one day.",
    earnedAt: "2026-06-14",
  },
  {
    id: "streak-30",
    name: "30-Day Streak",
    rule: "Keep a streak alive for 30 days.",
    earnedAt: null,
    progress: { current: 9, target: 30 },
  },
  {
    id: "challenge-clearer",
    name: "Challenge Clearer",
    rule: "Clear 5 challenges.",
    earnedAt: null,
    progress: { current: 4, target: 5 },
  },
];

export const personalBests: PersonalBest[] = [
  { id: "pb-pushups", label: "Most push-ups in a day", value: "112 reps", achievedAt: "2026-06-14" },
  { id: "pb-plank", label: "Longest plank", value: "3:45", achievedAt: "2026-08-02" },
  { id: "pb-steps", label: "Most steps in a day", value: "14,820 steps", achievedAt: "2026-07-19" },
];
