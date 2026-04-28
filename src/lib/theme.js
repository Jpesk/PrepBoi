export const DARK = {
  bg0:'#0A0B09',bg1:'#111310',bg2:'#191C17',bg3:'#20241D',bg4:'#282D24',bg5:'#31372B',
  line:'#2E332A',line2:'#3A4034',
  t1:'#F0EBE1',t2:'#B8B09E',t3:'#7A7567',t4:'#4A4840',
  amber:'#F59E0B',amberHi:'#FBB93E',amberLo:'#2A1E04',amberBd:'#5C3A08',
  lime:'#84CC16',limeLo:'#182108',limeBd:'#2E4010',
  red:'#F05252',redLo:'#240A0A',redBd:'#4A1212',
  sky:'#38BDF8',skyLo:'#061824',skyBd:'#0C3050',
  purple:'#A78BFA',purpleLo:'#1E1040',purpleBd:'#3C2080',
  mode:'dark',
}
export const LIGHT = {
  bg0:'#FAF7F2',bg1:'#F3EEE6',bg2:'#EDE7DB',bg3:'#E5DDD0',bg4:'#DDD4C4',bg5:'#D4C9B6',
  line:'#D8D0C0',line2:'#C8BEA8',
  t1:'#1E1A14',t2:'#4A4438',t3:'#7A7060',t4:'#A89E8E',
  amber:'#D97706',amberHi:'#B45309',amberLo:'#FEF3C7',amberBd:'#FDE68A',
  lime:'#4D7C0F',limeLo:'#F7FEE7',limeBd:'#BEF264',
  red:'#DC2626',redLo:'#FEF2F2',redBd:'#FECACA',
  sky:'#0284C7',skyLo:'#E0F2FE',skyBd:'#BAE6FD',
  purple:'#7C3AED',purpleLo:'#EDE9FE',purpleBd:'#C4B5FD',
  mode:'light',
}
export const ROLE_META = {
  super_user:   { label:'Super User',   short:'SU' },
  shift_leader: { label:'Shift Leader', short:'SL' },
  employee:     { label:'Employee',     short:'EE' },
}
export const roleColor = (T, role) => ({
  super_user:   { fg:T.amber,  bg:T.amberLo,  bd:T.amberBd  },
  shift_leader: { fg:T.sky,    bg:T.skyLo,    bd:T.skyBd    },
  employee:     { fg:T.t3,     bg:T.bg4,      bd:T.line2    },
}[role] ?? { fg:T.t3, bg:T.bg4, bd:T.line2 })
export const catColor = (T, cat) => ({
  opening:{ fg:T.lime,  bg:T.limeLo,  bd:T.limeBd  },
  closing:{ fg:T.amber, bg:T.amberLo, bd:T.amberBd },
  safety: { fg:T.red,   bg:T.redLo,   bd:T.redBd   },
  general:{ fg:T.sky,   bg:T.skyLo,   bd:T.skyBd   },
}[cat] ?? { fg:T.sky, bg:T.skyLo, bd:T.skyBd })
