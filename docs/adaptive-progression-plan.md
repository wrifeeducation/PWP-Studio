# WriFe PWP — Adaptive Progression Architecture
**Version:** 1.1  
**Date:** 28 April 2026  
**Status:** Design plan — approved for implementation

---

## 1. Core Philosophy

WriFe must operate like a skilled human tutor: it knows when a pupil is ready to move on, when they need more practice, and when to introduce something new. It never advances a pupil by time alone. It never holds a pupil back who is clearly ready.

Three principles govern everything:

**1. Mastery before progression.** A pupil does not advance to the next formula level, genre, or writing layer until they have demonstrated genuine mastery — not just completion. Mastery means consistent performance across multiple varied sessions, with reducing scaffolding.

**2. Variety before mastery.** A pupil cannot demonstrate mastery on a single type of practice. Sentences must vary in subject, context, and word choice. The same words appearing in the same order across every session is rote performance, not mastery.

**3. The system progresses the pupil.** Teachers do not assign formula sessions or paragraph sessions — the system generates them automatically, adapts difficulty and scaffolding, and advances on mastery. Teachers set the stage (word banks, overrides, Writing Studio prompts) and receive intelligence (readiness alerts, intervention flags). This is the Duolingo model applied to structured writing.

---

## 2. The Session Model — What Happens Each Day

When a pupil opens the app, the system generates today's session automatically. The pupil never chooses their level or layer — the system decides based on their mastery state.

### Daily session flow

```
1. System determines session type (see §3 below)
2. System generates session content (subject, context, word bank subset)
3. Pupil completes session
4. AI assesses the output (formula, semantic, or paragraph scoring)
5. System updates mastery state and scaffold stage
6. System checks mastery gate — advance, consolidate, or continue
7. XP, streak, and gamification updated
8. Teacher notification triggered if gate event occurred
```

### Session types (determined automatically)

| Type | When triggered | Purpose |
|------|---------------|---------|
| **Formula session** | Default — primary daily practice | Build and assess the current formula |
| **Paragraph session** | Interleaved once Paragraph Builder unlocked (every 3rd session) | Extend formula sentence into LSC paragraph |
| **Consolidation session** | Triggered when stuck (>8 sessions without mastery) | Revisit scaffold stage 2, AI adjusts word bank |
| **Spaced recall session** | Every 5th session — revisits a previously mastered level | Confirm retention; partial scaffold only |
| **Lens Lab session** | Every 4th session on a new level | Focus on one word class at a time (already in DB: `is_lens_lab`) |
| **Writing Studio session** | Teacher-confirmed readiness only | Extended composition |

---

## 3. Layer 1 — Formula Practice Mastery Model

### 3.1 Scaffolding stages

Each formula level has four scaffold stages. A pupil begins at Stage 1 and progresses through them. Scaffold stage is stored per pupil per level.

| Stage | Name | Sessions | What the pupil sees | Mastery threshold to advance stage |
|-------|------|----------|--------------------|------------------------------------|
| 1 | **Acquisition** | 1–3 | All word tiles labelled with word class; slot labels visible; hints available | No gate — all pupils complete 3 sessions before moving to Stage 2 |
| 2 | **Practice** | 4–6 | Word tiles shown but class labels hidden; slot numbers only; no hints | ≥75% formula_score on 2 of 3 sessions |
| 3 | **Consolidation** | 7–9 | Blank slots; no tile labels; word bank shuffled each session | ≥85% formula_score on 2 consecutive sessions |
| 4 | **Transfer** | 10+ | Blank slots only; AI-generated new subject not in the regular word bank | ≥85% on 1 independent session; AI confirms sentence is semantically coherent |

### 3.2 Level mastery declaration

A pupil **masters a level** when they complete Stage 4 successfully. The system records a `mastery_event` and automatically advances `current_formula_level` in `pupil_progress`.

Additionally, an **accelerated mastery path** exists: if a pupil scores ≥90% on 3 consecutive sessions at Stage 2 or Stage 3, the system skips to the next stage early — they are not held back through sessions they've already shown mastery of.

