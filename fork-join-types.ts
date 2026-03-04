// Fork / Join parallel execution feature types.
// Copied from files/fork-join-types.ts and wired into the Frontend types barrel.

/** How the JOIN node decides when to stop waiting. */
export type JoinStrategy = 'WAIT_ALL' | 'WAIT_FIRST' | 'WAIT_N'

/** What to do if a branch fails. */
export type BranchFailureMode = 'FAIL_FAST' | 'CONTINUE'

/** What to do if the timeout fires before all branches complete. */
export type TimeoutMode = 'FAIL' | 'CONTINUE_WITH_PARTIAL'

/** Lifecycle states for a single branch. */
export type BranchStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'TIMEOUT'
  | 'CANCELLED'

/** Config stored on a FORK node. Editable in ForkConfig panel. */
export interface ForkNodeConfig {
  /** Ordered list of branch identifiers — must be unique within the node. */
  branches: string[]
  /** Join strategy — how many branches to wait for before continuing. */
  strategy: JoinStrategy
  /** Only used when strategy = WAIT_N — how many branches to wait for. */
  waitForCount?: number
  /** Seconds before FORK times out waiting for branches. Default: 60. */
  timeoutSeconds: number
  /** What to do when a branch fails. Default: FAIL_FAST. */
  onBranchFailure: BranchFailureMode
  /** What to do on timeout. Default: FAIL. */
  onTimeout: TimeoutMode
}

/** Config stored on a JOIN node. Editable in JoinConfig panel. */
export interface JoinNodeConfig {
  /** ID of the paired FORK node — set automatically when connecting on canvas. */
  forkNodeId: string
  /** Display label override for the JOIN node. */
  mergeLabel?: string
}

/** Live event emitted when a branch changes state during execution. */
export interface BranchExecutionEvent {
  executionId: string
  forkNodeId:  string
  branchName:  string
  status:      BranchStatus
  durationMs?: number
  error?:      string
  // Discriminator used by the WebSocket subscriber
  type?:       'BRANCH_EVENT'
}

/** Runtime metadata written to nex.join after all branches complete. */
export interface JoinMeta {
  totalParallelMs: number
  strategy:        JoinStrategy
  branchCount:     number
  /** Per-branch timing and status — indexed by branch name. */
  [branchName: string]: unknown
}

/** Shape of nex.join.{branchName} after fork-join completes. */
export interface BranchMeta {
  status:     BranchStatus
  durationMs: number
  error?:     string
}

/** Data passed to ForkJoinNodeCard via ReactFlow NodeProps.data. */
export interface ForkJoinNodeData {
  label:       string
  nodeType:    'FORK' | 'JOIN'
  config:      ForkNodeConfig | JoinNodeConfig
  liveStatus?: string
  /** Branch statuses during live execution — populated from BranchExecutionEvents. */
  branchStatuses?: Record<string, BranchStatus>
}

