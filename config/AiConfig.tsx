'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/api'

// ── Static model registry (no API call needed) ─────────────────────────
// Keep the common model list local so the dropdown works even before the API responds.
const PROVIDER_MODELS: Record<string, { models: string[]; default: string }> = {
  ANTHROPIC: {
    models: [
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
    ],
    default: 'claude-haiku-4-5-20251001',
  },
  OPENAI: {
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    default: 'gpt-4o-mini',
  },
  GEMINI: {
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-lite-001',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-pro-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-lite-preview-09-2025',
      'gemini-3-pro-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-pro-preview',
      'gemini-2.0-flash-exp-image-generation',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
      'gemma-3-1b-it',
      'gemma-3-4b-it',
      'gemma-3-12b-it',
      'gemma-3-27b-it',
      'gemma-3n-e4b-it',
      'gemma-3n-e2b-it',
      'gemini-2.5-flash-image',
      'gemini-3.1-pro-preview-customtools',
      'gemini-3-pro-image-preview',
      'nano-banana-pro-preview',
      'gemini-3.1-flash-image-preview',
      'gemini-robotics-er-1.5-preview',
      'gemini-2.5-computer-use-preview-10-2025',
      'deep-research-pro-preview-12-2025',
    ],
    default: 'gemini-2.0-flash',
  },
  GROQ: {
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    default: 'llama-3.3-70b-versatile',
  },
  MISTRAL: {
    models: [
      'mistral-small-latest',
      'mistral-medium-latest',
      'mistral-large-latest',
      'codestral-latest',
    ],
    default: 'mistral-small-latest',
  },
  MLVOCA: {
    models: ['tinyllama', 'deepseek-r1:1.5b'],
    default: 'tinyllama',
  },
  CUSTOM: {
    models: [],
    default: '',
  },
}

// Warm-theme provider colors (legible on light backgrounds)
const PROVIDER_META: Record<string, { icon: string; color: string; label: string }> = {
  ANTHROPIC: { icon: '◎', color: '#C2410C',  label: 'Anthropic' },
  OPENAI:    { icon: '⬡', color: '#0F766E',  label: 'OpenAI' },
  GEMINI:    { icon: '✦', color: '#1D4ED8',  label: 'Gemini' },
  GROQ:      { icon: '⚡', color: '#B45309',  label: 'Groq' },
  MISTRAL:   { icon: '◈', color: '#1E3A5F',  label: 'Mistral' },
  MLVOCA:    { icon: '◇', color: '#0F766E',  label: 'MLvoca (testing)' },
  CUSTOM:    { icon: '⚙', color: '#6B5A45',  label: 'Custom' },
}

interface InputBinding {
  name:    string
  nexPath: string
}

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
  nodeLabel?: string
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block', fontSize: '10px', color: 'var(--color-muted)',
        letterSpacing: '0.1em', marginBottom: '6px', fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '4px', lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 12px' }}>
      <span style={{ fontSize: '9px', color: 'var(--color-muted)', letterSpacing: '0.18em', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
    </div>
  )
}

