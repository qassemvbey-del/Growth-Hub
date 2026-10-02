# Growth Hub — code audit (2 Oct 2026)

Source: `main` branch zip (same code as the live site; the `redesign` work is not in it).
Size: 112 files, 41.7k lines in `src/`. Database checked live (read-only) earlier the same day.

Severity: **Critical** = can hurt users today · **High** = real abuse or data leak · **Medium** = should fix ·
**Low** = hygiene.

## Security

| # | Severity | Problem | Where | Fix |
|---|---|---|---|---|
| S1 | Critical | Anyone on the internet can create a notification for ANY user, with any title and text (spam, phishing). No login check. Uses the service-role key. | `src/app/api/notify/route.ts` (called by TaskDrawer for mentions) | Require a logged-in user; sender = that user (ignore `senderId` from the body); allow only when sender and target share a goal; limit text length; rate limit. |
| S2 | Critical | Anyone can send a **push notification** to ANY user's phone/browser with any title, text and link. No login check. | `src/app/api/notify/push/route.ts` | Make it server-only: require a secret header (`PUSH_SECRET`) used only by our own server code / cron, or the same checks as S1. Only relative links (`/goals/...`). |
| S3 | High | The 5 AI server actions have **no login check and no quota**: anyone can call them and spend the Gemini budget without limit. The Coach UI calls `chatWithCoach` directly, so the Coach quota in `/api/coach` is never used. | `src/app/actions/ai-magic.ts` (chatWithCoach, generateTasks, cleanPlaylistTitles, extractTasksFromText), `src/app/actions/profanityCheck.ts` | Every action: `getUser()` first, then the quota RPC, then Gemini. One shared helper. `chatWithCoach` and `/api/coach` return "disabled" while `FEATURES.coach` is false. |
| S4 | High | The share image route reads ANY goal by id with the service-role key: title, all tasks, members and focus time of private goals are visible to anyone who has the goal id (the id is in every invite/share link). | `src/app/api/goals/[id]/og/route.tsx` | Read with the normal (RLS) client, or with the admin client only when the goal is public; otherwise return a generic image. |
| S5 | High | AI quota is "read, then call Gemini, then write": parallel requests pass the limit. Limits still depend on old paid tiers (`user_tier` 3 / 50 / 150) and reset every 12 hours, not daily. The atomic DB function `check_and_increment_quota` exists but is not used. | `api/ai/ask`, `api/coach`, `api/tasks/ai-checklist` | One server helper that calls `check_and_increment_quota` (atomic, Cairo day, same limit for everyone) before Gemini. |
| S6 | Medium | Open redirect after login: `next` from the URL is glued to the origin, so `?next=@evil.com` sends the user to another site. | `src/app/auth/callback/route.ts` | Accept `next` only if it starts with `/` and not `//`. |
| S7 | Medium | No `middleware` / `proxy`: sessions are not refreshed on the server and pages are protected only in the browser. | project root | Add the Supabase SSR session-refresh proxy (Next 16 name: `proxy.ts`). |
| S8 | Medium | `/api/top-xp` (public, service-role) + every open tab polls it every 30 s to award "Conqueror" to the #1 user. That feature was removed (no global leaderboard) and it costs a request per user every 30 s. | `src/app/api/top-xp/route.ts`, `GrowthContext.tsx` lines ~944–972 | Delete both. Rank comes from XP only. |
| S9 | Medium | Gemini key is read as `NEXT_PUBLIC_GEMINI_API_KEY`. Today only server files use it, but the `NEXT_PUBLIC_` name means any future client import puts the key in the browser. | 12 places | Rename to `GEMINI_API_KEY` everywhere; remove the `NEXT_PUBLIC_` one from Vercel. |
| S10 | Medium | Admin check compares e-mails, has a hard-coded e-mail fallback in the browser code, and logs e-mails to the console. | `actions/adminActions.ts`, `app/admin/page.tsx` | Use `profiles.role = 'admin'` checked on the server; remove the logs and the fallback. |
| S11 | Medium | `xlsx` 0.18.5 from npm is no longer maintained and has known security advisories (fixed only in the SheetJS CDN builds). Used only for the Excel export. | `package.json`, `SquadReportModal` | Switch to the SheetJS CDN build or `exceljs`. |
| S12 | Low | Paymob webhook compares the HMAC with `!==` (not constant-time). Payments are paused. | `api/webhooks/paymob` | `crypto.timingSafeEqual` when payments come back. |

The database itself was secured on 2 Oct (`01_security_fix.sql`): RLS, server-side XP, permissions.

## Code quality

| # | Problem | Numbers / where |
|---|---|---|
| Q1 | Huge files (rule: max 400 lines) | 19 files over 400: test-mindmap copy 3717, goal page 3697, Shell 2625, goals 1748, squad goals 1726, GrowthContext 1623, TaskDrawer 1605, notes 1435, settings 1175, CommandPalette 1037, home 916 … |
| Q2 | A full copy of the goal page | `app/goals/test-mindmap/**` (3717 lines) |
| Q3 | Commented-out old code | 1,686 comment lines, mostly dead code from the old rule "never delete, only comment" |
| Q4 | Database calls inside UI components | `supabase.from(...)` in 19 `.tsx` files |
| Q5 | Weak typing | 570 uses of `any`; `types/supabase.ts` (745 lines) is older than the 2 Oct schema |
| Q6 | Errors hidden or shown badly | 17 empty `catch {}`, 13 `alert()`, 237 `console.*` |
| Q7 | Unused packages | `@distube/ytdl-core`, `pg`, `text-to-svg`, `react-draggable`, `react-player`, `react-joyride` (0 imports) |
| Q8 | Dead files | `WelcomeTour.tsx`, `ProgressCup.tsx`, `ReportModal.tsx`, `TaskDrawerAiTacticalTools.tsx`, `usePricing.ts` |
| Q9 | Database history not in the repo | `supabase/migrations` stops at Aug 3; the 2 Oct files (`00_backup`, `01_security_fix`, `03_game_system`, `99_rollback`) are not there. `schema.sql` is outdated. |
| Q10 | One giant context | `GrowthContext.tsx` holds auth, profile, translations, theme, rank logic, polling |
| Q11 | Translations | one huge `TRANSLATIONS` object + many inline `isRTL ? '…' : '…'` |
| Q12 | No automated tests | none |

## On the `redesign` branch (from the agent's last report)
- Landing hero: `<Shape>` gets no `size`, so every shape renders at the default 64 px while its icon is centred in a
  320/150/120 px box → icons sit beside small shapes. The "Finished lesson 14" toast has `bottom-0` and on desktop also
  `top-0` → it stretches into the tall pale rectangle over "40%".
- `src/app/page.tsx` grew to 923 lines.
