'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ReactFlow, ReactFlowProvider, useReactFlow,
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type NodeTypes, type Edge, type Node,
  type OnNodesChange, type OnEdgesChange,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { PanelLeftOpen } from 'lucide-react'

import { api } from '@/api'
import { useExecutionSocket } from '@/useExecutionSocket'
import { useBranchSocket } from '@/useBranchSocket'
import { NODE_META } from '@/lib/nodeConfig'
import type {
  NodeStatus,
  NodeExecutionEvent,
  FlowNode as ApiNode,
  FlowEdge as ApiEdge,
  BranchStatus,
  ForkNodeConfig,
  NodeType as NodeKind,
} from '@/types'

import NodeSidebar     from '@/NodeSidebar'
import NodeConfigPanel from '@/NodeConfigPanel'
import StudioToolbar   from '@/StudioToolbar'
import { FlowNodeCard } from '@/FlowNodeCard'
import ForkJoinNodeCard from '@/ForkJoinNodeCard'
import AiFlowNodeCard from '@/components/studio/AiFlowNodeCard'
import { MillennialLoader } from '@/MillennialLoader'
import { AIPanel } from '@/components/AIPanel'

/* ───────────────────────── Node Types ───────────────────────── */

const nodeTypes: NodeTypes = {
  START:    FlowNodeCard,
  NEXUS:    FlowNodeCard,
  SUB_FLOW: FlowNodeCard,
  SCRIPT:   FlowNodeCard,
  VARIABLE: FlowNodeCard,
  MAPPER:   FlowNodeCard,
  DECISION: FlowNodeCard,
  LOOP:     FlowNodeCard,
  AI:       AiFlowNodeCard,
  SUCCESS:  FlowNodeCard,
  FAILURE:  FlowNodeCard,
  FORK:     ForkJoinNodeCard,
  JOIN:     ForkJoinNodeCard,
}

/* ───────────────────────── Page ───────────────────────── */

