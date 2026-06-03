import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, SectionLabel, SigPad, Spinner, Toast, PrepPetGraphic } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { Check, AlertTriangle, Send, Camera, Plus, History, Edit3, ChevronDown, X } from 'lucide-react'
import confetti from 'canvas-confetti'

interface ChecklistItem {
  id: string
  text: string
  req: boolean
  cond?: { fieldId: string; value: string | boolean } | null
  trig: null | {
    kind: 'note' | 'yn' | 'temp' | 'sig' | 'number' | 'photo' | 'dropdown' | 'datetime'
    label?: string
    warnAbove?: number
    yNoteLabel?: string
    options?: string
  }
}

interface ChecklistSection {
  id: string
  title: string
  cond?: { fieldId: string; value: string | boolean } | null
  items: ChecklistItem[]
}

interface Checklist {
  id: string
  title: string
  emoji: string
  shift: string
  category: 'opening' | 'closing' | 'safety' | 'general'
  due_time: string
  est_minutes: number
  schedule_type?: 'daily' | 'weekly' | 'monthly' | 'on_demand'
  schedule_day?: number
  signature_mode?: 'none' | 'employee' | 'dual'
  schema: {
    sections: ChecklistSection[]
  }
}

const KioskSignatureVerifier: React.FC<{
  roster: any[]
  value: string | null
  signerId: string | null
  onVerify: (signerId: string, sigData: string | null) => void
  onClear: () => void
  T: any
}> = ({ roster, value, signerId, onVerify, onClear, T }) => {
  const [selectedUserId, setSelectedUserId] = useState(signerId || '')
  const [pin, setPin] = useState('')
  const [isVerified, setIsVerified] = useState(!!signerId)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const signerProfile = roster.find(r => r.id === selectedUserId)

  const handleVerify = () => {
    setErrorMsg(null)
    if (!selectedUserId) {
      setErrorMsg('Please select a staff member.')
      return
    }
    const member = roster.find(r => r.id === selectedUserId)
    if (!member) {
      setErrorMsg('Selected staff member not found.')
      return
    }
    if (member.pin_code !== pin) {
      setErrorMsg('Incorrect PIN. Please try again.')
      return
    }
    setIsVerified(true)
    onVerify(selectedUserId, null)
  }

  const handleSigChange = (sigData: string | null) => {
    onVerify(selectedUserId, sigData)
  }

  const handleReset = () => {
    setIsVerified(false)
    setSelectedUserId('')
    setPin('')
    setErrorMsg(null)
    onClear()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, border: `1px solid ${T.line}`, padding: 16, borderRadius: 4, background: T.bg1 }}>
      {!isVerified ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Roster PIN Signature Verification
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              style={{
                flex: 2,
                minWidth: 150,
                background: T.bg3,
                border: `1px solid ${T.line}`,
                borderRadius: 4,
                padding: '8px 12px',
                fontSize: 13,
                color: T.t1,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            >
              <option value="">Select staff member...</option>
              {roster.map(r => (
                <option key={r.id} value={r.id}>{r.full_name}</option>
              ))}
            </select>
            <input
              type="password"
              maxLength={4}
              placeholder="PIN"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              style={{
                width: 70,
                background: T.bg3,
                border: `1px solid ${T.line}`,
                borderRadius: 4,
                padding: '8px 12px',
                fontSize: 13,
                color: T.t1,
                textAlign: 'center',
                outline: 'none',
                fontWeight: 700
              }}
            />
            <Btn v="brand" sz="sm" onClick={handleVerify}>Verify</Btn>
          </div>
          {errorMsg && (
            <div style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: T.lime }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.lime }} />
              Verified Signer: {signerProfile?.full_name}
            </div>
            <Btn v="ghost" sz="xs" onClick={handleReset}>Change Signer</Btn>
          </div>
          
          <SigPad value={value} onChange={handleSigChange} />
        </div>
      )}
    </div>
  )
}

