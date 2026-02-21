'use client'

import { Field } from '../NodeConfigPanel'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

// Config for SUCCESS and FAILURE terminal nodes — shape the final response
export default function TerminalConfig({ config, onChange }: Props) {
  const response = (config.response as Record<string, string>) ?? {}

  function updateField(oldKey: string, newKey: string, val: string) {
    const updated = { ...response }
    if (oldKey !== newKey) delete updated[oldKey]
    updated[newKey] = val
    onChange({ ...config, response: updated })
  }

  function addField() {
    onChange({ ...config, response: { ...response, '': '' } })
  }

  return (
    <Field label="RESPONSE BODY">
      <p className="text-[10px] text-muted mb-2">Shape what gets returned when the flow ends here.</p>
      <div className="flex flex-col gap-1.5">
        {Object.entries(response).map(([k, v], i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input
              className="input-base flex-1 text-[11px] font-mono"
              placeholder="fieldName"
              defaultValue={k}
              onBlur={e => updateField(k, e.target.value, v)}
            />
            <input
              className="input-base flex-1 text-[11px]"
              placeholder="value or {{ref}}"
              defaultValue={v}
              onBlur={e => updateField(k, k, e.target.value)}
            />
          </div>
        ))}
        <button onClick={addField} className="text-xs text-muted hover:text-accent transition-colors text-left">
          + Add field
        </button>
      </div>
    </Field>
  )
}