If a pupil **fails to reach Stage 4 mastery by session 12**, the system:
1. Generates a consolidation session (Stage 2 scaffold, fresh word choices, AI selects the word class the pupil struggled with most)
2. Notifies the teacher: "[Pupil] has been stuck on L[X] for 12 sessions. Suggested intervention: [word class]."
3. After 3 consolidation sessions, re-attempts Stage 3

### 3.3 Session variety

The same words, same subject, same context every session = rote performance, not mastery. The system ensures variety as follows:

- **Subject rotation**: `formula_levels.subject_rotation_bank` already exists. System cycles through subjects across sessions, never repeating the same subject within 3 consecutive sessions on the same level.
- **Word bank shuffling**: The full word bank for each word class contains 20+ words. Each session, 8 are selected — random subset, never the same set twice in a row.
- **Context framing**: AI generates a one-sentence setting each session (e.g. "Today you're writing about a rainy afternoon." "Today's setting is outer space."). This context changes the semantic expectation without changing the formula structure.
- **Distractor words**: From Stage 3 onwards, the word bank includes 2 "distractor" words from the wrong word class per session — testing that the pupil understands why the word fits the slot, not just its position.

---

## 4. Layer 2 — Paragraph Builder: When to Introduce

### 4.1 The problem with a hardcoded level gate

The current rule (`paragraph_active = true` from L8) is a structural proxy — L8 is the first formula complex enough (5 elements including a preposition) to produce a sentence worth developing into a paragraph. This is pedagogically reasonable but incomplete: it ignores whether the pupil has actually mastered that formula.

### 4.2 Proposed mastery-based criteria

Paragraph Builder unlocks for a pupil when **all three** of these conditions are met:

**Criterion A — Structural richness:** The pupil's current formula has ≥ 4 elements AND includes at least one qualifier (adjective, adverb, or preposition). This ensures the Lead sentence in the LSC scaffold is substantive enough to support 2 further sentences around it. In practice, this means L4+ for most formula structures. We recommend updating `paragraph_active` in `formula_levels` to be `true` from L4 onwards (currently L8), with the mastery gate acting as the real lock.

**Criterion B — Formula mastery:** The pupil has achieved mastery (reached Stage 4) on their current formula level. They can produce that sentence structure independently before being asked to embed it in a paragraph.

**Criterion C — Pattern variety:** The pupil has mastered at least **2 formula levels** in total. This means they have 2 sentence structures in their productive repertoire — critical because the Support sentences in an LSC paragraph require the pupil to produce sentences using a *different* structure from the Lead.

**Example:** A pupil who has mastered L3 (det + adj + noun + verb) and L4 unlocks Paragraph Builder when they master L4, because they can write the Lead using L4's structure and draw on L3 for their Support sentences.

### 4.3 Within-layer progression for Paragraph Builder

Once Paragraph Builder is unlocked, genre is introduced in sequence:

| Step | Genre | Unlock criteria for next genre |
|------|-------|-------------------------------|
| 1 | **Narrative** | First genre introduced; no prerequisite | 3 sessions with composite_paragraph_score ≥ 70%, including at least 1 with scaffold_used = false |
| 2 | **Non-fiction** | Narrative mastery | 3 sessions ≥ 70% composite, non-fiction genre_match_score ≥ 65% |
| 3 | **Persuasive** | Non-fiction mastery | 3 sessions ≥ 70% composite, ai_feedback confirms rhetorical device present |
| 4 | **Poetry** | Persuasive mastery | 2 sessions ≥ 70% composite (less prescriptive — poetry is evaluated differently) |

The `pupil_progress.current_paragraph_phase` already tracks this (L = Lead, S = Support, C = Close — referring to the LSC phase being practiced, not genre). This column should be extended to also track genre mastery state.

### 4.4 Scaffolding within Paragraph Builder

Mirrors the formula scaffold model:

| Stage | Sessions | Scaffolding provided |
|-------|----------|---------------------|
| 1 — Modelled | 1–2 | Example Lead/Support/Close shown; pupil replaces underlined words |
| 2 — Guided | 3–4 | Sentence starters provided ("The [formula]… Later,… Finally,…"); no examples |
| 3 — Independent | 5+ | Blank LSC sections only; pupil writes from memory of the pattern |

