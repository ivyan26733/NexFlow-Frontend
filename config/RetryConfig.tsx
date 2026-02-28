'use client'

import { Field } from '../NodeConfigPanel'

interface Props {
  config:   Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}

interface RetryConfigShape {
  maxRetries?: number
  backoffMs?: number
  backoffMultiplier?: number
}

export default function RetryConfig({ config, onChange }: Props) {
  const retry = (config.retry as RetryConfigShape | undefined) ?? {}
  const enabled = (retry.maxRetries ?? 0) > 0

  const maxRetries = clampNumber(retry.maxRetries ?? 3, 1, 10)
  const backoffMs = clampNumber(retry.backoffMs ?? 1000, 100, 30000)
  const backoffMultiplier = normalizeMultiplier(retry.backoffMultiplier ?? 2.0)

  function setEnabled(next: boolean) {
    if (!next) {
      onChange({ ...config, retry: { maxRetries: 0 } })
      return
    }
    onChange({
      ...config,
      retry: {
        maxRetries,
        backoffMs,
        backoffMultiplier,
      },
    })
  }

  function update(partial: Partial<RetryConfigShape>) {
    const next = {
      maxRetries,
      backoffMs,
      backoffMultiplier,
      ...partial,
    }
    onChange({
      ...config,
      retry: next,
    })
  }

  const simulatedDelays = describeDelays(maxRetries, backoffMs, backoffMultiplier)

  return (
    <div className="retry-config config-panel-card" style={{ marginTop: '0.75rem' }}>
      <div className="retry-config__header">
        <p className="retry-config__title">RETRY</p>
        <label className="retry-config__enable">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="retry-config__checkbox"
          />
          Enable
        </label>
      </div>

      {enabled && (
        <div className="retry-config__grid">
          <div className="retry-config__field">
            <label className="retry-config__label">MAX RETRIES</label>
            <input
              type="number"
              min={1}
              max={10}
              className="retry-config__input input-base"
              value={maxRetries}
              onChange={e => update({ maxRetries: clampNumber(Number(e.target.value || 0), 1, 10) })}
            />
          </div>

          <div className="retry-config__field">
            <label className="retry-config__label">INITIAL DELAY (MS)</label>
            <input
              type="number"
              min={100}
              max={30000}
              className="retry-config__input input-base"
              value={backoffMs}
              onChange={e => update({ backoffMs: clampNumber(Number(e.target.value || 0), 100, 30000) })}
            />
          </div>

          <div className="retry-config__field retry-config__field--full">
            <label className="retry-config__label">BACKOFF MULTIPLIER</label>
            <select
              className="retry-config__input input-base"
              value={backoffMultiplier}
              onChange={e => update({ backoffMultiplier: normalizeMultiplier(Number(e.target.value)) })}
            >
              <option value={1.0}>1x (no growth)</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2x</option>
              <option value={3.0}>3x</option>
            </select>
          </div>

          <div className="retry-config__summary">
            <p className="retry-config__summary-text">
              Retries: <span className="retry-config__value">{maxRetries}</span>, Delay:{' '}
              <span className="retry-config__value">{backoffMs}ms</span>, Multiplier:{' '}
              <span className="retry-config__value">{backoffMultiplier}x</span>
              {simulatedDelays && (
                <>
                  {' '}→ waits{' '}
                  <span className="retry-config__value">{simulatedDelays}</span>
                  {' '}between attempts.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

function normalizeMultiplier(v: number): number {
  if (v === 1 || v === 1.0) return 1.0
  if (v <= 1.25) return 1.0
  if (v <= 1.75) return 1.5
  if (v <= 2.5) return 2.0
  return 3.0
}

function describeDelays(maxRetries: number, backoffMs: number, multiplier: number): string | null {
  if (maxRetries <= 0) return null
  const delays: number[] = []
  let delay = backoffMs
  for (let i = 0; i < maxRetries; i++) {
    delays.push(Math.round(delay))
    delay *= multiplier
  }
  return delays.map(d => `${d}ms`).join(', ')
}

