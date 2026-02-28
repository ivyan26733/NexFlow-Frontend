'use client'

import { NODE_GROUPS, NODE_META } from './nodeConfig'
import type { NodeType } from '@/types'

export default function NodeSidebar() {
  function onDragStart(event: React.DragEvent, nodeType: NodeType) {
    event.dataTransfer.setData('nodeType', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="studio-sidebar">

      <div className="studio-sidebar-header">
        <p className="title">NODES</p>
        <p className="subtitle">Drag onto canvas</p>
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
                <SidebarNode key={type} nodeType={type} onDragStart={onDragStart} />
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
}: {
  nodeType: NodeType
  onDragStart: (e: React.DragEvent, t: NodeType) => void
}) {
  const meta = NODE_META[nodeType]

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, nodeType)}
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
    <div className="studio-sidebar-node" style={{ borderStyle: 'dashed', opacity: 0.7, borderLeftColor: meta.color, background: 'rgba(26, 34, 53, 0.5)' }}>
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
    case 'SUCCESS':  return 'End — success'
    case 'FAILURE':  return 'End — failure'
    default:         return ''
  }
}