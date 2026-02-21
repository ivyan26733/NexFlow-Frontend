'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, GitBranch, Zap, RefreshCw, X, Plus } from 'lucide-react'
import { api } from '@/api'
import type { Flow, SubFlowNodeConfig, SubFlowMode } from './../index'
import { Field } from '../NodeConfigPanel'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
  // The current flow's ID — used to prevent self-reference in the list
  currentFlowId?: string
}

export default function SubFlowConfig({ config, onChange, currentFlowId }: Props) {
  const c = config as Partial<SubFlowNodeConfig>

  const [flows,    setFlows]    = useState<Flow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<Flow | null>(null)

  // Payload rows — each is a [key, value] pair, value supports {{}} refs
  const [payloadRows, setPayloadRows] = useState<[string, string][]>(
    Object.entries(c.payload ?? {})
  )

  useEffect(() => {
    loadFlows()
  }, [])

  // When config already has a targetFlowId (loaded from DB), match it in the list
  useEffect(() => {
    if (c.targetFlowId && flows.length > 0 && !selected) {
      const match = flows.find(f => f.id === c.targetFlowId)
      if (match) setSelected(match)
    }
  }, [flows, c.targetFlowId])

  function loadFlows() {
    setLoading(true)
    api.flows.list()
      .then(setFlows)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return flows.filter(f =>
      f.id !== currentFlowId &&                    // can't call yourself
      (f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q))
    )
  }, [flows, search, currentFlowId])

  function pickFlow(flow: Flow) {
    setSelected(flow)
    setSearch('')
    syncConfig({ targetFlowId: flow.id, targetFlowName: flow.name, targetFlowSlug: flow.slug })
  }

  function clearFlow() {
    setSelected(null)
    syncConfig({ targetFlowId: '', targetFlowName: '', targetFlowSlug: '' })
  }

  function setMode(mode: SubFlowMode) {
    syncConfig({ mode })
  }

  function syncConfig(patch: Partial<SubFlowNodeConfig>) {
    const rows = payloadRows.filter(([k]) => k.trim())
    onChange({
      ...c,
      ...patch,
      payload: Object.fromEntries(rows),
    })
  }

  function updatePayloadRows(rows: [string, string][]) {
    setPayloadRows(rows)
    onChange({
      ...c,
      payload: Object.fromEntries(rows.filter(([k]) => k.trim())),
    })
  }

  const mode = (c.mode ?? 'SYNC') as SubFlowMode

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Flow picker ──────────────────────────────────────────────────── */}
      <Field label="TARGET FLOW">
        {selected ? (
          /* Selected state — show the picked flow with a clear button */
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: '0.5rem',
          }}>
            <GitBranch size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>{selected.name}</p>
              <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                /api/pulse/{selected.slug}
              </p>
            </div>
            <button
              onClick={clearFlow}
              title="Change flow"
              style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          /* Search state */
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
              <input
                className="input-base"
                style={{ paddingLeft: '2rem' }}
                placeholder="Search flows by name or slug…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Dropdown results */}
            {(search || !selected) && (
              <div style={{
                marginTop: '0.375rem',
                background: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                maxHeight: '14rem',
                overflowY: 'auto',
              }}>
                {loading ? (
                  <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading flows…
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--color-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                    {search ? 'No flows match your search' : 'No other flows found'}
                  </div>
                ) : (
                  filtered.map(flow => (
                    <button
                      key={flow.id}
                      onClick={() => pickFlow(flow)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                        padding: '0.625rem 0.75rem',
                        background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <GitBranch size={13} style={{ color: '#38bdf8', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {flow.name}
                        </p>
                        <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                          /api/pulse/{flow.slug}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '0.6rem', fontFamily: 'var(--font-mono)', padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: flow.status === 'ACTIVE' ? 'rgba(0,230,118,0.1)' : 'rgba(100,116,139,0.15)',
                        color: flow.status === 'ACTIVE' ? '#00e676' : 'var(--color-muted)',
                        flexShrink: 0,
                      }}>
                        {flow.status}
                      </span>
                    </button>
                  ))
                )}

                {/* Refresh */}
                <button
                  onClick={loadFlows}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.75rem' }}
                >
                  <RefreshCw size={11} /> Refresh list
                </button>
              </div>
            )}
          </div>
        )}
      </Field>

      {/* ── Mode toggle ──────────────────────────────────────────────────── */}
      <Field label="EXECUTION MODE">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <ModeButton
            active={mode === 'SYNC'}
            onClick={() => setMode('SYNC')}
            icon={<GitBranch size={14} />}
            title="Sync"
            description="Wait for result"
            color="#38bdf8"
          />
          <ModeButton
            active={mode === 'ASYNC'}
            onClick={() => setMode('ASYNC')}
            icon={<Zap size={14} />}
            title="Async"
            description="Fire & forget"
            color="#f59e0b"
          />
        </div>

        {/* Mode explanation */}
        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.625rem', background: 'var(--color-panel)', borderRadius: '0.375rem', border: '1px solid var(--color-border)' }}>
          {mode === 'SYNC' ? (
            <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Parent flow <strong style={{ color: 'var(--color-text)' }}>waits</strong> for the child to finish.
              Child result available as{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontSize: '0.65rem' }}>
                {'{{nodes.thisNodeId.successOutput.nco.nodes.*}}'}
              </span>
              . If child fails, this node routes to the <span style={{ color: '#ff4444' }}>failure</span> edge.
            </p>
          ) : (
            <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Child flow is <strong style={{ color: 'var(--color-text)' }}>triggered in background</strong>.
              Parent continues immediately on the <span style={{ color: '#00e676' }}>success</span> edge.
              No child result is available. Good for notifications, logging, side effects.
            </p>
          )}
        </div>
      </Field>

      {/* ── Payload mapping ──────────────────────────────────────────────── */}
      <Field label="PAYLOAD TO CHILD FLOW">
        <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
          Data passed to the child flow's START node. Supports{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontSize: '0.65rem' }}>{'{{refs}}'}</span>.
          Leave empty to send no payload.
        </p>
        <KVEditor
          rows={payloadRows}
          onChange={updatePayloadRows}
          keyPlaceholder="key"
          valuePlaceholder="value or {{nodes.x.successOutput.body.field}}"
        />
      </Field>
    </div>
  )
}

