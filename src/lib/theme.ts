export interface ThemeTokens {
  bg0: string;
  bg1: string;
  bg2: string;
  bg3: string;
  bg4: string;
  bg5: string;
  line: string;
  line2: string;
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  brand: string;
  brandAlt: string;
  brandLight: string;
  brandDim: string;
  brandLo: string;
  brandBd: string;
  brandGlow: string;
  amber: string;
  amberHi: string;
  amberLo: string;
  amberBd: string;
  lime: string;
  limeLo: string;
  limeBd: string;
  red: string;
  redLo: string;
  redBd: string;
  sky: string;
  skyLo: string;
  skyBd: string;
  purple: string;
  purpleLo: string;
  purpleBd: string;
  mode: 'dark' | 'light';
  glass: string;
  shadow: string;
  surfaceGlass: string;
  borderSketch: string;
}

export const DARK: ThemeTokens = {
  bg0: '#161514',
  bg1: '#1D1C1A',
  bg2: '#262522',
  bg3: '#32302D',
  bg4: '#3F3C38',
  bg5: '#4E4A45',
  line: 'rgba(235, 234, 230, 0.12)',
  line2: 'rgba(235, 234, 230, 0.25)',
  t1: '#EBEAE6',
  t2: '#C5C4BF',
  t3: '#B0AEA9',
  t4: '#8C8A85',
  brand: '#7F7DF4',
  brandAlt: '#9896F7',
  brandLight: '#C1C0FC',
  brandDim: '#1E1C44',
  brandLo: 'rgba(127, 125, 244, 0.08)',
  brandBd: 'rgba(127, 125, 244, 0.35)',
  brandGlow: '0 0 20px rgba(127, 125, 244, 0.2)',
  amber: '#F59E0B',
  amberHi: '#FBB93E',
  amberLo: 'rgba(245, 158, 11, 0.08)',
  amberBd: 'rgba(245, 158, 11, 0.3)',
  lime: '#10B981',
  limeLo: 'rgba(16, 185, 129, 0.08)',
  limeBd: 'rgba(16, 185, 129, 0.3)',
  red: '#EF4444',
  redLo: 'rgba(239, 68, 68, 0.08)',
  redBd: 'rgba(239, 68, 68, 0.3)',
  sky: '#06B6D4',
  skyLo: 'rgba(6, 182, 212, 0.08)',
  skyBd: 'rgba(6, 182, 212, 0.3)',
  purple: '#7F7DF4',
  purpleLo: 'rgba(127, 125, 244, 0.08)',
  purpleBd: 'rgba(127, 125, 244, 0.3)',
  mode: 'dark',
  glass: 'backdrop-filter: blur(12px); background: rgba(29, 28, 26, 0.8);',
  shadow: '4px 4px 0px 0px #EBEAE6',
  surfaceGlass: 'rgba(29, 28, 26, 0.7)',
  borderSketch: '#EBEAE6'
}

export const LIGHT: ThemeTokens = {
  bg0: '#FAF8F5',
  bg1: '#F3EFE9',
  bg2: '#FFFFFF',
  bg3: '#E8E2D9',
  bg4: '#DDD6CB',
  bg5: '#CEBFAD',
  line: 'rgba(42, 40, 37, 0.12)',
  line2: 'rgba(42, 40, 37, 0.22)',
  t1: '#2A2825',
  t2: '#4E4C48',
  t3: '#6A6762',
  t4: '#8C8982',
  brand: '#5C5BE5',
  brandAlt: '#4E4CD3',
  brandLight: '#3F3DC0',
  brandDim: '#EEF0FF',
  brandLo: 'rgba(92, 91, 229, 0.06)',
  brandBd: 'rgba(92, 91, 229, 0.25)',
  brandGlow: '0 0 20px rgba(92, 91, 229, 0.15)',
  amber: '#D97706',
  amberHi: '#B45309',
  amberLo: 'rgba(217, 119, 6, 0.06)',
  amberBd: 'rgba(217, 119, 6, 0.25)',
  lime: '#059669',
  limeLo: 'rgba(5, 150, 105, 0.06)',
  limeBd: 'rgba(5, 150, 105, 0.25)',
  red: '#DC2626',
  redLo: 'rgba(220, 38, 38, 0.06)',
  redBd: 'rgba(220, 38, 38, 0.25)',
  sky: '#0891B2',
  skyLo: 'rgba(8, 145, 178, 0.06)',
  skyBd: 'rgba(8, 145, 178, 0.25)',
  purple: '#5C5BE5',
  purpleLo: 'rgba(92, 91, 229, 0.06)',
  purpleBd: 'rgba(92, 91, 229, 0.25)',
  mode: 'light',
  glass: 'backdrop-filter: blur(12px); background: rgba(250, 248, 245, 0.8);',
  shadow: '4px 4px 0px 0px #2A2825',
  surfaceGlass: 'rgba(250, 248, 245, 0.75)',
  borderSketch: '#2A2825'
}

export const ROLE_META = {
  super_admin: { label: 'IT Super Admin', short: 'IT' },
  org_admin: { label: 'HR Admin', short: 'HR' },
  location_manager: { label: 'General Manager', short: 'GM' },
  shift_leader: { label: 'Shift Leader', short: 'SL' },
  employee: { label: 'Team Member', short: 'TM' },
}

export const roleColor = (T: ThemeTokens, role: string) => {
  const map: Record<string, { fg: string; bg: string; bd: string }> = {
    super_admin: { fg: T.brand, bg: T.brandLo, bd: T.brandBd },
    org_admin: { fg: T.purple, bg: T.purpleLo, bd: T.purpleBd },
    location_manager: { fg: T.sky, bg: T.skyLo, bd: T.skyBd },
    shift_leader: { fg: T.amber, bg: T.amberLo, bd: T.amberBd },
    employee: { fg: T.t2, bg: T.bg3, bd: T.line }
  }
  return map[role] || { fg: T.t3, bg: T.bg4, bd: T.line2 }
}

export const catColor = (T: ThemeTokens, cat: string) => {
  const map: Record<string, { fg: string; bg: string; bd: string }> = {
    opening: { fg: T.sky, bg: T.skyLo, bd: T.skyBd },
    closing: { fg: T.brand, bg: T.brandLo, bd: T.brandBd },
    safety: { fg: T.red, bg: T.redLo, bd: T.redBd },
    general: { fg: T.lime, bg: T.limeLo, bd: T.limeBd }
  }
  return map[cat] || { fg: T.t3, bg: T.bg4, bd: T.line2 }
}
