import type { NodeType } from '@/types'

export interface NodeMeta {
  label:       string
  color:       string       // border / accent color
  bgColor:     string       // node background
  description: string
  isTerminal:  boolean
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  START: {
    label:       'Start',
    color:       '#00d4ff',
    bgColor:     '#0a1929',
    description: 'Entry point — receives the inbound trigger payload',
    isTerminal:  false,
  },

  PULSE: {
    // Renamed to avoid confusion with trigger endpoint
    label:       'HTTP Call',
    color:       '#818cf8',
    bgColor:     '#0f1535',
    description: 'Outbound HTTP request — has Success and Failure outputs',
    isTerminal:  false,
  },

  NEXUS: {
    label:       'Nexus',
    color:       '#e879f9',
    bgColor:     '#1a0020',
    description: 'Execute via a saved Nexus Connector (REST or SQL)',
    isTerminal:  false,
  },

  SUB_FLOW: {
    label:       'Sub-Flow',
    color:       '#38bdf8',
    bgColor:     '#001524',
    description: 'Call another flow — SYNC (wait) or ASYNC (fire & forget)',
    isTerminal:  false,
  },

  VARIABLE: {
    label:       'Variable',
    color:       '#f59e0b',
    bgColor:     '#1a1200',
    description: 'Define static values or reference previous node outputs',
    isTerminal:  false,
  },

  MAPPER: {
    label:       'Mapper',
    color:       '#34d399',
    bgColor:     '#001a0e',
    description: 'Shape a new object from any previous data',
    isTerminal:  false,
  },

  DECISION: {
    label:       'Decision',
    color:       '#fb923c',
    bgColor:     '#1a0d00',
    description: 'Branch flow based on a condition',
    isTerminal:  false,
  },

  SUCCESS: {
    label:       'Success',
    color:       '#00e676',
    bgColor:     '#001a0a',
    description: 'Terminal — flow ended successfully',
    isTerminal:  true,
  },

  FAILURE: {
    label:       'Failure',
    color:       '#ff4444',
    bgColor:     '#1a0000',
    description: 'Terminal — flow ended with failure',
    isTerminal:  true,
  },
}

// Sidebar draggable nodes — order controls vertical order
export const DRAGGABLE_NODES: NodeType[] = [
  'PULSE',
  'NEXUS',
  'SUB_FLOW',
  'VARIABLE',
  'MAPPER',
  'DECISION',
  'SUCCESS',
  'FAILURE',
]

// Grouped sections in the sidebar
export const NODE_GROUPS: { label: string; types: NodeType[] }[] = [
  { label: 'CALL',     types: ['PULSE', 'NEXUS', 'SUB_FLOW'] },
  { label: 'LOGIC',    types: ['VARIABLE', 'MAPPER', 'DECISION'] },
  { label: 'TERMINAL', types: ['SUCCESS', 'FAILURE'] },
]