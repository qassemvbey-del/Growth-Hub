<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Growth Hub — rules for every agent

The full reference (product, decisions, open questions, roadmap) lives in the project doc
"Growth Hub — مرجع المشروع". This file is the short version. If anything in an old chat,
a code comment, or `supabase/schema.sql` disagrees with this file, THIS FILE WINS.
(`supabase/schema.sql` is outdated: it still says `cups`. The real tables are below.)

## How to work
1. One change per task. Touch only what was asked. Never commit or push unrelated work.
2. Diagnose before fixing: state the cause first, then the fix.
3. No new features unless they are listed under "Decisions". Propose, don't build.
4. Every database change is a file in `supabase/migrations/` with a rollback section.
   No manual edits in the Supabase dashboard without a file.
5. XP, permissions, plans and money are decided on the server (Supabase function or API route),
   never in the browser.
6. When done, report: what changed, which files, how to test it.
7. Delete dead code; do not comment it out. Git keeps the history. (The old rule "never delete code, only
   comment it out" is cancelled: thousands of commented lines with old names like `cup_id` confuse every agent.)
8. Work on the branch `redesign`. Show the diff and wait for Mohamed's OK before you commit or push. Push only to
   `redesign` (Vercel builds a preview link for it). Never push to `main`: it is merged after review.
9. UI work follows `design/README.md` (artboards, tokens, rules). If the design does not answer a question, ask.

## Names (UI ↔ code ↔ database)
The database is the source of truth. Do NOT rename tables or columns. New and rebuilt code uses the database names.
| UI (ar / en) | Database | Old code names (rename while rebuilding a file) |
|---|---|---|
| هدف / Goal | `goals` | mission, Mission, MissionTask |
| مهمة / Task | `tasks` | task, mission task |
| هدف مشترك / Shared (Squad) | `goals.metadata.type = 'squad'` | squad |
| الكاسات / Cups | finished goals (`goals.is_archived`) | achievements, wins, vault |
| ملاحظة / Note | `notes` | brain |
| الإشعارات / Notifications | `inbox_reports` | inbox, reports |
Never query the old `cups` table (it does not exist; three commented-out queries still mention it).

## Database leftovers (know them, do not build on them)
- Dead: function `enforce_goal_limits` (5-goal limit, no trigger attached), code that checks `PLAN_LIMIT_EXCEEDED`.
- Still active, but from the old paid plans: trigger `trigger_update_squad_limits` + `profiles.max_squads_allowed`,
  `profiles.user_tier` (still read by `check_and_increment_quota` and the coach / AI routes).
- Unused columns: `profiles.mission_goal, weekly_project, daily_focus, ai_name, ai_personality, champion_class`,
  `tasks.video_progress` (watch progress lives in `task_progress`).
- Removing any of these is a migration with a rollback section, after the code stops using it.

## Code rules
- No file over 400 lines. Split it.
- Never copy a page to make a variant. Use a prop or a component.
- Colors, spacing and fonts come from design tokens. No hex values inside pages.
- Every screen must work at 390px width.
- User-facing text comes from the translation file (en/ar). No ALL CAPS, no snake_case.

## Stack
Next.js 16 (App Router) + TypeScript + Tailwind 4 + Framer Motion · Supabase (Postgres, Auth,
Realtime) · Vercel · Gemini 2.5 Flash (2.0 is forbidden) · Capacitor for mobile · Paymob (paused).

## Database facts
- Tables: profiles, goals, tasks, goal_members, squad_join_requests, task_progress, xp_logs,
  notes, inbox_reports, push_subscriptions, time_logs, goal_attachments, rank_up_logs,
  app_events, task_completion_log.
- Solo vs Squad = `goals.metadata.type` ('squad' or missing). Squad rules = `goals.metadata.rules`
  (`no_date_changes`, `xp_multiplier`, `no_delete`).
- Roles in `goal_members.role`: owner, admin, member, viewer, guest.
- XP: call RPC `award_task_xp(p_task_id, p_completed)` AFTER updating `tasks.is_completed`.
  The browser cannot write `profiles.xp/rank/user_tier/blocked/streak_*` or insert into `xp_logs`
  (a trigger and RLS block it).
- Streak: read it with RPC `my_streak()` → {current, best, freezes, done_today, status, can_repair, repair_value}.
  Never compute the streak in the browser. It is updated on the server by task completion and by a
  `time_logs` row with duration_minutes >= 25.
- Weekly squad leaderboard: RPC `squad_weekly_leaderboard(p_goal_id)` (resets Saturday 00:00 Cairo).
- Rank thresholds (must match `rank_for_xp` in the DB): SILVER 0, GOLD 300, PLATINUM 1000,
  DIAMOND 2500, CROWN 5000, ACE 10000, CONQUEROR 20000.
- Joining a squad: RPCs only (`join_squad_by_link`, `request_squad_join`,
  `review_squad_join_request`, `verify_squad_invite`, `submit_squad_join_request`).
  The browser may insert into `goal_members` only its own 'owner' row for a goal it owns.
- Profiles are visible only to yourself and people who share a goal with you (`can_view_profile`).

## Decisions (locked)
- One Goals page (filter: All / Just me / Shared). One goal page at `/goals/{id}` with
  LIST / BOARD / MAP views. Old URLs redirect.
- Every goal starts Solo. Share → "Show your progress" (view-only link, stays Solo) or
  "Invite people to work with you" (becomes Squad, server-side, owner row added).
  Back to Solo only when the owner is the last member.
- Squad-only UI (Assign, roles, rules, @mentions, leaderboard) is hidden on Solo goals.
- In a shared goal, completing a task completes it for everyone. Video position is per user
  (`task_progress`).
- Goal cards from a YouTube playlist show a YouTube icon.
- Game rules (enforced in `award_task_xp`): XP = difficulty (1–6) × 10; +20% if done on or before the
  deadline; NO penalty for late tasks; video tasks need 60% watched; max 15 XP-earning tasks per day
  (Cairo time); 3rd completion within a minute = 0; finishing a whole goal = +100 for every
  owner/admin/member, once per goal.
- Streak: daily; starts with 2 freeze days; +1 freeze every 7 days (max 2); a broken streak can be
  restored within 48h by completing 2 tasks in one day.
- First goal ever: starts with its first step already done.
- Ranks unlock cosmetics only: each rank unlocks a new app colour (Settings → Appearance);
  Conqueror also gets an animated frame. AI features are open to every rank (daily quota only).
- Cups: every finished goal becomes a cup in the Cups tab (bottom nav, where Focus used to be).
  Cup type by goal size: bronze < 10 tasks, silver 10–30, gold > 30. (DB/SQL for cup type: not built yet.)
- Leaderboard is weekly inside a squad only (resets Saturday 00:00 Cairo, i.e. the night between Friday
  and Saturday). No global leaderboard.
- Year one is fully free: no pricing page, no goal limit. Energy+ page and the "XP penalty" squad rule are removed.
- First screen for a new user: one big input "What do you want to do?" (YouTube link → course,
  a goal → AI steps, a quick thing → task) + 4 templates: Study for an exam · Learn from YouTube ·
  Project with a team · Finish things I put off (ar: ذاكر لامتحان · اتعلم من يوتيوب · مشروع مع فريق ·
  خلّص حاجات متأجلة).
- YouTube playlist: ask the user (en + ar) "Study it as a course" (60% rule + XP) or
  "Save it and take notes" (no XP gate). A single video goes straight to a course.
- Goal header always names the noun: "13 of 32 lessons done" / "8 of 12 tasks done".
- The attachments button is visible on the goal page and inside every task.
- Web course page looks like YouTube: big video, note points under it, lesson list on the side.
- Rank app colours (8 swatches, 2 rows of 4): Silver = green (default) + blue · Gold = purple ·
  Platinum = magenta · Diamond = orange · Crown = blue-leaning cyan · Ace = graphite (neutral grey) ·
  Conqueror = gold. Gold-the-colour is kept for the top rank so it matches the gold cup. Hexes: `STYLE.md`.
- Mobile bottom nav has 5 tabs: Home · Goals · Notes · Cups · Me (same as the web rail).
- The Focus screen is full screen: no nav bar, rail, header or FAB while it is open (it replaces Zen mode).
- Focus has no tab: it starts from inside a task ("Focus 25 min"). While a timer runs, a small timer bar
  sits above the bottom nav on every screen (on web: at the bottom of the content panel); tap it to open Focus.
- A simple landing page at `/` for signed-out visitors; signed-in users get Home at `/`. In-app hints (coach marks) keep appearing after onboarding until dismissed.

## Existing features: keep and redesign
- Rule: every feature that exists in the code today stays in the new design, unless a decision here
  removes it explicitly (removed so far: Energy+, pricing page, the 5-goal limit, the late-task XP penalty
  and its squad rule, rank-gated AI, click sounds, Zen mode, the Champions, the old neon effects).
- The Coach (`CoachPanel`, 3 times a day: "واجهني بالحقيقة" · "أهم 3 حاجات" · "حاجة سريعة أبدأ بيها").
- AI specialties (`TaskSkills`): programmer / networks / accountant / student, 3 extra skills each.
- The Command Palette (`CommandPalette`, Ctrl+K).
- Guest access: guest links expire after 7 days, with the current guest permissions.

## Design system (locked)
- Material 3 Expressive, seed green #2E7D5B. Dark is the default, light is optional.
- Fonts: Readex Pro (headings, numbers) + IBM Plex Sans Arabic (body). Icons: Material Symbols Rounded.
- Tokens and screen rules: `STYLE.md`. Approved screens: the "Growth Hub — شاشات M3" canvas.
- The older "Calm & warm" design system (apricot accent, lucide icons, "drop Material Symbols")
  is RETIRED. Do not use its tokens or advice.

## Open (do not build until decided)
- The product mascot/character · the exact AI daily quota · pricing after year one.
- Unifying the 4 sharing flags (`is_public`, `requires_approval`, `general_access`, `metadata.public_share`).
