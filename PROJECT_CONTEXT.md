# WriFe PWP Studio
*Last updated: 2026-04-29 · Session 17*

## Current state
The app is live at https://pwp-studio.wrife.co.uk. Admin dashboard has been expanded with a Teachers tab and a fully rebuilt Schools tab. Schools schema now supports quotas, plan tiers, and status. Three new Edge Function actions deployed. All DB changes applied directly to production.

## Pending git push
Run from the wrifeapp folder in terminal:
```
rm -f .git/HEAD.lock .git/index.lock && git add src/pages/AdminPage.tsx src/pages/ParentPage.tsx supabase/functions/admin-action/index.ts supabase/functions/create-child-profile/index.ts supabase/functions/invite-teacher/index.ts supabase/migrations/20260429000002_fix_view_rls_and_parent_policy.sql supabase/migrations/20260429000003_schools_quota_and_status.sql database/rls-policies.sql database/schema.sql && git commit -m "feat: teachers tab, expanded schools tab, quota management, RLS fixes, new edge functions" && git push
```

## Key decisions — Session 17
- **Teachers tab:** Lists all teachers with filter (All / Independent / School-attached). Amber warning banner when independent teachers exist. Actions: invite, assign to school, change tier, reset password, deactivate. "Independent" teachers (school_id = null) are teachers who self-signed-up and aren't linked to any school — they operate on free tier until assigned.
- **Schools tab rebuild:** Card layout replaces flat table. Each card shows: usage bars (teachers/pupils vs quota), plan tier, status badge, contact email. Actions: Set Quota (tier + max_teachers/max_pupils), Invite School Admin (sends Supabase invite → creates school_admin profile + sets schools.admin_user_id), Suspend/Activate.
- **Schools schema:** Added contact_email, subscription_tier, max_teachers, max_pupils, status, admin_user_id, notes to schools table.
- **admin-action new actions:** invite_school_admin, assign_teacher_to_school, set_school_quota, toggle_school_status, change_tier, toggle_active, create_user (all now included).

## School sign-up best practice (recommendation)
The industry-leading approach for EdTech school access management (used by Seesaw, Century Tech, Lexia, Myon):

**Tier structure (recommended for WriFe):**
| Tier | Teachers | Pupils | Price signal |
|------|----------|--------|-------------|
| Trial | 2 | 30 | Free, 30-day |
| Starter | 5 | 150 | £299/year |
| Professional | 20 | 600 | £799/year |
| Enterprise | Unlimited | Unlimited | Custom |

**Recommended school onboarding flow:**
1. School contacts WriFe (email/form) → WriFe admin creates school in Admin Dashboard → sets tier + quota → clicks "Invite School Admin"
2. School admin receives email → clicks link → sets password → lands on `/admin/school` dashboard
3. School admin invites teachers (via Invite Teacher button) → teachers accept invite → set password
4. School admin creates classes and assigns pupils (PIN-based, no email required)
5. WriFe admin monitors usage from Admin → Schools tab (usage bars show teachers/pupils vs quota)

**Self-service school signup (future):** A `/school/signup` page where a school admin enters school name + URN + email → creates a trial account automatically → WriFe admin approves (or auto-approves for trial) → invitation email sent. This requires a school_applications table and an approval workflow — not yet built.

**Access enforcement (to build next):**
- When `profiles` table INSERT fires for role=teacher and school_id is set, check `SELECT count(*) FROM profiles WHERE school_id = X AND role = 'teacher'` against `schools.max_teachers` → block if at limit (enforce in Edge Function, not RLS, to give a good error message)
- Same for pupils vs `max_pupils`
- schools.status = 'suspended' → profiles.is_active = false for all users in that school (batch update via admin-action)

## Key decisions — carried forward
- **RLS recursion fix:** is_school_admin() SECURITY DEFINER + own-row policies
- **View RLS (Session 16):** All 3 views now security_invoker = true
- **Parent read policy (Session 16):** profiles_parent_read added
- **emailRedirectTo fix (Session 15):** Both signUp calls include correct redirectTo
- **invite-teacher (Session 16):** Deployed, fixed redirectTo
- **create-child-profile (Session 16):** Deployed, 6-digit home-pupil PIN scheme
- **Admin email allowlist:** ['mankrah@kafed.org.uk', 'wrife.education@gmail.com', 'miyk99@gmail.com', 'admin@wrife-test.com']
- **Paragraph Builder gate:** Unlocks at L4 mastery

## Test accounts
| Role | Email | Password/PIN | Notes |
|------|-------|-------------|-------|
| School Admin | miyk99@gmail.com | existing | Test Primary School |
| Teacher | teacher@pwptest.com | WriFe2026! | Test Primary School |
| Pupil | pupil-7777@wrife.school | PIN 7777 | Year 5 Oaks class |
| Parent | parent@pwptest.com | WriFe2026! | Linked to Jamie (pupil) |

## Files & locations
- `src/pages/AdminPage.tsx` — Teachers tab + expanded Schools tab (pending git push)
- `src/pages/ParentPage.tsx` — create-child-profile wired up
- `src/pages/LoginPage.tsx` — emailRedirectTo; friendly error messages
- `database/rls-policies.sql` — profiles_parent_read added; all policies match production
- `database/schema.sql` — views updated to security_invoker + teacher scope
- `supabase/migrations/20260429000001_fix_profiles_rls.sql` — Session 14 RLS fix
- `supabase/migrations/20260429000002_fix_view_rls_and_parent_policy.sql` — APPLIED
- `supabase/migrations/20260429000003_schools_quota_and_status.sql` — APPLIED
- `supabase/functions/admin-action/index.ts` — all admin actions (DEPLOYED v3)
- `supabase/functions/invite-teacher/index.ts` — DEPLOYED
- `supabase/functions/create-child-profile/index.ts` — DEPLOYED

## Open questions / next build items
- **Quota enforcement:** Check teacher/pupil count against max on create (Edge Function logic)
- **School self-service signup page** (`/school/apply`) — trial account + approval workflow
- **Class code + username pupil login** — currently PIN-only, no class code validation
- **Next major feature:** Consider which of these is highest priority for the next session

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 17 | 2026-04-29 | Teachers tab built; Schools tab rebuilt with usage bars + quota + invite admin; schools schema expanded; admin-action v3 deployed |
| 16 | 2026-04-29 | Audit-driven fixes: view RLS, profiles_parent_read, invite-teacher deployed, create-child-profile built + deployed, ParentPage wired |
| 15 | 2026-04-29 | Auth review: emailRedirectTo fix, improved error messages, migration for RLS codification |
| 14 | 2026-04-29 | Fixed recursive RLS on profiles — is_school_admin() SECURITY DEFINER function |
| 13 | 2026-04-29 | Fixed App.tsx auth race condition; diagnosed recursive RLS root cause |
| 12 | 2026-04-28 | Built AdminPage, admin-action Edge Function, AuthConfirmPage, UpdatePasswordPage, forgot-password flow |
| 11 | 2026-04-27 | Built DefinitionUnlock component, ParentDashboard, Stripe Edge Functions, parent role + Stripe DB migration |
