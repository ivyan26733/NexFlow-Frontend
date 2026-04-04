'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, Crown, UserCheck, Loader2, ChevronDown, Check } from 'lucide-react'
import { api } from '@/api'
import { getStoredUser } from '@/lib/auth'
import type { AuthUser, UserRole } from '@/types'

const ROLES: UserRole[] = ['ADMIN', 'SUB_ADMIN', 'MEMBER']

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ADMIN:     { label: 'Admin',     color: '#00d4ff', bg: 'rgba(0,212,255,0.12)',    icon: <Crown size={13} />    },
  SUB_ADMIN: { label: 'Sub-Admin', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   icon: <Shield size={13} />   },
  MEMBER:    { label: 'Member',    color: '#64748b', bg: 'rgba(100,116,139,0.12)',  icon: <UserCheck size={13} /> },
}

export default function AdminPage() {
  const router = useRouter()
  const [users,   setUsers]   = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [roleOpen, setRoleOpen] = useState<string | null>(null)
  const me = getStoredUser()

  useEffect(() => {
    if (!me || me.role !== 'ADMIN') { router.replace('/'); return }
    api.admin.listUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [me, router])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-role-menu]')) setRoleOpen(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function changeRole(userId: string, role: UserRole) {
    setSaving(userId)
    setRoleOpen(null)
    try {
      const updated = await api.admin.updateRole(userId, role)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u))
    } catch (e) { console.error(e) }
    finally { setSaving(null) }
  }

  const stats = {
    total:     users.length,
    admins:    users.filter(u => u.role === 'ADMIN').length,
    subAdmins: users.filter(u => u.role === 'SUB_ADMIN').length,
    members:   users.filter(u => u.role === 'MEMBER').length,
  }

  const avatarColors = [
    'linear-gradient(135deg,#00D4FF,#6366F1)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#3b82f6)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#06b6d4,#22c55e)',
  ]

  return (
    <div className="page-wrapper" style={{ maxWidth: '80rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>SETTINGS</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.15 }}>
          Admin Panel
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
          Manage user roles and workspace access
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div className="stats-grid-4">
        {[
          { label: 'Total Users',  value: stats.total,     icon: <Users size={18} />,    color: '#e2e8f0' },
          { label: 'Admins',       value: stats.admins,    icon: <Crown size={18} />,    color: '#00d4ff' },
          { label: 'Sub-Admins',   value: stats.subAdmins, icon: <Shield size={18} />,   color: '#f59e0b' },
          { label: 'Members',      value: stats.members,   icon: <UserCheck size={18} />, color: '#64748b' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '0.875rem', padding: '1.25rem 1.5rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
              background: `${s.color}18`, border: `1px solid ${s.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: '1.625rem', fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── User table ─────────────────────────────────────────── */}
      <div className="table-scroll-wrap">
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '1rem', overflow: 'hidden', minWidth: '600px',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2.5fr 2fr 1.5fr 1.25fr',
          padding: '0.875rem 1.75rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-panel)',
        }}>
          {['User', 'Email', 'Current Role', 'Change Role'].map(h => (
            <span key={h} style={{
              fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
              color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
            <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Loading users…</span>
          </div>
        ) : users.map((u, i) => {
          const meta = ROLE_META[u.role]
          const isMe = u.id === me?.id
          return (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '2.5fr 2fr 1.5fr 1.25fr',
              padding: '1.125rem 1.75rem', alignItems: 'center',
              borderBottom: i < users.length - 1 ? '1px solid var(--color-border)' : 'none',
              transition: 'background 0.1s',
              background: isMe ? 'rgba(0,212,255,0.03)' : 'transparent',
            }}
            onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = 'var(--color-panel)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(0,212,255,0.03)' : 'transparent' }}
            >
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: 0,
                  background: avatarColors[i % avatarColors.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 700, color: '#0a0d14',
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    {u.name}
                  </p>
                  {isMe && (
                    <span style={{
                      fontSize: '0.7rem', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)',
                      background: 'rgba(0,212,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '999px',
                    }}>you</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                {u.email}
              </span>

              {/* Current role badge */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.3rem 0.75rem', borderRadius: '999px',
                  background: meta.bg, color: meta.color,
                  fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${meta.color}40`,
                }}>
                  {meta.icon} {meta.label}
                </span>
              </div>

              {/* Role dropdown */}
              <div>
                {!isMe && (
                  <div style={{ position: 'relative', display: 'inline-block' }} data-role-menu>
                    <button
                      onClick={() => setRoleOpen(roleOpen === u.id ? null : u.id)}
                      disabled={saving === u.id}
                      data-role-menu
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.75rem 0.4rem 0.875rem',
                        background: 'var(--color-panel)', border: '1px solid var(--color-border)',
                        borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text)',
                        fontSize: '0.825rem', transition: 'border-color 0.15s',
                        borderColor: roleOpen === u.id ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      {saving === u.id
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : 'Change'}
                      <ChevronDown size={13} style={{ color: 'var(--color-muted)', transition: 'transform 0.15s', transform: roleOpen === u.id ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {roleOpen === u.id && (
                      <div data-role-menu style={{
                        position: 'absolute', top: 'calc(100% + 0.375rem)', left: 0,
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        borderRadius: '0.625rem', minWidth: '11rem', zIndex: 50,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden', padding: '0.25rem',
                      }}>
                        {ROLES.map(r => {
                          const rm = ROLE_META[r]
                          return (
                            <button
                              key={r}
                              data-role-menu
                              onClick={() => changeRole(u.id, r)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                                padding: '0.625rem 0.75rem', background: 'none', border: 'none',
                                borderRadius: '0.375rem', cursor: 'pointer', textAlign: 'left',
                                color: r === u.role ? rm.color : 'var(--color-text)',
                                fontSize: '0.85rem', transition: 'background 0.1s',
                                fontWeight: r === u.role ? 600 : 400,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-panel)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                            >
                              <span style={{ color: rm.color }}>{rm.icon}</span>
                              {rm.label}
                              {r === u.role && <Check size={13} style={{ marginLeft: 'auto', color: rm.color }} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>{/* end table-scroll-wrap */}
    </div>
  )
}
