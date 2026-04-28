import { useState, useEffect, useRef } from 'react'
import { useTheme }  from '../../hooks/useTheme'
import { useAuth }   from '../../hooks/useAuth'
import { supabase }  from '../../lib/supabase'
import { roleColor, ROLE_META, catColor } from '../../lib/theme'
import { Btn, Input, Select, Textarea, Modal, Pill, Spinner, Empty, Toast, SigPad } from '../../components/ui'

// ── Users panel ────────────────────────────────────────────────────────────────
function UsersPanel() {
  const { T }         = useTheme()
  const { profile, createUser } = useAuth()
  const [users, setUsers]     = useState([])
  const [locs,  setLocs]      = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState({ email:'', password:'', full_name:'', role:'employee', location_id:'' })
  const [busy,    setBusy]    = useState(false)
  const [toast,   setToast]   = useState(null)

  const load = async () => {
    const [{ data: u }, { data: l }] = await Promise.all([
      supabase.from('profiles').select('*').eq('org_id', profile.org_id).order('full_name'),
      supabase.from('locations').select('*').eq('org_id', profile.org_id).order('name'),
    ])
    setUsers(u ?? []); setLocs(l ?? []); setLoading(false)
  }

  useEffect(() => { if (profile) load() }, [profile?.id])

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.full_name) return
    setBusy(true)
    const { error } = await createUser(form.email, form.password, form.full_name, form.role, profile.org_id, form.location_id || null)
    setBusy(false)
    if (error) { setToast({ msg: error.message, type:'error' }); return }
    setModal(false)
    setForm({ email:'', password:'', full_name:'', role:'employee', location_id:'' })
    setToast({ msg:`${form.full_name} created!`, type:'success' })
    setTimeout(load, 1000)
  }

  const changeRole = async (userId, role) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(p => p.map(u => u.id===userId ? { ...u, role } : u))
  }

  const toggleActive = async (userId, isActive) => {
    await supabase.from('profiles').update({ is_active: !isActive }).eq('id', userId)
    setUsers(p => p.map(u => u.id===userId ? { ...u, is_active: !isActive } : u))
  }

  if (loading) return <Spinner />

  return (
    <div style={{ padding:'0 0 80px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontSize:14, color:T.t3 }}>{users.length} team member{users.length!==1?'s':''}</div>
        <Btn v="amber" sz="sm" onClick={() => setModal(true)}>+ Add User</Btn>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {users.map(u => {
          const rc = roleColor(T, u.role)
          return (
            <div key={u.id} style={{ background:T.bg2, border:`1.5px solid ${T.line}`,
              borderRadius:12, padding:'14px 16px', opacity:u.is_active?1:.5, transition:'opacity .2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:rc.bg,
                  border:`2px solid ${rc.fg}`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:12, fontWeight:800, color:rc.fg, flexShrink:0 }}>
                  {u.avatar_initials}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{u.full_name}</div>
                  <div style={{ fontSize:12, color:T.t3 }}>{ROLE_META[u.role]?.label}</div>
                </div>
                {/* Quick role change — disabled for own account */}
                {u.id !== profile.id && (
                  <select value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}
                    style={{ background:T.bg3, border:`1px solid ${T.line}`, borderRadius:7,
                      color:T.t2, padding:'6px 10px', fontSize:12, fontFamily:'inherit', outline:'none' }}>
                    <option value="employee">Employee</option>
                    <option value="shift_leader">Shift Leader</option>
                    <option value="super_user">Super User</option>
                  </select>
                )}
                {u.id !== profile.id && (
                  <button onClick={() => toggleActive(u.id, u.is_active)}
                    style={{ fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:6,
                      border:`1px solid ${u.is_active?T.redBd:T.limeBd}`,
                      background:u.is_active?T.redLo:T.limeLo,
                      color:u.is_active?T.red:T.lime, cursor:'pointer', fontFamily:'inherit' }}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title="Add Team Member" onClose={() => setModal(false)}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Full Name" value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} placeholder="Jamie Park" />
            <Input label="Work Email" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="jamie@restaurant.com" />
            <Input label="Temporary Password" type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Min 8 characters" />
            <Select label="Role" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
              <option value="employee">Employee</option>
              <option value="shift_leader">Shift Leader</option>
              <option value="super_user">Super User</option>
            </Select>
            {locs.length > 0 && (
              <Select label="Location" value={form.location_id} onChange={e=>setForm(p=>({...p,location_id:e.target.value}))}>
                <option value="">All locations</option>
                {locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            )}
            <Btn v="amber" onClick={handleCreate} disabled={busy} style={{ marginTop:4 }}>
              {busy ? 'Creating…' : 'Create Account →'}
            </Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Checklist builder ─────────────────────────────────────────────────────────
function ChecklistBuilder() {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const [lists,   setLists]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | { ...checklist } | 'new'
  const [toast,   setToast]   = useState(null)

  const load = async () => {
    const { data } = await supabase.from('checklists')
      .select('*').eq('org_id', profile.org_id).order('created_at')
    setLists(data ?? []); setLoading(false)
  }
  useEffect(() => { if (profile) load() }, [profile?.id])

  const newCl = () => setEditing({
    id: null, title:'', emoji:'📋', shift:'ALL', category:'general',
    due_time:'22:00', est_minutes:15,
    schema:{ sections:[{ id:`s${Date.now()}`, title:'Section 1', items:[] }] },
    assigned_roles:['employee','shift_leader'], is_active:true,
  })

  const save = async (cl) => {
    const payload = { ...cl, org_id: profile.org_id, location_id: profile.location_id,
      created_by: profile.id }
    const { error } = cl.id
      ? await supabase.from('checklists').update(payload).eq('id', cl.id)
      : await supabase.from('checklists').insert(payload)
    if (!error) { setEditing(null); load(); setToast({ msg:'Checklist saved!', type:'success' }) }
    else setToast({ msg: error.message, type:'error' })
  }

  const toggle = async (id, current) => {
    await supabase.from('checklists').update({ is_active: !current }).eq('id', id)
    load()
  }

  if (editing !== null) return <ChecklistForm cl={editing} onSave={save} onBack={() => setEditing(null)} />
  if (loading) return <Spinner />

  return (
    <div style={{ padding:'0 0 80px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontSize:14, color:T.t3 }}>{lists.length} checklists</div>
        <Btn v="amber" sz="sm" onClick={newCl}>+ New Checklist</Btn>
      </div>
      {lists.length === 0 && <Empty icon="📋" message="No checklists yet" sub="Create your first checklist for the team." />}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {lists.map(cl => {
          const cc = catColor(T, cl.category)
          return (
            <div key={cl.id} style={{ background:T.bg2, border:`1.5px solid ${T.line}`,
              borderRadius:12, overflow:'hidden', opacity:cl.is_active?1:.5 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
                <div style={{ fontSize:22 }}>{cl.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{cl.title}</div>
                  <div style={{ fontSize:12, color:T.t3 }}>
                    {cl.category} · {cl.shift} · {cl.est_minutes} min
                  </div>
                </div>
                <Pill fg={cc.fg} bg={cc.bg} bd={cc.bd}>{cl.category}</Pill>
                <button onClick={() => setEditing(cl)}
                  style={{ padding:'6px 12px', borderRadius:7, background:T.bg3, border:`1px solid ${T.line}`,
                    color:T.t2, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
                <button onClick={() => toggle(cl.id, cl.is_active)}
                  style={{ padding:'6px 10px', borderRadius:7, fontSize:11, fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', border:'none',
                    background:cl.is_active?T.redLo:T.limeLo,
                    color:cl.is_active?T.red:T.lime }}>
                  {cl.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Simple checklist form ─────────────────────────────────────────────────────
function ChecklistForm({ cl, onSave, onBack }) {
  const { T }   = useTheme()
  const [data, setData] = useState(cl)
  const set = (k,v) => setData(p => ({ ...p, [k]: v }))

  const addSection = () => set('schema', {
    sections: [...(data.schema.sections??[]), { id:`s${Date.now()}`, title:'New Section', items:[] }]
  })

  const addItem = (si) => {
    const secs = [...(data.schema.sections??[])]
    secs[si] = { ...secs[si], items: [...(secs[si].items??[]),
      { id:`i${Date.now()}`, text:'', req:false, trig:null }] }
    set('schema', { sections: secs })
  }

  const setItem = (si, ii, patch) => {
    const secs = JSON.parse(JSON.stringify(data.schema.sections??[]))
    secs[si].items[ii] = { ...secs[si].items[ii], ...patch }
    set('schema', { sections: secs })
  }

  const delItem = (si, ii) => {
    const secs = JSON.parse(JSON.stringify(data.schema.sections??[]))
    secs[si].items.splice(ii, 1)
    set('schema', { sections: secs })
  }

  const TRIG_OPTS = [
    { value:'', label:'No trigger' },
    { value:'note',  label:'Note (text input)' },
    { value:'yn',    label:'Yes/No' },
    { value:'temp',  label:'Temperature + warn' },
    { value:'sig',   label:'Signature' },
  ]

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:T.t3, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:T.t1 }}>
          {data.id ? 'Edit Checklist' : 'New Checklist'}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', gap:10 }}>
          <Input label="Emoji" value={data.emoji} onChange={e=>set('emoji',e.target.value)} style={{ width:72 }} />
          <div style={{ flex:1 }}><Input label="Title" value={data.title} onChange={e=>set('title',e.target.value)} placeholder="PM Closing Checklist" /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Select label="Category" value={data.category} onChange={e=>set('category',e.target.value)}>
            {['opening','closing','safety','general'].map(c=><option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Shift" value={data.shift} onChange={e=>set('shift',e.target.value)}>
            {['ALL','AM','PM','MID'].map(s=><option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Due Time" type="time" value={data.due_time} onChange={e=>set('due_time',e.target.value)} />
          <Input label="Est. Minutes" type="number" value={data.est_minutes} onChange={e=>set('est_minutes',parseInt(e.target.value)||0)} />
        </div>

        {/* Sections */}
        {(data.schema.sections??[]).map((sec,si) => (
          <div key={sec.id} style={{ background:T.bg2, border:`1.5px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'12px 14px', background:T.bg3, borderBottom:`1px solid ${T.line}` }}>
              <input value={sec.title} onChange={e=>{
                const s=[...data.schema.sections]; s[si]={...s[si],title:e.target.value}; set('schema',{sections:s})}}
                style={{ background:'transparent', border:'none', color:T.t1, fontSize:14, fontWeight:800, fontFamily:'inherit', outline:'none', width:'100%' }}
                placeholder="Section title"/>
            </div>
            <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {(sec.items??[]).map((item,ii) => (
                <div key={item.id} style={{ background:T.bg3, borderRadius:8, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input value={item.text} onChange={e=>setItem(si,ii,{text:e.target.value})}
                      style={{ flex:1, background:T.bg4, border:`1px solid ${T.line}`, borderRadius:7,
                        color:T.t1, padding:'8px 10px', fontSize:13, fontFamily:'inherit', outline:'none' }}
                      placeholder="Item text…"/>
                    <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:T.t3, cursor:'pointer', whiteSpace:'nowrap' }}>
                      <input type="checkbox" checked={item.req} onChange={e=>setItem(si,ii,{req:e.target.checked})} style={{ accentColor:T.amber }}/>
                      Req
                    </label>
                    <button onClick={()=>delItem(si,ii)} style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:16, padding:'2px 6px' }}>✕</button>
                  </div>
                  <select value={item.trig?.kind??''} onChange={e=>{
                    const k=e.target.value
                    setItem(si,ii,{ trig: k?{ kind:k, label:'', ...(k==='temp'?{warnAbove:140}:{}), ...(k==='yn'?{yNoteLabel:''}:{}) }:null })}}
                    style={{ background:T.bg4, border:`1px solid ${T.line}`, borderRadius:7, color:T.t2, padding:'6px 10px', fontSize:12, fontFamily:'inherit', outline:'none' }}>
                    {TRIG_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {item.trig?.kind && item.trig.kind !== 'sig' && (
                    <input value={item.trig.label??''} onChange={e=>setItem(si,ii,{trig:{...item.trig,label:e.target.value}})}
                      style={{ background:T.bg4, border:`1px solid ${T.line}`, borderRadius:7,
                        color:T.t1, padding:'7px 10px', fontSize:12, fontFamily:'inherit', outline:'none' }}
                      placeholder="Trigger prompt label…"/>
                  )}
                  {item.trig?.kind === 'temp' && (
                    <input type="number" value={item.trig.warnAbove??''} onChange={e=>setItem(si,ii,{trig:{...item.trig,warnAbove:parseFloat(e.target.value)}})}
                      style={{ background:T.bg4, border:`1px solid ${T.line}`, borderRadius:7,
                        color:T.amber, padding:'7px 10px', fontSize:12, fontFamily:'"DM Mono",monospace', outline:'none', width:120 }}
                      placeholder="Warn above °F"/>
                  )}
                </div>
              ))}
              <button onClick={()=>addItem(si)}
                style={{ padding:'9px', borderRadius:8, background:'transparent', border:`1.5px dashed ${T.line2}`,
                  color:T.t3, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>
                + Add Item
              </button>
            </div>
          </div>
        ))}

        <button onClick={addSection}
          style={{ padding:'12px', borderRadius:10, background:'transparent', border:`1.5px dashed ${T.line2}`,
            color:T.t3, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>
          + Add Section
        </button>

        <Btn v="amber" sz="lg" style={{ marginTop:4 }} onClick={() => onSave(data)}>
          Save Checklist ✓
        </Btn>
      </div>
    </div>
  )
}

// ── SOP builder ────────────────────────────────────────────────────────────────
function SopBuilder() {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const [sops,    setSops]    = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [toast,   setToast]   = useState(null)
  const [assign,  setAssign]  = useState(null) // { sop }

  const load = async () => {
    const { data } = await supabase.from('sops').select('*').eq('org_id', profile.org_id).order('title')
    setSops(data ?? []); setLoading(false)
  }
  useEffect(() => { if (profile) load() }, [profile?.id])

  const newSop = () => setEditing({ id:null, title:'', emoji:'📄', category:'general', read_minutes:5, sections:[{ title:'Section 1', body:'' }] })

  const save = async (sop) => {
    const payload = { ...sop, org_id: profile.org_id, created_by: profile.id }
    const { error } = sop.id
      ? await supabase.from('sops').update(payload).eq('id', sop.id)
      : await supabase.from('sops').insert(payload)
    if (!error) { setEditing(null); load(); setToast({ msg:'SOP saved!', type:'success' }) }
  }

  if (editing !== null) return <SopForm sop={editing} onSave={save} onBack={() => setEditing(null)} />
  if (loading) return <Spinner />

  return (
    <div style={{ padding:'0 0 80px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontSize:14, color:T.t3 }}>{sops.length} SOPs</div>
        <Btn v="amber" sz="sm" onClick={newSop}>+ New SOP</Btn>
      </div>
      {sops.length === 0 && <Empty icon="📄" message="No SOPs yet" sub="Create training content for your team." />}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sops.map(sop => (
          <div key={sop.id} style={{ background:T.bg2, border:`1.5px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
              <div style={{ fontSize:22 }}>{sop.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{sop.title}</div>
                <div style={{ fontSize:12, color:T.t3 }}>{sop.category} · {sop.read_minutes} min</div>
              </div>
              <button onClick={() => setAssign({ sop })}
                style={{ padding:'6px 10px', borderRadius:7, background:T.skyLo, border:`1px solid ${T.skyBd}`,
                  color:T.sky, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Assign</button>
              <button onClick={() => setEditing(sop)}
                style={{ padding:'6px 12px', borderRadius:7, background:T.bg3, border:`1px solid ${T.line}`,
                  color:T.t2, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
            </div>
          </div>
        ))}
      </div>
      {assign && <AssignModal sop={assign.sop} orgId={profile.org_id} onClose={() => setAssign(null)} onDone={() => { setAssign(null); setToast({ msg:'Training assigned!', type:'success' }) }} />}
      {toast  && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

function SopForm({ sop, onSave, onBack }) {
  const { T } = useTheme()
  const [data, setData] = useState(sop)
  const set = (k,v) => setData(p => ({ ...p, [k]: v }))

  const setSection = (i, k, v) => {
    const secs = [...(data.sections??[])]; secs[i] = { ...secs[i], [k]: v }; set('sections', secs)
  }

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:T.t3, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:T.t1 }}>
          {data.id ? 'Edit SOP' : 'New SOP'}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', gap:10 }}>
          <Input label="Emoji" value={data.emoji} onChange={e=>set('emoji',e.target.value)} style={{ width:72 }} />
          <div style={{ flex:1 }}><Input label="Title" value={data.title} onChange={e=>set('title',e.target.value)} placeholder="Cookie Baking Process" /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Input label="Category" value={data.category} onChange={e=>set('category',e.target.value)} placeholder="production" />
          <Input label="Read Minutes" type="number" value={data.read_minutes} onChange={e=>set('read_minutes',parseInt(e.target.value)||1)} />
        </div>
        {(data.sections??[]).map((sec,i) => (
          <div key={i} style={{ background:T.bg2, border:`1.5px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:T.bg3, borderBottom:`1px solid ${T.line}` }}>
              <input value={sec.title} onChange={e=>setSection(i,'title',e.target.value)}
                style={{ background:'transparent', border:'none', color:T.t1, fontSize:14, fontWeight:800, fontFamily:'inherit', outline:'none', width:'100%' }}
                placeholder="Section title"/>
            </div>
            <div style={{ padding:'12px 14px' }}>
              <Textarea rows={5} value={sec.body} onChange={e=>setSection(i,'body',e.target.value)} placeholder="Section content…" />
            </div>
          </div>
        ))}
        <button onClick={() => set('sections', [...(data.sections??[]), { title:'New Section', body:'' }])}
          style={{ padding:'12px', borderRadius:10, background:'transparent', border:`1.5px dashed ${T.line2}`,
            color:T.t3, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
          + Add Section
        </button>
        <Btn v="amber" sz="lg" onClick={() => onSave(data)}>Save SOP ✓</Btn>
      </div>
    </div>
  )
}

// ── Assign modal ────────────────────────────────────────────────────────────────
function AssignModal({ sop, orgId, onClose, onDone }) {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const [users, setUsers]   = useState([])
  const [sel,   setSel]     = useState([])
  const [due,   setDue]     = useState('')
  const [busy,  setBusy]    = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('org_id', orgId).eq('is_active', true).then(({ data }) => setUsers(data??[]))
  }, [orgId])

  const toggle = id => setSel(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id])

  const assign = async () => {
    setBusy(true)
    await Promise.all(sel.map(uid =>
      supabase.from('training_assignments').upsert({
        sop_id: sop.id, org_id: orgId, assigned_to: uid,
        assigned_by: profile.id, due_date: due || null,
      }, { onConflict: 'sop_id,assigned_to' })
    ))
    setBusy(false); onDone()
  }

  return (
    <Modal title={`Assign: ${sop.title}`} onClose={onClose}>
      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
        <Input label="Due Date (optional)" type="date" value={due} onChange={e=>setDue(e.target.value)} />
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {users.map(u => {
            const rc = roleColor(T, u.role)
            const on = sel.includes(u.id)
            return (
              <div key={u.id} onClick={() => toggle(u.id)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10,
                  cursor:'pointer', transition:'all .15s',
                  background:on?T.amberLo:T.bg3, border:`1.5px solid ${on?T.amber:T.line}` }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:rc.bg,
                  border:`2px solid ${rc.fg}`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:11, fontWeight:800, color:rc.fg }}>
                  {u.avatar_initials}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>{u.full_name}</div>
                  <div style={{ fontSize:12, color:T.t3 }}>{ROLE_META[u.role]?.label}</div>
                </div>
                {on && <span style={{ color:T.amber, fontSize:18 }}>✓</span>}
              </div>
            )
          })}
        </div>
        <Btn v="amber" onClick={assign} disabled={busy||sel.length===0} style={{ marginTop:4 }}>
          {busy ? 'Assigning…' : `Assign to ${sel.length} member${sel.length!==1?'s':''}`}
        </Btn>
      </div>
    </Modal>
  )
}

// ── Recipe manager (super_user: create, upload PDF, parse) ─────────────────────
function RecipeManager() {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const fileRef     = useRef(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [toast,   setToast]   = useState(null)

  const load = async () => {
    const { data } = await supabase.from('recipes').select('*').eq('org_id', profile.org_id).order('title')
    setRecipes(data ?? []); setLoading(false)
  }
  useEffect(() => { if (profile) load() }, [profile?.id])

  const newRec = () => setEditing({
    id:null, title:'', category:'general', yield_amount:1, yield_unit:'portions',
    prep_time:'', bake_time:'', temperature:'', ingredients:[], steps:[], notes:'', pdf_storage_path:null,
  })

  const handlePdf = async (file) => {
    if (!file || file.type !== 'application/pdf') return
    setUploading(true)
    // Parse with AI first
    try {
      const b64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file) })
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:1000,
          system:`Parse recipe PDFs. Return ONLY valid JSON: {"title":"","category":"general","yield_amount":0,"yield_unit":"","prep_time":"","bake_time":"","temperature":"","ingredients":[{"id":"a","name":"","amount":0,"unit":""}],"steps":[],"notes":""}. No markdown.`,
          messages:[{ role:'user', content:[{ type:'document', source:{ type:'base64', media_type:'application/pdf', data:b64 } },{ type:'text', text:'Parse this recipe into the JSON format.' }] }],
        }),
      })
      const data = await resp.json()
      const raw  = (data.content?.[0]?.text??'').replace(/```json?|```/g,'').trim()
      const obj  = JSON.parse(raw)
      // Upload PDF to Storage
      const path = `${profile.org_id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('recipe-pdfs').upload(path, file)
      if (!upErr) obj.pdf_storage_path = path
      setEditing({ id:null, ...obj })
    } catch(e) {
      setToast({ msg:'Could not parse PDF — fill in manually', type:'error' })
      setEditing(newRec())
    }
    setUploading(false)
  }

  const save = async (rec) => {
    const payload = { ...rec, org_id: profile.org_id, created_by: profile.id }
    const { error } = rec.id
      ? await supabase.from('recipes').update(payload).eq('id', rec.id)
      : await supabase.from('recipes').insert(payload)
    if (!error) { setEditing(null); load(); setToast({ msg:'Recipe saved!', type:'success' }) }
  }

  if (editing !== null) return <RecipeForm rec={editing} onSave={save} onBack={() => setEditing(null)} />
  if (loading) return <Spinner />

  return (
    <div style={{ padding:'0 0 80px' }}>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <Btn v="ghost" sz="sm" onClick={newRec}>+ New Recipe</Btn>
        <Btn v="amber" sz="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Parsing PDF…' : '📄 Upload PDF'}
        </Btn>
        <input ref={fileRef} type="file" accept="application/pdf" style={{ display:'none' }}
          onChange={e => handlePdf(e.target.files?.[0])} />
      </div>
      {recipes.length === 0 && <Empty icon="🍳" message="No recipes yet" sub="Add recipes manually or upload a PDF." />}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {recipes.map(r => (
          <div key={r.id} style={{ background:T.bg2, border:`1.5px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
              <div style={{ fontSize:22 }}>🍳</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{r.title}</div>
                <div style={{ fontSize:12, color:T.t3 }}>{r.yield_amount} {r.yield_unit} · {r.category}</div>
              </div>
              {r.pdf_storage_path && <Pill fg={T.sky} bg={T.skyLo} bd={T.skyBd}>PDF</Pill>}
              <button onClick={() => setEditing(r)}
                style={{ padding:'6px 12px', borderRadius:7, background:T.bg3, border:`1px solid ${T.line}`,
                  color:T.t2, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

function RecipeForm({ rec, onSave, onBack }) {
  const { T }  = useTheme()
  const [data, setData] = useState({
    ...rec,
    ingredients: rec.ingredients?.length ? rec.ingredients : [{ id:'a', name:'', amount:0, unit:'' }],
    steps: rec.steps?.length ? rec.steps : [''],
  })
  const set = (k,v) => setData(p => ({ ...p, [k]: v }))

  const setIng = (i, k, v) => { const a=[...data.ingredients]; a[i]={...a[i],[k]:v}; set('ingredients',a) }
  const delIng = (i) => set('ingredients', data.ingredients.filter((_,idx)=>idx!==i))
  const addIng = () => set('ingredients', [...data.ingredients, { id:`ing${Date.now()}`, name:'', amount:0, unit:'' }])

  const setStep = (i,v) => { const a=[...data.steps]; a[i]=v; set('steps',a) }
  const delStep = (i) => set('steps', data.steps.filter((_,idx)=>idx!==i))

  return (
    <div style={{ padding:'16px 16px 100px' }}>
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:T.t3, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:T.t1 }}>
          {data.id ? 'Edit Recipe' : 'New Recipe'}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Input label="Title" value={data.title} onChange={e=>set('title',e.target.value)} placeholder="Classic Chocolate Chip Cookie" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Input label="Category" value={data.category} onChange={e=>set('category',e.target.value)} />
          <Input label="Yield Amount" type="number" value={data.yield_amount} onChange={e=>set('yield_amount',parseFloat(e.target.value)||0)} />
          <Input label="Yield Unit" value={data.yield_unit} onChange={e=>set('yield_unit',e.target.value)} placeholder="cookies" />
          <Input label="Temperature" value={data.temperature} onChange={e=>set('temperature',e.target.value)} placeholder="335°F" />
          <Input label="Prep Time" value={data.prep_time} onChange={e=>set('prep_time',e.target.value)} placeholder="20 min" />
          <Input label="Bake Time" value={data.bake_time} onChange={e=>set('bake_time',e.target.value)} placeholder="11 min" />
        </div>

        {/* Ingredients */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Ingredients</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {data.ingredients.map((ing,i) => (
              <div key={ing.id??i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input value={ing.name} onChange={e=>setIng(i,'name',e.target.value)}
                  style={{ flex:3, background:T.bg3, border:`1px solid ${T.line}`, borderRadius:7, color:T.t1, padding:'8px 10px', fontSize:13, fontFamily:'inherit', outline:'none' }} placeholder="Ingredient"/>
                <input type="number" value={ing.amount} onChange={e=>setIng(i,'amount',parseFloat(e.target.value)||0)}
                  style={{ flex:1, background:T.bg3, border:`1px solid ${T.line}`, borderRadius:7, color:T.amber, padding:'8px 10px', fontSize:13, fontFamily:"'DM Mono',monospace", outline:'none' }} placeholder="0"/>
                <input value={ing.unit} onChange={e=>setIng(i,'unit',e.target.value)}
                  style={{ flex:1, background:T.bg3, border:`1px solid ${T.line}`, borderRadius:7, color:T.t2, padding:'8px 10px', fontSize:13, fontFamily:'inherit', outline:'none' }} placeholder="cups"/>
                <button onClick={()=>delIng(i)} style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:16 }}>✕</button>
              </div>
            ))}
            <button onClick={addIng} style={{ padding:'8px', borderRadius:8, background:'transparent', border:`1.5px dashed ${T.line2}`, color:T.t3, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>+ Ingredient</button>
          </div>
        </div>

        {/* Steps */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Method</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {data.steps.map((step,i) => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:T.amberLo, border:`1px solid ${T.amberBd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:T.amber, flexShrink:0, marginTop:8 }}>{i+1}</div>
                <Textarea rows={2} value={step} onChange={e=>setStep(i,e.target.value)} style={{ flex:1 }} />
                <button onClick={()=>delStep(i)} style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:16, marginTop:8 }}>✕</button>
              </div>
            ))}
            <button onClick={()=>set('steps',[...data.steps,''])} style={{ padding:'8px', borderRadius:8, background:'transparent', border:`1.5px dashed ${T.line2}`, color:T.t3, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>+ Step</button>
          </div>
        </div>

        <Textarea label="Chef Notes" rows={3} value={data.notes??''} onChange={e=>set('notes',e.target.value)} placeholder="Tips, substitutions, critical temperatures…" />
        <Btn v="amber" sz="lg" onClick={() => onSave(data)}>Save Recipe ✓</Btn>
      </div>
    </div>
  )
}

// ── Admin page (tabs) ─────────────────────────────────────────────────────────
export default function Admin() {
  const { T }     = useTheme()
  const [tab, setTab] = useState('users')

  const TABS = [
    { id:'users',      label:'👥 Users'      },
    { id:'checklists', label:'✅ Checklists' },
    { id:'training',   label:'📖 Training'   },
    { id:'recipes',    label:'🍳 Recipes'    },
  ]

  return (
    <div>
      <div style={{ position:'sticky', top:0, zIndex:20, background:T.bg1, borderBottom:`1px solid ${T.line}` }}>
        <div style={{ padding:'16px 16px 0' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:900, color:T.t1, letterSpacing:'-0.5px', marginBottom:14 }}>
            Admin ⚙️
          </div>
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:1 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding:'9px 16px', borderRadius:'8px 8px 0 0', fontFamily:'inherit',
                  fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', border:'none',
                  borderBottom:tab===t.id?`2px solid ${T.amber}`:'2px solid transparent',
                  background:tab===t.id?T.amberLo:'transparent',
                  color:tab===t.id?T.amber:T.t3, transition:'all .15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {tab==='users'      && <UsersPanel />}
        {tab==='checklists' && <ChecklistBuilder />}
        {tab==='training'   && <SopBuilder />}
        {tab==='recipes'    && <RecipeManager />}
      </div>
    </div>
  )
}
