// ─── ENUMS ─────────────────────────────────────────────────────────────────────

// Flow lifecycle
export type FlowStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ARCHIVED'

// Node kinds supported by the engine (HTTP Call = NEXUS with inline url or connector)
export type NodeType =
  | 'START'
  | 'NEXUS'
  | 'SUB_FLOW'
  | 'SCRIPT'
  | 'VARIABLE'
  | 'MAPPER'
  | 'DECISION'
  | 'LOOP'
  | 'SUCCESS'
  | 'FAILURE'

// Edge routing rules
export type EdgeCondition =
  | 'SUCCESS'
  | 'FAILURE'
  | 'CONTINUE'   // LOOP node: route back to loop body
  | 'DEFAULT'
  | 'CUSTOM'

// Execution lifecycle
export type ExecStatus =
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'TIMEOUT'

// Per-node runtime status
export type NodeStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'CONTINUE'   // LOOP node: keep looping
  | 'SKIPPED'
  | 'RETRYING'

// Nexus authentication modes
export type AuthType =
  | 'NONE'
  | 'BEARER'
  | 'API_KEY'
  | 'BASIC'

// Nexus connector kinds
export type ConnectorType =
  | 'REST'
  | 'JDBC'

// HTTP methods for REST connectors
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'

// JDBC query kinds
export type QueryType =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'

// Sub-flow execution mode
export type SubFlowMode =
  | 'SYNC'
  | 'ASYNC'

/* ============================================================================
   DOMAIN TYPES
   Backend is the source of truth.
   All IDs (FlowNode.id, FlowEdge.id, sourceNodeId, targetNodeId) are UUIDs.
   Frontend must NEVER send synthetic IDs like "start" or "pulse_123".
   ========================================================================== */

// ─── Flow ─────────────────────────────────────────────────────────────────────

export interface Flow {
  id:          string            // UUID
  name:        string
  slug:        string            // public trigger key (e.g. authService)
  description: string
  status:      FlowStatus
  createdAt:   string
  updatedAt:   string
}

// ─── Flow Node ────────────────────────────────────────────────────────────────

/** Backend node: id is always a UUID. */
export interface FlowNode {
  id:        string              // UUID
  flowId:    string              // UUID
  nodeType:  NodeType
  label:     string
  config:    Record<string, unknown>
  positionX: number
  positionY: number
}

// ─── Flow Edge ────────────────────────────────────────────────────────────────

/** Backend edge: id, sourceNodeId, targetNodeId are always UUIDs. */
export interface FlowEdge {
  id:             string         // UUID
  flowId:         string         // UUID
  sourceNodeId:   string         // UUID
  targetNodeId:   string         // UUID
  sourceHandle?: string         // e.g. "success" | "failure" for dual-output nodes
  targetHandle?: string
  conditionType:  EdgeCondition
  conditionExpr?: string
}

// ─── Execution ────────────────────────────────────────────────────────────────

export interface Execution {
  id:          string            // UUID
  flowId:      string            // UUID
  status:      ExecStatus
  triggeredBy: string            // MANUAL | PULSE | SCHEDULE
  startedAt:   string
  completedAt: string
}

// ─── Execution Summary (Transactions list) ────────────────────────────────────

export interface ExecutionSummary {
  id:          string
  flowId:      string
  flowName:    string
  flowSlug:    string
  status:      ExecStatus
  triggeredBy: string
  startedAt:   string
  completedAt: string
  durationMs:  number
}

// ─── Execution Detail (includes NCO snapshot) ─────────────────────────────────

export interface ExecutionDetail extends ExecutionSummary {
  ncoSnapshot: NcoSnapshot | null
}

// ─── Nex (universal output container) ────────────────────────────────────────

/** The nex map from a completed transaction. Keys are saveOutputAs names; values are node outputs. */
export interface NexMap {
  [key: string]: unknown
}

// ─── NCO Snapshot (Execution Memory) ──────────────────────────────────────────

export interface NcoSnapshot {
  /** Everything saved via "Save output as" in this execution. */
  nex?: NexMap
  meta?: {
    flowId:        string
    executionId:   string
    currentNodeId?: string
    startedAt?:    string
    completedAt?:  string
    status:        ExecStatus
  }
  variables?: Record<string, unknown>
  nodes?:     Record<string, NodeLog>
  nodeExecutionOrder?: string[]
  /** Set by backend when execution failed before any node ran (e.g. flow has no START node) */
  error?:     string
}

// Per-node execution log inside NCO
export interface NodeLog {
  nodeId:         string
  nodeType:       NodeType
  status:         NodeStatus
  input?:         Record<string, unknown>
  output?:        Record<string, unknown>
  successOutput?: Record<string, unknown>
  failureOutput?: Record<string, unknown>
  errorMessage?:  string
}

// ─── Canvas Save / Load ───────────────────────────────────────────────────────

export interface CanvasData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

// ─── WebSocket Event ──────────────────────────────────────────────────────────

export interface NodeExecutionEvent {
  nodeId: string
  status: NodeStatus
  error:  string
}

// ─── Nexus Connector (Reusable integration definition) ────────────────────────

export interface NexusConnector {
  id?:             string
  name:            string
  description?:    string
  connectorType:   ConnectorType

  // REST mode
  baseUrl?:        string
  authType?:       AuthType
  defaultHeaders?: Record<string, string>
  /** API may return as "headers" (alias for defaultHeaders) */
  headers?:        Record<string, string>
  body?:           Record<string, string>
  queryParams?:    Record<string, string>
  authConfig?:     Record<string, string>

  // JDBC mode
  jdbcUrl?:        string
  jdbcDriver?:     string
  dbUsername?:     string
  dbPassword?:     string

  createdAt?:      string
  updatedAt?:      string
}

// ─── Config stored inside a NEXUS node ────────────────────────────────────────

export interface NexusNodeConfig {
  connectorId?:   string
  connectorName?: string
  connectorType?: ConnectorType

  // Inline HTTP (no connector): full URL
  url?:     string
  method?:  HttpMethod
  headers?: Record<string, string>
  body?:    Record<string, string>

  // REST (with connector): path relative to connector baseUrl
  path?:    string

  // JDBC
  query?:     string
  queryType?: QueryType
}

// ─── Config stored inside a SCRIPT node ───────────────────────────────────────

export type ScriptLanguage = 'javascript' | 'python'

export interface ScriptNodeConfig {
  language: ScriptLanguage
  code:     string
}

// ─── Config stored inside a SUB_FLOW node ─────────────────────────────────────

export interface SubFlowNodeConfig {
  targetFlowId:   string
  targetFlowName: string   // denormalized for card preview
  targetFlowSlug: string   // denormalized for display
  mode:           SubFlowMode   // SYNC | ASYNC

  // Payload passed to child flow's START node
  // Values support {{}} references resolved against parent NCO
  payload: Record<string, string>
}

// ─── Config stored inside a LOOP node ─────────────────────────────────────────

export interface LoopNodeConfig {
  condition:     string   // e.g. "{{loop.index}} < 5"
  maxIterations: number   // default 100
  description?:  string   // optional note
}