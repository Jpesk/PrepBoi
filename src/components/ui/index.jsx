// Shared primitive components — all theme-aware via useTheme()
import { useTheme } from '../../hooks/useTheme'

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, v = 'ghost', sz = 'md', onClick, disabled, style = {}, type = 'button' }) {
  const { T } = useTheme()
  const sizes = {
    xs: { padding:'3px 10px',  fontSize:11, borderRadius:6  },
    sm: { padding:'7px 15px',  fontSize:13, borderRadius:8  },
    md: { padding:'11px 22px', fontSize:14, borderRadius:9  },
    lg: { padding:'14px 28px', fontSize:15, borderRadius:10 },
  }
  const vars = {
    amber:  { background:T.amber,  color: T.mode==='dark'?'#0A0B09':'#fff', border:'none' },
    lime:   { background:T.lime,   color: T.mode==='dark'?'#0A0B09':'#fff', border:'none' },
    red:    { background:T.red,    color:'#fff', border:'none' },
    sky:    { background:T.sky,    color: T.mode==='dark'?'#0A0B09':'#fff', border:'none' },
    ghost:  { background:T.bg3,    color:T.t2,   border:`1px solid ${T.line}` },
    outline:{ background:'transparent', color:T.amber, border:`1px solid ${T.amber}` },
    danger: { background:T.redLo,  color:T.red,  border:`1px solid ${T.redBd}` },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ fontFamily:'inherit', fontWeight:700, cursor:disabled?'not-allowed':'pointer',
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
        transition:'all .15s', opacity:disabled?.45:1, WebkitTapHighlightColor:'transparent',
        ...sizes[sz], ...(vars[v]??vars.ghost), ...style }}>
      {children}
    </button>
  )
}

// ── Text Input ────────────────────────────────────────────────────────────────
export function Input({ label, error, style = {}, ...p }) {
  const { T } = useTheme()
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {label && <span style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase', letterSpacing:'1px' }}>{label}</span>}
      <input style={{ background:T.bg3, border:`1.5px solid ${error?T.red:T.line}`,
        borderRadius:9, color:T.t1, padding:'12px 14px', fontSize:14, fontFamily:'inherit',
        outline:'none', width:'100%', transition:'border-color .15s', ...style }} {...p} />
      {error && <span style={{ fontSize:12, color:T.red }}>{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, children, style = {}, ...p }) {
  const { T } = useTheme()
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {label && <span style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase', letterSpacing:'1px' }}>{label}</span>}
      <select style={{ background:T.bg3, border:`1.5px solid ${T.line}`, borderRadius:9,
        color:T.t1, padding:'12px 14px', fontSize:14, fontFamily:'inherit', outline:'none',
        width:'100%', ...style }} {...p}>
        {children}
      </select>
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, style = {}, ...p }) {
  const { T } = useTheme()
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {label && <span style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:'uppercase', letterSpacing:'1px' }}>{label}</span>}
      <textarea style={{ background:T.bg3, border:`1.5px solid ${T.line}`, borderRadius:9,
        color:T.t1, padding:'12px 14px', fontSize:14, fontFamily:'inherit', outline:'none',
        width:'100%', resize:'vertical', lineHeight:1.6, ...style }} {...p} />
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  const { T } = useTheme()
  return (
    <div onClick={onClick}
      style={{ background:T.bg2, border:`1.5px solid ${T.line}`, borderRadius:12,
        padding:16, ...style }}>
      {children}
    </div>
  )
}

// ── Pill / Badge ──────────────────────────────────────────────────────────────
export function Pill({ children, fg, bg, bd, style = {} }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:.4,
      color:fg, background:bg, border:`1px solid ${bd}`, ...style }}>
      {children}
    </span>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  const { T } = useTheme()
  return (
    <div style={{ fontSize:10, fontWeight:800, color:T.t4, textTransform:'uppercase',
      letterSpacing:'1.2px', marginBottom:8 }}>
      {children}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  const { T } = useTheme()
  return <div style={{ height:1, background:T.line, margin:'8px 0' }} />
}

