import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'NexFlow — AI Workflow Automation Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo / Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: '48px', fontWeight: 700, color: '#ffffff', letterSpacing: '-1px' }}>
            NexFlow
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#a78bfa',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          AI Workflow Automation Platform
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: '18px',
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.5,
          }}
        >
          Build, run, and monitor automation flows with AI nodes,
          parallel execution, and real-time canvas visibility.
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
          {['AI Nodes', 'No-Code Builder', 'Real-Time Execution', 'Multi-LLM'].map((f) => (
            <div
              key={f}
              style={{
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '20px',
                padding: '8px 20px',
                fontSize: '15px',
                color: '#c4b5fd',
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
