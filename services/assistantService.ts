// NexFlow Assistant - calls the assistant server.
// BASE URL reads NEXT_PUBLIC_ASSISTANT_URL first, then falls back to the main API URL.

import { getAuthHeaders } from '@/lib/auth'

const BASE = process.env.NEXT_PUBLIC_ASSISTANT_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? 'http://localhost:8090'

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

// Compact flow representation sent to the assistant for flow-scan requests.
// Only the logic and config matter here, not the visual canvas details.
export interface FlowNodeSnapshot {
  id:     string
  type:   string
  label:  string
  config: Record<string, unknown>
}

export interface FlowEdgeSnapshot {
  from:      string
  to:        string
  condition: string
}

export interface FlowSnapshot {
  nodes: FlowNodeSnapshot[]
  edges: FlowEdgeSnapshot[]
}

// Compact per-node summary sent to the assistant for transaction diagnostics.
export interface TransactionNodeDigest {
  label:       string
  type:        string
  status:      string
  branchName?: string | null
  error?:      string | null
  durationMs:  number
}

export interface TransactionDigest {
  id:           string
  status:       string
  startedAt:    string | null
  completedAt:  string | null
  durationMs:   number
  errorMessage?: string | null
  nodes:        TransactionNodeDigest[]
}

export interface AssistantResponse {
  reply:  string
  error?: string
}

export async function fetchRecentTransactions(
  apiBase: string,
  flowId:  string,
  hours = 1,
): Promise<TransactionDigest[]> {
  const res = await fetch(
    `${apiBase}/api/executions/recent?flowId=${flowId}&hours=${hours}`,
    { credentials: 'include', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } },
  )
  if (!res.ok) return []
  return res.json()
}

export async function sendMessage(
  message:      string,
  history:      ChatMessage[] = [],
  flow?:        FlowSnapshot,
  transactions?: TransactionDigest[],
): Promise<AssistantResponse> {
  // Prepend a plain-text instruction so the LLM never responds in JSON or code-fenced JSON.
  const PLAIN_TEXT_PREFIX =
    'Respond in plain conversational text or markdown (use **bold**, `code`, bullet points, newlines). ' +
    'Never return raw JSON or wrap your entire answer in a JSON object. '

  const prefixedMessage = PLAIN_TEXT_PREFIX + message

  const res = await fetch(`${BASE}/api/assistant/chat`, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body:        JSON.stringify({ message: prefixedMessage, history, flow, transactions }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Assistant returned ${res.status}`)
  }

  return res.json()
}

export async function checkAssistantHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/api/assistant/health`)
  return res.json()
}
