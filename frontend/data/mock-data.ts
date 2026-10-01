import type {
  Activity,
  AppNotification,
  HeadToHeadResult,
  Person,
  PersonalBest,
  SuggestedChallenge,
  User,
} from "@/lib/types";

/**
 * Seed data for the in-memory mock DB in lib/data.ts, which is the only file
 * that should import this one. Shapes match lib/types.ts, so swapping in the
 * real backend touches lib/data.ts alone.
 *
 * Everything dated is built relative to the moment the DB seeds (`now`), so
 * "Day 4 of 7", "2h ago" and "Today" stay true whenever you run it. Numbers
 * that derive from activity (challenge totals, today's steps, the weekly
 * chart, the streak) are NOT stored here: lib/data.ts adds them up from the
 * activities below, which is what keeps every screen agreeing.
 */

/* ------------------------------------------------------------- helpers --- */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" in UTC. */
export function isoDay(date: Date | number): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function startOfUtcDay(date: Date | number): number {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Small deterministic PRNG, so a reseed produces the same numbers. */
function rng(seedText: string) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (Math.imul(31, seed) + seedText.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rand: () => number, min: number, max: number) {
  return Math.round(min + rand() * (max - min));
}

function initialsOf(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
}

/* -------------------------------------------------------------- people --- */

export const CURRENT_USER_ID = "u4";

const DEFAULT_PREFS: User["notificationPrefs"] = {
  streakReminders: true,
  teamActivity: true,
  leaderboardChanges: true,
  challengeInvites: true,
  weeklySummary: false,
  reminderTime: "18:00",
};

const DEFAULT_PRIVACY: User["privacy"] = { showOnLeaderboards: true, profileVisibility: "everyone" };

export function returningUser(now: number): User {
  return {
    id: CURRENT_USER_ID,
    firstName: "Kelechi",
    lastName: "Obi",
    displayName: "Kelechi",
    // example.com is reserved for documentation, so this can never reach a real inbox.
    email: "kelechi.obi@example.com",
    initials: "KO",
    teamId: "ironclad",
    teamName: "Team Ironclad",
    plan: "free",
    stepGoal: 10000,
    workoutDaysPerWeek: 4,
    memberSince: isoDay(now - 213 * DAY_MS),
    bio: "Chasing a 30-day streak. Push-ups are the enemy.",
    notificationPrefs: { ...DEFAULT_PREFS },
    privacy: { ...DEFAULT_PRIVACY },
    motivations: ["build_streak", "team"],
    fitnessLevel: "intermediate",
    onboardingCompletedAt: new Date(now - 213 * DAY_MS).toISOString(),
  };
}

/** The `new` persona (#20): whoever just signed up, with nothing logged. */
export function newUser(now: number, input: { firstName: string; lastName: string; email: string }): User {
  return {
    id: "u-new",
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: input.firstName,
    email: input.email,
    initials: initialsOf(input.firstName || "N", input.lastName || "U"),
    teamId: null,
    teamName: "",
    plan: "free",
    stepGoal: 10000,
    workoutDaysPerWeek: 3,
    memberSince: isoDay(now),
    bio: "",
    notificationPrefs: { ...DEFAULT_PREFS },
    privacy: { ...DEFAULT_PRIVACY },
    motivations: [],
    onboardingCompletedAt: null,
  };
}

interface PersonSpec {
  id: string;
  firstName: string;
  lastName: string;
  weeklyPoints: number;
  allTimePoints: number;
  previousRank?: number;
}

/** The three teams the story's about, with named members. Weekly points
 *  for the top ten match the leaderboard everyone's seen. */
const NAMED_TEAMS: {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  streakDays: number;
  members: PersonSpec[];
}[] = [
  {
    id: "voltage",
    name: "Team Voltage",
    description: "Lagos mornings, Lekki runs, no rest days.",
    inviteCode: "VOLT-2M8R",
    streakDays: 11,
    members: [
      { id: "u2", firstName: "Tunde", lastName: "Bakare", weeklyPoints: 13880, allTimePoints: 128400, previousRank: 2 },
      { id: "u6", firstName: "Funmilayo", lastName: "Adebayo", weeklyPoints: 12615, allTimePoints: 91050, previousRank: 7 },
      { id: "u9", firstName: "Ngozi", lastName: "Eze", weeklyPoints: 11320, allTimePoints: 88470, previousRank: 9 },
      { id: "u15", firstName: "Chidi", lastName: "Okeke", weeklyPoints: 10450, allTimePoints: 80110 },
      { id: "u16", firstName: "Amina", lastName: "Lawal", weeklyPoints: 10120, allTimePoints: 76540 },
      { id: "u17", firstName: "Femi", lastName: "Johnson", weeklyPoints: 9960, allTimePoints: 71200 },
      { id: "u18", firstName: "Kemi", lastName: "Adeleke", weeklyPoints: 9750, allTimePoints: 69880 },
      { id: "u19", firstName: "Dayo", lastName: "Olatunji", weeklyPoints: 10726, allTimePoints: 74310 },
    ],
  },
  {
    id: "ironclad",
    name: "Team Ironclad",
    description: "Push-ups at lunch, steps after work. Everyone logs.",
    inviteCode: "IRON-7Q4K",
    streakDays: 6,
    members: [
      { id: "u1", firstName: "Chiamaka", lastName: "Okafor", weeklyPoints: 14204, allTimePoints: 124910, previousRank: 3 },
      { id: "u3", firstName: "Aisha", lastName: "Bello", weeklyPoints: 13412, allTimePoints: 108760, previousRank: 2 },
      { id: "u5", firstName: "Emeka", lastName: "Nwachukwu", weeklyPoints: 12980, allTimePoints: 99180, previousRank: 4 },
      { id: CURRENT_USER_ID, firstName: "Kelechi", lastName: "Obi", weeklyPoints: 11940, allTimePoints: 112300, previousRank: 11 },
      { id: "u11", firstName: "Bisi", lastName: "Adeyemi", weeklyPoints: 9810, allTimePoints: 70420 },
      { id: "u12", firstName: "Uche", lastName: "Nnamdi", weeklyPoints: 9240, allTimePoints: 66310 },
      { id: "u13", firstName: "Halima", lastName: "Sani", weeklyPoints: 8775, allTimePoints: 12040 },
      { id: "u14", firstName: "Tobi", lastName: "Ogunleye", weeklyPoints: 8120, allTimePoints: 58900 },
    ],
  },
  {
    id: "harmattan",
    name: "Team Harmattan",
    description: "Kano crew. Dry season, wet towels.",
    inviteCode: "HARM-5D1P",
    streakDays: 4,
    members: [
      { id: "u7", firstName: "Ibrahim", lastName: "Musa", weeklyPoints: 12210, allTimePoints: 119540, previousRank: 5 },
      { id: "u8", firstName: "Zainab", lastName: "Yusuf", weeklyPoints: 11705, allTimePoints: 104220, previousRank: 6 },
      { id: "u10", firstName: "Seun", lastName: "Akinola", weeklyPoints: 10990, allTimePoints: 95640, previousRank: 12 },
      { id: "u20", firstName: "Musa", lastName: "Danjuma", weeklyPoints: 9400, allTimePoints: 67220 },
      { id: "u21", firstName: "Hauwa", lastName: "Garba", weeklyPoints: 9100, allTimePoints: 64980 },
      { id: "u22", firstName: "Sadiq", lastName: "Umar", weeklyPoints: 8800, allTimePoints: 61030 },
      { id: "u23", firstName: "Rukayat", lastName: "Lawal", weeklyPoints: 8350, allTimePoints: 57760 },
    ],
  },
];

/** The other eleven teams, so "#2 of 14" is true. Members are generated. */
const OTHER_TEAMS: { id: string; name: string; size: number; weeklyPoints: number; streakDays: number }[] = [
  { id: "eko-express", name: "Team Eko Express", size: 7, weeklyPoints: 66420, streakDays: 3 },
  { id: "jollof-runners", name: "Team Jollof Runners", size: 6, weeklyPoints: 61980, streakDays: 8 },
  { id: "zuma-rock", name: "Team Zuma Rock", size: 7, weeklyPoints: 58210, streakDays: 2 },
  { id: "owambe-movers", name: "Team Owambe Movers", size: 6, weeklyPoints: 54760, streakDays: 5 },
  { id: "abuja-ascent", name: "Team Abuja Ascent", size: 5, weeklyPoints: 50330, streakDays: 1 },
  { id: "danfo-dash", name: "Team Danfo Dash", size: 6, weeklyPoints: 47110, streakDays: 0 },
  { id: "calabar-cruise", name: "Team Calabar Cruise", size: 5, weeklyPoints: 43870, streakDays: 4 },
  { id: "sahel-stride", name: "Team Sahel Stride", size: 5, weeklyPoints: 40260, streakDays: 2 },
  { id: "delta-drive", name: "Team Delta Drive", size: 6, weeklyPoints: 37940, streakDays: 0 },
  { id: "kano-kinetic", name: "Team Kano Kinetic", size: 5, weeklyPoints: 34580, streakDays: 1 },
  { id: "enugu-edge", name: "Team Enugu Edge", size: 4, weeklyPoints: 30120, streakDays: 0 },
];

const FIRST_NAMES = [
  "Adaeze", "Bolaji", "Chinedu", "Damilola", "Ebuka", "Folake", "Gbenga", "Ifeoma", "Jide", "Kunle",
  "Lola", "Maryam", "Nnamdi", "Obinna", "Precious", "Rotimi", "Simi", "Tolu", "Usman", "Yetunde",
  "Zara", "Adamu", "Blessing", "Chioma", "Danladi", "Esther", "Fatima", "Godwin", "Hadiza", "Ikenna",
];
const LAST_NAMES = [
  "Adewale", "Balogun", "Chukwu", "Dauda", "Ekwueme", "Fashola", "Gambo", "Ibekwe", "Jibril", "Kalu",
  "Lawson", "Mohammed", "Nwosu", "Ojo", "Ogbonna", "Quadri", "Salami", "Tijani", "Uzor", "Waziri",
];

export interface TeamSeed {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  createdBy: string;
  maxMembers: number;
  streakDays: number;
  headToHead: HeadToHeadResult[];
}

export interface PeopleSeed {
  people: Person[];
  teams: TeamSeed[];
  allTimePoints: Record<string, number>;
  previousRanks: Record<string, number>;
}

/** Everyone but the current user, plus every team. `activeToday` is filled
 *  in by lib/data.ts from activities. */
export function buildPeople(now: number): PeopleSeed {
  const people: Person[] = [];
  const allTimePoints: Record<string, number> = {};
  const previousRanks: Record<string, number> = {};
  const teams: TeamSeed[] = [];

  for (const team of NAMED_TEAMS) {
    for (const m of team.members) {
      allTimePoints[m.id] = m.allTimePoints;
      if (m.previousRank) previousRanks[m.id] = m.previousRank;
      if (m.id === CURRENT_USER_ID) continue;
      people.push({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        initials: initialsOf(m.firstName, m.lastName),
        teamId: team.id,
        weeklyPoints: m.weeklyPoints,
        activeToday: false,
      });
    }
    teams.push({
      id: team.id,
      name: team.name,
      description: team.description,
      inviteCode: team.inviteCode,
      createdBy: team.members[0].id,
      maxMembers: 10,
      streakDays: team.streakDays,
      headToHead: [],
    });
  }

  let nameIndex = 0;
  for (const team of OTHER_TEAMS) {
    const rand = rng(team.id);
    const weights = Array.from({ length: team.size }, () => 0.7 + rand() * 0.6);
    const sum = weights.reduce((a, b) => a + b, 0);
    let assigned = 0;
    weights.forEach((w, i) => {
      const first = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
      const last = LAST_NAMES[(nameIndex * 7 + 3) % LAST_NAMES.length];
      nameIndex++;
      const points = i === team.size - 1 ? team.weeklyPoints - assigned : Math.round((team.weeklyPoints * w) / sum);
      assigned += points;
      const id = `${team.id}-${i + 1}`;
      // Kept under the named top ten, so the all-time board reads the same.
      allTimePoints[id] = points * between(rand, 5, 6);
      people.push({
        id,
        firstName: first,
        lastName: last,
        initials: initialsOf(first, last),
        teamId: team.id,
        weeklyPoints: points,
        activeToday: false,
      });
    });
    teams.push({
      id: team.id,
      name: team.name,
      description: "",
      inviteCode: `${team.id.slice(0, 4).toUpperCase()}-${between(rand, 1000, 9999)}`,
      createdBy: `${team.id}-1`,
      maxMembers: 10,
      streakDays: team.streakDays,
      headToHead: [],
    });
  }

  // Head-to-head: the last four weeks, against a neighbour in the standings.
  const monday = startOfUtcDay(now) - ((new Date(now).getUTCDay() + 6) % 7) * DAY_MS;
  const ironcladResults: ("won" | "lost")[] = ["won", "lost", "won", "won"];
  const ironcladOpponents = ["harmattan", "voltage", "jollof-runners", "eko-express"];
  for (const team of teams) {
    const rand = rng(`h2h-${team.id}`);
    const opponents =
      team.id === "ironclad"
        ? ironcladOpponents
        : teams.filter((t) => t.id !== team.id).slice(0, 4).map((t) => t.id);
    team.headToHead = opponents.map((opponentId, i) => {
      const outcome = team.id === "ironclad" ? ironcladResults[i] : rand() > 0.5 ? "won" : "lost";
      const points = between(rand, 52000, 90000);
      const margin = between(rand, 400, 6000);
      return {
        weekOf: isoDay(monday - (i + 1) * 7 * DAY_MS),
        opponentId,
        opponentName: teams.find((t) => t.id === opponentId)?.name ?? "Another team",
        outcome,
        points,
        opponentPoints: outcome === "won" ? points - margin : points + margin,
      };
    });
  }

  return { people, teams, allTimePoints, previousRanks };
}

/* ---------------------------------------------------------- challenges --- */

/** A challenge as stored: no `current` or `dayIndex` — those are computed. */
export interface ChallengeSeed {
  id: string;
  title: string;
  description: string;
  unit: string;
  goal: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  teamId: string | null;
  activity?: string;
  code?: string;
  featured?: boolean;
}

/** Start date for a challenge that's on day `dayIndex` today. */
function startFor(now: number, dayIndex: number) {
  return startOfUtcDay(now) - (dayIndex - 1) * DAY_MS;
}

export function buildChallenges(now: number): ChallengeSeed[] {
  const steps = startFor(now, 9);
  const pushups = startFor(now, 4);
  const plank = startFor(now, 9);
  return [
    {
      id: "10k-steps",
      title: "10K Steps Challenge",
      description: "Ten thousand a day each, a million as a team. Every step counts toward the total.",
      unit: "steps",
      goal: 1_000_000,
      startDate: isoDay(steps),
      endDate: isoDay(steps + 13 * DAY_MS),
      totalDays: 14,
      teamId: "ironclad",
      activity: "steps",
      code: "STEP-4K2M",
    },
    {
      id: "pushup-power-week",
      title: "Push-Up Power Week",
      description: "Seven days, two thousand push-ups, one team. Every clean set counts.",
      unit: "reps",
      goal: 2000,
      startDate: isoDay(pushups),
      endDate: isoDay(pushups + 6 * DAY_MS),
      totalDays: 7,
      teamId: "ironclad",
      activity: "pushups",
      code: "PUSH-9T3X",
      featured: true,
    },
    {
      id: "plank-ladder",
      title: "Plank Ladder",
      description: "Start at 20 seconds and add ten a day. Today's hold is 1 minute 40.",
      unit: "seconds",
      goal: 1190,
      startDate: isoDay(plank),
      endDate: isoDay(plank + 13 * DAY_MS),
      totalDays: 14,
      teamId: null,
      activity: "plank",
    },
  ];
}

/** Your steps for the last nine days, oldest first; the last is today. */
const MY_STEPS = [9020, 7780, 8420, 10240, 6310, 11870, 9150, 12400, 7502];
/** Your push-ups, days 1–3 of Power Week. Today's set isn't logged yet. */
const MY_PUSHUPS = [60, 55, 70];
/** Plank Ladder holds, days 1–8 (20s, then +10 a day). Today's isn't logged. */
const MY_PLANKS = [20, 30, 40, 50, 60, 70, 80, 90];

/**
 * Every logged entry, for everyone. Team challenges get an entry most days
 * from every Ironclad member; yours are fixed so the dashboard numbers read
 * well. Timestamps for today are always in the past.
 */
export function buildActivities(now: number, challenges: ChallengeSeed[], teammateIds: string[]): Activity[] {
  const out: Activity[] = [];
  const today = startOfUtcDay(now);
  let n = 0;

  function at(dayStart: number, hour: number, minute: number) {
    const t = dayStart + hour * 3_600_000 + minute * 60_000;
    // Never in the future: today's entries land before "now".
    return new Date(Math.min(t, now - (n % 9) * 23 * 60_000 - 5 * 60_000)).toISOString();
  }

  function push(userId: string, challengeId: string, dayStart: number, value: number, hour: number, minute: number) {
    n++;
    out.push({ id: `act-${n}`, userId, challengeId, recordedAt: at(dayStart, hour, minute), value });
  }

  for (const c of challenges) {
    const start = Date.parse(`${c.startDate}T00:00:00Z`);
    const days = Math.floor((today - start) / DAY_MS) + 1;

    for (let d = 0; d < days; d++) {
      const dayStart = start + d * DAY_MS;
      const isToday = dayStart === today;

      if (c.id === "10k-steps") push(CURRENT_USER_ID, c.id, dayStart, MY_STEPS[MY_STEPS.length - days + d], 19, 30);
      if (c.id === "pushup-power-week" && d < MY_PUSHUPS.length) push(CURRENT_USER_ID, c.id, dayStart, MY_PUSHUPS[d], 12, 15);
      if (c.id === "plank-ladder" && d < MY_PLANKS.length) push(CURRENT_USER_ID, c.id, dayStart, MY_PLANKS[d], 7, 5);

      if (!c.teamId) continue;
      for (const mate of teammateIds) {
        const rand = rng(`${mate}-${c.id}-${d}`);
        // Most people log most days; fewer have logged yet today.
        if (rand() < (isToday ? 0.35 : 0.1)) continue;
        const value =
          c.unit === "steps"
            ? isToday
              ? between(rand, 1500, 6000)
              : between(rand, 6000, 12500)
            : between(rand, 25, 70);
        push(mate, c.id, dayStart, value, between(rand, 6, 20), between(rand, 0, 59));
      }
    }
  }

  return out;
}

/** Offered in onboarding (#6) and the first-run dashboard (#20). */
export const suggestedChallenges: SuggestedChallenge[] = [
  {
    id: "daily-8k-walk",
    title: "Daily 8K Walk",
    description: "Eight thousand steps a day for a week. A gentle way to start a streak.",
    unit: "steps",
    goal: 56000,
    totalDays: 7,
    activity: "steps",
  },
  {
    id: "push-up-starter",
    title: "Push-Up Starter",
    description: "Three hundred push-ups across seven days. Split them however you like.",
    unit: "reps",
    goal: 300,
    totalDays: 7,
    activity: "pushups",
  },
  {
    id: "plank-a-day",
    title: "Plank a Day",
    description: "Ten minutes of planks over a week. A minute and a half a day gets you there.",
    unit: "seconds",
    goal: 600,
    totalDays: 7,
    activity: "plank",
  },
];

/* ------------------------------------------------------- notifications --- */

export function returningNotifications(
  now: number,
  facts: { streak: number; teamName: string; pushupPct: number; pushupDaysLeft: number },
): AppNotification[] {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  return [
    {
      id: "notif-1",
      type: "reminder",
      title: `${facts.streak}-day streak. Keep it going.`,
      message: `Log something before midnight to make it ${facts.streak + 1}.`,
      read: false,
      createdAt: ago(2 * 3_600_000),
    },
    {
      id: "notif-3",
      type: "challenge",
      title: `Push-Up Power Week ends in ${facts.pushupDaysLeft} days`,
      message: `Your team is at ${facts.pushupPct}%. Keep the sets coming.`,
      read: false,
      createdAt: ago(9 * 3_600_000),
    },
    {
      id: "notif-4",
      type: "achievement",
      title: "7-Day Streak unlocked",
      message: "Keep a streak alive for 7 days.",
      read: true,
      createdAt: ago(2 * DAY_MS),
    },
    {
      id: "notif-2",
      type: "general",
      title: `Halima Sani joined ${facts.teamName}`,
      message: "Say hi to Halima Sani, your newest teammate.",
      read: true,
      createdAt: ago(6 * DAY_MS + 3 * 3_600_000),
    },
    {
      id: "notif-5",
      type: "achievement",
      title: "10K Day unlocked",
      message: "Log 10,000 steps in one day.",
      read: true,
      createdAt: ago(5 * DAY_MS + 4 * 3_600_000),
    },
    {
      id: "notif-6",
      type: "system",
      title: `Welcome to ${facts.teamName}`,
      message: "You're on the team. Log activity to climb the team leaderboard together.",
      read: true,
      createdAt: ago(213 * DAY_MS),
    },
  ];
}

export function newUserNotifications(now: number): AppNotification[] {
  return [
    {
      id: "notif-welcome",
      type: "system",
      title: "Welcome to TUFF",
      message: "Join a challenge or a team, then log your first activity to start a streak.",
      read: false,
      createdAt: new Date(now).toISOString(),
    },
  ];
}

/* ------------------------------------------------------------- profile --- */

/** Mirrors backend/data/achievements.js. `earnedAt` here only says when the
 *  returning user earned it; whether it's earned and the progress on locked
 *  ones are computed in lib/data.ts from the same activity data the
 *  dashboard reads. */
export const achievementCatalog = [
  { id: "first-log", name: "First Log", description: "Log your first activity.", requirement: "activities_logged:1", icon: "footprints", points: 10 },
  { id: "team-player", name: "Team Player", description: "Join a team.", requirement: "team_joined:1", icon: "users", points: 10 },
  { id: "first-finish", name: "First Finish", description: "Complete your first challenge.", requirement: "challenges_completed:1", icon: "flag", points: 25 },
  { id: "streak-7", name: "7-Day Streak", description: "Keep a streak alive for 7 days.", requirement: "streak_days:7", icon: "flame", points: 25 },
  { id: "century-club", name: "Century Club", description: "Log 100 reps in one day.", requirement: "reps_in_day:100", icon: "dumbbell", points: 25 },
  { id: "10k-day", name: "10K Day", description: "Log 10,000 steps in one day.", requirement: "steps_in_day:10000", icon: "footprints", points: 25 },
  { id: "challenge-clearer", name: "Challenge Clearer", description: "Complete 5 challenges.", requirement: "challenges_completed:5", icon: "trophy", points: 50 },
  { id: "streak-30", name: "30-Day Streak", description: "Keep a streak alive for 30 days.", requirement: "streak_days:30", icon: "flame", points: 100 },
];

/** Days ago each was earned, for the returning user. */
export const returningEarnedDaysAgo: Record<string, number> = {
  "first-log": 213,
  "team-player": 213,
  "first-finish": 160,
  "streak-7": 2,
  "century-club": 109,
  "10k-day": 5,
};

/** History from before the seeded activities — so lifetime numbers aren't
 *  just this week's. lib/data.ts adds the live activity on top. */
export const returningHistory = {
  bestStreak: 21,
  lifetimeStepsBefore: 1_760_000,
  repsBefore: 9_150,
  challengesCleared: 4,
  bestRepsInADay: 112,
  activeMinutesToday: 46,
  caloriesToday: 512,
  weeklyDeltaPct: 12,
};

export function returningPersonalBests(now: number): PersonalBest[] {
  return [
    { id: "pb-pushups", label: "Most push-ups in a day", value: "112 reps", achievedAt: isoDay(now - 109 * DAY_MS) },
    { id: "pb-plank", label: "Longest plank", value: "3:45", achievedAt: isoDay(now - 60 * DAY_MS) },
    { id: "pb-steps", label: "Most steps in a day", value: "14,820 steps", achievedAt: isoDay(now - 74 * DAY_MS) },
  ];
}
