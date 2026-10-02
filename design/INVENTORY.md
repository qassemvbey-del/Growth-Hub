# Growth Hub — code inventory (for the M3 redesign)

Source: `Growth-Hub-main` zip, read on 2 Oct 2026 (112 .ts/.tsx files, ~41.7k lines).
Status: **keep** = goes into the new design as is (re-skinned) · **change** = stays, but changes (reason given) ·
**remove** = goes, with the decision that removes it · **dead** = not used anywhere in the code · **ask** = needs Mohamed.
Decision refs: D1 one Goals page + one goal page · D2 year one free (no pricing, no goal limit, no Energy+) ·
D3 no late penalty / XP-penalty rule removed · D4 AI open to all ranks · D5 no global leaderboard ·
D6 old neon look retired (M3) · D7 Champions removed (reference doc) · D8 Streak/XP computed on the server.

## 0. Routes

| Route | What it is today | Status | Note |
|---|---|---|---|
| `/` | Dashboard (Home) | change | Becomes the new Home with "عايز تعمل إيه؟" (decided) |
| `/goals` | Goals list, typeFilter all | keep | One Goals page, filter All / Just me / Shared (D1) |
| `/goals/solo`, `/goals/squad` | Same list filtered; squad list is a separate 1.7k-line copy | change | Merge into `/goals` + redirect (D1) |
| `/goals/squad/[id]` | The real goal page (3.7k lines) | change | Moves to `/goals/[id]` (D1) |
| `/goals/solo/[id]` | Re-exports the squad page | change | Redirect to `/goals/[id]` (D1) |
| `/goals/public/[id]` | Redirects to squad page | change | Redirect to `/goals/[id]` (D1) |
| `/goals/test-mindmap`, `/[id]` | Copy of the goal page (3.7k lines), creates a test goal | remove | To-do: "مسح نسخة صفحة الـ MAP المكررة" |
| `/notes` | Notes | keep | |
| `/notifications` | Notifications page | keep | |
| `/settings` | Settings | change | Energy+ tab and Champion go (D2, D7) |
| `/achievements` | Wins | keep | Becomes الكاسات with cup types |
| `/vault` | Ranks & theme unlocks, no link to it anywhere | change | Merged into Appearance (rank colours) + Ranks screen |
| `/pricing` | Pricing page (still linked from Command Palette and goal-limit modal) | remove | D2 |
| `/admin` | Admin panel | keep | |
| `/auth/login` | Google sign-in + guest | keep | |
| `/blocked` | Account suspended | keep | |
| `/api/goals/[id]/og` | Share image (OG) for a goal | keep | Not a screen; restyle the image later |

## 1. Shell (`Shell.tsx`, `Sidebar.tsx`, layout)

| Item | Status | Note |
|---|---|---|
| Web sidebar: Home, Goals (expands to Solo / Squad), Notes, Wins, Coach, Settings; collapse/expand; XP-to-next-rank bar; user name + rank | change | Becomes the 96px rail (Home · Goals · Notes · Cups · Me) + FAB. Coach moves to a button (see 9) |
| Mobile: menu drawer (`isMobileNavOpen`) | change | Replaced by the 5-tab bottom nav |
| Header: XP history button, streak, notifications bell (shakes on new) | keep | Streak from `my_streak()` (D8) |
| XP history dropdown: list of XP logs with time ago, labels Completed / Undone / Spam blocked / **Late (-50%) / Late (-75%)**, total, empty "Complete your first task…", loading, Esc closes | change | Drop late-penalty labels (D3); add "+20% في الميعاد", "حد 15 مهمة", "الهدف خلص +100" |
| Mobile search (goals, tasks, notes): results grouped Goals (Public / Squad / Solo), Tasks (with goal), Notes; searching, empty, no-results states; ↑ ↓ Enter Esc | keep | |
| FAB + menu: Add note, Add task ("coming soon"), Solo goal, Squad goal | change | Menu: مهمة · هدف · ملاحظة · انضم بكود. "Add task" must work (not coming soon). "Squad goal" goes: every goal starts Solo (decided) |
| Global action menu (`GlobalActionMenu`): Create goal, Create note | change | Same menu as the FAB, one component |
| Offline / lag banner (`networkStatus`) + "synced" message after reconnect | keep | |
| Join-request toast for owners: name wants to join goal, Accept / Reject | keep | |
| Guest limit modal: 4 goals for guests, Sign in / Close | keep | |
| Ranks roadmap modal (current rank, all ranks, "Top #1 lead") | change | Becomes the Ranks screen; remove "Top #1" (D5) |
| Level-up modal ("Rank uped") | change | New Rank-up moment, fix wording, show the unlocked colour |
| Tutorial (spotlight steps: Step x of y, Skip, Next, Got it) | keep | Restyle as M3 coach marks; "إعادة الجولة" in settings |
| Operator guide (floating "Member guide" per page) | change | Merge into the in-app hints (decided) — one hint system |
| Inline guide tip (Quick guide, Ctrl+K, quick add, capture syllabus) on Home and goal page | change | Becomes the inline hint card (tc colour) |
| Toasts: success / warning / AI feedback | keep | M3 snackbar |
| PWA install prompt | keep | |
| Boot/loading screen "Loading workspace…" | keep | Loading state |
| Sound effects (`playBlip`, 16 files, `SoundContext`) | remove | Decided 2 Oct: no click sounds |
| Neon effects: GlitchOverlay, AmbientAurora, AnimatedLogo, GlobalCursor, NeuralMesh, ParticleWave, NeonIcon, EnergyCell, DiamondProgress | remove | D6 (replaced by M3 progress, cookie/sunny shapes) |

