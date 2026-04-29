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
 */

/** Fetch a user profile, but give up after 5 s to avoid an infinite spinner. */
async function fetchProfileWithTimeout(userId: string): Promise<Profile | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
  const fetch = Promise.resolve(
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  )
    .then(({ data, error }) => (data && !error ? (data as Profile) : null))
    .catch(() => null)
  return Promise.race([fetch, timeout])
}

function AuthInitialiser() {
  const { setSession, setProfile, setLoading, setInitialised, clearAuth } = useAuthStore()

  useEffect(() => {
    // Fetch initial session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        const profile = await fetchProfileWithTimeout(session.user.id)
        if (profile) setProfile(profile)
      } else {
        clearAuth()
      }
      setInitialised(true)
      setLoading(false)
    }).catch(() => {
      // getSession itself failed — mark as initialised so the app doesn't hang
      clearAuth()
    })

    // Subscribe to future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        // Mark as loading while we fetch the profile so ProtectedRoute
        // shows the spinner instead of bouncing to /login mid-fetch.
        setLoading(true)
        const profile = await fetchProfileWithTimeout(session.user.id)
        if (profile) setProfile(profile)
      } else {
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

            {/* School admin panel — admins only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={[Role.SCHOOL_ADMIN]}>
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
