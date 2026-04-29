import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Role } from '../../types/index'

/**
 * WF-002: After login, redirect users to the correct dashboard based on role.
 * WF-056: Teachers with no school_id → /onboarding (school-allocated accounts only)
 * school_admin → /admin (no school_id required — app-level admin)
 * pupil → /dashboard
 * teacher → /teacher (or /onboarding if no school assigned)
 * parent → /parent
 * unauthenticated → /login
 */
export const RoleRedirect = () => {
  const { session, role, profile, isLoading, isInitialised } = useAuthStore()

  if (isLoading || !isInitialised) {
    return null
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Auth user exists but no profile row yet → send to login to re-authenticate
  if (!profile) {
    return <Navigate to="/login" replace />
  }

  switch (role) {
    case Role.PUPIL:
      return <Navigate to="/dashboard" replace />
    case Role.TEACHER:
      // Only school-allocated teachers proceed; self-registered without school → onboarding
      if (!profile?.school_id) return <Navigate to="/onboarding" replace />
      return <Navigate to="/teacher" replace />
    case Role.SCHOOL_ADMIN:
      // App-level admin — no school_id required
      return <Navigate to="/admin" replace />
    case Role.PARENT:
      return <Navigate to="/parent" replace />
    default:
      return <Navigate to="/dashboard" replace />
  }
}
