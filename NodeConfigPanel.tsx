'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { Node } from '@xyflow/react'
import { NODE_META } from './nodeConfig'
import type { NodeType } from './index'

import PulseConfig    from './config/PulseConfig'
import VariableConfig from './config/VariableConfig'
import MapperConfig   from './config/MapperConfig'
import DecisionConfig from './config/DecisionConfig'
import TerminalConfig from './config/TerminalConfig'
import NexusConfig    from './config/NexusConfig'
import SubFlowConfig  from './config/SubFlowConfig'

interface Props {
  node:          Node
  currentFlowId: string          // needed by SUB_FLOW to avoid self-reference
  onUpdate:      (data: Node['data']) => void
  onClose:       () => void
  onRemove?:     () => void
}

export default function NodeConfigPanel({
  node,
  currentFlowId,
  onUpdate,
  onClose,
  onRemove,
}: Props) {
  const nodeType = node.data.nodeType as NodeType
  const meta     = NODE_META[nodeType]
  const canRemove = onRemove != null && nodeType !== 'START'

  const [label, setLabel] = useState((node.data.label as string) ?? '')

  function updateConfig(config: Record<string, unknown>) {
    onUpdate({ ...node.data, config })
  }

  function updateLabel(val: string) {
    setLabel(val)
    onUpdate({ ...node.data, label: val })
  }

  return (
    <aside className="studio-config">

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '0.625rem',
              height: '0.625rem',
              borderRadius: '50%',
              background: meta.color,
            }}
          />
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: meta.color }}>
            {meta.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-failure)',
                cursor: 'pointer',
                padding: 4,
              }}
              aria-label="Remove node"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          minHeight: 0,
        }}
      >
        {/* Label */}
        <Field label="LABEL">
          <input
            type="text"
            value={label}
            onChange={e => updateLabel(e.target.value)}
            className="input-base"
            placeholder="Node label..."
          />
        </Field>

        {/* Node-specific config */}
        <ConfigForm
          nodeType={nodeType}
          config={node.data.config as Record<string, unknown>}
          currentFlowId={currentFlowId}
          onChange={updateConfig}
        />

        {/* Reference help */}
        <div
          style={{
            marginTop: 'auto',
            padding: '0.75rem',
            background: 'var(--color-panel)',
            borderRadius: '0.5rem',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
              letterSpacing: '0.05em',
              marginBottom: '0.25rem',
            }}
          >
            REFERENCE SYNTAX
          </p>
          <p style={refStyle}>{'{{variables.key}}'}</p>
          <p style={refStyle}>{'{{nodes.nodeId.successOutput.body.field}}'}</p>
          <p style={refStyle}>{'{{nodes.subFlowNodeId.successOutput.nco.nodes.*}}'}</p>
        </div>
      </div>
    </aside>
  )
}

/* ── Config router ───────────────────────────────────────────────────────── */

function ConfigForm({
  nodeType,
  config,
  currentFlowId,
  onChange,
}: {
  nodeType: NodeType
  config: Record<string, unknown>
  currentFlowId: string
  onChange: (c: Record<string, unknown>) => void
}) {
  switch (nodeType) {
    case 'PULSE':    return <PulseConfig    config={config} onChange={onChange} />
    case 'NEXUS':    return <NexusConfig    config={config} onChange={onChange} />
    case 'SUB_FLOW': return <SubFlowConfig  config={config} onChange={onChange} currentFlowId={currentFlowId} />
    case 'VARIABLE': return <VariableConfig config={config} onChange={onChange} />
    case 'MAPPER':   return <MapperConfig   config={config} onChange={onChange} />
    case 'DECISION': return <DecisionConfig config={config} onChange={onChange} />
    case 'SUCCESS':
    case 'FAILURE':  return <TerminalConfig config={config} onChange={onChange} />
    case 'START':    return <StartInfo />
    default:         return null
  }
}

function StartInfo() {
  return (
    <div className="text-xs text-muted leading-relaxed">
      The Start node receives the incoming trigger payload. Access it using
      <span className="font-mono text-accent block mt-1">
        {'{{nodes.start.output.*}}'}
      </span>
    </div>
  )
}

/* ── Shared Field ─────────────────────────────────────────────────────────── */

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-[10px] font-mono text-muted tracking-wider block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const refStyle: React.CSSProperties = {
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-accent)',
  wordBreak: 'break-all',
}