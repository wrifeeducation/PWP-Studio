---
name: wrife-brand-ecosystem
description: >
  Load this skill at the start of EVERY session that touches any WriFe app —
  wrife.co.uk, pwp-studio.wrife.co.uk, practice.wrife.co.uk,
  dailywrite.wrife.co.uk, or resources.wrife.co.uk. It is the single source of
  truth for cross-app architecture, table ownership rules, the four login routes,
  the four user types, the learning_events bridge, and development isolation.
  Triggers on: "wrife", "cross-app", "five apps", "three apps", "learning_events",
  "home_accounts", "Route A", "Route B", "Route C", "Route D", "table ownership",
  "pupil login", "home learner", "independent teacher", "Play Store", "PWP Studio",
  "Interactive Practice", "Daily Write", "DWP", "Skills Toolkit", "auth/hub",
  any task that spans more than one WriFe repo, or any architecture / integration
  question about the WriFe platform. Always invoke before writing any cross-repo
  code or schema migration.
---

# WriFe Brand Ecosystem Skill

**Load this skill at the start of EVERY session touching any WriFe app.**
It is the single source of truth for cross-app architecture, ownership rules,
and development isolation. It governs all five repos: `wrife-website`, `wrifeapp`,
`InteractivePracticeApp`, `wrife-dwp`, and `wrife-resources`.

---

## The Five Apps

| App | URL | Repo | Stack | Primary role |
|-----|-----|------|-------|--------------|
| **WriFe Platform** | `wrife.co.uk` | `wrife-website` | Next.js | School hub — teacher dashboard, assignments, reporting, SSO gateway |
| **PWP Studio** | `pwp-studio.wrife.co.uk` | `wrifeapp` | React/Vite | Progressive Writing Practice — formula engine, chain practice, free practice |
| **Interactive Practice** | `practice.wrife.co.uk` | `InteractivePracticeApp` | React/Vite | 61-lesson grammar game — worlds, activities, badges, boss challenges |
| **Daily Write (DWP)** | `dailywrite.wrife.co.uk` | `wrife-dwp` | React/Vite | Daily writing prompts — levelled intro, prompt, AI feedback |
| **Skills Toolkit** | `resources.wrife.co.uk` | `wrife-resources` | Next.js | Teacher/pupil resource hub — tools, task assignments |

All five share **one Supabase project: `gzmgjkbtsvezfclmreru` (WriFe Platform)**.
Never create migrations targeting `rxmitjrbrsqjeymsycoj` or `nxhkpqngnxshgotvuujb`
for production work — those are legacy/test only.

---

## The Four User Types

| Type | Description | Login route | Dashboard |
|------|-------------|-------------|-----------|
| **School pupil** | In a teacher-managed class at a school with a wrife.co.uk account | Route A preferred (web). Route B also works for Play Store standalone use | wrife.co.uk/pupil/dashboard (web), or sub-app direct (Play Store) |
| **Home learner** | Child of a parent who signed up directly on a sub-app | Route C (parent code + username + PIN) | Sub-app dashboard only |
| **School teacher** | Part of a school with a wrife.co.uk account | wrife.co.uk/login | wrife.co.uk teacher dashboard |
| **Independent teacher** | Teacher with no school account — signed up directly on sub-app | Route D (email + password on sub-app) | Sub-app teacher view |

---

## The Four Login Routes

### Route A — School hub SSO (preferred for school pupils on web)

```
1. Pupil logs in at wrife.co.uk/pupil/login
   → class_code + username + PIN → POST /api/pupil/login
   → Supabase Auth user provisioned (email: pupil-{uuid}@practice.wrife.co.uk)
   → tokens stored in localStorage.pupilSSOTokens

2. Pupil dashboard at wrife.co.uk/pupil/dashboard
   → App tiles: Interactive Practice, PWP Studio, Daily Writing, Skills Toolkit

3. Each tile uses buildSSOUrl() targeting /auth/hub:
   https://<sub-app>/auth/hub#access_token=<JWT>&refresh_token=<token>&...

4. Sub-app /auth/hub page (public, outside protected route group):
   → reads hash fragment client-side
   → supabase.auth.setSession() mints session cookies
   → sets sessionStorage.entryViaHub = "1"
   → clears hash from address bar
   → redirects to sub-app main page
   → "← WriFe" back button shown
```

