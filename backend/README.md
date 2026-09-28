# TUFF — Backend

Node.js + Express + MongoDB (Mongoose), plain JavaScript (CommonJS —
`require`/`module.exports`, matching `models/`). No TypeScript here; keep it
that way for consistency rather than mixing module systems file by file.

## Run it

```bash
cd backend
npm install
cp .env.example .env    # fill in MONGO_URI (and FRONTEND_ORIGIN if not localhost:3000)
npm run dev              # http://localhost:4000, restarts on save
```

`GET /health` should return `{"ok":true}` once it's running. You need a
MongoDB database — [Atlas](https://www.mongodb.com/atlas) (free tier, no
install) or a local `mongod`.

## Layout so far

```
server.js       Entry point: loads env, connects the DB, wires Express,
                registers every model, starts listening. Mount new routes
                here as they're built (see the TODO comment in the file).
config/
  dbConfig.js    Mongoose connection.
models/          One schema per collection.
```

No `routes/`, `controllers/`, or `middleware/` yet — nothing's been built on
top of the models. Add those folders (one file per resource, e.g.
`routes/challengeRoutes.js` + `controllers/challengeController.js`) as each
piece gets picked up.

## Before building on a model, check the open issues

Some model fields don't match what the frontend (`frontend/lib/types.ts`,
the working contract) expects yet — naming differences, a few required
fields that need to become optional, one missing model (`Team`). See
[#5](https://github.com/Donrington/capstone-project-tuff/issues/5) for the
full list before you build a controller against a model that's on it.
