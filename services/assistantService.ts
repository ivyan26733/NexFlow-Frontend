// NexFlow Assistant — calls the assistant server.
// BASE URL reads NEXT_PUBLIC_ASSISTANT_URL first, falls back to the main API URL.

const BASE = process.env.NEXT_PUBLIC_ASSISTANT_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? 'http://localhost:8090'

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

// Compact flow representation sent to the assistant for flow-scan requests.
// Strips all visual/render fields — only topology and config matter.
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
    { headers: { 'Content-Type': 'application/json' } },
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
  const res = await fetch(`${BASE}/api/assistant/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, history, flow, transactions }),
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
