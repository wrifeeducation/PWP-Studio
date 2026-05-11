# WriFe Brand Ecosystem Skill

**Load this skill at the start of EVERY session touching any WriFe app.**
It is the single source of truth for cross-app architecture, ownership rules,
and development isolation. It lives in `wrifeapp/skills/` but governs all three
repos: `wrife-website`, `wrifeapp`, and `InteractivePracticeApp`.

---

## The Three Apps

| App | URL | Repo | Stack | Primary role |
|-----|-----|------|-------|--------------|
| **WriFe Platform** | `wrife.co.uk` | `wrife-website` | Next.js | School hub — teacher dashboard, assignments, reporting, SSO gateway |
| **PWP Studio** | `pwp-studio.wrife.co.uk` | `wrifeapp` | React/Vite | Progressive Writing Practice — formula engine, chain practice, free practice |
| **Interactive Practice** | `practice.wrife.co.uk` | `InteractivePracticeApp` | React/Vite | 61-lesson grammar game — worlds, activities, badges, boss challenges |

All three share **one Supabase project: `gzmgjkbtsvezfclmreru` (WriFe Platform)**.
Never create migrations targeting `rxmitjrbrsqjeymsycoj` or `nxhkpqngnxshgotvuujb`
for production work — those are legacy/test only.

---

## The Four User Types

Understanding who is using WriFe and how they arrived determines every
auth, schema, and feature decision.

| Type | Description | Login route | Dashboard |
|------|-------------|-------------|-----------|
| **School pupil** | In a teacher-managed class at a school with a wrife.co.uk account | Route A (hub SSO) or Route B (direct) | wrife.co.uk/pupil/dashboard OR sub-app direct |
| **Home learner** | Child of a parent who signed up directly on PWP Studio or Interactive Practice | Route C (parent code + username + PIN) | Sub-app dashboard only |
| **School teacher** | Part of a school with a wrife.co.uk account | wrife.co.uk/login | wrife.co.uk teacher dashboard |
| **Independent teacher** | Teacher with no school account — signed up directly on PWP or IP | Route D (email + password on sub-app) | Sub-app teacher view |

> **Key principle:** All four types authenticate against the same Supabase project.
> The login route determines which interface they land in — not which data they own.

---

## The Four Login Routes

### Route A — School hub SSO (school pupils)

```
1. Pupil logs in at wrife.co.uk/pupil/login
   → class_code + username + PIN

2. POST /api/pupil/login (Next.js route on wrife.co.uk)
   → validates against `pupils` table in gzmgjkbtsvezfclmreru
   → provisions Supabase Auth user (synthetic email: pupil-{uuid}@practice.wrife.co.uk)
   → returns access_token + refresh_token

3. Pupil dashboard at wrife.co.uk/pupil/dashboard
   → App tiles: Interactive Practice, PWP Studio, Daily Writing

4. Each tile embeds JWT in URL hash:
   https://pwp-studio.wrife.co.uk/dashboard#access_token=<JWT>&...
   https://practice.wrife.co.uk#access_token=<JWT>&...

5. Sub-app Supabase SDK auto-detects hash → setSession() → authenticated
   → sessionStorage flag 'entryViaHub' = '1'
   → "← WriFe" back button shown
```

### Route B — Direct login on sub-app (school pupils, no hub)

```
1. Pupil visits pwp-studio.wrife.co.uk/login OR practice.wrife.co.uk/login
   → class_code + username + PIN (same credentials as Route A)

2. Sub-app calls `pupil-login` Edge Function on gzmgjkbtsvezfclmreru
   → same pupils table, same Supabase Auth provisioning
   → supabase.auth.setSession() called in sub-app
   → session stored locally

3. No "← WriFe" back button shown
```

### Route C — Direct sign-up (home learner / parent-purchased)

```
1. Parent signs up at pwp-studio.wrife.co.uk/home-signup
   OR practice.wrife.co.uk/home-signup (to be built)

2. Parent account created in `home_accounts` table
   → account_type: 'parent'
   → Stripe subscription attached

3. Parent creates child profile → pupil row created in `pupils`
   → class_id points to a 'home' type class auto-created for this parent
   → A parent code (= class_code on the home class) is generated

4. Child logs in: pwp-studio.wrife.co.uk/login OR practice.wrife.co.uk/login
   → parent_code + username + PIN
   → Same `pupil-login` Edge Function — home class is valid class

5. Parent logs in at pwp-studio.wrife.co.uk/parent OR practice.wrife.co.uk/parent
   → Sees their child's progress via learning_events table
```

