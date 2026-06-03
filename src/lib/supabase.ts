/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// ──────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE MOCK DATABASE FOR OFFLINE DEMO MODES
// ──────────────────────────────────────────────────────────────────────────────

// Static seed data for local fallback mode
const INITIAL_SEEDS: Record<string, any[]> = {
  organizations: [
    {
      id: "org_1",
      name: "Tacotchi Grill",
      slug: "tacotchi-grill",
      logo_url: null,
      plan: "starter",
      pet_theme: "tacotchi",
      api_provider: "mock",
      api_endpoint: null,
      log_decryption_hash: null,
      modules: { daily_summary: true, training: true, recipes: true, communications: true },
      branding: { brand: "#f26430", bg0: "#0c0b0e" }
    }
  ],
  locations: [
    {
      id: "loc_1",
      org_id: "org_1",
      name: "Downtown Kitchen",
      address: "101 Main St",
      timezone: "America/Phoenix",
      is_active: true
    },
    {
      id: "loc_2",
      org_id: "org_1",
      name: "Uptown Express",
      address: "505 High Ave",
      timezone: "America/Phoenix",
      is_active: true
    }
  ],
  profile_locations: [
    { profile_id: "usr_mgr", location_id: "loc_1" },
    { profile_id: "usr_mgr", location_id: "loc_2" },
    { profile_id: "usr_emp", location_id: "loc_1" },
    { profile_id: "usr_kiosk", location_id: "loc_1" },
    { profile_id: "usr_oa", location_id: "loc_1" },
    { profile_id: "usr_oa", location_id: "loc_2" }
  ],
  profiles: [
    {
      id: "usr_sa",
      org_id: "org_1",
      location_id: "loc_1",
      full_name: "IT Super Admin",
      role: "super_admin",
      avatar_initials: "SA",
      theme: "dark",
      pin_code: "0000",
      is_active: true,
      is_kiosk: false,
      pet_status: {
        name: "Robopet",
        theme: "coffeebot",
        level: 5,
        exp: 10,
        health: 100,
        happiness: 100,
        treats: 10,
        accessories: [],
        last_decay_date: new Date().toISOString().split('T')[0]
      }
    },
    {
      id: "usr_oa",
      org_id: "org_1",
      location_id: "loc_1",
      full_name: "Sarah HR Admin",
      role: "org_admin",
      avatar_initials: "SH",
      theme: "dark",
      pin_code: "8888",
      is_active: true,
      is_kiosk: false,
      pet_status: {
        name: "Doughboi",
        theme: "doughboi",
        level: 2,
        exp: 50,
        health: 90,
        happiness: 95,
        treats: 4,
        accessories: [],
        last_decay_date: new Date().toISOString().split('T')[0]
      }
    },
    {
      id: "usr_mgr",
      org_id: "org_1",
      location_id: "loc_1",
      full_name: "Jane Manager",
      role: "location_manager",
      avatar_initials: "JM",
      theme: "dark",
      pin_code: "1111",
      is_active: true,
      is_kiosk: false,
      pet_status: {
        name: "Coffeebot",
        theme: "coffeebot",
        level: 3,
        exp: 60,
        health: 95,
        happiness: 90,
        treats: 5,
        accessories: [],
        last_decay_date: new Date().toISOString().split('T')[0]
      }
    },
    {
      id: "usr_emp",
      org_id: "org_1",
      location_id: "loc_1",
      full_name: "Alex Employee",
      role: "employee",
      avatar_initials: "AE",
      theme: "dark",
      pin_code: "2222",
      is_active: true,
      is_kiosk: false,
      pet_status: {
        name: "Tacotchi",
        theme: "tacotchi",
        level: 1,
        exp: 20,
        health: 80,
        happiness: 85,
        treats: 2,
        accessories: [],
        last_decay_date: new Date().toISOString().split('T')[0]
      }
    },
    {
      id: "usr_kiosk",
      org_id: "org_1",
      location_id: "loc_1",
      full_name: "Kiosk iPad",
      role: "employee",
      avatar_initials: "KI",
      theme: "dark",
      pin_code: "9999",
      is_active: true,
      is_kiosk: true,
      pet_status: {
        name: "KioskPet",
        theme: "doughboi",
        level: 1,
        exp: 0,
        health: 100,
        happiness: 100,
        treats: 0,
        accessories: [],
        last_decay_date: new Date().toISOString().split('T')[0]
      }
    }
  ],
  checklists: [
    {
      id: "cl_1",
      org_id: "org_1",
      location_id: "loc_1",
      created_by: "usr_mgr",
      title: "Line Kitchen Prep Checklist",
      emoji: "🍳",
      shift: "AM",
      category: "opening",
      due_time: "08:00",
      est_minutes: 15,
      schema: {
        sections: [
          {
            id: "sec_1",
            title: "Pre-flight Sanitation",
            items: [
              { id: "item_1", text: "Sanitize and wipe down all line prep surfaces", req: true, trig: { kind: "none" } },
              { id: "item_2", text: "Check sanitizer PPM bucket strength (must be 200-400 PPM)", req: true, trig: { kind: "temp", label: "Sanitizer PPM", warnAbove: 400 } }
            ]
          },
          {
            id: "sec_2",
            title: "Equipment Safety Checks",
            items: [
              { id: "item_3", text: "Walk-in freezer temperature audit", req: true, trig: { kind: "temp", label: "Freezer Temp (°F)", warnAbove: 0 } },
              { id: "item_4", text: "Verify grill exhaust hoods are active", req: true, trig: { kind: "yn", label: "Fans Active?" } }
            ]
          }
        ]
      }
    },
    {
      id: "cl_2",
      org_id: "org_1",
      location_id: "loc_1",
      created_by: "usr_mgr",
      title: "Closing Shift Shutdown",
      emoji: "🧹",
      shift: "PM",
      category: "closing",
      due_time: "22:00",
      est_minutes: 20,
      schema: {
        sections: [
          {
            id: "sec_c1",
            title: "Cleanup & Lockup",
            items: [
              { id: "item_c1", text: "Empty grill grease trap & wash filters", req: true, trig: { kind: "none" } },
              { id: "item_c2", text: "Sweep and mop prep line floors", req: true, trig: { kind: "none" } },
              { id: "item_c3", text: "Verify rear loading door is double-locked", req: true, trig: { kind: "sig", label: "Closing Manager Signoff" } }
            ]
          }
        ]
      }
    }
  ],
  recipes: [
    {
      id: "rec_1",
      org_id: "org_1",
      location_id: "loc_1",
      created_by: "usr_mgr",
      title: "Secret House Taco Seasoning",
      category: "Breads",
      yield_amount: 10,
      yield_unit: "batches",
      prep_time: "10m",
      bake_time: "0m",
      temperature: "N/A",
      notes: "Store in airtight canisters. Keep away from direct heat.",
      ingredients: [
        { id: "ing_1", name: "Chili Powder", amount: 200, unit: "g" },
        { id: "ing_2", name: "Ground Cumin", amount: 150, unit: "g" },
        { id: "ing_3", name: "Garlic Powder", amount: 100, unit: "g" },
        { id: "ing_4", name: "Dried Mexican Oregano", amount: 50, unit: "g" }
      ],
      steps: [
        "Weigh all dry ingredients carefully.",
        "Sift together into a large stainless steel bowl.",
        "Whisk thoroughly to guarantee even dispersion of spices."
      ],
      quiz_questions: [
        {
          q: "What amount of Chili Powder is required for Secret House Taco Seasoning?",
          opts: ["100 g", "150 g", "200 g", "250 g"],
          ans: 2
        },
        {
          q: "True or False: Spices should be sifted to prevent clumping.",
          opts: ["True", "False"],
          ans: 0
        }
      ]
    }
  ],
  sops: [
    {
      id: "sop_1",
      title: "Handwashing & Hygiene Standards",
      emoji: "🧼",
      category: "safety",
      read_minutes: 3,
      sections: [
        {
          title: "The Hygiene Standard",
          body: "All food handlers must wash hands for a minimum of 20 seconds using warm water (at least 100°F) and antibacterial soap. Wash hands upon entering the kitchen, after handling raw meat, after touching your face, and after clearing trash."
        },
        {
          title: "Correct Handwashing Procedure",
          body: "1. Wet hands with warm water. 2. Apply antibacterial soap. 3. Rub hands together vigorously for 20 seconds, cleaning backs of hands, under fingernails, and forearms. 4. Rinse under running water. 5. Dry hands using single-use paper towels."
        }
      ]
    }
  ],
  training_assignments: [
    {
      id: "assign_1",
      assigned_to: "usr_emp",
      sop_id: "sop_1",
      recipe_id: null,
      recipe_book: null,
      quiz_score: null,
      completed_at: null,
      sops: {
        id: "sop_1",
        title: "Handwashing & Hygiene Standards",
        emoji: "🧼",
        category: "safety",
        read_minutes: 3,
        sections: [
          {
            title: "The Hygiene Standard",
            body: "All food handlers must wash hands for a minimum of 20 seconds using warm water (at least 100°F) and antibacterial soap. Wash hands upon entering the kitchen, after handling raw meat, after touching your face, and after clearing trash."
          },
          {
            title: "Correct Handwashing Procedure",
            body: "1. Wet hands with warm water. 2. Apply antibacterial soap. 3. Rub hands together vigorously for 20 seconds, cleaning backs of hands, under fingernails, and forearms. 4. Rinse under running water. 5. Dry hands using single-use paper towels."
          }
        ]
      }
    },
    {
      id: "assign_2",
      assigned_to: "usr_emp",
      sop_id: null,
      recipe_id: "rec_1",
      recipe_book: null,
      quiz_score: null,
      completed_at: null
    },
    {
      id: "assign_3",
      assigned_to: "usr_emp",
      sop_id: null,
      recipe_id: null,
      recipe_book: "Breads",
      quiz_score: null,
      completed_at: null
    }
  ],
  announcements: [
    {
      id: "ann_1",
      title: "Q3 Kitchen Standards Inspection",
      body: "Friendly reminder that the state health auditor is visiting this Thursday. Please ensure all sanitizer logs are up-to-date, temperature gauges are calibrated, and hairnets/caps are worn properly at all times. Let's get that 100% score!",
      created_at: "2026-05-18T10:00:00Z",
      created_by: "usr_mgr",
      profiles: { full_name: "Jane Manager" },
      acksCount: 1,
      isAcked: false
    }
  ],
  chat_messages: [
    {
      id: "msg_1",
      body: "Hey Alex! Make sure to verify the grill temps before opening tomorrow.",
      created_at: "2026-05-19T21:00:00Z",
      sender_id: "usr_mgr",
      recipient_id: "usr_emp",
      group_id: null,
      senderName: "Jane Manager"
    },
    {
      id: "msg_2",
      body: "Will do, Jane! I'll record it on the opening checklist as soon as I get in.",
      created_at: "2026-05-19T21:05:00Z",
      sender_id: "usr_emp",
      recipient_id: "usr_mgr",
      group_id: null,
      senderName: "Alex Employee"
    }
  ],
  checklists_submissions: [],
  checklists_submission_revisions: [],
  manager_logs: []
}

