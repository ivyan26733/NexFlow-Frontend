'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { usePortalPosition } from '@/hooks/usePortalDropdown'

export interface CardMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
  icon?: ReactNode
}
interface CardMenuProps 
{
  items: CardMenuItem[]
  className?: string
  onOpenChange?: (open: boolean) => void
}

export default function CardMenu({ items, className = '', onOpenChange }: CardMenuProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const portalStyle = usePortalPosition(open, triggerRef, 160)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    onOpenChange?.(true)
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false)
        onOpenChange?.(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      onOpenChange?.(false)
    }
  }, [open, onOpenChange])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(prev => !prev)
  }

  function handleItemClick(item: CardMenuItem) {
    item.onClick()
    setOpen(false)
  }

  return (
    <div ref={triggerRef} className={`card-menu-wrap ${className}`} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        className="card-menu-trigger"
        title="Options"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>

      {open && mounted && portalStyle && createPortal(
        <div
          ref={dropdownRef}
          role="menu"
          style={{
            ...portalStyle,
            minWidth: '10rem',
            padding: '0.25rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={e => { e.stopPropagation(); handleItemClick(item) }}
              className={`card-menu-item ${item.danger ? 'card-menu-item-danger' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              {item.icon ? <span style={{ display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span> : null}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
