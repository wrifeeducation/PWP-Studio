# WriFe Brand Ecosystem Skill

Use this skill whenever working on **any** WriFe app — PWP Studio, Interactive
Practice, or wrife.co.uk — especially when changes touch authentication, Supabase
schema, navigation, or deployment. It encodes the cross-app architecture discovered
by live testing in May 2026, and the owner's stated intention for how all apps
should function.

---

## The Three Apps

| App | URL | Stack | Role |
|-----|-----|-------|------|
| **WriFe Platform** | `wrife.co.uk` | Next.js (separate repo) | Central hub — pupil login, dashboard, assignments |
| **PWP Studio** | `pwp-studio.wrife.co.uk` | React/Vite (this workspace) | Progressive Writing Practice |
| **Interactive Practice** | `practice.wrife.co.uk` | React/Vite (separate repo) | 61-lesson grammar game |

All three share **one** Supabase project: `gzmgjkbtsvezfclmreru` (WriFe Platform).

---

## Owner Intent — Both Sub-Apps Must Function the Same Way

> "My intention is for Interactive Practice and PWP to function similarly."

This means **every access pattern supported by PWP Studio must also be supported
by Interactive Practice**, and vice versa. When building or reviewing either app:

- If PWP Studio supports direct sign-up → Interactive Practice must too
- If Interactive Practice supports school hub entry → PWP Studio must too
- If one app shows a "← WriFe" back button → both must
- Standalone mode (no class) must work in both apps

Interactive Practice already signals this: its sidebar shows a **"Join a Class"**
option, confirming it is designed for standalone use without a pre-assigned class.

---

## The Three Login Routes (Identical for Both Sub-Apps)

### Route A — Via wrife.co.uk hub (school SSO)

```
1. Pupil logs in at wrife.co.uk/pupil/login
   class_code + username + PIN

2. wrife.co.uk POST /api/pupil/login
   → validates `pupils` table in gzmgjkbtsvezfclmreru
   → creates Supabase Auth session (synthetic email: pupil-{uuid}@practice.wrife.co.uk)
   → JWT: { pupil_id, role: "pupil", email_verified: true }

3. Pupil dashboard at wrife.co.uk/pupil/dashboard
   → Shows app tiles: Interactive Practice, PWP Studio, Daily Writing

4. Each tile link embeds JWT in URL hash:
   https://pwp-studio.wrife.co.uk/dashboard
     #access_token=<JWT>&refresh_token=<token>&token_type=bearer&expires_in=3599

   https://practice.wrife.co.uk
     #access_token=<SAME JWT>&refresh_token=<SAME token>...

5. Pupil clicks through → new tab, Supabase SDK auto-detects hash
   → setSession() called automatically → pupil authenticated instantly
   → "← WriFe" back button shown in both apps
```

### Route B — Directly on the sub-app (standalone / Play Store TWA)

```
1. Pupil visits pwp-studio.wrife.co.uk/login
   OR practice.wrife.co.uk/login
   (or arrives via Google Play Store TWA)

2. Enters same credentials: class_code + username + PIN
   → Same `pupils` table, same gzmgjkbtsvezfclmreru backend
   → Session stored in localStorage (key: pupilSession)
   → No wrife.co.uk involved

3. No "← WriFe" back button shown
```

### Route C — Direct sign-up (home learner, no school)

```
1. Parent signs up at pwp-studio.wrife.co.uk/home-signup
   OR practice.wrife.co.uk/home-signup (to be built for IP)

2. Creates child account → class_id = NULL throughout
   → Child logs in with username + PIN only (no class code)

3. Subscription/payment applies (Stripe) — not a school-managed account
```

**Key fact:** The same pupil credentials (class_code + username + PIN) work on
wrife.co.uk AND directly on pwp-studio.wrife.co.uk AND directly on
practice.wrife.co.uk — because all three hit the same `pupils` table in the
same Supabase project. Route is just about which app processes the login.

---

## Supabase Schema — Two Pupil Tables

| Table | Used by | Key columns |
|-------|---------|-------------|
| `pupils` | wrife.co.uk Next.js API routes | `id`, `first_name`, `last_name`, `username`, `password_hash`, `class_id` (integer), `auth_user_id` |
| `profiles` | PWP Studio + Interactive Practice Supabase client | `id` (= auth.uid()), `role`, `display_name`, `pin_code`, `class_id` (uuid, nullable) |

`pupils.auth_user_id` = `profiles.id` = `auth.uid()` — same UUID, different tables.

**Rule:** Sub-app migrations and RLS policies use `profiles`.
wrife.co.uk API routes use `pupils`. Never mix them.

---

## RLS Policies — Works for All Three Routes

`auth.uid()` resolves to the same pupil UUID regardless of login route.
All RLS policies work identically across all three routes.

```sql
-- Correct — works for hub SSO, standalone, and home learner:
CREATE POLICY "pupils_own_progress" ON pwp_pupil_levels
  FOR ALL USING (pupil_id = auth.uid());

-- Wrong — avoid string role checks in sub-app policies:
-- USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pupil'))
```

