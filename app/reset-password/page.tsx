'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { api } from '@/api'

function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.auth.resetPassword(email.trim(), otp.trim(), password)
      setDone(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('400') || msg.includes('API')
        ? msg.replace(/API \d+ on [^:]+: /, '')
        : msg)
    } finally {
      setLoading(false)
    }
  }

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
            background: 'var(--grad-accent)',
            borderRadius: '6px', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-on-accent)',
          }}>N</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.05em' }}>NEXFLOW</span>
        </div>

        {done ? (
          <>
            <div style={{
              width: '3rem', height: '3rem', borderRadius: '0.75rem',
              background: 'var(--color-success-bg)', border: '1px solid rgba(21,128,61,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem',
            }}>
              <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>Password updated</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <button
              onClick={() => router.replace('/login')}
              className="btn-primary"
              style={{ width: '100%', height: '2.625rem', fontSize: '0.875rem', fontWeight: 600 }}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Reset password</h1>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
              Enter the code we sent to your email and choose a new password.
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
                <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Reset code</label>
                <input
                  type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                  placeholder="6-digit code" className="input-base"
                  maxLength={6}
                  style={{ width: '100%', fontSize: '1rem', height: '2.625rem', letterSpacing: '0.2em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.375rem' }}>New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)} minLength={6}
                    placeholder="At least 6 characters" className="input-base"
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

              <div>
                <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'} required value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password" className="input-base"
                  style={{ width: '100%', fontSize: '0.875rem', height: '2.625rem' }}
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="btn-primary"
                style={{ marginTop: '0.25rem', height: '2.625rem', fontSize: '0.875rem', fontWeight: 600 }}
              >
                {loading
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : 'Reset password'}
              </button>
            </form>
          </>
        )}

        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--color-muted)' }}>
          <a href="/login" style={{ color: 'var(--color-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <ArrowLeft size={13} /> Back to sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
