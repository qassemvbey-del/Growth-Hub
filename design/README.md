# design/ — how the coding agent uses the designs

This folder is the visual source of truth for the M3 redesign. Read it before touching any UI.

## What is here
- `screens/*.dc.html` — one artboard per screen or state (phone 390 wide, web 1280 wide). Plain HTML with
  inline styles. Ignore the wrapper tags (`<x-dc>`, `<helmet>`, `support.js`, the `text/x-dc` script);
  read the markup inside.
- `png/*.png` — screenshots of the same artboards, exported from the design canvas (what it must look like).
- `STYLE.md` — tokens (colours, type, shapes, components) and the "Known fixes" list.
- `SCREENS.md` — every screen, its file names and the states to build.
- `INVENTORY.md` — every feature in today's code, with keep / change / remove. A screen is done only when
  every keep / change item mapped to it works.

## Rules for turning an artboard into code
1. Never copy hex values or inline styles into pages. Every hex in an artboard maps to a token in `STYLE.md`
   (e.g. `#8ed5b0` = `primary`, `#1b211d` = `sc`). Use the token (CSS variable / Tailwind theme).
2. Match sizes exactly: spacing, radius, font size and weight, icon size, touch targets (min 44px).
3. Text comes from the translation files (ar + en). The artboard text is the Arabic copy.
4. RTL first: use logical properties (`ms-*`, `pe-*`, `start`, `end`), never left/right. Mirror arrows as the
   artboard does.
5. Expressive shapes (cookie, sunny, clover, flower, burst) become ONE `<Shape name=... />` component that
   renders the SVG path from the `<defs>` block. Do not paste paths into pages.
6. Motion (`gh-spin`, `gh-float`) exists only on Landing and Login, and is off under prefers-reduced-motion.
7. Behaviour is not in the artboard. It comes from today's code and `INVENTORY.md`. Keep every existing
   feature unless `AGENTS.md` removes it.
8. If something is unclear or missing in the design, STOP and ask. Do not invent UI.
9. Database names win: `goals`, `tasks`, never `mission` / `cups` in new code (see "Names" in `AGENTS.md`).

## Process for every screen
Read the artboard + PNG + its rows in `SCREENS.md` and `INVENTORY.md` → list the components you will reuse →
build → check at 390px and 1280px, dark and light → report: files changed, inventory items covered, how to test.
