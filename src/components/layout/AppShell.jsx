import { useState } from 'react'
import { useTheme }         from '../../hooks/useTheme'
import { useAuth }          from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { roleColor, ROLE_META } from '../../lib/theme'

// ── Notification panel ────────────────────────────────────────────────────────
function NotifPanel({ notifications, unread, markRead, markAllRead, onClose }) {
  const { T } = useTheme()
  const typeIcon = { task_submitted:'✅', training_assigned:'📖', system:'ℹ️' }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ position:'absolute', top:58, right:8, width:340, maxWidth:'94vw',
        background:T.bg2, border:`1.5px solid ${T.line}`, borderRadius:14,
        boxShadow:'0 8px 32px rgba(0,0,0,.5)', overflow:'hidden', maxHeight:'80vh',
        display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 16px', borderBottom:`1px solid ${T.line}`, flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:800, color:T.t1 }}>Notifications {unread>0&&`(${unread})`}</span>
          {unread > 0 && <button onClick={markAllRead}
            style={{ fontSize:12, color:T.amber, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            Mark all read
          </button>}
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {notifications.length === 0 && (
            <div style={{ padding:32, textAlign:'center', color:T.t4, fontSize:13 }}>No notifications yet</div>
          )}
          {notifications.map(n => (
            <div key={n.id} onClick={()=>markRead(n.id)}
              style={{ padding:'13px 16px', borderBottom:`1px solid ${T.line}`, cursor:'pointer',
                background:n.is_read ? 'transparent' : T.amberLo, transition:'background .15s' }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{typeIcon[n.type]??'🔔'}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:n.is_read?400:700, color:n.is_read?T.t2:T.t1, marginBottom:3 }}>{n.title}</div>
                  <div style={{ fontSize:12, color:T.t3, lineHeight:1.5 }}>{n.body}</div>
                  <div style={{ fontSize:11, color:T.t4, marginTop:4 }}>
                    {new Date(n.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
                  </div>
                </div>
                {!n.is_read && <div style={{ width:7,height:7,borderRadius:'50%',background:T.amber,flexShrink:0,marginTop:4 }}/>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell({ tab, setTab, children }) {
  const { T, toggle, mode } = useTheme()
  const { profile, signOut, isShiftLeader, isSuperUser } = useAuth()
  const { notifications, unread, markRead, markAllRead } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)

  // Only super_users and shift_leaders get the notification bell
  const showBell = isShiftLeader

  const TABS = [
    { id:'tasks',    emoji:'✅', label:'Tasks'    },
    { id:'training', emoji:'📖', label:'Training' },
    { id:'recipes',  emoji:'🍳', label:'Recipes'  },
    ...(isShiftLeader ? [{ id:'dashboard', emoji:'📊', label:'Dashboard' }] : []),
    ...(isSuperUser   ? [{ id:'admin',     emoji:'⚙️', label:'Admin'     }] : []),
  ]

  const rc = profile ? roleColor(T, profile.role) : { fg:T.t3, bg:T.bg4, bd:T.line2 }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg0};overscroll-behavior:none;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${T.line2};border-radius:99px;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        select option{background:${T.bg3};}
        @keyframes pb-spin{to{transform:rotate(360deg);}}
        @keyframes pb-slide-up{from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
      `}</style>

      <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bg0, color:T.t1,
        minHeight:'100dvh', maxWidth:430, margin:'0 auto',
        display:'flex', flexDirection:'column',
        boxShadow: mode==='dark'?'0 0 80px rgba(0,0,0,.9)':'0 0 40px rgba(0,0,0,.12)',
        transition:'background .25s' }}>

        {/* ── Top bar ── */}
        <div style={{ position:'sticky', top:0, zIndex:50, background:T.bg1,
          borderBottom:`1px solid ${T.line}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 14px' }}>

            {/* Wordmark */}
            <div style={{ display:'flex', alignItems:'baseline', gap:1 }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, color:T.t1, letterSpacing:'-0.5px' }}>prep</span>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, color:T.amber, letterSpacing:'-0.5px' }}>boi</span>
              {profile?.organizations?.name && (
                <span style={{ fontSize:10, color:T.t4, marginLeft:8, letterSpacing:'1.5px', textTransform:'uppercase' }}>
                  {profile.organizations.name}
                </span>
              )}
            </div>

            {/* Right controls */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* Location pill */}
              {profile?.locations?.name && (
                <div style={{ display:'flex', alignItems:'center', gap:5, background:T.bg3,
                  border:`1px solid ${T.line}`, borderRadius:8, padding:'5px 10px' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:T.lime }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:T.t2 }}>{profile.locations.name}</span>
                </div>
              )}

              {/* Bell */}
              {showBell && (
                <button onClick={()=>setNotifOpen(o=>!o)}
                  style={{ position:'relative', width:36, height:36, borderRadius:9,
                    background:T.bg3, border:`1px solid ${T.line}`, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                  🔔
                  {unread > 0 && (
                    <div style={{ position:'absolute', top:4, right:4, width:14, height:14,
                      borderRadius:'50%', background:T.red, display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff', border:`2px solid ${T.bg1}` }}>
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </button>
              )}

              {/* Theme toggle */}
              <button onClick={toggle}
                style={{ width:36, height:36, borderRadius:9, background:T.bg3,
                  border:`1px solid ${T.line}`, cursor:'pointer', fontSize:17,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                {mode==='dark'?'☀️':'🌙'}
              </button>

              {/* Avatar + role */}
              {profile && (
                <button onClick={signOut}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'none',
                    border:'none', cursor:'pointer', padding:0 }}
                  title="Tap to sign out">
                  <div style={{ width:34, height:34, borderRadius:'50%', background:rc.bg,
                    border:`2px solid ${rc.fg}`, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:12, fontWeight:800, color:rc.fg }}>
                    {profile.avatar_initials}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Page content ── */}
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
          {children}
        </div>

        {/* ── Bottom tab bar ── */}
        <div style={{ position:'sticky', bottom:0, zIndex:50, background:T.bg1,
          borderTop:`1px solid ${T.line}`, display:'flex', flexShrink:0 }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ flex:1, padding:'11px 4px 9px', border:'none', cursor:'pointer',
                  background:'transparent', display:'flex', flexDirection:'column',
                  alignItems:'center', gap:4, position:'relative',
                  WebkitTapHighlightColor:'transparent', fontFamily:'inherit' }}>
                {active && <div style={{ position:'absolute', top:0, left:'50%',
                  transform:'translateX(-50%)', width:28, height:2.5, background:T.amber,
                  borderRadius:'0 0 3px 3px' }}/>}
                <span style={{ fontSize:20, filter:active?'none':'grayscale(1) opacity(.4)',
                  transition:'filter .15s' }}>{t.emoji}</span>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.5px',
                  textTransform:'uppercase', color:active?T.amber:T.t4,
                  transition:'color .15s' }}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notification panel */}
      {notifOpen && (
        <NotifPanel notifications={notifications} unread={unread}
          markRead={markRead} markAllRead={markAllRead}
          onClose={()=>setNotifOpen(false)}/>
      )}
    </>
  )
}
