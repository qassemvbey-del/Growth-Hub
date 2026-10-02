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
## Prompt 2 — shared components (new files only)
Read `design/README.md`, `design/STYLE.md`, and the artboards `Main.dc.html`, `Goal.dc.html`, `TaskSheet.dc.html`,
`FirstRun.dc.html`, `WebFirstRun.dc.html`.
Create, in `src/components/m3/`, small components that use ONLY the tokens from Prompt 1:
`Shape` (cookie / sunny / clover / flower / burst), `Icon` (Material Symbols, `filled` prop), `Button`
(filled / tonal / outlined / text, sizes 40/48/56), `Chip`, `CheckCircle`, `WavyProgress`, `TaskRow`,
`ListGroup` (20/4 radius rule), `BottomNav` (5 tabs), `NavRail` (web, with FAB), `BottomSheet`, `Dialog`,
`Snackbar`, `HintCard`, `CoachMark`, `TextField`, `Switch`, `SegmentedButtons`.
Each file under 150 lines, typed props, RTL with logical properties, keyboard focus visible, 44px touch targets.
Add one page `src/app/dev/components/page.tsx` that shows them all (dark + light) so we can check them.
Do not import them anywhere else yet. Test at 390px and 1280px. Report. Do not commit.

---
## After that
One screen per prompt, in the order of `SCREENS.md` (A → E). Claude writes each prompt with the exact
artboards, inventory items, files to touch and files not to touch.
