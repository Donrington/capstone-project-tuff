# TUFF

Team fitness challenges, streaks, and leaderboards.

| Folder | What it is |
|---|---|
| [`frontend/`](frontend/) | The web app: Next.js (App Router), React, TypeScript. See its [README](frontend/README.md). |
| `backend/` | The Node.js API. Not started yet. |

## Run the frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## Deploy the frontend (Vercel)

Import this repo in Vercel and set **Root Directory** to `frontend`. Vercel
detects Next.js and uses the default install and build commands.
