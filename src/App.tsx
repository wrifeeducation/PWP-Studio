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

// Home signup — standalone parent sign-up page (Route C entry point)
const HomeSignupPage = lazy(() => import('./pages/HomeSignupPage'))

// Teacher signup — standalone independent teacher sign-up page (Route D entry point)
const TeacherSignupPage = lazy(() => import('./pages/TeacherSignupPage'))

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
    /**
     * BUG-006 fix (v2): keep the onAuthStateChange callback SYNCHRONOUS.
     *
     * Root cause (revised): The Supabase JS client uses the browser Web Locks API
     * (lock key: "sb-{project-ref}-auth-token") for all token reads/writes.
     * signInWithPassword() holds this lock while persisting the new tokens.
     * If the onAuthStateChange callback is async, Supabase fires it without
     * awaiting — meaning INITIAL_SESSION and SIGNED_IN handlers run concurrently,
     * both racing to acquire the same lock → "Lock was released because another
     * request stole it" → fetchProfileWithTimeout throws (caught → null) → login
     * fails with "Could not load account profile".
     *
     * Fix: Make the callback synchronous per Supabase docs. Kick all async work
     * off outside the callback (via Promise chains). For SIGNED_IN events add a
     * 300ms delay to let signInWithPassword fully release the lock before the
     * profile query needs to read the session token.
     *
     * Admin login has its own self-sufficient profile fetch (AdminLoginPage.tsx)
     * and does not depend on this handler for navigation.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // ── Synchronous: update session in store immediately ──────────────────
      setSession(session)

      if (session?.user) {
        const userId = session.user.id

        if (event === 'INITIAL_SESSION') {
          // ── Stale-while-revalidate (page reload / direct URL) ─────────────
          // 1. Hydrate from cache immediately so ProtectedRoute never flashes
          const cached = readCachedProfile()
          if (cached) {
            setProfile(cached)
            setLoading(false)
            setInitialised(true)
          }

          // 2. Fetch fresh profile async — no await inside callback
          fetchProfileWithTimeout(userId).then(fresh => {
            if (fresh) {
              setProfile(fresh)
              saveCachedProfile(fresh)
            }
            // 3. First-ever visit: mark ready after fetch completes
            if (!cached) {
              setLoading(false)
              setInitialised(true)
            }
          })
        } else {
          // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, etc.
          // Delay 300ms so signInWithPassword's auth-token lock fully releases
          // before the profile query tries to read the session token.
          setLoading(true)
          setTimeout(() => {
            fetchProfileWithTimeout(userId).then(profile => {
              if (profile) {
                setProfile(profile)
                saveCachedProfile(profile)
              }
              setLoading(false)
              setInitialised(true)
            })
          }, 300)
        }
      } else {
        // SIGNED_OUT or no session
        clearCachedProfile()
        clearAuth()
      }
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
            <Route path="/home-signup" element={<HomeSignupPage />} />
            <Route path="/teacher-signup" element={<TeacherSignupPage />} />
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
