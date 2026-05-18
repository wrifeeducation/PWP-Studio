import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Role } from '../../types/index'

/**
 * WF-002: Post-login role redirect.
 *
 * Routing rules:
 *   school_admin → /admin
 *   teacher      → /teacher  (school_id not required; self-registered teachers go straight in)
 *   pupil        → /dashboard
 *   parent       → /parent
 *
 * Onboarding (/onboarding) is ONLY for school-allocated teacher accounts and is
 * reached via a direct invite link — never via an automatic redirect here.
 */
export const RoleRedirect = () => {
  const { session, role, profile, isLoading, isInitialised } = useAuthStore()

  if (isLoading || !isInitialised) return null
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />

  switch (role) {
    case Role.SCHOOL_ADMIN: return <Navigate to="/staffhub" replace />
    case Role.TEACHER:      return <Navigate to="/teacher" replace />
    case Role.PUPIL:        return <Navigate to="/welcome" replace />
    case Role.PARENT:       return <Navigate to="/parent" replace />
    default:                return <Navigate to="/dashboard" replace />
  }
}
