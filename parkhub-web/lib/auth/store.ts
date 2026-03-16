'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { User, AuthContextValue, TokenStorage } from './types';
import * as authApi from './api';

// ──────────────────────────────────────────────
// Token Storage (localStorage + Cookie sync)
// ──────────────────────────────────────────────

const TOKEN_KEY = 'parkhub_auth';
// 5 minutes in ms – refresh access token this early
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

function saveTokens(data: TokenStorage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  // Sync access token to cookie so Next.js Middleware can read it
  document.cookie = `access_token=${data.access_token}; path=/; max-age=${Math.floor((data.expires_at - Date.now()) / 1000)}; SameSite=Lax`;
}

function loadTokens(): TokenStorage | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenStorage;
  } catch {
    return null;
  }
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
}

function isTokenExpired(storage: TokenStorage): boolean {
  return Date.now() >= storage.expires_at;
}

function isTokenNearExpiry(storage: TokenStorage): boolean {
  return Date.now() >= storage.expires_at - REFRESH_THRESHOLD_MS;
}

// ──────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshLock = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Refresh logic ──────────────────────────
  const scheduleRefresh = useCallback((storage: TokenStorage) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = storage.expires_at - Date.now() - REFRESH_THRESHOLD_MS;
    if (delay <= 0) return; // will refresh on next request
    refreshTimerRef.current = setTimeout(() => {
      void doRefresh(storage.refresh_token);
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doRefresh = useCallback(async (refreshTkn: string): Promise<string | null> => {
    if (refreshLock.current) return null;
    refreshLock.current = true;
    try {
      const res = await authApi.refreshToken(refreshTkn);
      const storage: TokenStorage = {
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        expires_at: Date.now() + res.expires_in * 1000,
      };
      saveTokens(storage);
      setUser(res.user);
      scheduleRefresh(storage);
      return res.access_token;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    } finally {
      refreshLock.current = false;
    }
  }, [scheduleRefresh]);

  // ── Initialise from stored tokens ──────────
  useEffect(() => {
    async function init() {
      const storage = loadTokens();
      if (!storage) {
        setIsLoading(false);
        return;
      }

      if (isTokenExpired(storage)) {
        // Try to refresh
        const newToken = await doRefresh(storage.refresh_token);
        if (!newToken) {
          setIsLoading(false);
          return;
        }
      } else {
        // Token still valid – fetch user
        try {
          const currentUser = await authApi.getCurrentUser(storage.access_token);
          setUser(currentUser);
          if (isTokenNearExpiry(storage)) {
            void doRefresh(storage.refresh_token);
          } else {
            scheduleRefresh(storage);
          }
        } catch {
          clearTokens();
        }
      }
      setIsLoading(false);
    }

    void init();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [doRefresh, scheduleRefresh]);

  // ── Login ──────────────────────────────────
  const login = useCallback(async (account: string, password: string, remember = false) => {
    const res = await authApi.login({ account, password, remember });
    const storage: TokenStorage = {
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      expires_at: Date.now() + res.expires_in * 1000,
    };
    saveTokens(storage);
    setUser(res.user);
    scheduleRefresh(storage);
  }, [scheduleRefresh]);

  // ── SMS Login ──────────────────────────────
  const smsLogin = useCallback(async (phone: string, code: string) => {
    const res = await authApi.smsLogin({ phone, code });
    const storage: TokenStorage = {
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      expires_at: Date.now() + res.expires_in * 1000,
    };
    saveTokens(storage);
    setUser(res.user);
    scheduleRefresh(storage);
  }, [scheduleRefresh]);

  // ── Logout ─────────────────────────────────
  const logout = useCallback(async () => {
    const storage = loadTokens();
    try {
      await authApi.logout(storage?.refresh_token);
    } catch {
      // Ignore errors on logout
    }
    clearTokens();
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    smsLogin,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// ──────────────────────────────────────────────
// Fetch interceptor helper (for API calls)
// ──────────────────────────────────────────────

/**
 * Get a valid access token, refreshing if needed.
 * Use this in API clients to attach Authorization header.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const storage = loadTokens();
  if (!storage) return null;

  if (isTokenExpired(storage)) {
    // Attempt refresh
    try {
      const res = await authApi.refreshToken(storage.refresh_token);
      const newStorage: TokenStorage = {
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        expires_at: Date.now() + res.expires_in * 1000,
      };
      saveTokens(newStorage);
      return newStorage.access_token;
    } catch {
      clearTokens();
      return null;
    }
  }

  return storage.access_token;
}
