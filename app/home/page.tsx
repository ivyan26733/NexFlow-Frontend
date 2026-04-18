'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/api'
import { saveUser, setToken } from '@/lib/auth'
import { Eye, EyeOff, X, Loader2 } from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'

// ── Reveal hook ───────────────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({ children, delay = 0, style = {} }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(36px)',
      transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      ...style,
    }}>{children}</div>
  )
}

// ── Counter ───────────────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const { ref, visible } = useReveal()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!visible) return
    let cur = 0; const step = to / 55
    const t = setInterval(() => {
      cur += step
      if (cur >= to) { setN(to); clearInterval(t) } else setN(Math.floor(cur))
    }, 16)
    return () => clearInterval(t)
  }, [visible, to])
  return <span ref={ref}>{n}{suffix}</span>
}

// ── Scroll Y ──────────────────────────────────────────────────────────────────
function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const h = () => setY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return y
}

// ── Data ──────────────────────────────────────────────────────────────────────
const NODES = [
  { icon: '⚡', name: 'HTTP',      desc: 'Call any REST API or webhook with full header, body and auth control.' },
  { icon: '🤖', name: 'AI',        desc: 'Multi-provider LLM — Anthropic, OpenAI, Gemini, Groq, Mistral — with structured JSON output.' },
  { icon: '</>', name: 'Script',    desc: 'Write real JavaScript or Python mid-flow. Full language, zero restrictions.' },
  { icon: '⑂',  name: 'Sub-Flow', desc: 'Compose flows from other flows. Sync or async with result pass-through.' },
  { icon: '⊕',  name: 'Fork',     desc: 'Spawn parallel branches simultaneously on separate threads.' },
  { icon: '⊗',  name: 'Join',     desc: 'Merge branches — WAIT_ALL, WAIT_FIRST, or WAIT_N quorum.' },
  { icon: '◈',  name: 'Decision', desc: 'If/else routing that branches your automation based on data.' },
  { icon: '↺',  name: 'Loop',     desc: 'Iterate over arrays with index and item injected into context.' },
  { icon: '▣',  name: 'Variable', desc: 'Define named values at any point and reference them downstream.' },
  { icon: '⇌',  name: 'Mapper',   desc: 'Transform and reshape data between nodes without code.' },
  { icon: '✓',  name: 'Success',  desc: 'Terminal node — marks execution as completed successfully.' },
  { icon: '✕',  name: 'Failure',  desc: 'Terminal node — marks execution as failed with a custom message.' },
]

const STEPS = [
  { n: '01', title: 'Design on the canvas', desc: 'Drag nodes, connect them with edges, configure each one in the panel. The canvas shows your entire automation at a glance.' },
  { n: '02', title: 'Run and watch live',    desc: 'Hit Run. Every node lights up in real-time over WebSocket. See exactly which path your data took, where it paused, where it succeeded.' },
  { n: '03', title: 'Inspect every detail',  desc: 'Every execution saves a full audit trail. Open any transaction to see per-node input, output, duration, and the complete data snapshot.' },
]

const PROVIDERS = ['Anthropic', 'OpenAI', 'Gemini', 'Groq', 'Mistral']

// ── Auth Modal ────────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup'

