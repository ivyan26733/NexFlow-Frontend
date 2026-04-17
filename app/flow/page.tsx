'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Play, Clock, Zap, Search, X, Edit3, Eye, LogIn, User, Archive, CheckCircle2, FilePenLine, Trash2, Download, Upload } from 'lucide-react'
import CardMenu from '@/CardMenu'
import { api } from '@/api'
import type { Flow, FlowStatus } from '@/types'
import { usePagination, PaginationControls } from '@/Pagination'
import { MillennialLoader } from '@/MillennialLoader'
import { isLoggedIn } from '@/lib/auth'
import { useAuthGuard } from '@/components/AuthGuardProvider'

const STATUS_META: Record<string, { color: string; bg: string; dot: string }> = {
  DRAFT:    { color: '#A8927A', bg: 'rgba(168,146,122,0.12)',  dot: '#6B5A45' },
  ACTIVE:   { color: '#15803d', bg: 'rgba(21,128,61,0.1)',    dot: '#15803d' },
  PAUSED:   { color: '#ffab00', bg: 'rgba(255,171,0,0.1)',    dot: '#ffab00' },
  ARCHIVED: { color: '#b91c1c', bg: 'rgba(185,28,28,0.1)',    dot: '#b91c1c' },
}

export default function FlowsPage()  {
  const router = useRouter()
  const { requireAuth } = useAuthGuard()
  const [flows,     setFlows]     = useState<Flow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [guest,     setGuest]     = useState(false)
  const [creating,  setCreating]  = useState(false)
  const [submitting,setSubmitting]= useState(false)
  const [importing, setImporting] = useState(false)
  const [newName,   setNewName]   = useState('')
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ALL')
  const createRef = useRef(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      setGuest(true)
      setLoading(false)
      return
    }
    api.flows.list().then(setFlows).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCreating(false); setNewName('') } }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const visible = statusFilter === 'ALL'
    ? flows.filter(f => f.status !== 'ARCHIVED')
    : flows.filter(f => f.status === statusFilter)
  const filtered = search.trim()
    ? visible.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : visible

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

  async function updateFlowStatus(id: string, status: FlowStatus) {
    const updated = await api.flows.update(id, { status })
    setFlows(fs => fs.map(f => (f.id === id ? { ...f, status: updated.status, updatedAt: updated.updatedAt } : f)))
  }

  async function exportFlow(flow: Flow) {
    try {
      const bundle = await api.flows.export(flow.id)
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${flow.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.nexflow.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
      alert('Failed to export flow.')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const bundle = JSON.parse(text)
      const imported = await api.flows.import(bundle)
      setFlows(fs => [imported, ...fs])
      router.push(`/studio/${imported.id}`)
    } catch (err) {
      console.error('Import failed', err)
      alert('Failed to import flow. Make sure the file is a valid .nexflow.json export.')
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  function handleNewFlow() {
    requireAuth(() => setCreating(true))
  }

  function handleDeleteFlow(id: string) {
    requireAuth(() => deleteFlow(id))
  }

  const stats = {
    total:    flows.length,
    active:   flows.filter(f => f.status === 'ACTIVE').length,
    draft:    flows.filter(f => f.status === 'DRAFT').length,
    archived: flows.filter(f => f.status === 'ARCHIVED').length,
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 2rem' }}>
      <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>WORKSPACE</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>Your Flows</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
            Build, connect and run your automation workflows
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.nexflow.json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button
            onClick={() => requireAuth(() => importInputRef.current?.click())}
            disabled={importing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.625rem 1.125rem', fontSize: '0.9375rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.625rem', cursor: importing ? 'not-allowed' : 'pointer', color: 'var(--color-text)', fontWeight: 500, opacity: importing ? 0.6 : 1 }}
          >
            <Upload size={15} /> {importing ? 'Importing…' : 'Import'}
          </button>
          <button className="btn-primary" onClick={handleNewFlow} style={{ padding: '0.625rem 1.375rem', fontSize: '0.9375rem' }}>
            <Plus size={16} /> New Flow
          </button>
        </div>
      </div>

      <div className="stats-grid-4">
        {[
          { key: 'ALL' as const,      label: 'Total Flows', value: stats.total,    color: '#A8927A' },
          { key: 'ACTIVE' as const,   label: 'Active',      value: stats.active,   color: '#15803d' },
          { key: 'DRAFT' as const,    label: 'Draft',       value: stats.draft,    color: '#6B5A45' },
          { key: 'ARCHIVED' as const, label: 'Archived',    value: stats.archived, color: '#b91c1c' },
        ].map(s => (
          <button key={s.label} type="button" onClick={() => { setStatusFilter(s.key); setPage(1) }} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '0.875rem', padding: '1.25rem 1.5rem',
            textAlign: 'left', cursor: 'pointer',
            boxShadow: statusFilter === s.key ? '0 0 0 1px rgba(154,52,18,0.35) inset' : 'none',
          }}>
            <p style={{ fontSize: '1.875rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>{s.label}</p>
          </button>
        ))}
      </div>

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

      {loading ? (
        <MillennialLoader label="Loading your flows…" />
      ) : guest ? (
        <GuestState />
      ) : flows.length === 0 ? (
        <EmptyState onNew={handleNewFlow} />
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-muted)' }}>
          <Search size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>{statusFilter === 'ARCHIVED' ? 'No archived flows found.' : `No flows match "${search}"`}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {pagedFlows.map(flow => (
              <FlowCard key={flow.id} flow={flow}
                onOpenView={() => router.push(`/studio/${flow.id}?mode=view`)}
                onOpenEdit={() => router.push(`/studio/${flow.id}`)}
                onDelete={() => handleDeleteFlow(flow.id)}
                onSetStatus={(status) => requireAuth(() => updateFlowStatus(flow.id, status))}
                onExport={() => exportFlow(flow)}
              />
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

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

function FlowCard({
  flow, onOpenView, onOpenEdit, onDelete, onSetStatus, onExport,
}: {
  flow: Flow
  onOpenView: () => void
  onOpenEdit: () => void
  onDelete: () => void
  onSetStatus: (status: FlowStatus) => void
  onExport: () => void
}) {
  const sc = STATUS_META[flow.status] ?? STATUS_META.DRAFT
  const isActive = flow.status === 'ACTIVE'
  const updated = new Date(flow.updatedAt)
  const updatedLabel = Number.isNaN(updated.getTime())
    ? 'Unknown'
    : updated.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const createdBy = flow.createdByName?.trim() || 'Unknown'
  const now = new Date()
  const diffDays = Number.isNaN(updated.getTime()) ? null : Math.floor((now.getTime() - updated.getTime()) / 86400000)
  const timeLabel = diffDays == null ? 'Unknown' : diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`

  return (
    <div
      onClick={onOpenEdit} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpenEdit()}
      style={{
        background: isActive ? 'linear-gradient(180deg, rgba(0,230,118,0.05), var(--color-surface))' : 'var(--color-surface)',
        border: isActive ? '1px solid rgba(0,230,118,0.35)' : '1px solid var(--color-border)',
        borderRadius: '1rem', padding: '1.5rem', cursor: 'pointer', position: 'relative',
        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
        display: 'flex', flexDirection: 'column', minHeight: '9rem',
        boxShadow: isActive ? '0 0 18px rgba(0,230,118,0.08)' : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'var(--color-panel)' }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isActive ? 'rgba(0,230,118,0.35)' : 'var(--color-border)'
        e.currentTarget.style.background = isActive ? 'linear-gradient(180deg, rgba(0,230,118,0.05), var(--color-surface))' : 'var(--color-surface)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{
          width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(99,102,241,0.2) 100%)',
          border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={e => e.stopPropagation()}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '0.225rem 0.6rem', borderRadius: '999px', background: sc.bg, color: sc.color }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
            {flow.status}
          </span>
          <CardMenu items={[
            { label: 'View mode',  onClick: onOpenView, icon: <Eye size={14} /> },
            { label: 'Edit mode',  onClick: onOpenEdit, icon: <Edit3 size={14} /> },
            { label: 'Export',     onClick: onExport,   icon: <Download size={14} /> },
            ...(flow.status !== 'ACTIVE' ? [{ label: 'Mark Active', onClick: () => onSetStatus('ACTIVE'), icon: <CheckCircle2 size={14} /> }] : []),
            ...(flow.status !== 'DRAFT' ? [{ label: 'Move to Draft', onClick: () => onSetStatus('DRAFT'), icon: <FilePenLine size={14} /> }] : []),
            ...(flow.status !== 'ARCHIVED'
              ? [{ label: 'Archive', onClick: () => onSetStatus('ARCHIVED'), icon: <Archive size={14} /> }]
              : [{ label: 'Unarchive to Draft', onClick: () => onSetStatus('DRAFT'), icon: <FilePenLine size={14} /> }]),
            { label: 'Delete', onClick: onDelete, danger: true, icon: <Trash2 size={14} /> },
          ]} />
        </div>
      </div>

      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: '0.375rem', flex: 1 }}>
        {flow.name}
      </h3>
      {flow.description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {flow.description}
        </p>
      )}
      <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-muted)', fontSize: '0.775rem' }}>
          <User size={12} /> Created by {createdBy}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-muted)', fontSize: '0.775rem' }}>
          <Clock size={12} /> Last updated {updatedLabel}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-muted)', fontSize: '0.775rem' }}>
          <Clock size={12} /> {timeLabel}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button onClick={onOpenView} title="View" style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center' }}>
            <Eye size={13} />
          </button>
          <button onClick={onOpenEdit} title="Edit" style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center' }}>
            <Edit3 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function GuestState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', textAlign: 'center' }}>
      <div style={{ width: '5rem', height: '5rem', borderRadius: '1.25rem', background: 'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(99,102,241,0.15))', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <Zap size={28} style={{ color: 'var(--color-accent)' }} />
      </div>
      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.625rem' }}>Welcome to NexFlow</h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', maxWidth: '26rem', lineHeight: 1.6, marginBottom: '2rem' }}>
        Build powerful no-code automation workflows with AI, scripts, parallel branches and more. Sign in to create and manage your flows.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/signup" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', fontSize: '0.9375rem', color: 'var(--color-on-accent)', textDecoration: 'none', background: 'var(--grad-accent)', borderRadius: '0.625rem', fontWeight: 600 }}>
          <Plus size={16} /> Create free account
        </a>
        <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', fontSize: '0.9375rem', color: 'var(--color-text)', textDecoration: 'none', border: '1px solid var(--color-border)', borderRadius: '0.625rem', fontWeight: 500 }}>
          <LogIn size={16} /> Sign in
        </a>
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
        <Plus size={16} /> Get started
      </button>
    </div>
  )
}
