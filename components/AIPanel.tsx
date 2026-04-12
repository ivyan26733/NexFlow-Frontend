'use client'

import { useState, useRef, useEffect } from 'react'
import { sendMessage, fetchRecentTransactions } from '@/services/assistantService'
import type { ChatMessage, FlowSnapshot, FlowNodeSnapshot, FlowEdgeSnapshot, TransactionDigest } from '@/services/assistantService'

/* ─── Types ────────────────────────────────────────────────── */

// Minimal canvas shapes — avoids importing xyflow types into this component
interface CanvasNode {
  id:   string
  type?: string | null
  data: {
    label?:    unknown
    nodeType?: string
    config?:   Record<string, unknown>
  }
}

interface CanvasEdge {
  source: string
  target: string
  data?:  { conditionType?: string }
}

interface AIPanelProps {
  onClose: () => void
  nodes?:  CanvasNode[]
  edges?:  CanvasEdge[]
  flowId?: string
}

/* ─── Scan keyword detection ───────────────────────────────── */

const SCAN_PATTERNS = [
  /check\s+(my\s+)?flow/i,
  /scan\s+(my\s+)?flow/i,
  /review\s+(my\s+)?flow/i,
  /validate\s+(my\s+)?flow/i,
  /any\s+mistake/i,
  /is\s+(my\s+)?flow\s+correct/i,
  /what.{0,20}wrong\s+(with\s+)?(my\s+)?flow/i,
  /debug\s+(my\s+)?flow/i,
  /fix\s+(my\s+)?flow/i,
  /flow\s+correct\??/i,
]

const TRANSACTION_PATTERNS = [
  /check\s+(last|recent)\s+(hour|transactions?|executions?)/i,
  /why\s+is\s+it\s+fail/i,
  /why\s+(is|did|does)\s+(the\s+)?flow\s+fail/i,
  /recent\s+(transactions?|executions?)/i,
  /last\s+hour/i,
  /diagnose/i,
  /what\s+went\s+wrong/i,
  /transaction\s+error/i,
  /execution\s+(error|fail)/i,
  /why\s+(is|does)\s+it\s+(fail|break|not\s+work)/i,
  /running\s+state/i,
  /stuck\s+in/i,
]

function isScanRequest(text: string): boolean {
  return SCAN_PATTERNS.some(p => p.test(text))
}

function isTransactionRequest(text: string): boolean {
  // These are the phrases that usually mean "look at recent execution history".
  return TRANSACTION_PATTERNS.some(p => p.test(text))
}

/* ─── Flow serialiser ──────────────────────────────────────── */

function buildFlowSnapshot(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): FlowSnapshot {
  const snapshotNodes: FlowNodeSnapshot[] = nodes.map(n => ({
    id:     n.id,
    type:   n.data.nodeType ?? n.type ?? 'UNKNOWN',
    label:  String(n.data.label ?? ''),
    config: n.data.config ?? {},
  }))

  const snapshotEdges: FlowEdgeSnapshot[] = edges.map(e => ({
    from:      e.source,
    to:        e.target,
    condition: e.data?.conditionType ?? 'DEFAULT',
  }))

  return { nodes: snapshotNodes, edges: snapshotEdges }
}

/* ─── Quick actions ────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: '🔍 Scan my flow for issues',          scan: true,  txn: false },
  { label: '📊 Diagnose last hour of executions', scan: false, txn: true  },
  { label: 'What node types are available?',       scan: false, txn: false },
  { label: "How do I reference another node's output?", scan: false, txn: false },
  { label: 'How do I configure the AI node?',      scan: false, txn: false },
]

/* ─── Chat panel ───────────────────────────────────────────── */

