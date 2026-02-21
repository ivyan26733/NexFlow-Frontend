'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  ReactFlow, ReactFlowProvider, useReactFlow,
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type NodeTypes, type Edge, type Node,
  type OnNodesChange, type OnEdgesChange,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { api } from '@/api'
import { useExecutionSocket } from '@/useExecutionSocket'
import { NODE_META } from '@/lib/nodeConfig'
import type { NodeStatus, NodeExecutionEvent, FlowNode as ApiNode, FlowEdge as ApiEdge } from '@/types'

import NodeSidebar     from '@/NodeSidebar'
import NodeConfigPanel from '@/NodeConfigPanel'
import StudioToolbar   from '@/StudioToolbar'
import { FlowNodeCard } from '@/FlowNodeCard'

const nodeTypes: NodeTypes = {
  START: FlowNodeCard, PULSE: FlowNodeCard, VARIABLE: FlowNodeCard,
  MAPPER: FlowNodeCard, DECISION: FlowNodeCard, SUCCESS: FlowNodeCard, FAILURE: FlowNodeCard,
}

export default function StudioPage() {
  const { id: flowId } = useParams<{ id: string }>()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode,  setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge,  setSelectedEdge] = useState<Edge | null>(null)
  const [executionId,   setExecutionId]  = useState<string | null>(null)
  const [nodeStatuses,  setNodeStatuses] = useState<Record<string, NodeStatus>>({})
  const [saving,        setSaving]       = useState(false)
  const [flowName,      setFlowName]     = useState('')

  // Refs so save always uses latest nodes/edges (avoids stale closure)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  useEffect(() => {
    async function load() {
      const [flow, canvas] = await Promise.all([
        api.flows.get(flowId),
        api.canvas.load(flowId),
      ])
      setFlowName(flow.name)
      setNodes(canvas.nodes.map(apiNodeToRfNode))
      setEdges(canvas.edges.map(apiEdgeToRfEdge))
    }
    load().catch(console.error)
  }, [flowId])

  useExecutionSocket({
    executionId,
    onEvent: (ev: NodeExecutionEvent) => setNodeStatuses(prev => ({ ...prev, [ev.nodeId]: ev.status })),
  })

  const nodesWithStatus = nodes.map(n => ({
    ...n, data: { ...n.data, liveStatus: nodeStatuses[n.id] ?? null },
  }))

  const onConnect = useCallback((c: Connection) => {
    setEdges(eds => addEdge({
      ...c, id: crypto.randomUUID(), type: 'smoothstep',
      data: { conditionType: 'SUCCESS' },
      style: { stroke: '#00e676', strokeWidth: 2 },
    }, eds))
  }, [setEdges])

  async function saveCanvas() {
    setSaving(true)
    try {
      const latestNodes = nodesRef.current
      const latestEdges = edgesRef.current
      await api.canvas.save(flowId, {
        nodes: latestNodes.map(rfNodeToApiNode),
        edges: latestEdges.map(rfEdgeToApiEdge),
      })
    } finally { setSaving(false) }
  }

  async function triggerFlow(payload: Record<string, unknown>) {
    const exec = await api.executions.trigger(flowId, payload)
    setNodeStatuses({})
    setExecutionId(exec.id)
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

  return (
    <div className="studio-root">
      <NodeSidebar />
      <div className="studio-main">
        <StudioToolbar
          flowName={flowName}
          saving={saving}
          onSave={saveCanvas}
          onTrigger={triggerFlow}
        />
        <div className="studio-canvas-row">
          <div className="studio-canvas-wrap">
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
                selectedEdge={selectedEdge}
              />
            </ReactFlowProvider>
          </div>
        </div>
      </div>
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={(data: Node['data']) => setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, data } : n))}
          onClose={() => setSelectedNode(null)}
          onRemove={deleteSelectedNode}
        />
      )}
      {selectedEdge && !selectedNode && (
        <EdgePanel
          edge={selectedEdge}
          nodes={nodes}
          onClose={() => setSelectedEdge(null)}
          onDelete={deleteSelectedEdge}
        />
      )}
    </div>
  )
}

