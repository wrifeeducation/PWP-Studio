import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, lazy, Suspense } from 'react'

// Auth initialisation
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import type { Profile } from './types/index'

// Route guards
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ToastContainer } from './components/ui/ToastContainer'

// High contrast: apply on load from stored preference
import { applyHighContrastPreference } from './lib/contrastMode'
import { useSettingsStore } from './stores/settingsStore'

// Static pages (small, load eagerly)
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FormulaPage from './pages/FormulaPage'
import ParagraphPage from './pages/ParagraphPage'
import DailyPracticePage from './pages/DailyPracticePage'
import FreePracticePage from './pages/FreePracticePage'
import ConnectGridPage from './pages/ConnectGridPage'

// WF-040: Heavy pages — lazy loaded to reduce initial bundle
const WritingStudioPage = lazy(() => import('./pages/WritingStudioPage'))
const TeacherPage = lazy(() => import('./pages/TeacherPage'))
const TeacherReviewPage = lazy(() => import('./pages/TeacherReviewPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ParentPage = lazy(() => import('./pages/ParentPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
// WF-056: Teacher onboarding (invite-only — not auto-redirected)
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
// Auth email link handler + password update
const AuthConfirmPage = lazy(() => import('./pages/AuthConfirmPage'))
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'))
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'))

// Role constants
import { Role } from './types/index'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

/**
 * AuthInitialiser — sets up Supabase auth listener and populates Zustand store.
 * Renders nothing; used at root so auth is ready before routes render.
 *
 * BUG-001 fix: stale-while-revalidate pattern.
 * Profile is written to localStorage on every successful fetch.
 * On cold-start (page reload / direct URL), the cached profile is loaded
 * immediately so ProtectedRoute never sees a null profile mid-session-check.
 * The fresh DB fetch then updates the cache silently in the background.
 */

const PROFILE_CACHE_KEY = 'wrife_profile_v1'

function readCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}

function saveCachedProfile(profile: Profile): void {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
  } catch { /* quota exceeded — silently ignore */ }
}

function clearCachedProfile(): void {
  try { localStorage.removeItem(PROFILE_CACHE_KEY) } catch { /* ignore */ }
}

/** Fetch a user profile; give up after 8 s (extended from 5 s for slow connections). */
async function fetchProfileWithTimeout(userId: string): Promise<Profile | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
  const fetch = Promise.resolve(
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  )
    .then(({ data, error }) => {
      if (error) {
        console.error('[AuthInitialiser] fetchProfileWithTimeout error:', error)
      }
      return data && !error ? (data as Profile) : null
    })
    .catch((err) => {
      console.error('[AuthInitialiser] fetchProfileWithTimeout exception:', err)
      return null
    })
  return Promise.race([fetch, timeout])
}

function AuthInitialiser() {
  const { setSession, setProfile, setLoading, setInitialised, clearAuth } = useAuthStore()

  useEffect(() => {
    // Fetch initial session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)

      if (session?.user) {
        // ── Stale-while-revalidate ──────────────────────────────────────────
        // 1. Immediately hydrate from cache → prevents redirect flash on reload
        const cached = readCachedProfile()
        if (cached) {
          setProfile(cached)
          setLoading(false)
          setInitialised(true)   // unblock ProtectedRoute with cached data
        }

        // 2. Fetch fresh profile in background (or blocking if no cache)
        const fresh = await fetchProfileWithTimeout(session.user.id)
        if (fresh) {
          setProfile(fresh)
          saveCachedProfile(fresh)   // keep cache current for next reload
        }

        // 3. If there was no cache, mark ready now (first-ever visit path)
        if (!cached) {
          setInitialised(true)
          setLoading(false)
        }
      } else {
        // No session — clear cache so stale profile doesn't survive logout
        clearCachedProfile()
        clearAuth()
      }
    }).catch(() => {
      // getSession itself failed — mark as initialised so the app doesn't hang
      clearCachedProfile()
      clearAuth()
    })

    // Subscribe to future auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        // Mark as loading while we fetch the profile so ProtectedRoute
        // shows the spinner instead of bouncing to /login mid-fetch.
        setLoading(true)
        const profile = await fetchProfileWithTimeout(session.user.id)
        if (profile) {
          setProfile(profile)
          saveCachedProfile(profile)
        }
      } else {
        clearCachedProfile()
        clearAuth()
      }
      setLoading(false)
      setInitialised(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

/** SettingsInitialiser — applies persisted preferences on startup. */
function SettingsInitialiser() {
  const { highContrast, fontSize } = useSettingsStore()

  useEffect(() => {
    applyHighContrastPreference(highContrast)
    if (fontSize === 'large') {
      document.documentElement.classList.add('font-large')
    } else {
      document.documentElement.classList.remove('font-large')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Auth initialiser runs once at root — no render output */}
        <AuthInitialiser />
        {/* WF-038: Apply settings preferences on startup */}
        <SettingsInitialiser />

        {/* WF-053: Toast notification container */}
        <ToastContainer />

        <Suspense fallback={<LoadingSpinner label="Loading page…" />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/auth/confirm" element={<AuthConfirmPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />

            {/* Landing page — redirects logged-in users to their dashboard */}
            <Route path="/" element={<HomePage />} />

            {/* WF-003: Pupil dashboard — pupils only */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <ErrorBoundary>
                    <DashboardPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* WF-006: Formula Practice — pupils only */}
            <Route
              path="/practice"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <FormulaPage />
                </ProtectedRoute>
              }
            />

            {/* PWP Daily Chain Practice — pupils only */}
            <Route
              path="/daily-practice"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <DailyPracticePage />
                </ProtectedRoute>
              }
            />

            {/* Connect Grid Planner — between chain and paragraph */}
            <Route
              path="/connect-grid"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <ConnectGridPage />
                </ProtectedRoute>
              }
            />

            {/* PWP Free Practice — unlimited sessions with help mode */}
            <Route
              path="/free-practice"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <FreePracticePage />
                </ProtectedRoute>
              }
            />

            {/* WF-011: Paragraph Builder — pupils only, from L8 */}
            <Route
              path="/paragraph"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <ParagraphPage />
                </ProtectedRoute>
              }
            />

            {/* WF-016: Writing Studio — pupils only, requires studio_unlocked */}
            <Route
              path="/studio"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <WritingStudioPage />
                </ProtectedRoute>
              }
            />

            {/* Teacher dashboard — teachers only */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                  <ErrorBoundary>
                    <TeacherPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* WF-019: Teacher review of individual writing piece */}
            <Route
              path="/teacher/review/:pieceId"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                  <TeacherReviewPage />
                </ProtectedRoute>
              }
            />

            {/* Platform admin panel — admin role only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* WF-024: Parent read-only view — parents only */}
            <Route
              path="/parent"
              element={
                <ProtectedRoute allowedRoles={[Role.PARENT]}>
                  <ParentPage />
                </ProtectedRoute>
              }
            />

            {/* WF-058: Pricing page — accessible to authenticated parents + public */}
            <Route path="/pricing" element={<PricingPage />} />

            {/* WF-029: Pupil portfolio — pupils only */}
            <Route
              path="/portfolio"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <PortfolioPage />
                </ProtectedRoute>
              }
            />

            {/* WF-037: Pupil settings page */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* WF-056: Teacher onboarding wizard */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowedRoles={[Role.TEACHER, Role.SCHOOL_ADMIN]}>
                  <ErrorBoundary>
                    <OnboardingPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Catch-all: redirect to role-based home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
