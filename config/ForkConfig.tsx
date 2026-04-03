'use client'

import { useState } from 'react'
import type { ForkNodeConfig, JoinStrategy, BranchFailureMode, TimeoutMode } from '@/types'

const AMBER   = '#f59e0b'
const BORDER  = '#1a2236'
const TEXT    = '#e2e8f0'
const MUTED   = '#64748b'
const MONO    = '"DM Mono", "JetBrains Mono", monospace'

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: '#070d1a', border: `1px solid ${BORDER}`, borderRadius: 5,
          color: TEXT, fontFamily: MONO, fontSize: 11,
          padding: '7px 10px', outline: 'none', width: '100%',
        }}
      />
    </div>
  )
}

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        style={{
          background: '#070d1a', border: `1px solid ${BORDER}`, borderRadius: 5,
          color: TEXT, fontFamily: MONO, fontSize: 11,
          padding: '7px 10px', outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function BranchTag({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: `${AMBER}12`, border: `1px solid ${AMBER}30`,
      borderRadius: 4, padding: '4px 8px',
    }}>
      <span style={{ color: AMBER, fontSize: 10, fontFamily: MONO }}>⑃</span>
      <span style={{ color: AMBER, fontSize: 11, fontFamily: MONO }}>{name}</span>
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', color: MUTED,
          cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
        }}
        title={`Remove ${name}`}
      >×</button>
    </div>
  )
}

const STRATEGY_DESCRIPTIONS: Record<JoinStrategy, string> = {
  WAIT_ALL:   'All branches must complete before flow continues.',
  WAIT_FIRST: 'Continue when the fastest branch finishes. Others are cancelled.',
  WAIT_N:     'Continue when N branches finish. Set count below.',
}

interface ForkConfigProps {
  config:   ForkNodeConfig
  onChange: (next: ForkNodeConfig) => void
}

