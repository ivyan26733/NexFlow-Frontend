'use client'

import { useEffect, useState } from 'react'
import { Panel } from '@xyflow/react'
import { Info, ChevronDown } from 'lucide-react'
import { CATEGORY_META, EDGE_STYLE, type NodeCategory, type EdgeKind } from '@/lib/nodeConfig'

const STORAGE_KEY = 'nexflow.legend.open'
const CATEGORIES = Object.keys(CATEGORY_META) as NodeCategory[]
const EDGE_KINDS: EdgeKind[] = ['default', 'success', 'failure', 'continue', 'branch']

/** "Why is this colour?" — answered on the canvas itself. */
export function CanvasLegend() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem(STORAGE_KEY) } catch { /* storage unavailable */ }
    setOpen(saved === '1')
  }, [])

  function toggle() {
    setOpen(prev => {
      try { localStorage.setItem(STORAGE_KEY, prev ? '0' : '1') } catch { /* storage unavailable */ }
      return !prev
    })
  }

  return (
    <Panel position="bottom-left" className="nf-legend-panel">
      <div className={`nf-legend${open ? ' is-open' : ''}`}>
        <button type="button" className="nf-legend__toggle" onClick={toggle} aria-expanded={open}>
          <Info size={14} aria-hidden />
          <span>Legend</span>
          <ChevronDown size={14} className="nf-legend__chev" aria-hidden />
        </button>

        {open && (
          <div className="nf-legend__body">
            <section>
              <h4>Node colour = kind of work</h4>
              <ul>
                {CATEGORIES.map(c => (
                  <li key={c}>
                    <span className="nf-legend__swatch" style={{ background: CATEGORY_META[c].color }} />
                    <b>{CATEGORY_META[c].label}</b>
                    <span>{CATEGORY_META[c].meaning}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4>Line = which path</h4>
              <ul>
                {EDGE_KINDS.map(k => (
                  <li key={k}>
                    <svg width="34" height="10" aria-hidden>
                      <line x1="1" y1="5" x2="27" y2="5" stroke={EDGE_STYLE[k].color} strokeWidth="2.5"
                        strokeDasharray={EDGE_STYLE[k].dash} strokeLinecap="round" />
                      <path d="M26 1 L33 5 L26 9 Z" fill={EDGE_STYLE[k].color} />
                    </svg>
                    <span>{EDGE_STYLE[k].meaning}</span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="nf-legend__hint">○ hollow handle = input · ● filled = output</p>
          </div>
        )}
      </div>
    </Panel>
  )
}
