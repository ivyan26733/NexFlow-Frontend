import type { AuthUser } from '@/types'

const TOKEN_KEY = 'nexflow_token'
const USER_KEY  = 'nexflow_user'

// ── Token storage (localStorage — client-side only) ───────────────────────────

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

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