function AuthModal({ mode, onClose, onSwitch }: {
  mode: AuthMode
  onClose: () => void
  onSwitch: (m: AuthMode) => void
}) {
  const router = useRouter()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.auth.login(email.trim(), password)
      if (res.token) setToken(res.token)
      saveUser({ id: res.id, email: res.email, name: res.name, role: res.role })
      onClose()
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg.includes('400') ? 'Invalid email or password.' : msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.auth.signup(email.trim(), password, name.trim())
      onClose()
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed'
      setError(msg.includes('400') ? 'This email is already registered.' : msg)
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(26,16,8,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'nx-fadeIn 0.2s ease',
        }}
      />

      {/* Modal card */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 201,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', pointerEvents: 'none',
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            pointerEvents: 'all',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '36px 32px',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 24px 64px rgba(26,16,8,0.18)',
            animation: 'nx-slideUp 0.25s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--color-accent-soft)',
                border: '1px solid rgba(154,52,18,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, marginBottom: 12,
              }}>
                {isLogin ? '🔑' : '✦'}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '4px 0 0' }}>
                {isLogin ? 'Sign in to your NexFlow account' : 'Start automating for free'}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--color-panel)', border: '1px solid var(--color-border)',
              borderRadius: '8px', padding: '6px', cursor: 'pointer',
              color: 'var(--color-muted)', display: 'flex', flexShrink: 0,
            }}>
              <X size={15} />
            </button>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => { window.location.href = `${BASE}/oauth2/authorization/google` }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '11px', borderRadius: '10px',
              background: 'var(--color-base)', border: '1.5px solid var(--color-border)',
              cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              color: 'var(--color-text)', marginBottom: '20px',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent-soft)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-base)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '20px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: '5px' }}>Full name</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" className="input-base"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: '5px' }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-base"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>Password</label>
                {isLogin && (
                  <a href="/forgot-password" style={{ fontSize: '11px', color: 'var(--color-accent)', textDecoration: 'none' }}>
                    Forgot password?
                  </a>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isLogin ? '••••••••' : 'At least 6 characters'}
                  className="input-base"
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
                />
                <button
                  type="button" onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-muted)', display: 'flex', padding: '2px',
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                background: 'var(--color-failure-bg)', color: 'var(--color-failure)',
                border: '1px solid rgba(127,29,29,0.15)',
              }}>{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: '4px', padding: '12px', borderRadius: '10px',
                background: 'var(--grad-accent)', color: 'var(--color-on-accent)',
                fontSize: '14px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: loading ? 0.75 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              {isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Switch mode */}
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)', marginTop: '20px', margin: '20px 0 0' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setError(''); onSwitch(isLogin ? 'signup' : 'login') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontWeight: 700, fontSize: '13px', padding: 0 }}
            >
              {isLogin ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const scrollY = useScrollY()
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  const openLogin  = useCallback(() => setAuthMode('login'),  [])
  const openSignup = useCallback(() => setAuthMode('signup'), [])
  const closeAuth  = useCallback(() => setAuthMode(null),     [])
  const switchAuth = useCallback((m: AuthMode) => setAuthMode(m), [])

  // Listen for nav bar buttons dispatching auth open events
  useEffect(() => {
    const h = (e: Event) => setAuthMode((e as CustomEvent<AuthMode>).detail)
    window.addEventListener('nexflow-open-auth', h)
    return () => window.removeEventListener('nexflow-open-auth', h)
  }, [])

  // Helper: button that opens modal
  const PrimaryBtn = ({ label, mode }: { label: string; mode: AuthMode }) => (
    <button onClick={() => setAuthMode(mode)} className="nx-btn-primary">{label}</button>
  )
  const GhostBtn = ({ label, mode }: { label: string; mode: AuthMode }) => (
    <button onClick={() => setAuthMode(mode)} className="nx-btn-ghost">{label}</button>
  )

  return (
    <div style={{ background: 'var(--color-base)', color: 'var(--color-text)', overflowX: 'hidden', fontFamily: 'var(--font-geist)' }}>
      <style>{`
        @keyframes nx-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes nx-marquee  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes nx-pulse    { 0%{box-shadow:0 0 0 0 rgba(154,52,18,0.35)} 70%{box-shadow:0 0 0 10px rgba(154,52,18,0)} 100%{box-shadow:0 0 0 0 rgba(154,52,18,0)} }
        @keyframes nx-grad     { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes nx-fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes nx-slideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin        { to{transform:rotate(360deg)} }
        .nx-accent-text {
          background: var(--grad-accent); background-size:200% 200%;
          animation: nx-grad 5s ease infinite;
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .nx-card {
          background:var(--color-surface); border:1px solid var(--color-border); border-radius:16px;
          transition:transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .nx-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-warm),0 8px 32px rgba(154,52,18,0.1); border-color:var(--color-accent); }
        .nx-btn-primary {
          display:inline-flex; align-items:center; gap:8px;
          padding:13px 28px; border-radius:10px;
          background:var(--grad-accent); color:var(--color-on-accent);
          font-weight:700; font-size:15px; text-decoration:none; border:none; cursor:pointer;
          font-family:var(--font-geist);
          transition:opacity 0.2s ease, transform 0.2s ease;
        }
        .nx-btn-primary:hover { opacity:0.9; transform:translateY(-1px); }
        .nx-btn-ghost {
          display:inline-flex; align-items:center; gap:8px;
          padding:13px 28px; border-radius:10px; background:transparent;
          color:var(--color-text); font-weight:600; font-size:15px;
          text-decoration:none; border:1.5px solid var(--color-border); cursor:pointer;
          font-family:var(--font-geist);
          transition:border-color 0.2s ease, background 0.2s ease;
        }
        .nx-btn-ghost:hover { border-color:var(--color-accent); background:var(--color-accent-soft); }
        .nx-divider { height:1px; background:linear-gradient(90deg,transparent,var(--color-border),transparent); }
      `}</style>

      {/* Auth Modal */}
      {authMode && (
        <AuthModal mode={authMode} onClose={closeAuth} onSwitch={switchAuth} />
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
        background: 'var(--grad-hero-warm)',
      }}>
        <div style={{ position: 'absolute', top: '8%', right: '8%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(154,52,18,0.08) 0%, transparent 70%)', animation: 'nx-float 7s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '12%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,58,95,0.08) 0%, transparent 70%)', animation: 'nx-float 9s ease-in-out 2s infinite', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 100, padding: '5px 16px 5px 6px', marginBottom: 28, fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', boxShadow: 'var(--shadow-warm)' }}>
          <span style={{ background: 'var(--grad-accent)', borderRadius: 100, padding: '2px 10px', fontSize: 11, color: 'var(--color-on-accent)', fontWeight: 700 }}>NEW</span>
          AI-powered workflow automation for developers
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 7.5vw, 84px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2.5px', textAlign: 'center', maxWidth: 860, color: 'var(--color-text)', marginBottom: 20, transform: `translateY(${scrollY * 0.1}px)` }}>
          Build automations that<br />
          <span className="nx-accent-text">actually make sense.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2.2vw, 20px)', lineHeight: 1.75, color: 'var(--color-muted)', textAlign: 'center', maxWidth: 580, marginBottom: 44 }}>
          NexFlow is the no-code automation platform with real AI nodes, real code execution,
          and full transparency into every execution. Built for developers who refuse black boxes.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <PrimaryBtn label="Start building free →" mode="signup" />
          <GhostBtn   label="Sign in"                mode="login"  />
        </div>

        <div style={{ display: 'flex', gap: 0, marginTop: 64, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, boxShadow: 'var(--shadow-warm)', overflow: 'hidden', flexWrap: 'wrap' }}>
          {[
            { label: 'Node types',       to: 12,  suffix: '' },
            { label: 'AI providers',     to: 5,   suffix: '+' },
            { label: 'Parallel branches', to: 100, suffix: '+' },
            { label: 'Script languages', to: 2,   suffix: '' },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: '20px 36px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--color-border)' : 'none' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-accent)' }}><Counter to={s.to} suffix={s.suffix} /></div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: Math.max(0, 1 - scrollY / 180) }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-light)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, var(--color-accent), transparent)' }} />
        </div>
      </section>

      <div className="nx-divider" />

      {/* ── MARQUEE ───────────────────────────────────────────────────────── */}
      <div style={{ overflow: 'hidden', padding: '14px 0', background: 'var(--color-panel)' }}>
        <div style={{ display: 'flex', animation: 'nx-marquee 22s linear infinite', whiteSpace: 'nowrap' }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 44, paddingRight: 44 }}>
              {['AI Nodes','Real-Time Canvas','Parallel Execution','JavaScript + Python','Multi-LLM','HTTP Requests','Sub-Flows','Fork / Join','Full Transparency','RabbitMQ','WebSocket','Decision Trees'].map(f => (
                <span key={f} style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>
                  <span style={{ color: 'var(--color-accent)', marginRight: 14 }}>◆</span>{f}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="nx-divider" />

      {/* ── PROBLEM ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 1080, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>The Problem</p>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1 }}>Automation tools chose the wrong trade-off.</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
          {[
            { icon: '⬡', title: 'Black boxes with pretty UIs', desc: "Zapier and n8n hid the power to make it accessible. You can't write real logic. You can't see what's happening inside. Magic that breaks silently.", highlight: false },
            { icon: '⌂', title: 'Glue code that rots',         desc: 'Custom scripts only you understand. The same HTTP boilerplate written again and again. Two weeks later, nobody knows how it works or why it breaks.', highlight: false },
            { icon: '◎', title: 'What NexFlow gives you',      desc: 'Real code where you need it. Full visibility into every execution. Composable flows. AI nodes that return structured data. Transparency, not magic.', highlight: true },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <div className="nx-card" style={{ padding: 28, height: '100%', borderColor: c.highlight ? 'var(--color-accent)' : undefined, background: c.highlight ? 'var(--color-accent-soft)' : undefined }}>
                <div style={{ fontSize: 26, marginBottom: 14 }}>{c.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: c.highlight ? 'var(--color-accent)' : 'var(--color-text)' }}>{c.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-muted)', margin: 0 }}>{c.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="nx-divider" />

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px', background: 'var(--color-panel)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
              <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px' }}>From idea to automation in <span className="nx-accent-text">3 steps.</span></h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="nx-card" style={{ padding: 32 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent-soft)', border: '1px solid rgba(154,52,18,0.2)', fontSize: 13, fontWeight: 800, color: 'var(--color-accent)', marginBottom: 20 }}>{s.n}</div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.4px' }}>{s.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-muted)', margin: 0 }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="nx-divider" />

      {/* ── NODE TYPES ────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>12 Node Types</p>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Every tool you need.<br /><span className="nx-accent-text">Nothing you don't.</span></h2>
            <p style={{ fontSize: 17, color: 'var(--color-muted)', marginTop: 14, maxWidth: 520, margin: '14px auto 0' }}>Compose these nodes on the canvas to build any automation — simple or complex.</p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
          {NODES.map((n, i) => (
            <Reveal key={n.name} delay={i * 45}>
              <div className="nx-card" style={{ padding: '20px 22px', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-accent-soft)', border: '1px solid rgba(154,52,18,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{n.icon}</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>{n.name}</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-muted)', margin: 0 }}>{n.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="nx-divider" />

      {/* ── AI SECTION ────────────────────────────────────────────────────── */}
      <section id="ai" style={{ padding: '100px 24px', background: 'var(--color-panel)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 64, alignItems: 'center' }}>
          <Reveal>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>AI Built In</p>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 20 }}>Every major AI model.<br /><span className="nx-accent-text">One unified node.</span></h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--color-muted)', marginBottom: 28 }}>Define an output schema, write a prompt, and get structured JSON back — every time. No SDK switching, no prompt engineering frameworks. Just clean data you can use downstream.</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Structured JSON output with schema enforcement','System + user prompt with {{nex.variable}} injection','Configurable temperature, max tokens, model','Automatic retry if JSON parse fails'].map(f => (
                  <li key={f} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--color-text-mid)', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--color-accent)', marginTop: 2, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="nx-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 6px' }}>Supported providers</p>
              {PROVIDERS.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--color-base)', border: '1px solid var(--color-border-soft)', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{p}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', animation: 'nx-pulse 2s ease infinite' }} />
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>Your API key, your data. Keys are stored per-user and never leave your account.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="nx-divider" />

      {/* ── TRANSPARENCY ──────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 64, alignItems: 'center' }}>
          <Reveal>
            <div className="nx-card" style={{ padding: 24, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['#C0392B','#F39C12','#27AE60'].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                <span style={{ color: 'var(--color-muted)', fontSize: 11, marginLeft: 8 }}>Execution #a3f2c9 — live</span>
              </div>
              {[
                { node: 'START',          status: 'SUCCESS', color: 'var(--color-success)', bg: 'var(--color-success-bg)', time: '0ms'  },
                { node: 'HTTP:fetchUser', status: 'SUCCESS', color: 'var(--color-success)', bg: 'var(--color-success-bg)', time: '118ms'},
                { node: 'AI:analyzeData', status: 'SUCCESS', color: 'var(--color-success)', bg: 'var(--color-success-bg)', time: '1.1s' },
                { node: 'FORK:branches', status: 'RUNNING', color: 'var(--color-running)', bg: 'var(--color-running-soft)', time: '…'   },
                { node: '  ↳ notify',    status: 'RUNNING', color: 'var(--color-running)', bg: 'var(--color-running-soft)', time: '…'   },
                { node: '  ↳ log',       status: 'SUCCESS', color: 'var(--color-success)', bg: 'var(--color-success-bg)', time: '38ms' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 7, background: i % 2 === 0 ? 'var(--color-panel)' : 'transparent', marginBottom: 3 }}>
                  <span style={{ color: 'var(--color-text-mid)', fontSize: 12 }}>{r.node}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--color-muted)', fontSize: 11 }}>{r.time}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.color, padding: '2px 7px', borderRadius: 4, background: r.bg }}>{r.status}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: 12, background: 'var(--color-accent-soft)', border: '1px solid rgba(154,52,18,0.18)', borderRadius: 8 }}>
                <div style={{ color: 'var(--color-accent)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>nex.analyzeData.result</div>
                <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{'{ "sentiment": "positive", "score": 0.87 }'}</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Full Transparency</p>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 20 }}>See exactly what<br /><span className="nx-accent-text">happened. Always.</span></h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--color-muted)', marginBottom: 28 }}>Every execution is a full audit trail. Per-node input, output, and duration. If something fails, you know exactly where and why — in seconds.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { icon: '◎', title: 'Per-node I/O',    desc: 'Full input and output for every step' },
                  { icon: '⏱', title: 'Duration tracking', desc: 'Know which nodes are slow' },
                  { icon: '⑂', title: 'Branch timeline', desc: 'Time saved vs sequential shown live' },
                  { icon: '⤓', title: 'NCO snapshot',    desc: 'Full context saved on every execution' },
                ].map(item => (
                  <div key={item.title} style={{ padding: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="nx-divider" />

      {/* ── DEVELOPER ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'var(--color-panel)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>For Developers</p>
              <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1 }}>No-code speed.<br /><span className="nx-accent-text">Code-level power.</span></h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <Reveal delay={0} style={{ gridColumn: 'span 2' }}>
              <div style={{ background: 'var(--color-navy)', border: '1px solid rgba(30,58,95,0.3)', borderRadius: 16, padding: 28, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ fontSize: 11, color: 'rgba(249,243,236,0.35)', marginBottom: 14 }}>Script Node — JavaScript</div>
                <div><span style={{ color: '#c084fc' }}>const</span> <span style={{ color: '#93c5fd' }}>orders</span> <span style={{ color: '#f9f3ec' }}>=</span> <span style={{ color: '#c084fc' }}>nex</span><span style={{ color: '#f9f3ec' }}>.</span><span style={{ color: '#6ee7b7' }}>fetchOrders</span><span style={{ color: '#f9f3ec' }}>.</span><span style={{ color: '#6ee7b7' }}>body</span><span style={{ color: '#f9f3ec' }}>.</span><span style={{ color: '#6ee7b7' }}>data</span><span style={{ color: '#f9f3ec' }}>;</span></div>
                <div><span style={{ color: '#c084fc' }}>const</span> <span style={{ color: '#93c5fd' }}>highValue</span> <span style={{ color: '#f9f3ec' }}>=</span> <span style={{ color: '#93c5fd' }}>orders</span><span style={{ color: '#f9f3ec' }}>.</span><span style={{ color: '#6ee7b7' }}>filter</span><span style={{ color: '#f9f3ec' }}>(o =&gt; o.</span><span style={{ color: '#6ee7b7' }}>total</span> <span style={{ color: '#f9f3ec' }}>&gt;</span> <span style={{ color: '#fcd34d' }}>1000</span><span style={{ color: '#f9f3ec' }}>);</span></div>
                <div><span style={{ color: '#c084fc' }}>return</span> <span style={{ color: '#f9f3ec' }}>{'{ '}</span><span style={{ color: '#6ee7b7' }}>count</span><span style={{ color: '#f9f3ec' }}>: highValue.</span><span style={{ color: '#6ee7b7' }}>length</span><span style={{ color: '#f9f3ec' }}>, </span><span style={{ color: '#6ee7b7' }}>orders</span><span style={{ color: '#f9f3ec' }}>: highValue {'}'}</span></div>
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(20,83,45,0.4)', borderRadius: 8, borderLeft: '2px solid #22c55e' }}>
                  <span style={{ color: '#4ade80', fontSize: 12 }}>✓ Output stored as nex.filterHighValue — accessible by any downstream node</span>
                </div>
              </div>
            </Reveal>
            {[
              { icon: '{{}}', title: 'nex.* data layer',  desc: 'Every node output lands in nex under the name you chose. nex.fetchUser.body.email — never nodes["ca250f8e"].successOutput.result.' },
              { icon: '⟳',   title: 'Sub-flow calls',    desc: 'Call other NexFlow flows from inside a flow. Build a library of reusable automation primitives.' },
              { icon: '⑂',   title: 'True parallelism',  desc: 'Fork into branches, run them concurrently with CompletableFuture.allOf(), merge with WAIT_ALL, WAIT_FIRST, or WAIT_N.' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="nx-card" style={{ padding: 26 }}>
                  <div style={{ fontSize: 24, marginBottom: 14, color: 'var(--color-navy)' }}>{item.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-muted)', margin: 0 }}>{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="nx-divider" />

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', background: 'var(--grad-hero-warm)' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(32px, 5.5vw, 64px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 20 }}>
            Ready to build<br /><span className="nx-accent-text">something real?</span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--color-muted)', maxWidth: 460, margin: '0 auto 40px' }}>
            Sign up free. Build your first flow in minutes. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <PrimaryBtn label="Start building free →" mode="signup" />
            <GhostBtn   label="Sign in"                mode="login"  />
          </div>
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['No credit card required','12 node types ready','5 AI providers','Full execution transparency'].map(t => (
              <span key={t} style={{ fontSize: 13, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--color-accent)' }}>✓</span> {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  )
}