AI assesses each paragraph against: cohesion_score, genre_match_score, tense_register_score, close_quality_score (all already in `paragraph_sessions` schema).

---

## 5. Layer 3 — Writing Studio: Auto-Trigger and Teacher Confirmation

### 5.1 Current model (teacher-assigned)
Teachers currently assign Writing Studio tasks manually. This is appropriate but can be enhanced with system-generated readiness signals.

### 5.2 Proposed hybrid model

The system monitors for Writing Studio readiness but **always requires teacher confirmation** before a pupil begins. Writing Studio is a sustained, high-stakes activity — a teacher should choose the right moment and the right prompt.

**Readiness criteria (system checks all three):**

1. **Breadth:** Pupil has mastered at least 6 formula levels across two or more phases (demonstrates a broad sentence repertoire, not just one structure practiced to death)
2. **Depth:** Pupil has completed at least 3 Paragraph Builder sessions with composite_paragraph_score ≥ 70% across 2+ genres
3. **Coherence signal:** The last 3 paragraph sessions show consistent tense_register_score ≥ 70% — the pupil can maintain voice across a paragraph

When all three are met, the system sends a teacher notification: **"[Pupil] appears ready for Writing Studio. Tap to review their recent paragraphs and assign their first task."**

The teacher reviews the evidence, selects a prompt from the task library (or approves the AI-suggested prompt — see §6.4), and confirms. The pupil sees the Writing Studio unlock on their next login.

### 5.3 After the first Writing Studio task

Subsequent Writing Studio tasks are suggested by the system based on:
- Genre affinity (which genres scored highest in Paragraph Builder)
- Year group appropriateness
- Prompt variety (never assign the same genre twice in a row)

The teacher can accept the suggestion or choose a different prompt. They never need to manually search — the system pre-selects and they approve.

---

## 6. AI Assessment: Role at Each Layer

### 6.1 Layer 1 — Formula session AI

| AI call | Model | Input | Output | When |
|---------|-------|-------|--------|------|
| Formula validation | Rule-based (client) | Slots vs. formula definition | Pass/fail per slot | Instant, on submit |
| Semantic quality | gpt-4o-mini | Sentence built + subject | purpose/audience/effect scores | After each session |
| Mastery declaration | gpt-4o-mini | Last 5 sessions' sentences + scores | `{ mastery: true/false, weak_word_class: string, recommendation: string }` | On session 5, 8, 10 |
| Next session content | gpt-4o-mini | Current level, used subjects, context request | `{ subject: string, context_sentence: string, distractor_words: string[] }` | After mastery check |

### 6.2 Layer 2 — Paragraph session AI

| AI call | Model | Input | Output | When |
|---------|-------|-------|--------|------|
| Lead sentence quality | gpt-4o-mini | Lead sentence, formula level | `{ rich_enough_for_paragraph: bool, suggestion: string }` | On session start (validates the formula sentence before paragraph work begins) |
| Paragraph coherence | gpt-4o-mini | Full LSC paragraph + genre | cohesion, genre_match, tense, close scores | After each session |
| Genre mastery check | gpt-4o-mini | Last 3 paragraphs in genre | `{ mastery: bool, strongest_element: string, weakest_element: string }` | After session 3 per genre |
| Writing Studio readiness | gpt-4o-mini | Paragraph history (last 5) | `{ ready: bool, evidence: string[], suggested_genre: string }` | When numeric criteria met (§5.2) |

### 6.3 Layer 3 — Writing Studio AI

| AI call | Model | Input | Output | When |
|---------|-------|-------|--------|------|
| Full NC rubric assessment | gpt-4o | Full text + year_group + genre | Rubric scores across NC dimensions | On submission |
| Formula transfer detection | gpt-4o | Full text + pupil's mastered levels | `{ formulas_used: number[], transfer_rate: number }` | Included in above |
| Detailed feedback | gpt-4o | Full text + rubric scores | `{ strengths: string[], targets: string[], next_steps: string }` | Included in above |
| Prompt suggestion | gpt-4o-mini | Paragraph history + mastered levels + genre affinity | `{ suggested_task_id: uuid, rationale: string }` | On Writing Studio readiness notification |

