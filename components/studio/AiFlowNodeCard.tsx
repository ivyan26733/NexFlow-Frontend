'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META } from '@/lib/nodeConfig'
import { NodeIcon } from '@/components/studio/nodeIcons'
import { StatusBadge, nodeVars } from '@/FlowNodeCard'
import type { NodeStatus } from '@/types'

interface AiNodeData {
  label?: string
  config?: {
    provider?: string
    model?: string
    prompt?: string
    inputBindings?: Array<{ name: string }>
    saveOutputAs?: string
  }
  liveStatus?: NodeStatus | null
}

const PROVIDER_LABEL: Record<string, string> = {
  ANTHROPIC: 'Anthropic',
  OPENAI:    'OpenAI',
  GEMINI:    'Gemini',
  GROQ:      'Groq',
  MISTRAL:   'Mistral',
  MLVOCA:    'Mlvoca',
  CUSTOM:    'Custom',
}

/**
 * AI node — same anatomy as every other node so the canvas reads as one system.
 * Violet = "asks a language model". Shows provider · model, the prompt, and which
 * earlier values are fed in ({{bindings}}).
 */
export default function AiFlowNodeCard({ data, selected }: NodeProps) {
  const d        = data as unknown as AiNodeData
  const meta     = NODE_META.AI
  const provider = d.config?.provider ?? 'ANTHROPIC'
  const model    = d.config?.model ? d.config.model.split('/').pop() : 'default model'
  const prompt   = d.config?.prompt?.trim()
  const bindings = (d.config?.inputBindings ?? []).filter(b => b.name)
  const saveAs   = d.config?.saveOutputAs?.trim()

  return (
    <div
      className={`nf-node nf-node--ai${selected ? ' is-selected' : ''}`}
      data-status={d.liveStatus ?? undefined}
      style={nodeVars(meta.color, meta.bgColor, d.liveStatus)}
      title={meta.description}
    >
      <Handle type="target" position={Position.Top} className="nf-handle nf-handle--in" />

      <div className="nf-node__head">
        <span className="nf-node__icon"><NodeIcon type="AI" size={16} /></span>
        <div className="nf-node__titles">
          <div className="nf-node__title">{d.label || 'AI'}</div>
          <div className="nf-node__caption">{PROVIDER_LABEL[provider] ?? provider} · {model}</div>
        </div>
        <StatusBadge status={d.liveStatus} />
      </div>

      <div className="nf-node__body">
        {prompt
          ? <p className="nf-node__prompt">“{prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt}”</p>
          : <span className="nf-node__empty">No prompt yet — click to write one</span>}
        {bindings.length > 0 && (
          <div className="nf-node__chips">
            {bindings.slice(0, 3).map(b => <span key={b.name} className="nf-chip">{`{{${b.name}}}`}</span>)}
            {bindings.length > 3 && <span className="nf-chip nf-chip--more">+{bindings.length - 3}</span>}
          </div>
        )}
        {saveAs && <div className="nf-node__saveas">saved as <b>nex.{saveAs}</b></div>}
      </div>

      <div className="nf-node__outputs">
        <span className="nf-out nf-out--success">✓ Success</span>
        <span className="nf-out nf-out--failure">✗ Error</span>
      </div>
      <Handle type="source" id="success" position={Position.Bottom} className="nf-handle nf-handle--success" style={{ left: '25%' }} title="On success" />
      <Handle type="source" id="failure" position={Position.Bottom} className="nf-handle nf-handle--failure" style={{ left: '75%' }} title="On error" />
    </div>
  )
}
