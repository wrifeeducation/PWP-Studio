# WriFe PWP — Complete Rebuild Work Plan
**Source of truth:** `PWP_App_Build_Prompt.md` (uploaded May 2026) + PWP Formulas folder  
**Supabase project:** `gzmgjkbtsvezfclmreru` (WriFe Platform) — the ONLY valid target  
**Deployment target:** `pwp-studio.wrife.co.uk`  
**Status:** Awaiting execution

> ⚠️ **IGNORE all previous PWP documentation in this repo.** This plan supersedes everything.  
> The authoritative specification is the uploaded `PWP_App_Build_Prompt.md` and the 6 reference files in the PWP Formulas folder.

---

## Missing Reference File — Flag Before Starting

`PWP_Voice_Asset_Handoff.md` is referenced in the build prompt (Section 13) but is **not present** in the PWP Formulas folder. This file contains the full 153-audio trigger map. Request it from Michael before Phase 14 (audio integration).

---

## Framework Decision Required

The build prompt (Section 2) requires confirmation on framework before scaffolding:
- **Option A:** Next.js 14 App Router (what the spec was written for)
- **Option B:** React + Vite (what the existing wrifeapp repo uses)

Ask Michael to confirm before starting Phase 1.

---

## Build Phases (19 phases — follow in order)

### Phase 0 — Read all skills and reference files
**Before writing any code:**
1. Invoke `wrife-supabase-health` skill
2. Invoke `wrife-brand-ecosystem` skill  
3. Invoke `wrife-app-architecture` skill
4. Read all 6 files from PWP Formulas folder:
   - `PWP_35Level_v3_DRAFT.docx`
   - `PWP_App_Design_Vision.md`
   - `PWP_Word_Bank_Design.md`
   - `PWP_Voice_Asset_Handoff.md` ← **MISSING — request from Michael**
   - `pwp_audio_seed.sql`
   - `pwp_dashboard_redesign.html`

---

### Phase 1 — Scaffold fresh project
Framework: Next.js 14 App Router OR React + Vite (confirm with Michael).

Stack:
- TypeScript
- Tailwind CSS (core utilities only — no JIT compiler assumed)
- Framer Motion
- Supabase JS client — project `gzmgjkbtsvezfclmreru` ONLY
- React Query (`@tanstack/react-query`)
- Zustand (global state: XP, streak, word bank phase, audio last-played index)
- Vercel project connected to new repo

Brand CSS tokens to configure:
```css
--color-primary:      #6C5CE7
--color-primary-soft: #a29bf5
--color-primary-pale: #EDE9FE
--color-orange:       #F5A623
--color-gold:         #F5C500
--color-teal:         #00b894
--color-cream:        #FDF8EE
--color-text:         #2D3436
```

Word-class chip colours:
```
Determiner:  #3B82F6  (D)
Noun:        #6C5CE7  (N)
Verb:        #F97316  (V)
Adjective:   #22C55E  (Adj)
Adverb:      #00b894  (Adv)
Pronoun:     #F43F5E  (Pro)
Preposition: #6B7280  (Prep)
Conjunction: #EAB308  (Conj)
```

---

### Phase 2 — Database migrations (gzmgjkbtsvezfclmreru ONLY)

Run in order:
1. `pwp_audio_seed.sql` — creates + seeds `pwp_audio_assets`
2. `ALTER TABLE formula_progress` — add gamification columns with `NOT NULL DEFAULT`:
   - `total_xp`, `streak_days`, `last_active_date`, `word_bank_phase_override`
   - `highest_level_reached`, `current_pwp_level_id`, `current_pwp_step_id`
3. Create new tables (all with nullable `class_id`):
   - `pwp_levels`, `pwp_steps`, `pwp_word_bank_config`
   - `pwp_quizzes`, `pwp_quiz_prompts`
   - `pwp_step_attempts`, `pwp_quiz_attempts`
   - `pwp_badges`, `pwp_pupil_badges`
4. Create all indexes
5. Seed 5 badge rows

**NEVER** target `rxmitjrbrsqjeymsycoj` or `nxhkpqngnxshgotvuujb`.  
**NEVER** alter/drop tables owned by wrife.co.uk (`home_accounts`, `classes`, `pupils`, `profiles`, `learning_events`).

---

### Phase 3 — Seed 35 levels + steps + 13 quizzes

Source: `PWP_35Level_v3_DRAFT.docx`

- 35 levels → `pwp_levels` (with `word_bank_phase`, `is_paragraph_phase` for L31–35)
- All steps per level → `pwp_steps` (formula, step_type, example, subject_prompt, target_sentence)
- 13 quizzes inserted after levels: 3, 6, 9, 13, 15, 18, 19, 21, 23, 25, 28, 30, 35
- Quiz prompts (4–6 each) → `pwp_quiz_prompts`
- **Total path nodes: 48** (35 levels + 13 quizzes)

Subject consistency rules:
- Bare noun formula → subject = **Sam**
- Det+noun formula → subject = **The boy**
- Pronoun formula → subject = **He** or **She**
- Transition steps → type `transition`
- Three-stage steps → type `three_stage`

