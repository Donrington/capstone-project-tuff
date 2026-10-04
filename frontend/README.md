# TUFF — Web App

Next.js (App Router, React, TypeScript) web app for TUFF. Desktop-first web
layouts that reflow down to phone widths — not a mobile-app shell.

## Getting started

Run the backend first (`backend/README.md`), then:

```bash
npm install
cp .env.example .env.local   # optional: API_URL, TUFF_DATA_SOURCE
npm run dev          # http://localhost:3000, talking to the API on :4000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (also runs in CI)
npm run media:fetch  # re-download the auth clips into public/media (already done)
npm run fonts:fetch  # fetch Satoshi into public/fonts (runs before dev and build)
npm run test:e2e     # Playwright; reuses a dev server on :3000 or starts one
```

No backend handy? `TUFF_DATA_SOURCE=mock npm run dev` runs on the built-in demo
data instead. The e2e tests always use the mock (Playwright sets it).

The first e2e run needs a browser: `npx playwright install chromium`.

## Routes

| Route | What it is |
|---|---|
| `/` | **Landing = auth.** Split screen: sign up (video left, form right) ↔ sign in (form left, video right). `/?mode=signin` deep-links straight to sign in. |
| `/about` | About TUFF, outside the app shell. Reached from the auth page's "About" pill and the app's sidebar/drawer. `?from=app` swaps the calls to action for "Back to dashboard". The only page with the site footer. |
| `/terms`, `/privacy` | Draft legal pages (marked as drafts on the page), linked from the footer and the sign-up checkbox. |
| `/forgot-password`, `/reset-password?token=` | Ask for a reset link (same answer whatever the email), then set a new password. In development a demo link skips the email. |
| `/onboarding` | After sign-up, outside the shell: why you're here, body stats, step goal, a starter challenge, a team, then a summary. Every step can be skipped. |
| `/dashboard` | Bento dashboard: today's ring, featured challenge, weekly chart, leaderboard, challenge + team tiles |
| `/challenges` | Challenge grid, filtered by All/Solo/Team (`?type=solo`) |
| `/challenges/new` | Five-step wizard for creating a challenge (`?activity=<slug>` prefills the activity) |
| `/challenges/[id]` | Challenge hero, then progress per day against the pace needed, member breakdown and challenge leaderboard (team) or best days and streak (solo), and the activity history |
| `/leaderboard` | This week / All time (`?period=all-time`) |
| `/join/[code]` | What an invite link opens: a preview of the team or challenge, and a Join button |
| `/exercises`, `/exercises/[slug]` | Exercise library: category filter, then form cues, mistakes and muscles, and "Start a challenge with this" |
| `/search?q=` | Full search results, grouped into Challenges, Teams and People |
| `/profile` | Your profile: stats, achievements, personal bests, active challenges, recent activity |
| `/settings` | Profile, Account (password), Goals, Notifications, Appearance, Connected trackers, Privacy, Delete account — each `#section` linkable |
| `/teams`, `/teams/[id]` | Your team, the head-to-head with your rival and the standings (or Join/Create with no team); a team's roster, results, challenges and activity |
| `/dev/ui` | Dev-only showcase of every shared UI component in every state. 404s in production. |

## How it's organized

