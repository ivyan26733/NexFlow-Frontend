'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '@/api'
import type { ExecutionDetail, NodeLog, NodeStatus } from '@/types'

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [detail,  setDetail]  = useState<ExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.executions.getById(id)
      .then(d => {
        setDetail(d)
        // Auto-expand failed nodes
        const auto: Record<string, boolean> = {}
        if (d.ncoSnapshot?.nodes) {
          Object.entries(d.ncoSnapshot.nodes).forEach(([nId, n]) => {
            if ((n as NodeLog).status === 'FAILURE') auto[nId] = true
          })
        }
        setExpanded(auto)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  function toggle(nodeId: string) {
    setExpanded(prev => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: 'var(--color-muted)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }
  if (!detail) {
    return <div style={{ padding: '2rem', color: 'var(--color-muted)' }}>Execution not found.</div>
  }

  const nodeOrder = detail.ncoSnapshot?.nodeExecutionOrder ?? []
  const nodeLogs: NodeLog[] = detail.ncoSnapshot?.nodes
    ? Object.entries(detail.ncoSnapshot.nodes).map(([, n]) => n as NodeLog)
    : []
  if (nodeOrder.length > 0) {
    nodeLogs.sort((a, b) => {
      const ai = nodeOrder.indexOf(a.nodeId)
      const bi = nodeOrder.indexOf(b.nodeId)
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
    })
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>

      {/* Back + Header */}
      <button onClick={() => router.push('/transactions')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={14} /> Transactions
      </button>

      {/* Summary card */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>EXECUTION</p>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{detail.flowName}</h1>
            <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
              POST /api/pulse/{detail.flowSlug}
            </p>
          </div>
          <StatusBadge status={detail.status} />
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            ['Execution ID', detail.id.slice(0, 8) + '…'],
            ['Started',      detail.startedAt ? formatTime(detail.startedAt) : '—'],
            ['Duration',     detail.durationMs >= 0 ? formatDuration(detail.durationMs) : '…'],
            ['Triggered By', detail.triggeredBy],
          ].map(([label, val]) => (
            <div key={label}>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>{label}</p>
              <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Node logs */}
      <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
        Node Execution Log ({nodeLogs.length})
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {nodeLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.875rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem' }}>
            No node logs in snapshot.
          </div>
        ) : nodeLogs.map(log => (
          <NodeLogCard
            key={log.nodeId}
            log={log}
            isOpen={!!expanded[log.nodeId]}
            onToggle={() => toggle(log.nodeId)}
          />
        ))}
      </div>
    </div>
  )
}

function NodeLogCard({ log, isOpen, onToggle }: { log: NodeLog; isOpen: boolean; onToggle: () => void }) {
  const statusCol = log.status === 'SUCCESS' ? '#00e676' : log.status === 'FAILURE' ? '#ff4444' : '#00d4ff'

  return (
    <div style={{ background: 'var(--color-surface)', border: `1px solid`, borderColor: isOpen ? statusCol + '44' : 'var(--color-border)', borderRadius: '0.75rem', overflow: 'hidden', transition: 'border-color 0.15s' }}>

      {/* Row header — click to expand */}
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <NodeStatusIcon status={log.status} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{log.nodeType}</span>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', marginLeft: '0.75rem' }}>
            {log.nodeId.slice(0, 8)}…
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: statusCol }}>{log.status}</span>
        {isOpen ? <ChevronDown size={14} style={{ color: 'var(--color-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />}
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Error message */}
          {log.errorMessage && (
            <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              <p style={{ fontSize: '0.7rem', color: '#ff4444', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>ERROR</p>
              <p style={{ fontSize: '0.8rem', color: '#ff8080', fontFamily: 'var(--font-mono)' }}>{log.errorMessage}</p>
            </div>
          )}

          {/* Input / Request */}
          {log.input && Object.keys(log.input).length > 0 && (
            <JsonBlock label="INPUT / REQUEST" data={log.input} color="#00d4ff" />
          )}

          {/* Output blocks */}
          {log.output && <JsonBlock label="OUTPUT" data={log.output} color="#00e676" />}
          {log.successOutput && <JsonBlock label="SUCCESS OUTPUT (HTTP RESPONSE)" data={log.successOutput} color="#00e676" />}
          {log.failureOutput && <JsonBlock label="FAILURE OUTPUT (HTTP ERROR)" data={log.failureOutput} color="#ff4444" />}
        </div>
      )}
    </div>
  )
}

function JsonBlock({ label, data, color }: { label: string; data: Record<string, unknown>; color: string }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  function copy() {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color, letterSpacing: '0.1em' }}>{label}</p>
        <button onClick={copy} style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.25rem', padding: '0.1rem 0.4rem', cursor: 'pointer' }}>
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <pre style={{
        background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.5rem',
        padding: '0.75rem 1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
        color: 'var(--color-text)', overflow: 'auto', maxHeight: '20rem',
        lineHeight: 1.6, margin: 0,
      }}>
        {json}
      </pre>
    </div>
  )
}

function NodeStatusIcon({ status }: { status: NodeStatus }) {
  if (status === 'SUCCESS') return <CheckCircle size={16} style={{ color: '#00e676', flexShrink: 0 }} />
  if (status === 'FAILURE') return <XCircle     size={16} style={{ color: '#ff4444', flexShrink: 0 }} />
  if (status === 'RUNNING') return <Loader2     size={16} style={{ color: '#00d4ff', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
  return <Clock size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'SUCCESS' ? '#00e676' : status === 'FAILURE' ? '#ff4444' : '#00d4ff'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.875rem', borderRadius: '9999px', background: color + '18', border: `1px solid ${color}44` }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color }}>{status}</span>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
