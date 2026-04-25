# WriFe Architecture & System Design

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                WriFe Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          React Frontend (Vite)                        │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                        │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │   │
│  │  │ Formula Builder│  │ Paragraph UI   │  │ Writing Studio Editor   │ │   │
│  │  │ (L1–L67)       │  │ (LSC scaffold) │  │ (ProseMirror + tiptap)  │ │   │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘ │   │
│  │         │                     │                        │             │   │
│  │  ┌──────▼──────────────────────▼────────────────────────▼──────────┐ │   │
│  │  │  Zustand Stores (Session, Formula, Paragraph, Writing, Game)   │ │   │
│  │  └──────┬──────────────────────┬────────────────────────┬──────────┘ │   │
│  │         │                      │                        │             │   │
│  │         └──────────────────────┼────────────────────────┘             │   │
│  │                                │                                      │   │
│  │  ┌─────────────────────────────▼──────────────────────────────────┐  │   │
│  │  │          IndexedDB (Offline Cache + Write Queue)               │  │   │
│  │  │  Tables: sessions, sessionWrites, pupilProgress, formulas...  │  │   │
│  │  └─────────────────────────────┬──────────────────────────────────┘  │   │
│  │                                │                                      │   │
│  │                                ▼ (on online)                         │   │
│  └────────────────────────────────┼──────────────────────────────────────┘   │
│                                   │                                          │
│  ┌────────────────────────────────▼──────────────────────────────────────┐   │
│  │                    Supabase (Backend as a Service)                    │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                        │   │
│  │  ┌────────────────────────┐                 ┌───────────────────┐    │   │
│  │  │  PostgreSQL Database   │                 │   Storage (PDFs)  │    │   │
│  │  │  (RLS policies for     │                 └───────────────────┘    │   │
│  │  │   data isolation)      │                                           │   │
│  │  └────────────────────────┘                                           │   │
│  │                                                                        │   │
│  │  ┌────────────────────────┐         ┌──────────────────────────────┐ │   │
│  │  │  Auth (JWT + RLS)      │         │  Realtime (Live dashboards)  │ │   │
│  │  └────────────────────────┘         └──────────────────────────────┘ │   │
│  │                                                                        │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐│   │
│  │  │              Edge Functions (Node.js 20 runtime)                 ││   │
│  │  ├──────────────────────────────────────────────────────────────────┤│   │
│  │  │                                                                    ││   │
│  │  │  ┌─────────────────────┐  ┌──────────────────────────────────┐  ││   │
│  │  │  │ assess-formula      │  │ assess-paragraph                 │  ││   │
│  │  │  │ (gpt-4o-mini NLP)   │  │ (gpt-4o-mini cohesion + semantic)│  ││   │
│  │  │  └─────────────────────┘  └──────────────────────────────────┘  ││   │
│  │  │                                                                    ││   │
│  │  │  ┌──────────────────────────────────────────────────────────┐   ││   │
│  │  │  │ assess-writing                                           │   ││   │
│  │  │  │ (gpt-4o rubric scoring: KS1/KS2/KS3 curriculum)         │   ││   │
│  │  │  └──────────────────────────────────────────────────────────┘   ││   │
│  │  │                                                                    ││   │
│  │  └──────────────────────────────────────────────────────────────────┘│   │
│  │           │                       │                      │            │   │
│  └───────────┼───────────────────────┼──────────────────────┼────────────┘   │
│              │                       │                      │                 │
│  ┌───────────▼───────────────────────▼──────────────────────▼────────────┐   │
│  │                      OpenAI API (Gated by Edge Fn)                     │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  gpt-4o-mini  (sentence/paragraph NLP)                                │   │
│  │  gpt-4o       (writing studio rubric scoring)                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Three-Layer Learning Flow

### Layer 1: PWP Formula Practice (L1–L67)

**User Journey:**
1. Pupil logs in, clicks "Formula Practice"
2. App loads current level (L1–L67) and formula definition
3. Pupil drags word-class tiles into formula slots
4. Pupil clicks "Check Answer"
5. App validates client-side, then calls `assess-formula` Edge Function
6. OpenAI gpt-4o-mini scores sentence
7. Feedback displayed; if correct (≥80%), level unlocked + XP earned
8. Session stored to IndexedDB, then synced to Supabase

**Data Flow (Detailed):**

