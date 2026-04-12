  'use client'

import { useState, useEffect } from 'react'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { api } from '@/api'
import type { NexusConnector as ApiNexusConnector } from '@/index'

  const DRIVERS = [
    { label: 'PostgreSQL', value: 'postgresql', prefix: 'jdbc:postgresql://localhost:5432/mydb' },
    { label: 'MySQL',      value: 'mysql',      prefix: 'jdbc:mysql://localhost:3306/mydb' },
    { label: 'MariaDB',    value: 'mariadb',    prefix: 'jdbc:mariadb://localhost:3306/mydb' },
    { label: 'Oracle',     value: 'oracle',     prefix: 'jdbc:oracle:thin:@localhost:1521:orcl' },
    { label: 'SQL Server', value: 'sqlserver',  prefix: 'jdbc:sqlserver://localhost:1433;databaseName=mydb' },
    { label: 'Other',      value: 'other',      prefix: 'jdbc:' },
  ]

  type KVPair = [string, string]

type NexusConnector = {
  id?: string
  name: string
  description?: string
  connectorType: 'REST' | 'JDBC'
  baseUrl?: string
  authType?: 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC'
  authToken?: string
  apiKeyHeader?: string
  apiKeyValue?: string
  /** Request body template e.g. {{variables.body}} or JSON */
  bodyTemplate?: string
  jdbcUrl?: string
  username?: string
  password?: string
  driver?: string
  ssl?: boolean
  headers?: KVPair[]
  queryParams?: KVPair[]
}

type TestResult = {
  success: boolean
  message: string
  latencyMs?: number
  statusCode?: number
  responseHeaders?: Record<string, string>
  responseBody?: string | null
}

const EMPTY_CONNECTOR: NexusConnector = {
  name: '',
  description: '',
  connectorType: 'REST',
  baseUrl: '',
  authType: 'NONE',
  authToken: '',
  apiKeyHeader: 'X-API-Key',
  apiKeyValue: '',
  bodyTemplate: '',
  jdbcUrl: '',
  username: '',
  password: '',
  driver: 'postgresql',
  ssl: false,
  headers: [],
  queryParams: [],
}

/** Map API connector to local form shape (headers/queryParams as KVPair[], username/password) */
function fromApi(c: ApiNexusConnector & { id?: string }): NexusConnector {
  const headers = c.defaultHeaders ?? (c as unknown as { headers?: Record<string, string> }).headers
  const rawHeaders = typeof headers === 'object' && headers !== null && !Array.isArray(headers) ? headers : {}
  const qp = c.queryParams
  const rawQp = typeof qp === 'object' && qp !== null && !Array.isArray(qp) ? qp : {}
  const auth = c.authConfig ?? {}
  const bodyMap = (c as unknown as { body?: Record<string, string> }).body
  const bodyTemplate = typeof bodyMap === 'object' && bodyMap !== null && bodyMap.body != null
    ? String(bodyMap.body)
    : ''
  return {
    id: c.id,
    name: c.name ?? '',
    description: c.description,
    connectorType: (c.connectorType === 'JDBC' ? 'JDBC' : 'REST') as 'REST' | 'JDBC',
    baseUrl: c.baseUrl,
    authType: (c.authType as NexusConnector['authType']) ?? 'NONE',
    authToken: typeof auth.token === 'string' ? auth.token : '',
    apiKeyHeader: typeof auth.headerName === 'string' ? auth.headerName : 'X-API-Key',
    apiKeyValue: typeof auth.key === 'string' ? auth.key : '',
    bodyTemplate: bodyTemplate || undefined,
    jdbcUrl: c.jdbcUrl,
    username: c.dbUsername,
    password: c.dbPassword,
    driver: (c as unknown as { jdbcDriver?: string }).jdbcDriver,
    headers: Object.entries(rawHeaders as Record<string, string>).length ? (Object.entries(rawHeaders as Record<string, string>) as KVPair[]) : [],
    queryParams: Object.entries(rawQp as Record<string, string>).length ? (Object.entries(rawQp as Record<string, string>) as KVPair[]) : [],
  }
}

