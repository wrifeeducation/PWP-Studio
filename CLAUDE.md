# WriFe: Technical Handoff for Claude Code

## Project Overview

**WriFe** is a gamified digital literacy platform designed for UK primary and secondary schools (Key Stages 1–3: Years 1–9). It teaches structured sentence and paragraph writing through three integrated learning layers: formula practice (sentence building), paragraph construction (using the LSC scaffold), and extended writing (full compositions up to 700 words). The platform is offline-capable, uses AI-powered assessment, and implements a complete teacher/parent dashboard with real-time progress tracking.

**Mission:** Equip every pupil with explicit, scaffolded sentence-writing skills that transfer to all genres and subjects.

---

## Three-Layer Architecture

### Layer 1: PWP Formula Practice (L1–L67)
Pupils build grammatically correct sentences by arranging colour-coded word-class tiles into the Programmable Word Pattern formula. Each formula represents a syntactic structure (e.g., L1 = determiner + noun). Sessions are 10–15 minutes daily. Pupils earn XP, complete daily streaks, and unlock the next formula upon mastery (80%+ accuracy threshold).

- **UI Component:** Drag-and-drop builder with slots for each word class
- **Assessment:** Layer 1 (client validation) + Layer 2 (formula NLP via OpenAI gpt-4o-mini)
- **Output:** Sentence scored for grammatical correctness, stored in user session record

### Layer 2: Paragraph Builder (activated at L8)
Once pupils master L8, they extend their formula sentence into a full paragraph using the **LSC scaffold** (Lead → Support → Close):
- **Lead:** introduces the topic
- **Support:** adds detail/evidence (1–2 sentences)
- **Close:** concludes the paragraph

Four genre types available: Narrative, Non-fiction, Persuasive, Poetry. Each has its own LSC constraints and vocabulary suggestions.

- **UI Component:** Three-phase form (L-phase, S-phase, C-phase) with rich text input
- **Assessment:** Layer 2B (paragraph cohesion) + Layer 3 (semantic analysis via gpt-4o-mini)
- **Output:** Paragraph scored for coherence, vocabulary, genre adherence

### Layer 3: Writing Studio
Extended writing task (400–700 words, directed prompt). Pupils compose full essays/stories. Submission is assessed against the **UK National Curriculum** rubrics:
- KS1 (Yr1–2): phonics, spacing, basic punctuation
- KS2 (Yr3–6): sentence variety, paragraph organisation, spelling, grammar
- KS3 (Yr7–9): rhetoric, cohesion, audience awareness, technical accuracy

Assessment is performed by the **AI writing assessor** (gpt-4o, more capable than gpt-4o-mini) and returned as a detailed rubric score. Teachers can override or provide written feedback.

- **UI Component:** Rich text editor (ProseMirror/tiptap) with word count, real-time autosave
- **Assessment:** Layer 4 (rubric scoring via gpt-4o) + Layer 5 (teacher review, optional)
- **Output:** Score + feedback comments stored; PDF generation for printing/portfolio

---

## Tech Stack (Pinned Versions)

### Frontend
- **React** 18.3
- **TypeScript** 5.4
- **Vite** 5.2
- **Tailwind CSS** 3.4
- **shadcn/ui** (latest, built on Radix UI 1.0)
- **Framer Motion** 11.0
- **@dnd-kit/core** 8.1 + **@dnd-kit/sortable** 8.0
- **tiptap** 2.4 (ProseMirror wrapper)
- **Zustand** 4.4
- **@react-pdf/renderer** 3.3 (for Writing Studio export)
- **vite-plugin-pwa** 0.20 (offline + PWA manifest)
- **idb** 8.0 (IndexedDB wrapper)

### Backend / BaaS
- **Supabase** (PostgreSQL 15, Auth, Realtime, Storage, Edge Functions)
  - Auth: JWT + row-level security (RLS)
  - Realtime: for dashboard live updates (teachers see pupil progress in real-time)
  - Storage: for PDF exports, formula image assets
  - Edge Functions: Node.js 20 runtime, 6MB payload limit

### AI
- **OpenAI API**
  - gpt-4o-mini (formula + paragraph assessment, cheaper, faster)
  - gpt-4o (writing studio assessment, more capable for rubric scoring)
- Integration: **only via Supabase Edge Functions** (never call OpenAI directly from browser)

