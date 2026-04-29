# WriFe PWP Studio
*Last updated: 2026-04-29 · Session 18*

## Current state
The app is live at https://pwp-studio.wrife.co.uk. All recent fixes deployed and confirmed working. Progression model replaced with Duolingo-inspired auto-advance (Phase A complete).

## Progression model (Phase A — LIVE)
**No score gates.** Pupils auto-advance after 3 sessions at any level, regardless of score.
- `MIN_SESSIONS_TO_ADVANCE = 3` in `progressionEngine.ts`
- `shouldAdvance(mastery)` checks `sessions_completed >= 3` only
- Mastery scores still tracked silently in `mastery_tracking` for teacher insight
- WhatsNext screen shows "Level progress" bar — fills toward 3, then says "🚀 Moving to the next level!"
- Paragraph Builder unlocks automatically at L4 (no score gate)

**Phase B (next):** Four practice modes per level (Build → Fill → Correct → Create), rotating variety so 3 sessions don't feel repetitive.
**Phase C (future):** Level decay and spaced repetition review scheduling.

## Admin panel — Access tab (LIVE)
- Universal search-and-upgrade panel (first tab in admin)
- Pupils tab: "Manage" modal includes Membership Tier dropdown + "Save Tier" button
- Access tab: search any user by name or PIN, change tier inline

## Bug fixes deployed (this session)
- **Bug #1 fixed:** Auto-save now works — RLS policies added for pupil writes to mastery_tracking, mastery_events, intervention_log, teacher_notifications
- **Bug #2 fixed:** Dashboard has prominent "Continue" card above learning path
- **Bug #3 fixed:** Formula session now shows "What's Next" screen instead of bouncing to dashboard
- **Mastery gate removed:** Was "5 consecutive sessions ALL ≥ 80" — impossibly strict. Now session-count only.
- **TypeScript fix:** membership_tier union type now includes 'school' (was causing Vercel build failures)

## Alex's account (test pupil)
- Manually advanced to L2 — had 3 sessions at L1 (avg score 77) which meets the new rule
- 415 XP, levels_mastered_count = 1

## Key decisions — carried forward
- **RLS recursion fix:** is_school_admin() SECURITY DEFINER + own-row policies
- **View RLS (Session 16):** All 3 views now security_invoker = true
- **Parent read policy (Session 16):** profiles_parent_read added
- **emailRedirectTo fix (Session 15):** Both signUp calls include correct redirectTo
- **invite-teacher (Session 16):** Deployed, fixed redirectTo
- **create-child-profile (Session 16):** Deployed, 6-digit home-pupil PIN scheme
- **Admin email allowlist:** ['mankrah@kafed.org.uk', 'wrife.education@gmail.com', 'miyk99@gmail.com', 'admin@wrife-test.com']

## Test accounts
| Role | Email | Password/PIN | Notes |
|------|-------|-------------|-------|
| School Admin | miyk99@gmail.com | existing | Test Primary School |
| Teacher | teacher@pwptest.com | WriFe2026! | Test Primary School |
| Pupil | Alex | PIN (see admin) | Now at L2, 415 XP |
| Parent | parent@pwptest.com | WriFe2026! | Linked to Jamie |

## Files changed this session
- `src/lib/progressionEngine.ts` — shouldAdvance uses session count, MIN_SESSIONS_TO_ADVANCE exported
- `src/lib/masteryEngine.ts` — gate threshold lowered (kept for teacher data, not gating)
- `src/components/formula/WhatsNext.tsx` — LevelProgressBar replaces MasteryBar
- `src/pages/AdminPage.tsx` — Access tab + Pupils tier management
- `src/types/index.ts` — membership_tier union includes 'school'
- Supabase migration: fix_pupil_write_rls_policies (APPLIED)

## Open next steps
- **Phase B progression:** Add Fill, Correct, and Create session modes per level (variety within a level)
- **Level decay / review scheduling** (Phase C): Completed levels show "needs review" after 7 days
- **Task #19:** Full automated learning journey test suite still pending
- **Quota enforcement:** Teacher/pupil count vs school max (Edge Function logic)
- **School self-service signup** (`/school/apply`)

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 18 | 2026-04-29 | Bug fixes (#1 RLS, #2 Continue card, #3 WhatsNext); admin tier management; mastery gate replaced with Phase A auto-advance (3 sessions) |
| 17 | 2026-04-29 | Teachers tab built; Schools tab rebuilt with usage bars + quota + invite admin; schools schema expanded; admin-action v3 deployed |
| 16 | 2026-04-29 | Audit-driven fixes: view RLS, profiles_parent_read, invite-teacher deployed, create-child-profile built + deployed, ParentPage wired |
| 15 | 2026-04-29 | Auth review: emailRedirectTo fix, improved error messages, migration for RLS codification |
| 14 | 2026-04-29 | Fixed recursive RLS on profiles — is_school_admin() SECURITY DEFINER function |
| 13 | 2026-04-29 | Fixed App.tsx auth race condition; diagnosed recursive RLS root cause |
| 12 | 2026-04-28 | Built AdminPage, admin-action Edge Function, AuthConfirmPage, UpdatePasswordPage, forgot-password flow |
| 11 | 2026-04-27 | Built DefinitionUnlock component, ParentDashboard, Stripe Edge Functions, parent role + Stripe DB migration |
