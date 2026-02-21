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

/* ───────────────────────── Node Types ───────────────────────── */

const nodeTypes: NodeTypes = {
  START:    FlowNodeCard,
  PULSE:    FlowNodeCard,
  NEXUS:    FlowNodeCard,
  SUB_FLOW: FlowNodeCard,
  VARIABLE: FlowNodeCard,
  MAPPER:   FlowNodeCard,
  DECISION: FlowNodeCard,
  SUCCESS:  FlowNodeCard,
  FAILURE:  FlowNodeCard,
}

/* ───────────────────────── Page ───────────────────────── */

export default function StudioPage() {
  const { id: flowId } = useParams<{ id: string }>()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)

  const [executionId,  setExecutionId]  = useState<string | null>(null)
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({})
  const [saving,       setSaving]       = useState(false)

  const [flowName, setFlowName] = useState('')
  const [flowSlug, setFlowSlug] = useState('')

  // refs → avoid stale closure during save
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  /* ───────────────────────── Load flow ───────────────────────── */

  useEffect(() => {
    async function load() {
      const [flow, canvas] = await Promise.all([
        api.flows.get(flowId),
        api.canvas.load(flowId),
      ])
      setFlowName(flow.name)
      setFlowSlug(flow.slug)
      setNodes(canvas.nodes.map(apiNodeToRfNode))
      setEdges(canvas.edges.map(apiEdgeToRfEdge))
    }
    load().catch(console.error)
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
    setEdges(eds =>
      addEdge(
        {
          ...c,
          id: crypto.randomUUID(),
          type: 'smoothstep',
          data: { conditionType: 'SUCCESS' },
          style: { stroke: '#00e676', strokeWidth: 2 },
        },
        eds
      )
    )
  }, [])

  /* ───────────────────────── Actions ───────────────────────── */

  async function saveCanvas() {
    setSaving(true)
    try {
      await api.canvas.save(flowId, {
        nodes: nodesRef.current.map(rfNodeToApiNode),
        edges: edgesRef.current.map(rfEdgeToApiEdge),
      })
    } finally {
      setSaving(false)
    }
  }

  async function triggerFlow(payload: Record<string, unknown>) {
    const exec = await api.executions.triggerBySlug(flowSlug, payload)
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

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <div className="studio-root">
      <NodeSidebar />

      <div className="studio-main">
        <StudioToolbar
          flowName={flowName}
          flowSlug={flowSlug}
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
              />
            </ReactFlowProvider>
          </div>
        </div>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          currentFlowId={flowId}
          onUpdate={(data: Node['data']) =>
            setNodes(ns =>
              ns.map(n => (n.id === selectedNode.id ? { ...n, data } : n))
            )
          }
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
}) {
  const { screenToFlowPosition } = useReactFlow()

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
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

/* ───────────────────────── Edge Panel ───────────────────────── */

function EdgePanel({ edge, nodes, onClose, onDelete }: {
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
      <div style={{ display:'flex', justifyContent:'space-between', padding:'1rem 1.25rem', borderBottom:'1px solid var(--color-border)' }}>
        <span style={{ fontSize:'0.75rem', fontFamily:'var(--font-mono)', color:'var(--color-muted)' }}>
          EDGE
        </span>
        <div>
          <button onClick={onDelete} style={{ color:'var(--color-failure)' }}>
            Delete
          </button>
          <button onClick={onClose}>×</button>
        </div>
      </div>
      <div style={{ padding:'1.25rem' }}>
        <p>From: {String(sourceLabel)}</p>
        <p>To: {String(targetLabel)}</p>
        <p>Condition: {conditionType}</p>
      </div>
    </aside>
  )
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
  const sourceHandle = e.sourceHandle ?? (e.conditionType === 'FAILURE' ? 'failure' : undefined)
  const stroke = (e.sourceHandle === 'failure' || e.conditionType === 'FAILURE') ? '#ff4444' : '#00e676'
  return {
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: sourceHandle || undefined,
    targetHandle: e.targetHandle ?? undefined,
    type: 'smoothstep',
    data: { conditionType: e.conditionType },
    style: { stroke, strokeWidth: 2 },
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