'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { api } from '@/api'
import { setToken, saveUser, isLoggedIn } from '@/lib/auth'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Handle OAuth2 redirect (?token=xxx)
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setToken(token)
      api.auth.me().then(user => {
        saveUser({ id: user.id, email: user.email, name: user.name, role: user.role })
        router.replace('/')
      }).catch(() => router.replace('/'))
    }
  }, [searchParams, router])

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) router.replace('/')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.auth.login(email.trim(), password)
      if (res.token) {
        setToken(res.token)
        saveUser({ id: res.id, email: res.email, name: res.name, role: res.role })
        router.replace('/')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('400') ? 'Invalid email or password' : msg)
    } finally {
      setLoading(false)
    }
  }

  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-base)',
    }}>
      <div style={{
        width: '100%', maxWidth: '24rem',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '1rem', padding: '2rem',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.75rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '2rem', height: '2rem',
            background: 'linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)',
            borderRadius: '6px', fontSize: '0.875rem', fontWeight: 800, color: '#0a0d14',
          }}>N</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.05em' }}>NEXFLOW</span>
        </div>

        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome back</h1>
        <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
          Sign in to your account
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-failure)',
            borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
            fontSize: '0.825rem', color: 'var(--color-failure)', marginBottom: '1rem',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" className="input-base"
              style={{ width: '100%', fontSize: '0.875rem', height: '2.625rem' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <label className="dashboard-label">Password</label>
              <a href="/forgot-password" style={{ fontSize: '0.775rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="input-base"
                style={{ width: '100%', fontSize: '0.875rem', height: '2.625rem', paddingRight: '2.75rem' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
              }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="btn-primary"
            style={{ marginTop: '0.25rem', height: '2.625rem', fontSize: '0.875rem', fontWeight: 600 }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign in'}
          </button>
        </form>

        <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>

        <button
          type="button"
          onClick={() => { window.location.href = `${BASE}/oauth2/authorization/google` }}
          style={{
            width: '100%', height: '2.625rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.625rem', fontSize: '0.875rem',
            background: 'var(--color-panel)', border: '1px solid var(--color-border)',
            borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--color-muted)' }}>
          Don&apos;t have an account?{' '}
          <a href="/signup" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Sign up</a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
