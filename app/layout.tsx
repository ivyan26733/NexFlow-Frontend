import type { Metadata } from 'next'
import '@xyflow/react/dist/style.css'
import './globals.css'
import dynamic from 'next/dynamic'
import { AuthGuardProvider } from '@/components/AuthGuardProvider'

const AppNav          = dynamic(() => import('@/components/nav/AppNav'),          { ssr: false })
const AuthRedirect    = dynamic(() => import('@/components/AuthRedirect'),         { ssr: false })
const FloatingAssistant = dynamic(() => import('@/components/FloatingAssistant'), { ssr: false })

export const metadata: Metadata = {
  title:       'Nexflow',
  description: 'No-code workflow automation platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', background: 'var(--color-base)', color: 'var(--color-text)' }}>
        <AppNav />

        <AuthRedirect />
        <AuthGuardProvider>
          <main style={{ minHeight: 'calc(100vh - 3.5rem)', paddingTop: '3.5rem' }}>{children}</main>
        </AuthGuardProvider>
        <FloatingAssistant />
      </body>
    </html>
  )
}
