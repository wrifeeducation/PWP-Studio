# WriFe PWP Studio
*Last updated: 2026-05-12 · Session 31*

## Current state
PWP Studio is live at https://pwp-studio.wrife.co.uk. All 6 phases of the new PWP system are complete and deployed. Pupils can run a full formula chain → paragraph → quiz session with auto-save/resume. Teachers have a 4-panel dashboard (overview, weekly theme, session review, curriculum positions). Phase 6 added AI subject suggestions, genre-aware AI assessment, and a chain readiness flag. **Note:** `ANTHROPIC_API_KEY` must be set in Supabase project `nxhkpqngnxshgotvuujb` secrets for real AI assessment — all Edge Functions return graceful fallbacks if the key is missing.

## Next steps
1. **Verify `ANTHROPIC_API_KEY`** is set in the PWP App Supabase project (`nxhkpqngnxshgotvuujb`) — run `supabase secrets list --project-ref nxhkpqngnxshgotvuujb`
2. **XP/gamification for PWP sessions** — pupils earn XP on session complete; show on dashboard
3. **Cross-app integration** — surface PWP Studio progress in the main WriFe platform (wrife.co.uk) teacher view

## Key decisions
- **PWP Supabase project:** `nxhkpqngnxshgotvuujb` (separate from WriFe Platform `gzmgjkbtsvezfclmreru`)
- **Deterministic chain generation:** same `highestLesson` → same ordered formula elements — enables safe resume without storing chain in DB
- **Session resume:** queries `pwp_sessions` for today's active session; re-calls `generateChain` (deterministic); reconstructs step states from `pwp_session_steps`; calls `store.resumeSession()` atomically
- **Readiness flag:** ≥80% first-attempt pass rate writes `ready_to_advance=true` to `pwp_pupil_positions`; teacher clearing it by saving a new lesson level resets the flag
- **Subject suggestions:** `pwp-suggest-subjects` Edge Function — reads pupil's recent sessions from DB to avoid repetition, then generates 3 AI noun phrases; fails gracefully to hardcoded fallbacks
- **ESLint react-hooks v5:** `set-state-in-effect` rule active; use derived state or override patterns instead of `useEffect → setState`
- **Teacher→class resolution:** `classes.teacher_id = profile.id` — NOT `profiles.class_id` (that's a pupil field)

## Files & locations
- `src/pages/pwp/PWPSessionPage.tsx` — master session state machine; resume logic; readiness check
- `src/stores/pwpSessionStore.ts` — Zustand store; `resumeSession` action for atomic state restore
- `src/lib/pwp/pwpApi.ts` — wrappers for all 6 PWP Edge Functions
- `src/components/pwp/teacher/PWPTeacherTab.tsx` — 4-panel teacher dashboard; `ready_to_advance` badge
- `src/components/chain/SubjectPicker.tsx` — subject picker with AI suggestions via `themeSuggestions` prop
- `src/components/pwp/paragraph/ParagraphPhase.tsx` — accepts `genreHint` prop, passes to assessParagraphClose
- `supabase/functions/pwp-suggest-subjects/index.ts` — new in Phase 6; generates 3 varied noun suggestions
- `supabase/functions/pwp-assess-step/index.ts` — v2: genre-aware via `genreHint` param
- `supabase/functions/pwp-assess-paragraph-close/index.ts` — v2: genre-aware

## Open questions
- Is `ANTHROPIC_API_KEY` actually set in `nxhkpqngnxshgotvuujb`? Needs verification in Supabase dashboard.
- Old session context (Sessions 25–30) covered a separate Connect Grid / Writing Studio feature set in this same codebase — that work may need reconciling with the new PWP architecture.

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 31 | 2026-05-12 | Phases 1–6 of new PWP system complete. Built: schema, 6 Edge Functions, pupil session UI, teacher dashboard, auto-save/resume, genre direction, AI subject suggestions, chain readiness flag. Fixed Vercel ESLint build failures. |
| 30 | 2026-05-06 | E2E Test 4 passed: full Connect Grid → ParagraphPage → WritingStudio journey verified. Fixed assess-paragraph fallback, paragraph_sessions RLS, React Router state injection. |
| 29 | 2026-05-06 | E2E Test 3 passed: teacher login and programme settings verified. Fixed MyClassesTab infinite spinner. |
| 28 | 2026-05-06 | Wired Connect Grid → Writing Studio; added ProgrammeSettingsPanel; fixed /practice for home learners. |
| 27 | 2026-05-06 | Fixed ParentPage "No linked children" bug: parent_pupil RLS zero-policy issue. |