```
┌─────────────────────────────────┐
│  Pupil loads Formula Practice   │
│  (FormulaPage.tsx)              │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  useFormula() hook:             │
│  - query Supabase for current   │
│    level, formula definition    │
│  - populate Zustand store       │
│    (useFormulaStore)            │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  FormulaBuilder component       │
│  renders:                       │
│  - formula slots (empty)        │
│  - word class tiles (draggable) │
│  - Check Answer button          │
└──────────┬──────────────────────┘
           │
           ▼ (pupil drags tiles + clicks Check)
┌─────────────────────────────────┐
│  handleSubmitSentence()         │
│  in useFormula hook:            │
│                                 │
│  1. Serialize tiles into        │
│     sentence string             │
│  2. Client validation:          │
│     validateFormula(sentence,   │
│     currentFormula)             │
│  3. If invalid: show error      │
│  4. If valid:                   │
│     - write to IDB immediately  │
│     - call assess-formula       │
│       Edge Function             │
└──────────┬──────────────────────┘
           │
           ▼ (online)
┌─────────────────────────────────┐
│  supabase.functions.invoke(     │
│    'assess-formula',            │
│    { sentence, formulaId }      │
│  )                              │
│                                 │
│  Request sent to Edge Function  │
│  with sanitized payload         │
│  (PII stripped via stripPII)    │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Edge Function: assess-formula       │
│  (supabase/functions/assess-formula) │
│                                      │
│  1. Receive: { sentence, formula }   │
│  2. Load prompt template from        │
│     ai-prompts/formula-assessment    │
│  3. Call OpenAI gpt-4o-mini:         │
│     - input: prompt + sentence       │
│     - output: score, feedback        │
│  4. Return JSON:                     │
│     {                                │
│       score: 0–100,                  │
│       correct: boolean,              │
│       feedback: string,              │
│       details: {...}                 │
│     }                                │
└──────────┬──────────────────────────┘
           │
           ▼ (response to client)
┌─────────────────────────────────┐
│  Client receives assessment      │
│                                 │
│  1. Store in Zustand:           │
│     useFormulaStore.setScore()  │
│  2. Update IDB write with       │
│     assessment result           │
│  3. Show FormulaFeedback UI:    │
│     - correct/incorrect display │
│     - tile highlighting (green/ │
│       red based on result)      │
│  4. If correct:                 │
│     - trigger XPCounter         │
│       animation (+100 XP)       │
│     - unlock next level         │
│     - update streak             │
└──────────┬──────────────────────┘
           │
           ▼ (on sync trigger)
┌─────────────────────────────────┐
│  useSyncToSupabase() hook:      │
│  - read all pending writes      │
│    from IDB                     │
│  - batch upsert to Supabase     │
│    pupil_sessions table         │
│  - on success: clear IDB queue  │
│  - on error: keep in queue      │
│    for retry                    │
└─────────────────────────────────┘
```

**Assessment Layers:**
- **Layer 1 (Client):** Verify slots filled, all word classes used (`validateFormula`)
- **Layer 2 (AI NLP):** Parse sentence into word classes, check grammar vs formula pattern (gpt-4o-mini)

---

### Layer 2: Paragraph Builder (Activated at L8)

**User Journey:**
1. Pupil clicks "Extend to Paragraph" (available after L8 unlock)
2. App shows LSC scaffold form with three phases (Lead → Support → Close)
3. Pupil fills in Lead sentence (from formula + extension)
4. Pupil fills in Support (1–2 sentences with evidence)
5. Pupil fills in Close (concluding sentence)
6. Pupil clicks "Check Paragraph"
7. App validates client-side, then calls `assess-paragraph` Edge Function
8. OpenAI gpt-4o-mini scores cohesion, vocabulary, genre alignment
9. Feedback displayed; paragraph stored to IndexedDB, then synced

**Data Flow (Detailed):**

