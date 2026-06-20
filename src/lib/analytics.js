// src/lib/analytics.js
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Generate a simple UUID-like string for visitor identification
 */
const generateUUID = () => {
  return 'visitor-xx4xx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Record a page view/session start for the visitor
 */
export const recordPageView = async () => {
  // One-time cleanup of old mock/seeded visitor data in localStorage
  if (!localStorage.getItem('katar_local_visits_cleared_v1')) {
    localStorage.removeItem('katar_local_visits')
    localStorage.setItem('katar_local_visits_cleared_v1', 'true')
  }

  // 1. Get or create visitor ID
  let visitorId = localStorage.getItem('katar_visitor_id')
  if (!visitorId) {
    visitorId = generateUUID()
    localStorage.setItem('katar_visitor_id', visitorId)
  }

  // 2. Check if logged in this session to prevent duplicate logs on route clicks
  const visitLogged = sessionStorage.getItem('katar_visit_logged')
  if (visitLogged === 'true') {
    return
  }

  // Set session flag immediately
  sessionStorage.setItem('katar_visit_logged', 'true')

  // 3. Record visit in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('page_views').insert({ visitor_id: visitorId })
    } catch (err) {
      console.warn('Analytics: Failed to log view to Supabase', err)
    }
  }

  // 4. Always log to localStorage as fallback/mirror
  try {
    const localVisits = JSON.parse(localStorage.getItem('katar_local_visits') || '[]')
    localVisits.push({
      visitor_id: visitorId,
      created_at: new Date().toISOString()
    })
    localStorage.setItem('katar_local_visits', JSON.stringify(localVisits))
  } catch (err) {
    console.warn('Analytics: Failed to log view to localStorage', err)
  }
}
