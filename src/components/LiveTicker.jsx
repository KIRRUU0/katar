import { memo, useEffect, useState, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'

/**
 * LiveTicker — Marquee announcements bar
 *
 * Features:
 * - Fetches active announcements from Supabase `announcements` table
 * - Subscribes to realtime changes for instant updates
 * - Falls back to demo data when Supabase is not configured
 * - Red background, white text, horizontal CSS ticker animation
 */


function LiveTicker() {
  const [announcements, setAnnouncements] = useState([])
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  // ── Fetch announcements ──────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Check local storage fallback first
      const localData = localStorage.getItem('katar_announcements')
      if (localData) {
        try {
          const parsed = JSON.parse(localData)
          const activeMsgs = parsed.filter(t => t.is_active).map(t => t.message)
          if (activeMsgs.length > 0) {
            setAnnouncements(activeMsgs)
            return
          }
        } catch (e) {
          console.warn('Failed to parse local katar_announcements:', e)
        }
      }
      setAnnouncements([])
      return
    }

    // Initial fetch
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('message')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAnnouncements(data.map((row) => row.message))
      } else {
        // Check local storage fallback first before demo data
        const localData = localStorage.getItem('katar_announcements')
        if (localData) {
          try {
            const parsed = JSON.parse(localData)
            const activeMsgs = parsed.filter(t => t.is_active).map(t => t.message)
            if (activeMsgs.length > 0) {
              setAnnouncements(activeMsgs)
              return
            }
          } catch (e) {
            console.warn('Failed to parse local katar_announcements:', e)
          }
        }
        setAnnouncements([])
      }
    }

    fetchAnnouncements()

    // ── Realtime subscription ────────────────────────────
    // create a uniquely-named channel to avoid "already subscribed" errors
    const channelName = `announcements-realtime-${Date.now()}-${Math.random().toString(36).slice(2)}`
    let channel
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcements' },
          () => {
            // Re-fetch on any change (INSERT, UPDATE, DELETE)
            fetchAnnouncements()
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('LiveTicker: failed to subscribe to realtime channel', err)
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Hide when popup is open (use lightweight global flag + events)
  useEffect(() => {
    const handlePopupOpened = () => {
      if (!isPopupOpen) setIsPopupOpen(true)
    }
    const handlePopupClosed = () => {
      if (isPopupOpen) setIsPopupOpen(false)
    }

    window.addEventListener('katar_popup_opened', handlePopupOpened)
    window.addEventListener('katar_popup_closed', handlePopupClosed)

    // Initial state: prefer global flag if present, fallback to false
    try {
      const initial = Boolean(window.__katar_popup_open)
      setIsPopupOpen(initial)
    } catch (e) {
      setIsPopupOpen(false)
    }

    return () => {
      window.removeEventListener('katar_popup_opened', handlePopupOpened)
      window.removeEventListener('katar_popup_closed', handlePopupClosed)
    }
  }, [isPopupOpen])

  const tickerText = useMemo(() => {
    if (!announcements.length) return ''

    // Repeat until reasonable length for marquee; lower threshold for performance
    const sep = '   ●   '
    let repeatedAnnouncements = announcements.slice()
    let joined = repeatedAnnouncements.join(sep)
    const minLen = 120
    while (joined.length < minLen) {
      repeatedAnnouncements = repeatedAnnouncements.concat(announcements)
      joined = repeatedAnnouncements.join(sep)
      // safety: avoid infinite loop
      if (repeatedAnnouncements.length > 50) break
    }

    return joined
  }, [announcements])

  // Don't render until we have announcements, or if a popup is open
  if (!announcements.length || isPopupOpen) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-merah-700 text-white py-2 overflow-hidden shadow-lg border-t border-white/10" role="marquee" aria-live="polite">
      <div className="ticker-container flex items-center">
        {/* Static icon */}
        <span className="flex-shrink-0 pl-4 pr-2 flex items-center justify-center z-10 bg-merah-700" aria-hidden="true">
          <Icon icon="solar:bullhorn-bold-duotone" className="w-5 h-5 text-white" />
        </span>

        {/* Scrolling content — two copies for seamless looping */}
        <div className="ticker-content flex items-center whitespace-nowrap text-sm font-medium">
          <div className="flex shrink-0 items-center">
            <span>{tickerText}</span>
            <span className="mx-10 text-white/50">●</span>
          </div>
          <div className="flex shrink-0 items-center">
            <span>{tickerText}</span>
            <span className="mx-10 text-white/50">●</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(LiveTicker)
