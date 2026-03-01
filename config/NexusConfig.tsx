'use client'

import { useState, useEffect } from 'react'
import { Loader2, Database, Globe, RefreshCw, Link2 } from 'lucide-react'
import { api } from '@/api'
import type { NexusConnector, NexusNodeConfig, HttpMethod, QueryType } from './../index'
import { Field } from '../NodeConfigPanel'
import RetryConfig from './RetryConfig'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

const HTTP_METHODS: HttpMethod[]  = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const QUERY_TYPES:  QueryType[]   = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']

type RequestMode = 'inline' | 'connector'

export default function NexusConfig({ config, onChange }: Props) {
  const c = config as Partial<NexusNodeConfig>

  const [connectors,  setConnectors]  = useState<NexusConnector[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [selected,    setSelected]    = useState<NexusConnector | null>(null)

  // Inline = no connectorId, just url/method/headers/body (same page, no redirect)
  const mode: RequestMode = c.connectorId ? 'connector' : 'inline'

  useEffect(() => {
    setError(null)
    api.nexus.list()
      .then(list => {
        setConnectors(list)
        if (c.connectorId) {
          const match = list.find(cn => cn.id === c.connectorId)
          if (match) setSelected(match)
          else setSelected(null)
        } else {
          setSelected(null)
        }
      })
      .catch(err => {
        console.error('Failed to load connectors:', err)
        setError('Failed to load connectors. Check your connection.')
      })
      .finally(() => setLoading(false))
  }, [c.connectorId])

  function setMode(m: RequestMode) {
    if (m === 'inline') {
      onChange({
        ...c,
        connectorId: '', connectorName: '', connectorType: undefined,
        url: c.url ?? '', method: c.method ?? 'GET', headers: c.headers ?? {}, body: c.body ?? {},
      })
      setSelected(null)
    } else {
      onChange({ ...c, url: undefined })
    }
  }

  function pickConnector(connectorId: string) {
    const connector = connectors.find(cn => String(cn.id) === String(connectorId)) ?? null
    setSelected(connector)

    if (!connector) {
      onChange({ ...c, connectorId: '', connectorName: '', connectorType: undefined })
      return
    }

    onChange({
      ...c,
      connectorId:   connector.id!,
      connectorName: connector.name,
      connectorType: connector.connectorType,
      ...(connector.connectorType === 'JDBC'
        ? { path: undefined, method: 'GET', headers: {}, body: {}, query: c.query ?? '', queryType: c.queryType ?? 'SELECT' }
        : { query: undefined, queryType: undefined, path: c.path ?? '', method: c.method ?? 'GET', headers: c.headers ?? {}, body: c.body ?? {} }
      ),
    })
  }

  function set(key: keyof NexusNodeConfig, value: unknown) {
    onChange({ ...c, [key]: value })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--color-failure)' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Mode: Quick request (inline) vs Use connector — all on same page, no redirect */}
      <Field label="REQUEST TYPE">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setMode('inline')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: `1px solid ${mode === 'inline' ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: mode === 'inline' ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-panel)',
              color: mode === 'inline' ? 'var(--color-accent)' : 'var(--color-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Link2 size={12} /> Quick request (URL)
          </button>
          <button
            type="button"
            onClick={() => setMode('connector')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: `1px solid ${mode === 'connector' ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: mode === 'connector' ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-panel)',
              color: mode === 'connector' ? 'var(--color-accent)' : 'var(--color-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Globe size={12} /> Use connector
          </button>
        </div>
        {mode === 'connector' && connectors.length === 0 && (
          <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
            0 connectors found. Create one on the Nexus page first.{' '}
            <a href="/nexus" target="_blank" rel="noopener" style={{ color: 'var(--color-accent)' }}>Open Nexus →</a>
          </p>
        )}
      </Field>

      {mode === 'inline' && (
        <InlineRestFields c={c} set={set} />
      )}

      {mode === 'connector' && (
        <>
      {/* Connector picker */}
      <Field label="CONNECTOR">
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <select
            className="input-base"
            value={c.connectorId ?? ''}
            onChange={e => pickConnector(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">— Select connector —</option>
            {connectors.map(cn => (
              <option key={cn.id ?? cn.name} value={cn.id ?? ''}>
                {cn.name} ({cn.connectorType})
              </option>
            ))}
          </select>
          {/* Reload connectors */}
          <button
            type="button"
            onClick={() => { setLoading(true); api.nexus.list().then(setConnectors).finally(() => setLoading(false)) }}
            title="Refresh connectors"
            style={{ padding: '0 0.5rem', background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '0.375rem', cursor: 'pointer', color: 'var(--color-muted)' }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </Field>

      {/* Connector info badge */}
      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}>
          {selected.connectorType === 'JDBC'
            ? <Database size={13} style={{ color: '#e879f9', flexShrink: 0 }} />
            : <Globe    size={13} style={{ color: '#e879f9', flexShrink: 0 }} />
          }
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e879f9' }}>{selected.name}</p>
            {selected.connectorType === 'REST' && selected.baseUrl && (
              <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.baseUrl}
              </p>
            )}
            {selected.connectorType === 'JDBC' && selected.jdbcUrl && (
              <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.jdbcUrl}
              </p>
            )}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(232,121,249,0.12)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.2)', flexShrink: 0 }}>
            {selected.connectorType}
          </span>
        </div>
      )}

      {/* Mode-specific fields */}
      {selected?.connectorType === 'REST' && (
        <RestFields c={c} set={set} />
      )}

      {selected?.connectorType === 'JDBC' && (
        <JdbcFields c={c} set={set} />
      )}
        </>
      )}

      <RetryConfig config={config} onChange={onChange} />
    </div>
  )
}

