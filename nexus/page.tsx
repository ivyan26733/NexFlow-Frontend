'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, Loader2, Link, Key, Globe } from 'lucide-react'
import { api } from '@/api'
import type { NexusConnector, AuthType } from '@/types'

const AUTH_TYPES: AuthType[] = ['NONE', 'BEARER', 'API_KEY', 'BASIC']

export default function NexusPage() {
  const [connectors, setConnectors] = useState<NexusConnector[]>([])
  const [loading,    setLoading]    = useState(true)
  const [formOpen,   setFormOpen]   = useState(false)
  const [editing,    setEditing]    = useState<NexusConnector | null>(null)

  function reload() {
    setLoading(true)
    api.nexus.list()
      .then(setConnectors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  async function deleteConnector(id: string) {
    if (!confirm('Delete this connector?')) return
    await api.nexus.delete(id)
    setConnectors(cs => cs.filter(c => c.id !== id))
  }

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(c: NexusConnector) { setEditing(c); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditing(null) }

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
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>CONNECTIONS</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem' }}>Nexus</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            Manage reusable API connectors. Reference them in PULSE nodes instead of re-entering credentials every time.
          </p>
        </div>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'var(--color-accent)', color: '#0a0d14', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={15} /> New Connector
        </button>
      </div>

      {/* Connector list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={20} style={{ color: 'var(--color-muted)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : connectors.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {connectors.map(c => (
            <ConnectorCard
              key={c.id}
              connector={c}
              onEdit={() => openEdit(c)}
              onDelete={() => deleteConnector(c.id!)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit form modal */}
      {formOpen && (
        <ConnectorModal
          initial={editing}
          onSave={onSave}
          onClose={closeForm}
        />
      )}
    </div>
  )
}

function ConnectorCard({ connector, onEdit, onDelete }: {
  connector: NexusConnector
  onEdit: () => void
  onDelete: () => void
}) {
  const authColor = connector.authType === 'NONE' ? 'var(--color-muted)' : '#00d4ff'

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Link size={15} style={{ color: 'var(--color-accent)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{connector.name}</h3>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--color-panel)', color: authColor, border: '1px solid var(--color-border)' }}>
            {connector.authType}
          </span>
        </div>
        {connector.description && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>{connector.description}</p>
        )}
        {connector.baseUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={11} style={{ color: 'var(--color-muted)' }} />
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>{connector.baseUrl}</span>
          </div>
        )}
      </div>

      {/* Header count */}
      {connector.defaultHeaders && Object.keys(connector.defaultHeaders).length > 0 && (
        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', flexShrink: 0 }}>
          {Object.keys(connector.defaultHeaders).length} header{Object.keys(connector.defaultHeaders).length !== 1 ? 's' : ''}
        </span>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button onClick={onEdit}
          style={{ padding: '0.4rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', color: 'var(--color-muted)', cursor: 'pointer' }}
          title="Edit">
          <Edit2 size={13} />
        </button>
        <button onClick={onDelete}
          style={{ padding: '0.4rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', color: 'var(--color-failure)', cursor: 'pointer' }}
          title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function ConnectorModal({ initial, onSave, onClose }: {
  initial:  NexusConnector | null
  onSave:   (data: Partial<NexusConnector>) => Promise<void>
  onClose:  () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<NexusConnector>>({
    name:           initial?.name           ?? '',
    description:    initial?.description    ?? '',
    baseUrl:        initial?.baseUrl        ?? '',
    authType:       initial?.authType       ?? 'NONE',
    defaultHeaders: initial?.defaultHeaders ?? {},
    authConfig:     initial?.authConfig     ?? {},
  })

  // Header key/value rows
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.875rem', width: '36rem', maxHeight: '90vh', overflow: 'auto', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{initial ? 'Edit Connector' : 'New Connector'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Name + Description */}
          <Field label="Name *">
            <input className="input-base" value={form.name ?? ''} placeholder="e.g. Stripe Production" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Description">
            <input className="input-base" value={form.description ?? ''} placeholder="Optional description" onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Base URL">
            <input className="input-base" value={form.baseUrl ?? ''} placeholder="https://api.example.com" onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} />
          </Field>

          {/* Auth type */}
          <Field label="Auth Type">
            <select className="input-base" value={form.authType} onChange={e => setForm(f => ({ ...f, authType: e.target.value as AuthType }))}>
              {AUTH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          {/* Default headers */}
          <Field label="Default Headers">
            <KVEditor rows={headerRows} onChange={setHeaderRows} keyPlaceholder="Header-Name" valuePlaceholder="value" />
          </Field>

          {/* Auth config */}
          {form.authType !== 'NONE' && (
            <Field label={`Auth Config (${form.authType})`}>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
                {form.authType === 'BEARER'  && 'Add key "token" with your Bearer token value.'}
                {form.authType === 'API_KEY' && 'Add key "key" with your API key value.'}
                {form.authType === 'BASIC'   && 'Add keys "username" and "password".'}
              </p>
              <KVEditor rows={authRows} onChange={setAuthRows} keyPlaceholder="key" valuePlaceholder="value" />
            </Field>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={saving || !form.name?.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: '#0a0d14', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', opacity: (!form.name?.trim() || saving) ? 0.5 : 1 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function KVEditor({ rows, onChange, keyPlaceholder, valuePlaceholder }: {
  rows: [string, string][]
  onChange: (r: [string, string][]) => void
  keyPlaceholder: string
  valuePlaceholder: string
}) {
  function update(i: number, side: 0 | 1, val: string) {
    const next = [...rows] as [string, string][]
    next[i] = [i === 0 && side === 0 ? val : next[i][0], i === 0 && side === 1 ? val : next[i][1]] as [string, string]
    next[i][side] = val
    onChange(next)
  }
  function add()          { onChange([...rows, ['', '']]) }
  function remove(i: number) { onChange(rows.filter((_, j) => j !== i)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input className="input-base" value={k} placeholder={keyPlaceholder} onChange={e => update(i, 0, e.target.value)} style={{ flex: 1 }} />
          <input className="input-base" value={v} placeholder={valuePlaceholder} onChange={e => update(i, 1, e.target.value)} style={{ flex: 2 }} />
          <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 2 }}>
            <X size={13} />
          </button>
        </div>
      ))}
      <button onClick={add} style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0' }}>
        <Plus size={12} /> Add
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-muted)' }}>
      <Key size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No connectors yet</h2>
      <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Create a connector to store API credentials and reuse them in your flows.</p>
      <button onClick={onCreate} style={{ padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: '#0a0d14', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
        Create Connector
      </button>
    </div>
  )
}
