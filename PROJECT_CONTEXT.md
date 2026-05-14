# WriFe PWP Studio
*Last updated: 2026-05-14 · Session 34*

## Current state
PWP Studio is live. Session 34 completed voice quality audit, assessment corrections, and PunctuationStep sync fix:

- **FormulaBar** (`step/FormulaBar.tsx`): formula string rendered as colour-coded word-class chips; new elements get a purple dot and outline ring
- **TransitionCallout** (`step/TransitionCallout.tsx`): styled callout for `transition` and `three_stage` step types; shows before→after or numbered three-way list
- **SubjectPrompt**: now shown for all Phase C/D free-write steps (not just word-bank phases)
- **Step audio**: correct TTS key dispatched by `step_type` on step load (`step.new_element_intro`, `step.consolidation_intro`, etc.)
- **LevelCompleteScreen**: confetti particle burst; XP breakdown showing steps XP + "+25 BONUS" row + total; `gamification.xp_25_bonus` and `celebration.level_complete` audio
- **QuizPage**: `XP_PASS_BONUS` raised to 50; `gamification.xp_50_bonus` audio on pass
- **Level titles**: aligned to `LevelTitle` type — levels 20+ all show "Master Composer"; DashboardPage sidebar title follows same thresholds
- **Back button**: "← WriFe Hub" in Dashboard only shown when `sessionStorage.entryViaHub === '1'`
- **GuidancePanel**: XP penalty removed — hints are free; cost badge UI gone
- **Gamification audio**: `xp_10`/`xp_5` on correct answers; `first_correct` once per session; `halfway` at mid-level; `streak_continue`/`streak_broken` and `onboarding.returning_user` on dashboard load
- **7-day streak bonus**: +30 XP per 7-day streak cycle, written to `pwp_progress.total_xp` on dashboard load
- **tts-manifest.ts**: Fully rebuilt — 153 uploaded keys now mapped to `pwp-audio` bucket; legacy `tts-audio` keys retained; all session-33 gamification/step/celebration keys are now ElevenLabs Alistair/Amelia (not browser Web Speech fallback)
- **Voice variety (Alice)**: `generate-pwp-audio.mjs` updated to support Alice voice (`ZEt85AU1ui8Rr8FxNslW`); new SQL entries `cap-step.capitalise` + `cap-step.punctuate` (Alice); script updated with ALICE_VOICE_ID + default path fix
- **PunctuationStep sync bug fixed**: `cap-step.punctuate` (Alice) now fires via `useEffect` watching `phase === 'punctuate'`, guaranteeing buttons are rendered before the prompt plays; `cap-step.capitalise` (Alice) fires on first word added
- **Assessment Edge Function fixed** (`pwp-assess-step`): Replaced SYSTEM_PROMPT with spec-compliant version (5 critical rules: subject freedom, verb freedom, phrasal verb recognition, tense via auxiliary, creative choice validity); added `subject_type`/`tense`/`step_type` params; `subjectNoun` deprecated; response format extended with `error_type`, `error_word`, `tense_found`, `tense_required`
- **9 audio files pending generation** (ElevenLabs sandbox network blocked — needs local run): `punctuation.capitalise_prompt`, `punctuation.end_prompt`, `feedback.error_wrong_order`, `feedback.error_wrong_subject_type`, `feedback.error_extra_element`, `feedback.error_incomplete`, `guidance.adaptive_open`, `cap-step.capitalise`, `cap-step.punctuate`
- All changes TypeScript clean.

## Next steps
1. **Generate 9 pending audio files** (run locally from `wrifeapp/scripts/`):
   ```
   SQL_FILE="/path/to/PWP Formulas/pwp_audio_seed.sql" \
   SUPABASE_SERVICE_ROLE_KEY=<key> \
   node generate-pwp-audio.mjs --upload
   ```
   Then uncomment the 9 pending entries at the bottom of `src/lib/tts-manifest.ts`
2. **Commit and deploy** — commands below
3. **Teacher dashboard enhancements** (separate session, "Large" effort):
   - Traffic light indicators per pupil
   - Reliant flag (pupil always uses hints)
   - Word bank indicator + teacher override
   - Nudge button
4. **Mobile keyboard avoidance for Phase B**: `visualViewport` listener, tray pins top, bank collapses, pull-tab

## Key decisions
- **PWP Supabase project:** `nxhkpqngnxshgotvuujb` (separate from WriFe Platform `gzmgjkbtsvezfclmreru`)
- **Word bank as vocabulary selector:** bank words are never the target sentence — pupils compose original sentences using the palette as inspiration
- **PunctuationStep always at top:** renders a placeholder card when no words chosen yet; stable key `punct-${stepIndex}` prevents remounting on every word tap
- **Tense classification at render time:** `WordBankTenseVariety` uses a `detectTense()` heuristic to split flat `bank_words` into past/present/continuous groups — no DB schema change needed
- **Place/proper noun colours:** `place` = cyan `#0EA5C9`; `proper` = fuchsia `#C026D3`; capitalised words not otherwise classified fall back to `proper`
- **Deterministic chain generation:** same `highestLesson` → same ordered formula elements — enables safe resume without storing chain in DB
- **Hints are free:** XP penalty removed in session 33 — encourages use of guidance system
- **Level titles are fixed:** 1–3 Apprentice, 4–8 Sentence Builder, 9–14 Phrase Crafter, 15–19 Paragraph Writer, 20+ Master Composer

