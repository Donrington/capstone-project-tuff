# TUFF — Web App

Next.js (App Router, React, TypeScript) web app for TUFF. Desktop-first web
layouts that reflow down to phone widths — not a mobile-app shell.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (also runs in CI)
npm run media:fetch  # optional, recommended before production — see "Auth videos"
npm run test:e2e     # Playwright; reuses a dev server on :3000 or starts one
```

The first e2e run needs a browser: `npx playwright install chromium`.

## Routes

| Route | What it is |
|---|---|
| `/` | **Landing = auth.** Split screen: sign up (video left, form right) ↔ sign in (form left, video right). `/?mode=signin` deep-links straight to sign in. |
| `/about` | About TUFF, outside the app shell. Reached from the auth page's "About" pill and the app's sidebar/drawer. `?from=app` swaps the calls to action for "Back to dashboard". The only page with the site footer. |
| `/terms`, `/privacy` | Draft legal pages (marked as drafts on the page), linked from the footer and the sign-up checkbox. |
| `/dashboard` | Bento dashboard: today's ring, featured challenge, weekly chart, leaderboard, challenge + team tiles |
| `/challenges` | Challenge grid, filtered by All/Solo/Team (`?type=solo`) |
| `/challenges/new` | Five-step wizard for creating a challenge (`?activity=<slug>` prefills the activity) |
| `/challenges/[id]` | Challenge detail hero, with log and invite |
| `/leaderboard` | This week / All time (`?period=all-time`) |
| `/join/[code]` | What an invite link opens: a preview of the team or challenge, and a Join button |
| `/profile`, `/settings` | Your profile, and the settings where you edit it |
| `/teams` | Placeholder (empty state) |
| `/dev/ui` | Dev-only showcase of every shared UI component in every state. 404s in production. |

## How it's organized

```
app/
  layout.tsx              Root: fonts, globals, <Providers>.
  providers.tsx           Client providers — ToastProvider + FlashToast (theme joins later).
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
  shell/                  ActivityBell.
  dashboard/              WeeklyActivity chart, TeamCard.
  motion/SmoothScroll.tsx Lenis, wheel/trackpad only.
data/
  mock-data.ts            Seed data for the mock DB. Only lib/data.ts imports it.
  auth-media.json         Where the auth clips load from (see below).
lib/
  data.ts                 The app's only data source — see "Data" below.
  types.ts                The shape contract the backend will have to meet.
  challenge-card.ts       Small display helpers.
  nav/                    Nav items (one list feeds the rail, drawer and footer) and the
                          nav-state cookie.
  auth/get-current-user.ts  The session seam — mocked until real auth lands.
  site-config.ts          Brand name, contact and socials (placeholders, see TODO(brand)).
e2e/                      Playwright tests: app nav, About nav, footer (with axe).
scripts/fetch-media.mjs   Self-hosts the auth clips.
```

## Data

Every screen reads through `lib/data.ts`, which stands in for the backend with
an in-memory mock DB seeded from `data/mock-data.ts`. Nothing else imports the
seed, so wiring up real endpoints means changing one file — each read already
carries the call it will become as a `// TODO(backend)` comment.

- **Server-only.** Import it from Server Components and server actions. Client
  components get what they need as props (the shell takes a `user` prop).
- **Writes** go through server actions in `app/(app)/actions.ts`, which call a
  mutation and then revalidate.
- **Loading states.** Set `MOCK_LATENCY_MS=1500` in `.env.local` to make every
  read wait, so loading screens are visible.
- **It's per-process.** The DB lives on `globalThis`, so it survives hot
  reloads but resets when the dev server restarts, and a serverless deploy
  gives each instance its own copy. Fine for a frontend demo, not for real use.

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
  are preserved, and success redirects to `/dashboard`. There is no real auth
  yet — see "What's not here yet".
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
- **Mock session.** `lib/auth/get-current-user.ts` returns the seeded user.
  Sign out sets a `tuff-mock-session=signed-out` cookie, and signing in clears
  it. `MOCK_SESSION=signed-in|signed-out` in `.env.local` forces either state.
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
- **Satoshi** isn't on Google Fonts; self-host it from Fontshare (woff2 into
  `public/fonts/`, add an `@font-face` in `globals.css`). Until then
  `--font-sans` falls back to `system-ui`.

## What's not here yet

- **Real auth.** Server actions validate and redirect but don't create
  sessions (the nav runs on the mock in `lib/auth/get-current-user.ts`). Recommended shape: Auth.js (NextAuth v5) with a credentials
  provider calling the backend's `/auth` endpoints, JWT sessions read
  server-side, plus Google and Apple OAuth behind the existing buttons.
  Route protection for `(app)/` comes with it.
- **Real data.** `lib/data.ts` stands in for the backend; `lib/types.ts` is the
  contract. Every seam is marked — `grep -rn "TODO(backend)\|TODO(auth)" app components lib`.
- **Light mode.** Tokens exist for both themes; no toggle, and the three fills
  that invert in light mode aren't wired up per component yet.
- **Teams page** is an empty state.
- **Legal text.** `/terms` and `/privacy` are drafts that need legal review,
  including against Nigeria's Data Protection Act 2023.
- **Token sync.** `globals.css` mirrors the design system's `tokens.json` by
  hand.