```
┌──────────────────────────────────┐
│  Pupil starts Paragraph Builder  │
│  (ParagraphPage.tsx)             │
│  Pre-filled with formula sentence│
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  useParagraph() hook:            │
│  - query current formula + genre │
│  - query LSC constraints         │
│  - populate Zustand store        │
│    (useParagraphStore)           │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Render three phases:            │
│  1. ParagraphPhaseA (Lead)       │
│     - text input (pre-filled)    │
│  2. ParagraphPhaseB (Support)    │
│     - rich text input (tiptap)   │
│     - character limit indicator  │
│  3. ParagraphPhaseC (Close)      │
│     - text input                 │
│     - vocab suggestions inline   │
│                                  │
│  ParagraphPreview shows live     │
│  paragraph as user types         │
└──────────┬───────────────────────┘
           │
           ▼ (pupil fills all phases + clicks Check)
┌──────────────────────────────────────┐
│  handleSubmitParagraph():            │
│  in useParagraph hook:               │
│                                      │
│  1. Validate client-side:            │
│     - L non-empty                    │
│     - S 1–2 sentences, <200 chars    │
│     - C non-empty                    │
│     - genre vocab present            │
│  2. If invalid: show error on phase  │
│  3. If valid:                        │
│     - write to IDB                   │
│     - call assess-paragraph          │
│       Edge Function                  │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  supabase.functions.invoke(      │
│    'assess-paragraph',           │
│    {                             │
│      lead, support, close,       │
│      genreId, formulaId          │
│    }                             │
│  )                               │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Edge Function: assess-paragraph     │
│  (supabase/functions/assess-paragraph│
│                                      │
│  1. Receive: { L, S, C, genre }     │
│  2. Load prompt template             │
│  3. Call OpenAI gpt-4o-mini:        │
│     - input: prompt + paragraph LSC  │
│     - output: cohesion score,        │
│       vocabulary check, genre fit    │
│  4. Return JSON:                     │
│     {                                │
│       score: 0–100,                  │
│       cohesion: { score, feedback }, │
│       vocabulary: { score, feedback },│
│       genre: { match, feedback },    │
│       overall_feedback: string       │
│     }                                │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Client receives assessment      │
│                                 │
│  1. Store in Zustand            │
│  2. Update IDB with result      │
│  3. Show AssessmentResult UI:   │
│     - cohesion bar chart        │
│     - vocabulary highlights     │
│     - genre alignment feedback  │
│  4. If score ≥75%:              │
│     - unlock next formula       │
│     - update paragraph mastery  │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  useSyncToSupabase():            │
│  batch upsert to pupil_paragraphs│
│  table                           │
└──────────────────────────────────┘
```

**Assessment Layers:**
- **Layer 1 (Client):** Validate phase contents (non-empty, within constraints)
- **Layer 2B (AI Cohesion):** Check sentence flow and reference (gpt-4o-mini)
- **Layer 3 (AI Semantic):** Vocabulary match, genre alignment (gpt-4o-mini)

---

### Layer 3: Writing Studio (Extended Writing, 400–700 words)

**User Journey:**
1. Pupil clicks "Writing Studio"
2. App shows directed prompt (e.g., "Write a narrative about a time you helped someone")
3. Pupil writes in rich text editor (ProseMirror/tiptap)
4. App shows real-time word count, autosaves every 30 seconds to IndexedDB
5. Pupil clicks "Submit for Assessment"
6. Pre-submit checklist appears (word count ≥400, all paragraphs coherent)
7. App calls `assess-writing` Edge Function
8. OpenAI gpt-4o scores against UK National Curriculum rubrics (KS1/KS2/KS3 based on age)
9. Detailed rubric feedback displayed (phonics, sentence variety, paragraph org, spelling, grammar, etc.)
10. Pupil can download PDF or submit to teacher
11. Teacher can override score or add written feedback

**Data Flow (Detailed):**

