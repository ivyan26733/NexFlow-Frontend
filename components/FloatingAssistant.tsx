'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { api } from '@/api'

/* ── Pages where the assistant should NOT appear ───────────────── */
const EXCLUDED_PREFIXES = ['/admin', '/groups', '/login', '/signup', '/verify-otp', '/forgot-password', '/reset-password']

/* ── Map route → human-readable page name ──────────────────────── */
function getPageName(path: string): string {
  if (path === '/' || path === '')            return 'Dashboard'
  if (path.startsWith('/studio'))             return 'Studio (Flow Canvas)'
  if (path.startsWith('/transactions/'))      return 'Transaction Detail'
  if (path.startsWith('/transactions'))       return 'Transactions'
  if (path.startsWith('/flows'))              return 'Flows'
  if (path.startsWith('/nexus'))              return 'Nexus Connectors'
  if (path.startsWith('/pulses'))             return 'Pulses'
  if (path.startsWith('/templates'))          return 'Templates'
  if (path.startsWith('/settings/ai-providers')) return 'AI Providers Settings'
  if (path.startsWith('/settings'))           return 'Settings'
  if (path.startsWith('/dashboard'))          return 'Dashboard'
  if (path.startsWith('/about'))              return 'About'
  return 'NexFlow'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/* ── Gemini-style 4-pointed star SVG ───────────────────────────── */
function SpiralIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 C 11.5 6.5 9.5 9.5 2 12 C 9.5 14.5 11.5 17.5 12 22 C 12.5 17.5 14.5 14.5 22 12 C 14.5 9.5 12.5 6.5 12 2 Z"
        fill={color}
      />
    </svg>
  )
}

/* ── Animated dots for loading state ───────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#9A3412',
            animation: `assistant-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Markdown-lite renderer: bold, inline code, newlines ────────── */
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    // Split by **bold** and `code`
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return (
      <span key={li}>
        {parts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pi}>{part.slice(2, -2)}</strong>
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={pi} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8em',
                background: 'rgba(154,52,18,0.1)',
                color: '#9A3412',
                padding: '1px 4px',
                borderRadius: 3,
              }}>
                {part.slice(1, -1)}
              </code>
            )
          }
          return part
        })}
        {li < lines.length - 1 && <br />}
      </span>
    )
  })
}

