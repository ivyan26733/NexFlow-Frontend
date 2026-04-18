import type { Metadata } from 'next'
import '@xyflow/react/dist/style.css'
import './globals.css'
import dynamic from 'next/dynamic'
import { AuthGuardProvider } from '@/components/AuthGuardProvider'
import Script from 'next/script'

const AppNav          = dynamic(() => import('@/components/nav/AppNav'),          { ssr: false })
const AuthRedirect    = dynamic(() => import('@/components/AuthRedirect'),         { ssr: false })
const FloatingAssistant = dynamic(() => import('@/components/FloatingAssistant'), { ssr: false })

const SITE_URL = 'https://nex-flow-frontend.vercel.app'
const SITE_NAME = 'NexFlow'
const SITE_DESCRIPTION = 'NexFlow — AI-powered no-code workflow automation platform. Build, run, and monitor automation flows with AI nodes, parallel execution, real-time canvas, and multi-provider LLM support. The developer-first alternative to Zapier and n8n.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NexFlow — AI Workflow Automation Platform',
    template: '%s | NexFlow',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'NexFlow', 'AI automation', 'workflow automation', 'no-code automation',
    'AI workflow builder', 'automation platform', 'flow automation',
    'NexFlow AI', 'NexFlow automation', 'AI flow builder',
    'no-code workflow', 'automation tool', 'developer automation',
    'workflow engine', 'AI node automation', 'n8n alternative', 'zapier alternative',
    'real-time workflow', 'parallel execution', 'AI integration platform',
  ],
  authors: [{ name: 'NexFlow', url: SITE_URL }],
  creator: 'NexFlow',
  publisher: 'NexFlow',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'NexFlow — AI Workflow Automation Platform',
    description: SITE_DESCRIPTION,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: 'NexFlow AI Workflow Automation' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexFlow — AI Workflow Automation Platform',
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: '@nexflow',
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: 'technology',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'NexFlow',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
      description: SITE_DESCRIPTION,
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'NexFlow',
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/flows?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'NexFlow',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'AI workflow automation',
        'No-code flow builder',
        'Multi-provider AI nodes (Anthropic, OpenAI, Gemini, Groq)',
        'Real-time execution canvas',
        'Parallel branch execution',
        'JavaScript and Python script nodes',
        'Sub-flow composition',
        'RabbitMQ-backed WebSocket events',
      ],
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