export function AIPanel({ onClose, nodes = [], edges = [], flowId }: AIPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const bottomRef               = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { textareaRef.current?.focus() }, [])

  async function handleSend(text?: string, forceScan = false, forceTxn = false) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')

    const userMsg: ChatMessage = { role: 'user', content: msg }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      // Attach flow snapshot when it's a scan request or forced
      const attachFlow = forceScan || isScanRequest(msg)
      const flowPayload = attachFlow && nodes.length > 0
        ? buildFlowSnapshot(nodes, edges)
        : undefined

      // Attach recent transactions when user asks about failures/diagnostics
      let txnPayload: TransactionDigest[] | undefined
      const attachTxn = forceTxn || isTransactionRequest(msg)
      if (attachTxn && flowId) {
        // This is the debugging path: we pull recent executions first,
        // then send those rows to the assistant together with the chat message.
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'
        const recent = await fetchRecentTransactions(apiBase, flowId, 1)
        if (recent.length > 0) txnPayload = recent
      }

      const { reply } = await sendMessage(msg, messages, flowPayload, txnPayload)
      setMessages([...updated, { role: 'assistant', content: reply }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cannot reach assistant server')
    } finally {
      setLoading(false)
    }
  }

  // Used to switch between the quick-actions welcome state and real chat history.
  const hasMessages = messages.length > 0

  return (
    <div style={s.panel}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>
          <span style={s.titleIcon}>🤖</span>
          <span>NexFlow Assistant</span>
        </div>
        <button type="button" onClick={onClose} style={s.closeBtn}>✕</button>
      </div>

      {/* Chat body */}
      <div style={s.chatBody}>
        {!hasMessages && !loading && (
          <div style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 14, textAlign: 'center' }}>
              Ask about nodes, configs, references — or let me scan your flow for issues.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_ACTIONS.map(q => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => handleSend(q.label, q.scan, q.txn)}
                  style={
                    q.scan ? { ...s.quickBtn, ...s.quickBtnScan } :
                    q.txn  ? { ...s.quickBtn, ...s.quickBtnTxn  } :
                    s.quickBtn
                  }
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ ...s.bubble, ...(msg.role === 'user' ? s.userBubble : s.aiBubble) }}>
            <div style={s.bubbleRole}>{msg.role === 'user' ? '🧑 You' : '🤖 Assistant'}</div>
            <div style={{ color: '#e2e8f0' }}>{renderContent(msg.content)}</div>
          </div>
        ))}

        {loading && (
          <div style={{ ...s.bubble, ...s.aiBubble }}>
            <div style={s.bubbleRole}>🤖 Assistant</div>
            <div style={{ display: 'flex', gap: 4, color: '#64748b', fontSize: 16 }}>
              <span>●</span><span>●</span><span>●</span>
            </div>
          </div>
        )}

        {error && <div style={s.error}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={s.inputRow}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Ask anything, or type 'check my flow'…"
          style={s.chatTextarea}
          disabled={loading}
          rows={2}
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }}
        >
          {loading ? '…' : '→'}
        </button>
      </div>

      {hasMessages && (
        <button
          type="button"
          onClick={() => setMessages([])}
          style={{ fontSize: 11, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 6px', textAlign: 'center' }}
        >
          Clear chat
        </button>
      )}
    </div>
  )
}

/* ─── Simple markdown renderer ─────────────────────────────── */

function renderContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '')
      return <pre key={i} style={s.codeBlock}><code>{code}</code></pre>
    }
    const inlineParts = part.split(/(`[^`]+`)/g)
    return (
      <span key={i}>
        {inlineParts.map((p, j) => {
          if (p.startsWith('`') && p.endsWith('`'))
            return <code key={j} style={s.inlineCode}>{p.slice(1, -1)}</code>
          const segs = p.split(/(\*\*[^*]+\*\*)/g)
          return segs.map((seg, k) => {
            if (seg.startsWith('**') && seg.endsWith('**'))
              return <strong key={`${j}-${k}`}>{seg.slice(2, -2)}</strong>
            return seg.split('\n').map((line, l) => (
              <span key={`${j}-${k}-${l}`}>{l > 0 && <br />}{line}</span>
            ))
          })
        })}
      </span>
    )
  })
}

/* ─── Styles — warm Cognac & Navy theme ────────────────────── */

const s: Record<string, React.CSSProperties> = {
  panel: {
    position:      'fixed',
    bottom:        16,
    right:         16,
    zIndex:        9999,
    width:         420,
    maxWidth:      'calc(100vw - 24px)',
    height:        560,
    maxHeight:     'calc(100dvh - 80px)',
    display:       'flex',
    flexDirection: 'column',
    background:    '#F9F3EC',
    border:        '1px solid #C8B9A5',
    borderRadius:  16,
    boxShadow:     '0 8px 40px rgba(26,16,8,0.18), 0 2px 8px rgba(26,16,8,0.1)',
    overflow:      'hidden',
    fontFamily:    "'DM Sans', sans-serif",
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 16px 10px',
    background:     'linear-gradient(135deg, #9A3412 0%, #1E3A5F 100%)',
    flexShrink:     0,
    gap:            10,
  },
  title: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
    fontSize:   13,
    fontWeight: 700,
    color:      '#F9F3EC',
    letterSpacing: '0.01em',
  },
  titleIcon: { fontSize: 16 },
  closeBtn: {
    background:   'rgba(249,243,236,0.15)',
    border:       'none',
    borderRadius: 6,
    color:        'rgba(249,243,236,0.8)',
    cursor:       'pointer',
    fontSize:     16,
    padding:      '4px 8px',
    lineHeight:   1,
    flexShrink:   0,
  },
  chatBody: {
    flex:          1,
    overflowY:     'auto',
    padding:       '12px 14px',
    display:       'flex',
    flexDirection: 'column',
    gap:           8,
    background:    '#F9F3EC',
  },
  inputRow: {
    display:    'flex',
    gap:        8,
    padding:    '10px 12px 10px',
    borderTop:  '1px solid #C8B9A5',
    background: '#F9F3EC',
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  chatTextarea: {
    flex:         1,
    background:   '#E8DCCF',
    border:       '1px solid #C8B9A5',
    borderRadius: 10,
    color:        '#1A1008',
    padding:      '8px 12px',
    fontSize:     13,
    resize:       'none',
    outline:      'none',
    fontFamily:   "'DM Sans', sans-serif",
    lineHeight:   1.5,
    maxHeight:    100,
  },
  sendBtn: {
    width:          34,
    height:         34,
    borderRadius:   8,
    border:         'none',
    background:     'linear-gradient(135deg, #9A3412, #7C2D12)',
    color:          '#F9F3EC',
    fontSize:       16,
    fontWeight:     700,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  bubble: {
    borderRadius: 10,
    padding:      '9px 12px',
    fontSize:     13,
    lineHeight:   1.6,
    maxWidth:     '100%',
    wordBreak:    'break-word' as const,
  },
  userBubble: {
    background: 'linear-gradient(135deg, #9A3412, #7C2D12)',
    color:      '#F9F3EC',
    alignSelf:  'flex-end',
    borderRadius: '12px 12px 4px 12px',
  },
  aiBubble: {
    background: '#E8DCCF',
    border:     '1px solid #C8B9A5',
    color:      '#1A1008',
    alignSelf:  'flex-start',
    borderRadius: '12px 12px 12px 4px',
  },
  bubbleRole: {
    fontSize:     10,
    color:        '#6B5A45',
    marginBottom: 4,
    fontWeight:   600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  quickBtn: {
    fontSize:     12,
    padding:      '8px 12px',
    borderRadius: 8,
    border:       '1px solid #C8B9A5',
    color:        '#6B5A45',
    cursor:       'pointer',
    background:   '#E8DCCF',
    fontFamily:   "'DM Sans', sans-serif",
    textAlign:    'left' as const,
    lineHeight:   1.4,
    transition:   'border-color 0.15s, color 0.15s, background 0.15s',
  },
  quickBtnScan: {
    border:     '1px solid rgba(30,58,95,0.3)',
    color:      '#1E3A5F',
    background: 'rgba(30,58,95,0.06)',
  },
  quickBtnTxn: {
    border:     '1px solid rgba(154,52,18,0.3)',
    color:      '#9A3412',
    background: 'rgba(154,52,18,0.07)',
  },
  error: {
    fontSize:     12,
    color:        '#7F1D1D',
    background:   'rgba(127,29,29,0.06)',
    border:       '1px solid rgba(127,29,29,0.2)',
    borderRadius: 8,
    padding:      '8px 12px',
    marginTop:    4,
    lineHeight:   1.5,
  },
  codeBlock: {
    background:   '#E8DCCF',
    border:       '1px solid #C8B9A5',
    borderRadius: 6,
    padding:      '8px 10px',
    fontSize:     12,
    fontFamily:   "'Space Mono', monospace",
    overflowX:    'auto',
    margin:       '6px 0',
    color:        '#1E3A5F',
    whiteSpace:   'pre-wrap',
    wordBreak:    'break-all' as const,
  },
  inlineCode: {
    background:   'rgba(154,52,18,0.1)',
    padding:      '1px 5px',
    borderRadius: 4,
    fontSize:     12,
    fontFamily:   "'Space Mono', monospace",
    color:        '#9A3412',
  },
}
