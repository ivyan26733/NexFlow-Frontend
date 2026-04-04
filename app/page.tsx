'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Play, Clock, Zap, Search, X, Edit3, Eye } from 'lucide-react'
import CardMenu from '@/CardMenu'
import { api } from '../api'
import type { Flow } from '../index'
import { usePagination, PaginationControls } from '../Pagination'
import { MillennialLoader } from '../MillennialLoader'

const STATUS_META: Record<string, { color: string; bg: string; dot: string }> = {
  DRAFT:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  dot: '#64748b' },
  ACTIVE:   { color: '#00e676', bg: 'rgba(0,230,118,0.1)',    dot: '#00e676' },
  PAUSED:   { color: '#ffab00', bg: 'rgba(255,171,0,0.1)',    dot: '#ffab00' },
  ARCHIVED: { color: '#ff4444', bg: 'rgba(255,68,68,0.1)',    dot: '#ff4444' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [flows,     setFlows]     = useState<Flow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [submitting,setSubmitting]= useState(false)
  const [newName,   setNewName]   = useState('')
  const [search,    setSearch]    = useState('')
  const createRef = useRef(false)

  useEffect(() => {
    api.flows.list().then(setFlows).catch(console.error).finally(() => setLoading(false))
  }, [])

  // Escape closes modal
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCreating(false); setNewName('') } }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const filtered = search.trim()
    ? flows.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : flows

  const { pageItems: pagedFlows, page, totalPages, totalItems, pageSize, setPage, setPageSize } = usePagination(filtered, 9)

  async function createFlow() {
    if (!newName.trim() || createRef.current) return
    createRef.current = true
    setSubmitting(true)
    try {
      const flow = await api.flows.create({ name: newName.trim(), status: 'DRAFT' })
      router.push(`/studio/${flow.id}`)
    } catch (e) { console.error(e); createRef.current = false; setSubmitting(false) }
  }

  async function deleteFlow(id: string) {
    if (!confirm('Delete this flow and all its transactions? This cannot be undone.')) return
    await api.flows.delete(id)
    setFlows(fs => fs.filter(f => f.id !== id))
  }

  const stats = {
    total:    flows.length,
    active:   flows.filter(f => f.status === 'ACTIVE').length,
    draft:    flows.filter(f => f.status === 'DRAFT').length,
    archived: flows.filter(f => f.status === 'ARCHIVED').length,
  }

  return (
    <div style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>WORKSPACE</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>Your Flows</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
            Build, connect and run your automation workflows
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)} style={{ padding: '0.625rem 1.375rem', fontSize: '0.9375rem' }}>
          <Plus size={16} /> New Flow
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Flows', value: stats.total,    color: '#e2e8f0' },
          { label: 'Active',      value: stats.active,   color: '#00e676' },
          { label: 'Draft',       value: stats.draft,    color: '#64748b' },
          { label: 'Archived',    value: stats.archived, color: '#ff4444' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '0.875rem', padding: '1.25rem 1.5rem',
          }}>
            <p style={{ fontSize: '1.875rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
        <input
          type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search flows…"
          className="input-base"
          style={{ paddingLeft: '2.625rem', paddingRight: search ? '2.5rem' : '1rem', height: '2.875rem', fontSize: '0.9375rem' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <MillennialLoader label="Loading your flows…" />
      ) : flows.length === 0 ? (
        <EmptyState onNew={() => setCreating(true)} />
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-muted)' }}>
          <Search size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No flows match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {pagedFlows.map(flow => (
              <FlowCard key={flow.id} flow={flow}
                onOpenView={() => router.push(`/studio/${flow.id}?mode=view`)}
                onOpenEdit={() => router.push(`/studio/${flow.id}`)}
                onDelete={() => deleteFlow(flow.id)}
              />
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* ── Create modal ── */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
          onClick={() => { setCreating(false); setNewName('') }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1.125rem', padding: '2rem', width: '100%', maxWidth: '26rem', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>New Flow</h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>Give your workflow a descriptive name</p>
              </div>
              <button onClick={() => { setCreating(false); setNewName('') }} style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex' }}><X size={16} /></button>
            </div>
            <input
              autoFocus type="text" placeholder="e.g. User Onboarding, Payment Processor…"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !submitting) createFlow() }}
              disabled={submitting} className="input-base"
              style={{ marginBottom: '1.25rem', height: '2.875rem', fontSize: '0.9375rem' }}
            />
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={() => { setCreating(false); setNewName('') }} disabled={submitting}
                style={{ flex: 1, padding: '0.75rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.625rem', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                Cancel
              </button>
              <button onClick={createFlow} disabled={submitting || !newName.trim()} className="btn-primary" style={{ flex: 2, padding: '0.75rem', fontSize: '0.9rem' }}>
                {submitting ? 'Creating…' : <><Plus size={15} /> Create Flow</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FlowCard({ flow, onOpenView, onOpenEdit, onDelete }: { flow: Flow; onOpenView: () => void; onOpenEdit: () => void; onDelete: () => void }) {
  const sc = STATUS_META[flow.status] ?? STATUS_META.DRAFT
  const updated = new Date(flow.updatedAt)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - updated.getTime()) / 86400000)
  const timeLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`

  return (
    <div
      onClick={onOpenEdit} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpenEdit()}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '1rem', padding: '1.5rem', cursor: 'pointer', position: 'relative',
        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
        display: 'flex', flexDirection: 'column', gap: '0', minHeight: '9rem',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'var(--color-panel)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)' }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{
          width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(99,102,241,0.2) 100%)',
          border: '1px solid rgba(0,212,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={e => e.stopPropagation()}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '0.225rem 0.6rem',
            borderRadius: '999px', background: sc.bg, color: sc.color,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
            {flow.status}
          </span>
          <CardMenu items={[
            { label: 'View mode',  onClick: onOpenView },
            { label: 'Edit mode',  onClick: onOpenEdit },
            { label: 'Delete',     onClick: onDelete, danger: true },
          ]} />
        </div>
      </div>

      {/* Name */}
      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: '0.375rem', flex: 1 }}>
        {flow.name}
      </h3>
      {flow.description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {flow.description}
        </p>
      )}

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-muted)', fontSize: '0.775rem' }}>
          <Clock size={12} /> {timeLabel}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button onClick={onOpenView} title="View" style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}>
            <Eye size={13} />
          </button>
          <button onClick={onOpenEdit} title="Edit" style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}>
            <Edit3 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', textAlign: 'center' }}>
      <div style={{ width: '5rem', height: '5rem', borderRadius: '1.25rem', background: 'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(99,102,241,0.15))', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <Play size={28} style={{ color: 'var(--color-accent)' }} />
      </div>
      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.625rem' }}>No flows yet</h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', maxWidth: '22rem', lineHeight: 1.6, marginBottom: '2rem' }}>
        Create your first flow to start building automated workflows with nodes, scripts, and AI.
      </p>
      <button className="btn-primary" onClick={onNew} style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem' }}>
        <Plus size={16} /> Create your first flow
      </button>
    </div>
  )
}
