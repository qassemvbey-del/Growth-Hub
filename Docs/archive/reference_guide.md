# Growth Hub App Business Logic & Permissions Reference Guide

This document provides a comprehensive overview of the application's core rules, role-based access control (RBAC), gamification math, and deadline validation systems.

---

## 1. Role-Based Access Control (RBAC)

The app defines five key user roles: **Owner**, **Admin** (which maps from `co-admin`), **Member**, **Viewer**, and **Guest**.

### Permissions Capabilities Matrix

| Action / Capability | Owner | Admin / Co-Admin | Member | Viewer | Guest |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Delete Squad / Terminate Goal** | Yes | No | No | No | No |
| **Manage Members** (Invite/Kick/Roles) | Yes | Yes | No | No | No |
| **Assign Tasks** | Yes | Yes | No | No | No |
| **Edit Goal settings** | Yes | Yes | No | No | No |
| **Add Sub-Tasks** | Yes | Yes | Yes | No | No |
| **Complete Sub-Tasks** | Yes | Yes | Yes | No | No |
| **Post Comments** | Yes | Yes | Yes | Yes | Yes |

### Squad Rules Section (Squad Control Panel)

Squad owners can toggle team rules in the modal which affects members' capabilities:
* **`no_delete`**: If enabled, Members and lower roles cannot delete tasks. Only Owners and Admins can delete tasks.
* **`no_date_changes`**: *(Active)* If enabled, completely blocks task deadline modifications for non-admins (Members, Viewers, Guests).
* **`xp_multiplier`**: *(Active)* If enabled, task completions that occur after the task's deadline will have their XP cut in half (50% penalty).

### Database Row Level Security (RLS)
* **`public.profiles`**: Restricted to owner (`auth.uid() = user_id`).
* **`public.goals`**: Restricted to owner (`auth.uid() = user_id`).
* **`public.tasks`**: RLS is fully enabled and secured. Selects are permitted for members and owners of the parent goal. Inserts, updates, and deletes are restricted to owners and users with `role` matching `'owner'`, `'admin'`, or `'member'`.

---

## 2. XP & Gamification Logic

### The Math Behind XP Earnings

XP rewards are directly mapped to task completions:
* **Task Completion (Standard):** Earns `task.weight * 10` XP.
* **Default Fallback:** If a task's weight is invalid or undefined, it defaults to `3`, yielding `30 XP`.
* **Task Incompletion / Reversion:** Reverts/deducts `-(task.weight * 10)` XP.

### Dynamic Rank Thresholds & Perks

User Ranks and associated visual benefits are calculated strictly on total accumulated XP:

| Rank | Required XP | unlocked Perk | Neon Class styling |
| :--- | :---: | :--- | :--- |
| **SILVER** | 0 XP | Standard Features | `text-slate-200` |
| **GOLD** | 400 XP | Title Badge | `text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]` |
| **PLATINUM** | 1,000 XP | Avatar Border | `text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]` |
| **DIAMOND** | 2,000 XP | Exclusive Emojis | `text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]` |
| **CROWN** | 4,000 XP | Glowing Name | `text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]` |
| **ACE** | 7,000 XP | Calling Card | `text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]` |
| **CONQUEROR**| 12,000 XP | Top #1 Lead Title | Dynamic gold-to-red pulsing gradient (`bg-clip-text`) |

*Note: The **CONQUEROR** rank is dynamically awarded to the user with the highest XP on the leaderboard (evaluated every 30 seconds via `/api/top-xp`).*

### Anti-Cheat layers & Cooldowns

XP transactions must pass three validation steps in `GrowthContext.tsx`:
1. **Quality Filter (Regex Bouncer):** Block completions on vague titles. Rejects if length is $< 5$ chars, contains numbers only, repeats same character 4+ times, or matches common test phrases (`test`, `asdf`, `asd`, `testing`, `تجر`, `تجربة`, `المه`, `المهمة`).
2. **Velocity Trap (Cooldown):** Triggered if a user completes $\ge 3$ tasks within 60 seconds. Cooldown locks all XP gains for **15 minutes**.
3. **Daily Limit (Focus Capacity):** A user can earn XP on at most **9 tasks per calendar day**. Further completions award 0 XP silently.

---

## 3. Deadlines & Penalties

### Accountability Status Formulas

Goal tracking evaluates relative progress against elapsed time:
* **Time Ratio:** `timeRatio = Math.max(0, Math.min(1, timeElapsed / totalDuration))`
* **LATE / Red Zone:** Triggered if `timeRatio > progress + 0.1`.
* **AHEAD of Schedule:** Triggered if `progress > timeRatio + 0.2`.

### Streaks Calculation
The calendar streak is calculated by scanning `task_completion_log`. It counts consecutive calendar days of task completions starting from today or yesterday, incrementing daily and breaking on gaps.
