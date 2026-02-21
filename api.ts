import type { Flow, CanvasData, Execution } from './index'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  const text = await res.text()
  if (!text.trim()) return undefined as T
  return JSON.parse(text) as T
}

// ─── Flows ─────────────────────────────────────────────────────────────────────

export const api = {
  flows: {
    list:   ()               => request<Flow[]>('/api/flows'),
    get:    (id: string)     => request<Flow>(`/api/flows/${id}`),
    create: (body: Partial<Flow>) =>
      request<Flow>('/api/flows', { method: 'POST', body: JSON.stringify(body) }),
  },

  canvas: {
    load: (flowId: string) =>
      request<CanvasData>(`/api/flows/${flowId}/canvas`),

    save: (flowId: string, data: CanvasData) =>
      request<void>(`/api/flows/${flowId}/canvas`, {
        method: 'POST',
        body:   JSON.stringify(data),
      }),
  },

  executions: {
    list:    (flowId: string)  => request<Execution[]>(`/api/flows/${flowId}/executions`),
    trigger: (flowId: string, payload: Record<string, unknown>) =>
      request<Execution>(`/api/pulse/${flowId}`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      }),
  },
}
