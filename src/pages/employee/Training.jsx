import { useState, useEffect, useCallback } from 'react'
import { useAuth }  from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { supabase } from '../../lib/supabase'
import { Btn, Card, Pill, Spinner, Empty } from '../../components/ui'

// ── AI Quiz Engine ─────────────────────────────────────────────────────────────
function QuizView({ sop, onBack, onComplete }) {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const [loading,   setLoading]   = useState(false)
  const [qs,        setQs]        = useState(null)
  const [cur,       setCur]       = useState(0)
  const [ans,       setAns]       = useState({})
  const [finished,  setFinished]  = useState(false)
  const [err,       setErr]       = useState(null)

  const buildQuiz = useCallback(async () => {
    // Use pre-built quiz questions if they exist
    if (sop.quiz_questions?.length) {
      setQs(sop.quiz_questions)
      return
    }
    // Otherwise generate with AI
    setLoading(true); setErr(null)
    try {
      const body = (sop.sections ?? [])
        .map(s => `${s.title}:\n${s.body}`)
        .join('\n\n')

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You generate concise kitchen staff training quizzes. Return ONLY a valid JSON array of exactly 5 objects. Each object: {"q":"question text","opts":["A","B","C","D"],"ans":0} where ans is the zero-based index of the correct option. No markdown. No explanation. Just the raw JSON array.`,
          messages: [{ role: 'user', content: `Generate a 5-question quiz from this training content:\n\n${body}` }],
        }),
      })
      const data = await res.json()
      const raw  = (data.content?.[0]?.text ?? '').replace(/```json?|```/g, '').trim()
      setQs(JSON.parse(raw))
    } catch(e) {
      setErr('Quiz generation failed. Check your Anthropic API key in .env.')
    } finally { setLoading(false) }
  }, [sop.id])

  useEffect(() => { buildQuiz() }, [buildQuiz])

  const handleFinish = async () => {
    if (!qs) return
    const score = qs.filter((q, i) => ans[i] === q.ans).length
    const pct   = Math.round(score / qs.length * 100)
    setFinished(true)
    // Persist score to training_assignment if one exists
    await supabase.from('training_assignments')
      .update({ completed_at: new Date().toISOString(), quiz_score: pct })
      .eq('sop_id', sop.id)
      .eq('assigned_to', profile.id)
    onComplete?.(pct)
  }

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'50vh', gap:16 }}>
      <div style={{ width:40, height:40, borderRadius:'50%',
        border:`3px solid ${useTheme().T.bg4}`, borderTop:`3px solid ${useTheme().T.amber}`,
        animation:'pb-spin .8s linear infinite' }}/>
      <div style={{ fontSize:14, color:useTheme().T.t3 }}>Generating quiz…</div>
    </div>
  )

  if (err) return (
    <div style={{ padding:32, textAlign:'center', display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:13, color:T.red }}>{err}</div>
      <Btn v="amber" onClick={buildQuiz}>Retry</Btn>
    </div>
  )

  if (!qs) return null

  if (finished) {
    const score = qs.filter((q, i) => ans[i] === q.ans).length
    const pct   = Math.round(score / qs.length * 100)
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'
    return (
      <div style={{ padding:'20px 16px 100px' }}>
        <div style={{ textAlign:'center', padding:'32px 0 24px' }}>
          <div style={{ fontSize:56, marginBottom:12 }}>{emoji}</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:34, fontWeight:900,
            letterSpacing:'-1px', color:pct>=80?T.lime:pct>=60?T.amber:T.red }}>{pct}%</div>
          <div style={{ fontSize:15, color:T.t2, marginTop:4 }}>{score} of {qs.length} correct</div>
          {pct < 80 && <div style={{ fontSize:13, color:T.amber, marginTop:8 }}>
            Review the SOP and retake to hit 80%+
          </div>}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
          {qs.map((q, i) => {
            const correct = ans[i] === q.ans
            return (
              <div key={i} style={{ background:correct?T.limeLo:T.redLo,
                border:`1.5px solid ${correct?T.limeBd:T.redBd}`, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:10 }}>{i+1}. {q.q}</div>
                {q.opts.map((o, oi) => (
                  <div key={oi} style={{ fontSize:13, marginBottom:3, display:'flex', gap:8,
                    color: oi===q.ans?T.lime : oi===ans[i]&&!correct?T.red : T.t4,
                    fontWeight: oi===q.ans?700:400 }}>
                    <span>{oi===q.ans?'✓':oi===ans[i]&&!correct?'✗':'○'}</span>
                    <span>{o}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <Btn v="ghost" style={{ flex:1 }}
            onClick={() => { setAns({}); setCur(0); setFinished(false) }}>Retake</Btn>
          <Btn v="amber" style={{ flex:1 }} onClick={onBack}>Done ✓</Btn>
        </div>
      </div>
    )
  }

  const q = qs[cur]
  return (
    <div style={{ padding:'20px 16px 100px' }}>
      {/* Progress */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ fontSize:13, color:T.t3, fontWeight:600 }}>{cur+1} / {qs.length}</div>
        <div style={{ flex:1, height:5, background:T.bg4, borderRadius:99, margin:'0 14px', overflow:'hidden' }}>
          <div style={{ width:`${(cur/qs.length)*100}%`, height:'100%', background:T.amber, borderRadius:99, transition:'width .4s' }}/>
        </div>
        <div style={{ fontSize:13, color:T.amber, fontWeight:700 }}>{Math.round(cur/qs.length*100)}%</div>
      </div>

      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:T.t1,
        lineHeight:1.35, marginBottom:28, letterSpacing:'-0.4px' }}>
        {q.q}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
        {q.opts.map((opt, oi) => {
          const sel = ans[cur] === oi
          return (
            <button key={oi} onClick={() => setAns(p => ({ ...p, [cur]: oi }))}
              style={{ display:'flex', alignItems:'center', gap:14, padding:'16px',
                borderRadius:12, textAlign:'left', cursor:'pointer', transition:'all .15s',
                WebkitTapHighlightColor:'transparent', fontFamily:'inherit',
                background:sel?T.amberLo:T.bg2, border:`1.5px solid ${sel?T.amber:T.line}` }}>
              <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, transition:'all .15s',
                background:sel?T.amber:T.bg4, border:`2px solid ${sel?T.amber:T.line2}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, fontWeight:800, color:sel?(T.mode==='dark'?'#0A0B09':'#fff'):T.t3 }}>
                {String.fromCharCode(65+oi)}
              </div>
              <span style={{ fontSize:15, fontWeight:sel?700:400, color:sel?T.amber:T.t1, lineHeight:1.35 }}>{opt}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display:'flex', gap:10 }}>
        {cur > 0 && <Btn v="ghost" style={{ flex:1 }} onClick={() => setCur(p=>p-1)}>← Back</Btn>}
        <button onClick={() => cur < qs.length-1 ? setCur(p=>p+1) : handleFinish()}
          disabled={ans[cur]===undefined}
          style={{ flex:2, padding:'15px', borderRadius:10, border:'none',
            background:ans[cur]!==undefined?T.amber:T.bg4,
            color:ans[cur]!==undefined?(T.mode==='dark'?'#0A0B09':'#fff'):T.t4,
            fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:16,
            cursor:ans[cur]!==undefined?'pointer':'not-allowed', transition:'all .2s' }}>
          {cur < qs.length-1 ? 'Next →' : 'Submit Quiz ✓'}
        </button>
      </div>
    </div>
  )
}

