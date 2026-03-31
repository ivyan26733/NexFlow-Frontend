// Calls the Agentic Flow server to generate flows from prompts.
// Set NEXT_PUBLIC_AGENT_URL in .env.local to point to the agent server.
const AGENT_BASE = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001'

export interface AgentFlowNode {
  id:     string
  type:   string
  label:  string
  config: Record<string, unknown>
}

export interface AgentFlowEdge {
  id:           string
  source:       string
  target:       string
  sourceHandle: string | null
}

export interface AgentFlow {
  nodes: AgentFlowNode[]
  edges: AgentFlowEdge[]
}

export interface ClarificationQuestion {
  id:       string
  question: string
  hint:     string
  type:     'text' | 'choice'
  choices?: string[]
}

export interface AgentResponse {
  success:            boolean
  needsClarification: boolean
  approved?:          boolean
  confidence?:        number
  userMessage?:       string
  flow?:              AgentFlow
  runId?:             string
  meta?: {
    planSummary:        string
    complexity:         string
    nodeCount:          number
    edgeCount:          number
    totalMs:            number
    schemaFixes:        string[]
    hallucinationScore: number
  }
  questions?: ClarificationQuestion[]
  error?:     string
}

export async function generateFlow(
  prompt:  string,
  answers: Record<string, string> = {},
): Promise<AgentResponse> {
  const res = await fetch(`${AGENT_BASE}/api/agent/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, answers }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Agent returned ${res.status}`)
  }

  return res.json()
}

export async function checkAgentHealth(): Promise<{ status: string; apiKeySet: boolean }> {
  const res = await fetch(`${AGENT_BASE}/api/agent/health`)
  return res.json()
}

