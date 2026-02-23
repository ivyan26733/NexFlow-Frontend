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

export default function NodeConfigPanel({ node, currentFlowId, onUpdate, onClose, onRemove }: Props) {
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
    <aside className="w-80 bg-surface border-l border-border flex flex-col overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
          <span className="text-sm font-medium" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {onRemove && nodeType !== 'START' && (
            <button
              onClick={onRemove}
              title="Delete node"
              className="p-1.5 text-muted hover:text-failure transition-colors rounded"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-muted hover:text-text transition-colors rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">

        {/* Label */}
        <Field label="LABEL">
          <input
            type="text"
            value={label}
            onChange={e => updateLabel(e.target.value)}
            className="input-base"
            placeholder="Node label…"
          />
        </Field>

        {/* Node-type specific config */}
        <NodeForm
          nodeType={nodeType}
          config={node.data.config as Record<string, unknown>}
          currentFlowId={currentFlowId}
          onChange={updateConfig}
        />

        {/* Reference hint */}
        <div className="mt-auto flex flex-col gap-2 flex-shrink-0">

          {/* Reference-as badge — shows the camelCase name for this node */}
          <div className="p-3 bg-panel rounded-lg border border-border">
            <p className="text-[10px] font-mono text-muted tracking-wider mb-1.5">REFERENCE AS</p>
            <div className="flex items-center gap-2">
              <code className="text-[12px] font-mono text-accent flex-1">{toLabelKey(label || 'node')}</code>
              <button
                onClick={copyNodeId}
                title="Copy reference key"
                className="p-1 text-muted hover:text-accent transition-colors flex-shrink-0"
              >
                {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              </button>
            </div>
            <p className="text-[10px] text-muted mt-1">
              Change the label above to change this name
            </p>
          </div>

          {/* Reference syntax examples */}
          <div className="p-3 bg-panel rounded-lg border border-border">
            <p className="text-[10px] font-mono text-muted tracking-wider mb-1.5">USE IN OTHER NODES</p>
            <p className="text-[11px] font-mono text-accent break-all">
              {'{{nodes.' + toLabelKey(label || 'node') + '.successOutput.result}}'}
            </p>
            <p className="text-[11px] font-mono text-muted break-all mt-1">
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

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-mono text-muted tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