// Inner canvas: uses useReactFlow for correct drop position (flow coordinates)
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
  selectedEdge,
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
  selectedEdge: Edge | null
}) {
  const { screenToFlowPosition } = useReactFlow()

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('nodeType')
    if (!nodeType) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setNodes(ns => [...ns, {
      id: crypto.randomUUID(),
      type: nodeType,
      position,
      data: {
        label: NODE_META[nodeType as keyof typeof NODE_META]?.label ?? nodeType,
        nodeType,
        config: {},
        liveStatus: null,
      },
    }])
  }

  return (
    <ReactFlow
      nodes={nodesWithStatus}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, n) => { setSelectedNode(n); setSelectedEdge(null) }}
      onEdgeClick={(_, e) => { setSelectedEdge(e); setSelectedNode(null) }}
      onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null) }}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      fitView
      deleteKeyCode="Backspace"
      elementsSelectable
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2d45" />
      <Controls />
      <MiniMap nodeColor={n => NODE_META[n.type as keyof typeof NODE_META]?.color ?? '#4a5568'} />
    </ReactFlow>
  )
}

// ── Edge panel (when an edge is selected) ─────────────────────────────────────
function EdgePanel({
  edge,
  nodes,
  onClose,
  onDelete,
}: {
  edge: Edge
  nodes: Node[]
  onClose: () => void
  onDelete: () => void
}) {
  const sourceLabel = nodes.find(n => n.id === edge.source)?.data?.label ?? edge.source
  const targetLabel = nodes.find(n => n.id === edge.target)?.data?.label ?? edge.target
  const conditionType = (edge.data as { conditionType?: string })?.conditionType ?? 'DEFAULT'

  return (
    <aside className="studio-config">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.1em' }}>EDGE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button type="button" onClick={onDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', background: 'var(--color-panel)', color: 'var(--color-failure)', cursor: 'pointer' }} aria-label="Delete edge">
            Delete edge
          </button>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: 4 }} aria-label="Close">
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</span>
          </button>
        </div>
      </div>
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>From</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{String(sourceLabel)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>To</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{String(targetLabel)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Condition</p>
          <p style={{ fontSize: '0.875rem', color: conditionType === 'FAILURE' ? 'var(--color-failure)' : 'var(--color-success)' }}>{conditionType}</p>
        </div>
      </div>
    </aside>
  )
}

// ── Converters ────────────────────────────────────────────────────────────────

function apiNodeToRfNode(n: ApiNode): Node {
  return {
    id: n.id, type: n.nodeType,
    position: { x: n.positionX, y: n.positionY },
    data: { label: n.label, nodeType: n.nodeType, config: n.config, liveStatus: null },
  }
}
function apiEdgeToRfEdge(e: ApiEdge): Edge {
  return {
    id: e.id, source: e.sourceNodeId, target: e.targetNodeId, type: 'smoothstep',
    data: { conditionType: e.conditionType },
    style: { stroke: e.conditionType === 'FAILURE' ? '#ff4444' : '#00e676', strokeWidth: 2 },
  }
}
function rfNodeToApiNode(n: Node): ApiNode {
  return {
    id: n.id, flowId: '', nodeType: n.data.nodeType as ApiNode['nodeType'],
    label: n.data.label as string, config: n.data.config as Record<string, unknown>,
    positionX: n.position.x, positionY: n.position.y,
  }
}
function rfEdgeToApiEdge(e: Edge): ApiEdge {
  return {
    id: e.id,
    flowId: '',
    sourceNodeId: e.source,
    targetNodeId: e.target,
    conditionType: (e.data?.conditionType ?? 'DEFAULT') as ApiEdge['conditionType'],
    conditionExpr: (e.data as { conditionExpr?: string })?.conditionExpr,
  }
}