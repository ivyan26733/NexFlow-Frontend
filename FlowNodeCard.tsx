'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META } from './nodeConfig'
import type { NodeStatus, NodeType } from './index'

interface NodeData {
  label:      string
  nodeType:   NodeType
  config:     Record<string, unknown>
  liveStatus: NodeStatus | null
}

// Single card: label on top, colored box below (color = node type)
export function FlowNodeCard({ data, selected }: NodeProps) {
  const d    = data as unknown as NodeData
  const meta = NODE_META[d.nodeType]

  const glowColor = getLiveGlow(d.liveStatus)
  const isTerminal = meta.isTerminal
  const borderColor = selected ? '#00d4ff' : (glowColor ?? meta.color)

  return (
    <div style={{ minWidth: 140, maxWidth: 200 }}>
      {/* Label on top of the box */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--color-text)',
        marginBottom: 4,
        paddingLeft: 2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {d.label || meta.label}
      </div>

      {/* Colored box — border/background define type (Variable, Mapper, etc.) */}
      <div
        style={{
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor,
          background: meta.bgColor,
          borderRadius: 8,
          boxShadow: glowColor ? `0 0 10px ${glowColor}44` : selected ? '0 0 0 1px rgba(0,212,255,0.25)' : 'none',
          position: 'relative',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
      >
        {/* Top handle — all nodes except START accept incoming connections */}
        {d.nodeType !== 'START' && (
          <Handle type="target" position={Position.Top} style={{ background: meta.color, border: 'none', width: 6, height: 6, top: -3 }} />
        )}

        {/* Type badge + optional live status inside box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '6px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em', color: meta.color }}>
            {d.nodeType}
          </span>
          {d.liveStatus && (
            <span style={{
              fontSize: 8,
              fontFamily: 'var(--font-mono)',
              padding: '2px 4px',
              borderRadius: 4,
              ...statusBadgeStyle(d.liveStatus),
            }}>
              {d.liveStatus}
            </span>
          )}
        </div>

        {/* Config preview line inside box */}
        <div style={{ padding: '6px 8px', minHeight: 28 }}>
          <ConfigPreview nodeType={d.nodeType} config={d.config} />
        </div>

        {/* Output handles */}
        {!isTerminal && (
          <>
            {(d.nodeType === 'PULSE' || d.nodeType === 'DECISION') ? (
              <>
                <Handle type="source" id="success" position={Position.Bottom} style={{ left: '28%', background: '#00e676', border: 'none', width: 6, height: 6, bottom: -3 }} />
                <Handle type="source" id="failure" position={Position.Bottom} style={{ left: '72%', background: '#ff4444', border: 'none', width: 6, height: 6, bottom: -3 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px 6px', fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                  <span style={{ color: 'var(--color-success)' }}>OK</span>
                  <span style={{ color: 'var(--color-failure)' }}>ERR</span>
                </div>
              </>
            ) : (
              <Handle type="source" position={Position.Bottom} style={{ background: meta.color, border: 'none', width: 6, height: 6, bottom: -3 }} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ConfigPreview({ nodeType, config }: { nodeType: NodeType; config: Record<string, unknown> }) {
  const preview = getConfigPreview(nodeType, config)
  if (!preview) return null
  return (
    <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
      {preview}
    </p>
  )
}

function getConfigPreview(type: NodeType, config: Record<string, unknown>): string | null {
  switch (type) {
    case 'PULSE':    return config.url    ? `${config.method ?? 'GET'} ${config.url}` : null
    case 'DECISION': return config.left   ? `${config.left} ${config.operator} ${config.right}` : null
    case 'VARIABLE': return config.variables ? `${Object.keys(config.variables as object).length} vars` : null
    default:         return null
  }
}

function getLiveGlow(status: NodeStatus | null): string | null {
  switch (status) {
    case 'RUNNING': return '#00d4ff'
    case 'SUCCESS': return '#00e676'
    case 'FAILURE': return '#ff4444'
    default:        return null
  }
}

function statusBadgeStyle(status: NodeStatus): { background: string; color: string } {
  switch (status) {
    case 'RUNNING': return { background: 'rgba(0,212,255,0.2)', color: 'var(--color-accent)' }
    case 'SUCCESS': return { background: 'rgba(0,230,118,0.2)', color: 'var(--color-success)' }
    case 'FAILURE': return { background: 'rgba(255,68,68,0.2)', color: 'var(--color-failure)' }
    default:        return { background: 'rgba(100,116,139,0.2)', color: 'var(--color-muted)' }
  }
}
