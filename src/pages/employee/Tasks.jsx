import { useState, useEffect, useCallback } from 'react'
import { useAuth }   from '../../hooks/useAuth'
import { useTheme }  from '../../hooks/useTheme'
import { supabase }  from '../../lib/supabase'
import { catColor }  from '../../lib/theme'
import { Btn, Card, Pill, Ring, SigPad, Spinner, Empty, Textarea } from '../../components/ui'

// ── Individual checklist item ─────────────────────────────────────────────────
function CheckItem({ item, checked, onCheck, state, onState }) {
  const { T } = useTheme()
  const trig = item.trig

  const isTemp    = trig?.kind === 'temp'
  const tempNum   = parseFloat(state.temp ?? '')
  const tempWarn  = isTemp && checked && !isNaN(tempNum) && tempNum > (trig.warnAbove ?? 9999)

  return (
    <div style={{ borderRadius:10, border:`1.5px solid ${checked ? T.limeBd : T.line}`,
      background:checked ? T.limeLo : T.bg2, overflow:'hidden', transition:'all .2s' }}>

      {/* Tap row */}
      <div onClick={onCheck}
        style={{ display:'flex', alignItems:'center', gap:14, padding:'16px',
          cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
        <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, transition:'all .2s',
          background:checked ? T.lime : 'transparent',
          border:`2px solid ${checked ? T.lime : T.line2}`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {checked && <span style={{ color: T.mode==='dark'?'#0A0B09':'#fff', fontSize:15, fontWeight:900, lineHeight:1 }}>✓</span>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600, lineHeight:1.3,
            color:checked ? T.lime : T.t1,
            textDecoration:checked ? 'line-through' : 'none', transition:'all .2s' }}>
            {item.text}
          </div>
          {item.req && !checked &&
            <div style={{ fontSize:11, color:T.t4, marginTop:2 }}>Required</div>}
        </div>
      </div>

      {/* Note trigger */}
      {checked && trig?.kind === 'note' && (
        <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${T.line}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase',
            letterSpacing:'1px', marginBottom:8, paddingTop:12 }}>{trig.label}</div>
          <Textarea rows={2} value={state.note ?? ''}
            onChange={e => onState({ ...state, note: e.target.value })}
            placeholder="Enter note…" />
        </div>
      )}

      {/* Yes/No trigger */}
      {checked && trig?.kind === 'yn' && (
        <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${T.line}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase',
            letterSpacing:'1px', marginBottom:10, paddingTop:12 }}>{trig.label}</div>
          <div style={{ display:'flex', gap:10 }}>
            {['yes','no'].map(opt => (
              <button key={opt} onClick={() => onState({ ...state, yn: state.yn===opt ? null : opt })}
                style={{ flex:1, padding:'12px', borderRadius:8, fontFamily:'inherit',
                  fontWeight:700, fontSize:14, cursor:'pointer', transition:'all .15s',
                  background: state.yn===opt ? (opt==='yes'?T.lime:T.red) : T.bg3,
                  color:       state.yn===opt ? (T.mode==='dark'?'#0A0B09':'#fff') : T.t3,
                  border:`1.5px solid ${state.yn===opt?(opt==='yes'?T.limeBd:T.redBd):T.line}` }}>
                {opt==='yes' ? '✓ Yes' : '✕ No'}
              </button>
            ))}
          </div>
          {state.yn === 'yes' && trig.yNoteLabel && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase',
                letterSpacing:'1px', marginBottom:8 }}>{trig.yNoteLabel}</div>
              <Textarea rows={2} value={state.ynNote ?? ''}
                onChange={e => onState({ ...state, ynNote: e.target.value })}
                placeholder="List items…" />
            </div>
          )}
        </div>
      )}

      {/* Temperature trigger */}
      {checked && isTemp && (
        <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${T.line}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase',
            letterSpacing:'1px', marginBottom:10, paddingTop:12 }}>{trig.label}</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="number" value={state.temp ?? ''} placeholder="0"
              onChange={e => onState({ ...state, temp: e.target.value })}
              style={{ width:100, background:T.bg3, fontFamily:"'DM Mono',monospace",
                fontSize:20, fontWeight:700, padding:'12px 14px', borderRadius:8,
                border:`1.5px solid ${tempWarn ? T.red : T.line}`,
                color:tempWarn ? T.red : T.t1, outline:'none', transition:'border-color .2s' }}/>
            <span style={{ fontSize:15, fontWeight:700, color:T.t3 }}>°F</span>
          </div>
          {tempWarn && (
            <div style={{ marginTop:10, padding:'10px 14px', background:T.redLo,
              border:`1px solid ${T.redBd}`, borderRadius:8 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.red, marginBottom:8 }}>
                ⚠ Above {trig.warnAbove}°F — log corrective action:
              </div>
              <Textarea rows={2} value={state.note ?? ''}
                onChange={e => onState({ ...state, note: e.target.value })}
                placeholder="Describe action taken…" style={{ background:T.redLo, borderColor:T.redBd, color:T.red }} />
            </div>
          )}
        </div>
      )}

      {/* Signature trigger */}
      {checked && trig?.kind === 'sig' && (
        <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${T.line}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase',
            letterSpacing:'1px', marginBottom:10, paddingTop:12 }}>Your signature</div>
          <SigPad value={state.sig} onChange={v => onState({ ...state, sig: v })} />
        </div>
      )}
    </div>
  )
}

