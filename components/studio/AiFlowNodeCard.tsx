'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useEffect, useState } from 'react'

const PROVIDER_COLORS: Record<string, string> = {
  ANTHROPIC: '#e879f9',
  OPENAI:    '#10B981',
  GEMINI:    '#4285F4',
  GROQ:      '#F59E0B',
  MISTRAL:   '#6366F1',
  MLVOCA:    '#14B8A6',
  CUSTOM:    '#94A3B8',
}

const PROVIDER_ICONS: Record<string, string> = {
  ANTHROPIC: '◎',
  OPENAI:    '⬡',
  GEMINI:    '✦',
  GROQ:      '⚡',
  MISTRAL:   '◈',
  MLVOCA:    '◇',
  CUSTOM:    '⚙',
}

const STATUS_COLORS: Record<string, string> = {
  RUNNING:  '#00D4FF',
  SUCCESS:  '#10B981',
  FAILURE:  '#EF4444',
  PENDING:  '#334155',
  RETRYING: '#F59E0B',
}

interface AiNodeData {
  label?: string
  config?: {
    provider?: string
    model?: string
    prompt?: string
    inputBindings?: Array<{ name: string }>
    saveOutputAs?: string
  }
  liveStatus?: string | null
}

export default function AiFlowNodeCard({ data, selected }: NodeProps) {
  const d = data as unknown as AiNodeData

  const provider    = d.config?.provider ?? 'ANTHROPIC'
  const model       = d.config?.model ?? ''
  const prompt      = d.config?.prompt ?? ''
  const bindings    = d.config?.inputBindings ?? []
  const liveStatus  = d.liveStatus ?? undefined
  const saveOutputAs = d.config?.saveOutputAs

  const accentColor = PROVIDER_COLORS[provider] ?? '#8B5CF6'
  const icon        = PROVIDER_ICONS[provider]  ?? '✦'
  const statusColor = liveStatus ? (STATUS_COLORS[liveStatus] ?? '#334155') : '#334155'
  const isRunning   = liveStatus === 'RUNNING'

  // Scanning line animation tick
  const [scanPos, setScanPos] = useState(0)
  useEffect(() => {
    if (!isRunning) { setScanPos(0); return }
    const interval = setInterval(() => {
      setScanPos(p => (p + 2) % 110)
    }, 16)
    return () => clearInterval(interval)
  }, [isRunning])

  const shortModel   = model ? model.split('/').pop()?.slice(0, 22) ?? model : 'default'
  const shortPrompt  = prompt.length > 48 ? prompt.slice(0, 48) + '…' : (prompt || 'No prompt set')

  return (
    <>
      <style>{`
        @keyframes ai-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes ai-corner-blink {
          0%, 90%, 100% { opacity: 1; }
          95%           { opacity: 0.2; }
        }
        @keyframes ai-grid-drift {
          from { background-position: 0 0; }
          to   { background-position: 20px 20px; }
        }
        @keyframes ai-status-glow {
          0%, 100% { box-shadow: 0 0 4px currentColor; }
          50%      { box-shadow: 0 0 12px currentColor, 0 0 20px currentColor; }
        }
      `}</style>

      {/* ── Input handle ── */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#0A0F1A',
          border: `2px solid ${accentColor}`,
          width: '10px', height: '10px',
          borderRadius: '2px',
          boxShadow: `0 0 8px ${accentColor}60`,
        }}
      />

      {/* ── Main card ── */}
      <div style={{
        width: '230px',
        background: 'linear-gradient(135deg, #060B16 0%, #0A0F1A 50%, #060B16 100%)',
        border: `1px solid ${selected ? accentColor + '80' : accentColor + '35'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: selected
          ? `0 0 0 1px ${accentColor}40, 0 0 24px ${accentColor}20, inset 0 0 20px ${accentColor}05`
          : `0 0 12px ${accentColor}10, inset 0 0 10px ${accentColor}03`,
        transition: 'box-shadow 0.2s',
        fontFamily: 'DM Mono, Courier New, monospace',
      }}>

        {/* ── Circuit grid background ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            linear-gradient(${accentColor}08 1px, transparent 1px),
            linear-gradient(90deg, ${accentColor}08 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          animation: isRunning ? 'ai-grid-drift 2s linear infinite' : 'none',
        }} />

        {/* ── Scanning line (only when running) ── */}
        {isRunning && (
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: `${scanPos}%`,
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}80 40%, ${accentColor} 50%, ${accentColor}80 60%, transparent 100%)`,
            boxShadow: `0 0 8px ${accentColor}`,
            zIndex: 2, pointerEvents: 'none',
            transition: 'top 0.016s linear',
          }} />
        )}

        {/* ── Corner accent brackets ── */}
        {['topLeft','topRight','bottomLeft','bottomRight'].map(corner => (
          <div key={corner} style={{
            position: 'absolute', width: '10px', height: '10px',
            zIndex: 1, pointerEvents: 'none',
            borderColor: accentColor + (selected ? 'CC' : '60'),
            borderStyle: 'solid',
            borderWidth: 0,
            ...(corner === 'topLeft'     && { top: 3, left: 3, borderTopWidth: '1.5px', borderLeftWidth: '1.5px' }),
            ...(corner === 'topRight'    && { top: 3, right: 3, borderTopWidth: '1.5px', borderRightWidth: '1.5px' }),
            ...(corner === 'bottomLeft'  && { bottom: 3, left: 3, borderBottomWidth: '1.5px', borderLeftWidth: '1.5px' }),
            ...(corner === 'bottomRight' && { bottom: 3, right: 3, borderBottomWidth: '1.5px', borderRightWidth: '1.5px' }),
            animation: selected ? 'ai-corner-blink 2s ease-in-out infinite' : 'none',
          }} />
        ))}

        {/* ── Header ── */}
        <div style={{
          padding: '10px 12px 8px',
          borderBottom: `1px solid ${accentColor}20`,
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {/* Animated AI icon */}
          <div style={{
            width: '28px', height: '28px', flexShrink: 0,
            borderRadius: '6px',
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: accentColor,
            animation: isRunning ? 'ai-pulse 1s ease-in-out infinite' : 'none',
            boxShadow: isRunning ? `0 0 10px ${accentColor}60` : 'none',
          }}>
            {icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Node label */}
            <div style={{
              fontSize: '12px', fontWeight: '600', color: '#F1F5F9',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}>
              {d.label || 'AI Node'}
            </div>
            {/* Provider + model */}
            <div style={{
              fontSize: '9px', color: accentColor,
              letterSpacing: '0.06em', marginTop: '2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              opacity: 0.85,
            }}>
              {provider} · {shortModel}
            </div>
          </div>

          {/* Live status dot */}
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: statusColor, flexShrink: 0,
            color: statusColor,
            animation: isRunning ? 'ai-status-glow 1s ease-in-out infinite' : 'none',
            boxShadow: liveStatus ? `0 0 6px ${statusColor}` : 'none',
          }} />
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '9px 12px', position: 'relative', zIndex: 1 }}>

          {/* Prompt preview */}
          <div style={{
            fontSize: '10px', color: '#475569',
            lineHeight: 1.6,
            marginBottom: bindings.length > 0 ? '8px' : 0,
            fontStyle: prompt ? 'normal' : 'italic',
          }}>
            <span style={{ color: accentColor + '80', marginRight: '4px' }}>"</span>
            {shortPrompt}
            <span style={{ color: accentColor + '80', marginLeft: '2px' }}>"</span>
          </div>

          {/* Input bindings pills */}
          {bindings.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {bindings.filter(b => b.name).slice(0, 3).map(b => (
                <span key={b.name} style={{
                  fontSize: '9px', padding: '2px 6px',
                  background: `${accentColor}10`,
                  border: `1px solid ${accentColor}25`,
                  borderRadius: '3px',
                  color: accentColor, letterSpacing: '0.04em',
                }}>
                  {'{{'}{b.name}{'}}'}
                </span>
              ))}
              {bindings.filter(b => b.name).length > 3 && (
                <span style={{ fontSize: '9px', color: '#334155', padding: '2px 4px' }}>
                  +{bindings.filter(b => b.name).length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Footer bar ── */}
        <div style={{
          padding: '5px 12px',
          borderTop: `1px solid ${accentColor}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 1,
          background: `${accentColor}05`,
        }}>
          <span style={{
            fontSize: '8px', letterSpacing: '0.12em', color: accentColor + '70',
          }}>
            AI · LLM NODE
          </span>

          {/* nex badge */}
          {saveOutputAs && (
            <span style={{
              fontSize: '8px', color: '#F59E0B',
              letterSpacing: '0.06em',
            }}>
              nex.{saveOutputAs}
            </span>
          )}

          {/* Status label */}
          {liveStatus && liveStatus !== 'PENDING' && (
            <span style={{
              fontSize: '8px', letterSpacing: '0.08em',
              color: statusColor,
            }}>
              {liveStatus === 'RUNNING' ? '↻ running' : liveStatus === 'SUCCESS' ? '✓ done' : '✗ failed'}
            </span>
          )}
        </div>

      </div>

      {/* ── Output handles ── */}
      <Handle
        type="source"
        position={Position.Right}
        id="success"
        style={{
          background: '#0A0F1A', border: '2px solid #10B981',
          width: '10px', height: '10px', borderRadius: '2px',
          top: '35%', boxShadow: '0 0 6px rgba(16,185,129,0.5)',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="failure"
        style={{
          background: '#0A0F1A', border: '2px solid #EF4444',
          width: '10px', height: '10px', borderRadius: '2px',
          top: '65%', boxShadow: '0 0 6px rgba(239,68,68,0.4)',
        }}
      />
    </>
  )
}
