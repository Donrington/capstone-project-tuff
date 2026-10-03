# TUFF — Backend

Node.js + Express + MongoDB (Mongoose), plain JavaScript (CommonJS —
`require`/`module.exports`, matching `models/`). No TypeScript here; keep it
that way for consistency rather than mixing module systems file by file.

## Run it

```bash
cd backend
npm install
cp .env.example .env    # fill in MONGO_URI and JWT_ACCESS_SECRET
npm run dev              # http://localhost:4000, restarts on save
```

`GET /health` should return `{"ok":true}` once it's running. You need a
MongoDB database — [Atlas](https://www.mongodb.com/atlas) (free tier, no
install) or a local `mongod`.

## Layout so far

```
server.js         Entry point: loads env, connects the DB, wires Express,
                  registers every model, mounts routes, starts listening.
config/
  dbConfig.js      Mongoose connection.
models/            One schema per collection.
routes/
  authRoutes.js    Maps method + path -> [middleware..., controller].
controllers/
  authController.js  Auth logic: reads req, does the work, calls res.json().
middleware/
  authMiddleware.js   requireAuth (401 if not signed in), requireRole.
  errorHandler.js     Turns a thrown ApiError (or a Mongoose validation/
                      duplicate-key error) into the right HTTP response.
                      Mounted last in server.js.
  asyncHandler.js      Wrap every async controller in this — see below.
utils/
  ApiError.js      Throw ApiError.notFound() etc. from anywhere.
  jwt.js           Signs/verifies the access token; generates + hashes
                   refresh tokens.
```

**The pattern every module follows** — copy auth's shape for a new resource:

```js
// routes/whateverRoutes.js
router.post("/", asyncHandler(whatever.create));
```

```js
// controllers/whateverController.js
async function create(req, res) {
  // Throw ApiError.notFound() / .badRequest() / .forbidden() on the way —
  // never res.status(...).json({error}) by hand, errorHandler.js does that.
  const doc = await Whatever.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json(doc.toObject());
}
```

Always wrap an async controller in `asyncHandler(...)` (`middleware/asyncHandler.js`) —
without it, a rejected promise (including a thrown `ApiError`) hangs the
request instead of reaching `errorHandler.js`.

## Auth — built

Session is a short-lived **access token** (a JWT, 15 minutes, in an httpOnly
cookie) plus a longer-lived **refresh token** (a random string, 30 days,
also httpOnly). The refresh token isn't a JWT — its SHA-256 hash is stored
in the `RefreshToken` collection, so a database leak alone can't be used to
forge a session, and signing out actually deletes the row (revocation),
not just the cookie.

| Method & path | Body | Returns | Notes |
|---|---|---|---|
| `POST /api/auth/sign-up` | `{ firstName, lastName, email, password }` | `201` + the user | `409` if the email's taken |
| `POST /api/auth/sign-in` | `{ email, password }` | `200` + the user | Same `401` message either way — doesn't reveal which field was wrong |
| `POST /api/auth/sign-out` | — | `204` | Revokes the refresh token server-side |
| `POST /api/auth/refresh` | — | `204` | Reissues the access token from a valid refresh token |
| `GET /api/auth/me` | — | `200` + the user | Behind `requireAuth` — `401` without a session |

The user object in every response has `passwordHash` stripped and `_id`
renamed to `id` — see `toSafeUser()` in `utils/serializeUser.js`; use it in
new controllers rather than sending a raw Mongoose doc back.

## Users (the signed-in user's own account) — built

All behind `requireAuth`, and all act on `req.user` only: there's no `:id`,
so none of these can be pointed at someone else's account. Every one that
returns the user returns the full `toSafeUser` shape, so the frontend can
replace its copy wholesale.