export default function StudioPage() {
  const { id: flowId } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const viewMode = searchParams.get('mode') === 'view'

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)

  const [executionId,  setExecutionId]  = useState<string | null>(null)
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({})
  const [branchStatuses, setBranchStatuses] = useState<
    Record<string, Record<string, BranchStatus>>
  >({})
  const [saving,       setSaving]       = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [saveModal,   setSaveModal]    = useState<{ warnings: string[] } | null>(null)
  const [saveToast,   setSaveToast]    = useState<{ type: 'success' | 'error'; message?: string } | null>(null)
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [flowName, setFlowName] = useState('')
  const [flowSlug, setFlowSlug] = useState('')

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // refs → avoid stale closure during save + prevent double-save
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const saveInProgressRef = useRef(false)
  const flowIdRef = useRef(flowId)
  const pendingStartRef = useRef<string | null>(null)
  const pendingPayloadRef = useRef<Record<string, unknown> | null>(null)
  nodesRef.current = nodes
  edgesRef.current = edges
  flowIdRef.current = flowId

  /* Load the saved flow metadata and canvas together. */

  useEffect(() => {
    const loadingFlowId = flowId
    setLoading(true)
    async function load() {
      try {
        const [flow, canvas] = await Promise.all([
          api.flows.get(loadingFlowId),
          api.canvas.load(loadingFlowId),
        ])
        if (flowIdRef.current !== loadingFlowId) return
        setFlowName(flow.name)
        setFlowSlug(flow.slug)
        let initialNodes = canvas.nodes.map(apiNodeToRfNode)
        const hasStart = initialNodes.some(n => n.type === 'START')
        if (!hasStart) {
          initialNodes = [createDefaultStartNode(), ...initialNodes]
        }
        setNodes(initialNodes)
        setEdges(canvas.edges.map(apiEdgeToRfEdge))
      } catch (e) {
        console.error(e)
      } finally {
        if (flowIdRef.current === loadingFlowId) setLoading(false)
      }
    }
    load()
  }, [flowId])

  /* Live execution updates come from websockets so the canvas can show running nodes. */

  useExecutionSocket({
    executionId,
    onEvent: (ev: NodeExecutionEvent) =>
      setNodeStatuses(prev => ({ ...prev, [ev.nodeId]: ev.status })),
    onReady: async () => {
      const idToStart = pendingStartRef.current
      const payload = pendingPayloadRef.current
      if (!idToStart || !payload) return
      pendingStartRef.current = null
      pendingPayloadRef.current = null
      try {
        // eslint-disable-next-line no-console
        console.info('[Studio] STOMP subscription confirmed, starting execution', idToStart)
        await api.executions.start(idToStart, payload)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[Studio] Failed to start execution', e)
      }
    },
  })

  useBranchSocket({
    executionId,
    onBranchEvent: (event) => {
      setBranchStatuses(prev => ({
        ...prev,
        [event.forkNodeId]: {
          ...(prev[event.forkNodeId] ?? {}),
          [event.branchName]: event.status,
        },
      }))
    },
  })

  const nodesWithStatus = nodes.map(n => {
    const liveStatus = nodeStatuses[n.id] ?? null
    const data: any = { ...n.data, liveStatus }

    if (n.type === 'FORK') {
      data.branchStatuses = branchStatuses[n.id] ?? {}
    }
    if (n.type === 'JOIN') {
      const forkId = (n.data.config as any)?.forkNodeId
      data.branchStatuses = forkId ? (branchStatuses[forkId] ?? {}) : {}
    }

    return { ...n, data }
  })

  /* ───────────────────────── Edge connect ───────────────────────── */

  const onConnect = useCallback((connection: Connection) => {
    if (viewMode) return

    const { source, sourceHandle, target } = connection

    const sourceNode = nodes.find(n => n.id === source)

    if (sourceNode?.data?.nodeType === 'FORK' && sourceHandle && target) {
      // A direct FORK branch handle means this node belongs to that branch list.
      const branchName = sourceHandle
      setNodes(prevNodes => prevNodes.map(n => {
        if (n.id !== source) return n
        const prevConfig = (n.data.config ?? {}) as ForkNodeConfig & { branchNodeIds?: Record<string, string[]> }
        const prevBranchNodeIds = prevConfig.branchNodeIds ?? {}
        const prevList = prevBranchNodeIds[branchName] ?? []
        const newList = prevList.includes(target) ? prevList : [...prevList, target]
        return {
          ...n,
          data: {
            ...n.data,
            config: {
              ...prevConfig,
              branchNodeIds: { ...prevBranchNodeIds, [branchName]: newList },
            },
          },
        }
      }))
    } else if (source && target) {
      // If an edge is inside a branch, keep that branch's node list in sync too.
      setNodes(prevNodes => prevNodes.map(n => {
        if (n.data.nodeType !== 'FORK') return n
        const prevConfig = (n.data.config ?? {}) as ForkNodeConfig & { branchNodeIds?: Record<string, string[]> }
        const prevBranchNodeIds = prevConfig.branchNodeIds ?? {}

        let changed = false
        const next: Record<string, string[]> = {}
        for (const [branch, ids] of Object.entries(prevBranchNodeIds)) {
          if (Array.isArray(ids) && ids.includes(source) && !ids.includes(target)) {
            next[branch] = [...ids, target]
            changed = true
          } else {
            next[branch] = ids as string[]
          }
        }
        if (!changed) return n
        return { ...n, data: { ...n.data, config: { ...prevConfig, branchNodeIds: next } } }
      }))
    }

    const sourceHandleId = connection.sourceHandle ?? undefined
    const conditionType = sourceHandleId === 'continue' ? 'CONTINUE' : sourceHandleId === 'failure' ? 'FAILURE' : 'SUCCESS'
    const style = conditionType === 'CONTINUE'
      ? { stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: '6 3' }
      : conditionType === 'FAILURE'
        ? { stroke: '#b91c1c', strokeWidth: 2 }
        : { stroke: '#15803d', strokeWidth: 2 }
    setEdges(eds =>
      addEdge(
        {
          ...connection,
          id: crypto.randomUUID(),
          type: 'smoothstep',
          data: { conditionType },
          style,
        },
        eds
      )
    )
  }, [nodes, setNodes, setEdges, viewMode])

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    if (viewMode) return

    // Deleted edges may remove whole branch paths, so we check what is still reachable.
    const deletedPairs = new Set(deletedEdges.map(e => `${e.source}::${e.target}`))

    deletedEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)

      if (sourceNode?.data?.nodeType === 'FORK' && edge.sourceHandle) {
        // Removing a branch entry edge should also unhook the branch target from that list.
        const branchName = edge.sourceHandle
        setNodes(prevNodes => prevNodes.map(n => {
          if (n.id !== edge.source) return n
          const prevConfig = (n.data.config ?? {}) as ForkNodeConfig & { branchNodeIds?: Record<string, string[]> }
          const prevBranchNodeIds = prevConfig.branchNodeIds ?? {}
          return {
            ...n,
            data: {
              ...n.data,
              config: {
                ...prevConfig,
                branchNodeIds: {
                  ...prevBranchNodeIds,
                  [branchName]: (prevBranchNodeIds[branchName] ?? []).filter(id => id !== edge.target),
                },
              },
            },
          }
        }))
      } else if (edge.source && edge.target) {
        // For normal edges, only remove the target if nothing else still reaches it.
        const survivingEdges = edges.filter(e =>
          !deletedPairs.has(`${e.source}::${e.target}`)
        )
        setNodes(prevNodes => prevNodes.map(n => {
          if (n.data.nodeType !== 'FORK') return n
          const prevConfig = (n.data.config ?? {}) as ForkNodeConfig & { branchNodeIds?: Record<string, string[]> }
          const prevBranchNodeIds = prevConfig.branchNodeIds ?? {}

          let changed = false
          const next: Record<string, string[]> = {}
          for (const [branch, ids] of Object.entries(prevBranchNodeIds)) {
            const list = ids as string[]
            if (!list.includes(edge.source) || !list.includes(edge.target)) {
              next[branch] = list
              continue
            }
            // Check if target is still reachable from any surviving branch member
            const stillReachable = survivingEdges.some(
              se => list.includes(se.source) && se.target === edge.target
            )
            if (stillReachable) {
              next[branch] = list
            } else {
              next[branch] = list.filter(id => id !== edge.target)
              changed = true
            }
          }
          if (!changed) return n
          return { ...n, data: { ...n.data, config: { ...prevConfig, branchNodeIds: next } } }
        }))
      }
    })
  }, [nodes, edges, setNodes, viewMode])

  /* ───────────────────────── Actions ───────────────────────── */

  function checkAndSave() {
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    const warnings: string[] = []

    // Check terminal nodes are connected
    const terminalTypes = ['SUCCESS', 'FAILURE']
    const nonTerminalNodes = currentNodes.filter(n => !terminalTypes.includes(n.type ?? ''))
    const terminalNodes    = currentNodes.filter(n =>  terminalTypes.includes(n.type ?? ''))

    // Any non-terminal, non-START node with no outgoing edges = dead end
    const deadEnds = nonTerminalNodes.filter(n => {
      if (n.type === 'START') return false
      return !currentEdges.some(e => e.source === n.id)
    })
    if (deadEnds.length > 0) {
      warnings.push(`${deadEnds.length} node(s) have no outgoing connections: ${deadEnds.map(n => `"${n.data.label}"`).join(', ')}`)
    }

    // No terminal node at all
    if (terminalNodes.length === 0) {
      warnings.push('No SUCCESS or FAILURE terminal node in the flow — it will never complete')
    } else {
      // Terminal nodes that have no incoming edge
      const orphanTerminals = terminalNodes.filter(n => !currentEdges.some(e => e.target === n.id))
      if (orphanTerminals.length > 0) {
        warnings.push(`Terminal node(s) not connected: ${orphanTerminals.map(n => `"${n.data.label}" (${n.type})`).join(', ')}`)
      }
    }

    setSaveModal({ warnings })
  }

  async function saveCanvas() {
    if (saveInProgressRef.current) return
    saveInProgressRef.current = true
    setSaving(true)
    setSaveModal(null)
    try {
      await api.canvas.save(flowId, {
        nodes: nodesRef.current.map(rfNodeToApiNode),
        edges: edgesRef.current.map(rfEdgeToApiEdge),
      })
      showSaveToast('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showSaveToast('error', msg)
      throw err
    } finally {
      saveInProgressRef.current = false
      setSaving(false)
    }
  }

  function showSaveToast(type: 'success' | 'error', message?: string) {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current)
    setSaveToast({ type, message })
    saveToastTimerRef.current = setTimeout(() => setSaveToast(null), type === 'success' ? 2500 : 4000)
  }

  async function triggerFlow(payload: Record<string, unknown>) {
    setNodeStatuses({})

    // Studio uses a two-step start:
    // 1) create the execution row
    // 2) start it only after the websocket is ready
    const exec = await api.executions.prepare(flowSlug, payload)
    // eslint-disable-next-line no-console
    console.info('[Studio] Execution prepared, id=', exec.id)

    // Store ID so onReady can start it once WS subscription is established
    pendingStartRef.current = exec.id
    pendingPayloadRef.current = payload

    // Setting executionId triggers useExecutionSocket to connect & subscribe
    setExecutionId(exec.id)
  }

  async function updateFlowName(name: string) {
    try {
      await api.flows.update(flowId, { name })
      setFlowName(name)
    } catch (e) {
      console.error('Failed to update flow name', e)
    }
  }

  function deleteSelectedNode() {
    if (!selectedNode) return
    const id = selectedNode.id
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    setSelectedNode(null)
    setSelectedEdge(null)
  }

  function deleteSelectedEdge() {
    if (!selectedEdge) return
    setEdges(eds => eds.filter(e => e.id !== selectedEdge.id))
    setSelectedEdge(null)
  }

  function beautifyLayout() {
    setNodes(ns => applyBeautifyLayout(ns, edges))
  }

  const handleAddNode = useCallback((nodeType: NodeKind) => {
    if (viewMode) return

    setNodes(ns => [
      ...ns,
      {
        id: crypto.randomUUID(),
        type: nodeType,
        position: { x: 0, y: 0 },
        data: {
          label: NODE_META[nodeType as keyof typeof NODE_META]?.label ?? nodeType,
          nodeType,
          config: {},
          liveStatus: null,
        },
      },
    ])
  }, [setNodes, viewMode])

  /* ───────────────────────── Render ───────────────────────── */

  if (loading) {
    return <MillennialLoader fullScreen label="Loading studio…" />
  }

  return (
    <div className="studio-root">
      <div className={`studio-sidebar-wrapper ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <NodeSidebar onAddNode={handleAddNode} />
      </div>

      <div className="studio-main">
        <StudioToolbar
          flowId={flowId}
          flowName={flowName}
          flowSlug={flowSlug}
          saving={saving}
          onSave={checkAndSave}
          onFlowNameChange={updateFlowName}
          onTrigger={triggerFlow}
          onBeautify={beautifyLayout}
          onOpenAI={() => setAiPanelOpen(true)}
          viewMode={viewMode}
        />

        <div className="studio-canvas-row">
          <div className="studio-canvas-wrap">
            <button
              type="button"
              className="studio-sidebar-toggle"
              onClick={() => setSidebarOpen(prev => !prev)}
            >
              <PanelLeftOpen size={16} />
            </button>
            <ReactFlowProvider>
              <StudioCanvas
                nodesWithStatus={nodesWithStatus}
                edges={edges}
                setNodes={setNodes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgesDelete={onEdgesDelete}
                nodeTypes={nodeTypes}
                setSelectedNode={setSelectedNode}
                setSelectedEdge={setSelectedEdge}
                viewMode={viewMode}
              />
            </ReactFlowProvider>
          </div>
        </div>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={nodes.find(n => n.id === selectedNode.id) ?? selectedNode}
          currentFlowId={flowId}
          onUpdate={viewMode ? () => {} : (data: Node['data']) =>
            setNodes(ns =>
              ns.map(n => (n.id === selectedNode.id ? { ...n, data } : n))
            )
          }
          onClose={() => setSelectedNode(null)}
          onRemove={viewMode ? undefined : deleteSelectedNode}
          readOnly={viewMode}
        />
      )}

      {selectedEdge && !selectedNode && (
        <EdgePanel
          edge={selectedEdge}
          nodes={nodes}
          onClose={() => setSelectedEdge(null)}
          onDelete={viewMode ? undefined : deleteSelectedEdge}
          viewMode={viewMode}
        />
      )}
      {aiPanelOpen && !viewMode && (
        <AIPanel
          onClose={() => setAiPanelOpen(false)}
          nodes={nodes}
          edges={edges}
          flowId={flowId}
        />
      )}

      {saveModal && (
        <SaveConfirmModal
          warnings={saveModal.warnings}
          onConfirm={saveCanvas}
          onCancel={() => setSaveModal(null)}
        />
      )}

      {saveToast && <SaveToast type={saveToast.type} message={saveToast.message} onDismiss={() => setSaveToast(null)} />}
    </div>
  )
}

/* ───────────────────────── Save Confirm Modal ───────────────────────── */

function SaveConfirmModal({ warnings, onConfirm, onCancel }: {
  warnings: string[]
  onConfirm: () => void
  onCancel:  () => void
}) {
  const hasWarnings = warnings.length > 0
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '0.875rem', padding: '1.75rem', width: '420px', maxWidth: 'calc(100vw - 2rem)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
          {hasWarnings ? '⚠️ Save anyway?' : 'Save flow?'}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: hasWarnings ? '1rem' : '1.5rem' }}>
          {hasWarnings
            ? 'The following issues were detected in your flow. You can still save, but the flow may not run correctly.'
            : 'Are you sure you want to save the current canvas?'}
        </p>

        {hasWarnings && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {warnings.map((w, i) => (
              <div key={i} style={{
                display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '0.5rem', padding: '0.625rem 0.75rem',
              }}>
                <span style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }}>⚠</span>
                <span style={{ fontSize: '0.775rem', color: '#fbbf24', lineHeight: 1.5 }}>{w}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 1.125rem', borderRadius: '0.5rem', fontSize: '0.825rem',
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.825rem',
              border: 'none',
              background: hasWarnings ? 'linear-gradient(135deg,#F59E0B,#d97706)' : 'var(--grad-accent)',
              color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {hasWarnings ? 'Save Anyway' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Save Toast ───────────────────────── */

function SaveToast({ type, message, onDismiss }: { type: 'success' | 'error'; message?: string; onDismiss: () => void }) {
  const isSuccess = type === 'success'
  const color     = isSuccess ? '#10b981' : '#ef4444'
  const bg        = isSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'
  const border    = isSuccess ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'

  return (
    <>
      <style>{`
        @keyframes saveToastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes saveToastOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0;  }
        }
        @keyframes drawCross {
          from { stroke-dashoffset: 30; }
          to   { stroke-dashoffset: 0;  }
        }
        .save-toast-wrap {
          animation: saveToastIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
      `}</style>
      <div
        className="save-toast-wrap"
        onClick={onDismiss}
        style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: bg, border: `1px solid ${border}`,
          borderRadius: '0.75rem', padding: '0.75rem 1.25rem',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${border}`,
          backdropFilter: 'blur(8px)',
          minWidth: '220px', maxWidth: '420px',
        }}
      >
        {isSuccess ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1.5" fill={bg} />
            <polyline
              points="6,11 9.5,14.5 16,8"
              stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              fill="none"
              strokeDasharray="40" strokeDashoffset="40"
              style={{ animation: 'drawCheck 0.35s ease-out 0.05s forwards' }}
            />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1.5" fill={bg} />
            <line x1="7" y1="7" x2="15" y2="15" stroke={color} strokeWidth="2.2" strokeLinecap="round"
              strokeDasharray="30" strokeDashoffset="30"
              style={{ animation: 'drawCross 0.25s ease-out 0.05s forwards' }} />
            <line x1="15" y1="7" x2="7" y2="15" stroke={color} strokeWidth="2.2" strokeLinecap="round"
              strokeDasharray="30" strokeDashoffset="30"
              style={{ animation: 'drawCross 0.25s ease-out 0.15s forwards' }} />
          </svg>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.825rem', fontWeight: 600, color }}>
            {isSuccess ? 'Flow saved' : 'Save failed'}
          </p>
          {message && (
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.725rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

/* ───────────────────────── Canvas ───────────────────────── */

function StudioCanvas({
  nodesWithStatus,
  edges,
  setNodes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgesDelete,
  nodeTypes,
  setSelectedNode,
  setSelectedEdge,
  viewMode,
}: {
  nodesWithStatus: Node[]
  edges: Edge[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  onNodesChange: OnNodesChange<Node>
  onEdgesChange: OnEdgesChange<Edge>
  onConnect: (c: Connection) => void
  onEdgesDelete: (edges: Edge[]) => void
  nodeTypes: NodeTypes
  setSelectedNode: (n: Node | null) => void
  setSelectedEdge: (e: Edge | null) => void
  viewMode: boolean
}) {
  const { screenToFlowPosition } = useReactFlow()

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    if (viewMode) return
    const nodeType = e.dataTransfer.getData('nodeType')
    if (!nodeType) return

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    setNodes(ns => [
      ...ns,
      {
        id: crypto.randomUUID(),
        type: nodeType,
        position,
        data: {
          label: NODE_META[nodeType as keyof typeof NODE_META]?.label ?? nodeType,
          nodeType,
          config: {},
          liveStatus: null,
        },
      },
    ])
  }

  return (
    <ReactFlow
      nodes={nodesWithStatus}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={viewMode ? undefined : onConnect}
      onEdgesDelete={viewMode ? undefined : onEdgesDelete}
      onNodeClick={(_, n) => { setSelectedNode(n); setSelectedEdge(null) }}
      onEdgeClick={(_, e) => { setSelectedEdge(e); setSelectedNode(null) }}
      onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null) }}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      fitView
      nodesDraggable={!viewMode}
      nodesConnectable={!viewMode}
      elementsSelectable
      deleteKeyCode={viewMode ? null : 'Backspace'}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2d45" />
      <Controls />
      <MiniMap nodeColor={n => NODE_META[n.type as keyof typeof NODE_META]?.color ?? '#4a5568'} />
    </ReactFlow>
  )
}

