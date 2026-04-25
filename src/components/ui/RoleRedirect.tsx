import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Role } from '../../types/index'

/**
 * WF-002: After login, redirect users to the correct dashboard based on role.
 * pupil → /dashboard
 * teacher → /teacher
 * school_admin → /admin
 * unauthenticated → /login
 */
export const RoleRedirect = () => {
  const { session, role, isLoading, isInitialised } = useAuthStore()

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
      return <Navigate to="/teacher" replace />
    case Role.SCHOOL_ADMIN:
      return <Navigate to="/admin" replace />
    case Role.PARENT:
      return <Navigate to="/parent" replace />
    default:
      return <Navigate to="/dashboard" replace />
  }
}
