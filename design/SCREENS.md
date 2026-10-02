# Growth Hub — screen map (M3 redesign)

Every screen below is one `.dc.html` artboard (or one per state when the state changes the layout).
States key: N normal · E empty · L loading · X error · O offline · G guest · P permissions (role variants) · D/Lt dark + light.
"✓" = already drawn and approved (redraw only to apply STYLE.md "Known fixes").

## A — Start and Home

| # | Screen | Mobile file | Web file | States |
|---|---|---|---|---|
| A1 | Landing page ✓ drawn | Landing | WebLanding | N |
| A2 | Sign in (Google, guest, pending-join message, AR/EN) ✓ drawn | Login, LoginInvite (invite + loading), LoginError | WebLogin | N, L, X |
| A3 | First minute (new user: big input + 4 templates, empty today) ✓ drawn | FirstRun | WebFirstRun | N |
| A4 | Home (mobile redrawn ✓, web next) | Main ✓ (theme prop dark/light) / HomeLight ✓ | WebHome ✓ (to redraw) | N, E, L, O, G, D/Lt |
| A5 | Playlist question ("هذاكرها ككورس" / "هحفظها وأكتب عليها ملاحظات") | PlaylistAsk (sheet) | WebPlaylistAsk (dialog) | N |
| A6 | Study plan (pick videos, study days, minutes a day) | StudyPlan | WebStudyPlan | N, L, X |
| A7 | AI steps review (goal → steps, edit before save) | AiSteps | WebAiSteps | N, L, X, quota |
| A8 | FAB menu (مهمة · هدف · ملاحظة · انضم بكود) + quick task sheet | Fab, QuickTask | (rail FAB menu) WebFab | N |
| A9 | Search (goals, tasks, notes) | Search | (Command Palette D13) | N, E, L, no results |
| A10 | Shell moments: offline banner, snackbars, join-request toast (accept/reject), guest-limit dialog, PWA install | ShellMoments | WebShellMoments | — |
| A11 | Hints: coach mark, inline hint card, tour step | Hints | WebHints | — |

## B — Goals (mobile)