### Testing
- **Vitest** (unit tests, uses same config as Vite)
- **React Testing Library** (component tests)
- **Playwright** (E2E tests, runs headless in CI)

### Package Manager
- **pnpm** 9.0+

---

## Folder Structure (Monorepo)

```
wrifeapp/
├── CLAUDE.md                         # This file (must-read for every session)
├── package.json                      # Root workspace config
├── pnpm-workspace.yaml
│
├── apps/
│   └── web/                          # Main React PWA (Vite + SWA)
│       ├── src/
│       │   ├── main.tsx              # Vite entry point
│       │   ├── App.tsx               # Root route handler
│       │   ├── vite-env.d.ts         # Vite type definitions
│       │   │
│       │   ├── components/
│       │   │   ├── formula/          # PWP Formula Practice components
│       │   │   │   ├── FormulaBuilder.tsx       # Main builder UI
│       │   │   │   ├── WordClassTile.tsx        # Draggable tile
│       │   │   │   ├── FormulaSlot.tsx          # Drop target
│       │   │   │   └── FormulaFeedback.tsx      # Validation/error display
│       │   │   ├── paragraph/        # Paragraph Builder components
│       │   │   │   ├── ParagraphPhaseA.tsx      # LSC input form (Lead)
│       │   │   │   ├── ParagraphPhaseB.tsx      # Support phase
│       │   │   │   ├── ParagraphPhaseC.tsx      # Close phase
│       │   │   │   └── ParagraphPreview.tsx     # Live preview
│       │   │   ├── writing-studio/   # Writing Studio components
│       │   │   │   ├── WritingEditor.tsx        # ProseMirror wrapper
│       │   │   │   ├── WritingPrompt.tsx        # Prompt + word count
│       │   │   │   ├── SubmitModal.tsx          # Pre-submit checklist
│       │   │   │   └── AssessmentResult.tsx     # Rubric score display
│       │   │   ├── dashboard/        # Teacher/parent dashboard
│       │   │   │   ├── TeacherDashboard.tsx     # Main dashboard view
│       │   │   │   ├── PupilProgress.tsx        # Real-time formula/paragraph progress
│       │   │   │   ├── WritingReview.tsx        # Writing submission review
│       │   │   │   └── ClassOverview.tsx        # Whole-class analytics
│       │   │   ├── gamification/     # XP, badges, streaks, timeline
│       │   │   │   ├── XPCounter.tsx            # XP +100 animation
│       │   │   │   ├── BadgeReveal.tsx          # Badge unlock animation
│       │   │   │   ├── StreakMeter.tsx          # Daily streak display
│       │   │   │   └── LevelTimeline.tsx        # Visual progress through L1–L67
│       │   │   ├── ui/               # Shared shadcn/ui components (not custom)
│       │   │   │   ├── button.tsx
│       │   │   │   ├── modal.tsx
│       │   │   │   ├── form.tsx
│       │   │   │   └── ... (other shadcn exports)
│       │   │   ├── auth/             # Login, register, password reset
│       │   │   └── layout/           # Layout shells, nav bars, headers
│       │   │
│       │   ├── hooks/                # Custom React hooks (query + logic)
│       │   │   ├── useSession.ts      # Current user + auth state
│       │   │   ├── useFormula.ts      # Formula practice session state + mutations
│       │   │   ├── useParagraph.ts    # Paragraph builder state
│       │   │   ├── useWriting.ts      # Writing studio session state
│       │   │   ├── useAssess.ts       # Call Edge Functions, get AI feedback
│       │   │   ├── useOfflineQueue.ts # Queue writes during offline
│       │   │   ├── useSyncToSupabase.ts  # Sync queued writes when online
│       │   │   └── useSupabase.ts     # Generic typed Supabase queries
│       │   │
│       │   ├── lib/
│       │   │   ├── supabase.ts        # Supabase client instance
│       │   │   ├── supabaseClient.ts  # (shared client exports)
│       │   │   ├── assessment/
│       │   │   │   ├── validateFormula.ts    # Layer 1: client-side formula validation
│       │   │   │   ├── parseSentence.ts      # Parse submitted sentence into word classes
│       │   │   │   └── stripPII.ts           # Remove names/PII before sending to AI
│       │   │   ├── offline/
│       │   │   │   ├── db.ts          # IDB schema + init
│       │   │   │   ├── queue.ts       # Offline write queue operations
│       │   │   │   └── sync.ts        # Sync logic: batch writes to Supabase on online
│       │   │   └── pdf/
│       │   │       └── generatePDF.ts # React-PDF helpers for Writing Studio exports
│       │   │
│       │   ├── stores/                # Zustand state atoms
│       │   │   ├── useSessionStore.ts     # Auth, current user, role
│       │   │   ├── useFormulaStore.ts     # Formula session: current level, submitted sentence, score
│       │   │   ├── useParagraphStore.ts   # Paragraph session: LSC inputs, preview
│       │   │   ├── useWritingStore.ts     # Writing studio: editor content, word count
│       │   │   ├── useGameStore.ts        # XP, badges, streaks, level unlocks
│       │   │   └── useDashboardStore.ts   # Teacher dashboard filters, real-time updates
│       │   │
│       │   ├── types/                 # TypeScript shared types
│       │   │   ├── index.ts           # Re-export all types
│       │   │   ├── pupil.ts           # Pupil profile, progress, XP
│       │   │   ├── formula.ts         # Formula definitions (L1–L67), word classes
│       │   │   ├── assessment.ts      # AI response shapes, rubric definitions
│       │   │   ├── supabase.ts        # DB schema types (auto-generated from schema.sql)
│       │   │   └── errors.ts          # Custom error types
│       │   │
│       │   ├── pages/                 # Route-level components (not all routes have pages; use App.tsx routing)
│       │   │   ├── HomePage.tsx
│       │   │   ├── LoginPage.tsx
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── FormulaPage.tsx
│       │   │   ├── ParagraphPage.tsx
│       │   │   └── WritingStudioPage.tsx
│       │   │
│       │   ├── styles/
│       │   │   └── globals.css        # Tailwind directives, custom CSS vars
│       │   │
│       │   └── App.tsx                # Route definitions (React Router v6)
│       │
│       ├── public/                    # Static assets
│       │   ├── manifest.json          # PWA manifest
│       │   ├── service-worker.js      # Vite PWA (workbox-generated)
│       │   └── assets/
│       │       ├── formulas/          # Formula SVG illustrations (L1–L67)
│       │       ├── badges/            # Badge unlock graphics
│       │       └── icons/             # UI icons (word classes, etc.)
│       │
│       ├── index.html
│       ├── vite.config.ts             # Vite + PWA plugin config
│       ├── vitest.config.ts
│       ├── playwright.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.js         # Custom colour tokens, animations
│       └── package.json
│
├── packages/                          # Shared libraries (published to npm or used internally)
│   ├── types/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── formula.ts             # Formula definitions: { id, name, pattern, wordClasses, minLevel }
│   │   │   ├── assessment.ts          # Assessment result types
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   ├── formula-engine/                # Pure TypeScript, no React deps
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts               # Main exports
│   │   │   ├── formula.ts             # Formula definitions L1–L67
│   │   │   ├── validator.ts           # Syntax validation: check if sentence matches formula
│   │   │   ├── parser.ts              # Parse sentence string into word class array
│   │   │   └── wordClasses.ts         # Word class definitions + colour mappings
│   │   └── tsconfig.json
│   │
│   └── ai-prompts/
│       ├── package.json
│       ├── src/
│       │   ├── formula-assessment.md  # Versioned prompt for gpt-4o-mini (formula)
│       │   ├── paragraph-assessment.md # Versioned prompt for gpt-4o-mini (paragraph)
│       │   ├── writing-assessment.md   # Versioned prompt for gpt-4o (writing studio)
│       │   └── index.ts                # Export prompts by version
│       └── tsconfig.json
│
├── supabase/
│   ├── migrations/                    # SQL migration files (timestamp-named)
│   │   ├── 20250101000000_init_schema.sql
│   │   ├── 20250110000000_rls_policies.sql
│   │   └── (etc.)
│   │
│   ├── functions/                     # Edge Functions (Node.js 20)
│   │   ├── assess-formula/
│   │   │   ├── index.ts               # POST /assess-formula
│   │   │   └── package.json
│   │   ├── assess-paragraph/
│   │   │   ├── index.ts               # POST /assess-paragraph
│   │   │   └── package.json
│   │   ├── assess-writing/
│   │   │   ├── index.ts               # POST /assess-writing
│   │   │   └── package.json
│   │   └── deno.json                  # (Supabase uses Deno, not Node, for CF; adjust if needed)
│   │
│   ├── schema.sql                     # Complete DB schema (tables, indexes, RLS policies)
│   ├── seed.sql                       # Seed data: formula definitions, prompts, admin users
│   └── config.toml                    # Supabase local dev config
│
└── docs/
    ├── README.md                      # Project overview (link from root)
    ├── architecture.md                # System data flow, offline strategy, assessment layers
    ├── design-system.md               # Colours, typography, components, animations
    ├── feature-tickets.md             # Backlog (issues/epics in task format)
    └── deployment.md                  # (Future) CI/CD, hosting, environment setup
```

