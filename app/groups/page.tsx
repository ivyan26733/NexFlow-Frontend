'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Users, Zap, ChevronDown, Loader2, X, Search, Globe, Lock } from 'lucide-react'
import { api } from '@/api'
import { getStoredUser } from '@/lib/auth'
import type { UserGroup, AuthUser, Flow } from '@/types'

export default function GroupsPage() {
  const router = useRouter()
  const me     = getStoredUser()

  const [groups,   setGroups]   = useState<UserGroup[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Create form
  const [newName,    setNewName]    = useState('')
  const [newAllFlow, setNewAllFlow] = useState(false)
  const [creating,   setCreating]   = useState(false)

  // Per-group lazy-loaded data
  const [members,  setMembers]  = useState<Record<string, AuthUser[]>>({})
  const [flows,    setFlows]    = useState<Flow[]>([])
  const [allUsers, setAllUsers] = useState<AuthUser[]>([])

  // Member search
  const [memberSearch, setMemberSearch] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!me || (me.role !== 'ADMIN' && me.role !== 'SUB_ADMIN')) {
      router.replace('/'); return
    }
    Promise.all([
      api.groups.list(),
      api.flows.list(),
      me.role === 'ADMIN' ? api.admin.listUsers() : Promise.resolve([]),
    ]).then(([g, f, u]) => {
      setGroups(g); setFlows(f); setAllUsers(u)
    }).catch(console.error).finally(() => setLoading(false))
  }, [me, router])

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function loadMembers(groupId: string) {
    if (members[groupId]) return
    const m = await api.groups.listMembers(groupId).catch(() => [])
    setMembers(prev => ({ ...prev, [groupId]: m }))
  }

  function toggle(groupId: string) {
    if (expanded === groupId) { setExpanded(null); return }
    setExpanded(groupId)
    loadMembers(groupId)
  }

  async function createGroup() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const g = await api.groups.create(newName.trim(), newAllFlow)
      setGroups(prev => [...prev, g])
      setShowModal(false); setNewName(''); setNewAllFlow(false)
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Delete this group and all its memberships?')) return
    await api.groups.delete(groupId).catch(console.error)
    setGroups(prev => prev.filter(g => g.id !== groupId))
    if (expanded === groupId) setExpanded(null)
  }

  async function removeMember(groupId: string, userId: string) {
    await api.groups.removeMember(groupId, userId).catch(console.error)
    setMembers(prev => ({ ...prev, [groupId]: (prev[groupId] ?? []).filter(u => u.id !== userId) }))
  }

  async function addMember(groupId: string, userId: string) {
    await api.groups.addMember(groupId, userId).catch(console.error)
    const m = await api.groups.listMembers(groupId).catch(() => [])
    setMembers(prev => ({ ...prev, [groupId]: m }))
    setMemberSearch(prev => ({ ...prev, [groupId]: '' }))
  }

  const avatarColors = [
    'linear-gradient(135deg,#9A3412,#1E3A5F)',
    'linear-gradient(135deg,#c2410c,#92400e)',
    'linear-gradient(135deg,#15803d,#14532d)',
    'linear-gradient(135deg,#b45309,#78350f)',
    'linear-gradient(135deg,#57534e,#44403c)',
  ]

  return (
    <div className="page-wrapper" style={{ maxWidth: '80rem', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <p className="dashboard-label" style={{ marginBottom: '0.5rem' }}>SETTINGS</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.15 }}>Groups</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
            Organise users and control which flows each group can access
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowModal(true)}
          style={{ padding: '0.625rem 1.25rem', fontSize: '0.9rem', gap: '0.5rem' }}
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="stats-grid-3">
        {[
          { label: 'Total Groups',    value: groups.length,                              color: '#A8927A', icon: <Users size={18} />  },
          { label: 'All-Access',      value: groups.filter(g => g.allFlowsAccess).length, color: '#1E3A5F', icon: <Globe size={18} />  },
          { label: 'Selective Access', value: groups.filter(g => !g.allFlowsAccess).length, color: '#f59e0b', icon: <Lock size={18} />   },
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
            }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: '1.625rem', fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Group list ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-muted)' }}>Loading groups…</span>
        </div>
      ) : groups.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)', border: '2px dashed var(--color-border)',
          borderRadius: '1rem', padding: '4rem 2rem', textAlign: 'center',
        }}>
          <div style={{
            width: '4rem', height: '4rem', borderRadius: '50%',
            background: 'var(--color-panel)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}><Users size={22} style={{ color: 'var(--color-muted)' }} /></div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No groups yet</h3>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Create a group to start managing user access to flows
          </p>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '0.625rem 1.25rem' }}>
            <Plus size={15} /> Create first group
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groups.map((g, gi) => (
            <GroupCard
              key={g.id}
              group={g}
              expanded={expanded === g.id}
              members={members[g.id] ?? null}
              flows={flows}
              allUsers={allUsers}
              memberSearch={memberSearch[g.id] ?? ''}
              avatarColor={avatarColors[gi % avatarColors.length]}
              onToggle={() => toggle(g.id)}
              onDelete={() => deleteGroup(g.id)}
              onRemoveMember={userId => removeMember(g.id, userId)}
              onAddMember={userId => addMember(g.id, userId)}
              onSearchChange={q => setMemberSearch(prev => ({ ...prev, [g.id]: q }))}
            />
          ))}
        </div>
      )}

      {/* ── Create modal ───────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '1.125rem', padding: '2rem', width: '100%', maxWidth: '26rem',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Create group</h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  Add a name and choose access level
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                background: 'var(--color-panel)', border: '1px solid var(--color-border)',
                borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer', color: 'var(--color-muted)',
                display: 'flex', alignItems: 'center',
              }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Group name
                </label>
                <input
                  type="text" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createGroup() }}
                  placeholder="e.g. Engineering, Marketing…"
                  autoFocus
                  className="input-base"
                  style={{ width: '100%', fontSize: '0.9375rem', height: '2.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Access level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  {[
                    { val: false, label: 'Selective', desc: 'Choose specific flows', icon: <Lock size={16} />, color: '#f59e0b' },
                    { val: true,  label: 'All Flows', desc: 'Access every flow',    icon: <Globe size={16} />, color: '#1E3A5F' },
                  ].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setNewAllFlow(opt.val)}
                      style={{
                        padding: '0.875rem', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left',
                        border: `2px solid ${newAllFlow === opt.val ? opt.color : 'var(--color-border)'}`,
                        background: newAllFlow === opt.val ? `${opt.color}10` : 'var(--color-panel)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ color: opt.color, display: 'block', marginBottom: '0.375rem' }}>{opt.icon}</span>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>{opt.label}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.25rem' }}>
                <button
                  onClick={() => { setShowModal(false); setNewName(''); setNewAllFlow(false) }}
                  style={{
                    flex: 1, padding: '0.75rem', background: 'none',
                    border: '1px solid var(--color-border)', borderRadius: '0.625rem',
                    cursor: 'pointer', color: 'var(--color-muted)', fontSize: '0.875rem', fontWeight: 500,
                  }}
                >Cancel</button>
                <button
                  className="btn-primary"
                  onClick={createGroup}
                  disabled={creating || !newName.trim()}
                  style={{ flex: 2, padding: '0.75rem', fontSize: '0.9rem' }}
                >
                  {creating ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
                  {creating ? 'Creating…' : 'Create group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

function GroupCard({
  group, expanded, members, flows, allUsers, memberSearch, avatarColor,
  onToggle, onDelete, onRemoveMember, onAddMember, onSearchChange,
}: {
  group: UserGroup
  expanded: boolean
  members: AuthUser[] | null
  flows: Flow[]
  allUsers: AuthUser[]
  memberSearch: string
  avatarColor: string
  onToggle: () => void
  onDelete: () => void
  onRemoveMember: (userId: string) => void
  onAddMember: (userId: string) => void
  onSearchChange: (q: string) => void
}) {
  const memberCount  = members?.length ?? 0
  const nonMembers   = allUsers.filter(u => !(members ?? []).some(m => m.id === u.id))
  const filteredNonMembers = memberSearch
    ? nonMembers.filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase()))
    : nonMembers

  const avatarColors = ['linear-gradient(135deg,#9A3412,#1E3A5F)','linear-gradient(135deg,#c2410c,#92400e)','linear-gradient(135deg,#15803d,#14532d)','linear-gradient(135deg,#b45309,#78350f)','linear-gradient(135deg,#57534e,#44403c)']

  return (
    <div style={{
      background: 'var(--color-surface)', border: `1px solid ${expanded ? 'var(--color-accent)' : 'var(--color-border)'}`,
      borderRadius: '1rem', overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      {/* ── Summary row ── */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', padding: '1.25rem 1.5rem',
          cursor: 'pointer', gap: '1rem',
          background: expanded ? 'rgba(0,212,255,0.03)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--color-panel)' }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Icon */}
        <div style={{
          width: '3rem', height: '3rem', borderRadius: '0.875rem', flexShrink: 0,
          background: group.allFlowsAccess ? 'rgba(0,212,255,0.12)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${group.allFlowsAccess ? 'rgba(0,212,255,0.25)' : 'rgba(245,158,11,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {group.allFlowsAccess
            ? <Globe size={18} style={{ color: '#1E3A5F' }} />
            : <Lock size={18} style={{ color: '#f59e0b' }} />}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginTop: '0.25rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.8rem', color: 'var(--color-muted)',
            }}>
              <Users size={12} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem',
              color: group.allFlowsAccess ? '#1E3A5F' : '#f59e0b',
              fontFamily: 'var(--font-mono)',
            }}>
              {group.allFlowsAccess ? '● All flows' : '○ Selective'}
            </span>
          </div>
        </div>

        {/* Stacked avatars preview */}
        {members && members.length > 0 && (
          <div style={{ display: 'flex', marginRight: '0.5rem' }}>
            {members.slice(0, 4).map((m, mi) => (
              <div key={m.id} style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                background: avatarColors[mi % avatarColors.length],
                border: '2px solid var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-on-accent)',
                marginLeft: mi > 0 ? '-0.5rem' : 0,
              }}>
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {members.length > 4 && (
              <div style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                background: 'var(--color-panel)', border: '2px solid var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', color: 'var(--color-muted)', marginLeft: '-0.5rem',
              }}>+{members.length - 4}</div>
            )}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-muted)', padding: '0.375rem', borderRadius: '0.375rem',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-failure)'; e.currentTarget.style.background = 'rgba(255,68,68,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'none' }}
        >
          <Trash2 size={15} />
        </button>

        <ChevronDown size={16} style={{
          color: 'var(--color-muted)', transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'none',
        }} />
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="two-col-panel">

            {/* Members panel */}
            <div style={{ padding: '1.5rem', borderRight: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Users size={13} /> Members
                  <span style={{
                    fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px',
                    background: 'rgba(0,212,255,0.12)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)',
                  }}>{memberCount}</span>
                </h3>
              </div>

              {/* Current members */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '12rem', overflowY: 'auto' }}>
                {members === null ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-muted)' }} />
                  </div>
                ) : members.length === 0 ? (
                  <p style={{ fontSize: '0.825rem', color: 'var(--color-border)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No members yet
                  </p>
                ) : members.map((u, ui) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.75rem', background: 'var(--color-panel)',
                    borderRadius: '0.625rem', border: '1px solid var(--color-border)',
                  }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
                      background: avatarColors[ui % avatarColors.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-on-accent)',
                    }}>{u.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                      <p style={{ fontSize: '0.725rem', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{u.email}</p>
                    </div>
                    <button
                      onClick={() => onRemoveMember(u.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-muted)', padding: '0.25rem', borderRadius: '0.25rem',
                        flexShrink: 0, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-failure)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)' }}
                    ><X size={13} /></button>
                  </div>
                ))}
              </div>

              {/* Add member search */}
              {allUsers.length > 0 && nonMembers.length > 0 && (
                <div>
                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={e => onSearchChange(e.target.value)}
                      placeholder="Search users to add…"
                      className="input-base"
                      style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.825rem', height: '2.375rem' }}
                    />
                  </div>
                  {memberSearch && (
                    <div style={{
                      background: 'var(--color-panel)', border: '1px solid var(--color-border)',
                      borderRadius: '0.625rem', overflow: 'hidden', maxHeight: '8rem', overflowY: 'auto',
                    }}>
                      {filteredNonMembers.length === 0 ? (
                        <p style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--color-muted)', textAlign: 'center' }}>No results</p>
                      ) : filteredNonMembers.map(u => (
                        <button
                          key={u.id}
                          onClick={() => onAddMember(u.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.625rem 0.75rem', background: 'none', border: 'none',
                            cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <div style={{
                            width: '1.75rem', height: '1.75rem', borderRadius: '50%', flexShrink: 0,
                            background: 'var(--grad-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                          }}>{u.name.charAt(0).toUpperCase()}</div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.825rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>{u.name}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                          </div>
                          <Plus size={13} style={{ marginLeft: 'auto', color: 'var(--color-accent)', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Flow Access panel */}
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{
                fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}>
                <Zap size={13} /> Flow Access
              </h3>

              {group.allFlowsAccess ? (
                <div style={{
                  background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)',
                  borderRadius: '0.75rem', padding: '1.25rem 1.5rem', textAlign: 'center',
                }}>
                  <Globe size={24} style={{ color: '#1E3A5F', marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E3A5F' }}>All-Access Group</p>
                  <p style={{ fontSize: '0.775rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                    Members can access every flow in the workspace
                  </p>
                </div>
              ) : flows.length === 0 ? (
                <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>No flows available</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '17rem', overflowY: 'auto' }}>
                  {flows.map(f => <FlowToggle key={f.id} flow={f} groupId={group.id} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FlowToggle ───────────────────────────────────────────────────────────────

function FlowToggle({ flow, groupId }: { flow: Flow; groupId: string }) {
  const [granted, setGranted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready,   setReady]   = useState(false)

  useEffect(() => {
    api.admin.listFlowAccess(flow.id)
      .then(access => {
        setGranted(access.some(a => a.targetType === 'GROUP' && a.targetId === groupId))
        setReady(true)
      }).catch(() => setReady(true))
  }, [flow.id, groupId])

  async function toggle() {
    setLoading(true)
    try {
      if (granted) { await api.groups.revokeFlow(groupId, flow.id); setGranted(false) }
      else         { await api.groups.grantFlow(groupId, flow.id);  setGranted(true)  }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (!ready) return null

  return (
    <div
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        padding: '0.625rem 0.75rem', borderRadius: '0.625rem', cursor: 'pointer',
        background: granted ? 'rgba(0,212,255,0.06)' : 'var(--color-panel)',
        border: `1px solid ${granted ? 'rgba(0,212,255,0.2)' : 'var(--color-border)'}`,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = granted ? 'rgba(0,212,255,0.35)' : 'var(--color-accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = granted ? 'rgba(0,212,255,0.2)' : 'var(--color-border)' }}
    >
      {/* Toggle pill */}
      <div style={{
        width: '2.25rem', height: '1.25rem', borderRadius: '999px', flexShrink: 0,
        background: granted ? 'var(--color-accent)' : 'var(--color-border)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: '0.15rem',
          left: granted ? 'calc(100% - 1rem - 0.15rem)' : '0.15rem',
          width: '0.95rem', height: '0.95rem', borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>

      <span style={{
        flex: 1, fontSize: '0.875rem', fontWeight: 500,
        color: granted ? 'var(--color-text)' : 'var(--color-muted)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'color 0.15s',
      }}>{flow.name}</span>

      {loading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-muted)', flexShrink: 0 }} />}
    </div>
  )
}
