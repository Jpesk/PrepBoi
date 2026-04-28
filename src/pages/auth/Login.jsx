import { useState } from 'react'
import { useAuth }  from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Input } from '../../components/ui'

export default function Login() {
  const { signIn } = useAuth()
  const { T, mode } = useTheme()
  const [email, setEmail]     = useState('')
  const [pw,    setPw]        = useState('')
  const [err,   setErr]       = useState('')
  const [busy,  setBusy]      = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await signIn(email, pw)
    if (error) { setErr(error.message); setBusy(false) }
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center',
      justifyContent:'center', background:T.bg0, padding:24, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800;900&family=DM+Sans:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ width:'100%', maxWidth:380 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:36, color:T.t1, letterSpacing:'-1px' }}>prep</span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:36, color:T.amber, letterSpacing:'-1px' }}>boi</span>
          </div>
          <div style={{ fontSize:12, color:T.t4, letterSpacing:'2.5px', textTransform:'uppercase', marginTop:4 }}>
            Kitchen Ops
          </div>
        </div>

        {/* Card */}
        <div style={{ background:T.bg2, border:`1.5px solid ${T.line}`, borderRadius:16, padding:28 }}>
          <div style={{ fontSize:18, fontWeight:800, color:T.t1, marginBottom:24, fontFamily:"'Syne',sans-serif" }}>
            Sign in to your account
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Input label="Work Email" type="email" value={email}
              onChange={e=>setEmail(e.target.value)} placeholder="you@restaurant.com" required />
            <Input label="Password" type="password" value={pw}
              onChange={e=>setPw(e.target.value)} placeholder="••••••••" required />
            {err && <div style={{ fontSize:13, color:T.red, background:T.redLo, border:`1px solid ${T.redBd}`,
              borderRadius:8, padding:'10px 14px' }}>{err}</div>}
            <Btn v="amber" sz="lg" type="submit" disabled={busy}
              style={{ width:'100%', marginTop:4 }}>
              {busy ? 'Signing in…' : 'Sign In →'}
            </Btn>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:T.t4 }}>
          Don't have an account? Ask your manager to create one for you.
        </div>
      </div>
    </div>
  )
}
