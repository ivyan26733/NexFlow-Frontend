'use client'

import { useState } from 'react'
import { Field } from '../NodeConfigPanel'

interface FieldEntry {
  id:    string   // stable — React key, never changes
  key:   string   // output field name
  value: string   // value or {{ref}}
}

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

function initEntries(output: Record<string, string>): FieldEntry[] {
  return Object.entries(output).map(([k, v], i) => ({
    id:    `f_${i}_${k}`,
    key:   k,
    value: v,
  }))
}

// Config form for MAPPER nodes — one row per output field (key → value/ref)
export default function MapperConfig({ config, onChange }: Props) {
  const output = (config.output as Record<string, string>) ?? {}

  // Stable IDs prevent focus loss when renaming a field key mid-keystroke.
  const [entries, setEntries] = useState<FieldEntry[]>(() => initEntries(output))

  function commit(next: FieldEntry[]) {
    const map: Record<string, string> = {}
    for (const e of next) {
      if (e.key.trim() !== '') map[e.key.trim()] = e.value
    }
    onChange({ ...config, output: map })
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

  function addField() {
    const id = `f_${Date.now()}`
    setEntries(prev => [...prev, { id, key: '', value: '' }])
    // don't commit — empty key not worth persisting yet
  }

  function removeField(id: string) {
    const next = entries.filter(e => e.id !== id)
    setEntries(next)
    commit(next)
  }

  return (
    <Field label="OUTPUT SHAPE">
      <p className="config-panel-description">
        One row per output field. Use{' '}
        <span className="config-panel-code-inline">{'{{nex.fetchUser.body.email}}'}</span>{' '}
        or <span className="config-panel-code-inline">{'{{nex.userId}}'}</span> as values.
      </p>
      <div className="flex flex-col gap-2">
        {entries.map(({ id, key, value }) => (
          <div key={id} className="flex gap-1.5 items-center">
            <input
              className="input-base flex-1 text-[11px] font-mono"
              placeholder="fieldName"
              value={key}
              onChange={e => updateKey(id, e.target.value)}
            />
            <span className="text-muted text-xs">→</span>
            <input
              className="input-base flex-1 text-[11px]"
              placeholder="{{nex.field}} or static value"
              value={value}
              onChange={e => updateValue(id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeField(id)}
              className="config-panel-btn-ghost flex-shrink-0"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}
              title="Remove field"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addField} className="config-panel-add-btn">
          + Add field
        </button>
      </div>
    </Field>
  )
}
