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
renamed to `id` — see `toSafeUser()` in `authController.js`; follow that
pattern in new controllers rather than sending a raw Mongoose doc back.

Verified with a real, disposable MongoDB (not just reading the code) before
this was written up: 15 checks covering sign-up validation, duplicate
emails, cookie issuance, `GET /me` with and without a session, sign-out
actually revoking the refresh token (confirmed the old one fails afterward,
not just that the cookie's gone), wrong-password rejection, and refresh —
all passed.

## Before building on a model, check the open issues

Some model fields don't match what the frontend (`frontend/lib/types.ts`,
the working contract) expects yet. Check the repo's issues before you build
a controller against a model that has one open against it.
