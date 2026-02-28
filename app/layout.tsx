import type { Metadata } from 'next'
import '@xyflow/react/dist/style.css'
import './globals.css'

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
            <span
              className="logo-box"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 800,
                color: '#0a0d14',
              }}
            >
              N
            </span>
            <span className="logo-text">NEXFLOW</span>
          </a>
          <div className="nav-divider" />
          <a href="/">Flows</a>
          <a href="/pulses">Pulses</a>
          <a href="/transactions">Transactions</a>
          <a href="/nexus">Nexus</a>
          <a href="/about">About</a>
          <div className="nav-spacer" />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>v1.0 MVP</span>
        </nav>

        <main style={{ minHeight: 'calc(100vh - 3.5rem)' }}>{children}</main>
      </body>
    </html>
  )
}
