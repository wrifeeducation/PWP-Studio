# WriFe PWP Studio
*Last updated: 2026-05-05 · Session 20*

## Current state
The app is live at https://pwp-studio.wrife.co.uk, Phases 1–5 complete and deployed. A complete development specification has been produced (docs/WriFe-PWP-Development-Spec.docx) covering the full 5-layer architecture. The formula chain CL1–CL11 progression is designed and ready to implement. 3 bugs remain open. The Connect Grid planner and Compound/Complex Builder are the next major features to build.

## Critical bugs to fix next (in order)
1. **BUG-005 (CRITICAL):** `checkParagraphMasteryUnlock()` in `progressionEngine.ts` — remove Criterion B (gatePassed) and C (levelsMasteredCount). Unlock at `level >= 4` only. Update the failing unit test.
2. **BUG-002 (HIGH):** No `pupil_progress` row for new pupils — add Postgres trigger on `INSERT INTO profiles` (role=pupil) to auto-create with defaults.
3. **BUG-001 (MEDIUM):** Cold-start hard-navigate redirects — persist profile to localStorage (stale-while-revalidate pattern).

## Key decisions — carried forward
- **Phase A progression:** No score gates. Auto-advance after 3 sessions. checkParagraphMasteryUnlock MUST reflect this (currently broken).
- **TWA approach for Google Play:** Bubblewrap CLI wraps the existing PWA. Needs: 512×512 icon, assetlinks.json, signed AAB.
- **Parent self-service signup:** create-child-profile Edge Function already exists (Session 16). Missing: public /home-signup page.
- **RLS recursion fix:** is_school_admin() SECURITY DEFINER + own-row policies
- **Admin email allowlist:** ['mankrah@kafed.org.uk', 'wrife.education@gmail.com', 'miyk99@gmail.com', 'admin@wrife-test.com']
- **Pedagogical foundation:** Deliberate practice (Ericsson). Assessment = exact word class count, not quality. See docs/WriFe-PWP-Development-Spec.docx §1.
- **Formula chain:** Must follow CL1–CL11 progression in the spec. formulaDefinitions.ts needs complete rewrite.
- **Connect Grid:** 3-column planner (topic sentence / Mc plot / events). Column 2 always impersonal with "Mc" placeholder. Anchor sentence auto-seeds Col 1. Genre-specific row labels.
- **Anchor→topic sentence:** Formula sentence must auto-populate as locked topic sentence in Paragraph Builder via Connect Grid.
- **Phrasal verbs:** Treated as single VERB slot. No separate AUXILIARY_VERB enum needed.
- **Subject noun:** Teacher-configurable guidance — default "choose a place or thing" to avoid person-centred writing.
- **Compound sentences:** Coordinating conjunctions first (and/but/or/so); subordinating unlock at L22/L30 milestones.

## Architecture (5 layers)
1. Formula Chain (L10–L26) — anchor sentence
2. Compound/Complex Builder (L30) — NEW, not yet built
3. Connect Grid Planner (L27–L38) — NEW, not yet built
4. Paragraph Builder (L27–L34) — exists, needs anchor-seeding update
5. Writing Studio (L39–L51) — exists, needs Connect Grid integration

## New DB tables required
- `chain_levels` — replaces formula_levels with CL1–CL11 definitions
- `compound_sessions` — compound/complex sentence submissions
- `grid_sessions` — Connect Grid pupil data per session
- `grid_templates` — teacher-configured Column 2 content per genre/stage

## Test accounts
| Role | Email | Password/PIN | Notes |
|------|-------|-------------|-------|
| School Admin | miyk99@gmail.com | existing | Test Primary School |
| Teacher | teacher@pwptest.com | WriFe2026! | Test Primary School |
| Pupil | Alex | PIN (see admin) | Now at L2, 415 XP |
| Parent | parent@pwptest.com | WriFe2026! | Linked to Jamie |

## Files & locations
- `src/lib/progressionEngine.ts` — fix checkParagraphMasteryUnlock() here
- `src/lib/__tests__/progressionEngine.test.ts` — update failing test here
- `src/lib/chain/formulaDefinitions.ts` — complete rewrite to CL1–CL11
- `src/lib/chain/validateChainSentence.ts` — add exact word class count check
- `supabase/migrations/` — add pupil_progress trigger; grid_sessions; grid_templates; compound_sessions
- `docs/WriFe-PWP-Development-Spec.docx` — CANONICAL SPEC. Read before coding.
- `docs/Complete WriFe Curriculum For Lesson Creation.pdf` — full 67-lesson curriculum
- `docs/Connect Grid Various.docx` — Connect Grid worked examples
- `docs/Adaptation of Rose Blanche pranks.docx` — Mc placeholder / adaptation process example
- `WriFe-PWP-Platform-Review-May2026.docx` — platform review report (Session 19)

## Open questions
- Does wrife.co.uk need SSO handoff to pwp-studio.wrife.co.uk, or is separate login acceptable for now?
- Should the parent self-service signup be at pwp-studio.wrife.co.uk/home-signup or wrife.co.uk/signup?

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 20 | 2026-05-05 | Full pedagogical review with Michael. Complete development spec produced. 5-layer architecture defined: Formula Chain (CL1–CL11 rewrite needed) → Compound/Complex Builder (new) → Connect Grid Planner (new) → Paragraph Builder (anchor-seed update) → Writing Studio. Connect Grid Mc placeholder, W1–W6 scaffolding, genre row labels, adaptation process all documented. Source documents saved to docs/. |
| 19 | 2026-05-05 | Platform review report produced; BUG-005 identified (Paragraph Builder never unlocks under Phase A); Google Play TWA strategy documented |
| 18 | 2026-04-29 | Bug fixes (#1 RLS, #2 Continue card, #3 WhatsNext); admin tier management; mastery gate replaced with Phase A auto-advance (3 sessions) |
| 17 | 2026-04-29 | Teachers tab built; Schools tab rebuilt with usage bars + quota + invite admin |
| 16 | 2026-04-29 | Audit-driven fixes: view RLS, profiles_parent_read, invite-teacher, create-child-profile built + deployed |
| 15 | 2026-04-29 | Auth review: emailRedirectTo fix, improved error messages, RLS codification migration |
