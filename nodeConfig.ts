import type { NodeType } from '@/types'

/**
 * Visual language of the canvas.
 *
 * Every node belongs to exactly one CATEGORY, and the category alone decides its colour.
 * Colour therefore always answers one question: "what kind of work does this step do?"
 * Run results (success / failure) are shown on the transaction page, not on the canvas.
 *
 * All category colours pass WCAG AA (≥ 4.5:1) as text on white.
 */
export type NodeCategory =
  | 'TRIGGER'   // where data enters the flow
  | 'CONNECT'   // talks to the outside world (APIs, databases, other flows)
  | 'DATA'      // shapes or stores values, no side effects
  | 'LOGIC'     // decides where execution goes next
  | 'CODE'      // runs user code
  | 'AI'        // asks a language model
  | 'PARALLEL'  // splits or merges concurrent branches
  | 'OUTCOME'   // ends the flow

export interface CategoryMeta {
  label:   string
  color:   string   // solid — icon, border, handle, minimap
  tint:    string   // very light wash of the same hue — icon tile / chip background
  meaning: string   // one-line answer to "why is this colour?"
}

export const CATEGORY_META: Record<NodeCategory, CategoryMeta> = {
  TRIGGER:  { label: 'Trigger',  color: '#C2410C', tint: '#FFF1E8', meaning: 'Where data enters the flow' },
  CONNECT:  { label: 'Connect',  color: '#1D4ED8', tint: '#EAF0FF', meaning: 'Calls the outside world — APIs, databases, flows' },
  DATA:     { label: 'Data',     color: '#0F766E', tint: '#E6F6F4', meaning: 'Shapes values — no side effects' },
  LOGIC:    { label: 'Logic',    color: '#BE185D', tint: '#FDEBF3', meaning: 'Decides which path runs next' },
  CODE:     { label: 'Code',     color: '#334155', tint: '#EEF1F5', meaning: 'Runs your JavaScript or Python' },
  AI:       { label: 'AI',       color: '#7C3AED', tint: '#F3EEFF', meaning: 'Asks a language model' },
  PARALLEL: { label: 'Parallel', color: '#A16207', tint: '#FDF6E3', meaning: 'Runs branches at the same time' },
  OUTCOME:  { label: 'Outcome',  color: '#15803D', tint: '#E8F7EE', meaning: 'Ends the flow with a result' },
}

export interface NodeMeta {
  label:       string
  category:    NodeCategory
  color:       string       // solid accent (category colour; outcome nodes use their own result colour)
  bgColor:     string       // light tint of `color`
  description: string       // what the node does — shown in the palette and tooltips
  isTerminal:  boolean
}

function meta(
  label: string,
  category: NodeCategory,
  description: string,
  opts: { isTerminal?: boolean; color?: string; tint?: string } = {},
): NodeMeta {
  const c = CATEGORY_META[category]
  return {
    label,
    category,
    color:      opts.color ?? c.color,
    bgColor:    opts.tint ?? c.tint,
    description,
    isTerminal: opts.isTerminal ?? false,
  }
}

// Single source of truth for how each node looks in the palette, on the canvas and in the minimap.
export const NODE_META: Record<NodeType, NodeMeta> = {
  START:    meta('Start',    'TRIGGER',  'Entry point — receives the trigger payload'),
  NEXUS:    meta('Nexus',    'CONNECT',  'Call a saved connector or inline HTTP / SQL request'),
  SUB_FLOW: meta('Sub-Flow', 'CONNECT',  'Run another flow — wait for it (SYNC) or fire & forget (ASYNC)'),
  VARIABLE: meta('Variable', 'DATA',     'Set static values or capture earlier outputs'),
  MAPPER:   meta('Mapper',   'DATA',     'Build a new object from earlier data'),
  DECISION: meta('Decision', 'LOGIC',    'Take the success or failure path based on a condition'),
  LOOP:     meta('Loop',     'LOGIC',    'Repeat a section until the condition is false'),
  SCRIPT:   meta('Script',   'CODE',     'Run JavaScript or Python with input.variables / input.nodes'),
  AI:       meta('AI',       'AI',       'Transform, extract or classify data with any LLM'),
  FORK:     meta('Fork',     'PARALLEL', 'Split into branches that run at the same time'),
  JOIN:     meta('Join',     'PARALLEL', 'Wait for parallel branches and merge their results'),
  SUCCESS:  meta('Success',  'OUTCOME',  'End the flow as successful', { isTerminal: true }),
  FAILURE:  meta('Failure',  'OUTCOME',  'End the flow as failed',     { isTerminal: true, color: '#B91C1C', tint: '#FDECEC' }),
}

// This list drives the draggable sidebar order.
export const DRAGGABLE_NODES: NodeType[] = [
  'NEXUS', 'SUB_FLOW', 'VARIABLE', 'MAPPER', 'DECISION', 'LOOP',
  'SCRIPT', 'AI', 'FORK', 'JOIN', 'SUCCESS', 'FAILURE',
]

// Palette sections — one per category, in the order a flow is usually built.
export const NODE_GROUPS: { category: NodeCategory; label: string; types: NodeType[] }[] = [
  { category: 'CONNECT',  label: 'Connect',  types: ['NEXUS', 'SUB_FLOW'] },
  { category: 'DATA',     label: 'Data',     types: ['VARIABLE', 'MAPPER'] },
  { category: 'LOGIC',    label: 'Logic',    types: ['DECISION', 'LOOP'] },
  { category: 'CODE',     label: 'Code',     types: ['SCRIPT'] },
  { category: 'AI',       label: 'AI',       types: ['AI'] },
  { category: 'PARALLEL', label: 'Parallel', types: ['FORK', 'JOIN'] },
  { category: 'OUTCOME',  label: 'Outcome',  types: ['SUCCESS', 'FAILURE'] },
]

/**
 * Edge semantics — the line itself tells you which path it is,
 * even in greyscale (solid / dashed / dotted), not only by colour.
 */
export type EdgeKind = 'success' | 'failure' | 'continue' | 'branch' | 'default'

export const EDGE_STYLE: Record<EdgeKind, { color: string; dash?: string; label: string; meaning: string }> = {
  success:  { color: '#15803D', label: 'on success', meaning: 'Runs when the step succeeds' },
  failure:  { color: '#B91C1C', dash: '7 5', label: 'on error', meaning: 'Runs when the step fails' },
  continue: { color: '#B45309', dash: '2 6', label: 'repeat', meaning: 'Loops back for another iteration' },
  branch:   { color: '#A16207', label: 'branch', meaning: 'A parallel branch from a Fork' },
  default:  { color: '#475569', label: '', meaning: 'Next step' },
}
