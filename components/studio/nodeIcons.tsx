import {
  Zap, Plug, Workflow, Braces, ArrowRightLeft, GitBranch, Repeat, Code2,
  Sparkles, Split, Merge, CheckCircle2, XCircle, type LucideIcon,
} from 'lucide-react'
import type { NodeType } from '@/types'

/**
 * One icon per node type. Each icon is a literal picture of what the node does:
 * Zap = something fires the flow, Plug = external connection, Braces = a value,
 * ArrowRightLeft = reshaping, GitBranch = choose a path, Repeat = loop, Code2 = code,
 * Sparkles = AI, Split/Merge = parallel branches, Check/X = how the flow ends.
 */
export const NODE_ICON: Record<NodeType, LucideIcon> = {
  START:    Zap,
  NEXUS:    Plug,
  SUB_FLOW: Workflow,
  VARIABLE: Braces,
  MAPPER:   ArrowRightLeft,
  DECISION: GitBranch,
  LOOP:     Repeat,
  SCRIPT:   Code2,
  AI:       Sparkles,
  FORK:     Split,
  JOIN:     Merge,
  SUCCESS:  CheckCircle2,
  FAILURE:  XCircle,
}

export function NodeIcon({ type, size = 16, color }: { type: NodeType; size?: number; color?: string }) {
  const Icon = NODE_ICON[type] ?? Zap
  return <Icon size={size} color={color} strokeWidth={2.25} aria-hidden />
}
