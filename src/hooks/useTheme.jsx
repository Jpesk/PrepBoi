import { createContext, useContext, useEffect, useState } from 'react'
import { DARK, LIGHT } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const Ctx = createContext({ T: DARK, mode: 'dark', toggle: () => {} })

export function ThemeProvider({ children }) {
  const { profile } = useAuth()
  const [mode, setMode] = useState(
    () => localStorage.getItem('pb-theme') || 'dark'
  )

  // Sync theme from profile on login
  useEffect(() => { if (profile?.theme) setMode(profile.theme) }, [profile?.theme])

  const toggle = async () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem('pb-theme', next)
    if (profile) {
      await supabase.from('profiles').update({ theme: next }).eq('id', profile.id)
    }
  }

  return (
    <Ctx.Provider value={{ T: mode === 'dark' ? DARK : LIGHT, mode, toggle }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