| Method & path | Body | Returns | Notes |
|---|---|---|---|
| `PATCH /api/users/me` | any of `{ firstName, lastName, displayName, bio }` | `200` + the user | `bio` max 160, `displayName` max 40 |
| `PUT /api/users/me/photo` | `{ dataUrl }` or `{ dataUrl: null }` | `200` + the user | JPEG/PNG/WebP/GIF data URL. Uploaded to Cloudinary at `tuff/avatars/<userId>` (overwrite), `null` deletes it. `503` if Cloudinary isn't configured |
| `PATCH /api/users/me/password` | `{ currentPassword, newPassword }` | `204` | Revokes **every** refresh token (signs out other devices), then issues this device a fresh session |
| `PATCH /api/users/me/goals` | any of `{ stepGoal, workoutDaysPerWeek }` | `200` + the user | `stepGoal` 1,000–100,000, default 10,000 |
| `PATCH /api/users/me/notification-prefs` | any of `{ streakReminders, teamActivity, leaderboardChanges, challengeInvites, weeklySummary, reminderTime }` | `200` + the user | `reminderTime` is `"HH:MM"` 24-hour |
| `PATCH /api/users/me/privacy` | any of `{ showOnLeaderboards, profileVisibility }` | `200` + the user | `profileVisibility`: `everyone`, `teammates` or `only_me` |
| `POST /api/users/me/onboarding` | any of `{ motivations, stepGoal, dateOfBirth, gender, height, weight, fitnessLevel }` | `200` + the user | Every answer optional (each step can be skipped); always sets `onboardingCompletedAt`. Joining a team/challenge uses those endpoints |
| `DELETE /api/users/me` | `{ confirm: "DELETE" }` | `204` | Deletes the user, their participations, activities, achievements, notifications, refresh tokens and avatar. Teams and challenges they created stay |

**Cloudinary** needs `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET` in `.env` (see `.env.example`). They're optional: the
server boots without them and only the photo endpoint answers `503`.

Verified against a disposable MongoDB with the Cloudinary SDK stubbed: 45
checks, covering validation on every endpoint, the 503 path, the fixed
public ID + overwrite, password change killing a second device's refresh
token while keeping this one, and delete cascading to the user's own
documents only. All passed.

