import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In — NexFlow AI Automation Platform',
  description: 'Log in to NexFlow and start building AI-powered automation flows. No-code workflow builder with real-time execution, multi-provider AI nodes, and full transparency.',
  alternates: {
    canonical: 'https://nex-flow-frontend.vercel.app/login',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
