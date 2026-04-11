'use client'

import React from 'react'

interface MillennialLoaderProps {
  label?: string
  fullScreen?: boolean
}

/* Same 4-pointed star used by the floating assistant */
function StarIcon({ size = 28, color = '#9A3412' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 C 11.5 6.5 9.5 9.5 2 12 C 9.5 14.5 11.5 17.5 12 22 C 12.5 17.5 14.5 14.5 22 12 C 14.5 9.5 12.5 6.5 12 2 Z"
        fill={color}
      />
    </svg>
  )
}

export function MillennialLoader({ label = 'Loading…', fullScreen = false }: MillennialLoaderProps) {
  const content = (
    <div className="nexflow-loader">
      {/* Orbit stage */}
      <div className="nexflow-loader-stage">

        {/* Expanding pulse rings */}
        <div className="nexflow-loader-pulse" style={{ animationDelay: '0s' }} />
        <div className="nexflow-loader-pulse" style={{ animationDelay: '1.1s' }} />

        {/* Outer rotating arc */}
        <div className="nexflow-loader-arc-outer">
          <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden>
            <defs>
              <linearGradient id="nf-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9A3412" stopOpacity="1" />
                <stop offset="100%" stopColor="#9A3412" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="48" cy="48" r="42"
              fill="none"
              stroke="url(#nf-arc-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="72 192"
            />
          </svg>
        </div>

        {/* Inner counter-rotating arc */}
        <div className="nexflow-loader-arc-inner">
          <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
            <circle
              cx="32" cy="32" r="27"
              fill="none"
              stroke="rgba(0,212,255,0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="36 134"
            />
          </svg>
        </div>

        {/* Glow halo behind the star */}
        <div className="nexflow-loader-glow" />

        {/* Center star — breathing */}
        <div className="nexflow-loader-star">
          <StarIcon size={30} color="#9A3412" />
        </div>

      </div>

      {/* Label */}
      {label && (
        <p className="nexflow-loader-label">
          <span className="nexflow-loader-label-text">{label}</span>
          <span className="nexflow-loader-dots" aria-hidden>
            <span>.</span><span>.</span><span>.</span>
          </span>
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return <div className="nexflow-loader-fullscreen">{content}</div>
  }

  return content
}
