'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, Plus, Trash2, Play, Pause, Pencil, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { api } from '@/api'
import type { Flow, FlowSchedule } from '@/types'
import { MillennialLoader } from '@/MillennialLoader'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
]

/** Describe a 6-field Spring cron in plain English. */
function describeCron(expr: string): string {
  if (!expr) return ''
  const parts = expr.trim().split(/\s+/)
  if (parts.length < 6) return expr
  const [, min, hour, dom, , dow] = parts

  if (min.startsWith('*/')) return `Every ${min.slice(2)} minute${Number(min.slice(2)) === 1 ? '' : 's'}`
  if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hour${Number(hour.slice(2)) === 1 ? '' : 's'}`

  const pad = (n: string) => n.padStart(2, '0')
  const timeStr = `${pad(hour)}:${pad(min)}`

  const DAY_NAMES: Record<string, string> = {
    '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed',
    '4': 'Thu', '5': 'Fri', '6': 'Sat',
    SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed',
    THU: 'Thu', FRI: 'Fri', SAT: 'Sat',
  }

  if (dow !== '*' && dow !== '?') {
    const dayName = DAY_NAMES[dow.toUpperCase()] ?? dow
    return `Every ${dayName} at ${timeStr}`
  }
  if (dom !== '*' && dom !== '?') return `Monthly on day ${dom} at ${timeStr}`
  if (hour !== '*' && min !== '*') return `Daily at ${timeStr}`
  if (hour === '*' && min === '0') return 'Every hour'
  return expr
}

/**
 * Live countdown / elapsed timer.
 * `now` is passed in from the parent's 1-second interval so all cards tick together.
 */
function relativeTime(iso: string | null, future: boolean, now: number): string {
  if (!iso) return future ? 'Not set' : '—'
  const target = new Date(iso).getTime()
  const diff   = target - now          // positive = in the future

  if (future) {
    if (diff <= 0) return 'Overdue'
    const s = Math.floor(diff / 1000)
    if (s < 60)  return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60)  return `${m}m ${s % 60}s`
    const h = Math.floor(m / 60)
    if (h < 24)  return `${h}h ${m % 60}m`
    return `${Math.floor(h / 24)}d ${h % 24}h`
  } else {
    if (diff > 0) return 'Pending'
    const s = Math.floor(-diff / 1000)
    if (s < 60)  return `${s}s ago`
    const m = Math.floor(s / 60)
    if (m < 60)  return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24)  return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }
}

function absoluteTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

// ─── Preset builder ──────────────────────────────────────────────────────────

type ScheduleType = 'minutes' | 'hourly' | 'daily' | 'weekly' | 'custom'

interface PresetState {
  type:         ScheduleType
  everyMinutes: number
  dailyHour:    number
  dailyMinute:  number
  weeklyDay:    number
  weeklyHour:   number
  weeklyMinute: number
  customExpr:   string
}

function buildCron(p: PresetState): string {
  switch (p.type) {
    case 'minutes': return `0 */${p.everyMinutes} * * * *`
    case 'hourly':  return `0 0 * * * *`
    case 'daily':   return `0 ${p.dailyMinute} ${p.dailyHour} * * *`
    case 'weekly':  return `0 ${p.weeklyMinute} ${p.weeklyHour} * * ${p.weeklyDay}`
    case 'custom':  return p.customExpr.trim()
  }
}

const DEFAULT_PRESET: PresetState = {
  type: 'daily', everyMinutes: 30,
  dailyHour: 9, dailyMinute: 0,
  weeklyDay: 1, weeklyHour: 9, weeklyMinute: 0,
  customExpr: '0 0 9 * * *',
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  flows:   Flow[]
  initial: FlowSchedule | null
  onSave:  (s: FlowSchedule) => void
  onClose: () => void
}

function ScheduleModal({ flows, initial, onSave, onClose }: ModalProps) {
  const [flowId,   setFlowId]   = useState(initial?.flowId ?? (flows[0]?.id ?? ''))
  const [label,    setLabel]    = useState(initial?.label  ?? '')
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'UTC')
  const [enabled,  setEnabled]  = useState(initial?.enabled  ?? true)
  const [preset,   setPreset]   = useState<PresetState>(DEFAULT_PRESET)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Payload rows: array of {key, value} pairs
  type PayloadRow = { key: string; value: string }
  const initRows = (): PayloadRow[] => {
    const p = initial?.payload
    if (!p || Object.keys(p).length === 0) return []
    return Object.entries(p).map(([key, value]) => ({ key, value: String(value) }))
  }
  const [payloadRows, setPayloadRows] = useState<PayloadRow[]>(initRows)

  useEffect(() => {
    if (!initial) return
    const parts = initial.cronExpression.trim().split(/\s+/)
    if (parts.length === 6) {
      const [, min, hour, dom, , dow] = parts
      if (min.startsWith('*/'))
        setPreset({ ...DEFAULT_PRESET, type: 'minutes', everyMinutes: Number(min.slice(2)) })
      else if (hour === '*')
        setPreset({ ...DEFAULT_PRESET, type: 'hourly' })
      else if (dow !== '*' && dow !== '?')
        setPreset({ ...DEFAULT_PRESET, type: 'weekly', weeklyDay: Number(dow) || 1, weeklyHour: Number(hour), weeklyMinute: Number(min) })
      else if (dom !== '*' && dom !== '?')
        setPreset({ ...DEFAULT_PRESET, type: 'custom', customExpr: initial.cronExpression })
      else
        setPreset({ ...DEFAULT_PRESET, type: 'daily', dailyHour: Number(hour), dailyMinute: Number(min) })
    } else {
      setPreset({ ...DEFAULT_PRESET, type: 'custom', customExpr: initial.cronExpression })
    }
  }, [initial])

  const cronExpression = buildCron(preset)
  const preview        = describeCron(cronExpression)
  const selectedFlow   = flows.find(f => f.id === flowId)

  async function handleSave() {
    if (!flowId)         { setError('No ACTIVE flows available — set a flow to Active first'); return }
    if (!cronExpression) { setError('Configure a schedule'); return }
    if (preset.type === 'custom' && !preset.customExpr.trim()) { setError('Enter a cron expression'); return }
    setError('')
    setSaving(true)
    try {
      const payload = payloadRows.reduce<Record<string, string>>((acc, row) => {
        const k = row.key.trim()
        if (k) acc[k] = row.value
        return acc
      }, {})
      const body = {
        flowId,
        label: label || selectedFlow?.name || '',
        cronExpression,
        timezone,
        enabled,
        payload: Object.keys(payload).length > 0 ? payload : null,
      }
      const result = initial
        ? await api.schedules.update(initial.id, body)
        : await api.schedules.create(body)
      onSave(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.55)',
               display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width:'100%', maxWidth:'32rem', background:'var(--color-surface)',
                    border:'1px solid var(--color-border)', borderRadius:'1rem', padding:'1.75rem',
                    maxHeight:'90vh', overflowY:'auto' }}>
        <h2 style={{ fontSize:'1.125rem', fontWeight:700, marginBottom:'1.5rem' }}>
          {initial ? 'Edit schedule' : 'New schedule'}
        </h2>

        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem',
                        background:'rgba(239,68,68,0.1)', border:'1px solid var(--color-failure)',
                        borderRadius:'0.5rem', padding:'0.625rem 0.875rem',
                        fontSize:'0.825rem', color:'var(--color-failure)', marginBottom:'1rem' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Flow */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="dashboard-label" style={{ display:'block', marginBottom:'0.375rem' }}>Flow</label>
          {flows.length === 0 ? (
            <p style={{ fontSize:'0.8125rem', color:'#f59e0b', display:'flex', alignItems:'center', gap:'0.3rem' }}>
              <AlertCircle size={13} /> No ACTIVE flows found. Go to Flows and set a flow to Active first.
            </p>
          ) : (
            <select className="input-base" value={flowId}
              onChange={e => setFlowId(e.target.value)} style={{ width:'100%' }}>
              {flows.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          {selectedFlow && selectedFlow.status !== 'ACTIVE' && (
            <p style={{ fontSize:'0.75rem', color:'#f59e0b', marginTop:'0.25rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
              <AlertCircle size={11} /> Flow is {selectedFlow.status} — it must be set to ACTIVE for the schedule to run
            </p>
          )}
        </div>

        {/* Label */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="dashboard-label" style={{ display:'block', marginBottom:'0.375rem' }}>
            Label <span style={{ color:'var(--color-muted)', fontWeight:400 }}>(optional)</span>
          </label>
          <input className="input-base" value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={selectedFlow?.name ?? 'My schedule'}
            style={{ width:'100%' }} />
        </div>

        {/* Frequency type */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="dashboard-label" style={{ display:'block', marginBottom:'0.5rem' }}>Frequency</label>
          <div style={{ display:'flex', gap:'0.375rem', flexWrap:'wrap' }}>
            {(['minutes','hourly','daily','weekly','custom'] as ScheduleType[]).map(t => (
              <button key={t} type="button"
                onClick={() => setPreset(p => ({ ...p, type: t }))}
                style={{ padding:'0.375rem 0.75rem', borderRadius:'0.4rem',
                         fontSize:'0.8125rem', fontWeight:500, cursor:'pointer',
                         background: preset.type === t ? 'var(--color-accent)' : 'var(--color-panel)',
                         color:      preset.type === t ? 'var(--color-on-accent)' : 'var(--color-text)',
                         border:     preset.type === t ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                         transition:'all 0.15s' }}>
                {t === 'minutes' ? 'Minutes' : t === 'hourly' ? 'Hourly' : t === 'daily' ? 'Daily' : t === 'weekly' ? 'Weekly' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Minutes */}
        {preset.type === 'minutes' && (
          <div style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <span style={{ fontSize:'0.875rem' }}>Every</span>
            <select className="input-base" value={preset.everyMinutes}
              onChange={e => setPreset(p => ({ ...p, everyMinutes: Number(e.target.value) }))}>
              {[1,2,5,10,15,20,30,45].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ fontSize:'0.875rem' }}>minute{preset.everyMinutes === 1 ? '' : 's'}</span>
          </div>
        )}

        {/* Daily */}
        {preset.type === 'daily' && (
          <div style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <span style={{ fontSize:'0.875rem' }}>At</span>
            <input type="number" min={0} max={23} className="input-base"
              value={preset.dailyHour}
              onChange={e => setPreset(p => ({ ...p, dailyHour: Math.min(23, Math.max(0, Number(e.target.value))) }))}
              style={{ width:'4.5rem' }} />
            <span style={{ fontSize:'0.875rem' }}>:</span>
            <input type="number" min={0} max={59} className="input-base"
              value={preset.dailyMinute}
              onChange={e => setPreset(p => ({ ...p, dailyMinute: Math.min(59, Math.max(0, Number(e.target.value))) }))}
              style={{ width:'4.5rem' }} />
            <span style={{ fontSize:'0.75rem', color:'var(--color-muted)' }}>HH : MM</span>
          </div>
        )}

        {/* Weekly */}
        {preset.type === 'weekly' && (
          <div style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.875rem' }}>Every</span>
            <select className="input-base" value={preset.weeklyDay}
              onChange={e => setPreset(p => ({ ...p, weeklyDay: Number(e.target.value) }))}>
              {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <span style={{ fontSize:'0.875rem' }}>at</span>
            <input type="number" min={0} max={23} className="input-base"
              value={preset.weeklyHour}
              onChange={e => setPreset(p => ({ ...p, weeklyHour: Math.min(23, Math.max(0, Number(e.target.value))) }))}
              style={{ width:'4.5rem' }} />
            <span style={{ fontSize:'0.875rem' }}>:</span>
            <input type="number" min={0} max={59} className="input-base"
              value={preset.weeklyMinute}
              onChange={e => setPreset(p => ({ ...p, weeklyMinute: Math.min(59, Math.max(0, Number(e.target.value))) }))}
              style={{ width:'4.5rem' }} />
          </div>
        )}

        {/* Custom */}
        {preset.type === 'custom' && (
          <div style={{ marginBottom:'1rem' }}>
            <input className="input-base" value={preset.customExpr}
              onChange={e => setPreset(p => ({ ...p, customExpr: e.target.value }))}
              placeholder="0 0 9 * * * (sec min hour dom month dow)"
              style={{ width:'100%', fontFamily:'var(--font-mono)', fontSize:'0.875rem' }} />
            <p style={{ fontSize:'0.75rem', color:'var(--color-muted)', marginTop:'0.25rem' }}>
              6-field Spring cron: <code>second minute hour day-of-month month day-of-week</code>
            </p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div style={{ background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.15)',
                        borderRadius:'0.5rem', padding:'0.625rem 0.875rem', fontSize:'0.8125rem',
                        marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Calendar size={13} style={{ color:'var(--color-accent)', flexShrink:0 }} />
            <span style={{ color:'var(--color-muted)' }}>{preview}</span>
            <code style={{ fontFamily:'var(--font-mono)', color:'var(--color-accent)',
                           marginLeft:'auto', fontSize:'0.75rem', flexShrink:0 }}>
              {cronExpression}
            </code>
          </div>
        )}

        {/* Timezone */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="dashboard-label" style={{ display:'block', marginBottom:'0.375rem' }}>Timezone</label>
          <select className="input-base" value={timezone}
            onChange={e => setTimezone(e.target.value)} style={{ width:'100%' }}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        {/* Payload */}
        <div style={{ marginBottom:'1.25rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
            <label className="dashboard-label">
              Payload <span style={{ color:'var(--color-muted)', fontWeight:400 }}>(static — passed to flow on every run)</span>
            </label>
            <button type="button"
              onClick={() => setPayloadRows(r => [...r, { key: '', value: '' }])}
              style={{ fontSize:'0.75rem', color:'var(--color-accent)', background:'none', border:'none',
                       cursor:'pointer', padding:'0 0.25rem' }}>
              + Add key
            </button>
          </div>
          {payloadRows.length === 0 && (
            <p style={{ fontSize:'0.75rem', color:'var(--color-muted)' }}>
              No payload — flow will receive an empty input object.
            </p>
          )}
          {payloadRows.map((row, i) => (
            <div key={i} style={{ display:'flex', gap:'0.5rem', marginBottom:'0.4rem', alignItems:'center' }}>
              <input className="input-base" placeholder="key"
                value={row.key}
                onChange={e => setPayloadRows(r => r.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:'0.8125rem' }} />
              <span style={{ color:'var(--color-muted)', fontSize:'0.875rem' }}>=</span>
              <input className="input-base" placeholder="value"
                value={row.value}
                onChange={e => setPayloadRows(r => r.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                style={{ flex:2, fontSize:'0.8125rem' }} />
              <button type="button"
                onClick={() => setPayloadRows(r => r.filter((_, j) => j !== i))}
                style={{ background:'none', border:'none', cursor:'pointer',
                         color:'var(--color-muted)', padding:'0.25rem', lineHeight:1 }}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Enabled */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', marginBottom:'1.5rem' }}>
          <input type="checkbox" id="sched-enabled" checked={enabled}
            onChange={e => setEnabled(e.target.checked)} />
          <label htmlFor="sched-enabled" style={{ fontSize:'0.875rem', cursor:'pointer' }}>
            Enable immediately after saving
          </label>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:'0.625rem', justifyContent:'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding:'0.5rem 1rem', borderRadius:'0.5rem', fontSize:'0.875rem',
                     background:'var(--color-panel)', border:'1px solid var(--color-border)',
                     cursor:'pointer', color:'var(--color-text)' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="btn-primary" style={{ padding:'0.5rem 1.25rem', fontSize:'0.875rem' }}>
            {saving
              ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} />
              : initial ? 'Save changes' : 'Create schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Schedule card ───────────────────────────────────────────────────────────

interface CardProps {
  schedule:  FlowSchedule
  now:       number        // from parent's 1-second ticker — drives live countdown
  onToggle:  () => void
  onEdit:    () => void
  onDelete:  () => void
  toggling:  boolean
}

function ScheduleCard({ schedule, now, onToggle, onEdit, onDelete, toggling }: CardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const flowNotActive = schedule.flowStatus !== 'ACTIVE'

  const nextLabel = schedule.enabled && schedule.nextRunAt
    ? relativeTime(schedule.nextRunAt, true, now)
    : '—'

  const lastLabel = schedule.lastRunAt
    ? relativeTime(schedule.lastRunAt, false, now)
    : 'Never'

  // Highlight "Overdue" in amber so users notice the cron is late
  const nextColor = nextLabel === 'Overdue' ? '#f59e0b' : 'var(--color-text)'

  return (
    <div style={{ background:'var(--color-surface)',
                  border:`1px solid ${schedule.enabled ? 'var(--color-border)' : 'rgba(128,128,128,0.2)'}`,
                  borderRadius:'0.875rem', padding:'1.25rem',
                  opacity: schedule.enabled ? 1 : 0.7, transition:'opacity 0.2s' }}>

      {/* Title row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                    gap:'0.75rem', marginBottom:'0.625rem' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.2rem' }}>
            <Clock size={14} style={{ color:'var(--color-accent)', flexShrink:0 }} />
            <span style={{ fontWeight:600, fontSize:'0.9375rem',
                           overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {schedule.label}
            </span>
            <span style={{ fontSize:'0.7rem', fontWeight:600, padding:'0.125rem 0.5rem',
                           borderRadius:'2rem', flexShrink:0,
                           background: schedule.enabled ? 'rgba(34,197,94,0.12)' : 'rgba(128,128,128,0.12)',
                           color:      schedule.enabled ? '#22c55e' : 'var(--color-muted)' }}>
              {schedule.enabled ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <a href={`/studio/${schedule.flowId}`}
            style={{ fontSize:'0.8125rem', color:'var(--color-accent)', textDecoration:'none' }}>
            {schedule.flowName}
          </a>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:'0.375rem', flexShrink:0 }}>
          <button type="button" onClick={onToggle} disabled={toggling} title={schedule.enabled ? 'Pause' : 'Resume'}
            style={{ padding:'0.375rem', borderRadius:'0.4rem', cursor:'pointer',
                     background:'var(--color-panel)', border:'1px solid var(--color-border)',
                     color:'var(--color-muted)', display:'flex', alignItems:'center' }}>
            {toggling
              ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} />
              : schedule.enabled ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" onClick={onEdit} title="Edit"
            style={{ padding:'0.375rem', borderRadius:'0.4rem', cursor:'pointer',
                     background:'var(--color-panel)', border:'1px solid var(--color-border)',
                     color:'var(--color-muted)', display:'flex', alignItems:'center' }}>
            <Pencil size={13} />
          </button>
          {confirmDelete ? (
            <>
              <button type="button" onClick={onDelete}
                style={{ padding:'0.375rem 0.625rem', borderRadius:'0.4rem', cursor:'pointer',
                         background:'var(--color-failure)', border:'1px solid var(--color-failure)',
                         color:'#fff', fontSize:'0.75rem', fontWeight:600 }}>
                Confirm
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                style={{ padding:'0.375rem 0.625rem', borderRadius:'0.4rem', cursor:'pointer',
                         background:'var(--color-panel)', border:'1px solid var(--color-border)',
                         color:'var(--color-text)', fontSize:'0.75rem' }}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} title="Delete"
              style={{ padding:'0.375rem', borderRadius:'0.4rem', cursor:'pointer',
                       background:'var(--color-panel)', border:'1px solid var(--color-border)',
                       color:'var(--color-failure)', display:'flex', alignItems:'center' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Flow not ACTIVE warning */}
      {flowNotActive && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem',
                      background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)',
                      borderRadius:'0.4rem', padding:'0.375rem 0.625rem',
                      fontSize:'0.75rem', color:'#f59e0b', marginBottom:'0.625rem' }}>
          <AlertCircle size={12} />
          Flow is <strong>{schedule.flowStatus}</strong> — set it to ACTIVE or this schedule will be skipped
        </div>
      )}

      {/* Cron description */}
      <div style={{ background:'var(--color-panel)', borderRadius:'0.5rem',
                    padding:'0.5rem 0.75rem', marginBottom:'0.75rem',
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem' }}>
        <span style={{ fontSize:'0.8125rem' }}>{describeCron(schedule.cronExpression)}</span>
        <code style={{ fontSize:'0.7rem', fontFamily:'var(--font-mono)',
                       color:'var(--color-muted)', flexShrink:0 }}>
          {schedule.cronExpression}
        </code>
      </div>

      {/* Timing row */}
      <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
        <div>
          <p className="dashboard-label" style={{ marginBottom:'0.125rem', fontSize:'0.7rem' }}>NEXT RUN</p>
          <p style={{ fontSize:'0.8125rem', fontWeight:600, color: nextColor, fontVariantNumeric:'tabular-nums' }}
             title={absoluteTime(schedule.nextRunAt)}>
            {nextLabel}
          </p>
        </div>
        <div>
          <p className="dashboard-label" style={{ marginBottom:'0.125rem', fontSize:'0.7rem' }}>LAST RUN</p>
          <p style={{ fontSize:'0.8125rem', fontVariantNumeric:'tabular-nums' }}
             title={absoluteTime(schedule.lastRunAt)}>
            {lastLabel}
          </p>
        </div>
        <div>
          <p className="dashboard-label" style={{ marginBottom:'0.125rem', fontSize:'0.7rem' }}>TIMEZONE</p>
          <p style={{ fontSize:'0.8125rem' }}>{schedule.timezone}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const [schedules,  setSchedules]  = useState<FlowSchedule[]>([])
  const [flows,      setFlows]      = useState<Flow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editing,    setEditing]    = useState<FlowSchedule | null>(null)
  const [toggling,   setToggling]   = useState<Record<string, boolean>>({})
  const [now,        setNow]        = useState(() => Date.now())
  const modalOpenRef = useRef(modalOpen)
  modalOpenRef.current = modalOpen

  // ── 1-second ticker: drives live countdown in all cards ──────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── 5-second poll: refresh nextRunAt / lastRunAt after cron fires ─────────
  useEffect(() => {
    const id = setInterval(() => {
      if (modalOpenRef.current) return   // skip poll while modal is open
      api.schedules.list()
        .then(fresh => setSchedules(fresh))
        .catch(() => {/* silently ignore poll errors */})
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([api.schedules.list(), api.flows.list()])
      .then(([s, f]) => { setSchedules(s); setFlows(f) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(schedule: FlowSchedule) {
    setSchedules(prev => {
      const idx = prev.findIndex(s => s.id === schedule.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = schedule; return next }
      return [schedule, ...prev]
    })
    setModalOpen(false)
    setEditing(null)
  }

  async function handleToggle(id: string) {
    setToggling(t => ({ ...t, [id]: true }))
    try {
      const updated = await api.schedules.toggle(id)
      setSchedules(prev => prev.map(s => s.id === id ? updated : s))
    } catch (e) { console.error('Toggle failed', e) }
    finally { setToggling(t => ({ ...t, [id]: false })) }
  }

  async function handleDelete(id: string) {
    try {
      await api.schedules.delete(id)
      setSchedules(prev => prev.filter(s => s.id !== id))
    } catch (e) { console.error('Delete failed', e) }
  }

  const activeCount = schedules.filter(s => s.enabled).length

  if (loading) return <MillennialLoader message="Loading schedules…" />

  return (
    <div className="page-wrapper" style={{ maxWidth:'88rem', margin:'0 auto', padding:'2.5rem 2rem' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between',
                    marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <p className="dashboard-label" style={{ marginBottom:'0.5rem' }}>AUTOMATION</p>
          <h1 style={{ fontSize:'2rem', fontWeight:700, lineHeight:1.15 }}>Schedules</h1>
          <p style={{ color:'var(--color-muted)', fontSize:'0.9375rem', marginTop:'0.375rem' }}>
            Trigger flows automatically on a cron schedule — no webhook needed.
          </p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }}
          className="btn-primary"
          style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.625rem 1.25rem' }}>
          <Plus size={15} /> New Schedule
        </button>
      </div>

      {/* Stats strip */}
      {schedules.length > 0 && (
        <div style={{ display:'flex', gap:'1.5rem', background:'var(--color-surface)',
                      border:'1px solid var(--color-border)', borderRadius:'0.875rem',
                      padding:'1rem 1.5rem', marginBottom:'2rem', flexWrap:'wrap' }}>
          <div>
            <p className="dashboard-label" style={{ fontSize:'0.7rem', marginBottom:'0.25rem' }}>TOTAL</p>
            <p style={{ fontSize:'1.25rem', fontWeight:700 }}>{schedules.length}</p>
          </div>
          <div>
            <p className="dashboard-label" style={{ fontSize:'0.7rem', marginBottom:'0.25rem' }}>RUNNING</p>
            <p style={{ fontSize:'1.25rem', fontWeight:700, color:'#22c55e' }}>{activeCount}</p>
          </div>
          <div>
            <p className="dashboard-label" style={{ fontSize:'0.7rem', marginBottom:'0.25rem' }}>PAUSED</p>
            <p style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--color-muted)' }}>{schedules.length - activeCount}</p>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
            <span style={{ fontSize:'0.7rem', color:'var(--color-muted)', display:'flex', alignItems:'center', gap:'0.3rem' }}>
              <RefreshCw size={10} /> auto-refreshes every 5s
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {schedules.length === 0 && (
        <div style={{ textAlign:'center', padding:'4rem 2rem',
                      border:'1px dashed var(--color-border)', borderRadius:'1rem' }}>
          <Clock size={40} style={{ color:'var(--color-muted)', margin:'0 auto 1rem' }} />
          <h3 style={{ fontWeight:600, marginBottom:'0.5rem' }}>No schedules yet</h3>
          <p style={{ color:'var(--color-muted)', fontSize:'0.9rem', marginBottom:'1.5rem' }}>
            Set up a cron schedule to trigger any ACTIVE flow automatically.
          </p>
          {flows.length === 0 ? (
            <p style={{ fontSize:'0.875rem', color:'var(--color-muted)' }}>
              You need at least one flow first.{' '}
              <a href="/flow" style={{ color:'var(--color-accent)' }}>Create a flow →</a>
            </p>
          ) : (
            <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary">
              <Plus size={14} /> Create your first schedule
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {schedules.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(22rem, 1fr))', gap:'1rem' }}>
          {schedules.map(s => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              now={now}
              toggling={!!toggling[s.id]}
              onToggle={() => handleToggle(s.id)}
              onEdit={() => { setEditing(s); setModalOpen(true) }}
              onDelete={() => handleDelete(s.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ScheduleModal
          flows={flows.filter(f => f.status === 'ACTIVE')}
          initial={editing}
          onSave={handleSaved}
          onClose={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
