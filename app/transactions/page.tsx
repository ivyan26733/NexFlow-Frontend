'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Loader2, Zap, ArrowRight, Search, X, Activity } from 'lucide-react'
import { api } from '@/api'
import type { ExecutionSummary, ExecStatus } from '@/types'
import { usePagination, PaginationControls } from '@/Pagination'
import { MillennialLoader } from '@/MillennialLoader'

const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  SUCCESS: { color: 'var(--color-success)', bg: 'rgba(0,230,118,0.08)',  border: 'rgba(0,230,118,0.2)'  },
  FAILURE: { color: 'var(--color-failure)', bg: 'rgba(255,68,68,0.08)',  border: 'rgba(255,68,68,0.2)'  },
  RUNNING: { color: 'var(--color-accent)',  bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.2)'  },
  ALL:     { color: 'var(--color-muted)',   bg: 'transparent',           border: 'var(--color-border)'  },
}

export default function TransactionsPage() {
  const router = useRouter()
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<ExecStatus | 'ALL'>('ALL')
  const [search,     setSearch]     = useState('')

  useEffect(() => {
    api.executions.listAll().then(setExecutions).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let r = executions
    const t = search.trim().toLowerCase()
    if (t) r = r.filter(e => e.flowName?.toLowerCase().includes(t) || e.flowSlug?.toLowerCase().includes(t))
    if (filter !== 'ALL') r = r.filter(e => e.status === filter)
    return r
  }, [executions, search, filter])

  const { pageItems: paged, page, totalPages, totalItems, pageSize, setPage, setPageSize } = usePagination(filtered, 15)

  const counts = useMemo(() => {
    const t = search.trim().toLowerCase()
    const base = t ? executions.filter(e => e.flowName?.toLowerCase().includes(t)) : executions
    return {
      ALL:     base.length,
      SUCCESS: base.filter(e => e.status === 'SUCCESS').length,
      FAILURE: base.filter(e => e.status === 'FAILURE').length,
      RUNNING: base.filter(e => e.status === 'RUNNING').length,
    }
  }, [executions, search])

  const searchActive = search.trim().length > 0

  return (
    <div style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>MONITORING</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>Transactions</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
          Search by flow name to inspect execution history and trace errors
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total',   value: executions.length,                                  color: '#e2e8f0' },
          { label: 'Success', value: executions.filter(e=>e.status==='SUCCESS').length,  color: 'var(--color-success)' },
          { label: 'Failure', value: executions.filter(e=>e.status==='FAILURE').length,  color: 'var(--color-failure)' },
          { label: 'Running', value: executions.filter(e=>e.status==='RUNNING').length,  color: 'var(--color-accent)'  },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.875rem', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '1.875rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
        <input
          type="text" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by flow name…"
          className="input-base"
          style={{ paddingLeft: '2.75rem', paddingRight: search ? '2.75rem' : '1rem', height: '2.875rem', fontSize: '0.9375rem' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Status filters (only when searching) ── */}
      {searchActive && (
        <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['ALL', 'SUCCESS', 'FAILURE', 'RUNNING'] as const).map(s => {
            const sm = STATUS_META[s]
            const active = filter === s
            return (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '999px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontWeight: active ? 700 : 400,
                border: `1px solid ${active ? sm.color : 'var(--color-border)'}`,
                background: active ? sm.bg : 'transparent',
                color: active ? sm.color : 'var(--color-muted)',
                transition: 'all 0.15s',
              }}>
                {s} <span style={{ opacity: 0.75 }}>({s === 'ALL' ? counts.ALL : counts[s as keyof typeof counts]})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.4fr 1.4fr 0.8fr 44px', padding: '0.875rem 1.75rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-panel)', minWidth: '680px' }}>
          {['Flow', 'Status', 'Triggered', 'Started', 'Duration', ''].map(h => (
            <span key={h} style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center' }}>
            <MillennialLoader label="Loading transactions…" />
          </div>
        ) : !searchActive ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '1.125rem', background: 'var(--color-panel)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Activity size={24} style={{ color: 'var(--color-muted)' }} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Search your transactions</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '0.375rem' }}>
              Enter a flow name above to view its execution history
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-border)', fontFamily: 'var(--font-mono)' }}>
              {executions.length} total execution{executions.length !== 1 ? 's' : ''} across all flows
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>No executions found for &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          paged.map((ex, i) => {
            const sm = STATUS_META[ex.status] ?? STATUS_META.ALL
            return (
              <div
                key={ex.id} role="button" tabIndex={0}
                onClick={() => router.push(`/transactions/${ex.id}`)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/transactions/${ex.id}`) } }}
                style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.4fr 1.4fr 0.8fr 44px',
                  padding: '1.125rem 1.75rem', cursor: 'pointer', alignItems: 'center',
                  borderBottom: i < paged.length - 1 ? '1px solid var(--color-border)' : 'none',
                  transition: 'background 0.1s', minWidth: '680px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {/* Flow */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.flowName}</span>
                  <span style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    /api/pulse/{ex.flowSlug}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.275rem 0.65rem', borderRadius: '999px', background: sm.bg, border: `1px solid ${sm.border}`, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: sm.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <StatusIcon status={ex.status} size={11} />
                    {ex.status}
                  </span>
                </div>

                {/* Triggered */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Zap size={12} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.825rem', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.triggeredBy}</span>
                </div>

                {/* Started */}
                <span style={{ fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                  {ex.startedAt ? formatTime(ex.startedAt) : '—'}
                </span>

                {/* Duration */}
                <span style={{ fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: ex.durationMs >= 0 ? 'var(--color-text)' : 'var(--color-muted)' }}>
                  {ex.durationMs >= 0 ? formatDuration(ex.durationMs) : '…'}
                </span>

                <ArrowRight size={15} style={{ color: 'var(--color-muted)', justifySelf: 'center' }} />
              </div>
            )
          })
        )}
      </div>

      {!loading && searchActive && filtered.length > 0 && (
        <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  )
}

function StatusIcon({ status, size = 14 }: { status: ExecStatus | 'ALL'; size?: number }) {
  if (status === 'SUCCESS') return <CheckCircle size={size} style={{ color: 'var(--color-success)' }} />
  if (status === 'FAILURE') return <XCircle     size={size} style={{ color: 'var(--color-failure)' }} />
  if (status === 'RUNNING') return <Loader2     size={size} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
  return <Clock size={size} style={{ color: 'var(--color-muted)' }} />
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