### 6.4 Protecting AI calls

All AI calls remain in Supabase Edge Functions (never from the browser). Each Edge Function:
- Strips PII before sending to OpenAI (existing `stripPII` util)
- Caches results in Supabase to avoid duplicate calls (use `formula_sessions.ai_feedback` JSONB column, equivalent for other tables)
- Fails gracefully: if AI call fails, session is still saved with `ai_feedback: null`; retry on next load

---

## 7. Teacher Oversight: Notifications and Overrides

### 7.1 New teacher notification types

| Notification | Trigger | Teacher action |
|-------------|---------|---------------|
| Level advance | Pupil mastered a formula level | Informational; can override (hold back or skip ahead) |
| Paragraph Builder unlock | Paragraph Builder criteria met | Informational; can defer if timing is wrong |
| Stuck alert | Pupil >12 sessions on same level | Intervention suggestion shown; teacher can assign consolidation task |
| Writing Studio readiness | All readiness criteria met | Must confirm and select first prompt |
| Transfer gap alert | Writing Studio transfer_rate < 40% | Suggests targeted formula revision |
| Milestone | Pupil completes a phase (A, B, C, D) | Celebration notification; teacher can add a note |

### 7.2 Teacher overrides

Teachers can, at any time:
- **Accelerate** a pupil: jump to next formula level regardless of mastery state (e.g. for a pupil assessed as clearly ahead)
- **Hold back** a pupil: prevent advancement even if mastery criteria are met (e.g. teacher knows the pupil was rushing)
- **Reset scaffold stage**: take a pupil back to Stage 1 on any level (e.g. after a long absence)
- **Customise word bank**: add/remove words for a specific pupil (override the school-level word bank)
- **Add a session comment**: written note attached to any session, visible to pupil (as feedback) or teacher-only

### 7.3 Teacher view of pupil journey

The existing Class Progress tab shows aggregate data. A new **pupil detail drawer** (clicking a pupil row) should show:
- Formula level timeline: which levels mastered, how long each took, which scaffold stages used
- Last 5 formula sessions: sentence built, score, scaffold stage
- Paragraph Builder history: genre, scores, AI feedback summary
- Writing Studio pieces: word count, rubric scores, teacher comment
- Current mastery state and next gate criteria (e.g. "2 more sessions with ≥85% to master L6")

---

## 8. Database Changes Required

### 8.1 Update `formula_levels`
```sql
-- Lower paragraph_active threshold from L8 to L4
UPDATE formula_levels SET paragraph_active = true WHERE id >= 4;
```

### 8.2 Add mastery tracking to `pupil_progress`
```sql
ALTER TABLE pupil_progress ADD COLUMN IF NOT EXISTS
  scaffold_stage_formula     smallint DEFAULT 1,     -- 1-4: current scaffold stage for active formula level
  sessions_on_current_level  smallint DEFAULT 0,     -- resets on level advance
  consecutive_mastery_sessions smallint DEFAULT 0,   -- streak of sessions meeting mastery threshold
  paragraph_genres_mastered  jsonb DEFAULT '[]',     -- ["narrative", "non_fiction", ...]
  writing_studio_suggested_at timestamptz,           -- when system first flagged WS readiness
  writing_studio_confirmed_at timestamptz;           -- when teacher confirmed
```

### 8.3 Add session metadata to `formula_sessions`
```sql
ALTER TABLE formula_sessions ADD COLUMN IF NOT EXISTS
  session_number_on_level  smallint,   -- nth session for this pupil on this level
  scaffold_stage           smallint,   -- which stage was active (1-4)
  context_sentence         text,       -- AI-generated context used this session
  distractor_words_used    jsonb,      -- which distractors were included
  ai_mastery_check         jsonb;      -- result of mastery declaration call (if run)
```

### 8.4 New table: `mastery_events`
```sql
CREATE TABLE mastery_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id      uuid REFERENCES profiles(id),
  event_type    varchar NOT NULL,  -- 'formula_level_advance' | 'paragraph_builder_unlock' | 
                                   -- 'genre_mastered' | 'writing_studio_unlocked' | 'phase_complete'
  level_id      smallint,          -- formula level (if applicable)
  genre         varchar,           -- genre mastered (if applicable)
  triggered_by  varchar NOT NULL,  -- 'system' | 'teacher_override'
  teacher_note  text,              -- optional teacher comment on override
  created_at    timestamptz DEFAULT now()
);
```

