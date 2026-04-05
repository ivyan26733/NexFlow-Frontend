'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Zap, Search } from 'lucide-react'
import { TEMPLATES, type Template, type TemplateCategory } from '@/lib/templates'
import { api } from '@/api'
import { isLoggedIn } from '@/lib/auth'
import { useAuthGuard } from '@/components/AuthGuardProvider'
import { MillennialLoader } from '@/MillennialLoader'

// ─── Create flow from template ───────────────────────────────────────────────

async function createFlowFromTemplate(template: Template, flowName: string): Promise<string> {
  const flow = await api.flows.create({ name: flowName.trim(), status: 'DRAFT' })

  // Remap template-local node IDs → real UUIDs
  const idMap: Record<string, string> = {}
  template.canvas.nodes.forEach(node => {
    idMap[node.id] = crypto.randomUUID()
  })

  const remappedNodes = template.canvas.nodes.map(node => ({
    ...node,
    id:     idMap[node.id],
    flowId: flow.id,
    // Remap branchNodeIds inside FORK config
    config: node.nodeType === 'FORK' && node.config.branchNodeIds
      ? {
          ...node.config,
          branchNodeIds: Object.fromEntries(
            Object.entries(node.config.branchNodeIds as Record<string, string[]>).map(
              ([branch, ids]) => [branch, ids.map((id: string) => idMap[id] ?? id)]
            )
          ),
        }
      : node.config,
  }))

  const remappedEdges = template.canvas.edges.map(edge => ({
    ...edge,
    id:           crypto.randomUUID(),
    flowId:       flow.id,
    sourceNodeId: idMap[edge.sourceNodeId] ?? edge.sourceNodeId,
    targetNodeId: idMap[edge.targetNodeId] ?? edge.targetNodeId,
  }))

  await api.canvas.save(flow.id, { nodes: remappedNodes, edges: remappedEdges })
  return flow.id
}

// ─── Node type pill ──────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  START: '#64748b', SUCCESS: '#10B981', FAILURE: '#ef4444',
  AI: '#6366F1', SCRIPT: '#F59E0B', NEXUS: '#00D4FF',
  FORK: '#F59E0B', JOIN: '#10B981', DECISION: '#EC4899',
  VARIABLE: '#94a3b8', MAPPER: '#94a3b8', LOOP: '#F59E0B', SUB_FLOW: '#6366F1',
}