```
┌──────────────────────────────────┐
│  Pupil opens Writing Studio      │
│  (WritingStudioPage.tsx)         │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  useWriting() hook:              │
│  - load prompt + rubric for      │
│    current key stage             │
│  - populate Zustand store        │
│  - init ProseMirror editor       │
│  - start autosave timer          │
│    (every 30s to IDB)            │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  WritingEditor component         │
│  renders:                        │
│  - WritingPrompt (read-only)     │
│  - tiptap rich text editor       │
│  - word count indicator          │
│  - real-time autosave indicator  │
└──────────┬───────────────────────┘
           │
           ▼ (pupil types, every 30s autosave fires)
┌──────────────────────────────────┐
│  Autosave to IndexedDB:          │
│  - serialize editor content      │
│  - write to writingSessions IDB  │
│    table with timestamp          │
│  - if online: queue sync         │
└──────────┬───────────────────────┘
           │
           ▼ (pupil clicks Submit)
┌──────────────────────────────────┐
│  SubmitModal appears             │
│  - confirm ≥400 words            │
│  - show rubric checklist         │
│  - option to save draft instead  │
└──────────┬───────────────────────┘
           │
           ▼ (pupil confirms submit)
┌──────────────────────────────────────┐
│  handleSubmitWriting():              │
│  in useWriting hook:                 │
│                                      │
│  1. Validate client-side:            │
│     - word count ≥400, ≤700          │
│     - at least 3 paragraphs          │
│     - no empty paragraphs            │
│  2. If invalid: show error           │
│  3. If valid:                        │
│     - extract plain text + metadata  │
│     - strip PII (pupilName, etc.)    │
│     - write to IDB with status:      │
│       "submitted"                    │
│     - call assess-writing            │
│       Edge Function                  │
└──────────┬───────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  supabase.functions.invoke(         │
│    'assess-writing',                │
│    {                                │
│      content: sanitized_text,       │
│      keyStage: 'KS2',               │
│      promptId,                      │
│      submissionId                   │
│    }                                │
│  )                                  │
└─────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Edge Function: assess-writing       │
│  (supabase/functions/assess-writing) │
│                                      │
│  1. Receive: { content, keyStage }  │
│  2. Load rubric template for        │
│     key stage (KS1/KS2/KS3)         │
│  3. Call OpenAI gpt-4o:             │
│     - input: prompt + rubric +      │
│            content                  │
│     - output: detailed score for    │
│              each criterion         │
│  4. Return JSON:                    │
│     {                               │
│       overall_score: 0–100,         │
│       rubric_scores: {              │
│         phonics: { score, feedback },│
│         sentence_variety: {...},    │
│         paragraph_org: {...},       │
│         spelling: {...},            │
│         grammar: {...},             │
│         ... (8–10 criteria per KS)  │
│       },                            │
│       strengths: [string],          │
│       areas_for_improvement: [...], │
│       next_steps: string            │
│     }                               │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Client receives assessment      │
│                                 │
│  1. Store in Zustand            │
│  2. Update IDB submission with  │
│     assessment result + status: │
│     "assessed"                  │
│  3. Show AssessmentResult UI:   │
│     - overall score + grade     │
│     - rubric breakdown          │
│       (bar chart per criterion) │
│     - strengths highlighted     │
│     - areas for improvement     │
│  4. Show action buttons:        │
│     - Download as PDF           │
│     - Submit to teacher         │
│     - Return to edit (draft)    │
└──────────┬──────────────────────┘
           │
           ▼ (optional: teacher review)
┌──────────────────────────────────┐
│  Teacher Dashboard:              │
│  - sees all submitted writings   │
│  - can override score            │
│  - can add written feedback      │
│  - pupil notified on feedback    │
└──────────────────────────────────┘
```

**Assessment Layers:**
- **Layer 1 (Client):** Validate word count, paragraph count, non-empty content
- **Layer 4 (AI Rubric):** Score against UK National Curriculum (gpt-4o, most capable)
- **Layer 5 (Teacher Override):** Manual feedback, score adjustment (optional)

---

## Offline-First Architecture & Sync Strategy

### IndexedDB Schema

**Tables:**

```sql
-- Sessions: current lesson state
sessions
  ├── id (primary key, uuid)
  ├── pupil_id
  ├── session_type ('formula' | 'paragraph' | 'writing')
  ├── level (current formula level or null)
  ├── content (serialized builder state)
  ├── created_at (timestamp)
  └── synced_at (null until synced to Supabase)

-- Queue: pending writes to Supabase
sessionWrites
  ├── id (primary key, auto-increment)
  ├── session_id
  ├── action ('submit_formula' | 'submit_paragraph' | 'save_writing')
  ├── payload (serialized sentence/paragraph/text + metadata)
  ├── status ('pending' | 'synced' | 'failed')
  ├── created_at (timestamp)
  ├── synced_at (null until synced)
  └── error_message (null unless failed)

-- Cache: formula definitions, word classes (for offline reference)
formulas
  ├── id (primary key)
  ├── level (1–67)
  ├── pattern (JSON array of word class slots)
  ├── wordClasses (JSON: class name → colour)
  └── cached_at (timestamp)

-- Cache: pupil progress snapshot
pupilProgress
  ├── pupil_id (primary key)
  ├── current_level
  ├── xp_total
  ├── badges
  ├── streak_count
  └── synced_at
```

### Offline Write Queue Flow

```
┌──────────────────────────────────┐
│  Pupil submits sentence/para/    │
│  writing (offline or online)     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Client validation passes        │
│  (Layer 1)                       │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Write to IndexedDB immediately: │
│  db.sessionWrites.add({          │
│    action: 'submit_formula',     │
│    payload: { sentence, ... },   │
│    status: 'pending',            │
│    created_at: now()             │
│  })                              │
│                                  │
│  Update sessions table with      │
│  latest content                  │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Zustand optimistically updates: │
│  useFormulaStore.setScore(...)   │
│  (assume pending, show in UI)    │
└──────────┬───────────────────────┘
           │
           ▼ (online check)
         / \
        /   \
    offline  online
      │        │
      ▼        ▼
   ┌──┐   ┌──────────────────┐
   │ 1│   │Sync immediately  │
   │  │   │(batch writes to  │
   └──┘   │ Supabase)        │
          └──────────────────┘
             │
             ▼
          ┌──────────────────────────────┐
          │  useSyncToSupabase():        │
          │  - read all 'pending'        │
          │    from sessionWrites        │
          │  - batch to Supabase         │
          │    upsert_session_write()    │
          │  - on success:               │
          │    mark status 'synced'      │
          │  - on error:                 │
          │    mark status 'failed',     │
          │    keep in queue for retry   │
          └──────────────────────────────┘
```

