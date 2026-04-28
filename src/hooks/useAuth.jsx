import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(undefined) // undefined = still loading
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, locations(name), organizations(name,slug)')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s?.user) fetchProfile(s.user.id)
      else { setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Sign in with email + password
  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // Used by super_user admin panel to create new staff accounts
  // org_id and location_id must be passed in options.data
  const createUser = (email, password, fullName, role, orgId, locationId) =>
    supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role, org_id: orgId, location_id: locationId } },
    })

  const signOut = () => supabase.auth.signOut()

  const updateProfile = async (updates) => {
    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', profile.id).select().single()
    if (!error) setProfile(prev => ({ ...prev, ...data }))
    return { data, error }
  }

  const isSuperUser   = profile?.role === 'super_user'
  const isShiftLeader = profile?.role === 'shift_leader' || isSuperUser
  const canManage     = isSuperUser        // create/edit content
  const canAssign     = isShiftLeader      // assign training
  const canViewDash   = isShiftLeader      // submission dashboard

  return (
    <Ctx.Provider value={{
      session, profile, loading,
      signIn, createUser, signOut, updateProfile,
      isSuperUser, isShiftLeader, canManage, canAssign, canViewDash,
      refreshProfile: () => profile && fetchProfile(profile.id),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
