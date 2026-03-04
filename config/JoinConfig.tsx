'use client'

import type { JoinNodeConfig } from '@/types'

const EMERALD = '#10b981'
const BORDER  = '#1a2236'
const TEXT    = '#e2e8f0'
const MUTED   = '#64748b'
const MONO    = '"DM Mono", "JetBrains Mono", monospace'

interface JoinConfigProps {
  config:   JoinNodeConfig
  onChange: (next: JoinNodeConfig) => void
}

export default function JoinConfig({ config, onChange }: JoinConfigProps) {
  const safeConfig: JoinNodeConfig = {
    forkNodeId: config?.forkNodeId ?? '',
    mergeLabel: config?.mergeLabel ?? '',
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      padding: 16, fontFamily: MONO,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20, color: EMERALD }}>⑄</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Join Configuration</div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em' }}>PARALLEL MERGE NODE</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>
          PAIRED WITH FORK NODE
        </label>
        <div style={{
          background: '#070d1a', border: `1px solid ${BORDER}`,
          borderRadius: 5, padding: '7px 10px',
          fontSize: 11, color: safeConfig.forkNodeId ? EMERALD : MUTED,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: '#f59e0b' }}>⑃</span>
          {safeConfig.forkNodeId
            ? <span>Paired to FORK node</span>
            : <span style={{ color: MUTED }}>Connect an edge from a FORK node to pair.</span>
          }
        </div>
        <span style={{ fontSize: 10, color: MUTED }}>
          Set automatically when you draw an edge from a FORK node to this JOIN.
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>
          DISPLAY LABEL (OPTIONAL)
        </label>
        <input
          value={safeConfig.mergeLabel ?? ''}
          onChange={e => onChange({ ...safeConfig, mergeLabel: e.target.value })}
          placeholder="e.g. Merge Results"
          style={{
            background: '#070d1a', border: `1px solid ${BORDER}`,
            borderRadius: 5, color: TEXT, fontFamily: MONO,
            fontSize: 11, padding: '7px 10px', outline: 'none',
          }}
        />
      </div>

      <div style={{
        background: `${EMERALD}08`, border: `1px solid ${EMERALD}20`,
        borderRadius: 6, padding: 12,
        fontSize: 11, color: MUTED, lineHeight: 1.8,
      }}>
        <div style={{ color: EMERALD, fontWeight: 700, marginBottom: 8, fontSize: 10 }}>
          WHAT HAPPENS HERE
        </div>
        <div>1. Waits for all branches defined on the paired FORK.</div>
        <div>2. Merges each branch result into the main nex.</div>
        <div>3. Writes timing metadata to <span style={{ color: '#6366f1' }}>nex.join.*</span></div>
        <div>4. Flow continues to the next node with full merged context.</div>
      </div>

      <div style={{
        background: '#050a14', border: `1px solid ${BORDER}`,
        borderRadius: 6, padding: 12,
        fontSize: 10, color: MUTED, lineHeight: 1.8,
      }}>
        <div style={{ color: TEXT, fontWeight: 700, marginBottom: 6, fontSize: 10 }}>
          ACCESS MERGED DATA AFTER JOIN
        </div>
        <div><span style={{ color: '#6366f1' }}>{'{{nex.branchA.nodeLabel.field}}'}</span></div>
        <div><span style={{ color: '#6366f1' }}>{'{{nex.branchB.nodeLabel.field}}'}</span></div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: EMERALD }}>nex.join.totalParallelMs</span>
          <span style={{ color: MUTED }}> — elapsed time for parallel window</span>
        </div>
        <div>
          <span style={{ color: EMERALD }}>nex.join.branchA.durationMs</span>
          <span style={{ color: MUTED }}> — individual branch timing</span>
        </div>
      </div>
    </div>
  )
}
