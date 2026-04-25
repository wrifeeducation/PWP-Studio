# WriFe Platform — Feature Ticket List

## PHASE 1: Foundation & Core UI (Month 1)

---

### WF-001: Project Scaffold & Monorepo Setup
**Layer:** Foundation  
**Estimate:** M  
**Dependencies:** None  

**Description:**  
Initialize a pnpm monorepo with Vite, React 18, TypeScript 5, and Tailwind CSS. Set up root-level build config, shared tsconfig, and Supabase local development environment. Configure environment variables and pnpm workspaces for shared packages (formula-engine, ui-components, utils).

**Acceptance Criteria:**
1. Monorepo structure with `packages/{web,formula-engine,ui-components,utils}` workspaces is created and functional
2. Root `pnpm-workspace.yaml` correctly lists all workspaces
3. Root `vite.config.ts` and `tsconfig.json` are shared and configured for multi-package builds
4. Tailwind CSS is configured with custom colour tokens for all 8 word classes
5. .env.local template includes Supabase keys, API endpoints, and feature flags
6. `pnpm install` and `pnpm dev` run successfully with no errors
7. Supabase local emulator starts via `supabase start` with schema pre-loaded

**Test Notes:**
- Manual: Run `pnpm install`, verify all workspaces install correctly; run `pnpm dev` in web package, check Vite dev server starts on port 5173
- Automated: Vitest script verifies workspace resolution for formula-engine imports in web package

---

### WF-002: Supabase Schema Migrations (Core Tables)
**Layer:** Infrastructure  
**Estimate:** L  
**Dependencies:** WF-001  

**Description:**  
Create and apply Supabase migrations for all core tables: users, schools, classes, pupils, pupils_classes, sessions, session_formula_attempts, session_paragraph_entries, writing_submissions, xp_awards, badges, streaks, and progress tracking. Set up RLS policies for role-based access (teacher/pupil/admin).

**Acceptance Criteria:**
1. All 13 core tables exist in Supabase with correct column types and constraints
2. Foreign key relationships are enforced (e.g., pupils → schools, sessions → pupils, session_attempts → sessions)
3. RLS policies enforce teacher can only see own school's classes; pupils can only see own sessions and submissions
4. Timestamps (created_at, updated_at) are set with default `now()` and auto-update triggers
5. Soft-delete columns (deleted_at) are present on users, classes, pupils, sessions for audit trails
6. UUID primary keys are used throughout; sequences for public IDs where needed (e.g., pupil PIN)
7. Indexes exist on high-query columns: (school_id, class_id), (pupil_id), (created_at), (user_id)
8. Migration file is idempotent and can be safely re-applied

**Test Notes:**
- Manual: Connect to Supabase local, verify each table with `\dt` in psql; insert sample data and confirm RLS policies block cross-school access
- Automated: Vitest tests verify schema structure via Supabase admin API; RLS policy tests use separate user contexts

---

### WF-003: Teacher & Pupil Auth (Email/PIN/QR)
**Layer:** Foundation  
**Estimate:** L  
**Dependencies:** WF-002  

**Description:**  
Implement authentication flows: teachers login with email/password (Supabase Auth); pupils login with PIN or QR code that embeds class_id and school_id. Pupils see PIN prompt on home screen, can scan QR posted in classroom. Store pupil session tokens in localStorage, auto-refresh on app reload.

