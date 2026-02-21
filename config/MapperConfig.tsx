'use client'

import { Field } from '../NodeConfigPanel'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

// Config form for MAPPER nodes — shapes a new request from previous data
export default function MapperConfig({ config, onChange }: Props) {
  const output = (config.output as Record<string, string>) ?? {}

  function updateField(oldKey: string, newKey: string, val: string) {
    const updated = { ...output }
    if (oldKey !== newKey) delete updated[oldKey]
    updated[newKey] = val
    onChange({ ...config, output: updated })
  }

  function addField() {
    onChange({ ...config, output: { ...output, '': '' } })
  }

  function removeField(key: string) {
    const updated = { ...output }
    delete updated[key]
    onChange({ ...config, output: updated })
  }

  return (
    <Field label="OUTPUT SHAPE">
      <p className="text-[10px] text-muted mb-2 leading-relaxed">
        Map fields from any previous node. The output becomes the body sent to the next Pulse.
      </p>
      <div className="flex flex-col gap-2">
        {Object.entries(output).map(([k, v], i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input
              className="input-base flex-1 text-[11px] font-mono"
              placeholder="fieldName"
              defaultValue={k}
              onBlur={e => updateField(k, e.target.value, v)}
            />
            <span className="text-muted text-xs">→</span>
            <input
              className="input-base flex-1 text-[11px]"
              placeholder="{{ref}} or value"
              defaultValue={v}
              onBlur={e => updateField(k, k, e.target.value)}
            />
            <button onClick={() => removeField(k)} className="text-muted hover:text-failure transition-colors text-xs flex-shrink-0">✕</button>
          </div>
        ))}
        <button onClick={addField} className="text-xs text-muted hover:text-accent transition-colors text-left">
          + Add field
        </button>
      </div>
    </Field>
  )
}