/* ───────────────────────── Edge Panel ───────────────────────── */

function EdgePanel({ edge, nodes, onClose, onDelete, viewMode }: {
  edge: Edge
  nodes: Node[]
  onClose: () => void
  onDelete?: () => void
  viewMode?: boolean
}) {
  const sourceLabel = nodes.find(n => n.id === edge.source)?.data?.label ?? edge.source
  const targetLabel = nodes.find(n => n.id === edge.target)?.data?.label ?? edge.target
  const conditionType = (edge.data as { conditionType?: string })?.conditionType ?? 'DEFAULT'

  return (
    <aside className="studio-config">
      <div className="studio-config-header">
        <span style={{ fontSize:'0.75rem', fontFamily:'var(--font-mono)', color:'var(--color-muted)', letterSpacing:'0.08em' }}>
          EDGE
        </span>
        <div className="flex items-center gap-1">
          {!viewMode && onDelete && (
            <button type="button" onClick={onDelete} className="config-panel-btn-ghost config-panel-btn-danger">
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} title="Close" className="config-panel-btn-ghost text-lg leading-none">
            ×
          </button>
        </div>
      </div>
      <div className="studio-config-body">
        <p className="config-panel-description mb-2" style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}><span className="text-muted">From:</span> {String(sourceLabel)}</p>
        <p className="config-panel-description mb-2" style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}><span className="text-muted">To:</span> {String(targetLabel)}</p>
        <p className="config-panel-description" style={{ color: 'var(--color-text)', marginBottom: 0 }}><span className="text-muted">Condition:</span> {conditionType}</p>
      </div>
    </aside>
  )
}