**Acceptance Criteria:**
1. Teacher email/password signup and login flow creates user record in auth.users and profiles table
2. Pupil PIN login (4–6 digits) retrieves class_id from database, creates anonymous session, stores token in localStorage
3. QR code login flows through same PIN validation after scan (QR encodes PIN + school_id)
4. Failed auth attempts logged and rate-limited (max 5 attempts per 10 minutes per IP)
5. Session tokens persist across browser reload for 24 hours; expired tokens redirect to login
6. Teacher dashboard only accessible after email verification (Supabase built-in)
7. Pupil logout clears localStorage and session token
8. Role-based routing: teachers → /teacher/*; pupils → /pupil/*; unauthenticated → /login

**Test Notes:**
- Manual: Sign up teacher, verify email in Supabase console, login; login with sample PIN, verify classroom loads
- Automated: Playwright E2E for teacher signup/login, pupil PIN login, session persistence, token expiry; auth context unit tests

---

### WF-004: Design System & Colour Tokens
**Layer:** Foundation  
**Estimate:** M  
**Dependencies:** WF-001  

**Description:**  
Define and implement Tailwind CSS custom colour tokens for word classes, UI states (success/warning/error), and accessibility. Create shadcn/ui theme config with light mode and optional high-contrast variant. Document colour ratios for WCAG AA compliance.

**Acceptance Criteria:**
1. Tailwind config exports 8 word-class colours with lightened variants for backgrounds: Determiner purple(#7C3AED / bg-#F4E4FF), Adjective green, Noun blue, Verb red, Adverb orange, Preposition brown, Pronoun pink, Conjunction yellow
2. Utility classes available for all colours: `text-determiner`, `bg-determiner`, `border-determiner`
3. shadcn/ui `components.json` configured with custom colour theme
4. High-contrast mode toggle available; switches text to 7:1 contrast ratio, removes decorative colours
5. Typography system defined: heading sizes, body line-height, monospace for code blocks
6. Colour palette documented in `/docs/design-system.md` with WCAG contrast ratios for all combinations
7. Tailwind build output verified with no unused CSS (Lighthouse Unused CSS test)
8. Dark mode not yet implemented (v2 feature); base is light mode only

**Test Notes:**
- Manual: Load app in light mode, verify all word-class tiles render correct colour; toggle high-contrast, verify 7:1 ratios with axe DevTools
- Automated: Vitest tests verify Tailwind config parsing; CSS contrast ratio validation script

---

### WF-005: Word Class Tile Component
**Layer:** Foundation  
**Estimate:** M  
**Dependencies:** WF-004  

**Description:**  
Build a reusable `<WordTile />` component that displays a word with its class label, colour-coded background, and draggable affordance. Supports both draggable (Phase A/B) and read-only states. Includes optional audio pronunciation button (Web Speech API).

**Acceptance Criteria:**
1. Component accepts props: `word: string`, `wordClass: WordClassType`, `draggable?: boolean`, `audio?: boolean`, `size?: 'sm' | 'md' | 'lg'`
2. Background colour matches word class; text colour contrasts to 4.5:1 minimum
3. Draggable tiles show visual lift/shadow on `dragstart`; drag handle icon visible in Phase A/B
4. Read-only tiles (Phase C/D) show no drag affordance; label is always visible
5. Audio button plays pronunciation via Web Speech API using browser's default voice
6. Component exports `draggable={true}` attribute for dnd-kit integration
7. Keyboard accessible: Tab navigates between tiles, Space/Enter triggers audio
8. Responsive: sm = 24px font, md = 28px, lg = 32px; padding scales accordingly

**Test Notes:**
- Manual: Render draggable and read-only tiles for each word class; verify colours, drag feedback, audio pronunciation
- Automated: Vitest snapshot tests for all sizes/states; axe a11y tests for contrast and keyboard nav

---

### WF-006: Formula Slot Component
**Layer:** Foundation  
**Estimate:** M  
**Dependencies:** WF-004, WF-005  

**Description:**  
Build a `<FormulaSlot />` component that represents a position in a sentence formula (e.g., Determiner slot, Noun slot). Accepts drag-and-drop tiles, validates word class match, shows error state if mismatch. Phase A shows label + colour hint; Phases B/C/D show colour hint only.

**Acceptance Criteria:**
1. Component accepts props: `expectedClass: WordClassType`, `phase: Phase`, `onDrop: (word) => void`, `value?: string`
2. Slot displays colour-coded background matching expected word class; label visible in Phase A only
3. Drop zone accepts dnd-kit draggable items; onDrop triggers validation callback
4. Invalid drop (e.g., Verb into Noun slot) shows flash animation and error message for 2s, rejects drop
5. Valid drop fills slot with word tile; dnd-kit removes tile from source word bank
6. Phase A shows both colour and text label; Phase B shows colour badge; Phase C/D show colour outline only
7. Empty slot shows faded colour background with dashed border in edit mode
8. Read-only mode (submitted/reviewed) shows filled slot with no drop zone

**Test Notes:**
- Manual: Drag mismatched word class, verify error feedback; drag correct class, verify acceptance
- Automated: Vitest tests for validation logic, dnd-kit drop handling, phase-based label rendering

---

### WF-007: Formula Engine Package (TS Core Logic)
**Layer:** Foundation  
**Estimate:** L  
**Dependencies:** None  

**Description:**  
Create a pure TypeScript formula-engine package with no React dependencies. Exports validation functions, progression rules, and level data. Includes formula templates (L1–7 for Formula Practice, L8+ with sentence starters), word class definitions, and phase scaffold logic.

**Acceptance Criteria:**
1. Package exports `types/index.ts` with WordClass, Phase, Level, Formula, FormulaAttempt, SessionScore interfaces
2. `formulaData.ts` defines all 67 levels with formula structure, word lists, sentence starters (L8+), and expected sentence count per level
3. `validate.ts` exports `validateWord(word, expectedClass): boolean`, `validateSlot(slot, word): ValidationResult`, `validateFormula(formula, level): ValidationResult`
4. `progression.ts` exports `getPhaseForLevel(level): Phase`, `getScaffoldConfig(level, phase): ScaffoldConfig`, `getMasteryGate(sessionCount, avgScore): MasteryStatus`
5. `wordClassMap.ts` maps all ~500 seed words to classes; used by assess-formula for validation
6. Unit tests cover all validation edge cases, boundary levels (L7→L8, L20→L21), and scaffold transitions
7. Package builds to both ESM and CommonJS; compiled TypeScript included in dist/
8. No external dependencies except TypeScript; tree-shakeable exports

**Test Notes:**
- Automated: Comprehensive Vitest suite with 50+ tests covering all validation, progression, and scaffold rules; no manual testing needed (pure logic)

---

### WF-008: Formula Builder UI — Phase A (Levels 1–7)
**Layer:** Formula  
**Estimate:** L  
**Dependencies:** WF-003, WF-005, WF-006, WF-007  

**Description:**  
Build the core Formula Practice interface for Phase A (L1–7). Display formula with colour-coded slots, full word bank at bottom, sentence starter visible, all slots draggable. Include submit button, which triggers local validation and calls assess-formula API. Display feedback on slot level (colour-coded "not yet" hints).

**Acceptance Criteria:**
1. Level selector or auto-increment shown at top; current level (L1–7) displayed with formula structure
2. Colour-coded slots render in formula order; each slot label visible (Phase A)
3. Word bank displays 6–8 randomized words from level word list; all draggable
4. Sentence starter phrase (e.g., "One morning,") appears above slots
5. Drag-and-drop works smoothly with visual feedback: tile lifts on drag, slot highlights on hover, slot fills on drop
6. Submit button enabled only when all slots filled; disabled state is greyed out
7. On submit: validates locally, calls assess-formula Edge Function, displays per-slot feedback (green tick or red X + hint)
8. Feedback persists; "Reset" button clears slots and word bank for retry
9. Session auto-saves every 30s to Supabase; unsaved indicator shown on UI
10. Mobile/tablet: touch-friendly drag-and-drop via dnd-kit touch backend; slots stack vertically on small screens

**Test Notes:**
- Manual: Drag words into slots on desktop and mobile; submit incomplete formula (disabled), then complete and submit; verify feedback
- Automated: Playwright E2E for drag-drop flow, validation, API call, feedback render; Vitest for slot-fill logic

---

### WF-009: Word Warm-Up Component (Matching Activity)
**Layer:** Formula  
**Estimate:** M  
**Dependencies:** WF-005, WF-004  

**Description:**  
Create a 3–5 minute matching warm-up activity shown before Formula Practice. Displays 8–10 words on left, 8 word-class labels on right (with colours). Pupil drags word tiles to match correct label slots. Auto-advances to Formula Practice on 80% accuracy or after 5 minutes.

**Acceptance Criteria:**
1. Activity loads with random word sample from current level word bank
2. Left side shows draggable word tiles; right side shows 8 drop zones with colour backgrounds and class labels
3. Drag word to matching colour slot; validates on drop, shows green check or flash error
4. Tracks accuracy: correct matches counted; target is 80% (7/10 or 6/8)
5. Timer displays in top-right; counts down from 5:00
6. Auto-advance to Formula Practice if 80% reached before timer; otherwise advances at 5:00 expired
7. Summary shows accuracy %; no penalty for wrong matches, just counts toward total
8. Accessible: keyboard support (Tab through tiles and slots, Space/Enter to confirm match)
9. Mobile: responsive; tiles and slots stack on small screens

**Test Notes:**
- Manual: Match words correctly, verify auto-advance; let timer expire, verify session advances; keyboard nav
- Automated: Playwright for warm-up flow, accuracy calculation, timer; Vitest for matching logic

---

### WF-010: Subject Rotation & Daily Word Display
**Layer:** Gamification  
**Estimate:** S  
**Dependencies:** WF-007  

**Description:**  
Implement a daily subject rotation system that cycles through 5 topic categories (animals, weather, food, transport, emotions). Each day, a new subject is featured with a word of the day. Subject is displayed as a badge in pupil home screen and filters word banks to show 1–2 words from that subject per session.

**Acceptance Criteria:**
1. Subject rotation uses deterministic daily seed (same subject for all pupils on same date); rotates at midnight UTC
2. Subjects cycle through: animals → weather → food → transport → emotions → (repeat)
3. Word of the day is selected from current level's word bank for that subject; displayed on home screen with illustration (emoji or icon)
4. Word bank in Formula Practice includes 1–2 words from daily subject
5. Home screen displays "Today's Subject: Animals" with emoji + word of day
6. Pupils who complete formula with daily subject word earn bonus XP (5–10 XP)
7. Subject state stored in localStorage and validated against server time on app load
8. A/B testable: subject toggle in teacher admin panel to disable/enable feature

**Test Notes:**
- Manual: Load app multiple days, verify subject rotates; complete formula with daily subject word, verify bonus XP
- Automated: Vitest for daily seed determinism (fixed date input), subject cycle, word selection

---

### WF-011: Paragraph Builder Frame — Phase A (All 4 Genres)
**Layer:** Paragraph  
**Estimate:** L  
**Dependencies:** WF-006, WF-007, WF-008  

**Description:**  
Build the Paragraph Builder UI showing the full Lead→Support→Close structure. Phase A displays all 4 genre tabs (Narrative/Non-fiction/Persuasive/Poetry) with pre-filled sentence starters in each position, word banks for each slot, and colour-coded word-class expectations. Users build a complete paragraph by extending their formula sentence into each position.

**Acceptance Criteria:**
1. Genre tabs at top switch between Narrative, Non-fiction, Persuasive, Poetry; each has unique starters and word lists
2. Lead row shows formula sentence from L8+ as pre-filled first sentence (read-only or editable per phase rule)
3. Support row shows 2–3 sentence starter options; pupil selects one and builds using word bank + slots (same formula structure as Phase A Formula)
4. Close row shows 1–2 sentence starters; pupil completes with word bank + slots
5. Word banks are genre-specific; Support and Close slots colour-coded to expect word classes (Adjectives for descriptions, Verbs for action, etc.)
6. Submit button validates all 3 rows complete; calls assess-paragraph API
7. Feedback shows paragraph-level score + strongest sentence highlight + LSC structure validation (Lead→Support→Close present)
8. Phase A shows all labels and word banks; scaffolds fully visible
9. Mobile: rows stack vertically; tabs are scrollable
10. Session auto-saves every 30s

**Test Notes:**
- Manual: Switch genres, verify starters and word banks change; build paragraph, submit, verify feedback
- Automated: Playwright for genre switching, paragraph building, API submission; Vitest for scaffold rendering per genre

---

### WF-012: Writing Studio Editor Setup (ProseMirror + tiptap)
**Layer:** Writing Studio  
**Estimate:** M  
**Dependencies:** WF-003, WF-004  

**Description:**  
Integrate ProseMirror via tiptap with a clean editor toolbar. Configure for extended writing (KS2/KS3 level). Include core extensions: Heading, Bold, Italic, BulletList, OrderedList, Blockquote, CodeBlock. Set up schema for semantic annotation (story element markers for narrative, argument markers for persuasive).

**Acceptance Criteria:**
1. tiptap Editor initializes with editable content; toolbar shows formatting buttons (bold, italic, headings)
2. Editor accepts keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+H (heading), Ctrl+L (list)
3. Schema supports custom nodes: `narrative-element` (with type: action/dialogue/description), `argument-element` (with type: claim/evidence/rebuttal)
4. Toolbar button toggles narrative/argument markers; user can wrap text in semantic markers
5. Word count displays in bottom-right; updates in real-time
6. Serializes to JSON for storage; deserializes correctly on load
7. Autosave every 10s to Supabase; unsaved indicator visible
8. Mobile: toolbar collapses to icon-only menu; editor is full-width
9. No spellcheck underlines or AI suggestions in base (v1); clean editor experience
10. Paste plain text or formatted text; preserves basic formatting (bold, italic, lists)

**Test Notes:**
- Manual: Type and format text; apply semantic markers; autosave and reload, verify content persists
- Automated: Vitest for schema validation, marker application; Playwright for toolbar interaction

---

### WF-013: Writing Studio Task Brief & BME Planning Tool
**Layer:** Writing Studio  
**Estimate:** M  
**Dependencies:** WF-012  

**Description:**  
Create a task brief panel (right sidebar or collapsible drawer) that displays the writing prompt, genre, success criteria, and expected word count. Include an interactive BME (Beginning/Middle/End) planning tool: 3 expandable text fields for quick outline, saved with the draft.

**Acceptance Criteria:**
1. Task brief displays: prompt text, genre (Narrative/Non-fiction/Persuasive/Poetry), word count range, time limit (if timed), success criteria checkboxes (editable teacher prompt)
2. BME planning tool: 3 labeled sections (Beginning, Middle, End) with expandable text inputs
3. Planning saved automatically when pupil types; linked to writing submission draft
4. BME outline visible on same screen as editor (side-by-side on desktop, tabs on mobile)
5. Success criteria checklist in brief; pupil can self-assess before submitting
6. Criteria are customizable by teacher per writing task; defaults provided for each genre
7. Read-only mode after submission; outline locked
8. Estimated time display: "Start time: 10:30, Elapsed: 12 min, Time remaining: 8 min"
9. Mobile: brief and editor in tabs; BME in collapsible drawer below brief
10. Dark text on light background; high contrast for readability

**Test Notes:**
- Manual: Read prompt, write BME outline, switch to editor and back, submit; verify outline saved and persists
- Automated: Playwright for brief display, BME save/load; Vitest for timer logic

---

## PHASE 1 SPRINT BREAKDOWN: Month 2 — AI Assessment & Gamification

---

### WF-014: Supabase Edge Function `assess-formula`
**Layer:** Infrastructure  
**Estimate:** L  
**Dependencies:** WF-007, WF-002  

**Description:**  
Create a Supabase Edge Function that accepts a formula attempt (array of words in slots for a given level) and returns: per-slot validation (correct/incorrect), overall accuracy %, XP score (0–100), and per-slot feedback strings. Uses gpt-4o-mini with a per-level rubric stored in `formula_rubrics` table.

**Acceptance Criteria:**
1. Function endpoint: `POST /assess-formula` accepts JSON: `{ sessionId, levelId, submittedFormula: Word[] }`
2. Retrieves level definition from formula-engine package; compares each slot word against expected word class
3. Calls gpt-4o-mini with prompt: "Grade this sentence formula. Level {N}, expected: {structure}. Submitted: {sentence}. Return JSON: { correct: boolean, feedback: string, xpScore: 0–100 }"
4. Falls back to rule-based validation if API fails (checks word class for each slot)
5. Returns JSON: `{ slotResults: [ { slotIndex, expectedClass, submitted, correct, feedback } ], accuracy: %, xpScore, sessionXpTotal }`
6. Stores result in session_formula_attempts table with timestamp
7. Max response time: 3s; timeouts return rule-based validation only
8. Rate limit: max 10 assessments per pupil per minute
9. Logs all requests to edge_function_logs for audit
10. Errors return 400 with message (invalid level, malformed input) or 500 with retry guidance

**Test Notes:**
- Manual: Submit correct formula, verify all slots marked correct and XP awarded; submit incorrect formula, verify feedback
- Automated: Playwright for submit flow; Vitest for Edge Function mocking gpt-4o-mini response

---

### WF-015: Formula Feedback UI (Slot-Level Error Highlighting)
**Layer:** Formula  
**Estimate:** M  
**Dependencies:** WF-008, WF-014  

**Description:**  
Display assess-formula response with visual feedback: correct slots show green tick, incorrect slots show red X and a "not yet" style hint. Hint text uses positive framing ("Noun expected") rather than negative. Feedback persists on screen; user can retry by clearing and refilling slots.

**Acceptance Criteria:**
1. After submit, formula locks and feedback layer renders over each slot
2. Green tick icon appears in correct slots; text colour changes to green
3. Red X icon appears in incorrect slots; background fades to light red
4. Below each incorrect slot, hint text appears: "Noun expected, not {submitted}. Try a person, place, or thing."
5. Hint text uses consistent "not yet" language (no shame, growth mindset)
6. Reset button clears all slots and feedback; pupils can immediately retry
7. Feedback fades out after 5s if pupil doesn't interact (optional: dismiss button to close earlier)
8. Accessibility: colour + icon + text ensures non-colour-blind pupils understand result
9. Feedback text is large enough (16px) for dyslexic pupils to read comfortably
10. Mobile: feedback overlays scale responsively; text is centered and readable on small screens

**Test Notes:**
- Manual: Submit formula, verify green/red feedback, colour/icon/text all present; reset and retry
- Automated: Playwright for feedback rendering and reset flow; snapshot tests for feedback text

---

### WF-016: Supabase Edge Function `assess-paragraph`
**Layer:** Infrastructure  
**Estimate:** L  
**Dependencies:** WF-011, WF-007  

**Description:**  
Create a Supabase Edge Function that accepts a completed paragraph (3 sentences: Lead, Support, Close) and returns: overall quality score (0–100), LSC structure validation (all 3 present), coherence score, strongest sentence identification, and per-sentence feedback. Uses gpt-4o-mini with a 4-dimension rubric.

**Acceptance Criteria:**
1. Function endpoint: `POST /assess-paragraph` accepts JSON: `{ sessionId, levelId, genre, paragraph: { lead, support, close } }`
2. Validates paragraph structure: all 3 sentences present and non-empty
3. Calls gpt-4o-mini with prompt: "Grade this {genre} paragraph for KS2 (Yr {3–4}). Lead: '{lead}'. Support: '{support}'. Close: '{close}'. Return JSON: { leadScore, supportScore, closeScore, coherence, strongestSentence, feedback }"
4. Scores each sentence 0–100 based on: relevance to genre, grammatical correctness, word-class variety, sentence length appropriateness
5. Coherence score (0–100) checks pronoun consistency, tense consistency, logical flow
6. Returns strongest sentence index (0–2) and explanation
7. Falls back to rule-based scoring (sentence length, tense detection) if API fails
8. Stores result in session_paragraph_entries table
9. XP calculation: 70% from formula score + 30% from paragraph score (fed from WF-014 + this function)
10. Max response time: 5s; errors return basic structure validation + fallback score

**Test Notes:**
- Manual: Submit complete paragraph, verify all 4 scores and strongest sentence highlighted; check feedback quality
- Automated: Playwright for paragraph submit and feedback display; Vitest for Edge Function with mock API response

---

### WF-017: Paragraph Feedback UI (Feedback Card & Strongest Sentence)
**Layer:** Paragraph  
**Estimate:** M  
**Dependencies:** WF-011, WF-016  

**Description:**  
Display assess-paragraph response in a summary card: shows overall quality score, LSC validation checkmarks, and highlights the strongest sentence with a star icon and brief explanation. Allows retry on same level or advance to next.

**Acceptance Criteria:**
1. Feedback card displays after submit; shows: "Paragraph Quality: {score}%", "Lead ✓ / ✗", "Support ✓ / ✗", "Close ✓ / ✗"
2. Strongest sentence (index 0–2) is highlighted with a star icon and tooltip: "Strong work: {sentence}. {explanation}"
3. Overall feedback summary (1–2 sentences) explains what worked well and one growth area
4. Coherence score displayed as percentage; if <60%, a hint shows (e.g., "Check your verb tenses—they change here.")
5. "Retry This Level" button clears paragraph and returns to editor for same level
6. "Move to Next Level" button appears if score ≥ 80% (mastery threshold); disabled if <80%
7. Card is dismissible (X button); user can re-open feedback or advance
8. Mobile: card is full-width, scrollable if content overflows
9. Accessible: all information conveyed in text (no colour-only cues)
10. Feedback text uses growth-mindset language; no shame language

**Test Notes:**
- Manual: Submit paragraph, verify card renders with scores and strongest sentence; click retry/advance buttons
- Automated: Playwright for feedback card display and navigation; Vitest for score threshold logic

---

### WF-018: Composite Session Scoring (70% Formula / 30% Paragraph)
**Layer:** Gamification  
**Estimate:** M  
**Dependencies:** WF-014, WF-016, WF-007  

**Description:**  
Implement composite scoring calculation at session end (L8+): final session score = (formula_score × 0.7) + (paragraph_score × 0.3). Store in session_scores table. Feeds into mastery gate (80% composite over 5 sessions). For L1–7, only formula score counts.

**Acceptance Criteria:**
1. After both formula and paragraph submitted, calculate composite = (formula × 0.7) + (paragraph × 0.3), round to nearest integer
2. For L1–7, composite = formula score (paragraph not attempted)
3. Store composite score in sessions table; also store breakdown (formula_score, paragraph_score) for analytics
4. Display composite score prominently in session summary (larger font than individual scores)
5. Mastery gate logic: track last 5 sessions' composite scores; if all ≥80%, mark level as mastered
6. Fast-track logic: if first 2 sessions both ≥95%, mark as fast-tracked (skip Phase B, enter Phase C)
7. Consolidation logic: if last 2 sessions <60%, move to consolidation track (repeat level, additional scaffolds)
8. API: GET /api/pupil/{pupilId}/progress returns composite scores for all levels, mastery status, fast-track status
9. Scores are immutable once submitted (no edits); audit trail kept
10. Edge case: if only formula attempted in L8+ (no paragraph), use formula score as composite (partial session)

**Test Notes:**
- Manual: Complete formula + paragraph, verify composite displayed; check mastery gate logic across 5 sessions (manual advancement)
- Automated: Vitest for composite calculation, mastery gate thresholds, fast-track/consolidation logic

---

### WF-019: XP Engine (Calculation, Award, Persistence)
**Layer:** Gamification  
**Estimate:** M  
**Dependencies:** WF-014, WF-018, WF-002  

**Description:**  
Implement an XP system where pupils earn XP from formula attempts and paragraph submissions. Base XP = composite score (0–100); bonus XP for daily subject match (+10), first attempt of level (+5), consecutive days (+5 per day). XP is awarded immediately after session submit, persisted in xp_awards table, and total XP tracked in pupils table.

**Acceptance Criteria:**
1. Base XP = composite session score; minimum 10 XP for any attempt
2. Bonuses: daily subject word (+10), first attempt of new level (+5), streak bonus (+5 per consecutive school day, max 3 days)
3. XP awarded immediately on session submit; UI shows XP breakdown: "Base: 85 XP + Daily Subject: 10 XP + First Attempt: 5 XP = 100 XP"
4. Each XP award stored in xp_awards table with (pupil_id, session_id, amount, reason, created_at)
5. Total XP stored in pupils.total_xp; denormalized for fast reads; updated after each award
6. XP is NOT lost on level retry; every attempt earns XP (encourages practice)
7. Pupil can view XP history: recent awards listed in home/dashboard with timestamps and reasons
8. Streak bonus only counts on school days (Mon–Fri); weekends reset streak
9. XP cap per day: 300 XP max (prevents gaming via repeated low-effort submissions)
10. Zustand store holds `totalXp` and `recentAwards` for instant UI updates without refetch

**Test Notes:**
- Manual: Complete sessions with various bonus scenarios; verify XP breakdown displayed and persisted
- Automated: Vitest for XP calculation (base + bonuses), streak logic, daily cap; Playwright for XP display and history

---

### WF-020: Streak System (School-Day Tracking & Shield Mechanic)
**Layer:** Gamification  
**Estimate:** M  
**Dependencies:** WF-019, WF-002  

**Description:**  
Track daily login streaks (school days only: Mon–Fri, excluding school holidays). Streak increments by 1 for each day a pupil completes ≥1 session. Streaks are displayed on home screen with a flame icon. If a pupil misses a school day, streak resets; pupils can restore a broken streak using a token (max 1 restore per week, regenerated Friday 5pm).

**Acceptance Criteria:**
1. Streak starts at 1 when a pupil first logs in on a new school day (Mon–Fri, after 8am local time)
2. Streak increments by 1 if pupil completes ≥1 formula or paragraph session on that day
3. Streak resets to 0 if pupil does not log in on the next school day (Mon–Fri); weekend/holidays don't break streak
4. Streak displayed on home screen: "🔥 5" with last-activity timestamp below
5. Restore token: pupils get 1 token per school week (regenerates Friday 5pm); token can restore a broken streak by 1 day
6. Token UI shows "Restore Streak (1 available)" button; clicking uses token and restores +1 day
7. Token limit: max 3 active tokens; prevents overuse
8. Streak data stored in streaks table: (pupil_id, current_streak, best_streak, last_activity_date, restore_tokens_available)
9. Streak animation on home screen: flame icon grows in size at 3-day, 7-day, 14-day milestones
10. Teachers can view class streak distribution in dashboard (chart showing streak range: 0–2, 3–6, 7+)

**Test Notes:**
- Manual: Login on consecutive school days, verify streak increments; skip a day, verify reset; use restore token, verify streak restored
- Automated: Vitest for streak logic (school-day detection, reset conditions, token regen); Playwright for home screen display and token use

---

### WF-021: Badge Engine (Trigger Evaluation, Award, Persistence)
**Layer:** Gamification  
**Estimate:** L  
**Dependencies:** WF-018, WF-002  

**Description:**  
Implement a badge system with 12–15 earned badges based on milestones: First Formula (after L1), Level Mastery (80% on any level), Fast Track (95%+ in first 2 sessions), Streak achievements (7-day, 14-day, 30-day), Genre Master (complete 10 paragraphs in one genre), and Teacher Choice (manually awarded by teacher). Badges display on profile and award notifications in session summary.

**Acceptance Criteria:**
1. Badge definitions stored in badges_master table: (id, name, description, icon_url, trigger_condition, rarity: bronze/silver/gold/platinum)
2. Badge trigger logic evaluated after session submit: checks session score, level, streak, paragraph count, teacher assignment
3. First matching badge is awarded; stored in user_badges table (pupil_id, badge_id, earned_at)
4. Duplicate badges not awarded; check prevents re-awarding same badge
5. 12 badges defined: First Formula, 5× Level Master (per level tier), Fast Track, 7/14/30-day Streak, Narrative/Non-fiction/Persuasive/Poetry Master, Teacher Choice
6. Badge award notification shows in session summary: popup with icon, name, description, and satisfying animation (Framer Motion)
7. Badge profile page: 6 badges displayed in 2 rows; earned badges coloured, unearned badges greyed out with progress toward unlock (e.g., "2/10 paragraphs in Persuasive")
8. Teacher can manually award "Teacher Choice" badge to pupils; badge appears immediately with award notification
9. Badges are not lost; earned badge collection is permanent and visible to pupil and teacher
10. Badge animations include: pop-in effect, sound effect (optional user toggle), glow effect for new badge

**Test Notes:**
- Manual: Earn badges via session milestones and teacher award; verify display on profile and session summary
- Automated: Vitest for trigger logic (each badge's condition); Playwright for badge award animation and profile display

---

### WF-022: Level-Up Ceremony (Framer Motion Animation & Slot Reveal)
**Layer:** Gamification  
**Estimate:** M  
**Dependencies:** WF-018, WF-021  

**Description:**  
When a pupil masters a level (80% composite over 5 sessions), trigger a full-screen animated ceremony: background gradient, particle effects, new slot/sentence position reveal with Framer Motion, and a celebratory sound. Show "Congratulations!" with level name and next level teaser. Ceremony auto-dismisses after 5s or on tap/click.

**Acceptance Criteria:**
1. Mastery gate (WF-018) triggers ceremony; full-screen overlay appears with z-index: 9999
2. Background animates: gradient shift from current level colour to next level colour (2s ease-out)
3. Particle/confetti effect: 20–30 particles burst outward from center; gravity effect pulls them down (Framer Motion)
4. Level up text: "Congratulations!" fades in (0–1s), scales from 0.8 to 1.0
5. Current level badge zooms to top-right corner; next level badge zooms in to center (staggered animations)
6. New sentence slot/structure teased: "Next level introduces Complex Sentences — try linking two ideas!" (text + illustration)
7. Sound effect plays (optional: user can mute via settings); uplifting tone (e.g., "ding" + "applause")
8. Auto-dismiss after 5s; tap/click dismisses early
9. After dismiss, user advances to next level or returns to home (configurable per context)
10. Mobile: animations scale appropriately; text is readable on small screens; no performance drop (60 FPS)

**Test Notes:**
- Manual: Trigger mastery (manual adjustment in dev tools or real 5-session playthrough), watch ceremony, verify auto-dismiss and navigation
- Automated: Vitest for mastery gate trigger; Playwright for ceremony animation sequence and dismiss

---

### WF-023: Sentence Evolution Timeline (L1–7 & L8+ Paragraph Entries)
**Layer:** Dashboard  
**Estimate:** M  
**Dependencies:** WF-008, WF-011, WF-018  

**Description:**  
Create a personal "Sentence Evolution" timeline showing a pupil's progression: all completed formula sentences (L1–7) as collapsed entries; all paragraph entries (L8+) as expandable cards showing Lead/Support/Close. Timeline is chronological, scrollable, and shows date/time and score for each entry. Accessible from pupil home screen or profile.

**Acceptance Criteria:**
1. Timeline layout: vertical list with date labels (Today, Yesterday, This Week, etc.); entries are chronological (newest at top)
2. L1–7 entries: single-line formula sentence display (e.g., "One afternoon, a brown dog barked loudly.") with level badge and score
3. L8+ entries: paragraph entries show as expandable cards; collapsed shows "Lead sentence + Level + Score"; expanded shows all 3 sentences (Lead/Support/Close) and feedback summary
4. Each entry shows: date/time (e.g., "Today at 10:30 AM"), composite score (%), and badge icon if level mastered
5. Tap/click to expand paragraph entries; shows full text, coherence score, and strongest sentence highlight
6. Mobile: entries are touch-friendly; expandable cards have adequate padding and tap targets
7. Timeline includes filter: "All Levels" vs. "Level X" dropdown
8. Timeline includes search: text search for sentence content
9. No limit on timeline length; lazy-load entries 20 at a time as user scrolls
10. Export option: "Download Timeline (PDF)" generates a portfolio of all entries with scores and dates

**Test Notes:**
- Manual: Complete formula and paragraph entries; open timeline, verify chronological order, expand paragraphs, apply filters, search
- Automated: Playwright for timeline rendering and expand/collapse; Vitest for filtering and search logic

---

### WF-024: Session Summary Screen (XP Reveal, Badges, Streak Update)
**Layer:** Gamification  
**Estimate:** M  
**Dependencies:** WF-019, WF-020, WF-021, WF-022  

**Description:**  
After session submit (formula + feedback for L1–7, or formula + paragraph + feedback for L8+), display a full-screen summary: composite score reveal with animation, XP breakdown with earning amounts sliding in, any earned badges pop in with animation, streak update with flame animation. Summary auto-advances to next level or home after 10s or on tap.

**Acceptance Criteria:**
1. Summary screen shows after feedback is displayed and user acknowledges (or auto-shows after 5s)
2. Score reveal: composite score (0–100) animates from 0 to final value over 1.5s; large font (48px+)
3. Score colour: red (0–40), orange (40–70), green (70+) based on value
4. XP breakdown: "Base: 85 XP + Daily Subject: 10 XP + First Attempt: 5 XP = 100 XP"; amounts slide in from left sequentially (0.3s stagger)
5. Streak display updates: flame icon animates, streak number increments from previous value to new value
6. Earned badges: each new badge animates in with pop effect and glow; badges are arranged in a row at bottom
7. Congratulations text: "Great job!" or level-up message if mastered
8. Next action buttons: "Next Level" (enabled if composite ≥80%), "Retry" (if <80%), or "Home" (always available)
9. Mobile: all text and buttons are readable; animations don't cause layout shift
10. On swipe down or tap outside, summary can be dismissed early (if desired); otherwise auto-advances after 10s

**Test Notes:**
- Manual: Complete session, watch summary animation sequence, verify all animations play smoothly, buttons navigate correctly
- Automated: Playwright for full summary flow; Vitest for score colour logic and button state

---

## PHASE 1 SPRINT BREAKDOWN: Month 3 — Phase B, Tense/Register & Writing Assessment

---

### WF-025: Phase B Scaffold (Reduced Word Banks & Independent Close)
**Layer:** Formula  
**Estimate:** L  
**Dependencies:** WF-008, WF-018  

**Description:**  
Extend Formula Practice to Phase B (L13–20): reduce word bank to 4–5 words per level, show only one sentence starter option (not multiple), require independent close sentence (user types final sentence instead of dragging). Phase B slots show colour hint only (no label text). Maintain formula validation and assess-formula scoring.

**Acceptance Criteria:**
1. Phase B triggered automatically at L13 (or manually by teacher via pupil settings)
2. Formula slots render without text labels; colour background and dashed border indicate slot type
3. Word bank reduced to 4–5 words (down from 8–10 in Phase A)
4. Sentence starter: single mandatory option (not multiple choices); displayed above Lead slot
5. Independent close: final sentence (Close) is a text input field instead of draggable slots; pupil types a sentence matching the sentence starter
6. Close sentence validated by assess-formula function; checks for: word count (3–8 words), word class variety (min 3 different classes), coherence with Lead/Support
7. Validate button enabled only when all draggable slots + typed Close sentence are filled
8. Submit calls same assess-formula API; returns per-slot feedback + Close sentence feedback
9. Mobile: text input for Close is large and touch-friendly; word bank remains draggable
10. Phase transition: at L21, Phase C scaffold automatically applies (if mastery gate met); teacher can override

**Test Notes:**
- Manual: Start L13, verify word bank reduced and single starter shown; type close sentence, verify validation and feedback
- Automated: Playwright for Phase B UI transitions and close sentence input; Vitest for close validation logic

---

### WF-026: Tense Variation System (L15–17: Tense Selector & Coherence)
**Layer:** Paragraph  
**Estimate:** M  
**Dependencies:** WF-025, WF-011  

**Description:**  
At L15–17, Paragraph Builder adds a tense selector (Present/Past/Future) above the paragraph. When user changes tense, paragraph sentences are automatically adjusted (e.g., "barked" → "barks" for Present). Assess-paragraph validates tense coherence: all 3 sentences must match selected tense. Tense errors reduce paragraph coherence score.

**Acceptance Criteria:**
1. Tense selector dropdown appears above paragraph (L15+): "Verb Tense: Past | Present | Future"
2. Changing tense triggers automatic text transformation: replaces verb conjugations in all 3 sentences (Lead, Support, Close)
3. Verb transformation uses simple rule-based conjugation (past tense -ed suffix, present tense -s for third person, future tense will+infinitive)
4. Edge cases: irregular verbs (go→went→goes→will go) stored in `verb_forms` lookup table
5. Assess-paragraph validates all verbs in paragraph match selected tense; returns tense coherence score (0–100)
6. If tense coherence <80%, feedback note: "Your verbs are in different tenses. Try: [corrected sentence]"
7. Tense choice persists with paragraph draft; saved in paragraph_entries.selected_tense
8. Pupil can change tense and re-submit to improve score
9. Mobile: tense selector is large and easy to tap
10. Accessibility: screen reader announces tense changes and transformed sentences

**Test Notes:**
- Manual: Select different tenses, verify verb transformations; submit paragraph, verify coherence feedback
- Automated: Vitest for verb conjugation rules; Playwright for tense selector and text transformation display

---

### WF-027: Register Variation System (L19–20: Register Toggle & Coherence)
**Layer:** Paragraph  
**Estimate:** M  
**Dependencies:** WF-026, WF-011  

**Description:**  
At L19–20, Paragraph Builder adds a register toggle (Formal/Informal) above the paragraph. Register affects word choice and phrasing formality. When user toggles register, key words and phrases are replaced (e.g., "laughed loudly" → "guffawed" for Formal). Assess-paragraph validates register coherence: no unexpected formality switches within paragraph.

**Acceptance Criteria:**
1. Register toggle appears above paragraph (L19+): "Register: Informal | Formal" (radio buttons or toggle)
2. Toggling register replaces informal/formal word variants in all 3 sentences using a `register_variants` lookup table
3. Example transformations: Informal "got" → Formal "obtained"; "kids" → "children"; "cool" → "interesting"
4. Lookup table contains 50+ common variants; non-covered words remain unchanged
5. Assess-paragraph validates register consistency: all verbs, nouns, and adjectives should be Informal-consistent or Formal-consistent
6. Register coherence score (0–100) penalizes mid-sentence register switches
7. If coherence <80%, feedback includes suggested formal/informal variant: "This word is too {informal} for Formal register. Try: {variant}"
8. Register choice persists with paragraph draft; saved in paragraph_entries.selected_register
9. Pupil can toggle and re-submit to improve score
10. Mobile: register toggle is accessible; all text adjustments visible on screen

**Test Notes:**
- Manual: Toggle registers, verify word/phrase transformations; submit, verify coherence feedback
- Automated: Vitest for register variant lookup and transformation; Playwright for toggle and text display

---

### WF-028: Supabase Edge Function `assess-writing`
**Layer:** Infrastructure  
**Estimate:** XL  
**Dependencies:** WF-012, WF-013, WF-002  

**Description:**  
Create a Supabase Edge Function that accepts an extended writing submission (500–800 words, KS2 Yr3/4 or Yr5/6) and returns a detailed assessment against 6 NC dimensions: Composition, Vocabulary, Sentence Structures, Punctuation, Spelling, Handwriting (written only; digital ignores). Uses gpt-4o (not gpt-4o-mini) for depth. Returns per-dimension score (0–100), overall writing score, and annotated feedback.

**Acceptance Criteria:**
1. Function endpoint: `POST /assess-writing` accepts JSON: `{ submissionId, yearGroup: "Yr3_4" | "Yr5_6", genre, text }`
2. Validates input: min 300 words, max 2000 words
3. Calls gpt-4o 4K context with detailed rubric for KS2: "Grade this {genre} writing (KS2 {yearGroup}). Text: '{text}'. Return JSON: { compositionScore, vocabularyScore, sentenceScore, punctuationScore, spellingScore, feedback }"
4. Composition dimension (20 pts): narrative/persuasive/non-fiction structure (beginning/middle/end), coherence, idea development
5. Vocabulary dimension (20 pts): word choice variety, subject-specific terms, use of adjectives/adverbs for description
6. Sentence Structures (20 pts): variety of sentence types (simple/compound/complex), appropriate length variation, connectives
7. Punctuation (20 pts): correct use of full stops, commas, question marks, speech marks, apostrophes
8. Spelling (10 pts): high-frequency words correct, phonetic attempts for complex words, consistent patterns
9. Overall score = weighted average of 5 dimensions (composition 25%, vocabulary 20%, sentence 20%, punctuation 20%, spelling 15%)
10. Returns annotated examples: "Strongest phrase: '{phrase}'. Growth area: '{phrase}'. Suggested revision: '{revised}'"
11. Stores result in writing_submissions table with assessment_details JSON
12. Max response time: 10s; timeout returns partial rule-based assessment
13. Logs full assessment for teacher review and audit

**Test Notes:**
- Manual: Submit sample writing, verify all 6 scores and feedback; test with different genres and year groups
- Automated: Playwright for writing submission and assessment display; Vitest with mock gpt-4o response

---

### WF-029: Writing Studio Submission Flow (Self-Review, Confidence, Submit)
**Layer:** Writing Studio  
**Estimate:** M  
**Dependencies:** WF-028, WF-012  

**Description:**  
Add a submission flow to Writing Studio: before final submit, pupil completes a self-review checklist (genre features met, tense consistent, 3+ sentences) and a confidence slider (1–5: "I need help" to "I'm confident"). Data is stored with submission for teacher context. Submit button calls assess-writing and displays results.

**Acceptance Criteria:**
1. Self-review checklist appears in right panel (next to editor) or as modal before submit:
   - "Genre features present (e.g., dialogue for narrative)"
   - "Tense is consistent throughout"
   - "At least 3 complete sentences"
   - "Spelling and punctuation checked"
2. Checklist is optional (not required to submit), but encourages reflection
3. Confidence slider labeled: "I need help" (1) to "I'm confident" (5); shows selected number above
4. Submit button: final button press confirms submission (no undo)
5. On submit: text is locked (read-only); assess-writing API called asynchronously; loading spinner shown
6. Results display: 6 scores (composition, vocabulary, sentence, punctuation, spelling, overall) with bar chart
7. Feedback card shows: strongest phrase (highlighted in text), growth area, 2–3 suggested revisions
8. Self-review and confidence data stored in writing_submissions.pupil_self_review, .confidence_score
9. Mobile: checklist and slider are large and touch-friendly
10. Submission cannot be edited; teacher review is next step (WF-030)

**Test Notes:**
- Manual: Complete self-review, adjust confidence, submit; verify text locks and assessment displays
- Automated: Playwright for full submission flow; Vitest for checklist and slider state

---

### WF-030: Teacher Review UI (Inline Annotation, Score Override, Publish)
**Layer:** Writing Studio  
**Estimate:** L  
**Dependencies:** WF-028, WF-029  

**Description:**  
Build a teacher interface for reviewing student writing submissions. Teachers see submitted text with initial assess-writing scores and can: highlight passages and add inline comments, override any of the 6 dimension scores (with reason logged), and publish the reviewed submission (visible to pupil). Review queue shows pending count and priority filter (new/flagged/high-priority).

**Acceptance Criteria:**
1. Teacher review queue: list of submissions awaiting review, sorted by submission date (newest first)
2. Review interface: full text displayed; initial assess-writing scores visible in right sidebar (read-only display)
3. Inline comments: teacher highlights text and clicks "Add Comment", types feedback, comment anchored to text with teacher name/time
4. Score overrides: for each of 6 dimensions, teacher can click score and adjust (0–100); reason required (dropdown + text: "Incorrect rubric application", "Off-topic", etc.)
5. Override logged in writing_submissions.score_overrides with (dimension, original, override, reason, reviewer_id, timestamp)
6. Final overall score recalculated after any override (weighted average of 6 dimensions)
7. Publish button: submits review, visible to pupil immediately, email notification sent to pupil (optional teacher toggle)
8. After publish, submission moves to "Published" tab; no further edits by teacher or pupil
9. Mobile: text display is readable; inline comment UI is accessible; score overrides are touch-friendly
10. Batch review: teacher can apply same comment to multiple submissions (template comment button)

**Test Notes:**
- Manual: Submit writing, review as teacher, add inline comment, override score, publish; verify pupil sees feedback
- Automated: Playwright for review UI and score override flow; Vitest for override logging and score recalculation

---

### WF-031: Pupil Feedback Card (Warm Comment, 2 Grow Points, Revision Example)
**Layer:** Writing Studio  
**Estimate:** M  
**Dependencies:** WF-030  

**Description:**  
After teacher publishes review, pupil sees a feedback card: warm opening comment (teacher-written or auto-generated), 2 specific growth areas with examples, and a rewritten example sentence showing improvement. Feedback is non-threatening and growth-focused. Card is mobile-friendly and accessible.

**Acceptance Criteria:**
1. Feedback card displays immediately after teacher publishes; accessible via Writing Studio submission history
2. Warm comment section: teacher's opening phrase (or auto-generated: "Great effort! I can see you're working on...") in italics
3. Growth points section: up to 2 numbered items (e.g., "1. Try using more varied sentence starters. Example: Instead of 'The cat...' try 'Creeping slowly, the cat...'")
4. Each growth point includes: skill area, example from student's text, teacher-suggested revision
5. Revision example: full rewritten sentence showing the improvement in context; highlighted to stand out
6. No negative language; all feedback frames growth ("You're working on..." not "You didn't..."; "Next, try..." not "You missed...")
7. Card is expandable/collapsible per growth point
8. Accessible: all information conveyed in text (no colour-only cues); readable font (16px min)
9. Mobile: card is full-width; growth points are stacked vertically
10. Pupil can print or download feedback card as PDF (optional)

**Test Notes:**
- Manual: View published feedback as pupil, verify warm tone and growth-focused content; read revised sentences
- Automated: Playwright for feedback card display; Vitest for language analysis (growth-focused detection)

---

### WF-032: LSC Paragraph Detection in Writing Studio
**Layer:** Writing Studio  
**Estimate:** M  
**Dependencies:** WF-031, WF-007  

**Description:**  
Integrate LSC (Lead/Support/Close) paragraph detection into Writing Studio submissions. Assess-writing returns: whether text contains identifiable Lead (opening), Support (detail/evidence), and Close (conclusion) structure. If structure incomplete, flagged in pupil feedback and teacher review note.

**Acceptance Criteria:**
1. Assess-writing prompt includes: "Analyze paragraph structure. Identify Lead (opening sentence), Support (middle development), Close (concluding sentence). Return: { hasLead, hasSupport, hasClose, lscScore: 0–100 }"
2. LSC detection uses keyword hinting (e.g., "Finally", "In conclusion" indicates Close)
3. LSC score: 100 if all 3 identified, 66 if 2 identified, 33 if 1, 0 if none
4. LSC score contributes to "Composition" dimension (WF-028)
5. If LSC incomplete, pupil feedback includes: "Your writing has a strong opening and middle, but it needs a conclusion. Try ending with: 'In conclusion, the most important idea is...'"
6. Teacher review UI highlights paragraphs lacking complete LSC; flag icon shows "Structure needs work"
7. Mobile: LSC detection visible in pupil feedback; no special UI needed
8. Optional teacher override: teacher can manually mark LSC present/absent if auto-detection fails
9. Analytics: dashboard tracks class-wide LSC structure mastery (% of submissions with complete LSC)
10. Export: writing portfolio includes LSC scores per submission

**Test Notes:**
- Manual: Submit writing with/without complete LSC, verify score and feedback; teacher can override detection
- Automated: Vitest for LSC keyword detection and scoring; Playwright for feedback display

---

## PHASE 1 SPRINT BREAKDOWN: Month 4 — Dashboard, SEND & Reporting

---

### WF-033: Teacher Class Overview Dashboard (Traffic Light Grid & Distribution)
**Layer:** Dashboard  
**Estimate:** L  
**Dependencies:** WF-018, WF-023, WF-007  

**Description:**  
Build a teacher dashboard showing all pupils in a class in a grid: each pupil is a card with current level, composite score (0–100), mastery status (🟢 mastered / 🟡 in progress / 🔴 consolidation), and session count. Header shows class-wide stats: average level, transfer rate (% moved to next level), and distribution chart (histogram of levels).

**Acceptance Criteria:**
1. Grid layout: pupils displayed as cards in rows; each card shows: pupil name, current level (e.g., "L12"), last composite score (%), last session date, mastery badge
2. Traffic light colours: green (composite ≥80%, mastered), yellow (60–80%, in progress), red (<60%, consolidation)
3. Card interaction: click to open individual pupil view (WF-034)
4. Header stats: "Class Average: L15 | Transfer Rate: 72% | Sessions This Week: 24"
5. Distribution chart: histogram showing pupils across level ranges (L1–5, L6–10, L11–15, etc.)
6. Filter controls: "Show All Levels" dropdown, "Mastery Status" filter (All / Mastered / In Progress / Consolidation), "Activity" filter (Active Today / This Week / All Time)
7. Sort options: by name, by level, by last activity
8. Export button: export grid as CSV (pupil, level, score, mastery status) or PDF snapshot
9. Mobile: grid adapts to 1 column; cards remain readable
10. Real-time updates: if a pupil completes a session, card updates immediately (Supabase realtime subscription)

**Test Notes:**
- Manual: View dashboard for class with mixed mastery statuses; filter and sort; click pupil card to open detail view
- Automated: Playwright for dashboard display and filtering; Vitest for traffic light calculation; Supabase realtime tests

---

### WF-034: Individual Pupil View (Cross-Layer Trajectory & Transfer Gap)
**Layer:** Dashboard  
**Estimate:** M  
**Dependencies:** WF-033, WF-023, WF-018  

**Description:**  
Open a detailed pupil profile from the class grid (WF-033). Shows: trajectory line chart (composite score over last 10 sessions, colour-coded by level), cross-layer mastery summary (Formula current level, Paragraph current level, Writing Studio completed pieces), transfer gap analysis (if pupil is stuck on a level > 2 sessions, flag for intervention).

**Acceptance Criteria:**
1. Pupil profile header: name, current level, mastery status, best streak, total XP
2. Trajectory chart: X-axis = session number (last 10), Y-axis = composite score (0–100); line connects scores; colour changes per level
3. Mastery milestones marked on chart: green dot for 80%+ composite over 5 sessions
4. Cross-layer summary:
   - Formula: "Currently Level 12 (Phase B) | Sessions: 8 | Best Score: 94%"
   - Paragraph: "Currently Level 10 | Sessions: 6 | Best Score: 87%"
   - Writing Studio: "Pieces Submitted: 2 | Avg Assessment: 78%"
5. Transfer gap analysis: if composite < 60% for last 2 sessions, show "⚠️ Consolidation Track — Suggest: additional scaffolds, slower progression"
6. Recommendation engine: based on trajectory, suggest next action (e.g., "Consolidate Level 12", "Ready to advance", "Try Phase C scaffolds")
7. Recent sessions list: last 5 sessions with date, level, score, genre (for paragraphs)
8. Parent/pupil view permission: teacher can toggle "Share with Pupil" (read-only view visible to pupil)
9. Mobile: chart is scrollable; summary sections are stacked
10. Print option: generates single-page PDF profile for parent communication

**Test Notes:**
- Manual: View multiple pupils with varying trajectories; verify transfer gap detection; test parent share
- Automated: Playwright for profile display and print; Vitest for transfer gap logic and recommendation engine

---

### WF-035: Writing Studio Review Queue (Pending Pieces, Batch Review Tools)
**Layer:** Writing Studio  
**Estimate:** M  
**Dependencies:** WF-029, WF-030  

**Description:**  
Create a dedicated queue view for teachers managing writing submissions. Shows pending submissions sorted by date, with filters (unreviewed / reviewed / published), search by pupil name, and batch tools (apply same comment to multiple, bulk publish). Count badge shows number pending.

**Acceptance Criteria:**
1. Queue header shows: "Pending Reviews (5)" badge; filter dropdown (Unreviewed / Reviewed / Published / All)
2. List view: each submission shows: pupil name, genre, word count, date submitted, initial score (assess-writing), review status
3. Click submission to open review UI (WF-030); review updates queue status in real-time
4. Batch actions: checkbox select multiple submissions; "Apply Comment Template" button opens template picker; template applied to all selected
5. Comment templates: pre-written feedback snippets (e.g., "Great narrative structure. Try varying sentence starters."), customizable by teacher
6. Bulk publish: "Publish All Reviewed" button publishes all marked as ready; confirmation dialog
7. Search bar: filter by pupil name or genre keyword
8. Sort options: by submission date, by pupil name, by initial score
9. Mobile: list scrolls vertically; batch actions available via long-press on cards
10. Email digest: weekly email listing all submissions pending review (configurable by teacher)

**Test Notes:**
- Manual: Filter queue, search submissions, apply batch comment, bulk publish
- Automated: Playwright for queue interaction and batch operations; Vitest for filtering/sorting logic

---

### WF-036: SEND Support Profile (Teacher Configuration UI & Per-Pupil Overrides)
**Layer:** SEND  
**Estimate:** M  
**Dependencies:** WF-003, WF-002  

**Description:**  
Add a SEND configuration panel where teachers can mark pupils with SEND needs (e.g., dyslexia, ADHD, visual impairment) and enable per-pupil scaffold overrides. For each pupil, teacher can: keep Phase A scaffold past L12 (lock to no word bank reduction), enable extra word banks, enable TTS, reduce word count targets.

**Acceptance Criteria:**
1. Admin panel: "SEND Support" section under teacher settings, accessible via /teacher/settings/send
2. Pupil selection: class roster with checkboxes for SEND pupils
3. Per-pupil SEND profile: (name, primary need: dyslexia/ADHD/VI/etc., secondary needs, notes)
4. Scaffold overrides for each SEND pupil:
   - "Maintain Phase A scaffolds": forces full word bank + labels even at L13+ (Phase B+)
   - "Double word bank size": provides 16 instead of 8 words (Phase A/B)
   - "Enable TTS for all pupils": Web Speech API reading on every screen
   - "Increase word count flexibility": -20% to +20% on word count targets
5. Paragraph overrides:
   - "Show all 3 sentence starters": instead of single mandatory starter (Phase B+)
   - "Pre-fill support sentence": auto-complete one of the three paragraph sentences
6. Writing Studio overrides:
   - "Reduce word count target": e.g., 200 words instead of 500 for Yr5/6
   - "Extend time limit": e.g., 60 min instead of 45 min
7. Override is visible to pupil as "You have support scaffolds enabled"; no shame framing
8. Teacher notes field: free-text notes (e.g., "Works best in quiet corner", "Needs short breaks")
9. Mobile: SEND profile UI is accessible; checkboxes are large
10. Audit trail: log all SEND configuration changes with teacher name and timestamp

**Test Notes:**
- Manual: Configure SEND pupil, verify overrides apply to their sessions; check TTS and word bank changes
- Automated: Playwright for SEND config UI; Vitest for override application logic

---

### WF-037: Paragraph SEND Scaffolds (Sentence Bank, Ordering, Guided Close)
**Layer:** Paragraph  
**Estimate:** M  
**Dependencies:** WF-036, WF-011  

**Description:**  
Implement three SEND-specific paragraph scaffolds (configurable per pupil via WF-036): Sentence Bank mode (choose Lead/Support/Close from bank of 4–6 options), Sentence Ordering mode (arrange pre-written 3 sentences in correct LSC order), and Guided Close mode (complete close sentence with word bank only, no blank slots).

**Acceptance Criteria:**
1. SEND pupil entering Paragraph Builder sees enhanced scaffold UI based on override config
2. Sentence Bank mode: instead of building from word bank, pupil chooses Lead/Support/Close from 4–6 pre-written options; sort by relevance or randomized
3. Each pre-written sentence variant includes: original + 1–2 alternatives (e.g., 3 Lead options)
4. Ordering mode: 3 sentences provided (scrambled); pupil drags to arrange in Lead→Support→Close order; colour-coded backgrounds hint at position
5. Guided Close mode: Close sentence is partially pre-filled (e.g., "In conclusion, the most important..."); pupil completes with word bank (3–5 words to choose from)
6. Assess-paragraph still runs; returns standard scores
7. Pupil cannot switch scaffolds within session (teacher sets mode at level assignment)
8. Teacher receives analytics: % of SEND pupils using each scaffold mode, mastery rates by mode
9. Mobile: sentence bank and ordering are touch-friendly; large text and spacing
10. Accessibility: all sentences available as audio (TTS); high contrast mode respected

**Test Notes:**
- Manual: SEND pupil uses each scaffold mode (sentence bank, ordering, guided close); verify assess-paragraph runs; check analytics
- Automated: Playwright for scaffold UI and user interaction; Vitest for ordering validation

---

### WF-038: Bilingual Word Bank Toggle (Teacher-Configurable)
**Layer:** SEND  
**Estimate:** S  
**Dependencies:** WF-008, WF-025  

**Description:**  
Add a toggle for teachers to enable bilingual word banks: each word tile displays English word + translation (configurable language: Spanish, Punjabi, Polish, Romanian, Arabic). Teacher enables per-class or per-pupil. Translations are sourced from a `word_translations` table (pre-seeded with common words; teacher can add custom translations).

**Acceptance Criteria:**
1. Teacher setting: "Bilingual Mode" toggle under class settings; dropdown to select language (English/Spanish/Punjabi/Polish/Romanian/Arabic)
2. Bilingual mode can be enabled per-class (all pupils) or per-pupil override
3. Word tiles display: "[English] / [Translation]" with smaller text for translation
4. Word bank lookup: English words matched to translation via `word_translations` table
5. Missing translations: word displays English only (no error); teacher notified
6. Teacher can upload custom bilingual word list (CSV: English, Translation) to supplement/override defaults
7. Custom words stored in `custom_word_translations` table (school_id scoped)
8. Translations are read-only during pupil session; teacher can edit in settings
9. Mobile: word tiles are large enough to show both languages; responsive font sizing
10. Analytics: track bilingual pupil mastery vs. monolingual; inform school language support decisions

**Test Notes:**
- Manual: Enable bilingual mode, select language, verify translations on word tiles; upload custom words, verify they appear
- Automated: Vitest for word translation lookup; Playwright for bilingual tile display

---

### WF-039: Oral Rehearsal Mode (Web Speech API Recording & Playback)
**Layer:** Writing Studio  
**Estimate:** M  
**Dependencies:** WF-012, WF-013  

**Description:**  
Add an optional "Say It First" mode in Writing Studio: before typing, pupil can record their idea via microphone (Web Speech API), listen back, and then transcribe/type. Supports pupils who think better verbally. Teacher enables in Writing Studio task settings; transcript is optional and not assessed (audio file can be submitted as supporting evidence).

**Acceptance Criteria:**
1. Recording toggle: "Record your idea first" button above editor (if teacher enabled)
2. Recording UI: red record button; timer shows recording duration; stop button
3. Recorded audio stored in Supabase storage (`writing-studio/{submissionId}/rehearsal.wav`); up to 2 MB limit
4. Playback: auto-plays after recording; pupil can listen and re-record
5. Transcription (optional): pupil can request automatic transcription (Whisper API via Edge Function, async); transcription appears in comment above editor
6. Transcription accuracy: ~95% for clear English speech; flag uncertain words with [?]
7. Pupil can manually edit transcription if desired
8. Rehearsal audio and transcript stored with submission; visible to teacher during review
9. Teacher assessment: can listen to rehearsal during review (WF-030); no audio assessed, only final written submission
10. Accessibility: UI includes volume controls; transcript always provided (not just audio)

**Test Notes:**
- Manual: Record rehearsal, playback, request transcription, listen to transcript; teacher listens during review
- Automated: Playwright for recording UI; mock Web Speech API for tests

---

### WF-040: Weekly Auto-Generated Class Summary PDF
**Layer:** Dashboard  
**Estimate:** L  
**Dependencies:** WF-018, WF-033, WF-035  

**Description:**  
Each Friday at 5pm, auto-generate a weekly class summary PDF: includes class stats (average level, transfer rate, sessions completed), traffic light grid snapshot, per-pupil mini-progress bars (composite score trend), writing submissions submitted/reviewed count, and 2–3 standout achievements (top XP pupil, biggest score improvement, most consistent streak).

**Acceptance Criteria:**
1. Scheduled task: runs every Friday 5pm UTC (via cron in scheduled-tasks or Supabase scheduled function)
2. PDF generation using @react-pdf/renderer (custom React components + styled PDF layout)
3. Header: school name, class name, week date range (Mon–Fri)
4. Page 1: Class Summary
   - Stats: "Average Level: 15.2 | Transfer Rate: 68% | Total Sessions: 42 | Total XP Earned: 2,840"
   - Distribution pie chart: % pupils per level range (L1–5, L6–10, etc.)
   - Traffic light summary: count of green/yellow/red pupils
5. Page 2: Individual Pupil Progress (grid layout)
   - Pupil name, level, last 5 composite scores (mini bar chart), current status (✓/⚠️/×)
   - Mastery status badge
6. Standout Achievements:
   - "Top XP Earner: Alice (280 XP)"
   - "Biggest Score Jump: Bob (+25% this week)"
   - "Longest Streak: Charlie (10 days)"
7. Writing submissions summary: "This week: 8 submitted, 5 reviewed, 0 pending"
8. PDF emailed to teacher with subject "Weekly Class Summary: [Class] [Date]"
9. PDF also stored in Supabase storage for teacher to download anytime
10. Optional: teacher can request custom report (specific pupils, date range) via "Generate Custom Report" button

**Test Notes:**
- Manual: Friday 5pm trigger (or manual test via admin), verify PDF generated correctly, email sent, file stored
- Automated: Vitest for PDF data aggregation; mock @react-pdf/renderer; email sending tests

---

### WF-041: Writing Portfolio PDF Export (Pupil Record)
**Layer:** Dashboard  
**Estimate:** M  
**Dependencies:** WF-023, WF-030, WF-032  

**Description:**  
Pupil or teacher can generate a portfolio PDF of all completed writing submissions: includes formatted text, assessment scores, teacher feedback, and pupil self-review data. Portfolio shows progress over time (oldest to newest). Suitable for sharing with parents or archiving.

**Acceptance Criteria:**
1. Export button: "Download Portfolio (PDF)" in pupil's Writing Studio tab or teacher's pupil view
2. Portfolio includes: pupil name, class, year group, export date
3. For each writing submission (chronological order):
   - Title: genre, date submitted, word count
   - Full submission text (formatted, readable)
   - Assess-writing scores (6 dimensions + overall)
   - Teacher feedback/comments (if published)
   - Pupil self-review (checklist + confidence score)
   - LSC structure indicator (complete/incomplete)
4. Summary page: total pieces written, average score trend, growth observations
5. Optional: parent-friendly annotations (e.g., "Well done on using complex sentences here! →")
6. PDF styling: consistent with school branding (colours, logo in header)
7. File naming: "{PupilName}_WritingPortfolio_{Date}.pdf"
8. Mobile: PDF is readable on mobile (single-column layout)
9. Privacy: PDF includes only pupil's own data (cannot export other pupils' portfolios)
10. Teacher can batch-export class portfolios as a ZIP file (one PDF per pupil)

**Test Notes:**
- Manual: Export portfolio as pupil and teacher; verify all submissions included, formatting correct, privacy respected
- Automated: Playwright for export flow; mock @react-pdf/renderer for PDF content

---

### WF-042: Parent Dashboard (Read-Only View & Portfolio Display)
**Layer:** Dashboard  
**Estimate:** M  
**Dependencies:** WF-034, WF-041  

**Description:**  
Create a read-only parent view: teacher can share an access link with parents. Parent sees: pupil's trajectory (composite score chart), current level, recent writing submissions (text + assessment scores + teacher feedback), streaks, and XP total. No edits, no sensitive data beyond pupil's own work.

**Acceptance Criteria:**
1. Parent access: one-time shareable link generated by teacher; link is unique per pupil + teacher + school
2. Parent login: email or PIN (same as pupil PIN for simplicity); no password required
3. Parent dashboard view:
   - Pupil name, year group, current level
   - Composite score chart (last 10 sessions)
   - Streak display: "🔥 7-day streak"
   - Total XP: "2,840 XP earned"
4. Recent writing submissions (last 3–5):
   - Genre, date, word count, assessment scores
   - Full text visible; teacher feedback visible
   - LSC structure indicator
5. Read-only: no edit, submit, or comment functionality
6. Access controls: parent can only see their child's data; teacher can revoke link anytime
7. Session timeout: 30 min inactivity auto-logout
8. Mobile: responsive layout; text is readable on small screens
9. Optional: parent can download portfolio PDF (same as pupil export)
10. Audit trail: log parent login and access times

**Test Notes:**
- Manual: Generate parent link, login as parent, view dashboard and submissions; verify no edit options
- Automated: Playwright for parent dashboard display and access control

---

## PHASE 1 SPRINT BREAKDOWN: Month 5 — Offline, Accessibility & Polish

---

### WF-043: PWA Service Worker (Vite PWA Plugin & Offline Data Cache)
**Layer:** Infrastructure  
**Estimate:** L  
**Dependencies:** WF-001, WF-007, WF-008  

**Description:**  
Configure Vite PWA plugin to create a Progressive Web App: service worker caches formula data (all 67 levels, word lists), paragraph starters, and writing task briefs. Enables offline mode: pupils can start a formula session without internet, data queued for sync on reconnect. Install prompts ("Add to Home Screen") on mobile.

**Acceptance Criteria:**
1. Vite PWA config: generates service worker, manifest.json, favicon, splash screens
2. Cache strategy: network-first for API calls, cache-first for static assets (JS, CSS, images)
3. Offline formula cache: all level definitions (LevelData) cached on app first load; ~500 KB
4. Offline paragraph cache: all genre starters and word lists cached; ~100 KB
5. Offline writing cache: task brief data, BME template; ~50 KB
6. Total offline payload: <1 MB to fit on typical mobile device
7. Service worker detects offline status (navigator.onLine) and switches UI to offline mode
8. Offline mode badge: "📴 Offline Mode" appears in header with sync status
9. Sync on reconnect: queued sessions (WF-044) auto-upload to Supabase on reconnect; toast notification "Syncing... (3 items)"
10. Install prompt: appears on iOS/Android after 2 visits; "Add WriFe to Home Screen"

**Test Notes:**
- Manual: Offline app, start formula session, verify data cached; go online, verify sync; check install prompt
- Automated: Vitest for cache configuration; Playwright for offline mode UI and reconnect sync

---

### WF-044: IndexedDB Offline Session Queue (Write-First, Sync-on-Reconnect)
**Layer:** Infrastructure  
**Estimate:** M  
**Dependencies:** WF-003, WF-043  

**Description:**  
Implement IndexedDB storage for offline sessions: when pupil submits a session offline, data is written to IndexedDB immediately (client-side validation), marked as pending sync. On reconnect (Supabase connection restored), queue processes: submits each pending session to Supabase, handles conflicts (server score takes precedence if conflict), removes synced items from queue.

**Acceptance Criteria:**
1. IndexedDB schema: `sessions_queue` table with fields: (id, sessionId, level, formula, paragraph, submittedAt, synced: boolean, error: string)
2. On offline submit: validate locally (WF-007 validation logic), write to IndexedDB, show "✓ Saved Offline" toast
3. Queue display: home screen shows "📤 X items queued for sync"
4. Reconnect detection: listens to Supabase connection status; triggers sync when online
5. Sync logic: batches pending sessions, POSTs to /api/sessions/sync-queue, server validates and creates records
6. Conflict handling: if session already exists on server (rare), server score takes precedence; client is notified
7. Partial sync: if one item fails (e.g., network error mid-sync), queue retries that item next reconnect
8. Max retry: 3 attempts per item; on 3rd failure, item flagged with error message (user can manually retry or delete)
9. Clear queue: user option to clear unsynced items (with confirmation)
10. Synced items: removed from IndexedDB; user can see "Synced X items" summary

**Test Notes:**
- Manual: Go offline, submit session, verify IndexedDB storage; go online, verify sync; check queue status
- Automated: Vitest for IndexedDB schema and sync logic; mock Supabase connection

---

### WF-045: Offline Paragraph Builder (Full Functionality Offline, Assessment Queued)
**Layer:** Paragraph  
**Estimate:** M  
**Dependencies:** WF-044, WF-011  

**Description:**  
Extend paragraph builder to work fully offline: all genre starters and word lists cached (WF-043), user can build and submit paragraph offline. On submit offline, paragraph queued in IndexedDB (WF-044). On reconnect, paragraph is assessed (assess-paragraph Edge Function called), feedback shown to pupil.

**Acceptance Criteria:**
1. Offline paragraph building: all UI works without internet (dragging, text input, genre switching)
2. Submit offline: validates locally (all 3 sentences present), writes to IndexedDB queue, shows "✓ Saved Offline"
3. Queue stores: paragraph text (Lead/Support/Close), genre, levelId, pupilId, submittedAt
4. On reconnect: queued paragraph submitted to assess-paragraph Edge Function
5. Assessment queued: paragraph shows "Pending Assessment" badge until assessed; user can see queue status
6. After assessment: feedback displayed same as online submission (score, feedback card)
7. Assessment feedback cached: stored locally in IndexedDB so accessible offline again
8. Retry assessment: if assessment fails on reconnect, user can manually trigger retry
9. Mobile: offline paragraph building is intuitive; no UI degradation
10. Analytics: track offline paragraph submissions separately (for school/teacher insights)

**Test Notes:**
- Manual: Build and submit paragraph offline; go online, verify assessment runs and feedback displays
- Automated: Playwright for offline paragraph building; Vitest for queue logic

---

### WF-046: WCAG 2.1 AA Audit & Remediation
**Layer:** Foundation  
**Estimate:** L  
**Dependencies:** All WF-00x tickets complete  

**Description:**  
Run comprehensive accessibility audit using axe DevTools and WAVE, addressing all high/medium issues. Focus areas: colour contrast (4.5:1 minimum), keyboard navigation (all interactive elements keyboard-accessible), ARIA labels (form inputs, buttons, landmarks), screen reader testing (with NVDA/JAWS).

**Acceptance Criteria:**
1. Automated audit: run axe-core and axe-dev-tools on all major user flows; zero critical/serious violations
2. Colour contrast: all text ≥4.5:1 on background; UI elements ≥3:1 for non-text
3. Keyboard navigation: Tab/Shift+Tab moves through all interactive elements; Enter/Space triggers buttons/links
4. Form labels: every input has associated label (via `<label htmlFor>` or aria-label)
5. ARIA attributes: buttons have aria-label if text-only icon; images have alt text; landmarks defined (nav, main, complementary)
6. Screen reader testing: test with NVDA (Windows) on major flows; page structure is logical; no redundant announcements
7. Focus indicators: visible focus outline on all focusable elements (underline, border, or background change)
8. Skip links: "Skip to Main Content" link available; links to main paragraph builder / editor / formula builder
9. Motion/animation: all animations respect prefers-reduced-motion; no auto-play or mandatory animations
10. Audit report: document all issues, fixes applied, testing evidence (screenshots, NVDA transcripts); target WCAG 2.1 AA compliance

**Test Notes:**
- Automated: axe-core and WAVE scans on all pages; Vitest tests for ARIA and label presence
- Manual: NVDA/JAWS screen reader testing; keyboard navigation on all flows; visual contrast checks

---

### WF-047: High Contrast & Shape-Differentiated Mode (Colour-Blind Support)
**Layer:** Foundation  
**Estimate:** M  
**Dependencies:** WF-046, WF-004  

**Description:**  
Add optional high-contrast mode and shape-differentiated mode for colour-blind pupils. High-contrast mode: increases contrast to 7:1, removes decorative colours, uses bold text and outlines. Shape-differentiated mode: adds symbols or patterns to word-class tiles (e.g., Noun = circle, Verb = triangle) so pupils can distinguish classes without relying on colour alone.

**Acceptance Criteria:**
1. Settings toggle: "Accessibility > High Contrast Mode" and "Shape-Differentiated Mode" (radio button: Off / On)
2. High-contrast mode:
   - Background: light grey (#F5F5F5) or black (#000000) per user preference
   - Text: black (#000000) on light or white (#FFFFFF) on dark, minimum 7:1 contrast
   - Removes decorative gradients, shadows, and semi-transparent colours
   - Bold font weight (+100) for all headings and labels
   - Borders: solid 2px instead of soft shadows
3. Shape-differentiated mode:
   - Word-class tiles display both colour AND shape: Noun (circle/blue), Verb (triangle/red), Adjective (square/green), etc.
   - Shapes rendered as background SVG pattern or emoji overlay
   - Colour alone never required to understand information
4. Formula slots display shape hint even in normal mode (faint background pattern)
5. Both modes can be combined (user toggles independently)
6. Mode persists in localStorage; applied on app reload
7. Preview: settings page shows sample tiles in each mode
8. Documentation: explain modes in pupil settings with clear before/after examples
9. Mobile: shapes are recognizable at small sizes
10. Testing: verify modes with colour-blind simulators (Coblis, Daltonize)

**Test Notes:**
- Manual: Toggle high-contrast and shape modes; verify text is readable and shapes distinguish classes
- Automated: Vitest for contrast ratio validation; Playwright for mode toggle and persistence

---

### WF-048: TTS Integration (Web Speech API, data-tts Attributes)
**Layer:** Accessibility  
**Estimate:** M  
**Dependencies:** WF-012, WF-046  

**Description:**  
Integrate Web Speech API for text-to-speech (TTS) across the app. Add a speaker icon button next to all pupil-facing text blocks (word tiles, sentence starters, feedback, task briefs). Clicking plays audio via browser's default TTS voice. Teacher can enable/disable TTS per-class; pupils can mute in settings.

**Acceptance Criteria:**
1. TTS button: speaker icon appears next to word tiles, sentence starters, feedback cards, task briefs; size 20px, accessible
2. Clicking speaker plays Web Speech API synthesis of text; visual indicator shows "Playing..." state
3. Stop button: appears during playback; user can stop mid-sentence
4. Voice control: teacher can select voice language in settings (English, Spanish, etc.); browser's default voice used
5. Speech rate: pupils can adjust rate in settings (0.5x to 2x); persisted in localStorage
6. Highlight text: as speech plays, text is highlighted word-by-word (optional visual aid for dyslexic pupils)
7. Error handling: if Web Speech API not available (rare browsers), button hidden gracefully
8. Mute setting: pupils can disable TTS globally in accessibility settings
9. Batch reading: checkbox "Read all text on this screen" reads entire screen in sequence (word tiles, starters, feedback)
10. Mobile: touch-friendly speaker button; audio plays through speaker or headphones

**Test Notes:**
- Manual: Click speaker icons, verify audio plays; test voice rate and language settings; batch read entire screen
- Automated: Playwright for speaker button interaction; mock Web Speech API for tests

---

### WF-049: Performance: Lighthouse CI, <2s Session Load on 4G
**Layer:** Infrastructure  
**Estimate:** M  
**Dependencies:** WF-043, WF-001  

**Description:**  
Configure Lighthouse CI in the build pipeline: runs on every commit, enforces minimum scores (Performance ≥90, Accessibility ≥95, Best Practices ≥85). Optimize bundle size, code splitting, and image optimization to achieve <2s load time on simulated 4G slow 3G network.

**Acceptance Criteria:**
1. Lighthouse CI setup: GitHub Actions or CI/CD integration; runs on PR and main branch commits
2. Performance threshold: ≥90 on Lighthouse Performance score
3. Accessibility threshold: ≥95 on Lighthouse Accessibility score
4. Best Practices threshold: ≥85 on Lighthouse Best Practices score
5. Custom audit: custom metric "First Session Load Time" <2s on 4G slow 3G (Lighthouse throttling)
6. Bundle size: main JS bundle <150 KB gzipped; formula-engine package <50 KB
7. Code splitting: dynamic imports for routes (Formula / Paragraph / Writing / Dashboard); no mega-bundle
8. Image optimization: all images optimized with next-gen formats (WebP); lazy-loading for off-screen images
9. CSS optimization: Tailwind PurgeCSS removes unused styles; final CSS <30 KB
10. CI enforcement: PR cannot merge if any threshold breached; report shows audit results with suggestions

**Test Notes:**
- Automated: Lighthouse CI runs on PRs; check reports for score breakdown; local `pnpm lighthouse` for dev testing

---

### WF-050: Friday Lens Lab Session (Combined Formula + Paragraph + 3 Semantic Lenses)
**Layer:** Gamification  
**Estimate:** L  
**Dependencies:** WF-008, WF-011, WF-007  

**Description:**  
Introduce a weekly "Friday Lens Lab" mode: on Fridays only, pupils complete a combined formula + paragraph session, then view their work through 3 semantic lenses (visual/analytical/narrative). Lenses re-frame the same paragraph with different prompts (e.g., "Find all the describing words" = visual lens, "Trace the story flow" = narrative lens, "Count your sentence types" = analytical lens).

**Acceptance Criteria:**
1. Friday mode: visible on home screen every Friday; replaces normal session entry
2. Session flow: formula building (standard) → paragraph building (standard) → Lens Lab (new)
3. Lens Lab UI: 3 panels (visual, analytical, narrative); user selects one, view changes
4. Visual Lens: colour-codes parts of speech in paragraph; highlights describing words (adjectives) with green, action words (verbs) with red
5. Analytical Lens: shows sentence structure breakdown (simple/compound/complex count), word count per sentence, average sentence length
6. Narrative Lens: highlights story elements (characters, action, feeling); annotates with "Character introduced here", "Action peaks here", "Feeling resolved here"
7. Lens summaries: each lens shows 1–2 key insights (e.g., "You used 5 describing words! Try adding 2 more for richer description.")
8. Bonus XP: Friday Lens Lab completion awards +25 XP (beyond normal session XP)
9. Lens data: annotations and insights stored for later review; not assessed, but inform teacher
10. Mobile: lens panels stack vertically; easy to swipe between lenses

**Test Notes:**
- Manual: Complete formula + paragraph on Friday, verify Lens Lab appears and switches between lenses; check bonus XP awarded
- Automated: Playwright for Lens Lab UI and lens switching; Vitest for lens annotation logic

---

### WF-051: Mastery Gate UI (Progression Ceremony, Consolidation Track, Fast-Track Logic)
**Layer:** Gamification  
**Estimate:** M  
**Dependencies:** WF-022, WF-018  

**Description:**  
Implement UI for mastery gate status display: progression ceremony (WF-022) when mastered, consolidation track UI if locked (score <60% twice), fast-track UI if unlocked (≥95% twice). Pupil sees clear indication of current track, reason for track (if consolidated), and next milestone to unlock.

**Acceptance Criteria:**
1. Mastery indicator: on level card in home screen, show current status: "🟢 Mastered" / "🟡 In Progress (2/5 sessions)" / "🔴 Consolidation"
2. In Progress: shows session progress bar (2 out of 5 sessions at 80%+)
3. Consolidation: shows reason ("Scores below 60%") and next milestone ("Reach 80% to exit consolidation")
4. Fast-track: shows "⚡ Fast-Track Unlocked!" badge; allows skipping to next phase (C instead of B)
5. Progression ceremony (WF-022): triggers on mastery; level-up animation; next level teaser
6. Consolidation track detail: same level offered again; optional extra scaffolds (SEND level in WF-036)
7. Fast-track option: "Skip to Phase C" button; pupil can choose to skip or retake Phase B
8. Locked level: if consolidation, next level is greyed out with "Complete consolidation first" tooltip
9. Unlock milestones: display path to unlock (e.g., "Unlock next level: 80% composite on 5 sessions")
10. Mobile: status badges are large and clear; progress indicators scale to small screens

**Test Notes:**
- Manual: Reach mastery, verify ceremony and unlock; drop below 60%, verify consolidation track; unlock fast-track
- Automated: Playwright for mastery/consolidation UI display; Vitest for gate logic

---

### WF-052: E2E Test Suite — Playwright (Critical User Journeys)
**Layer:** Infrastructure  
**Estimate:** XL  
**Dependencies:** All feature tickets complete  

**Description:**  
Write comprehensive Playwright E2E test suite covering critical user journeys: pupil login and session completion (formula → feedback → XP display), level progression (L7 → L8 bridge, mastery unlock, consolidation), teacher class overview and pupil review, writing submission and assessment, SEND profile and scaffold overrides, offline session queue and sync.

**Acceptance Criteria:**
1. Test suite structure: `e2e/` directory with spec files per feature (auth.spec.ts, formula.spec.ts, paragraph.spec.ts, etc.)
2. Test data: seeded test users (pupil, teacher), test schools/classes, test content (formula levels, paragraph starters)
3. Pupil journey tests:
   - Login with PIN, complete warm-up, build formula, receive feedback, session summary (XP, badge, streak)
   - Advance to next level, unlock mastery ceremony
   - L8+ paragraph building, submission, assessment feedback
   - Writing Studio task brief, editor, self-review, submit
4. Teacher journey tests:
   - Login with email, view class dashboard, filter/sort pupils
   - Open pupil detail view, check trajectory
   - Review writing submission, add comment, override score, publish
   - Configure SEND profile, verify pupil sees overrides
5. Offline tests:
   - Offline formula/paragraph build, submit (IndexedDB), reconnect, sync
   - Verify synced data appears in teacher dashboard
6. Cross-browser: Chrome, Firefox, Safari (if applicable)
7. Mobile tests: use iPhone 12 / Pixel 5 viewport sizes
8. Accessibility tests: keyboard navigation, screen reader (ARIA validation), colour contrast
9. Test execution: `pnpm test:e2e` runs full suite; CI integration for PR gating
10. Test coverage: all major user flows covered; >80% code coverage for critical paths (auth, formula validation, scoring)

**Test Notes:**
- Automated: Playwright test runner; fixtures for test data setup; custom helpers for common interactions (login, submit session, etc.)

---

### WF-053: Formula Engine v1 Type Definitions & API
**Layer:** Foundation  
**Estimate:** S  
**Dependencies:** WF-007  

**Description:**  
Finalize formula-engine package TypeScript types and stable API for external use. Export types for Formula, Level, WordClass, Phase, SessionScore, MasteryStatus. Document interfaces with JSDoc. Create CHANGELOG and API documentation.

**Acceptance Criteria:**
1. `formula-engine/src/types/index.ts` exports all public types: WordClass, Phase, Level, Formula, FormulaAttempt, SessionScore, MasteryStatus, ScaffoldConfig
2. Each type documented with JSDoc comments explaining purpose, fields, and usage
3. Enums for WordClass and Phase with string literals (type-safe)
4. Formula type includes: levelId, structure (array of WordClass), wordBank (Word[]), starters (string[])
5. SessionScore type includes: compositeScore, formulaScore, paragraphScore, xp, bonuses
6. MasteryStatus type: mastered (boolean), consolidation (boolean), fastTrack (boolean), sessionCount
7. API documentation: README in formula-engine/ explaining key functions and types
8. CHANGELOG: version 1.0.0 release notes, breaking changes (none in v1)
9. Package exports via barrel export (index.ts); all types re-exported for tree-shaking
10. Version pinned: `package.json` version 1.0.0; npm publish ready

**Test Notes:**
- Automated: Vitest type-checking; TypeScript strict mode enabled

---

### WF-054: Vitest Unit Test Suite (Formula Engine, Validation, Scoring)
**Layer:** Infrastructure  
**Estimate:** L  
**Dependencies:** WF-007, WF-018, WF-052  

**Description:**  
Write comprehensive Vitest unit tests for formula-engine and core scoring logic. Cover: word class validation, formula validation per level, phase progression rules, composite scoring (70/30 formula/paragraph split), mastery gate thresholds, XP calculation, streak logic, badge triggers.

**Acceptance Criteria:**
1. Test structure: `{package}/src/__tests__/` directory with spec files matching source modules
2. Formula validation tests:
   - Valid and invalid word placements per level
   - Boundary cases (L7 → L8, L20 → L21, L34 → L35)
   - All 8 word classes tested
3. Phase progression tests:
   - Phase A (L1–12): full scaffold
   - Phase B (L13–20): reduced word banks, independent close
   - Phase C (L21–34): no word banks, labels only
   - Phase D (L35–67): no scaffolds
4. Composite scoring tests:
   - 70% formula + 30% paragraph calculation
   - Edge cases: only formula (L1–7), only paragraph (invalid), missing paragraph
5. Mastery gate tests:
   - 80% composite over 5 sessions = mastery
   - >95% in first 2 = fast-track
   - <60% for 2 sessions = consolidation
6. XP calculation tests:
   - Base XP = composite score
   - Daily subject bonus, first attempt bonus, streak bonus
   - Daily cap (300 XP)
7. Streak logic tests:
   - School-day increment (Mon–Fri)
   - Weekend/holiday reset behavior
   - Token restore logic (1 per week, max 3)
8. Badge trigger tests:
   - First Formula, Level Master, Fast Track, Streak badges
   - No duplicate awards
9. Test coverage: >85% line coverage for formula-engine; 100% for scoring logic
10. Test execution: `pnpm test` runs all tests; CI integration for PR checks

**Test Notes:**
- Automated: Vitest with fast execution; snapshot tests for feedback text; mock Supabase for Edge Function tests

---

### WF-055: API Documentation & OpenAPI Schema
**Layer:** Infrastructure  
**Estimate:** M  
**Dependencies:** WF-014, WF-016, WF-028  

**Description:**  
Document all API endpoints (REST + Supabase Edge Functions) with OpenAPI 3.0 schema. Generate interactive Swagger UI for developer reference. Document: authentication, request/response schemas, error codes, rate limits, pagination.

**Acceptance Criteria:**
1. OpenAPI 3.0 schema file: `docs/openapi.yaml` defining all endpoints
2. Endpoints documented:
   - POST /assess-formula (WF-014)
   - POST /assess-paragraph (WF-016)
   - POST /assess-writing (WF-028)
   - GET /api/pupil/{id}/progress
   - POST /api/sessions/sync-queue (WF-044)
   - GET /api/class/{id}/overview
   - Other CRUD endpoints (pupils, sessions, submissions)
3. Each endpoint includes: method, path, description, parameters, request body schema, response schema, error codes (400, 401, 403, 404, 500)
4. Schema examples: sample JSON request/response for each endpoint
5. Authentication: document JWT token header and Supabase RLS policies
6. Rate limits: document limits per endpoint (e.g., 10 assessments per minute per pupil)
7. Pagination: document limit/offset query params for list endpoints
8. Error codes: document standard error responses (ValidationError, AuthError, RateLimitError)
9. Swagger UI: generate interactive docs at `/docs` (swaggerui package)
10. Postman collection: export OpenAPI as Postman collection for manual API testing

**Test Notes:**
- Manual: Check Swagger UI at /docs, verify all endpoints listed correctly, try example requests
- Automated: Schema validation test (check schema matches actual endpoint responses)

---

### WF-056: Deployment Configuration (Vercel/Netlify, Supabase Production, CDN)
**Layer:** Infrastructure  
**Estimate:** M  
**Dependencies:** WF-043, WF-001, WF-049  

**Description:**  
Configure production deployment: frontend hosting (Vercel or Netlify), Supabase production environment, CDN for static assets, domain configuration, environment variable management, and deployment pipeline. Include staging environment for QA.

**Acceptance Criteria:**
1. Frontend hosting: Vercel or Netlify with automatic builds on main branch commits
2. Build configuration: `vercel.json` or `netlify.toml` specifying build command (`pnpm build`), output directory (`dist/`), environment variables
3. Environments: production (stable release) and staging (QA testing)
4. Supabase production: separate PostgreSQL database, API keys, JWT secret; backup scheduled daily
5. Environment variables: managed via provider (Vercel/Netlify secrets); sensitive keys (API keys, JWT) never in git
6. CDN: Cloudflare or provider's built-in CDN for static asset caching (JS, CSS, images)
7. Custom domain: configure DNS for app.wrife.io (example); SSL certificate auto-managed
8. Monitoring: Sentry integration for error tracking; alerts for failed deployments or 5xx errors
9. Logging: centralized logs via provider or ELK stack; query logs for debugging
10. Disaster recovery: database backup restore procedure documented; RTO/RPO targets defined

**Test Notes:**
- Manual: Deploy to staging, verify build succeeds, app loads, no environment variable errors; promote to production
- Automated: CI/CD pipeline tests (build, lint, test coverage checks) before deploy

---

### WF-057: Security & Compliance Checklist
**Layer:** Infrastructure  
**Estimate:** M  
**Dependencies:** All previous tickets  

**Description:**  
Complete security audit and compliance checklist: OWASP Top 10, data protection (UK GDPR), authentication best practices, SQL injection / XSS prevention, CORS, CSP headers, dependency vulnerability scanning. Document findings and remediation steps.

**Acceptance Criteria:**
1. OWASP Top 10 review:
   - A01: Broken Access Control → RLS policies enabled, JWT validation
   - A02: Cryptographic Failures → HTTPS enforced, secrets not in code
   - A03: Injection → parameterized queries (Supabase), no raw SQL
   - A04: Insecure Design → no hardcoded auth keys
   - A05: Security Misconfiguration → deployment checklist
   - A06: Vulnerable Components → dependency scanning (npm audit, Snyk)
   - A07: Auth Failures → JWT expiry, refresh tokens
   - A08: Data Integrity → input validation, schema constraints
   - A09: Logging & Monitoring → centralized logs, alerts
   - A10: SSRF → no untrusted URL fetches
2. GDPR compliance:
   - Data processing agreement (DPA) with Supabase
   - User consent for data collection (privacy policy)
   - Right to data deletion (soft-delete or hard delete per request)
   - Right to export (WF-041: portfolio export)
3. Data security:
   - PII encrypted at rest (Supabase native encryption)
   - Passwords hashed with bcrypt (Supabase Auth)
   - No sensitive data in URLs or logs
4. Network security:
   - HTTPS only (no HTTP)
   - CSP headers restrict script/style sources
   - CORS configured (allowed origins only)
   - X-Frame-Options header (prevent clickjacking)
5. Dependency scanning: npm audit or Snyk integration in CI; PR blocked if critical vulnerabilities
6. Penetration testing: recommendation for third-party security firm (v2 post-launch)
7. Audit log: all sensitive actions logged (user auth, data access, admin actions)
8. Incident response plan: document and test
9. Security training: team receives OWASP Top 10 briefing
10. Documentation: security.md file outlining all controls and compliance evidence

**Test Notes:**
- Automated: npm audit in CI; dependency scanning with Snyk
- Manual: Security checklist review; penetration testing recommendations

---

### WF-058: Analytics & Monitoring Dashboard (Grafana/DataStudio)
**Layer:** Infrastructure  
**Estimate:** M  
**Dependencies:** WF-033, WF-040  

**Description:**  
Set up analytics dashboard to monitor school-wide progress: daily active users, session completion rate, mastery distribution, writing submission volume, transfer rate per level, and pupil engagement trends. Dashboard accessible to school admin; read-only.

**Acceptance Criteria:**
1. Data source: Supabase via PostgREST API or Grafana native Postgres connector
2. Dashboard tool: Google Data Studio or Grafana; embed in teacher admin panel
3. Key metrics:
   - Daily Active Users (DAU) / Monthly Active Users (MAU)
   - Sessions completed today / this week / this month
   - Average composite score per level
   - Mastery rate (% pupils per level who've mastered)
   - Transfer rate (% pupils advancing from level N to N+1)
   - Writing submissions submitted / reviewed / pending
   - XP distribution (average, median, top earners)
4. Trends:
   - 7-day rolling average of composite scores
   - Streak distribution (pie chart: 0–2 days / 3–6 / 7+)
   - Badge adoption (% pupils who've earned each badge)
   - Feature usage (% using TTS, offline mode, etc.)
5. Filters: date range, school, class, phase
6. Drill-down: click metric to see breakdown by level/genre/teacher
7. Alerts: optional threshold alerts (e.g., alert if mastery rate drops below 50%)
8. Export: download dashboard as PDF (static snapshot)
9. Refresh rate: hourly refresh (no real-time; to reduce DB load)
10. Access control: school admin only; read-only

**Test Notes:**
- Manual: Access dashboard as admin, verify metrics load correctly, test filters and drill-down
- Automated: API tests to verify data query endpoints return expected metrics

---

### WF-059: Onboarding Flow for New Schools (Setup Wizard)
**Layer:** Dashboard  
**Estimate:** M  
**Dependencies:** WF-003, WF-033, WF-036  

**Description:**  
Build a setup wizard for new school/admin: school name input, class creation, teacher email input (invite), pupil import (CSV), SEND configuration preview, and a "Ready to Launch" checklist. Wizard guides admin through minimum viable setup (1 school, 1 class, 1 teacher, 10 pupils, optional SEND config).

**Acceptance Criteria:**
1. Wizard entry: new school admin starts at /onboarding on first login
2. Step 1: School Details (school name, city, key stage focus: KS1 / KS2 / KS3, logo upload optional)
3. Step 2: Create First Class (class name, year group, teacher assignment)
4. Step 3: Import Pupils (CSV template download, upload CSV with pupil names, birthdates, optional PIN pre-assignment)
5. Step 4: SEND Configuration Preview (optional; explain what SEND support is available, skippable)
6. Step 5: Ready Checklist
   - "1 school created ✓"
   - "1 class created ✓"
   - "1 teacher assigned ✓"
   - "10+ pupils imported ✓"
   - "Optional: SEND profiles configured"
   - Launch button: "Let's Go!" → admin dashboard
7. Wizard validation: each step validated before next; skip optional steps
8. Wizard exit: "Skip Wizard" option at any step; can return to wizard from settings
9. Data persistence: if user navigates away, wizard state saved (resumes on return)
10. Mobile: responsive; single-column layout; large buttons

**Test Notes:**
- Manual: Complete full wizard flow, verify data persists, check dashboard after launch
- Automated: Playwright for wizard flow and validation; Vitest for CSV parsing

---

### WF-060: Export & Reporting API (CSV, JSON, PDF)
**Layer:** Dashboard  
**Estimate:** M  
**Dependencies:** WF-033, WF-035, WF-041  

**Description:**  
Create flexible export endpoints for school data: class progress (CSV), pupil timelines (JSON), writing submissions (PDF batch), and custom report generation. Teachers can export anytime; exports are timestamped and listed in a download history.

**Acceptance Criteria:**
1. Export endpoints:
   - GET /api/class/{id}/export?format=csv (progress grid)
   - GET /api/pupil/{id}/timeline?format=json (sentence evolution timeline)
   - GET /class/{id}/writing/export?format=pdf (all submissions)
   - POST /api/reports/custom (custom query: date range, levels, pupils, metrics)
2. CSV exports:
   - Progress grid: pupil, level, composite score, mastery, sessions, XP, streak
   - Column headers for easy import to Excel
   - Timestamp in filename
3. JSON exports:
   - Full timeline with dates, scores, texts
   - Formatted for data analysis (Pandas, R, etc.)
4. PDF exports:
   - Batch writing submissions (20 per PDF max)
   - Formatted, readable; suitable for printing/filing
5. Download history: list recent exports with link to re-download (7-day retention)
6. Custom reports:
   - Filter by: date range, levels, phase, pupils, mastery status, genre
   - Metrics: progress, mastery distribution, XP distribution, engagement
   - Output: PDF with charts and summary tables
7. Rate limit: max 10 exports per hour per user (prevent spam)
8. File storage: exports stored in Supabase storage for 7 days; auto-delete
9. Permission: teacher can export own class; admin can export all
10. Accessibility: CSV/JSON are machine-readable; PDF includes text (not image-only)

**Test Notes:**
- Manual: Export various formats, verify data integrity; custom report with different filters
- Automated: Playwright for export UI; Vitest for CSV/JSON generation; mock PDF renderer

---

## Summary

This feature ticket list covers 60 complete, production-ready tickets spanning:
- **Foundation & Architecture** (5): Project scaffold, schema, auth, design system, core packages
- **Formula Layer** (8): UI, Phase B/C/D scaffolds, tense/register, validation
- **Paragraph Layer** (6): Paragraph builder, assessment, feedback, SEND scaffolds
- **Writing Studio** (7): Editor, submission, teacher review, pupil feedback, portfolio
- **AI & Assessment** (3): Edge Functions for formula, paragraph, writing with gpt-4o-mini/gpt-4o
- **Gamification & Dashboard** (10): XP, streaks, badges, ceremonies, class overview, timelines, SEND profiles
- **Accessibility & Performance** (6): WCAG 2.1 AA, high-contrast, TTS, offline (PWA), Lighthouse CI
- **Infrastructure & DevOps** (6): Service worker, IndexedDB, deployment, security, monitoring, API docs
- **Specialized Features** (3): Lens Lab, onboarding, custom reporting
- **Testing** (2): E2E Playwright, Vitest unit tests

Each ticket includes:
- Precise acceptance criteria (5–10 per ticket, individually testable)
- Technical language specific to the tech stack
- Realistic estimates (S/M/L/XL)
- Clear dependencies
- Manual + automated test guidance

All tickets are designed to be implemented sequentially or in parallel (respecting dependencies) over 5 months (Months 1–5) and result in a fully functional, accessible, production-ready gamified writing platform for UK primary/secondary schools.
