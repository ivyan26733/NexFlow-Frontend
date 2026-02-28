'use client'

import { Field } from '../NodeConfigPanel'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

// Config form for VARIABLE nodes — multiple key/value pairs; values can be {{ref}} or static
export default function VariableConfig({ config, onChange }: Props) {
  const variables = (config.variables as Record<string, string>) ?? {}

  function updateVar(oldKey: string, newKey: string, val: string) {
    const updated = { ...variables }
    if (oldKey !== newKey) delete updated[oldKey]
    if (newKey.trim() !== '' || val !== '') updated[newKey.trim() || oldKey] = val
    onChange({ ...config, variables: updated })
  }

  function addVar() {
    const uniqueKey = `var_${Date.now()}`
    onChange({ ...config, variables: { ...variables, [uniqueKey]: '' } })
  }

  function removeVar(key: string) {
    const updated = { ...variables }
    delete updated[key]
    onChange({ ...config, variables: updated })
  }

  const entries = Object.entries(variables)

  return (
    <Field label="VARIABLES">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {entries.length === 0 && (
          <p className="config-panel-description">
            Add one or more variables. Use {'{{'} refs {'}}'} for dynamic values.
          </p>
        )}
        {entries.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              padding: '0.5rem',
              background: 'var(--color-panel)',
              borderRadius: '0.5rem',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <input
                className="input-base"
                style={{ flex: 1, fontSize: '0.6875rem', fontFamily: 'var(--font-mono)' }}
                placeholder="variableName"
                value={k}
                onChange={e => updateVar(k, e.target.value, v)}
              />
              <button
                type="button"
                onClick={() => removeVar(k)}
                style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem' }}
                aria-label="Remove variable"
              >
                ✕
              </button>
            </div>
            <input
              className="input-base"
              style={{ fontSize: '0.6875rem' }}
              placeholder="value or {{nodes.x.output.field}} or {{nex.userData.field}}"
              value={v}
              onChange={e => updateVar(k, k, e.target.value)}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addVar}
          className="config-panel-add-btn"
          style={{ marginTop: entries.length > 0 ? '0.25rem' : 0 }}
        >
          + Add variable
        </button>
      </div>
    </Field>
  )
}
