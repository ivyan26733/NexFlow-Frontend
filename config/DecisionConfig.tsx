'use client'

import { Field } from '../NodeConfigPanel'

const OPERATORS = ['GT', 'LT', 'GTE', 'LTE', 'EQ', 'NEQ', 'CONTAINS']

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

// Config form for DECISION nodes — if LEFT operator RIGHT → SUCCESS else FAILURE
export default function DecisionConfig({ config, onChange }: Props) {
  function update(key: string, value: string) {
    onChange({ ...config, [key]: value })
  }

  return (
    <>
      <div className="p-3 bg-panel rounded-lg border border-border text-xs text-muted leading-relaxed mb-2">
        If <span className="text-text font-mono">LEFT op RIGHT</span> is true → <span className="text-success">SUCCESS</span> edge,
        otherwise → <span className="text-failure">FAILURE</span> edge.
      </div>

      <Field label="LEFT VALUE">
        <input
          className="input-base font-mono"
          placeholder="{{variables.amount}} or static"
          value={(config.left as string) ?? ''}
          onChange={e => update('left', e.target.value)}
        />
      </Field>

      <Field label="OPERATOR">
        <select
          className="input-base"
          value={(config.operator as string) ?? 'EQ'}
          onChange={e => update('operator', e.target.value)}
        >
          {OPERATORS.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      </Field>

      <Field label="RIGHT VALUE">
        <input
          className="input-base font-mono"
          placeholder="500 or {{ref}}"
          value={(config.right as string) ?? ''}
          onChange={e => update('right', e.target.value)}
        />
      </Field>
    </>
  )
}
