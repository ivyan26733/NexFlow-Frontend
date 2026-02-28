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
      <p className="config-panel-description">
        Map fields from any previous node (e.g. <span className="config-panel-code-inline">{'{{nodes.fetchUser.successOutput.body}}'}</span> or <span className="config-panel-code-inline">{'{{nex.userData.result}}'}</span> if saved as &quot;userData&quot;). The output becomes the body sent to the next Pulse.
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
            <button type="button" onClick={() => removeField(k)} className="config-panel-btn-ghost flex-shrink-0" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)' }} title="Remove field">✕</button>
          </div>
        ))}
        <button type="button" onClick={addField} className="config-panel-add-btn">
          + Add field
        </button>
      </div>
    </Field>
  )
}
