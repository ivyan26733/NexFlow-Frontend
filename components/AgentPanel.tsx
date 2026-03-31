'use client'

import { useState } from 'react'
import { generateFlow } from '@/services/agentService'
import type { AgentFlow, ClarificationQuestion } from '@/services/agentService'

interface AgentPanelProps {
  onFlowLoaded: (flow: AgentFlow, userMessage: string) => void
  onClose:      () => void
}

export function AgentPanel({ onFlowLoaded, onClose }: AgentPanelProps) {
  const [prompt,      setPrompt]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [successMsg,  setSuccessMsg]  = useState('')
  const [fixCount,    setFixCount]    = useState(0)

  const [questions,   setQuestions]   = useState<ClarificationQuestion[]>([])
  const [answers,     setAnswers]     = useState<Record<string, string>>({})
  const [clarifying,  setClarifying]  = useState(false)

  async function runGenerate(nextAnswers: Record<string, string> = {}) {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const result = await generateFlow(prompt.trim(), nextAnswers)

      if (!result.success) {
        setError(result.error || 'Generation failed')
        return
      }

      if (result.needsClarification && result.questions?.length) {
        setQuestions(result.questions)
        setAnswers({})
        setClarifying(true)
        return
      }

      if (result.flow) {
        const fixes = result.meta?.schemaFixes?.length ?? 0
        setFixCount(fixes)
        const msg = result.userMessage ?? 'Flow generated successfully!'
        setSuccessMsg(msg)
        onFlowLoaded(result.flow, msg)
        setTimeout(onClose, 1800)
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Cannot reach agent — is it running on port 3002?'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function submitAnswers() {
    setClarifying(false)
    runGenerate(answers)
  }

  function skipClarification() {
    setClarifying(false)
    runGenerate({})
  }

  const SUGGESTIONS = [
    'Fetch weather data and summarise it with AI',
    'Run 3 AI tasks in parallel then merge results',
    'Call an API, check the response, branch on result',
    'Filter data with a script then send to a webhook',
  ]

  if (clarifying) {
    return (
      <div style={styles.panel}>
        <div style={styles.title}>Quick questions before building</div>
        {questions.map(q => (
          <div key={q.id} style={{ marginBottom: 14 }}>
            <div style={styles.qLabel}>{q.question}</div>
            {q.hint && <div style={styles.hint}>{q.hint}</div>}
            {q.type === 'choice' && q.choices ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {q.choices.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAnswers(a => ({ ...a, [q.id]: c }))}
                    style={{
                      ...styles.choiceBtn,
                      ...(answers[q.id] === c ? styles.choiceBtnActive : {}),
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={e =>
                  setAnswers(a => ({ ...a, [q.id]: e.target.value }))
                }
                placeholder="Your answer..."
                style={styles.input}
              />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={submitAnswers}
            disabled={loading}
            style={{ ...styles.btnPrimary, flex: 1 }}
          >
            {loading ? 'Building...' : 'Continue →'}
          </button>
          <button
            type="button"
            onClick={skipClarification}
            disabled={loading}
            style={styles.btnSecondary}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onClose}
            style={styles.btnSecondary}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={styles.title}>Generate Flow with AI</div>
        <button type="button" onClick={onClose} style={styles.closeBtn}>
          ✕
        </button>
      </div>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            runGenerate()
          }
        }}
        placeholder="Describe your automation in plain English..."
        style={styles.textarea}
        disabled={loading}
      />

      {!prompt && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            marginTop: 8,
          }}
        >
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              style={styles.suggestion}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
      {successMsg && (
        <div style={styles.success}>
          {successMsg}
          {fixCount > 0 && (
            <span style={{ color: '#f59e0b', marginLeft: 8 }}>
              {fixCount} schema issue{fixCount > 1 ? 's' : ''} auto-fixed
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => runGenerate()}
          disabled={loading || !prompt.trim()}
          style={{ ...styles.btnPrimary, flex: 1 }}
        >
          {loading ? 'Generating…' : 'Generate Flow'}
        </button>
      </div>

      <div
        style={{
          fontSize: 11,
          color: '#475569',
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        Orchestrator → workers → critic → judge
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    bottom: 84,
    right: 24,
    zIndex: 9999,
    width: 420,
    background: '#0b1120',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 20px 60px rgba(0,0,0,.65)',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#e2e8f0',
  },
  textarea: {
    width: '100%',
    height: 90,
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 8,
    color: '#e2e8f0',
    padding: '8px 12px',
    fontSize: 13,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 6,
    color: '#e2e8f0',
    padding: '7px 10px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  },
  qLabel: {
    fontSize: 13,
    color: '#e2e8f0',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
  },
  btnPrimary: {
    padding: '9px 0',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
  },
  btnSecondary: {
    padding: '9px 14px',
    borderRadius: 8,
    border: '1px solid #1e293b',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 13,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
  },
  choiceBtn: {
    padding: '5px 12px',
    borderRadius: 16,
    fontSize: 12,
    cursor: 'pointer',
    border: '1px solid #1e293b',
    color: '#64748b',
    background: 'transparent',
    fontFamily: 'inherit',
  },
  choiceBtnActive: {
    borderColor: '#00d4ff',
    color: '#00d4ff',
    background: 'rgba(0,212,255,.08)',
  },
  suggestion: {
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 16,
    border: '1px solid #1e293b',
    color: '#64748b',
    cursor: 'pointer',
    background: 'transparent',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  error: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    lineHeight: 1.4,
  },
  success: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 8,
    lineHeight: 1.4,
  },
}

