# WriFe PWP Studio
*Last updated: 2026-05-05 · Session 21*

## Current state
The app is live at https://pwp-studio.wrife.co.uk, Phases 1–5 complete and deployed. The Formula Chain rewrite (Phase 2) is complete: `formulaDefinitions.ts` now has CL1–CL11 curriculum-aligned definitions; `parseSentence.ts` merges verb phrases into a single VERB slot; `validateChainSentence.ts` checks word-class COUNT (not raw words) with named error feedback; `SubjectPicker` has teacher-configurable `subjectType` prop; `ChainRow` shows diff badges (`+ADV`, `+PREP`); `SessionComplete` shows "How your chain grew 🌱" with `newElement` labels per row. All changes pass TypeScript with zero errors. Next: deploy Phase 2 to live and verify.

## Next steps
1. **Deploy Phase 2:** push the formula chain rewrite to production (`git add -A && git commit -m "feat(chain): CL1-CL11 rewrite, verb-phrase merge, named validation, diff badges" && git push`)
2. **Phase 2 E2E test:** verify CL1–CL11 loads correctly on live site, verb phrase validation works, exact count feedback fires, SubjectPicker shows correct guidance
3. **Connect Grid planner:** 3-column planner (Mc placeholder, anchor→topic sentence auto-seed) — next major feature per spec §4

## Key decisions — carried forward
- **Phase A progression:** No score gates. Auto-advance after 3 sessions.
- **TWA approach for Google Play:** Bubblewrap CLI wraps the existing PWA. Needs: 512×512 icon, assetlinks.json, signed AAB.
- **Parent self-service signup:** create-child-profile Edge Function exists (Session 16). Missing: public /home-signup page.
- **RLS recursion fix:** is_school_admin() SECURITY DEFINER + own-row policies.
- **Admin email allowlist:** ['mankrah@kafed.org.uk', 'wrife.education@gmail.com', 'miyk99@gmail.com', 'admin@wrife-test.com']
- **Pedagogical foundation:** Deliberate practice (Ericsson). Assessment = exact word class COUNT, not quality. See docs/WriFe-PWP-Development-Spec.docx §1.
- **Formula chain (COMPLETE):** CL1–CL11 rewritten. Verb phrases = single VERB slot. No AUXILIARY_VERB enum. CL4 = properNounSubject flag. CL11 = freeArrangement.
- **SubjectType:** default 'thing' ("Choose a place or thing"). Teacher can set 'person' or 'place' via `subjectType` prop.
- **Diff badges:** `formula.newElement` shown on each ChainRow header (e.g. "+PREP", "+ADJ"). Also shown in SessionComplete growing sentence panel.
- **Connect Grid:** 3-column planner (topic sentence / Mc plot / events). Column 2 always impersonal with "Mc" placeholder. Anchor sentence auto-seeds Col 1. Genre-specific row labels.
- **Anchor→topic sentence:** Formula sentence must auto-populate as locked topic sentence in Paragraph Builder via Connect Grid.
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
- `src/lib/chain/formulaDefinitions.ts` — CL1–CL11 definitions (COMPLETE). Includes `newElement`, `verbPhrase`, `properNounSubject`, `freeArrangement` fields.
- `src/lib/chain/parseSentence.ts` — verb-phrase merging (COMPLETE). AUXILIARIES set + merge loop returns word-class array.
- `src/lib/chain/validateChainSentence.ts` — exact word-class count + named error feedback (COMPLETE).
- `src/components/chain/SubjectPicker.tsx` — subjectType prop ('person'|'place'|'thing'), default 'thing' (COMPLETE).
- `src/components/chain/ChainRow.tsx` — diff badge showing `formula.newElement` in header (COMPLETE).
- `src/components/chain/SessionComplete.tsx` — "How your chain grew 🌱" panel with newElement labels (COMPLETE).
- `src/lib/progressionEngine.ts` — checkParagraphMasteryUnlock() already fixed (Session 21 bug fix).
- `supabase/migrations/` — pupil_progress trigger added (Session 21 bug fix). Still need: grid_sessions; grid_templates; compound_sessions.
- `docs/WriFe-PWP-Development-Spec.docx` — CANONICAL SPEC. Read before coding.
- `docs/Complete WriFe Curriculum For Lesson Creation.pdf` — full 67-lesson curriculum
- `docs/Connect Grid Various.docx` — Connect Grid worked examples

## Open questions
- Does wrife.co.uk need SSO handoff to pwp-studio.wrife.co.uk, or is separate login acceptable for now?
- Should the parent self-service signup be at pwp-studio.wrife.co.uk/home-signup or wrife.co.uk/signup?

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 21 | 2026-05-05 | Phase 2 Formula Chain rewrite: formulaDefinitions.ts → CL1–CL11; parseSentence.ts → verb-phrase merging; validateChainSentence.ts → word-class count + named errors; SubjectPicker → subjectType prop; ChainRow → diff badges; SessionComplete → "How your chain grew" panel. Zero TS errors. |
| 20 | 2026-05-05 | Full pedagogical review. Development spec produced. 5-layer architecture defined. Connect Grid, W1–W6 scaffolding, genre row labels documented. |
| 19 | 2026-05-05 | Platform review report; BUG-005 identified; Google Play TWA strategy documented. |
| 18 | 2026-04-29 | Bug fixes (RLS, Continue card, WhatsNext); admin tier management; Phase A auto-advance (3 sessions). |
| 17 | 2026-04-29 | Teachers tab built; Schools tab rebuilt with usage bars + quota + invite admin. |
