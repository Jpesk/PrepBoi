import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, Pill, SectionLabel, SigPad, Spinner, Toast } from '../../components/ui'
import { encryptText, decryptText } from '../../lib/crypto'
import { supabase } from '../../lib/supabase'
import { ShieldCheck, Send, AlertCircle, Star } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Mood = 'good' | 'neutral' | 'bad'

interface ReviewPayload {
  mood: Mood
  hasIssues: boolean
  issueDetails: string
  shoutouts: string
  signature?: string | null
  signerId?: string | null
}

interface LogEntry {
  id: string
  shift: string
  encrypted_content: string
  metrics?: any
  created_at: string
  profiles: any
  review?: ReviewPayload
}

// Derive a stable per-org encryption passphrase — plaintext never leaves the client
function orgPassphrase(orgId: string): string {
  return `preppro-daily-${orgId}-v1`
}

// ── Mood Option ────────────────────────────────────────────────────────────────

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'good',    emoji: '🙂', label: 'Good' },
  { value: 'neutral', emoji: '😐', label: 'Okay' },
  { value: 'bad',     emoji: '😞', label: 'Rough' },
]

// ── Component ─────────────────────────────────────────────────────────────────


export const Logbook: React.FC = () => {
  const { T, mode } = useTheme()
  const { profile, isKioskMode } = useAuth()

  // Form state
  const [shift, setShift]           = useState<string>('AM')
  const [mood, setMood]             = useState<Mood | null>(null)
  const [hasIssues, setHasIssues]   = useState<boolean | null>(null)
  const [issueDetails, setIssueDetails] = useState('')
  const [shoutouts, setShoutouts]   = useState('')
  const [saving, setSaving]         = useState(false)

  // Kiosk / Signature verification states
  const [roster, setRoster] = useState<any[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [pin, setPin] = useState('')
  const [sig, setSig] = useState<string | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  // Load roster
  useEffect(() => {
    const fetchRoster = async () => {
      if (!profile) return
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, pin_code, role')
          .eq('org_id', profile.org_id)
          .eq('is_active', true)
        if (data) setRoster(data)
      } catch (err) {
        console.error('Failed loading roster:', err)
      }
    }
    fetchRoster()
  }, [profile])

  // History state
  const [logs, setLogs]     = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // ── Load & decrypt history ─────────────────────────────────────────────────
  const loadLogs = async () => {
    if (!profile) return
    try {
      setLoading(true)
      const { data } = await supabase
        .from('manager_logs')
        .select(`id, shift, encrypted_content, metrics, created_at, profiles:created_by ( full_name )`)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })

      if (data) {
        const pass = orgPassphrase(profile.org_id)
        const decrypted = await Promise.all(data.map(async (log: LogEntry) => {
          try {
            const raw = await decryptText(log.encrypted_content, pass)
            const review: ReviewPayload = JSON.parse(raw)
            return { ...log, review }
          } catch {
            return log
          }
        }))
        setLogs(decrypted)
      }
    } catch (err) {
      console.error('Failed loading reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [profile])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || mood === null || hasIssues === null) return

    const verifiedSignerId = isKioskMode ? selectedStaffId : profile.id;

    const payload: ReviewPayload = {
      mood,
      hasIssues,
      issueDetails: hasIssues ? issueDetails.trim() : '',
      shoutouts: shoutouts.trim(),
      signature: sig,
      signerId: verifiedSignerId,
    }

    try {
      setSaving(true)
      const pass = orgPassphrase(profile.org_id)
      const cipherText = await encryptText(JSON.stringify(payload), pass)

      const { data, error } = await supabase
        .from('manager_logs')
        .insert({
          org_id: profile.org_id,
          location_id: profile.location_id,
          created_by: verifiedSignerId,
          shift,
          encrypted_content: cipherText,
          metrics: { mood, has_issues: hasIssues },
        })
        .select(`id, shift, encrypted_content, metrics, created_at, profiles:created_by ( full_name )`)
        .single()

      if (error) throw error

      setToastMsg('Shift review submitted!')
      setMood(null)
      setHasIssues(null)
      setIssueDetails('')
      setShoutouts('')
      setSig(null)
      setSelectedStaffId('')
      setPin('')
      setIsVerified(false)

      if (data) {
        setLogs(prev => [{ ...data, review: payload }, ...prev])
      }
    } catch (err) {
      console.error('Submit failed:', err)
      setToastMsg('Failed to submit review.')
    } finally {
      setSaving(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const moodMeta = (m: Mood) => MOODS.find(x => x.value === m)

  const moodColors: Record<Mood, { fg: string; bg: string; bd: string }> = {
    good:    { fg: T.lime,  bg: T.limeLo,  bd: T.limeBd  },
    neutral: { fg: T.amber, bg: T.amberLo, bd: T.amberBd },
    bad:     { fg: T.red,   bg: T.redLo,   bd: T.redBd   },
  }

  const isFormReady = mood !== null &&
    hasIssues !== null &&
    (!hasIssues || issueDetails.trim().length > 0) &&
    (sig !== null) &&
    (!isKioskMode || (isVerified && selectedStaffId !== ''))

  if (loading && logs.length === 0) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{
            fontSize: 36, fontWeight: 800, margin: 0, color: T.t1,
            letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Shift Review
          </h1>
          <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
            Complete your end-of-shift check-in before you leave for the day.
          </p>
        </div>
        <div
          aria-label="Data encrypted at rest"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: T.limeLo, border: `1px solid ${T.limeBd}`,
            borderRadius: 8, padding: '6px 12px',
            fontSize: 11, fontWeight: 700, color: T.lime,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <ShieldCheck size={13} aria-hidden="true" /> Encrypted at Rest
        </div>
      </div>

      {/* ── Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32, alignItems: 'start' }}>

        {/* ── LEFT: Review Form ── */}
        <div>
          <SectionLabel>Your Shift Check-In</SectionLabel>
          <Card>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* Shift selector */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                  Shift Period
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['AM', 'PM', 'Mid'].map(s => (
                    <Btn key={s} v={shift === s ? 'brand' : 'ghost'} sz="xs" onClick={() => setShift(s)} style={{ flex: 1 }}>
                      {s}
                    </Btn>
                  ))}
                </div>
              </div>

              {/* Q1: Mood */}
              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.t1, marginBottom: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  How did your shift go?
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {MOODS.map(m => {
                    const selected = mood === m.value
                    const colors = moodColors[m.value]
                    return (
                      <button
                        key={m.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Shift mood: ${m.label}`}
                        onClick={() => setMood(m.value)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          padding: '16px 8px',
                          borderRadius: 12,
                          border: `2px solid ${selected ? colors.bd : T.line}`,
                          background: selected ? colors.bg : T.bg2,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: 32, lineHeight: 1 }} aria-hidden="true">{m.emoji}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: selected ? colors.fg : T.t3,
                          fontFamily: "'Inter', sans-serif",
                          textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                          {m.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Q2: Issues */}
              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.t1, marginBottom: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Any issues?
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      aria-pressed={hasIssues === opt.val}
                      aria-label={`Issues this shift: ${opt.label}`}
                      onClick={() => { setHasIssues(opt.val); if (!opt.val) setIssueDetails('') }}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: 10,
                        border: `2px solid ${hasIssues === opt.val ? (opt.val ? T.redBd : T.limeBd) : T.line}`,
                        background: hasIssues === opt.val ? (opt.val ? T.redLo : T.limeLo) : T.bg2,
                        color: hasIssues === opt.val ? (opt.val ? T.red : T.lime) : T.t3,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Issue detail expander */}
                {hasIssues === true && (
                  <div style={{ marginTop: 12, animation: 'pb-slide-up 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <AlertCircle size={13} color={T.red} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.red, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Describe the issue(s)
                      </span>
                    </div>
                    <textarea
                      aria-label="Describe the issues that occurred this shift"
                      placeholder="What went wrong? Equipment, staffing, safety, customer complaints..."
                      value={issueDetails}
                      onChange={e => setIssueDetails(e.target.value)}
                      required={hasIssues === true}
                      style={{
                        width: '100%',
                        height: 100,
                        background: T.bg3,
                        border: `1.5px solid ${T.redBd}`,
                        borderRadius: 8,
                        color: T.t1,
                        padding: '10px 14px',
                        fontSize: 13,
                        lineHeight: 1.6,
                        fontFamily: 'inherit',
                        resize: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Q3: Shoutouts */}
              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.t1, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Shout outs &amp; positive notes
                </label>
                <p style={{ fontSize: 12, color: T.t3, margin: '0 0 10px 0' }}>
                  Recognize a team member, highlight a win, or leave a motivating note.
                </p>
                <textarea
                  aria-label="Shout outs and positive notes for the team"
                  placeholder="e.g. Alex crushed it on drive-through today! Rush hour handled perfectly 🙌"
                  value={shoutouts}
                  onChange={e => setShoutouts(e.target.value)}
                  style={{
                    width: '100%',
                    height: 90,
                    background: T.bg3,
                    border: `1px solid ${T.line}`,
                    borderRadius: 8,
                    color: T.t1,
                    padding: '10px 14px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Signature Verification */}
              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 20 }}>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.t1, marginBottom: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Signature Verification
                </label>

                {isKioskMode ? (
                  !isVerified ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, border: `1px solid ${T.line2}`, padding: 16, borderRadius: 12, background: T.surfaceGlass, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        PIN Verification Required
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <select
                          aria-label="Select your name from the staff roster"
                          value={selectedStaffId}
                          onChange={e => setSelectedStaffId(e.target.value)}
                          style={{
                            flex: 2,
                            minWidth: 150,
                            background: T.bg3,
                            border: `1px solid ${T.line}`,
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 13,
                            color: T.t1,
                            fontFamily: 'inherit',
                          }}
                        >
                          <option value="">Select your name...</option>
                          {roster.map(r => (
                            <option key={r.id} value={r.id}>{r.full_name}</option>
                          ))}
                        </select>
                        <input
                          type="password"
                          inputMode="numeric"
                          aria-label="Enter your 4-digit PIN"
                          maxLength={4}
                          placeholder="PIN"
                          value={pin}
                          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                          style={{
                            width: 80,
                            background: T.bg3,
                            border: `1px solid ${T.line}`,
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 13,
                            color: T.t1,
                            textAlign: 'center',
                            fontWeight: 700
                          }}
                        />
                        <Btn
                          type="button"
                          v="brand"
                          sz="sm"
                          onClick={() => {
                            setPinError(null)
                            if (!selectedStaffId) {
                              setPinError('Please select your name.')
                              return
                            }
                            const member = roster.find(r => r.id === selectedStaffId)
                            if (!member) {
                              setPinError('Selected member not found.')
                              return
                            }
                            if (member.pin_code !== pin) {
                              setPinError('Incorrect PIN code.')
                              return
                            }
                            setIsVerified(true)
                          }}
                        >
                          Verify
                        </Btn>
                      </div>
                      {pinError && (
                        <div style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>
                          ⚠️ {pinError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: T.lime }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.lime }} />
                          Verified: {roster.find(r => r.id === selectedStaffId)?.full_name}
                        </div>
                        <Btn
                          type="button"
                          v="ghost"
                          sz="xs"
                          onClick={() => {
                            setIsVerified(false)
                            setSelectedStaffId('')
                            setPin('')
                            setSig(null)
                            setPinError(null)
                          }}
                        >
                          Change Signer
                        </Btn>
                      </div>
                      <SigPad value={sig} onChange={setSig} />
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 12, color: T.t3, margin: '0 0 4px 0' }}>
                      Sign below to complete and submit your Shift Review.
                    </p>
                    <SigPad value={sig} onChange={setSig} />
                  </div>
                )}
              </div>

              <Btn type="submit" v="brand" disabled={saving || !isFormReady} style={{ width: '100%' }}>
                <Send size={14} /> {saving ? 'Submitting...' : 'Submit Shift Review'}
              </Btn>

              {!isFormReady && (mood !== null || hasIssues !== null) && (
                <p style={{ fontSize: 12, color: T.t3, textAlign: 'center', margin: '-16px 0 0 0' }}>
                  {hasIssues === true && !issueDetails.trim() ? 'Please describe the issues above.' : 'Select mood, specify issues, and sign to submit.'}
                </p>
              )}
            </form>
          </Card>
        </div>

        {/* ── RIGHT: History ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionLabel>Recent Shift Reviews</SectionLabel>
          {logs.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center', color: T.t4 }}>
              <span style={{ fontSize: 40 }}>📋</span>
              <div style={{ marginTop: 12, fontSize: 14 }}>No reviews yet. Be the first to check in!</div>
            </Card>
          ) : (
            logs.map(log => {
              const m = log.review?.mood ? moodMeta(log.review.mood) : null
              const colors = log.review?.mood ? moodColors[log.review.mood] : null
              return (
                <Card key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: T.brandLo, border: `2px solid ${T.brandBd}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: T.brand, flexShrink: 0
                      }}>
                        {log.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {log.profiles?.full_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd}>{log.shift} Shift</Pill>
                          <span style={{ fontSize: 11, color: T.t4 }}>
                            {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mood badge */}
                    {m && colors && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 8,
                        background: colors.bg, border: `1px solid ${colors.bd}`,
                        fontSize: 13, color: colors.fg, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        <span>{m.emoji}</span>
                        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Issues block */}
                  {log.review?.hasIssues && log.review.issueDetails && (
                    <div style={{
                      padding: '10px 14px',
                      background: T.redLo,
                      border: `1px solid ${T.redBd}`,
                      borderRadius: 8,
                      fontSize: 13,
                      color: T.t1,
                      lineHeight: 1.6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <AlertCircle size={12} color={T.red} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.red, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Issue Reported</span>
                      </div>
                      {log.review.issueDetails}
                    </div>
                  )}

                  {/* No issues tag */}
                  {log.review?.hasIssues === false && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 6,
                      background: T.limeLo, border: `1px solid ${T.limeBd}`,
                      fontSize: 11, fontWeight: 700, color: T.lime,
                      alignSelf: 'flex-start',
                    }}>
                      ✓ No issues reported
                    </div>
                  )}

                  {/* Shoutouts block */}
                  {log.review?.shoutouts && (
                    <div style={{
                      padding: '10px 14px',
                      background: T.brandLo,
                      border: `1px solid ${T.brandBd}`,
                      borderRadius: 8,
                      fontSize: 13,
                      color: T.t1,
                      lineHeight: 1.6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Star size={12} color={T.brand} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.brand, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shout Out</span>
                      </div>
                      {log.review.shoutouts}
                    </div>
                  )}

                  {/* Digital Signature */}
                  {log.review?.signature && (
                    <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 10, marginTop: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: T.t4, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                        Digital Signature
                      </div>
                      <img
                        src={log.review.signature}
                        alt="Signature"
                        style={{
                          maxHeight: 50,
                          maxWidth: '100%',
                          objectFit: 'contain',
                          filter: mode === 'dark' ? 'invert(1) brightness(0.8)' : 'none',
                        }}
                      />
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}

export default Logbook
