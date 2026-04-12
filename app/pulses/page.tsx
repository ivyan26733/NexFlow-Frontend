'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Play, Loader2, Zap, ExternalLink, ChevronDown, ChevronUp, Terminal } from 'lucide-react'
import { api } from '@/api'
import type { Flow, Execution } from '@/types'
import CardMenu from '@/CardMenu'
import { usePagination, PaginationControls } from '@/Pagination'
import { MillennialLoader } from '@/MillennialLoader'

export default function PulsesPage() {
  const router  = useRouter()
  const [flows,   setFlows]   = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.flows.list().then(setFlows).catch(console.error).finally(() => setLoading(false))
  }, [])

  const { pageItems: pagedFlows, page, totalPages, totalItems, pageSize, setPage, setPageSize } = usePagination(flows, 8)

  async function deleteFlow(id: string) {
    if (!confirm('Delete this flow and all its transactions? This cannot be undone.')) return
    await api.flows.delete(id)
    setFlows(fs => fs.filter(f => f.id !== id))
  }

  return (
    <div className="page-wrapper pulses-page" style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* ── Header ── */}
      <div className="pulses-header">
        <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>TRIGGERS</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>Pulses</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
          Every flow has a unique HTTP endpoint. Send a POST request to trigger an execution instantly.
        </p>
      </div>

      {/* ── Info banner ── */}
      <div className="pulse-info-banner" style={{
        background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.18)',
        borderRadius: '0.875rem', padding: '1rem 1.375rem',
        display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '2rem',
      }}>
        <Terminal size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <code style={{ fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
          curl -X POST <span style={{ color: 'var(--color-accent)' }}>https://your-backend/api/pulse/{'<slug>'}</span>{' '}
          -H &quot;Content-Type: application/json&quot; -d &apos;{'{'}  &quot;key&quot;: &quot;value&quot; {'}'}&apos;
        </code>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <MillennialLoader label="Loading pulses…" />
        </div>
      ) : flows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '1.125rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <Zap size={26} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No flows yet</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', maxWidth: '20rem', lineHeight: 1.6 }}>Create a flow in Studio first — its endpoint will appear here.</p>
          <button className="btn-primary" onClick={() => router.push('/')} style={{ padding: '0.625rem 1.375rem' }}>Go to Flows</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pagedFlows.map(flow => (
              <PulseCard key={flow.id} flow={flow}
                onOpenView={() => router.push(`/studio/${flow.id}?mode=view`)}
                onOpenEdit={() => router.push(`/studio/${flow.id}`)}
                onDelete={() => deleteFlow(flow.id)}
              />
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}
    </div>
  )
}