### 8.5 New table: `teacher_notifications`
```sql
CREATE TABLE teacher_notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       uuid REFERENCES profiles(id),
  pupil_id         uuid REFERENCES profiles(id),
  notification_type varchar NOT NULL,
  title            varchar NOT NULL,
  body             text,
  data             jsonb DEFAULT '{}',  -- pupil level, evidence, suggested action
  action_required  boolean DEFAULT false,
  actioned_at      timestamptz,
  read_at          timestamptz,
  created_at       timestamptz DEFAULT now()
);
```

---

## 9. Pupil-Facing Experience

### 9.1 The Duolingo Path Model

The majority of the adaptive system's design surfaces on the pupil UI. The pupil never navigates a settings screen or picks their level — they see a single **Learning Path**: a vertical scroll of nodes representing formula levels, moving from completed levels at the top down to locked levels below.

```
  ● L1  ✓ Mastered          (faded green, crown icon)
  ● L2  ✓ Mastered          (faded green, crown icon)
  ● L3  ✓ Mastered          (faded green, crown icon)
  ● L4  ↻ In progress       (bright, pulsing — TODAY's practice)
         [Start today's session]
  ● L5  🔒 Locked            (greyed, padlock icon)
  ● L6  🔒 Locked
  ...
```

Each **level node** shows:
- Word classes in the formula (colour-coded dots — purple for determiner, blue for noun, etc.)
- Mastery progress bar (if in progress) or crown (if mastered)
- Scaffold stage indicator: small icons for Acquisition / Practice / Consolidation / Transfer

Between certain levels, **layer unlock banners** appear inline on the path:
- After mastering 2 levels with structural richness: **"Paragraph Builder unlocked!"** banner
- After Writing Studio is confirmed: **"Writing Studio unlocked!"** banner

The path scrolls to show approximately 3 levels above and 5 levels ahead — enough to feel like meaningful progress exists, not so many that it feels overwhelming.

### 9.2 What the pupil sees in a session

1. **Today's practice** card — level name, today's subject/context ("Today you're writing about a snowy morning"), start button
2. **Concept cards** (see §10) — before the formula session begins
3. **Formula builder** — colour-coded slots with word tiles (scaffold varies by stage)
4. **Session result** — score, XP earned, brief AI feedback sentence, progress toward next mastery gate
5. **Celebration moments** — level mastery animation, layer unlock reveal, badge award

### 9.3 What pupils never see

Pupils never see: scaffold stage numbers, mastery gate percentages, consolidation flags, teacher notification data, or the terms "acquisition", "transfer", or "mastery gate". They see levels, locks, XP, streaks, and badges.

---

## 10. Pre-Session Concept Learning

### 10.1 Principle

Before a pupil practices a formula, they must understand what each word class *means*. Without this, formula practice is pattern-matching by position — pupils learn that the third tile tends to be blue without understanding why. The definitions anchor the learning: a pupil who knows that "a verb is a doing, being or feeling word" can self-check their word choice independently of the colour of the tile.

This mirrors how a skilled teacher would introduce a lesson: "Today we're using adjectives. An adjective is a describing word — it tells you more about a noun. Words like tall, red, and busy are all adjectives. Now let's build our sentence."

### 10.2 Concept card flow

When a pupil starts a session, before the formula builder appears, they move through a short sequence of **concept cards** — one per word class appearing in today's formula (deduplicated by word class, not by position).

**Card structure:**

```
┌─────────────────────────────────┐
│  🟣  DETERMINER                 │
│                                 │
│  A determiner introduces a      │
│  noun. It tells you which one   │
│  or how many.                   │
│                                 │
│  Examples: the  a  my  some     │
│                          [Got it →]
└─────────────────────────────────┘
```

