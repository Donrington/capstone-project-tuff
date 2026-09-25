# TUFF — Backend

Node.js + Express + TypeScript API for TUFF. MongoDB (Mongoose) for storage,
JWT-in-httpOnly-cookies for auth. This scaffold exists so the team can split
work by module instead of everyone touching the same files.

The frontend (`../frontend`) currently runs on mock data. Every place it
expects real data is marked `// TODO(backend): METHOD /path` in
`frontend/lib/data.ts` and `// TODO(auth)` in `frontend/lib/auth/get-current-user.ts`
and `frontend/app/(auth)/actions.ts` — **that's the actual contract.** This
README organizes it; those comments are the source of truth if they ever
disagree.

## Get running

```bash
cd backend
npm install
cp .env.example .env        # fill in MONGODB_URI, JWT_*_SECRET (see comments in the file)
npm run dev                  # http://localhost:4000, restarts on save
npm run typecheck
```

You need a MongoDB database — either [Atlas](https://www.mongodb.com/atlas)
(free tier, no local install) or a local `mongod`. `GET /health` should
return `{"ok":true}` once it's running.

## How it's organized

```
src/
  server.ts              Entry point: connect DB, start listening.
  app.ts                 Express app: middleware + route mounting. Read this
                          first — it's the map of everything else.
  config/
    env.ts                Validates .env at startup (zod) — import `env` from
                          here, never read process.env directly elsewhere.
    db.ts                 Mongoose connection.
  models/                 One Mongoose schema per collection. Field names and
                          types are chosen to match frontend/lib/types.ts —
                          check there before adding or renaming a field.
    User.model.ts
    Team.model.ts
    Challenge.model.ts
    Activity.model.ts
  controllers/            One file per resource. A controller function reads
                          req, does the work, calls res.json(...) — no route
                          wiring or validation in here (that's routes/ and
                          validators/).
  routes/                 One file per resource: maps HTTP method + path to
                          [validate(schema), requireAuth, controllerFn].
    index.ts               Mounts every resource router under /api — add
                          your new router here.
  middleware/
    auth.middleware.ts     requireAuth (401 if not signed in), requireRole.
    validate.middleware.ts Runs a zod schema against req.body, 400 on failure.
    error.middleware.ts    Turns a thrown ApiError into the right HTTP
                          response. Mounted last in app.ts.
    asyncHandler.ts        Wrap every async controller in this (see below).
  validators/             One zod schema file per resource — request body
                          shapes, kept next to the routes that use them.
  utils/
    ApiError.ts             Throw ApiError.notFound() etc. from anywhere.
    jwt.ts                  Sign/verify the access + refresh token cookies.
  types/
    express.d.ts            Adds req.user to Express's Request type.
```

**The pattern every module follows** — `auth.controller.ts` +
`auth.routes.ts` + `auth.validators.ts` are fully implemented; copy that
shape for a new module:

```ts
// routes/whatever.routes.ts
router.post("/", validate(createSchema), asyncHandler(whatever.create));
```

```ts
// controllers/whatever.controller.ts
export async function create(req: Request, res: Response) {
  // req.body is already validated + typed by this point.
  // Throw ApiError.notFound() / .badRequest() / .forbidden() on the way —
  // never res.status(...).json({error}) by hand, error.middleware.ts does that.
  const doc = await Whatever.create({ ...req.body, ownerId: req.user!.id });
  res.status(201).json(doc.toJSON());
}
```

Always wrap an async controller in `asyncHandler(...)` — without it, a
rejected promise (including a thrown `ApiError`) hangs the request instead of
reaching the error handler.

## What's already built vs. what's left

| Module | Files | Status |
|---|---|---|
| Auth | `auth.controller.ts`, `auth.routes.ts`, `auth.validators.ts` | **Done** — sign-up, sign-in, sign-out, refresh. Copy this pattern. |
| Users / "me" | `user.controller.ts`, `user.routes.ts` | GET/PATCH `/me`, PUT `/me/photo` done. `stats/today`, `activity/week`, `profile` are stubbed — see TODOs in the file. |
| Challenges + activity logging | `challenge.controller.ts` | List/get done. `createChallenge` and `addActivity` need porting from `frontend/lib/data.ts` (logic is already written there in plain JS). |
| Teams | `team.controller.ts` | Stubbed — needs the leaderboard ranking logic first. |
| Leaderboard | `leaderboard.controller.ts` | Stubbed — this is the one everything else (teams, invites) ranks off of. Build it early. |
| Invites | `invite.controller.ts` | `GET /invites/:code` done. `POST /invites/:code/accept` stubbed. |

**Suggested split for 3 teammates**, in dependency order:

1. **Person A — Leaderboard + Teams.** These two depend on each other
   (`TeamSummary.rank` comes from the same ranking as the leaderboard).
   Build `leaderboard.controller.ts` first, then `team.controller.ts` on
   top of it.
2. **Person B — Challenges + activity logging.** `createChallenge` and
   `addActivity` in `challenge.controller.ts` — the frontend's version in
   `frontend/lib/data.ts` (search for the same function names) is a working
   reference for the logic, just swap the in-memory array writes for
   Mongoose calls.
3. **Person C — "me" endpoints + invites.** `getTodayStats`,
   `getWeeklyActivity`, `getMyProfile` in `user.controller.ts` (profile
   depends on the other two — build it last), plus `acceptInvite` in
   `invite.controller.ts`.

Whoever finishes first picks up real auth hardening (see below) or starts
wiring the frontend to these routes instead of the mock in `lib/data.ts`.

## The API contract

Base path: `/api`. All request/response bodies are JSON. Every route under
`/me`, `/me/team`, `/challenges` (except invite previews) requires the
session cookie set by `POST /auth/sign-in` — send `credentials: "include"`
from the frontend.

| Method & path | Body | Returns | Frontend caller |
|---|---|---|---|
| `POST /auth/sign-up` | `{ name, email, password }` | `User` | `app/(auth)/actions.ts` `signUp` |
| `POST /auth/sign-in` | `{ email, password }` | `User` | `app/(auth)/actions.ts` `signIn` |
| `POST /auth/sign-out` | — | `204` | `app/(app)/actions.ts` `signOut` |
| `POST /auth/refresh` | — | `204` | called on a 401 to silently renew |
| `GET /me` | — | `User` | `lib/data.ts` `getCurrentUser` |
| `PATCH /me` | `{ name, displayName, bio }` | `User` | `lib/data.ts` `updateProfile` |
| `PUT /me/photo` | `{ dataUrl: string \| null }` | `User` | `lib/data.ts` `updateProfilePhoto` |
| `GET /me/stats/today` | — | `TodayStats` | `lib/data.ts` `getTodayStats` |
| `GET /me/activity/week` | — | `DayActivity[]` | `lib/data.ts` `getWeeklyActivity` |
| `GET /me/profile` | — | `Profile` | `lib/data.ts` `getProfile` |
| `GET /me/team` | — | `TeamSummary` | `lib/data.ts` `getTeamSummary` |
| `GET /me/team/mates` | — | `Pick<User,"id"\|"name"\|"initials">[]` | `lib/data.ts` `getTeammates` |
| `GET /challenges` | — | `Challenge[]` | `lib/data.ts` `getChallenges` |
| `GET /challenges/:id` | — | `Challenge` | `lib/data.ts` `getChallenge` |
| `POST /challenges` | see `createChallenge` input in `lib/data.ts` | `Challenge` | `lib/data.ts` `createChallenge` |
| `POST /challenges/:id/activities` | `{ value, when, note? }` | `LoggedActivity` | `lib/data.ts` `addActivity` |
| `GET /leaderboard?period=week\|all-time` | — | `LeaderboardEntry[]` | `lib/data.ts` `getLeaderboard` |
| `GET /invites/:code` | — | `CodeMatch` | `lib/data.ts` `findByCode` |
| `POST /invites/:code/accept` | — | `204` | `app/(app)/actions.ts` join flow |

The exact TypeScript shapes (`User`, `Challenge`, `TeamSummary`, …) live in
`frontend/lib/types.ts` — treat it as the schema reference. Don't change a
response shape without updating that file and telling whoever owns the
screen that reads it.

## Conventions

- **Validate with zod, throw `ApiError`.** Never build an error response by
  hand — `throw ApiError.notFound("...")` (or `.badRequest`, `.forbidden`,
  `.conflict`) and `error.middleware.ts` turns it into the right status code
  and JSON shape.
- **`req.user`** is set by `requireAuth` (see `middleware/auth.middleware.ts`)
  — `{ id, role }`. Never trust a user id from the request body; scope every
  query to `req.user!.id` (or their team) instead.
- **Mongoose docs → JSON:** every model's `toJSON` transform renames `_id` to
  `id` and strips `__v` (and `passwordHash` on User) — always respond with
  `doc.toJSON()` or just `doc` (Express calls `.toJSON()` for you on
  `res.json`), never build the response object by hand from the raw doc.
- **One module, one PR.** Each row in the table above belongs to one
  controller file — avoid two people editing the same controller at once.

## What's deliberately not here yet

- **Rate limiting, request logging to a file, tests.** Add `express-rate-limit`
  on `/auth/*` before this goes anywhere public; there's no test runner
  configured yet (Jest or Vitest both work fine with this TS setup).
- **Real password reset / email verification.** Sign-up creates the account
  immediately; there's no email step.
- **File upload for the profile photo.** See the TODO in
  `user.controller.ts` `updateMyPhoto` — it still takes the frontend's data
  URL as-is.
- **Deploying this.** Render, Railway and Fly.io all work well for a small
  Express + MongoDB API; whichever you pick, set the same env vars as
  `.env.example` and point `FRONTEND_ORIGIN` at the deployed frontend's URL
  (and the frontend's fetches at this API's URL) once both are live.
