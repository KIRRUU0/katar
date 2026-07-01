import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'

// Import components
import LoginForm from '../components/admin/LoginForm'
import FormBuatLomba from '../components/admin/FormBuatLomba'
import FormInputPeserta from '../components/admin/FormInputPeserta'
import FormKunciPemenang from '../components/admin/FormKunciPemenang'
import FormKelolaBerita from '../components/admin/FormKelolaBerita'
import FormKelolaMedia from '../components/admin/FormKelolaMedia'
import FormDaftarLomba from '../components/admin/FormDaftarLomba'
import FormKelolaOrganisasi from '../components/admin/FormKelolaOrganisasi'
import FormKelolaTicker from '../components/admin/FormKelolaTicker'
import FormKelolaBanner from '../components/admin/FormKelolaBanner'
import FormEditKategori from '../components/admin/FormEditKategori'


import { DEMO_TOURNAMENTS, syncAllExistingNewsImages } from '../components/admin/adminUtils'

const viewsToDailyVisits = (visits) => {
  if (!visits || !Array.isArray(visits)) return []
  const groups = {}
  visits.forEach(v => {
    try {
      const d = new Date(v.created_at || v.date)
      const dateStr = d.toISOString().split('T')[0]
      if (!groups[dateStr]) {
        groups[dateStr] = { visit_date: dateStr, unique_visitors: new Set(), total_views: 0 }
      }
      groups[dateStr].unique_visitors.add(v.visitor_id)
      groups[dateStr].total_views += 1
    } catch { /* ignore */ }
  })
  return Object.values(groups).map(g => ({
    visit_date: g.visit_date,
    unique_visitors: g.unique_visitors.size,
    total_views: g.total_views
  })).sort((a, b) => a.visit_date.localeCompare(b.visit_date))
}

const calculateVisitorStats = (visits, dailyAnalytics) => {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 1. Weekly unique visitors (from raw 30-day visits)
  const weekly = !visits || !Array.isArray(visits) ? 0 : new Set(
    visits
      .filter(v => new Date(v.created_at || v.date) >= sevenDaysAgo)
      .map(v => v.visitor_id)
  ).size

  // 2. Monthly unique visitors (from raw 30-day visits)
  const monthly = !visits || !Array.isArray(visits) ? 0 : new Set(
    visits
      .filter(v => new Date(v.created_at || v.date) >= thirtyDaysAgo)
      .map(v => v.visitor_id)
  ).size

  // 3. Yearly unique visitors: sum of daily unique_visitors in dailyAnalytics for the last 365 days
  let yearly = 0
  if (dailyAnalytics && Array.isArray(dailyAnalytics)) {
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    
    yearly = dailyAnalytics
      .filter(d => new Date(d.visit_date) >= oneYearAgo)
      .reduce((sum, d) => sum + (d.unique_visitors || 0), 0)
  }

  return { weekly, monthly, yearly }
}

