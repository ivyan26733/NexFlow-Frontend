'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Play, Clock, Zap } from 'lucide-react'
import CardMenu from '@/CardMenu'
import { api } from '../api'
import type { Flow } from '../index'
import { usePagination, PaginationControls } from '../Pagination'
import { MillennialLoader } from '../MillennialLoader'

export default function DashboardPage() {
  const router = useRouter()
  const [flows, setFlows]       = useState<Flow[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')

  useEffect(() => {
    api.flows.list()
      .then(setFlows)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const {
    pageItems: pagedFlows,
    page,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    setPageSize,
  } = usePagination(flows, 9)

  async function createFlow() {
    if (!newName.trim()) return
    const flow = await api.flows.create({ name: newName.trim(), status: 'DRAFT' })
    router.push(`/studio/${flow.id}`)
  }

  async function deleteFlow(flowId: string) {
    if (!confirm('Delete this studio and all its transactions? This cannot be undone.')) return
    await api.flows.delete(flowId)
    setFlows(fs => fs.filter(f => f.id !== flowId))
  }

  return (
    <div className="dashboard-page">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <p className="dashboard-label">WORKSPACE</p>
          <h1 className="dashboard-title">Your Flows</h1>
          <p className="dashboard-subtitle">Build, connect and run your automation workflows</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="dashboard-btn-primary">
          <Plus size={16} />
          New Flow
        </button>
      </div>

      {/* Create modal */}
      {creating && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setCreating(false)}
        >
          <div
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1.5rem', width: '24rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>Create New Flow</h2>
            <input
              autoFocus
              type="text"
              placeholder="Flow name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFlow()}
              className="input-base"
              style={{ marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setCreating(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={createFlow} className="dashboard-btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Flow grid */}
      {loading ? (
        <MillennialLoader label="Loading your studios…" />
      ) : flows.length === 0 ? (
        <EmptyState onNew={() => setCreating(true)} />
      ) : (
        <>
          <div className="dashboard-grid">
            {pagedFlows.map(flow => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onOpenView={() => router.push(`/studio/${flow.id}?mode=view`)}
                onOpenEdit={() => router.push(`/studio/${flow.id}`)}
                onDelete={() => deleteFlow(flow.id)}
              />
            ))}
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  )
}

function FlowCard({ flow, onOpenView, onOpenEdit, onDelete }: {
  flow: Flow
  onOpenView: () => void
  onOpenEdit: () => void
  onDelete: () => void
}) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    DRAFT:    { bg: 'rgba(100,116,139,0.2)', text: 'var(--color-muted)' },
    ACTIVE:   { bg: 'rgba(0,230,118,0.15)', text: 'var(--color-success)' },
    PAUSED:   { bg: 'rgba(255,171,0,0.15)', text: 'var(--color-warning)' },
    ARCHIVED: { bg: 'rgba(255,68,68,0.15)', text: 'var(--color-failure)' },
  }
  const sc = statusColors[flow.status] ?? statusColors.DRAFT

  return (
    <div
      onClick={onOpenEdit}
      className="dashboard-card"
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpenEdit()}
      style={{ position: 'relative' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '0.125rem 0.5rem', borderRadius: '9999px', background: sc.bg, color: sc.text }}>
            {flow.status}
          </span>
          <CardMenu
            items={[
              { label: 'Open in view mode', onClick: onOpenView },
              { label: 'Open in edit mode', onClick: onOpenEdit },
              { label: 'Delete', onClick: onDelete, danger: true },
            ]}
          />
        </div>
      </div>
      <h3 className="dashboard-card-title" style={{ marginBottom: '0.25rem' }}>{flow.name}</h3>
      {flow.description && <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', overflow: 'hidden', marginBottom: '0.75rem', lineHeight: 1.4, maxHeight: '2.8em' }}>{flow.description}</p>}
      <div className="dashboard-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Clock size={11} />
        <span>{new Date(flow.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="dashboard-empty">
      <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        <Play size={24} style={{ color: 'var(--color-muted)' }} />
      </div>
      <h2>No flows yet</h2>
      <p style={{ maxWidth: '20rem' }}>Create your first flow to start building automated workflows</p>
      <button type="button" onClick={onNew} className="dashboard-btn-primary">
        <Plus size={16} /> Create Flow
      </button>
    </div>
  )
}
