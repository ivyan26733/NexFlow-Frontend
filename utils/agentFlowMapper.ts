import type { Node, Edge } from '@xyflow/react'
import type { AgentFlow } from '../services/agentService'

/**
 * Assign (x,y) positions using a simple BFS from a START / TRIGGER node.
 * This is a basic layout just to make generated flows readable.
 */
function assignPositions(
  nodes: AgentFlow['nodes'],
  edges: AgentFlow['edges'],
): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>()
  const adj = new Map<string, string[]>()

  edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  })

  const visited = new Set<string>()
  const start =
    nodes.find(n => n.type === 'START' || n.type === 'TRIGGER') ??
    nodes[0]

  if (!start) return pos

  const queue: Array<{ id: string; depth: number; col: number }> = [
    { id: start.id, depth: 0, col: 0 },
  ]

  while (queue.length > 0) {
    const { id, depth, col } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    pos.set(id, {
      x: 260 + col * 280,
      y: 80 + depth * 160,
    })

    const children = adj.get(id) || []
    children.forEach((childId, idx) => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, depth: depth + 1, col: idx })
      }
    })
  }

  // Any disconnected nodes go to the right
  nodes.forEach((node, i) => {
    if (!pos.has(node.id)) {
      pos.set(node.id, { x: 900, y: 80 + i * 160 })
    }
  })

  return pos
}

/**
 * Map agent flow → ReactFlow nodes/edges.
 * Matches the data shape used in Studio (`apiNodeToRfNode`).
 */
export function mapAgentFlowToReactFlow(
  agentFlow: AgentFlow,
): { nodes: Node[]; edges: Edge[] } {
  const positions = assignPositions(agentFlow.nodes, agentFlow.edges)

  const nodes: Node[] = agentFlow.nodes.map(node => ({
    id:       node.id,
    type:     node.type as Node['type'],
    position: positions.get(node.id) ?? { x: 260, y: 80 },
    data: {
      label:      node.label,
      nodeType:   node.type,
      config:     node.config ?? {},
      liveStatus: null,
    },
  }))

  const edges: Edge[] = agentFlow.edges.map(edge => ({
    id:           edge.id,
    source:       edge.source,
    target:       edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: undefined,
    type:         'smoothstep',
    data:         { conditionType: 'DEFAULT' },
  }))

  return { nodes, edges }
}

export function loadAgentFlowOnCanvas(
  agentFlow: AgentFlow,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
): void {
  if (!agentFlow?.nodes?.length) {
    // eslint-disable-next-line no-console
    console.warn('[AgentFlowMapper] Flow has no nodes — nothing to load')
    return
  }

  const { nodes, edges } = mapAgentFlowToReactFlow(agentFlow)
  setNodes(nodes)
  setEdges(edges)

  // eslint-disable-next-line no-console
  console.log(
    `[AgentFlowMapper] Loaded: ${nodes.length} nodes, ${edges.length} edges`,
  )
}