---

### Phase 4 — Seed word bank config

Populate `pwp_word_bank_config` for all steps:

| Phase | Levels | Bank contents | Gaps |
|-------|--------|---------------|------|
| A | 1–6 | All words + 2 distractors | None |
| B | 7–19 | Known elements only | New element(s) as gap_slots |
| C/D | 20–35 | Nothing (null) | None |

- Multiple gaps: L9 `[ADJ₁][ADJ₂]`, L13 `[ADV-manner][ADV-time][ADV-place]`
- Distractors removed from L13 onward
- Three-stage steps: Sam/The boy/He as chips (context chips greyed)
- Tense-variety steps: three verb forms in bank

---

### Phase 5 — Authentication (4 login routes)

| Route | User type | Entry point |
|-------|-----------|-------------|
| A | School pupils | Hash-token SSO from wrife.co.uk → set `sessionStorage.entryViaHub` |
| B | RETIRED for school pupils | `/login` detects school pupils → redirect to wrife.co.uk/pupil/login |
| C | Home learners | `parent_code + username + PIN` via Edge Function |
| D | Independent teachers | `class_code + username + PIN` |

← WriFe button: show only when `sessionStorage.entryViaHub === '1'` (cleared on tab close).

---

### Phase 6 — Dashboard and learning path

**Sidebar:**
- Avatar with XP progress ring
- Pupil name + level title (based on `highest_level_reached`)
- XP ⭐ (gold), Streak 🔥 (orange), Levels Done 📖
- Weekly streak calendar (7 dots: orange=done, gold fire=today, grey=missed)
- Badges panel (earned + greyed silhouettes)

**Main panel:**
- Quick Resume button (pinned top, purple pill)
- 48-node vertically scrollable path
- Node pulse animation: Framer Motion `scale: [1, 1.08, 1]` 2s loop on current node
- Chapter cards between groups with grammar pill tags + X/Y counter
- Auto-scroll to current level on load
- Use `pwp_dashboard_redesign.html` as visual reference

**Node types:**
| Type | Colour | Icon |
|------|--------|------|
| Formula level (active) | `#6C5CE7` | ✏️ + pulse ring |
| Formula level (complete) | `#a29bf5` | ✓ tick |
| Formula level (locked) | `#EDE9FE` | 🔒 |
| Paragraph phase level | `#00b894` | stacked lines + P badge |
| Quiz (locked) | Pale gold | ⭐ hollow |
| Quiz (unlocked) | `#F5A623` | ⭐ glow |
| Quiz (passed) | Gold dashed ring | ⭐ hollow gold |

---

### Phase 7 — Step screen (Phase C/D free writing — validate core loop first)

Layout (top to bottom):
1. Header bar (level + title, step N of X, XP so far, back arrow)
2. Formula bar (colour-coded chips, grey=known, purple highlight=new, ★ dot)
3. Transition callout (conditional — cream card, purple left border)
4. Subject chip (amber, read-only)
5. Free writing area (Phase C/D) — white card, min 18px, 2px purple focus ring
6. "Need a hint?" text-link (subtle)
7. Submit button (purple pill, full-width mobile)

Fire step-type audio on load via `usePWPAudio`.

---

### Phase 8 — Feedback screen

Three states (all Framer Motion slide-up):

**Correct (1st attempt):** Green card, +10 XP gold, grammar insight, Next step →, round-robin `feedback.correct_v1–v12`  
**Correct (retry):** Amber card, +5 XP, encouragement, same insight, round-robin `feedback.retry_correct_v1–v8`  
**Needs revision:** White card + red outline, submitted sentence with wrong words underlined in red, targeted prompt, Try again (pre-populated), no XP lost, error-specific Amelia cue

**Level complete:** Confetti, full formula chips, +25 XP bonus, next level unlocked, `celebration.level_complete`

---

### Phase 9 — Word bank Phase A (Build Mode, L1–6)

- Sentence tray: horizontal wrapping strip, tap to place, tap placed chip to return
- Word bank: shuffled colour-coded chips + 2 distractors
- Submit blocks until word count ≥ formula length
- Clear all button
- Tense-variety steps: 3 mini-trays
- One-time intro audio: `step.word_bank_intro`
- Log `used_word_bank: true`

---

### Phase 10 — Word bank Phase B (Gap Mode, L7–19)

- Known elements as bank chips, new element(s) as inline gap slots in tray
- Gap slot: coloured border, word-class label placeholder, min 80px, expands on typing
- Multiple gaps labelled distinctly ([ADJ₁], [ADV-manner] etc.)
- Submit blocks until gap slots non-empty (empty slot pulses soft purple ring)
- Distractors removed from L13 onward
- One-time intro audio: `step.gap_slot_intro`
- Mobile keyboard avoidance: tray pins top, bank collapses, ▲ Bank pull-tab
- Log `used_gap_typed: true`

---

### Phase 11 — Optional guidance panel