## 2. Home (`src/app/page.tsx`)

| Item | Status | Note |
|---|---|---|
| Greeting + "Focus Hub" title, dark/light awareness | change | New header: avatar, greeting, streak shape |
| Daily focus stats (weekly focus minutes) | keep | Small stat on Home or Me |
| Squad leaderboard card: pick a squad, "you are leading / X XP behind", empty states (no squad, guest) | change | Weekly per squad (resets Saturday), via `squad_weekly_leaderboard` |
| Action inbox: Today / Overdue tasks, "all caught up" empty | change | Today list; overdue grouped in one line + "نظّم مواعيدي من جديد" (reference doc) |
| Pinned goals (empty: "open a goal and pin it") | keep | "أهدافك" carousel |
| Task drawer opens from Home | keep | |
| Auto-join after login (`?autojoin=true` from public link) | keep | Logic, needs a "joining…" state |
| New: "عايز تعمل إيه؟" input + 4 templates | new (decided) | |

## 3. Goals list (`goals/page.tsx`, `goals/squad/page.tsx`)

| Item | Status | Note |
|---|---|---|
| Tabs Solo / Squad, Active section, Collaborative section | change | Filter All / Just me / Shared (D1) |
| Goal card: progress, members avatars, role badge (Admin / Co-admin / Member / Solo), active-today dot, attachment count, task count | keep | New card variants: course / text / squad / finished |
| "My tasks" / "All tasks" section in the squad list | dead | Commented out in the code ("permanently removed") |
| Squad rules panel on the card (owner only): no date changes, **XP penalty 2x**, members can't delete | change | Penalty rule removed (D3); rules move to the goal's team sheet |
| Create goal modal: title, deadline (optional), pin to dashboard, profanity check, guest local save | keep | |
| 5-active-goals limit + "Upgrade to Pro" modal | remove | D2 |
| "Grid slots / XP logic / penalties" guide + slots warning modal | remove | Slots = old limit (D2), penalties (D3) |
| Join goal modal: paste link or code, verify, states (invalid, pending, rejected, already member, found, sent), role input | keep | |
| "Squad goals locked" for guests + Sign in | keep | |
| Loading "Syncing workspace…" | keep | |

## 4. Goal page (`goals/squad/[id]/page.tsx`)

