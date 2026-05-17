import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import FeedbackWidget from '@/components/FeedbackWidget'
import { ProtectedRoute } from '@/components/ui/ProtectedRoute'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Role } from '@/types/index'
import type { Profile } from '@/types/index'

// ── Eager-loaded pages (small, always needed) ────────────────────────────────
import LoginPage        from '@/pages/LoginPage'
import HomeSignupPage   from '@/pages/HomeSignupPage'
import TeacherSignupPage from '@/pages/TeacherSignupPage'
import AuthConfirmPage  from '@/pages/AuthConfirmPage'
import UpdatePasswordPage from '@/pages/UpdatePasswordPage'

// ── Lazy-loaded PWP pages ─────────────────────────────────────────────────────
const DashboardPage   = lazy(() => import('@/pages/pwp/DashboardPage'))
const LevelPage       = lazy(() => import('@/pages/pwp/LevelPage'))
const QuizPage        = lazy(() => import('@/pages/pwp/QuizPage'))
const TeacherPage     = lazy(() => import('@/pages/pwp/TeacherPage'))
const OnboardingPage  = lazy(() => import('@/pages/pwp/OnboardingPage'))

// ── Auth initialiser ─────────────────────────────────────────────────────────
// Keeps Zustand auth store in sync with Supabase session.
// Must be a component (not a hook) so it can live at root without rendering.
function AuthInitialiser() {
  const { setSession, setProfile, setLoading, setInitialised, clearAuth } = useAuthStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)

      if (session?.user) {
        const userId = session.user.id

        if (event === 'INITIAL_SESSION') {
          // Optimistically restore from cache, then revalidate in background
          const cached = localStorage.getItem('pwp_profile_v1')
          if (cached) {
            try { setProfile(JSON.parse(cached)); setLoading(false); setInitialised(true) } catch {}
          }

          supabase.from('profiles').select('*').eq('id', userId).single()
            .then(({ data }) => {
              if (data) {
                setProfile(data as unknown as Profile)
                localStorage.setItem('pwp_profile_v1', JSON.stringify(data))
              }
              if (!cached) { setLoading(false); setInitialised(true) }
            })
        } else {
          // SIGNED_IN / TOKEN_REFRESHED
          setLoading(true)
          // 300ms delay lets signInWithPassword release the auth lock first
          setTimeout(() => {
            supabase.from('profiles').select('*').eq('id', userId).single()
              .then(({ data }) => {
                if (data) {
                  setProfile(data as unknown as Profile)
                  localStorage.setItem('pwp_profile_v1', JSON.stringify(data))
                }
                setLoading(false)
                setInitialised(true)
              })
          }, 300)
        }
      } else {
        localStorage.removeItem('pwp_profile_v1')
        clearAuth()
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthInitialiser />

      <Suspense fallback={<LoadingSpinner label="Loading…" />}>
        <Routes>
          {/* ── Public auth routes ─────────────────────────────────────────── */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/home-signup"     element={<HomeSignupPage />} />
          <Route path="/teacher-signup"  element={<TeacherSignupPage />} />
          <Route path="/auth/confirm"    element={<AuthConfirmPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          {/* ── Pupil routes ───────────────────────────────────────────────── */}
          {/* Dashboard = learning path (world map) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Level practice: /level/7 loads level 7, auto-routes to current step */}
          <Route
            path="/level/:levelId"
            element={
              <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                <LevelPage />
              </ProtectedRoute>
            }
          />

          {/* Mastery quiz */}
          <Route
            path="/quiz/:quizId"
            element={
              <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                <QuizPage />
              </ProtectedRoute>
            }
          />

          {/* First-login onboarding walkthrough */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* ── Teacher route ──────────────────────────────────────────────── */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={[Role.TEACHER, Role.SCHOOL_ADMIN]}>
                <TeacherPage />
              </ProtectedRoute>
            }
          />

          {/* ── Root redirect ──────────────────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ── Catch-all ──────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <FeedbackWidget />
    </BrowserRouter>
  )
}