### Sync Triggers

| Trigger | Condition | Behavior |
|---------|-----------|----------|
| **Auto on online** | Navigator.onLine = true | Batch sync all pending writes immediately |
| **Periodic** | Every 5 seconds | If online & writes pending, attempt sync |
| **Manual save** | Pupil clicks "Save" or autosave timer | Sync immediately if online |
| **App foreground** | Page becomes visible (visibilitychange) | Sync if online |
| **Conflict resolution** | Sync fails due to RLS or schema mismatch | Retry up to 3 times, log to console |

### Offline Indicators

- **Online:** UI shows green dot, syncs immediately
- **Offline:** UI shows orange dot, shows "queued for sync" badge on submission
- **Syncing:** Pulse animation on sync icon
- **Sync failed:** Red dot + error message in toast + retry button

---

## Authentication & Authorization Model

### Roles & Permissions

```
┌──────────────────────────────────────────────────────────────┐
│                      Auth: JWT + RLS                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Pupil (id_pupil)                                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Can:                                                  │   │
│  │  - read own sessions, submissions, progress          │   │
│  │  - create sessions (formula, paragraph, writing)     │   │
│  │  - submit formulas, paragraphs, writing              │   │
│  │  - read own results & feedback                       │   │
│  │ Cannot:                                               │   │
│  │  - read other pupils' data                           │   │
│  │  - modify teachers' feedback (except drafts)         │   │
│  │  - access admin dashboard                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Teacher (id_teacher)                                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Can:                                                  │   │
│  │  - read all pupils' data in their classes            │   │
│  │  - view real-time progress dashboard (Realtime)      │   │
│  │  - override AI scores on writing submissions         │   │
│  │  - add written feedback to submissions               │   │
│  │  - export pupil data (CSV, PDF)                      │   │
│  │  - manage class roster                               │   │
│  │ Cannot:                                               │   │
│  │  - delete pupil data                                 │   │
│  │  - modify other teachers' classes                    │   │
│  │  - access school-wide admin functions                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Parent (id_parent)                                    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Can:                                                  │   │
│  │  - read own child(ren)'s progress & results          │   │
│  │  - view written feedback                             │   │
│  │  - receive email notifications on milestones         │   │
│  │ Cannot:                                               │   │
│  │  - modify pupil submissions                          │   │
│  │  - see other families' data                          │   │
│  │  - access classroom content                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ School Admin (id_admin)                               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Can:                                                  │   │
│  │  - manage all teachers in school                     │   │
│  │  - view school-wide analytics                        │   │
│  │  - manage content (formulas, prompts, rubrics)       │   │
│  │  - export school reports (SATS data, etc.)           │   │
│  │  - manage license/subscription                       │   │
│  │ Cannot:                                               │   │
│  │  - delete pupil data (retention policy enforced)     │   │
│  │  - bypass teacher RLS                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘

```

### JWT Claims & RLS Policies

**JWT Payload:**
```json
{
  "sub": "pupil-uuid-or-teacher-uuid",
  "email": "user@example.com",
  "role": "pupil|teacher|parent|school_admin",
  "school_id": "school-uuid",
  "class_ids": ["class-1", "class-2"],  // for teachers
  "linked_pupil_ids": ["pupil-1"],       // for parents
  "iat": 1234567890,
  "exp": 1234607890
}
```

**RLS Policies (Example):**
```sql
-- Pupils can only read their own sessions
CREATE POLICY "pupils_read_own_sessions" ON pupil_sessions
  FOR SELECT USING (
    auth.uid() = pupil_id
  );

-- Teachers can read sessions of pupils in their classes
CREATE POLICY "teachers_read_class_sessions" ON pupil_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_memberships
      WHERE class_memberships.teacher_id = auth.uid()
        AND class_memberships.pupil_id = pupil_sessions.pupil_id
    )
  );

-- Parents can read own child's sessions
CREATE POLICY "parents_read_linked_pupil_sessions" ON pupil_sessions
  FOR SELECT USING (
    auth.uid()::text = ANY (
      SELECT parent_id::text FROM pupil_family_links
      WHERE pupil_id = pupil_sessions.pupil_id
    )
  );
```

---

## AI Assessment Architecture

