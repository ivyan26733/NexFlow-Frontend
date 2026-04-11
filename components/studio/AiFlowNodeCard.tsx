'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useEffect, useState } from 'react'

// Provider accent colors — warm/light-friendly tones
const PROVIDER_COLORS: Record<string, string> = {
  ANTHROPIC: '#C2410C',  // terracotta-orange (on-brand warm)
  OPENAI:    '#0F766E',  // teal green
  GEMINI:    '#1D4ED8',  // cobalt blue
  GROQ:      '#B45309',  // amber
  MISTRAL:   '#1E3A5F',  // navy
  MLVOCA:    '#0F766E',  // teal
  CUSTOM:    '#6B5A45',  // warm brown
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
  RUNNING:  '#1D4ED8',
  SUCCESS:  '#15803d',
  FAILURE:  '#991B1B',
  PENDING:  '#6B5A45',
  RETRYING: '#B45309',
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

  const provider     = d.config?.provider ?? 'ANTHROPIC'
  const model        = d.config?.model ?? ''
  const prompt       = d.config?.prompt ?? ''
  const bindings     = d.config?.inputBindings ?? []
  const liveStatus   = d.liveStatus ?? undefined
  const saveOutputAs = d.config?.saveOutputAs

  const accentColor  = PROVIDER_COLORS[provider] ?? '#7C3AED'
  const icon         = PROVIDER_ICONS[provider]   ?? '✦'
  const statusColor  = liveStatus ? (STATUS_COLORS[liveStatus] ?? '#6B5A45') : '#6B5A45'
  const isRunning    = liveStatus === 'RUNNING'

  // Shimmer sweep animation tick when running
  const [shimmerPos, setShimmerPos] = useState(-20)
  useEffect(() => {
    if (!isRunning) { setShimmerPos(-20); return }
    const interval = setInterval(() => {
      setShimmerPos(p => p >= 120 ? -20 : p + 1.8)
    }, 16)
    return () => clearInterval(interval)
  }, [isRunning])

  const shortModel  = model ? model.split('/').pop()?.slice(0, 22) ?? model : 'default'
  const shortPrompt = prompt.length > 46 ? prompt.slice(0, 46) + '…' : (prompt || 'No prompt set')

  return (
    <>
      <style>{`
        @keyframes ai-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes ai-status-glow {
          0%, 100% { box-shadow: 0 0 3px currentColor; }
          50%      { box-shadow: 0 0 8px currentColor, 0 0 14px currentColor; }
        }
        @keyframes ai-border-pulse {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* ── Input handle — diamond ── */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#F5F0FF',
          border: `2px solid ${accentColor}`,
          width: 10,
          height: 10,
          borderRadius: 2,
          transform: 'rotate(45deg)',
          left: -5,
        }}
      />

      {/* ── Node label above card ── */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#1A1008',
        marginBottom: 4,
        paddingLeft: 2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {d.label || 'AI Node'}
      </div>

      {/* ── Main card ── */}
      <div style={{
        width: 220,
        background: `linear-gradient(145deg, #F5F0FF 0%, #EDE9FE 55%, #F0EBF8 100%)`,
        border: `${selected ? 2 : 1.5}px solid ${selected ? accentColor : accentColor + '60'}`,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: selected
          ? `0 0 0 2px ${accentColor}22, 0 2px 12px ${accentColor}28`
          : `0 1px 4px rgba(26,16,8,0.09)`,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        fontFamily: 'var(--font-geist)',
        animation: isRunning ? 'ai-border-pulse 2s ease-in-out infinite' : 'none',
      }}>

        {/* Top accent strip */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}80 100%)`,
          borderRadius: '10px 10px 0 0',
        }} />

        {/* Running shimmer overlay */}
        {isRunning && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: `linear-gradient(105deg, transparent ${shimmerPos - 15}%, ${accentColor}15 ${shimmerPos}%, transparent ${shimmerPos + 15}%)`,
            transition: 'background 0.016s linear',
          }} />
        )}

        {/* ── Header ── */}
        <div style={{
          padding: '8px 11px 7px',
          borderBottom: `1px solid ${accentColor}18`,
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', gap: 8,
          background: `${accentColor}08`,
        }}>
          {/* Provider icon box */}
          <div style={{
            width: 26, height: 26, flexShrink: 0,
            borderRadius: 6,
            background: `${accentColor}14`,
            border: `1px solid ${accentColor}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: accentColor,
            animation: isRunning ? 'ai-pulse 1.2s ease-in-out infinite' : 'none',
          }}>
            {icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type badge */}
            <div style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: accentColor,
            }}>
              ✦ AI · {provider}
            </div>
            {/* Model */}
            <div style={{
              fontSize: 9,
              color: '#6B5A45',
              marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              opacity: 0.85,
            }}>
              {shortModel}
            </div>
          </div>

          {/* Live status dot */}
          {liveStatus && (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusColor, flexShrink: 0,
              animation: isRunning ? 'ai-status-glow 1.2s ease-in-out infinite' : 'none',
              color: statusColor,
            }} />
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '8px 11px', position: 'relative', zIndex: 1 }}>
          {/* Prompt preview */}
          <div style={{
            fontSize: 10,
            color: '#4A3F32',
            lineHeight: 1.55,
            marginBottom: bindings.length > 0 ? 7 : 0,
            fontStyle: prompt ? 'normal' : 'italic',
          }}>
            <span style={{ color: accentColor + '70', marginRight: 3 }}>"</span>
            {shortPrompt}
            <span style={{ color: accentColor + '70', marginLeft: 2 }}>"</span>
          </div>

          {/* Input binding pills */}
          {bindings.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {bindings.filter(b => b.name).slice(0, 3).map(b => (
                <span key={b.name} style={{
                  fontSize: 9, padding: '2px 6px',
                  background: `${accentColor}12`,
                  border: `1px solid ${accentColor}28`,
                  borderRadius: 4,
                  color: accentColor,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.03em',
                }}>
                  {'{{'}{b.name}{'}}'}
                </span>
              ))}
              {bindings.filter(b => b.name).length > 3 && (
                <span style={{ fontSize: 9, color: '#6B5A45', padding: '2px 4px' }}>
                  +{bindings.filter(b => b.name).length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '5px 11px 7px',
          borderTop: `1px solid ${accentColor}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 1,
        }}>
          {saveOutputAs ? (
            <span style={{ fontSize: 8, color: '#B45309', fontFamily: 'var(--font-mono)' }}>
              nex.{saveOutputAs}
            </span>
          ) : (
            <span style={{ fontSize: 8, color: accentColor + '60', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
              AI · LLM
            </span>
          )}

          {liveStatus && liveStatus !== 'PENDING' && (
            <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: statusColor, letterSpacing: '0.06em' }}>
              {liveStatus === 'RUNNING' ? '↻ running' : liveStatus === 'SUCCESS' ? '✓ done' : '✗ failed'}
            </span>
          )}
        </div>
      </div>

      {/* ── Success output handle ── */}
      <Handle
        type="source"
        position={Position.Right}
        id="success"
        style={{
          background: '#15803d',
          border: '2px solid #14532D',
          width: 10, height: 10,
          borderRadius: '50%',
          top: '40%',
          right: -5,
        }}
      />
      {/* ── Failure output handle ── */}
      <Handle
        type="source"
        position={Position.Right}
        id="failure"
        style={{
          background: '#b91c1c',
          border: '2px solid #7F1D1D',
          width: 10, height: 10,
          borderRadius: '50%',
          top: '65%',
          right: -5,
        }}
      />
      {/* Handle labels */}
      <div style={{
        position: 'absolute',
        right: -38,
        top: '34%',
        fontSize: 7,
        fontFamily: 'var(--font-mono)',
        color: '#15803d',
        pointerEvents: 'none',
      }}>✓ OK</div>
      <div style={{
        position: 'absolute',
        right: -44,
        top: '59%',
        fontSize: 7,
        fontFamily: 'var(--font-mono)',
        color: '#b91c1c',
        pointerEvents: 'none',
      }}>✗ FAIL</div>
    </>
  )
}
