# Prompts for the coding agent (Antigravity) — redesign

Send ONE prompt at a time. Wait for the report, send it to Claude for review, then the next one.

---
## Prompt 0 — put the design in the repo (no code)
First create and switch to a new branch `redesign` from `main`. All redesign work happens there; never push to `main`.
Create the folder `design/` at the repo root and move these files into it (Mohamed will drop them in):
`design/README.md`, `design/PROMPTS.md`, `design/STYLE.md`, `design/SCREENS.md`, `design/INVENTORY.md`,
`design/screens/*.dc.html`, `design/png/*.png`. Replace the root `AGENTS.md` with the new one.
Also delete from the repo (they are junk, not used by the app): `scratch/`, `scratch.rar`, `vault_new_ui.html`.
Do not change anything under `src/`. Show me `git status` and the diff summary. Do not commit.

---
## Prompt 1 — design tokens (no page changes)
Read `AGENTS.md`, `design/README.md` and `design/STYLE.md`.
Task: add the M3 design tokens to `src/app/globals.css`.
- Dark theme (default) and light theme from the colour table in STYLE.md, as CSS variables
  (`--md-bg`, `--md-sc-low`, `--md-sc`, `--md-sc-high`, `--md-sc-highest`, `--md-on`, `--md-on-sv`, `--md-outline`,
  `--md-outline-v`, `--md-primary`, `--md-on-primary`, `--md-pc`, `--md-on-pc`, `--md-sec-c`, `--md-on-sec-c`,
  `--md-tc`, `--md-on-tc`, `--md-xp`, `--md-xp-c`, `--md-on-xp-c`, `--md-error`, `--md-err-c`, cup colours).
- Expose them to Tailwind 4 in the `@theme inline` block (e.g. `--color-md-primary: var(--md-primary)`),
  radii (chip 8, card 24, sheet 28, hero 40), and the fonts Readex Pro + IBM Plex Sans Arabic + Material Symbols
  Rounded (next/font or the Google link, your choice, explain it).
- The 8 rank app colours: only the variables for green (default) now, as a `[data-app-color="green"]` scope.
Do NOT remove the old neon variables yet and do NOT change any page or component — the old UI must look the same.
Test: `npm run build` passes; the site looks unchanged. Report the diff. Do not commit.

---
## Prompt 2a — basic components (new files only)
Read AGENTS.md, design/README.md, design/STYLE.md. Look at the artboards design/screens/Main.dc.html,
Goal.dc.html, TaskSheet.dc.html, FirstRun.dc.html and Landing.dc.html (the `<defs>` block in Landing has the
5 shape paths: cookie, sunny, clover, flower, burst).

Create these components in `src/components/m3/`, one file each, using ONLY the tokens in globals.css
(Tailwind classes like `bg-md-primary`, `text-md-on-sv`, `rounded-chip`, `rounded-card`, `font-readex`) — no hex values:
- `Shape` (name: cookie | sunny | clover | flower | burst, size, colour token, optional children centred, optional `spin`
  that respects prefers-reduced-motion)
- `Icon` (Material Symbols Rounded, `filled` prop, size)
- `Button` (filled | tonal | outlined | text, heights 40/48/56, optional icon, disabled state)
- `Chip` (32px, radius 8, optional icon, selected state)
- `CheckCircle` (24px, done / not done, real button with aria-label)
- `WavyProgress` (value 0–1, fills from the right in RTL, track uses `md-track`)
- `ListGroup` + `ListItem` (radius 20 outer / 4 inner, 2px gap)
- `TaskRow` (check, title, meta line, XP on the left, done state = line-through)
- `TextField` (M3 outlined, 56px, floating label, focus = 2px primary)
- `Switch` (52×32)
- `SegmentedButtons` (connected group, RTL radius rules from STYLE.md)
Rules: each file under 150 lines, typed props, RTL with logical properties (ms/me/ps/pe/start/end), visible keyboard
focus, touch targets at least 44px, user text passed in as props (no hard-coded Arabic inside components).

Add `src/app/dev/components/page.tsx` that shows every component in dark and light. It must return notFound()
when `process.env.VERCEL_ENV === 'production'` so it never appears on the live site.
Do not import the new components anywhere else. Run `npm run build`. Report the files, show me the diff, do not commit.

## Prompt 2b — cancelled (decided 2 Oct)
Navigation and overlay components are built inside the first screen that needs them, and each one is added to
/dev/components for review.

