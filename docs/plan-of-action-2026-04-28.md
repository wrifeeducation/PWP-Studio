# WriFe PWP — Plan of Action
**Date:** 28 April 2026  
**Raised by:** Michael (teacher at Elfrida Primary School)  
**Status:** In progress

---

## Issue 1 — Onboarding step 2 fails with "An error occurred"

**Root cause (confirmed):**  
`OnboardingPage.tsx` upserts a row into `profiles` using `INSERT...ON CONFLICT DO UPDATE`. PostgreSQL requires an INSERT policy to exist even when the row already exists and the UPDATE path fires. The `profiles` table had UPDATE and SELECT policies but no INSERT policy.

**Fix applied (done):**  
Migration `profiles_own_insert_policy` applied to Supabase:
```sql
CREATE POLICY profiles_own_insert
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());
```

Additionally confirmed that `mankrah@kafed.org.uk` profile already had `first_name = 'Michael'` and `school_id = df22ea96...` (Elfrida Primary School) correctly set from a prior successful school creation in step 1.

**Status: ✅ Fixed — onboarding step 2 should now complete successfully.**

---

## Issue 2 — Login redirects straight to teacher dashboard, bypassing landing page

**Root cause:**  
`HomePage.tsx` (lines 61–66) unconditionally redirects any `session && profile` user to their role dashboard:
```tsx
if (session && profile) {
  if (profile.role === Role.TEACHER) return <Navigate to="/teacher" replace />
  ...
}
```

**Fix:**  
Remove the redirect. When a user is already logged in, show the landing page normally but replace the "Log In / Sign up free" nav buttons with a single "Go to Dashboard →" button that links to the correct role-based route. This means:
- Teachers and admins can see the landing page to demo it to parents and governors
- Users still have a clear, one-click route back to their dashboard
- No disruption to the logged-out flow

**File:** `src/pages/HomePage.tsx`  
**Status: ✅ Implemented in this session.**

---

## Issue 3 — Teacher dashboard missing class and pupil creation

**Root cause:**  
The `classes` and `profiles` tables exist in the DB schema but no UI exists in the teacher dashboard to create classes or manage pupil roster.

Schema available:
- `classes`: id, school_id, name, year_group (1–9), teacher_id, academic_year, created_at
- `profiles.class_id`: links a pupil profile to a class

**Fix — new "My Classes" tab:**  
A new tab added to `TeacherPage.tsx` with two views:

**Class list view:**
- Shows all classes at the teacher's school, with class name, year group, academic year, and pupil count
- "Create class" button opens inline form: class name, year group (1–9), academic year (e.g. 2025/26)

**Class detail view (click into a class):**
- Table of pupils currently in that class (profiles where class_id matches)
- "Add pupil" control: search existing pupil profiles at the school not yet assigned to a class → assign them to this class (updates `profiles.class_id`)
- "Remove" button per pupil (sets `profiles.class_id = null`)

**Note:** Pupil account creation itself is handled via the School Admin panel (`/admin → Manage Users`). The teacher's class management tab is for organising existing pupils into classes.

**File:** `src/pages/TeacherPage.tsx`  
**Status: ✅ Implemented in this session.**

---

## Issue 4 — Teachers need an overview of the full WriFe programme

**Root cause:**  
No programme overview exists. Teachers can assign tasks and see pupil data but have no structured reference to understand what the programme teaches, how it progresses, and what pupils are working towards.

**Fix — new "Programme" tab:**  
A new tab added to `TeacherPage.tsx` with four sections:

### Section 1 — Word Learning
Explains how vocabulary is built into the programme: word banks at each level, word class filtering, and the teacher's ability to customise word banks (via the existing Word Banks tab). Links to the Word Banks tab.

### Section 2 — Formula Practice (Levels 1–67)
Draws from the `formula_levels` table. Displays the 4 phases in collapsible cards:

| Phase | Levels | Year Groups | Focus |
|-------|--------|-------------|-------|
| A | L1–L12 | Years 1–7 | Core sentence patterns: noun/verb through to prepositional phrases |
| B | L13–L20 | Years 5–9 | Extended patterns with adverbs, conjunctions, embedded clauses |
| C | L21–L34 | Years 4–6 | KS2 complexity: relative clauses, fronted adverbials, passive voice |
| D | L35–L67 | Years 5–9 | KS3 sophistication: syntactic embedding, rhetoric, complex subordination |

Each phase card shows its levels with word class patterns (e.g. L1: `noun + verb`). Clicking a level expands its formula elements.

### Section 3 — Paragraph Builder (unlocks at L8)
Explains the LSC scaffold (Lead → Support → Close), the four genre types (Narrative, Non-fiction, Persuasive, Poetry), and what pupils produce in each phase.

### Section 4 — Writing Studio (teacher-assigned)
Explains the extended writing layer: teacher assigns a prompt, pupil writes 400–700 words, AI assesses against NC rubric, teacher can review and override.

**File:** `src/pages/TeacherPage.tsx`  
**Status: ✅ Implemented in this session.**

---

## Remaining known bugs (from E2E report)

| Bug | Severity | Fix |
|-----|----------|-----|
| BUG-001: Hard-navigate to pupil sub-pages redirects to `/dashboard` | Medium | Increase profile fetch timeout to 10s OR persist profile to localStorage |
| BUG-002: New pupils have no `pupil_progress` row — Formula Practice fails | High | Add Postgres trigger on `INSERT INTO profiles` to auto-create row |

These are not addressed in this session but are the next priority after the four issues above.

---

*Plan prepared 28 April 2026*
