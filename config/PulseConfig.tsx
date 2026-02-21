'use client'

import { Field } from '../NodeConfigPanel'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

// Config form for PULSE nodes (HTTP call)
export default function PulseConfig({ config, onChange }: Props) {
  const headers = (config.headers as Record<string, string>) ?? {}
  const body    = (config.body    as Record<string, string>) ?? {}

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  function updateHeader(k: string, v: string) {
    onChange({ ...config, headers: { ...headers, [k]: v } })
  }

  function addHeader() {
    onChange({ ...config, headers: { ...headers, '': '' } })
  }

  function updateBodyField(k: string, v: string) {
    onChange({ ...config, body: { ...body, [k]: v } })
  }

  function addBodyField() {
    onChange({ ...config, body: { ...body, '': '' } })
  }

  return (
    <>
      <Field label="URL">
        <input
          type="text"
          className="input-base"
          placeholder="https://api.example.com/endpoint"
          value={(config.url as string) ?? ''}
          onChange={e => update('url', e.target.value)}
        />
      </Field>

      <Field label="METHOD">
        <select
          className="input-base"
          value={(config.method as string) ?? 'GET'}
          onChange={e => update('method', e.target.value)}
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>

      <Field label="HEADERS">
        <div className="flex flex-col gap-1.5">
          {Object.entries(headers).map(([k, v], i) => (
            <div key={i} className="flex gap-1.5">
              <input className="input-base flex-1 text-[11px]" placeholder="Key"   defaultValue={k} onBlur={e => updateHeader(e.target.value, v)} />
              <input className="input-base flex-1 text-[11px]" placeholder="Value" defaultValue={v} onBlur={e => updateHeader(k, e.target.value)} />
            </div>
          ))}
          <button onClick={addHeader} className="text-xs text-muted hover:text-accent transition-colors text-left">+ Add header</button>
        </div>
      </Field>

      <Field label="BODY">
        <div className="flex flex-col gap-1.5">
          {Object.entries(body).map(([k, v], i) => (
            <div key={i} className="flex gap-1.5">
              <input className="input-base flex-1 text-[11px]" placeholder="Key"   defaultValue={k} onBlur={e => updateBodyField(e.target.value, v)} />
              <input className="input-base flex-1 text-[11px]" placeholder="Value or {{ref}}" defaultValue={v} onBlur={e => updateBodyField(k, e.target.value)} />
            </div>
          ))}
          <button onClick={addBodyField} className="text-xs text-muted hover:text-accent transition-colors text-left">+ Add field</button>
        </div>
      </Field>
    </>
  )
}
