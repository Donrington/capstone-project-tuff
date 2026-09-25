# TUFF

Team fitness challenges, streaks, and leaderboards.

| Folder | What it is |
|---|---|
| [`frontend/`](frontend/) | The web app: Next.js (App Router), React, TypeScript. See its [README](frontend/README.md). |
| `backend/` | The API. Not in this repo yet — untracked while the team settles on the approach. |

Working on this repo? Read [CONTRIBUTING.md](CONTRIBUTING.md) first — nobody
pushes to `main` directly; everything goes through a branch and a PR.

## Run the frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## Deploy the frontend (Vercel)

Import this repo in Vercel and set **Root Directory** to `frontend`. Vercel
detects Next.js and uses the default install and build commands.