// Helper to load/save state from localStorage
const getTable = (name: string): any[] => {
  let key = name
  if (name === 'checklist_submissions') key = 'checklists_submissions'
  if (name === 'checklist_submission_revisions') key = 'checklists_submission_revisions'
  
  const stored = localStorage.getItem(`preppro_db_${key}`)
  if (stored) return JSON.parse(stored)
  // Save seed if missing
  const seed = INITIAL_SEEDS[key] || []
  localStorage.setItem(`preppro_db_${key}`, JSON.stringify(seed))
  return seed
}

const saveTable = (name: string, data: any[]): void => {
  let key = name
  if (name === 'checklist_submissions') key = 'checklists_submissions'
  if (name === 'checklist_submission_revisions') key = 'checklists_submission_revisions'
  localStorage.setItem(`preppro_db_${key}`, JSON.stringify(data))
}

// Chainable mock query builder imitating PostgREST queries
class MockQueryBuilder {
  private tableName: string
  private filters: Array<{ col: string; val: any; op: 'eq' | 'or' }> = []
  private sortCol: string | null = null
  private sortAsc: boolean = true

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(_fields?: string) {
    return this
  }

  insert(values: any) {
    const table = getTable(this.tableName)
    const toInsert = Array.isArray(values) ? values : [values]
    
    // Add primary keys or creation dates if missing
    const enriched = toInsert.map(v => ({
      id: v.id || `${this.tableName.slice(0, 3)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      created_at: v.created_at || new Date().toISOString(),
      ...v
    }))

    saveTable(this.tableName, [...table, ...enriched])
    
    // Return mock postgrest output
    const singleData = Array.isArray(values) ? enriched : enriched[0]
    return Promise.resolve({ data: singleData, error: null })
  }

  update(updates: any) {
    const table = getTable(this.tableName)
    let updatedRows: any[] = []

    const nextTable = table.map(row => {
      // Check if row matches all filters
      const match = this.filters.every(f => row[f.col] === f.val)
      if (match) {
        const nextRow = { ...row, ...updates }
        updatedRows.push(nextRow)
        return nextRow
      }
      return row
    })

    saveTable(this.tableName, nextTable)
    return Promise.resolve({ data: updatedRows, error: null })
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val, op: 'eq' })
    return this
  }

  or(expr: string) {
    // Basic parser for .or("sender_id.eq.usr_emp,recipient_id.eq.usr_emp")
    // Simple mock logic for specific app queries
    if (expr.includes('usr_emp')) {
      this.filters.push({ col: 'sender_id', val: 'usr_emp', op: 'or' })
    }
    return this
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.sortCol = col
    this.sortAsc = options?.ascending !== false
    return this
  }

  limit(_limit: number) {
    return this
  }

  single() {
    return this.exec().then(res => {
      return {
        data: res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null,
        error: res.data ? null : new Error('No rows found')
      }
    })
  }

  maybeSingle() {
    return this.exec().then(res => ({
      data: res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null,
      error: null
    }))
  }

  // Thenable interface makes it awaitable
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    return this.exec().then(onfulfilled, onrejected)
  }

  exec(): Promise<{ data: any; error: any }> {
    let rows: any[] = []
    if (this.tableName === 'v_submission_dashboard') {
      const subs = getTable('checklist_submissions')
      const checklists = getTable('checklists')
      const profs = getTable('profiles')
      rows = subs.map(cs => {
        const cl = checklists.find(c => c.id === cs.checklist_id) || { title: 'Checklist', emoji: '📋', category: 'general', due_time: '12:00' }
        const p = profs.find(prof => prof.id === cs.submitted_by) || { full_name: 'Alex Employee', avatar_initials: 'AE', role: 'employee' }
        return {
          id: cs.id,
          submission_date: cs.submission_date,
          status: cs.status,
          progress: cs.progress,
          submitted_at: cs.submitted_at,
          started_at: cs.started_at,
          employee_name: p.full_name,
          avatar_initials: p.avatar_initials,
          employee_role: p.role,
          location_name: 'Main Location',
          checklist_title: cl.title,
          checklist_emoji: cl.emoji,
          checklist_category: cl.category,
          due_time: cl.due_time
        }
      })
    } else {
      rows = getTable(this.tableName)
    }

    // Apply filters
    if (this.tableName === 'chat_messages' && this.filters.some(f => f.op === 'or')) {
      // Special logic for chat log filters
      rows = rows.filter(row => {
        return row.sender_id === 'usr_emp' || row.recipient_id === 'usr_emp' || row.sender_id === 'usr_mgr' || row.recipient_id === 'usr_mgr'
      })
    } else if (this.filters.length > 0) {
      rows = rows.filter(row => {
        return this.filters.every(f => {
          if (f.op === 'eq') return row[f.col] === f.val
          return true
        })
      })
    }

    // Apply sorting
    if (this.sortCol) {
      const col = this.sortCol
      rows.sort((a, b) => {
        const valA = a[col] || ''
        const valB = b[col] || ''
        if (valA < valB) return this.sortAsc ? -1 : 1
        if (valA > valB) return this.sortAsc ? 1 : -1
        return 0
      })
    }

    // Attach joint structures if queried (mock joins)
    if (this.tableName === 'training_assignments') {
      const sops = getTable('sops')
      const recipes = getTable('recipes')
      rows = rows.map(r => ({
        ...r,
        sops: sops.find(s => s.id === r.sop_id) || null,
        recipes: recipes.find(s => s.id === r.recipe_id) || null
      }))
    } else if (this.tableName === 'announcements' || this.tableName === 'manager_logs') {
      const profs = getTable('profiles')
      rows = rows.map(r => ({
        ...r,
        profiles: profs.find(p => p.id === r.created_by) || { full_name: 'Jane Manager' }
      }))
    } else if (this.tableName === 'checklist_submissions' || this.tableName === 'checklists_submissions') {
      const profs = getTable('profiles')
      const checklists = getTable('checklists')
      rows = rows.map(r => ({
        ...r,
        profiles: profs.find(p => p.id === r.submitted_by) || { full_name: 'Alex Employee' },
        checklists: checklists.find(c => c.id === r.checklist_id) || { title: 'Checklist', emoji: '📋' }
      }))
    } else if (this.tableName === 'checklist_submission_revisions' || this.tableName === 'checklists_submission_revisions') {
      const profs = getTable('profiles')
      rows = rows.map(r => ({
        ...r,
        profiles: profs.find(p => p.id === r.updated_by) || { full_name: 'Alex Employee' }
      }))
    } else if (this.tableName === 'profile_locations') {
      const locations = getTable('locations')
      rows = rows.map(r => ({
        ...r,
        locations: locations.find(l => l.id === r.location_id) || { id: r.location_id, name: 'Location' }
      }))
    }

    return Promise.resolve({ data: rows, error: null })
  }
}

// Mock Supabase Auth engine
const mockAuth = {
  getSession: async () => {
    const activeUserId = localStorage.getItem('preppro_active_user')
    if (activeUserId) {
      const profs = getTable('profiles')
      const userProf = profs.find(p => p.id === activeUserId)
      if (userProf) {
        return {
          data: {
            session: {
              user: {
                id: userProf.id,
                email: `${userProf.role}@preppro.io`,
                user_metadata: { full_name: userProf.full_name }
              }
            }
          },
          error: null
        }
      }
    }
    return { data: { session: null }, error: null }
  },

  signInWithPassword: async ({ email }: any) => {
    const profs = getTable('profiles')
    let matchedProfile = profs[0] // Default fallback

    if (email.includes('sa') || email.includes('admin')) {
      matchedProfile = profs.find(p => p.id === 'usr_sa') || matchedProfile
    } else if (email.includes('hr') || email.includes('oa')) {
      matchedProfile = profs.find(p => p.id === 'usr_oa') || matchedProfile
    } else if (email.includes('manager') || email.includes('gm')) {
      matchedProfile = profs.find(p => p.id === 'usr_mgr') || matchedProfile
    } else if (email.includes('employee')) {
      matchedProfile = profs.find(p => p.id === 'usr_emp') || matchedProfile
    } else if (email.includes('kiosk')) {
      matchedProfile = profs.find(p => p.id === 'usr_kiosk') || matchedProfile
    }

    localStorage.setItem('preppro_active_user', matchedProfile.id)
    
    // Trigger callback if defined
    if (authStateCallbacks.length > 0) {
      const mockSession = {
        user: {
          id: matchedProfile.id,
          email: `${matchedProfile.role}@preppro.io`,
          user_metadata: { full_name: matchedProfile.full_name }
        }
      }
      authStateCallbacks.forEach(cb => cb('SIGNED_IN', mockSession))
    }

    return {
      data: {
        session: { user: { id: matchedProfile.id, email: email } }
      },
      error: null
    }
  },

  signUp: async ({ email, options }: any) => {
    const profs = getTable('profiles')
    const nextId = 'usr_' + Date.now()
    const newProf = {
      id: nextId,
      org_id: options?.data?.org_id || 'org_1',
      location_id: options?.data?.location_id || null,
      full_name: options?.data?.full_name || 'New Staff',
      role: options?.data?.role || 'employee',
      avatar_initials: (options?.data?.full_name || 'NS').slice(0, 2).toUpperCase(),
      theme: 'dark',
      pin_code: '5555',
      is_active: true,
      is_kiosk: !!options?.data?.is_kiosk,
      pet_status: {
        name: 'Doughboi',
        theme: 'doughboi',
        level: 1,
        exp: 0,
        health: 100,
        happiness: 100,
        treats: 0,
        accessories: [],
        last_decay_date: new Date().toISOString().split('T')[0]
      }
    }

    saveTable('profiles', [...profs, newProf])
    return { data: { user: { id: nextId, email } }, error: null }
  },

  signOut: async () => {
    localStorage.removeItem('preppro_active_user')
    if (authStateCallbacks.length > 0) {
      authStateCallbacks.forEach(cb => cb('SIGNED_OUT', null))
    }
    return { error: null }
  },

  onAuthStateChange: (cb: any) => {
    authStateCallbacks.push(cb)
    
    // Instantly check initial auth status
    const activeUserId = localStorage.getItem('preppro_active_user')
    if (activeUserId) {
      const profs = getTable('profiles')
      const userProf = profs.find(p => p.id === activeUserId)
      if (userProf) {
        const mockSession = {
          user: {
            id: userProf.id,
            email: `${userProf.role}@preppro.io`,
            user_metadata: { full_name: userProf.full_name }
          }
        }
        cb('SIGNED_IN', mockSession)
      }
    } else {
      cb('INITIAL_SESSION', null)
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authStateCallbacks = authStateCallbacks.filter(c => c !== cb)
          }
        }
      }
    }
  }
}

let authStateCallbacks: Function[] = []

// Realtime Channel Mocks
class MockChannel {
  on(_event: string, _filter: any, callback: any) {
    // Simulate real-time responses locally by storing message triggers
    mockRealtimeListeners.push(callback)
    return this
  }
  subscribe() {
    return this
  }
}

const mockRealtimeListeners: Function[] = []

const mockStorage = {
  from: (bucket: string) => ({
    upload: async (path: string, _file: any) => {
      console.log(`Mock upload to storage: bucket=${bucket}, path=${path}`)
      return { data: { path }, error: null }
    },
    getPublicUrl: (path: string) => {
      // Use a premium mock visual from Picsum with a random seed based on path
      const seedVal = encodeURIComponent(path).replace(/%/g, '').slice(-5)
      return { data: { publicUrl: `https://picsum.photos/seed/${seedVal}/800/600` } }
    }
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// CLIENT GATEWAY
// ──────────────────────────────────────────────────────────────────────────────

const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'))

export const supabase: any = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: mockAuth,
      from: (table: string) => new MockQueryBuilder(table),
      storage: mockStorage,
      channel: () => new MockChannel(),
      removeChannel: () => {}
    }

export type SupabaseClientType = typeof supabase
export default supabase
