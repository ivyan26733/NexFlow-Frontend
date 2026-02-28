'use client'

import React from 'react'

interface MillennialLoaderProps {
  label?: string
  fullScreen?: boolean
}

export function MillennialLoader({ label = 'Loading…', fullScreen = false }: MillennialLoaderProps) {
  const content = (
    <div className="nexflow-loader">
      <div className="nexflow-loader-n">N</div>
      <div className="nexflow-loader-wave-wrap" aria-hidden>
        <svg className="nexflow-loader-wave" viewBox="0 0 640 32" preserveAspectRatio="none">
          {/* One full wave 0–320; duplicate 320–640 so -50% translate loops */}
          <path
            className="nexflow-loader-wave-path"
            d="M0 16 Q80 4 160 16 Q240 28 320 16 Q400 4 480 16 Q560 28 640 16 M0 16 Q80 28 160 16 Q240 4 320 16 Q400 28 480 16 Q560 4 640 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
        </svg>
      </div>
      {label && (
        <p className="nexflow-loader-label">{label}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="nexflow-loader-fullscreen">
        {content}
      </div>
    )
  }

  return content
}