/** Map local form to API payload (defaultHeaders, authConfig, dbUsername, dbPassword) */
function toApiPayload(e: NexusConnector): Partial<ApiNexusConnector> {
  const headersObj = Object.fromEntries(e.headers ?? [])
  const queryObj = Object.fromEntries(e.queryParams ?? [])
  const authType = e.authType ?? 'NONE'
  const authConfig: Record<string, string> = {}
  if (authType === 'BEARER' && e.authToken) authConfig.token = e.authToken
  if (authType === 'API_KEY') {
    if (e.apiKeyHeader) authConfig.headerName = e.apiKeyHeader
    if (e.apiKeyValue) authConfig.key = e.apiKeyValue
  }
  if (authType === 'BASIC') {
    if (e.username) authConfig.username = e.username
    if (e.password) authConfig.password = e.password
  }
  const bodyPayload =
    e.bodyTemplate != null && e.bodyTemplate.trim() !== ''
      ? { body: e.bodyTemplate.trim() }
      : undefined
  const baseUrl = normalizeBaseUrl(e.baseUrl)
  return {
    name: e.name,
    description: e.description ?? undefined,
    connectorType: e.connectorType,
    baseUrl: baseUrl ?? undefined,
    authType: authType,
    headers: Object.keys(headersObj).length ? headersObj : undefined,
    body: bodyPayload,
    queryParams: Object.keys(queryObj).length ? queryObj : undefined,
    authConfig: Object.keys(authConfig).length ? authConfig : undefined,
    jdbcUrl: (e.jdbcUrl ?? '').trim() || undefined,
    jdbcDriver: e.driver,
    dbUsername: (e.username ?? '').trim() || undefined,
    dbPassword: (e.password ?? '').trim() || undefined,
  }
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  const v = (value ?? '').trim()
  if (!v) return undefined
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  if (v.startsWith('ttp://')) return 'h' + v
  return 'https://' + v.replace(/^\/+/, '')
}

  // ── KV Editor ─────────────────────────────────────────────────────────────────
  function KVEditor({
    pairs,
    onChange,
    keyPlaceholder = 'Key',
    valuePlaceholder = 'Value',
  }: {
    pairs: KVPair[]
    onChange: (pairs: KVPair[]) => void
    keyPlaceholder?: string
    valuePlaceholder?: string
  }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {pairs.map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', minWidth: 0 }}>
            <input
              value={k}
              placeholder={keyPlaceholder}
              onChange={e => {
                const next: KVPair[] = pairs.map((p, j) => (j === i ? [e.target.value, p[1]] : p))
                onChange(next)
              }}
              style={{ ...inputStyle, flexShrink: 0, width: '140px', minWidth: '100px' }}
            />
            <input
              value={v}
              placeholder={valuePlaceholder}
              onChange={e => {
                const next: KVPair[] = pairs.map((p, j) => (j === i ? [p[0], e.target.value] : p))
                onChange(next)
              }}
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              onClick={() => onChange(pairs.filter((_, j) => j !== i) as KVPair[])}
              style={{
                background: 'none', border: 'none',
                color: 'var(--color-muted)', cursor: 'pointer',
                fontSize: '18px', lineHeight: 1,
                padding: '0 2px', flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#b91c1c'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
            >×</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...pairs, ['', '']] as KVPair[])}
          style={{
            alignSelf: 'flex-start',
            fontSize: '12px',
            color: '#4C1D95',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            letterSpacing: '0.02em',
            opacity: 0.8,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add row
        </button>
      </div>
    )
  }

  // ── Password Field ─────────────────────────────────────────────────────────────
  function PasswordInput({
    value,
    onChange,
    placeholder,
  }: {
    value?: string
    onChange: (v: string) => void
    placeholder?: string
  }) {
    const [show, setShow] = useState(false)
    return (
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: '44px' }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute', right: '10px', top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none',
            color: 'var(--color-muted)', cursor: 'pointer',
            fontSize: '11px', letterSpacing: '0.05em',
            padding: '2px 4px',
          }}
        >
          {show ? 'HIDE' : 'SHOW'}
        </button>
      </div>
    )
  }

  // ── Section Label ──────────────────────────────────────────────────────────────
  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        margin: '32px 0 20px',
      }}>
        <span style={{
          fontSize: '10px', color: '#4C1D95',
          letterSpacing: '0.15em', fontWeight: '600',
          whiteSpace: 'nowrap',
        }}>
          {children}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
      </div>
    )
  }

  // ── Field wrapper ──────────────────────────────────────────────────────────────
  function Field({
    label,
    hint,
    children,
  }: {
    label: string
    hint?: string
    children: React.ReactNode
  }) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px', color: 'var(--color-muted)',
          letterSpacing: '0.08em', marginBottom: '7px',
          fontWeight: '500',
        }}>
          {label}
        </label>
        {children}
        {hint && (
          <p style={{ fontSize: '11px', color: 'var(--color-text)', marginTop: '5px', lineHeight: 1.5 }}>
            {hint}
          </p>
        )}
      </div>
    )
  }

  // ── Toast ──────────────────────────────────────────────────────────────────────
  function Toast({
    message,
    type,
    onClose,
  }: {
    message: string
    type: string
    onClose: () => void
  }) {
    useEffect(() => {
      const t = setTimeout(onClose, 3000)
      return () => clearTimeout(t)
    }, [])
    return (
      <div style={{
        position: 'fixed', bottom: '28px', right: '28px',
        padding: '12px 20px',
        background: type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        borderRadius: '8px',
        color: type === 'success' ? '#15803d' : '#b91c1c',
        fontSize: '13px',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: '10px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.2s ease',
      }}>
        <span>{type === 'success' ? '✓' : '✗'}</span>
        {message}
      </div>
    )
  }

  // ── Delete confirm dialog ──────────────────────────────────────────────────────
  function DeleteDialog({
    name,
    onConfirm,
    onCancel,
  }: {
    name: string
    onConfirm: () => void
    onCancel: () => void
  }) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9998, backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '32px',
          width: '400px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '12px' }}>
            Delete connector?
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            <strong style={{ color: 'var(--color-muted)' }}>{name}</strong> will be permanently deleted.
            Any flow using this connector will fail.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onCancel} style={{ ...btnStyle, background: 'var(--color-panel)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
              Cancel
            </button>
            <button onClick={onConfirm} style={{ ...btnStyle, background: 'rgba(239,68,68,0.15)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.3)' }}>
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN PAGE ──────────────────────────────────────────────────────────────────
  export default function NexusPage() {
    const [connectors,       setConnectors]       = useState<NexusConnector[]>([])
    const [selectedId,       setSelectedId]       = useState<string | null>(null)
    const [editing,          setEditing]          = useState<NexusConnector | null>(null)
    const [isNew,            setIsNew]            = useState(false)
    const [isDirty,          setIsDirty]          = useState(false)
    const [saving,           setSaving]           = useState(false)
    const [testing,          setTesting]          = useState(false)
    const [testResult,       setTestResult]       = useState<TestResult | null>(null)
    const [testMethod,       setTestMethod]       = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('POST')
    const [testBody,         setTestBody]         = useState('')
    const [showDelete,       setShowDelete]       = useState(false)
    const [toast,            setToast]            = useState<{ message: string; type: string } | null>(null)
    const [loading,          setLoading]          = useState(true)
    const [sidebarOpen,      setSidebarOpen]      = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
    const [isMobile,         setIsMobile]         = useState(false)

    // Load connectors on mount
    useEffect(() => {
      loadConnectors()
    }, [])

    // Track viewport for responsive layout
    useEffect(() => {
      if (typeof window === 'undefined') return
      const mq = window.matchMedia('(max-width: 768px)')
      const update = () => setIsMobile(mq.matches)
      update()
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }, [])

    // Collapse sidebar by default on mobile, expand on larger screens
    useEffect(() => {
      if (isMobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }, [isMobile])

    async function loadConnectors() {
      try {
        setLoading(true)
        const list = await api.nexus.list()
        setConnectors(Array.isArray(list) ? list.map(fromApi) : [])
      } catch {
        showToast('Failed to load connectors', 'error')
      } finally {
        setLoading(false)
      }
    }

    function selectConnector(c: NexusConnector) {
      setSelectedId(c.id ?? null)
      setEditing({
        ...EMPTY_CONNECTOR,
        ...c,
        headers:     Array.isArray(c.headers)     ? c.headers     : (Object.entries((c.headers ?? {}) as Record<string, string>) as KVPair[]),
        queryParams: Array.isArray(c.queryParams) ? c.queryParams : (Object.entries((c.queryParams ?? {}) as Record<string, string>) as KVPair[]),
      })
      setIsNew(false)
      setIsDirty(false)
      setTestResult(null)
    }

    function newConnector() {
      setSelectedId(null)
      setEditing({ ...EMPTY_CONNECTOR })
      setIsNew(true)
      setIsDirty(false)
      setTestResult(null)
    }

    function update<K extends keyof NexusConnector>(key: K, value: NexusConnector[K]) {
      setEditing(e => (e ? { ...e, [key]: value } : e))
      setIsDirty(true)
      setTestResult(null)
    }

    async function save() {
      if (!editing) return
      if (!editing.name?.trim()) {
        showToast('Name is required', 'error')
        return
      }
      setSaving(true)
      try {
        const payload = toApiPayload(editing)
        const saved = isNew
          ? await api.nexus.create(payload)
          : await api.nexus.update(selectedId!, payload)

        showToast(isNew ? 'Connector created' : 'Connector saved', 'success')
        await loadConnectors()
        setSelectedId(saved.id ?? null)
        setIsNew(false)
        setIsDirty(false)
      } catch (e: unknown) {
        showToast('Save failed: ' + (e instanceof Error ? e.message : String(e)), 'error')
      } finally {
        setSaving(false)
      }
    }

    async function testConnection() {
      if (!selectedId) { showToast('Save connector first to test', 'error'); return }
      setTesting(true)
      setTestResult(null)
      try {
        const payload: Record<string, unknown> = { method: testMethod }
        if (testBody.trim()) {
          try {
            Object.assign(payload, JSON.parse(testBody.trim()) as Record<string, unknown>)
          } catch {
            showToast('Test body must be valid JSON', 'error')
            setTesting(false)
            return
          }
        }
        const r = await api.nexus.test(selectedId, payload)
        setTestResult(r)
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e)
        setTestResult({ success: false, message: err.includes('404') ? 'Connector not found. Save the connector and try again, or check that the backend is running.' : err })
      } finally {
        setTesting(false)
      }
    }

    async function deleteConnector() {
      setShowDelete(false)
      if (!selectedId) return
      try {
        await api.nexus.delete(selectedId)
        showToast('Connector deleted', 'success')
        setEditing(null)
        setSelectedId(null)
        await loadConnectors()
      } catch {
        showToast('Delete failed', 'error')
      }
    }

    function showToast(message: string, type: string) {
      setToast({ message, type })
    }

    return (
      <div
        className="nexus-page"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 3.5rem)',
          background: 'var(--color-base)',
          color: 'var(--color-text)',
          fontFamily: "'DM Mono', 'Fira Code', monospace",
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>

          {/* Sidebar toggle — always visible when sidebar is closed */}
          {!sidebarOpen && (
            <button
              type="button"
              className="studio-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              title="Show connector list"
            >
              <PanelLeftOpen size={14} />
            </button>
          )}

          {/* ── LEFT PANEL ───────────────────────────────────────────── */}
          <div style={{
            width: isMobile ? 'min(78vw, 280px)' : '300px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            display: sidebarOpen ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--color-panel)',
            position: isMobile ? 'absolute' : 'relative',
            zIndex: isMobile ? 35 : 'auto',
            top: 0,
            bottom: 0,
            left: 0,
          }}>
            {/* Search / count */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              fontSize: '10px', color: 'var(--color-text)',
              letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            }}>
              <span>{loading ? 'LOADING...' : `${connectors.length} CONNECTOR${connectors.length !== 1 ? 'S' : ''}`}</span>
              <button
                type="button"
                className="studio-sidebar-toggle"
                onClick={() => setSidebarOpen(false)}
                title="Collapse connector list"
                style={{ position: 'static', flexShrink: 0 }}
              >
                <PanelLeftClose size={14} />
              </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {loading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text)', fontSize: '12px' }}>
                  Loading...
                </div>
              ) : connectors.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.5, color: 'var(--color-text)' }}>⬡</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>No connectors yet</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '6px' }}>
                    Click + New Connector
                  </div>
                </div>
              ) : (
                connectors.map(c => {
                  const isSelected = selectedId === c.id
                  const isThisDirty = isSelected && isDirty
                  return (
                    <div
                      key={c.id}
                      onClick={() => selectConnector(c)}
                      style={{
                        padding: '14px 20px',
                        cursor: 'pointer',
                        borderLeft: `3px solid ${isSelected ? '#4C1D95' : 'transparent'}`,
                        background: isSelected ? 'rgba(76,29,149,0.05)' : 'transparent',
                        transition: 'all 0.15s',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(76,29,149,0.04)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        {/* Status dot */}
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                          background: isThisDirty ? '#F59E0B' : '#15803d',
                          boxShadow: isThisDirty ? '0 0 6px #F59E0B' : '0 0 6px rgba(21,128,61,0.45)',
                        }} />
                        <span style={{
                          fontSize: '13px', fontWeight: '500',
                          color: isSelected ? 'var(--color-text)' : 'var(--color-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1,
                        }}>
                          {c.name}
                        </span>
                        {/* Type badge */}
                        <span style={{
                          fontSize: '9px', padding: '2px 6px', borderRadius: '3px',
                          background: c.connectorType === 'REST' ? 'rgba(76,29,149,0.08)' : 'rgba(76,29,149,0.08)',
                          color:      c.connectorType === 'REST' ? '#4C1D95'              : '#4C1D95',
                          border:     `1px solid ${c.connectorType === 'REST' ? 'rgba(76,29,149,0.15)' : 'rgba(76,29,149,0.15)'}`,
                          letterSpacing: '0.05em',
                          flexShrink: 0,
                        }}>
                          {c.connectorType}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '11px', color: 'var(--color-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        paddingLeft: '15px',
                      }}>
                        {(c.baseUrl || c.jdbcUrl || 'No URL set').substring(0, 38)}
                        {(c.baseUrl || c.jdbcUrl || '').length > 38 ? '…' : ''}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Bottom new link */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={newConnector}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--color-text)', cursor: 'pointer',
                  fontSize: '12px', letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#4C1D95'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text)'}
              >
                <span style={{ fontSize: '16px' }}>+</span> New connector
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-base)' }}>
            {!editing ? (
              /* Empty state */
              <div style={{
                height: '100%', display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '16px',
              }}>
                <div style={{
                  width: '64px', height: '64px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', opacity: 0.3,
                }}>⬡</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                  Select a connector or create a new one
                </div>
                <button
                  onClick={newConnector}
                  style={{
                    padding: '8px 20px',
                    background: 'rgba(76,29,149,0.08)',
                    border: '1px solid rgba(76,29,149,0.2)',
                    borderRadius: '6px',
                    color: '#4C1D95', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  + New Connector
                </button>
              </div>
            ) : (
              <div style={{ maxWidth: '800px', padding: 'clamp(20px, 4vw, 40px) clamp(16px, 5vw, 48px)', margin: '0 auto' }}>

                {/* Panel header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '36px',
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text)', letterSpacing: '0.15em', marginBottom: '6px' }}>
                      {isNew ? 'NEW CONNECTOR' : 'CONNECTOR DETAIL'}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text)' }}>
                      {editing.name || <span style={{ color: 'var(--color-text)' }}>Untitled</span>}
                    </div>
                  </div>
                  {isDirty && (
                    <span style={{
                      fontSize: '10px', color: '#F59E0B',
                      border: '1px solid rgba(245,158,11,0.3)',
                      padding: '3px 10px', borderRadius: '4px',
                      letterSpacing: '0.1em',
                      background: 'rgba(245,158,11,0.06)',
                    }}>
                      ● UNSAVED
                    </span>
                  )}
                </div>

                {/* ── Basic Info ── */}
                <SectionLabel>BASIC INFO</SectionLabel>

                <Field label="NAME *">
                  <input
                    value={editing.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="e.g. Shopify Production API"
                    style={inputStyle}
                  />
                </Field>

                <Field label="DESCRIPTION" hint="Optional — shown in the connector list and search">
                  <input
                    value={editing.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="What does this connector connect to?"
                    style={inputStyle}
                  />
                </Field>

                {/* ── Connector Type ── */}
                <SectionLabel>CONNECTOR TYPE</SectionLabel>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                  {([
                    {
                      type: 'REST' as const,
                      icon: '🌐',
                      title: 'REST API',
                      desc: 'Call HTTP APIs, webhooks, and web services',
                      color: '#4C1D95',
                    },
                    {
                      type: 'JDBC' as const,
                      icon: '🗄️',
                      title: 'Database',
                      desc: 'Query PostgreSQL, MySQL, and JDBC databases',
                      color: '#4C1D95',
                    },
                  ] as const).map(opt => {
                    const active = editing.connectorType === opt.type
                    return (
                      <div
                        key={opt.type}
                        onClick={() => update('connectorType', opt.type)}
                        style={{
                          padding: '20px',
                          border: `1px solid ${active ? opt.color + '40' : 'var(--color-border)'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: active ? `${opt.color}08` : 'var(--color-panel)',
                          transition: 'all 0.15s',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--color-border)' }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--color-border)' }}
                      >
                        {active && (
                          <div style={{
                            position: 'absolute', top: '12px', right: '12px',
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: opt.color,
                            boxShadow: `0 0 8px ${opt.color}`,
                          }} />
                        )}
                        <div style={{ fontSize: '22px', marginBottom: '10px' }}>{opt.icon}</div>
                        <div style={{
                          fontSize: '14px', fontWeight: '600',
                          color: active ? opt.color : 'var(--color-muted)',
                          marginBottom: '6px',
                        }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text)', lineHeight: 1.6 }}>
                          {opt.desc}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ── REST Fields ── */}
                {editing.connectorType === 'REST' && (
                  <>
                    <SectionLabel>REST CONFIGURATION</SectionLabel>

                    <Field label="BASE URL" hint="Paste full URL with ?params — query params will be auto-filled below.">
                      <input
                        value={editing.baseUrl}
                        onChange={e => update('baseUrl', e.target.value)}
                        onBlur={e => {
                          const raw = e.target.value?.trim()
                          if (!raw) return
                          try {
                            const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
                            if (url.search && url.searchParams.toString()) {
                              const params: KVPair[] = Array.from(url.searchParams.entries()) as KVPair[]
                              update('queryParams', params)
                              const base = url.origin + url.pathname
                              if (base !== raw) update('baseUrl', base.replace(/\/$/, '') || base)
                            }
                          } catch {
                            /* ignore invalid URL */
                          }
                        }}
                        placeholder="https://api.example.com/path?key=value"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="AUTHENTICATION">
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        {(['NONE', 'BEARER', 'API_KEY'] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => update('authType', t)}
                            style={{
                              padding: '6px 14px',
                              fontSize: '11px',
                              letterSpacing: '0.05em',
                              border: `1px solid ${editing.authType === t ? 'rgba(76,29,149,0.4)' : 'var(--color-border)'}`,
                              borderRadius: '5px',
                              background: editing.authType === t ? 'rgba(76,29,149,0.08)' : 'var(--color-panel)',
                              color: editing.authType === t ? '#4C1D95' : 'var(--color-muted)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {t === 'API_KEY' ? 'API Key' : t === 'BEARER' ? 'Bearer Token' : 'None'}
                          </button>
                        ))}
                      </div>

                      {editing.authType === 'BEARER' && (
                        <PasswordInput
                          value={editing.authToken}
                          onChange={(v: any) => update('authToken', v)}
                          placeholder="Bearer token value"
                        />
                      )}

                      {editing.authType === 'API_KEY' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            value={editing.apiKeyHeader}
                            onChange={e => update('apiKeyHeader', e.target.value)}
                            placeholder="Header name, e.g. X-API-Key"
                            style={inputStyle}
                          />
                          <PasswordInput
                            value={editing.apiKeyValue}
                            onChange={(v: any) => update('apiKeyValue', v)}
                            placeholder="API key value"
                          />
                        </div>
                      )}
                    </Field>

                    <Field
                      label="DEFAULT HEADERS"
                      hint="Sent with every request using this connector. Override per-node in Studio."
                    >
                      <KVEditor
                        pairs={editing.headers ?? []}
                        onChange={v => update('headers', v)}
                        keyPlaceholder="Header-Name"
                        valuePlaceholder="value"
                      />
                    </Field>

                    <Field
                      label="BODY TEMPLATE"
                      hint="Default request body. Use {{variables.body}} to pass body from a Variable node (e.g. define 'body' in a Variable, then reference here)."
                    >
                      <textarea
                        value={editing.bodyTemplate ?? ''}
                        onChange={e => update('bodyTemplate', e.target.value)}
                        placeholder='e.g. {{variables.body}} or {"username":"{{variables.user}}","password":"{{variables.pass}}"}'
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                      />
                    </Field>

                    <Field
                      label="DEFAULT QUERY PARAMS"
                      hint="Appended to every request URL."
                    >
                      <KVEditor
                        pairs={editing.queryParams ?? []}
                        onChange={v => update('queryParams', v)}
                        keyPlaceholder="param"
                        valuePlaceholder="value"
                      />
                    </Field>
                  </>
                )}

                {/* ── JDBC Fields ── */}
                {editing.connectorType === 'JDBC' && (
                  <>
                    <SectionLabel>DATABASE CONFIGURATION</SectionLabel>

                    <div style={{
                      marginBottom: '20px',
                      padding: '12px 14px',
                      background: 'rgba(76,29,149,0.06)',
                      border: '1px solid rgba(76,29,149,0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--color-muted)',
                      lineHeight: 1.55,
                    }}>
                      <strong style={{ color: 'var(--color-text)' }}>How to use DB connectors</strong>
                      <br />
                      This section only defines the <em>connection</em> (URL and credentials). To run SQL, add a <strong>Nexus</strong> node in a flow (Studio), choose this connector, then enter your <strong>SQL query</strong> and query type (SELECT / INSERT / UPDATE / DELETE) in the node config.
                    </div>

                    <Field label="DATABASE DRIVER">
                      <select
                        value={editing.driver}
                        onChange={e => {
                          const d = DRIVERS.find(dr => dr.value === e.target.value)
                          update('driver', e.target.value)
                          if (d && !editing.jdbcUrl) update('jdbcUrl', d.prefix)
                        }}
                        style={inputStyle}
                      >
                        {DRIVERS.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="JDBC URL" hint="Full connection string including host, port, and database name">
                      <input
                        value={editing.jdbcUrl}
                        onChange={e => update('jdbcUrl', e.target.value)}
                        placeholder="jdbc:postgresql://localhost:5432/mydb"
                        style={{ ...inputStyle, fontFamily: 'DM Mono, monospace' }}
                      />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <Field label="USERNAME">
                        <input
                          value={editing.username}
                          onChange={e => update('username', e.target.value)}
                          placeholder="db_user"
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="PASSWORD">
                        <PasswordInput
                          value={editing.password}
                          onChange={(v: any) => update('password', v)}
                          placeholder="••••••••"
                        />
                      </Field>
                    </div>

                    <Field label="SSL">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editing.ssl ?? false}
                          onChange={e => update('ssl', e.target.checked)}
                          style={{ accentColor: '#4C1D95', width: '14px', height: '14px' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                          Require SSL connection
                        </span>
                      </label>
                    </Field>
                  </>
                )}

                {/* ── Test Connection ── */}
                <SectionLabel>TEST CONNECTION</SectionLabel>

                <Field
                  label="HTTP METHOD"
                  hint="Select the method for the test request (e.g. POST for login APIs)."
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTestMethod(m)}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          letterSpacing: '0.05em',
                          border: `1px solid ${testMethod === m ? 'rgba(76,29,149,0.5)' : 'var(--color-border)'}`,
                          borderRadius: '6px',
                          background: testMethod === m ? 'rgba(76,29,149,0.12)' : 'var(--color-panel)',
                          color: testMethod === m ? '#4C1D95' : 'var(--color-text)',
                          cursor: 'pointer',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  label="REQUEST BODY (for test)"
                  hint={'Optional JSON body (for POST/PUT/PATCH). e.g. {"userEmail":"...", "userPassword":"..."}. Leave empty for GET.'}
                >
                  <textarea
                    value={testBody}
                    onChange={e => setTestBody(e.target.value)}
                    placeholder='{"userEmail":"you@example.com","userPassword":"••••••"}'
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '60px', fontFamily: 'DM Mono, monospace' }}
                  />
                </Field>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  marginBottom: '36px', flexWrap: 'wrap',
                }}>
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={testing || isNew}
                    style={{
                      padding: '9px 20px',
                      background: 'rgba(76,29,149,0.06)',
                      border: '1px solid rgba(76,29,149,0.2)',
                      borderRadius: '6px',
                      color: (testing || isNew) ? 'var(--color-muted)' : '#4C1D95',
                      fontSize: '12px',
                      cursor: (testing || isNew) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      letterSpacing: '0.05em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {testing ? (
                      <>
                        <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>↻</span>
                        Testing...
                      </>
                    ) : '⚡ Test Connection'}
                  </button>

                  {isNew && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text)' }}>
                      Save connector first to test
                    </span>
                  )}

                  {testResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        background: testResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      }}>
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                          background: testResult.success ? '#15803d' : '#b91c1c',
                          boxShadow: testResult.success ? '0 0 6px #15803d' : '0 0 6px #b91c1c',
                        }} />
                        <span style={{
                          fontSize: '12px',
                          color: testResult.success ? '#15803d' : '#b91c1c',
                        }}>
                          {testResult.success
                            ? `Connected · ${testResult.latencyMs ?? 0}ms`
                            : testResult.message}
                        </span>
                      </div>
                      {(testResult.statusCode != null || (testResult.responseBody != null && testResult.responseBody !== '')) && (
                        <div style={{
                          background: 'var(--color-panel)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--color-border)',
                            fontSize: '10px',
                            color: 'var(--color-muted)',
                            letterSpacing: '0.08em',
                          }}>
                            RESPONSE PREVIEW — use in nodes e.g. {'{{'}nodes.nexusId.successOutput.body{'}}'}
                          </div>
                          {testResult.statusCode != null && (
                            <div style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                              Status: <strong>{testResult.statusCode}</strong>
                            </div>
                          )}
                          {testResult.responseBody != null && testResult.responseBody !== '' && (
                            <pre style={{
                              margin: 0,
                              padding: '12px',
                              fontSize: '11px',
                              fontFamily: 'DM Mono, monospace',
                              color: 'var(--color-text)',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: '280px',
                              overflow: 'auto',
                            }}>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(testResult.responseBody)
                                  return JSON.stringify(parsed, null, 2)
                                } catch {
                                  return testResult.responseBody
                                }
                              })()}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Actions ── */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: '24px',
                  borderTop: '1px solid var(--color-border)',
                  gap: '12px',
                }}>
                  {/* Delete — only show for existing */}
                  <div>
                    {!isNew && (
                      <button
                        type="button"
                        onClick={() => setShowDelete(true)}
                        style={{
                          padding: '9px 18px',
                          background: 'rgba(239,68,68,0.06)',
                          border: '1px solid rgba(239,68,68,0.15)',
                          borderRadius: '6px',
                          color: '#b91c1c',
                          fontSize: '12px', cursor: 'pointer',
                          letterSpacing: '0.05em',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)';  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Save */}
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    style={{
                      padding: '9px 28px',
                      background: saving
                        ? 'rgba(76,29,149,0.05)'
                        : 'rgba(76,29,149,0.12)',
                      border: `1px solid ${saving ? 'rgba(76,29,149,0.1)' : 'rgba(76,29,149,0.35)'}`,
                      borderRadius: '6px',
                      color: saving ? 'var(--color-muted)' : '#4C1D95',
                      fontSize: '12px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'all 0.15s',
                      fontWeight: '500',
                    }}
                    onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'rgba(76,29,149,0.18)'; e.currentTarget.style.borderColor = 'rgba(76,29,149,0.5)' } }}
                    onMouseLeave={e => { if (!saving) { e.currentTarget.style.background = 'rgba(76,29,149,0.12)'; e.currentTarget.style.borderColor = 'rgba(76,29,149,0.35)' } }}
                  >
                    {saving ? (
                      <>
                        <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>↻</span>
                        Saving...
                      </>
                    ) : (
                      isNew ? 'Create Connector' : 'Save Changes'
                    )}
                  </button>
                </div>

                {/* Bottom spacer */}
                <div style={{ height: '60px' }} />
              </div>
            )}
          </div>
        </div>

        {/* Dialogs + Toasts */}
        {showDelete && (
          <DeleteDialog
            name={editing?.name ?? 'Connector'}
            onConfirm={deleteConnector}
            onCancel={() => setShowDelete(false)}
          />
        )}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    )
  }
  // ── Shared styles ──────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--color-panel)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '13px',
    transition: 'border-color 0.15s',
    outline: 'none',
  }

  const btnStyle = {
    padding: '9px 18px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    transition: 'all 0.15s',
  }

