'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Loader2, Zap, ArrowRight } from 'lucide-react'
import { api } from '@/api'
import type { ExecutionSummary, ExecStatus } from '@/types'
import { usePagination, PaginationControls } from '@/Pagination'
import { MillennialLoader } from '@/MillennialLoader'

export default function TransactionsPage() {
  const router = useRouter()
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ExecStatus | 'ALL'>('ALL')

  useEffect(() => {
    api.executions.listAll()
      .then(setExecutions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? executions : executions.filter(e => e.status === filter)

  const {
    pageItems: pagedExecutions,
    page,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    setPageSize,
  } = usePagination(filtered, 15)

  const counts = {
    ALL: executions.length,
    SUCCESS: executions.filter(e => e.status === 'SUCCESS').length,
    FAILURE: executions.filter(e => e.status === 'FAILURE').length,
    RUNNING: executions.filter(e => e.status === 'RUNNING').length,
  }

  return (
    <div className="dashboard-page" style={{ maxWidth: '72rem' }}>
      <div className="dashboard-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <p className="dashboard-label">MONITORING</p>
          <h1 className="dashboard-title">Transactions</h1>
          <p className="dashboard-subtitle">Full execution history across all flows</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['ALL', 'SUCCESS', 'FAILURE', 'RUNNING'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={{
              padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '9999px', cursor: 'pointer',
              border: '1px solid',
              borderColor: filter === s ? statusColor(s) : 'var(--color-border)',
              background: filter === s ? `${statusColor(s)}18` : 'transparent',
              color: filter === s ? statusColor(s) : 'var(--color-muted)',
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.15s',
            }}
          >
            {s} <span style={{ opacity: 0.7 }}>({counts[s]})</span>
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-panel)' }}>
          {['Flow', 'Status', 'Triggered', 'Started', 'Duration', ''].map(h => (
            <span key={h} className="dashboard-label" style={{ marginBottom: 0, textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <MillennialLoader label="Loading transactions…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="dashboard-empty" style={{ padding: '3rem' }}>
            <p className="dashboard-subtitle" style={{ marginBottom: 0 }}>No executions found</p>
          </div>
        ) : (
          pagedExecutions.map((ex, i) => (
            <div
              key={ex.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/transactions/${ex.id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/transactions/${ex.id}`) } }}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px',
                padding: '0.875rem 1.25rem',
                cursor: 'pointer',
                alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span className="dashboard-card-title" style={{ margin: 0 }}>{ex.flowName}</span>
                <span className="dashboard-card-meta" style={{ marginTop: 0, fontFamily: 'var(--font-mono)' }}>
                  /api/pulse/{ex.flowSlug}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <StatusIcon status={ex.status} />
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: statusColor(ex.status) }}>{ex.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Zap size={11} style={{ color: 'var(--color-muted)' }} />
                <span className="dashboard-card-meta" style={{ marginTop: 0 }}>{ex.triggeredBy}</span>
              </div>
              <span className="dashboard-card-meta" style={{ marginTop: 0, fontFamily: 'var(--font-mono)' }}>
                {ex.startedAt ? formatTime(ex.startedAt) : '—'}
              </span>
              <span className="dashboard-card-meta" style={{ marginTop: 0, fontFamily: 'var(--font-mono)' }}>
                {ex.durationMs >= 0 ? formatDuration(ex.durationMs) : '…'}
              </span>
              <ArrowRight size={14} style={{ color: 'var(--color-muted)' }} />
            </div>
          ))
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: ExecStatus | 'ALL' }) {
  if (status === 'SUCCESS') return <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
  if (status === 'FAILURE') return <XCircle size={14} style={{ color: 'var(--color-failure)' }} />
  if (status === 'RUNNING') return <Loader2 size={14} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
  return <Clock size={14} style={{ color: 'var(--color-muted)' }} />
}

function statusColor(status: ExecStatus | 'ALL' | string) {
  if (status === 'SUCCESS') return 'var(--color-success)'
  if (status === 'FAILURE') return 'var(--color-failure)'
  if (status === 'RUNNING') return 'var(--color-accent)'
  return 'var(--color-muted)'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
