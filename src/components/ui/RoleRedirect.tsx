import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Role } from '../../types/index'

/**
 * WF-002: After login, redirect users to the correct dashboard based on role.
 * WF-056: Teachers/admins with no school_id → /onboarding
 * pupil → /dashboard
 * teacher → /teacher (or /onboarding if no school)
 * school_admin → /admin (or /onboarding if no school)
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

  switch (role) {
    case Role.PUPIL:
      return <Navigate to="/dashboard" replace />
    case Role.TEACHER:
      // WF-056: Redirect to onboarding if no school linked
      if (!profile?.school_id) return <Navigate to="/onboarding" replace />
      return <Navigate to="/teacher" replace />
    case Role.SCHOOL_ADMIN:
      if (!profile?.school_id) return <Navigate to="/onboarding" replace />
      return <Navigate to="/admin" replace />
    case Role.PARENT:
      return <Navigate to="/parent" replace />
    default:
      return <Navigate to="/dashboard" replace />
  }
}