const seedDemoParticipantData = () => {
  if (isSupabaseConfigured()) return;

  // 1. Seed Tournaments
  const currentTourneys = localStorage.getItem('katar_tournaments')
  let needSeed = false
  if (!currentTourneys || currentTourneys === '[]') {
    needSeed = true
  } else {
    try {
      const parsed = JSON.parse(currentTourneys)
      if (parsed.length === 0) needSeed = true
    } catch {
      needSeed = true
    }
  }

  // If empty or only default empty arrays, seed them
  if (needSeed) {
    const mockTourneys = [
      { id: 't-futsal-2026', name: 'Lomba Futsal RT 02', status: 'berjalan', year: 2026, created_at: new Date().toISOString() }, // Today
      { id: 't-catur-2026', name: 'Lomba Catur Warga', status: 'berjalan', year: 2026, created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() }, // This week
      { id: 't-karung-2026', name: 'Lomba Balap Karung Anak', status: 'berjalan', year: 2026, created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString() }, // This month
      { id: 't-tumpeng-2026', name: 'Lomba Menghias Tumpeng', status: 'berjalan', year: 2026, created_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString() }, // This year
      { id: 't-tarik-2026', name: 'Lomba Tarik Tambang', status: 'berjalan', year: 2026, created_at: new Date(Date.now() - 50 * 24 * 3600 * 1000).toISOString() }, // This year
      { id: 't-karaoke-2025', name: 'Lomba Karaoke Iremda', status: 'selesai', year: 2025, created_at: new Date('2025-08-15T10:00:00Z').toISOString() }, // Last year
      { id: 't-mewarnai-2025', name: 'Lomba Mewarnai Balita', status: 'selesai', year: 2025, created_at: new Date('2025-08-16T10:00:00Z').toISOString() }, // Last year
      { id: 't-gaple-2024', name: 'Lomba Gaple Bapak-Bapak', status: 'selesai', year: 2024, created_at: new Date('2024-08-15T10:00:00Z').toISOString() } // 2 years ago
    ]
    localStorage.setItem('katar_tournaments', JSON.stringify(mockTourneys))
  }

  // 2. Seed Participants (Individu)
  const currentParts = localStorage.getItem('katar_participants')
  if (!currentParts || currentParts === '[]') {
    const mockParts = []
    
    // Add individual participants to t-catur-2026 (18 participants) - this week
    for (let i = 1; i <= 18; i++) {
      mockParts.push({ 
        id: `p-catur-${i}`, 
        name: `Warga Catur ${i}`, 
        tournament_id: 't-catur-2026', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 4))}`,
        created_at: new Date(Date.now() - (i % 6) * 24 * 3600 * 1000).toISOString() // last 6 days
      })
    }
    // Add individual participants to t-karung-2026 (28 participants) - this month
    for (let i = 1; i <= 28; i++) {
      mockParts.push({ 
        id: `p-karung-${i}`, 
        name: `Anak Karung ${i}`, 
        tournament_id: 't-karung-2026', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 3))}`,
        created_at: new Date(Date.now() - (i % 25) * 24 * 3600 * 1000).toISOString() // last 25 days
      })
    }
    // Add individual participants to t-karaoke-2025 (15 participants) - last year
    for (let i = 1; i <= 15; i++) {
      mockParts.push({ 
        id: `p-karaoke-${i}`, 
        name: `Penyanyi ${i}`, 
        tournament_id: 't-karaoke-2025', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 2))}`,
        created_at: new Date('2025-08-18T10:00:00Z').toISOString()
      })
    }
    // Add individual participants to t-mewarnai-2025 (22 participants) - last year
    for (let i = 1; i <= 22; i++) {
      mockParts.push({ 
        id: `p-mewarnai-${i}`, 
        name: `Balita ${i}`, 
        tournament_id: 't-mewarnai-2025', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 4))}`,
        created_at: new Date('2025-08-19T10:00:00Z').toISOString()
      })
    }

    localStorage.setItem('katar_participants', JSON.stringify(mockParts))
  }

  // 3. Seed Teams (Grup)
  const currentTeams = localStorage.getItem('katar_teams')
  if (!currentTeams || currentTeams === '[]') {
    const mockTeams = []

    // Add teams to t-futsal-2026 (12 teams) - today/yesterday
    for (let i = 1; i <= 12; i++) {
      mockTeams.push({ 
        id: `team-futsal-${i}`, 
        name: `FC Blok ${String.fromCharCode(65 + (i % 4))} - Team ${i}`, 
        tournament_id: 't-futsal-2026', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 4))}`,
        created_at: new Date(Date.now() - (i % 2) * 24 * 3600 * 1000).toISOString()
      })
    }
    // Add teams to t-tumpeng-2026 (10 teams) - this month
    for (let i = 1; i <= 10; i++) {
      mockTeams.push({ 
        id: `team-tumpeng-${i}`, 
        name: `Ibu Cantik ${i}`, 
        tournament_id: 't-tumpeng-2026', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 3))}`,
        created_at: new Date(Date.now() - (i % 15) * 24 * 3600 * 1000).toISOString()
      })
    }
    // Add teams to t-tarik-2026 (8 teams) - this year
    for (let i = 1; i <= 8; i++) {
      mockTeams.push({ 
        id: `team-tarik-${i}`, 
        name: `Kuat Perkasa ${i}`, 
        tournament_id: 't-tarik-2026', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 2))}`,
        created_at: new Date(Date.now() - (i % 30) * 24 * 3600 * 1000).toISOString()
      })
    }
    // Add teams to t-gaple-2024 (16 teams) - 2 years ago
    for (let i = 1; i <= 16; i++) {
      mockTeams.push({ 
        id: `team-gaple-${i}`, 
        name: `Pasangan Gaple ${i}`, 
        tournament_id: 't-gaple-2024', 
        origin_block: `Blok ${String.fromCharCode(65 + (i % 3))}`,
        created_at: new Date('2024-08-16T10:00:00Z').toISOString()
      })
    }

    localStorage.setItem('katar_teams', JSON.stringify(mockTeams))
  }

  // 4. Seed registrations for demo validation
  const currentRegs = localStorage.getItem('katar_registrations')
  if (!currentRegs || currentRegs === '[]') {
    const mockRegs = []
    
    // Seed 50 registrations with varying ages
    for (let i = 1; i <= 50; i++) {
      const age = 5 + (i * 7) % 60
      mockRegs.push({ 
        id: `reg-${i}`, 
        age, 
        tournament_id: i % 2 === 0 ? 't-catur-2026' : 't-karung-2026',
        created_at: new Date(Date.now() - (i % 35) * 24 * 3600 * 1000).toISOString()
      })
    }
    localStorage.setItem('katar_registrations', JSON.stringify(mockRegs))
  }

  // 5. Seed Popup Banners
  const currentBanners = localStorage.getItem('katar_popup_banners')
  if (!currentBanners || currentBanners === '[]') {
    const mockBanners = [
      {
        id: 'mock-banner-1',
        image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
        ratio: 'horizontal',
        link_url: '/league',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]
    localStorage.setItem('katar_popup_banners', JSON.stringify(mockBanners))
  }
}

const calculateParticipantAnalytics = (participants, teams, registrations, tournaments) => {
  const tournamentMap = {}
  const yearlyStatsMap = {}

  // Initialize tournamentMap with all tournaments
  if (Array.isArray(tournaments)) {
    tournaments.forEach(t => {
      tournamentMap[t.id] = { label: t.name, count: 0 }
      
      // Initialize yearlyStatsMap
      const year = t.year || t.years?.year_number || 2026
      if (!yearlyStatsMap[year]) {
        yearlyStatsMap[year] = { tournaments: 0, participants: 0 }
      }
      yearlyStatsMap[year].tournaments++
    })
  }

  // 1. Process individual participants
  if (Array.isArray(participants)) {
    participants.forEach(p => {
      const tourney = tournaments.find(t => t.id === p.tournament_id)
      const year = tourney ? (tourney.year || tourney.years?.year_number || 2026) : 2026
      
      if (!yearlyStatsMap[year]) {
        yearlyStatsMap[year] = { tournaments: 0, participants: 0 }
      }
      yearlyStatsMap[year].participants++

      if (tournamentMap[p.tournament_id]) {
        tournamentMap[p.tournament_id].count += 1
      }
    })
  }

  // 2. Process teams
  if (Array.isArray(teams)) {
    teams.forEach(t => {
      const tourney = tournaments.find(tourneyItem => tourneyItem.id === t.tournament_id)
      const year = tourney ? (tourney.year || tourney.years?.year_number || 2026) : 2026
      
      if (!yearlyStatsMap[year]) {
        yearlyStatsMap[year] = { tournaments: 0, participants: 0 }
      }
      yearlyStatsMap[year].participants++

      if (tournamentMap[t.tournament_id]) {
        tournamentMap[t.tournament_id].count += 1
      }
    })
  }

  const popularTournaments = Object.values(tournamentMap)
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Convert to sorted array of years (ascending, e.g. 2024, 2025, 2026)
  const yearlyStats = Object.keys(yearlyStatsMap).map(year => ({
    year: Number(year),
    label: `Tahun ${year}`,
    tournaments: yearlyStatsMap[year].tournaments,
    participants: yearlyStatsMap[year].participants
  })).sort((a, b) => a.year - b.year)

  return {
    popularTournaments,
    yearlyStats
  }
}

const calculateVisitorTrends = (dailyVisits, interval) => {
  if (!dailyVisits || !Array.isArray(dailyVisits)) return []

  const trends = []
  const now = new Date()

  if (interval === 'daily') {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayData = dailyVisits.find(v => v.visit_date === dateStr)
      const count = dayData ? dayData.unique_visitors : 0
      const label = d.toLocaleString('id-ID', { day: 'numeric', month: 'short' })
      trends.push({ label, count })
    }
  } else if (interval === 'weekly') {
    // Last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const startOfWeek = new Date()
      // Go i weeks back, set to beginning of that week (Sunday)
      startOfWeek.setDate(now.getDate() - (i * 7) - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const count = dailyVisits
        .filter(v => {
          const vd = new Date(v.visit_date)
          return vd >= startOfWeek && vd <= endOfWeek
        })
        .reduce((sum, v) => sum + (v.unique_visitors || 0), 0)

      trends.push({ label: `Min ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`, count })
    }
  } else if (interval === 'monthly') {
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(now.getMonth() - i)
      const monthIndex = d.getMonth()
      const year = d.getFullYear()

      const monthStart = new Date(year, monthIndex, 1)
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)

      const count = dailyVisits
        .filter(v => {
          const vd = new Date(v.visit_date)
          return vd >= monthStart && vd <= monthEnd
        })
        .reduce((sum, v) => sum + (v.unique_visitors || 0), 0)

      const monthName = d.toLocaleString('id-ID', { month: 'short' })
      trends.push({ label: `${monthName} ${year}`, count })
    }
  } else if (interval === 'yearly') {
    // Last 5 years
    const currentYear = now.getFullYear()
    for (let i = 4; i >= 0; i--) {
      const targetYear = currentYear - i
      const yearStart = new Date(targetYear, 0, 1)
      const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59)

      const count = dailyVisits
        .filter(v => {
          const vd = new Date(v.visit_date)
          return vd >= yearStart && vd <= yearEnd
        })
        .reduce((sum, v) => sum + (v.unique_visitors || 0), 0)

      trends.push({ label: `${targetYear}`, count })
    }
  } else if (interval === 'alltime') {
    // Group all historical visits by month
    if (dailyVisits.length === 0) return []

    const earliestDate = new Date(dailyVisits[0].visit_date)
    
    let current = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)
    while (current <= now) {
      const monthIndex = current.getMonth()
      const year = current.getFullYear()

      const monthStart = new Date(year, monthIndex, 1)
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)

      const count = dailyVisits
        .filter(v => {
          const vd = new Date(v.visit_date)
          return vd >= monthStart && vd <= monthEnd
        })
        .reduce((sum, v) => sum + (v.unique_visitors || 0), 0)

      const monthName = current.toLocaleString('id-ID', { month: 'short' })
      trends.push({ label: `${monthName} ${year}`, count })

      current.setMonth(current.getMonth() + 1)
    }

    if (trends.length > 12) {
      return trends.slice(-12)
    }
  }

  return trends
}

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loggingOut, setLoggingOut] = useState(false)
  
  // Dashboard tab state
  const [activeTab, setActiveTab] = useState('overview')
  const [hoveredPointIdx, setHoveredPointIdx] = useState(null)
  const [visitorTrendInterval, setVisitorTrendInterval] = useState('monthly')
  const tabsContainerRef = useRef(null)

  // Scroll active tab into view when selected
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [activeTab])

  // Dashboard summary stats state
  const [stats, setStats] = useState({
    activeTournamentsCount: 0,
    totalParticipantsCount: 0,
    totalNewsCount: 0,
    totalMediaCount: 0,
    activeTournamentsList: [],
    visitorStats: { weekly: 0, monthly: 0, yearly: 0 },
    rawVisits: [],
    dailyVisits: [],
    participantAnalytics: { popularTournaments: [], yearlyDistribution: [] }
  })
  const [fetchingData, setFetchingData] = useState(true)

  /**
   * Fetch active tournaments (status != 'selesai')
   * Used by both participant input and winner forms.
   */
  const fetchTournaments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      seedDemoParticipantData()
      const localTourneys = localStorage.getItem('katar_tournaments')
      if (localTourneys) {
        setTournaments(JSON.parse(localTourneys))
      } else {
        setTournaments(DEMO_TOURNAMENTS)
        localStorage.setItem('katar_tournaments', JSON.stringify(DEMO_TOURNAMENTS))
      }
      return
    }
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, years(year_number)')
      if (error) throw error

      const mapped = (data || []).map(t => ({
        ...t,
        year: t.years?.year_number || 2026
      })).sort((a, b) => b.year - a.year)

      setTournaments(mapped)
    } catch (err) {
      console.error('fetchTournaments error, using demo fallback:', err)
      setTournaments(DEMO_TOURNAMENTS)
    }
  }, [])

  /**
   * Fetch summary statistics for dashboard Overview tab
   */
  const fetchDashboardStats = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        // 1. Tournaments
        const { data: tourneys, error: tErr } = await supabase
          .from('tournaments')
          .select('id, name, type, category, status, created_at, years(year_number)')
        if (tErr) throw tErr

        const mappedTourneys = (tourneys || []).map(t => ({
          ...t,
          year: t.years?.year_number || 2026
        }))

        const activeT = mappedTourneys.filter(t => t.status !== 'selesai')

        // 2. Participants
        const { count: participantsCount, error: pErr } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
        if (pErr) throw pErr

        // 3. News
        const { count: newsCount, error: nErr } = await supabase
          .from('news')
          .select('*', { count: 'exact', head: true })
        if (nErr) throw nErr

        // 4. Media
        const { count: mediaCount, error: mErr } = await supabase
          .from('media')
          .select('*', { count: 'exact', head: true })
        if (mErr) throw mErr

        // 5. Page views (last 30 days)
        let rawViews = []
        try {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const { data: vData, error: vErr } = await supabase
            .from('page_views')
            .select('visitor_id, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
          if (!vErr && vData) {
            rawViews = vData
          }
        } catch (vErr) {
          console.warn('Failed to fetch page views:', vErr)
        }

        // 6. Daily analytics (all time)
        let dailyVisits = []
        try {
          const { data: dData, error: dErr } = await supabase
            .from('daily_analytics')
            .select('visit_date, unique_visitors, total_views')
            .order('visit_date', { ascending: true })
          if (!dErr && dData) {
            dailyVisits = dData
          }
        } catch (dErr) {
          console.warn('Failed to fetch daily analytics:', dErr)
        }

        // Fetch rows for participant analytics
        let allParticipants = []
        let allTeams = []
        let allRegistrations = []

        try {
          const { data: pData } = await supabase.from('participants').select('id, tournament_id, origin_block, created_at')
          allParticipants = pData || []

          const { data: tData } = await supabase.from('teams').select('id, tournament_id, origin_block, created_at')
          allTeams = tData || []

          const { data: rData } = await supabase.from('registrations').select('id, age, tournament_id, created_at')
          allRegistrations = rData || []
        } catch (err) {
          console.warn('Failed to fetch participant analytics rows:', err)
        }

        setStats({
          activeTournamentsCount: activeT.length,
          totalParticipantsCount: (allParticipants.length + allTeams.length) || participantsCount || 0,
          totalNewsCount: newsCount || 0,
          totalMediaCount: mediaCount || 0,
          activeTournamentsList: activeT.slice(0, 3),
          visitorStats: calculateVisitorStats(rawViews, dailyVisits),
          rawVisits: rawViews,
          dailyVisits: dailyVisits,
          participantAnalytics: calculateParticipantAnalytics(allParticipants, allTeams, allRegistrations, mappedTourneys)
        })
      } else {
        // Demo fallback
        seedDemoParticipantData()
        const localParts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
        const localNews = JSON.parse(localStorage.getItem('katar_news_articles') || '[]')
        const localMedia = JSON.parse(localStorage.getItem('katar_media_photos') || '[]')
        
        let localTourneys = JSON.parse(localStorage.getItem('katar_tournaments') || '[]')
        if (localTourneys.length === 0) {
          localTourneys = DEMO_TOURNAMENTS
        }
        
        const activeT = localTourneys.filter(t => t.status !== 'selesai')
        const allNewsCount = localNews.length || 4
        const allMediaCount = localMedia.length || 6

        // Load local visits
        let views = []
        const localData = localStorage.getItem('katar_local_visits')
        if (localData) {
          try {
            views = JSON.parse(localData)
          } catch {
            views = []
          }
        }

        // Load local teams and registrations for stats fallback
        const localTeams = JSON.parse(localStorage.getItem('katar_teams') || '[]')
        const localRegs = JSON.parse(localStorage.getItem('katar_registrations') || '[]')

        const demoDailyVisits = viewsToDailyVisits(views)
        setStats({
          activeTournamentsCount: activeT.length,
          totalParticipantsCount: localParts.length + localTeams.length,
          totalNewsCount: allNewsCount,
          totalMediaCount: allMediaCount,
          activeTournamentsList: activeT.slice(0, 3),
          visitorStats: calculateVisitorStats(views, demoDailyVisits),
          rawVisits: views,
          dailyVisits: demoDailyVisits,
          participantAnalytics: calculateParticipantAnalytics(localParts, localTeams, localRegs, localTourneys)
        })
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      // no-op
    }
  }, [])

  // Fetch tournaments and stats when user is authenticated
  useEffect(() => {
    if (user && fetchingData) {
      const timer = setTimeout(async () => {
        await fetchTournaments()
        await fetchDashboardStats()
        // Run background one-time sync of news images to media table
        await syncAllExistingNewsImages()
        // Re-fetch stats after sync completes to update counts
        await fetchDashboardStats()
        setFetchingData(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [user, fetchTournaments, fetchDashboardStats, fetchingData])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
    } catch {
      // Swallow — AuthContext handles state
    } finally {
      setLoggingOut(false)
    }
  }

  const handleTournamentAdded = () => {
    fetchTournaments()
    fetchDashboardStats()
  }

  const handleTournamentUpdated = () => {
    fetchTournaments()
    fetchDashboardStats()
  }

  const handleMediaAdded = () => {
    fetchDashboardStats()
  }

  // ── Auth loading state ──
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-merah-500 mx-auto" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-abu-500 text-sm">Memeriksa autentikasi...</p>
        </div>
      </div>
    )
  }

  // ── Login gate ──
  if (!user) return <LoginForm />

  // ── Authenticated dashboard ──
  return (
    <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 py-8">
      {/* Dashboard header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-abu-900">
            Dashboard Admin
          </h1>
          <p className="text-sm text-abu-500 mt-1 flex items-center gap-1.5 font-medium">
            <Icon icon="solar:user-circle-bold-duotone" className="w-4 h-4 text-merah-600" />
            {user.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn btn-secondary min-h-[44px] self-start sm:self-auto disabled:opacity-60 cursor-pointer"
        >
          {loggingOut ? 'Keluar...' : 'Logout'}
        </button>
      </div>

      {/* Not-configured banner */}
      {!isSupabaseConfigured() && (
        <div className="bg-emas-light/50 border border-emas rounded-xl px-4 py-3 mb-6 text-sm text-abu-700 flex items-center gap-2">
          <Icon icon="solar:info-circle-bold-duotone" className="w-5 h-5 text-emas flex-shrink-0" />
          <span><strong>Mode Demo</strong> — Supabase belum dikonfigurasi. Data tidak akan tersimpan ke database.</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div 
        ref={tabsContainerRef}
        className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-row lg:flex-nowrap lg:justify-start gap-2 p-1.5 bg-abu-150 border border-abu-200/45 rounded-2xl mb-8 overflow-x-auto scrollbar-none shadow-sm"
      >
        {[
          { id: 'overview', label: 'Ringkasan', icon: 'solar:chart-square-bold-duotone' },
          { id: 'tournaments', label: 'Kelola Lomba', icon: 'solar:cup-bold-duotone' },
          { id: 'participants', label: 'Input Peserta', icon: 'solar:user-plus-bold-duotone' },
          { id: 'news-media', label: 'Berita & Media', icon: 'solar:gallery-bold-duotone' },
          { id: 'organization', label: 'Kelola Organisasi', icon: 'solar:users-group-rounded-bold-duotone' },
          { id: 'announcements', label: 'Ticker Pengumuman', icon: 'solar:bullhorn-bold-duotone' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-active={activeTab === tab.id}
            className={`w-full lg:w-auto min-h-[42px] px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm font-semibold transition-all duration-300 cursor-pointer focus-ring whitespace-nowrap lg:flex-none border
              ${activeTab === tab.id
                ? 'bg-white text-merah-700 shadow-sm border-abu-200/60 scale-[1.01]'
                : 'text-abu-600 hover:text-abu-900 hover:bg-white/50 border-transparent'
              }`}
          >
            <Icon icon={tab.icon} className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {activeTab === 'overview' && (() => {
          const trends = calculateVisitorTrends(stats.dailyVisits || [], visitorTrendInterval)
          const maxVal = Math.max(...trends.map(t => t.count), 1)
          // unused analytics variables removed

          // Generate SVG coordinates
          const svgWidth = 500
          const svgHeight = 220
          const paddingLeft = 40
          const paddingRight = 20
          const paddingTop = 25
          const paddingBottom = 35

          const chartWidth = svgWidth - paddingLeft - paddingRight
          const chartHeight = svgHeight - paddingTop - paddingBottom

          const points = trends.map((t, idx) => {
            const x = trends.length > 1
              ? paddingLeft + (idx / (trends.length - 1)) * chartWidth
              : paddingLeft + chartWidth / 2
            const y = paddingTop + chartHeight - (t.count / maxVal) * chartHeight
            return { x, y, label: t.label, count: t.count }
          })

          const linePath = points.length > 0 
            ? points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
            : ''

          const areaPath = points.length > 0
            ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
            : ''

          return (
            <div className="space-y-6">
              {/* Top Row: Stats (Left) & Visitor Analytics (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Stacked Stats Cards (Grid on mobile/tablet, single vertical column on desktop) */}
                <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {/* Card 1: Lomba Aktif */}
                  <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-abu-300 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between text-abu-500 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Lomba Aktif</span>
                      <div className="p-1.5 rounded-lg bg-merah-50">
                        <Icon icon="solar:cup-bold" className="w-5 h-5 text-merah-500" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-heading font-black text-abu-900 leading-tight">
                        {stats.activeTournamentsCount}
                      </div>
                      <p className="text-[11px] text-abu-400 mt-1">Belum/sedang berjalan</p>
                    </div>
                  </div>

                  {/* Card 2: Peserta Lomba */}
                  <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-abu-300 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between text-abu-500 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Peserta Lomba</span>
                      <div className="p-1.5 rounded-lg bg-blue-50">
                        <Icon icon="solar:users-group-two-rounded-bold" className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-heading font-black text-abu-900 leading-tight">
                        {stats.totalParticipantsCount}
                      </div>
                      <p className="text-[11px] text-abu-400 mt-1">Total peserta aktif</p>
                    </div>
                  </div>

                  {/* Card 3: Berita */}
                  <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-abu-300 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between text-abu-500 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Berita</span>
                      <div className="p-1.5 rounded-lg bg-emerald-50">
                        <Icon icon="solar:document-bold" className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-heading font-black text-abu-900 leading-tight">
                        {stats.totalNewsCount}
                      </div>
                      <p className="text-[11px] text-abu-400 mt-1">Artikel di home page</p>
                    </div>
                  </div>

                  {/* Card 4: Galeri Foto */}
                  <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-abu-300 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between text-abu-500 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Galeri Foto</span>
                      <div className="p-1.5 rounded-lg bg-amber-50">
                        <Icon icon="solar:gallery-bold" className="w-5 h-5 text-amber-500" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-heading font-black text-abu-900 leading-tight">
                        {stats.totalMediaCount}
                      </div>
                      <p className="text-[11px] text-abu-400 mt-1">Foto kegiatan warga</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Analisis Pengunjung Website */}
                <div className="lg:col-span-3 bg-white border border-abu-200 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-md space-y-6 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-abu-100 pb-3">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-abu-900 flex items-center gap-2">
                        <Icon icon="solar:chart-square-bold-duotone" className="w-6 h-6 text-merah-500" />
                        Analisis Pengunjung Website
                      </h3>
                      <p className="text-xs text-abu-400 mt-0.5">Statistik jumlah pengunjung unik per minggu, bulan, dan tahun</p>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 self-start sm:self-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Real-time Active
                    </div>
                  </div>

                  {/* Visitor Stats Cards */}
                  <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-abu-50/50 border border-abu-150 p-4 rounded-xl flex flex-col justify-between transition-all duration-300 hover:bg-abu-50/80">
                      <span className="text-[10px] font-bold text-abu-500 uppercase tracking-wider">Per Minggu</span>
                      <div className="mt-1.5">
                        <div className="text-xl md:text-3xl font-heading font-black text-abu-950 leading-tight">
                          {stats.visitorStats?.weekly || 0}
                        </div>
                        <span className="text-[9px] text-abu-400">Pengunjung Weekly</span>
                      </div>
                    </div>

                    <div className="bg-abu-50/50 border border-abu-150 p-4 rounded-xl flex flex-col justify-between transition-all duration-300 hover:bg-abu-50/80">
                      <span className="text-[10px] font-bold text-abu-500 uppercase tracking-wider">Per Bulan</span>
                      <div className="mt-1.5">
                        <div className="text-xl md:text-3xl font-heading font-black text-abu-950 leading-tight">
                          {stats.visitorStats?.monthly || 0}
                        </div>
                        <span className="text-[9px] text-abu-400">Pengunjung Monthly</span>
                      </div>
                    </div>

                    <div className="bg-abu-50/50 border border-abu-150 p-4 rounded-xl flex flex-col justify-between transition-all duration-300 hover:bg-abu-50/80">
                      <span className="text-[10px] font-bold text-abu-500 uppercase tracking-wider">Per Tahun</span>
                      <div className="mt-1.5">
                        <div className="text-xl md:text-3xl font-heading font-black text-abu-950 leading-tight">
                          {stats.visitorStats?.yearly || 0}
                        </div>
                        <span className="text-[9px] text-abu-400">Pengunjung Yearly</span>
                      </div>
                    </div>
                  </div>

                  {/* Custom SVG Line Chart */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h4 className="text-xs font-bold text-abu-500 uppercase tracking-wider">
                        {visitorTrendInterval === 'daily' && 'Tren Harian (7 Hari Terakhir)'}
                        {visitorTrendInterval === 'weekly' && 'Tren Mingguan (8 Minggu Terakhir)'}
                        {visitorTrendInterval === 'monthly' && 'Tren Bulanan (6 Bulan Terakhir)'}
                        {visitorTrendInterval === 'yearly' && 'Tren Tahun (5 Tahun Terakhir)'}
                        {visitorTrendInterval === 'alltime' && 'Tren Alltime (Histori Pengunjung)'}
                      </h4>
                      
                      {/* Interval selector buttons */}
                      <div className="flex flex-wrap gap-1 p-1 bg-abu-100/80 rounded-xl self-start sm:self-center">
                        {[
                          { id: 'daily', label: 'Harian' },
                          { id: 'weekly', label: 'Mingguan' },
                          { id: 'monthly', label: 'Bulanan' },
                          { id: 'yearly', label: 'Tahun' },
                          { id: 'alltime', label: 'Alltime' }
                        ].map(item => (
                          <button
                            key={item.id}
                            onClick={() => setVisitorTrendInterval(item.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-all duration-200 cursor-pointer ${
                              visitorTrendInterval === item.id 
                                ? 'bg-white text-merah-700 shadow-sm' 
                                : 'text-abu-600 hover:text-abu-900 hover:bg-white/40'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {trends && trends.length > 0 ? (
                      <div className="w-full bg-abu-50/50 border border-abu-150 p-4 rounded-xl">
                        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                          <defs>
                            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#DC2626" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const y = paddingTop + chartHeight * ratio
                            const val = Math.round(maxVal * (1 - ratio))
                            return (
                              <g key={idx}>
                                <line 
                                  x1={paddingLeft} 
                                  y1={y} 
                                  x2={svgWidth - paddingRight} 
                                  y2={y} 
                                  stroke="#E5E7EB" 
                                  strokeDasharray="4 4" 
                                />
                                <text 
                                  x={paddingLeft - 8} 
                                  y={y + 4} 
                                  textAnchor="end" 
                                  className="text-[9px] font-bold fill-abu-400"
                                >
                                  {val}
                                </text>
                              </g>
                            )
                          })}

                          {/* Area Under the Line */}
                          {areaPath && (
                            <path d={areaPath} fill="url(#chart-gradient)" />
                          )}
                          
                          {/* Stroke Line */}
                          {linePath && (
                            <path 
                              d={linePath} 
                              fill="none" 
                              stroke="#DC2626" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          )}

                          {/* Hover Guide Line */}
                          {hoveredPointIdx !== null && points[hoveredPointIdx] && (
                            <line
                              x1={points[hoveredPointIdx].x}
                              y1={paddingTop}
                              x2={points[hoveredPointIdx].x}
                              y2={paddingTop + chartHeight}
                              stroke="#DC2626"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                              opacity="0.65"
                            />
                          )}

                          {/* Dots and Labels */}
                          {points.map((p, idx) => {
                            const isHovered = hoveredPointIdx === idx
                            return (
                              <g 
                                key={idx}
                                onMouseEnter={() => setHoveredPointIdx(idx)}
                                onMouseLeave={() => setHoveredPointIdx(null)}
                                className="group cursor-pointer"
                              >
                                {/* Invisible hover helper for dot */}
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r="18" 
                                  fill="transparent" 
                                />
                                {/* Outer glow on hover */}
                                {isHovered && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="10"
                                    fill="#DC2626"
                                    fillOpacity="0.15"
                                    className="animate-pulse"
                                  />
                                )}
                                {/* Actual dot */}
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r={isHovered ? 6 : 4.5} 
                                  fill="#FFFFFF" 
                                  stroke="#DC2626" 
                                  strokeWidth={isHovered ? 3.5 : 2.5} 
                                  className="transition-all duration-200"
                                />
                                {/* X-axis label */}
                                <text 
                                  x={p.x} 
                                  y={svgHeight - 12} 
                                  textAnchor="middle" 
                                  className={`text-[9px] transition-all duration-200 ${
                                    isHovered ? 'font-black fill-merah-700' : 'font-bold fill-abu-500'
                                  }`}
                                >
                                  {p.label}
                                </text>
                              </g>
                            )
                          })}

                          {/* Interactive Tooltip Card */}
                          {hoveredPointIdx !== null && points[hoveredPointIdx] && (() => {
                            const hp = points[hoveredPointIdx]
                            const tooltipWidth = 110
                            const tooltipHeight = 38
                            const rx = hp.x - tooltipWidth / 2
                            
                            // Check if there is enough room at the top (margin is 10)
                            const margin = 10
                            const showBelow = hp.y - tooltipHeight - 14 < margin
                            
                            const ry = showBelow 
                              ? hp.y + 14 
                              : hp.y - tooltipHeight - 14
                            
                            // Boundary guard to keep tooltip inside SVG viewport horizontally
                            let adjustedRx = rx
                            if (adjustedRx < 10) {
                              adjustedRx = 10
                            } else if (adjustedRx + tooltipWidth > svgWidth - 10) {
                              adjustedRx = svgWidth - tooltipWidth - 10
                            }

                            return (
                              <g className="pointer-events-none transition-all duration-200 ease-out">
                                {/* Caret pointing to the dot */}
                                <polygon 
                                  points={showBelow
                                    ? `${hp.x - 6},${hp.y + 14} ${hp.x + 6},${hp.y + 14} ${hp.x},${hp.y + 8}`
                                    : `${hp.x - 6},${hp.y - 14} ${hp.x + 6},${hp.y - 14} ${hp.x},${hp.y - 8}`
                                  }
                                  fill="#1E293B"
                                />
                                {/* Tooltip Card Body */}
                                <rect 
                                  x={adjustedRx} 
                                  y={ry} 
                                  width={tooltipWidth} 
                                  height={tooltipHeight} 
                                  rx="8" 
                                  fill="#1E293B" 
                                  stroke="#374151"
                                  strokeWidth="1"
                                />
                                {/* Tooltip Text - Count */}
                                <text 
                                  x={adjustedRx + tooltipWidth / 2} 
                                  y={ry + 16} 
                                  textAnchor="middle" 
                                  className="text-[9px] font-black fill-white"
                                >
                                  {hp.count} Pengunjung
                                </text>
                                {/* Tooltip Text - Label/Month */}
                                <text 
                                  x={adjustedRx + tooltipWidth / 2} 
                                  y={ry + 28} 
                                  textAnchor="middle" 
                                  className="text-[8px] font-bold fill-abu-400"
                                >
                                  {hp.label}
                                </text>
                              </g>
                            )
                          })()}
                        </svg>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-abu-400 italic">Belum ada data tren kunjungan.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Popular Tournaments (Left) & Yearly Activity Diagram (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 5 Lomba Terpopuler */}
                <div className="bg-white border border-abu-200 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between border-b border-abu-100 pb-3">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-abu-900 flex items-center gap-2">
                        <Icon icon="solar:fire-bold-duotone" className="w-6 h-6 text-merah-500" />
                        5 Lomba Terpopuler
                      </h3>
                      <p className="text-xs text-abu-400 mt-0.5">Antusias/Pendaftar Terbanyak</p>
                    </div>
                  </div>

                  {stats.participantAnalytics?.popularTournaments && stats.participantAnalytics.popularTournaments.length > 0 ? (
                    (() => {
                      const popularT = stats.participantAnalytics.popularTournaments
                      const maxCount = Math.max(...popularT.map(t => t.count), 1)

                      const svgW = 500
                      const svgH = 220
                      const padL = 135 // Room for tournament name labels
                      const padR = 40  // Room for numbers on the right
                      const padT = 15
                      const padB = 20

                      const cW = svgW - padL - padR
                      const cH = svgH - padT - padB
                      const rowH = cH / Math.max(popularT.length, 1)
                      const barH = 18

                      const rankColors = [
                        '#F59E0B', // Gold
                        '#64748B', // Silver
                        '#B45309', // Bronze
                        '#94A3B8', // 4th
                        '#94A3B8'  // 5th
                      ]

                      return (
                        <div className="w-full bg-abu-50/50 border border-abu-150 p-4 rounded-xl">
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                            <defs>
                              <linearGradient id="popular-bar-gradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#DC2626" />
                              </linearGradient>
                            </defs>

                            {/* Y-Axis Base Line */}
                            <line 
                              x1={padL} 
                              y1={padT} 
                              x2={padL} 
                              y2={padT + cH} 
                              stroke="#D1D5DB" 
                              strokeWidth="1.5" 
                            />

                            {/* Bars & Labels */}
                            {popularT.map((t, idx) => {
                              const barW = (t.count / maxCount) * cW
                              const cY = padT + (idx + 0.5) * rowH
                              const barY = cY - barH / 2

                              // Truncate name if it's too long
                              const labelText = t.label.length > 18 ? t.label.substring(0, 16) + '...' : t.label

                              return (
                                <g key={idx} className="group cursor-pointer">
                                  {/* Rank number badge next to name */}
                                  <circle
                                    cx={15}
                                    cy={cY}
                                    r="9"
                                    fill={rankColors[idx] || '#94A3B8'}
                                    opacity="0.9"
                                  />
                                  <text
                                    x={15}
                                    y={cY + 3}
                                    textAnchor="middle"
                                    className="text-[9px] font-black fill-white"
                                  >
                                    {idx + 1}
                                  </text>

                                  {/* Tournament Name Label */}
                                  <text
                                    x={30}
                                    y={cY + 3}
                                    textAnchor="start"
                                    className="text-[10px] font-bold fill-abu-700 group-hover:fill-abu-950 group-hover:font-black transition-colors"
                                  >
                                    {labelText}
                                    <title>{t.label}</title>
                                  </text>

                                  {/* Bar */}
                                  <rect
                                    x={padL}
                                    y={barY}
                                    width={Math.max(barW, 3)}
                                    height={barH}
                                    rx="3"
                                    fill="url(#popular-bar-gradient)"
                                    className="transition-all duration-300 hover:opacity-90"
                                  />

                                  {/* Count Label inside/next to bar */}
                                  <text
                                    x={padL + barW + 8}
                                    y={cY + 3.5}
                                    textAnchor="start"
                                    className="text-[10px] font-black fill-merah-700"
                                  >
                                    {t.count}
                                  </text>
                                </g>
                              )
                            })}
                          </svg>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-center py-8 text-xs text-abu-400 italic">Belum ada data lomba terpopuler.</div>
                  )}
                </div>

                {/* Diagram Aktivitas Lomba & Pendaftar (Tahunan) */}
                <div className="bg-white border border-abu-200 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-abu-100 pb-3">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-abu-900 flex items-center gap-2">
                        <Icon icon="solar:chart-square-bold-duotone" className="w-6 h-6 text-merah-500" />
                        Diagram Aktivitas Lomba &amp; Pendaftar
                      </h3>
                      <p className="text-xs text-abu-400 mt-0.5">Statistik pendaftaran &amp; lomba baru per tahun</p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-[10px] font-bold text-abu-600 self-start sm:self-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-500" />
                        <span>Lomba Baru</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-merah-500" />
                        <span>Pendaftar</span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const yearlyData = stats.participantAnalytics?.yearlyStats || []

                    if (yearlyData.length === 0) {
                      return <div className="text-center py-8 text-sm text-abu-400 italic">Belum ada data aktivitas tahunan.</div>
                    }

                    // Find maximum value to scale the Y-axis
                    const maxVal = Math.max(
                      ...yearlyData.map(y => Math.max(y.tournaments, y.participants)),
                      1
                    )

                    const svgW = 500
                    const svgH = 220
                    const padL = 40
                    const padR = 20
                    const padT = 30
                    const padB = 35

                    const cW = svgW - padL - padR
                    const cH = svgH - padT - padB
                    const gW = cW / yearlyData.length

                    return (
                      <div className="w-full bg-abu-50/50 border border-abu-150 p-4 rounded-xl">
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                          <defs>
                            <linearGradient id="blue-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" />
                              <stop offset="100%" stopColor="#1D4ED8" />
                            </linearGradient>
                            <linearGradient id="red-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#EF4444" />
                              <stop offset="100%" stopColor="#B91C1C" />
                            </linearGradient>
                          </defs>

                          {/* Y-Axis Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const y = padT + cH * ratio
                            const labelVal = Math.round(maxVal * (1 - ratio))
                            return (
                              <g key={idx}>
                                <line 
                                  x1={padL} 
                                  y1={y} 
                                  x2={svgW - padR} 
                                  y2={y} 
                                  stroke="#E5E7EB" 
                                  strokeDasharray="4 4" 
                                />
                                <text 
                                  x={padL - 8} 
                                  y={y + 4} 
                                  textAnchor="end" 
                                  className="text-[9px] font-bold fill-abu-400"
                                >
                                  {labelVal}
                                </text>
                              </g>
                            )
                          })}

                          {/* Bars & Labels */}
                          {yearlyData.map((data, idx) => {
                            // Group center X
                            const cX = padL + (idx + 0.5) * gW
                            const barW = 20
                            const gap = 6

                            // Calculate positions and heights
                            const tH = (data.tournaments / maxVal) * cH
                            const tY = padT + cH - tH
                            const tX = cX - barW - gap / 2

                            const pH = (data.participants / maxVal) * cH
                            const pY = padT + cH - pH
                            const pX = cX + gap / 2

                            return (
                              <g key={data.year} className="group">
                                {/* Tournament Bar */}
                                {data.tournaments > 0 && (
                                  <g>
                                    <rect
                                      x={tX}
                                      y={tY}
                                      width={barW}
                                      height={tH}
                                      rx="3"
                                      fill="url(#blue-bar-gradient)"
                                      className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                                    />
                                    <text
                                      x={tX + barW / 2}
                                      y={tY - 5}
                                      textAnchor="middle"
                                      className="text-[8px] font-black fill-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      {data.tournaments}
                                    </text>
                                  </g>
                                )}

                                {/* Participant Bar */}
                                {data.participants > 0 && (
                                  <g>
                                    <rect
                                      x={pX}
                                      y={pY}
                                      width={barW}
                                      height={pH}
                                      rx="3"
                                      fill="url(#red-bar-gradient)"
                                      className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                                    />
                                    <text
                                      x={pX + barW / 2}
                                      y={pY - 5}
                                      textAnchor="middle"
                                      className="text-[8px] font-black fill-merah-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      {data.participants}
                                    </text>
                                  </g>
                                )}

                                {/* X-Axis Label */}
                                <text
                                  x={cX}
                                  y={svgH - 12}
                                  textAnchor="middle"
                                  className="text-[9px] font-bold fill-abu-500 group-hover:fill-abu-850 group-hover:font-black transition-colors"
                                >
                                  {data.label}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )
        })()}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {/* Row 1: Buat Lomba Baru & Batasan Usia (Side-by-Side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <FormEditKategori />
              <FormBuatLomba onTournamentAdded={handleTournamentAdded} />
            </div>

            {/* Row 2: Kunci Pemenang & Daftar Lomba (Stacked below) */}
            <FormKunciPemenang
              tournaments={tournaments.filter(t => t.status !== 'selesai')}
              onTournamentUpdated={handleTournamentUpdated}
            />
            <FormDaftarLomba
              tournaments={tournaments}
              onTournamentUpdated={handleTournamentUpdated}
            />
          </div>
        )}

        {activeTab === 'participants' && (
          <FormInputPeserta tournaments={tournaments.filter(t => t.status !== 'selesai')} />
        )}

        {activeTab === 'news-media' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <FormKelolaBerita onNewsAdded={handleMediaAdded} />
            <FormKelolaMedia onMediaAdded={handleMediaAdded} />
          </div>
        )}

        {activeTab === 'organization' && (
          <FormKelolaOrganisasi />
        )}

        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <FormKelolaTicker />
            <FormKelolaBanner />
          </div>
        )}
      </div>
    </div>
  )
}