// ── Progress ring ─────────────────────────────────────────────────────────────
export function Ring({ pct, size = 44, color }) {
  const { T } = useTheme()
  const r = size / 2 - 4, c = 2 * Math.PI * r
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}
        style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.bg5} strokeWidth={3.5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={c} strokeDashoffset={c*(1-pct/100)}
          style={{ transition:'stroke-dashoffset .4s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:size<40?9:10, fontWeight:800, color }}>
        {pct}%
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 32 }) {
  const { T } = useTheme()
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
      <div style={{ width:size, height:size, borderRadius:'50%',
        border:`3px solid ${T.bg4}`, borderTop:`3px solid ${T.amber}`,
        animation:'pb-spin .8s linear infinite' }}/>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', message, sub }) {
  const { T } = useTheme()
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'56px 24px', gap:10, textAlign:'center' }}>
      <div style={{ fontSize:48 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:700, color:T.t2 }}>{message}</div>
      {sub && <div style={{ fontSize:13, color:T.t4, maxWidth:260, lineHeight:1.5 }}>{sub}</div>}
    </div>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export function Modal({ children, onClose, title, width = 460 }) {
  const { T } = useTheme()
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)',
      zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center',
      padding:'0 0 0' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:width, background:T.bg1,
        borderRadius:'16px 16px 0 0', border:`1px solid ${T.line}`,
        borderBottom:'none', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:`1px solid ${T.line}`, flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:800, color:T.t1, fontFamily:"'Syne',sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.t3,
            fontSize:22, cursor:'pointer', padding:'2px 6px', fontFamily:'inherit' }}>×</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Toast / snackbar ──────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onDone }) {
  const { T } = useTheme()
  const colors = { success:T.lime, error:T.red, info:T.sky }
  return (
    <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
      zIndex:300, background:T.bg2, border:`1.5px solid ${colors[type]??T.lime}`,
      borderRadius:10, padding:'12px 20px', fontSize:14, fontWeight:600,
      color:colors[type]??T.lime, boxShadow:'0 4px 20px rgba(0,0,0,.5)',
      animation:'pb-slide-up .2s ease', whiteSpace:'nowrap', maxWidth:'90vw' }}
      onClick={onDone}>
      {type==='success'?'✓ ':type==='error'?'⚠ ':'ℹ '}{message}
    </div>
  )
}

// ── Signature pad ─────────────────────────────────────────────────────────────
import { useRef, useState } from 'react'

export function SigPad({ value, onChange }) {
  const { T } = useTheme()
  const ref    = useRef(null)
  const down   = useRef(false)
  const [has, setHas] = useState(!!value)

  const xy = (e, c) => {
    const r = c.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return { x:(cx-r.left)*(c.width/r.width), y:(cy-r.top)*(c.height/r.height) }
  }
  const start = e => { e.preventDefault(); const c=ref.current, ctx=c.getContext('2d'), p=xy(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); down.current=true }
  const move  = e => {
    if (!down.current) return; e.preventDefault()
    const c=ref.current, ctx=c.getContext('2d'), p=xy(e,c)
    ctx.strokeStyle=T.amber; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'
    ctx.lineTo(p.x,p.y); ctx.stroke(); setHas(true)
  }
  const end = () => {
    if (!down.current) return; down.current=false
    if (has) onChange(ref.current.toDataURL())
  }
  const clear = () => { ref.current.getContext('2d').clearRect(0,0,700,100); setHas(false); onChange(null) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ position:'relative', borderRadius:9, overflow:'hidden',
        border:`1.5px solid ${has?T.amber:T.line}`, background:T.bg3, transition:'border-color .2s' }}>
        <canvas ref={ref} width={700} height={100}
          style={{ display:'block', width:'100%', height:90, cursor:'crosshair', touchAction:'none' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
        {!has && <div style={{ position:'absolute', inset:0, display:'flex',
          alignItems:'center', justifyContent:'center', pointerEvents:'none',
          color:T.t4, fontSize:14 }}>Sign here ✍</div>}
        {has  && <div style={{ position:'absolute', bottom:6, right:10, fontSize:10,
          fontWeight:800, color:T.amber, letterSpacing:'1px' }}>✓ SIGNED</div>}
      </div>
      {has && <button onClick={clear} style={{ alignSelf:'flex-end', fontSize:12, color:T.red,
        background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
        ✕ Clear
      </button>}
    </div>
  )
}
