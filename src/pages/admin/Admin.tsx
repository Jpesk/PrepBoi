import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, Pill, SectionLabel, Spinner, Toast, Select } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { KeyRound, UserPlus, Monitor, Building2, Palette, SlidersHorizontal, MapPin } from 'lucide-react'

interface Member {
  id: string
  full_name: string
  role: string
  pin_code: string | null
  is_active: boolean
  is_kiosk?: boolean
}

export const Admin: React.FC = () => {
  const { T } = useTheme()
  const { profile, organization, refreshProfile, createUser, isSuperAdmin, isOrgAdmin, isLocManager } = useAuth()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Tab State
  const [activeTab, setActiveTab] = useState<'super' | 'org' | 'location'>('location')

  useEffect(() => {
    if (isSuperAdmin) {
      setActiveTab('super')
    } else if (isOrgAdmin) {
      setActiveTab('org')
    } else {
      setActiveTab('location')
    }
  }, [isSuperAdmin, isOrgAdmin])

  // Edit PIN states
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState('')

  // Create User states
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createFullName, setCreateFullName] = useState('')
  const [createRole, setCreateRole] = useState('employee')
  const [createIsKiosk, setCreateIsKiosk] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [selectedLocationsForNewUser, setSelectedLocationsForNewUser] = useState<string[]>([])

  // Super IT Tab states
  const [allOrgs, setAllOrgs] = useState<any[]>([])
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')
  const [newOrgPlan, setNewOrgPlan] = useState<'starter' | 'growth' | 'enterprise'>('starter')
  const [savingNewOrg, setSavingNewOrg] = useState(false)

  // Org HR Tab states
  const [modDailySummary, setModDailySummary] = useState(true)
  const [modTraining, setModTraining] = useState(true)
  const [modRecipes, setModRecipes] = useState(true)
  const [modComms, setModComms] = useState(true)
  const [brandColor, setBrandColor] = useState('#f26430')
  const [bg0Color, setBg0Color] = useState('#0c0b0e')
  const [orgLocations, setOrgLocations] = useState<any[]>([])
  const [newLocName, setNewLocName] = useState('')
  const [newLocAddress, setNewLocAddress] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [creatingLocation, setCreatingLocation] = useState(false)

  // Load roster
  const loadRoster = async () => {
    if (!profile) return
    try {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, pin_code, is_active, is_kiosk')
        .eq('org_id', profile.org_id)

      if (data) setMembers(data)
    } catch (err) {
      console.error('Failed loading roster:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load Super IT details
  const loadSuperOrgs = async () => {
    if (!isSuperAdmin) return
    try {
      const { data } = await supabase.from('organizations').select('*')
      if (data) setAllOrgs(data)
    } catch (err) {
      console.error('Failed loading organizations list:', err)
    }
  }

  // Load Org HR details
  const loadOrgDetailsAndLocations = async () => {
    if (!profile) return
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single()
      if (org) {
        if (org.modules) {
          setModDailySummary(org.modules.daily_summary !== false)
          setModTraining(org.modules.training !== false)
          setModRecipes(org.modules.recipes !== false)
          setModComms(org.modules.communications !== false)
        }
        if (org.branding) {
          setBrandColor(org.branding.brand || '#f26430')
          setBg0Color(org.branding.bg0 || '#0c0b0e')
        }
      }

      const { data: locs } = await supabase
        .from('locations')
        .select('*')
        .eq('org_id', profile.org_id)
      if (locs) setOrgLocations(locs)
    } catch (err) {
      console.error('Failed loading org settings/locations:', err)
    }
  }

  useEffect(() => {
    loadRoster()
    loadOrgDetailsAndLocations()
    loadSuperOrgs()
  }, [profile, organization])

  // Save member PIN
  const handleSavePin = async (memberId: string) => {
    if (!/^\d{4}$/.test(pinInput)) {
      setToastMsg('PIN code must be exactly 4 numeric digits.')
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pin_code: pinInput })
        .eq('id', memberId)

      if (error) throw error

      setToastMsg('Access PIN updated successfully!')
      setEditingMember(null)
      setPinInput('')
      await loadRoster()
    } catch (err) {
      console.error('Failed updating PIN:', err)
      setToastMsg('Failed to update PIN.')
    }
  }

  // Toggle kiosk mode for a member
  const handleToggleKiosk = async (memberId: string, currentIsKiosk: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_kiosk: !currentIsKiosk })
        .eq('id', memberId)

      if (error) throw error

      setToastMsg('Kiosk mode status updated successfully!')
      await loadRoster()
    } catch (err) {
      console.error('Failed toggling kiosk mode:', err)
      setToastMsg('Failed to update kiosk mode status.')
    }
  }

  // Super Admin: Create new Organization
  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName || !newOrgSlug) {
      setToastMsg('Please fill in organization name and slug.')
      return
    }
    try {
      setSavingNewOrg(true)
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName,
          slug: newOrgSlug,
          plan: newOrgPlan
        })
      if (error) throw error
      setToastMsg(`Organization "${newOrgName}" created successfully!`)
      setNewOrgName('')
      setNewOrgSlug('')
      await loadSuperOrgs()
    } catch (err: any) {
      console.error('Failed creating organization:', err)
      setToastMsg(err.message || 'Failed to create organization.')
    } finally {
      setSavingNewOrg(false)
    }
  }

  // Org Admin: Save Modules & Branding Toggles
  const handleSaveOrgConfig = async () => {
    if (!profile) return
    try {
      setSavingOrg(true)
      const { error } = await supabase
        .from('organizations')
        .update({
          modules: {
            daily_summary: modDailySummary,
            training: modTraining,
            recipes: modRecipes,
            communications: modComms
          },
          branding: {
            brand: brandColor,
            bg0: bg0Color
          }
        })
        .eq('id', profile.org_id)

      if (error) throw error

      setToastMsg('Organization configurations updated!')
      await refreshProfile()
    } catch (err) {
      console.error('Failed saving org configs:', err)
      setToastMsg('Failed to save settings.')
    } finally {
      setSavingOrg(false)
    }
  }

  // Org Admin: Create Location
  const handleCreateLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !newLocName) return
    try {
      setCreatingLocation(true)
      const { error } = await supabase
        .from('locations')
        .insert({
          org_id: profile.org_id,
          name: newLocName,
          address: newLocAddress
        })
      if (error) throw error
      setToastMsg(`Location "${newLocName}" created successfully!`)
      setNewLocName('')
      setNewLocAddress('')
      await loadOrgDetailsAndLocations()
    } catch (err: any) {
      console.error('Failed creating location:', err)
      setToastMsg(err.message || 'Failed to create location.')
    } finally {
      setCreatingLocation(false)
    }
  }

  // GM: Create staff user and link to multiple locations
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!createEmail || !createPassword || !createFullName) {
      setToastMsg('Please fill in all fields.')
      return
    }

    try {
      setCreatingUser(true)
      
      // Determine primary location
      const primaryLocId = selectedLocationsForNewUser[0] || profile.location_id

      const res = await createUser(
        createEmail,
        createPassword,
        createFullName,
        createRole,
        profile.org_id,
        primaryLocId,
        createIsKiosk
      )

      if (res.error) throw res.error

      // Insert mappings into profile_locations join table
      if (res.data?.user && selectedLocationsForNewUser.length > 0) {
        const mappings = selectedLocationsForNewUser.map(locId => ({
          profile_id: res.data.user.id,
          location_id: locId
        }))
        const { error: mappingErr } = await supabase
          .from('profile_locations')
          .insert(mappings)
        if (mappingErr) console.error('Failed saving location mappings:', mappingErr)
      }

      setToastMsg('Account created successfully!')
      setCreateEmail('')
      setCreatePassword('')
      setCreateFullName('')
      setCreateRole('employee')
      setCreateIsKiosk(false)
      setSelectedLocationsForNewUser([])
      await loadRoster()
    } catch (err: any) {
      console.error('Failed creating user:', err)
      setToastMsg(err.message || 'Failed to create user account.')
    } finally {
      setCreatingUser(false)
    }
  }

  if (loading && members.length === 0) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: T.t1, letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Super Admin Console
        </h1>
        <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
          Configure kiosk terminals, configure integrations, and assign security credentials.
        </p>
      </div>

      {/* RENDER TABS SELECTOR */}
      <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${T.line}`, paddingBottom: 8, flexWrap: 'wrap' }}>
        {isSuperAdmin && (
          <Btn v={activeTab === 'super' ? 'brand' : 'ghost'} sz="sm" onClick={() => setActiveTab('super')}>
            <Building2 size={14} /> Super IT Settings
          </Btn>
        )}
        {isOrgAdmin && (
          <Btn v={activeTab === 'org' ? 'brand' : 'ghost'} sz="sm" onClick={() => setActiveTab('org')}>
            <Palette size={14} /> Org HR Settings
          </Btn>
        )}
        {isLocManager && (
          <Btn v={activeTab === 'location' ? 'brand' : 'ghost'} sz="sm" onClick={() => setActiveTab('location')}>
            <SlidersHorizontal size={14} /> Location GM Panel
          </Btn>
        )}
      </div>

      {/* ── TAB 1: SUPER IT SETTINGS ── */}
      {activeTab === 'super' && isSuperAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32 }}>
          {/* Org list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>All Hosted Client Organizations</SectionLabel>
            <Card style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              background: T.mode === 'dark' ? 'rgba(29,28,26,0.6)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid ' + T.line2,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}>
              {allOrgs.map(org => (
                <div key={org.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: `1px solid ${T.line}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: T.t3, fontFamily: 'monospace' }}>Slug: {org.slug}</div>
                  </div>
                  <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd} style={{ borderRadius: 6 }}>Plan: {org.plan}</Pill>
                </div>
              ))}
            </Card>
          </div>

          {/* Org creator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Create New Organization</SectionLabel>
            <Card style={{
              background: T.mode === 'dark' ? 'rgba(29,28,26,0.6)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid ' + T.line2,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}>
              <form onSubmit={handleCreateOrgSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Org Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. McBurgers Inc"
                    value={newOrgName}
                    onChange={e => {
                      setNewOrgName(e.target.value)
                      setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
                    }}
                    style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>URL Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mcburgers"
                    value={newOrgSlug}
                    onChange={e => setNewOrgSlug(e.target.value)}
                    style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Service Plan</label>
                  <Select value={newOrgPlan} onChange={e => setNewOrgPlan(e.target.value as any)}>
                    <option value="starter">Starter Plan</option>
                    <option value="growth">Growth Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </Select>
                </div>
                <Btn type="submit" v="brand" disabled={savingNewOrg} style={{ marginTop: 8 }}>
                  Create Organization
                </Btn>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: ORG SETTINGS / HR ── */}
      {activeTab === 'org' && isOrgAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32 }}>
          {/* Modules & Branding */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Organization Features & Modules</SectionLabel>
            <Card style={{
              display: 'flex', flexDirection: 'column', gap: 16,
              background: T.mode === 'dark' ? 'rgba(29,28,26,0.6)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid ' + T.line2,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Module Activation Toggle</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={modDailySummary} onChange={e => setModDailySummary(e.target.checked)} />
                  Enable Shift Review (Daily Summary)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={modTraining} onChange={e => setModTraining(e.target.checked)} />
                  Enable Onboarding & Training SOPs
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={modRecipes} onChange={e => setModRecipes(e.target.checked)} />
                  Enable Recipe Book Module
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={modComms} onChange={e => setModComms(e.target.checked)} />
                  Enable Communication Hub Chat
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`, paddingTop: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Corporate Branding Colors</span>
                
                {/* Brand Preset Palettes */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '4px 0 8px 0' }}>
                  {[
                    { name: 'Classic Indigo', hex: '#5C5BE5' },
                    { name: 'Sage Green', hex: '#059669' },
                    { name: 'Warm Terracotta', hex: '#f26430' },
                    { name: 'Steel Blue', hex: '#0891B2' },
                    { name: 'Charcoal Slate', hex: '#4E4C48' },
                  ].map(preset => {
                    const isSelected = brandColor.toLowerCase() === preset.hex.toLowerCase()
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        aria-label={`Set brand color to ${preset.name}`}
                        aria-pressed={isSelected}
                        onClick={() => setBrandColor(preset.hex)}
                        style={{
                          background: preset.hex,
                          color: '#fff',
                          border: isSelected ? `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}` : '2px solid transparent',
                          borderRadius: 8,
                          padding: '4px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: isSelected
                            ? '0 4px 16px rgba(0,0,0,0.18)'
                            : '0 2px 6px rgba(0,0,0,0.10)',
                          transform: isSelected ? 'translateY(-1px)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {preset.name}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: T.t2 }}>Primary Accent</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`, borderRadius: 4, background: 'transparent', cursor: 'pointer' }} />
                      <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)} style={{ flex: 1, background: T.bg2, border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`, borderRadius: 6, color: T.t1, padding: '4px 8px', fontSize: 12 }} />
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: T.t2 }}>Dark Canvas BG</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="color" value={bg0Color} onChange={e => setBg0Color(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`, borderRadius: 4, background: 'transparent', cursor: 'pointer' }} />
                      <input type="text" value={bg0Color} onChange={e => setBg0Color(e.target.value)} style={{ flex: 1, background: T.bg2, border: `2px solid ${T.mode === 'light' ? '#2A2825' : '#EBEAE6'}`, borderRadius: 6, color: T.t1, padding: '4px 8px', fontSize: 12 }} />
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <Btn v="brand" onClick={handleSaveOrgConfig} disabled={savingOrg} style={{ marginTop: 8 }}>
                Apply Branding & Modules Settings
              </Btn>
            </Card>
          </div>

          {/* Location Creator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Create Organization Location</SectionLabel>
            <Card style={{
              display: 'flex', flexDirection: 'column', gap: 16,
              background: T.mode === 'dark' ? 'rgba(29,28,26,0.6)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid ' + T.line2,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}>
              <form onSubmit={handleCreateLocationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Location Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Downtown Store or Westside Branch"
                    value={newLocName}
                    onChange={e => setNewLocName(e.target.value)}
                    style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 104 Commerce St"
                    value={newLocAddress}
                    onChange={e => setNewLocAddress(e.target.value)}
                    style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <Btn type="submit" v="brand" disabled={creatingLocation}>
                  Create Location
                </Btn>
              </form>

              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Active Locations</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {orgLocations.map(loc => (
                    <div key={loc.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                      <MapPin size={12} color={T.brand} />
                      <strong>{loc.name}</strong>
                      <span style={{ fontSize: 11, color: T.t3 }}>({loc.address || 'No address'})</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 3: LOCATION GM PANEL ── */}
      {activeTab === 'location' && isLocManager && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32 }}>
          {/* Left Column: Team Roster PIN configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Staff Roster & Kiosk PINs</SectionLabel>
            <Card style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              background: T.mode === 'dark' ? 'rgba(29,28,26,0.6)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid ' + T.line2,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}>
              {members.map(member => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 14,
                    borderBottom: `1px solid ${T.line}`,
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: member.is_active ? T.brandLo : T.bg3,
                      border: `2px solid ${member.is_active ? T.brandBd : T.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800,
                      color: member.is_active ? T.brand : T.t4,
                      flexShrink: 0
                    }}>
                      {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{member.full_name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <Pill fg={T.t3} bg={T.bg2} bd={T.line}>{member.role}</Pill>
                        {member.is_kiosk && (
                          <Pill fg={T.amber} bg={T.amberLo} bd={T.amberBd} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Monitor size={10} /> Kiosk Mode
                          </Pill>
                        )}
                        <span style={{ fontSize: 11, color: T.t4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <KeyRound size={10} /> PIN: {member.pin_code ? '••••' : 'Not Set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {editingMember === member.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="PIN"
                          aria-label={`4-digit PIN for ${member.full_name}`}
                          inputMode="numeric"
                          autoComplete="off"
                          value={pinInput}
                          onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                          style={{
                            width: 60,
                            background: T.bg3,
                            border: `1px solid ${T.brand}`,
                            borderRadius: 8,
                            color: T.t1,
                            padding: '6px 8px',
                            fontSize: 13,
                            fontWeight: 800,
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                        <Btn v="brand" sz="xs" onClick={() => handleSavePin(member.id)}>Save</Btn>
                        <Btn v="ghost" sz="xs" onClick={() => setEditingMember(null)}>Cancel</Btn>
                      </div>
                    ) : (
                      <>
                        <Btn
                          v="ghost"
                          sz="xs"
                          onClick={() => handleToggleKiosk(member.id, !!member.is_kiosk)}
                          aria-label={member.is_kiosk ? `Disable kiosk mode for ${member.full_name}` : `Enable kiosk mode for ${member.full_name}`}
                          style={{ color: member.is_kiosk ? T.amber : T.t3 }}
                        >
                          {member.is_kiosk ? 'Disable Kiosk' : 'Enable Kiosk'}
                        </Btn>
                        <Btn v="ghost" sz="xs" aria-label={`Edit PIN for ${member.full_name}`} onClick={() => { setEditingMember(member.id); setPinInput(member.pin_code || '') }}>
                          Edit PIN
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Right Column: User creation with location mappings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Create Staff or Kiosk Account</SectionLabel>
            <Card style={{
              background: T.mode === 'dark' ? 'rgba(29,28,26,0.6)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid ' + T.line2,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}>
              <form onSubmit={handleCreateUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iPad Terminal or Sarah Jenkins"
                    value={createFullName}
                    onChange={e => setCreateFullName(e.target.value)}
                    style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. store104@preppro.com"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Role</label>
                    <Select value={createRole} onChange={e => setCreateRole(e.target.value)}>
                      <option value="employee">Employee</option>
                      <option value="shift_leader">Shift Leader</option>
                      <option value="location_manager">General Manager</option>
                      <option value="org_admin">HR / Org Admin</option>
                    </Select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Kiosk Account</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.t2 }}>
                      <input
                        type="checkbox"
                        checked={createIsKiosk}
                        onChange={e => setCreateIsKiosk(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      Kiosk Mode
                    </label>
                  </div>
                </div>

                {/* Location Selection list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Assigned Locations</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {orgLocations.map(loc => {
                      const isChecked = selectedLocationsForNewUser.includes(loc.id)
                      return (
                        <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.t2 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedLocationsForNewUser(prev =>
                                isChecked ? prev.filter(id => id !== loc.id) : [...prev, loc.id]
                              )
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          {loc.name}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
                  <Btn type="submit" v="brand" disabled={creatingUser} style={{ width: '100%' }}>
                    <UserPlus size={14} /> {creatingUser ? 'Creating Account...' : 'Create Account'}
                  </Btn>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}

export default Admin