---

## Key Conventions

### File Naming & Exports
- **Components:** PascalCase.tsx with **named exports only** (no default exports, except page components)
  ```typescript
  // ✓ CORRECT
  export const WordClassTile: React.FC<WordClassTileProps> = ({ ... }) => { ... }
  
  // ✗ WRONG
  export default WordClassTile
  ```
- **Hooks:** useCamelCase.ts with named export
  ```typescript
  export const useFormula = () => { ... }
  ```
- **Utils/Lib:** camelCase.ts with named export
  ```typescript
  export const stripPII = (text: string) => { ... }
  ```

### Styling
- **Tailwind only.** No inline styles, no CSS modules, no styled-components.
- Custom colour tokens defined in `tailwind.config.js` (see Design System doc).
- Responsive: tablet-first breakpoints (sm=480, md=768, lg=1024).
- Use Tailwind's `@apply` directive sparingly in globals.css for component-like patterns.

### Component Structure
- Props defined as `interface ComponentNameProps { ... }` at top of file.
- Use shadcn/ui components for common UI (Button, Dialog, Form, etc.).
- Compound components encouraged for complex UI (e.g., WordClassTile + FormulaSlot).
- All interactive elements must have `data-testid` for E2E tests.

### State Management (Zustand)
- One store per domain: `useSessionStore`, `useFormulaStore`, `useParagraphStore`, `useWritingStore`, `useGameStore`, `useDashboardStore`.
- Stores split into actions + selectors:
  ```typescript
  export const useFormulaStore = create<FormulaState & FormulaActions>((set, get) => ({
    currentLevel: 1,
    submittedSentence: '',
    score: null,
    setCurrentLevel: (level) => set({ currentLevel: level }),
    submitSentence: (sentence) => set({ submittedSentence: sentence }),
  }))
  ```