**Why /auth/hub exists:** Next.js SSR middleware cannot read URL hash fragments
(browser-only). Without /auth/hub a protected page with a hash token triggers
a middleware redirect to /login before the hash is processed. The public /auth/hub
page intercepts tokens client-side first. This pattern is required for ALL Next.js
sub-apps and recommended for React/Vite sub-apps for consistency.

### Route B — Direct login on sub-app (ALL pupil types)

Route B is **open for all pupil types including school pupils**. This enables
standalone Play Store apps to work without requiring pupils to visit wrife.co.uk.
The `pupil-login` Edge Function (v19+) accepts all account types — no
SCHOOL_PUPIL_USE_HUB redirect. Plaintext PINs (imported school pupils) are
auto-upgraded to bcrypt on first Route B login.

```
1. Pupil visits sub-app /login → class_code + username + PIN
2. Sub-app calls pupil-login Edge Function on gzmgjkbtsvezfclmreru
3. supabase.auth.setSession() with returned tokens
4. No "← WriFe" back button shown
```

### Route C — Direct sign-up (home learner / parent-purchased)

```
1. Parent signs up at pwp-studio.wrife.co.uk/home-signup
2. home_accounts row created (account_type: "parent") + Stripe subscription
3. Parent creates child → pupils row + auto-created home class (class_code = parent code)
4. Child logs in via Route B using parent_code + username + PIN
5. Parent sees progress via learning_events
```

### Route D — Independent teacher sign-up

```
1. Teacher signs up at pwp-studio.wrife.co.uk/teacher-signup
2. home_accounts row (account_type: "independent_teacher") + Stripe subscription
3. Teacher creates classes + pupils → pupils log in via Route B
4. Teacher sees class progress in sub-app teacher view
```

---

## The `/auth/hub` Pattern (All Sub-Apps)

Every sub-app must have a public `/auth/hub` page that:
1. Reads `#access_token` + `#refresh_token` from `window.location.hash`
2. Calls `supabase.auth.setSession({ access_token, refresh_token })`
3. Sets `sessionStorage.entryViaHub = "1"`
4. Clears the hash: `window.history.replaceState(null, "", window.location.pathname)`
5. On success → redirect to main authenticated page; on failure → redirect to `/join` or `/login`

```typescript
// Canonical /auth/hub (Next.js "use client" outside (app) route group)
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthHubPage() {
  const router = useRouter()
  useEffect(() => {
    async function go() {
      const p = new URLSearchParams(window.location.hash.slice(1))
      const at = p.get("access_token"), rt = p.get("refresh_token")
      if (!at || !rt) { router.replace("/join"); return }
      window.history.replaceState(null, "", window.location.pathname)
      sessionStorage.setItem("entryViaHub", "1")
      const { error } = await createClient().auth.setSession({ access_token: at, refresh_token: rt })
      router.replace(error ? "/join" : "/my-tasks")
    }
    go()
  }, [router])
  return null // show a loading spinner here
}
```

---

## The `← WriFe` Back Button

```typescript
// Show only when pupil arrived via Route A through /auth/hub
const showBackToHub = sessionStorage.getItem("entryViaHub") === "1"
// <a href="https://wrife.co.uk/pupil/dashboard">← WriFe</a>
```

`sessionStorage` (not `localStorage`) — clears on tab close.
Set ONLY in `/auth/hub`, never in `onAuthStateChange` (which fires for Route B too).

---

## Table Ownership — The Hard Rule

Never write a migration in one repo that alters a table owned by another repo.

### `wrife-website` owns
```
classes, pupils, profiles, schools, school_admins, subscriptions,
home_accounts, pupil_parent_links, pwp_assignments, ip_assignments,
dwp_assignments, learning_events, pupil_sessions, pupil_activity_log
```

### `wrifeapp` (PWP Studio) owns
```
formula_levels, formula_progress, formula_sessions, pwp_pupil_levels,
pwp_chain_streaks, pwp_free_practice_sentences, pwp_weekly_themes
```

