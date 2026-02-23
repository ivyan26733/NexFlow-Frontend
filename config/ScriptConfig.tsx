'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Code2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { Field } from '../NodeConfigPanel'

// Load Monaco dynamically — it's a large library and must not run on server
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr:     false,
  loading: () => <EditorSkeleton />,
})

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

type Language = 'javascript' | 'python'

// Starter code shown when the user first switches to a language
const STARTER_CODE: Record<Language, string> = {
  javascript: `// input.variables  — all flow variables
// input.nodes       — all previous node outputs
// input.trigger     — original trigger payload

// Node labels become camelCase keys: 'Fetch Orders' → fetchOrders
const items = input.nodes.fetchOrders?.successOutput?.body?.items ?? []

const filtered = items.filter(item => item.active && item.price > 100)

return {
  filtered,
  count: filtered.length
}`,

  python: `# input['variables']  — all flow variables
# input['nodes']       — all previous node outputs
# input['trigger']     — original trigger payload

# Node labels become camelCase keys: 'Fetch Orders' → fetchOrders
items = input['nodes'].get('fetchOrders', {}).get('successOutput', {}).get('body', {}).get('items', [])

filtered = [item for item in items if item.get('active') and item.get('price', 0) > 100]

# Assign your final value to 'result'
result = {
    'filtered': filtered,
    'count':    len(filtered)
}`,
}

export default function ScriptConfig({ config, onChange }: Props) {
  const language = (config.language as Language) ?? 'javascript'
  const code     = (config.code     as string)   ?? STARTER_CODE[language]

  const [helpOpen, setHelpOpen] = useState(false)

  function setLanguage(lang: Language) {
    // Only reset code to starter if the editor is still empty / unchanged
    const currentCode = config.code as string ?? ''
    const isStarter   = !currentCode || Object.values(STARTER_CODE).includes(currentCode)
    onChange({
      ...config,
      language: lang,
      code: isStarter ? STARTER_CODE[lang] : currentCode,
    })
  }

  function setCode(val: string | undefined) {
    onChange({ ...config, code: val ?? '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

      {/* Language selector */}
      <Field label="LANGUAGE">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
          <LangTab active={language === 'javascript'} onClick={() => setLanguage('javascript')} color="#f0db4f">
            JavaScript
          </LangTab>
          <LangTab active={language === 'python'} onClick={() => setLanguage('python')} color="#3572A5">
            Python
          </LangTab>
        </div>
      </Field>

      {/* Monaco editor */}
      <Field label="CODE">
        <div style={{
          borderRadius:  '0.5rem',
          overflow:      'hidden',
          border:        '1px solid var(--color-border)',
          // A bit taller than the default to give room to write
          height:        '280px',
        }}>
          <MonacoEditor
            height="100%"
            language={language}
            value={code}
            onChange={setCode}
            theme="vs-dark"
            options={{
              fontSize:          13,
              fontFamily:        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              minimap:           { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers:       'on',
              renderLineHighlight: 'line',
              wordWrap:          'on',
              tabSize:           2,
              automaticLayout:   true,   // resize with panel
              padding:           { top: 10 },
            }}
          />
        </div>
      </Field>

      {/* Return syntax reminder */}
      <ReturnSyntaxHint language={language} />

      {/* Collapsible help panel */}
      <button
        onClick={() => setHelpOpen(h => !h)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-muted)', fontSize: '0.75rem', padding: '0.25rem 0',
          textAlign: 'left',
        }}
      >
        {helpOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <BookOpen size={13} />
        What is available in <code style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>input</code>
      </button>

      {helpOpen && <HelpPanel language={language} />}
    </div>
  )
}

// ── Language tab button ────────────────────────────────────────────────────────

function LangTab({ active, onClick, color, children }: {
  active:   boolean
  onClick:  () => void
  color:    string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        border:       `1px solid ${active ? color + '60' : 'var(--color-border)'}`,
        background:   active ? `${color}14` : 'var(--color-panel)',
        color:        active ? color : 'var(--color-muted)',
        fontWeight:   active ? 600 : 400,
        fontSize:     '0.8rem',
        cursor:       'pointer',
        transition:   'all 0.15s',
        display:      'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
      }}
    >
      <Code2 size={13} />
      {children}
    </button>
  )
}

// ── Return syntax reminder ────────────────────────────────────────────────────

function ReturnSyntaxHint({ language }: { language: Language }) {
  if (language === 'javascript') {
    return (
      <div style={{ padding: '0.5rem 0.625rem', background: 'var(--color-panel)', borderRadius: '0.375rem', border: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Use <code style={{ color: '#f0db4f' }}>return</code> to output a value:</p>
        <code style={{ fontSize: '0.7rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>return {'{ result: filtered }'}</code>
      </div>
    )
  }
  return (
    <div style={{ padding: '0.5rem 0.625rem', background: 'var(--color-panel)', borderRadius: '0.375rem', border: '1px solid var(--color-border)' }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Assign your final value to <code style={{ color: '#3572A5' }}>result</code>:</p>
      <code style={{ fontSize: '0.7rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>result = {'{ "count": 5 }'}</code>
    </div>
  )
}

// ── Help panel ────────────────────────────────────────────────────────────────

function HelpPanel({ language }: { language: Language }) {
  const isJs = language === 'javascript'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'var(--color-panel)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>

      <div>
        <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-accent)', marginBottom: '0.375rem' }}>input.variables</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>All variables set by VARIABLE nodes upstream.</p>
        <code style={{ fontSize: '0.68rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>
          {isJs ? 'input.variables.userId' : "input['variables']['userId']"}
        </code>
      </div>

      <div>
        <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-accent)', marginBottom: '0.375rem' }}>input.nodes</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>Outputs from all previous nodes. Use the node ID shown on the canvas.</p>
        <code style={{ fontSize: '0.68rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>
          {isJs
            ? 'input.nodes.fetchOrders.successOutput.body.items'
            : "input['nodes']['fetchOrders']['successOutput']['body']['items']"}
        </code>
        <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
          The key is the camelCase version of the node label. "Fetch Orders" → fetchOrders
        </p>
      </div>

      <div>
        <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-accent)', marginBottom: '0.375rem' }}>input.trigger</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>The original payload sent to trigger this flow.</p>
        <code style={{ fontSize: '0.68rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>
          {isJs ? 'input.trigger.userId' : "input['trigger']['userId']"}
        </code>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.625rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
          The value you return is stored under this node's label key. If this node is labelled
          "Calculate Discount", downstream nodes reference it as{' '}
          <code style={{ fontFamily: 'monospace', color: 'var(--color-accent)', fontSize: '0.68rem' }}>
            {'{{nodes.calculateDiscount.successOutput.result}}'}
          </code>
        </p>
      </div>
    </div>
  )
}

// ── Loading skeleton shown while Monaco downloads ─────────────────────────────

function EditorSkeleton() {
  return (
    <div style={{ height: '280px', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '0.75rem', color: '#666' }}>Loading editor…</p>
    </div>
  )
}
