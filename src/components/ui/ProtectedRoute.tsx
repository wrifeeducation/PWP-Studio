import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../types/index'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

/**
 * Guards routes by auth state and role.
 * Never redirects to /onboarding — that page is invite-only for school-allocated teachers.
 */
export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { session, profile, role, isLoading, isInitialised } = useAuthStore()

  // Show spinner while auth is initialising
  if (isLoading || !isInitialised) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
        data-testid="protected-route-loading"
      >
        <div className="text-center space-y-3">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: 'var(--color-brand-primary)', borderTopColor: 'transparent' }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Loading WriFe"
          >
            Loading WriFe…
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated → login
  if (!session) return <Navigate to="/login" replace />

  // Authenticated but profile not yet loaded → keep showing spinner
  // (AuthInitialiser will populate the profile; avoid premature redirect)
  if (!profile) return null

  // Wrong role → redirect to own dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'pupil')        return <Navigate to="/dashboard" replace />
    if (role === 'teacher')      return <Navigate to="/teacher" replace />
    if (role === 'school_admin') return <Navigate to="/admin" replace />
    if (role === 'parent')       return <Navigate to="/parent" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