export default function AiConfig({ config, onChange, nodeLabel }: Props) {
  const provider      = (config.provider      as string) ?? 'ANTHROPIC'
  const model         = (config.model         as string) ?? ''
  const prompt        = (config.prompt        as string) ?? ''
  const inputBindings: InputBinding[] = Array.isArray(config.inputBindings) ? config.inputBindings as InputBinding[] : []
  const outputSchema  = (config.outputSchema  as string) ?? ''
  const maxTokens     = (config.maxTokens     as number) ?? 1000
  const temperature   = (config.temperature   as number) ?? 0

  // This badge only reflects what the API reports; the backend still owns selection.
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({})
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.llmProviders.list()
      .then((list: Array<{ provider: string; configured: boolean; enabled: boolean }>) => {
        const map: Record<string, boolean> = {}
        list.forEach(p => { map[p.provider] = p.configured && p.enabled })
        setProviderStatus(map)
      })
      .catch(() => {})
  }, [])

  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  function selectProvider(p: string) {
    const defaultModel = PROVIDER_MODELS[p]?.default ?? ''
    onChange({ ...config, provider: p, model: defaultModel })
  }

  function updateBinding(i: number, field: 'name' | 'nexPath', val: string) {
    const next = inputBindings.map((b, j) => j === i ? { ...b, [field]: val } : b)
    set('inputBindings', next)
  }

  function addBinding() {
    set('inputBindings', [...inputBindings, { name: '', nexPath: '' }])
  }

  function removeBinding(i: number) {
    set('inputBindings', inputBindings.filter((_, j) => j !== i))
  }

  function insertRef(name: string) {
    const el = promptRef.current
    if (!el || !name) return
    const start = el.selectionStart ?? prompt.length
    const end   = el.selectionEnd   ?? prompt.length
    const ref   = `{{${name}}}`
    const next  = prompt.slice(0, start) + ref + prompt.slice(end)
    set('prompt', next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + ref.length, start + ref.length)
    }, 10)
  }

  const meta   = PROVIDER_META[provider] ?? PROVIDER_META.CUSTOM
  const models = PROVIDER_MODELS[provider]?.models ?? []
  const color  = meta.color

  return (
    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>

      <SectionLabel>LLM PROVIDER</SectionLabel>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        marginBottom: '6px',
      }}>
        {Object.entries(PROVIDER_META).map(([key, pm]) => {
          const isActive      = provider === key
          const isConfigured  = providerStatus[key]

          return (
            <div
              key={key}
              onClick={() => selectProvider(key)}
              title={key}
              style={{
                padding: '10px 6px',
                border: isActive ? `1.5px solid ${pm.color}` : '1px solid var(--color-border)',
                borderRadius: '7px',
                cursor: 'pointer',
                background: isActive ? `${pm.color}12` : 'var(--color-surface)',
                textAlign: 'center',
                transition: 'all 0.15s',
                position: 'relative',
                outline: isActive ? `2px solid ${pm.color}25` : 'none',
                outlineOffset: '1px',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = pm.color + '80'
                  el.style.background  = pm.color + '08'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'var(--color-border)'
                  el.style.background  = 'var(--color-surface)'
                }
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: '5px', right: '5px',
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: pm.color,
                }} />
              )}
              {isConfigured && !isActive && (
                <div style={{
                  position: 'absolute', top: '5px', right: '5px',
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#15803D', opacity: 0.7,
                }} />
              )}
              <div style={{ fontSize: '16px', marginBottom: '4px', color: isActive ? pm.color : 'var(--color-muted)' }}>
                {pm.icon}
              </div>
              <div style={{
                fontSize: '9px', letterSpacing: '0.04em',
                color: isActive ? pm.color : 'var(--color-muted)',
                fontWeight: isActive ? '700' : 'normal',
              }}>
                {pm.label}
              </div>
            </div>
          )
        })}
      </div>

      {!providerStatus[provider] && Object.keys(providerStatus).length > 0 && (
        <div style={{
          padding: '8px 12px', marginBottom: '8px',
          border: '1px solid rgba(180,83,9,0.25)',
          borderRadius: '5px', background: 'rgba(180,83,9,0.06)',
          fontSize: '11px', color: '#B45309',
        }}>
          ⚠ No API key for {meta.label}.{' '}
          <a href="/settings/ai-providers" style={{ color: '#B45309', textDecoration: 'underline' }}>
            Settings → AI Providers
          </a>
        </div>
      )}

      <SectionLabel>MODEL</SectionLabel>

      <Field label="MODEL NAME">
        {models.length > 0 ? (
          <select
            key={provider}
            value={model}
            onChange={e => set('model', e.target.value)}
            className="input-base"
          >
            <option value="">— default —</option>
            {models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input
            key={provider}
            value={model}
            onChange={e => set('model', e.target.value)}
            placeholder="Enter model name"
            className="input-base"
          />
        )}
      </Field>

      <SectionLabel>TASK PROMPT</SectionLabel>

      <Field
        label="WHAT SHOULD THE AI DO?"
        hint="Use {{bindingName}} to reference input bindings below."
      >
        <textarea
          ref={promptRef}
          value={prompt}
          onChange={e => set('prompt', e.target.value)}
          placeholder={'e.g. Filter {{orders}} where amount > {{threshold}}.\nReturn { filtered: array, totalCount: number }'}
          rows={5}
          className="input-base"
          style={{ resize: 'vertical', minHeight: '96px', lineHeight: '1.6' }}
        />
      </Field>

      {inputBindings.filter(b => b.name).length > 0 && (
        <div style={{ marginTop: '-6px', marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {inputBindings.filter(b => b.name).map(b => (
            <button
              key={b.name}
              type="button"
              onClick={() => insertRef(b.name)}
              style={{
                fontSize: '10px', padding: '3px 8px',
                background: `${color}0D`, border: `1px solid ${color}30`,
                borderRadius: '4px', color, cursor: 'pointer', fontFamily: 'var(--font-mono)',
              }}
            >
              {'{{' + b.name + '}}'}
            </button>
          ))}
        </div>
      )}

      <SectionLabel>INPUT BINDINGS</SectionLabel>

      <div style={{
        padding: '8px 12px', marginBottom: '12px',
        background: 'rgba(154,52,18,0.05)', border: '1px solid rgba(154,52,18,0.15)',
        borderRadius: '5px', fontSize: '11px', color: 'var(--color-muted)',
      }}>
        AI can <strong>only</strong> see data you bind here. Credentials are blocked.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        {inputBindings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 20px', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: 'var(--color-muted)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>NAME</span>
            <span style={{ fontSize: '9px', color: 'var(--color-muted)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>NEX PATH</span>
          </div>
        )}
        {inputBindings.map((b, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 20px', gap: '6px', alignItems: 'center' }}>
            <input
              value={b.name}
              onChange={e => updateBinding(i, 'name', e.target.value)}
              placeholder="orders"
              className="input-base"
            />
            <input
              value={b.nexPath}
              onChange={e => updateBinding(i, 'nexPath', e.target.value)}
              placeholder="nex.shopify.body.items"
              className="input-base"
            />
            <button
              type="button"
              onClick={() => removeBinding(i)}
              style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '16px', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#991B1B')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
            >×</button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBinding}
        style={{
          fontSize: '11px', color, background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 0', display: 'flex',
          alignItems: 'center', gap: '6px', marginBottom: '4px', fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ fontSize: '16px' }}>+</span> Add input binding
      </button>

      <SectionLabel>OUTPUT SCHEMA (optional)</SectionLabel>

      <Field label="EXPECTED JSON SHAPE" hint="Helps the AI produce consistent structured output.">
        <textarea
          value={outputSchema}
          onChange={e => set('outputSchema', e.target.value)}
          placeholder='{ "filtered": "array", "totalCount": "number" }'
          rows={3}
          className="input-base"
          style={{ resize: 'vertical' }}
        />
      </Field>

      <SectionLabel>ADVANCED</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="MAX TOKENS" hint="Cost cap per call">
          <input
            type="number" min={50} max={8000}
            value={maxTokens}
            onChange={e => set('maxTokens', parseInt(e.target.value) || 1000)}
            className="input-base"
          />
        </Field>
        <Field label="TEMPERATURE" hint="0 = precise, 1 = creative">
          <input
            type="number" min={0} max={1} step={0.1}
            value={temperature}
            onChange={e => set('temperature', parseFloat(e.target.value) || 0)}
            className="input-base"
          />
        </Field>
      </div>

      {nodeLabel && (
        <>
          <SectionLabel>OUTPUT REFERENCE</SectionLabel>
          <div className="config-panel-code-block">
            <div>result → <span style={{ color }}>{`nex.${nodeLabel.toLowerCase().replace(/\s+/g,'')}.result`}</span></div>
            <div>model  → <span style={{ color }}>{`nex.${nodeLabel.toLowerCase().replace(/\s+/g,'')}.model`}</span></div>
            <div>tokens → <span style={{ color }}>{`nex.${nodeLabel.toLowerCase().replace(/\s+/g,'')}.inputTokens`}</span></div>
          </div>
        </>
      )}

    </div>
  )
}