export default function FloatingAssistant() {
  const pathname = usePathname()
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [pulse, setPulse]     = useState(true)  // pulse ring on first load
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Stop pulsing after 6 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000)
    return () => clearTimeout(t)
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  // Exclude pages
  const isExcluded = EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))
  if (isExcluded) return null

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const pageContext = { path: pathname, name: getPageName(pathname) }
      const { reply, error: apiError } = await api.assistant.chat(text, history, pageContext)
      if (apiError) {
        setError(apiError)
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg.includes('400') ? 'Assistant is not configured. Add an AI provider in Settings.' : msg)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([])
    setError(null)
  }

  return (
    <>
      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes assistant-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes assistant-panel-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes assistant-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes assistant-star-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes assistant-star-breathe {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50%       { transform: scale(1.12) rotate(180deg); }
        }
      `}</style>

      {/* ── Chat panel ── */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            width: 360,
            maxHeight: 520,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(26,16,8,0.18), 0 2px 8px rgba(26,16,8,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            animation: 'assistant-panel-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '13px 16px 11px',
            background: 'linear-gradient(135deg, #9A3412 0%, #1E3A5F 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: 8,
              background: 'rgba(249,243,236,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <SpiralIcon size={18} color="#F9F3EC" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F9F3EC', letterSpacing: '0.01em' }}>
                Nexflow Assistant
              </div>
              <div style={{ fontSize: 10, color: 'rgba(249,243,236,0.65)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                {getPageName(pathname)} · Ask anything
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  style={{
                    background: 'rgba(249,243,236,0.12)',
                    border: 'none',
                    borderRadius: 6,
                    color: 'rgba(249,243,236,0.7)',
                    cursor: 'pointer',
                    padding: '4px 7px',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(249,243,236,0.12)',
                  border: 'none',
                  borderRadius: 6,
                  color: 'rgba(249,243,236,0.8)',
                  cursor: 'pointer',
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 14px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
          }}>
            {/* Welcome message */}
            {messages.length === 0 && !loading && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '28px 12px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(154,52,18,0.12) 0%, rgba(30,58,95,0.12) 100%)',
                  border: '1px solid rgba(154,52,18,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SpiralIcon size={24} color="#9A3412" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                  How can I help?
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                  Ask about building flows, using nodes,<br />debugging executions, or anything Nexflow.
                </div>
                {/* Suggestion chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                  {[
                    'How do I use the NEXUS node?',
                    'How does FORK/JOIN work?',
                    'How do I pass data between nodes?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus() }}
                      style={{
                        fontSize: 11,
                        padding: '5px 10px',
                        background: 'var(--color-panel)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 20,
                        color: 'var(--color-muted)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-geist)',
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#9A3412'
                        e.currentTarget.style.color = '#9A3412'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.color = 'var(--color-muted)'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 8,
                  alignItems: 'flex-end',
                }}
              >
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: 'linear-gradient(135deg, #9A3412, #1E3A5F)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <SpiralIcon size={13} color="#F9F3EC" />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 12px',
                  borderRadius: msg.role === 'user'
                    ? '14px 14px 4px 14px'
                    : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #9A3412, #7C2D12)'
                    : 'var(--color-panel)',
                  border: msg.role === 'user'
                    ? 'none'
                    : '1px solid var(--color-border)',
                  color: msg.role === 'user' ? '#F9F3EC' : 'var(--color-text)',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}>
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: 'linear-gradient(135deg, #9A3412, #1E3A5F)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SpiralIcon size={13} color="#F9F3EC" />
                </div>
                <div style={{
                  padding: '9px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  background: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(153,27,27,0.07)',
                border: '1px solid rgba(153,27,27,0.2)',
                fontSize: 12,
                color: '#991B1B',
                lineHeight: 1.5,
              }}>
                ⚠ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '10px 12px 12px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
            background: 'var(--color-surface)',
          }}>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              background: 'var(--color-panel)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '8px 10px',
              transition: 'border-color 0.15s',
            }}
              onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about Nexflow…"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'var(--font-geist)',
                  fontSize: 13,
                  color: 'var(--color-text)',
                  lineHeight: 1.5,
                  maxHeight: 100,
                  overflow: 'auto',
                  padding: 0,
                }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                style={{
                  width: 32, height: 32, flexShrink: 0,
                  borderRadius: 8,
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #9A3412, #7C2D12)'
                    : 'var(--color-border)',
                  border: 'none',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s, transform 0.1s',
                  color: '#F9F3EC',
                  fontSize: 14,
                }}
                onMouseDown={e => { if (input.trim() && !loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
              >
                ↑
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 6, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
        }}
      >
        {/* Pulse ring — shows for 6s on first load */}
        {pulse && !open && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(154,52,18,0.5)',
            animation: 'assistant-pulse-ring 1.8s ease-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <button
          onClick={() => { setOpen(o => !o); setPulse(false) }}
          title="Nexflow Assistant"
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: open
              ? 'linear-gradient(135deg, #1E3A5F, #9A3412)'
              : 'linear-gradient(135deg, #9A3412, #1E3A5F)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: open
              ? '0 4px 20px rgba(30,58,95,0.45), 0 2px 8px rgba(26,16,8,0.2)'
              : '0 4px 20px rgba(154,52,18,0.4), 0 2px 8px rgba(26,16,8,0.2)',
            transition: 'box-shadow 0.2s, background 0.25s, transform 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
        >
          <div style={{
            animation: open
              ? 'none'
              : 'assistant-star-breathe 4s ease-in-out infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.25s',
            transform: open ? 'rotate(135deg) scale(0.85)' : 'rotate(0deg)',
          }}>
            {open
              ? <span style={{ color: '#F9F3EC', fontSize: 20, lineHeight: 1 }}>×</span>
              : <SpiralIcon size={24} color="#F9F3EC" />
            }
          </div>
        </button>
      </div>
    </>
  )
}