- Cards use the same colour coding as the formula tiles (purple for determiner, blue for noun, etc.)
- The examples shown are drawn from **today's word bank** — not abstract examples, but the actual words the pupil will see in a few seconds
- Cards are swipeable; a progress indicator shows "1 of 4 word classes"
- Pupils cannot skip on their **first encounter** with a word class. After that, a "Skip all" option appears for pupils who have seen these cards before

### 10.3 Concept card trigger logic

| Scenario | Behaviour |
|----------|-----------|
| First time a word class appears in the pupil's formula history | Card shown; no skip option |
| Word class seen in a previous level but not recently (>7 sessions ago) | Card shown with "Remember?" framing; skip available |
| Word class introduced in the previous session | Skip available by default; card collapsed to a reminder chip |
| Scaffold stage 1 (Acquisition) | All cards shown in full |
| Scaffold stages 2–4 | Cards available as optional pre-session review; brief reminder chip shown instead |

### 10.4 Hints during the session

Every slot in the formula builder has a **hint button** (? icon, minimum 44×44px tap target). Tapping it reveals a tooltip or bottom sheet with:

- Word class name + colour
- Definition (from the definitions in §10.6)
- Two examples drawn from today's word bank

**Hint availability by scaffold stage:**

| Stage | Hint behaviour |
|-------|---------------|
| 1 — Acquisition | Hints auto-appear for each slot on first interaction; dismiss manually |
| 2 — Practice | Hints available on demand; not auto-shown |
| 3 — Consolidation | Hints available but cost a 5-point deduction (shown clearly: "Using a hint: −5 pts") |
| 4 — Transfer | No hints available; pupil must apply knowledge independently |

Hint usage is logged in `formula_sessions.scaffold_type` as `{ hints_used: ["noun", "verb"], concept_cards_viewed: true }`. This informs the AI mastery check — a pupil consistently needing hints on the same word class at Stage 3 triggers `weak_word_class`.

### 10.5 Definitions as session feedback

When the AI scores a session and identifies a weak word class (e.g. the pupil placed an adverb where the slot required a verb), the feedback screen references the definition:

> "Check your verb slot — remember, a verb is a doing, being or feeling word. 'Quickly' describes how something is done, so it's an adverb, not a verb."

This closes the loop: the definition taught before the session is the same language used in the correction.

### 10.6 Canonical word class definitions

These definitions are the authoritative source across the entire platform — concept cards, hints, feedback messages, teacher explainers, and any future print materials. They are stored in `src/lib/definitions.ts` (not in the database — they are static and version-controlled).

#### Word Classes

| Word class | Definition | Examples |
|------------|-----------|---------|
| **Noun** | A noun is the name of a person, place, thing or idea. | *teacher, London, table, happiness* |
| **Verb** | A verb is a doing, being or feeling word. | *run, was, love, think* |
| **Adjective** | An adjective is a describing word. It tells you more about a noun. | *tall, red, busy, ancient* |
| **Determiner** | A determiner introduces a noun. It tells you which one or how many. | *the, a, my, some, this, every* |
| **Adverb** | An adverb describes a verb, an adjective or another adverb. It often tells you how, when or where. | *quickly, always, very, nearly* |
| **Preposition** | A preposition shows the relationship between one thing and another. It tells you position, direction or time. | *on, under, before, through, beside* |
| **Pronoun** | A pronoun takes the place of a noun. It saves you repeating the same name. | *he, she, it, they, we, who* |
| **Conjunction** | A conjunction is a joining word. It connects words, phrases or clauses. | *and, but, because, although, so, when* |

#### Punctuation