```
app/
  layout.tsx              Root: fonts, globals, <Providers>.
  providers.tsx           Client providers — ThemeProvider, ToastProvider, FlashToast.
  globals.css             Design tokens as CSS custom properties.
  (auth)/                 The landing page — no app chrome.
    page.tsx              Reads ?mode, renders <AuthSplit>.
    AuthSplit.tsx         Split-screen auth, sliding video panel, both forms.
    actions.ts            Server actions: signUp / signIn (validation + redirect).
  (app)/                  Everything behind sign-in, inside the app shell.
    layout.tsx            The app shell: <AppNav> plus the page.
    actions.ts            Server actions for app mutations (ActionState lives here).
    dashboard/ challenges/ leaderboard/ teams/ profile/ dev/ui/
components/
  ui/                     Design-system components (one file + CSS Module each).
  nav/                    The app nav: collapsible rail (>= 1024px), pill top bar and
                          drawer (< 1024px), session-aware profile block.
  about/                  About page pieces, including its nav (scroll-spy, drawer).
  footer/                 The About page footer (server-only, no client JS).
  shell/                  HeaderUtilities: SearchBox and NotificationsButton, on every app page.
  dashboard/              WeeklyActivity, TeamCard, StartChallenge (first run).
  charts/                 ColumnChart, shared by the week chart and challenge progress.
  challenge/              Challenge detail sections, including ActivityHistory.
  teams/ settings/ exercises/ onboarding/ auth/ profile/
  theme/                  ThemeProvider (dark/light, saved in localStorage).
  motion/SmoothScroll.tsx Lenis, wheel/trackpad only.
data/
  mock-data.ts            Seed data for the mock DB. Only lib/data/mock.ts imports it.
  suggested-challenges.ts Starter challenges for onboarding and first runs.
  exercises.ts            The exercise library — static content, imported directly.
  auth-media.json         Where the auth clips load from (see below).
lib/
  data/                   The app's only data source — see "Data" below.
    index.ts              Picks the implementation; everything imports from here.
    api.ts                The real one: the Express backend.
    mock.ts               The demo one: an in-memory mock DB.
  api/                    Server-side backend client: cookies, refresh, errors.
  types.ts                The shape contract, named to match the backend models.
  search.ts               The search matcher, shared by the search box and /search.
  challenge-card.ts       Small display helpers.
  nav/                    Nav items (one list feeds the rail, drawer and footer) and the
                          nav-state cookie.
  auth/get-current-user.ts  The session seam (GET /api/auth/me, or the mock).
  site-config.ts          Brand name, contact and socials (placeholders, see TODO(brand)).
proxy.ts                  Guards app routes and refreshes the session (Next 16's middleware).
e2e/                      Playwright tests: app nav, About nav, footer (with axe), features.
scripts/fetch-media.mjs   Self-hosts the auth clips.
```

## Data

Every screen reads through `@/lib/data`, which has two implementations with
the same exports, picked by `TUFF_DATA_SOURCE`:

- **`api` (default)** — `lib/data/api.ts` calls the Express backend at
  `API_URL` (default `http://localhost:4000`) from the server. The browser
  never talks to the backend directly.
- **`mock`** — `lib/data/mock.ts`, an in-memory demo DB seeded from
  `data/mock-data.ts`. Handy without a backend; the e2e tests use it.

`lib/data/index.ts` is typed as the mock's module, so the two can't drift
apart without the build failing.

**Waiting on the leaderboard.** Weekly points, ranks, rivals and team streaks
come from `GET /api/leaderboard*` (proposed contract in `backend/README.md`),
which isn't built yet. Until it answers, those values are `null` and the UI
leaves them out — "The leaderboard is on its way" on the leaderboard and
dashboard, member counts instead of points on the teams pages. Building the
endpoints lights them up with no frontend change.

How the real data source handles the rest:

- **Server-only.** Import it from Server Components and server actions. Client
  components get what they need as props (the shell takes a `user` prop).
- **Writes** go through server actions in `app/(app)/actions.ts`, which call a
  mutation and then revalidate.
- **Loading states.** Set `MOCK_LATENCY_MS=1500` in `.env.local` to make every
  read wait, so loading screens are visible.
- **Numbers are computed, not stored.** Like the backend, challenge totals,
  today's steps, the weekly chart, streaks and team points are added up from
  activities on read, so every screen agrees and logging moves them all.
- **Dates are relative.** Seeds are dated from the moment the DB seeds, so
  "Day 4 of 7" and "2h ago" stay true.
- **Two personas (dev only).** A `tuff-persona=new` cookie serves a
  brand-new account (no stats, challenges or team) to show the first-run
  states. Sign-up switches to it; the account menu flips between them.
- **The mock is per-process.** Its DB lives on `globalThis`, so it survives
  hot reloads but resets when the dev server restarts. `POST /dev/reset`
  (development, mock only) re-seeds it; the e2e specs call it first.

## Auth and sessions