/* ───────────────────────── Beautify layout ───────────────────────── */

const LAYOUT_DX = 240
const LAYOUT_DY = 120

function applyBeautifyLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes
  const idToNode = new Map(nodes.map(n => [n.id, n]))
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  nodes.forEach(n => { outgoing.set(n.id, []); incoming.set(n.id, []) })
  edges.forEach(e => {
    outgoing.get(e.source)?.push(e.target)
    incoming.get(e.target)?.push(e.source)
  })

  const roots = nodes.filter(n => incoming.get(n.id)?.length === 0)
  const startNode = roots.find(n => n.type === 'START') ?? roots[0]
  const queue = startNode ? [startNode.id] : roots.map(n => n.id)
  const rest = roots.filter(n => !queue.includes(n.id))
  queue.push(...rest.map(n => n.id))
  const level = new Map<string, number>()
  queue.forEach(id => level.set(id, 0))
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    const d = level.get(id) ?? 0
    for (const targetId of outgoing.get(id) ?? []) {
      if (!level.has(targetId)) {
        level.set(targetId, d + 1)
        queue.push(targetId)
      }
    }
  }
  nodes.forEach(n => { if (!level.has(n.id)) level.set(n.id, 999) })

  const byLevel = new Map<number, Node[]>()
  nodes.forEach(n => {
    const L = level.get(n.id) ?? 999
    if (!byLevel.has(L)) byLevel.set(L, [])
    byLevel.get(L)!.push(n)
  })
  const levels = [...byLevel.keys()].sort((a, b) => a - b)
  levels.forEach(L => byLevel.get(L)!.sort((a, b) => a.id.localeCompare(b.id)))

  let y = 0
  const positioned = new Map<string, { x: number; y: number }>()
  levels.forEach(L => {
    const row = byLevel.get(L)!
    const rowWidth = (row.length - 1) * LAYOUT_DX
    let x = -rowWidth / 2
    row.forEach(n => {
      positioned.set(n.id, { x, y })
      x += LAYOUT_DX
    })
    y += LAYOUT_DY
  })

  return nodes.map(n => {
    const pos = positioned.get(n.id) ?? { x: 0, y: 0 }
    return { ...n, position: pos }
  })
}