- No async logic in stores; use custom hooks for API calls.

### Supabase Queries
- All Supabase client calls go through custom hooks in `hooks/use*.ts`.
- Use **typed client** (auto-generated from schema.sql):
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  import type { Database } from '@/types/supabase'
  
  const supabase = createClient<Database>(url, key)
  ```
- Example hook pattern:
  ```typescript
  export const useGetPupilProgress = (pupilId: string) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
      supabase
        .from('pupil_progress')
        .select('*')
        .eq('pupil_id', pupilId)
        .single()
        .then(({ data }) => setData(data))
        .finally(() => setLoading(false))
    }, [pupilId])
    
    return { data, loading }
  }
  ```

### AI Assessment
- **NEVER call OpenAI directly from the client.** Always use Supabase Edge Functions.
- Custom hook pattern:
  ```typescript
  export const useAssessFormula = () => {
    const assess = async (sentence: string, formulaId: number) => {
      const { data, error } = await supabase.functions.invoke('assess-formula', {
        body: { sentence, formulaId }
      })
      return data
    }
    return { assess }
  }
  ```
- Edge Function input: must include `formulaId` or `promptType` to select the correct prompt version.
- Edge Function output: standardized JSON shape `{ score, feedback, correct, details }`.

### Offline-First Architecture
- **All writes go to IndexedDB first**, then queued for sync.
- Example:
  ```typescript
  export const useSubmitSentence = () => {
    const submit = async (sentence: string) => {
      // 1. Validate client-side
      const validation = validateFormula(sentence, currentFormula)
      if (!validation.valid) throw validation.error
      
      // 2. Write to IDB immediately
      await db.sessionWrites.add({ sentence, timestamp: Date.now() })
      
      // 3. Queue sync to Supabase
      if (navigator.onLine) await syncSessionWrites()
    }
    return { submit }
  }
  ```
- IndexedDB schema: `sessionWrites` table stores pending writes with timestamp + status.
- Sync: batch writes every 5 seconds or on manual save.
- Conflict resolution: client timestamp wins (last-write-wins).

### Accessibility (WCAG 2.1 AA)
- All text visible to pupils must have `data-tts` attribute for TTS.
  ```tsx
  <div data-tts="Determiner tile">
    <span className="font-bold text-purple-600">the</span>
  </div>
  ```
- Touch targets: minimum 44×44px (mobile), 40×40px (tablet).
- Colour contrast: 4.5:1 for normal text, 3:1 for large text.
- Semantic HTML: use `<button>`, `<form>`, `<label>` correctly.
- ARIA roles only when needed (prefer semantic HTML).
- Keyboard navigation: all interactive elements must be focusable and operable via Enter/Space.

### Testing
- **Unit tests** (Vitest): utility functions, custom hooks in isolation
- **Component tests** (React Testing Library): interactive components, user workflows
- **E2E tests** (Playwright): full user journeys (login → formula session → save → sync)
- Naming: `*.test.ts` or `*.test.tsx`
- Run with `pnpm test` or `pnpm test:e2e`

### Git & Commits
- Commit messages: `feat(formula): add tile drag animation` or `fix(assessment): handle empty sentence`
- Branch naming: `feature/`, `bugfix/`, `chore/` prefixes
- PRs must include E2E test pass before merge to `main`

### GDPR & Data Privacy
- **Never include PII (names, email, phone) in AI prompt payloads.**
- Before sending sentence/paragraph to OpenAI:
  ```typescript
  const cleanedSentence = stripPII(userSentence, pupilProfile)
  // Remove any named entities that match pupilName, classname, etc.
  ```
- Supabase auth: use JWT with RLS policies to ensure pupils can only see their own data.
- Edge Function logs: do not log full payloads, only sanitized request summaries.

---

## Environment Variables

Required for development and production:

```bash
# Supabase
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[public-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # Edge Functions only

# OpenAI (Edge Functions only)
OPENAI_API_KEY=sk-...

# App
VITE_APP_VERSION=0.1.0
VITE_ENV=development|staging|production
```

**Local development:** Create `.env.local` in `apps/web/`. Vite auto-loads with `VITE_` prefix.

**Edge Functions:** Use Supabase CLI to set secrets: `supabase secrets set OPENAI_API_KEY=...`

---

## Development Commands

```bash
# Install dependencies (pnpm required)
pnpm install

# Start dev server (Vite on localhost:5173)
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Run unit tests (Vitest)
pnpm test

# Run E2E tests (Playwright)
pnpm test:e2e

# Start local Supabase (Docker required)
pnpm supabase:start

# Stop local Supabase
pnpm supabase:stop

# Run pending migrations
pnpm supabase:migrate

# Seed development data (formulas, prompts, test users)
pnpm supabase:seed

# Generate TypeScript types from Supabase schema
pnpm supabase:types

# Lint & format (ESLint + Prettier)
pnpm lint
pnpm format
```

---

## Current Phase & Status

**Phase 1 (MVP):** In development.

### Completed
- Project structure scaffolded (monorepo, folder layout)
- Supabase project created, schema designed
- TypeScript types generated from schema
- Basic auth flow (login, register, JWT)
- Zustand store templates for session, formula, paragraph, writing, game, dashboard

### In Progress
- Formula Practice UI components (FormulaBuilder, WordClassTile, FormulaSlot)
- Edge Function implementations (assess-formula, assess-paragraph)
- Offline IndexedDB queue + sync logic
- Paragraph Builder UI components
- Gamification animations (XP counter, badge reveal)

### Not Started
- Writing Studio UI (rich text editor integration with tiptap)
- Teacher dashboard (real-time pupils progress)
- Writing assessment Edge Function (gpt-4o)
- PDF export (react-pdf integration)
- E2E test suite
- Deployment configuration (CI/CD, hosting)

---

## Documentation Links

- **[`docs/architecture.md`](./docs/architecture.md)** — Data flow, offline strategy, assessment layers, auth model
- **[`docs/design-system.md`](./docs/design-system.md)** — Colour tokens, typography, component specs, animations, accessibility
- **[`docs/feature-tickets.md`](./docs/feature-tickets.md)** — Backlog, epics, acceptance criteria
- **[`docs/deployment.md`](./docs/deployment.md)** — (Future) Hosting, CI/CD, environment setup

---

## What NOT to Do (Anti-Patterns)

### ✗ DO NOT
- **Call OpenAI directly from the React frontend.** Always use Supabase Edge Functions.
- **Store PII in AI payloads.** Strip names and identifying details before sending to gpt-4o-mini or gpt-4o.
- **Use CSS-in-JS, inline styles, or CSS modules.** Tailwind only.
- **Create default exports for components.** Use named exports.
- **Write async logic directly in Zustand stores.** Use custom hooks to wrap async operations.
- **Ignore offline-first principles.** All writes must go to IndexedDB first, then sync.
- **Skip TTS `data-tts` attributes on pupil-facing text.** Every visible string needs this for accessibility.
- **Hardcode colours.** Use Tailwind custom tokens defined in `tailwind.config.js`.
- **Write to Supabase without RLS policies.** All tables must have row-level security.
- **Commit secrets or API keys.** Use `.env.local` and Supabase CLI secrets.
- **Assume pupils have stable internet.** Design and test for offline scenarios.
- **Use heavy animations without Framer Motion.** Prefer prebuilt motion variants.
- **Skip accessibility testing.** WCAG 2.1 AA is mandatory; run axe or Lighthouse on every component.
- **Forget to update TypeScript types when schema changes.** Run `pnpm supabase:types` after migrations.

---

## Before You Start: Session Checklist

Each time Claude Code opens this project, run through this checklist:

- [ ] **Environment:** Confirm `.env.local` (or equivalent) is loaded with all required vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.)
- [ ] **Dependencies:** Run `pnpm install` to ensure all packages are installed.
- [ ] **Local Supabase:** If working on database schema or Edge Functions, confirm local Supabase is running (`pnpm supabase:start`).
- [ ] **Types:** Run `pnpm supabase:types` to regenerate TypeScript types if schema was modified.
- [ ] **Folder Structure:** Verify all required directories exist (src/components/*, src/hooks/*, src/stores/*, supabase/functions/, etc.).
- [ ] **Read Architecture & Design System:** Review `docs/architecture.md` and `docs/design-system.md` if unfamiliar with data flow or design tokens.
- [ ] **Check Feature Tickets:** Review `docs/feature-tickets.md` to understand current sprint scope and acceptance criteria.
- [ ] **Dev Server:** Start Vite with `pnpm dev` before making changes.
- [ ] **Offline Mode:** Test IndexedDB queue and sync with DevTools Network throttling.
- [ ] **Accessibility:** Run Lighthouse or axe DevTools on new components before committing.
- [ ] **Tests:** Write unit tests for new hooks/utils and E2E tests for new user flows.
- [ ] **Git:** Ensure you're on the correct branch and commits follow the naming convention.

---

## Quick Reference: Tech Decisions & Trade-offs

| Decision | Why | Trade-off |
|----------|-----|-----------|
| Zustand over Redux | Lightweight, minimal boilerplate, easier onboarding | Less time-travel debugging; smaller ecosystem |
| @dnd-kit over react-beautiful-dnd | Active maintenance, flexible sorting, smaller bundle | Slightly steeper learning curve |
| Supabase Edge Functions for AI | Serverless, no cold-start vs Lambda, avoids client token exposure | Vendor lock-in; limits to Node.js 20 runtime |
| IndexedDB for offline-first | Works offline, sync-friendly, no external library needed | Schema migrations harder; debugging is harder |
| ProseMirror/tiptap for rich text | Battle-tested, extensible, supports collaborative editing (future) | Heavier than simple contenteditable; learning curve |
| gpt-4o-mini vs gpt-4o | Cost (formula/paragraph), speed (90%+ accuracy still acceptable) | Slightly lower accuracy; use gpt-4o only for final Writing Studio assessment |

---

## Support & Troubleshooting

- **Supabase not starting:** Ensure Docker is running. Check `supabase/config.toml` for port conflicts.
- **Types out of sync:** Run `pnpm supabase:types` after any schema migration.
- **Edge Function failing:** Check logs with `supabase functions deploy --project-id [id]` or inspect Edge Function logs in Supabase dashboard.
- **Offline queue stuck:** Clear IndexedDB in DevTools → Application → IndexedDB → delete `wrifeapp_db`, then refresh.
- **Tailwind not applying:** Ensure `content` in `tailwind.config.js` includes all component paths; rebuild with `pnpm build`.
- **TTS not working:** Verify `data-tts` attribute is on the element; test with `window.speechSynthesis.speak()` in DevTools console.

---

**Last Updated:** 2025-04-23  
**Project Phase:** MVP (Phase 1) — In Development  
**Status:** Active
