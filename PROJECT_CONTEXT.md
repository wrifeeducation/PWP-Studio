# WriFe PWP Studio
*Last updated: 2026-04-29 · Session 15*

## Current state
The app is live at https://pwp-studio.wrife.co.uk. Sign-in works for existing users (miyk99@gmail.com confirmed signing in today). Three auth bugs have been fixed in this session and are pending a `git push` to deploy: missing `emailRedirectTo` in signUp calls (the primary new-user signup blocker), raw Supabase error messages shown on duplicate signup, and stale RLS documentation. The production DB is healthy — all users have profiles, `handle_new_user` trigger fires on signup, and RLS policies are clean.

## Next steps
1. **Run `git push`** — the 3 changed files are staged and committed locally; push to GitHub to trigger Vercel redeploy (see deploy commands above)
2. **Test new teacher sign-up end-to-end** — sign up with a fresh email, check confirmation email arrives and links to `/auth/confirm`, verify redirect to `/teacher` after confirming
3. **Verify Supabase Site URL** — in Supabase Dashboard → Auth → URL Configuration, confirm Site URL is `https://pwp-studio.wrife.co.uk` and `/auth/confirm` is in the Redirect URL allowlist

## Key decisions
- **RLS recursion fix:** `is_school_admin()` SECURITY DEFINER function + own-row policies (`id = auth.uid()`) + classes-join for teacher visibility — eliminates all profiles→profiles recursion
- **emailRedirectTo fix:** Both teacher and parent `signUp` calls now pass `emailRedirectTo: ${window.location.origin}/auth/confirm` so confirmation links always match the live domain
- **Admin email allowlist:** `['mankrah@kafed.org.uk', 'wrife.education@gmail.com', 'miyk99@gmail.com', 'admin@wrife-test.com']` in `admin-action` Edge Function
- **Paragraph Builder gate:** Unlocks at L4 mastery (not L8) per adaptive progression plan
- **Pupil login:** PIN-only (synthetic `pupil-${pin}@wrife.school` email) — works for seeded test data; class code + username flow not yet implemented

## Files & locations
- `src/pages/LoginPage.tsx` — signUp calls now include `emailRedirectTo`; friendly error messages for duplicate/rate-limit cases
- `database/rls-policies.sql` — updated to match production (non-recursive policies, `is_school_admin()` helper)
- `supabase/migrations/20260429000001_fix_profiles_rls.sql` — codifies the Session 14 RLS fix for reproducible DB setup
- `src/App.tsx` — AuthInitialiser with `setLoading(true)` race-condition fix (deployed)
- `supabase/functions/admin-action/index.ts` — handles create_school, delete_user, update_role, reset_password, find_user_email

## Open questions
- Is Supabase Dashboard → Auth → URL Configuration set to `https://pwp-studio.wrife.co.uk`? (required for confirmation emails to work)
- Pupil login uses PIN-only synthetic email — does this scale once real pupils are added? (class code + username not yet built)

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 15 | 2026-04-29 | Auth review: found emailRedirectTo missing from signUp (primary signup bug); improved error messages; updated rls-policies.sql + added migration to codify Session 14 RLS fix |
| 14 | 2026-04-29 | Fixed recursive RLS on `profiles` — dropped recursive school_admin policies, created `is_school_admin()` SECURITY DEFINER function, recreated policies |
| 13 | 2026-04-29 | Fixed App.tsx auth race condition (`setLoading(true)` before profile fetch); diagnosed real root cause as recursive RLS 500s |
| 12 | 2026-04-28 | Built AdminPage, admin-action Edge Function, AuthConfirmPage, UpdatePasswordPage, forgot-password flow; fixed ProtectedRoute blank screen |
| 11 | 2026-04-27 | Built DefinitionUnlock component, ParentDashboard, Stripe Edge Functions, parent role + Stripe DB migration |
