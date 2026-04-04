'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { isLoggedIn } from '@/lib/auth'
import { LogIn, UserPlus, X } from 'lucide-react'

interface AuthGuardContextType {
  requireAuth: (action: () => void) => void
}

const AuthGuardContext = createContext<AuthGuardContextType>({
  requireAuth: (fn) => fn(),
})

export function useAuthGuard() {
  return useContext(AuthGuardContext)
}

export function AuthGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const requireAuth = useCallback((action: () => void) => {
    if (isLoggedIn()) {
      action()
    } else {
      setOpen(true)
    }
  }, [])

  return (
    <AuthGuardContext.Provider value={{ requireAuth }}>
      {children}

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '1rem',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '1.125rem', padding: '2rem', width: '100%', maxWidth: '24rem',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{
                width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(99,102,241,0.15))',
                border: '1px solid rgba(0,212,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogIn size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'var(--color-panel)', border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer',
                  color: 'var(--color-muted)', display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Sign in required
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              You need an account to perform this action. Sign in or create a free account to continue.
            </p>

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button
                onClick={() => { setOpen(false); router.push('/signup') }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', padding: '0.75rem', background: 'none',
                  border: '1px solid var(--color-border)', borderRadius: '0.625rem',
                  cursor: 'pointer', color: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 500,
                }}
              >
                <UserPlus size={15} /> Sign up free
              </button>
              <button
                onClick={() => { setOpen(false); router.push('/login') }}
                className="btn-primary"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', padding: '0.75rem', fontSize: '0.875rem',
                }}
              >
                <LogIn size={15} /> Sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuardContext.Provider>
  )
}
