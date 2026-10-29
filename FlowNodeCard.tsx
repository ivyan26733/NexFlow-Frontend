'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META, CATEGORY_META, STATUS_COLOR } from '@/lib/nodeConfig'
import { NodeIcon } from '@/components/studio/nodeIcons'
import type {
  NodeStatus,
  NodeType,
  NexusNodeConfig,
  SubFlowNodeConfig,
  ScriptNodeConfig,
} from './index'

interface NodeData {
  label:      string
  nodeType:   NodeType
  config:     Record<string, unknown>
  liveStatus: NodeStatus | null
  iterationCount?: number
}

// Nodes that can end in two ways expose two outputs: success (left) and failure (right).
const DUAL_OUTPUT: NodeType[] = ['NEXUS', 'DECISION', 'SUB_FLOW', 'SCRIPT', 'AI']

/**
 * Anatomy (top → bottom, the direction data flows):
 *   ○ input handle         — hollow: the node *receives* here
 *   [icon] Title           — icon + colour = category, title = your label
 *          CATEGORY · TYPE
 *   config preview         — what the node will do, readable without opening it
 *   ● outputs              — filled: the node *emits* here (green = success, red = failure)
 */
export function FlowNodeCard({ data, selected }: NodeProps) {
  const d    = data as unknown as NodeData
  const meta = NODE_META[d.nodeType]
  if (!meta) return null

  if (meta.isTerminal || d.nodeType === 'START') {
    return <PillNode d={d} selected={!!selected} />
  }

  const category  = CATEGORY_META[meta.category]
  const isLoop    = d.nodeType === 'LOOP'
  const isDual    = DUAL_OUTPUT.includes(d.nodeType)
  const preview   = getConfigPreview(d.nodeType, d.config ?? {})
  const saveAs    = (d.config?.saveOutputAs as string | undefined)?.trim()

  return (
    <div
      className={`nf-node${selected ? ' is-selected' : ''}`}
      data-status={d.liveStatus ?? undefined}
      style={nodeVars(meta.color, meta.bgColor, d.liveStatus)}
      title={meta.description}
    >
      <Handle type="target" position={Position.Top} className="nf-handle nf-handle--in" />

      <div className="nf-node__head">
        <span className="nf-node__icon"><NodeIcon type={d.nodeType} size={16} /></span>
        <div className="nf-node__titles">
          <div className="nf-node__title">{d.label || meta.label}</div>
          <div className="nf-node__caption">{category.label} · {meta.label}</div>
        </div>
        <StatusBadge status={d.liveStatus} loop={isLoop} iterations={d.iterationCount} />
      </div>

      <div className="nf-node__body">
        {preview
          ? <code className="nf-node__preview">{preview}</code>
          : <span className="nf-node__empty">Not configured — click to set up</span>}
        {saveAs && <div className="nf-node__saveas">saved as <b>nex.{saveAs}</b></div>}
      </div>

      {isLoop ? (
        <>
          <div className="nf-node__outputs">
            <span className="nf-out nf-out--continue">↺ Repeat</span>
            <span className="nf-out nf-out--exit">Exit ↓</span>
          </div>
          <Handle type="source" id="continue" position={Position.Left} className="nf-handle nf-handle--continue" title="Repeat — loop back" />
          <Handle type="source" id="exit" position={Position.Bottom} className="nf-handle nf-handle--out" title="Exit — loop finished" />
        </>
      ) : isDual ? (
        <>
          <div className="nf-node__outputs">
            <span className="nf-out nf-out--success">✓ Success</span>
            <span className="nf-out nf-out--failure">{d.nodeType === 'SUB_FLOW' ? '⚡ Async' : '✗ Error'}</span>
          </div>
          <Handle type="source" id="success" position={Position.Bottom} className="nf-handle nf-handle--success" style={{ left: '25%' }} title="On success" />
          <Handle type="source" id="failure" position={Position.Bottom} className="nf-handle nf-handle--failure" style={{ left: '75%' }} title={d.nodeType === 'SUB_FLOW' ? 'Async / on error' : 'On error'} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="nf-handle nf-handle--out" />
      )}
    </div>
  )
}

