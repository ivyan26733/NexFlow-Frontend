'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { api } from '@/api'
import { setToken, saveUser } from '@/lib/auth'

function VerifyOtpForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const email        = searchParams.get('email') ?? ''

  const [otp,       setOtp]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return }
    setError('')
    setLoading(true)
    try {
      const res = await api.auth.verifyOtp(email, otp)
      if (res.token) setToken(res.token)   // local dev only
      saveUser({ id: res.id, email: res.email, name: res.name, role: res.role })
      router.replace('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('400') ? 'Incorrect or expired code' : msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setError('')
    setSuccess('')
    try {
      await api.auth.resendOtp(email)
      setSuccess('New code sent!')
      setOtp('')
    } catch {
      setError('Could not resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-base)',
    }}>
      <div style={{
        width: '100%', maxWidth: '22rem',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '1rem', padding: '2rem', textAlign: 'center',
      }}>
        <div style={{
          width: '3rem', height: '3rem', borderRadius: '50%',
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem', fontSize: '1.375rem',
        }}>✉</div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.375rem' }}>Check your email</h1>
        <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
          We sent a 6-digit code to<br />
          <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-failure)',
            borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
            fontSize: '0.825rem', color: 'var(--color-failure)', marginBottom: '1rem',
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid var(--color-success)',
            borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
            fontSize: '0.825rem', color: 'var(--color-success)', marginBottom: '1rem',
          }}>{success}</div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input
            ref={inputRef}
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="input-base"
            style={{
              width: '100%', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem',
              height: '3rem', fontFamily: 'var(--font-mono)',
            }}
          />

          <button
            type="submit" disabled={loading || otp.length !== 6}
            className="btn-primary"
            style={{ height: '2.625rem', fontSize: '0.875rem', fontWeight: 600 }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify'}
          </button>
        </form>

        <button
          type="button" onClick={handleResend} disabled={resending}
          style={{
            marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.825rem', color: 'var(--color-muted)',
            display: 'flex', alignItems: 'center', gap: '0.375rem', margin: '1rem auto 0',
          }}
        >
          {resending
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <RefreshCw size={13} />}
          Resend code
        </button>

        <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--color-border)' }}>
          <a href="/signup" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>← Back to sign up</a>
        </p>
      </div>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  )
}
