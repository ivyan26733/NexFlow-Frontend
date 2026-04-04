import type {
  Flow,
  CanvasData,
  Execution,
  ExecutionSummary,
  ExecutionDetail,
  NexusConnector,
  NexMap,
  LlmProviderInfo,
  LlmTestResult,
  AuthResponse,
  AuthUser,
  UserGroup,
  FlowAccess,
} from './index'
import { getAuthHeaders } from './lib/auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'

// Handles empty response body safely
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = getAuthHeaders()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options?.headers as Record<string, string> ?? {}),
    },
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
    update: (id: string, body: { name: string }) =>
      request<Flow>(`/api/flows/${id}`, {
        method: 'PUT',
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

    // Nex map only (convenience for transaction detail page)
    getNex: (id: string) =>
      fetch(`${BASE}/api/executions/${id}/nex`)
        .then(r => r.ok ? r.json() : Promise.resolve({ transactionId: id, nex: {} }))
        .then((body: { transactionId: string; nex?: NexMap }) => ({ transactionId: body.transactionId, nex: body.nex ?? {} })),

    // Phase 1: Create execution record, get ID back. Does NOT start execution.
    prepare: (slug: string, payload: Record<string, unknown>) =>
      request<Execution>(`/api/pulse/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    // Phase 2: Start the execution. Called AFTER the WS subscription is established.
    start: (executionId: string, payload: Record<string, unknown>) =>
      request<void>(`/api/executions/${executionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    // Legacy helpers used by non-Studio flows (can be refactored later)
    triggerBySlug: (slug: string, payload: Record<string, unknown>) =>
      request<Execution>(`/api/pulse/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    triggerById: (flowId: string, payload: Record<string, unknown>) =>
      request<Execution>(`/api/pulse/${flowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    test: (id: string, body?: Record<string, unknown>) =>
      request<{ success: boolean; message: string; latencyMs: number }>(
        `/api/nexus/connectors/${id}/test`,
        { method: 'POST', ...(body != null ? { body: JSON.stringify(body) } : {}) }
      ),
  },

  // ─── LLM PROVIDERS (AI node) ────────────────────────────────────────────────
  llmProviders: {
    list: () =>
      request<LlmProviderInfo[]>('/api/llm-providers'),

    save: (body: { provider: string; apiKey: string; customEndpoint?: string | null }) =>
      request<{ success: boolean; provider: string; configured: boolean; enabled: boolean; apiKeyMasked: string }>(
        '/api/llm-providers',
        { method: 'POST', body: JSON.stringify(body) }
      ),

    toggle: (provider: string) =>
      request<{ provider: string; enabled: boolean }>(
        `/api/llm-providers/${provider}/toggle`,
        { method: 'PATCH' }
      ),

    delete: (provider: string) =>
      request<void>(`/api/llm-providers/${provider}`, { method: 'DELETE' }),

    test: (provider: string) =>
      request<LlmTestResult>(`/api/llm-providers/${provider}/test`, { method: 'POST' }),
  },

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  auth: {
    signup: (email: string, password: string, name: string) =>
      request<{ message: string }>('/api/auth/signup', {
        method: 'POST', body: JSON.stringify({ email, password, name }),
      }),

    verifyOtp: (email: string, otp: string) =>
      request<AuthResponse>('/api/auth/verify-otp', {
        method: 'POST', body: JSON.stringify({ email, otp }),
      }),

    resendOtp: (email: string) =>
      request<{ message: string }>('/api/auth/resend-otp', {
        method: 'POST', body: JSON.stringify({ email }),
      }),

    login: (email: string, password: string) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),

    me: () => request<AuthResponse>('/api/auth/me'),

    forgotPassword: (email: string) =>
      request<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST', body: JSON.stringify({ email }),
      }),

    resetPassword: (email: string, otp: string, newPassword: string) =>
      request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST', body: JSON.stringify({ email, otp, newPassword }),
      }),

    googleLogin: () => {
      window.location.href = `${BASE}/oauth2/authorization/google`
    },
  },

  // ─── ADMIN ────────────────────────────────────────────────────────────────
  admin: {
    listUsers: () => request<AuthUser[]>('/api/admin/users'),

    updateRole: (userId: string, role: string) =>
      request<AuthUser>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH', body: JSON.stringify({ role }),
      }),

    grantFlowAccess: (flowId: string, userId: string) =>
      request<FlowAccess>(`/api/admin/flows/${flowId}/access/user/${userId}`, { method: 'POST' }),

    revokeFlowAccess: (flowId: string, userId: string) =>
      request<void>(`/api/admin/flows/${flowId}/access/user/${userId}`, { method: 'DELETE' }),

    listFlowAccess: (flowId: string) =>
      request<FlowAccess[]>(`/api/admin/flows/${flowId}/access`),
  },

  // ─── GROUPS ───────────────────────────────────────────────────────────────
  groups: {
    list: () => request<UserGroup[]>('/api/groups'),

    create: (name: string, allFlowsAccess: boolean) =>
      request<UserGroup>('/api/groups', {
        method: 'POST', body: JSON.stringify({ name, allFlowsAccess }),
      }),

    update: (id: string, name: string, allFlowsAccess: boolean) =>
      request<UserGroup>(`/api/groups/${id}`, {
        method: 'PUT', body: JSON.stringify({ name, allFlowsAccess }),
      }),

    delete: (id: string) =>
      request<void>(`/api/groups/${id}`, { method: 'DELETE' }),

    addMember: (groupId: string, userId: string) =>
      request<void>(`/api/groups/${groupId}/members`, {
        method: 'POST', body: JSON.stringify({ userId }),
      }),

    removeMember: (groupId: string, userId: string) =>
      request<void>(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),

    listMembers: (groupId: string) =>
      request<AuthUser[]>(`/api/groups/${groupId}/members`),

    grantFlow: (groupId: string, flowId: string) =>
      request<FlowAccess>(`/api/groups/${groupId}/flows/${flowId}`, { method: 'POST' }),

    revokeFlow: (groupId: string, flowId: string) =>
      request<void>(`/api/groups/${groupId}/flows/${flowId}`, { method: 'DELETE' }),
  },
}