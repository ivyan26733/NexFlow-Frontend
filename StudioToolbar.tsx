'use client'

import { useState } from 'react'
import { Save, Play, Loader2, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  flowName:  string
  flowSlug?: string
  saving:    boolean
  onSave:    () => void
  onTrigger: (payload: Record<string, unknown>) => void
}

export default function StudioToolbar({ flowName, flowSlug, saving, onSave, onTrigger }: Props) {
  const router = useRouter()
  const [showTrigger, setShowTrigger] = useState(false)
  const [payloadText, setPayloadText] = useState('{\n  \n}')
  const [payloadError, setPayloadError] = useState('')

  function handleTrigger() {
    try {
      const payload = JSON.parse(payloadText)
      onTrigger(payload)
      setShowTrigger(false)
      setPayloadError('')
    } catch {
      setPayloadError('Invalid JSON')
    }
  }

  return (
    <>
      <div className="studio-toolbar">
        <button type="button" onClick={() => router.push('/')} className="studio-toolbar-breadcrumb">Flows</button>
        <ChevronRight size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
        <span className="studio-toolbar-title">{flowName}</span>
        <div className="studio-toolbar-actions">
          <button type="button" onClick={onSave} disabled={saving} className="studio-toolbar-btn">
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => setShowTrigger(true)} className="studio-toolbar-btn accent">
            <Play size={16} />
            Trigger
          </button>
        </div>
      </div>

      {/* Trigger payload modal */}
      {showTrigger && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowTrigger(false)}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1.5rem', width: '28rem' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text)' }}>Trigger Flow</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>This payload will be available at <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{'{{nodes.start.output.body.*}}'}</span></p>
            <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', display: 'block', marginBottom: '0.375rem' }}>REQUEST BODY (JSON)</label>
            <textarea
              value={payloadText}
              onChange={e => { setPayloadText(e.target.value); setPayloadError('') }}
              rows={6}
              spellCheck={false}
              className="input-base"
              style={{ fontFamily: 'var(--font-mono)', resize: 'none', marginBottom: '0.5rem' }}
            />
            {payloadError && <p style={{ fontSize: '0.75rem', color: 'var(--color-failure)', marginTop: '0.25rem' }}>{payloadError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowTrigger(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleTrigger} className="dashboard-btn-primary">
                <Play size={14} /> Run
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
