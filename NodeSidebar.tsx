'use client'

import { DRAGGABLE_NODES, NODE_META } from '@/lib/nodeConfig'
import type { NodeType } from '@/types'

export default function NodeSidebar() {
  function onDragStart(event: React.DragEvent, nodeType: NodeType) {
    event.dataTransfer.setData('nodeType', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="studio-sidebar">
      <div className="studio-sidebar-header">
        <p className="title">Nodes</p>
        <p className="subtitle">Drag onto canvas</p>
      </div>

      <div className="studio-sidebar-body">
        <div className="studio-sidebar-section">
          <p className="studio-sidebar-section-label">Entry</p>
          <StartNodeHint />
        </div>
        <div className="studio-sidebar-section">
          <p className="studio-sidebar-section-label">Actions</p>
          <div className="studio-sidebar-nodes">
            {DRAGGABLE_NODES.map(type => (
              <SidebarNode key={type} nodeType={type} onDragStart={onDragStart} />
            ))}
          </div>
        </div>
      </div>

      <div className="studio-sidebar-footer">
        Connect nodes by dragging from the <span style={{ color: 'var(--color-text)' }}>bottom handle</span> to a top handle.
        Pulse nodes have <span style={{ color: 'var(--color-success)' }}>success</span> and <span style={{ color: 'var(--color-failure)' }}>failure</span> outputs.
      </div>
    </aside>
  )
}

function SidebarNode({
  nodeType,
  onDragStart,
}: {
  nodeType:    NodeType
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
      <span>{meta.label}</span>
    </div>
  )
}

function StartNodeHint() {
  const meta = NODE_META['START']
  return (
    <div
      className="studio-sidebar-node"
      style={{ borderStyle: 'dashed', opacity: 0.7, borderLeftColor: meta.color, background: 'rgba(26, 34, 53, 0.5)' }}
    >
      <div className="studio-sidebar-node-dot" style={{ background: meta.color }} />
      <span style={{ color: 'var(--color-muted)' }}>Start (auto)</span>
    </div>
  )
}