### Five-Layer Assessment Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 5: Teacher Override                │
│          (Optional: manually adjust score + feedback)        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│             Layer 4: Rubric Scoring (gpt-4o)               │
│  UK National Curriculum rubrics (KS1/KS2/KS3 specific)      │
│  - Phonics (KS1)                                            │
│  - Sentence variety (KS2+)                                  │
│  - Paragraph organisation (KS2+)                            │
│  - Spelling (KS1+)                                          │
│  - Grammar (KS1+)                                           │
│  - Punctuation (KS1+)                                       │
│  - Vocabulary (KS2+)                                        │
│  - Audience awareness (KS3+)                                │
│  Output: detailed rubric score + narrative feedback         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│          Layer 3: Semantic Analysis (gpt-4o-mini)           │
│  Paragraph Builder: meaning clarity, coherence              │
│  Writing Studio: argument coherence, evidence support       │
│  Output: semantic score + suggestions                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│       Layer 2B: Cohesion Check (gpt-4o-mini)               │
│  Sentence linking, pronoun reference, logical flow          │
│  Used for Paragraph Builder only                            │
│  Output: cohesion score + highlighted fixes                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│      Layer 2: Formula NLP Validation (gpt-4o-mini)          │
│  Parse sentence into word classes, verify pattern match     │
│  Check grammar & agreement (subject-verb, articles)         │
│  Output: correct/incorrect + specific error                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│         Layer 1: Client-Side Validation (JS)                │
│  Verify all slots filled, no duplicates, formula complete   │
│  Fail fast before calling AI                                │
│  Output: validation error or pass to Layer 2                │
└─────────────────────────────────────────────────────────────┘
```

### Prompt Template Versioning

**Location:** `packages/ai-prompts/src/`

**Files:**
- `formula-assessment.md` — versioned prompt for gpt-4o-mini (formula)
- `paragraph-assessment.md` — versioned prompt for gpt-4o-mini (paragraph)
- `writing-assessment.md` — versioned prompt for gpt-4o (writing, includes rubrics)
- `index.ts` — exports prompts by version

**Format:**
```markdown
# Formula Assessment Prompt v1.2

You are a grammar tutor assessing a pupil's sentence.

## Input
- Sentence (pupil-generated)
- Formula pattern (e.g., Determiner + Adjective + Noun + Verb)
- Target grammar rule

## Task
Check if the sentence follows the formula and is grammatically correct.

## Output
JSON:
{
  "correct": boolean,
  "score": 0–100,
  "error_type": "missing_word_class|grammar_error|...",
  "feedback": "...",
  "corrected_sentence": "..."
}
```

**Version Control:**
- Prompt changes tracked in git history
- Edge Functions reference versioned prompt at time of deployment
- A/B testing possible by deploying two function versions

---

## Edge Function Architecture

### General Structure

**Endpoint:** `https://[project].supabase.co/functions/v1/[function-name]`

**Auth:** Bearer JWT in Authorization header (auto-verified by Supabase Auth)

**Input/Output:** JSON

**Timeout:** 60 seconds

**Memory:** 512MB (per Supabase defaults)

### Function 1: `assess-formula`

**Endpoint:** POST `/assess-formula`

**Input:**
```json
{
  "sentence": "The quick dog ran",
  "formulaId": 5,
  "formulaPattern": "Determiner Adjective Noun Verb"
}
```

**Execution:**
1. Load formula definition from DB cache or static JSON
2. Load prompt template `formula-assessment.md`
3. Call OpenAI gpt-4o-mini with prompt + sentence
4. Parse response JSON
5. Return to client

**Output:**
```json
{
  "score": 85,
  "correct": true,
  "feedback": "Good! Your sentence follows the pattern.",
  "details": {
    "wordClasses": ["Determiner", "Adjective", "Noun", "Verb"],
    "grammarIssues": []
  },
  "error": null
}
```

**Error Handling:**
- OpenAI timeout: return `{ error: "Assessment service unavailable", score: null }`
- Invalid formula: return `{ error: "Formula not found", score: null }`
- PII detected in sentence: return `{ error: "Please remove names", score: null }`

---

### Function 2: `assess-paragraph`

**Endpoint:** POST `/assess-paragraph`

**Input:**
```json
{
  "lead": "The adventure began in the forest.",
  "support": "We saw ancient trees and heard bird calls.",
  "close": "It was the best day ever.",
  "genreId": 1,
  "formulaId": 15
}
```

**Execution:**
1. Validate LSC structure (non-empty, length constraints)
2. Load paragraph assessment prompt
3. Call OpenAI gpt-4o-mini with full LSC paragraph
4. Parse response
5. Return to client

