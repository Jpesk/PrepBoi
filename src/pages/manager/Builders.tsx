import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, SectionLabel, Input, Select, Textarea, Toast } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { Plus, Trash, FileText, Clipboard, Utensils, Save, ChevronUp, ChevronDown, Smartphone, UploadCloud, Link as LinkIcon, Award, BookOpen } from 'lucide-react'
import { parseChecklistUrl, parseDocumentUpload, getQuizQuestions } from '../../lib/onboarding'

// ─── Predefined Checklist Templates ───────────────────────────────────────────
// Inspired by real-world AM/PM checklists (e.g. Bake Tempe on Tally) and
// common restaurant, retail, and food-service operational standards.

type ClSection = {
  id: string
  title: string
  cond?: { fieldId: string; value: string | boolean } | null
  items: Array<{
    id: string
    text: string
    req: boolean
    cond?: { fieldId: string; value: string | boolean } | null
    trig: { kind: 'note' | 'yn' | 'temp' | 'sig' | 'none' | 'number' | 'photo' | 'dropdown' | 'datetime'; label?: string; warnAbove?: number; options?: string }
  }>
}

interface ChecklistTemplate {
  emoji: string
  title: string
  shift: string
  category: 'opening' | 'closing' | 'safety' | 'general'
  description: string
  sections: ClSection[]
}

const mk = (id: string, text: string, req = true, kind: ClSection['items'][0]['trig']['kind'] = 'none'): ClSection['items'][0] =>
  ({ id, text, req, trig: { kind } })

const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    emoji: '☀️', title: 'AM Opening Checklist', shift: 'AM', category: 'opening',
    description: 'Standard morning setup: arrival, display, sanitation, and opening sequence.',
    sections: [
      { id: 's1', title: 'Arrival & Setup', items: [
        mk('i1', 'Count cash drawer and verify against POS'),
        mk('i2', 'Check prepped items from previous night (label dates)'),
        mk('i3', 'Set up displays and merchandising areas'),
        mk('i4', 'Prepare sanitizer buckets and complete form'),
        mk('i5', 'Complete daily prep list'),
      ]},
      { id: 's2', title: 'Opening Sequence', items: [
        mk('i6', 'Unlock front doors at scheduled open time'),
        mk('i7', 'Turn on open sign and exterior lighting'),
        mk('i8', 'Start equipment (ovens, fryers, coffee etc.)'),
        mk('i9', 'Restock and face front-of-house displays'),
      ]},
      { id: 's3', title: 'Safety & Sanitation', items: [
        mk('i10', 'Verify fridge/freezer temps within safe range', true, 'temp'),
        mk('i11', 'Check and log handwashing station is stocked'),
        mk('i12', 'Inspect floors for hazards — dry and clear'),
      ]},
    ]
  },
  {
    emoji: '🌙', title: 'PM Closing Checklist', shift: 'PM', category: 'closing',
    description: 'End-of-day breakdown, clean-down, security, and handover.',
    sections: [
      { id: 's1', title: 'Kitchen Breakdown', items: [
        mk('i1', 'Cool and label all remaining prepared food'),
        mk('i2', 'Clean and sanitize all prep surfaces'),
        mk('i3', 'Wash, rinse, and sanitize all equipment'),
        mk('i4', 'Empty and clean grease traps'),
        mk('i5', 'Take out trash and replace liners'),
      ]},
      { id: 's2', title: 'Front-of-House Closedown', items: [
        mk('i6', 'Clear and wipe all tables and chairs'),
        mk('i7', 'Sweep and mop floors'),
        mk('i8', 'Restock napkins, condiments, and supplies'),
        mk('i9', 'Turn off open sign and displays'),
      ]},
      { id: 's3', title: 'Security & Cash', items: [
        mk('i10', 'Count and reconcile cash drawer', true, 'number'),
        mk('i11', 'Lock all doors and set alarm'),
        mk('i12', 'Submit shift notes in Daily Summary'),
      ]},
    ]
  },
  {
    emoji: '🛡️', title: 'Food Safety Audit', shift: 'ALL', category: 'safety',
    description: 'Daily HACCP and food safety compliance checks for critical control points.',
    sections: [
      { id: 's1', title: 'Temperature Control', items: [
        mk('i1', 'Walk-in cooler: log temp (target ≤ 41°F)', true, 'temp'),
        mk('i2', 'Walk-in freezer: log temp (target ≤ 0°F)', true, 'temp'),
        mk('i3', 'Hot-hold equipment at or above 135°F', true, 'temp'),
        mk('i4', 'Cold-hold equipment at or below 41°F', true, 'temp'),
      ]},
      { id: 's2', title: 'Hygiene & Cross-Contamination', items: [
        mk('i5', 'Verify all staff completed handwashing log'),
        mk('i6', 'Raw proteins stored below ready-to-eat items'),
        mk('i7', 'Color-coded cutting boards in use and clean'),
        mk('i8', 'Gloves available and worn for ready-to-eat handling'),
      ]},
      { id: 's3', title: 'Labeling & Dating', items: [
        mk('i9', 'All prepped items labeled with date and time'),
        mk('i10', 'Items past use-by date disposed of and logged', true, 'note'),
        mk('i11', 'FIFO rotation verified in all storage areas'),
      ]},
    ]
  },
  {
    emoji: '🥐', title: 'Bakery AM Checklist', shift: 'AM', category: 'opening',
    description: 'Based on real bakery operations (inspired by Bake Tempe AM Checklist). Setup, bake, and open.',
    sections: [
      { id: 's1', title: 'Arrival / Setup (Before Open)', items: [
        mk('i1', 'Check cookie/product count on POS/Toast App'),
        mk('i2', 'Verify prepped items: toppings, fillings, garnishes'),
        mk('i3', 'Set up front display case'),
        mk('i4', 'Prepare sanitizer bucket and complete form'),
        mk('i5', 'Complete daily prep list'),
      ]},
      { id: 's2', title: 'Check Previous Closing', items: [
        mk('i6', 'Was closing done properly?', true, 'yn'),
        mk('i7', 'AM bake needed?', true, 'yn'),
      ]},
      { id: 's3', title: 'Open (First 2 Hours)', items: [
        mk('i8', 'Doors unlocked at open time'),
        mk('i9', 'Open sign turned on'),
        mk('i10', 'Bag and stock cooled product from overnight bake'),
        mk('i11', 'Batch fresh product as needed'),
        mk('i12', 'Prep items for afternoon: toppings, fillings, etc.'),
      ]},
      { id: 's4', title: 'Afternoon Transition', items: [
        mk('i13', 'Complete sanitizer swap and update log'),
        mk('i14', 'Dishes done and surfaces clean'),
        mk('i15', 'Restock displays and confirm product levels'),
        mk('i16', 'Handover prep notes to PM team'),
      ]},
    ]
  },
  {
    emoji: '🛒', title: 'Retail Opening Checklist', shift: 'AM', category: 'opening',
    description: 'Standard retail store opening: till setup, floor, merchandising, and team readiness.',
    sections: [
      { id: 's1', title: 'Store Setup', items: [
        mk('i1', 'Open and count cash registers'),
        mk('i2', 'Turn on all lighting and screens'),
        mk('i3', 'Unlock entrance doors'),
        mk('i4', 'Disable alarm and check security log'),
      ]},
      { id: 's2', title: 'Floor & Merchandising', items: [
        mk('i5', 'Face and tidy all shelves'),
        mk('i6', 'Check and rotate stock — FIFO'),
        mk('i7', 'Restock high-velocity items from back room'),
        mk('i8', 'Clean and dry all floor areas'),
        mk('i9', 'Check promotional signage is correct'),
      ]},
      { id: 's3', title: 'Team Readiness', items: [
        mk('i10', 'All staff in uniform and name tags on'),
        mk('i11', 'Team briefed on daily targets and promotions'),
        mk('i12', 'Radio / headsets charged and distributed'),
      ]},
    ]
  },
  {
    emoji: '🌿', title: 'Weekly Deep Clean', shift: 'ALL', category: 'general',
    description: 'Thorough weekly sanitation of all kitchen zones, equipment, and storage areas.',
    sections: [
      { id: 's1', title: 'Kitchen Equipment', items: [
        mk('i1', 'Deep clean ovens, including racks and interior'),
        mk('i2', 'Degrease and clean fryers'),
        mk('i3', 'Clean behind and under all equipment'),
        mk('i4', 'Sanitize ice machine and check water filter'),
        mk('i5', 'Descale coffee machines and kettles'),
      ]},
      { id: 's2', title: 'Storage & Refrigeration', items: [
        mk('i6', 'Empty, clean, and sanitize walk-in cooler'),
        mk('i7', 'Clean freezer — remove frost, organize'),
        mk('i8', 'Wipe down all dry storage shelves'),
        mk('i9', 'Inspect for pests and evidence of infestation'),
      ]},
      { id: 's3', title: 'Surfaces & Floors', items: [
        mk('i10', 'Scrub and sanitize all prep tables'),
        mk('i11', 'Deep scrub floor including grout and drains'),
        mk('i12', 'Clean walls up to 6 feet, especially near equipment'),
        mk('i13', 'Clean and polish stainless steel fixtures'),
      ]},
    ]
  },
]

