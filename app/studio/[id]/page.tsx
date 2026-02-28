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
import { NODE_META } from '@/lib/nodeConfig'
import type {
  NodeStatus,
  NodeExecutionEvent,
  FlowNode as ApiNode,
  FlowEdge as ApiEdge,
} from '@/types'

import NodeSidebar     from '@/NodeSidebar'
import NodeConfigPanel from '@/NodeConfigPanel'
import StudioToolbar   from '@/StudioToolbar'
import { FlowNodeCard } from '@/FlowNodeCard'
import { MillennialLoader } from '@/MillennialLoader'

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
  SUCCESS:  FlowNodeCard,
  FAILURE:  FlowNodeCard,
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
  const [saving,       setSaving]       = useState(false)

  const [flowName, setFlowName] = useState('')
  const [flowSlug, setFlowSlug] = useState('')

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // refs → avoid stale closure during save + prevent double-save
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const saveInProgressRef = useRef(false)
  nodesRef.current = nodes
  edgesRef.current = edges

  /* ───────────────────────── Load flow ───────────────────────── */

  useEffect(() => {
    setLoading(true)
    async function load() {
      const [flow, canvas] = await Promise.all([
        api.flows.get(flowId),
        api.canvas.load(flowId),
      ])
      setFlowName(flow.name)
      setFlowSlug(flow.slug)
      let initialNodes = canvas.nodes.map(apiNodeToRfNode)
      const hasStart = initialNodes.some(n => n.type === 'START')
      if (!hasStart) {
        initialNodes = [createDefaultStartNode(), ...initialNodes]
      }
      setNodes(initialNodes)
      setEdges(canvas.edges.map(apiEdgeToRfEdge))
    }
    load().catch(console.error).finally(() => setLoading(false))
  }, [flowId])

  /* ───────────────────────── Live execution ───────────────────────── */

  useExecutionSocket({
    executionId,
    onEvent: (ev: NodeExecutionEvent) =>
      setNodeStatuses(prev => ({ ...prev, [ev.nodeId]: ev.status })),
  })

  const nodesWithStatus = nodes.map(n => ({
    ...n,
    data: { ...n.data, liveStatus: nodeStatuses[n.id] ?? null },
  }))

  /* ───────────────────────── Edge connect ───────────────────────── */

  const onConnect = useCallback((c: Connection) => {
    const sourceHandle = c.sourceHandle ?? undefined
    const conditionType = sourceHandle === 'continue' ? 'CONTINUE' : sourceHandle === 'failure' ? 'FAILURE' : 'SUCCESS'
    const style = conditionType === 'CONTINUE'
      ? { stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: '6 3' }
      : conditionType === 'FAILURE'
        ? { stroke: '#ff4444', strokeWidth: 2 }
        : { stroke: '#00e676', strokeWidth: 2 }
    setEdges(eds =>
      addEdge(
        {
          ...c,
          id: crypto.randomUUID(),
          type: 'smoothstep',
          data: { conditionType },
          style,
        },
        eds
      )
    )
  }, [])

  /* ───────────────────────── Actions ───────────────────────── */

  async function saveCanvas() {
    if (saveInProgressRef.current) return
    saveInProgressRef.current = true
    setSaving(true)
    try {
      await api.canvas.save(flowId, {
        nodes: nodesRef.current.map(rfNodeToApiNode),
        edges: edgesRef.current.map(rfEdgeToApiEdge),
      })
    } finally {
      saveInProgressRef.current = false
      setSaving(false)
    }
  }

  async function triggerFlow(payload: Record<string, unknown>) {
    const exec = await api.executions.triggerBySlug(flowSlug, payload, true)
    setNodeStatuses({})
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

  /* ───────────────────────── Render ───────────────────────── */

  if (loading) {
    return <MillennialLoader fullScreen label="Loading studio…" />
  }

  return (
    <div className="studio-root">
      <div className={`studio-sidebar-wrapper ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <NodeSidebar />
      </div>

      <div className="studio-main">
        <StudioToolbar
          flowId={flowId}
          flowName={flowName}
          flowSlug={flowSlug}
          saving={saving}
          onSave={saveCanvas}
          onFlowNameChange={updateFlowName}
          onTrigger={triggerFlow}
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
    </div>
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
  const stroke = e.conditionType === 'CONTINUE' ? '#F59E0B' : (e.sourceHandle === 'failure' || e.conditionType === 'FAILURE') ? '#ff4444' : '#00e676'
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