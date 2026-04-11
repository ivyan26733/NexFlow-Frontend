'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Timer, TrendingUp,
  Zap, BarChart3, ArrowUpRight, Layers, Flame, ExternalLink,
  ChevronRight, RefreshCw, Sparkles, Signal, Calendar,
} from 'lucide-react'
import { api } from '@/api'
import type { DashboardSummary } from '@/types'
import { MillennialLoader } from '@/MillennialLoader'
import { isLoggedIn } from '@/lib/auth'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HELPERS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function relativeTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown'
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ANIMATED NUMBER                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = display
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (value - start) * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return <>{display}</>
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN DASHBOARD PAGE                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function DashboardLandingPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  /** After first client effect: we know guest vs authenticated (avoids SSR/localStorage mismatch). */
  const [authReady, setAuthReady] = useState(false)
  const [guest, setGuest] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadSummary = useCallback(async (refresh = false) => {
    try {
      const data = await api.dashboard.summary(refresh)
      setSummary(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) {
      setGuest(true)
      setAuthReady(true)
      return
    }
    setAuthReady(true)
    loadSummary(false)
  }, [loadSummary])

  async function handleRefresh() {
    setRefreshing(true)
    await loadSummary(true)
    setTimeout(() => setRefreshing(false), 600)
  }

  /* ── Computed analytics (skeletons: chart, gauge, tables, heatmap; header + KPI shell show immediately) ── */
  const analyticsLoading = refreshing || summary == null
  const successCount = summary?.successCount ?? 0
  const failureCount = summary?.failureCount ?? 0
  const runningCount = summary?.runningCount ?? 0
  const totalRate = summary?.successRate ?? 0
  const latestFlow = summary?.latestFlowId
    ? { id: summary.latestFlowId, name: summary.latestFlowName, updatedAt: summary.latestFlowUpdatedAt }
    : null
  const slowestFlow = summary?.slowestFlowName
    ? { name: summary.slowestFlowName, avgMs: summary.slowestFlowAvgMs ?? 0 }
    : null
  const peakExternal = summary?.peakExternalAt
    ? { at: summary.peakExternalAt, count: summary.peakExternalCount ?? 0 }
    : null
  const dailyPerf = summary?.dailyPerf ?? []
  const hourlyHeat = summary?.hourlyHeat ?? Array.from({ length: 24 }, () => 0)
  const topFlows = summary?.topFlows ?? []
  const recentExecs = summary?.recentExecutions ?? []
  const activityGrid = summary?.activityGrid ?? {}

  /* ── Render ─────────────────────────────────────────────── */

  if (!authReady) {
    return (
      <div className="page-wrapper dash-fullwidth">
        <MillennialLoader label="Loading dashboard…" />
      </div>
    )
  }

  if (guest) {
    return <GuestDashboard />
  }

  return (
    <div className="page-wrapper dash-fullwidth">

      {/* ── Header ── */}
      <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>COMMAND CENTER</p>
          <h1 className="dash-page-title">Dashboard</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
            Monitor your workflows, track performance, and analyze traffic patterns
          </p>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 500,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '0.625rem', color: 'var(--color-muted)', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-muted)' }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── KPI Row (shimmer until summary arrives) ── */}
      <div className="stats-grid-4" style={{ marginBottom: '1.5rem' }}>
        {analyticsLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard icon={<Layers size={16} />} label="Total Flows" value={summary?.totalFlows ?? 0} tone="#9A3412" gradient="linear-gradient(135deg, rgba(154,52,18,0.14), rgba(154,52,18,0.04))" />
            <KpiCard icon={<CheckCircle2 size={16} />} label="Successful" value={successCount} tone="#15803d" gradient="linear-gradient(135deg, rgba(21,128,61,0.14), rgba(20,83,45,0.05))" />
            <KpiCard icon={<AlertTriangle size={16} />} label="Failed" value={failureCount} tone="#b91c1c" gradient="linear-gradient(135deg, rgba(185,28,28,0.12), rgba(127,29,29,0.05))" />
            <KpiCard icon={<Activity size={16} />} label="Running" value={runningCount} tone="#1E3A5F" gradient="linear-gradient(135deg, rgba(30,58,95,0.14), rgba(30,58,95,0.04))" />
          </>
        )}
      </div>

      {/* ── Insight Row ── */}
      <div className="stats-grid-3">
        {analyticsLoading ? (
          <>
            <LoadingCard />
            <LoadingCard />
          </>
        ) : (
          <>
            <InsightGlass
              icon={<Timer size={16} />}
              title="Slowest Flow (avg)"
              value={slowestFlow ? slowestFlow.name : 'No data'}
              sub={slowestFlow ? `${formatDuration(slowestFlow.avgMs)} average runtime` : 'Run flows to compute'}
              accent="#ffab00"
            />
            <InsightGlass
              icon={<Signal size={16} />}
              title="Peak External Traffic"
              value={peakExternal ? peakExternal.at : 'No external hits'}
              sub={peakExternal ? `${peakExternal.count} PULSE hits in that hour` : 'External /api/pulse hits'}
              accent="#1E3A5F"
            />
          </>
        )}
        {analyticsLoading ? (
          <div className="dash-card" style={{ marginBottom: 0 }}>
            <LoadingBlock height={16} width="40%" />
            <div style={{ height: '0.6rem' }} />
            <LoadingBlock height={20} width="65%" />
            <div style={{ height: '0.4rem' }} />
            <LoadingBlock height={12} width="80%" />
          </div>
        ) : (
          <InsightGlass
            icon={<Zap size={16} />}
            title="Last Active Flow"
            value={latestFlow?.name ?? 'No flows yet'}
            sub={latestFlow?.updatedAt ? `Updated ${relativeTime(latestFlow.updatedAt)}` : 'Create a flow to start'}
            accent="#9A3412"
            onClick={latestFlow ? () => router.push(`/studio/${latestFlow.id}`) : undefined}
          />
        )}
      </div>

      {/* ── Success Rate + Chart Row ── */}
      <div className="dash-gauge-chart">

        {/* Success Rate Gauge */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SUCCESS RATE</p>
          {analyticsLoading ? <LoadingBlock height={130} width="130px" /> : <SuccessGauge rate={totalRate} />}
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textAlign: 'center' }}>
            {analyticsLoading ? 'Loading analytics…' : `${successCount + failureCount} completed transactions`}
          </p>
        </div>

        {/* 7-Day Chart */}
        <div className="dash-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={14} style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>7-DAY PERFORMANCE</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <ChartLegend color="#15803d" label="Success" />
              <ChartLegend color="#b91c1c" label="Failure" />
              <ChartLegend color="#1E3A5F" label="Running" />
            </div>
          </div>
          {analyticsLoading ? <LoadingBlock height={160} /> : <BarChart data={dailyPerf} />}
        </div>
      </div>

      {/* ── Bottom Two Columns ── */}
      <div className="dash-two-col">

        {/* Top Flows Table */}
        <div className="dash-card" style={{ overflow: 'hidden', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={14} style={{ color: '#ffab00' }} />
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TOP FLOWS BY EXECUTIONS</span>
            </div>
            <button onClick={() => router.push('/flow')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)' }}>
              View all <ChevronRight size={12} />
            </button>
          </div>

          {analyticsLoading ? (
            <LoadingBlock height={180} />
          ) : topFlows.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No executions yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topFlows.map((f, i) => {
                const totalCompleted = f.success + f.failure
                const rate = totalCompleted > 0 ? Math.round((f.success / totalCompleted) * 100) : 0
                return (
                  <div key={f.id} style={{
                    display: 'grid', gridTemplateColumns: '2rem 1fr auto',
                    alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
                    transition: 'background 0.15s', cursor: 'pointer',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    onClick={() => router.push(`/studio/${f.id}`)}
                  >
                    <span style={{
                      width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                      background: i === 0 ? 'rgba(255,171,0,0.15)' : 'rgba(100,116,139,0.15)',
                      color: i === 0 ? '#ffab00' : 'var(--color-muted)',
                    }}>#{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                        {f.count} runs · {formatDuration(f.avgMs)} avg · {rate}% pass
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <MiniBar success={f.success} failure={f.failure} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="dash-card" style={{ overflow: 'hidden', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={14} style={{ color: '#9A3412' }} />
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>RECENT TRANSACTIONS</span>
            </div>
            <button onClick={() => router.push('/transactions')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)' }}>
              View all <ChevronRight size={12} />
            </button>
          </div>

          {analyticsLoading ? (
            <LoadingBlock height={180} />
          ) : recentExecs.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No transactions yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {recentExecs.map(ex => {
                const colors: Record<string, { dot: string; bg: string }> = {
                  SUCCESS: { dot: '#15803d', bg: 'rgba(21,128,61,0.1)' },
                  FAILURE: { dot: '#b91c1c', bg: 'rgba(185,28,28,0.1)' },
                  RUNNING: { dot: '#1E3A5F', bg: 'rgba(30,58,95,0.1)' },
                }
                const c = colors[ex.status] ?? { dot: '#6B5A45', bg: 'rgba(107,90,69,0.1)' }
                return (
                  <div key={ex.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr auto auto',
                      alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onClick={() => router.push(`/transactions/${ex.id}`)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.flowName}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ex.startedAt ? relativeTime(ex.startedAt) : '—'} · {ex.durationMs >= 0 ? formatDuration(ex.durationMs) : '…'}
                      </p>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.2rem 0.55rem', borderRadius: '999px',
                      background: c.bg, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                      fontWeight: 600, color: c.dot,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                      {ex.status}
                    </span>
                    <ArrowUpRight size={13} style={{ color: 'var(--color-muted)' }} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Traffic Heatmap ── */}
      <div className="dash-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={14} style={{ color: '#1E3A5F' }} />
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>HOURLY TRAFFIC DISTRIBUTION (LAST 7 DAYS)</span>
        </div>
        {analyticsLoading ? <LoadingBlock height={90} /> : (
          <div className="chart-scroll-x">
            <div style={{ minWidth: 480 }}>
              <HourlyHeatmap data={hourlyHeat} />
            </div>
          </div>
        )}
      </div>

      {/* ── Activity Grid ── */}
      <div className="dash-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={14} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ACTIVITY — LAST 365 DAYS
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            flow creates · canvas saves · executions
          </span>
        </div>
        {analyticsLoading ? <LoadingBlock height={120} /> : <ActivityHeatmap data={activityGrid} />}
      </div>

    </div>
  )
}

function LoadingBlock({ height, width = '100%' }: { height: number; width?: string }) {
  return (
    <div
      style={{
        height: `${height}px`,
        width,
        borderRadius: '0.75rem',
        border: '1px solid var(--color-border)',
        background: 'linear-gradient(90deg, rgba(148,163,184,0.08) 25%, rgba(148,163,184,0.18) 50%, rgba(148,163,184,0.08) 75%)',
        backgroundSize: '220% 100%',
        animation: 'shimmer 1.2s infinite linear',
      }}
    />
  )
}

function LoadingCard() {
  return (
    <div className="dash-card" style={{ marginBottom: 0 }}>
      <LoadingBlock height={16} width="45%" />
      <div style={{ height: '0.6rem' }} />
      <LoadingBlock height={20} width="70%" />
      <div style={{ height: '0.4rem' }} />
      <LoadingBlock height={12} width="85%" />
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="kpi-pad" style={{
      background: 'linear-gradient(135deg, rgba(148,163,184,0.06), rgba(148,163,184,0.02))',
      border: '1px solid var(--color-border)',
    }}>
      <LoadingBlock height={14} width="55%" />
      <div style={{ height: '0.75rem' }} />
      <LoadingBlock height={36} width="40%" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  KPI CARD                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function KpiCard({ icon, label, value, tone, gradient }: {
  icon: ReactNode; label: string; value: number; tone: string; gradient: string
}) {
  return (
    <div className="kpi-pad" style={{
      background: gradient, border: '1px solid var(--color-border)',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = tone; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Glow */}
      <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '80px', height: '80px', borderRadius: '50%', background: tone, opacity: 0.06, filter: 'blur(20px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
        <span style={{ color: tone }}>{icon}</span> {label}
      </div>
      <p style={{ fontSize: '2rem', fontWeight: 700, color: tone, lineHeight: 1 }}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  INSIGHT GLASS CARD                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function InsightGlass({ icon, title, value, sub, accent, onClick }: {
  icon: ReactNode; title: string; value: string; sub: string; accent: string; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="dash-card"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, transform 0.15s',
        position: 'relative', overflow: 'hidden', marginBottom: 0,
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-2px)' } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '60px', height: '60px', borderRadius: '50%', background: accent, opacity: 0.06, filter: 'blur(16px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.04em' }}>{title}</span>
        {onClick && <ExternalLink size={11} style={{ color: 'var(--color-muted)', marginLeft: 'auto' }} />}
      </div>
      <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem', wordBreak: 'break-word', lineHeight: 1.3 }}>{value}</p>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>{sub}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUCCESS GAUGE (SVG ring)                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function SuccessGauge({ rate }: { rate: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (rate / 100) * circumference
  const color = rate >= 80 ? '#15803d' : rate >= 50 ? '#ffab00' : '#b91c1c'

  return (
    <div style={{ position: 'relative', width: '130px', height: '130px' }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle
          cx="65" cy="65" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1 }}>{rate}%</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>pass rate</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  BAR CHART (7-day)                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

function BarChart({ data }: { data: Array<{ day: string; label: string; success: number; failure: number; running: number }> }) {
  const maxVal = Math.max(1, ...data.map(d => d.success + d.failure + d.running))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem', alignItems: 'end' }}>
      {data.map(d => {
        const total = d.success + d.failure + d.running
        const barH = 110
        const hS = (d.success / maxVal) * barH
        const hF = (d.failure / maxVal) * barH
        const hR = (d.running / maxVal) * barH
        return (
          <div key={d.day} style={{ textAlign: 'center' }}>
            <div style={{ height: `${barH + 2}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '2px', marginBottom: '0.5rem' }}>
              {hS > 0 && <div style={{ height: `${hS}px`, background: 'linear-gradient(180deg, rgba(21,128,61,0.92), rgba(20,83,45,0.65))', borderRadius: '4px 4px 1px 1px', transition: 'height 0.6s ease-out' }} />}
              {hF > 0 && <div style={{ height: `${hF}px`, background: 'linear-gradient(180deg, rgba(185,28,28,0.9), rgba(127,29,29,0.65))', borderRadius: '2px', transition: 'height 0.6s ease-out' }} />}
              {hR > 0 && <div style={{ height: `${hR}px`, background: 'linear-gradient(180deg, rgba(30,58,95,0.9), rgba(30,58,95,0.55))', borderRadius: '1px 1px 4px 4px', transition: 'height 0.6s ease-out' }} />}
              {total === 0 && <div style={{ height: '2px', background: 'var(--color-border)', borderRadius: '1px', marginTop: 'auto' }} />}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{d.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text)', fontWeight: 600 }}>{total || '–'}</div>
          </div>
        )
      })}
    </div>
  )
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <span style={{ width: 8, height: 8, borderRadius: '2px', background: color, display: 'block' }} />
      <span style={{ fontSize: '0.68rem', color: 'var(--color-muted)' }}>{label}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MINI BAR (inline success/failure)                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

function MiniBar({ success, failure }: { success: number; failure: number }) {
  const total = success + failure
  if (total === 0) return <div style={{ width: 48, height: 6, borderRadius: 3, background: 'var(--color-border)' }} />
  const pct = (success / total) * 100
  return (
    <div style={{ width: 48, height: 6, borderRadius: 3, background: 'rgba(185,28,28,0.35)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#15803d', transition: 'width 0.4s ease-out' }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HOURLY HEATMAP                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function HourlyHeatmap({ data }: { data: number[] }) {
  const max = Math.max(1, ...data)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '3px', alignItems: 'end' }}>
      {data.map((count, hr) => {
        const intensity = count / max
        const bg = count === 0
          ? 'var(--color-panel)'
          : `rgba(154, 52, 18, ${0.12 + intensity * 0.55})`
        return (
          <div key={hr} style={{ textAlign: 'center' }} title={`${String(hr).padStart(2, '0')}:00 — ${count} hits`}>
            <div style={{
              height: `${Math.max(4, intensity * 48)}px`,
              background: bg,
              borderRadius: '3px 3px 1px 1px',
              transition: 'height 0.5s ease-out, background 0.3s',
              marginBottom: '0.35rem',
            }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
              {hr % 3 === 0 ? `${String(hr).padStart(2, '0')}` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ACTIVITY HEATMAP (GitHub-style)                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type DayCell = { date: string; count: number; inRange: boolean }

function ActivityHeatmap({ data }: { data: Record<string, number> }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)

  // The earliest day we want to mark (363 days ago + today = 364 days total)
  const rangeStart = new Date(today); rangeStart.setDate(rangeStart.getDate() - 363)

  // Align grid to the Sunday of rangeStart's week
  const gridStart = new Date(rangeStart); gridStart.setDate(gridStart.getDate() - gridStart.getDay())

  // Build weeks
  const weeks: DayCell[][] = []
  const cursor = new Date(gridStart)

  while (cursor <= today) {
    const week: DayCell[] = []
    for (let i = 0; i < 7; i++) {
      const dateStr = toYMD(cursor)
      week.push({
        date: dateStr,
        count: data[dateStr] ?? 0,
        inRange: cursor >= rangeStart && cursor <= today,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  // Month labels: emit a label when the month changes within in-range days
  const months: Array<{ label: string; col: number }> = []
  let lastMonth = -1
  weeks.forEach((week, col) => {
    const first = week.find(d => d.inRange)
    if (!first) return
    const d = new Date(first.date)
    if (d.getMonth() !== lastMonth) {
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), col })
      lastMonth = d.getMonth()
    }
  })

  const getColor = (count: number, inRange: boolean): string => {
    if (!inRange) return 'transparent'
    if (count === 0) return 'rgba(148,163,184,0.1)'
    if (count <= 2) return 'rgba(34,197,94,0.28)'
    if (count <= 5) return 'rgba(34,197,94,0.52)'
    if (count <= 9) return 'rgba(34,197,94,0.76)'
    return '#22c55e'
  }

  const COL_GAP = 3  // px gap between week columns
  const ROW_GAP = 3  // px gap between day rows
  const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  const totalActivity = Object.values(data).reduce((a, b) => a + b, 0)
  const activeDays = Object.values(data).filter(v => v > 0).length

  // Min px width so cells never go below ~10px; scrolls on small screens
  const MIN_GRID_WIDTH = weeks.length * (10 + COL_GAP) + 30

  return (
    <div style={{ width: '100%' }}>
      {/* Stats line */}
      <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{totalActivity}</span> total activities across{' '}
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{activeDays}</span> active days in the last year
      </p>

      {/* Scrollable on small screens; stretches on large screens */}
      <div className="chart-scroll-x">
        <div style={{ minWidth: MIN_GRID_WIDTH, width: '100%' }}>

          {/* Month labels — mirror the same flex layout as the week columns below */}
          <div style={{ display: 'flex', marginLeft: 30, gap: COL_GAP, marginBottom: 4, height: 14 }}>
            {weeks.map((week, wi) => {
              const entry = months.find(m => m.col === wi)
              return (
                <div key={wi} style={{
                  flex: 1, minWidth: 0, overflow: 'visible',
                  fontSize: '0.62rem', color: 'var(--color-muted)',
                  fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                }}>
                  {entry?.label ?? ''}
                </div>
              )
            })}
          </div>

          {/* Day-of-week labels + week columns */}
          <div style={{ display: 'flex', gap: COL_GAP, width: '100%' }}>

            {/* Day labels (fixed narrow column) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP, width: 26, flexShrink: 0 }}>
              {DAY_LABELS.map((label, i) => (
                <div key={i} style={{
                  aspectRatio: '1',
                  display: 'flex', alignItems: 'center',
                  fontSize: '0.56rem', color: 'var(--color-muted)',
                  fontFamily: 'var(--font-mono)', userSelect: 'none',
                  lineHeight: 1,
                }}>{label}</div>
              ))}
            </div>

            {/* Week columns — each takes equal share of remaining width */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: ROW_GAP, minWidth: 0 }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={day.inRange ? `${day.date} — ${day.count} ${day.count === 1 ? 'activity' : 'activities'}` : undefined}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 2,
                      background: getColor(day.count, day.inRange),
                      border: day.inRange ? '1px solid rgba(148,163,184,0.08)' : 'none',
                      transition: 'background 0.15s',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', marginRight: 4 }}>Less</span>
        {[0, 2, 4, 7, 11].map((v, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: 2,
            background: getColor(v, true),
            border: '1px solid rgba(148,163,184,0.08)',
          }} />
        ))}
        <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>More</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  GUEST STATE                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function GuestDashboard() {
  return (
    <div className="page-wrapper dash-fullwidth">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '6rem 2rem', textAlign: 'center',
      }}>
        <div style={{
          width: '5rem', height: '5rem', borderRadius: '1.25rem',
          background: 'linear-gradient(135deg,rgba(154,52,18,0.12),rgba(30,58,95,0.12))',
          border: '1px solid rgba(154,52,18,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
        }}>
          <BarChart3 size={28} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.625rem' }}>Flow Analytics Dashboard</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', maxWidth: '26rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Sign in to view your workflow analytics, track execution performance, and monitor real-time traffic patterns.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/signup" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem',
            fontSize: '0.9375rem', color: 'var(--color-on-accent)', textDecoration: 'none',
            background: 'var(--grad-accent)',
            borderRadius: '0.625rem', fontWeight: 600,
          }}>Create free account</a>
          <a href="/login" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem',
            fontSize: '0.9375rem', color: 'var(--color-text)', textDecoration: 'none',
            border: '1px solid var(--color-border)', borderRadius: '0.625rem', fontWeight: 500,
          }}>Sign in</a>
        </div>
      </div>
    </div>
  )
}
