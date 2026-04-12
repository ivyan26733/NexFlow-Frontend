'use client'

import { NODE_GROUPS, NODE_META } from './nodeConfig'
import type { NodeType } from '@/types'

import { PanelLeftClose } from 'lucide-react'

export default function NodeSidebar({ onAddNode, onClose }: { onAddNode?: (t: NodeType) => void; onClose?: () => void }) {
  function onDragStart(event: React.DragEvent, nodeType: NodeType) {
    event.dataTransfer.setData('nodeType', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="studio-sidebar">

      <div className="studio-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <p className="title">NODES</p>
            <p className="subtitle">Drag onto canvas · tap to add on mobile</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Collapse panel"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '1.75rem', height: '1.75rem', flexShrink: 0,
                border: '1px solid var(--color-border)', borderRadius: '0.375rem',
                background: 'transparent', color: 'var(--color-muted)',
                cursor: 'pointer', marginTop: '0.125rem',
              }}
            >
              <PanelLeftClose size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="studio-sidebar-body">
        <div className="studio-sidebar-section">
          <p className="studio-sidebar-section-label">ENTRY</p>
          <StartNodeHint />
        </div>
        {NODE_GROUPS.map(group => (
          <div key={group.label} className="studio-sidebar-section">
            <p className="studio-sidebar-section-label">{group.label}</p>
            <div className="studio-sidebar-nodes">
              {group.types.map(type => (
                <SidebarNode
                  key={type}
                  nodeType={type}
                  onDragStart={onDragStart}
                  onAddNode={onAddNode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="studio-sidebar-footer">
        <span style={{ color: 'var(--color-text)' }}>Nexus</span> and <span style={{ color: 'var(--color-text)' }}>Sub-Flow</span> have <span style={{ color: 'var(--color-success)' }}>success</span> + <span style={{ color: 'var(--color-failure)' }}>failure</span> outputs.
      </div>
    </aside>
  )
}

/* ───────────────────────── Sidebar Node ───────────────────────── */

function SidebarNode({
  nodeType,
  onDragStart,
  onAddNode,
}: {
  nodeType: NodeType
  onDragStart: (e: React.DragEvent, t: NodeType) => void
  onAddNode?: (t: NodeType) => void
}) {
  const meta = NODE_META[nodeType]

  function handleClick() {
    if (!onAddNode) return
    if (typeof window === 'undefined') return

    const isTouch =
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)

    if (!isTouch) return
    onAddNode(nodeType)
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, nodeType)}
      onClick={handleClick}
      className="studio-sidebar-node"
      style={{ borderLeftWidth: '3px', borderLeftColor: meta.color }}
    >
      <div className="studio-sidebar-node-dot" style={{ background: meta.color }} />
      <div className="min-w-0">
        <span style={{ fontWeight: 500 }}>{meta.label}</span>
        <p style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getShortDescription(nodeType)}</p>
      </div>
    </div>
  )
}

/* ───────────────────────── Start Node Hint ───────────────────────── */

function StartNodeHint() {
  const meta = NODE_META.START

  return (
    <div className="studio-sidebar-node" style={{ borderStyle: 'dashed', opacity: 0.85, borderLeftColor: meta.color, background: 'rgba(254, 243, 199, 0.35)' }}>
      <div className="studio-sidebar-node-dot" style={{ background: meta.color }} />
      <span style={{ color: 'var(--color-muted)' }}>Start (auto)</span>
    </div>
  )
}

/* ───────────────────────── Descriptions ───────────────────────── */

function getShortDescription(type: NodeType): string {
  switch (type) {
    case 'NEXUS':    return 'Saved connector or inline API'
    case 'SUB_FLOW': return 'Call another flow'
    case 'SCRIPT':   return 'JavaScript or Python'
    case 'VARIABLE': return 'Set static values'
    case 'MAPPER':   return 'Reshape data'
    case 'DECISION': return 'Branch on condition'
    case 'LOOP':     return 'Draw CONTINUE + EXIT edges'
    case 'FORK':     return 'Split into parallel branches'
    case 'JOIN':     return 'Merge parallel branches'
    case 'AI':       return 'LLM task — configure in AI Providers first'
    case 'SUCCESS':  return 'End — success'
    case 'FAILURE':  return 'End — failure'
    default:         return ''
  }
}