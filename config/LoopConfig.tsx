'use client'

import { useRef } from 'react'
import { Field } from '../NodeConfigPanel'

interface Props {
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
  nodeLabel?: string
}

function toLabelKey(label: string): string {
  if (!label?.trim()) return 'node'
  const words = label.trim().replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)
  if (!words.length) return 'node'
  return words[0].toLowerCase() + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')
}

export default function LoopConfig({ config, onChange, nodeLabel }: Props) {
  const condition = (config.condition as string) ?? ''
  const maxIterations = (config.maxIterations as number) ?? 100
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertAtCursor(text: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = condition.substring(0, start)
    const after = condition.substring(end)
    const newVal = before + text + after
    onChange({ ...config, condition: newVal })
    setTimeout(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  const refName = nodeLabel ? toLabelKey(nodeLabel) : 'NODENAME'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── CONDITION ────────────────────────────────────────── */}
      <Field label="LOOP CONDITION" className="config-panel-field">
        <textarea
          ref={textareaRef}
          className="input-base font-mono"
          rows={3}
          placeholder="{{loop.index}} < 10"
          value={condition}
          onChange={e => onChange({ ...config, condition: e.target.value })}
          style={{ resize: 'vertical', minHeight: '4.5rem' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => insertAtCursor('{{loop.index}} < 5')}
            className="input-base"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
          >
            index &lt; N
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor("{{nodes." + refName + ".successOutput.hasMore}} == true")}
            className="input-base"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
          >
            hasMore == true
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor("{{nodes." + refName + ".successOutput.status}} != 'done'")}
            className="input-base"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
          >
            status != done
          </button>
        </div>
        <div className="config-panel-description" style={{ marginTop: '0.5rem', padding: '0.5rem 0.625rem', background: 'var(--color-panel)', borderRadius: '0.375rem', border: '1px solid var(--color-border)' }}>
          When TRUE → loop continues. When FALSE → exits to next node.
        </div>
      </Field>

      {/* ── MAX ITERATIONS ───────────────────────────────────── */}
      <Field label="MAX ITERATIONS" className="config-panel-field">
        <input
          type="number"
          className="input-base"
          min={1}
          max={1000}
          value={maxIterations}
          onChange={e => onChange({ ...config, maxIterations: Math.min(1000, Math.max(1, parseInt(e.target.value, 10) || 100)) })}
        />
        <p className="config-panel-description" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
          Safety cap. If exceeded, flow fails with FAILURE.
        </p>
      </Field>

      {/* ── LOOP VARIABLES (reference guide) ─────────────────── */}
      <Field label="AVAILABLE INSIDE LOOP BODY" className="config-panel-field">
        <pre className="config-panel-code-block">
{`{{loop.index}}          Current iteration (starts at 0)
{{loop.accumulated}}    Array of all past outputs`}
        </pre>
      </Field>

      {/* ── ON EXIT OUTPUT ───────────────────────────────────── */}
      <Field label="AFTER LOOP EXITS, USE:" className="config-panel-field">
        <pre className="config-panel-code-block">
{`{{nodes.${refName}.successOutput.index}}
{{nodes.${refName}.successOutput.accumulated}}
{{nodes.${refName}.successOutput.iterationCount}}`}
        </pre>
      </Field>
    </div>
  )
}