---
## After that
One screen per prompt, in the order of `SCREENS.md` (A → E). Claude writes each prompt with the exact
artboards, inventory items, files to touch and files not to touch.

---
## Prompt 3 — Sign in page (first real screen)
Read AGENTS.md, design/README.md, design/STYLE.md, and the artboards design/screens/Login.dc.html,
LoginInvite.dc.html, LoginError.dc.html (mobile) and WebLogin.dc.html (web, 1280 wide).

Rebuild `src/app/auth/login/page.tsx` to match them, using only `src/components/m3/*` and the md tokens.
Keep ALL current behaviour exactly:
- Google sign-in with `signInWithOAuth` and `redirectTo: ${getURL()}auth/callback` (do not change the auth logic).
- Continue as guest (`entry_path_selected` in localStorage, then go to `/`).
- The pending-join message from localStorage `pendingJoinMessage` → show it as the tc hint card (LoginInvite).
- Language switch ar/en saved in localStorage `language`; RTL for ar, LTR for en.
Changes:
- Loading state: the Google button shows a spinner + "بندخّلك…", the guest button is disabled (LoginInvite).
- Error: replace `alert(error.message)` with an inverse snackbar "الدخول ما نجحش. اتأكد من النت وجرّب تاني."
  with a retry action (LoginError). Never show the raw error to the user; console.error it.
- Use Google's official "G" mark in the Google button (SVG per Google's sign-in branding), not a letter.
- Decorative shapes: use `Shape`; slow spin/float only with motion-safe, off under prefers-reduced-motion.
- Remove the neon effects from this page only (ParticleWave, NeuralMesh imports here). Do not delete those files.
- Copy (ar + en) lives in the page's existing `t` object; update it to the artboard text. English:
  "Welcome" / "Sign in and pick up where you left off. Your goals, streak and cups are waiting." /
  "Continue with Google" / "Try as a guest" / "A guest can make up to 4 goals, saved on this device only." /
  "Only people you share with can see your goals" / terms line.
- File must stay under 400 lines: split pieces into `src/app/auth/login/` components if needed.
Do NOT touch: src/app/auth/callback, src/lib/*, GrowthContext, Shell, any other page.
Test at 390px and 1280px, ar and en, dark and light; guest flow works; Google sign-in works on the preview link.
Run `npm run build`. Show me the diff and screenshots if you can. Do not commit.

---
## Prompt 4 — Landing page + who sees what at "/" (plus 4 small login fixes)
Read AGENTS.md, design/README.md, design/STYLE.md, design/screens/WebLanding.dc.html and Landing.dc.html.

A. Small fixes on /auth/login first:
   1. Icon sizes inside the shapes and cards must match WebLogin.dc.html / Login.dc.html (e.g. 40px in the clover,
      44px in the flower, 26px flame in the sunny) — they are smaller now.
   2. The form block is vertically centred on desktop (logo top, terms bottom, form in the middle).
   3. The shapes group is centred vertically too, above the "Any goal, small steps" block, no big empty gap.
   4. In English, the decorative texts are English ("13 of 32 lessons", "Finished lesson 14").
   Move the gh-spin / gh-float keyframes from the login page into globals.css (shared), motion-safe only.

B. Landing page: build it as `src/components/landing/*` (sections as separate files, each under 400 lines),
   matching the artboards (hero with input + shapes group, 4 goal types, 3 steps, rewards, final CTA, footer),
   mobile 390 and desktop, ar + en, dark. The hero input and every CTA go to /auth/login (keep it simple: the typed
   text is not used yet). "Try as a guest" sets `entry_path_selected` like the login page and goes to "/".

C. Who sees what at "/":
   - Signed in, or a guest (`entry_path_selected` in localStorage) → the current Home page, unchanged.
   - Anyone else → the Landing page, at "/" (the URL stays "/").
   - No flash: while the auth state is loading, show a plain md-bg screen, never Home then Landing or the reverse.
   - The Landing renders without the old Shell (same clean bypass as /auth/login).
   - Do not change auth logic, GrowthContext data loading, or any other page.

VERIFY yourself in the browser before reporting: "/" signed out (Landing, ar + en, 1440 and 390), "/" as guest
(old Home), "/" signed in (old Home), and /auth/login after the fixes. Screenshots + `npm run build` + diff --stat.
Commit and push to redesign only if everything matches.
