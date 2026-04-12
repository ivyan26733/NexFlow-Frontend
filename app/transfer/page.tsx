'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Download, Upload, X, CheckCircle2,
  AlertCircle, Loader2, FileJson, ArrowRight, Zap,
} from 'lucide-react'
import { api } from '@/api'
import type { Flow } from '@/types'
import { isLoggedIn } from '@/lib/auth'

const STATUS_META: Record<string, { color: string; bg: string; dot: string }> = {
  DRAFT:    { color: '#A8927A', bg: 'rgba(168,146,122,0.12)', dot: '#6B5A45' },
  ACTIVE:   { color: '#15803d', bg: 'rgba(21,128,61,0.1)',   dot: '#15803d' },
  PAUSED:   { color: '#ffab00', bg: 'rgba(255,171,0,0.1)',   dot: '#ffab00' },
  ARCHIVED: { color: '#b91c1c', bg: 'rgba(185,28,28,0.1)',   dot: '#b91c1c' },
}

type ImportEntry = {
  id: string
  file: File
  label: string
  count: number
  bundles: unknown[]
  status: 'pending' | 'importing' | 'done' | 'error'
  error?: string
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export default function TransferPage() {
  const router = useRouter()
  const [flows, setFlows]       = useState<Flow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [importEntries, setImportEntries] = useState<ImportEntry[]>([])
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return }
    api.flows.list()
      .then(setFlows)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  const filtered = search.trim()
    ? flows.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : flows

  // ── EXPORT ─────────────────────────────────────────────────────────────────

  function toggleFlow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filtered.map(f => f.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  async function handleExport() {
    if (selected.size === 0 || exporting) return
    setExporting(true)
    try {
      const selectedFlows = flows.filter(f => selected.has(f.id))
      const bundles = await Promise.all(selectedFlows.map(f => api.flows.export(f.id)))

      const payload =
        selected.size === 1
          ? bundles[0]
          : {
              version: '1.0',
              type: 'multi',
              exportedAt: new Date().toISOString(),
              count: bundles.length,
              flows: bundles,
            }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download =
        selected.size === 1
          ? `${selectedFlows[0].name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.nexflow.json`
          : `nexflow-export-${new Date().toISOString().slice(0, 10)}.nexflow.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // ── IMPORT ─────────────────────────────────────────────────────────────────

  const parseFiles = useCallback(async (files: File[]) => {
    const parsed: ImportEntry[] = []
    for (const file of files) {
      try {
        const text = await file.text()
        const json = JSON.parse(text)
        let bundles: unknown[]
        let label: string
        if (json.type === 'multi' && Array.isArray(json.flows)) {
          bundles = json.flows
          label   = `${bundles.length} flow${bundles.length !== 1 ? 's' : ''} — ${file.name}`
        } else if (json.flow) {
          bundles = [json]
          label   = (json as { flow: { name?: string } }).flow.name || file.name
        } else {
          throw new Error('Unrecognized format')
        }
        parsed.push({ id: uid(), file, label, count: bundles.length, bundles, status: 'pending' })
      } catch {
        parsed.push({ id: uid(), file, label: file.name, count: 0, bundles: [], status: 'error', error: 'Invalid or unrecognized file format' })
      }
    }
    setImportEntries(prev => [...prev, ...parsed])
  }, [])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      parseFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json'))
    if (files.length) parseFiles(files)
  }

  function removeEntry(id: string) {
    setImportEntries(prev => prev.filter(e => e.id !== id))
  }

  async function handleImportAll() {
    const pending = importEntries.filter(e => e.status === 'pending')
    if (pending.length === 0 || importing) return
    setImporting(true)

    const entries = [...importEntries]
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].status !== 'pending') continue
      entries[i] = { ...entries[i], status: 'importing' }
      setImportEntries([...entries])
      try {
        for (const bundle of entries[i].bundles) {
          await api.flows.import(bundle)
        }
        entries[i] = { ...entries[i], status: 'done' }
      } catch {
        entries[i] = { ...entries[i], status: 'error', error: 'Import failed — check the server logs' }
      }
      setImportEntries([...entries])
    }

    setImporting(false)
    // Refresh flow list so newly imported flows appear in export panel
    api.flows.list().then(setFlows).catch(console.error)
  }

  const pendingCount = importEntries.filter(e => e.status === 'pending').length

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '90rem', margin: '0 auto', padding: 'clamp(1rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem)' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>WORKSPACE</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15 }}>Flow Transfer</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
          Export flows to a file and import them into any environment
        </p>
      </div>

      {/* Two-panel layout — stacks to single column on mobile */}
      <div className="transfer-grid">

        {/* ── LEFT: EXPORT ─────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden' }}>

          {/* Panel header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={14} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.2 }}>Export</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Select flows to download</p>
              </div>
            </div>
            {selected.size > 0 && (
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                {selected.size} selected
              </span>
            )}
          </div>

          {/* Search + select controls */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search flows…"
                className="input-base"
                style={{ paddingLeft: '2.25rem', height: '2.25rem', fontSize: '0.875rem' }}
              />
            </div>
            <button
              onClick={selectAll}
              style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
            >
              All
            </button>
            <button
              onClick={clearAll}
              style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
            >
              None
            </button>
          </div>

          {/* Flow list */}
          <div style={{ minHeight: '12rem', maxHeight: 'min(28rem, 50vh)', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '10rem', color: 'var(--color-muted)', gap: '0.5rem' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading flows…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                <Zap size={28} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.875rem' }}>No flows found</p>
              </div>
            ) : (
              filtered.map(flow => {
                const sm = STATUS_META[flow.status] ?? STATUS_META.DRAFT
                const isChecked = selected.has(flow.id)
                return (
                  <button
                    key={flow.id}
                    type="button"
                    onClick={() => toggleFlow(flow.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1.5rem', border: 'none', background: isChecked ? 'rgba(0,212,255,0.05)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'var(--color-panel)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isChecked ? 'rgba(0,212,255,0.05)' : 'transparent' }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '1.125rem', height: '1.125rem', borderRadius: '0.3rem', flexShrink: 0,
                      border: isChecked ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                      background: isChecked ? 'var(--color-accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isChecked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>

                    {/* Name */}
                    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {flow.name}
                    </span>

                    {/* Status badge */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '0.175rem 0.5rem', borderRadius: '999px', background: sm.bg, color: sm.color, flexShrink: 0 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: sm.dot }} />
                      {flow.status}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Export action */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={handleExport}
              disabled={selected.size === 0 || exporting}
              className="btn-primary"
              style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem', opacity: selected.size === 0 ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {exporting
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Exporting…</>
                : <><Download size={15} /> Export {selected.size > 0 ? `${selected.size} flow${selected.size > 1 ? 's' : ''}` : 'selected'}</>
              }
            </button>
          </div>
        </div>

        {/* ── RIGHT: IMPORT ────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem', overflow: 'hidden' }}>

          {/* Panel header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={14} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.2 }}>Import</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Upload .nexflow.json files</p>
            </div>
          </div>

          {/* Drop zone */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.nexflow.json"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: '0.75rem',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(0,212,255,0.04)' : 'var(--color-panel)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <Upload size={24} style={{ color: dragOver ? 'var(--color-accent)' : 'var(--color-muted)', marginBottom: '0.625rem', margin: '0 auto 0.625rem' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                Drop files here or click to browse
              </p>
              <p style={{ fontSize: '0.775rem', color: 'var(--color-muted)' }}>
                Accepts single or multi-flow .nexflow.json exports
              </p>
            </div>
          </div>

          {/* File list */}
          <div style={{ minHeight: '8rem', maxHeight: 'min(24rem, 45vh)', overflowY: 'auto' }}>
            {importEntries.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                <FileJson size={28} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.875rem' }}>No files added yet</p>
                <p style={{ fontSize: '0.775rem', marginTop: '0.25rem' }}>Files you add will appear here before importing</p>
              </div>
            ) : (
              importEntries.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    background: entry.status === 'done' ? 'rgba(21,128,61,0.05)' : entry.status === 'error' ? 'rgba(185,28,28,0.05)' : 'transparent',
                  }}
                >
                  {/* Status icon */}
                  <div style={{ flexShrink: 0 }}>
                    {entry.status === 'pending' && <FileJson size={16} style={{ color: 'var(--color-muted)' }} />}
                    {entry.status === 'importing' && <Loader2 size={16} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />}
                    {entry.status === 'done' && <CheckCircle2 size={16} style={{ color: '#15803d' }} />}
                    {entry.status === 'error' && <AlertCircle size={16} style={{ color: '#b91c1c' }} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: entry.status === 'error' ? '#b91c1c' : 'var(--color-text)' }}>
                      {entry.label}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.1rem' }}>
                      {entry.status === 'error'
                        ? entry.error
                        : entry.status === 'done'
                        ? `Imported successfully`
                        : entry.status === 'importing'
                        ? 'Importing…'
                        : `${entry.count} flow${entry.count !== 1 ? 's' : ''} · ${(entry.file.size / 1024).toFixed(1)} KB`
                      }
                    </p>
                  </div>

                  {/* Remove button (only when not in progress) */}
                  {entry.status !== 'importing' && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', flexShrink: 0, padding: '0.125rem' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Import action */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.625rem' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '0.7rem 1rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.625rem', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              <Upload size={14} /> Add files
            </button>
            <button
              onClick={handleImportAll}
              disabled={pendingCount === 0 || importing}
              className="btn-primary"
              style={{ flex: 1, padding: '0.7rem', fontSize: '0.9rem', opacity: pendingCount === 0 ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {importing
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</>
                : <><ArrowRight size={15} /> Import {pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? 's' : ''}` : 'all'}</>
              }
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
