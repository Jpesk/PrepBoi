import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  org_id: string
  location_id: string | null
  full_name: string
  role: 'super_admin' | 'org_admin' | 'location_manager' | 'shift_leader' | 'employee'
  avatar_initials: string
  theme: 'dark' | 'light'
  pin_code: string | null
  is_kiosk: boolean
  pet_status: {
    name: string
    theme: 'doughboi' | 'bobamon' | 'slicemon' | 'generic' | 'coffeebot' | 'tacotchi' | 'sushimon' | 'burgerpal' | 'waffly'
    level: number
    exp: number
    health: number
    happiness: number
    treats: number
    accessories: string[]
    last_decay_date?: string
  }
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: 'starter' | 'growth' | 'enterprise'
  pet_theme: 'doughboi' | 'bobamon' | 'slicemon' | 'generic' | 'coffeebot' | 'tacotchi' | 'sushimon' | 'burgerpal' | 'waffly'
  api_provider: 'anthropic' | 'openai' | 'ollama' | 'mock'
  api_endpoint: string | null
  log_decryption_hash: string | null
  modules?: { daily_summary: boolean; training: boolean; recipes: boolean; communications: boolean }
  branding?: { brand: string; bg0: string }
}

interface AuthContextType {
  session: any
  profile: Profile | null
  organization: Organization | null
  loading: boolean
  kioskUser: Profile | null
  isKioskMode: boolean
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: Partial<Profile>) => Promise<any>
  createUser: (email: string, password: string, fullName: string, role: string, orgId: string, locationId: string | null, isKiosk?: boolean) => Promise<any>
  activateKioskMode: () => void
  deactivateKioskMode: () => void
  loginKioskUser: (pin: string) => Promise<boolean>
  logoutKioskUser: () => void
  isSuperAdmin: boolean
  isOrgAdmin: boolean
  isLocManager: boolean
  isShiftLeader: boolean
  isEmployee: boolean
  isSuperUser: boolean
  canManage: boolean
  canAssign: boolean
  canViewDash: boolean
  assignedLocations: any[]
  switchLocation: (locationId: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [assignedLocations, setAssignedLocations] = useState<any[]>([])
  
  // Kiosk-specific states
  const isKioskMode = !!profile?.is_kiosk
  const kioskUser = null

  const fetchProfileAndOrg = async (userId: string) => {
    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profErr && prof) {
        setProfile(prof)
        
        // Fetch organization settings
        const { data: org, error: orgErr } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', prof.org_id)
          .single()
          
        if (!orgErr && org) {
          setOrganization(org)
        }

        // Fetch assigned locations mapping
        const { data: locs } = await supabase
          .from('profile_locations')
          .select('location_id, locations ( id, name )')
          .eq('profile_id', userId)

        if (locs && locs.length > 0) {
          setAssignedLocations(locs.map((l: any) => l.locations).filter(Boolean))
        } else {
          // Fallback to active location context
          if (prof.role === 'super_admin') {
            const { data: allLocs } = await supabase.from('locations').select('*')
            if (allLocs) setAssignedLocations(allLocs)
          } else {
            const { data: primaryLoc } = await supabase
              .from('locations')
              .select('*')
              .eq('id', prof.location_id)
              .single()
            if (primaryLoc) {
              setAssignedLocations([primaryLoc])
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profile/org context:', err)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session)
      if (session?.user) {
        fetchProfileAndOrg(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session)
      if (session?.user) {
        fetchProfileAndOrg(session.user.id)
      } else {
        setProfile(null)
        setOrganization(null)
        setAssignedLocations([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return { error: new Error('No profile active') }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single()
    if (!error && data) {
      setProfile(prev => prev ? { ...prev, ...data } : null)
    }
    return { data, error }
  }

  const switchLocation = async (locationId: string) => {
    if (!profile) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ location_id: locationId })
        .eq('id', profile.id)

      if (error) throw error
      await refreshProfile()
    } catch (err) {
      console.error('Failed switching locations:', err)
    }
  }

  const createUser = (
    email: string,
    password: string,
    fullName: string,
    role: string,
    orgId: string,
    locationId: string | null,
    isKiosk = false
  ) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          org_id: orgId,
          location_id: locationId,
          is_kiosk: isKiosk
        }
      }
    })

  // Kiosk operations
  const activateKioskMode = () => {}
  const deactivateKioskMode = () => {}
  const loginKioskUser = async () => false
  const logoutKioskUser = () => {}

  const refreshProfile = async () => {
    if (profile) {
      await fetchProfileAndOrg(profile.id)
    }
  }

  // Active role variables
  const activeUser = kioskUser || profile
  const isSuperAdmin = activeUser?.role === 'super_admin'
  const isOrgAdmin   = activeUser?.role === 'org_admin' || isSuperAdmin
  const isLocManager = activeUser?.role === 'location_manager' || isOrgAdmin
  const isShiftLeader = activeUser?.role === 'shift_leader' || isLocManager
  const isEmployee   = activeUser?.role === 'employee'

  // Compatibility flags mapped to new roles
  const isSuperUser = isLocManager
  const canManage = isOrgAdmin
  const canAssign = isShiftLeader
  const canViewDash = isShiftLeader

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        organization,
        loading,
        kioskUser,
        isKioskMode,
        signIn,
        signOut,
        updateProfile,
        createUser,
        activateKioskMode,
        deactivateKioskMode,
        loginKioskUser,
        logoutKioskUser,
        isSuperAdmin,
        isOrgAdmin,
        isLocManager,
        isShiftLeader,
        isEmployee,
        isSuperUser,
        canManage,
        canAssign,
        canViewDash,
        assignedLocations,
        switchLocation,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
