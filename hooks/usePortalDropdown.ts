import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

export interface PortalDropdownStyle {
  position: 'fixed'
  top: number
  left: number
  zIndex: number
  maxWidth: number
}

/**
 * Computes `position: fixed` coordinates so a dropdown always appears
 * within the viewport, regardless of how the trigger is positioned on screen.
 *
 * - Left-aligns to the trigger by default.
 * - Flips to right-align when the dropdown would overflow the right edge.
 * - Clamps so it never goes off either horizontal edge.
 * - Re-computes on resize and scroll so it follows the trigger.
 */
export function usePortalPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  estimatedWidth = 192
): PortalDropdownStyle | null {
  const [style, setStyle] = useState<PortalDropdownStyle | null>(null)

  useEffect(() => {
    if (!open) {
      setStyle(null)
      return
    }

    function compute() {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth

      let left = rect.left
      // Flip right-aligned when not enough space on the right
      if (left + estimatedWidth > vw - 8) {
        left = rect.right - estimatedWidth
      }
      // Hard clamp — never off either edge
      left = Math.max(8, Math.min(left, vw - estimatedWidth - 8))

      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left,
        zIndex: 9999,
        maxWidth: vw - 16,
      })
    }

    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [open, triggerRef, estimatedWidth])

  return style
}
