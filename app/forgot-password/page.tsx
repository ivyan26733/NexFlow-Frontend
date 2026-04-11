'use client'

import { useState } from 'react'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { api } from '@/api'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.auth.forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
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

        {sent ? (
          <>
            <div style={{
              width: '3rem', height: '3rem', borderRadius: '0.75rem',
              background: 'linear-gradient(135deg,rgba(154,52,18,0.12),rgba(30,58,95,0.12))',
              border: '1px solid rgba(154,52,18,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem',
            }}>
              <Mail size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check your email</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: 'var(--color-text)' }}>{email}</strong>, a password reset code has been sent. Check your inbox and spam folder.
            </p>
            <a
              href={`/reset-password?email=${encodeURIComponent(email)}`}
              className="btn-primary"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '2.625rem', fontSize: '0.875rem', fontWeight: 600,
                textDecoration: 'none', borderRadius: '0.5rem',
              }}
            >
              Enter reset code
            </a>
            <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--color-muted)' }}>
              Didn&apos;t receive it?{' '}
              <button
                onClick={() => { setSent(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '0.825rem', padding: 0 }}
              >
                Try again
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Forgot password?</h1>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
              Enter your email and we&apos;ll send you a reset code.
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
              <button
                type="submit" disabled={loading}
                className="btn-primary"
                style={{ height: '2.625rem', fontSize: '0.875rem', fontWeight: 600 }}
              >
                {loading
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : 'Send reset code'}
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