**Output:**
```json
{
  "score": 78,
  "cohesion": {
    "score": 75,
    "feedback": "Pronoun references are clear."
  },
  "vocabulary": {
    "score": 80,
    "feedback": "Good use of genre-specific words."
  },
  "genre": {
    "match": true,
    "feedback": "Narrative elements present."
  },
  "overall_feedback": "Your paragraph has good flow...",
  "error": null
}
```

---

### Function 3: `assess-writing`

**Endpoint:** POST `/assess-writing`

**Input:**
```json
{
  "content": "Once upon a time... [400+ words]",
  "keyStage": "KS2",
  "promptId": 3,
  "submissionId": "sub-uuid"
}
```

**Execution:**
1. Validate word count (400–700)
2. Extract key stage (KS1/KS2/KS3) from JWT or request
3. Load rubric template for key stage
4. Load writing assessment prompt
5. Call OpenAI gpt-4o with rubric + content (most capable model)
6. Parse response
7. Store full assessment result in DB
8. Return to client

**Output:**
```json
{
  "overall_score": 82,
  "grade": "B",
  "rubric_scores": {
    "sentence_variety": {
      "score": 85,
      "feedback": "Good mix of simple and compound sentences."
    },
    "paragraph_organisation": {
      "score": 78,
      "feedback": "Clear topic sentences, but support could be stronger."
    },
    "spelling": {
      "score": 90,
      "feedback": "Only minor errors in complex words."
    },
    "grammar": {
      "score": 82,
      "feedback": "Generally accurate; watch for agreement in one place."
    },
    ... (more rubric entries)
  },
  "strengths": [
    "Creative vocabulary",
    "Clear narrative arc"
  ],
  "areas_for_improvement": [
    "Vary sentence openings more",
    "Proofread for subject-verb agreement"
  ],
  "next_steps": "Try starting different sentences with adverbial phrases.",
  "error": null
}
```

---

## Database Schema Overview

**Key Tables:**

```sql
-- Users
users
  ├── id (UUID, PK)
  ├── email
  ├── role ('pupil' | 'teacher' | 'parent' | 'school_admin')
  ├── school_id (FK: schools.id)
  ├── created_at
  └── RLS: users can only read own row + linked data

-- Pupils
pupils
  ├── id (UUID, PK)
  ├── user_id (FK: users.id)
  ├── name
  ├── date_of_birth
  ├── key_stage (KS1 | KS2 | KS3)
  ├── current_level (1–67)
  ├── xp_total
  └── RLS: pupils read own, teachers read class pupils

-- Sessions: Formula Practice
pupil_sessions_formula
  ├── id (UUID, PK)
  ├── pupil_id (FK: pupils.id)
  ├── formula_id (FK: formulas.id)
  ├── sentence (submitted)
  ├── score (0–100 from assessment)
  ├── correct (boolean)
  ├── assessment_feedback
  ├── created_at
  └── RLS: pupils read own, teachers read class pupils

-- Sessions: Paragraph Builder
pupil_sessions_paragraph
  ├── id (UUID, PK)
  ├── pupil_id
  ├── formula_id
  ├── genre_id
  ├── lead (sentence)
  ├── support (text)
  ├── close (sentence)
  ├── score
  ├── assessment_result (JSON: cohesion, vocabulary, genre)
  ├── created_at
  └── RLS: pupils read own, teachers read class

-- Submissions: Writing Studio
pupil_writing_submissions
  ├── id (UUID, PK)
  ├── pupil_id
  ├── prompt_id
  ├── key_stage
  ├── content (full text)
  ├── word_count
  ├── status ('draft' | 'submitted' | 'assessed')
  ├── ai_score
  ├── ai_assessment (JSON: rubric scores)
  ├── teacher_override_score (nullable)
  ├── teacher_feedback
  ├── pdf_export_url
  ├── submitted_at
  ├── assessed_at
  └── RLS: pupils read own drafts, teachers read submissions

-- Formulas (L1–L67) — static, seeded at init
formulas
  ├── id (PK: 1–67)
  ├── level
  ├── pattern (JSON: array of word class slots)
  ├── word_classes (JSON: class name → colour hex)
  ├── description
  └── illustration_url

-- Gamification
pupil_xp
  ├── id (PK)
  ├── pupil_id
  ├── xp_earned (per submission)
  ├── reason ('formula_correct' | 'paragraph_submitted' | ...)
  ├── created_at
  └── RLS: pupils read own, teachers read class

pupil_badges
  ├── id (PK)
  ├── pupil_id
  ├── badge_type ('first_formula' | 'level_unlock' | ...)
  ├── earned_at
  └── RLS: pupils read own, teachers read class

pupil_streaks
  ├── id (PK)
  ├── pupil_id
  ├── current_streak
  ├── last_session_date
  ├── best_streak
  └── RLS: pupils read own, teachers read class

-- Teacher Dashboard
class_memberships
  ├── id (PK)
  ├── teacher_id (FK: users.id)
  ├── class_id (FK: classes.id)
  ├── pupil_id (FK: pupils.id)
  └── RLS: teachers read own classes, pupils see own membership

-- Realtime subscriptions
pupils_realtime (subscribed by teacher dashboard for live updates)
```

