# WriFe Platform — Cross-App Status
> **Read this at the start of any WriFe session before writing code.**
> This file is mirrored in all three repos. Update all copies when a major feature lands.
> Last updated: 2026-05-07 · Session 25

---

## Quick Reference — Three Apps, One Database

| App | URL | Folder | Stack |
|-----|-----|--------|-------|
| **wrife.co.uk** | https://wrife.co.uk | `wrife-website` | Next.js 14, App Router, Tailwind |
| **pwp.studio.wrife.co.uk** | https://pwp.studio.wrife.co.uk | `wrifeapp` | Vite + React 18, Zustand, React Query |
| **practice.wrife.co.uk** | https://practice.wrife.co.uk | `InteractivePracticeApp` | Vite + React 18, Zustand, React Query |

**All three apps share one Supabase project: Platform DB `gzmgjkbtsvezfclmreru`**
Auth is unified — a user account created on any app works on all three.

---

## User Roles (`profiles.role`)

| Role | App(s) | Auth method |
|------|--------|-------------|
| `pupil` | All | Class code + username + 4-digit PIN → `localStorage.pupilSession` |
| `teacher` | wrife.co.uk, wrifeapp, IP app | Email + password → Supabase cookie |
| `school_admin` | wrife.co.uk | Email + password → Supabase cookie |
| `admin` | wrife.co.uk (`/admin`) | Email + password, dark portal |
| `parent` | wrifeapp only | Email + password → Supabase cookie |

**Critical:** The role lives in `profiles.role`, NOT in the JWT. Always fetch the profile after sign-in.

---

## Login Routes — Current Status

| Route | Description | Status |
|-------|-------------|--------|
| **A** | School pupil → class code + username + PIN | ✅ All three apps |
| **B** | Teacher/admin → email + password | ✅ All three apps |
| **C** | Parent home sign-up → `/home-signup` → Stripe → child provisioned | ✅ wrifeapp + IP app (IP redirects to wrifeapp pricing) |
| **D** | Independent teacher sign-up on sub-apps | ❌ Not built |

---

## Feature Status Matrix

| Feature | wrife.co.uk | wrifeapp (PWP Studio) | IP app (Practice) |
|---------|------------|----------------------|-------------------|
| Teacher dashboard | ✅ Full (6 tabs) | ✅ Basic | — |
| Pupil dashboard | ✅ Full | ✅ Full | — |
| IP lesson play (61 lessons) | — | — | ✅ Full |
| World map + boss challenges | — | — | ✅ Full |
| PWP formula practice (L1–L67) | — | ✅ Full | — |
| PWP daily chain practice | — | ✅ Full | — |
| PWP free practice | — | ✅ Full | — |
| Connect Grid (L27–34 planner) | — | ✅ Full | ✅ Full |
| Paragraph builder (LSC scaffold) | — | ✅ Full | — |
| Writing studio (AI assessment) | ✅ DWP | ✅ Full | — |
| Teacher assignments (IP+PWP+DWP) | ✅ Full | ✅ PWP only | — |
| Stripe subscriptions + parent dashboard | — | ✅ Full | — |
| Home sign-up (/home-signup) | — | ✅ Live | ✅ Live (cross-origin to wrifeapp) |
| Badge system | ✅ | ✅ | ✅ |
| Streak tracking | ✅ | ✅ | ✅ |
| School admin analytics | ✅ | — | — |
| SSO pupil deep-links | ✅ | — | — |
| Progress Report (Word doc) | ✅ | — | — |

---

## Platform DB — Key Tables

```
profiles              — all users; role = pupil|teacher|school_admin|admin|parent
schools               — school records (school_admin owns)
classes               — teacher classes; account_type = 'school' | 'home'
class_members         — pupil ↔ class links
pupils                — PIN auth records (INTEGER id, class_id is INTEGER — legacy, no FK to classes.id)
parent_pupil          — parent → child links (wrifeapp B2C flow)
streaks               — daily streak per pupil
badge_definitions     — 80 badge types across all apps
pupil_badges          — awarded badges per pupil

-- IP app tables
lessons               — 61 lesson metadata (world, name, tier info)
activities            — 432+ activities (mc, write, match, fillblank, checklist)
pupil_progress        — lesson completion + stars per pupil

-- wrifeapp tables
formula_progress             — PWP formula sessions (L1–L67)
pwp_chain_sessions/sentences — daily chain practice
pwp_free_practice_sentences  — free practice sentences
paragraph_sessions/sentences — LSC paragraph builder
writing_pieces               — writing studio submissions
subscriptions                — Stripe subscription state
lesson_assignments / pwp_assignments / dwp_assignments — teacher-set tasks

-- Future cross-app visibility layer (schema exists, not yet wired)
home_accounts         — B2C home accounts for cross-app visibility
pupil_parent_links    — links home_accounts to pupils
learning_events       — cross-app activity log
```

