# WriFe Manual Test Checklist — All 60 Tickets

## How to Use
Work through each section. Check off items as they pass. Flag any failures with a note.

---

## Phase 1: Foundation (WF-001 to WF-010)

- [ ] **WF-001** — `pnpm install` and `pnpm dev` run with no errors; Vite serves on port 5173
- [ ] **WF-002** — All 20 public tables exist in Supabase; RLS policies block cross-user access
- [ ] **WF-003** — Teacher can sign up, verify email, and log in; redirected to `/teacher`
- [ ] **WF-003** — Pupil PIN login retrieves class and creates session; redirected to `/dashboard`
- [ ] **WF-004** — All 8 word-class colours render correctly on tiles and slots
- [ ] **WF-005** — `WordClassTile` renders in all 3 sizes; audio plays on Space/Enter
- [ ] **WF-006** — `FormulaSlot` rejects mismatched word class drop; accepts correct class
- [ ] **WF-007** — Formula engine validates L1–L67; returns correct `MasteryGateResult`
- [ ] **WF-008** — Phase A builder: all slots labelled; submit disabled until all filled
- [ ] **WF-009** — Word warm-up matching activity renders; words snap to correct class

---

## Phase 2: Core Features (WF-011 to WF-020)

- [ ] **WF-011** — Paragraph Builder loads at `/paragraph`; LSC scaffold visible
- [ ] **WF-012** — Paragraph AI assessment returns scores; feedback displayed per dimension
- [ ] **WF-013** — After 5 sessions at 80%+, mastery gate passes; level increments
- [ ] **WF-014** — Dashboard shows current level, XP (animated), streak, recent badges
- [ ] **WF-015** — Formula practice works offline; session queued; syncs on reconnect
- [ ] **WF-016** — Writing Studio loads at `/studio`; tiptap editor functional
- [ ] **WF-017** — Writing AI assessment completes; rubric scores displayed
- [ ] **WF-018** — XP awarded after formula session; counter animates
- [ ] **WF-019** — Pending Review tab shows submitted pieces; teacher can navigate to review
- [ ] **WF-020** — Class Progress tab shows pupil table with level, XP, streak, transfer rate

---

## Phase 3: Gamification & Dashboard (WF-021 to WF-030)

- [ ] **WF-021** — Teacher can assign writing task to pupil; confirmation shown
- [ ] **WF-022** — Transfer gap column shows classification (Strong/Developing/Needs Support)
- [ ] **WF-023** — Admin panel loads; overview shows school stats
- [ ] **WF-024** — Parent view loads; shows pupil progress read-only
- [ ] **WF-025** — Intervention Log tab shows unresolved flags; Mark Resolved works
- [ ] **WF-026** — Badge awarded on first formula session; BadgeToast animates
- [ ] **WF-027** — Offline banner appears when network lost; disappears on reconnect
- [ ] **WF-028** — Streak counter increments daily; shield icon shows when active
- [ ] **WF-029** — Portfolio page shows published pieces; PDF download generates file
- [ ] **WF-030** — XP Shop accessible from dashboard; items purchasable

---

## Phase 4: Advanced Features (WF-031 to WF-040)

- [ ] **WF-031** — TTS button reads aloud text with UK voice; wave animation plays
- [ ] **WF-032** — Consolidation pack auto-generated when `consolidation_required = true`
- [ ] **WF-033** — Teacher annotation panel saves comments against writing piece
- [ ] **WF-034** — Parent email notification sent on writing piece publish
- [ ] **WF-035** — Double XP Day purchasable; XP doubled for 24 hours
- [ ] **WF-036** — Lens Lab mode loads for Phase D; word token interaction works
- [ ] **WF-037** — Settings page: high contrast toggle, font size toggle, TTS speed
- [ ] **WF-038** — High contrast mode applies `--color-background: #000`; persists on reload
- [ ] **WF-039** — PDF export from Writing Studio generates styled certificate PDF
- [ ] **WF-040** — Lazy-loaded pages (TeacherPage, WritingStudioPage, etc.) load without errors

---

