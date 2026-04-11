'use client'

import { useState, useRef, useEffect } from 'react'
import {
  sendMessage,
  type ChatMessage,
} from '@/services/assistantService'

interface AssistantPanelProps {
  onClose: () => void
}

const QUICK_ACTIONS = [
  'What node types are available?',
  'How do I reference another node\'s output?',
  'Plan a flow: fetch API data and process it',
  'How do I use the AI node?',
]

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-focus textarea on open
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    // Keep the UI responsive while the request is in flight.
    // We append the user message immediately so the chat history mirrors what was sent.
    setInput('')
    setError('')

    const userMsg: ChatMessage = { role: 'user', content: msg }
    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setLoading(true)

    try {
      // The assistant only sees the conversation history we pass here.
      const { reply } = await sendMessage(msg, messages)
      setMessages([...updatedHistory, { role: 'assistant', content: reply }])
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Cannot reach assistant — is it running on port 3002?'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
  }

  const hasMessages = messages.length > 0

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>💬</span>
            <span style={styles.headerTitle}>NexFlow Assistant</span>
          </div>
          <div style={styles.headerRight}>
            {hasMessages && (
              <button type="button" onClick={clearChat} style={styles.clearBtn}>
                Clear
              </button>
            )}
            <button type="button" onClick={onClose} style={styles.closeBtn}>
              ✕
            </button>
          </div>
        </div>

        {/* Chat body */}
        <div style={styles.body}>
          {!hasMessages && !loading && (
            <div style={styles.welcome}>
              <div style={styles.welcomeIcon}>🤖</div>
              <div style={styles.welcomeTitle}>Hi! I&apos;m your NexFlow Assistant</div>
              <div style={styles.welcomeText}>
                Ask me about node types, configs, references, error debugging, or
                let me help you plan a flow.
              </div>
              <div style={styles.quickActions}>
                {QUICK_ACTIONS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    style={styles.quickBtn}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.messageBubble,
                ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
              }}
            >
              <div style={styles.messageRole}>
                {msg.role === 'user' ? '🧑 You' : '🤖 Assistant'}
              </div>
              <div style={styles.messageContent}>
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
              <div style={styles.messageRole}>🤖 Assistant</div>
              <div style={styles.thinking}>
                <span style={styles.dot1}>●</span>
                <span style={styles.dot2}>●</span>
                <span style={styles.dot3}>●</span>
              </div>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about nodes, configs, errors, or flow planning..."
            style={styles.textarea}
            disabled={loading}
            rows={2}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              ...styles.sendBtn,
              opacity: loading || !input.trim() ? 0.4 : 1,
            }}
          >
            {loading ? '...' : '→'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────── Simple Markdown-ish renderer ───────── */

function renderContent(text: string) {
  // Split by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '')
      return (
        <pre key={i} style={styles.codeBlock}>
          <code>{code}</code>
        </pre>
      )
    }
    // Handle inline code
    const inlineParts = part.split(/(`[^`]+`)/g)
    return (
      <span key={i}>
        {inlineParts.map((p, j) => {
          if (p.startsWith('`') && p.endsWith('`')) {
            return (
              <code key={j} style={styles.inlineCode}>
                {p.slice(1, -1)}
              </code>
            )
          }
          // Handle bold
          const segments = p.split(/(\*\*[^*]+\*\*)/g)
          return segments.map((seg, k) => {
            if (seg.startsWith('**') && seg.endsWith('**')) {
              return <strong key={`${j}-${k}`}>{seg.slice(2, -2)}</strong>
            }
            // Render newlines
            return seg.split('\n').map((line, l) => (
              <span key={`${j}-${k}-${l}`}>
                {l > 0 && <br />}
                {line}
              </span>
            ))
          })
        })}
      </span>
    )
  })
}

/* ───────── Styles ───────── */

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    bottom: 0,
    right: 0,
    zIndex: 9998,
    pointerEvents: 'none',
  },
  panel: {
    pointerEvents: 'auto',
    position: 'fixed',
    bottom: 16,
    right: 16,
    width: 420,
    maxWidth: 'calc(100vw - 32px)',
    height: 560,
    maxHeight: 'calc(100vh - 100px)',
    display: 'flex',
    flexDirection: 'column',
    background: '#0b1120',
    border: '1px solid #1e293b',
    borderRadius: 14,
    boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
    background: '#0f172a',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#e2e8f0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  clearBtn: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 6,
    border: '1px solid #1e293b',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  welcome: {
    textAlign: 'center',
    padding: '24px 8px 12px',
  },
  welcomeIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: 6,
  },
  welcomeText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: 16,
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  quickBtn: {
    fontSize: 12,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    background: 'rgba(15,23,42,0.6)',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'border-color 0.15s, color 0.15s',
  },
  messageBubble: {
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    lineHeight: 1.55,
    maxWidth: '100%',
    wordBreak: 'break-word' as const,
  },
  userBubble: {
    background: 'rgba(0,212,255,0.08)',
    border: '1px solid rgba(0,212,255,0.15)',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    background: '#111827',
    border: '1px solid #1e293b',
    alignSelf: 'flex-start',
  },
  messageRole: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: 600,
  },
  messageContent: {
    color: '#e2e8f0',
  },
  thinking: {
    display: 'flex',
    gap: 4,
    color: '#64748b',
    fontSize: 16,
  },
  dot1: { animation: 'pulse 1.2s infinite 0s' },
  dot2: { animation: 'pulse 1.2s infinite 0.2s' },
  dot3: { animation: 'pulse 1.2s infinite 0.4s' },
  error: {
    fontSize: 12,
    color: '#ef4444',
    padding: '6px 10px',
    background: 'rgba(239,68,68,0.08)',
    borderRadius: 6,
    border: '1px solid rgba(239,68,68,0.2)',
  },
  inputArea: {
    display: 'flex',
    gap: 8,
    padding: '10px 14px 12px',
    borderTop: '1px solid #1e293b',
    background: '#0f172a',
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 8,
    color: '#e2e8f0',
    padding: '8px 12px',
    fontSize: 13,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.4,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #9A3412, #1E3A5F)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  codeBlock: {
    background: '#0a0e1a',
    border: '1px solid #1e293b',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: 'var(--font-mono, monospace)',
    overflowX: 'auto',
    margin: '6px 0',
    color: '#a5f3fc',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all' as const,
  },
  inlineCode: {
    background: 'rgba(0,212,255,0.1)',
    padding: '1px 5px',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'var(--font-mono, monospace)',
    color: '#67e8f9',
  },
}
