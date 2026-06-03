import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, Pill, SectionLabel, Spinner, Toast } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import {
  Clock, Search, ChevronRight,
  PenTool, AlertTriangle, History, ShieldCheck, User
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string
  text: string
  req: boolean
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
  items: ChecklistItem[]
}

interface Submission {
  id: string
  checklist_id: string
  status: 'draft' | 'submitted'
  submission_date: string
  submitted_at: string | null
  submitted_by: string
  progress: number
  draft_data: Record<string, any>
  signature_data: string | null
  checklist?: {
    id: string
    title: string
    emoji: string
    shift: string
    signature_mode?: 'none' | 'employee' | 'dual'
    schema: { sections: ChecklistSection[] }
  }
  profile?: {
    full_name: string
    avatar_initials: string
    role: string
  }
  revisions?: {
    id: string
    created_at: string
    updated_by: string
    draft_data: Record<string, any>
    updater?: { full_name: string }
  }[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const FieldDisplay: React.FC<{ item: ChecklistItem; val: any; noteVal?: string; T: any }> = ({ item, val, noteVal, T }) => {
  if (val === undefined || val === null || val === '') {
    return <span style={{ fontSize: 12, color: T.t3, fontStyle: 'italic' }}>—</span>
  }

  switch (item.trig?.kind) {
    case 'yn':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Pill
            fg={val === 'Y' ? T.lime : T.red}
            bg={val === 'Y' ? T.limeLo : T.redLo}
            bd={val === 'Y' ? T.lime : T.redBd}
          >
            {val === 'Y' ? '✓ Yes' : '✗ No'}
          </Pill>
          {val === 'N' && noteVal && (
            <span style={{ fontSize: 11, color: T.amber, fontStyle: 'italic' }}>Note: {noteVal}</span>
          )}
        </div>
      )
    case 'temp':
      const tempNum = parseFloat(val)
      const warn = item.trig?.warnAbove
      const isHot = warn && !isNaN(tempNum) && tempNum > warn
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: isHot ? T.red : T.t1, fontSize: 14 }}>{val}°F</span>
          {isHot && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.red, fontWeight: 700 }}>
              <AlertTriangle size={12} /> Above {warn}°F threshold
            </span>
          )}
        </div>
      )
    case 'photo':
      return (
        <img
          src={val}
          alt="Submission photo"
          style={{ maxWidth: 200, maxHeight: 140, borderRadius: 4, border: `1px solid ${T.line}`, objectFit: 'cover' }}
        />
      )
    case 'sig':
      return (
        <img
          src={val}
          alt="Signature"
          style={{ maxHeight: 80, borderRadius: 4, border: `1px solid ${T.line}`, background: '#fff', padding: 4 }}
        />
      )
    case 'dropdown':
      return <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd}>{val}</Pill>
    case 'datetime':
      return <span style={{ fontSize: 13, color: T.t1 }}>{new Date(val).toLocaleString()}</span>
    default:
      // Boolean checkbox
      if (typeof val === 'boolean') {
        return val
          ? <Pill fg={T.lime} bg={T.limeLo} bd={T.lime}>✓ Done</Pill>
          : <Pill fg={T.t3} bg={T.bg3} bd={T.line}>—</Pill>
      }
      return <span style={{ fontSize: 13, color: T.t1 }}>{String(val)}</span>
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export const Reviews: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const { T } = useTheme()
  const { profile } = useAuth()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [checklists, setChecklists] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'draft'>('submitted')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterChecklist, setFilterChecklist] = useState<string>('')
  const [filterStaff, setFilterStaff] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: lists }, { data: profs }] = await Promise.all([
          supabase.from('checklists').select('id,title,emoji,shift,signature_mode,schema').eq('org_id', profile.org_id).eq('is_active', true),
          supabase.from('profiles').select('id,full_name,avatar_initials,role').eq('org_id', profile.org_id).eq('is_active', true)
        ])
        if (lists) setChecklists(lists)
        if (profs) setProfiles(profs)
      } catch (err) {
        console.error('Error loading reference data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile])

  // Fetch submissions with applied filters
  useEffect(() => {
    if (!profile) return
    const fetchSubs = async () => {
      try {
        let query = supabase
          .from('checklist_submissions')
          .select('*')
          .eq('org_id', profile.org_id)
          .order('submitted_at', { ascending: false })

        if (filterStatus !== 'all') query = query.eq('status', filterStatus)
        if (filterDate) query = query.eq('submission_date', filterDate)
        if (filterChecklist) query = query.eq('checklist_id', filterChecklist)
        if (filterStaff) query = query.eq('submitted_by', filterStaff)

        const { data } = await query.limit(100)
        if (data) {
          // Join checklist schema and profile data client-side
          const enriched = data.map((sub: any) => ({
            ...sub,
            checklist: checklists.find(c => c.id === sub.checklist_id),
            profile: profiles.find(p => p.id === sub.submitted_by)
          }))
          setSubmissions(enriched)
        }
      } catch (err) {
        console.error('Error fetching submissions:', err)
      }
    }
    if (checklists.length > 0 || profiles.length > 0) fetchSubs()
  }, [profile, filterStatus, filterDate, filterChecklist, filterStaff, checklists, profiles])

  // Load detail (including revisions) when a submission is selected
  const handleSelectSubmission = async (sub: Submission) => {
    try {
      const { data: revisions } = await supabase
        .from('checklist_submission_revisions')
        .select('*')
        .eq('submission_id', sub.id)
        .order('created_at', { ascending: false })

      const enrichedRevisions = (revisions || []).map((rev: any) => ({
        ...rev,
        updater: profiles.find(p => p.id === rev.updated_by)
      }))

      setSelectedSub({ ...sub, revisions: enrichedRevisions })
    } catch (err) {
      console.error('Error loading revisions:', err)
      setSelectedSub(sub)
    }
  }

  // Manager verify (update manager_reviewed_at flag in draft_data)
  const handleVerify = async () => {
    if (!selectedSub || !profile) return
    setVerifying(true)
    try {
      const updatedData = {
        ...selectedSub.draft_data,
        __reviewed_by__: profile.id,
        __reviewed_at__: new Date().toISOString()
      }
      const { error } = await supabase
        .from('checklist_submissions')
        .update({ draft_data: updatedData })
        .eq('id', selectedSub.id)

      if (error) throw error
      setSelectedSub(prev => prev ? { ...prev, draft_data: updatedData } : null)
      setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, draft_data: updatedData } : s))
      setToastMsg('Submission marked as reviewed.')
    } catch (err) {
      console.error('Verify error:', err)
      setToastMsg('Failed to mark as reviewed.')
    } finally {
      setVerifying(false)
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      sub.checklist?.title?.toLowerCase().includes(q) ||
      sub.profile?.full_name?.toLowerCase().includes(q)
    )
  })

  if (loading) return <Spinner />

  // ── DETAIL PANEL ─────────────────────────────────────────────────────────

  if (selectedSub) {
    const checklist = selectedSub.checklist
    const data = selectedSub.draft_data || {}
    const isReviewed = !!data['__reviewed_by__']
    const reviewerProfile = profiles.find(p => p.id === data['__reviewed_by__'])
    const reviewedAt = data['__reviewed_at__'] ? new Date(data['__reviewed_at__']).toLocaleString() : null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 740, margin: '0 auto' }}>

        {/* Back nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Btn v="ghost" sz="sm" onClick={() => setSelectedSub(null)}>
            ← Back to Reviews
          </Btn>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isReviewed && (
              <Btn v="lime" sz="sm" onClick={handleVerify} disabled={verifying}>
                <ShieldCheck size={14} /> {verifying ? 'Marking...' : 'Mark Reviewed'}
              </Btn>
            )}
          </div>
        </div>

        {/* Header card */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 36 }}>{checklist?.emoji || '📋'}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1, letterSpacing: '-0.3px' }}>
                  {checklist?.title || 'Unknown Form'}
                </h2>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>
                  {selectedSub.submission_date} · Run by {selectedSub.profile?.full_name}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <Pill
                fg={selectedSub.status === 'submitted' ? T.lime : T.amber}
                bg={selectedSub.status === 'submitted' ? T.limeLo : T.amberLo}
                bd={selectedSub.status === 'submitted' ? T.lime : T.amberBd}
              >
                {selectedSub.status === 'submitted' ? '✓ Submitted' : '✏ Draft'}
              </Pill>
              {isReviewed && (
                <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd}>
                  <ShieldCheck size={10} style={{ marginRight: 4 }} />
                  Reviewed by {reviewerProfile?.full_name || 'Manager'}
                </Pill>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: T.t3, borderTop: `1px solid ${T.line2}`, paddingTop: 12 }}>
            {selectedSub.submitted_at && (
              <span><Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Submitted: {new Date(selectedSub.submitted_at).toLocaleString()}
              </span>
            )}
            <span>Progress: {selectedSub.progress}%</span>
            {checklist?.signature_mode && checklist.signature_mode !== 'none' && (
              <span><PenTool size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Signature Mode: {checklist.signature_mode}
              </span>
            )}
            {reviewedAt && (
              <span style={{ color: T.brand }}>
                <ShieldCheck size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Reviewed: {reviewedAt}
              </span>
            )}
          </div>
        </Card>

        {/* Form data sections */}
        {checklist?.schema?.sections?.map(sec => (
          <Card key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>{sec.title}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {sec.items.map((item, idx) => {
                const val = data[item.id]
                const noteVal = data[`${item.id}_note`]
                const signerProfileId = data[`${item.id}_signer`]
                const signerProfile = profiles.find(p => p.id === signerProfileId)
                const hasData = val !== undefined && val !== null && val !== ''
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '12px 0',
                      borderBottom: idx < sec.items.length - 1 ? `1px solid ${T.line2}` : 'none',
                      gap: 16
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: hasData ? T.t1 : T.t3 }}>
                        {item.text}
                        {item.req && <span style={{ color: T.red, marginLeft: 4 }}>*</span>}
                      </div>
                      {item.trig?.kind && (
                        <div style={{ fontSize: 10, color: T.t3, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {item.trig.kind}
                        </div>
                      )}
                      {signerProfile && (
                        <div style={{ fontSize: 11, color: T.brand, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={10} /> Signed by: {signerProfile.full_name}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, maxWidth: 260, textAlign: 'right' }}>
                      <FieldDisplay item={item} val={val} noteVal={noteVal} T={T} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ))}

        {/* Manager counter-signature review */}
        {data['__manager_sig__'] && (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, border: `1px solid ${T.amberBd}`, background: T.amberLo }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} style={{ color: T.amber }} />
              <SectionLabel style={{ color: T.amber, margin: 0 }}>Manager Counter-Signature</SectionLabel>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <img
                src={data['__manager_sig__']}
                alt="Manager counter-signature"
                style={{ maxHeight: 80, borderRadius: 4, border: `1px solid ${T.amberBd}`, background: '#fff', padding: 4 }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>
                  {profiles.find(p => p.id === data['__manager_sig_signer__'])?.full_name || 'Manager'}
                </div>
                <div style={{ fontSize: 11, color: T.t3 }}>Verified signer</div>
              </div>
            </div>
          </Card>
        )}

        {/* Revision history */}
        {selectedSub.revisions && selectedSub.revisions.length > 0 && (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} style={{ color: T.t3 }} />
              <SectionLabel>Edit History ({selectedSub.revisions.length} revision{selectedSub.revisions.length !== 1 ? 's' : ''})</SectionLabel>
            </div>
            {selectedSub.revisions.map((rev, idx) => (
              <div
                key={rev.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: idx < selectedSub.revisions!.length - 1 ? `1px solid ${T.line2}` : 'none'
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: T.bg3, border: `1px solid ${T.line2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: T.brand, flexShrink: 0
                }}>
                  {rev.updater?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>
                    {rev.updater?.full_name || 'Unknown user'}
                  </div>
                  <div style={{ fontSize: 11, color: T.t3 }}>
                    Edited on {new Date(rev.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Page header */}
      {!hideHeader && (
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: T.t1, letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Form Submissions
          </h1>
          <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
            Audit submitted checklists, view field data, and manage manager verifications.
          </p>
        </div>
      )}

      {/* Filters bar */}
      <Card style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {/* Search */}
        <div style={{ flex: '1 1 180px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.t3 }} />
          <input
            type="text"
            placeholder="Search form or staff name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search submissions"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              paddingLeft: 32,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              background: T.bg3,
              border: `1.5px solid ${T.line2}`,
              borderRadius: 8,
              fontSize: 13,
              color: T.t1,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            aria-label="Filter by date"
            style={{
              background: T.bg3,
              border: `1.5px solid ${T.line2}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: T.t1,
              fontFamily: 'inherit',
              colorScheme: 'dark'
            }}
          />
        </div>

        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            aria-label="Filter by status"
            style={{
              background: T.bg3,
              border: `1.5px solid ${T.line2}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: T.t1,
              fontFamily: 'inherit',
            }}
          >
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Form</label>
          <select
            value={filterChecklist}
            onChange={e => setFilterChecklist(e.target.value)}
            aria-label="Filter by checklist"
            style={{
              background: T.bg3,
              border: `1.5px solid ${T.line2}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: T.t1,
              fontFamily: 'inherit',
              maxWidth: 200
            }}
          >
            <option value="">All Forms</option>
            {checklists.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>
            ))}
          </select>
        </div>

        {/* Staff */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff</label>
          <select
            value={filterStaff}
            onChange={e => setFilterStaff(e.target.value)}
            aria-label="Filter by staff member"
            style={{
              background: T.bg3,
              border: `1.5px solid ${T.line2}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: T.t1,
              fontFamily: 'inherit',
              maxWidth: 200
            }}
          >
            <option value="">All Staff</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Summary counts */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', count: filteredSubmissions.length, color: T.brand, bg: T.brandLo, bd: T.brandBd },
          { label: 'Submitted', count: filteredSubmissions.filter(s => s.status === 'submitted').length, color: T.lime, bg: T.limeLo, bd: T.limeBd },
          { label: 'Drafts', count: filteredSubmissions.filter(s => s.status === 'draft').length, color: T.amber, bg: T.amberLo, bd: T.amberBd },
          { label: 'Reviewed', count: filteredSubmissions.filter(s => !!s.draft_data?.['__reviewed_by__']).length, color: T.sky, bg: T.skyLo, bd: T.skyBd },
        ].map(item => (
          <div key={item.label} style={{
            flex: '1 1 120px',
            padding: '16px 20px',
            background: item.bg,
            border: `1px solid ${item.bd}`,
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: item.color, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
              {item.count}
            </span>
            <span style={{ fontSize: 11, color: item.color, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, opacity: 0.8 }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Submissions table */}
      {filteredSubmissions.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <div style={{ fontWeight: 700, color: T.t2, marginBottom: 6 }}>No submissions found</div>
          <div style={{ fontSize: 13, color: T.t3 }}>Try adjusting the filters above.</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredSubmissions.map(sub => {
            const isReviewed = !!sub.draft_data?.['__reviewed_by__']
            const hasDualSig = !!sub.draft_data?.['__manager_sig__']

            return (
              <button
                key={sub.id}
                onClick={() => handleSelectSubmission(sub)}
                aria-label={`Review: ${sub.checklist?.title || 'Unknown'} by ${sub.profile?.full_name || 'Unknown'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 18px',
                  background: T.surfaceGlass,
                  border: `1px solid ${T.line2}`,
                  borderRadius: 12,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  width: '100%',
                  flexWrap: 'wrap'
                }}
              >
                {/* Emoji */}
                <span style={{ fontSize: 24, flexShrink: 0 }}>{sub.checklist?.emoji || '📋'}</span>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {sub.checklist?.title || 'Unknown Form'}
                  </div>
                  <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
                    <User size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {sub.profile?.full_name || 'Unknown'}
                    {sub.submitted_at && (
                      <span style={{ marginLeft: 10 }}>
                        <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div
                    role="progressbar"
                    aria-valuenow={sub.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progress: ${sub.progress}%`}
                    style={{ height: 4, background: T.bg3, borderRadius: 2, overflow: 'hidden' }}
                  >
                    <div style={{ height: '100%', width: `${sub.progress}%`, background: sub.progress === 100 ? T.lime : T.brand, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 10, color: T.t3, fontWeight: 700 }}>{sub.progress}%</span>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                  <Pill
                    fg={sub.status === 'submitted' ? T.lime : T.amber}
                    bg={sub.status === 'submitted' ? T.limeLo : T.amberLo}
                    bd={sub.status === 'submitted' ? T.lime : T.amberBd}
                  >
                    {sub.status === 'submitted' ? '✓ Done' : '✏ Draft'}
                  </Pill>
                  {isReviewed && (
                    <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd}>
                      <ShieldCheck size={9} style={{ marginRight: 3 }} /> Reviewed
                    </Pill>
                  )}
                  {hasDualSig && (
                    <Pill fg={T.amber} bg={T.amberLo} bd={T.amberBd}>
                      <PenTool size={9} style={{ marginRight: 3 }} /> Co-signed
                    </Pill>
                  )}
                </div>

                <ChevronRight size={16} style={{ color: T.t3, flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}

export default Reviews
