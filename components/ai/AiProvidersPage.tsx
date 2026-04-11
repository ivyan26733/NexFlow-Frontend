'use client'
import { useState, useEffect } from 'react'
import { Key, Zap, Shield, ChevronDown, ChevronUp, Eye, EyeOff, ExternalLink, CheckCircle, XCircle, Loader2, Plug, PlugZap } from 'lucide-react'
import { api } from '@/api'
import type { LlmProviderInfo, LlmTestResult } from '@/index'
import { MillennialLoader } from '@/MillennialLoader'
import { getStoredUser } from '@/lib/auth'

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
    color: '#1E3A5F',
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
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      padding: '0.875rem 1.375rem',
      background: type === 'success' ? 'rgba(0,230,118,0.1)' : 'rgba(255,68,68,0.1)',
      border: `1px solid ${type === 'success' ? 'rgba(0,230,118,0.3)' : 'rgba(255,68,68,0.3)'}`,
      borderRadius: '0.75rem',
      color: type === 'success' ? 'var(--color-success)' : 'var(--color-failure)',
      fontSize: '0.875rem', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '0.625rem',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {type === 'success'
        ? <CheckCircle size={15} />
        : <XCircle size={15} />
      }
      {message}
    </div>
  )
}

function ProviderCard({
  info,
  isAdmin,
  onSave,
  onToggle,
  onDelete,
  onTest,
}: {
  info:     LlmProviderInfo
  isAdmin:  boolean
  onSave:   (provider: string, key: string, endpoint: string) => Promise<void>
  onToggle: (provider: string) => Promise<void>
  onDelete: (provider: string) => Promise<void>
  onTest:   (provider: string) => Promise<LlmTestResult>
}) {
  const meta = PROVIDER_META[info.provider] ?? PROVIDER_META.CUSTOM
  const [expanded,   setExpanded]   = useState(false)
  const [apiKey,     setApiKey]     = useState('')
  const [endpoint,   setEndpoint]   = useState(info.customEndpoint ?? '')
  const [showKey,    setShowKey]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState<LlmTestResult | null>(null)
  const [deleting,   setDeleting]   = useState(false)

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
      background: 'var(--color-surface)',
      border: `1px solid ${expanded || info.configured ? meta.color + '30' : 'var(--color-border)'}`,
      borderRadius: '1rem',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* ── Summary row ── */}
      <div
        onClick={() => isAdmin && setExpanded(e => !e)}
        style={{
          padding: '1.375rem 1.75rem',
          display: 'flex', alignItems: 'center', gap: '1.25rem',
          cursor: isAdmin ? 'pointer' : 'default', userSelect: 'none',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '3rem', height: '3rem', borderRadius: '0.875rem', flexShrink: 0,
          background: `${meta.color}15`,
          border: `1px solid ${meta.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', color: meta.color,
        }}>
          {meta.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {info.displayName}
            </span>
            {info.configured && (
              <span style={{
                fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: info.enabled ? 'rgba(0,230,118,0.12)' : 'rgba(100,116,139,0.12)',
                color: info.enabled ? 'var(--color-success)' : 'var(--color-muted)',
                border: `1px solid ${info.enabled ? 'rgba(0,230,118,0.25)' : 'var(--color-border)'}`,
              }}>
                {info.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
            {info.configured
              ? isAdmin
                ? <>Key: <span style={{ color: 'var(--color-accent)' }}>{info.apiKeyMasked}</span></>
                : <span style={{ color: 'var(--color-muted)' }}>Configured by admin</span>
              : <span style={{ color: 'var(--color-border)' }}>Not configured</span>
            }
          </span>
        </div>

        {/* Models count + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          {info.knownModels.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
              {info.knownModels.length} model{info.knownModels.length !== 1 ? 's' : ''}
            </span>
          )}
          {isAdmin && (expanded
            ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} />
            : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />
          )}
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && isAdmin && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.75rem', background: 'var(--color-panel)' }}>
          <div className="two-col-panel" style={{ gap: '2rem' }}>

            {/* Left: key form */}
            <div>
              {/* API Key */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {info.configured ? 'Replace API Key' : 'API Key'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={info.configured ? 'Enter new key to replace...' : meta.keyPlaceholder}
                    className="input-base"
                    style={{ paddingRight: '3.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    style={{
                      position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--color-muted)',
                      cursor: 'pointer', display: 'flex', padding: '0.125rem',
                    }}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Endpoint override */}
              {(info.provider === 'CUSTOM' || endpoint) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    {info.provider === 'CUSTOM' ? 'Endpoint URL *' : 'Custom Endpoint (optional override)'}
                  </label>
                  <input
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    placeholder="https://your-proxy-or-self-hosted-endpoint.com/v1/chat/completions"
                    className="input-base"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}
                  />
                </div>
              )}
              {info.provider !== 'CUSTOM' && !endpoint && (
                <button
                  type="button"
                  onClick={() => setEndpoint('https://')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 1rem', textDecoration: 'underline', textDecorationStyle: 'dashed' }}
                >
                  + Override endpoint URL (proxies / self-hosted)
                </button>
              )}

              {meta.docsUrl && (
                <a
                  href={meta.docsUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: meta.color, textDecoration: 'none', opacity: 0.8, marginBottom: '1.25rem' }}
                >
                  <ExternalLink size={12} />
                  Get API key from {info.displayName}
                </a>
              )}

              {/* Test result */}
              {testResult && (
                <div style={{
                  marginBottom: '1rem', padding: '0.75rem 1rem',
                  borderRadius: '0.625rem',
                  background: testResult.success ? 'rgba(0,230,118,0.07)' : 'rgba(255,68,68,0.07)',
                  border: `1px solid ${testResult.success ? 'rgba(0,230,118,0.25)' : 'rgba(255,68,68,0.25)'}`,
                  fontSize: '0.825rem', fontFamily: 'var(--font-mono)',
                  color: testResult.success ? 'var(--color-success)' : 'var(--color-failure)',
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: testResult.success ? 'var(--color-success)' : 'var(--color-failure)' }} />
                  {testResult.success
                    ? `Connected · ${testResult.latencyMs}ms · ${testResult.model}`
                    : testResult.message
                  }
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                <button
                  type="button" onClick={handleSave} disabled={!canSave}
                  className="btn-primary"
                  style={{
                    padding: '0.5rem 1.25rem', fontSize: '0.85rem',
                    opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed',
                  }}
                >
                  {saving
                    ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                    : <><Key size={13} /> {info.configured ? 'Update Key' : 'Save Key'}</>
                  }
                </button>

                {info.configured && (
                  <>
                    <button
                      type="button" onClick={handleTest} disabled={testing}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: testing ? 'not-allowed' : 'pointer',
                        background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
                        borderRadius: '0.5rem', color: testing ? 'var(--color-muted)' : 'var(--color-accent)',
                        fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                      }}
                    >
                      {testing
                        ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Testing…</>
                        : <><Zap size={13} /> Test</>
                      }
                    </button>

                    <button
                      type="button" onClick={() => onToggle(info.provider)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer',
                        background: info.enabled ? 'rgba(100,116,139,0.1)' : 'rgba(0,230,118,0.08)',
                        border: `1px solid ${info.enabled ? 'var(--color-border)' : 'rgba(0,230,118,0.2)'}`,
                        borderRadius: '0.5rem',
                        color: info.enabled ? 'var(--color-muted)' : 'var(--color-success)',
                        fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                      }}
                    >
                      {info.enabled
                        ? <><Plug size={13} /> Disable</>
                        : <><PlugZap size={13} /> Enable</>
                      }
                    </button>

                    <button
                      type="button"
                      onClick={() => { setDeleting(true); onDelete(info.provider).finally(() => setDeleting(false)) }}
                      disabled={deleting}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: deleting ? 'not-allowed' : 'pointer',
                        background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)',
                        borderRadius: '0.5rem', color: 'var(--color-failure)',
                        fontFamily: 'var(--font-sans)', transition: 'all 0.15s', marginLeft: 'auto',
                      }}
                    >
                      {deleting ? 'Removing…' : 'Remove Key'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right: models */}
            <div>
              {info.knownModels.length > 0 && (
                <>
                  <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Available Models
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {info.knownModels.map(m => (
                      <span key={m} style={{
                        fontSize: '0.75rem', padding: '0.3rem 0.75rem',
                        fontFamily: 'var(--font-mono)',
                        background: m === info.defaultModel ? `${meta.color}12` : 'var(--color-base)',
                        border: `1px solid ${m === info.defaultModel ? meta.color + '35' : 'var(--color-border)'}`,
                        borderRadius: '0.4rem',
                        color: m === info.defaultModel ? meta.color : 'var(--color-muted)',
                      }}>
                        {m}
                        {m === info.defaultModel && (
                          <span style={{ marginLeft: '0.375rem', opacity: 0.6, fontSize: '0.7rem' }}>default</span>
                        )}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {info.knownModels.length === 0 && info.provider === 'CUSTOM' && (
                <div style={{
                  height: '100%', minHeight: '6rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: '1px dashed var(--color-border)', borderRadius: '0.75rem', gap: '0.5rem', padding: '1.5rem',
                }}>
                  <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', textAlign: 'center' }}>
                    Models are determined by your custom endpoint
                  </p>
                </div>
              )}
            </div>
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

  const isAdmin = getStoredUser()?.role === 'ADMIN'

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

  const configuredCount = providers.filter(p => p.configured).length
  const activeCount     = providers.filter(p => p.configured && p.enabled).length
  const totalCount      = providers.length

  return (
    <div className="page-wrapper" style={{ maxWidth: '88rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>SETTINGS</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>AI Providers</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
          Connect LLM providers to use AI nodes in your flows. Keys are stored securely and only sent to the provider at execution time.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid-3">
        {[
          { label: 'Providers',  value: totalCount,      color: 'var(--color-text-light)' },
          { label: 'Configured', value: configuredCount, color: 'var(--color-accent)' },
          { label: 'Active',     value: activeCount,     color: '#15803d' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.875rem', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '1.875rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.375rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── How it works banner ── */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '0.875rem', padding: '1.25rem 1.75rem',
        marginBottom: '2rem',
      }}>
      <div className="info-banner-grid">
        {[
          { icon: <Key size={16} />,    title: 'Add your key',      desc: 'API keys are stored in your database and never logged.' },
          { icon: <Zap size={16} />,    title: 'Use in AI nodes',   desc: 'Pick any configured provider in the AI node config panel.' },
          { icon: <Shield size={16} />, title: 'Sandboxed inputs',  desc: 'AI nodes can only see data you explicitly bind — no credentials.' },
        ].map(item => (
          <div key={item.title} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '0.125rem' }}>{item.icon}</div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{item.title}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      </div>{/* end info-banner-grid wrapper */}

      {/* ── Provider cards ── */}
      {loading ? (
        <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center' }}>
          <MillennialLoader label="Loading providers…" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {providers.map(p => (
            <ProviderCard
              key={p.provider}
              info={p}
              isAdmin={isAdmin}
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
