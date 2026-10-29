'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, ExternalLink, X } from 'lucide-react'
import { api } from '@/api'

type Phase = 'starting' | 'running' | 'success' | 'failure' | 'error' | 'slow'

interface Props {
  /** Execution to watch; null while the run request is still being sent. */
  executionId: string | null
  /** Set when the run could not even be started. */
  startError?: string | null
  onDismiss: () => void
}

/** Give up polling after this long and just point to the transaction. */
const MAX_WATCH_MS = 15 * 60 * 1000

/**
 * Bottom-right card that follows a Studio run: "Running…" while the flow works,
 * then "Completed" or "Failed" with the reason and a link to the full transaction.
 * Polls the execution (fast at first, slower for long runs) — there is no live socket.
 */
export function RunStatusToast({ executionId, startError, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>(startError ? 'error' : 'starting')
  const [message, setMessage] = useState<string | null>(startError ?? null)
  const [durationMs, setDurationMs] = useState<number | null>(null)

  useEffect(() => {
    if (startError) { setPhase('error'); setMessage(startError); return }
    if (!executionId) { setPhase('starting'); return }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const startedAt = Date.now()
    setPhase('running')
    setMessage(null)

    async function poll() {
      try {
        const detail = await api.executions.getById(executionId as string)
        if (cancelled) return
        if (detail.status !== 'RUNNING') {
          setPhase(detail.status === 'SUCCESS' ? 'success' : 'failure')
          setMessage(detail.errorMessage ?? null)
          setDurationMs(detail.durationMs >= 0 ? detail.durationMs : null)
          return
        }
      } catch {
        /* transient network error — keep polling */
      }
      if (cancelled) return
      const elapsed = Date.now() - startedAt
      if (elapsed > MAX_WATCH_MS) { setPhase('slow'); return }
      timer = setTimeout(poll, elapsed < 10_000 ? 1000 : elapsed < 60_000 ? 2500 : 5000)
    }
    poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [executionId, startError])

  const done = phase === 'success' || phase === 'failure' || phase === 'error' || phase === 'slow'
  const title = {
    starting: 'Starting run…',
    running:  'Flow is running…',
    success:  'Flow completed',
    failure:  'Flow failed',
    error:    'Could not start the flow',
    slow:     'Still running',
  }[phase]

  return (
    <div className="run-toast" data-phase={phase} role="status" aria-live="polite">
      <span className="run-toast__icon" aria-hidden>
        {phase === 'success' ? <CheckCircle2 size={20} />
          : phase === 'failure' || phase === 'error' ? <XCircle size={20} />
          : <Loader2 size={20} className="run-toast__spin" />}
      </span>
      <div className="run-toast__body">
        <p className="run-toast__title">
          {title}
          {durationMs != null && <span className="run-toast__meta"> · {formatDuration(durationMs)}</span>}
        </p>
        {message && <p className="run-toast__message">{message}</p>}
        {phase === 'slow' && <p className="run-toast__message">This run is taking a while. Its transaction will show the result.</p>}
        {executionId && (
          <a className="run-toast__link" href={`/transactions/${executionId}`} target="_blank" rel="noopener noreferrer">
            {done ? 'View transaction' : 'Open transaction'} <ExternalLink size={13} aria-hidden />
          </a>
        )}
      </div>
      <button type="button" className="run-toast__close" onClick={onDismiss} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`
}