---

## Realtime Dashboard Strategy

**Use Case:** Teachers see pupil progress update in real-time as they submit.

**Implementation:**
```typescript
// Teacher dashboard component
const TeacherDashboard = () => {
  const [pupils, setPupils] = useState([])

  useEffect(() => {
    // Initial load
    supabase
      .from('pupil_progress_view')  // materialized view for perf
      .select('*')
      .eq('class_id', classId)
      .then(({ data }) => setPupils(data))

    // Subscribe to realtime updates
    const subscription = supabase
      .channel(`class:${classId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pupil_progress_view',
          filter: `class_id=eq.${classId}`
        },
        (payload) => {
          // Pupil submitted → progress updates → dashboard updates
          setPupils(prev => [
            ...prev.filter(p => p.pupil_id !== payload.new.pupil_id),
            payload.new
          ])
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [classId])

  return (
    <div>
      {pupils.map(pupil => (
        <PupilProgressCard key={pupil.pupil_id} pupil={pupil} />
      ))}
    </div>
  )
}
```

**Materialized View (created by migration):**
```sql
CREATE MATERIALIZED VIEW pupil_progress_view AS
SELECT
  p.id as pupil_id,
  p.current_level,
  COUNT(CASE WHEN pf.correct THEN 1 END) as correct_formulas,
  COUNT(pf.id) as total_formulas_submitted,
  COALESCE(SUM(xp.xp_earned), 0) as total_xp,
  ps.current_streak,
  cm.class_id
FROM pupils p
LEFT JOIN pupil_sessions_formula pf ON p.id = pf.pupil_id
LEFT JOIN pupil_xp xp ON p.id = xp.pupil_id
LEFT JOIN pupil_streaks ps ON p.id = ps.pupil_id
LEFT JOIN class_memberships cm ON p.id = cm.pupil_id
GROUP BY p.id, cm.class_id, ps.current_streak;
```

---

## Monitoring & Logging

**Edge Function Logs:**
- Supabase dashboard: Functions → [function name] → Logs
- Log level: info (success), warn (validation failure), error (API failure)
- Do NOT log full payloads or PII
- Example: `{ action: "assess_formula", status: "success", duration_ms: 1234, formula_id: 5 }`

**Client-Side Errors:**
- Use `console.error` for debugging during dev
- In production, send to error tracking service (e.g., Sentry)
- GDPR: strip all PII before sending

**Offline Sync Failures:**
- Log to IndexedDB `syncLogs` table
- Show user-friendly toast: "Unable to sync. Retrying..."
- Auto-retry up to 3 times, then require manual retry

---

## Testing Strategy

### Unit Tests (Vitest)

- Formula validator, word class parser, PII stripper
- Zustand selectors and actions
- Utility functions (date formatting, word count, etc.)

### Component Tests (React Testing Library)

- FormulaBuilder drag-and-drop interactions
- ParagraphPhaseA/B/C form validation
- WritingEditor autosave behavior
- XPCounter animation trigger

### E2E Tests (Playwright)

- **Happy path (formula):** Login → select level → build sentence → submit → see feedback
- **Happy path (paragraph):** Formula unlock → extend to paragraph → submit → see LSC score
- **Happy path (writing):** Start essay → autosave → submit → see rubric → download PDF
- **Offline flow:** Network throttle → submit sentence → queue in IDB → go online → sync
- **Teacher dashboard:** Login as teacher → see real-time pupil progress updates

---

## Deployment Checklist

- [ ] All migrations run on production DB
- [ ] Edge Functions deployed with correct secrets (OPENAI_API_KEY, etc.)
- [ ] TypeScript types generated from production schema
- [ ] E2E tests pass on production environment
- [ ] RLS policies active and tested
- [ ] Realtime subscriptions enabled in Supabase
- [ ] Backups enabled
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (Mixpanel or similar) configured
- [ ] Rate limiting on Edge Functions enabled
- [ ] GDPR data retention policies documented

---

**Last Updated:** 2025-04-23  
**Schema Version:** 1.0  
**AI Assessment:** Layer 5 Model (Client validation → NLP → Cohesion → Semantic → Rubric → Teacher)
