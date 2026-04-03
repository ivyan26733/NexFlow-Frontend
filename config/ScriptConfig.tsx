'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Code2, BookOpen, ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { Field } from '../NodeConfigPanel'
import RetryConfig from './RetryConfig'

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
  javascript: `// nex              — unified flat container (preferred)
// nex.userId        — trigger field or variable named userId
// nex.fetchOrders   — output of the node labelled "Fetch Orders"
// nex.start         — full trigger payload {body: {...}}

// Legacy syntax still works: input.variables.x, input.nodes.x, input.trigger

const items = nex.fetchOrders?.body?.items ?? []

const filtered = items.filter(item => item.active && item.price > 100)

return {
  filtered,
  count: filtered.length
}`,

  python: `# nex              — unified flat container (preferred)
# nex['userId']     — trigger field or variable named userId
# nex['fetchOrders'] — output of the node labelled "Fetch Orders"
# nex['start']      — full trigger payload {'body': {...}}

# Legacy syntax still works: input['variables']['x'], input['nodes']['x']

items = nex.get('fetchOrders', {}).get('body', {}).get('items', [])

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

  const [helpOpen,     setHelpOpen]     = useState(false)
  const [syntaxResult, setSyntaxResult] = useState<{ ok: boolean; error?: string } | null>(null)

  function checkSyntax() {
    setSyntaxResult(null)
    if (language !== 'javascript') {
      setSyntaxResult({ ok: false, error: 'Client-side syntax check is JavaScript only. Use the AI Assistant to review Python code.' })
      return
    }
    try {
      // new Function parses the code for syntax errors without executing it.
      // Pass 'nex' and 'input' as parameter names matching the script wrapper.
      // eslint-disable-next-line no-new-func
      new Function('nex', 'input', code)
      setSyntaxResult({ ok: true })
    } catch (e) {
      if (e instanceof SyntaxError) {
        setSyntaxResult({ ok: false, error: e.message })
      } else {
        // Non-SyntaxError means code parsed fine — runtime issues aren't syntax problems
        setSyntaxResult({ ok: true })
      }
    }
  }

  function setLanguage(lang: Language) {
    setSyntaxResult(null)
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
    setSyntaxResult(null)
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

      {/* Monaco editor with function(nex) wrapper displayed around user code */}
      <Field label="CODE">
        <div style={{ borderRadius: '0.5rem', border: '1px solid var(--color-border)', overflow: 'hidden', background: '#1e1e1e' }}>
          {/* Non-editable function header */}
          <div style={{
            padding:    '6px 14px 2px',
            fontSize:   13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            color:      '#569cd6',
            background: '#1e1e1e',
            userSelect: 'none',
          }}>
            {language === 'javascript'
              ? <><span style={{ color: '#dcdcaa' }}>function</span><span style={{ color: '#cccccc' }}>(</span><span style={{ color: '#9cdcfe' }}>nex</span><span style={{ color: '#cccccc' }}>, </span><span style={{ color: '#9cdcfe' }}>input</span><span style={{ color: '#cccccc' }}>)</span> <span style={{ color: '#cccccc' }}>{'{'}</span></>
              : <><span style={{ color: '#cccccc' }}># </span><span style={{ color: '#9cdcfe' }}>nex</span><span style={{ color: '#cccccc' }}> and </span><span style={{ color: '#9cdcfe' }}>input</span><span style={{ color: '#cccccc' }}> are available</span></>
            }
          </div>
          {/* Editable code body */}
          <div style={{ height: '260px', paddingLeft: language === 'javascript' ? '12px' : '0' }}>
            <MonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={setCode}
              theme="vs-dark"
              options={{
                fontSize:             13,
                fontFamily:           "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                minimap:              { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers:          'on',
                renderLineHighlight:  'line',
                wordWrap:             'on',
                tabSize:              2,
                automaticLayout:      true,
                padding:              { top: 6 },
              }}
            />
          </div>
          {/* Non-editable closing brace (JS only) */}
          {language === 'javascript' && (
            <div style={{
              padding:    '2px 14px 6px',
              fontSize:   13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              color:      '#cccccc',
              background: '#1e1e1e',
              userSelect: 'none',
            }}>{'}'}</div>
          )}
        </div>
      </Field>

      {/* Syntax check button + result */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={checkSyntax}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '0.3rem',
            padding:      '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border:       '1px solid var(--color-border)',
            background:   'var(--color-panel)',
            color:        language === 'javascript' ? 'var(--color-text)' : 'var(--color-muted)',
            fontSize:     '0.75rem',
            cursor:       language === 'javascript' ? 'pointer' : 'default',
            fontFamily:   'inherit',
          }}
        >
          <CheckCircle2 size={12} />
          Check JS Syntax
        </button>

        {syntaxResult && (
          <div style={{
            display:    'flex',
            alignItems: 'flex-start',
            gap:        '0.3rem',
            fontSize:   '0.72rem',
            color:      syntaxResult.ok ? '#10b981' : '#ef4444',
            lineHeight: 1.4,
            flex:       1,
          }}>
            {syntaxResult.ok
              ? <><CheckCircle2 size={12} style={{ marginTop: 1, flexShrink: 0 }} />No syntax errors</>
              : <><XCircle size={12} style={{ marginTop: 1, flexShrink: 0 }} />{syntaxResult.error}</>
            }
          </div>
        )}
      </div>

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
        What is available in <code style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>nex</code>
      </button>

      {helpOpen && <HelpPanel language={language} />}

      <RetryConfig config={config} onChange={onChange} />
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
        <code style={{ fontSize: '0.7rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>return {'{ filtered, count: filtered.length }'}</code>
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
        <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-accent)', marginBottom: '0.375rem' }}>nex.&lt;variableName&gt;</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>Variables set by VARIABLE nodes — directly on nex.</p>
        <code style={{ fontSize: '0.68rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>
          {isJs ? 'nex.userId  //  set by a VARIABLE node' : "nex['userId']  #  set by a VARIABLE node"}
        </code>
      </div>

      <div>
        <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-accent)', marginBottom: '0.375rem' }}>nex.&lt;nodeLabelCamelCase&gt;</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>Output of any previous node. Label "Fetch Orders" → fetchOrders.</p>
        <code style={{ fontSize: '0.68rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>
          {isJs
            ? 'nex.fetchOrders.body.items'
            : "nex['fetchOrders']['body']['items']"}
        </code>
        <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
          NEXUS nodes: <code style={{ fontFamily: 'monospace' }}>{isJs ? 'nex.fetchOrders.statusCode' : "nex['fetchOrders']['statusCode']"}</code>
        </p>
      </div>

      <div>
        <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-accent)', marginBottom: '0.375rem' }}>nex.start</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>Trigger payload. Top-level fields also available directly on nex.</p>
        <code style={{ fontSize: '0.68rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>
          {isJs ? 'nex.start.body.userId  //  or  nex.userId' : "nex['start']['body']['userId']  #  or  nex['userId']"}
        </code>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.625rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
          Your return value is stored under this node&apos;s camelCase label. Reference downstream as{' '}
          <code className="config-panel-code-inline">{'{{nex.calculateDiscount.result}}'}</code>
          {' '}or, with &quot;Save output as&quot; set to e.g. discount:{' '}
          <code className="config-panel-code-inline">{'{{nex.discount.result}}'}</code>
        </p>
        <p style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>
          Legacy syntax still works: <code style={{ fontFamily: 'monospace' }}>{isJs ? 'input.variables.x' : "input['variables']['x']"}</code>
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
