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
  The browser cannot write `profiles.xp/rank/user_tier/blocked` or insert into `xp_logs`
  (a trigger and RLS block it).
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
- Gamification is being simplified: XP + streak + a few clear ranks. Energy+ page goes away.
- First screen for a new user: one big input "What do you want to do?" (YouTube link → course,
  a goal → AI steps, a quick thing → task) + 3–4 templates.

## Open (do not build until decided)
Rank thresholds and names · what each rank unlocks · final XP rules (streak daily vs weekly,
anti-spam) · the "only the first N tasks give XP" rule · pricing and plans · free plan limits ·
XP penalty rule · unifying the 4 sharing flags (`is_public`, `requires_approval`,
`general_access`, `metadata.public_share`).