function PulseCard({ flow, onOpenView, onOpenEdit, onDelete }: {
  flow: Flow; onOpenView: () => void; onOpenEdit: () => void; onDelete: () => void
}) {
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'
  const slug = flow.slug ?? flow.id
  const endpoint = `${BASE}/api/pulse/${slug}`

  const [copied,       setCopied]       = useState(false)
  const [testOpen,     setTestOpen]     = useState(false)
  const [payload,      setPayload]      = useState('{\n  \n}')
  const [payloadError, setPayloadError] = useState('')
  const [triggering,   setTriggering]   = useState(false)
  const [lastResult,   setLastResult]   = useState<Execution | null>(null)
  const [lastError,    setLastError]    = useState<string | null>(null)

  function copy() {
    navigator.clipboard.writeText(endpoint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function trigger() {
    setPayloadError('')
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(payload) } catch { setPayloadError('Invalid JSON'); return }
    setTriggering(true); setLastResult(null); setLastError(null)
    try {
      const exec = await api.executions.prepare(slug, parsed)
      await api.executions.start(exec.id, parsed)
      setLastResult(exec)
    } catch (err: unknown) {
      setLastError(err instanceof Error ? err.message : 'Trigger failed')
    } finally { setTriggering(false) }
  }

  const statusMeta: Record<string, { color: string; bg: string }> = {
    SUCCESS: { color: 'var(--color-success)', bg: 'rgba(0,230,118,0.1)' },
    FAILURE: { color: 'var(--color-failure)', bg: 'rgba(255,68,68,0.1)' },
    RUNNING: { color: 'var(--color-accent)',  bg: 'rgba(0,212,255,0.1)' },
  }
  const sm = statusMeta[lastResult?.status ?? ''] ?? { color: 'var(--color-muted)', bg: 'transparent' }

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden', transition: 'border-color 0.15s', ...(testOpen ? { borderColor: 'rgba(0,212,255,0.3)' } : {}) }}>

      {/* ── Summary row ── */}
      <div className="pulse-card-row">
        <div style={{ width: '3rem', height: '3rem', borderRadius: '0.875rem', flexShrink: 0, background: 'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(99,102,241,0.15))', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={18} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{flow.name}</h3>
            <span style={{
              fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '0.2rem 0.5rem',
              borderRadius: '999px',
              background: flow.status === 'ACTIVE' ? 'rgba(0,230,118,0.12)' : 'rgba(100,116,139,0.12)',
              color: flow.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-muted)',
            }}>{flow.status}</span>
          </div>
          {/* Endpoint pill */}
          <div className="pulse-endpoint-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.625rem', padding: '0.5rem 0.875rem' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '0.125rem 0.4rem', borderRadius: '0.25rem', flexShrink: 0 }}>POST</span>
            <span className="pulse-endpoint-url" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{endpoint}</span>
            <button onClick={copy} title="Copy URL" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--color-success)' : 'var(--color-muted)', display: 'flex', padding: '0.125rem', transition: 'color 0.15s', flexShrink: 0 }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="pulse-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
          <div onClick={e => e.stopPropagation()}>
            <CardMenu items={[
              { label: 'View mode', onClick: onOpenView },
              { label: 'Edit mode', onClick: onOpenEdit },
              { label: 'Delete',    onClick: onDelete, danger: true },
            ]} />
          </div>
          <button onClick={() => setTestOpen(o => !o)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}>
            <Play size={13} /> Test
            {testOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── Test panel ── */}
      {testOpen && (
        <div className="pulse-test-panel" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-panel)' }}>
          <div className="two-col-panel" style={{ gap: '1.5rem' }}>

            {/* Request */}
            <div>
              <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
                Request Body (JSON)
              </p>
              <textarea
                rows={9} value={payload} spellCheck={false}
                onChange={e => { setPayload(e.target.value); setPayloadError('') }}
                className="input-base"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem', resize: 'vertical', borderColor: payloadError ? 'var(--color-failure)' : undefined, lineHeight: 1.6 }}
              />
              {payloadError && <p style={{ fontSize: '0.775rem', color: 'var(--color-failure)', marginTop: '0.375rem' }}>{payloadError}</p>}
              <button onClick={trigger} disabled={triggering} className="btn-primary" style={{ marginTop: '0.875rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>
                {triggering ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                {triggering ? 'Running…' : 'Send Request'}
              </button>
            </div>

            {/* Response */}
            <div>
              <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
                Response
              </p>
              {lastError ? (
                <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '0.625rem', padding: '1rem', color: '#ff8080', fontSize: '0.825rem', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                  {lastError}
                </div>
              ) : lastResult ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem', padding: '0.625rem 0.875rem', background: sm.bg, border: `1px solid ${sm.color}30`, borderRadius: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sm.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: sm.color, fontWeight: 600 }}>{lastResult.status}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>ID: {lastResult.id.slice(0, 8)}…</span>
                  </div>
                  <pre style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.625rem', padding: '1rem', fontSize: '0.775rem', fontFamily: 'var(--font-mono)', overflow: 'auto', maxHeight: '13rem', margin: 0, lineHeight: 1.6 }}>
                    {JSON.stringify(lastResult, null, 2)}
                  </pre>
                  <a href={`/transactions/${lastResult.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.625rem', fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                    View full execution <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <div style={{ height: '9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--color-border)', borderRadius: '0.75rem', gap: '0.5rem' }}>
                  <Terminal size={20} style={{ color: 'var(--color-border)' }} />
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.825rem' }}>Response will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