The backend issues two httpOnly cookies: a 15-minute access JWT
(`tuff_access`) and a 30-day refresh token (`tuff_refresh`). Because the
browser only talks to Next:

- **Sign-in, sign-up, password changes and sign-out** are server actions that
  call the backend and copy its session cookies onto Next's own domain
  (`lib/api/cookies.ts`). This keeps working when the frontend and backend
  are deployed on different domains.
- **Every backend call** forwards those cookies (`lib/api/client.ts`). A 401
  triggers one silent refresh and a retry; still 401 sends you to sign in.
- **`proxy.ts`** runs before each page. It swaps an expired access cookie for
  a fresh one (pages themselves can't set cookies), sends signed-out visitors
  from app pages to `/?mode=signin`, and sends signed-in visitors from `/` to
  the dashboard. It's an optimistic guard; the backend still checks every
  request.
- **Google sign-in** is a server-side OAuth code flow with PKCE:
  `app/auth/google/route.ts` stores a CSRF state and PKCE verifier in a
  10-minute httpOnly cookie and sends you to Google;
  `app/auth/google/callback/route.ts` checks the state and passes the code to
  `POST /api/auth/google`, which trades it with Google, verifies the ID token
  and sets the session cookies (copied onto our domain like any sign-in).
  New accounts go to `/onboarding`. Needs `GOOGLE_CLIENT_ID` here and both
  Google variables on the backend — see "Setting up Google sign-in" in
  `backend/README.md`. Without them the button explains it isn't set up.
- **Not built yet:** forgot/reset password (needs backend endpoints and an
  email provider), marked `TODO(backend)`.

## The auth landing page

- **Desktop (>= 1024px):** a two-column grid with one full-height video panel
  absolutely positioned over a half. Switching modes slides it across (1s,
  ease-in-out-quart); mid-slide its leading edge bulges into a curve and the
  panel dips in scale for depth. The two clips crossfade underneath, the
  headline lines rise in, and the revealed form's fields stagger up with a
  blur-in. The covered form fades, blurs, and becomes `inert`.
- **Below 1024px:** stacks — the video becomes a curved hero banner with the
  headline, the active form sits beneath it.
- **Forms** post to server actions (`app/(auth)/actions.ts`) through
  `useActionState`: field errors come back in plain language, entered values
  are preserved. Sign-up goes on to `/onboarding`, sign-in to `/dashboard`
  (see "Auth and sessions").
- **Accessibility:** focus moves to the revealed form's heading after a switch;
  the hidden form is `inert`; `prefers-reduced-motion` turns every transition
  into an instant swap and stops the clips from autoplaying (posters stay up).

## Auth videos

Two clips generated with Artlist (Kling 3.0, 1080p, 1:1, 8s, no audio):

- **Sign up** — three Nigerian athletes, two women and a man, on battle ropes.
- **Sign in** — a Nigerian woman athlete mid push-up.

Both are dark, lime-and-orange rim-lit sports-commercial shots, so the white
headline and glass chips read cleanly over them.

`data/auth-media.json` decides where they load from. Out of the box it points
at Artlist's signed CDN URLs (valid until 2036), so the page works straight
away. **Before production, run `npm run media:fetch`**: it downloads both
clips into `public/media/`, and if `ffmpeg` is installed it re-encodes them
as seamless loops (the last second crossfades into the first, so the loop
restart is invisible), shrinks them for the web, extracts poster frames, and
rewrites the manifest to the local copies. If a clip can't load at all, the
panel falls back to a drifting brand-gradient mesh rather than a black box.

## Design decisions

- **Shape language: curves.** Pills (`radius-full`) for anything you press or
  type into; `radius-xl` (32px) for cards and bento tiles; `radius-2xl` (40px)
  for page-level panels — the auth video panel, the floating sidebar, the
  drawer, the challenge hero. Both new radius tokens are in the design system.
- **Web navigation, not a mobile tab bar.** A floating sidebar inset from the
  viewport on desktop; a floating pill top bar with a curved slide-in drawer
  below 1024px.
- **The app nav remembers its state.** Collapsed by default; the choice lives
  in a `nav-state` cookie that the server reads, so the rail renders at the
  right width with no flash. Collapsed links show their label in a tooltip.
  The nav reflects the session but never enforces access.
- **Mock session** (mock data only). `lib/auth/get-current-user.ts` returns
  the seeded user. Sign out sets a `tuff-mock-session=signed-out` cookie, and
  signing in clears it. `MOCK_SESSION=signed-in|signed-out` in `.env.local` forces either state.
  In development, a `tuff-mock-latency=<ms>` cookie delays it so you can see
  the loading skeleton.
- **The footer is About-only.** A server component with no client JS. The
  giant logo is a CSS volt-to-surge gradient masked by `public/logo/logo-mono.svg`,
  a one-colour vector traced from `logo_2.png`, so it stays sharp at any size.
- **Styling: CSS Modules.** CSS-in-JS doesn't play well with Server
  Components, so this sticks to CSS Modules throughout.
- **RSC by default.** Client Components only where there's real interactivity:
  `AuthSplit`, `Tabs`, the nav shell and its items, `SmoothScroll`, and the overlay and
  stateful controls (`Dialog`, `Popover`, `Menu`, `Toast`, `RadioChips`,
  `PasswordField`). Pages stay server-rendered.
- **Overlays ride on platform features.** `Dialog` is a native `<dialog>` with
  `showModal()`, so the browser owns focus trapping, Escape and the top layer;
  `Popover` uses the `popover` attribute for light dismiss. Enter and exit
  animate with `@starting-style` and `allow-discrete`.
- **Motion:** CSS for almost everything on screen (panel slide + morph, tile
  entrances, border beam, goo tabs, ring fill); Lenis for wheel smoothing in
  the app shell (fine pointers only). GSAP is reserved for multi-element
  sequences — so far just the challenge-complete celebration, which runs its
  timeline through `useGSAP()` and puts the reduced-motion version (the final
  state, nothing moving) in `gsap.matchMedia()`.
- **The weekly chart** follows the dataviz rules: single series, highlight one
  (today, in volt) and gray the rest, 24px-max columns with a 4px rounded data
  end, a solid hairline goal line, one direct label, hover *and* keyboard-focus
  tooltips that lead with the value, and a visually hidden table for screen
  readers.
- **People and names** in the product imagery and placeholder data are
  Nigerian — TUFF's audience.

## Fonts

- **Bricolage Grotesque** loads via `next/font/google` in `app/layout.tsx`.
  `--font-heading` wraps it with a sans fallback, so a failed download
  degrades to a grotesque instead of a serif.
- **Satoshi** is self-hosted from `public/fonts/` via an `@font-face` in
  `globals.css`. Its ITF Free Font License allows self-hosting but not
  redistributing the files through a public repository, so the `.woff2` is
  gitignored and `scripts/fetch-fonts.mjs` downloads it before `dev` and
  `build`. If that ever fails, body text falls back to `system-ui`.

## What's not here yet

- **The leaderboard** (being built separately) — see "Data" above.
- **Password reset emails, tracker connections, push and email
  notifications.** Every remaining seam is marked:
  `grep -rn "TODO(backend)\|TODO(leaderboard)" app components lib`.
- **Legal text.** `/terms` and `/privacy` are drafts that need legal review,
  including against Nigeria's Data Protection Act 2023.
- **Token sync.** `globals.css` mirrors the design system's `tokens.json` by
  hand.

## Themes

Dark is the default; Light is an explicit choice (account menu or Settings →
Appearance), saved in `localStorage` as `tuff-theme` and applied by a tiny
script in `<head>` before first paint, so there's no flash. The OS setting is
ignored on purpose.

Components never use the raw volt/success/warning colors for text or fills.
They use semantic tokens from `globals.css` instead: `--volt-ink` (text, icons,
rings, focus) and `--volt-fill` / `--on-volt-fill` (a filled surface and what
sits on it), plus the same pairs for success and warning. In light mode the
inks darken for contrast and the fills invert to `--surface-inverse` with the
brand color moved onto the content. Surge and danger look the same in both
themes. Anything that must stay dark (the auth video panel, the ProgressRing
plate) carries the `theme-dark-island` class.