### Route D — Independent teacher sign-up (no school account)

```
1. Teacher signs up at pwp-studio.wrife.co.uk/teacher-signup
   OR practice.wrife.co.uk/teacher-signup (to be built)

2. Teacher account created in `home_accounts` table
   → account_type: 'independent_teacher'
   → Stripe subscription attached

3. Teacher creates a class → `classes` row with account_type = 'independent_teacher'
   → Gets a class_code
   → Adds pupils manually (same pupils table structure)

4. Pupils log in via Route B using the class_code
5. Teacher sees class progress in sub-app teacher view
```

---

## Table Ownership — The Hard Rule

Each repo owns specific tables. **Never write a migration in one repo that
alters, recreates, or removes a table owned by another repo.**

### `wrife-website` owns
```
classes              — school and home classes; contains account_type
pupils               — all pupil accounts (school + home)
profiles             — all Supabase auth users (teachers, school admins)
schools              — school organisations
school_admins        — school admin accounts
subscriptions        — Stripe subscription state for schools
home_accounts        — parent and independent teacher direct accounts
pupil_parent_links   — school parent access grants (teacher → parent)
pwp_assignments      — teacher-configured PWP tasks (level_from, level_to)
ip_assignments       — teacher-configured IP tasks
dwp_assignments      — teacher-configured DWP tasks
learning_events      — shared progress summary (written by sub-apps, read by wrife.co.uk)
pupil_sessions       — legacy session cookies (wrife.co.uk login)
pupil_activity_log   — login events, audit trail
```

### `wrifeapp` (PWP Studio) owns
```
formula_levels             — the 67 formula definitions
formula_progress           — per-pupil formula completion state
formula_sessions           — individual practice session records
pwp_pupil_levels           — current level assignment per pupil
pwp_chain_streaks          — daily chain practice streak data
pwp_free_practice_sentences — free practice sentence history
pwp_weekly_themes          — active theme per class per week
pwp_challenge_assignments  — extension challenges assigned to classes/pupils
                             (source: teacher | parent | independent | ai_suggested | ai_auto)
                             (types: sentence_type | add_list | compound | complex)
```

### `InteractivePracticeApp` owns
```
activities           — the 1,100+ lesson activities (questions)
lessons              — 61 lesson definitions
worlds               — 6 world definitions
pupil_progress       — per-pupil lesson completion
pupil_responses      — individual activity answers
badge_definitions    — badge catalogue
pupil_badges         — earned badges per pupil
streaks              — daily activity streaks (IP-specific)
```

### Shared (written by sub-apps, read by wrife.co.uk)
```
learning_events      — owned by wrife-website; sub-apps INSERT only, never ALTER
```

> **If you are in a sub-app session and need data from a table owned by
> wrife-website, read it via Supabase query. Do not duplicate it.
> If you need wrife.co.uk to show new data, add a row to `learning_events`
> from the sub-app — do not ask wrife.co.uk to reach into sub-app tables.**

---

## The `learning_events` Table (Shared Progress Bridge)

Sub-apps write a lightweight event row whenever significant pupil progress
occurs. wrife.co.uk reads this table for teacher class views and reporting.
Sub-app internal tables remain private to each sub-app.

```sql
-- Schema (owned by wrife-website migrations)
CREATE TABLE learning_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id     UUID NOT NULL,          -- = auth.uid() = pupils.id
  app          TEXT NOT NULL CHECK (app IN ('pwp', 'ip', 'dwp')),
  event_type   TEXT NOT NULL,          -- see Event Types below
  event_data   JSONB DEFAULT '{}',     -- app-specific payload
  class_id     UUID REFERENCES classes(id), -- nullable for home learners
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON learning_events (pupil_id, created_at DESC);
CREATE INDEX ON learning_events (class_id, created_at DESC);
```

### PWP Event Types
| event_type | event_data keys | Meaning |
|---|---|---|
| `formula_completed` | `level`, `score`, `attempts` | Pupil completed a formula level |
| `chain_session_completed` | `level`, `sentences_built`, `streak_day` | Daily chain session done |
| `free_practice_session` | `sentences_built`, `theme` | Free practice session done |
| `pwp_level_advanced` | `from_level`, `to_level` | Teacher or system advanced pupil |
| `challenge_completed` | `challenge_type`, `source`, `skipped` | Pupil attempted or skipped an extension challenge. `source` mirrors `pwp_challenge_assignments.source`. `skipped: true` if pupil pressed Skip. |