// ── Mode button ───────────────────────────────────────────────────────────────

function ModeButton({ active, onClick, icon, title, description, color }: {
  active: boolean; onClick: () => void
  icon: React.ReactNode; title: string; description: string; color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.625rem 0.75rem',
        background:   active ? `${color}14` : 'var(--color-panel)',
        border:       `1px solid ${active ? color + '50' : 'var(--color-border)'}`,
        borderRadius: '0.5rem',
        cursor:       'pointer',
        transition:   'all 0.15s',
        textAlign:    'left',
      }}
    >
      <span style={{ color: active ? color : 'var(--color-muted)', flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: active ? color : 'var(--color-text)' }}>{title}</p>
        <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>{description}</p>
      </div>
    </button>
  )
}

// ── KV editor ─────────────────────────────────────────────────────────────────

function KVEditor({ rows, onChange, keyPlaceholder, valuePlaceholder }: {
  rows: [string, string][]
  onChange: (r: [string, string][]) => void
  keyPlaceholder:   string
  valuePlaceholder: string
}) {
  function update(i: number, side: 0 | 1, val: string) {
    const next = rows.map((r, j) =>
      j === i ? (side === 0 ? [val, r[1]] : [r[0], val]) as [string, string] : r
    )
    onChange(next)
  }
  function add()             { onChange([...rows, ['', '']]) }
  function remove(i: number) { onChange(rows.filter((_, j) => j !== i)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <input
            className="input-base" value={k} placeholder={keyPlaceholder}
            onChange={e => update(i, 0, e.target.value)}
            style={{ flex: 1, fontSize: '0.78rem' }}
          />
          <input
            className="input-base" value={v} placeholder={valuePlaceholder}
            onChange={e => update(i, 1, e.target.value)}
            style={{ flex: 2, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="button" onClick={() => remove(i)}
            style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button" onClick={add}
        style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0' }}
      >
        <Plus size={11} /> Add field
      </button>
    </div>
  )
}
