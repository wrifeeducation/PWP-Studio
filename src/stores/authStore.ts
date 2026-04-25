import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { Role } from '../types/index'
import type { Profile } from '../types/index'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: Role | null
  isLoading: boolean
  isInitialised: boolean
}

interface AuthActions {
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (isLoading: boolean) => void
  setInitialised: (isInitialised: boolean) => void
  clearAuth: () => void
}

const initialState: AuthState = {
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  isInitialised: false,
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),

  setProfile: (profile) =>
    set({
      profile,
      role: profile?.role ?? null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setInitialised: (isInitialised) => set({ isInitialised }),

  clearAuth: () =>
    set({
      session: null,
      user: null,
      profile: null,
      role: null,
      isLoading: false,
      isInitialised: true,
    }),
}))
