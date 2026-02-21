'use client'

import { Field } from '../NodeConfigPanel'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

// Config form for VARIABLE nodes
// Each variable can be a static value or a {{ref}} expression
export default function VariableConfig({ config, onChange }: Props) {
  const variables = (config.variables as Record<string, string>) ?? {}

  function updateVar(oldKey: string, newKey: string, val: string) {
    const updated = { ...variables }
    if (oldKey !== newKey) delete updated[oldKey]
    updated[newKey] = val
    onChange({ ...config, variables: updated })
  }

  function addVar() {
    onChange({ ...config, variables: { ...variables, '': '' } })
  }

  function removeVar(key: string) {
    const updated = { ...variables }
    delete updated[key]
    onChange({ ...config, variables: updated })
  }

  return (
    <Field label="VARIABLES">
      <div className="flex flex-col gap-2">
        {Object.entries(variables).map(([k, v], i) => (
          <div key={i} className="flex flex-col gap-1 p-2 bg-panel rounded-lg border border-border">
            <div className="flex gap-1.5 items-center">
              <input
                className="input-base flex-1 text-[11px] font-mono"
                placeholder="variableName"
                defaultValue={k}
                onBlur={e => updateVar(k, e.target.value, v)}
              />
              <button onClick={() => removeVar(k)} className="text-muted hover:text-failure transition-colors text-xs">✕</button>
            </div>
            <input
              className="input-base text-[11px]"
              placeholder="value or {{nodes.x.output.field}}"
              defaultValue={v}
              onBlur={e => updateVar(k, k, e.target.value)}
            />
          </div>
        ))}
        <button onClick={addVar} className="text-xs text-muted hover:text-accent transition-colors text-left">
          + Add variable
        </button>
      </div>
    </Field>
  )
}
