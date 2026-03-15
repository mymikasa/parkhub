import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '@/lib/auth'

interface AuthState {
  // State
  accessToken: string | null
  refreshToken: string | null
  user: UserInfo | null
  isAuthenticated: boolean

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserInfo) => void
  login: (accessToken: string, refreshToken: string, user: UserInfo) => void
  logout: () => void
  updateAccessToken: (accessToken: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      // Actions
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: !!accessToken,
        }),

      setUser: (user) =>
        set({
          user,
        }),

      login: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),

      updateAccessToken: (accessToken) =>
        set({
          accessToken,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