/* ── Start & outcome nodes: compact pills — they mark the edges of the flow, not work ── */

function PillNode({ d, selected }: { d: NodeData; selected: boolean }) {
  const meta    = NODE_META[d.nodeType]
  const isStart = d.nodeType === 'START'
  return (
    <div
      className={`nf-pill${selected ? ' is-selected' : ''}`}
      data-status={d.liveStatus ?? undefined}
      data-kind={d.nodeType}
      style={nodeVars(meta.color, meta.bgColor, d.liveStatus)}
      title={meta.description}
    >
      {!isStart && <Handle type="target" position={Position.Top} className="nf-handle nf-handle--in" />}
      <span className="nf-pill__icon"><NodeIcon type={d.nodeType} size={15} color="#fff" /></span>
      <span className="nf-pill__text">
        <span className="nf-pill__title">{d.label || meta.label}</span>
        <span className="nf-pill__caption">{isStart ? 'Trigger · flow begins' : meta.description}</span>
      </span>
      <StatusBadge status={d.liveStatus} />
      {isStart && <Handle type="source" position={Position.Bottom} className="nf-handle nf-handle--out" />}
    </div>
  )
}

/* ── Status badge: words, not just colour, so it reads for everyone ── */

const STATUS_TEXT: Record<string, string> = {
  PENDING:  'Queued',
  RUNNING:  'Running',
  SUCCESS:  'Done',
  FAILURE:  'Failed',
  RETRYING: 'Retrying',
  CONTINUE: 'Looping',
}

export function StatusBadge({ status, loop, iterations }: { status: NodeStatus | string | null | undefined; loop?: boolean; iterations?: number }) {
  if (!status) return null
  let text = STATUS_TEXT[status] ?? status
  if (loop && status === 'RUNNING') text = 'Looping'
  if (loop && status === 'SUCCESS' && typeof iterations === 'number') text = `${iterations}×`
  return <span className="nf-status" data-status={status}>{text}</span>
}

export function nodeVars(color: string, tint: string, status: NodeStatus | string | null | undefined): React.CSSProperties {
  const statusColor = status ? (STATUS_COLOR as Record<string, string>)[status] : undefined
  return {
    ['--nc' as string]: color,
    ['--nt' as string]: tint,
    ...(statusColor ? { ['--ns' as string]: statusColor } : {}),
  }
}

/* ── Config preview — the one line that tells you what this node will do ── */

function getConfigPreview(type: NodeType, config: Record<string, unknown>): string | null {
  switch (type) {
    case 'NEXUS': {
      const c = config as Partial<NexusNodeConfig>
      if (c.url) return `${c.method ?? 'GET'} ${c.url}`
      if (!c.connectorName) return null
      if (c.connectorType === 'JDBC') return c.query ? `SQL ${c.query}` : `DB ${c.connectorName}`
      return c.path ? `${c.method ?? 'GET'} ${c.path}` : c.connectorName
    }
    case 'SUB_FLOW': {
      const c = config as Partial<SubFlowNodeConfig>
      if (!c.targetFlowName) return null
      return `${c.mode === 'ASYNC' ? 'async' : 'wait'} → ${c.targetFlowName}`
    }
    case 'DECISION':
      if (config.mode === 'code') return `code (${config.language ?? 'js'})`
      return config.left ? `${config.left} ${config.operator} ${config.right}` : null
    case 'VARIABLE': {
      const keys = config.variables ? Object.keys(config.variables as object) : []
      return keys.length ? `${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ` +${keys.length - 3}` : ''}` : null
    }
    case 'MAPPER': {
      const m = config.output as object | undefined
      const n = m ? Object.keys(m).length : 0
      return n ? `${n} field${n === 1 ? '' : 's'}` : null
    }
    case 'SCRIPT': {
      const c = config as Partial<ScriptNodeConfig>
      return c.language === 'python' ? 'Python' : 'JavaScript'
    }
    case 'LOOP':
      return config.condition ? `while ${config.condition}` : null
    default:
      return null
  }
}
