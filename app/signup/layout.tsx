import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up Free — NexFlow AI Automation Platform',
  description: 'Create your free NexFlow account and start automating with AI. Build workflows with AI nodes, HTTP requests, JavaScript/Python scripts, parallel branches, and real-time execution visibility.',
  alternates: {
    canonical: 'https://nex-flow-frontend.vercel.app/signup',
  },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