### IP Event Types
| event_type | event_data keys | Meaning |
|---|---|---|
| `lesson_completed` | `lesson_id`, `stars`, `xp_earned` | Lesson finished |
| `world_completed` | `world_id`, `badge_earned` | World boss challenge beaten |
| `badge_earned` | `badge_id`, `badge_name` | Any badge unlocked |
| `streak_milestone` | `streak_days` | 3/7/14/30/60-day streak |

### How sub-apps write events
```typescript
// In sub-app — insert only, never alter schema
await supabase.from('learning_events').insert({
  pupil_id: session.user.id,
  app: 'pwp',
  event_type: 'formula_completed',
  event_data: { level: 12, score: 90, attempts: 2 },
  class_id: pupilSession.classId ?? null,
})
```

---

## The `classes` Table — Extended for All Account Types

The existing `classes` table is extended with `account_type` to support
school, home, and independent teacher classes without separate tables.

```sql
-- Already exists on wrife-website; extended via migration
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'school'
    CHECK (account_type IN ('school', 'home', 'independent_teacher')),
  ADD COLUMN IF NOT EXISTS home_account_id UUID REFERENCES home_accounts(id);
```

| account_type | Who owns it | class_code usage |
|---|---|---|
| `school` | School teacher via wrife.co.uk | Standard school class code |
| `home` | Parent via sub-app direct sign-up | Parent code (used by child to log in) |
| `independent_teacher` | Independent teacher via sub-app | Standard class code |

---

## `home_accounts` Placeholder Table

For direct sign-up parents and independent teachers. Created now so Route C
and D can be built without further schema work.

```sql
CREATE TABLE IF NOT EXISTS home_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type        TEXT NOT NULL CHECK (account_type IN ('parent', 'independent_teacher')),
  email               TEXT NOT NULL UNIQUE,
  display_name        TEXT,
  auth_user_id        UUID REFERENCES auth.users(id),
  stripe_customer_id  TEXT,
  stripe_subscription_id TEXT,
  subscription_tier   TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  subscription_status TEXT DEFAULT 'inactive'
    CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'past_due')),
  app_origin          TEXT CHECK (app_origin IN ('pwp', 'ip')), -- which sub-app they signed up through
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: home account owners can only see their own row
ALTER TABLE home_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_accounts_owner" ON home_accounts
  FOR ALL USING (auth_user_id = auth.uid());
```

---

## `pupil_parent_links` Placeholder Table

For school teachers granting parents visibility into their child's progress
on wrife.co.uk. Separate from Route C — this is for school-enrolled pupils
whose teacher chooses to give parents a view.

```sql
CREATE TABLE IF NOT EXISTS pupil_parent_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id      UUID NOT NULL,            -- school pupil
  parent_email  TEXT NOT NULL,
  access_code   TEXT NOT NULL UNIQUE,     -- teacher-generated, parent uses to claim
  claimed_at    TIMESTAMPTZ,
  parent_auth_id UUID REFERENCES auth.users(id), -- set when parent claims link
  created_by    UUID REFERENCES profiles(id),     -- teacher who created it
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pupil_id, parent_email)
);

ALTER TABLE pupil_parent_links ENABLE ROW LEVEL SECURITY;
-- Teachers can manage links for their class pupils
-- Parents can read links where parent_auth_id = auth.uid()
```

---

## The `← WriFe` Back Button

Show only when the pupil arrived via Route A (hub hash-token):

```typescript
// Run once on app init in both PWP Studio and Interactive Practice:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
    sessionStorage.setItem('entryViaHub', '1')
    window.history.replaceState(null, '', window.location.pathname)
  }
})

// In nav component:
const showBackToHub = sessionStorage.getItem('entryViaHub') === '1'
// Render: <a href="https://wrife.co.uk/pupil/dashboard">← WriFe</a>
```

`sessionStorage` not `localStorage` — clears on tab close so a fresh
direct load never incorrectly shows the back button.

---

## Development Isolation Rules