// ── SOP detail view ────────────────────────────────────────────────────────────
function SopDetail({ sop, assignment, onBack }) {
  const { T }         = useTheme()
  const [vMode, setVMode] = useState('read') // read | glance | quiz
  const [lastScore, setLastScore] = useState(assignment?.quiz_score ?? null)

  if (vMode === 'quiz') return (
    <div>
      <div style={{ position:'sticky', top:0, zIndex:20, background:T.bg1,
        borderBottom:`1px solid ${T.line}`, padding:'12px 16px',
        display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => setVMode('read')}
          style={{ width:40, height:40, borderRadius:10, background:T.bg3, border:`1px solid ${T.line}`,
            color:T.t2, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900, color:T.t1 }}>Quiz</div>
          <div style={{ fontSize:12, color:T.t3 }}>{sop.title}</div>
        </div>
      </div>
      <QuizView sop={sop} onBack={() => setVMode('read')} onComplete={s => setLastScore(s)} />
    </div>
  )

  return (
    <div>
      {/* Sticky header */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:T.bg1, borderBottom:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
          <button onClick={onBack}
            style={{ width:40, height:40, borderRadius:10, background:T.bg3, border:`1px solid ${T.line}`,
              color:T.t2, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900, color:T.t1 }}>
              {sop.emoji} {sop.title}
            </div>
            <div style={{ fontSize:12, color:T.t3 }}>{sop.read_minutes} min read · {sop.category}</div>
          </div>
          <button onClick={() => setVMode('quiz')}
            style={{ padding:'10px 16px', borderRadius:10, background:T.amber, border:'none',
              color:T.mode==='dark'?'#0A0B09':'#fff', fontFamily:'inherit',
              fontWeight:800, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
            {lastScore !== null ? `Retake (${lastScore}%)` : 'Take Quiz →'}
          </button>
        </div>
        {/* View mode toggle */}
        <div style={{ padding:'0 16px 12px', display:'flex', gap:8 }}>
          {[{id:'read',label:'📖 Full Read'},{id:'glance',label:'⚡ At a Glance'}].map(v => (
            <button key={v.id} onClick={() => setVMode(v.id)}
              style={{ padding:'8px 16px', borderRadius:8, fontFamily:'inherit',
                fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s',
                border:`1.5px solid ${vMode===v.id?T.amber:T.line}`,
                background:vMode===v.id?T.amberLo:T.bg3,
                color:vMode===v.id?T.amber:T.t3 }}>
              {v.label}
            </button>
          ))}
        </div>
        {lastScore !== null && (
          <div style={{ margin:'0 16px 12px', padding:'8px 14px', background:lastScore>=80?T.limeLo:T.yellowDim??T.amberLo,
            border:`1px solid ${lastScore>=80?T.limeBd:T.amberBd}`, borderRadius:8, fontSize:12,
            color:lastScore>=80?T.lime:T.amber, fontWeight:600 }}>
            {lastScore>=80 ? `✓ Passed with ${lastScore}%` : `Last score: ${lastScore}% — need 80% to pass`}
          </div>
        )}
      </div>

      <div style={{ padding:'16px 16px 100px' }}>
        {vMode === 'read' && (sop.sections ?? []).map((sec, i) => (
          <div key={i} style={{ marginBottom:24 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800,
              color:T.amber, letterSpacing:'-0.3px', marginBottom:10 }}>
              {sec.title}
            </div>
            <div style={{ fontSize:15, color:T.t2, lineHeight:1.75, whiteSpace:'pre-line' }}>
              {sec.body}
            </div>
          </div>
        ))}

        {vMode === 'glance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {(sop.sections ?? []).map((sec, i) => (
              <div key={i} style={{ background:T.bg2, border:`1.5px solid ${T.line}`,
                borderLeft:`4px solid ${T.amber}`, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:13, fontWeight:800, color:T.amber, marginBottom:8 }}>{sec.title}</div>
                <div style={{ fontSize:13, color:T.t3, lineHeight:1.65, whiteSpace:'pre-line' }}>
                  {sec.body.split('\n').filter(l=>l.trim()).slice(0,5).join('\n')}
                </div>
              </div>
            ))}
            <div style={{ background:T.amberLo, border:`1px solid ${T.amberBd}`,
              borderRadius:12, padding:'16px', textAlign:'center' }}>
              <div style={{ fontSize:13, color:T.amber, fontWeight:700, marginBottom:10 }}>
                Ready to test your knowledge?
              </div>
              <Btn v="amber" onClick={() => setVMode('quiz')}>Take the Quiz →</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Training page ──────────────────────────────────────────────────────────────
export default function Training() {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const [sops,        setSops]        = useState([])
  const [assignments, setAssignments] = useState({}) // { [sopId]: assignment }
  const [loading,     setLoading]     = useState(true)
  const [active,      setActive]      = useState(null)
  const [filter,      setFilter]      = useState('all') // all | assigned | completed

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [{ data: sopData }, { data: asgData }] = await Promise.all([
        supabase.from('sops').select('*').eq('org_id', profile.org_id).eq('is_active', true).order('created_at'),
        supabase.from('training_assignments').select('*').eq('assigned_to', profile.id),
      ])
      setSops(sopData ?? [])
      const asgMap = {}
      ;(asgData ?? []).forEach(a => { asgMap[a.sop_id] = a })
      setAssignments(asgMap)
      setLoading(false)
    }
    load()
  }, [profile?.id])

  if (active) return (
    <SopDetail sop={active} assignment={assignments[active.id]}
      onBack={() => setActive(null)} />
  )

  if (loading) return <Spinner />

  const assignedIds  = Object.keys(assignments)
  const completedIds = Object.values(assignments).filter(a => a.completed_at).map(a => a.sop_id)

  const visible = sops.filter(s => {
    if (filter === 'assigned')  return assignedIds.includes(s.id) && !completedIds.includes(s.id)
    if (filter === 'completed') return completedIds.includes(s.id)
    return true
  })

  return (
    <div style={{ padding:'20px 16px' }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:900,
        color:T.t1, letterSpacing:'-0.8px', marginBottom:4 }}>Training</div>
      <div style={{ fontSize:14, color:T.t3, marginBottom:20 }}>SOPs, guides & quizzes</div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[{id:'all',label:'All'},{id:'assigned',label:'Assigned'},{id:'completed',label:'Completed'}].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding:'8px 16px', borderRadius:8, fontFamily:'inherit',
              fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s',
              border:`1.5px solid ${filter===f.id?T.amber:T.line}`,
              background:filter===f.id?T.amberLo:T.bg3,
              color:filter===f.id?T.amber:T.t3 }}>
            {f.label}
            {f.id==='assigned' && assignedIds.length>completedIds.length &&
              <span style={{ marginLeft:6, background:T.amber, color:T.mode==='dark'?'#0A0B09':'#fff',
                borderRadius:99, padding:'1px 7px', fontSize:10 }}>
                {assignedIds.length-completedIds.length}
              </span>}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <Empty icon="📖" message="Nothing here yet"
          sub={filter==='assigned'?'No pending training assignments.':'No SOPs have been created yet.'} />
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {visible.map(sop => {
          const asg       = assignments[sop.id]
          const isDone    = !!asg?.completed_at
          const isAssigned= !!asg && !isDone
          const overdue   = isAssigned && asg.due_date && new Date(asg.due_date) < new Date()

          return (
            <div key={sop.id} style={{ background:T.bg2, border:`1.5px solid ${overdue?T.redBd:T.line}`,
              borderRadius:14, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'18px 18px' }}>
                <div style={{ width:54, height:54, borderRadius:12, background:T.amberLo,
                  border:`1.5px solid ${T.amberBd}`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:26, flexShrink:0 }}>
                  {isDone ? '✅' : sop.emoji}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900,
                    color:T.t1, letterSpacing:'-0.3px' }}>{sop.title}</div>
                  <div style={{ fontSize:12, color:T.t3, marginTop:3 }}>
                    {sop.read_minutes} min · {sop.category}
                  </div>
                  {isAssigned && (
                    <div style={{ fontSize:12, color:overdue?T.red:T.amber, marginTop:3, fontWeight:600 }}>
                      {overdue ? '⚠ Overdue' : '📌 Assigned'}
                      {asg.due_date && ` · Due ${new Date(asg.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`}
                    </div>
                  )}
                  {isDone && asg.quiz_score !== null && (
                    <div style={{ fontSize:12, color:T.lime, marginTop:3, fontWeight:600 }}>
                      ✓ Completed · Quiz: {asg.quiz_score}%
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', borderTop:`1px solid ${T.line}` }}>
                <button onClick={() => setActive(sop)}
                  style={{ flex:2, padding:'13px', background:T.bg3, border:'none',
                    borderRight:`1px solid ${T.line}`, color:T.t2, fontFamily:'inherit',
                    fontWeight:700, fontSize:14, cursor:'pointer' }}>
                  {isDone ? 'Review SOP' : 'Read SOP'}
                </button>
                <button onClick={() => { setActive(sop) }}
                  style={{ flex:1, padding:'13px', background:T.amberLo, border:'none',
                    color:T.amber, fontFamily:'inherit', fontWeight:800, fontSize:14, cursor:'pointer' }}>
                  Quiz →
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
