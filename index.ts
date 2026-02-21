// ─── Domain Types ──────────────────────────────────────────────────────────────
// Backend API uses UUIDs for FlowNode.id, FlowEdge.id, FlowEdge.sourceNodeId, FlowEdge.targetNodeId.
// Frontend must never send string IDs like "start" or "pulse_123" to the backend.

export type FlowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export type NodeType   = 'START' | 'PULSE' | 'VARIABLE' | 'MAPPER' | 'DECISION' | 'SUCCESS' | 'FAILURE'
export type EdgeCondition = 'SUCCESS' | 'FAILURE' | 'DEFAULT' | 'CUSTOM'
export type ExecStatus = 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT'
export type NodeStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'SKIPPED'

export interface Flow {
  id:          string
  name:        string
  description: string
  status:      FlowStatus
  createdAt:   string
  updatedAt:   string
}

/** Backend node: id is always a UUID. */
export interface FlowNode {
  id:        string   // UUID
  flowId:    string
  nodeType:  NodeType
  label:     string
  config:    Record<string, unknown>
  positionX: number
  positionY: number
}

/** Backend edge: id, sourceNodeId, targetNodeId are always UUIDs. */
export interface FlowEdge {
  id:             string   // UUID
  flowId:         string
  sourceNodeId:   string   // UUID
  targetNodeId:   string   // UUID
  conditionType:  EdgeCondition
  conditionExpr?: string
}

export interface Execution {
  id:          string
  flowId:      string
  status:      ExecStatus
  triggeredBy: string
  startedAt:   string
  completedAt: string
}

// ─── Canvas Save/Load ──────────────────────────────────────────────────────────

export interface CanvasData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

// ─── WebSocket Event ───────────────────────────────────────────────────────────

export interface NodeExecutionEvent {
  nodeId:  string
  status:  NodeStatus
  error:   string
}
