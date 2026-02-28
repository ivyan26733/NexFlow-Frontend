'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Copy, Check } from 'lucide-react'
import type { Node } from '@xyflow/react'
import { NODE_META } from '@/lib/nodeConfig'
import type { NodeType } from '@/types'

import NexusConfig    from './config/NexusConfig'
import SubFlowConfig  from './config/SubFlowConfig'
import ScriptConfig   from './config/ScriptConfig'
import VariableConfig from './config/VariableConfig'
import MapperConfig   from './config/MapperConfig'
import DecisionConfig from './config/DecisionConfig'
import LoopConfig from './config/LoopConfig'
import TerminalConfig from './config/TerminalConfig'
import SaveOutputAsField from './config/SaveOutputAsField'

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

  // Sync label when user clicks a different node (panel stays open)
  useEffect(() => {
    setLabel((node.data.label as string) ?? '')
  }, [node.id, node.data.label])

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
          <span className="config-panel-header-title" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {onRemove && nodeType !== 'START' && (
            <button
              type="button"
              onClick={onRemove}
              title="Delete node"
              className="config-panel-btn-ghost config-panel-btn-danger"
              style={{ color: 'var(--color-failure)' }}
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
          nodeLabel={label}
        />

        <div className="mt-auto flex flex-col gap-4 flex-shrink-0">

          <div className="config-panel-card">
            <p className="config-panel-label mb-1.5">REFERENCE AS</p>
            <div className="flex items-center gap-2">
              <code className="config-panel-code flex-1" style={{ marginBottom: 0 }}>{toLabelKey(label || 'node')}</code>
              <button
                type="button"
                onClick={copyNodeId}
                title="Copy reference key"
                className="config-panel-btn-ghost flex-shrink-0"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="config-panel-description mt-1.5" style={{ marginBottom: 0 }}>
              Change the label above to change this name
            </p>
          </div>

          <div className="config-panel-card">
            <p className="config-panel-label mb-1.5">USE IN OTHER NODES</p>
            <code className="config-panel-code">{'{{nodes.' + toLabelKey(label || 'node') + '.successOutput.result}}'}</code>
            <p className="config-panel-description mt-1.5 break-all" style={{ marginBottom: 0 }}>
              Or with &quot;Save output as&quot;: <span className="config-panel-code-inline">{'{{nex.NAME.field}}'}</span> (e.g. <span className="config-panel-code-inline">{'{{nex.userData.result}}'}</span>)
            </p>
            <p className="config-panel-description mt-0.5 break-all" style={{ marginBottom: 0 }}>
              <span className="config-panel-code-inline">{'{{variables.myVar}}'}</span> for variables
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Route to the right config component ──────────────────────────────────────

function NodeForm({ nodeType, config, currentFlowId, onChange, nodeLabel }: {
  nodeType:      NodeType
  config:        Record<string, unknown>
  currentFlowId: string
  onChange:      (c: Record<string, unknown>) => void
  nodeLabel?:    string
}) {
  switch (nodeType) {
    case 'NEXUS':    return (<> <NexusConfig    config={config} onChange={onChange} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'SUB_FLOW': return (<> <SubFlowConfig  config={config} onChange={onChange} currentFlowId={currentFlowId} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'SCRIPT':   return (<> <ScriptConfig   config={config} onChange={onChange} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'VARIABLE': return (<> <VariableConfig config={config} onChange={onChange} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'MAPPER':   return (<> <MapperConfig   config={config} onChange={onChange} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'DECISION': return (<> <DecisionConfig config={config} onChange={onChange} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'LOOP':     return (<> <LoopConfig config={config} onChange={onChange} nodeLabel={nodeLabel} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'SUCCESS':
    case 'FAILURE':  return (<> <TerminalConfig config={config} onChange={onChange} /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    case 'START':    return (<> <StartHint /> <SaveOutputAsField config={config} onChange={onChange} /> </>)
    default:         return null
  }
}

function StartHint() {
  return (
    <p className="config-panel-description">
      The Start node receives the incoming trigger payload.{' '}
      <span className="config-panel-code-inline">{'{{nodes.start.output.*}}'}</span>
    </p>
  )
}

// ── Field — reusable label + content wrapper ──────────────────────────────────

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="config-panel-label block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