## Sprint 3: WF-041 to WF-060

### WF-041 — Analytics Tab (Teacher)
- [ ] Sixth tab "Analytics" appears in Teacher Dashboard tab bar
- [ ] Formula Progress line chart renders SVG with date axis and avg level axis
- [ ] XP Distribution bar chart shows 3 buckets with pupil counts
- [ ] Writing Studio donut shows % unlocked vs locked
- [ ] Transfer Gap horizontal bars render per pupil, colour-coded green/amber/red

### WF-042 — Pupil Certificate System
- [ ] `certificates` table exists in Supabase with unique constraint
- [ ] Passing mastery gate inserts certificate row into `certificates`
- [ ] `CertificateModal` appears after gate pass with stars/confetti animation
- [ ] "Download Certificate" button closes modal
- [ ] Portfolio page shows earned certificates with Download button

### WF-043 — KS3 PEEL Mode
- [ ] `ParagraphFrame` renders 4 slots (Point, Evidence, Explanation & Link) for `levelId >= 51`
- [ ] `ParagraphFrame` renders standard 3 slots (Support 1, Support 2, Close) for `levelId < 51`
- [ ] Edge function `assess-paragraph` receives `paragraph_model: 'PEEL'` for L51+
- [ ] 20 PEEL starters seeded in `paragraph_starters` table for Phase D

### WF-044 — Print Stylesheet
- [ ] `@media print` hides nav, buttons, offline-banner when printing
- [ ] `.print-section` elements do not break across print pages
- [ ] TeacherReviewPage and PortfolioPage key areas have `print-section` class
- [ ] Teacher nav has `no-print` class

### WF-045 — Keyboard Navigation
- [ ] `useKeyboardActivation` hook exists and exports `{ onKeyDown, tabIndex, role }`
- [ ] All major interactive divs in FormulaBuilder/NavCard respond to Enter and Space
- [ ] `:focus-visible` shows 3px brand-blue outline on focused elements
- [ ] Tab key navigates through all interactive elements in order

### WF-046 — Error Boundary
- [ ] `ErrorBoundary` component wraps DashboardPage and TeacherPage in App.tsx
- [ ] Throwing an error in a child renders "Something went wrong. Your work has been saved."
- [ ] "Reload page" button triggers `window.location.reload()`
- [ ] Error is logged to console

### WF-047 — Session Timeout Warning
- [ ] `SessionExpiryBanner` appears when session expires in ≤5 minutes
- [ ] Banner shows remaining minutes and "Stay signed in" button
- [ ] Clicking "Stay signed in" calls `supabase.auth.refreshSession()`
- [ ] Banner appears on DashboardPage, FormulaPage, WritingStudioPage

### WF-048 — Teacher Analytics Export
- [ ] "Export CSV" button appears in Analytics tab
- [ ] Clicking downloads a `.csv` file with correct headers
- [ ] CSV includes: pupil name, formula level, avg score, streak, XP, transfer rate, studio unlocked, last active

### WF-049 — Supabase URL Configuration
- [ ] Migration `document_auth_redirect_config` applied successfully
- [ ] `schools` table comment documents redirect URL
- [ ] MANUAL: Supabase Dashboard → Auth → URL Configuration has `https://pwp-studio.vercel.app`

### WF-050 — Rate Limiting for Edge Functions
- [ ] All 3 edge functions (`assess-formula`, `assess-paragraph`, `assess-writing`) deployed
- [ ] 11th call within 60s from same user returns HTTP 429
- [ ] 429 response body: `{ error: 'Rate limit exceeded. Please wait before submitting again.' }`
- [ ] First 10 calls succeed normally

### WF-051 — Mobile Responsive Polish
- [ ] On 375px viewport, NavCards stack vertically (`.dashboard-grid`)
- [ ] On 375px, word-bank panel has `max-height: 40vh` and scrolls
- [ ] Teacher table has `overflow-x: auto` on mobile (`.teacher-table`)
- [ ] Formula builder tiles wrap on small screens (`.formula-builder`)