| # | Screen | File | States |
|---|---|---|---|
| B1 | Goals list (All / Just me / Shared, card variants, finished with cup) | Goals | N, E, L, G |
| B2 | Course goal (list view) | Goal ✓ | N, E |
| B3 | Text goal | GoalText | N, E, filters (اليوم / الأسبوع / فات ميعادها) |
| B4 | Squad goal (assignee, presence, lock on others' tasks, online) | GoalSquad | N, P (owner / member / viewer / guest) |
| B5 | Read-only banner + request edit access · Access denied + join with code | GoalNoAccess | P |
| B6 | Goal menu (pin, attachments, notes, share, Google Calendar, import, AI clean titles, report, edit, delete / leave) | GoalMenu | P |
| B7 | Board view (لسه / شغال فيها / خلصت, drag) | GoalBoard | N, E |
| B8 | Map view (view, pan, zoom; edit on web) | GoalMap | N |
| B9 | Weekly leaderboard (resets Saturday) | Leaderboard | N, E |
| B10 | New goal sheet (title, deadline, pin) | NewGoal | N, X |
| B11 | Join with code (invalid, pending, rejected, already in, found, sent) | JoinCode | all |
| B12 | Team sheet (members, roles, change role, remove, pending requests, rules, guest 7 days, leave) | Team | P |
| B13 | Share sheet: اعرض تقدّمك / اشتغل مع ناس (invite link, role, approval, copy) | Share | N |
| B14 | Story card 9:16 | StoryCard | goal / streak / weekly champ |
| B15 | Public progress page (view-only link) | PublicGoal | N, G |
| B16 | Attachments (list, Drive, link, preview) | Attachments | N, E, L |
| B17 | Import from text (paste → found tasks → add) | ImportText | N, L, X |
| B18 | Goal notes (linked notes) | GoalNotes | N, E |
| B19 | Edit goal + confirm dialogs (delete goal, leave team) | GoalEdit | N |
| B20 | Squad report (summary, members, task log, export Excel / PDF) | SquadReport | N |

## C — Goals (web)

| # | Screen | File | States |
|---|---|---|---|
| C1 | Goals list | WebGoals | N, E, L |
| C2 | Course page like YouTube (big video, note points, lessons on the side) | WebCourse | N |
| C3 | Text goal + wide task panel | WebGoal ✓ (fixes) / WebGoalText | N, filters |
| C4 | Squad goal (presence, assign popover, width Focused / Balanced / Ultrawide) | WebGoalSquad | P |
| C5 | Board | WebBoard | N |
| C6 | Map (add task / checklist / note / list cards, connect, zoom) | WebMap | N |
| C7 | Team dialog | WebTeam | P |
| C8 | Share dialog + story card preview | WebShare | N |
| C9 | Squad report dialog | WebReport | N |
| C10 | No access / read-only | WebGoalNoAccess | P |

## D — Tasks, Focus, AI

| # | Screen | Mobile | Web | States |
|---|---|---|---|---|
| D1 | Video task drawer (60% gate) | VideoSheet ✓ | in WebGoal ✓ | locked, unlocked, done |
| D2 | Task drawer | TaskSheet ✓ | WebTaskPanel | N, done, P |
| D3 | Full task page (title, goal, status, XP, difficulty, dates, assignee, description + اشرحلي, checklist, attachments, comments, actions: pause, focus, done, copy link, delete) | TaskFull | WebTaskFull | N, P |
| D4 | Comments: @mention picker (select all), reactions | Comments | (inside WebTaskFull) | N, E |
| D5 | Add attachment (Drive, link, YouTube) | AddAttachment | WebAddAttachment | N, X |
| D6 | AI sheet: اشرحلي · اسأل الـ AI · اعمل checklist · تخصصك (4 × 3 skills), "باقي X من Y" | AiSheet | WebAi | N, L, quota done, busy, X |
| D7 | Video analysis (summary, takeaways, checklist → add tasks) | VideoAnalysis | WebVideoAnalysis | N, L |
| D8 | Focus (full screen, no nav): running, break, paused, settings, switch-task warning | Focus | WebFocus | all |
| D9 | Focus mini bar (on any screen) | (in Main redraw) | (in WebHome redraw) | — |
| D10 | Coach (3 a day: 3 modes) | Coach | WebCoach | N, L, quota done |
| D11 | Command Palette (search, recent, create task / goal, go to, language, theme) | — | WebPalette | N, create task, create goal, no results |
| D12 | Notifications (All / Unread / Alerts / Squad) | Notifications | WebInbox (panel) | N, E, L |
| D13 | Empty states set (no goals, no tasks today, no notes, no cups, no notifications) | Empties | WebEmpties | E |

## E — Game and the rest

| # | Screen | Mobile | Web | States |
|---|---|---|---|---|
| E1 | Cups | Wins ✓ (fixes) | WebWins | N, E, L |
| E2 | Cup detail (duration, tasks, log, restore to active) | CupDetail | (dialog in WebWins) | N |
| E3 | Cup moment | GoalDone ✓ | (dialog) WebGoalDone | N |
| E4 | Rank-up moment (new colour unlocked) | RankUp | WebRankUp | N |
| E5 | Ranks (7 ranks, your progress) | Ranks | (in WebSettings) | N |
| E6 | Streak sheet (freezes, repair within 48h) | Streak | (popover) | normal, broken, repaired |
| E7 | XP history (no late penalty) | XpHistory | (popover) | N, E, L |
| E8 | Me (avatar, name, rank, streak, cups, focus time, links) | Profile | — | N, G |
| E9 | Settings (profile, language, appearance, install, tour, logout) | Settings | WebSettings | N, G (link Google) |
| E10 | Appearance (mode + 8 rank colours) | Theme ✓ (8 colours) | (in WebSettings) | N |
| E11 | Delete account (3 questions + confirm), logout confirm | DeleteAccount | (dialog) | N |
| E12 | Notes list (search, source, goal, tags) | Notes | WebNotes | N, E, L, no results |
| E13 | Note editor + Ask AI | NoteEdit | (in WebNotes) | N, saving |
| E14 | Account blocked | Blocked | WebBlocked | N |
| E15 | Admin (stats, members, goal analytics, activity, block / delete) | — | WebAdmin | N, L |

Total: ~90 artboards with states (10 already approved).

## Inventory → screen (every keep / change item has a home)

| Inventory section | Goes to |
|---|---|
| 0 Routes | A4, B1, B2–B4, C1–C4, E12, E1, E10/E5, E15, A2, E14 · pricing / test-mindmap removed |
| 1 Rail / bottom nav, header (XP, streak, bell) | every main screen; E7, E6, D12 |
| 1 Search · FAB · offline · join toast · guest limit · PWA · toasts · loading | A9 · A8 · A10 · A10 · A10 · A10 · A10 · L states |
| 1 Ranks roadmap · level-up · tutorial / guide / inline tip | E5 · E4 · A11 |
| 2 Home: focus stats, leaderboard card, today + overdue line, pinned goals, auto-join | A4 (+ B9 for the full leaderboard) |
| 3 Goals list, create, join, guest lock | B1, B10, B11, C1 |
| 4 Goal page: access, read-only, header stats, toolbar, edit, views, width, filters, task row, assign, add task, linked notes, leave / delete | B2–B8, B18, B19, C2–C6, C10 |
| 5 Share, team, roles, squad report | B12–B15, B20, C7–C9 |
| 6 Board, map | B7, B8, C5, C6 |
| 7 Task drawer, comments, attachments, video, analysis, AI skills, quota, actions | D1–D7 |
| 8 Focus, config, switch warning, notifications permission | D8, D9 |
| 9 Coach, Command Palette | D10, D11 |
| 10 Playlist import (+ question), smart import, AI clean | A5, A6, B17, B6 |
| 11 Notes, editor, Ask AI | E12, E13 |
| 12 Notifications dropdown + page | D12 |
| 13 Settings, guest link, rank, language, appearance, install, tour, logout, delete | E8–E11 |
| 14 Wins | E1–E3 |
| 15 Vault | E5, E10 |
| 16 Admin | E15 |
| 17 Login, blocked | A2, E14 |

Keep / change items without a screen: **none**.

## Order and size of steps
Each step = 3–5 artboards, so it finishes inside one message.
A: A1–A2 → A3 + A4 redraw → A5–A7 → A8–A11.
B, C, D, E follow the same way. After each group: a 2-line summary + coverage count.