export const Builders: React.FC = () => {
  const { T } = useTheme()
  const { profile } = useAuth()

  // Select active builder tab: 'sop', 'checklist', 'recipe'
  const [activeTab, setActiveTab] = useState<'sop' | 'checklist' | 'recipe' | 'quiz'>('sop')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateTab, setTemplateTab] = useState<'standard' | 'custom'>('standard')
  const [customTemplates, setCustomTemplates] = useState<any[]>([])

  const loadCustomTemplates = async () => {
    if (!profile) return
    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (data) setCustomTemplates(data)
    } catch (err) {
      console.error('Failed to load custom templates:', err)
    }
  }

  useEffect(() => {
    loadCustomTemplates()
  }, [profile])

  const handleSopUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    try {
      const data = await parseDocumentUpload(file, 'sop')
      setSopTitle(data.title || file.name)
      if (data.sections && data.sections.length > 0) {
        setSopSections(data.sections)
      }
      setToastMsg('SOP successfully extracted from document!')
    } catch (err: any) {
      setToastMsg(err.message || 'Failed to extract SOP.')
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  const handleRecipeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)

    // Client-side JSON file parsing
    if (file.name.toLowerCase().endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string)
          setRecTitle(json.title || json.name || file.name.replace(/\.[^/.]+$/, ""))
          if (json.category) setRecCategory(json.category)
          if (json.yield_amount) setRecYieldVal(json.yield_amount)
          if (json.yield_unit) setRecYieldUnit(json.yield_unit)
          if (json.prep_time) setRecPrep(json.prep_time)
          if (json.bake_time) setRecBake(json.bake_time)
          if (json.temperature) setRecTemp(json.temperature)
          
          if (json.ingredients && Array.isArray(json.ingredients)) {
            const formattedIngs = json.ingredients.map((ing: any, index: number) => ({
              id: ing.id || `ing_${Date.now()}_${index}`,
              name: ing.name || '',
              amount: typeof ing.amount === 'number' ? ing.amount : parseFloat(ing.amount) || 0,
              unit: ing.unit || ''
            }))
            setRecIngs(formattedIngs)
          }
          if (json.steps && Array.isArray(json.steps)) {
            setRecSteps(json.steps.map((s: any) => typeof s === 'string' ? s : JSON.stringify(s)))
          }
          setToastMsg('Recipe successfully imported from JSON!')
        } catch (err) {
          setToastMsg('Failed to parse JSON file.')
        } finally {
          setIsImporting(false)
        }
      }
      reader.onerror = () => {
        setToastMsg('Failed to read JSON file.')
        setIsImporting(false)
      }
      reader.readAsText(file)
      return
    }

    try {
      const data = await parseDocumentUpload(file, 'recipe')
      setRecTitle(data.title || file.name)
      if (data.ingredients) setRecIngs(data.ingredients)
      if (data.steps) setRecSteps(data.steps)
      setToastMsg('Recipe successfully extracted from document!')
    } catch (err: any) {
      setToastMsg(err.message || 'Failed to extract Recipe.')
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  const handleChecklistUrl = async () => {
    const url = prompt('Enter the URL of the checklist to import:')
    if (!url) return
    setIsImporting(true)
    try {
      const data = await parseChecklistUrl(url)
      if (Array.isArray(data)) {
        setClSections(data)
        setToastMsg('Checklist successfully extracted from URL!')
      } else {
        throw new Error('Invalid format returned')
      }
    } catch (err: any) {
      setToastMsg(err.message || 'Failed to extract Checklist.')
    } finally {
      setIsImporting(false)
    }
  }

  // 0. QUIZ BUILDER STATE
  const [quizSourceType, setQuizSourceType] = useState<'sop' | 'recipe' | 'book'>('sop')
  const [selectedSopId, setSelectedSopId] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [selectedBookCategory, setSelectedBookCategory] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  
  const [sopsList, setSopsList] = useState<any[]>([])
  const [recipesList, setRecipesList] = useState<any[]>([])
  const [booksList, setBooksList] = useState<string[]>([])
  const [quizLoading, setQuizLoading] = useState(false)

  // Fetch SOPs and Recipes
  useEffect(() => {
    if (!profile) return
    const fetchSopsAndRecipes = async () => {
      try {
        const { data: s } = await supabase.from('sops').select('*').eq('org_id', profile.org_id).eq('is_active', true)
        if (s) setSopsList(s)

        const { data: r } = await supabase.from('recipes').select('*').eq('org_id', profile.org_id).eq('is_active', true)
        if (r) {
          setRecipesList(r)
          const cats = Array.from(new Set(r.map((recipe: any) => recipe.category).filter(Boolean))) as string[]
          setBooksList(cats)
        }
      } catch (err) {
        console.error('Failed to load assets for quiz builder:', err)
      }
    }
    fetchSopsAndRecipes()
  }, [profile, activeTab])

  // Load selected source questions
  useEffect(() => {
    setQuizQuestions([])
    if (quizSourceType === 'sop' && selectedSopId) {
      const sop = sopsList.find(s => s.id === selectedSopId)
      if (sop && sop.quiz_questions) {
        setQuizQuestions(sop.quiz_questions)
      }
    } else if (quizSourceType === 'recipe' && selectedRecipeId) {
      const rec = recipesList.find(r => r.id === selectedRecipeId)
      if (rec && rec.quiz_questions) {
        setQuizQuestions(rec.quiz_questions)
      }
    }
  }, [quizSourceType, selectedSopId, selectedRecipeId, sopsList, recipesList])

  const handleAutoGenerateQuiz = async () => {
    setQuizLoading(true)
    try {
      if (quizSourceType === 'sop' && selectedSopId) {
        const sop = sopsList.find(s => s.id === selectedSopId)
        if (sop) {
          const data = await getQuizQuestions({ ...sop, quiz_questions: [] }, 'sop')
          setQuizQuestions(data)
          setToastMsg('Quiz questions auto-generated successfully!')
        }
      } else if (quizSourceType === 'recipe' && selectedRecipeId) {
        const rec = recipesList.find(r => r.id === selectedRecipeId)
        if (rec) {
          const data = await getQuizQuestions({ ...rec, quiz_questions: [] }, 'recipe')
          setQuizQuestions(data)
          setToastMsg('Recipe quiz questions auto-generated successfully!')
        }
      } else if (quizSourceType === 'book' && selectedBookCategory) {
        const data = await getQuizQuestions({ id: 'book_' + selectedBookCategory, title: selectedBookCategory }, 'book')
        setQuizQuestions(data)
        setToastMsg('Recipe Book quiz questions auto-generated successfully!')
      } else {
        setToastMsg('Please select a source first.')
      }
    } catch (err) {
      console.error('Failed to generate quiz:', err)
      setToastMsg('Failed to generate quiz.')
    } finally {
      setQuizLoading(false)
    }
  }

  const handleSaveQuiz = async () => {
    if (quizQuestions.length === 0) {
      setToastMsg('No quiz questions to save.')
      return
    }
    setSaving(true)
    try {
      if (quizSourceType === 'sop' && selectedSopId) {
        const { error } = await supabase
          .from('sops')
          .update({ quiz_questions: quizQuestions })
          .eq('id', selectedSopId)
        if (error) throw error
        setToastMsg('SOP Quiz published successfully!')
        setSopsList(prev => prev.map(s => s.id === selectedSopId ? { ...s, quiz_questions: quizQuestions } : s))
      } else if (quizSourceType === 'recipe' && selectedRecipeId) {
        const { error } = await supabase
          .from('recipes')
          .update({ quiz_questions: quizQuestions })
          .eq('id', selectedRecipeId)
        if (error) throw error
        setToastMsg('Recipe Quiz published successfully!')
        setRecipesList(prev => prev.map(r => r.id === selectedRecipeId ? { ...r, quiz_questions: quizQuestions } : r))
      } else if (quizSourceType === 'book' && selectedBookCategory) {
        const sopTitle = `${selectedBookCategory} Recipe Book Exam`
        let bookSop = sopsList.find(s => s.title === sopTitle)
        if (bookSop) {
          const { error } = await supabase
            .from('sops')
            .update({ quiz_questions: quizQuestions })
            .eq('id', bookSop.id)
          if (error) throw error
        } else {
          const { data, error } = await supabase
            .from('sops')
            .insert({
              org_id: profile?.org_id,
              created_by: profile?.id,
              title: sopTitle,
              emoji: '📚',
              category: selectedBookCategory,
              read_minutes: 5,
              sections: [{ title: 'Recipe Book Study Guide', body: `Study all recipes in the ${selectedBookCategory} category.` }],
              quiz_questions: quizQuestions
            })
            .select()
            .single()
          if (error) throw error
          if (data) setSopsList(prev => [...prev, data])
        }
        setToastMsg('Recipe Book Exam published successfully as a Training SOP!')
      }
    } catch (err) {
      console.error('Failed to save quiz:', err)
      setToastMsg('Failed to save quiz.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddQuestion = () => {
    setQuizQuestions(prev => [
      ...prev,
      {
        q: 'New Question',
        opts: ['Option A', 'Option B', 'Option C', 'Option D'],
        ans: 0
      }
    ])
  }

  const handleQuestionChange = (qIdx: number, field: 'q' | 'ans', value: any) => {
    setQuizQuestions(prev => prev.map((q, idx) => idx === qIdx ? { ...q, [field]: value } : q))
  }

  const handleOptionChange = (qIdx: number, optIdx: number, value: string) => {
    setQuizQuestions(prev => prev.map((q, idx) => {
      if (idx === qIdx) {
        const nextOpts = [...q.opts]
        nextOpts[optIdx] = value
        return { ...q, opts: nextOpts }
      }
      return q
    }))
  }

  const handleDeleteQuestion = (qIdx: number) => {
    setQuizQuestions(prev => prev.filter((_, idx) => idx !== qIdx))
  }

  // 1. SOP BUILDER STATE
  const [sopTitle, setSopTitle] = useState('')
  const [sopEmoji, setSopEmoji] = useState('📄')
  const [sopCategory, setSopCategory] = useState('general')
  const [sopReadMin, setSopReadMin] = useState(5)
  const [sopSections, setSopSections] = useState<Array<{ title: string; body: string }>>([
    { title: 'Introduction', body: 'Standard steps for operations...' }
  ])

  // 2. CHECKLIST BUILDER STATE
  const [clTitle, setClTitle] = useState('')
  const [clEmoji, setClEmoji] = useState('📋')
  const [clShift, setClShift] = useState('ALL')
  const [clCategory, setClCategory] = useState<'opening' | 'closing' | 'safety' | 'general'>('general')
  const clDueTime = '12:00'
  const clEstMin = 15
  const [clScheduleType, setClScheduleType] = useState<'daily' | 'weekly' | 'monthly' | 'on_demand'>('daily')
  const [clScheduleDay, setClScheduleDay] = useState<number>(1) // Day of week (1-7) or day of month (1-31)
  const [clSignatureMode, setClSignatureMode] = useState<'none' | 'employee' | 'dual'>('employee')
  const [previewData, setPreviewData] = useState<Record<string, any>>({})
  
  const [clSections, setClSections] = useState<Array<{
    id: string
    title: string
    cond?: { fieldId: string; value: string | boolean } | null
    items: Array<{
      id: string
      text: string
      req: boolean
      cond?: { fieldId: string; value: string | boolean } | null
      trig: {
        kind: 'note' | 'yn' | 'temp' | 'sig' | 'none' | 'number' | 'photo' | 'dropdown' | 'datetime'
        label?: string
        warnAbove?: number
        options?: string
      }
    }>
  }>>([
    {
      id: 'sec_1',
      title: 'Opening Audits',
      items: [
        { id: 'item_1', text: 'Sanitize prep benches', req: true, trig: { kind: 'none' } }
      ]
    }
  ])

  // 3. RECIPE BUILDER STATE
  const [recTitle, setRecTitle] = useState('')
  const [recCategory, setRecCategory] = useState('Breads')
  const [recYieldVal, setRecYieldVal] = useState(12)
  const [recYieldUnit, setRecYieldUnit] = useState('servings')
  const [recPrep, setRecPrep] = useState('30m')
  const [recBake, setRecBake] = useState('20m')
  const [recTemp, setRecTemp] = useState('375°F')
  const recNotes = ''
  const [recIngs, setRecIngs] = useState<Array<{ id: string; name: string; amount: number; unit: string }>>([
    { id: 'ing_1', name: 'Flour', amount: 500, unit: 'g' }
  ])
  const [recSteps, setRecSteps] = useState<string[]>(['Weigh flour and yeast.', 'Mix ingredients thoroughly.'])

  // --- SOP HELPERS ---
  const addSopSection = () => {
    setSopSections(prev => [...prev, { title: 'New Chapter', body: '' }])
  }

  const removeSopSection = (idx: number) => {
    setSopSections(prev => prev.filter((_, i) => i !== idx))
  }

  const saveSop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !sopTitle.trim()) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('sops')
        .insert({
          org_id: profile.org_id,
          location_id: profile.location_id,
          created_by: profile.id,
          title: sopTitle.trim(),
          emoji: sopEmoji,
          category: sopCategory,
          read_minutes: sopReadMin,
          sections: sopSections
        })

      if (error) throw error

      setToastMsg('SOP created and added to Training database!')
      setSopTitle('')
      setSopSections([{ title: 'Introduction', body: '' }])
    } catch (err) {
      console.error('Failed saving SOP:', err)
      setToastMsg('Failed to save SOP.')
    } finally {
      setSaving(false)
    }
  }

  // --- CHECKLIST HELPERS ---
  const addClSection = () => {
    const newSecId = 'sec_' + Date.now()
    setClSections(prev => [...prev, { id: newSecId, title: 'New Section', items: [] }])
  }

  const removeClSection = (secId: string) => {
    setClSections(prev => prev.filter(sec => sec.id !== secId))
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= clSections.length) return
    const next = [...clSections]
    const temp = next[index]
    next[index] = next[newIndex]
    next[newIndex] = temp
    setClSections(next)
  }

  const addClItem = (secId: string) => {
    const newItemId = 'item_' + Date.now()
    setClSections(prev => prev.map(sec => {
      if (sec.id === secId) {
        return {
          ...sec,
          items: [...sec.items, { id: newItemId, text: '', req: false, trig: { kind: 'none' } }]
        }
      }
      return sec
    }))
  }

  const removeClItem = (secId: string, itemId: string) => {
    setClSections(prev => prev.map(sec => {
      if (sec.id === secId) {
        return {
          ...sec,
          items: sec.items.filter(item => item.id !== itemId)
        }
      }
      return sec
    }))
  }

  const moveClItem = (secId: string, itemIndex: number, direction: 'up' | 'down') => {
    setClSections(prev => prev.map(sec => {
      if (sec.id === secId) {
        const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1
        if (newIndex < 0 || newIndex >= sec.items.length) return sec
        const nextItems = [...sec.items]
        const temp = nextItems[itemIndex]
        nextItems[itemIndex] = nextItems[newIndex]
        nextItems[newIndex] = temp
        return { ...sec, items: nextItems }
      }
      return sec
    }))
  }

  // Preceding conditional items helper (for item-level show/hide logic)
  const getPrecedingCondItems = (secIndex: number, itemIndex: number) => {
    const list: Array<{ id: string; text: string; kind: string }> = []
    for (let sIdx = 0; sIdx <= secIndex; sIdx++) {
      const section = clSections[sIdx]
      if (!section) continue
      const maxIt = sIdx === secIndex ? itemIndex : section.items.length
      for (let iIdx = 0; iIdx < maxIt; iIdx++) {
        const item = section.items[iIdx]
        if (item.trig.kind === 'yn' || item.trig.kind === 'none') {
          list.push({ id: item.id, text: item.text || `Item ${item.id}`, kind: item.trig.kind })
        }
      }
    }
    return list
  }

  // Preceding conditional items for section-level show/hide logic
  const getPrecedingCondItemsForSection = (secIndex: number) => {
    const list: Array<{ id: string; text: string; kind: string }> = []
    for (let sIdx = 0; sIdx < secIndex; sIdx++) {
      const section = clSections[sIdx]
      if (!section) continue
      for (const item of section.items) {
        if (item.trig.kind === 'yn' || item.trig.kind === 'none') {
          list.push({ id: item.id, text: item.text || `Item ${item.id}`, kind: item.trig.kind })
        }
      }
    }
    return list
  }

  const saveChecklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !clTitle.trim()) return

    try {
      setSaving(true)
      
      // Clean JSON schema
      const formattedSections = clSections.map(sec => ({
        id: sec.id,
        title: sec.title,
        cond: sec.cond || null,
        items: sec.items.map(item => ({
          id: item.id,
          text: item.text,
          req: item.req,
          cond: item.cond || null,
          trig: {
            kind: item.trig.kind,
            label: item.trig.label || '',
            warnAbove: item.trig.warnAbove,
            options: item.trig.options || ''
          }
        }))
      }))

      const schema = { sections: formattedSections }

      const { error } = await supabase
        .from('checklists')
        .insert({
          org_id: profile.org_id,
          location_id: profile.location_id,
          created_by: profile.id,
          title: clTitle.trim(),
          emoji: clEmoji,
          shift: clShift,
          category: clCategory,
          due_time: clDueTime,
          est_minutes: clEstMin,
          schema,
          schedule_type: clScheduleType,
          schedule_day: clScheduleType === 'weekly' || clScheduleType === 'monthly' ? clScheduleDay : null,
          signature_mode: clSignatureMode
        })

      if (error) throw error

      setToastMsg('Checklist template successfully published!')
      setClTitle('')
      setClSections([{ id: 'sec_1', title: 'Standard Checklist Section', items: [] }])
      loadCustomTemplates()
    } catch (err) {
      console.error('Failed saving checklist:', err)
      setToastMsg('Failed to save checklist.')
    } finally {
      setSaving(false)
    }
  }

  // --- RECIPE HELPERS ---
  const addRecipeIngredient = () => {
    const nextIngId = 'ing_' + Date.now()
    setRecIngs(prev => [...prev, { id: nextIngId, name: '', amount: 1, unit: 'g' }])
  }

  const removeRecipeIngredient = (id: string) => {
    setRecIngs(prev => prev.filter(ing => ing.id !== id))
  }

  const saveRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !recTitle.trim()) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('recipes')
        .insert({
          org_id: profile.org_id,
          location_id: profile.location_id,
          created_by: profile.id,
          title: recTitle.trim(),
          category: recCategory,
          yield_amount: recYieldVal,
          yield_unit: recYieldUnit,
          prep_time: recPrep,
          bake_time: recBake,
          temperature: recTemp,
          ingredients: recIngs,
          steps: recSteps,
          notes: recNotes
        })

      if (error) throw error

      setToastMsg('Recipe successfully logged in Catalogue!')
      setRecTitle('')
      setRecIngs([{ id: 'ing_1', name: '', amount: 0, unit: '' }])
      setRecSteps([''])
    } catch (err) {
      console.error('Failed saving recipe:', err)
      setToastMsg('Failed to save recipe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{
          fontSize: 36,
          fontWeight: 800,
          margin: 0,
          color: T.t1,
          letterSpacing: '-0.5px',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Template Builders
        </h1>
        <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
          Create and deploy checklists, SOP chapters, and kitchen formulas.
        </p>
      </div>

      {/* Segmented Tab Control */}
      <div style={{ display: 'inline-flex', background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 4, gap: 2, flexWrap: 'wrap' }}>
        {([['sop', <FileText size={14} />, 'SOP Builder'], ['checklist', <Clipboard size={14} />, 'Checklist Builder'], ['recipe', <Utensils size={14} />, 'Recipe Builder'], ['quiz', <Award size={14} />, 'Quiz Builder']] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? T.bg0 : 'transparent',
              boxShadow: activeTab === tab ? `0 1px 3px rgba(0,0,0,0.1)` : 'none',
              border: `1px solid ${activeTab === tab ? T.line : 'transparent'}`,
              color: activeTab === tab ? T.t1 : T.t3,
              padding: '8px 18px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 500,
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── SOP BUILDER ── */}
      {activeTab === 'sop' && (
        <form onSubmit={saveSop} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
          
          {/* Document Import Banner */}
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16, background: T.brandLo, border: `1px dashed ${T.brand}` }}>
            <UploadCloud size={24} color={T.brand} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>Import from Document</div>
              <div style={{ fontSize: 11, color: T.t2 }}>Upload a PDF or DOCX to automatically parse and populate this SOP.</div>
            </div>
            <label style={{ cursor: isImporting ? 'not-allowed' : 'pointer' }}>
              <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleSopUpload} disabled={isImporting} style={{ display: 'none' }} />
              <div style={{ padding: '8px 16px', background: T.brand, color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                {isImporting ? 'Parsing...' : 'Upload File'}
              </div>
            </label>
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>General Information</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="SOP Title" placeholder="e.g. Bread Shaping Basics" value={sopTitle} onChange={e => setSopTitle(e.target.value)} required />
              <Input label="Emoji Icon" value={sopEmoji} onChange={e => setSopEmoji(e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="Category" placeholder="e.g. baking, front-of-house" value={sopCategory} onChange={e => setSopCategory(e.target.value)} required />
              <Input label="Read duration (Minutes)" type="number" value={sopReadMin} onChange={e => setSopReadMin(parseInt(e.target.value))} required />
            </div>
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Chapters & Sections</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {sopSections.map((sec, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: `1px solid ${T.line}`, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: T.brand }}>Chapter {idx + 1}</div>
                    <Btn v="danger" sz="xs" onClick={() => removeSopSection(idx)}>
                      Remove
                    </Btn>
                  </div>
                  <Input
                    placeholder="Chapter Title"
                    value={sec.title}
                    onChange={e => {
                      const next = [...sopSections]
                      next[idx].title = e.target.value
                      setSopSections(next)
                    }}
                    required
                  />
                  <Textarea
                    placeholder="Provide full training text..."
                    value={sec.body}
                    onChange={e => {
                      const next = [...sopSections]
                      next[idx].body = e.target.value
                      setSopSections(next)
                    }}
                    required
                  />
                </div>
              ))}
            </div>

            <Btn v="ghost" sz="sm" onClick={addSopSection} style={{ marginTop: 12 }}>
              <Plus size={14} /> Add Chapter
            </Btn>
          </Card>

          <Btn type="submit" v="brand" disabled={saving}>
            <Save size={16} /> {saving ? 'Publishing...' : 'Publish Training SOP'}
          </Btn>
        </form>
      )}

      {/* ── CHECKLIST BUILDER ── */}
      {activeTab === 'checklist' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) 340px', gap: 32, alignItems: 'flex-start' }}>
          
          {/* Left Panel: Builder Form */}
          <form onSubmit={saveChecklist} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Template + URL Import Row */}
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Templates Button */}
              <Card style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, background: T.purpleLo, border: `1px dashed ${T.purpleBd}`, cursor: 'pointer' }} onClick={() => setShowTemplates(true)}>
                <span style={{ fontSize: 24 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>Start from Template</div>
                  <div style={{ fontSize: 11, color: T.t2 }}>6 pre-built templates for bakery, retail & food service.</div>
                </div>
                <Btn type="button" v="brand" sz="sm" onClick={e => { e.stopPropagation(); setShowTemplates(true) }}>Browse</Btn>
              </Card>

              {/* URL Import Banner */}
              <Card style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, background: T.brandLo, border: `1px dashed ${T.brand}` }}>
                <LinkIcon size={22} color={T.brand} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>Import from URL</div>
                  <div style={{ fontSize: 11, color: T.t2 }}>Paste a link to a checklist from the web.</div>
                </div>
                <Btn type="button" v="brand" sz="sm" onClick={handleChecklistUrl} disabled={isImporting}>
                  {isImporting ? 'Extracting...' : 'Paste Link'}
                </Btn>
              </Card>
            </div>

            {/* Template Picker Modal */}
            {showTemplates && (
              <>
                <div onClick={() => setShowTemplates(false)} style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(6px)', zIndex: 200
                }} />
                <div style={{
                  position: 'fixed', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'min(780px, 95vw)', maxHeight: '80vh',
                  background: T.bg1, border: `1px solid ${T.line}`,
                  borderRadius: 16, zIndex: 201, display: 'flex',
                  flexDirection: 'column', overflow: 'hidden',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
                }}>
                  {/* Modal Header */}
                  <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Checklist Templates</h2>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: T.t3, fontFamily: "'Inter', sans-serif" }}>Select a template to pre-fill your checklist builder.</p>
                    </div>
                    <Btn v="ghost" sz="xs" onClick={() => setShowTemplates(false)}>Close</Btn>
                  </div>

                  {/* Sub-tab Selection inside Modal */}
                  <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, background: T.bg2, padding: '0 24px' }}>
                    <button
                      type="button"
                      onClick={() => setTemplateTab('standard')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${templateTab === 'standard' ? T.brand : 'transparent'}`,
                        color: templateTab === 'standard' ? T.brand : T.t3,
                        padding: '12px 16px',
                        fontSize: 13,
                        fontWeight: templateTab === 'standard' ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Predefined Templates
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateTab('custom')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${templateTab === 'custom' ? T.brand : 'transparent'}`,
                        color: templateTab === 'custom' ? T.brand : T.t3,
                        padding: '12px 16px',
                        fontSize: 13,
                        fontWeight: templateTab === 'custom' ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Your Created Forms ({customTemplates.length})
                    </button>
                  </div>

                  {/* Template Grid */}
                  <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, flex: 1 }}>
                    {templateTab === 'standard' ? (
                      CHECKLIST_TEMPLATES.map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setClTitle(tpl.title)
                            setClEmoji(tpl.emoji)
                            setClShift(tpl.shift)
                            setClCategory(tpl.category)
                            setClSections(tpl.sections)
                            setShowTemplates(false)
                            setToastMsg(`"${tpl.title}" loaded — customize and save.`)
                          }}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                            padding: 18, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                            background: T.bg2, border: `1.5px solid ${T.line}`,
                            transition: 'all 0.15s ease', outline: 'none',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.brand; (e.currentTarget as HTMLButtonElement).style.background = T.brandLo }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.line; (e.currentTarget as HTMLButtonElement).style.background = T.bg2 }}
                        >
                          <span style={{ fontSize: 32 }}>{tpl.emoji}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4 }}>{tpl.title}</div>
                            <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.5 }}>{tpl.description}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.brandLo, color: T.brand, textTransform: 'uppercase' }}>{tpl.shift}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.bg3, color: T.t3, textTransform: 'uppercase' }}>{tpl.category}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.limeLo, color: T.lime, textTransform: 'uppercase' }}>{tpl.sections.reduce((n, s) => n + s.items.length, 0)} items</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      customTemplates.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 24px', color: T.t3 }}>
                          <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📂</span>
                          <div style={{ fontSize: 15, fontWeight: 700, color: T.t1, marginBottom: 4 }}>No Custom Checklists Yet</div>
                          <div style={{ fontSize: 13, color: T.t3, maxWidth: 360, margin: '0 auto' }}>
                            Create and deploy checklists first. Once deployed, they will appear here so you can use them as a template.
                          </div>
                        </div>
                      ) : (
                        customTemplates.map((tpl) => {
                          const sections = tpl.schema?.sections || []
                          const itemCount = sections.reduce((n: number, s: any) => n + (s.items?.length || 0), 0)
                          
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => {
                                setClTitle(tpl.title)
                                setClEmoji(tpl.emoji || '📋')
                                setClShift(tpl.shift || 'ALL')
                                setClCategory(tpl.category || 'general')
                                setClScheduleType(tpl.schedule_type || 'daily')
                                setClScheduleDay(tpl.schedule_day || 1)
                                setClSignatureMode(tpl.signature_mode || 'employee')
                                setClSections(sections)
                                setShowTemplates(false)
                                setToastMsg(`"${tpl.title}" loaded as template.`)
                              }}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                                padding: 18, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                                background: T.bg2, border: `1.5px solid ${T.line}`,
                                transition: 'all 0.15s ease', outline: 'none',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.brand; (e.currentTarget as HTMLButtonElement).style.background = T.brandLo }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.line; (e.currentTarget as HTMLButtonElement).style.background = T.bg2 }}
                            >
                              <span style={{ fontSize: 32 }}>{tpl.emoji || '📋'}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4 }}>{tpl.title}</div>
                                <div style={{ fontSize: 12, color: T.t3 }}>Custom checklist form.</div>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.brandLo, color: T.brand, textTransform: 'uppercase' }}>{tpl.shift}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.bg3, color: T.t3, textTransform: 'uppercase' }}>{tpl.schedule_type}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: T.limeLo, color: T.lime, textTransform: 'uppercase' }}>{itemCount} items</span>
                              </div>
                            </button>
                          )
                        })
                      )
                    )}
                  </div>
                </div>
              </>
            )}

            <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionLabel>Checklist Info</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="Checklist Title" placeholder="e.g. Opening Kitchen Audits" value={clTitle} onChange={e => setClTitle(e.target.value)} required />
                <Input label="Emoji Icon" value={clEmoji} onChange={e => setClEmoji(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Select label="Shift Period" value={clShift} onChange={e => setClShift(e.target.value)}>
                  <option value="ALL">ALL Shifts</option>
                  <option value="AM">AM Shift</option>
                  <option value="PM">PM Shift</option>
                </Select>
                <Select label="Category" value={clCategory} onChange={e => setClCategory(e.target.value as any)}>
                  <option value="general">General</option>
                  <option value="opening">Opening</option>
                  <option value="closing">Closing</option>
                  <option value="safety">Safety</option>
                </Select>
              </div>
            </Card>

            <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionLabel>Schedule & Verification</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Select label="Schedule Frequency" value={clScheduleType} onChange={e => setClScheduleType(e.target.value as any)}>
                  <option value="daily">Daily Schedule</option>
                  <option value="weekly">Weekly Schedule</option>
                  <option value="monthly">Monthly Schedule</option>
                  <option value="on_demand">On-Demand (Manual)</option>
                </Select>

                <Select label="Required Signatures" value={clSignatureMode} onChange={e => setClSignatureMode(e.target.value as any)}>
                  <option value="none">No Signatures Required</option>
                  <option value="employee">Employee Sign-off Only</option>
                  <option value="dual">Dual Sign-off (Employee + Manager)</option>
                </Select>
              </div>

              {clScheduleType === 'weekly' && (
                <Select label="Active Day of Week" value={clScheduleDay} onChange={e => setClScheduleDay(parseInt(e.target.value))}>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="7">Sunday</option>
                </Select>
              )}

              {clScheduleType === 'monthly' && (
                <Select label="Active Day of Month" value={clScheduleDay} onChange={e => setClScheduleDay(parseInt(e.target.value))}>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Day {i + 1}
                    </option>
                  ))}
                </Select>
              )}
            </Card>

            {clSections.map((sec, secIdx) => (
              <Card key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.line}`, paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={e => {
                        setClSections(prev => prev.map(s => s.id === sec.id ? { ...s, title: e.target.value } : s))
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 15,
                        fontWeight: 700,
                        color: T.t1,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        outline: 'none',
                        borderBottom: `1px dashed ${T.line}`,
                        width: '70%'
                      }}
                    />
                  </div>
                  
                  {/* Reordering and deleting sections */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn type="button" v="ghost" sz="xs" onClick={() => moveSection(secIdx, 'up')} disabled={secIdx === 0} title="Move Section Up">
                      <ChevronUp size={14} />
                    </Btn>
                    <Btn type="button" v="ghost" sz="xs" onClick={() => moveSection(secIdx, 'down')} disabled={secIdx === clSections.length - 1} title="Move Section Down">
                      <ChevronDown size={14} />
                    </Btn>
                    <Btn type="button" v="danger" sz="xs" onClick={() => removeClSection(sec.id)} title="Delete Section">
                      <Trash size={14} />
                    </Btn>
                  </div>
                </div>

                {/* Section-level conditional logic */}
                {secIdx > 0 && getPrecedingCondItemsForSection(secIdx).length > 0 && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: T.bg2, padding: '8px 12px', borderRadius: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.t2, fontFamily: "'DM Sans', sans-serif" }}>Show Section If:</label>
                    <Select
                      value={sec.cond?.fieldId || ''}
                      onChange={e => {
                        const fieldId = e.target.value
                        if (!fieldId) {
                          setClSections(prev => prev.map(s => s.id === sec.id ? { ...s, cond: null } : s))
                        } else {
                          setClSections(prev => prev.map(s => s.id === sec.id ? { ...s, cond: { fieldId, value: 'Y' } } : s))
                        }
                      }}
                      style={{ padding: 4, fontSize: 11, height: 'auto', flex: 1 }}
                    >
                      <option value="">(Always Show)</option>
                      {getPrecedingCondItemsForSection(secIdx).map(it => (
                        <option key={it.id} value={it.id}>{it.text.slice(0, 30)}...</option>
                      ))}
                    </Select>
                    {sec.cond && (
                      <Select
                        value={String(sec.cond.value)}
                        onChange={e => {
                          const val = e.target.value
                          setClSections(prev => prev.map(s => s.id === sec.id ? { ...s, cond: { ...s.cond!, value: val === 'true' ? true : val === 'false' ? false : val } } : s))
                        }}
                        style={{ padding: 4, fontSize: 11, height: 'auto', width: 90 }}
                      >
                        <option value="Y">Yes</option>
                        <option value="N">No</option>
                        <option value="true">Checked</option>
                        <option value="false">Unchecked</option>
                      </Select>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sec.items.length === 0 ? (
                    <div style={{ textAlign: 'center', color: T.t3, fontSize: 12, padding: '16px 0' }}>
                      No items yet. Add one below to start compiling this section.
                    </div>
                  ) : (
                    sec.items.map((item, itemIdx) => (
                      <div key={item.id} style={{ padding: 12, border: `1px solid ${T.line}`, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10, background: T.bg1 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Item name (e.g. Empty trash bags)"
                            value={item.text}
                            onChange={e => {
                              setClSections(prev => prev.map(s => {
                                if (s.id === sec.id) {
                                  return {
                                    ...s,
                                    items: s.items.map(it => it.id === item.id ? { ...it, text: e.target.value } : it)
                                  }
                                }
                                return s
                              }))
                            }}
                            required
                            style={{ flex: 1, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, color: T.t1, padding: 8, fontSize: 13 }}
                          />
                          
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Btn type="button" v="ghost" sz="xs" onClick={() => moveClItem(sec.id, itemIdx, 'up')} disabled={itemIdx === 0} title="Move Item Up">
                              <ChevronUp size={12} />
                            </Btn>
                            <Btn type="button" v="ghost" sz="xs" onClick={() => moveClItem(sec.id, itemIdx, 'down')} disabled={itemIdx === sec.items.length - 1} title="Move Item Down">
                              <ChevronDown size={12} />
                            </Btn>
                            <Btn type="button" v="danger" sz="xs" onClick={() => removeClItem(sec.id, item.id)} title="Delete Item">
                              <Trash size={12} />
                            </Btn>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 11, color: T.t2, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <input
                              type="checkbox"
                              checked={item.req}
                              onChange={e => {
                                setClSections(prev => prev.map(s => {
                                  if (s.id === sec.id) {
                                    return {
                                      ...s,
                                      items: s.items.map(it => it.id === item.id ? { ...it, req: e.target.checked } : it)
                                    }
                                  }
                                  return s
                                }))
                              }}
                            />
                            Required Field
                          </label>
                          <Select
                            value={item.trig.kind}
                            onChange={e => {
                              const kind = e.target.value as any
                              setClSections(prev => prev.map(s => {
                                if (s.id === sec.id) {
                                  return {
                                    ...s,
                                    items: s.items.map(it => it.id === item.id ? { ...it, trig: { kind, label: '', warnAbove: undefined, options: '' } } : it)
                                  }
                                }
                                return s
                              }))
                            }}
                            style={{ padding: 6, fontSize: 12, height: 'auto', minWidth: 140 }}
                          >
                            <option value="none">Standard Checkbox</option>
                            <option value="note">Text Input Field</option>
                            <option value="yn">Yes/No Action</option>
                            <option value="temp">Temperature Range</option>
                            <option value="sig">Signature Block</option>
                            <option value="number">Number Input Field</option>
                            <option value="photo">Photo Capture Field</option>
                            <option value="dropdown">Dropdown Select</option>
                            <option value="datetime">Date/Time Field</option>
                          </Select>
                          
                          {/* Sub values conditional */}
                          {item.trig.kind === 'temp' && (
                            <input
                              type="number"
                              placeholder="Warn Above (°F)"
                              value={item.trig.warnAbove || ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value)
                                setClSections(prev => prev.map(s => {
                                  if (s.id === sec.id) {
                                    return {
                                      ...s,
                                      items: s.items.map(it => it.id === item.id ? { ...it, trig: { ...it.trig, warnAbove: isNaN(val) ? undefined : val } } : it)
                                    }
                                  }
                                  return s
                                }))
                              }}
                              style={{ width: 120, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, color: T.t1, padding: 6, fontSize: 12 }}
                            />
                          )}

                          {item.trig.kind === 'dropdown' && (
                            <input
                              type="text"
                              placeholder="Options (comma separated: e.g. Good, Fair, Poor)"
                              value={item.trig.options || ''}
                              onChange={e => {
                                setClSections(prev => prev.map(s => {
                                  if (s.id === sec.id) {
                                    return {
                                      ...s,
                                      items: s.items.map(it => it.id === item.id ? { ...it, trig: { ...it.trig, options: e.target.value } } : it)
                                    }
                                  }
                                  return s
                                }))
                              }}
                              style={{ flex: 1, minWidth: 200, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, color: T.t1, padding: 6, fontSize: 12 }}
                            />
                          )}
                        </div>

                        {/* Item-level conditional logic */}
                        {getPrecedingCondItems(secIdx, itemIdx).length > 0 && (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: T.bg2, padding: '6px 10px', borderRadius: 4, width: '100%' }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: T.t2, fontFamily: "'DM Sans', sans-serif" }}>Show Task If:</label>
                            <Select
                              value={item.cond?.fieldId || ''}
                              onChange={e => {
                                const fieldId = e.target.value
                                if (!fieldId) {
                                  setClSections(prev => prev.map(s => {
                                    if (s.id === sec.id) {
                                      return {
                                        ...s,
                                        items: s.items.map(it => it.id === item.id ? { ...it, cond: null } : it)
                                      }
                                    }
                                    return s
                                  }))
                                } else {
                                  setClSections(prev => prev.map(s => {
                                    if (s.id === sec.id) {
                                      return {
                                        ...s,
                                        items: s.items.map(it => it.id === item.id ? { ...it, cond: { fieldId, value: 'Y' } } : it)
                                      }
                                    }
                                    return s
                                  }))
                                }
                              }}
                              style={{ padding: 4, fontSize: 11, height: 'auto', flex: 1 }}
                            >
                              <option value="">(Always Show)</option>
                              {getPrecedingCondItems(secIdx, itemIdx).map(it => (
                                <option key={it.id} value={it.id}>{it.text.slice(0, 25)}...</option>
                              ))}
                            </Select>
                            {item.cond && (
                              <Select
                                value={String(item.cond.value)}
                                onChange={e => {
                                  const val = e.target.value
                                  setClSections(prev => prev.map(s => {
                                    if (s.id === sec.id) {
                                      return {
                                        ...s,
                                        items: s.items.map(it => it.id === item.id ? { ...it, cond: { ...it.cond!, value: val === 'true' ? true : val === 'false' ? false : val } } : it)
                                      }
                                    }
                                    return s
                                  }))
                                }}
                                style={{ padding: 4, fontSize: 11, height: 'auto', width: 90 }}
                              >
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                                <option value="true">Checked</option>
                                <option value="false">Unchecked</option>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Btn type="button" v="ghost" sz="xs" onClick={() => addClItem(sec.id)} style={{ alignSelf: 'flex-start' }}>
                  <Plus size={12} /> Add Checklist Item
                </Btn>
              </Card>
            ))}

            <div style={{ display: 'flex', gap: 12 }}>
              <Btn type="button" v="ghost" sz="sm" onClick={addClSection} style={{ flex: 1 }}>
                <Plus size={14} /> Add Section
              </Btn>
              <Btn type="submit" v="brand" disabled={saving} style={{ flex: 1.2 }}>
                <Save size={16} /> {saving ? 'Publishing...' : 'Deploy Checklist'}
              </Btn>
            </div>
          </form>
          
          {/* Right Panel: Interactive Phone Preview */}
          <div style={{ position: 'sticky', top: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: T.t3, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone size={14} /> Live Kiosk Preview
            </div>
            
            {/* Phone Bezel */}
            <div
              style={{
                width: 320,
                height: 540,
                borderRadius: 36,
                border: '12px solid #1C1A1E',
                background: T.bg0,
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* Notchy Speaker */}
              <div
                style={{
                  width: 120,
                  height: 16,
                  background: '#1C1A1E',
                  borderRadius: '0 0 12px 12px',
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20
                }}
              />
              
              {/* Status bar */}
              <div style={{ height: 26, padding: '6px 16px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: T.t3, background: T.bg1, zIndex: 10 }}>
                <span>10:42 AM</span>
                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span>5G</span>
                  <div style={{ width: 14, height: 8, border: `1px solid ${T.t3}`, borderRadius: 1, padding: 1 }}>
                    <div style={{ width: '100%', height: '100%', background: T.t3 }} />
                  </div>
                </span>
              </div>
              
              {/* Mock App Shell inside Phone */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderBottom: `1px solid ${T.line}`, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>{clEmoji || '📋'}</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, color: T.t1 }}>
                      {clTitle || 'Untitled Checklist'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', background: T.brandLo, border: `1px solid ${T.brandBd}`, color: T.brand, padding: '2px 6px', borderRadius: 2 }}>
                      {clShift === 'ALL' ? 'ALL SHIFTS' : `${clShift} SHIFT`}
                    </span>
                    <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', background: T.bg2, border: `1px solid ${T.line}`, color: T.t2, padding: '2px 6px', borderRadius: 2 }}>
                      {clCategory}
                    </span>
                  </div>
                </div>
                {/* Preview checklist sections & items */}
                {clSections.map(sec => {
                  // Evaluate section condition
                  if (sec.cond && sec.cond.fieldId) {
                    const activeVal = previewData[sec.cond.fieldId]
                    if (String(activeVal) !== String(sec.cond.value)) {
                      return null
                    }
                  }

                  return (
                    <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: T.brand, margin: '6px 0 0 0', fontFamily: "'DM Sans', sans-serif" }}>
                        {sec.title || 'Untitled Section'}
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sec.items.length === 0 ? (
                          <div style={{ fontSize: 10, color: T.t4, fontStyle: 'italic', paddingLeft: 4 }}>No checklist tasks in this section.</div>
                        ) : (
                          sec.items.map(item => {
                            // Evaluate item condition
                            if (item.cond && item.cond.fieldId) {
                              const activeVal = previewData[item.cond.fieldId]
                              if (String(activeVal) !== String(item.cond.value)) {
                                return null
                              }
                            }

                            const val = previewData[item.id]

                            return (
                              <div key={item.id} style={{ padding: 10, border: `1px solid ${T.line}`, borderRadius: 4, background: T.bg1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: 12, color: T.t1, fontWeight: 600 }}>
                                    {item.text || 'New checklist task'}
                                    {item.req && <span style={{ color: T.brand, marginLeft: 3 }}>*</span>}
                                  </span>
                                  {item.trig.kind === 'none' && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewData(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                      style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        border: `1.5px solid ${val ? T.brand : T.t3}`,
                                        background: val ? T.brand : 'transparent',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        padding: 0
                                      }}
                                    />
                                  )}
                                </div>
                                
                                {/* Visual Form control triggers */}
                                {item.trig.kind === 'note' && (
                                  <input type="text" placeholder="Enter comments/notes..." value={val || ''} onChange={e => setPreviewData(prev => ({ ...prev, [item.id]: e.target.value }))} style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, padding: 6, fontSize: 10, color: T.t1, outline: 'none' }} />
                                )}

                                {item.trig.kind === 'number' && (
                                  <input type="number" placeholder="Enter number..." value={val || ''} onChange={e => setPreviewData(prev => ({ ...prev, [item.id]: e.target.value }))} style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, padding: 6, fontSize: 10, color: T.t1, outline: 'none' }} />
                                )}

                                {item.trig.kind === 'photo' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ height: 32, border: `1px dashed ${T.line}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.t3, background: T.bg3, cursor: 'pointer' }}>
                                      Tap to capture photo
                                    </div>
                                  </div>
                                )}

                                {item.trig.kind === 'datetime' && (
                                  <input type="datetime-local" value={val || ''} onChange={e => setPreviewData(prev => ({ ...prev, [item.id]: e.target.value }))} style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, padding: 6, fontSize: 10, color: T.t1, outline: 'none' }} />
                                )}

                                {item.trig.kind === 'dropdown' && (
                                  <select value={val || ''} onChange={e => setPreviewData(prev => ({ ...prev, [item.id]: e.target.value }))} style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, padding: 6, fontSize: 10, color: T.t1, outline: 'none' }}>
                                    <option value="">Select option...</option>
                                    {(item.trig.options || '').split(',').map((opt, oIdx) => (
                                      <option key={oIdx} value={opt.trim()}>{opt.trim()}</option>
                                    ))}
                                  </select>
                                )}

                                {item.trig.kind === 'yn' && (
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewData(prev => ({ ...prev, [item.id]: 'Y' }))}
                                      style={{
                                        flex: 1, padding: 6, fontSize: 10,
                                        background: val === 'Y' ? T.brandLo : T.bg3,
                                        border: `1px solid ${val === 'Y' ? T.brand : T.line}`,
                                        borderRadius: 4, color: val === 'Y' ? T.brand : T.t3, cursor: 'pointer'
                                      }}
                                    >
                                      YES
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewData(prev => ({ ...prev, [item.id]: 'N' }))}
                                      style={{
                                        flex: 1, padding: 6, fontSize: 10,
                                        background: val === 'N' ? T.redLo : T.bg3,
                                        border: `1px solid ${val === 'N' ? T.red : T.line}`,
                                        borderRadius: 4, color: val === 'N' ? T.red : T.t3, cursor: 'pointer'
                                      }}
                                    >
                                      NO
                                    </button>
                                  </div>
                                )}

                                {item.trig.kind === 'temp' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="text" placeholder="e.g. 38" value={val || ''} onChange={e => setPreviewData(prev => ({ ...prev, [item.id]: e.target.value }))} style={{ width: 60, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 4, padding: 6, fontSize: 10, color: T.t1, outline: 'none' }} />
                                    <span style={{ fontSize: 10, color: T.t3 }}>°F</span>
                                    {item.trig.warnAbove !== undefined && val !== undefined && val !== '' && parseFloat(val) > item.trig.warnAbove && (
                                      <span style={{ fontSize: 9, color: T.brand, fontWeight: 600 }}>Warn above {item.trig.warnAbove}°F</span>
                                    )}
                                  </div>
                                )}

                                {item.trig.kind === 'sig' && (
                                  <div style={{ height: 32, border: `1px dashed ${T.line}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.t3, background: T.bg3 }}>
                                    Tap to sign
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* ── RECIPE BUILDER ── */}
      {activeTab === 'recipe' && (
        <form onSubmit={saveRecipe} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
          
          {/* Intelligent Import Banner */}
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16, background: T.brandLo, border: `1px dashed ${T.brand}` }}>
            <UploadCloud size={24} color={T.brand} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>Import from File</div>
              <div style={{ fontSize: 11, color: T.t2 }}>Upload PDF, Word, Excel, CSV, or JSON to auto-extract the recipe.</div>
            </div>
            <label style={{ cursor: isImporting ? 'not-allowed' : 'pointer' }}>
              <input type="file" accept=".pdf,.txt,.doc,.docx,.json,.csv,.xlsx,.xls" onChange={handleRecipeUpload} disabled={isImporting} style={{ display: 'none' }} />
              <div style={{ padding: '8px 16px', background: T.brand, color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                {isImporting ? 'Parsing...' : 'Upload File'}
              </div>
            </label>
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Recipe Info</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="Recipe Name" placeholder="e.g. Sourdough Boule" value={recTitle} onChange={e => setRecTitle(e.target.value)} required />
              <Input label="Category" placeholder="e.g. Breads, Pastries" value={recCategory} onChange={e => setRecCategory(e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="Yield Value" type="number" value={recYieldVal} onChange={e => setRecYieldVal(parseInt(e.target.value))} required />
              <Input label="Yield Unit" placeholder="e.g. portions, loaves" value={recYieldUnit} onChange={e => setRecYieldUnit(e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Input label="Prep Time" placeholder="30m" value={recPrep} onChange={e => setRecPrep(e.target.value)} />
              <Input label="Bake Time" placeholder="45m" value={recBake} onChange={e => setRecBake(e.target.value)} />
              <Input label="Bake Temp" placeholder="450°F" value={recTemp} onChange={e => setRecTemp(e.target.value)} />
            </div>
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Ingredients List</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recIngs.map((ing, idx) => (
                <div key={ing.id} style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    placeholder="Ingredient Name"
                    value={ing.name}
                    onChange={e => {
                      const next = [...recIngs]
                      next[idx].name = e.target.value
                      setRecIngs(next)
                    }}
                    required
                    style={{ flex: 2, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: 8, fontSize: 13 }}
                  />
                  <input
                    type="number"
                    placeholder="Amt"
                    value={ing.amount}
                    onChange={e => {
                      const next = [...recIngs]
                      next[idx].amount = parseFloat(e.target.value)
                      setRecIngs(next)
                    }}
                    required
                    style={{ width: 80, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: 8, fontSize: 13 }}
                  />
                  <input
                    type="text"
                    placeholder="Unit (g, oz)"
                    value={ing.unit}
                    onChange={e => {
                      const next = [...recIngs]
                      next[idx].unit = e.target.value
                      setRecIngs(next)
                    }}
                    required
                    style={{ width: 80, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: 8, fontSize: 13 }}
                  />
                  <Btn v="danger" sz="xs" onClick={() => removeRecipeIngredient(ing.id)}>
                    <Trash size={12} />
                  </Btn>
                </div>
              ))}
            </div>

            <Btn v="ghost" sz="sm" onClick={addRecipeIngredient} style={{ marginTop: 8 }}>
              <Plus size={12} /> Add Ingredient
            </Btn>
          </Card>

          <Btn type="submit" v="brand" disabled={saving}>
            <Save size={16} /> {saving ? 'Logging...' : 'Publish Kitchen Recipe'}
          </Btn>
        </form>
      )}

      {/* ── QUIZ BUILDER ── */}
      {activeTab === 'quiz' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
          
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Quiz Settings</SectionLabel>
            
            {/* Select Quiz Source Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>Quiz Source Type</span>
              <div style={{ display: 'flex', gap: 10 }}>
                {([['sop', 'SOP Chapter'], ['recipe', 'Kitchen Recipe'], ['book', 'Recipe Book Category']] as const).map(([type, label]) => (
                  <label key={type} style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 6,
                    background: quizSourceType === type ? T.brandLo : T.bg3,
                    border: `1px solid ${quizSourceType === type ? T.brand : T.line}`,
                    color: quizSourceType === type ? T.brand : T.t3,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s'
                  }}>
                    <input
                      type="radio"
                      name="quizSourceType"
                      checked={quizSourceType === type}
                      onChange={() => {
                        setQuizSourceType(type)
                        setSelectedSopId('')
                        setSelectedRecipeId('')
                        setSelectedBookCategory('')
                        setQuizQuestions([])
                      }}
                      style={{ display: 'none' }}
                    />
                    {type === 'sop' && <FileText size={14} />}
                    {type === 'recipe' && <Utensils size={14} />}
                    {type === 'book' && <BookOpen size={14} />}
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Select Target Resource Dropdown */}
            {quizSourceType === 'sop' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>Select Training SOP</span>
                <select
                  value={selectedSopId}
                  onChange={e => setSelectedSopId(e.target.value)}
                  style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: 10, fontSize: 14, outline: 'none' }}
                >
                  <option value="">Select SOP...</option>
                  {sopsList.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}

            {quizSourceType === 'recipe' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>Select Kitchen Recipe</span>
                <select
                  value={selectedRecipeId}
                  onChange={e => setSelectedRecipeId(e.target.value)}
                  style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: 10, fontSize: 14, outline: 'none' }}
                >
                  <option value="">Select Recipe...</option>
                  {recipesList.map(r => (
                    <option key={r.id} value={r.id}>{r.title} ({r.category})</option>
                  ))}
                </select>
              </div>
            )}

            {quizSourceType === 'book' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>Select Recipe Book (Category)</span>
                <select
                  value={selectedBookCategory}
                  onChange={e => setSelectedBookCategory(e.target.value)}
                  style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: 10, fontSize: 14, outline: 'none' }}
                >
                  <option value="">Select Category...</option>
                  {booksList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto-Generator Action */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Btn v="brand" style={{ flex: 1 }} onClick={handleAutoGenerateQuiz} disabled={quizLoading}>
                {quizLoading ? 'Generating Questions...' : '✨ Auto-Generate Questions'}
              </Btn>
            </div>
          </Card>

          {/* Questions Editor */}
          {quizQuestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionLabel>Quiz Questions ({quizQuestions.length})</SectionLabel>
              
              {quizQuestions.map((q, qIdx) => (
                <Card key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: T.brand }}>Question {qIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      style={{ background: 'transparent', border: 'none', color: T.red, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
                    >
                      <Trash size={12} /> Remove
                    </button>
                  </div>

                  {/* Question Text */}
                  <Input
                    label="Question Text"
                    value={q.q}
                    onChange={e => handleQuestionChange(qIdx, 'q', e.target.value)}
                    required
                  />

                  {/* Choices Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.t3 }}>Options</span>
                    {q.opts.map((opt: string, optIdx: number) => (
                      <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          checked={q.ans === optIdx}
                          onChange={() => handleQuestionChange(qIdx, 'ans', optIdx)}
                          style={{ accentColor: T.brand }}
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={e => handleOptionChange(qIdx, optIdx, e.target.value)}
                          required
                          style={{ flex: 1, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, color: T.t1, padding: 8, fontSize: 13 }}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Btn v="ghost" onClick={handleAddQuestion} style={{ flex: 1 }}>
                  <Plus size={14} /> Add Manual Question
                </Btn>
                <Btn v="brand" onClick={handleSaveQuiz} disabled={saving} style={{ flex: 2 }}>
                  <Save size={16} /> {saving ? 'Publishing...' : 'Publish Quiz Details'}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}
export default Builders
