'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import { NODE_META } from '@/lib/nodeConfig'
import type { ForkJoinNodeData, BranchStatus, ForkNodeConfig } from '@/types'

const SUCCESS_COLOR = '#15803d'
const FAILURE_COLOR = '#b91c1c'

const BRANCH_STATUS_COLOR: Record<BranchStatus, string> = {
  PENDING:   '#6B5A45',
  RUNNING:   '#1E3A5F',
  SUCCESS:   SUCCESS_COLOR,
  FAILURE:   FAILURE_COLOR,
  TIMEOUT:   '#B45309',
  CANCELLED: '#57534E',
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
  const dotColor = BRANCH_STATUS_COLOR[status] ?? '#6B5A45'
  const isRunning = status === 'RUNNING'

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, maxWidth: '100%' }}
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
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: dotColor, letterSpacing: '0.04em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
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
  const meta      = isFork ? NODE_META.FORK : NODE_META.JOIN
  const color     = meta.color
  const cardBg    = meta.bgColor
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
  const forkBranchCount = branches.length
  const joinBranchCount = Object.keys(branchStatuses).length
  const totalCount = isFork ? forkBranchCount : joinBranchCount

  const longestBranchName = forkBranchCount > 0
    ? Math.max(...branches.map(b => (b ?? '').length), 6)
    : 0

  const PAD_Y = 32
  const HEADER_STACK = 102
  const BADGE_BLOCK = 28
  const ROW_H = 24
  const JOIN_PROGRESS_H = 22
  const STATUS_FOOTER = d.liveStatus && d.liveStatus !== 'PENDING' ? 18 : 0

  let listBlock = 0
  if (isFork && forkBranchCount > 0) {
    listBlock = 8 + BADGE_BLOCK + forkBranchCount * ROW_H
  } else if (!isFork && joinBranchCount > 0) {
    listBlock = JOIN_PROGRESS_H + 6 + Math.max(0, joinBranchCount - 4) * 5
  }

  const nodeHeight = Math.max(
    128,
    PAD_Y * 2 + HEADER_STACK + listBlock + STATUS_FOOTER + 10
  )

  const nodeWidth = Math.round(
    Math.min(
      340,
      Math.max(176, 168 + Math.min(longestBranchName * 6.5, 110) + Math.min(forkBranchCount, 10) * 5)
    )
  )

  function branchHandleTopPx(i: number, count: number): number {
    const inset = 26
    const span = Math.max(0, nodeHeight - inset * 2)
    return inset + (span * (i + 1)) / (count + 1)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: nodeWidth,
        height: nodeHeight,
        fontFamily: 'var(--font-mono)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: 'var(--color-surface)',
          border: `2px solid ${color}`,
          width: 10, height: 10,
          borderRadius: 2,
          boxShadow: `0 0 6px ${color}35`,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
        width: nodeWidth,
        height: '100%',
        clipPath: 'polygon(50% 0%, 100% 35%, 100% 65%, 50% 100%, 0% 65%, 0% 35%)',
        background: cardBg,
        border: `2px solid ${selected ? 'var(--color-accent)' : color}`,
        boxShadow: selected
          ? `0 0 0 1px rgba(154,52,18,0.22), 0 4px 14px ${color}20`
          : `0 2px 8px rgba(26,16,8,0.06)`,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        paddingTop: PAD_Y,
        paddingBottom: PAD_Y,
        paddingLeft: 20,
        paddingRight: 20,
        boxSizing: 'border-box',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(26,16,8,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,16,8,0.04) 1px, transparent 1px)
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
            color: isSuccess ? SUCCESS_COLOR : isFailure ? FAILURE_COLOR : color,
            animation: isRunning ? 'fj-pulse 1.2s ease-in-out infinite' : 'none',
            filter: isRunning ? `drop-shadow(0 0 8px ${color})` : 'none',
            transition: 'color 0.3s',
          }}>
            {symbol}
          </div>

          <div style={{
            fontSize: 12, fontWeight: 700,
            color: '#1A1008', letterSpacing: '0.02em',
            textAlign: 'center',
          }}>
            {label}
          </div>

          <div style={{
            fontSize: 8, letterSpacing: '0.16em',
            color,
            opacity: 0.85,
            fontWeight: 600,
          }}>
            {d.nodeType}
          </div>

          {isFork && forkBranchCount > 0 && (
            <div style={{
              fontSize: 9, color: color,
              background: `${color}18`,
              border: `1px solid ${color}40`,
              borderRadius: 3, padding: '2px 8px',
              letterSpacing: '0.06em',
            }}>
              {forkBranchCount} branches
            </div>
          )}

          {!isFork && joinBranchCount > 0 && (
            <div style={{
              fontSize: 10, color: color,
              letterSpacing: '0.06em',
            }}>
              {completedCount}/{joinBranchCount} done
            </div>
          )}

          {isFork && forkBranchCount > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              width: '100%', minWidth: 0, marginTop: 4,
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
              color: isSuccess ? SUCCESS_COLOR : isFailure ? FAILURE_COLOR : color,
              marginTop: 2,
            }}>
              {isRunning ? '↻ running' : isSuccess ? '✓ done' : '✗ failed'}
            </div>
          )}
        </div>
      </div>

      {isFork && forkBranchCount > 0 ? (
        branches.map((name, i) => (
          <Handle
            key={name}
            type="source"
            position={Position.Right}
            id={name}
            style={{
              background: 'var(--color-surface)',
              border: `2px solid ${BRANCH_STATUS_COLOR[branchStatuses[name] ?? 'PENDING']}`,
              width: 10, height: 10,
              borderRadius: 2,
              top: branchHandleTopPx(i, forkBranchCount),
              transform: 'translateY(-50%)',
              boxShadow: `0 0 6px ${color}40`,
              transition: 'border-color 0.3s',
            }}
            title={name}
          />
        ))
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: 'var(--color-surface)',
            border: `2px solid ${color}`,
            width: 10, height: 10,
            borderRadius: 2,
            top: '50%',
            transform: 'translateY(-50%)',
            boxShadow: `0 0 6px ${color}40`,
          }}
        />
      )}
    </div>
  )
}