| Item | Status | Note |
|---|---|---|
| Access denied (team goal, not a member) + "Join with code" | keep | |
| Read-only banner + "Request edit access" | keep | |
| Header: title, progress shape, Total focus / Done / Total tasks, team avatars + online count | change | "13 من 32 درس" wording; focus total stays |
| Toolbar: pin to dashboard, import (Playlist / Smart import), notes, share, Google Calendar, attachments (count), clean titles with AI, squad report, delete goal | keep | Toolbar fits on mobile as icon row + overflow menu |
| Edit goal (title, deadline), "Goal achieved → moved to wins" | keep | Leads to the cup moment |
| Views List / Board / Map + "pin favourite view" | keep | |
| Page width Focused / Balanced / Ultrawide (web) | keep | Web only |
| Filters: All active / Today / This week / Overdue | keep | Overdue label → "فات ميعادها" |
| Task row: check, title, XP, difficulty, deadline, assignee, video progress, "who is viewing" (presence colour), lock on tasks not yours (restricted) | keep | |
| Assign popover (squad): assign / unassign, "already assigned" | keep | Squad only |
| Add task: input (Enter) + difficulty | keep | |
| Linked notes panel (empty: "Go to Notes → link") | keep | |
| Leave team (member), delete goal (owner) with confirm | keep | Confirm dialogs |
| Team-rules guard toasts ("can't change deadlines") | keep | |

## 5. Share and team (inside goal page)

| Item | Status | Note |
|---|---|---|
| Share modal: invite link (copy), invite as role, general access (anyone with link joins / requires approval), default role (viewer / editor), public view link, achievement card PNG (download / copy) | change | Split into "اعرض تقدّمك" and "اشتغل مع ناس" (decided). Story card 9:16 |
| Team panel: members with role (owner / co-admin / member / viewer / guest), change role, remove; pending requests approve / reject; rules (no date changes, no delete); guest expires after 7 days; leave squad | keep | Squad only |
| Role info: what each role can do | keep | |
| Squad report modal: overview, top performer, needs attention, member table (search, sort), task log, Export Excel / PDF | keep | |

## 6. Board and Map

| Item | Status | Note |
|---|---|---|
| Board: To do / In progress / Done, drag between columns, empty text per column | keep | |
| Map (`@xyflow/react`): task cards, checklist cards (add item), note cards, list cards (add bullet), connect lines, dots background, zoom controls, fit view | keep | Mobile: read + pan/zoom; editing on web |

## 7. Task drawer (`TaskDrawer.tsx` + `task-drawer/*`)

| Item | Status | Note |
|---|---|---|
| Header: title edit, linked goal select (edit goal), status Completed / In progress, expand / collapse | keep | Full task page on web = expanded |
| Metadata: XP reward, difficulty, deadline (start/end), assignee + notify | keep | |
| Description + "Explain" AI | keep | |
| Checklist (add with Enter, Esc) | keep | |
| Comments: list, empty, write (Enter / Shift+Enter), @mention with search + select all / deselect all, emoji reactions, notifications for mentions and reactions | keep | |
| Attachments: Google Drive (link / unlink / picker), manual link, YouTube URL | keep | |
| Video player (`SmartTaskPlayer`) + saved progress + 60% gate | change | Gate: watched seconds (HANDOFF backlog), design shows the 60% marker |
| Video analysis (`VideoAnalysisViewer`): summary, key takeaways, checklist → add selected tasks, notes | keep | |
| AI skills (`TaskSkills`): AI checklist, Explain topic, Ask AI, + specialties (programmer / networks / accountant / student) | change | Already open: every skill is set to SILVER (D4). Remove the leftover rank-lock code and "Champion skills" label; show quota "باقي X من Y" |
| Quota states: limit reached + reset time, servers busy, error | keep | |
| Actions: Pause / Resume, Focus 25 min, Complete / Done, copy task link, delete (confirm) | keep | |
| Esc closes | keep | |

## 8. Focus (`PomodoroContext`, `PomodoroHUD`)

| Item | Status | Note |
|---|---|---|
| Focus / break timer, start / stop / close, minimise, current task | keep | Full Focus screen + mini bar (decided) |
| Timer config: focus minutes, break minutes | keep | |
| Context-switch warning: Force swap / Keep focusing | keep | Softer wording, no "cognitive drain" text |
| Browser notifications permission (blocked / enabled) | keep | |
| Time logs ≥ 25 min count for the streak | keep | Server (D8) |

## 9. Coach and Command Palette

