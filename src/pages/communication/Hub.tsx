import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, Pill, SectionLabel, Spinner } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { 
  Megaphone, MessageSquare, Send, CheckCircle2, User, Users,
  RefreshCw
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  created_at: string
  profiles: { full_name: string }
  acksCount: number
  isAcked: boolean
}

interface Profile {
  id: string
  full_name: string
  role: string
  avatar_initials: string
}

interface ChatGroup {
  id: string
  name: string
}

interface Message {
  id: string
  body: string
  created_at: string
  sender_id: string
  recipient_id: string | null
  group_id: string | null
  senderName?: string
  org_id?: string
}

export const Hub: React.FC = () => {
  const { T } = useTheme()
  const { profile } = useAuth()

  // Tab: 'feed' (Announcements) or 'chat' (DMs/Groups)
  const [activeMode, setActiveMode] = useState<'feed' | 'chat'>('feed')

  // Announcements states
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  
  // Chat states
  const [channels, setChannels] = useState<ChatGroup[]>([])
  const [roster, setRoster] = useState<Profile[]>([])
  const [selectedChat, setSelectedChat] = useState<{ id: string; type: 'group' | 'dm'; name: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgInput, setMsgInput] = useState('')

  const [loading, setLoading] = useState(true)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  // 1. Fetch announcements
  const loadAnnouncements = async () => {
    if (!profile) return
    try {
      const { data } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          body,
          created_at,
          created_by,
          profiles:created_by ( full_name )
        `)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })

      if (data) {
        // Fetch acknowledgements for each
        const updated = await Promise.all(data.map(async (ann: any) => {
          const { count } = await supabase
            .from('announcement_acknowledgements')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', ann.id)

          const { data: ownAck } = await supabase
            .from('announcement_acknowledgements')
            .select('*')
            .eq('announcement_id', ann.id)
            .eq('profile_id', profile.id)
            .maybeSingle()

          return {
            ...ann,
            acksCount: count || 0,
            isAcked: !!ownAck
          }
        }))
        setAnnouncements(updated)
      }
    } catch (err) {
      console.error('Failed loading announcements:', err)
    }
  }

  // 2. Fetch Chat List (Groups + Employee Roster)
  const loadChatRoster = async () => {
    if (!profile) return
    try {
      // Load groups
      const { data: grps } = await supabase
        .from('chat_groups')
        .select('id, name')
        .eq('org_id', profile.org_id)

      if (grps) setChannels(grps)

      // Load other profiles
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_initials')
        .eq('org_id', profile.org_id)
        .eq('is_active', true)
        .neq('id', profile.id)

      if (users) setRoster(users)
    } catch (err) {
      console.error('Failed loading chat roster:', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadAnnouncements(), loadChatRoster()])
      setLoading(false)
    }
    init()
  }, [profile])

  // 3. Acknowledge Announcement
  const handleAckAnnouncement = async (annId: string) => {
    if (!profile) return
    try {
      await supabase
        .from('announcement_acknowledgements')
        .insert({
          announcement_id: annId,
          profile_id: profile.id
        })
      
      // Update state
      setAnnouncements(prev => prev.map(ann => {
        if (ann.id === annId) {
          return { ...ann, isAcked: true, acksCount: ann.acksCount + 1 }
        }
        return ann
      }))
    } catch (err) {
      console.error('Acknowledgement failed:', err)
    }
  }

  // 4. Load Thread messages
  const loadMessages = async (chat: typeof selectedChat) => {
    if (!profile || !chat) return
    try {
      let query = supabase.from('chat_messages').select('*')
      
      if (chat.type === 'group') {
        query = query.eq('group_id', chat.id)
      } else {
        // Direct messages (either direction)
        query = query.or(`and(sender_id.eq.${profile.id},recipient_id.eq.${chat.id}),and(sender_id.eq.${chat.id},recipient_id.eq.${profile.id})`)
      }

      const { data } = await query.order('created_at', { ascending: true })

      if (data) {
        // Map names locally helper
        const mapped = data.map((msg: any) => {
          let senderName = 'System'
          if (msg.sender_id === profile.id) {
            senderName = profile.full_name
          } else {
            const found = roster.find(u => u.id === msg.sender_id)
            if (found) senderName = found.full_name
          }
          return { ...msg, senderName }
        })
        setMessages(mapped)
      }
    } catch (err) {
      console.error('Failed loading messages:', err)
    }
  }

  // Reload messages when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat)
    }
  }, [selectedChat])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 5. Supabase Realtime listener subscription for new chat messages
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('realtime_chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          const newMsg = payload.new as Message
          
          // Verify if message belongs to current thread context
          if (selectedChat) {
            const isTargetGroup = selectedChat.type === 'group' && newMsg.group_id === selectedChat.id
            const isTargetDM = selectedChat.type === 'dm' && (
              (newMsg.sender_id === profile.id && newMsg.recipient_id === selectedChat.id) ||
              (newMsg.sender_id === selectedChat.id && newMsg.recipient_id === profile.id)
            )

            if (isTargetGroup || isTargetDM) {
              let senderName = 'System'
              if (newMsg.sender_id === profile.id) {
                senderName = profile.full_name
              } else {
                const found = roster.find(u => u.id === newMsg.sender_id)
                if (found) senderName = found.full_name
              }
              
              setMessages(prev => [...prev, { ...newMsg, senderName }])
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedChat, roster, profile])

  // 6. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msgInput.trim() || !profile || !selectedChat) return

    try {
      const payload: Partial<Message> = {
        org_id: profile.org_id,
        sender_id: profile.id,
        body: msgInput.trim()
      }

      if (selectedChat.type === 'group') {
        payload.group_id = selectedChat.id
      } else {
        payload.recipient_id = selectedChat.id
      }

      setMsgInput('') // Clear input
      
      const { error } = await supabase.from('chat_messages').insert(payload)
      if (error) throw error
    } catch (err) {
      console.error('Failed sending message:', err)
    }
  }

  if (loading && roster.length === 0) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: T.t1, letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Communication Hub
          </h1>
          <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
            Announcements, team chat, and direct messages.
          </p>
        </div>

        {/* Segmented Mode Control */}
        <div style={{ display: 'inline-flex', background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 4, gap: 2 }}>
          {([['feed', <Megaphone size={14} />, 'Announcements'], ['chat', <MessageSquare size={14} />, 'Team Messenger']] as const).map(([mode, icon, label]) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              style={{
                background: activeMode === mode ? T.bg0 : 'transparent',
                boxShadow: activeMode === mode ? `0 1px 3px rgba(0,0,0,0.1)` : 'none',
                border: `1px solid ${activeMode === mode ? T.line : 'transparent'}`,
                color: activeMode === mode ? T.brand : T.t3,
                padding: '8px 16px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: activeMode === mode ? 700 : 500,
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
      </div>

      {/* ── MODE A: ANNOUNCEMENTS FEED ── */}
      {activeMode === 'feed' && (
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680, margin: '0 auto', width: '100%' }}>
          {announcements.length === 0 ? (
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px' }}>
              <Megaphone size={32} color={T.t4} style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 800, color: T.t2 }}>No announcements yet</div>
              <div style={{ fontSize: 12, color: T.t4, marginTop: 4 }}>Check back later for company updates.</div>
            </Card>
          ) : (
            announcements.map(ann => (
              <Card key={ann.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1 }}>{ann.title}</h3>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                      Posted by {ann.profiles?.full_name || 'Admin'} • {new Date(ann.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Pill fg={T.sky} bg={T.skyLo} bd={T.skyBd}>
                    {ann.acksCount} read
                  </Pill>
                </div>
                
                <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {ann.body}
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                  {ann.isAcked ? (
                    <span style={{ fontSize: 12, color: T.lime, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} /> Read & Acknowledged
                    </span>
                  ) : (
                    <Btn v="brand" sz="xs" onClick={() => handleAckAnnouncement(ann.id)}>
                      Acknowledge Read
                    </Btn>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── MODE B: TEAM CHAT ── */}
      {activeMode === 'chat' && (
        <div style={{ display: 'flex', flex: 1, border: `1px solid ${T.line}`, borderRadius: 4, overflow: 'hidden', background: T.bg1 }}>
          
          {/* Chat Sidebar (Channels list) */}
          <div style={{ width: 220, borderRight: `1.5px solid ${T.line}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
            {/* Group Channels */}
            <div style={{ padding: '16px 12px' }}>
              <SectionLabel>Group Channels</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {channels.map(chan => {
                  const isActive = selectedChat?.type === 'group' && selectedChat.id === chan.id
                  return (
                    <button
                      key={chan.id}
                      onClick={() => setSelectedChat({ id: chan.id, type: 'group', name: chan.name })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 4,
                        background: isActive ? T.brandLo : 'transparent',
                        border: 'none',
                        color: isActive ? T.brand : T.t2,
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <Users size={14} /> #{chan.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Direct Messages */}
            <div style={{ padding: '0 12px 16px 12px' }}>
              <SectionLabel>Direct Messages</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {roster.map(u => {
                  const isActive = selectedChat?.type === 'dm' && selectedChat.id === u.id
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedChat({ id: u.id, type: 'dm', name: u.full_name })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 4,
                        background: isActive ? T.brandLo : 'transparent',
                        border: 'none',
                        color: isActive ? T.brand : T.t2,
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <User size={14} /> {u.full_name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Chat Window Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg0 }}>
            {selectedChat ? (
              <>
                {/* Panel Header */}
                <div style={{ padding: 16, background: T.bg1, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1, letterSpacing: '-0.2px' }}>
                      {selectedChat.type === 'group' ? `#${selectedChat.name}` : selectedChat.name}
                    </h4>
                    <span style={{ fontSize: 11, color: T.t3 }}>
                      {selectedChat.type === 'group' ? 'Public channel' : 'Private Direct Message thread'}
                    </span>
                  </div>
                  <button onClick={() => loadMessages(selectedChat)} style={{ background: 'none', border: 'none', color: T.t3, cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* Messages Box */}
                <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {messages.length === 0 ? (
                    <div style={{ margin: 'auto', color: T.t4, fontSize: 13, textAlign: 'center' }}>
                      No messages in this chat thread. Send a hello!
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === profile?.id
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%'
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 800, color: T.t3, marginBottom: 4 }}>
                            {msg.senderName}
                          </span>
                          <div
                            style={{
                              background: isMe ? T.brand : T.bg2,
                              color: isMe ? '#fff' : T.t1,
                              border: `1px solid ${isMe ? 'transparent' : T.line}`,
                              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              padding: '10px 16px',
                              fontSize: 13,
                              lineHeight: 1.5
                            }}
                          >
                            {msg.body}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Message input Form */}
                <form onSubmit={handleSendMessage} style={{ padding: 16, background: T.bg1, borderTop: `1px solid ${T.line}`, display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: T.bg3,
                      border: `1px solid ${T.line}`,
                      borderRadius: 4,
                      color: T.t1,
                      padding: '12px 16px',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                  <Btn type="submit" v="brand" sz="sm">
                    <Send size={14} /> Send
                  </Btn>
                </form>
              </>
            ) : (
              <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: T.t4 }}>
                <MessageSquare size={36} />
                <span style={{ fontSize: 13 }}>Select a channel or direct message thread to start chatting.</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
export default Hub
