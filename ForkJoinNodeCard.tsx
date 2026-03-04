'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import type { ForkJoinNodeData, BranchStatus, ForkNodeConfig } from '@/types'

const FORK_COLOR = '#f59e0b'
const JOIN_COLOR = '#10b981'

const BRANCH_STATUS_COLOR: Record<BranchStatus, string> = {
  PENDING:   '#334155',
  RUNNING:   '#38bdf8',
  SUCCESS:   '#10b981',
  FAILURE:   '#ef4444',
  TIMEOUT:   '#f59e0b',
  CANCELLED: '#475569',
}

const STYLE_ID = 'fork-join-node-styles'
const KEYFRAMES = `
  @keyframes fj-rotate   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fj-pulse    { 0%,100% { opacity:.4; transform:scale(1); } 50% { opacity:1; transform:scale(1.2); } }
  @keyframes fj-ripple   { 0% { transform:scale(.8); opacity:.8; } 100% { transform:scale(2.2); opacity:0; } }
  @keyframes fj-scan     { 0% { transform:translateY(-100%); } 100% { transform:translateY(300%); } }
  @keyframes fj-blink    { 0%,90%,100% { opacity:1; } 95% { opacity:.1; } }
  @keyframes fj-dash     { to { stroke-dashoffset: -20; } }
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = KEYFRAMES
  document.head.appendChild(el)
}

function CornerBracket({
  pos, color, animate,
}: { pos: 'tl'|'tr'|'bl'|'br'; color: string; animate: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2 },
    tr: { top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2 },
    bl: { bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2 },
    br: { bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2 },
  }
  return (
    <div style={{
      position: 'absolute', width: 10, height: 10,
      borderStyle: 'solid', borderColor: color, borderWidth: 0,
      ...styles[pos],
      animation: animate ? 'fj-blink 2.5s ease-in-out infinite' : 'none',
    }} />
  )
}

function BranchDot({
  name, status, color,
}: { name: string; status: BranchStatus; color: string }) {
  const dotColor = BRANCH_STATUS_COLOR[status] ?? '#334155'
  const isRunning = status === 'RUNNING'

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5 }}
         title={`${name}: ${status}`}>
      {isRunning && (
        <div style={{
          position: 'absolute', left: -2, top: -2,
          width: 10, height: 10, borderRadius: '50%',
          border: `1px solid ${dotColor}`,
          animation: 'fj-ripple 1.2s ease-out infinite',
        }} />
      )}
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: dotColor,
        boxShadow: isRunning ? `0 0 6px ${dotColor}` : 'none',
        animation: isRunning ? 'fj-pulse 1s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: 'DM Mono, monospace', fontSize: 9,
        color: dotColor, letterSpacing: '0.04em',
      }}>
        {name}
      </span>
    </div>
  )
}

export default function ForkJoinNodeCard({ data, selected }: NodeProps) {
  const d = data as unknown as ForkJoinNodeData
  useEffect(() => { injectStyles() }, [])

  const isFork    = d.nodeType === 'FORK'
  const color     = isFork ? FORK_COLOR : JOIN_COLOR
  const symbol    = isFork ? '⑃' : '⑄'
  const label     = d.label || (isFork ? 'Fork' : 'Join')
  const isRunning = d.liveStatus === 'RUNNING'
  const isSuccess = d.liveStatus === 'SUCCESS'
  const isFailure = d.liveStatus === 'FAILURE'

  const branches = isFork
    ? ((d.config as ForkNodeConfig).branches ?? [])
    : []

  const branchStatuses = d.branchStatuses ?? {}

  const [ringAngle, setRingAngle] = useState(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    if (!isRunning) { setRingAngle(0); return }
    const tick = () => {
      setRingAngle(a => (a + 0.8) % 360)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isRunning])

  const completedCount = Object.values(branchStatuses)
    .filter(s => s === 'SUCCESS' || s === 'FAILURE' || s === 'TIMEOUT').length
  const totalCount = branches.length

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#060b16',
          border: `2px solid ${color}60`,
          width: 10, height: 10,
          borderRadius: 2,
          boxShadow: `0 0 8px ${color}40`,
        }}
      />

      <div style={{
        position: 'relative',
        width: 180,
        clipPath: 'polygon(50% 0%, 100% 35%, 100% 65%, 50% 100%, 0% 65%, 0% 35%)',
        background: `linear-gradient(135deg, #060b16 0%, #0d1526 60%, #060b16 100%)`,
        border: `1px solid ${selected ? color + 'aa' : color + '30'}`,
        boxShadow: selected
          ? `0 0 0 1px ${color}30, 0 0 32px ${color}18, inset 0 0 24px ${color}06`
          : `0 0 16px ${color}08`,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        fontFamily: 'DM Mono, monospace',
        paddingTop: 40, paddingBottom: 40,
        paddingLeft: 20, paddingRight: 20,
        minHeight: branches.length > 0 ? 160 + branches.length * 18 : 140,
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            linear-gradient(${color}06 1px, transparent 1px),
            linear-gradient(90deg, ${color}06 1px, transparent 1px)
          `,
          backgroundSize: '18px 18px',
        }} />

        {isRunning && (
          <div style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            border: `1px dashed ${color}40`,
            transform: `rotate(${ringAngle}deg)`,
            pointerEvents: 'none',
            zIndex: 0,
          }} />
        )}

        {(['tl','tr','bl','br'] as const).map(pos => (
          <CornerBracket key={pos} pos={pos} color={color + (selected ? 'cc' : '50')} animate={selected} />
        ))}

        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 6,
        }}>
          <div style={{
            fontSize: 28, lineHeight: 1,
            color: isSuccess ? JOIN_COLOR : isFailure ? '#ef4444' : color,
            animation: isRunning ? 'fj-pulse 1.2s ease-in-out infinite' : 'none',
            filter: isRunning ? `drop-shadow(0 0 8px ${color})` : 'none',
            transition: 'color 0.3s',
          }}>
            {symbol}
          </div>

          <div style={{
            fontSize: 12, fontWeight: 700,
            color: '#f1f5f9', letterSpacing: '0.02em',
            textAlign: 'center',
          }}>
            {label}
          </div>

          <div style={{
            fontSize: 8, letterSpacing: '0.16em',
            color: color + 'bb',
            fontWeight: 600,
          }}>
            {d.nodeType}
          </div>

          {isFork && branches.length > 0 && (
            <div style={{
              fontSize: 9, color: color,
              background: color + '15',
              border: `1px solid ${color}30`,
              borderRadius: 3, padding: '2px 8px',
              letterSpacing: '0.06em',
            }}>
              {branches.length} branches
            </div>
          )}

          {!isFork && totalCount > 0 && (
            <div style={{
              fontSize: 10, color: color,
              letterSpacing: '0.06em',
            }}>
              {completedCount}/{totalCount} done
            </div>
          )}

          {isFork && branches.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              width: '100%', marginTop: 4,
            }}>
              {branches.map(name => (
                <BranchDot
                  key={name}
                  name={name}
                  status={branchStatuses[name] ?? 'PENDING'}
                  color={color}
                />
              ))}
            </div>
          )}

          {d.liveStatus && d.liveStatus !== 'PENDING' && (
            <div style={{
              fontSize: 8, letterSpacing: '0.12em',
              color: isSuccess ? JOIN_COLOR : isFailure ? '#ef4444' : color,
              marginTop: 2,
            }}>
              {isRunning ? '↻ running' : isSuccess ? '✓ done' : '✗ failed'}
            </div>
          )}
        </div>
      </div>

      {isFork && branches.length > 0 ? (
        branches.map((name, i) => {
          const totalH = 140 + branches.length * 18
          const spacing = totalH / (branches.length + 1)
          const topPct = ((i + 1) * spacing) / totalH * 100

          return (
            <Handle
              key={name}
              type="source"
              position={Position.Right}
              id={name}
              style={{
                background: '#060b16',
                border: `2px solid ${BRANCH_STATUS_COLOR[branchStatuses[name] ?? 'PENDING']}`,
                width: 10, height: 10,
                borderRadius: 2,
                top: `${topPct}%`,
                boxShadow: `0 0 6px ${color}40`,
                transition: 'border-color 0.3s',
              }}
              title={name}
            />
          )
        })
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: '#060b16',
            border: `2px solid ${color}60`,
            width: 10, height: 10,
            borderRadius: 2,
            boxShadow: `0 0 6px ${color}40`,
          }}
        />
      )}
    </>
  )
}
