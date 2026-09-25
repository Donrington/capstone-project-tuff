# `backend/src/` file layout

One page, just the folder structure and what belongs where. For the API
contract (which endpoint does what) and how the work is split across the
team, see [`backend/README.md`](README.md) — this file is the map, that one
is the plan.

```
backend/
├── .env.example              Copy to .env and fill in — never commit .env
├── package.json
├── tsconfig.json
├── README.md                 API contract, setup, how the work is split
├── FILE_LAYOUT.md            This file
└── src/
    ├── server.ts             Entry point: connects the DB, then starts listening.
    ├── app.ts                The Express app: middleware + route mounting.
    │                         Read this first — it's the map of everything else.
    │
    ├── config/
    │   ├── env.ts             Validates .env at startup (zod). Import `env`
    │   │                     from here — never read process.env directly
    │   │                     anywhere else.
    │   └── db.ts               Mongoose connection.
    │
    ├── models/                 One Mongoose schema per MongoDB collection.
    │   ├── User.model.ts        Field names/types match frontend/lib/types.ts —
    │   ├── Team.model.ts        check there before adding or renaming a field.
    │   ├── Challenge.model.ts
    │   └── Activity.model.ts
    │
    ├── controllers/            Business logic. One file per resource. A
    │   │                     controller function reads `req`, does the work,
    │   │                     calls `res.json(...)`. No route wiring or
    │   │                     validation here — that's routes/ and validators/.
    │   ├── auth.controller.ts        sign-up, sign-in, sign-out, refresh
    │   ├── user.controller.ts        GET/PATCH /me, photo, stats, profile
    │   ├── challenge.controller.ts   challenges + activity logging
    │   ├── team.controller.ts        the current user's team
    │   ├── leaderboard.controller.ts ranked scores, week / all-time
    │   └── invite.controller.ts      invite-code lookup + accept
    │
    ├── routes/                 One file per resource: maps an HTTP method +
    │   │                     path to [validate(schema), requireAuth, controllerFn].
    │   ├── index.ts             Mounts every router below under /api — add a
    │   │                       new resource's router here.
    │   ├── auth.routes.ts
    │   ├── user.routes.ts
    │   ├── challenge.routes.ts
    │   ├── team.routes.ts
    │   ├── leaderboard.routes.ts
    │   └── invite.routes.ts
    │
    ├── middleware/
    │   ├── auth.middleware.ts       requireAuth (401 if not signed in), requireRole
    │   ├── validate.middleware.ts   runs a zod schema against req.body, 400 on failure
    │   ├── error.middleware.ts      turns a thrown ApiError into the right HTTP
    │   │                           response — mounted last in app.ts
    │   └── asyncHandler.ts          wrap every async controller in this (see below)
    │
    ├── validators/              One zod schema file per resource — request
    │   ├── auth.validators.ts    body shapes, kept next to the routes that use them.
    │   ├── user.validators.ts
    │   └── challenge.validators.ts
    │
    ├── utils/
    │   ├── ApiError.ts           throw ApiError.notFound() etc. from anywhere
    │   └── jwt.ts                 sign/verify the access + refresh token cookies
    │
    └── types/
        └── express.d.ts          adds `req.user` to Express's Request type
```

## The pattern every module follows

`auth.controller.ts` + `auth.routes.ts` + `auth.validators.ts` are fully
built — copy that shape for a new module:

```ts
// routes/whatever.routes.ts
router.post("/", validate(createSchema), asyncHandler(whatever.create));
```

```ts
// controllers/whatever.controller.ts
export async function create(req: Request, res: Response) {
  // req.body is already validated + typed by this point.
  const doc = await Whatever.create({ ...req.body, ownerId: req.user!.id });
  res.status(201).json(doc.toJSON());
}
```

Always wrap an async controller in `asyncHandler(...)` — without it, a
rejected promise (including a thrown `ApiError`) hangs the request instead
of reaching `error.middleware.ts`.
