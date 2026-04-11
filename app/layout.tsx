import type { Metadata } from 'next'
import '@xyflow/react/dist/style.css'
import './globals.css'
import dynamic from 'next/dynamic'
import NavSettingsDropdown from '@/components/nav/NavSettingsDropdown'
import { AuthGuardProvider } from '@/components/AuthGuardProvider'

const UserMenu         = dynamic(() => import('@/components/nav/UserMenu'),        { ssr: false })
const AuthRedirect     = dynamic(() => import('@/components/AuthRedirect'),         { ssr: false })
const FloatingAssistant = dynamic(() => import('@/components/FloatingAssistant'),   { ssr: false })

export const metadata: Metadata = {
  title:       'Nexflow',
  description: 'No-code workflow automation platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', background: 'var(--color-base)', color: 'var(--color-text)' }}>
        <nav className="app-nav">
          <a href="/" className="nav-brand">
            <span className="logo-box" style={{ borderRadius: '6px' }}>
              N
            </span>
            <span className="logo-text">NEXFLOW</span>
          </a>
          <div className="nav-divider" />
          <a href="/">Dashboard</a>
          <a href="/flow">Flows</a>
          <a href="/pulses">Pulses</a>
          <a href="/transactions">Transactions</a>
          <a href="/templates">Templates</a>
          <a href="/nexus">Nexus</a>
          <a href="/transfer">Transfer</a>
          <a href="/about">About</a>
          <div className="nav-divider" />
          <NavSettingsDropdown />
          <div className="nav-spacer" />
          <UserMenu />
          <span className="nav-version" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', marginLeft: '0.5rem' }}>v1.2</span>
        </nav>

        <AuthRedirect />
        <AuthGuardProvider>
          <main style={{ minHeight: 'calc(100vh - 3.5rem)' }}>{children}</main>
        </AuthGuardProvider>
        <FloatingAssistant />
      </body>
    </html>
  )
}
