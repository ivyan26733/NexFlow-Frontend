'use client'

import { useState } from 'react'
import { PanelLeftClose, Search } from 'lucide-react'
import { NODE_GROUPS, NODE_META, CATEGORY_META } from './nodeConfig'
import { NodeIcon } from '@/components/studio/nodeIcons'
import type { NodeType } from '@/types'

export default function NodeSidebar({ onAddNode, onClose }: { onAddNode?: (t: NodeType) => void; onClose?: () => void }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  function onDragStart(event: React.DragEvent, nodeType: NodeType) {
    event.dataTransfer.setData('nodeType', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const groups = NODE_GROUPS
    .map(g => ({
      ...g,
      types: g.types.filter(t => !q
        || NODE_META[t].label.toLowerCase().includes(q)
        || NODE_META[t].description.toLowerCase().includes(q)
        || g.label.toLowerCase().includes(q)),
    }))
    .filter(g => g.types.length > 0)

  return (
    <aside className="studio-sidebar" aria-label="Node palette">
      <div className="studio-sidebar-header">
        <div className="nf-palette__top">
          <div>
            <p className="title">Add a step</p>
            <p className="subtitle">Drag onto the canvas · tap on mobile</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} title="Collapse panel" className="nf-icon-btn">
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
        <label className="nf-palette__search">
          <Search size={14} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search nodes…"
            aria-label="Search nodes"
          />
        </label>
      </div>

      <div className="studio-sidebar-body">
        {!q && (
          <div className="nf-palette__group">
            <GroupHeader color={CATEGORY_META.TRIGGER.color} label="Trigger" meaning={CATEGORY_META.TRIGGER.meaning} />
            <div className="nf-palette__item is-static" style={{ ['--nc' as string]: NODE_META.START.color, ['--nt' as string]: NODE_META.START.bgColor }}>
              <span className="nf-palette__icon"><NodeIcon type="START" size={15} /></span>
              <span className="nf-palette__text">
                <span className="nf-palette__label">Start</span>
                <span className="nf-palette__desc">Added automatically — every flow begins here</span>
              </span>
            </div>
          </div>
        )}

        {groups.map(group => {
          const cat = CATEGORY_META[group.category]
          return (
            <div key={group.category} className="nf-palette__group">
              <GroupHeader color={cat.color} label={cat.label} meaning={cat.meaning} />
              {group.types.map(type => (
                <SidebarNode key={type} nodeType={type} onDragStart={onDragStart} onAddNode={onAddNode} />
              ))}
            </div>
          )
        })}

        {groups.length === 0 && <p className="nf-palette__none">No nodes match “{query}”.</p>}
      </div>

      <div className="studio-sidebar-footer">
        Steps with two outputs: <b className="nf-txt-success">● success</b> continues, <b className="nf-txt-failure">● error</b> handles failure.
      </div>
    </aside>
  )
}

function GroupHeader({ color, label, meaning }: { color: string; label: string; meaning: string }) {
  return (
    <div className="nf-palette__head">
      <span className="nf-palette__chip" style={{ background: color }} />
      <span className="nf-palette__cat">{label}</span>
      <span className="nf-palette__meaning">{meaning}</span>
    </div>
  )
}

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
    if (!onAddNode || typeof window === 'undefined') return
    const isTouch =
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    if (isTouch) onAddNode(nodeType)
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, nodeType)}
      onClick={handleClick}
      className="nf-palette__item"
      style={{ ['--nc' as string]: meta.color, ['--nt' as string]: meta.bgColor }}
      title={meta.description}
    >
      <span className="nf-palette__icon"><NodeIcon type={nodeType} size={15} /></span>
      <span className="nf-palette__text">
        <span className="nf-palette__label">{meta.label}</span>
        <span className="nf-palette__desc">{meta.description}</span>
      </span>
    </div>
  )
}
