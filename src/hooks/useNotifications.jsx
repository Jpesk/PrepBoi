import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNotifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) {
      setNotifications(data)
      setUnread(data.filter(n => !n.is_read).length)
    }
  }, [profile?.id])

  // Initial load
  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`notifs-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnread(prev => prev + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true })
      .eq('recipient_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return { notifications, unread, markRead, markAllRead, refresh: load }
}
