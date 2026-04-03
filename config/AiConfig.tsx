'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/api'

// ── Static model registry (no API call needed) ────────────────────────────────
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
  // Only models that support generateContent (excludes embed, predict, bidi-only, etc.)
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

const PROVIDER_META: Record<string, { icon: string; color: string; label: string }> = {
  ANTHROPIC: { icon: '◎', color: '#e879f9', label: 'Anthropic' },
  OPENAI:    { icon: '⬡', color: '#10B981', label: 'OpenAI' },
  GEMINI:    { icon: '✦', color: '#4285F4', label: 'Gemini' },
  GROQ:      { icon: '⚡', color: '#F59E0B', label: 'Groq' },
  MISTRAL:   { icon: '◈', color: '#6366F1', label: 'Mistral' },
  MLVOCA:    { icon: '◇', color: '#14B8A6', label: 'MLvoca (testing)' },
  CUSTOM:    { icon: '⚙', color: '#94A3B8', label: 'Custom' },
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
        display: 'block', fontSize: '10px', color: '#64748B',
        letterSpacing: '0.1em', marginBottom: '6px',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: '10px', color: '#334155', marginTop: '4px', lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 12px' }}>
      <span style={{ fontSize: '9px', color: '#334155', letterSpacing: '0.18em', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: '#0F172A' }} />
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
    <div style={{ fontSize: '12px', fontFamily: 'DM Mono, monospace' }}>

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

          const cardStyle: React.CSSProperties = {
            padding: '10px 6px',
            border: isActive ? `1px solid ${pm.color}60` : '1px solid #0F172A',
            borderRadius: '6px',
            cursor: 'pointer',
            background: isActive ? `${pm.color}15` : '#030609',
            textAlign: 'center',
            transition: 'all 0.15s',
            opacity: 1,
            position: 'relative',
            outline: isActive ? `1px solid ${pm.color}30` : 'none',
            outlineOffset: '1px',
          }

          return (
            <div
              key={key}
              onClick={() => selectProvider(key)}
              title={key}
              style={cardStyle}
              onMouseEnter={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = '#1E293B'
                  el.style.background  = '#0A0F1A'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = '#0F172A'
                  el.style.background  = '#030609'
                }
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: '5px', right: '5px',
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: pm.color,
                  boxShadow: `0 0 6px ${pm.color}`,
                }} />
              )}
              {isConfigured && !isActive && (
                <div style={{
                  position: 'absolute', top: '5px', right: '5px',
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#10B981', opacity: 0.6,
                }} />
              )}
              <div style={{ fontSize: '16px', marginBottom: '4px', color: isActive ? pm.color : '#475569' }}>
                {pm.icon}
              </div>
              <div style={{
                fontSize: '9px', letterSpacing: '0.04em',
                color: isActive ? pm.color : '#334155',
                fontWeight: isActive ? '600' : 'normal',
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
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '5px', background: 'rgba(245,158,11,0.05)',
          fontSize: '11px', color: '#F59E0B',
        }}>
          ⚠ No API key for {meta.label}.{' '}
          <a href="/settings/ai-providers" style={{ color: '#F59E0B', textDecoration: 'underline' }}>
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
            style={inputSt}
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
            style={inputSt}
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
          style={{ ...inputSt, resize: 'vertical', minHeight: '96px', lineHeight: '1.6' }}
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
                borderRadius: '4px', color, cursor: 'pointer',
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
        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)',
        borderRadius: '5px', fontSize: '11px', color: '#64748B',
      }}>
        🔒 AI can <strong>only</strong> see data you bind here. Credentials are blocked.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        {inputBindings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 20px', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: '#1E293B', letterSpacing: '0.08em' }}>NAME</span>
            <span style={{ fontSize: '9px', color: '#1E293B', letterSpacing: '0.08em' }}>NEX PATH</span>
          </div>
        )}
        {inputBindings.map((b, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 20px', gap: '6px', alignItems: 'center' }}>
            <input
              value={b.name}
              onChange={e => updateBinding(i, 'name', e.target.value)}
              placeholder="orders"
              style={inputSt}
            />
            <input
              value={b.nexPath}
              onChange={e => updateBinding(i, 'nexPath', e.target.value)}
              placeholder="nex.shopify.body.items"
              style={inputSt}
            />
            <button
              type="button"
              onClick={() => removeBinding(i)}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
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
          alignItems: 'center', gap: '6px', marginBottom: '4px',
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
          style={{ ...inputSt, resize: 'vertical' }}
        />
      </Field>

      <SectionLabel>ADVANCED</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="MAX TOKENS" hint="Cost cap per call">
          <input
            type="number" min={50} max={8000}
            value={maxTokens}
            onChange={e => set('maxTokens', parseInt(e.target.value) || 1000)}
            style={inputSt}
          />
        </Field>
        <Field label="TEMPERATURE" hint="0 = precise, 1 = creative">
          <input
            type="number" min={0} max={1} step={0.1}
            value={temperature}
            onChange={e => set('temperature', parseFloat(e.target.value) || 0)}
            style={inputSt}
          />
        </Field>
      </div>

      {nodeLabel && (
        <>
          <SectionLabel>OUTPUT REFERENCE</SectionLabel>
          <div style={{
            padding: '10px 12px', background: '#030609',
            border: '1px solid #0F172A', borderRadius: '6px',
            fontSize: '11px', color: '#334155', lineHeight: 2,
          }}>
            <div>result → <span style={{ color }}>{`nex.${nodeLabel.toLowerCase().replace(/\s+/g,'')}.result`}</span></div>
            <div>model  → <span style={{ color }}>{`nex.${nodeLabel.toLowerCase().replace(/\s+/g,'')}.model`}</span></div>
            <div>tokens → <span style={{ color }}>{`nex.${nodeLabel.toLowerCase().replace(/\s+/g,'')}.inputTokens`}</span></div>
          </div>
        </>
      )}

    </div>
  )
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: '#030609', border: '1px solid #0F172A',
  borderRadius: '5px', color: '#CBD5E1',
  fontSize: '12px', fontFamily: 'DM Mono, monospace', outline: 'none',
}