| Item | Status | Note |
|---|---|---|
| Coach panel: 3 modes (واجهني بالحقيقة · أهم 3 حاجات · حاجة سريعة أبدأ بيها), response, loading, energy, quota | change | Server limit uses `user_tier` (3 / 50 / 150) → plain 3 a day for all (D2, D4) |
| Command Palette (Ctrl+K): search goals/tasks, recent items, recent tasks, create task (pick goal, name, difficulty), create goal, quick create from text, go to Home/Coach/Notes/Settings, ranks roadmap, dark/light, language, AI quota badge; ↑ ↓ Enter Esc | change | Remove "/pricing" and "upgrade" links (D2); "team workspace" create → normal goal |
| Zen mode toggle (hides chrome) | remove | Decided 2 Oct: the Focus screen does this job (full screen, no nav). Today the focus HUD is a floating box that does NOT hide the app → agent task |

## 10. Imports

| Item | Status | Note |
|---|---|---|
| Playlist import: URL, scan, preview videos + durations, select, study days, minutes per day, errors (not a playlist, private, empty, capacity too small) | change | Add the decided question: "هذاكرها ككورس" / "هحفظها وأكتب عليها ملاحظات" |
| Smart import from text: paste, analyze, preview found tasks, back, add; errors | keep | |
| AI clean titles | keep | |

## 11. Notes (`notes/page.tsx`)

| Item | Status | Note |
|---|---|---|
| List, search, filter by source (personal / task comments / all), filter by goal, tags (Idea, Important, Source, Task, Reference), "showing X of Y" | keep | |
| Editor: title, body, link to goal, tag, Ctrl+Enter save, auto-saved, delete (confirm) | keep | |
| Ask AI workspace: question, thinking, answer, "append to note" | keep | |
| States: loading, empty, no results | keep | |

## 12. Notifications

| Item | Status | Note |
|---|---|---|
| Dropdown: filter all / unread / read, read all, view all, empty | keep | Web panel; mobile opens the page |
| Page: tabs All / Unread / Alerts / Squad, mark all read, mark read, show more/less, "view goal", loading, empty | keep | |
| Report detail (`selectedReport`) | keep | |

## 13. Settings (`settings/page.tsx`)

| Item | Status | Note |
|---|---|---|
| Profile: avatar, full name, age, email | keep | |
| Guest: "temporary account" + link with Google | keep | |
| Rank + "view all ranks" | keep | Links to Ranks screen |
| Energy+ tab (counter, champion, vessel, perks) | remove | D2, D7 |
| Champion selector (`AvatarSelector`) | remove | D7 |
| Language, appearance (dark / light), install app, restart tour | keep | Appearance = Theme screen with rank colours |
| Logout confirm; delete account with 3-question survey + confirm | keep | |

## 14. Wins (`achievements/page.tsx`)

| Item | Status | Note |
|---|---|---|
| List of finished goals, total, loading, empty | change | Becomes الكاسات: cup per goal, bronze / silver / gold |
| Detail: duration, tasks, completion, stamp, task log with weight | keep | Cup detail screen |
| Restore goal to active | keep | |

## 15. Ranks and Vault (`vault/page.tsx`)

| Item | Status | Note |
|---|---|---|
| XP required per rank, rank unlocks, equip theme, locked state, your progress | change | Ranks screen + Appearance (rank colours) |
| "Top #1 leader" / "Requires Top #1 in the platform" | remove | D5 |

## 16. Admin (`admin/page.tsx`)

| Item | Status | Note |
|---|---|---|
| Admin check, stats cards, tabs Member registry / Goal analytics / Recent activity, member table (rank/XP, goals, status), actions (block, purge), live indicator | keep | Web only |

## 17. Sign in and blocked

| Item | Status | Note |
|---|---|---|
| Login: Sign in with Google, continue as guest, signing-in state, pending-join message, 3 feature lines, AR/EN switch | keep | New Landing page sits before it (decided) |
| Blocked: account suspended, contact support | keep | |

## 18. Dead code (not imported anywhere)

`src/components/WelcomeTour.tsx` · `ui/ProgressCup.tsx` · `ui/ReportModal.tsx` · `ui/task-drawer/TaskDrawerAiTacticalTools.tsx`
(an older copy of the AI tools; its features live on in `TaskSkills`). `src/hooks/usePricing.ts` is only used by the pricing page.

## Notes for the coding agent (not design)
- 9 files are over the 400-line rule (biggest: goal page 3.7k, Shell 2.6k, TaskDrawer 1.6k). Splitting them is part of the rebuild.
- Coach and AI-ask routes still gate on `user_tier`; must become the plain daily quota (D4).
