import { useEffect, useState } from 'react'
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


export default function LiveTicker() {
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
    const channel = supabase
      .channel('announcements-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          // Re-fetch on any change (INSERT, UPDATE, DELETE)
          fetchAnnouncements()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Hide when popup is open ──────────────────────────────
  useEffect(() => {
    const checkPopups = () => {
      // Find any element that uses fixed inset-0 (standard pattern for popups/modals in this app)
      const popups = document.querySelectorAll('.fixed.inset-0')
      setIsPopupOpen(popups.length > 0)
    }

    // Initial check
    checkPopups()

    // Observe body for changes in DOM to detect modal open/close
    const observer = new MutationObserver(checkPopups)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  // Don't render until we have announcements, or if a popup is open
  if (!announcements.length || isPopupOpen) return null

  // Build ticker string — repeat if it's too short to prevent jumpy loop on wide screens
  let repeatedAnnouncements = [...announcements]
  if (repeatedAnnouncements.length > 0) {
    while (repeatedAnnouncements.join('   ●   ').length < 200) {
      repeatedAnnouncements = [...repeatedAnnouncements, ...announcements]
    }
  }
  const tickerText = repeatedAnnouncements.join('   ●   ')

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
