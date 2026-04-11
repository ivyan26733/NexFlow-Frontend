'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META } from '@/lib/nodeConfig'
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
}

// ── Node shape variants ───────────────────────────────────────────
// Small radius tweaks so terminal and loop nodes look different at a glance.
const NODE_RADIUS: Partial<Record<NodeType, number>> = {
  SUCCESS: 16,
  FAILURE: 4,
  START:   10,
  LOOP:    8,
}
function getRadius(type: NodeType): number {
  return NODE_RADIUS[type] ?? 8
}

// ── Terminal node header icon + label ────────────────────────────
// Terminal nodes get a stronger header strip so success/failure stand out.
const TERMINAL_CONFIG: Partial<Record<NodeType, { icon: string; bg: string; text: string }>> = {
  SUCCESS: { icon: '✓', bg: 'rgba(21,128,61,0.14)',  text: '#15803D' },
  FAILURE: { icon: '✗', bg: 'rgba(153,27,27,0.14)',  text: '#991B1B' },
}

// ── Node type badge labels ────────────────────────────────────────
function getTypeLabel(type: NodeType): string {
  switch (type) {
    case 'NEXUS':    return '⬡ NEXUS'
    case 'SUB_FLOW': return '⤇ SUB-FLOW'
    case 'SCRIPT':   return '</> SCRIPT'
    case 'LOOP':     return '↺ LOOP'
    case 'AI':       return '✦ AI'
    case 'SUCCESS':  return '✓ SUCCESS'
    case 'FAILURE':  return '✗ FAILURE'
    case 'FORK':     return '⑃ FORK'
    case 'JOIN':     return '⑄ JOIN'
    case 'DECISION': return '◆ DECISION'
    case 'MAPPER':   return '⇄ MAPPER'
    case 'VARIABLE': return '{ } VARIABLE'
    default:         return type
  }
}

