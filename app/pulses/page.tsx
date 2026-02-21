'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Play, Loader2, Zap, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/api'
import type { Flow, Execution } from '@/types'

export default function PulsesPage() {
  const router = useRouter()
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.flows.list().then(setFlows).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <p className="dashboard-label">TRIGGERS</p>
          <h1 className="dashboard-title">Pulses</h1>
          <p className="dashboard-subtitle">Every flow has a unique HTTP endpoint. Send a POST to trigger an execution.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={20} style={{ color: 'var(--color-muted)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : flows.length === 0 ? (
        <div className="dashboard-empty">
          <Zap size={32} style={{ opacity: 0.3 }} />
          <h2 className="dashboard-title" style={{ fontSize: '1rem' }}>No flows yet</h2>
          <p className="dashboard-subtitle">Create a flow in Studio first, then trigger it here.</p>
          <button type="button" onClick={() => router.push('/')} className="dashboard-btn-primary">Go to Studio</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {flows.map(flow => (
            <PulseCard key={flow.id} flow={flow} onOpenStudio={() => router.push(`/studio/${flow.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PulseCard({ flow, onOpenStudio }: { flow: Flow; onOpenStudio: () => void }) {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'
  const slug = flow.slug ?? flow.id
  const [copied, setCopied] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [payload, setPayload] = useState('{\n  \n}')
  const [payloadError, setPayloadError] = useState('')
  const [triggering, setTriggering] = useState(false)
  const [lastResult, setLastResult] = useState<Execution | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  function copy() {
    navigator.clipboard.writeText(`${BASE_URL}/api/pulse/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function trigger() {
    setPayloadError('')
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(payload) } catch { setPayloadError('Invalid JSON'); return }
    setTriggering(true)
    setLastResult(null)
    setLastError(null)
    try {
      const exec = await api.executions.triggerBySlug(slug, parsed)
      setLastResult(exec)
    } catch (err: unknown) {
      setLastError(err instanceof Error ? err.message : 'Trigger failed')
    } finally {
      setTriggering(false)
    }
  }

  const statusColor = (s: string) => s === 'SUCCESS' ? 'var(--color-success)' : s === 'FAILURE' ? 'var(--color-failure)' : 'var(--color-accent)'

  return (
    <div className="dashboard-card" style={{ cursor: 'default', overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={16} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 className="dashboard-card-title" style={{ margin: 0 }}>{flow.name}</h3>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '0.1rem 0.4rem', borderRadius: '9999px', background: flow.status === 'ACTIVE' ? 'rgba(0,230,118,0.12)' : 'rgba(100,116,139,0.15)', color: flow.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-muted)' }}>{flow.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.3rem 0.625rem' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>POST</span>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{BASE_URL}/api/pulse/{slug}</span>
            <button type="button" onClick={copy} className="studio-toolbar-btn" style={{ padding: 2, flexShrink: 0 }} title="Copy URL">{copied ? <Check size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button type="button" onClick={onOpenStudio} className="studio-toolbar-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}><ExternalLink size={12} /> Studio</button>
          <button type="button" onClick={() => setTestOpen(o => !o)} className="dashboard-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}><Play size={12} /> Test {testOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
        </div>
      </div>
      {testOpen && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem', background: 'var(--color-panel)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.4rem' }}>REQUEST BODY (JSON)</label>
              <textarea rows={8} value={payload} spellCheck={false} onChange={e => { setPayload(e.target.value); setPayloadError('') }} className="input-base" style={{ width: '100%', fontFamily: 'var(--font-mono)', resize: 'vertical', borderColor: payloadError ? 'var(--color-failure)' : undefined }} />
              {payloadError && <p style={{ fontSize: '0.75rem', color: 'var(--color-failure)', marginTop: '0.25rem' }}>{payloadError}</p>}
              <button type="button" onClick={trigger} disabled={triggering} className="dashboard-btn-primary" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>{triggering ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />} {triggering ? 'Running…' : 'Send Request'}</button>
            </div>
            <div>
              <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.4rem' }}>RESPONSE</label>
              {lastError ? <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#ff8080', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{lastError}</div> : lastResult ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(lastResult.status) }} />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: statusColor(lastResult.status) }}>{lastResult.status}</span>
                    <span className="dashboard-card-meta" style={{ marginLeft: 'auto', marginTop: 0 }}>ID: {lastResult.id.slice(0, 8)}…</span>
                  </div>
                  <pre style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflow: 'auto', maxHeight: '14rem', margin: 0 }}>{JSON.stringify(lastResult, null, 2)}</pre>
                  <a href={`/transactions/${lastResult.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none' }}>View full execution <ExternalLink size={11} /></a>
                </div>
              ) : <div style={{ height: '8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '0.8rem', border: '1px dashed var(--color-border)', borderRadius: '0.5rem' }}>Response will appear here</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