Framer Motion slide-in from below. Three tabs:
1. **Remind me** — formula chips only (no words), `guidance.remind_formula`
2. **Give me a model** — different subject from pupil's prompt, `guidance.model_sentence`
3. **Explain the rule** — plain-English + `guidance.explain_[element]`

Close on tap-outside or ×. No XP reduction for using guidance.

---

### Phase 12 — Mastery quiz system (13 checkpoints)

- Full-screen mode: gold border wrapper, star constellation SVG header
- Start screen: all prompts listed upfront, `quiz.start_quiz_[NN]` audio
- Prompts: one at a time, format "Subject / verb — instruction"
- AI assessment: formula + grammaticality + tense
- Results: N/total, per-item ✓/✗ with grammar insight per error
- Pass → +50 XP, checkpoint shield badge, `quiz.pass_v1–v5` (round-robin)
- Fail → Try again or teacher override
- Fire `learning_events` INSERTs on completion

---

### Phase 13 — Paragraph phase (L31–35)

After correct formula step:
1. Lead sentence — green card, locked, labelled "Your Lead sentence"
2. Support sentences — free-writing, **no word bank** (hard rule, even for Phase B override)
3. Close sentence — separate free-writing area
4. Thin vertical connector line between sections

Audio sequence: `step.paragraph_lead` → `step.paragraph_support` → `step.paragraph_close`

Assessment: Lead vs formula, Support for coherence, Close for syntactic complexity.

---

### Phase 14 — Audio integration (usePWPAudio + all trigger points)

`usePWPAudio(key)` hook: React Query fetch from `pwp_audio_assets`, public URL from `pwp-audio` bucket. Null URL = silent (no crash).

Zustand `audioStore`: round-robin `nextVariant(category, count)` — never consecutive repeat.

Preload strategy: level-start audio on path view, step audio on level start screen load. Do NOT preload all 153 files.

**Requires `PWP_Voice_Asset_Handoff.md`** for complete trigger map — request from Michael before this phase.

---

### Phase 15 — Gamification engine

| Action | XP |
|--------|----|
| Complete step (1st attempt) | +10 |
| Complete step (retry) | +5 |
| Complete level | +25 bonus |
| Pass quiz (1st attempt) | +50 bonus |
| 7-day streak | +30 bonus |

XP never decreases. All written to `formula_progress.total_xp`.

Streak: increments on new calendar day with ≥1 correct step. Resets on missed day.

Badges: Foundation (L6), Builder (L12), Composer (L35), Paragraph Writer (L35+para), Master (all 13 quizzes).

Level titles based on `highest_level_reached`:
- L1–3: Apprentice Writer
- L4–8: Sentence Builder
- L9–14: Phrase Crafter
- L15–19: Paragraph Writer
- L20–35: Master Composer

`learning_events` INSERTs: `formula_completed`, `chain_session_completed`, `pwp_level_advanced`.

---

### Phase 16 — Teacher dashboard (/teacher route)

Pupil list: name/avatar, current level+step, last active, traffic light (🟢/🟡/🔴), word bank indicator, ⚠️ Reliant flag.

Per-pupil detail: full level history, word bank usage per step, quiz scores.

Controls: word bank phase override (Auto/Lock A/Lock B/Skip to C), distractor density (None/Standard/Challenge), Send nudge button.

---

### Phase 17 — Onboarding

First login: welcome + mascot, 3-screen walkthrough with audio, display name setup, deposits at L1.

Returning: `onboarding.returning_user` plays once per session (tracked in `sessionStorage`).

---

### Phase 18 — Accessibility audit (WCAG 2.1 AA)

- Contrast: 4.5:1 normal text, 3:1 large text
- Touch targets: 44×44px minimum
- Chips: colour + letter label (never colour alone)
- `data-tts` on all pupil-facing text
- Writing area: min 18px font
- Focus rings: 2px solid `#6C5CE7`
- Keyboard nav: arrow keys + Enter on word bank chips
- Run Lighthouse + axe on every major screen

---

### Phase 19 — Deploy to Vercel + DNS

1. Connect new repo to Vercel
2. Set environment variables
3. Run cross-app checklist (Section 20 of build prompt)
4. Update DNS for `pwp-studio.wrife.co.uk`
5. Smoke-test: Class SIL42495 / amab04 / PIN 9543

---

## Cross-app rules (never break these)

- Supabase project: `gzmgjkbtsvezfclmreru` ONLY
- Never alter/drop: `home_accounts`, `classes`, `pupils`, `profiles`, `learning_events`
- All new tables: nullable `class_id`
- Gamification columns: added to `formula_progress` with `NOT NULL DEFAULT`
- `learning_events` INSERTs fire on: level complete, session end, level advance
- `← WriFe` button: `sessionStorage.entryViaHub` only (clears on tab close)
- Route B: redirects school pupils to wrife.co.uk/pupil/login

---

*Work plan version 2.0 — generated May 2026 from PWP_App_Build_Prompt.md. Supersedes all previous PWP work plans.*
