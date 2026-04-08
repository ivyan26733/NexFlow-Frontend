'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Loader2, Zap, ArrowRight, Search, X } from 'lucide-react'
import { api } from '@/api'
import type { ExecutionSummary, ExecutionStats, ExecStatus } from '@/types'
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
  const [stats,      setStats]      = useState<ExecutionStats | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [listMode,   setListMode]   = useState<'recent' | 'full'>('recent')
  const [filter,     setFilter]     = useState<ExecStatus | 'ALL'>('ALL')
  const [search,     setSearch]     = useState('')
  const [isMobile,   setIsMobile]   = useState(false)
  const [discarding, setDiscarding] = useState(false)

  async function loadExecutions(mode: 'recent' | 'full' = listMode) {
    setLoading(true)
    try {
      const [s, data] = await Promise.all([
        api.executions.stats(),
        mode === 'full' ? api.executions.listFullHistory() : api.executions.listRecent(),
      ])
      setStats(s)
      setExecutions(data)
      setListMode(mode)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadExecutions('recent') }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const searchFiltered = useMemo(() => {
    let r = executions
    const t = search.trim().toLowerCase()
    if (t) r = r.filter(e => e.flowName?.toLowerCase().includes(t) || e.flowSlug?.toLowerCase().includes(t))
    return r
  }, [executions, search])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return searchFiltered
    return searchFiltered.filter(e => e.status === filter)
  }, [searchFiltered, filter])

  const { pageItems: paged, page, totalPages, totalItems, pageSize, setPage, setPageSize } = usePagination(filtered, 15)

  const counts = useMemo(() => ({
    ALL:     searchFiltered.length,
    SUCCESS: searchFiltered.filter(e => e.status === 'SUCCESS').length,
    FAILURE: searchFiltered.filter(e => e.status === 'FAILURE').length,
    RUNNING: searchFiltered.filter(e => e.status === 'RUNNING').length,
  }), [searchFiltered])
  const runningCount = stats?.running ?? executions.filter(e => e.status === 'RUNNING').length

  const searchActive = search.trim().length > 0

  return (
    <div className="page-wrapper" style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>MONITORING</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>Transactions</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
          {listMode === 'recent'
            ? 'Showing the rolling 2-day window (served from Redis when available). Load full history for older runs.'
            : 'Full history from the database. Switch back to the recent window anytime.'}{' '}
          Search by flow name to filter the table.
        </p>
      </div>

      {/* ── Stats (always all-time / accessible totals from DB) ── */}
      <div className="stats-grid-4">
        {[
          { label: 'Total',   value: stats?.total ?? 0,    color: '#e2e8f0' },
          { label: 'Success', value: stats?.success ?? 0, color: 'var(--color-success)' },
          { label: 'Failure', value: stats?.failure ?? 0, color: 'var(--color-failure)' },
          { label: 'Running', value: stats?.running ?? 0, color: 'var(--color-accent)'  },
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

      {/* ── History mode + filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {listMode === 'recent' ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => loadExecutions('full')}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              borderRadius: '0.625rem',
              cursor: loading ? 'wait' : 'pointer',
              border: '1px solid var(--color-border)',
              background: 'var(--color-panel)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Load full history
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => loadExecutions('recent')}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              borderRadius: '0.625rem',
              cursor: loading ? 'wait' : 'pointer',
              border: '1px solid var(--color-accent)',
              background: 'rgba(0,212,255,0.08)',
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Show last 2 days (default)
          </button>
        )}
      </div>

      {/* ── Status filters ── */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        {(['ALL', 'SUCCESS', 'FAILURE', 'RUNNING'] as const).map(s => {
          const sm = STATUS_META[s]
          const active = filter === s
          return (
            <button key={s} onClick={() => { setFilter(s); setPage(1) }} style={{
              padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '999px', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontWeight: active ? 700 : 400,
              border: `1px solid ${active ? sm.color : 'var(--color-border)'}`,
              background: active ? sm.bg : 'transparent',
              color: active ? sm.color : 'var(--color-muted)',
              transition: 'all 0.15s',
            }}>
              {s} <span style={{ opacity: 0.75 }}>({counts[s as keyof typeof counts]})</span>
            </button>
          )
        })}
        </div>
        <button
          type="button"
          disabled={discarding || runningCount === 0}
          onClick={async () => {
            if (!confirm(`Discard all running executions? (${runningCount})`)) return
            setDiscarding(true)
            try {
              const res = await api.executions.discardRunning()
              await loadExecutions(listMode)
              alert(res.discarded > 0 ? `Discarded ${res.discarded} running execution(s).` : 'No running executions found.')
            } catch (err) {
              console.error(err)
              alert('Failed to discard running executions.')
            } finally {
              setDiscarding(false)
            }
          }}
          style={{
            padding: '0.45rem 0.9rem',
            fontSize: '0.78rem',
            borderRadius: '0.625rem',
            cursor: discarding || runningCount === 0 ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(239,68,68,0.4)',
            background: discarding || runningCount === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.12)',
            color: discarding || runningCount === 0 ? 'var(--color-muted)' : '#fca5a5',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
          }}
        >
          {discarding ? 'Discarding…' : `Discard Running (${runningCount})`}
        </button>
      </div>

      {/* ── Desktop table ── */}
      {!isMobile && (
        <div className="table-scroll-wrap">
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden', minWidth: '680px' }}>

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
        ) : paged.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              {searchActive
                ? `No executions found for "${search}"`
                : 'No executions yet. Trigger a flow to see transactions here.'}
            </p>
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
        </div>
      )}

      {/* ── Mobile cards ── */}
      {isMobile && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ padding: '2.5rem 1rem', display: 'flex', justifyContent: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.875rem' }}>
              <MillennialLoader label="Loading transactions…" />
            </div>
          ) : paged.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.875rem' }}>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: 0 }}>
                {searchActive
                  ? `No executions found for "${search}"`
                  : 'No executions yet. Trigger a flow to see transactions here.'}
              </p>
            </div>
          ) : (
            paged.map(ex => (
              <MobileExecutionCard key={ex.id} ex={ex} onOpen={() => router.push(`/transactions/${ex.id}`)} />
            ))
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  )
}

function MobileExecutionCard({ ex, onOpen }: { ex: ExecutionSummary; onOpen: () => void }) {
  const sm = STATUS_META[ex.status] ?? STATUS_META.ALL
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: '100%',
        textAlign: 'left',
        color: 'var(--color-text)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '0.875rem',
        padding: '0.9rem',
        display: 'grid',
        gap: '0.55rem',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.flowName}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>/api/pulse/{ex.flowSlug}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.22rem 0.55rem', borderRadius: '999px', background: sm.bg, border: `1px solid ${sm.border}`, fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: sm.color, fontWeight: 700, flexShrink: 0 }}>
          <StatusIcon status={ex.status} size={10} />
          {ex.status}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem 0.75rem', fontSize: '0.74rem' }}>
        <span style={{ color: 'var(--color-muted)' }}>Triggered</span>
        <span style={{ color: 'var(--color-text)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.triggeredBy}</span>
        <span style={{ color: 'var(--color-muted)' }}>Started</span>
        <span style={{ color: 'var(--color-text)', textAlign: 'right', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.startedAt ? formatTime(ex.startedAt) : '—'}</span>
        <span style={{ color: 'var(--color-muted)' }}>Duration</span>
        <span style={{ color: ex.durationMs >= 0 ? 'var(--color-text)' : 'var(--color-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{ex.durationMs >= 0 ? formatDuration(ex.durationMs) : '…'}</span>
      </div>
    </button>
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
