import { useState, useEffect } from 'react'
import { useAuth }    from './hooks/useAuth'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import Login          from './pages/auth/Login'
import AppShell       from './components/layout/AppShell'
import Tasks          from './pages/employee/Tasks'
import Training       from './pages/employee/Training'
import Recipes        from './pages/employee/Recipes'
import Dashboard      from './pages/admin/Dashboard'
import Admin          from './pages/admin/Admin'

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0B09',
      gap: 20,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@900&family=DM+Sans:wght@400&display=swap');
        @keyframes pb-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
      `}</style>
      <div>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:32, color:'#F0EBE1', letterSpacing:'-1px' }}>prep</span>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:32, color:'#F59E0B', letterSpacing:'-1px' }}>boi</span>
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #2E332A',
        borderTop: '3px solid #F59E0B',
        animation: 'pb-spin .8s linear infinite',
      }}/>
      <style>{`@keyframes pb-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Inner app — inside ThemeProvider so useTheme() works ─────────────────────
function InnerApp() {
  const { profile, isSuperUser, isShiftLeader, loading } = useAuth()
  const { T } = useTheme()

  // Default tab based on role
  const defaultTab = 'tasks'
  const [tab, setTab] = useState(defaultTab)

  // Reset to tasks if tab becomes inaccessible after role change
  useEffect(() => {
    if (!profile) return
    const adminTabs = ['dashboard', 'admin']
    if (adminTabs.includes(tab) && !isShiftLeader) setTab('tasks')
    if (tab === 'admin' && !isSuperUser) setTab('tasks')
  }, [profile?.role, tab, isShiftLeader, isSuperUser])

  if (loading) return <LoadingScreen />
  if (!profile) return <Login />

  // Role-gated tab renderer
  const renderPage = () => {
    switch (tab) {
      case 'tasks':    return <Tasks />
      case 'training': return <Training />
      case 'recipes':  return <Recipes />
      case 'dashboard':
        if (!isShiftLeader) { setTab('tasks'); return null }
        return <Dashboard />
      case 'admin':
        if (!isSuperUser) { setTab('tasks'); return null }
        return <Admin />
      default:
        return <Tasks />
    }
  }

  return (
    <AppShell tab={tab} setTab={setTab}>
      {renderPage()}
    </AppShell>
  )
}

// ── Root — ThemeProvider must wrap InnerApp so useTheme() is available ────────
export default function App() {
  const { loading } = useAuth()

  // Show bare loading screen before auth resolves
  // (ThemeProvider needs profile to sync theme pref, so we can't mount it yet
  //  if auth hasn't resolved — but we still want the spinner to show)
  if (loading) return <LoadingScreen />

  return (
    <ThemeProvider>
      <InnerApp />
    </ThemeProvider>
  )
}