## Files & locations
- `src/pages/pwp/LevelPage.tsx` — master step renderer; FormulaBar, TransitionCallout, SubjectPrompt, confetti, XP bonus, gamification audio
- `src/pages/pwp/DashboardPage.tsx` — world map; entryViaHub gate; streak audio; returning user audio
- `src/pages/pwp/QuizPage.tsx` — XP_PASS_BONUS=50; xp_50_bonus audio
- `src/components/pwp/step/FormulaBar.tsx` — NEW: formula as chips with word-class colours
- `src/components/pwp/step/TransitionCallout.tsx` — NEW: transition/three_stage callout card
- `src/components/pwp/step/SubjectPrompt.tsx` — subject entry (Phase C/D + Phase B L7+)
- `src/components/pwp/step/TypeModeTileInput.tsx` — type mode word-tile builder
- `src/components/pwp/step/PunctuationStep.tsx` — always-visible sentence display
- `src/components/pwp/wordbank/WordBankPhaseA.tsx` — Phase A click-mode bank
- `src/components/pwp/wordbank/WordBankPhaseB.tsx` — Phase B gap-fill with adjective chip bank
- `src/components/pwp/wordbank/WordBankTenseVariety.tsx` — three-tray tense variety UI
- `src/components/pwp/guidance/GuidancePanel.tsx` — hint system (free, no XP cost)
- `src/constants/wordClassColours.ts` — colour system; place + proper classes + detection sets
- `src/lib/tts.ts` — Web Speech fallback; prefers Daniel/Rishi/Google UK voices
- `src/lib/tts-manifest.ts` — 153 ElevenLabs keys (pwp-audio bucket) + legacy tts-audio keys; 9 pending entries commented out
- `scripts/generate-pwp-audio.mjs` — now supports Alice voice; SQL_FILE path updated for current session
- `supabase/functions/pwp-assess-step/index.ts` — corrected SYSTEM_PROMPT; subject_type/tense/step_type params; subjectNoun deprecated
- `supabase/migrations/20260514_reseed_word_bank_l1_to_l6.sql` — applied to production
- `PWP Formulas/pwp_audio_seed.sql` — 162 rows; added cap-step.capitalise + cap-step.punctuate (Alice)

## Open questions
- Is `ANTHROPIC_API_KEY` set in `nxhkpqngnxshgotvuujb`? Needs verification.
- 7-day streak bonus currently writes directly to `pwp_progress.total_xp` — should this go via an Edge Function for auditability?

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 34 | 2026-05-14 | Voice audit: confirmed session-33 keys fell back to Web Speech; rebuilt tts-manifest.ts with 153 pwp-audio keys; added Alice voice to generate script; new cap-step.capitalise + cap-step.punctuate (Alice); fixed PunctuationStep sync bug (useEffect); fixed assessment Edge Function (subject freedom, phrasal verb rules, structural params). TypeScript clean. |
| 33 | 2026-05-14 | Spec gap analysis + full implementation: FormulaBar chips, TransitionCallout, SubjectPrompt C/D, step audio keys, LevelComplete confetti + XP breakdown, quiz XP 50, level title fix, entryViaHub gate, hints free, gamification audio suite, 7-day streak bonus. TypeScript clean. |
| 32 | 2026-05-14 | Word bank spec alignment: removed Phase A tray, PunctuationStep always-visible, Phase B adjective chips, TypeModeTileInput, SubjectPrompt, WordBankTenseVariety, place/proper noun colours, L1–6 bank_words re-seeded. Pushed as d8c7b3c. |
| 31 | 2026-05-12 | Phases 1–6 of new PWP system complete. Built: schema, 6 Edge Functions, pupil session UI, teacher dashboard, auto-save/resume, genre direction, AI subject suggestions, chain readiness flag. Fixed Vercel ESLint build failures. |
| 30 | 2026-05-06 | E2E Test 4 passed: full Connect Grid → ParagraphPage → WritingStudio journey verified. Fixed assess-paragraph fallback, paragraph_sessions RLS, React Router state injection. |
| 29 | 2026-05-06 | E2E Test 3 passed: teacher login and programme settings verified. Fixed MyClassesTab infinite spinner. |
| 28 | 2026-05-06 | Wired Connect Grid → Writing Studio; added ProgrammeSettingsPanel; fixed /practice for home learners. |