### Rule 1 — Stay in your lane
When working in `wrifeapp`: only create/alter tables in the PWP-owned list.
When working in `InteractivePracticeApp`: only create/alter tables in the IP-owned list.
When working in `wrife-website`: you may alter any table, but communicate
changes to sub-app owners if shared tables are touched.

### Rule 2 — Cross-repo changes require an explicit plan
If a feature requires changes in more than one repo, complete them in this order:
1. **wrife-website first** — schema changes, new assignment types, new API endpoints
2. **Sub-app second** — consume the new schema / call the new endpoints
3. **Verify** the cross-app checklist before merging either

### Rule 3 — When wrife.co.uk needs updating
A sub-app change triggers a wrife.co.uk change ONLY when:
- A **new assignment type** is needed on the teacher dashboard (e.g., a new PWP mode)
- A **new data point** needs to appear in the teacher's class view
- The **pupil dashboard SSO tile** needs updating (new URL, new label, new feature flag)
- A **new `learning_events` event_type** is introduced (document it here first)

All other sub-app changes (UI, bug fixes, new levels, new activities) are
**self-contained** and do not require wrife.co.uk changes.

### Rule 4 — Standalone mode always works
Both sub-apps must work when `class_id` is null. Every new progress/session
table must have `class_id` nullable. Every upsert must use `pupil_id` as the
sole conflict key when `class_id` is null.

### Rule 5 — Feature parity
Any access pattern supported by one sub-app must be supported by both.
If PWP Studio supports Route C → Interactive Practice must too (and vice versa).
If one app shows a parent progress view → both must.

---

## Assignment System — Who Configures What

| Configured in | Table | What it controls |
|---|---|---|
| `wrife.co.uk` teacher dashboard | `pwp_assignments` | `level_from`, `level_to`, `due_date`, `status` — the WHAT |
| `wrifeapp` (PWP Studio) | `formula_progress`, `pwp_pupil_levels` | The HOW — actual practice engine |
| `wrife.co.uk` teacher dashboard | `ip_assignments` | Which world/lesson range, `due_date` |
| `InteractivePracticeApp` | `pupil_progress`, `pupil_responses` | The HOW — actual lesson engine |

**The wrife.co.uk assignment system says what to do and by when.
The sub-apps handle how it's done and report back via `learning_events`.**

Pupil completion of an assigned range is inferred by wrife.co.uk by querying
`learning_events` for matching `event_type` and `event_data.level` within the
assigned range — wrife.co.uk never reads sub-app internal tables directly.

---

## Google Play Store — Deployment Notes

Each sub-app is a PWA deployable as a TWA (Trusted Web Activity) on Android.
One Vercel build serves all routes (A, B, C, D) — no separate APK per route.

Play Store submission is only needed for:
- Icon / screenshot changes
- New Android permissions
- Major listing copy updates

**Not needed for:** Feature deploys, bug fixes, new levels, schema changes.
Every `git push` to `main` on either sub-app repo updates the live PWA
immediately, and the Play Store TWA picks it up on next app launch.

---

## Cross-App Checklist — Before Shipping Any Change

### Auth / session
- [ ] Route A (hub hash-token): Supabase SDK auto-handles hash on load?
- [ ] Route B (standalone direct login): 3-field form (class code + username + PIN) working?
- [ ] Route C (home learner, parent code): login and all features work with home class?
- [ ] Route D (independent teacher): teacher can log in and see their class?
- [ ] `← WriFe` back button: shown only for Route A?
- [ ] `class_id` nullable: all new tables and upserts handle null class?

