import type { NodeType } from '@/types'

export interface NodeMeta {
  label:       string
  color:       string       // border/accent color
  bgColor:     string       // node background
  description: string
  isTerminal:  boolean
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  START: {
    label:       'Start',
    color:       '#00d4ff',
    bgColor:     '#0a1929',
    description: 'Entry point — receives the Pulse trigger payload',
    isTerminal:  false,
  },
  PULSE: {
    label:       'Pulse',
    color:       '#818cf8',
    bgColor:     '#0f1535',
    description: 'HTTP API call — has Success and Failure outputs',
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
    description: 'Shape a new request from any previous data',
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

// These can be dragged from sidebar onto canvas
export const DRAGGABLE_NODES: NodeType[] = [
  'PULSE', 'VARIABLE', 'MAPPER', 'DECISION', 'SUCCESS', 'FAILURE'
]