### WF-052 — Loading Skeletons
- [ ] `Skeleton` component renders with shimmer animation
- [ ] DashboardPage shows skeleton placeholders while data loads
- [ ] TeacherPage shows skeleton rows while class data loads
- [ ] PortfolioPage shows skeleton cards while pieces load

### WF-053 — Toast Notification System
- [ ] `toast.success('msg')` shows green-left-bordered toast
- [ ] `toast.error('msg')` shows red-left-bordered toast
- [ ] `toast.info('msg')` shows blue-left-bordered toast
- [ ] Toasts auto-dismiss after 4 seconds
- [ ] Max 3 toasts visible simultaneously
- [ ] `ToastContainer` renders fixed bottom-right in App.tsx

### WF-054 — Supabase Realtime (Teacher Dashboard)
- [ ] Pending Review tab subscribes to `writing_pieces` on mount
- [ ] New submitted piece appears at top of list with "New" badge (pulsing)
- [ ] Status change (not submitted) removes piece from list
- [ ] Subscription cleaned up on tab change or unmount

### WF-055 — Security Hardening
- [ ] `sanitizeText()` strips `<script>` and other HTML tags from input
- [ ] `sanitizeText()` limits text to 10,000 characters
- [ ] Formula sentences, paragraph text, and writing pieces sanitized before save
- [ ] Content-Security-Policy meta tag present in `index.html`
- [ ] CSP includes `connect-src` for Supabase domains

### WF-056 — Teacher Onboarding Flow
- [ ] Teacher with no `school_id` redirected to `/onboarding` on login
- [ ] Step 1 form: school name, URN (6 digits), phase — creates `schools` row
- [ ] Step 2: first name confirmation — updates `profiles.school_id`
- [ ] Step 3: quick-start checklist — button navigates to `/teacher`
- [ ] `StepWizard` component shows progress through all 3 steps

### WF-057 — Pupil Onboarding
- [ ] `PupilWelcomeModal` shown on first `/dashboard` visit (no localStorage flag)
- [ ] 3 animated frames cycle through Formula, Paragraph, Writing Studio
- [ ] "Start Level 1" button creates `pupil_progress` row if missing
- [ ] `wf_pupil_welcomed` flag set in localStorage; modal not shown again on reload

### WF-058 — Performance Indexes
- [ ] `idx_formula_sessions_pupil_date` index exists on `formula_sessions`
- [ ] `idx_writing_pieces_status_teacher` partial index exists on `writing_pieces`
- [ ] `idx_mastery_tracking_gate` partial index exists on `mastery_tracking`
- [ ] `idx_pupil_badges_awarded` index exists on `pupil_badges`
- [ ] `idx_certificates_pupil` index exists on `certificates`

### WF-059 — App Version & Build Info
- [ ] Login page footer shows "WriFe v1.0.0 · Built with ❤️ for UK schools"
- [ ] Admin panel Overview tab shows app version and build date
- [ ] `src/lib/version.ts` exports `APP_VERSION = '1.0.0'` and `BUILD_DATE`

### WF-060 — Final Integration
- [ ] `npx tsc -b --noEmit` exits with code 0 (zero errors)
- [ ] All 20 required tables confirmed in Supabase (see SQL query below)
- [ ] App loads at `https://pwp-studio.vercel.app` without console errors
- [ ] All 60 tickets have been implemented or documented

---

## Database Table Verification

Run this query to confirm all 20 expected tables:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables (20):
1. ai_assessments
2. badges
3. certificates
4. classes
5. formula_levels
6. formula_sessions
7. intervention_log
8. mastery_tracking
9. paragraph_sessions
10. paragraph_starters
11. parent_pupil
12. profiles
13. pupil_badges
14. pupil_progress
15. schools
16. teacher_annotations
17. teacher_task_assignments
18. word_banks
19. writing_pieces
20. writing_tasks

---

## TypeScript Verification

```bash
cd wrifeapp && npx tsc -b --noEmit
# Must exit with code 0 (no output = clean)
```

---

*Generated: 2026-04-25 — WriFe v1.0.0*
