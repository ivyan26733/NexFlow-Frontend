// NexFlow Assistant — calls the Spring Boot backend (same server as all other API calls).
// No separate assistant server needed.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface AssistantResponse {
  reply: string
  error?: string
}

export async function sendMessage(
  message: string,
  history: ChatMessage[] = [],
): Promise<AssistantResponse> {
  const res = await fetch(`${BASE}/api/assistant/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, history }),
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