| Mark | Name | Definition |
|------|------|-----------|
| **.** | Full stop | A full stop ends a statement. It tells the reader the sentence is complete. |
| **?** | Question mark | A question mark ends a sentence that asks a question. |
| **!** | Exclamation mark | An exclamation mark ends a sentence with strong feeling or a command. |
| **,** | Comma | A comma separates items in a list, or divides a longer sentence into clearer parts. |
| **'** | Apostrophe | An apostrophe shows that letters are missing (*it's*) or that something belongs to someone (*the dog's lead*). |
| **A** | Capital letter | A capital letter starts a sentence, a proper noun, or the pronoun I. |

> **Note on verbs:** The verb is the most difficult word class for primary pupils because it encompasses doing words (*run, jump*), being words (*is, was, were*), and feeling words (*love, fear, enjoy*). Many pupils recognise action verbs but miss linking verbs and stative verbs. The definition above is deliberately broad and should be reinforced with all three types in concept card examples.

---

---

## 11. Implementation Phases

### Phase 1 — Data foundation (1 week)
- Apply DB migrations: `pupil_progress` columns, `mastery_events`, `teacher_notifications` tables
- Update `formula_levels.paragraph_active` to start at L4
- Add `session_number_on_level`, `scaffold_stage` to `formula_sessions`
- Update BUG-002 fix: auto-create `pupil_progress` row on profile INSERT (trigger)

### Phase 2 — Formula mastery engine + concept cards (2 weeks)
- Build `useMasteryState` hook: reads session history for current level, computes scaffold stage and mastery status
- Update `FormulaPage` to pass correct scaffold configuration to `FormulaBuilder` based on stage
- Implement auto-advance logic: on session save, check gate → advance level + write mastery_event
- Implement stuck detection: if sessions_on_current_level > 12 without mastery → create teacher_notification
- Create `src/lib/definitions.ts`: canonical word class and punctuation definitions (§10.6)
- Build `ConceptCard` component: word class name, definition, examples from today's word bank, colour-coded
- Build `ConceptCardSequence` component: orchestrates card flow before session, manages skip logic by scaffold stage
- Add hint button (? icon) to `FormulaSlot`: tooltip/bottom sheet with definition + 2 word bank examples
- Implement hint deduction logic in scoring (Stage 3: −5pts per hint used)
- Log hint usage in `formula_sessions.scaffold_type` JSON
- Build **Learning Path** UI: vertical node map, completed/active/locked states, level formula preview, layer unlock banners

### Phase 3 — Session content generation (1 week)
- Edge Function: `generate-session-content` — takes current level + recent sessions → returns subject, context, word bank subset, distractor words
- Wire into `FormulaPage` — fetch content on session start
- Subject rotation tracking (mark used subjects in `formula_sessions`)

### Phase 4 — Paragraph Builder progression (1–2 weeks)
- Implement mastery-based Paragraph Builder unlock (criteria A, B, C from §4.2)
- Genre progression logic: track genres mastered in `pupil_progress.paragraph_genres_mastered`
- Genre unlock gate: check last 3 paragraph_sessions per genre, advance if criteria met
- Teacher notification on Paragraph Builder unlock

### Phase 5 — Writing Studio auto-suggest (1 week)
- Build readiness checker: runs after each Writing Studio session + paragraph session
- On readiness: write `pupil_progress.writing_studio_suggested_at` + create teacher_notification (action_required = true)
- Teacher confirmation UI in teacher dashboard: review evidence, select/approve prompt, confirm
- On confirmation: write `writing_studio_confirmed_at`, set `writing_studio_unlocked = true`

### Phase 6 — Teacher notifications UI (1 week)
- Notification bell/badge in teacher dashboard header
- Notification list panel: grouped by type, actionable items surfaced first
- Pupil detail drawer in Class Progress tab

### Phase 7 — AI mastery + content calls (ongoing)
- Add mastery declaration call to formula session processing (run on sessions 5, 8, 10)
- Add next-session content generation call (after each session)
- Add paragraph genre mastery check (after session 3 per genre)
- Add Writing Studio readiness AI check (when numeric criteria met)

---

## 12. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Average sessions to formula mastery | 6–9 (vs. current undefined) | `mastery_events` + `formula_sessions` count |
| Pupils stuck >12 sessions on same level | <10% | `teacher_notifications` of type `stuck_alert` |
| Paragraph Builder coherence score | ≥70% avg at session 5 | `paragraph_sessions.composite_paragraph_score` |
| Writing Studio transfer rate | ≥50% (formulas from practice appear in extended writing) | `writing_pieces` + formula transfer detection |
| Teacher override rate | <15% of system advancements | `mastery_events.triggered_by = 'teacher_override'` |
| Daily streak retention | ≥60% weekly active users maintain streak | `pupil_progress.current_streak` |

---

*Plan prepared 28 April 2026. Implementation begins Phase 1.*
