import type { NodeType } from '@/types'

export interface NodeMeta {
  label:       string
  color:       string       // border / icon / handle (main hex)
  bgColor:     string       // node body: light pairing at ~60% opacity over canvas
  description: string
  isTerminal:  boolean
  icon?:       string       // e.g. '↺' for LOOP
  group?:      string       // e.g. 'LOGIC'
}

// Single source of truth for how each node should look in the sidebar and canvas.
/** Solid warm backgrounds — opaque on the studio canvas (#DDD0BF) */
const bg = (r: number, g: number, b: number) => `rgba(${r},${g},${b},0.96)`

export const NODE_META: Record<NodeType, NodeMeta> = {
  START: {
    label:       'Start',
    color:       '#B45309',
    bgColor:     bg(255, 247, 220), // warm amber-cream
    description: 'Entry point — receives the inbound trigger payload',
    isTerminal:  false,
  },

  NEXUS: {
    label:       'Nexus',
    color:       '#1D4ED8',
    bgColor:     bg(219, 234, 254), // sky blue
    description: 'Saved connector or inline API call (REST/SQL)',
    isTerminal:  false,
  },

  SUB_FLOW: {
    label:       'Sub-Flow',
    color:       '#15803D',
    bgColor:     bg(220, 252, 231), // fresh green
    description: 'Call another flow — SYNC (wait) or ASYNC (fire & forget)',
    isTerminal:  false,
  },

  VARIABLE: {
    label:       'Variable',
    color:       '#6B5A45',
    bgColor:     bg(245, 240, 234), // warm parchment
    description: 'Define static values or reference previous node outputs',
    isTerminal:  false,
  },

  MAPPER: {
    label:       'Mapper',
    color:       '#0F766E',
    bgColor:     bg(204, 251, 241), // teal mint
    description: 'Shape a new object from any previous data',
    isTerminal:  false,
  },

  DECISION: {
    label:       'Decision',
    color:       '#C2410C',
    bgColor:     bg(255, 237, 213), // warm orange
    description: 'Branch flow based on a condition',
    isTerminal:  false,
  },

  LOOP: {
    label:       'Loop',
    color:       '#9F1239',
    bgColor:     bg(254, 228, 232), // rose pink
    description: 'Repeat until condition is false',
    isTerminal:  false,
    icon:        '↺',
    group:       'LOGIC',
  },

  SCRIPT: {
    label:       'Script',
    color:       '#6D28D9',
    bgColor:     bg(245, 243, 255), // light violet
    description: 'Run JavaScript or Python — use input.variables, input.nodes, input.trigger',
    isTerminal:  false,
  },

  SUCCESS: {
    label:       'Success',
    color:       '#15803D',
    bgColor:     bg(220, 252, 231), // fresh green
    description: 'Terminal — flow ended successfully',
    isTerminal:  true,
  },

  FAILURE: {
    label:       'Failure',
    color:       '#991B1B',
    bgColor:     bg(254, 226, 226), // rose red
    description: 'Terminal — flow ended with failure',
    isTerminal:  true,
  },

  AI: {
    label:       'AI',
    color:       '#7C3AED',
    bgColor:     bg(237, 233, 254), // lavender
    description: 'Transform or classify data using any LLM',
    isTerminal:  false,
    icon:        '✦',
    group:       'AI',
  },

  FORK: {
    label:       'Fork',
    color:       '#B45309',
    bgColor:     bg(255, 247, 220), // warm amber-cream
    description: 'Split flow into parallel branches — paired with JOIN',
    isTerminal:  false,
    icon:        '⑃',
    group:       'PARALLEL',
  },

  JOIN: {
    label:       'Join',
    color:       '#065F46',
    bgColor:     bg(209, 250, 229), // emerald mint
    description: 'Merge parallel branches back into a single flow',
    isTerminal:  false,
    icon:        '⑄',
    group:       'PARALLEL',
  },
}

// This list drives the draggable sidebar order.
export const DRAGGABLE_NODES: NodeType[] = [
  'NEXUS',
  'SUB_FLOW',
  'SCRIPT',
  'VARIABLE',
  'MAPPER',
  'DECISION',
  'LOOP',
  'FORK',
  'JOIN',
  'AI',
  'SUCCESS',
  'FAILURE',
]

// These sections are only for the left sidebar grouping.
export const NODE_GROUPS: { label: string; types: NodeType[] }[] = [
  { label: 'CALL',     types: ['NEXUS', 'SUB_FLOW'] },
  { label: 'LOGIC',    types: ['SCRIPT', 'VARIABLE', 'MAPPER', 'DECISION', 'LOOP'] },
  { label: 'PARALLEL', types: ['FORK', 'JOIN'] },
  { label: 'AI',       types: ['AI'] },
  { label: 'TERMINAL', types: ['SUCCESS', 'FAILURE'] },
]