// ── Inline HTTP (no connector): URL, method, headers, body — same page as Studio ─────────────────

function InlineRestFields({ c, set }: { c: Partial<NexusNodeConfig>; set: (k: keyof NexusNodeConfig, v: unknown) => void }) {
  const headers = (c.headers ?? {}) as Record<string, string>
  const body    = (c.body ?? {})    as Record<string, string>

  return (
    <>
      <Field label="URL">
        <input
          type="text"
          className="input-base"
          placeholder="https://api.example.com/endpoint"
          value={(c.url as string) ?? ''}
          onChange={e => set('url', e.target.value)}
        />
      </Field>
      <Field label="METHOD">
        <select
          className="input-base"
          value={(c.method as string) ?? 'GET'}
          onChange={e => set('method', e.target.value)}
        >
          {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="HEADERS">
        <KVEditor
          pairs={Object.entries(headers).length ? Object.entries(headers) : [['', '']]}
          onChange={pairs => set('headers', Object.fromEntries(pairs))}
          keyPlaceholder="Key"
          valuePlaceholder="value or {{ref}}"
        />
      </Field>
      {['POST', 'PUT', 'PATCH'].includes((c.method as string) ?? 'GET') && (
        <Field label="BODY">
          <KVEditor
            pairs={Object.entries(body).length ? Object.entries(body) : [['', '']]}
            onChange={pairs => set('body', Object.fromEntries(pairs))}
            keyPlaceholder="field"
            valuePlaceholder="value or {{ref}}"
          />
        </Field>
      )}
    </>
  )
}

// ── REST fields (connector mode) ───────────────────────────────────────────────────────────────

function RestFields({ c, set }: { c: Partial<NexusNodeConfig>; set: (k: keyof NexusNodeConfig, v: unknown) => void }) {
  const headers = (c.headers ?? {}) as Record<string, string>
  const body    = (c.body ?? {})    as Record<string, string>

  return (
    <>
      {/* Method + Path */}
      <Field label="METHOD + PATH">
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <select
            className="input-base"
            value={c.method ?? 'GET'}
            onChange={e => set('method', e.target.value)}
            style={{ width: '6rem', flexShrink: 0 }}
          >
            {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            className="input-base"
            value={c.path ?? ''}
            placeholder="/users/{{variables.userId}}"
            onChange={e => set('path', e.target.value)}
          />
        </div>
        <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
          Base URL comes from the connector. Enter only the path here.
        </p>
      </Field>

      {/* Headers override */}
      <Field label="HEADERS (override)">
        <KVEditor
          pairs={Object.entries(headers).length ? Object.entries(headers) : [['', '']]}
          onChange={pairs => set('headers', Object.fromEntries(pairs))}
          keyPlaceholder="Header-Name"
          valuePlaceholder="value or {{ref}}"
        />
      </Field>

      {/* Body — only for methods that send a body */}
      {['POST', 'PUT', 'PATCH'].includes(c.method ?? 'GET') && (
        <Field label="REQUEST BODY">
          <KVEditor
            pairs={Object.entries(body).length ? Object.entries(body) : [['', '']]}
            onChange={pairs => set('body', Object.fromEntries(pairs))}
            keyPlaceholder="field"
            valuePlaceholder="value or {{ref}}"
          />
        </Field>
      )}
    </>
  )
}

// ── JDBC fields ───────────────────────────────────────────────────────────────

function JdbcFields({ c, set }: { c: Partial<NexusNodeConfig>; set: (k: keyof NexusNodeConfig, v: unknown) => void }) {
  return (
    <>
      <Field label="QUERY TYPE">
        <select
          className="input-base"
          value={c.queryType ?? 'SELECT'}
          onChange={e => set('queryType', e.target.value)}
        >
          {QUERY_TYPES.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </Field>

      <Field label="SQL QUERY">
        <textarea
          rows={6}
          className="input-base"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical', minHeight: '8rem' }}
          value={c.query ?? ''}
          placeholder={`SELECT *\nFROM users\nWHERE id = '{{variables.userId}}'`}
          spellCheck={false}
          onChange={e => set('query', e.target.value)}
        />
        <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
          Use <span className="config-panel-code-inline">{'{{variables.key}}'}</span>, <span className="config-panel-code-inline">{'{{nodes.id.successOutput.body.field}}'}</span>, or <span className="config-panel-code-inline">{'{{nex.userData.field}}'}</span> (if a node saved as &quot;userData&quot;).
        </p>
        <p style={{ fontSize: '0.65rem', color: '#ff8080', marginTop: '0.2rem' }}>
          ⚠ Refs are string-interpolated. Sanitize inputs to prevent SQL injection in production.
        </p>
      </Field>
    </>
  )
}

// ── KV editor ─────────────────────────────────────────────────────────────────

function KVEditor({
  pairs, onChange, keyPlaceholder, valuePlaceholder,
}: {
  pairs: [string, string][]
  onChange: (p: [string, string][]) => void
  keyPlaceholder:   string
  valuePlaceholder: string
}) {
  function update(i: number, side: 0 | 1, val: string) {
    const next = pairs.map((p, j) => j === i ? (side === 0 ? [val, p[1]] : [p[0], val]) as [string, string] : p)
    onChange(next)
  }
  function add()           { onChange([...pairs, ['', '']]) }
  function remove(i: number) { onChange(pairs.filter((_, j) => j !== i)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {pairs.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <input className="input-base" value={k} placeholder={keyPlaceholder}
            onChange={e => update(i, 0, e.target.value)} style={{ flex: 1, fontSize: '0.78rem' }} />
          <input className="input-base" value={v} placeholder={valuePlaceholder}
            onChange={e => update(i, 1, e.target.value)} style={{ flex: 2, fontSize: '0.78rem' }} />
          <button type="button" onClick={() => remove(i)}
            style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}>×</button>
        </div>
      ))}
      <button type="button" onClick={add}
        style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0' }}>
        + Add row
      </button>
    </div>
  )
}