// ── Checklist run view ────────────────────────────────────────────────────────
function ChecklistRun({ cl, submission, onBack, onSubmitted }) {
  const { T }     = useTheme()
  const { profile } = useAuth()

  // checks: { [itemId]: bool }
  // states: { [itemId]: { note, yn, ynNote, temp, sig } }
  const [checks,    setChecks]    = useState(submission?.draft_data?.checks  ?? {})
  const [states,    setStates]    = useState(submission?.draft_data?.states  ?? {})
  const [saving,    setSaving]    = useState(false)
  const [submitDone, setDone]     = useState(false)

  const allItems = (cl.schema?.sections ?? []).flatMap(s => s.items ?? [])
  const reqItems = allItems.filter(i => i.req)
  const sigItems = allItems.filter(i => i.trig?.kind === 'sig')

  const reqDone   = reqItems.filter(i => checks[i.id]).length
  const allSigned = sigItems.every(i => states[i.id]?.sig)
  const done      = allItems.filter(i => checks[i.id]).length
  const pct       = allItems.length ? Math.round(done / allItems.length * 100) : 0
  const canSubmit = reqDone === reqItems.length && (sigItems.length === 0 || allSigned)

  const cc = catColor(T, cl.category)

  // Auto-save draft every 10 seconds
  const saveDraft = useCallback(async () => {
    if (!submission?.id || submitDone) return
    setSaving(true)
    await supabase.from('checklist_submissions').update({
      draft_data: { checks, states },
      progress:   pct,
    }).eq('id', submission.id)
    setSaving(false)
  }, [checks, states, pct, submission?.id, submitDone])

  useEffect(() => {
    const t = setInterval(saveDraft, 10_000)
    return () => clearInterval(t)
  }, [saveDraft])

  const handleSubmit = async () => {
    if (!canSubmit) return
    const sigData = sigItems.length > 0 ? states[sigItems[0].id]?.sig : 'no-sig-required'
    const { error } = await supabase.from('checklist_submissions').update({
      draft_data:     { checks, states },
      signature_data: sigData,
      status:         'submitted',
      submitted_at:   new Date().toISOString(),
      progress:       100,
    }).eq('id', submission.id)
    if (!error) { setDone(true); onSubmitted() }
  }

  if (submitDone) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'60vh', padding:32, gap:16 }}>
      <div style={{ fontSize:64 }}>✅</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:900, color:T.lime }}>Submitted!</div>
      <div style={{ fontSize:14, color:T.t3, textAlign:'center' }}>
        {cl.title} · {new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
      </div>
      <Btn v="ghost" onClick={onBack}>← Back to Tasks</Btn>
    </div>
  )

  return (
    <div>
      {/* Sticky header */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:T.bg1, borderBottom:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
          <button onClick={onBack}
            style={{ width:40, height:40, borderRadius:10, background:T.bg3, border:`1px solid ${T.line}`,
              color:T.t2, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <div style={{ textAlign:'center', flex:1, margin:'0 12px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:900, color:T.t1 }}>
              {cl.emoji} {cl.title}
            </div>
            <div style={{ fontSize:11, color:T.t3 }}>
              {done}/{allItems.length} items{saving ? ' · Saving…' : ''}
            </div>
          </div>
          <Ring pct={pct} size={44} color={pct===100 ? T.lime : cc.fg} />
        </div>
        <div style={{ height:3, background:T.bg4 }}>
          <div style={{ height:'100%', width:`${pct}%`, background:pct===100?T.lime:cc.fg,
            transition:'width .4s ease', borderRadius:'0 99px 99px 0' }}/>
        </div>
      </div>

      {/* Sections */}
      <div style={{ padding:'16px 16px 120px' }}>
        {(cl.schema?.sections ?? []).map(sec => (
          <div key={sec.id} style={{ marginBottom:24 }}>
            <div style={{ fontSize:12, fontWeight:800, color:T.t4, textTransform:'uppercase',
              letterSpacing:'1.2px', marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${T.line}` }}>
              {sec.title}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(sec.items ?? []).map(item => (
                <CheckItem key={item.id} item={item}
                  checked={!!checks[item.id]}
                  onCheck={() => setChecks(p => ({ ...p, [item.id]: !p[item.id] }))}
                  state={states[item.id] ?? {}}
                  onState={v => setStates(p => ({ ...p, [item.id]: v }))}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Submit block */}
        <div style={{ padding:16, borderRadius:12, marginTop:8, transition:'all .3s',
          border:`1.5px solid ${canSubmit ? T.amberBd : T.line}`,
          background:canSubmit ? T.amberLo : T.bg2 }}>
          {!canSubmit && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
              background:T.redLo, border:`1px solid ${T.redBd}`, borderRadius:8,
              marginBottom:14, fontSize:13, color:T.red, fontWeight:600 }}>
              ⚠ {reqItems.length - reqDone} required item{reqItems.length-reqDone!==1?'s':''} remaining
              {sigItems.length > 0 && !allSigned ? ' · Signature required' : ''}
            </div>
          )}
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ width:'100%', padding:'16px', borderRadius:10, border:'none',
              background:canSubmit ? T.amber : T.bg4,
              color:canSubmit ? (T.mode==='dark'?'#0A0B09':'#fff') : T.t4,
              fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:17,
              cursor:canSubmit?'pointer':'not-allowed', transition:'all .2s',
              opacity:canSubmit?1:.6 }}>
            {canSubmit ? `✓ Submit ${cl.title}` : `${reqItems.length-reqDone} Required Items Left`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tasks page ────────────────────────────────────────────────────────────────
export default function Tasks() {
  const { T }                 = useTheme()
  const { profile }           = useAuth()
  const [checklists, setChecklists] = useState([])
  const [submissions, setSubmissions] = useState({}) // { [clId]: submission row }
  const [loading,   setLoading]   = useState(true)
  const [active,    setActive]    = useState(null)  // { cl, submission }

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    // Fetch checklists assigned to user's role
    const { data: cls } = await supabase
      .from('checklists')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .contains('assigned_roles', [profile.role])
      .order('created_at')

    if (!cls) { setLoading(false); return }
    setChecklists(cls)

    // Fetch today's submissions for current user
    const today = new Date().toISOString().split('T')[0]
    const { data: subs } = await supabase
      .from('checklist_submissions')
      .select('*')
      .eq('submitted_by', profile.id)
      .eq('submission_date', today)

    const subMap = {}
    ;(subs ?? []).forEach(s => { subMap[s.checklist_id] = s })
    setSubmissions(subMap)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  const openChecklist = async (cl) => {
    let sub = submissions[cl.id]
    if (!sub) {
      // Create a draft submission row
      const { data } = await supabase
        .from('checklist_submissions')
        .upsert({
          checklist_id:    cl.id,
          org_id:          profile.org_id,
          location_id:     profile.location_id,
          submitted_by:    profile.id,
          submission_date: new Date().toISOString().split('T')[0],
        }, { onConflict: 'checklist_id,submitted_by,submission_date' })
        .select()
        .single()
      sub = data
      setSubmissions(p => ({ ...p, [cl.id]: sub }))
    }
    setActive({ cl, submission: sub })
  }

  if (active) return (
    <ChecklistRun
      cl={active.cl} submission={active.submission}
      onBack={() => setActive(null)}
      onSubmitted={() => { load(); setActive(null) }}
    />
  )

  const now   = new Date()
  const hour  = now.getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return <Spinner />

  return (
    <div style={{ padding:'20px 16px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700,
          color:T.t4, textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>
          {now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:900,
          color:T.t1, letterSpacing:'-0.8px', lineHeight:1.1 }}>
          {greet} 👋
        </div>
        <div style={{ fontSize:14, color:T.t3, marginTop:4 }}>
          {checklists.length} checklist{checklists.length!==1?'s':''} assigned to you today
        </div>
      </div>

      {checklists.length === 0 && (
        <Empty icon="📭" message="No checklists today" sub="Your manager hasn't assigned any checklists yet." />
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {checklists.map(cl => {
          const sub = submissions[cl.id]
          const cc  = catColor(T, cl.category)
          const isDone  = sub?.status === 'submitted'
          const isWip   = sub?.status === 'draft' && (sub?.progress ?? 0) > 0
          const totalItems = (cl.schema?.sections ?? []).flatMap(s => s.items ?? []).length

          return (
            <button key={cl.id} onClick={() => openChecklist(cl)}
              style={{ width:'100%', textAlign:'left', background:isDone?T.limeLo:T.bg2,
                border:`1.5px solid ${isDone?T.limeBd:T.line}`, borderRadius:14, padding:0,
                cursor:'pointer', overflow:'hidden', WebkitTapHighlightColor:'transparent',
                transition:'border-color .2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'18px' }}>
                <div style={{ width:54, height:54, borderRadius:12, background:cc.bg,
                  border:`1.5px solid ${cc.bd}`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:26, flexShrink:0 }}>
                  {isDone ? '✅' : cl.emoji}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:900, color:T.t1 }}>
                      {cl.title}
                    </span>
                    <Pill fg={cc.fg} bg={cc.bg} bd={cc.bd}>{cl.shift}</Pill>
                  </div>
                  <div style={{ fontSize:12, color:T.t3 }}>
                    {totalItems} items · ~{cl.est_minutes} min · Due {cl.due_time}
                  </div>
                  {isWip && (
                    <div style={{ marginTop:6 }}>
                      <div style={{ width:'100%', height:4, background:T.bg4, borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${sub.progress}%`, height:'100%', background:T.amber, borderRadius:99 }}/>
                      </div>
                      <div style={{ fontSize:11, color:T.amber, marginTop:3 }}>{sub.progress}% complete — tap to resume</div>
                    </div>
                  )}
                  {isDone && (
                    <div style={{ fontSize:12, color:T.lime, marginTop:4, fontWeight:600 }}>
                      ✓ Submitted {new Date(sub.submitted_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
                    </div>
                  )}
                </div>
                {!isDone && <div style={{ fontSize:20, color:T.t4 }}>›</div>}
              </div>
              {/* Progress bar at bottom */}
              {isWip && (
                <div style={{ height:2, background:T.bg4 }}>
                  <div style={{ width:`${sub.progress}%`, height:'100%', background:T.amber }}/>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