/* ───────────────────────── Default START node ───────────────────────── */

const DEFAULT_START_NODE_ID = '00000000-0000-0000-0000-000000000001'

function createDefaultStartNode(): Node {
  return {
    id: DEFAULT_START_NODE_ID,
    type: 'START',
    position: { x: 260, y: 120 },
    data: {
      label: NODE_META.START.label,
      nodeType: 'START',
      config: {},
      liveStatus: null,
    },
  }
}

/* ───────────────────────── Converters ───────────────────────── */

function apiNodeToRfNode(n: ApiNode): Node {
  return {
    id: n.id,
    type: n.nodeType,
    position: { x: n.positionX, y: n.positionY },
    data: { label: n.label, nodeType: n.nodeType, config: n.config, liveStatus: null },
  }
}

function apiEdgeToRfEdge(e: ApiEdge): Edge {
  const sourceHandle = e.sourceHandle ?? (e.conditionType === 'FAILURE' ? 'failure' : e.conditionType === 'CONTINUE' ? 'continue' : undefined)
  const stroke = e.conditionType === 'CONTINUE' ? '#F59E0B' : (e.sourceHandle === 'failure' || e.conditionType === 'FAILURE') ? '#b91c1c' : '#15803d'
  const strokeDasharray = e.conditionType === 'CONTINUE' ? '6 3' : undefined
  return {
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: sourceHandle || undefined,
    targetHandle: e.targetHandle ?? undefined,
    type: 'smoothstep',
    data: { conditionType: e.conditionType },
    style: { stroke, strokeWidth: 2, ...(strokeDasharray ? { strokeDasharray } : {}) },
  }
}

function rfNodeToApiNode(n: Node): ApiNode {
  return {
    id: n.id,
    flowId: '',
    nodeType: n.data.nodeType as ApiNode['nodeType'],
    label: n.data.label as string,
    config: n.data.config as Record<string, unknown>,
    positionX: n.position.x,
    positionY: n.position.y,
  }
}

function rfEdgeToApiEdge(e: Edge): ApiEdge {
  // Persist which handle (success/failure) so reload keeps the correct connection
  const sourceHandle = e.sourceHandle ?? undefined
  const conditionType = (sourceHandle === 'failure'
    ? 'FAILURE'
    : sourceHandle === 'continue'
      ? 'CONTINUE'
      : sourceHandle === 'success'
        ? 'SUCCESS'
        : (e.data?.conditionType ?? 'DEFAULT')) as ApiEdge['conditionType']
  return {
    id: e.id,
    flowId: '',
    sourceNodeId: e.source,
    targetNodeId: e.target,
    sourceHandle,
    targetHandle: e.targetHandle ?? undefined,
    conditionType,
    conditionExpr: (e.data as { conditionExpr?: string })?.conditionExpr,
  }
}
