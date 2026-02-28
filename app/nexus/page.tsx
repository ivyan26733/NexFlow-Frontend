'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, Loader2, Link, Key, Globe } from 'lucide-react'
import { api } from '@/api'
import CardMenu from '@/CardMenu'
import type { NexusConnector, AuthType } from '@/types'
import { usePagination, PaginationControls } from '@/Pagination'
import { MillennialLoader } from '@/MillennialLoader'

const AUTH_TYPES: AuthType[] = ['NONE', 'BEARER', 'API_KEY', 'BASIC']

export default function NexusPage() {
  const [connectors, setConnectors] = useState<NexusConnector[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NexusConnector | null>(null)
  const [viewing, setViewing] = useState<NexusConnector | null>(null)

  function reload() {
    setLoading(true)
    api.nexus.list()
      .then(setConnectors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const {
    pageItems: pagedConnectors,
    page,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    setPageSize,
  } = usePagination(connectors, 10)

  async function deleteConnector(id: string) {
    if (!confirm('Delete this connector?')) return
    await api.nexus.delete(id)
    setConnectors(cs => cs.filter(c => c.id !== id))
  }

  function openCreate() { setEditing(null); setViewing(null); setFormOpen(true) }
  function openEdit(c: NexusConnector) { setEditing(c); setViewing(null); setFormOpen(true) }
  function openView(c: NexusConnector) { setViewing(c); setFormOpen(false); setEditing(null) }
  function closeForm() { setFormOpen(false); setEditing(null); setViewing(null) }

  async function onSave(data: Partial<NexusConnector>) {
    if (editing?.id) {
      await api.nexus.update(editing.id, data)
    } else {
      await api.nexus.create(data)
    }
    closeForm()
    reload()
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-label">CONNECTIONS</p>
          <h1 className="dashboard-title">Nexus</h1>
          <p className="dashboard-subtitle">
            Manage reusable API connectors. Use them in HTTP Call (Nexus) nodes or configure a quick URL inline in Studio.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="dashboard-btn-primary">
          <Plus size={16} />
          New Connector
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <MillennialLoader label="Loading connectors…" />
        </div>
      ) : connectors.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pagedConnectors.map(c => (
              <ConnectorCard
                key={c.id}
                connector={c}
                onView={() => openView(c)}
                onEdit={() => openEdit(c)}
                onDelete={() => deleteConnector(c.id!)}
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

      {(formOpen || viewing) && (
        <ConnectorModal
          initial={editing ?? viewing}
          onSave={onSave}
          onClose={closeForm}
          readOnly={!!viewing}
        />
      )}
    </div>
  )
}

function ConnectorCard({ connector, onView, onEdit, onDelete }: {
  connector: NexusConnector
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const authColor = connector.authType === 'NONE' ? 'var(--color-muted)' : 'var(--color-accent)'

  return (
    <div className="dashboard-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Link size={15} style={{ color: 'var(--color-accent)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <h3 className="dashboard-card-title" style={{ margin: 0 }}>{connector.name}</h3>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--color-panel)', color: authColor, border: '1px solid var(--color-border)' }}>
            {connector.authType}
          </span>
        </div>
        {connector.description && (
          <p className="dashboard-card-meta" style={{ marginBottom: '0.25rem' }}>{connector.description}</p>
        )}
        {connector.baseUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={11} style={{ color: 'var(--color-muted)' }} />
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>{connector.baseUrl}</span>
          </div>
        )}
      </div>

      {connector.defaultHeaders && Object.keys(connector.defaultHeaders).length > 0 && (
        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', flexShrink: 0 }}>
          {Object.keys(connector.defaultHeaders).length} header{Object.keys(connector.defaultHeaders).length !== 1 ? 's' : ''}
        </span>
      )}

      <div style={{ flexShrink: 0 }}>
        <CardMenu
          items={[
            { label: 'View', onClick: onView },
            { label: 'Edit', onClick: onEdit },
            { label: 'Delete', onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  )
}

function ConnectorModal({ initial, onSave, onClose, readOnly = false }: {
  initial: NexusConnector | null
  onSave: (data: Partial<NexusConnector>) => Promise<void>
  onClose: () => void
  readOnly?: boolean
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<NexusConnector>>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    baseUrl: initial?.baseUrl ?? '',
    authType: initial?.authType ?? 'NONE',
    defaultHeaders: initial?.defaultHeaders ?? {},
    authConfig: initial?.authConfig ?? {},
  })

  const [headerRows, setHeaderRows] = useState<[string, string][]>(
    Object.entries(initial?.defaultHeaders ?? {})
  )
  const [authRows, setAuthRows] = useState<[string, string][]>(
    Object.entries(initial?.authConfig ?? {})
  )

  function rowsToObj(rows: [string, string][]) {
    return Object.fromEntries(rows.filter(([k]) => k.trim()))
  }

  async function submit() {
    setSaving(true)
    try {
      await onSave({ ...form, defaultHeaders: rowsToObj(headerRows), authConfig: rowsToObj(authRows) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-modal-backdrop" onClick={onClose}>
      <div className="dashboard-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 className="dashboard-title" style={{ fontSize: '1.125rem', margin: 0 }}>{readOnly ? 'View Connector' : initial ? 'Edit Connector' : 'New Connector'}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Name *">
            <input className="input-base" value={form.name ?? ''} placeholder="e.g. Stripe Production" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} readOnly={readOnly} disabled={readOnly} />
          </Field>
          <Field label="Description">
            <input className="input-base" value={form.description ?? ''} placeholder="Optional description" onChange={e => setForm(f => ({ ...f, description: e.target.value }))} readOnly={readOnly} disabled={readOnly} />
          </Field>
          <Field label="Base URL">
            <input className="input-base" value={form.baseUrl ?? ''} placeholder="https://api.example.com" onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} readOnly={readOnly} disabled={readOnly} />
          </Field>
          <Field label="Auth Type">
            <select className="input-base" value={form.authType} onChange={e => setForm(f => ({ ...f, authType: e.target.value as AuthType }))} disabled={readOnly}>
              {AUTH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Default Headers">
            <KVEditor rows={headerRows} onChange={setHeaderRows} keyPlaceholder="Header-Name" valuePlaceholder="value" readOnly={readOnly} />
          </Field>
          {form.authType !== 'NONE' && (
            <Field label={`Auth Config (${form.authType})`}>
              <p className="dashboard-card-meta" style={{ marginBottom: '0.4rem' }}>
                {form.authType === 'BEARER' && 'Add key "token" with your Bearer token value.'}
                {form.authType === 'API_KEY' && 'Add key "key" with your API key value.'}
                {form.authType === 'BASIC' && 'Add keys "username" and "password".'}
              </p>
              <KVEditor rows={authRows} onChange={setAuthRows} keyPlaceholder="key" valuePlaceholder="value" readOnly={readOnly} />
            </Field>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          {readOnly ? (
            <button type="button" onClick={onClose} className="dashboard-btn-primary">Close</button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="studio-toolbar-btn">Cancel</button>
              <button type="button" onClick={submit} disabled={saving || !form.name?.trim()} className="dashboard-btn-primary">
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function KVEditor({ rows, onChange, keyPlaceholder, valuePlaceholder, readOnly = false }: {
  rows: [string, string][]
  onChange: (r: [string, string][]) => void
  keyPlaceholder: string
  valuePlaceholder: string
  readOnly?: boolean
}) {
  function update(i: number, side: 0 | 1, val: string) {
    const next = [...rows] as [string, string][]
    next[i] = [next[i][0], next[i][1]]
    next[i][side] = val
    onChange(next)
  }
  function add() { onChange([...rows, ['', '']]) }
  function remove(i: number) { onChange(rows.filter((_, j) => j !== i)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input className="input-base" value={k} placeholder={keyPlaceholder} onChange={e => update(i, 0, e.target.value)} style={{ flex: 1 }} readOnly={readOnly} disabled={readOnly} />
          <input className="input-base" value={v} placeholder={valuePlaceholder} onChange={e => update(i, 1, e.target.value)} style={{ flex: 2 }} readOnly={readOnly} disabled={readOnly} />
          {!readOnly && (
            <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={add} style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0' }}>
          <Plus size={12} /> Add
        </button>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="dashboard-label" style={{ display: 'block', marginBottom: '0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="dashboard-empty">
      <Key size={32} style={{ opacity: 0.3 }} />
      <h2 className="dashboard-title" style={{ fontSize: '1rem' }}>No connectors yet</h2>
      <p className="dashboard-subtitle">Create a connector to store API credentials and reuse them in your flows.</p>
      <button type="button" onClick={onCreate} className="dashboard-btn-primary">
        Create Connector
      </button>
    </div>
  )
}
