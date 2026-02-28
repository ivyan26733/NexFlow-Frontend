'use client'

import { useState, useRef, useEffect } from 'react'
import { Save, Play, Loader2, ChevronRight, HelpCircle, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  flowId:    string
  flowName:  string
  flowSlug?: string
  saving:    boolean
  onSave:    () => void
  onFlowNameChange?: (name: string) => void
  onTrigger: (payload: Record<string, unknown>) => void
  viewMode?: boolean
}

export default function StudioToolbar({ flowId, flowName, flowSlug, saving, onSave, onFlowNameChange, onTrigger, viewMode }: Props) {
  const router = useRouter()
  const [showTrigger, setShowTrigger] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [payloadText, setPayloadText] = useState('{\n  \n}')
  const [payloadError, setPayloadError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState(flowName)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setEditNameValue(flowName) }, [flowName])
  useEffect(() => { if (editingName) editInputRef.current?.focus() }, [editingName])

  function commitFlowName() {
    const trimmed = editNameValue.trim()
    if (trimmed && trimmed !== flowName && onFlowNameChange) {
      onFlowNameChange(trimmed)
    }
    setEditingName(false)
  }

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
        {editingName ? (
          <input
            ref={editInputRef}
            type="text"
            value={editNameValue}
            onChange={e => setEditNameValue(e.target.value)}
            onBlur={commitFlowName}
            onKeyDown={e => { if (e.key === 'Enter') commitFlowName(); if (e.key === 'Escape') { setEditNameValue(flowName); setEditingName(false) } }}
            className="input-base studio-toolbar-title"
            style={{ minWidth: 120, maxWidth: 280 }}
          />
        ) : (
          <span className="studio-toolbar-title">{flowName}</span>
        )}
        {!viewMode && onFlowNameChange && !editingName && (
          <button type="button" onClick={() => setEditingName(true)} className="studio-toolbar-btn" title="Edit flow name" style={{ padding: '0.25rem 0.5rem' }}>
            <Pencil size={14} />
          </button>
        )}
        <div className="studio-toolbar-actions">
          <button type="button" onClick={() => setShowHelp(true)} className="studio-toolbar-btn" title="How to run & reference syntax">
            <HelpCircle size={16} />
            Help
          </button>
          {!viewMode && (
            <>
              <button type="button" onClick={onSave} disabled={saving} className="studio-toolbar-btn">
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowTrigger(true)} className="studio-toolbar-btn accent">
                <Play size={16} />
                Trigger
              </button>
            </>
          )}
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

      {/* Help: how to run & reference syntax */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowHelp(false)}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1.5rem', width: '32rem', maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>Studio: Run a flow & reference syntax</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
              The flow you draw <strong style={{ color: 'var(--color-text)' }}>is</strong> the program. No separate code file — you configure nodes and use <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-panel)', padding: '2px 6px', borderRadius: 4 }}>{'{{ ... }}'}</code> references.
            </p>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>How to run</h3>
            <ol style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '1rem', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
              <li>Build the flow (e.g. Start → Variable → Success), connect edges, configure nodes.</li>
              <li>Click <strong style={{ color: 'var(--color-text)' }}>Save</strong>.</li>
              <li>Click <strong style={{ color: 'var(--color-text)' }}>Trigger</strong> → enter optional JSON (e.g. <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{'{"name": "World"}'}</code>) → <strong style={{ color: 'var(--color-text)' }}>Run</strong>.</li>
            </ol>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--color-text)' }}>Reference syntax (“language”)</h3>
            <ul style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0', paddingLeft: '1.25rem', lineHeight: 1.7 }}>
              <li><code style={{ fontFamily: 'var(--font-mono)' }}>{'{{nodes.start.output.body}}'}</code> — trigger payload; add <code style={{ fontFamily: 'var(--font-mono)' }}>.fieldName</code> for a field.</li>
              <li><code style={{ fontFamily: 'var(--font-mono)' }}>{'{{nodes.<nodeId>.successOutput.body}}'}</code> — success output of a node (e.g. HTTP response).</li>
              <li><code style={{ fontFamily: 'var(--font-mono)' }}>{'{{nodes.<nodeId>.failureOutput.body}}'}</code> — failure output.</li>
              <li><code style={{ fontFamily: 'var(--font-mono)' }}>{'{{variables.<name>}}'}</code> — variable set by a Variable node.</li>
            </ul>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.75rem' }}>Use these in Variable, Mapper, Decision, and Nexus config.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowHelp(false)} className="dashboard-btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
