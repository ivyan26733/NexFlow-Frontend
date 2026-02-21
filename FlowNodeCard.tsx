'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META } from '@/lib/nodeConfig'
import type {
  NodeStatus,
  NodeType,
  NexusNodeConfig,
  SubFlowNodeConfig,
} from './index'

interface NodeData {
  label:      string
  nodeType:   NodeType
  config:     Record<string, unknown>
  liveStatus: NodeStatus | null
}

export function FlowNodeCard({ data, selected }: NodeProps) {
  const d    = data as unknown as NodeData
  const meta = NODE_META[d.nodeType]
  if (!meta) return null

  const glowColor   = getLiveGlow(d.liveStatus)
  const isTerminal  = meta.isTerminal
  const borderColor = selected ? '#00d4ff' : (glowColor ?? meta.color)

  // Dual-output nodes (from FIRST file logic)
  const hasDualOutputs = ['PULSE', 'NEXUS', 'DECISION', 'SUB_FLOW'].includes(d.nodeType)

  return (
    <div style={{ minWidth: 140, maxWidth: 200 }}>
      {/* Label on top */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: 4,
          paddingLeft: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {d.label || meta.label}
      </div>

      {/* Main card */}
      <div
        style={{
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor,
          background: meta.bgColor,
          borderRadius: 8,
          boxShadow: glowColor
            ? `0 0 10px ${glowColor}44`
            : selected
            ? '0 0 0 1px rgba(0,212,255,0.25)'
            : 'none',
          position: 'relative',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
      >
        {/* Top input handle */}
        {d.nodeType !== 'START' && (
          <Handle
            type="target"
            position={Position.Top}
            style={{
              background: meta.color,
              border: 'none',
              width: 6,
              height: 6,
              top: -3,
            }}
          />
        )}

        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            padding: '6px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: meta.color,
            }}
          >
            {d.nodeType === 'PULSE' ? 'HTTP' : d.nodeType.replace('_', ' ')}
          </span>

          {d.liveStatus && (
            <span
              style={{
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                padding: '2px 4px',
                borderRadius: 4,
                ...statusBadgeStyle(d.liveStatus),
              }}
            >
              {d.liveStatus}
            </span>
          )}
        </div>

        {/* Config preview */}
        <div style={{ padding: '6px 8px', minHeight: 28 }}>
          <ConfigPreview nodeType={d.nodeType} config={d.config} />
        </div>

        {/* Output handles */}
        {!isTerminal && (
          <>
            {hasDualOutputs ? (
              <>
                <Handle
                  type="source"
                  id="success"
                  position={Position.Bottom}
                  style={{
                    left: '28%',
                    background: '#00e676',
                    border: 'none',
                    width: 6,
                    height: 6,
                    bottom: -3,
                  }}
                />
                <Handle
                  type="source"
                  id="failure"
                  position={Position.Bottom}
                  style={{
                    left: '72%',
                    background: '#ff4444',
                    border: 'none',
                    width: 6,
                    height: 6,
                    bottom: -3,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '2px 8px 6px',
                    fontSize: 8,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span style={{ color: 'var(--color-success)' }}>
                    SUCCESS
                  </span>
                  <span style={{ color: 'var(--color-failure)' }}>
                    {d.nodeType === 'SUB_FLOW' ? 'FAIL / ASYNC' : 'FAILURE'}
                  </span>
                </div>
              </>
            ) : (
              <Handle
                type="source"
                position={Position.Bottom}
                style={{
                  background: meta.color,
                  border: 'none',
                  width: 6,
                  height: 6,
                  bottom: -3,
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ================= Config Preview ================= */

function ConfigPreview({
  nodeType,
  config,
}: {
  nodeType: NodeType
  config: Record<string, unknown>
}) {
  const preview = getConfigPreview(nodeType, config)
  if (!preview) return null

  return (
    <p
      style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        margin: 0,
      }}
    >
      {preview}
    </p>
  )
}

function getConfigPreview(
  type: NodeType,
  config: Record<string, unknown>
): string | null {
  switch (type) {
    case 'PULSE':
      return config.url
        ? `${config.method ?? 'GET'} ${config.url}`
        : null

    case 'NEXUS': {
      const c = config as Partial<NexusNodeConfig>
      if (!c.connectorName) return null
      if (c.connectorType === 'JDBC') {
        return c.query
          ? `SQL: ${c.query.slice(0, 28)}…`
          : `DB: ${c.connectorName}`
      }
      return c.path
        ? `${c.method ?? 'GET'} ${c.path}`
        : c.connectorName
    }

    case 'SUB_FLOW': {
      const c = config as Partial<SubFlowNodeConfig>
      if (!c.targetFlowName) return null
      const modeTag = c.mode === 'ASYNC' ? '⚡' : '⏱'
      return `${modeTag} ${c.targetFlowName}`
    }

    case 'DECISION':
      return config.left
        ? `${config.left} ${config.operator} ${config.right}`
        : null

    case 'VARIABLE':
      return config.variables
        ? `${Object.keys(config.variables as object).length} var(s)`
        : null

    default:
      return null
  }
}

/* ================= Helpers ================= */

function getLiveGlow(status: NodeStatus | null): string | null {
  switch (status) {
    case 'RUNNING': return '#00d4ff'
    case 'SUCCESS': return '#00e676'
    case 'FAILURE': return '#ff4444'
    default:        return null
  }
}

function statusBadgeStyle(
  status: NodeStatus
): { background: string; color: string } {
  switch (status) {
    case 'RUNNING':
      return { background: 'rgba(0,212,255,0.2)', color: 'var(--color-accent)' }
    case 'SUCCESS':
      return { background: 'rgba(0,230,118,0.2)', color: 'var(--color-success)' }
    case 'FAILURE':
      return { background: 'rgba(255,68,68,0.2)', color: 'var(--color-failure)' }
    default:
      return { background: 'rgba(100,116,139,0.2)', color: 'var(--color-muted)' }
  }
}