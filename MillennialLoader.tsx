import { Loader2 } from 'lucide-react'
import React from 'react'

interface MillennialLoaderProps {
  label?: string
  fullScreen?: boolean
}

export function MillennialLoader({ label = 'Loading your workspace…', fullScreen = false }: MillennialLoaderProps) {
  const content = (
    <div className="millennial-loader">
      <div className="millennial-loader-orb">
        <div className="millennial-loader-orb-inner" />
        <Loader2 className="millennial-loader-icon" />
      </div>
      <div className="millennial-loader-text">
        <p className="title">One sec, almost there</p>
        <p className="subtitle">{label}</p>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="millennial-loader-fullscreen">
        {content}
      </div>
    )
  }

  return content
}

