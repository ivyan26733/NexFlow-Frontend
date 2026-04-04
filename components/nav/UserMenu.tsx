'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings, Shield } from 'lucide-react'
import { getStoredUser, clearAuth, isLoggedIn } from '@/lib/auth'
import type { AuthUser } from '@/types'

export default function UserMenu() {
  const router  = useRouter()
  const [user,  setUser]  = useState<AuthUser | null>(null)
  const [open,  setOpen]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getStoredUser())
    function onAuthChange() { setUser(getStoredUser()) }
    window.addEventListener('nexflow-auth-change', onAuthChange)
    return () => window.removeEventListener('nexflow-auth-change', onAuthChange)
  }, [])

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  function logout() {
    clearAuth()
    router.replace('/login')
  }

  if (!user) {
    if (!isLoggedIn()) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <a href="/login" style={{
            fontSize: '0.8rem', color: 'var(--color-muted)', textDecoration: 'none',
            padding: '0.375rem 0.75rem', border: '1px solid var(--color-border)',
            borderRadius: '0.375rem', fontWeight: 500, whiteSpace: 'nowrap',
          }}>Sign in</a>
          <a href="/signup" style={{
            fontSize: '0.8rem', color: '#0a0d14', textDecoration: 'none',
            padding: '0.375rem 0.75rem',
            background: 'linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)',
            borderRadius: '0.375rem', fontWeight: 600, whiteSpace: 'nowrap',
          }}>Sign up</a>
        </div>
      )
    }
    return null
  }

  const roleColor: Record<string, string> = {
    ADMIN:     'var(--color-accent)',
    SUB_ADMIN: '#f59e0b',
    MEMBER:    'var(--color-muted)',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--color-panel)', border: '1px solid var(--color-border)',
          borderRadius: '0.5rem', padding: '0.375rem 0.625rem', cursor: 'pointer',
          color: 'var(--color-text)', fontSize: '0.825rem', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
      >
        <div style={{
          width: '1.5rem', height: '1.5rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.625rem', fontWeight: 700, color: '#0a0d14', flexShrink: 0,
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ maxWidth: '7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name}
        </span>
        <span style={{
          fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
          color: roleColor[user.role] ?? 'var(--color-muted)', flexShrink: 0,
        }}>
          {user.role}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 0.375rem)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '0.625rem', minWidth: '14rem', zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden',
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>{user.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', margin: '0.125rem 0 0' }}>{user.email}</p>
          </div>

          <div style={{ padding: '0.375rem' }}>
            {(user.role === 'ADMIN' || user.role === 'SUB_ADMIN') && (
              <>
                <MenuItem icon={<Shield size={14} />} label="Admin Panel" onClick={() => { router.push('/admin'); setOpen(false) }} />
                <MenuItem icon={<User size={14} />} label="Groups" onClick={() => { router.push('/groups'); setOpen(false) }} />
              </>
            )}
            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.25rem 0' }} />
            <MenuItem icon={<LogOut size={14} />} label="Sign out" onClick={logout} danger />
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon, label, onClick, danger,
}: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 0.625rem', background: 'none', border: 'none',
        borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.825rem',
        color: danger ? 'var(--color-failure)' : 'var(--color-text)',
        textAlign: 'left', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
    >
      {icon}{label}
    </button>
  )
}
