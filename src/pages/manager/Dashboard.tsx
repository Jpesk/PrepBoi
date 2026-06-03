import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { catColor } from '../../lib/theme'
import { Pill, Spinner, Empty, Ring } from '../../components/ui'
import { RefreshCw } from 'lucide-react'

export const Dashboard: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const { T } = useTheme()
  const { profile } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('v_submission_dashboard')
      .select('*')
      .eq('submission_date', today)
      .order('submitted_at', { ascending: false, nullsFirst: false })

    setRows(data ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])

  // Realtime refresh when a new submission comes in
  useEffect(() => {
    if (!profile) return
    const ch = supabase
      .channel('dashboard-refresh')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'checklist_submissions',
        filter: `org_id=eq.${profile.org_id}`,
      }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile, load])

  if (loading) return <Spinner />

  const counts: Record<string, number> = {
    all: rows.length,
    submitted: rows.filter(r => r.status === 'submitted').length,
    in_progress: rows.filter(r => r.status === 'draft' && r.progress > 0).length,
    not_started: rows.filter(r => r.status === 'draft' && r.progress === 0).length,
  }

  const visible = rows.filter(r => {
    if (filter === 'submitted') return r.status === 'submitted'
    if (filter === 'in_progress') return r.status === 'draft' && r.progress > 0
    if (filter === 'not_started') return r.status === 'draft' && r.progress === 0
    return true
  })

  // Summary strip
  const kpis = [
    { label: 'Submitted', val: counts.submitted, color: T.lime, bg: T.limeLo, bd: T.limeBd },
    { label: 'In Progress', val: counts.in_progress, color: T.brand, bg: T.brandLo, bd: T.brandBd },
    { label: 'Not Started', val: counts.not_started, color: T.t3, bg: T.bg3, bd: T.line2 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!hideHeader && (
        <div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            margin: 0,
            color: T.t1,
            letterSpacing: '-0.5px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Live Monitor
          </h1>
          <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
            Today's checklist status — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label}
            onClick={() => setFilter(k.label.toLowerCase().replace(' ', '_'))}
            style={{
              background: k.bg, border: `1px solid ${k.bd}`, borderRadius: 12,
              padding: '20px', cursor: 'pointer',
              opacity: filter !== 'all' && filter !== k.label.toLowerCase().replace(' ', '_') ? 0.5 : 1,
              transition: 'opacity .15s',
              fontFamily: "'DM Sans', sans-serif"
            }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 12, color: k.color, marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['all', 'submitted', 'in_progress', 'not_started'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
              border: `1px solid ${filter === f ? T.brandBd : T.line}`,
              background: filter === f ? T.brandLo : 'transparent',
              color: filter === f ? T.brand : T.t3
            }}>
            {f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({counts[f] ?? counts.all})
          </button>
        ))}
        <button onClick={load}
          style={{
            marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700, fontSize: 13, cursor: 'pointer', background: 'transparent',
            border: `1px solid ${T.line}`, color: T.t2, display: 'flex', alignItems: 'center', gap: 6
          }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {visible.length === 0 && (
        <Empty iconName="inbox" message="No submissions yet today"
          sub="Submissions will appear here in real-time as staff complete checklists." />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(row => {
          const cc = catColor(T, row.checklist_category)
          const isDone = row.status === 'submitted'
          const isWip = row.status === 'draft' && row.progress > 0

          return (
            <div key={row.id} style={{
              background: T.bg1, border: `1px solid ${isDone ? T.limeBd : T.line}`,
              borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px' }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: T.bg2,
                  border: `2px solid ${isDone ? T.lime : isWip ? T.brand : T.line2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: isDone ? T.lime : isWip ? T.brand : T.t3, flexShrink: 0
                }}>
                  {row.avatar_initials}
                </div>

                <div style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans', sans-serif" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{row.employee_name}</span>
                    <Pill fg={cc.fg} bg={cc.bg} bd={cc.bd}>{row.checklist_emoji} {row.checklist_title}</Pill>
                  </div>
                  <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>
                    {row.location_name && <span>{row.location_name} · </span>}
                    {isDone
                      ? `Submitted at ${new Date(row.submitted_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                      : isWip
                        ? `Started ${new Date(row.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                        : `Due ${row.due_time}`
                    }
                  </div>
                </div>

                {/* Progress ring */}
                <Ring pct={row.progress} size={48}
                  color={isDone ? T.lime : isWip ? T.brand : T.t4} />
              </div>

              {/* Progress bar */}
              {!isDone && (
                <div style={{ height: 4, background: T.bg2 }}>
                  <div style={{
                    width: `${row.progress}%`, height: '100%',
                    background: isWip ? T.brand : T.line2, transition: 'width .4s'
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Dashboard
