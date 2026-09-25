# TUFF

Team fitness challenges, streaks, and leaderboards.

| Folder | What it is |
|---|---|
| [`frontend/`](frontend/) | The web app: Next.js (App Router), React, TypeScript. See its [README](frontend/README.md). |
| [`backend/`](backend/) | The API: Node.js, Express, TypeScript, MongoDB. Scaffolded, mostly unbuilt — see its [README](backend/README.md) for the file layout, the API contract, and how the work is split. |

## Run the frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## Run the backend

```bash
cd backend
npm install
cp .env.example .env    # fill in MONGODB_URI and the JWT secrets
npm run dev              # http://localhost:4000
```

## Deploy the frontend (Vercel)

Import this repo in Vercel and set **Root Directory** to `frontend`. Vercel
detects Next.js and uses the default install and build commands.