export default function ForkConfig({ config, onChange }: ForkConfigProps) {
  const safeConfig: ForkNodeConfig = {
    branches: Array.isArray(config?.branches) ? config.branches : [],
    strategy: config?.strategy ?? 'WAIT_ALL',
    waitForCount: config?.waitForCount, // allow undefined so user can clear and type
    timeoutSeconds: config?.timeoutSeconds ?? 60,
    onBranchFailure: config?.onBranchFailure ?? 'FAIL_FAST',
    onTimeout: config?.onTimeout ?? 'FAIL',
  }

  const [newBranchName, setNewBranchName] = useState('')
  const [addError,      setAddError]      = useState('')

  function addBranch() {
    const name = newBranchName.trim()
    if (!name) { setAddError('Branch name cannot be empty.'); return }
    if (safeConfig.branches.includes(name)) {
      setAddError(`"${name}" already exists.`); return
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      setAddError('Use letters, numbers, underscores only. Must start with a letter.'); return
    }
    onChange({ ...safeConfig, branches: [...safeConfig.branches, name] })
    setNewBranchName('')
    setAddError('')
  }

  function removeBranch(name: string) {
    const newBranches = safeConfig.branches.filter(b => b !== name)
    // Clamp waitForCount so it never exceeds the remaining branch count
    const newWaitForCount = safeConfig.waitForCount != null
      ? Math.min(safeConfig.waitForCount, Math.max(1, newBranches.length))
      : undefined
    onChange({ ...safeConfig, branches: newBranches, waitForCount: newWaitForCount })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addBranch() }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      padding: 16, fontFamily: MONO,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20, color: AMBER }}>⑃</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Fork Configuration</div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>PARALLEL SPLIT NODE</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>
          BRANCHES ({safeConfig.branches.length})
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 30 }}>
          {safeConfig.branches.length === 0 && (
            <span style={{ fontSize: 11, color: MUTED }}>No branches yet — add one below.</span>
          )}
          {safeConfig.branches.map(name => (
            <BranchTag key={name} name={name} onRemove={() => removeBranch(name)} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={newBranchName}
            onChange={e => { setNewBranchName(e.target.value); setAddError('') }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. branchA"
            style={{
              flex: 1, background: '#070d1a',
              border: `1px solid ${addError ? '#ef4444' : BORDER}`,
              borderRadius: 5, color: TEXT, fontFamily: MONO,
              fontSize: 11, padding: '7px 10px', outline: 'none',
            }}
          />
          <button
            onClick={addBranch}
            style={{
              background: `${AMBER}18`, border: `1px solid ${AMBER}40`,
              borderRadius: 5, color: AMBER, fontFamily: MONO,
              fontSize: 11, padding: '7px 12px', cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>

        {addError && (
          <span style={{ fontSize: 10, color: '#ef4444' }}>{addError}</span>
        )}
      </div>

      <SelectField
        label="JOIN STRATEGY"
        value={safeConfig.strategy}
        options={[
          { value: 'WAIT_ALL',   label: 'Wait for All  — every branch completes' },
          { value: 'WAIT_FIRST', label: 'Wait for First — race mode' },
          { value: 'WAIT_N',     label: 'Wait for N    — quorum mode' },
        ]}
        onChange={strategy => onChange({ ...safeConfig, strategy })}
      />

      <div style={{
        background: `${AMBER}08`, border: `1px solid ${AMBER}20`,
        borderRadius: 5, padding: '8px 10px',
        fontSize: 11, color: MUTED, lineHeight: 1.6,
      }}>
        {STRATEGY_DESCRIPTIONS[safeConfig.strategy]}
      </div>

      {safeConfig.strategy === 'WAIT_N' && (
        <Field
          label="WAIT FOR N BRANCHES"
          value={safeConfig.waitForCount != null ? String(safeConfig.waitForCount) : ''}
          onChange={v => {
            const branchCount = safeConfig.branches.length || 1
            if (v === '') {
              onChange({ ...safeConfig, waitForCount: undefined })
              return
            }
            const num = parseInt(v, 10)
            const n = !Number.isNaN(num) ? Math.max(1, Math.min(branchCount, num)) : (safeConfig.waitForCount ?? 1)
            onChange({ ...safeConfig, waitForCount: n })
          }}
          placeholder="1"
        />
      )}

      <Field
        label="TIMEOUT (SECONDS)"
        value={String(safeConfig.timeoutSeconds)}
        onChange={v => onChange({ ...safeConfig, timeoutSeconds: parseInt(v, 10) || 60 })}
        placeholder="60"
      />

      <SelectField
        label="ON TIMEOUT"
        value={safeConfig.onTimeout}
        options={[
          { value: 'FAIL',                label: 'Fail — stop the whole flow' },
          { value: 'CONTINUE_WITH_PARTIAL', label: 'Continue with partial results' },
        ]}
        onChange={onTimeout => onChange({ ...safeConfig, onTimeout })}
      />

      <SelectField
        label="ON BRANCH FAILURE"
        value={safeConfig.onBranchFailure}
        options={[
          { value: 'FAIL_FAST', label: 'Fail Fast — stop all branches immediately' },
          { value: 'CONTINUE',  label: 'Continue  — merge whatever succeeded' },
        ]}
        onChange={onBranchFailure => onChange({ ...safeConfig, onBranchFailure })}
      />

      <div style={{
        background: '#050a14', border: `1px solid ${BORDER}`,
        borderRadius: 6, padding: 12,
        fontSize: 10, color: MUTED, lineHeight: 1.8,
      }}>
        <div style={{ color: AMBER, fontWeight: 700, marginBottom: 6, fontSize: 10 }}>
          BRANCH OUTPUT PATHS
        </div>
        {safeConfig.branches.map(name => (
          <div key={name}>
            <span style={{ color: '#6366f1' }}>nex.{name}.</span>
            <span style={{ color: MUTED }}>{'{nodeLabel}'}</span>
          </div>
        ))}
        {safeConfig.branches.length === 0 && (
          <div>Add branches to see output paths.</div>
        )}
      </div>
    </div>
  )
}