---

## The `← WriFe` Back Button

Show only when the pupil arrived via the hub (Route A):

```typescript
// Detect hash-token entry and set a sessionStorage flag:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
    sessionStorage.setItem('entryViaHub', '1')
    window.history.replaceState(null, '', window.location.pathname)
  }
})

// In nav component (both PWP Studio and Interactive Practice):
const showBackToHub = sessionStorage.getItem('entryViaHub') === '1'
// <a href="https://wrife.co.uk/pupil/dashboard">← WriFe</a>
```

`sessionStorage` not `localStorage` — clears when tab closes, so a fresh
direct-load tab never incorrectly shows the back button.

---

## Standalone Mode — class_id Must Be Nullable Everywhere

Both sub-apps must work when a pupil has no class (Route C home learners, or
Route B pupils who haven't joined a class yet).

- `class_id` must be nullable on ALL session/progress tables in both apps
- Upsert logic must use `pupil_id` alone as the conflict key when `class_id` is null
- Teacher dashboard queries filter by `class_id` naturally — direct learners
  are simply invisible to school dashboards, which is correct behaviour
- Interactive Practice's "Join a Class" sidebar option handles class association
  after sign-up — this is the correct pattern for both apps

---

## Deployment — One Build, All Audiences

Each sub-app deploys to one Vercel project. Every `git push` to `main` updates:
- ✅ Home learners (Route C)
- ✅ Standalone school pupils (Route B)
- ✅ School pupils via hub (Route A)
- ✅ Google Play Store TWA (wraps the live PWA URL — no separate build needed)

Play Store submission only needed for: icon/screenshot changes, new Android
permissions, major listing updates. NOT for feature or bug fix deploys.

---

## Cross-App Checklist — Before Shipping Any Change

### Auth / session
- [ ] Route A (hub hash-token): Supabase SDK auto-handles hash on load?
- [ ] Route B (standalone direct login): localStorage session working?
- [ ] Route C (home learner, null class_id): login and all features work?
- [ ] `← WriFe` back button: shown only for Route A, not B or C?

### Schema / migrations
- [ ] Migration targets `gzmgjkbtsvezfclmreru` (not `nxhkpqngnxshgotvuujb`)?
- [ ] `class_id` nullable on all new session/progress tables?
- [ ] Tables shared with wrife.co.uk tested: `classes`, `profiles`, `school_admins`,
  `schools`, `subscriptions`, `pwp_assignments`, `dwp_assignments`?
- [ ] New RLS policies use `auth.uid()` equality, not string role checks?

### Parity check (applies to both PWP Studio and Interactive Practice)
- [ ] Feature works via hub (Route A)?
- [ ] Feature works standalone (Route B)?
- [ ] Feature works for home learner (Route C)?
- [ ] Both apps handle the scenario identically?

### Post-deploy smoke test
1. Login at `wrife.co.uk/pupil/login` (SIL42495 / amab04 / 9543 — Amadeo B)
2. Click "Write →" → pwp-studio.wrife.co.uk/dashboard lands authenticated ✅
3. Click "Play →" → practice.wrife.co.uk/world-map lands authenticated ✅
4. Both show `← WriFe` back button ✅
5. Login directly at pwp-studio.wrife.co.uk/login with same credentials ✅
6. Login directly at practice.wrife.co.uk/login with same credentials ✅

---

## Supabase Project Reference

| Project ID | Name | Status |
|------------|------|--------|
| `gzmgjkbtsvezfclmreru` | WriFe Platform | ✅ All three apps — auth + all data |
| `rxmitjrbrsqjeymsycoj` | wrife-interactive-practice | IP lesson/world content (separate) |
| `nxhkpqngnxshgotvuujb` | WriFe PWP App | ⚠️ Seed/test data only — never migrate here |

---

## Quick Reference

| Action | Where | Detail |
|--------|-------|--------|
| Pupil login (hub → PWP) | wrife.co.uk → `#access_token` hash | Supabase SDK auto-handles |
| Pupil login (hub → IP) | wrife.co.uk → `#access_token` hash | Same JWT, same mechanism |
| Pupil login (direct) | pwp-studio or practice `/login` | Same credentials, localStorage |
| Home learner sign-up | `/home-signup` on each sub-app | class_id = NULL |
| Class settings | wrife.co.uk teacher portal | `classes.w_level`, `classes.active_genre` |
| PWP progress | pwp-studio | `pwp_pupil_levels`, `formula_sessions` |
| IP progress | practice | `pupil_progress`, `pupil_responses` (rxmitjrbrsqjeymsycoj) |
| Test pupil | SIL42495 / amab04 / 9543 | Amadeo B, Silver Birch, Year 4 |
| Test teacher | teacher@pwptest.com / TestPassword123! | Test Class (TESTCLS), Year 3 |
