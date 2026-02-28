'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { SlidersHorizontal, Code2 } from 'lucide-react'
import { Field } from '../NodeConfigPanel'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr:     false,
  loading: () => <div style={{ height: '200px', background: '#1e1e1e', borderRadius: '0.5rem' }} />,
})

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

type Mode     = 'simple' | 'code'
type Language = 'javascript' | 'python'

const OPERATORS = [
  { value: 'GT',       label: '> Greater than' },
  { value: 'LT',       label: '< Less than' },
  { value: 'GTE',      label: '>= Greater or equal' },
  { value: 'LTE',      label: '<= Less or equal' },
  { value: 'EQ',       label: '= Equals' },
  { value: 'NEQ',      label: '≠ Not equals' },
  { value: 'CONTAINS', label: '⊃ Contains' },
]

const STARTER_CODE: Record<Language, string> = {
  javascript: `// Return true → SUCCESS edge, false → FAILURE edge

// 'Fetch Order' label → fetchOrder key
const amount = input.nodes.fetchOrder?.successOutput?.body?.total
              ?? input.variables.amount
              ?? input.trigger?.amount
              ?? 0

return amount > 500`,

  python: `# Assign True or False to 'result'
# True  → SUCCESS edge
# False → FAILURE edge

# 'Fetch Order' label → fetchOrder key
amount = (input.get('nodes', {}).get('fetchOrder', {}).get('successOutput', {}).get('body', {}).get('total')
          or input.get('variables', {}).get('amount')
          or input.get('trigger', {}).get('amount', 0))

result = float(amount) > 500`,
}

export default function DecisionConfig({ config, onChange }: Props) {
  const mode     = (config.mode     as Mode)     ?? 'simple'
  const language = (config.language as Language) ?? 'javascript'
  const code     = (config.code     as string)   ?? STARTER_CODE[language]

  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  function switchMode(m: Mode) {
    onChange({ ...config, mode: m })
  }

  function switchLanguage(lang: Language) {
    const currentCode  = config.code as string ?? ''
    const isStarter    = !currentCode || Object.values(STARTER_CODE).includes(currentCode)
    onChange({
      ...config,
      language: lang,
      code:     isStarter ? STARTER_CODE[lang] : currentCode,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

      {/* Mode tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
        <ModeTab
          active={mode === 'simple'}
          onClick={() => switchMode('simple')}
          icon={<SlidersHorizontal size={13} />}
          label="Simple"
          description="Dropdown condition"
        />
        <ModeTab
          active={mode === 'code'}
          onClick={() => switchMode('code')}
          icon={<Code2 size={13} />}
          label="Code"
          description="Write custom logic"
        />
      </div>

      {/* Simple mode */}
      {mode === 'simple' && (
        <>
          <div style={{ padding: '0.5rem 0.625rem', background: 'var(--color-panel)', borderRadius: '0.375rem', border: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            If <span style={{ color: 'var(--color-text)' }}>LEFT op RIGHT</span> is true →{' '}
            <span style={{ color: '#00e676' }}>SUCCESS</span> edge, otherwise →{' '}
            <span style={{ color: '#ff4444' }}>FAILURE</span> edge.
          </div>

          <Field label="LEFT VALUE">
            <input
              className="input-base font-mono"
              placeholder="{{variables.amount}} or {{nex.userData.field}}"
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
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </Field>

          <Field label="RIGHT VALUE">
            <input
              className="input-base font-mono"
              placeholder="500 or {{nex.userData.userId}}"
              value={(config.right as string) ?? ''}
              onChange={e => update('right', e.target.value)}
            />
          </Field>
        </>
      )}

      {/* Code mode */}
      {mode === 'code' && (
        <>
          {/* Language toggle */}
          <Field label="LANGUAGE">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
              <LangButton active={language === 'javascript'} color="#f0db4f" onClick={() => switchLanguage('javascript')}>
                JavaScript
              </LangButton>
              <LangButton active={language === 'python'} color="#3572A5" onClick={() => switchLanguage('python')}>
                Python
              </LangButton>
            </div>
          </Field>

          <Field label="CONDITION CODE">
            <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--color-border)', height: '200px' }}>
              <MonacoEditor
                height="100%"
                language={language}
                value={code}
                onChange={val => update('code', val ?? '')}
                theme="vs-dark"
                options={{
                  fontSize:             13,
                  minimap:              { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers:          'on',
                  wordWrap:             'on',
                  tabSize:              2,
                  automaticLayout:      true,
                  padding:              { top: 8 },
                }}
              />
            </div>
          </Field>

          {/* Return hint */}
          <div style={{ padding: '0.5rem 0.625rem', background: 'var(--color-panel)', borderRadius: '0.375rem', border: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {language === 'javascript'
              ? <><code style={{ color: '#f0db4f' }}>return true</code> → SUCCESS edge &nbsp;·&nbsp; <code style={{ color: '#f0db4f' }}>return false</code> → FAILURE edge</>
              : <><code style={{ color: '#3572A5' }}>result = True</code> → SUCCESS &nbsp;·&nbsp; <code style={{ color: '#3572A5' }}>result = False</code> → FAILURE</>
            }
          </div>
        </>
      )}
    </div>
  )
}

// ── Small reusable buttons ─────────────────────────────────────────────────────

function ModeTab({ active, onClick, icon, label, description }: {
  active:      boolean
  onClick:     () => void
  icon:        React.ReactNode
  label:       string
  description: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display:      'flex', alignItems: 'center', gap: '0.5rem',
        padding:      '0.5rem 0.625rem',
        borderRadius: '0.375rem',
        border:       `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background:   active ? 'rgba(0,212,255,0.08)' : 'var(--color-panel)',
        color:        active ? 'var(--color-accent)' : 'var(--color-muted)',
        cursor:       'pointer',
        textAlign:    'left',
        transition:   'all 0.15s',
      }}
    >
      {icon}
      <div>
        <p style={{ fontSize: '0.78rem', fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>{label}</p>
        <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>{description}</p>
      </div>
    </button>
  )
}

function LangButton({ active, onClick, color, children }: {
  active:   boolean
  onClick:  () => void
  color:    string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      '0.5rem',
        borderRadius: '0.375rem',
        border:       `1px solid ${active ? color + '60' : 'var(--color-border)'}`,
        background:   active ? `${color}14` : 'var(--color-panel)',
        color:        active ? color : 'var(--color-muted)',
        fontWeight:   active ? 600 : 400,
        fontSize:     '0.78rem',
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}
