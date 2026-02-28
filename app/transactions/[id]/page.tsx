'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { api } from '@/api'
import type { ExecutionDetail, NodeLog, NodeStatus, NexMap, FlowNode } from '@/types'
import { MillennialLoader } from '@/MillennialLoader'

function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'absolute'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    return Promise.resolve()
  } finally {
    document.body.removeChild(ta)
  }
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<ExecutionDetail | null>(null)
  const [nexData, setNexData] = useState<NexMap>({})
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [rawOpen, setRawOpen] = useState<Record<string, boolean>>({})
  const [nexOpen, setNexOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.executions.getById(id as string)
      .then(d => {
        setDetail(d)
        const auto: Record<string, boolean> = {}
        if (d.ncoSnapshot?.nodes) {
          Object.entries(d.ncoSnapshot.nodes).forEach(([, n]) => {
            if ((n as NodeLog).status === 'FAILURE') auto[(n as NodeLog).nodeId] = true
          })
        }
        setExpanded(auto)
        if (d.flowId) {
          api.canvas.load(d.flowId).then(canvas => setFlowNodes(canvas.nodes ?? [])).catch(() => {})
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    api.executions.getNex(id as string).then(r => setNexData(r.nex ?? {})).catch(() => setNexData({}))
  }, [id])

  const nodeLogs: NodeLog[] = useMemo(() => {
    if (!detail?.ncoSnapshot?.nodes) return []
    const logs = Object.entries(detail.ncoSnapshot.nodes).map(([, n]) => n as NodeLog)
    const order = detail.ncoSnapshot?.nodeExecutionOrder ?? []
    if (order.length > 0) {
      logs.sort((a, b) => {
        const ai = order.indexOf(a.nodeId)
        const bi = order.indexOf(b.nodeId)
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
      })
    }
    return logs
  }, [detail?.ncoSnapshot?.nodes, detail?.ncoSnapshot?.nodeExecutionOrder])

  function toggle(nodeId: string) {
    setExpanded(prev => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }

  if (loading) {
    return (
      <div className="dashboard-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <MillennialLoader label="Loading execution…" />
      </div>
    )
  }
  if (!detail) {
    return <div className="dashboard-page" style={{ color: 'var(--color-muted)' }}>Execution not found.</div>
  }

  const snapshotError = detail.ncoSnapshot?.error ?? (detail.ncoSnapshot?.meta as { errorMessage?: string } | undefined)?.errorMessage

  return (
    <div className="dashboard-page">
      <button type="button" onClick={() => router.push('/transactions')} className="studio-toolbar-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={14} /> Transactions
      </button>

      <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <p className="dashboard-label" style={{ marginBottom: '0.3rem' }}>EXECUTION</p>
            <h1 className="dashboard-title" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{detail.flowName}</h1>
            <p className="dashboard-card-meta" style={{ marginTop: 0, fontFamily: 'var(--font-mono)' }}>POST /api/pulse/{detail.flowSlug}</p>
          </div>
          <StatusBadge status={detail.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[['Execution ID', detail.id.slice(0, 8) + '…'], ['Started', detail.startedAt ? formatTime(detail.startedAt) : '—'], ['Duration', detail.durationMs >= 0 ? formatDuration(detail.durationMs) : '…'], ['Triggered By', detail.triggeredBy]].map(([label, val]) => (
            <div key={String(label)}>
              <p className="dashboard-label" style={{ marginBottom: '0.2rem' }}>{label}</p>
              <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* NEX CONTAINER */}
      <div style={{ marginBottom: '1.5rem', border: '1px solid #06B6D4', borderRadius: '0.5rem', background: 'var(--color-base)', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)' }}>
          <h2 className="dashboard-label" style={{ margin: 0, color: '#06B6D4' }}>NEX CONTAINER</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem', marginBottom: 0 }}>Everything saved via &quot;Save output as&quot; across this execution</p>
        </div>
        <div style={{ padding: '1rem' }}>
          {Object.keys(nexData).length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>No outputs saved. Use &quot;Save output as&quot; in any node config to store results here.</p>
          ) : (
            Object.entries(nexData).map(([key, value]) => (
              <NexEntry key={key} nexKey={key} data={value} isOpen={nexOpen[key] !== false} onToggle={() => setNexOpen(prev => ({ ...prev, [key]: !prev[key] }))} />
            ))
          )}
        </div>
      </div>

      <h2 className="dashboard-label" style={{ marginBottom: '0.75rem' }}>Node Execution Log ({nodeLogs.length})</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {nodeLogs.length === 0 ? (
          <div className="dashboard-card" style={{ padding: '2rem', textAlign: 'center' }}>
            {snapshotError ? (
              <>
                <p className="dashboard-label" style={{ color: 'var(--color-failure)', marginBottom: '0.5rem' }}>Execution failed</p>
                <p className="dashboard-subtitle" style={{ marginBottom: 0, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{snapshotError}</p>
              </>
            ) : (
              <p className="dashboard-subtitle" style={{ marginBottom: 0 }}>No node logs in snapshot.</p>
            )}
          </div>
        ) : (
          nodeLogs.map(log => {
            const saveAs = flowNodes.find(n => n.id === log.nodeId)?.config?.saveOutputAs as string | undefined
            return (
              <NodeLogCard
                key={log.nodeId}
                log={log}
                saveOutputAs={saveAs}
                isOpen={!!expanded[log.nodeId]}
                onToggle={() => toggle(log.nodeId)}
                rawOpen={!!rawOpen[log.nodeId]}
                onRawToggle={() => setRawOpen(prev => ({ ...prev, [log.nodeId]: !prev[log.nodeId] }))}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

function NexEntry({ nexKey, data, isOpen, onToggle }: { nexKey: string; data: unknown; isOpen: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false)
  const refPath = `nex.${nexKey}`
  function copyRef() {
    copyToClipboard(refPath).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <div style={{ marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', overflow: 'hidden', background: 'var(--color-panel)' }}>
      <button type="button" onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontFamily: 'var(--font-mono)', color: '#06B6D4' }}>{nexKey}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <code style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>{refPath}</code>
            <button type="button" onClick={copyRef} className="studio-toolbar-btn" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>{copied ? 'Copied!' : 'COPY REF'}</button>
          </div>
          <div style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', overflow: 'auto', maxHeight: '24rem' }}>
            <NexJsonViewer data={data} basePath={refPath} depth={0} />
          </div>
        </div>
      )}
    </div>
  )
}

function CopyPathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button type="button" onClick={() => copyToClipboard(path).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })} title={path} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex' }}>
        <Copy size={12} style={{ color: 'var(--color-muted)' }} />
      </button>
      {copied && <span style={{ fontSize: 10, color: 'var(--color-success)' }}>Copied!</span>}
    </span>
  )
}

function NexJsonViewer({ data, basePath, depth = 0 }: { data: unknown; basePath: string; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2)
  const indent = depth * 14

  if (data === null) {
    return <span style={{ color: 'var(--color-muted)' }}>null</span>
  }
  if (typeof data === 'boolean') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#3b82f6' }}>{String(data)}</span>
        <CopyPathButton path={basePath} />
      </span>
    )
  }
  if (typeof data === 'number') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#F59E0B' }}>{data}</span>
        <CopyPathButton path={basePath} />
      </span>
    )
  }
  if (typeof data === 'string') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#10b981' }}>{JSON.stringify(data)}</span>
        <CopyPathButton path={basePath} />
      </span>
    )
  }
  if (Array.isArray(data)) {
    return (
      <div style={{ marginLeft: indent }}>
        <button type="button" onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text)' }}>
          {collapsed ? `[ ${data.length} items ]` : '['}
        </button>
        {!collapsed && (
          <>
            {data.map((item, i) => (
              <div key={i} style={{ marginLeft: 14, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <NexJsonViewer data={item} basePath={`${basePath}.${i}`} depth={depth + 1} />
              </div>
            ))}
            <span style={{ marginLeft: 14 }}>]</span>
          </>
        )}
      </div>
    )
  }
  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>)
    return (
      <div style={{ marginLeft: indent, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
        <button type="button" onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text)' }}>
          {collapsed ? `{ ${entries.length} keys }` : '{'}
        </button>
        {!collapsed && entries.map(([k, v]) => (
          <div key={k} style={{ marginLeft: 14, display: 'flex', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-text)' }}>&quot;{k}&quot;: </span>
            <NexJsonViewer data={v} basePath={basePath ? `${basePath}.${k}` : k} depth={depth + 1} />
          </div>
        ))}
        {!collapsed && <span style={{ marginLeft: 14 }}>{'}'}</span>}
      </div>
    )
  }
  return null
}

function NodeLogCard({ log, saveOutputAs, isOpen, onToggle, rawOpen, onRawToggle }: {
  log: NodeLog
  saveOutputAs?: string
  isOpen: boolean
  onToggle: () => void
  rawOpen: boolean
  onRawToggle: () => void
}) {
  const statusCol = log.status === 'SUCCESS' ? 'var(--color-success)' : log.status === 'FAILURE' ? 'var(--color-failure)' : 'var(--color-accent)'
  const rawOutputData = log.successOutput ?? log.output ?? {}
  const rawOutputKeys = Object.keys(rawOutputData as object)

  return (
    <div className="dashboard-card" style={{ overflow: 'hidden', borderColor: isOpen ? statusCol + '44' : undefined }}>
      <button type="button" onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <NodeStatusIcon status={log.status} />
        <div style={{ flex: 1 }}>
          <span className="dashboard-card-title" style={{ margin: 0 }}>{log.nodeType}</span>
          <span className="dashboard-card-meta" style={{ marginLeft: '0.75rem', marginTop: 0 }}>{log.nodeId.slice(0, 8)}…</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: statusCol }}>{log.status}</span>
        {isOpen ? <ChevronDown size={14} style={{ color: 'var(--color-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />}
      </button>
      {isOpen && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {log.nodeType === 'LOOP' && log.status === 'SUCCESS' && log.successOutput && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              <p className="dashboard-label" style={{ color: 'var(--color-success)', marginBottom: '0.25rem' }}>↺ Completed {String((log.successOutput as Record<string, unknown>).iterationCount ?? (log.successOutput as Record<string, unknown>).index ?? '?')} iterations</p>
              {Array.isArray((log.successOutput as Record<string, unknown>).accumulated) && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>
                  {((log.successOutput as Record<string, unknown>).accumulated as unknown[]).length} items collected
                </p>
              )}
            </div>
          )}
          {log.nodeType === 'LOOP' && log.status === 'FAILURE' && log.errorMessage && String(log.errorMessage).includes('Loop exceeded max iterations') && (
            <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              <p className="dashboard-label" style={{ color: 'var(--color-failure)', marginBottom: '0.25rem' }}>⚠ Max iterations exceeded</p>
              <p style={{ fontSize: '0.8rem', color: '#ff8080', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>{log.errorMessage}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', margin: 0 }}>Increase max iterations in the LOOP node config, or fix the exit condition so it evaluates to false.</p>
            </div>
          )}
          {log.errorMessage && !(log.nodeType === 'LOOP' && String(log.errorMessage).includes('Loop exceeded max iterations')) && (
            <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              <p className="dashboard-label" style={{ color: 'var(--color-failure)', marginBottom: '0.25rem' }}>ERROR</p>
              <p style={{ fontSize: '0.8rem', color: '#ff8080', fontFamily: 'var(--font-mono)' }}>{log.errorMessage}</p>
            </div>
          )}
          {log.input && Object.keys(log.input).length > 0 && <JsonBlock label="INPUT / REQUEST" data={log.input} color="var(--color-accent)" />}
          {log.output && <JsonBlock label="OUTPUT" data={log.output} color="var(--color-success)" />}
          {log.successOutput && <JsonBlock label={log.nodeType === 'LOOP' ? 'SUCCESS OUTPUT' : 'SUCCESS OUTPUT (HTTP RESPONSE)'} data={log.successOutput} color="var(--color-success)" />}
          {log.failureOutput && <JsonBlock label="FAILURE OUTPUT (HTTP ERROR)" data={log.failureOutput} color="var(--color-failure)" />}

          {/* RAW OUTPUT — full JSON with copy-path buttons */}
          {rawOutputKeys.length > 0 && (
            <>
              <button type="button" onClick={onRawToggle} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                {rawOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                RAW OUTPUT
              </button>
              {rawOpen && (
                <div style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.75rem 1rem', overflow: 'auto', maxHeight: '24rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <NexJsonViewer
                    data={rawOutputData}
                    basePath={saveOutputAs ? `nex.${saveOutputAs}` : `nodes.${log.nodeId}.${log.successOutput ? 'successOutput' : 'output'}`}
                    depth={0}
                  />
                </div>
              )}
            </>
          )}

          {/* How to reference tip */}
          <div style={{ borderLeft: '3px solid #F59E0B', background: 'rgba(245,158,11,0.06)', borderRadius: '0 0.375rem 0.375rem 0', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {saveOutputAs ? (
              <>💡 Reference this in any node: <code style={{ color: '#F59E0B' }}>nex.{saveOutputAs}.FIELD</code> — e.g. <code style={{ color: '#F59E0B' }}>nex.{saveOutputAs}.result.userId</code></>
            ) : (
              <>💡 No name assigned. Add &quot;Save output as&quot; in Studio to use <code>nex.NAME</code> syntax. Or use: <code>nodes.&lt;nodeId&gt;.successOutput.FIELD</code></>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function JsonBlock({ label, data, color }: { label: string; data: Record<string, unknown>; color: string }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)
  function copy() { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <p className="dashboard-label" style={{ color, marginBottom: 0 }}>{label}</p>
        <button type="button" onClick={copy} className="studio-toolbar-btn" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{copied ? 'COPIED' : 'COPY'}</button>
      </div>
      <pre style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', overflow: 'auto', maxHeight: '20rem', lineHeight: 1.6, margin: 0 }}>{json}</pre>
    </div>
  )
}

function NodeStatusIcon({ status }: { status: NodeStatus }) {
  if (status === 'SUCCESS') return <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
  if (status === 'FAILURE') return <XCircle size={16} style={{ color: 'var(--color-failure)', flexShrink: 0 }} />
  if (status === 'RUNNING') return <Loader2 size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
  return <Clock size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'SUCCESS' ? 'var(--color-success)' : status === 'FAILURE' ? 'var(--color-failure)' : 'var(--color-accent)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.875rem', borderRadius: '9999px', background: color + '18', border: `1px solid ${color}44` }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color }}>{status}</span>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
