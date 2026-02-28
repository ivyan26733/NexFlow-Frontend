'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'

export interface CardMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface CardMenuProps {
  items: CardMenuItem[]
  className?: string
  onOpenChange?: (open: boolean) => void
}

export default function CardMenu({ items, className = '', onOpenChange }: CardMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    onOpenChange?.(true)
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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
    <div ref={ref} className={`card-menu-wrap ${className}`} style={{ position: 'relative' }}>
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
      {open && (
        <div className="card-menu-dropdown" role="menu">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={e => { e.stopPropagation(); handleItemClick(item) }}
              className={`card-menu-item ${item.danger ? 'card-menu-item-danger' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
