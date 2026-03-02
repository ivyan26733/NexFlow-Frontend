'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, Settings } from 'lucide-react'

const SETTINGS_ITEMS = [
  { href: '/settings/ai-providers', label: '✦ AI Providers', title: 'Configure LLM API keys for AI nodes' },
]

export default function NavSettingsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.5rem',
          background: 'none',
          border: 'none',
          color: 'var(--color-muted)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--color-text)'
        }}
        onMouseLeave={e => {
          if (!open) e.currentTarget.style.color = 'var(--color-muted)'
        }}
      >
        <Settings size={14} />
        <span>Settings</span>
        <ChevronDown size={14} style={{ opacity: open ? 1 : 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.25rem',
            minWidth: '11rem',
            padding: '0.375rem 0',
            background: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', letterSpacing: '0.12em', padding: '0.25rem 0.75rem 0.375rem', textTransform: 'uppercase' }}>
            Settings
          </div>
          {SETTINGS_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                color: 'var(--color-muted)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-muted)'
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
