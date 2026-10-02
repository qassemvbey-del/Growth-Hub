# Growth Hub — cleanup plan

One step per prompt. After each step: `npm run build` passes, Mohamed checks, commit, tag. Never a big-bang move.

## Branches
- `main` = live site. Security fixes go here FIRST, through a short branch `hotfix/security`, because the holes are live.
- `redesign` = new design. After each hotfix is merged into `main`, merge `main` into `redesign`.
- Tags: `archive/before-cleanup` (main, before any deletion) · `security/<NN>-<name>` · `redesign/<NN>-<name>`.

## Phase 0 — finish what is open (redesign)
0.1 Landing fixes (Shape size, toast) → commit → tag `redesign/04-landing`.

## Phase 1 — security hotfix (main, now)
1.1 Tag `archive/before-cleanup` on main.
1.2 S1 + S2: lock `/api/notify` and `/api/notify/push`.
1.3 S3 + S5: one `requireUserAndQuota()` server helper (auth + `check_and_increment_quota`), used by the 5 server
    actions and the 3 AI routes. Limit = one daily number for everyone (to be decided; start with 20).
1.4 S4 + S6 + S8: safe share image, safe `next` redirect, delete `/api/top-xp` and its polling.
1.5 Test on the preview of `hotfix/security`, merge to `main`, then merge `main` into `redesign`.

## Phase 2 — delete what is dead (redesign)
2.1 Dead files (Q8), unused packages (Q7), `test-mindmap` (Q2), `build_output.txt`, root junk.
2.2 Removed features: AI specialties, rank-lock code, Energy+, pricing page and links, Champions/avatar selector,
    neon effects, click sounds, Zen mode, "Top #1", late-penalty labels, 5-goal limit UI and `PLAN_LIMIT` code.
2.3 Commented-out code (Q3), file by file, with the build passing after each folder.

## Phase 3 — make the repo honest
3.1 Put the 2 Oct SQL files into `supabase/migrations/` with dates; mark `schema.sql` as outdated or regenerate it.
3.2 Regenerate `types/supabase.ts` from the live database.
3.3 S9 rename Gemini env var; S10 admin by role; S11 replace `xlsx`; S7 session proxy.

## Phase 4 — structure, while rebuilding each page
Follow "Code architecture" in AGENTS.md: `src/features/<feature>/` with `api/`, `hooks/`, `components/`, README;
thin pages; split `GrowthContext`; translations per feature; `reportError` instead of empty catches and `alert()`.
Order = the redesign order (home, goals, tasks, focus, game, notes, settings, admin).

## Done means
No file over 400 lines · no `supabase.from` in components · no commented-out code · no `any` in new code ·
every feature folder has a README · every DB change is a migration file · build passes.
