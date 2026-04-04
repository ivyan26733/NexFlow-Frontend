'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { api } from '@/api'
import type { ExecutionDetail, NodeLog, NodeStatus, FlowNode, BranchExecution, NodeExecution } from '@/types'
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
  try { document.execCommand('copy'); return Promise.resolve() }
  finally { document.body.removeChild(ta) }
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [detail,    setDetail]    = useState<ExecutionDetail | null>(null)
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<string | null>(null)
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.executions.getById(id as string)
      .then(d => {
        setDetail(d)
        // Auto-expand failure nodes
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

  const branchesByForkNode = useMemo(() => {
    const map: Record<string, BranchExecution[]> = {}
    for (const branch of detail?.branches ?? []) {
      if (!map[branch.forkNodeId]) map[branch.forkNodeId] = []
      map[branch.forkNodeId].push(branch)
    }
    return map
  }, [detail?.branches])

  const nodeExecutionsByBranch = useMemo(() => {
    const map: Record<string, NodeExecution[]> = {}
    for (const ne of detail?.nodeExecutions ?? []) {
      const key = ne.branchName ?? ''
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(ne)
    }
    return map
  }, [detail?.nodeExecutions])

  if (loading) return (
    <div className="dashboard-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <MillennialLoader label="Loading execution…" />
    </div>
  )
  if (!detail) return <div className="dashboard-page" style={{ color: 'var(--color-muted)' }}>Execution not found.</div>

  const snapshotError = detail.ncoSnapshot?.error ?? (detail.ncoSnapshot?.meta as { errorMessage?: string } | undefined)?.errorMessage

  return (
    <div className="dashboard-page" style={{ maxWidth: '100%', padding: '1.5rem 2rem' }}>

      {/* Back */}
      <button type="button" onClick={() => router.push('/transactions')}
        className="studio-toolbar-btn"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={14} /> Transactions
      </button>

      {/* Execution summary card */}
      <div className="dashboard-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p className="dashboard-label" style={{ marginBottom: '0.3rem' }}>EXECUTION</p>
            <h1 className="dashboard-title" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{detail.flowName}</h1>
            <p className="dashboard-card-meta" style={{ marginTop: 0, fontFamily: 'var(--font-mono)' }}>POST /api/pulse/{detail.flowSlug}</p>
          </div>
          <StatusBadge status={detail.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            ['Execution ID', detail.id.slice(0, 8) + '…'],
            ['Started',      detail.startedAt ? formatTime(detail.startedAt) : '—'],
            ['Duration',     detail.durationMs >= 0 ? formatDuration(detail.durationMs) : '…'],
            ['Triggered By', detail.triggeredBy],
          ].map(([label, val]) => (
            <div key={String(label)}>
              <p className="dashboard-label" style={{ marginBottom: '0.2rem' }}>{label}</p>
              <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{val}</p>
            </div>
          ))}
        </div>
        {snapshotError && (
          <div style={{ marginTop: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
            <p className="dashboard-label" style={{ color: 'var(--color-failure)', marginBottom: '0.25rem' }}>EXECUTION ERROR</p>
            <p style={{ fontSize: '0.8rem', color: '#ff8080', fontFamily: 'var(--font-mono)', margin: 0 }}>{snapshotError}</p>
          </div>
        )}
      </div>


      {/* ── 3-column execution log ── */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="dashboard-label" style={{ margin: 0 }}>NODE EXECUTION LOG</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{nodeLogs.length} nodes executed</span>
      </div>

      {nodeLogs.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-muted)', margin: 0 }}>{snapshotError ?? 'No node logs recorded.'}</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', overflow: 'hidden', background: 'var(--color-surface)' }}>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 220px 1fr',
            background: 'var(--color-panel)',
            borderBottom: '2px solid var(--color-border)',
          }}>
            {[
              { label: 'NODE', sub: 'type · ID · request / response', color: 'var(--color-accent)' },
              { label: 'OUTCOME', sub: 'status · duration', color: '#a78bfa' },
              { label: 'EXCEPTION', sub: 'error · fix hint', color: '#f87171' },
            ].map((col, i) => (
              <div key={col.label} style={{
                padding: '0.875rem 1.25rem',
                borderRight: i < 2 ? '1px solid var(--color-border)' : 'none',
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: col.color, margin: 0 }}>{col.label}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)', margin: '0.15rem 0 0' }}>{col.sub}</p>
              </div>
            ))}
          </div>

          {/* Node rows */}
          {nodeLogs.map((log, idx) => {
            const saveAs    = flowNodes.find(n => n.id === log.nodeId)?.config?.saveOutputAs as string | undefined
            const isSelected = selected === log.nodeId
            const isLast    = idx === nodeLogs.length - 1
            const forkBranches = log.nodeType === 'FORK' ? (branchesByForkNode[log.nodeId] ?? []) : []

            return (
              <div key={log.nodeId}>
                <NodeRow
                  log={log}
                  saveAs={saveAs}
                  isSelected={isSelected}
                  isLast={isLast && forkBranches.length === 0}
                  expanded={!!expanded[log.nodeId]}
                  onToggleExpand={() => setExpanded(prev => ({ ...prev, [log.nodeId]: !prev[log.nodeId] }))}
                  onSelect={() => setSelected(isSelected ? null : log.nodeId)}
                />
                {/* FORK branch sub-rows */}
                {forkBranches.map((branch, bi) => (
                  <BranchRows
                    key={branch.id}
                    branch={branch}
                    nodeExecutions={nodeExecutionsByBranch[branch.branchName] ?? []}
                    isLast={isLast && bi === forkBranches.length - 1}
                    expanded={expanded}
                    onToggleExpand={(key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Node Row — one row across all 3 columns ── */

function NodeRow({ log, saveAs, isSelected, isLast, expanded, onToggleExpand, onSelect }: {
  log:            NodeLog
  saveAs?:        string
  isSelected:     boolean
  isLast:         boolean
  expanded:       boolean
  onToggleExpand: () => void
  onSelect:       () => void
}) {
  const isSuccess = log.status === 'SUCCESS'
  const isFailure = log.status === 'FAILURE'
  const statusCol = isSuccess ? '#10b981' : isFailure ? '#ef4444' : '#00d4ff'
  const hasError  = !!log.errorMessage || !!log.failureOutput
  const rowBorder = isLast ? 'none' : '1px solid var(--color-border)'
  const rowBg     = isSelected ? 'rgba(255,255,255,0.03)' : 'transparent'

  const errorMsg = log.errorMessage ?? (log.failureOutput as Record<string,unknown> | undefined)?.error as string | undefined

  const fixHint = errorMsg ? getFixHint(String(errorMsg)) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 1fr', borderBottom: rowBorder, background: rowBg, transition: 'background 0.1s' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = rowBg }}>

      {/* ── Col 1: Node ── */}
      <div style={{ padding: '1.125rem 1.25rem', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Node identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <NodeStatusDot status={log.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)' }}>{log.nodeType}</div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', marginTop: '0.1rem' }}>
              {log.nodeId.slice(0, 8)}…
              {saveAs && <span style={{ color: '#06B6D4', marginLeft: '0.5rem' }}>nex.{saveAs}</span>}
            </div>
          </div>
        </div>

        {/* Request / Response toggle */}
        {(log.input || log.output || log.successOutput) && (
          <button
            type="button"
            onClick={onToggleExpand}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {expanded ? 'Hide' : 'Show'} request / response
          </button>
        )}

        {/* Expanded JSON data */}
        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
            {log.input && Object.keys(log.input).length > 0 && (
              <JsonBlock label="INPUT" data={log.input} color="var(--color-accent)" compact />
            )}
            {log.successOutput && (
              <JsonBlock label="RESPONSE" data={log.successOutput} color="#10b981" compact />
            )}
            {log.output && !log.successOutput && (
              <JsonBlock label="OUTPUT" data={log.output} color="#10b981" compact />
            )}
          </div>
        )}
      </div>

      {/* ── Col 2: Outcome ── */}
      <div style={{ padding: '1.125rem 1rem', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.625rem', alignItems: 'flex-start' }}>
        {/* Status pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.35rem 0.75rem', borderRadius: '9999px',
          background: `${statusCol}18`, border: `1px solid ${statusCol}44`,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusCol, flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: statusCol }}>{log.status}</span>
        </div>

        {/* Extra outcome info */}
        {log.nodeType === 'LOOP' && isSuccess && log.successOutput && (
          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
            ↺ {String((log.successOutput as Record<string,unknown>).iterationCount ?? (log.successOutput as Record<string,unknown>).index ?? '?')} iterations
          </div>
        )}
        {log.nodeType === 'NEXUS' && log.successOutput && (
          <div style={{
            fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
            color: isSuccess ? '#10b981' : '#ef4444',
          }}>
            HTTP {String((log.successOutput as Record<string,unknown>).statusCode ?? '—')}
          </div>
        )}
        {log.nodeType === 'DECISION' && log.output && (
          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
            result: <span style={{ color: isSuccess ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
              {String((log.output as Record<string,unknown>).result ?? '—')}
            </span>
          </div>
        )}
        {saveAs && (
          <div style={{ fontSize: '0.68rem', color: 'var(--color-muted)' }}>
            Saved as <code style={{ color: '#06B6D4', fontFamily: 'var(--font-mono)' }}>nex.{saveAs}</code>
          </div>
        )}
      </div>

      {/* ── Col 3: Exception ── */}
      <div style={{ padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {!hasError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
            <CheckCircle size={14} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.775rem' }}>No exceptions</span>
          </div>
        ) : (
          <>
            {/* Error message */}
            {errorMsg && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
              }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>Error</p>
                <p style={{ fontSize: '0.775rem', fontFamily: 'var(--font-mono)', color: '#fca5a5', margin: 0, lineHeight: 1.6, wordBreak: 'break-word' }}>{errorMsg}</p>
              </div>
            )}

            {/* Failure output detail if different from error */}
            {log.failureOutput && (
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>Failure Detail</p>
                <pre style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#fca5a5', margin: 0, overflow: 'auto', maxHeight: '8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(log.failureOutput, null, 2)}
                </pre>
              </div>
            )}

            {/* Fix hint */}
            {fixHint && (
              <div style={{ borderLeft: '3px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.04)', borderRadius: '0 0.375rem 0.375rem 0', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                {fixHint}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Branch rows (below a FORK row) ── */

function BranchRows({ branch, nodeExecutions, isLast, expanded, onToggleExpand }: {
  branch:          BranchExecution
  nodeExecutions:  NodeExecution[]
  isLast:          boolean
  expanded:        Record<string, boolean>
  onToggleExpand:  (key: string) => void
}) {
  const isSuccess = branch.status === 'SUCCESS'
  const color     = isSuccess ? '#10b981' : '#ef4444'

  return (
    <>
      {/* Branch header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 220px 1fr',
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        <div style={{ padding: '0.625rem 1.25rem 0.625rem 2rem', borderRight: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 12, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color }}>⑃ {branch.branchName}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>FORK branch</span>
        </div>
        <div style={{ padding: '0.625rem 1rem', borderRight: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color }}>{branch.status}</span>
          {branch.durationMs != null && (
            <span style={{ fontSize: '0.68rem', color: 'var(--color-muted)' }}>{branch.durationMs}ms</span>
          )}
        </div>
        <div style={{ padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center' }}>
          {branch.errorMessage
            ? <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>{branch.errorMessage}</span>
            : <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Branch completed</span>
          }
        </div>
      </div>

      {/* Branch node rows */}
      {nodeExecutions.map((ne, ni) => {
        const neKey    = `branch:${branch.id}:${ne.id}`
        const isNeExp  = !!expanded[neKey]
        const isNeLast = isLast && ni === nodeExecutions.length - 1
        const neError  = ne.errorMessage ?? (ne.outputNex as Record<string,unknown> | undefined)?.error as string | undefined

        return (
          <div key={ne.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 220px 1fr',
            borderBottom: isNeLast ? 'none' : '1px solid var(--color-border)',
            background: 'rgba(255,255,255,0.01)',
          }}>
            {/* Col 1 */}
            <div style={{ padding: '0.875rem 1.25rem 0.875rem 2.5rem', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <NodeStatusDot status={ne.status as NodeStatus} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-text)' }}>{ne.nodeLabel}</span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', color: 'var(--color-muted)' }}>{ne.nodeType}</span>
                </div>
              </div>
              {(ne.inputNex || ne.outputNex) && (
                <button type="button" onClick={() => onToggleExpand(neKey)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.68rem', color: 'var(--color-muted)', fontFamily: 'inherit', textAlign: 'left' }}>
                  {isNeExp ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  {isNeExp ? 'Hide' : 'Show'} data
                </button>
              )}
              {isNeExp && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {ne.inputNex  && Object.keys(ne.inputNex).length  > 0 && <JsonBlock label="INPUT"  data={ne.inputNex  as Record<string,unknown>} color="var(--color-accent)" compact />}
                  {ne.outputNex && Object.keys(ne.outputNex).length > 0 && <JsonBlock label="OUTPUT" data={ne.outputNex as Record<string,unknown>} color="#10b981"            compact />}
                </div>
              )}
            </div>
            {/* Col 2 */}
            <div style={{ padding: '0.875rem 1rem', borderRight: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', background: ne.status === 'SUCCESS' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${ne.status === 'SUCCESS' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: ne.status === 'SUCCESS' ? '#10b981' : '#ef4444' }} />
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: ne.status === 'SUCCESS' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{ne.status}</span>
              </div>
              {ne.durationMs != null && (
                <span style={{ fontSize: '0.68rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{ne.durationMs}ms</span>
              )}
            </div>
            {/* Col 3 */}
            <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {!neError ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
                  <CheckCircle size={13} />
                  <span style={{ fontSize: '0.72rem' }}>No exceptions</span>
                </div>
              ) : (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}>
                  <p style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700, margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Error</p>
                  <p style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#fca5a5', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{neError}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

/* ── Fix hint helper ── */
function getFixHint(msg: string): string | null {
  if (msg.includes('null'))            return '→ A reference resolved to null. Check your {{nex.x}} paths.'
  if (msg.includes('401'))             return '→ Unauthorized. Check auth headers or API key.'
  if (msg.includes('404'))             return '→ Not found. Verify the URL and endpoint exists.'
  if (msg.includes('url'))             return '→ NEXUS node missing the URL. Add it in node config.'
  if (msg.includes('code'))            return '→ SCRIPT node has no code. Open node and write your script.'
  if (msg.includes('ReferenceError'))  return '→ Variable not defined. Check nex.x path in script.'
  if (msg.includes('TypeError'))       return '→ Type mismatch. Check data types and null access.'
  if (msg.includes('timeout'))         return '→ Timed out. Check for infinite loops or slow APIs.'
  if (msg.includes('No API key'))      return '→ Missing API key. Go to Settings → AI Providers.'
  return '→ Check node configuration and upstream data.'
}

/* ── Status dot ── */
function NodeStatusDot({ status }: { status: NodeStatus }) {
  const color = status === 'SUCCESS' ? '#10b981' : status === 'FAILURE' ? '#ef4444' : '#00d4ff'
  return (
    <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}88` }} />
  )
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const color = status === 'SUCCESS' ? '#10b981' : status === 'FAILURE' ? '#ef4444' : '#00d4ff'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.875rem', borderRadius: '9999px', background: color + '18', border: `1px solid ${color}44` }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color }}>{status}</span>
    </div>
  )
}


/* ── Json Block ── */
function JsonBlock({ label, data, color, compact }: { label: string; data: Record<string, unknown>; color: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <p className="dashboard-label" style={{ color, marginBottom: 0, fontSize: '0.65rem' }}>{label}</p>
        <button type="button" onClick={() => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="studio-toolbar-btn" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>{copied ? 'COPIED' : 'COPY'}</button>
      </div>
      <pre style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: compact ? '0.5rem 0.75rem' : '0.75rem 1rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', overflow: 'auto', maxHeight: compact ? '12rem' : '20rem', lineHeight: 1.6, margin: 0 }}>{json}</pre>
    </div>
  )
}

/* ── Nex JSON viewer ── */
function CopyPathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button type="button" onClick={() => copyToClipboard(path).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })} title={path} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex' }}>
        <Copy size={11} style={{ color: 'var(--color-muted)' }} />
      </button>
      {copied && <span style={{ fontSize: 10, color: '#10b981' }}>Copied!</span>}
    </span>
  )
}

function NexJsonViewer({ data, basePath, depth = 0 }: { data: unknown; basePath: string; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2)
  const indent = depth * 12
  if (data === null) return <span style={{ color: 'var(--color-muted)' }}>null</span>
  if (typeof data === 'boolean') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ color: '#3b82f6' }}>{String(data)}</span><CopyPathButton path={basePath} /></span>
  if (typeof data === 'number')  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ color: '#F59E0B' }}>{data}</span><CopyPathButton path={basePath} /></span>
  if (typeof data === 'string')  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ color: '#10b981' }}>{JSON.stringify(data)}</span><CopyPathButton path={basePath} /></span>
  if (Array.isArray(data)) return (
    <div style={{ marginLeft: indent }}>
      <button type="button" onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-text)' }}>
        {collapsed ? `[ ${data.length} items ]` : '['}
      </button>
      {!collapsed && (<>{data.map((item, i) => (<div key={i} style={{ marginLeft: 12, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}><NexJsonViewer data={item} basePath={`${basePath}.${i}`} depth={depth + 1} /></div>))}<span style={{ marginLeft: 12 }}>]</span></>)}
    </div>
  )
  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>)
    return (
      <div style={{ marginLeft: indent, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        <button type="button" onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text)' }}>
          {collapsed ? `{ ${entries.length} keys }` : '{'}
        </button>
        {!collapsed && entries.map(([k, v]) => (
          <div key={k} style={{ marginLeft: 12, display: 'flex', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-text)' }}>&quot;{k}&quot;: </span>
            <NexJsonViewer data={v} basePath={basePath ? `${basePath}.${k}` : k} depth={depth + 1} />
          </div>
        ))}
        {!collapsed && <span style={{ marginLeft: 12 }}>{'}'}</span>}
      </div>
    )
  }
  return null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
