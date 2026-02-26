'use client'

import { useState } from 'react'
import { X, Trash2, Copy, Check } from 'lucide-react'
import type { Node } from '@xyflow/react'
import { NODE_META } from '@/lib/nodeConfig'
import type { NodeType } from '@/types'

import PulseConfig    from './config/PulseConfig'
import NexusConfig    from './config/NexusConfig'
import SubFlowConfig  from './config/SubFlowConfig'
import ScriptConfig   from './config/ScriptConfig'
import VariableConfig from './config/VariableConfig'
import MapperConfig   from './config/MapperConfig'
import DecisionConfig from './config/DecisionConfig'
import TerminalConfig from './config/TerminalConfig'

interface Props {
  node:          Node
  currentFlowId: string
  onUpdate:      (data: Node['data']) => void
  onClose:       () => void
  onRemove?:     () => void
  readOnly?:     boolean
}


// Mirrors the backend FlowExecutionEngine.toLabelKey() conversion.
// "Calculate Discount" → "calculateDiscount"
// "My HTTP Call"       → "myHttpCall"
function toLabelKey(label: string): string {
  if (!label.trim()) return 'node'
  const words = label.trim().replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)
  if (!words.length) return 'node'
  return words[0].toLowerCase() + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')
}

export default function NodeConfigPanel({ node, currentFlowId, onUpdate, onClose, onRemove, readOnly }: Props) {
  const nodeType = node.data.nodeType as NodeType
  const meta     = NODE_META[nodeType]

  const [label, setLabel] = useState((node.data.label as string) ?? '')
  const [copied, setCopied] = useState(false)

  function copyNodeId() {
    navigator.clipboard.writeText(toLabelKey(label || 'node'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function updateConfig(config: Record<string, unknown>) {
    onUpdate({ ...node.data, config })
  }

  function updateLabel(val: string) {
    setLabel(val)
    onUpdate({ ...node.data, label: val })
  }

  return (
    <aside className="node-config-panel">

      <div className="node-config-panel-header">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
          <span className="text-sm font-medium" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {onRemove && nodeType !== 'START' && (
            <button
              type="button"
              onClick={onRemove}
              title="Delete node"
              className="config-panel-btn-ghost config-panel-btn-danger"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button type="button" onClick={onClose} title="Close panel" className="config-panel-btn-ghost">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="node-config-panel-body">

        <Field label="LABEL" className="config-panel-field">
          <input
            type="text"
            value={label}
            onChange={e => updateLabel(e.target.value)}
            className="input-base"
            placeholder="Node label…"
            readOnly={readOnly}
          />
        </Field>

        <NodeForm
          nodeType={nodeType}
          config={node.data.config as Record<string, unknown>}
          currentFlowId={currentFlowId}
          onChange={updateConfig}
        />

        <div className="mt-auto flex flex-col gap-4 flex-shrink-0">

          <div className="config-panel-card">
            <p className="text-[10px] font-mono text-muted tracking-wider mb-1.5">REFERENCE AS</p>
            <div className="flex items-center gap-2">
              <code className="text-[12px] font-mono text-accent flex-1 break-all">{toLabelKey(label || 'node')}</code>
              <button
                type="button"
                onClick={copyNodeId}
                title="Copy reference key"
                className="config-panel-btn-ghost flex-shrink-0"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-muted mt-1.5">
              Change the label above to change this name
            </p>
          </div>

          <div className="config-panel-card">
            <p className="text-[10px] font-mono text-muted tracking-wider mb-1.5">USE IN OTHER NODES</p>
            <p className="text-[11px] font-mono text-accent break-all">
              {'{{nodes.' + toLabelKey(label || 'node') + '.successOutput.result}}'}
            </p>
            <p className="text-[11px] font-mono text-muted break-all mt-1.5">
              {'{{variables.myVar}} for variables'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Route to the right config component ──────────────────────────────────────

function NodeForm({ nodeType, config, currentFlowId, onChange }: {
  nodeType:      NodeType
  config:        Record<string, unknown>
  currentFlowId: string
  onChange:      (c: Record<string, unknown>) => void
}) {
  switch (nodeType) {
    case 'PULSE':    return <PulseConfig    config={config} onChange={onChange} />
    case 'NEXUS':    return <NexusConfig    config={config} onChange={onChange} />
    case 'SUB_FLOW': return <SubFlowConfig  config={config} onChange={onChange} currentFlowId={currentFlowId} />
    case 'SCRIPT':   return <ScriptConfig   config={config} onChange={onChange} />
    case 'VARIABLE': return <VariableConfig config={config} onChange={onChange} />
    case 'MAPPER':   return <MapperConfig   config={config} onChange={onChange} />
    case 'DECISION': return <DecisionConfig config={config} onChange={onChange} />
    case 'SUCCESS':
    case 'FAILURE':  return <TerminalConfig config={config} onChange={onChange} />
    case 'START':    return <StartHint />
    default:         return null
  }
}

function StartHint() {
  return (
    <p className="text-xs text-muted leading-relaxed">
      The Start node receives the incoming trigger payload.{' '}
      <span className="font-mono text-accent">{'{{nodes.start.output.*}}'}</span>
    </p>
  )
}

// ── Field — reusable label + content wrapper ──────────────────────────────────

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[10px] font-mono text-muted tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
