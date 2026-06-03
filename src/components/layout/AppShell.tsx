import React, { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { 
  ClipboardList, BookOpen, Utensils, MessageSquare, 
  BarChart3, FileText, Settings, LogOut, ShieldAlert,
  Moon, Sun, Lock, Menu, ChevronDown, BookMarked
} from 'lucide-react'
import { Btn } from '../ui'

interface AppShellProps {
  children: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { 
    profile, isKioskMode, 
    isShiftLeader, isSuperUser, signOut,
    logoutKioskUser, organization, assignedLocations, switchLocation
  } = useAuth()
  const { T, mode, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768)
  const [showMoreDrawer, setShowMoreDrawer] = React.useState(false)
  const [showMgmtDropdown, setShowMgmtDropdown] = React.useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = React.useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])



  // Determine active profile for visual badge
  const currentUserProfile = profile
  const roleLabel = currentUserProfile?.role === 'super_admin' 
    ? 'Super IT Admin' 
    : currentUserProfile?.role === 'org_admin' 
      ? 'Org Admin / HR' 
      : currentUserProfile?.role === 'location_manager' 
        ? 'General Manager' 
        : currentUserProfile?.role === 'shift_leader' 
          ? 'Shift Leader' 
          : 'Team Member'

  // Build navigation items
  const navItems = [
    { label: 'Checklists', path: '/tasks', icon: <ClipboardList size={18} />, allowed: true },
    { label: 'Training SOPs', path: '/training', icon: <BookOpen size={18} />, allowed: !organization?.modules || organization.modules.training !== false },
    { label: 'Recipe Book', path: '/recipes', icon: <Utensils size={18} />, allowed: !organization?.modules || organization.modules.recipes !== false },
    { label: 'Communication', path: '/hub', icon: <MessageSquare size={18} />, allowed: !organization?.modules || organization.modules.communications !== false },
    { label: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, allowed: isShiftLeader },
    { label: 'Daily Summary', path: '/logbook', icon: <FileText size={18} />, allowed: !organization?.modules || organization.modules.daily_summary !== false },
    { label: 'Builders', path: '/builders', icon: <Settings size={18} />, allowed: isShiftLeader },
    { label: 'Admin panel', path: '/admin', icon: <ShieldAlert size={18} />, allowed: isSuperUser },
  ]

  // Main links (always visible directly if allowed)
  const mainLinks = navItems.filter(item => 
    ['Checklists', 'Training SOPs', 'Recipe Book', 'Communication', 'Daily Summary'].includes(item.label)
  )

  // Management links (visible in Management dropdown if allowed)
  const mgmtLinks = navItems.filter(item => 
    ['Reports', 'Builders', 'Admin panel'].includes(item.label)
  )

  // Check if any management item is allowed
  const hasMgmtAccess = mgmtLinks.some(item => item.allowed)

  // Check if the current route is within management links
  const isMgmtActive = mgmtLinks.some(item => item.allowed && location.pathname === item.path)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: T.bg0, color: T.t1, overflow: 'hidden' }}>

      {/* CSS Animations & Styles */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Skip to main content — ADA keyboard accessibility */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          top: -100,
          left: 0,
          padding: '10px 16px',
          background: T.brand,
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          zIndex: 9999,
          borderRadius: '0 0 4px 0',
          textDecoration: 'none',
          transition: 'top 0.1s'
        }}
        onFocus={e => { (e.currentTarget as HTMLElement).style.top = '0' }}
        onBlur={e => { (e.currentTarget as HTMLElement).style.top = '-100px' }}
      >
        Skip to main content
      </a>

      {/* ── DESKTOP TOP NAVIGATION BAR ── */}
      {!isMobile && (
        <header
          style={{
            height: 72,
            background: T.bg1,
            borderBottom: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 10,
            flexShrink: 0
          }}
        >
          {/* Left: Brand logo & name & Kiosk Badge */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '8px 5px 7px 5px/5px 7px 6px 8px', 
                background: T.brand, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#fff',
                border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                boxShadow: `1.5px 1.5px 0px 0px ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`
              }}>
                <BookMarked size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px', color: T.t1 }}>PrepPro</div>
              </div>
            </div>
            {isKioskMode && (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 6, 
                color: T.amber, 
                background: T.amberLo, 
                padding: '4px 10px', 
                borderRadius: '6px 4px 5px 4px/4px 5px 4px 6px', 
                border: `2px solid ${T.amberBd}`, 
                fontSize: 10, 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.8px', 
                fontFamily: "'Inter', sans-serif",
                boxShadow: `1.5px 1.5px 0px 0px ${T.amberBd}`
              }}>
                <Lock size={12} /> Kiosk Mode Active
              </span>
            )}
          </div>

          {/* Middle: Centered Horizontal operational navigation list */}
          <nav aria-label="Main navigation" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
            {mainLinks.map(item => {
              if (!item.allowed) return null
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`sketch-doodle-underline ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    color: isActive ? T.brand : T.t2,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '0.3px',
                    transition: 'color 0.15s ease'
                  }}
                >
                  {item.icon}
                  {item.label === 'Training SOPs' ? 'Training' : item.label === 'Recipe Book' ? 'Recipes' : item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: Console/Management dropdown & User Profile dropdown */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
            {/* Console / Management Dropdown Trigger */}
            {hasMgmtAccess && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setShowMgmtDropdown(prev => !prev)
                    setShowProfileDropdown(false)
                  }}
                  aria-expanded={showMgmtDropdown}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: '8px 6px 7px 5px/5px 7px 6px 8px',
                    fontSize: 13,
                    fontWeight: 700,
                    background: isMgmtActive ? T.brandLo : T.bg3,
                    border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                    color: isMgmtActive ? T.brand : T.t1,
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '0.3px',
                    transition: 'all 0.15s ease',
                    boxShadow: isMgmtActive 
                      ? `3px 3px 0px 0px ${T.brand}` 
                      : `1.5px 1.5px 0px 0px ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                    outline: 'none'
                  }}
                >
                  <Settings size={18} />
                  <span>Console</span>
                  <ChevronDown size={14} style={{ transform: showMgmtDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: isMgmtActive ? T.brand : T.t3 }} />
                </button>

                {/* Dropdown Menu Overlay Backdrop */}
                {showMgmtDropdown && (
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 12 }}
                    onClick={() => setShowMgmtDropdown(false)}
                  />
                )}

                {/* Dropdown Menu Container */}
                {showMgmtDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: T.bg1,
                      border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                      borderRadius: 8,
                      padding: 6,
                      boxShadow: `3px 3px 0px 0px ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                      zIndex: 15,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minWidth: 180
                    }}
                  >
                    {mgmtLinks.map(item => {
                      if (!item.allowed) return null
                      const isActive = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setShowMgmtDropdown(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            textDecoration: 'none',
                            color: isActive ? T.brand : T.t2,
                            background: isActive ? T.brandLo : 'transparent',
                            transition: 'background 0.15s, color 0.15s'
                          }}
                          onMouseEnter={e => {
                            if (!isActive) {
                              e.currentTarget.style.background = T.bg3
                              e.currentTarget.style.color = T.t1
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = T.t2
                            }
                          }}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Profile Dropdown Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowProfileDropdown(prev => !prev)
                  setShowMgmtDropdown(false)
                }}
                aria-expanded={showProfileDropdown}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: showProfileDropdown ? T.brandLo : T.bg3,
                  border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 8,
                  boxShadow: showProfileDropdown
                    ? `3px 3px 0px 0px ${T.brand}`
                    : `1.5px 1.5px 0px 0px ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
              >
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 4, 
                  background: T.bg2, 
                  border: `1.5px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 12, 
                  fontWeight: 700, 
                  color: T.brand 
                }}>
                  {currentUserProfile?.avatar_initials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUserProfile?.full_name}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: T.t3, textTransform: 'uppercase' }}>
                    {roleLabel.split(' ')[0]}
                  </span>
                </div>
                <ChevronDown size={14} style={{ color: T.t3, transform: showProfileDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {/* Profile Dropdown Overlay Backdrop */}
              {showProfileDropdown && (
                <div
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 12 }}
                  onClick={() => setShowProfileDropdown(false)}
                />
              )}

              {/* Profile Dropdown Container */}
              {showProfileDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: T.bg1,
                    border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: `4px 4px 0px 0px ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                    zIndex: 15,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    minWidth: 220
                  }}
                >
                  {/* User Profile Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 8, borderBottom: `1px solid ${T.line}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.t1 }}>
                      {currentUserProfile?.full_name}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: 'uppercase' }}>
                      {roleLabel}
                    </div>
                  </div>

                  {/* Location Switcher inside Profile Dropdown */}
                  {assignedLocations.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 8, borderBottom: `1px solid ${T.line}` }}>
                      <label style={{ fontSize: 9, fontWeight: 800, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Active Location
                      </label>
                      <select
                        value={profile?.location_id || ''}
                        onChange={e => switchLocation(e.target.value)}
                        style={{
                          background: T.bg3,
                          border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                          borderRadius: '8px 6px 7px 5px/5px 7px 6px 8px',
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: T.t1,
                          fontFamily: 'inherit',
                          outline: 'none',
                          cursor: 'pointer',
                          width: '100%',
                          transition: 'all 0.15s'
                        }}
                      >
                        {assignedLocations.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            📍 {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Dark Mode toggle inside dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: T.t2 }}>
                    <span>Theme Mode</span>
                    <button
                      onClick={toggle}
                      title="Toggle light/dark mode"
                      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                      style={{
                        background: T.bg3,
                        border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`,
                        color: T.t3,
                        cursor: 'pointer',
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      {mode === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                    </button>
                  </div>

                  {/* Sign Out / Lock PIN button inside dropdown */}
                  <div style={{ marginTop: 4 }}>
                    {isKioskMode ? (
                      <Btn v="danger" sz="xs" ariaLabel="Lock PIN and log out" onClick={() => { setShowProfileDropdown(false); logoutKioskUser(); }} style={{ width: '100%', justifyContent: 'center' }}>
                        <Lock size={12} aria-hidden="true" /> Lock PIN
                      </Btn>
                    ) : (
                      <Btn v="danger" sz="xs" ariaLabel="Sign out of PrepPro" onClick={() => { setShowProfileDropdown(false); handleSignOut(); }} style={{ width: '100%', justifyContent: 'center' }}>
                        <LogOut size={12} aria-hidden="true" /> Log Out
                      </Btn>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* MOBILE HEADER */}
        {isMobile && (
          <header
            style={{
              height: 56,
              background: T.bg1,
              borderBottom: `1px solid ${T.line}`,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              zIndex: 90
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <BookOpen size={14} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px' }}>PrepPro</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isKioskMode && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.amber, background: T.amberLo, padding: '3px 8px', borderRadius: 4, border: `1px solid ${T.amberBd}`, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                  <Lock size={10} /> Kiosk
                </span>
              )}

              {/* Mode Toggle directly accessible */}
              <button
                onClick={toggle}
                aria-label={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
                style={{
                  background: T.bg3,
                  border: `1px solid ${T.line}`,
                  color: T.t3,
                  cursor: 'pointer',
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
              >
                {mode === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              </button>

              <span style={{ fontSize: 9, fontWeight: 700, color: T.t3, background: T.bg3, padding: '4px 8px', borderRadius: 4, border: `1px solid ${T.line}`, textTransform: 'uppercase' }}>
                {roleLabel}
              </span>
            </div>
          </header>
        )}

        {/* Page content window */}
        <main
          id="main-content"
          aria-label="Page content"
          style={{
            flex: 1,
            overflowY: 'auto',
            background: T.bg0,
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: 1000,
            padding: isMobile ? '20px 16px 88px 16px' : '40px 32px'
          }}>
            {children}
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      {isMobile && (() => {
        const tabs = isShiftLeader 
          ? [
              { label: 'Tasks', path: '/tasks', icon: <ClipboardList size={20} /> },
              { label: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
              { label: 'Summary', path: '/logbook', icon: <FileText size={20} /> },
              { label: 'Training', path: '/training', icon: <BookOpen size={20} /> },
              { label: 'More', path: 'more', icon: <Menu size={20} /> },
            ]
          : [
              { label: 'Tasks', path: '/tasks', icon: <ClipboardList size={20} /> },
              { label: 'Summary', path: '/logbook', icon: <FileText size={20} /> },
              { label: 'Training', path: '/training', icon: <BookOpen size={20} /> },
              { label: 'Recipes', path: '/recipes', icon: <Utensils size={20} /> },
              { label: 'More', path: 'more', icon: <Menu size={20} /> },
            ]

        // Remaining elements that go to the More menu
        const drawerItems = isShiftLeader
          ? [
              { label: 'Recipe Book', path: '/recipes', icon: <Utensils size={18} /> },
              { label: 'Communication Hub', path: '/hub', icon: <MessageSquare size={18} /> },
              { label: 'Checklist Builders', path: '/builders', icon: <Settings size={18} /> },
              ...(isSuperUser ? [{ label: 'Admin Panel', path: '/admin', icon: <ShieldAlert size={18} /> }] : [])
            ]
          : [
              { label: 'Communication Hub', path: '/hub', icon: <MessageSquare size={18} /> }
            ]

        return (
          <>
            <nav
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 64,
                background: T.glass.replace('backdrop-filter:', '').replace('background:', '').split(';')[1]?.trim() || T.bg1,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: `1px solid ${T.line}`,
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                zIndex: 100,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                boxShadow: T.shadow
              }}
            >
              {tabs.map(tab => {
                const isMore = tab.path === 'more'
                const isActive = isMore ? showMoreDrawer : location.pathname === tab.path

                return (
                  <button
                    key={tab.label}
                    onClick={() => {
                      if (isMore) {
                        setShowMoreDrawer(prev => !prev)
                      } else {
                        setShowMoreDrawer(false)
                        navigate(tab.path)
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      flex: 1,
                      height: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: isActive ? T.brand : T.t3,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <div style={{
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {tab.icon}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* Bottom drawer menu overlay */}
            {showMoreDrawer && (
              <>
                <div
                  onClick={() => setShowMoreDrawer(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(5, 3, 10, 0.65)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 150,
                    animation: 'fade-in 0.2s ease-out'
                  }}
                />
                
                <div
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: T.bg1,
                    borderTop: `1px solid ${T.line}`,
                    borderRadius: '20px 20px 0 0',
                    padding: '24px 24px calc(32px + env(safe-area-inset-bottom, 0px)) 24px',
                    zIndex: 160,
                    maxHeight: '75vh',
                    overflowY: 'auto',
                    boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    animation: 'slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div style={{ width: 36, height: 4, background: T.line2, borderRadius: 2, margin: '0 auto 8px auto' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      More Actions
                    </h3>
                    <button
                      onClick={() => setShowMoreDrawer(false)}
                      style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: T.t2, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                    >
                      Close
                    </button>
                  </div>

                  {drawerItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {drawerItems.map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setShowMoreDrawer(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 18px',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: 'none',
                            color: T.t1,
                            background: T.bg2,
                            border: `1px solid ${T.line}`,
                            fontFamily: "'DM Sans', sans-serif",
                            transition: 'all 0.15s ease',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  <div style={{ height: 1, background: T.line }} />

                  {/* Settings toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>


                    <button
                      onClick={() => { toggle(); setShowMoreDrawer(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: 8,
                        background: T.bg3,
                        border: `1px solid ${T.line}`,
                        color: T.t2,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 700
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Theme Style
                      </span>
                      <span style={{ fontSize: 10, color: T.t3, textTransform: 'uppercase' }}>{mode} Mode</span>
                    </button>
                  </div>

                  <div style={{ height: 1, background: T.line }} />

                  {/* User profile section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: T.bg3, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: T.brand }}>
                      {currentUserProfile?.avatar_initials}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUserProfile?.full_name}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase' }}>
                        {roleLabel}
                      </div>
                    </div>
                    <div>
                      {isKioskMode ? (
                        <Btn v="danger" sz="xs" onClick={() => { logoutKioskUser(); setShowMoreDrawer(false); navigate('/tasks'); }}>
                          Lock PIN
                        </Btn>
                      ) : (
                        <Btn v="danger" sz="xs" onClick={() => { handleSignOut(); setShowMoreDrawer(false); }}>
                          Log Out
                        </Btn>
                      )}
                    </div>
                  </div>

                  {/* Mobile Location Switcher */}
                  {assignedLocations.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      <label style={{ fontSize: 9, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Active Location
                      </label>
                      <select
                        value={profile?.location_id || ''}
                        onChange={e => { switchLocation(e.target.value); setShowMoreDrawer(false); }}
                        style={{
                          width: '100%',
                          background: T.bg3,
                          border: `1px solid ${T.line}`,
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 13,
                          color: T.t1,
                          fontFamily: 'inherit',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {assignedLocations.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )
      })()}
    </div>
  )
}
export default AppShell