export function FlowNodeCard({ data, selected }: NodeProps) {
  const d    = data as unknown as NodeData
  const meta = NODE_META[d.nodeType]
  if (!meta) return null

  const glowColor    = getLiveGlow(d.liveStatus, meta.color)
  const isTerminal   = meta.isTerminal
  const isLoop       = d.nodeType === 'LOOP'
  const borderColor  = selected ? 'var(--color-accent)' : (glowColor ?? meta.color)
  const radius       = getRadius(d.nodeType)
  const termCfg      = TERMINAL_CONFIG[d.nodeType]

  const hasDualOutputs = ['NEXUS', 'DECISION', 'SUB_FLOW', 'SCRIPT', 'AI'].includes(d.nodeType)

  return (
    <div style={{ minWidth: 148, maxWidth: 210 }}>
      {/* Node label on top */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#1A1008',
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
          borderWidth: selected ? 2 : 1.5,
          borderStyle: 'solid',
          borderColor,
          background: meta.bgColor,
          borderRadius: radius,
          boxShadow: glowColor
            ? `0 0 0 2px ${hexToRgba(glowColor, 0.18)}, 0 0 16px ${hexToRgba(glowColor, 0.22)}`
            : selected
            ? `0 0 0 2px rgba(154,52,18,0.2), 0 2px 8px rgba(26,16,8,0.1)`
            : '0 1px 4px rgba(26,16,8,0.08)',
          position: 'relative',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          overflow: 'hidden',
        }}
      >
        {/* Top colored accent strip for terminal nodes */}
        {termCfg && (
          <div
            style={{
              height: 4,
              background: meta.color,
              borderRadius: `${radius}px ${radius}px 0 0`,
            }}
          />
        )}

        {/* Input handle — diamond shape */}
        {d.nodeType !== 'START' && (
          <Handle
            type="target"
            position={Position.Top}
            style={{
              background: meta.bgColor,
              border: `2px solid ${meta.color}`,
              width: 10,
              height: 10,
              top: -5,
              borderRadius: 2,
              transform: 'rotate(45deg)',
              zIndex: 1,
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
            padding: '7px 9px',
            borderBottom: '1px solid rgba(26,16,8,0.07)',
            background: termCfg
              ? termCfg.bg
              : isLoop
              ? hexToRgba(meta.color, 0.1)
              : hexToRgba(meta.color, 0.07),
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: meta.color,
            }}
          >
            {getTypeLabel(d.nodeType)}
          </span>

          {d.liveStatus && (
            <span
              style={{
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                padding: '2px 5px',
                borderRadius: 4,
                ...(isLoop && d.liveStatus === 'RUNNING'
                  ? { background: hexToRgba(meta.color, 0.18), color: meta.color }
                  : isLoop && d.liveStatus === 'SUCCESS'
                    ? { background: 'rgba(21,128,61,0.18)', color: '#15803d' }
                    : statusBadgeStyle(d.liveStatus)),
              }}
            >
              {isLoop && d.liveStatus === 'RUNNING'
                ? '↺ looping…'
                : isLoop && d.liveStatus === 'SUCCESS'
                  ? (typeof (d as unknown as Record<string, unknown>).iterationCount === 'number'
                      ? `✓ ${(d as unknown as Record<string, unknown>).iterationCount} itr`
                      : '✓ done')
                  : d.liveStatus === 'RETRYING'
                    ? '↺ RETRY'
                    : d.liveStatus}
            </span>
          )}
        </div>

        {/* Preview the important config inline so you can debug without opening the panel. */}
        <div
          style={{
            padding: '7px 9px',
            paddingBottom: (d.config?.saveOutputAs as string)?.trim() ? 20 : 7,
            minHeight: termCfg ? 20 : 28,
            position: 'relative',
          }}
        >
          <ConfigPreview nodeType={d.nodeType} config={d.config} />
          {(d.config?.saveOutputAs as string)?.trim() && (
            <div
              style={{
                position: 'absolute',
                left: 9,
                bottom: 5,
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: '#B45309',
                opacity: 0.95,
              }}
            >
              nex.{(d.config.saveOutputAs as string).trim()}
            </div>
          )}
        </div>

        {/* Output handles change by node type: loop, dual-output, or single-output. */}
        {!isTerminal && (
          <>
            {isLoop ? (
              <>
                {/* LOOP continues back through the dashed handle on the left. */}
                <Handle
                  type="source"
                  id="continue"
                  position={Position.Left}
                  style={{
                    left: -5,
                    top: '50%',
                    transform: 'translateY(-50%) rotate(45deg)',
                    background: meta.bgColor,
                    border: `2px dashed ${meta.color}`,
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                  }}
                />
                {/* LOOP exits through the solid handle on the right. */}
                <Handle
                  type="source"
                  id="exit"
                  position={Position.Right}
                  style={{
                    right: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#065F46',
                    border: '2px solid #064E3B',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 9px 7px',
                    fontSize: 8,
                    fontFamily: 'var(--font-mono)',
                    borderTop: '1px solid rgba(26,16,8,0.07)',
                    background: hexToRgba(meta.color, 0.06),
                    marginTop: 2,
                  }}
                >
                  <span style={{ color: meta.color }}>↺ CONT.</span>
                  <span style={{ color: '#065F46' }}>EXIT →</span>
                </div>
              </>
            ) : hasDualOutputs ? (
              <>
                {/* Success and failure split into two outputs for branching nodes. */}
                <Handle
                  type="source"
                  id="success"
                  position={Position.Bottom}
                  style={{
                    left: '26%',
                    background: '#15803d',
                    border: '2px solid #14532D',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bottom: -5,
                  }}
                />
                {/* FAILURE handle — right-center bottom */}
                <Handle
                  type="source"
                  id="failure"
                  position={Position.Bottom}
                  style={{
                    left: '74%',
                    background: '#b91c1c',
                    border: '2px solid #7F1D1D',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bottom: -5,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3px 9px 6px',
                    fontSize: 8,
                    fontFamily: 'var(--font-mono)',
                    minHeight: 18,
                  }}
                >
                  <span style={{ color: '#15803d' }}>✓ OK</span>
                  <span style={{ color: '#b91c1c' }}>
                    {d.nodeType === 'SUB_FLOW' ? '✗ ASYNC' : '✗ FAIL'}
                  </span>
                </div>
              </>
            ) : (
              /* Single output — circle */
              <Handle
                type="source"
                position={Position.Bottom}
                style={{
                  background: meta.color,
                  border: `2px solid ${hexToRgba(meta.color, 0.6)}`,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bottom: -5,
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
    case 'NEXUS': {
      const c = config as Partial<NexusNodeConfig>
      if (c.url) return `${c.method ?? 'GET'} ${c.url}`
      if (!c.connectorName) return null
      if (c.connectorType === 'JDBC') {
        return c.query
          ? `SQL: ${c.query.slice(0, 26)}…`
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

    case 'DECISION': {
      if (config.mode === 'code') {
        return `code: ${config.language ?? 'js'}`
      }
      return config.left
        ? `${config.left} ${config.operator} ${config.right}`
        : null
    }

    case 'VARIABLE':
      return config.variables
        ? `${Object.keys(config.variables as object).length} var(s)`
        : null

    case 'SCRIPT': {
      const c = config as Partial<ScriptNodeConfig>
      const langIcon = c.language === 'python' ? '🐍' : '⚡'
      return `${langIcon} ${c.language ?? 'javascript'}`
    }

    case 'LOOP':
      return config.condition
        ? `${(config.condition as string).slice(0, 22)}…`
        : 'condition…'

    case 'AI': {
      const provider = config.provider as string
      const model = config.model as string
      const prompt = config.prompt as string
      if (prompt) return `${(provider ?? 'AI')} · ${prompt.slice(0, 18)}…`
      if (model) return `${provider ?? 'AI'} · ${model}`
      return provider ? provider : '— no config —'
    }

    default:
      return null
  }
}

/* ================= Helpers ================= */

function hexToRgba(hex: string, alpha: number): string {
  const n = hex.replace(/^#/, '')
  if (n.length !== 6) return hex
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getLiveGlow(status: NodeStatus | null, nodeAccent: string): string | null {
  switch (status) {
    case 'RUNNING':  return nodeAccent
    case 'SUCCESS':  return '#15803d'
    case 'FAILURE':  return '#b91c1c'
    case 'RETRYING': return '#f59e0b'
    case 'CONTINUE': return '#f59e0b'
    default:         return null
  }
}

function statusBadgeStyle(
  status: NodeStatus
): { background: string; color: string } {
  switch (status) {
    case 'RUNNING':
      return { background: 'var(--color-running-soft)', color: 'var(--color-running)' }
    case 'SUCCESS':
      return { background: 'rgba(21,128,61,0.16)', color: '#15803d' }
    case 'FAILURE':
      return { background: 'rgba(153,27,27,0.14)', color: '#991B1B' }
    case 'RETRYING':
    case 'CONTINUE':
      return { background: 'rgba(245,158,11,0.18)', color: '#d97706' }
    default:
      return { background: 'rgba(107,90,69,0.15)', color: 'var(--color-muted)' }
  }
}
