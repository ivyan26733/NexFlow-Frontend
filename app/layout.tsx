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
            <span className="logo-box">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2l5 5-5 5" stroke="#0a0d14" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="logo-text">NEXFLOW</span>
          </a>
          <div className="nav-divider" />
          <a href="/">Studio</a>
          <a href="/nexus">Nexus</a>
          <div className="nav-spacer" />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>v1.0 MVP</span>
        </nav>

        <main style={{ minHeight: 'calc(100vh - 3.5rem)' }}>{children}</main>
      </body>
    </html>
  )
}