export const Tasks: React.FC = () => {
  const { T } = useTheme()
  const { profile, updateProfile, isKioskMode } = useAuth()
  
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [selectedList, setSelectedList] = useState<Checklist | null>(null)
  const [roster, setRoster] = useState<any[]>([])
  
  // Submission values
  const [draftData, setDraftData] = useState<Record<string, any>>({})
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [existingSubmissions, setExistingSubmissions] = useState<any[]>([])
  const [isViewingHistoryMode, setIsViewingHistoryMode] = useState(false)
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const todayStr = new Date().toISOString().split('T')[0]

  // Load roster profiles
  useEffect(() => {
    if (!profile) return
    const fetchRoster = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, pin_code, role')
        .eq('org_id', profile.org_id)
        .eq('is_active', true)
      if (data) setRoster(data)
    }
    fetchRoster()
  }, [profile])

  // 1. Fetch playlists templates
  useEffect(() => {
    if (!profile) return

    const loadChecklists = async () => {
      try {
        setLoading(true)
        // Read templates scoped to role
        const { data: lists } = await supabase
          .from('checklists')
          .select('*')
          .eq('org_id', profile.org_id)
          .eq('is_active', true)

        if (lists) {
          setChecklists(lists)
        }
      } catch (err) {
        console.error('Failed loading checklists:', err)
      } finally {
        setLoading(false)
      }
    }

    loadChecklists()
  }, [profile])

  // Start a new blank submission draft
  const handleStartNewSubmission = async (list: Checklist) => {
    const userId = profile?.id
    if (!userId || !profile) return

    try {
      setLoading(true)
      const { data: created, error } = await supabase
        .from('checklist_submissions')
        .insert({
          checklist_id: list.id,
          org_id: profile.org_id,
          location_id: profile.location_id,
          submitted_by: userId,
          draft_data: {},
          status: 'draft',
          progress: 0,
          submission_date: todayStr
        })
        .select()
        .single()

      if (error) throw error
      if (created) {
        setSubmissionId(created.id)
        setDraftData({})
        setIsViewingHistoryMode(false)
        setExistingSubmissions(prev => [...prev, created])
      }
    } catch (err) {
      console.error('Error starting checklist submission:', err)
      setToastMsg('Failed to initialize submission.')
    } finally {
      setLoading(false)
    }
  }

  // Upload photo attachment
  const handlePhotoUpload = async (itemId: string, file: File) => {
    if (!profile) return
    try {
      setUploadingPhotoId(itemId)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.org_id}/${itemId}_${Date.now()}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('form-attachments')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('form-attachments')
        .getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl
      await handleValueChange(itemId, publicUrl)
    } catch (err) {
      console.error('Photo upload failed:', err)
      setToastMsg('Photo upload failed.')
    } finally {
      setUploadingPhotoId(null)
    }
  }

  // 2. Select checklist and load today's submission history
  const handleSelectChecklist = async (list: Checklist) => {
    setSelectedList(list)
    setDraftData({})
    setSubmissionId(null)
    setIsViewingHistoryMode(false)

    const userId = profile?.id
    if (!userId) return

    try {
      setLoading(true)
      const { data } = await supabase
        .from('checklist_submissions')
        .select('*')
        .eq('checklist_id', list.id)
        .eq('submitted_by', userId)
        .eq('submission_date', todayStr)

      const subs = data || []
      setExistingSubmissions(subs)

      // If zero runs exist for today, automatically open a new run draft
      if (subs.length === 0) {
        await handleStartNewSubmission(list)
      }
    } catch (err) {
      console.error('Failed fetching checklist submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Conditional logic evaluation helpers
  const isSectionVisible = (sec: ChecklistSection, data: Record<string, any>): boolean => {
    if (!sec.cond || !sec.cond.fieldId) return true
    const val = data[sec.cond.fieldId]
    return String(val) === String(sec.cond.value)
  }

  const isItemVisible = (item: ChecklistItem, sec: ChecklistSection, data: Record<string, any>): boolean => {
    if (!isSectionVisible(sec, data)) return false
    if (!item.cond || !item.cond.fieldId) return true
    const val = data[item.cond.fieldId]
    return String(val) === String(item.cond.value)
  }

  // Calculate completeness progress percentage
  const calculateProgress = (customData = draftData): number => {
    if (!selectedList) return 0
    let totalItems = 0
    let checkedItems = 0

    selectedList.schema.sections.forEach(sec => {
      if (!isSectionVisible(sec, customData)) return

      sec.items.forEach(item => {
        if (!isItemVisible(item, sec, customData)) return

        totalItems++
        const val = customData[item.id]
        
        // Items verification logic
        if (item.trig?.kind === 'yn') {
          if (val === 'Y' || (val === 'N' && customData[`${item.id}_note`])) {
            checkedItems++
          }
        } else if (item.trig?.kind === 'temp' || item.trig?.kind === 'number') {
          if (val !== undefined && val !== '') {
            checkedItems++
          }
        } else if (item.trig?.kind === 'note' || item.trig?.kind === 'dropdown' || item.trig?.kind === 'datetime' || item.trig?.kind === 'photo') {
          if (val !== undefined && String(val).trim() !== '') {
            checkedItems++
          }
        } else if (item.trig?.kind === 'sig') {
          if (val !== undefined && val !== '') {
            checkedItems++
          }
        } else {
          // Standard checkbox check
          if (val === true) {
            checkedItems++
          }
        }
      })
    })

    if (totalItems === 0) return 100
    return Math.round((checkedItems / totalItems) * 100)
  }

  // Update specific input draft values locally & autosave
  const handleValueChange = async (itemId: string, val: any) => {
    const nextData = { ...draftData, [itemId]: val }
    setDraftData(nextData)

    if (submissionId && !isViewingHistoryMode) {
      // Async background save (only for active drafts)
      const progress = calculateProgress(nextData)

      // Celebrate 100% completion with a confetti blast
      const currentProgress = calculateProgress(draftData)
      if (progress === 100 && currentProgress < 100) {
        confetti({ particleCount: 85, spread: 65, origin: { y: 0.6 } })
      }

      await supabase
        .from('checklist_submissions')
        .update({
          draft_data: nextData,
          progress
        })
        .eq('id', submissionId)
    }
  }

  // Submit Checklist
  const handleSubmitChecklist = async () => {
    if (!submissionId || !selectedList) return
    
    // Check all visible required fields
    let missingField = false
    selectedList.schema.sections.forEach(sec => {
      if (!isSectionVisible(sec, draftData)) return
      sec.items.forEach(item => {
        if (!isItemVisible(item, sec, draftData)) return
        if (item.req) {
          const val = draftData[item.id]
          if (item.trig?.kind === 'yn') {
            if (val !== 'Y' && val !== 'N') missingField = true
            if (val === 'N' && !draftData[`${item.id}_note`]) missingField = true
          } else if (item.trig?.kind === 'temp' || item.trig?.kind === 'number') {
            if (val === undefined || val === '') missingField = true
          } else if (item.trig?.kind === 'sig' || item.trig?.kind === 'photo') {
            if (!val) missingField = true
          } else if (!item.trig) {
            if (val !== true) missingField = true
          } else {
            if (!val || String(val).trim() === '') missingField = true
          }
        }
      })
    })

    if (missingField) {
      setToastMsg('Please complete all visible required items before submitting.')
      return
    }

    try {
      setSubmitting(true)
      const progress = 100 // force complete on submit

      // Get first signature as fallback/legacy signature representation
      let firstSig: string | null = null
      selectedList.schema.sections.forEach(sec => {
        sec.items.forEach(item => {
          if (item.trig?.kind === 'sig' && draftData[item.id] && !firstSig) {
            firstSig = draftData[item.id]
          }
        })
      })

      const existing = existingSubmissions.find(s => s.id === submissionId)
      const isEditingSubmitted = existing?.status === 'submitted'

      if (isEditingSubmitted) {
        // Save revision in audit logs table
        await supabase
          .from('checklist_submission_revisions')
          .insert({
            submission_id: submissionId,
            updated_by: profile?.id,
            draft_data: draftData,
            signature_data: firstSig
          })
      }
      
      const { error } = await supabase
        .from('checklist_submissions')
        .update({
          status: 'submitted',
          progress,
          signature_data: firstSig,
          submitted_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (error) throw error

      // Award Gamification rewards (treats & exp) to all participants
      const userIdsToReward: string[] = []
      
      // 1. Primary submitter
      const primaryUserId = profile?.id
      if (primaryUserId) {
        userIdsToReward.push(primaryUserId)
      }

      // 2. Verified signers
      Object.keys(draftData).forEach(key => {
        if (key.endsWith('_signer')) {
          const val = draftData[key]
          if (val && typeof val === 'string' && !userIdsToReward.includes(val)) {
            userIdsToReward.push(val)
          }
        }
      })

      const rewardedNames: string[] = []
      let activeUserLeveledUp = false

      for (const userId of userIdsToReward) {
        const { data: userProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (userProf && userProf.pet_status) {
          const pet = { ...userProf.pet_status }
          pet.treats += 1
          pet.exp += 50

          const expNeeded = pet.level * 100
          let levelUp = false
          if (pet.exp >= expNeeded) {
            pet.exp -= expNeeded
            pet.level += 1
            levelUp = true
          }

          // Save profile updates directly in database
          await supabase
            .from('profiles')
            .update({ pet_status: pet })
            .eq('id', userId)

          rewardedNames.push(userProf.full_name)

          // If the rewarded user is the currently logged in session holder, update context
          if (userId === profile?.id) {
            await updateProfile({ pet_status: pet })
            if (levelUp) activeUserLeveledUp = true
          }
        }
      }

      // Confetti feedback
      if (activeUserLeveledUp) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 } })
      } else {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } })
      }

      if (rewardedNames.length > 0) {
        setToastMsg(`Checklist submitted successfully! Rewards (+1 treat, +50 EXP) granted to: ${rewardedNames.join(', ')}.`)
      } else {
        setToastMsg('Checklist submitted successfully!')
      }
      setSelectedList(null)
    } catch (err) {
      console.error('Submission failed:', err)
      setToastMsg('Failed to submit checklist.')
    } finally {
      setSubmitting(false)
    }
  }



  if (loading && checklists.length === 0) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* ── LIST VIEW ── */}
      {!selectedList && (
        <>
          {/* Page Header */}
          <div style={{ paddingBottom: 4 }}>
            <h1 style={{
              fontSize: 36,
              fontWeight: 800,
              margin: 0,
              color: T.t1,
              letterSpacing: '-0.5px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Tasks
            </h1>
            <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400 }}>
              {checklists.length} checklist{checklists.length !== 1 ? 's' : ''} assigned today
            </p>
          </div>

          {/* Checklist item rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {checklists.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.t2 }}>No checklists assigned</div>
                <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>Ask your manager to assign checklists to your role.</div>
              </Card>
            ) : (
              checklists.map(list => {
                const shiftColors: Record<string, { fg: string; bg: string }> = {
                  morning:  { fg: '#92400E', bg: '#FEF3C7' },
                  afternoon:{ fg: '#1E40AF', bg: '#DBEAFE' },
                  evening:  { fg: '#5B21B6', bg: '#EDE9FE' },
                  closing:  { fg: '#065F46', bg: '#D1FAE5' },
                }
                const sc = shiftColors[list.shift?.toLowerCase()] || { fg: T.brand, bg: T.brandLo }
                return (
                  <Card
                    key={list.id}
                    onClick={() => handleSelectChecklist(list)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}
                  >
                    {/* Emoji icon in a pill */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: sc.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      flexShrink: 0,
                    }}>
                      {list.emoji || '📋'}
                    </div>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: T.t1,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {list.title}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: sc.fg,
                          background: sc.bg,
                          borderRadius: 20,
                          padding: '2px 8px',
                        }}>
                          {list.shift?.charAt(0).toUpperCase() + list.shift?.slice(1)}
                        </span>
                        <span style={{ fontSize: 12, color: T.t3 }}>Due {list.due_time}</span>
                        <span style={{ fontSize: 12, color: T.t3 }}>{list.est_minutes} min</span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <div style={{ color: T.t4, flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ── FORM RUNNER VIEW ── */}
      {selectedList && (
        <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header */}
          <div style={{ paddingBottom: 8 }}>
            {/* Shift pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: T.brand,
              background: T.brandLo,
              borderRadius: 20,
              padding: '4px 12px',
              marginBottom: 10,
            }}>
              ☀️ {selectedList.shift?.charAt(0).toUpperCase() + selectedList.shift?.slice(1)} Shift
            </div>

            {/* Big Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h2 style={{
                fontSize: 32,
                fontWeight: 800,
                margin: 0,
                color: T.t1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
              }}>
                {selectedList.title}
              </h2>
              <Btn v="ghost" sz="sm" onClick={() => setSelectedList(null)} style={{ flexShrink: 0, marginTop: 4 }}>
                ← Back
              </Btn>
            </div>

            {/* Stats row + Details toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: T.t3 }}>
                {selectedList.schema.sections.reduce((a, s) => a + s.items.length, 0)} tasks
              </span>
              {/* Details toggle */}
              <button
                onClick={() => setShowDetails(v => !v)}
                aria-pressed={showDetails}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.t3,
                  padding: '4px 0',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {showDetails ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
                {showDetails ? 'Details' : 'Details hidden'}
                {/* Toggle pill */}
                <span style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: showDetails ? T.brand : T.bg3,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 3px',
                  transition: 'background 0.2s ease',
                }}>
                  <span style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#fff',
                    transform: showDetails ? 'translateX(16px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease',
                    display: 'block',
                  }} />
                </span>
              </button>
            </div>
          </div>

          {/* ── RUN HISTORY PICKER ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <History size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Today's Runs
              </span>
              <Btn v="ghost" sz="xs" onClick={() => handleStartNewSubmission(selectedList)}>
                <Plus size={12} /> New Run
              </Btn>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {existingSubmissions.map((sub, idx) => {
                const isActive = sub.id === submissionId
                const isSubmitted = sub.status === 'submitted'
                return (
                  <button
                    key={sub.id}
                    aria-pressed={isActive}
                    aria-label={`Run ${idx + 1}: ${isSubmitted ? 'submitted' : 'draft'}`}
                    onClick={() => {
                      setSubmissionId(sub.id)
                      setDraftData(sub.draft_data || {})
                      setIsViewingHistoryMode(isSubmitted)
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 4,
                      background: isActive ? (isSubmitted ? T.limeLo : T.brandLo) : T.bg3,
                      border: `1px solid ${isActive ? (isSubmitted ? T.lime : T.brand) : T.line}`,
                      color: isActive ? (isSubmitted ? T.lime : T.brand) : T.t2,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      letterSpacing: '0.3px'
                    }}
                  >
                    {isSubmitted ? <Check size={11} /> : <Edit3 size={11} />}
                    Run {idx + 1} · {isSubmitted ? 'Done' : 'Draft'}
                  </button>
                )
              })}
            </div>

            {/* Progress bar */}
            {submissionId && !isViewingHistoryMode && (() => {
              const pct = calculateProgress()
              let petMood: 'sleeping' | 'hungry' | 'happy' = 'sleeping'
              let message = "Doughboi is fast asleep. Check off a task to wake them up!"
              if (pct > 0 && pct < 50) {
                petMood = 'hungry'
                message = "Mmm, working on it! Doughboi is getting hungry..."
              } else if (pct >= 50 && pct < 100) {
                petMood = 'happy'
                message = "Over halfway there! Doughboi is cheering you on!"
              } else if (pct === 100) {
                petMood = 'happy'
                message = "Hooray! 100% complete! Doughboi is so proud of you! 🎉"
              }
              
              return (
                <div style={{
                  background: T.bg2,
                  border: `1px solid ${pct === 100 ? T.limeBd : T.brandBd}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  boxShadow: T.shadow,
                  transition: 'all 0.3s ease',
                  marginTop: 8
                }}>
                  <div style={{ flexShrink: 0, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg1, borderRadius: '50%', border: `1px solid ${T.line}`, overflow: 'hidden' }}>
                    <PrepPetGraphic type="doughboi" mood={petMood} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
                      {message}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <div style={{ flex: 1, height: 6, background: T.bg3, borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: pct === 100 ? T.lime : T.brand,
                            borderRadius: 3,
                            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: pct === 100 ? T.lime : T.brand, minWidth: 32, textAlign: 'right' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Edit submitted form banner */}
            {isViewingHistoryMode && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.amberLo, border: `1px solid ${T.amberBd}`, borderRadius: 4, gap: 12 }}>
                <span style={{ fontSize: 12, color: T.amber, fontWeight: 700 }}>
                  📋 Read-only — this run was submitted
                </span>
                <Btn v="amber" sz="xs" onClick={() => setIsViewingHistoryMode(false)}>
                  <Edit3 size={11} /> Edit & Re-submit
                </Btn>
              </div>
            )}
          </div>


            
            // ── DEEP DIVE LAYOUT ──
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {selectedList.schema.sections.filter(sec => isSectionVisible(sec, draftData)).map(sec => (
                <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionLabel style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', color: T.t3, marginBottom: 4 }}>
                    {sec.title}
                  </SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sec.items.filter(item => isItemVisible(item, sec, draftData)).map(item => {
                      const val = draftData[item.id]
                      const triggers = item.trig
                      const done = triggers?.kind === 'yn'
                        ? (val === 'Y' || (val === 'N' && draftData[`${item.id}_note`]))
                        : triggers?.kind === 'temp' || triggers?.kind === 'number'
                          ? (val !== undefined && val !== '')
                          : triggers?.kind === 'sig' || triggers?.kind === 'photo'
                            ? !!val
                            : val === true

                      const isExpanded = expandedItems[item.id] !== false // Default to expanded
                      const toggleExpand = () => {
                        setExpandedItems(prev => ({ ...prev, [item.id]: !isExpanded }))
                      }

                      return (
                        <Card
                          key={item.id}
                          style={{
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            opacity: done ? 0.75 : 1,
                            transition: 'opacity 0.2s ease, transform 0.15s ease',
                          }}
                        >
                          {/* Top Row: Checkbox/Trigger State + Title + Expand Chevron */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                            {/* Standard checkbox if no complex inputs needed */}
                            {!triggers && (
                              <button
                                aria-label={`Mark "${item.text}" as complete`}
                                aria-pressed={!!val}
                                onClick={() => handleValueChange(item.id, !val)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  background: val ? T.brand : 'transparent',
                                  border: `2px solid ${val ? T.brand : T.line2}`,
                                  cursor: 'pointer',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  padding: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {val && <Check size={14} strokeWidth={3} />}
                              </button>
                            )}

                            {/* Complex trigger completion indicator (dot or mini-check) */}
                            {triggers && (
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: done ? T.brandLo : 'transparent',
                                  border: `2px solid ${done ? T.brand : T.line2}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: T.brand,
                                  flexShrink: 0,
                                }}
                              >
                                {done && <Check size={12} strokeWidth={3} />}
                              </div>
                            )}

                            {/* Task text title */}
                            <span
                              onClick={toggleExpand}
                              style={{
                                flex: 1,
                                fontWeight: 600,
                                fontSize: 15,
                                color: done ? T.t3 : T.t1,
                                textDecoration: done ? 'line-through' : 'none',
                                cursor: 'pointer',
                                userSelect: 'none',
                                fontFamily: "'Inter', sans-serif",
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {item.text}
                              {item.req && <span style={{ color: T.red, textDecoration: 'none', display: 'inline-block' }}>*</span>}
                            </span>

                            {/* Chevron expand/collapse toggle */}
                            <button
                              onClick={toggleExpand}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: T.t3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 4,
                              }}
                            >
                              <ChevronDown
                                size={18}
                                style={{
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              />
                            </button>
                          </div>

                          {/* Expanded Content Area (Details + Inputs) */}
                          {isExpanded && showDetails && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                              paddingLeft: 34,
                              borderLeft: `2px solid ${done ? T.brandLo : T.line}`,
                              marginLeft: 10,
                              paddingBottom: 4,
                            }}>
                              {/* Task details or notes description (Notion/Todoist Warm Editorial feel) */}
                              <div style={{ fontSize: 13, color: T.t3, lineHeight: 1.5 }}>
                                {item.trig?.label ? item.trig.label : 'Wipe all surfaces and verify completed status.'}
                              </div>

                              {/* 1. YES / NO TRIGGER */}
                              {triggers?.kind === 'yn' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <Btn
                                      v={val === 'Y' ? 'brand' : 'ghost'}
                                      sz="sm"
                                      onClick={() => handleValueChange(item.id, 'Y')}
                                      style={{ borderRadius: 8, padding: '6px 16px' }}
                                    >
                                      Yes
                                    </Btn>
                                    <Btn
                                      v={val === 'N' ? 'red' : 'ghost'}
                                      sz="sm"
                                      onClick={() => handleValueChange(item.id, 'N')}
                                      style={{ borderRadius: 8, padding: '6px 16px' }}
                                    >
                                      No
                                    </Btn>
                                  </div>
                                  {val === 'N' && (
                                    <input
                                      type="text"
                                      placeholder={triggers.yNoteLabel || 'Explain deviation here...'}
                                      value={draftData[`${item.id}_note`] || ''}
                                      onChange={e => handleValueChange(`${item.id}_note`, e.target.value)}
                                      style={{
                                        background: T.bg2,
                                        border: `1px solid ${T.redBd}`,
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        fontSize: 13,
                                        color: T.t1,
                                        fontFamily: "'Inter', sans-serif",
                                        outline: 'none',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  )}
                                </div>
                              )}

                              {/* 2. TEMPERATURE LOG TRIGGER */}
                              {triggers?.kind === 'temp' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                      type="number"
                                      placeholder="Temp"
                                      value={val ?? ''}
                                      onChange={e => handleValueChange(item.id, e.target.value)}
                                      style={{
                                        width: 110,
                                        background: T.bg2,
                                        border: `1px solid ${T.line2}`,
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        paddingRight: 32,
                                        fontSize: 14,
                                        color: T.t1,
                                        fontFamily: "'Inter', sans-serif",
                                        outline: 'none'
                                      }}
                                    />
                                    <span style={{ position: 'absolute', right: 12, fontSize: 13, color: T.t3, fontWeight: 600 }}>°F</span>
                                  </div>
                                  {triggers.warnAbove && val !== undefined && val !== '' && parseFloat(val) > triggers.warnAbove && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.red, fontWeight: 700 }}>
                                      <AlertTriangle size={14} /> Critical: exceeds {triggers.warnAbove}°F
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* 3. NOTE REQUIRED TRIGGER */}
                              {triggers?.kind === 'note' && (
                                <input
                                  type="text"
                                  placeholder={triggers.label || 'Enter notes...'}
                                  value={val || ''}
                                  onChange={e => handleValueChange(item.id, e.target.value)}
                                  style={{
                                    background: T.bg2,
                                    border: `1px solid ${T.line2}`,
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    fontSize: 13,
                                    color: T.t1,
                                    fontFamily: "'Inter', sans-serif",
                                    outline: 'none',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              )}

                              {/* 4. NUMBER TRIGGER */}
                              {triggers?.kind === 'number' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <input
                                    type="number"
                                    placeholder={triggers.label || '0'}
                                    value={val ?? ''}
                                    onChange={e => handleValueChange(item.id, e.target.value)}
                                    style={{
                                      width: 120,
                                      background: T.bg2,
                                      border: `1px solid ${T.line2}`,
                                      borderRadius: 8,
                                      padding: '10px 14px',
                                      fontSize: 14,
                                      color: T.t1,
                                      fontFamily: "'Inter', sans-serif",
                                      outline: 'none'
                                    }}
                                  />
                                  {triggers.label && <span style={{ fontSize: 13, color: T.t3, fontWeight: 500 }}>{triggers.label}</span>}
                                </div>
                              )}

                              {/* 5. DROPDOWN TRIGGER */}
                              {triggers?.kind === 'dropdown' && (() => {
                                const opts = (triggers.options || '').split(',').map((o: string) => o.trim()).filter(Boolean)
                                return (
                                  <div style={{ position: 'relative', maxWidth: 280 }}>
                                    <select
                                      value={val || ''}
                                      onChange={e => handleValueChange(item.id, e.target.value)}
                                      aria-label={triggers.label || item.text}
                                      style={{
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        background: T.bg2,
                                        border: `1px solid ${T.line2}`,
                                        borderRadius: 8,
                                        padding: '10px 36px 10px 14px',
                                        fontSize: 13,
                                        color: val ? T.t1 : T.t3,
                                        fontFamily: "'Inter', sans-serif",
                                        outline: 'none',
                                        width: '100%',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">{triggers.label || 'Select an option...'}</option>
                                      {opts.map((o: string) => (
                                        <option key={o} value={o}>{o}</option>
                                      ))}
                                    </select>
                                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.t3, pointerEvents: 'none' }} />
                                  </div>
                                )
                              })()}

                              {/* 6. DATETIME TRIGGER */}
                              {triggers?.kind === 'datetime' && (
                                <input
                                  type="datetime-local"
                                  value={val || ''}
                                  onChange={e => handleValueChange(item.id, e.target.value)}
                                  aria-label={triggers.label || item.text}
                                  style={{
                                    background: T.bg2,
                                    border: `1px solid ${T.line2}`,
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    fontSize: 13,
                                    color: T.t1,
                                    fontFamily: "'Inter', sans-serif",
                                    outline: 'none',
                                    colorScheme: T.mode === 'dark' ? 'dark' : 'light'
                                  }}
                                />
                              )}

                              {/* 7. PHOTO UPLOAD TRIGGER */}
                              {triggers?.kind === 'photo' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {val ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                      <img
                                        src={val}
                                        alt="Uploaded attachment"
                                        style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: `1px solid ${T.line}`, objectFit: 'cover' }}
                                      />
                                      <button
                                        aria-label="Remove photo"
                                        onClick={() => handleValueChange(item.id, null)}
                                        style={{
                                          position: 'absolute',
                                          top: 6,
                                          right: 6,
                                          background: T.red,
                                          border: 'none',
                                          borderRadius: 6,
                                          width: 24,
                                          height: 24,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#fff'
                                        }}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <label
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 16px',
                                        background: uploadingPhotoId === item.id ? T.brandLo : T.bg2,
                                        border: `1.5px dashed ${T.line2}`,
                                        borderRadius: 8,
                                        cursor: uploadingPhotoId === item.id ? 'wait' : 'pointer',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: T.t2,
                                        fontFamily: "'Inter', sans-serif"
                                      }}
                                    >
                                      <Camera size={16} />
                                      {uploadingPhotoId === item.id ? 'Uploading...' : (triggers.label || 'Attach Photo')}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        disabled={uploadingPhotoId !== null}
                                        onChange={e => {
                                          const file = e.target.files?.[0]
                                          if (file) handlePhotoUpload(item.id, file)
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              )}

                              {/* 8. DIGITAL SIGNATURE FIELD */}
                              {triggers?.kind === 'sig' && (
                                isKioskMode ? (
                                  <KioskSignatureVerifier
                                    roster={roster}
                                    value={draftData[item.id] || null}
                                    signerId={draftData[item.id + '_signer'] || null}
                                    onVerify={(signerId, sigData) => {
                                      setDraftData(prev => {
                                        const next = { ...prev, [item.id + '_signer']: signerId }
                                        if (sigData) next[item.id] = sigData
                                        if (submissionId) {
                                          supabase.from('checklist_submissions').update({ draft_data: next }).eq('id', submissionId)
                                        }
                                        return next
                                      })
                                    }}
                                    onClear={() => {
                                      setDraftData(prev => {
                                        const next = { ...prev }
                                        delete next[item.id]
                                        delete next[item.id + '_signer']
                                        if (submissionId) {
                                          supabase.from('checklist_submissions').update({ draft_data: next }).eq('id', submissionId)
                                        }
                                        return next
                                      })
                                    }}
                                    T={T}
                                  />
                                ) : (
                                  <SigPad
                                    value={draftData[item.id] || null}
                                    onChange={(sigData) => {
                                      setDraftData(prev => {
                                        const next = { ...prev }
                                        if (sigData) {
                                          next[item.id] = sigData
                                          next[item.id + '_signer'] = profile?.id || 'usr_emp'
                                        } else {
                                          delete next[item.id]
                                          delete next[item.id + '_signer']
                                        }
                                        if (submissionId) {
                                          supabase.from('checklist_submissions').update({ draft_data: next }).eq('id', submissionId)
                                        }
                                        return next
                                      })
                                    }}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}

              {selectedList.signature_mode === 'dual' && (
                <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                  <SectionLabel>Manager Countersignature Required</SectionLabel>
                  {isKioskMode ? (
                    <KioskSignatureVerifier
                      roster={roster.filter(r => r.role === 'shift_leader' || r.role === 'location_manager' || r.role === 'org_admin' || r.role === 'super_admin')}
                      value={draftData['__manager_sig__'] || null}
                      signerId={draftData['__manager_sig_signer__'] || null}
                      onVerify={(signerId, sigData) => {
                        setDraftData(prev => {
                          const next: Record<string, any> = { ...prev, '__manager_sig_signer__': signerId }
                          if (sigData) next['__manager_sig__'] = sigData
                          if (submissionId) {
                            supabase.from('checklist_submissions').update({ draft_data: next }).eq('id', submissionId)
                          }
                          return next
                        })
                      }}
                      onClear={() => {
                        setDraftData(prev => {
                          const next = { ...prev }
                          delete next['__manager_sig__']
                          delete next['__manager_sig_signer__']
                          if (submissionId) {
                            supabase.from('checklist_submissions').update({ draft_data: next }).eq('id', submissionId)
                          }
                          return next
                        })
                      }}
                      T={T}
                    />
                  ) : (
                    <SigPad
                      value={draftData['__manager_sig__'] || null}
                      onChange={(sigData) => {
                        setDraftData(prev => {
                          const next = { ...prev }
                          if (sigData) {
                            next['__manager_sig__'] = sigData
                            next['__manager_sig_signer__'] = profile?.id || 'usr_mgr'
                          } else {
                            delete next['__manager_sig__']
                            delete next['__manager_sig_signer__']
                          }
                          if (submissionId) {
                            supabase.from('checklist_submissions').update({ draft_data: next }).eq('id', submissionId)
                          }
                          return next
                        })
                      }}
                    />
                  )}
                </Card>
              )}
            </div>

          {/* Form Actions */}
          {!isViewingHistoryMode && submissionId && (
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <Btn v="ghost" style={{ flex: 1 }} onClick={() => setSelectedList(null)}>
                Cancel
              </Btn>
              <Btn v="brand" style={{ flex: 2 }} onClick={handleSubmitChecklist} disabled={submitting}>
                <Send size={16} /> {submitting ? 'Submitting...' : existingSubmissions.find(s => s.id === submissionId)?.status === 'submitted' ? 'Re-submit with Changes' : 'Submit Checklist'}
              </Btn>
            </div>
          )}
          {isViewingHistoryMode && (
            <Btn v="ghost" style={{ width: '100%' }} onClick={() => setSelectedList(null)}>
              Back to Checklist List
            </Btn>
          )}
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}
export default Tasks