Verified with a real, disposable MongoDB (not just reading the code) before
this was written up: 15 checks covering sign-up validation, duplicate
emails, cookie issuance, `GET /me` with and without a session, sign-out
actually revoking the refresh token (confirmed the old one fails afterward,
not just that the cookie's gone), wrong-password rejection, and refresh —
all passed.

## Achievements — built

The catalog lives in code, `data/achievements.js`, and is upserted into the
`Achievement` collection by name every time the server boots. To add or
change one, edit that file and restart. Nobody has to run a seed script.

`requirement` is a machine rule, `"<metric>:<target>"`, e.g.
`streak_days:7`. `description` is the copy shown to users. The metrics
(`activities_logged`, `streak_days`, `team_joined`, `challenges_completed`,
`reps_in_day`, `steps_in_day`) are computed from real data in
`services/achievementService.js`. A new metric means adding it to
`computeMetrics` there.

Awarding happens in `evaluateAchievements(userId)`, which runs after logging
activity, completing a challenge, creating or joining a team, and on
`GET /api/achievements`. The unique `(user, achievement)` index makes a
double award impossible even when requests race. Each award also creates an
`achievement` notification.

| Method & path | Returns | Notes |
|---|---|---|
| `GET /api/achievements` | `200` + `[{ id, name, description, requirement, icon, points, earnedAt, progress? }]` | Whole catalog from the signed-in user's view. `earnedAt` is `null` while locked; locked ones carry `progress: { current, target }` |

`POST /api/challenge-participants/:id/activities` now also returns
`newAchievements` (same shape) so the frontend can celebrate immediately.

Streaks are counted in UTC days for now (`TODO(timezones)`).

## Notifications — built

Created server-side only (`services/notificationService.js`). There's no
endpoint to create one. Current triggers:

| Event | Who | `type` | Respects pref |
|---|---|---|---|
| Achievement earned | the earner | `achievement` | — |
| Challenge goal reached | the finisher | `challenge` | — |
| Joined a team | the joiner ("Welcome to …") | `system` | — |
| Someone joined your team | the other teammates | `general` | `teamActivity` |

| Method & path | Returns | Notes |
|---|---|---|
| `GET /api/notifications?limit=&before=&unread=true` | `200` + `[{ id, type, title, message, read, createdAt }]` | Newest first. `limit` 1–100 (default 30). Page back with `before` = the last item's `createdAt` |
| `GET /api/notifications/unread-count` | `200` + `{ count }` | For the bell's dot |
| `PATCH /api/notifications/:id/read` | `200` + the notification | Someone else's ID answers `404` |
| `PATCH /api/notifications/read-all` | `204` | |
| `DELETE /api/notifications/:id` | `204` | Someone else's ID answers `404` |

Not built yet: streak reminders at the user's `reminderTime` (needs the
user's timezone) and the weekly summary email (needs an email provider).

Verified against a disposable MongoDB: 48 checks, covering streak maths,
catalog sync idempotency, each trigger, the `teamActivity` mute, progress on
locked achievements, a 6-way concurrent race awarding exactly once, paging,
and every cross-user access answering `404`. All passed.

## Feeds and stats — built (read-only, for the frontend)

| Method & path | Returns | Notes |
|---|---|---|
| `GET /api/challenges` | `200` + the challenges you've joined, each with `current`, `dayIndex`, `totalDays` | Featured first, then newest start |
| `GET /api/challenge-participants/:challengeId/activities?limit=` | `200` + activity entries, newest first | Default 200, max 1000. Feeds the per-day chart and the history |
| `GET /api/users/me/activities?limit=` | `200` + your entries, newest first | Default 20, max 200 |
| `GET /api/teams/:id/activity?limit=` | `200` + the team's entries, newest first | Members only (`403` otherwise), like the roster |
| `GET /api/teams/code/:code` | `200` + `{ id, name, description, inviteCode, memberCount, maxMembers }` | For the join preview. Dashes and case ignored |
| `GET /api/users/me/stats` | `200` + `{ today: { steps, activeMinutes, calories }, streakDays, bestStreak, week: [{ date, steps }] ×7, weeklyDeltaPct, lifetime: { steps, reps }, challengesCompleted, personalBests: { mostStepsInADay, mostRepsInADay, longestHoldSeconds } }` | All computed from activity. Days are UTC for now. `weeklyDeltaPct` is `null` with no previous week; each personal best is `{ value, date }` or `null` |

An activity entry is `{ id, person: { id, name, initials, profilePicture }, challengeId, challengeName, value, unit, recordedAt }`.

Verified against a disposable MongoDB: 20 checks (live totals, ordering,
limits, member-only access, every stats field, empty stats). The profile
(45) and achievements (48) suites were re-run alongside; all passed.

## Leaderboard — built

All require a session. `period` is `week` (the default) or `all-time`;
anything else is a `400`.

| Method & path | Returns |
|---|---|
| `GET /api/leaderboard?period=` | `[{ rank, previousRank?, user: { id, name, initials }, teamName, score, scoreUnit: "pts" }]`, best first: the top 50, plus your own row if you're further down |
| `GET /api/leaderboard/teams?period=` | `[{ id, name, rank, points, memberCount, streakDays, members? }]`, best first. `members: [{ id, points }]` only on your own team (rosters are members-only) |
| `GET /api/leaderboard/challenge/:challengeId` | `{ challenge, count, leaderboard: [{ rank, user, progress, points, completed }] }` — everyone in one challenge |
| `GET /api/leaderboard/challenge/:challengeId/teams` | `{ challenge, count, leaderboard: [{ rank, team, points, progress, members }] }` — teams in one challenge |
| `GET /api/leaderboard/challenge/:challengeId/team/:teamId` | `{ team, challenge, count, leaderboard }` — one team's members in one challenge |

The two global boards, in `services/leaderboardService.js`:

- **Points** are each activity's `value × challenge.pointsPerUnit`, summed
  from `Activity` for both periods, so a week's total can never exceed the
  all-time one. The frontend gives new challenges `pointsPerUnit` of 0.01
  for steps, 1 for reps and 0.5 for seconds.
- **The week** starts Monday 00:00 UTC. `previousRank` (week only) is where
  you finished last week.
- **Ranks** are competition ranks: ties share a rank and the next one skips
  (1, 2, 2, 4). Nobody with zero points is ranked, and no team either.
- **Privacy:** people with `privacy.showOnLeaderboards: false` (and
  suspended accounts) aren't listed. Their points still count toward their
  team's total — they just aren't named.
- **`streakDays`** is how many days in a row every current member logged
  something, counting back from today (or yesterday, if today's not done).
- **`name`** is the user's `displayName`, falling back to their full name.

Verified against a disposable local MongoDB: 18 checks, covering ties,
privacy, last week's ranks, the 50-row cap with the viewer pinned, team
streaks, zero-point teams, and the per-challenge endpoints (including a bad
id answering `404`, not `500`). All passed.

## Before building on a model, check the open issues

Some model fields don't match what the frontend (`frontend/lib/types.ts`,
the working contract) expects yet. Check the repo's issues before you build
a controller against a model that has one open against it.