function NodePill({ type }: { type: string }) {
  const color = NODE_COLORS[type] ?? '#64748b'
  return (
    <span style={{
      fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '0.175rem 0.5rem',
      borderRadius: '999px', border: `1px solid ${color}40`,
      background: `${color}15`, color, whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  )
}

// ─── Template Card ───────────────────────────────────────────────────────────

function TemplateCard({ template, onUse }: { template: Template; onUse: (t: Template) => void }) {
  const nodeTypes = [...new Set(template.canvas.nodes.map(n => n.nodeType))]
    .filter(t => t !== 'START' && t !== 'SUCCESS' && t !== 'FAILURE')

  return (
    <div
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column',
        gap: '1rem', transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = template.color; e.currentTarget.style.background = 'var(--color-panel)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{
          width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
          background: `linear-gradient(135deg, ${template.color}25, ${template.color}10)`,
          border: `1px solid ${template.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.125rem', color: template.color,
        }}>
          {template.icon}
        </div>
        <span style={{
          fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '0.2rem 0.6rem',
          borderRadius: '999px', flexShrink: 0,
          background: template.category === 'basic' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
          color: template.category === 'basic' ? '#10B981' : '#6366F1',
          border: `1px solid ${template.category === 'basic' ? '#10B98140' : '#6366F140'}`,
        }}>
          {template.category === 'basic' ? 'BASIC' : 'COMPLEX'}
        </span>
      </div>

      {/* Title + description */}
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem', lineHeight: 1.3 }}>
          {template.name}
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
          {template.description}
        </p>
      </div>

      {/* Use case */}
      <div style={{
        fontSize: '0.75rem', color: 'var(--color-muted)', padding: '0.5rem 0.75rem',
        background: 'var(--color-panel)', borderRadius: '0.5rem', border: '1px solid var(--color-border)',
        lineHeight: 1.5,
      }}>
        <span style={{ color: template.color, fontWeight: 600 }}>Use case: </span>
        {template.useCase}
      </div>

      {/* Node types */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {nodeTypes.map(t => <NodePill key={t} type={t} />)}
        <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', padding: '0.175rem 0.5rem' }}>
          {template.nodeCount} nodes
        </span>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {template.tags.map(tag => (
          <span key={tag} style={{
            fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.25rem',
            background: 'var(--color-panel)', color: 'var(--color-muted)',
            border: '1px solid var(--color-border)',
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => onUse(template)}
        className="btn-primary"
        style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem', marginTop: 'auto' }}
      >
        <Plus size={14} /> Use this template
      </button>
    </div>
  )
}

// ─── Use Template Modal ──────────────────────────────────────────────────────

function UseTemplateModal({
  template,
  onClose,
  onConfirm,
}: {
  template: Template
  onClose: () => void
  onConfirm: (name: string) => Promise<void>
}) {
  const [name,       setName]       = useState(template.name)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  async function handleConfirm() {
    if (!name.trim()) return
    setError('')
    setLoading(true)
    try {
      await onConfirm(name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create flow')
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1.125rem', padding: '2rem', width: '100%', maxWidth: '28rem', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{
              width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
              background: `linear-gradient(135deg, ${template.color}25, ${template.color}10)`,
              border: `1px solid ${template.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.125rem', color: template.color,
            }}>
              {template.icon}
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Use Template</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.125rem 0 0' }}>{template.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          This will create a new flow with all nodes and edges pre-configured from the template. You can edit everything in Studio after.
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-failure)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.825rem', color: 'var(--color-failure)', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.25rem' }}>
          <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Flow name</label>
          <input
            autoFocus type="text" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) handleConfirm() }}
            disabled={loading}
            className="input-base"
            style={{ width: '100%', height: '2.625rem', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: '0.75rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.625rem', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !name.trim()}
            className="btn-primary"
            style={{ flex: 2, padding: '0.75rem', fontSize: '0.875rem' }}
          >
            {loading
              ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <><Plus size={14} /> Create Flow</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; value: TemplateCategory | 'all' }[] = [
  { label: 'All Templates', value: 'all' },
  { label: 'Basic',         value: 'basic' },
  { label: 'Complex',       value: 'complex' },
]

export default function TemplatesPage() {
  const router                                  = useRouter()
  const { requireAuth }                         = useAuthGuard()
  const [filter,  setFilter]                    = useState<TemplateCategory | 'all'>('all')
  const [search,  setSearch]                    = useState('')
  const [selected,setSelected]                  = useState<Template | null>(null)
  const [creating,setCreating]                  = useState(false)

  const filtered = TEMPLATES.filter(t => {
    const matchCat    = filter === 'all' || t.category === filter
    const matchSearch = search.trim() === '' || [t.name, t.description, ...t.tags].some(s =>
      s.toLowerCase().includes(search.trim().toLowerCase())
    )
    return matchCat && matchSearch
  })

  function handleUse(template: Template) {
    requireAuth(() => setSelected(template))
  }

  async function handleConfirm(name: string) {
    setCreating(true)
    const flowId = await createFlowFromTemplate(selected!, name)
    router.push(`/studio/${flowId}`)
  }

  const basicCount   = TEMPLATES.filter(t => t.category === 'basic').length
  const complexCount = TEMPLATES.filter(t => t.category === 'complex').length

  return (
    <div className="page-wrapper" style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>TEMPLATES</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>Flow Templates</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem', maxWidth: '40rem' }}>
          Start from a pre-built template. Choose one, give it a name, and it opens in Studio ready to customize.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Total Templates', value: TEMPLATES.length,  color: '#e2e8f0' },
          { label: 'Basic',           value: basicCount,         color: '#10B981' },
          { label: 'Complex',         value: complexCount,       color: '#6366F1' },
          { label: 'Node Types',      value: 8,                  color: '#00D4FF' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.875rem', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '1.875rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.25rem' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              style={{
                padding: '0.375rem 0.875rem', border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                fontSize: '0.8125rem', fontWeight: 500, transition: 'all 0.15s',
                background: filter === cat.value ? 'var(--color-surface)' : 'none',
                color: filter === cat.value ? 'var(--color-text)' : 'var(--color-muted)',
                boxShadow: filter === cat.value ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: '12rem' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="input-base"
            style={{ paddingLeft: '2.375rem', height: '2.5rem', fontSize: '0.875rem', width: '100%' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {creating ? (
        <MillennialLoader label="Creating your flow…" />
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-muted)' }}>
          <Zap size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No templates match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1.25rem' }}>
          {filtered.map(template => (
            <TemplateCard key={template.id} template={template} onUse={handleUse} />
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && !creating && (
        <UseTemplateModal
          template={selected}
          onClose={() => setSelected(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