### `InteractivePracticeApp` owns
```
activities, lessons, worlds, pupil_progress, pupil_responses,
badge_definitions, pupil_badges, streaks
```

### `wrife-dwp` (Daily Write) owns
```
dwp_levels, dwp_prompts, dwp_submissions, dwp_progress
```

### `wrife-resources` (Skills Toolkit) owns
```
resource_tools, resource_tasks, resource_completions
```

### Shared
```
learning_events — owned by wrife-website; sub-apps INSERT only, never ALTER
                  app column CHECK: ("pwp", "ip", "dwp", "resources")
```

---

## Known Schema Rules

### `formula_progress` is the PWP dashboard primary progress table
`DashboardPage.tsx` queries `formula_progress` (NOT `pwp_pupil_progress`).
Add all gamification columns (XP, coins, streaks, badges) to `formula_progress`
with `NOT NULL DEFAULT <value>` to backfill existing rows automatically.

```sql
-- Correct:
ALTER TABLE formula_progress ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;
-- Wrong (crashes existing pupils):
ALTER TABLE formula_progress ADD COLUMN coins INTEGER;
```

---

## The `learning_events` Table

```sql
CREATE TABLE learning_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id    UUID NOT NULL,
  app         TEXT NOT NULL CHECK (app IN ("pwp", "ip", "dwp", "resources")),
  event_type  TEXT NOT NULL,
  event_data  JSONB DEFAULT "{}",
  class_id    UUID REFERENCES classes(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

| App | event_type examples |
|---|---|
| pwp | `formula_completed`, `chain_session_completed`, `pwp_level_advanced` |
| ip | `lesson_completed`, `world_completed`, `badge_earned`, `streak_milestone` |
| dwp | `dwp_submission`, `dwp_level_advanced` |
| resources | `tool_used`, `task_completed` |

---

## Development Isolation Rules

1. **Stay in your lane** — only alter tables your repo owns
2. **Cross-repo order** — wrife-website schema first, then sub-app consumer
3. **wrife.co.uk update triggers** — new assignment type, new teacher data point, new pupil dashboard tile, or new `learning_events` event_type only
4. **Standalone mode always works** — `class_id` nullable everywhere; upserts use `pupil_id` as sole conflict key when class_id is null
5. **Feature parity** — all five apps implement `/auth/hub` and `← WriFe` button

---

## Cross-App Checklist

### Auth / session
- [ ] /auth/hub page exists in sub-app, outside protected route group?
- [ ] setSession() called in /auth/hub, not onAuthStateChange?
- [ ] sessionStorage.entryViaHub set in /auth/hub only?
- [ ] ← WriFe shown only when entryViaHub === "1"?
- [ ] Route B (direct login) calls pupil-login Edge Function?
- [ ] class_id nullable in all new tables and upserts?

### Schema
- [ ] Migration targets gzmgjkbtsvezfclmreru only?
- [ ] Table owned by this repo?
- [ ] RLS uses auth.uid() equality?
- [ ] New gamification columns on formula_progress with NOT NULL DEFAULT?
- [ ] New learning_events event_type documented here?

### Smoke test
1. Login at wrife.co.uk/pupil/login → SIL42495 / amab04 / 9543
2. Click each tile → all four sub-apps load authenticated ✅
3. All four sub-apps show ← WriFe button ✅
4. ← WriFe on any sub-app → returns to wrife.co.uk/pupil/dashboard ✅
5. Direct login at practice.wrife.co.uk/pupil/login with SIL42495 / amab04 / 9543 → signs in (Route B) ✅

---

## Reference — Supabase Projects

| Project ID | Name | Used for |
|---|---|---|
| `gzmgjkbtsvezfclmreru` | WriFe Platform | ✅ ALL production — all five apps |
| `rxmitjrbrsqjeymsycoj` | IP Practice (legacy) | ❌ Do not use |
| `nxhkpqngnxshgotvuujb` | PWP App (legacy) | ❌ Do not use |

---

## Reference — Test Credentials

| Role | Credentials | Notes |
|---|---|---|
| School pupil | SIL42495 / amab04 / 9543 | Amadeo B, Silver Birch Y4, PWP L15 |
| School teacher | mankrah@kafed.org.uk / niiotin99 | wrife.co.uk teacher dashboard |