**Known schema gotcha:** `pupils.class_id` is `INTEGER` (legacy). `classes.id` is `UUID`. Never join them directly — use `classes.home_account_id` or `class_members` instead.

---

## Edge Functions

| Function | Project | Purpose |
|----------|---------|---------|
| `pupil-login` | Platform DB | Class code + username + PIN auth; returns Supabase tokens |
| `stripe-checkout` | wrifeapp | Creates Stripe checkout session |
| `stripe-webhook` | wrifeapp | Handles subscription events; updates `profiles.membership_tier` |
| `stripe-portal` | wrifeapp | Opens Stripe Customer Portal for plan management |
| `create-child-profile` | wrifeapp | Provisions child auth account + home class after Stripe payment |
| `assess-formula` | wrifeapp | gpt-4o-mini formula validation |
| `assess-paragraph` | wrifeapp | gpt-4o-mini paragraph assessment |
| `assess-writing` | wrifeapp | gpt-4o full writing rubric scoring |
| `invite-teacher` | wrifeapp | Teacher onboarding email via Resend |

---

## Cross-App Conventions (never break these)

- **One Supabase client** — always `src/lib/supabase.ts` singleton. Never import `@supabase/supabase-js` in components.
- **No hardcoded hex** — CSS variables everywhere (`var(--color-brand-primary)` etc.). Exception: wrifeapp's `HomePage.tsx` uses inline `C` object for the landing page.
- **TypeScript strict** — `npx tsc -b --noEmit` before every push. Zero errors required.
- **Pool max: 2** — `lib/db.ts` in wrife-website MUST stay at `max: 2`. Free-tier Supabase exhausts at higher values.
- **Pupil session** — `localStorage.getItem('pupilSession')` only. Never a Supabase cookie for pupils.
- **Pending child** — `sessionStorage.getItem('wrife_pending_child')` — written by home-signup, read by ParentPage.
- **Profile cache** — `localStorage.getItem('wrife_profile_v1')` in wrifeapp for stale-while-revalidate auth.
- **Admin login** — `window.location.replace('/admin')` not `router.push` (forces middleware cookie re-read).
- **IP app UserRole type** — only `'pupil' | 'teacher' | 'admin'`. No parent. Don't add it — parents use wrifeapp.

---

## What's NOT Built Yet

1. **Route D** — Independent teacher sign-up on sub-apps (wrifeapp + IP)
2. **`learning_events` writes** — IP and wrifeapp should INSERT events on lesson/formula completion (schema exists, no writes yet)
3. **Parent dashboard on IP app** — parents use pwp.studio.wrife.co.uk for everything post-signup
4. **Class-free pupil login** — home learners still get an auto-generated class code (school-pupil model reused)
5. **Play Store submission** — schema-ready but not submitted

---

## Recommended Cross-App Workflow

### Session start (every session, no exceptions)
1. Run the **`wrife-supabase-health`** skill — wakes paused projects before any code runs
2. Read this file (`PLATFORM_STATUS.md`) — know what's built, what's not, and which app owns what
3. Read the repo's `PROJECT_CONTEXT.md` — current sprint state and recent decisions
4. Read the repo's `CLAUDE.md` — coding conventions and file structure

### When working across multiple apps
- **Work one app at a time.** Never interleave edits across repos in a single session — git state gets confused.
- **Dependency order:** Platform DB schema → wrife-website API routes → wrifeapp → IP app. If a table needs to change, do it first before touching any frontend.
- **Cross-origin features (like Route C):** Build on the source app first (e.g. IP app `HomeSignupPage`), then update the receiver (e.g. wrifeapp `PricingPage`). TypeScript-check and commit each repo separately before moving on.
- **Shared Edge Functions:** If a function on Platform DB needs changing (e.g. `pupil-login`), flag it explicitly — both IP app and wrifeapp call it.

### Commit discipline
- One logical commit per repo per session. Message format: `feat(scope): description`
- Always run `npx tsc -b --noEmit` before staging. Fix all errors — don't push with TypeScript failures.
- Never commit `.env`, `.env.local`, or secrets.

### Updating this file
Update `PLATFORM_STATUS.md` (in all three repos) when:
- A feature row in the matrix changes state (built / not built)
- A new table or Edge Function is added
- A cross-app convention is agreed or changed
- A new "gotcha" is discovered

Copy the updated file to all three repo roots to keep them in sync.

---

## Test Credentials

| Role | Details |
|------|---------|
| Pupil | Amadeo B · Silver Birch Y4 · Class code: SIL42495 · Username: amab04 · PIN: 9543 |
| Teacher | mankrah@kafed.org.uk / niiotin99 |
| Parent | Create fresh via `/home-signup` with Stripe test card `4242 4242 4242 4242` |
