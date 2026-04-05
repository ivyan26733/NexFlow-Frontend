import type { AuthUser } from '@/types'

const TOKEN_KEY = 'nexflow_token'
const USER_KEY  = 'nexflow_user'

// ── Token storage (localStorage — used on local dev only) ────────────────────
// On production the token lives in an HttpOnly cookie managed by the backend.
// The frontend never touches the cookie value directly.

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

function dispatchAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nexflow-auth-change'))
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  dispatchAuthChange()
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  dispatchAuthChange()
}

export function saveUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  dispatchAuthChange()
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Checks if the user is logged in.
 *
 * Local dev:   relies on localStorage token (set after login response body).
 * Production:  token is in HttpOnly cookie (JS can't read it), so we check
 *              for the stored user profile instead. The profile is always
 *              saved after a successful login on both envs.
 */
export function isLoggedIn(): boolean {
  return !!getToken() || !!getStoredUser()
}

/**
 * Returns auth headers for local dev (Bearer token from localStorage).
 * On production the HttpOnly cookie is sent automatically by the browser
 * via credentials:'include', so no manual header is needed.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
