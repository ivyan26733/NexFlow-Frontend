'use client'

import { useState } from 'react'
import { Field } from '../NodeConfigPanel'

interface VarEntry {
  id:    string   // stable — never changes after creation, used as React key
  key:   string   // variable name (editable)
  value: string   // variable value (editable)
}

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

function initEntries(variables: Record<string, string>): VarEntry[] {
  return Object.entries(variables).map(([k, v], i) => ({
    id:    `v_${i}_${k}`,
    key:   k,
    value: v,
  }))
}

// Config form for VARIABLE nodes — multiple key/value pairs; values can be {{ref}} or static
export default function VariableConfig({ config, onChange }: Props) {
  const variables = (config.variables as Record<string, string>) ?? {}

  // Internal state with stable IDs — prevents focus loss when renaming a key.
  // React key={entry.id} never changes when the user edits the name, so the
  // input element is never unmounted mid-keystroke.
  const [entries, setEntries] = useState<VarEntry[]>(() => initEntries(variables))

  function commit(next: VarEntry[]) {
    const map: Record<string, string> = {}
    for (const e of next) {
      const k = e.key.trim()
      if (k !== '') map[k] = e.value
    }
    onChange({ ...config, variables: map })
  }

  function updateKey(id: string, newKey: string) {
    const next = entries.map(e => e.id === id ? { ...e, key: newKey } : e)
    setEntries(next)
    commit(next)
  }

  function updateValue(id: string, newValue: string) {
    const next = entries.map(e => e.id === id ? { ...e, value: newValue } : e)
    setEntries(next)
    commit(next)
  }

  function addVar() {
    const id = `v_${Date.now()}`
    const next = [...entries, { id, key: '', value: '' }]
    setEntries(next)
    // Don't call commit yet — new entry has empty key, nothing to persist
  }

  function removeVar(id: string) {
    const next = entries.filter(e => e.id !== id)
    setEntries(next)
    commit(next)
  }

  return (
    <Field label="VARIABLES">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {entries.length === 0 && (
          <p className="config-panel-description">
            Add one or more variables. Use <code style={{ fontFamily: 'monospace' }}>{'{{nex.fieldName}}'}</code> to reference trigger fields or prior node outputs.
          </p>
        )}
        {entries.map(({ id, key, value }) => (
          <div
            key={id}
            style={{
              display:      'flex',
              flexDirection: 'column',
              gap:           '0.25rem',
              padding:       '0.5rem',
              background:    'var(--color-panel)',
              borderRadius:  '0.5rem',
              border:        '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <input
                className="input-base"
                style={{ flex: 1, fontSize: '0.6875rem', fontFamily: 'var(--font-mono)' }}
                placeholder="variableName"
                value={key}
                onChange={e => updateKey(id, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeVar(id)}
                style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem' }}
                aria-label="Remove variable"
              >
                ✕
              </button>
            </div>
            <input
              className="input-base"
              style={{ fontSize: '0.6875rem' }}
              placeholder="static value or {{nex.fieldName}} or {{nex.fetchUser.body.email}}"
              value={value}
              onChange={e => updateValue(id, e.target.value)}
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
