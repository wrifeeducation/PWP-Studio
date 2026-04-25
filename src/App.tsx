import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

// Auth initialisation
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import type { Profile } from './types/index'

// Route guards
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import { RoleRedirect } from './components/ui/RoleRedirect'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FormulaPage from './pages/FormulaPage'
import ParagraphPage from './pages/ParagraphPage'
import TeacherPage from './pages/TeacherPage'
import TeacherReviewPage from './pages/TeacherReviewPage'
import WritingStudioPage from './pages/WritingStudioPage'
import AdminPage from './pages/AdminPage'
import ParentPage from './pages/ParentPage'
import PortfolioPage from './pages/PortfolioPage'

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
function AuthInitialiser() {
  const { setSession, setProfile, setLoading, setInitialised, clearAuth } = useAuthStore()

  useEffect(() => {
    // Fetch initial session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data as Profile)
      } else {
        clearAuth()
      }
      setInitialised(true)
      setLoading(false)
    })

    // Subscribe to future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data as Profile)
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Auth initialiser runs once at root — no render output */}
        <AuthInitialiser />

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* WF-002: Role-based redirect from root */}
          <Route path="/" element={<RoleRedirect />} />

          {/* WF-003: Pupil dashboard — pupils only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                <DashboardPage />
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
                <TeacherPage />
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

          {/* WF-029: Pupil portfolio — pupils only */}
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute allowedRoles={[Role.PUPIL]}>
                <PortfolioPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all: redirect to role-based home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