### Schema / migrations
- [ ] Migration targets `gzmgjkbtsvezfclmreru` only?
- [ ] Table owned by this repo (not another repo's table)?
- [ ] `class_id` nullable on all new session/progress tables?
- [ ] New RLS policies use `auth.uid()` equality (not string role checks)?
- [ ] If new `learning_events` event_type added, documented in this skill?

### Cross-repo impact check
- [ ] Does this change require a new assignment type on wrife.co.uk? → plan wrife-website change
- [ ] Does this change require a new data point in teacher class view? → plan wrife-website change
- [ ] Does this change require an SSO tile update on pupil dashboard? → plan wrife-website change
- [ ] If none of the above: this change is self-contained ✅

### Post-deploy smoke test (run after every significant deploy)
1. Login at `wrife.co.uk/pupil/login` → SIL42495 / amab04 / 9543 (Amadeo B, Silver Birch Y4)
2. Click "Write →" → `pwp-studio.wrife.co.uk/dashboard` loads authenticated ✅
3. Click "Play →" → `practice.wrife.co.uk/world-map` loads authenticated ✅
4. Both show `← WriFe` back button ✅
5. Login directly at `pwp-studio.wrife.co.uk/login` with SIL42495 / amab04 / 9543 ✅
6. Login directly at `practice.wrife.co.uk/login` with same credentials ✅

---


---

## Known Gotchas — Read Before Touching Auth or Schema

### 1. `profiles.email` must remain nullable — or ALL first-time pupil logins break

**Applied fix:** Migration `make_profiles_email_nullable` ran on 2026-05-08.
```sql
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
```

**Why this matters:**
The `handle_new_user` Postgres trigger fires on every `auth.users` INSERT and
creates a row in `profiles`. The trigger only populates:
`id, first_name, role, membership_tier, is_active, created_at, updated_at`.
It does **not** set `email` — pupils have synthetic emails and the trigger
doesn't know them. If `profiles.email` ever regains a NOT NULL constraint with
no default, the trigger fails → the entire `auth.users` INSERT rolls back →
the pupil auth account is never created → login fails.

**Symptom A — Direct PWP login (Route B):**
`pupil-login` Edge Function returns HTTP 500. LoginPage shows:
"Could not connect. Please try again."

**Symptom B — Hub SSO bounce (Route A):**
wrife.co.uk generates the `#access_token` link correctly. Pupil clicks "Write →".
PWP loads, Supabase SDK fires `SIGNED_IN`. `AuthInitialiser` calls
`fetchProfileWithTimeout` — but no profile row exists (trigger failed on account
creation). `ProtectedRoute` sees `isInitialised && !isLoading && !profile` →
`<Navigate to="/login" />`. Pupil lands on the PWP login page as if SSO never
happened. Same root cause as Symptom A — two different surfaces, one bug.

**Rule:** Any new column added to `profiles` must have a database-level DEFAULT
or be nullable. If a new required field is needed for teacher/admin users,
update the `handle_new_user` trigger at the same time — pupils will always have
sparse profiles and the trigger must cope with that.

---

### 2. `handle_new_user` trigger — what it sets and what it doesn't

```sql
-- Current body (as of 2026-05-08):
INSERT INTO public.profiles
  (id, first_name, role, membership_tier, is_active, created_at, updated_at)
VALUES (
  NEW.id,
  COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
  COALESCE(NEW.raw_user_meta_data->>'role', 'pupil'),
  CASE WHEN school_id IS NOT NULL AND school_id <> '' THEN 'school' ELSE 'free' END,
  true, now(), now()
)
ON CONFLICT (id) DO NOTHING;
```

Fields deliberately **not** set by the trigger: `email`, `last_name`,
`avatar_url`. Any new NOT NULL column added to `profiles` without updating this
trigger will silently break auth-user creation for all four Routes.

---

### 3. Scope of affected pupils at time of fix (2026-05-08)

45 pupils had `auth_user_id IS NULL` (never logged in). All unblocked by the
migration. No orphaned `auth.users` rows were created before the fix — because
the trigger failure rolls back the entire `createUser` call atomically, so
`pupils.auth_user_id` was never written back.

---

## Reference — Supabase Projects

| Project ID | Name | Used for |
|---|---|---|
| `gzmgjkbtsvezfclmreru` | WriFe Platform | ✅ ALL production work — all three apps |
| `rxmitjrbrsqjeymsycoj` | IP Practice (legacy) | ❌ Do not migrate — legacy only |
| `nxhkpqngnxshgotvuujb` | PWP App (legacy) | ❌ Do not migrate — legacy only |

---

## Reference — Test Credentials

| Role | Credentials | Notes |
|---|---|---|
| School pupil | SIL42495 / amab04 / 9543 | Amadeo B, Silver Birch Y4, PWP L15 |
| School teacher | mankrah@kafed.org.uk / niiotin99 | wrife.co.uk teacher dashboard |

---

## Skill Location Note

This skill should be installed as a **global Cowork plugin skill** so it
loads in every WriFe session regardless of which repo is active.

To install globally: copy this file to the WriFe plugin skills folder and
register it in the plugin manifest. Until then, manually invoke it at the
start of any cross-app session.
