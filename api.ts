import type {
  Flow,
  CanvasData,
  Execution,
  ExecutionSummary,
  ExecutionDetail,
  NexusConnector,
} from './index'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'

// Handles empty response body safely
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status} on ${path}: ${text}`)
  }

  const text = await res.text()
  if (!text.trim()) return undefined as unknown as T
  return JSON.parse(text) as T
}

export const api = {

  // ─── FLOWS ────────────────────────────────────────────────
  flows: {
    list:   ()                    => request<Flow[]>('/api/flows'),
    get:    (id: string)          => request<Flow>(`/api/flows/${id}`),
    create: (body: Partial<Flow>) =>
      request<Flow>('/api/flows', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/flows/${id}`, { method: 'DELETE' }),
  },

  // ─── CANVAS ───────────────────────────────────────────────
  canvas: {
    load: (flowId: string) =>
      request<CanvasData>(`/api/flows/${flowId}/canvas`),

    save: (flowId: string, data: CanvasData) =>
      request<void>(`/api/flows/${flowId}/canvas`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ─── EXECUTIONS ───────────────────────────────────────────
  executions: {
    // All executions across all flows
    listAll: () =>
      request<ExecutionSummary[]>('/api/executions'),

    // Executions for a specific flow
    listByFlow: (flowId: string) =>
      request<Execution[]>(`/api/flows/${flowId}/executions`),

    // Full execution detail with NCO snapshot
    getById: (id: string) =>
      request<ExecutionDetail>(`/api/executions/${id}`),

    // Trigger by public slug (recommended)
    triggerBySlug: (slug: string, payload: Record<string, unknown>) =>
      request<Execution>(`/api/pulse/${slug}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // Trigger by internal flow ID (Studio fallback)
    triggerById: (flowId: string, payload: Record<string, unknown>) =>
      request<Execution>(`/api/pulse/id/${flowId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // ─── NEXUS ────────────────────────────────────────────────
  nexus: {
    list: () =>
      request<NexusConnector[]>('/api/nexus/connectors'),

    get: (id: string) =>
      request<NexusConnector>(`/api/nexus/connectors/${id}`),

    create: (body: Partial<NexusConnector>) =>
      request<NexusConnector>('/api/nexus/connectors', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    update: (id: string, body: Partial<NexusConnector>) =>
      request<NexusConnector>(`/api/nexus/connectors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      request<void>(`/api/nexus/connectors/${id}`, {
        method: 'DELETE',
      }),
  },
}