'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Moon, Sun, MoreVertical, X, Settings, LogOut, Shield, User } from 'lucide-react'
import dynamic from 'next/dynamic'
import NavSettingsDropdown from './NavSettingsDropdown'
import { getStoredUser, clearAuth, isLoggedIn } from '@/lib/auth'
import { api } from '@/api'
import type { AuthUser } from '@/types'

const UserMenu = dynamic(() => import('./UserMenu'), { ssr: false })

const NAV_LINKS = [
  { href: '/',             label: 'Dashboard'    },
  { href: '/flow',         label: 'Flows'        },
  { href: '/pulses',       label: 'Pulses'       },
  { href: '/schedules',    label: 'Schedules'    },
  { href: '/transactions', label: 'Transactions' },
  { href: '/templates',    label: 'Templates'    },
  { href: '/nexus',        label: 'Nexus'        },
  { href: '/transfer',     label: 'Transfer'     },
  { href: '/about',        label: 'About'        },
]

export default function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dimMode,    setDimMode]    = useState(false)
  const [mobileUser, setMobileUser] = useState<AuthUser | null>(null)
  const navRef  = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileUser(getStoredUser())
    function onAuthChange() { setMobileUser(getStoredUser()) }
    window.addEventListener('nexflow-auth-change', onAuthChange)
    return () => window.removeEventListener('nexflow-auth-change', onAuthChange)
  }, [])

  /* ── Restore dim-mode preference on mount ── */
  useEffect(() => {
    const stored = localStorage.getItem('nexflow-dim')
    if (stored === '1') {
      setDimMode(true)
      document.documentElement.classList.add('dim-mode')
    }
  }, [])

  /* ── Close mobile menu on route change ── */
  useEffect(() => { setMobileOpen(false) }, [pathname])

  /* ── Close mobile menu when clicking outside both nav AND menu ── */
  useEffect(() => {
    if (!mobileOpen) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      const inNav  = navRef.current?.contains(t)
      const inMenu = menuRef.current?.contains(t)
      if (!inNav && !inMenu) setMobileOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [mobileOpen])

  /* ── Close mobile menu on Escape ── */
  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  function toggleDim() {
    const next = !dimMode
    setDimMode(next)
    localStorage.setItem('nexflow-dim', next ? '1' : '0')
    document.documentElement.classList.toggle('dim-mode', next)
  }

  async function mobileLogout() {
    setMobileOpen(false)
    try { await api.auth.logout() } catch { /* ignore */ }
    clearAuth()
    router.replace('/login')
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/' || pathname === ''
    return pathname.startsWith(href)
  }

  // Landing page — marketing nav using app theme variables
  if (pathname === '/home') {
    const loggedIn = isLoggedIn()
    return (
      <>
        <style>{`
          .lp-nav { padding: 0 32px; }
          .lp-nav-links { display: flex; gap: 4px; align-items: center; }
          .lp-login-btn { display: inline-flex; }
          @media (max-width: 680px) {
            .lp-nav { padding: 0 16px !important; }
            .lp-nav-links { display: none !important; }
            .lp-login-btn { display: none !important; }
          }
        `}</style>
        <nav className="lp-nav" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '58px',
          background: 'rgba(242,233,220,0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 1px 8px rgba(26,16,8,0.06)',
        }}>
          {/* Brand */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{
              width: '28px', height: '28px',
              background: 'var(--grad-accent)',
              borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', color: 'var(--color-on-accent)', fontWeight: 800,
            }}>N</span>
            <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-text)', letterSpacing: '0.8px' }}>NEXFLOW</span>
          </a>

          {/* Centre links — hidden on mobile */}
          <div className="lp-nav-links">
            {[
              { label: 'Features',     href: '#features'     },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'AI Nodes',     href: '#ai'           },
              { label: 'About',        href: '/about'        },
            ].map(l => (
              <a key={l.label} href={l.href} style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, color: 'var(--color-muted)',
                textDecoration: 'none',
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text)'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-panel)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-muted)'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                }}
              >{l.label}</a>
            ))}
          </div>

          {/* Auth CTAs */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {loggedIn ? (
              <a href="/dashboard" style={{
                padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                background: 'var(--grad-accent)', color: 'var(--color-on-accent)',
                textDecoration: 'none', boxShadow: '0 2px 8px rgba(154,52,18,0.25)',
                whiteSpace: 'nowrap',
              }}>Dashboard →</a>
            ) : (
              <>
                <button
                  className="lp-login-btn"
                  onClick={() => window.dispatchEvent(new CustomEvent('nexflow-open-auth', { detail: 'login' }))}
                  style={{
                    padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    color: 'var(--color-text)', background: 'none',
                    border: '1.5px solid var(--color-border)', cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'border-color 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >Log in</button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('nexflow-open-auth', { detail: 'signup' }))}
                  style={{
                    padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                    background: 'var(--grad-accent)', color: 'var(--color-on-accent)',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 2px 8px rgba(154,52,18,0.25)',
                    whiteSpace: 'nowrap',
                  }}
                >Get started →</button>
              </>
            )}
          </div>
        </nav>
      </>
    )
  }

  return (
    <>
      <nav ref={navRef} className="app-nav">

        {/* Brand */}
        <a href="/" className="nav-brand">
          <span className="logo-box" style={{ borderRadius: '6px' }}>N</span>
          <span className="logo-text">NEXFLOW</span>
        </a>

        {/* Desktop links */}
        <div className="nav-divider nav-desktop" />
        <div className="nav-links nav-desktop">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} style={{
              color:      isActive(l.href) ? 'var(--color-text)' : undefined,
              fontWeight: isActive(l.href) ? 600 : undefined,
            }}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="nav-divider nav-desktop" />
        <div className="nav-desktop"><NavSettingsDropdown /></div>

        {/* Spacer */}
        <div className="nav-spacer" />

        {/* Dim-mode toggle — always visible */}
        <button
          onClick={toggleDim}
          title={dimMode ? 'Turn off night mode' : 'Turn on night mode'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '2rem', height: '2rem', borderRadius: '0.4rem',
            background: dimMode ? 'rgba(154,52,18,0.12)' : 'none',
            border: dimMode ? '1px solid rgba(154,52,18,0.25)' : '1px solid transparent',
            cursor: 'pointer', color: dimMode ? 'var(--color-accent)' : 'var(--color-muted)',
            flexShrink: 0, transition: 'background 0.2s, border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = dimMode ? 'var(--color-accent)' : 'var(--color-muted)' }}
        >
          {dimMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Desktop user menu + version */}
        <div className="nav-desktop"><UserMenu /></div>
        <span className="nav-version nav-desktop" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', marginLeft: '0.25rem' }}>v1.2</span>

        {/* Mobile 3-dot trigger */}
        <button
          className="nav-mobile-trigger"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={18} /> : <MoreVertical size={18} />}
        </button>
      </nav>

      {/* Mobile dropdown — rendered outside <nav> as a fixed overlay so nothing clips it */}
      {mobileOpen && (
        <div ref={menuRef} className="nav-mobile-menu" role="menu">
          <div className="nav-mobile-links">
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="nav-mobile-item"
                role="menuitem"
                style={{
                  color:      isActive(l.href) ? 'var(--color-accent)' : undefined,
                  fontWeight: isActive(l.href) ? 600 : undefined,
                  background: isActive(l.href) ? 'rgba(154,52,18,0.06)' : undefined,
                }}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </div>
          {/* Mobile: flat settings + user actions — no nested dropdowns */}
          <div style={{ borderTop: '1px solid var(--color-border)' }}>
            <a
              href="/settings/ai-providers"
              className="nav-mobile-item"
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
              onClick={() => setMobileOpen(false)}
            >
              <Settings size={15} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
              AI Providers
            </a>
            {mobileUser && (mobileUser.role === 'ADMIN' || mobileUser.role === 'SUB_ADMIN') && (
              <>
                <a
                  href="/admin"
                  className="nav-mobile-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
                  onClick={() => setMobileOpen(false)}
                >
                  <Shield size={15} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                  Admin Panel
                </a>
                <a
                  href="/groups"
                  className="nav-mobile-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
                  onClick={() => setMobileOpen(false)}
                >
                  <User size={15} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                  Groups
                </a>
              </>
            )}
            {mobileUser ? (
              <button
                type="button"
                onClick={mobileLogout}
                className="nav-mobile-item"
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem',
                  color: 'var(--color-failure)', fontFamily: 'inherit',
                }}
              >
                <LogOut size={15} style={{ flexShrink: 0 }} />
                Sign out
              </button>
            ) : !isLoggedIn() ? (
              <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1.5rem' }}>
                <a href="/login" className="nav-mobile-item" style={{ padding: 0, border: 'none', borderBottom: 'none' }} onClick={() => setMobileOpen(false)}>Sign in</a>
                <a href="/signup" className="nav-mobile-item" style={{ padding: 0, border: 'none', borderBottom: 'none', color: 'var(--color-accent)', fontWeight: 600 }} onClick={() => setMobileOpen(false)}>Sign up</a>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
