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
| `POST /api/auth/sign-in` | `{ email, password }` | `200` + the user | Same `401` message either way — doesn't reveal which field was wrong. A Google-only account gets a `401` saying to use Google |
| `POST /api/auth/google` | `{ code, codeVerifier, redirectUri }` | `201` (new account) or `200` + `{ user, isNew }` | Called by the frontend's Google callback. `503` until Google is configured; `400` if the code is bad or the Google email isn't verified |
| `POST /api/auth/sign-out` | — | `204` | Revokes the refresh token server-side |
| `POST /api/auth/refresh` | — | `204` | Reissues the access token from a valid refresh token |
| `GET /api/auth/me` | — | `200` + the user | Behind `requireAuth` — `401` without a session |

The user object in every response has `passwordHash` (and `googleId`)
stripped and `_id` renamed to `id` — see `toSafeUser()` in
`utils/serializeUser.js`; use it in new controllers rather than sending a raw
Mongoose doc back.

### Google sign-in

The frontend runs the redirect (an OAuth code flow with PKCE and a CSRF
state); this API only ever sees the one-time code. `POST /api/auth/google`
trades it with Google using the client secret, verifies the ID token with
Google's own library (`services/googleAuth.js`), requires a verified email,
then signs in the account with that Google id; otherwise links the account
with that email; otherwise creates one (`isNew: true` sends them to
onboarding). Google accounts have no password: password sign-in tells them
to use Google, and password change refuses politely.

Linking an existing email account **drops its password and signs out its
other sessions.** TUFF's own sign-up never verifies an email address, so
whoever registered `someone@gmail.com` first might not be its owner; Google
just proved who is. Without this, a squatter's password would keep working
after the real owner signs in with Google.

#### Setting up Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/), pick or
   create a project, then **APIs & Services → OAuth consent screen**:
   External, app name "TUFF", your support email, scopes `openid`,
   `email`, `profile`. While it's in Testing, add the accounts that may sign
   in as test users (or publish it).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   type **Web application**. Under **Authorized redirect URIs** add, exactly:
   - `http://localhost:3000/auth/google/callback`
   - `https://<your-vercel-domain>/auth/google/callback`
3. Copy the client ID and secret:
   - Backend (`.env` and Render): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
   - Frontend (`.env.local` and Vercel): `GOOGLE_CLIENT_ID` only. Redeploy
     both.

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
| `GET /api/challenges` | `200` + the challenges you've joined, plus every challenge your team runs, each with `current`, `dayIndex`, `totalDays` | Featured first, then newest start. A team challenge is the whole team's: a teammate's first `POST …/activities` against it joins them to it |
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

## Admin — built

Everything under `/api/admin` is for admins only. The gate is `requireAuth` then
`requireAdmin` (`middleware/authMiddleware.js`), which reads the role and status
from the **database** on every request, not from the access token (which carries
the role it was issued with for up to 15 minutes): a demoted or suspended admin
is locked out at once.

| Endpoint | Body / query | Returns |
|---|---|---|
| `GET /api/admin/overview` | | `{ users: { total, admins, suspended, newLast7Days, activeLast7Days }, teams, challenges: { total, byStatus }, activities: { total, last7Days }, signups: [{ date, count }] }` (signups: last 14 days, zeros included) |
| `GET /api/admin/users` | `?q=` (name or email, matched literally), `?status=active\|inactive\|suspended`, `?role=member\|admin`, `?page=`, `?limit=` (max 50) | `{ rows: [{ id, name, email, role, status, createdAt, teamName, activityCount, lastActiveAt }], total, page, pages }`, newest first |
| `PATCH /api/admin/users/:id` | `{ status?: "active"\|"suspended", role?: "member"\|"admin" }` | the updated row. `403` on your own account. Suspending also revokes the person's refresh tokens |
| `GET /api/admin/challenges` | `?status=`, `?page=`, `?limit=` | `{ rows: [{ id, title, type, unit, goal, status, teamName, createdBy, participants, startDate, endDate, createdAt }], total, page, pages }` |
| `PATCH /api/admin/challenges/:id` | `{ status: "cancelled" }` (the only change allowed) | `{ id, status }`. `409` if it's already completed or cancelled. Logging to a cancelled challenge is refused |
| `GET /api/admin/teams` | `?page=`, `?limit=` | `{ rows: [{ id, name, status, members, maxMembers, createdBy, createdAt }], total, page, pages }` |

**Suspended accounts** can't sign in (password or Google: `403 "This account has
been suspended."`, said only after the right password, so it isn't a way to probe
for accounts), can't refresh a session, and `GET /api/auth/me` answers `401` so
the frontend treats them as signed out straight away. A suspended person's
existing access token still works against other endpoints until it expires (at
most 15 minutes), because `requireAuth` is stateless; that's the trade for not
adding a database read to every request.

**Making the first admin.** There is no sign-up path to admin, on purpose (TUFF
doesn't verify emails at sign-up, so an "ADMIN_EMAILS" setting would let anyone
register a listed address first). Run it yourself, against the right database:

```
cd backend
npm run make-admin -- someone@example.com            # promote
npm run make-admin -- someone@example.com --revoke   # take it back
```

It reads `MONGO_URI` from `backend/.env` or the environment, so point it at the
database you mean. After that, admins can promote others from the dashboard.
Admin actions are logged to stdout as `[admin] <who> changed user <id>: {...}`;
there's no audit-log collection yet.

## Before building on a model, check the open issues

Some model fields don't match what the frontend (`frontend/lib/types.ts`,
the working contract) expects yet. Check the repo's issues before you build
a controller against a model that has one open against it.
