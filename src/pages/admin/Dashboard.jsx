import { useState, useEffect, useCallback } from 'react'
import { useTheme }  from '../../hooks/useTheme'
import { useAuth }   from '../../hooks/useAuth'
import { supabase }  from '../../lib/supabase'
import { catColor, roleColor, ROLE_META } from '../../lib/theme'
import { Pill, Spinner, Empty, Ring } from '../../components/ui'

const STATUS_META = {
  submitted:  { label:'Submitted',   color:'lime'  },
  draft:      { label:'In Progress', color:'amber' },
  not_started:{ label:'Not Started', color:'t3'    },
}

export default function Dashboard() {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

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
  }, [profile?.id])

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
    return () => supabase.removeChannel(ch)
  }, [profile?.id, load])

  if (loading) return <Spinner />

  const counts = {
    all:         rows.length,
    submitted:   rows.filter(r => r.status==='submitted').length,
    in_progress: rows.filter(r => r.status==='draft'&&r.progress>0).length,
    not_started: rows.filter(r => r.status==='draft'&&r.progress===0).length,
  }

  const visible = rows.filter(r => {
    if (filter==='submitted')   return r.status==='submitted'
    if (filter==='in_progress') return r.status==='draft'&&r.progress>0
    if (filter==='not_started') return r.status==='draft'&&r.progress===0
    return true
  })

  // Summary strip
  const kpis = [
    { label:'Submitted',   val:counts.submitted,   color:T.lime,  bg:T.limeLo,  bd:T.limeBd  },
    { label:'In Progress', val:counts.in_progress, color:T.amber, bg:T.amberLo, bd:T.amberBd },
    { label:'Not Started', val:counts.not_started, color:T.t3,    bg:T.bg3,     bd:T.line2   },
  ]

  return (
    <div style={{ padding:'20px 16px' }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:900,
        color:T.t1, letterSpacing:'-0.8px', marginBottom:4 }}>Live Dashboard</div>
      <div style={{ fontSize:14, color:T.t3, marginBottom:20 }}>
        Today's checklist status — {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {kpis.map(k => (
          <div key={k.label}
            onClick={() => setFilter(k.label.toLowerCase().replace(' ','_'))}
            style={{ background:k.bg, border:`1.5px solid ${k.bd}`, borderRadius:12,
              padding:'14px 12px', cursor:'pointer',
              opacity:filter!=='all'&&filter!==k.label.toLowerCase().replace(' ','_')?.0.5:1,
              transition:'opacity .15s' }}>
            <div style={{ fontSize:30, fontWeight:900, color:k.color, lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:k.color, marginTop:4, fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {['all','submitted','in_progress','not_started'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'7px 14px', borderRadius:8, fontFamily:'inherit',
              fontWeight:700, fontSize:12, cursor:'pointer', transition:'all .15s',
              border:`1.5px solid ${filter===f?T.amber:T.line}`,
              background:filter===f?T.amberLo:T.bg3,
              color:filter===f?T.amber:T.t3 }}>
            {f.replace('_',' ')} ({counts[f] ?? counts.all})
          </button>
        ))}
        <button onClick={load}
          style={{ marginLeft:'auto', padding:'7px 14px', borderRadius:8, fontFamily:'inherit',
            fontWeight:700, fontSize:12, cursor:'pointer', background:T.bg3,
            border:`1px solid ${T.line}`, color:T.t3 }}>
          ↻ Refresh
        </button>
      </div>

      {visible.length === 0 && (
        <Empty icon="📊" message="No submissions yet today"
          sub="Submissions will appear here in real-time as staff complete checklists." />
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {visible.map(row => {
          const cc = catColor(T, row.checklist_category)
          const isDone = row.status === 'submitted'
          const isWip  = row.status === 'draft' && row.progress > 0

          return (
            <div key={row.id} style={{ background:T.bg2, border:`1.5px solid ${isDone?T.limeBd:T.line}`,
              borderRadius:14, overflow:'hidden', transition:'border-color .2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px' }}>
                {/* Avatar */}
                <div style={{ width:42, height:42, borderRadius:'50%', background:T.bg4,
                  border:`2px solid ${isDone?T.lime:isWip?T.amber:T.line2}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:800, color:isDone?T.lime:isWip?T.amber:T.t3, flexShrink:0 }}>
                  {row.avatar_initials}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{row.employee_name}</span>
                    <Pill fg={cc.fg} bg={cc.bg} bd={cc.bd}>{row.checklist_emoji} {row.checklist_title}</Pill>
                  </div>
                  <div style={{ fontSize:12, color:T.t3, marginTop:3 }}>
                    {row.location_name && <span>{row.location_name} · </span>}
                    {isDone
                      ? `Submitted at ${new Date(row.submitted_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`
                      : isWip
                      ? `Started ${new Date(row.started_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`
                      : `Due ${row.due_time}`
                    }
                  </div>
                </div>

                {/* Progress ring */}
                <Ring pct={row.progress} size={44}
                  color={isDone?T.lime:isWip?T.amber:T.t4} />
              </div>

              {/* Progress bar */}
              {!isDone && (
                <div style={{ height:3, background:T.bg4 }}>
                  <div style={{ width:`${row.progress}%`, height:'100%',
                    background:isWip?T.amber:T.bg5, transition:'width .4s' }}/>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
