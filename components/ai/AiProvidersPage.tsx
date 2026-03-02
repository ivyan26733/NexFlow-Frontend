'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/api'
import type { LlmProviderInfo, LlmTestResult } from '@/index'

const PROVIDER_META: Record<string, { icon: string; color: string; keyPlaceholder: string; docsUrl: string }> = {
  ANTHROPIC: {
    icon: '◎',
    color: '#e879f9',
    keyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  OPENAI: {
    icon: '⬡',
    color: '#10B981',
    keyPlaceholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  GEMINI: {
    icon: '✦',
    color: '#4285F4',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  GROQ: {
    icon: '⚡',
    color: '#F59E0B',
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
  },
  MISTRAL: {
    icon: '◈',
    color: '#6366F1',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://console.mistral.ai/api-keys/',
  },
  MLVOCA: {
    icon: '◇',
    color: '#14B8A6',
    keyPlaceholder: 'Leave empty (no key required)',
    docsUrl: 'https://mlvoca.github.io/free-llm-api/',
  },
  CUSTOM: {
    icon: '⚙',
    color: '#94A3B8',
    keyPlaceholder: 'your-api-key',
    docsUrl: '',
  },
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px',
      padding: '12px 20px',
      background: type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: '8px',
      color: type === 'success' ? '#10B981' : '#EF4444',
      fontSize: '13px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '10px',
      fontFamily: 'var(--font-mono)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <span>{type === 'success' ? '✓' : '✗'}</span>
      {message}
    </div>
  )
}

function ProviderCard({
  info,
  onSave,
  onToggle,
  onDelete,
  onTest,
}: {
  info:     LlmProviderInfo
  onSave:   (provider: string, key: string, endpoint: string) => Promise<void>
  onToggle: (provider: string) => Promise<void>
  onDelete: (provider: string) => Promise<void>
  onTest:   (provider: string) => Promise<LlmTestResult>
}) {
  const meta = PROVIDER_META[info.provider] ?? PROVIDER_META.CUSTOM
  const [expanded,    setExpanded]    = useState(false)
  const [apiKey,      setApiKey]      = useState('')
  const [endpoint,    setEndpoint]    = useState(info.customEndpoint ?? '')
  const [showKey,     setShowKey]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [testing,     setTesting]     = useState(false)
  const [testResult,  setTestResult]  = useState<LlmTestResult | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  const canSave = !saving && (info.provider === 'MLVOCA' || apiKey.trim().length > 0)

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    await onSave(info.provider, apiKey.trim() || '', endpoint.trim())
    setSaving(false)
    setApiKey('')
    setExpanded(false)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const r = await onTest(info.provider)
    setTestResult(r)
    setTesting(false)
  }

  return (
    <div style={{
      border: `1px solid ${expanded || info.configured ? meta.color + '25' : '#0F172A'}`,
      borderRadius: '10px',
      background: '#080D18',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: '14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '10px',
          background: `${meta.color}12`,
          border: `1px solid ${meta.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', color: meta.color, flexShrink: 0,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#F1F5F9', marginBottom: '3px' }}>
            {info.displayName}
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>
            {info.configured
              ? <>Key: <span style={{ color: '#64748B' }}>{info.apiKeyMasked}</span></>
              : <span style={{ color: '#1E293B' }}>Not configured</span>
            }
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {info.configured && (
            <span style={{
              fontSize: '9px', padding: '3px 8px', borderRadius: '3px',
              letterSpacing: '0.08em',
              background: info.enabled ? 'rgba(16,185,129,0.08)' : 'rgba(71,85,105,0.15)',
              border: `1px solid ${info.enabled ? 'rgba(16,185,129,0.2)' : '#1E293B'}`,
              color: info.enabled ? '#10B981' : '#475569',
            }}>
              {info.enabled ? '● ACTIVE' : '○ DISABLED'}
            </span>
          )}
          <span style={{ color: '#334155', fontSize: '12px', transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ▾
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #0A0F1A' }}>
          {info.knownModels.length > 0 && (
            <div style={{ paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.1em', marginBottom: '8px' }}>
                AVAILABLE MODELS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {info.knownModels.map(m => (
                  <span key={m} style={{
                    fontSize: '10px', padding: '3px 8px',
                    background: m === info.defaultModel ? `${meta.color}10` : '#030609',
                    border: `1px solid ${m === info.defaultModel ? meta.color + '30' : '#0F172A'}`,
                    borderRadius: '4px',
                    color: m === info.defaultModel ? meta.color : '#475569',
                  }}>
                    {m}
                    {m === info.defaultModel && <span style={{ marginLeft: '4px', opacity: 0.6 }}>default</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>
              {info.configured ? 'REPLACE API KEY' : 'API KEY'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={info.configured ? 'Enter new key to replace...' : meta.keyPlaceholder}
                style={{
                  width: '100%', padding: '9px 44px 9px 12px',
                  background: '#030609', border: '1px solid #0F172A',
                  borderRadius: '6px', color: '#CBD5E1',
                  fontSize: '12px', fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#475569',
                  cursor: 'pointer', fontSize: '10px', letterSpacing: '0.05em',
                }}
              >
                {showKey ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          {(info.provider === 'CUSTOM' || endpoint) && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>
                {info.provider === 'CUSTOM' ? 'ENDPOINT URL *' : 'CUSTOM ENDPOINT (optional override)'}
              </label>
              <input
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                placeholder="https://your-proxy-or-self-hosted-endpoint.com/v1/chat/completions"
                style={{
                  width: '100%', padding: '9px 12px',
                  background: '#030609', border: '1px solid #0F172A',
                  borderRadius: '6px', color: '#CBD5E1',
                  fontSize: '12px', fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
            </div>
          )}

          {info.provider !== 'CUSTOM' && !endpoint && (
            <button
              type="button"
              onClick={() => setEndpoint('https://')}
              style={{
                background: 'none', border: 'none', color: '#334155',
                fontSize: '11px', cursor: 'pointer', padding: '0 0 12px',
              }}
            >
              + Override endpoint URL (for proxies / self-hosted)
            </button>
          )}

          {meta.docsUrl && (
            <div style={{ marginBottom: '14px' }}>
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: meta.color, opacity: 0.7, textDecoration: 'none' }}
              >
                ↗ Get API key from {info.displayName}
              </a>
            </div>
          )}

          {testResult && (
            <div style={{
              marginBottom: '12px', padding: '10px 14px',
              borderRadius: '6px',
              background: testResult.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              fontSize: '12px',
              color: testResult.success ? '#10B981' : '#EF4444',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                background: testResult.success ? '#10B981' : '#EF4444',
                boxShadow: testResult.success ? '0 0 6px #10B981' : '0 0 6px #EF4444',
              }} />
              {testResult.success
                ? `Connected · ${testResult.latencyMs}ms · ${testResult.model}`
                : testResult.message
              }
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              style={{
                padding: '8px 18px',
                background: canSave ? `${meta.color}12` : 'rgba(71,85,105,0.1)',
                border: `1px solid ${canSave ? meta.color + '35' : '#1E293B'}`,
                borderRadius: '6px',
                color: canSave ? meta.color : '#475569',
                fontSize: '12px', cursor: canSave ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {saving ? 'Saving...' : info.configured ? 'Update Key' : 'Save Key'}
            </button>

            {info.configured && (
              <>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
                    borderRadius: '6px', color: testing ? '#475569' : '#00D4FF',
                    fontSize: '12px', cursor: testing ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {testing ? '↻ Testing...' : '⚡ Test'}
                </button>

                <button
                  type="button"
                  onClick={() => onToggle(info.provider)}
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
                    borderRadius: '6px', color: '#F59E0B',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  }}
                >
                  {info.enabled ? 'Disable' : 'Enable'}
                </button>

                <button
                  type="button"
                  onClick={() => { setDeleting(true); onDelete(info.provider).finally(() => setDeleting(false)) }}
                  disabled={deleting}
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: '6px', color: '#EF4444',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    marginLeft: 'auto',
                  }}
                >
                  {deleting ? 'Removing...' : 'Remove Key'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiProvidersPage() {
  const [providers, setProviders] = useState<LlmProviderInfo[]>([])
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { loadProviders() }, [])

  async function loadProviders() {
    try {
      setLoading(true)
      const data = await api.llmProviders.list()
      setProviders(Array.isArray(data) ? data : [])
    } catch {
      setProviders([])
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
  }

  async function handleSave(provider: string, apiKey: string, endpoint: string) {
    try {
      await api.llmProviders.save({ provider, apiKey, customEndpoint: endpoint || null })
      showToast(`${provider} API key saved`, 'success')
      await loadProviders()
    } catch (e: unknown) {
      showToast('Failed to save: ' + (e instanceof Error ? e.message : String(e)), 'error')
    }
  }

  async function handleToggle(provider: string) {
    try {
      await api.llmProviders.toggle(provider)
      await loadProviders()
    } catch {
      showToast('Failed to toggle provider', 'error')
    }
  }

  async function handleDelete(provider: string) {
    try {
      await api.llmProviders.delete(provider)
      showToast(`${provider} key removed`, 'success')
      await loadProviders()
    } catch {
      showToast('Failed to remove key', 'error')
    }
  }

  async function handleTest(provider: string): Promise<LlmTestResult> {
    try {
      return await api.llmProviders.test(provider)
    } catch (e: unknown) {
      return { success: false, message: e instanceof Error ? e.message : 'Test failed' }
    }
  }

  const configuredCount = providers.filter(p => p.configured && p.enabled).length

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050810',
      color: '#E2E8F0',
      fontFamily: 'var(--font-mono)',
      padding: '40px 48px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Link href="/" style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.15em', textDecoration: 'none' }}>FLOWS</Link>
            <span style={{ color: '#1E293B' }}>/</span>
            <span style={{ fontSize: '10px', color: '#64748B', letterSpacing: '0.1em' }}>SETTINGS → AI PROVIDERS</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#F1F5F9', marginBottom: '8px' }}>
            AI Providers
          </h1>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7, maxWidth: '560px' }}>
            Connect LLM providers to use AI nodes in your flows.
            API keys are stored securely and only sent to the respective provider at execution time.
          </p>
        </div>

        {!loading && (
          <div style={{
            padding: '12px 20px', borderRadius: '8px',
            border: configuredCount > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid #0F172A',
            background: configuredCount > 0 ? 'rgba(16,185,129,0.05)' : '#030609',
            textAlign: 'center', minWidth: '100px',
          }}>
            <div style={{
              fontSize: '28px', fontWeight: '600',
              color: configuredCount > 0 ? '#10B981' : '#1E293B',
              marginBottom: '4px',
            }}>
              {configuredCount}
            </div>
            <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.1em' }}>
              ACTIVE
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '16px 20px', marginBottom: '32px',
        border: '1px solid #0A0F1A', borderRadius: '8px',
        background: '#030609',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px',
      }}>
        {[
          { icon: '🔑', title: 'Add your key', desc: 'API keys are stored in your database and never logged.' },
          { icon: '✦',  title: 'Use in AI nodes', desc: 'Pick any configured provider in the AI node config panel.' },
          { icon: '🔒', title: 'Sandboxed inputs', desc: 'AI nodes can only see data you explicitly bind — no credentials.' },
        ].map(item => (
          <div key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155', fontSize: '13px' }}>
          Loading...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
          {providers.map(p => (
            <ProviderCard
              key={p.provider}
              info={p}
              onSave={handleSave}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          ))}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
