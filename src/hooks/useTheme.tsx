import React, { createContext, useContext, useEffect, useState } from 'react'
import { DARK, LIGHT, ThemeTokens } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

interface ThemeContextType {
  T: ThemeTokens
  mode: 'dark' | 'light'
  toggle: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
  T: DARK,
  mode: 'dark',
  toggle: async () => {},
})

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, organization } = useAuth()
  const [mode, setMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('preppro-theme') as 'dark' | 'light') || 'dark'
  })

  // Sync theme from profile on load/login
  useEffect(() => {
    if (profile?.theme) {
      setMode(profile.theme)
    }
  }, [profile?.theme])

  // Sync class on document.body for CSS variable scopes
  useEffect(() => {
    document.body.className = mode === 'dark' ? 'dark-theme' : 'light-theme'
  }, [mode])

  const toggle = async () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem('preppro-theme', next)
    if (profile) {
      await supabase
        .from('profiles')
        .update({ theme: next })
        .eq('id', profile.id)
    }
  }

  const baseTokens = mode === 'dark' ? DARK : LIGHT
  const T = { ...baseTokens }
  if (organization?.branding) {
    if (organization.branding.brand) {
      T.brand = organization.branding.brand
      T.brandLo = `${organization.branding.brand}10` // 10% opacity
      T.brandBd = `${organization.branding.brand}33` // 20% opacity
    }
    if (organization.branding.bg0) {
      T.bg0 = organization.branding.bg0
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        T,
        mode,
        toggle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
