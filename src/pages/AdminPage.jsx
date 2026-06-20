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

import { DEMO_TOURNAMENTS, syncAllExistingNewsImages } from '../components/admin/adminUtils'

const calculateVisitorStats = (visits) => {
  if (!visits || !Array.isArray(visits)) {
    return { weekly: 0, monthly: 0, yearly: 0, trends: [] }
  }
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  // 1. Weekly unique visitors
  const weeklyVisitors = new Set(
    visits
      .filter(v => new Date(v.created_at || v.date) >= sevenDaysAgo)
      .map(v => v.visitor_id)
  ).size

  // 2. Monthly unique visitors
  const monthlyVisitors = new Set(
    visits
      .filter(v => new Date(v.created_at || v.date) >= thirtyDaysAgo)
      .map(v => v.visitor_id)
  ).size

  // 3. Yearly unique visitors
  const yearlyVisitors = new Set(
    visits
      .filter(v => new Date(v.created_at || v.date) >= threeSixtyFiveDaysAgo)
      .map(v => v.visitor_id)
  ).size

  // 4. Monthly trends (last 6 months)
  const monthlyTrends = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthIndex = d.getMonth()
    const year = d.getFullYear()

    const monthStart = new Date(year, monthIndex, 1)
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)

    const uniqueInMonth = new Set(
      visits
        .filter(v => {
          const vd = new Date(v.created_at || v.date)
          return vd >= monthStart && vd <= monthEnd
        })
        .map(v => v.visitor_id)
    ).size

    const monthName = d.toLocaleString('id-ID', { month: 'short' })
    monthlyTrends.push({ label: `${monthName} ${year}`, count: uniqueInMonth })
  }

  return {
    weekly: weeklyVisitors,
    monthly: monthlyVisitors,
    yearly: yearlyVisitors,
    trends: monthlyTrends
  }
}

const seedDemoParticipantData = () => {
  if (isSupabaseConfigured()) return;

  // 1. Seed Tournaments
  const currentTourneys = localStorage.getItem('katar_tournaments')
  let parsedTourneys = []
  if (currentTourneys) {
    try { parsedTourneys = JSON.parse(currentTourneys) } catch { parsedTourneys = [] }
  }

  // If empty or only default empty arrays, seed them
  if (parsedTourneys.length === 0) {
    const mockTourneys = [
      { id: 't-futsal-2026', name: 'Lomba Futsal RT 02', status: 'berjalan', year: 2026 },
      { id: 't-catur-2026', name: 'Lomba Catur Warga', status: 'berjalan', year: 2026 },
      { id: 't-karung-2026', name: 'Lomba Balap Karung Anak', status: 'berjalan', year: 2026 },
      { id: 't-tumpeng-2026', name: 'Lomba Menghias Tumpeng', status: 'berjalan', year: 2026 },
      { id: 't-tarik-2026', name: 'Lomba Tarik Tambang', status: 'berjalan', year: 2026 },
      { id: 't-karaoke-2025', name: 'Lomba Karaoke Iremda', status: 'selesai', year: 2025 },
      { id: 't-mewarnai-2025', name: 'Lomba Mewarnai Balita', status: 'selesai', year: 2025 },
      { id: 't-gaple-2024', name: 'Lomba Gaple Bapak-Bapak', status: 'selesai', year: 2024 }
    ]
    localStorage.setItem('katar_tournaments', JSON.stringify(mockTourneys))
    parsedTourneys = mockTourneys
  }

  // 2. Seed Participants (Individu)
  const currentParts = localStorage.getItem('katar_participants')
  if (!currentParts || currentParts === '[]') {
    const mockParts = []
    
    // Add individual participants to t-catur-2026 (18 participants)
    for (let i = 1; i <= 18; i++) {
      mockParts.push({ id: `p-catur-${i}`, name: `Warga Catur ${i}`, tournament_id: 't-catur-2026', origin_block: `Blok ${String.fromCharCode(65 + (i % 4))}` })
    }
    // Add individual participants to t-karung-2026 (28 participants)
    for (let i = 1; i <= 28; i++) {
      mockParts.push({ id: `p-karung-${i}`, name: `Anak Karung ${i}`, tournament_id: 't-karung-2026', origin_block: `Blok ${String.fromCharCode(65 + (i % 3))}` })
    }
    // Add individual participants to t-karaoke-2025 (15 participants)
    for (let i = 1; i <= 15; i++) {
      mockParts.push({ id: `p-karaoke-${i}`, name: `Penyanyi ${i}`, tournament_id: 't-karaoke-2025', origin_block: `Blok ${String.fromCharCode(65 + (i % 2))}` })
    }
    // Add individual participants to t-mewarnai-2025 (22 participants)
    for (let i = 1; i <= 22; i++) {
      mockParts.push({ id: `p-mewarnai-${i}`, name: `Balita ${i}`, tournament_id: 't-mewarnai-2025', origin_block: `Blok ${String.fromCharCode(65 + (i % 4))}` })
    }

    localStorage.setItem('katar_participants', JSON.stringify(mockParts))
  }

  // 3. Seed Teams (Grup)
  const currentTeams = localStorage.getItem('katar_teams')
  if (!currentTeams || currentTeams === '[]') {
    const mockTeams = []

    // Add teams to t-futsal-2026 (12 teams)
    for (let i = 1; i <= 12; i++) {
      mockTeams.push({ id: `team-futsal-${i}`, name: `FC Blok ${String.fromCharCode(65 + (i % 4))} - Team ${i}`, tournament_id: 't-futsal-2026', origin_block: `Blok ${String.fromCharCode(65 + (i % 4))}` })
    }
    // Add teams to t-tumpeng-2026 (10 teams)
    for (let i = 1; i <= 10; i++) {
      mockTeams.push({ id: `team-tumpeng-${i}`, name: `Ibu Cantik ${i}`, tournament_id: 't-tumpeng-2026', origin_block: `Blok ${String.fromCharCode(65 + (i % 3))}` })
    }
    // Add teams to t-tarik-2026 (8 teams)
    for (let i = 1; i <= 8; i++) {
      mockTeams.push({ id: `team-tarik-${i}`, name: `Kuat Perkasa ${i}`, tournament_id: 't-tarik-2026', origin_block: `Blok ${String.fromCharCode(65 + (i % 2))}` })
    }
    // Add teams to t-gaple-2024 (16 teams)
    for (let i = 1; i <= 16; i++) {
      mockTeams.push({ id: `team-gaple-${i}`, name: `Pasangan Gaple ${i}`, tournament_id: 't-gaple-2024', origin_block: `Blok ${String.fromCharCode(65 + (i % 3))}` })
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
      mockRegs.push({ id: `reg-${i}`, age, tournament_id: i % 2 === 0 ? 't-catur-2026' : 't-karung-2026' })
    }
    localStorage.setItem('katar_registrations', JSON.stringify(mockRegs))
  }
}

const calculateParticipantAnalytics = (participants, teams, registrations, tournaments) => {
  const tournamentMap = {}
  const participantsPerYear = {}
  
  // Initialize tournamentMap with all tournaments
  if (Array.isArray(tournaments)) {
    tournaments.forEach(t => {
      tournamentMap[t.id] = { label: t.name, count: 0 }
    })
  }

  // 1. Process individual participants
  if (Array.isArray(participants)) {
    participants.forEach(p => {
      const tourney = tournaments.find(t => t.id === p.tournament_id)
      const year = tourney ? (tourney.year || tourney.years?.year_number || 2026) : 2026
      participantsPerYear[year] = (participantsPerYear[year] || 0) + 1

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
      participantsPerYear[year] = (participantsPerYear[year] || 0) + 1

      if (tournamentMap[t.tournament_id]) {
        tournamentMap[t.tournament_id].count += 1
      }
    })
  }

  const popularTournaments = Object.values(tournamentMap)
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Format yearly distribution
  const yearlyDistribution = Object.keys(participantsPerYear).map(year => ({
    label: `Tahun ${year}`,
    count: participantsPerYear[year]
  })).sort((a, b) => b.label.localeCompare(a.label)) // Sort descending by year name

  return {
    popularTournaments,
    yearlyDistribution
  }
}

const calculateVisitorTrends = (visits, interval) => {
  if (!visits || !Array.isArray(visits)) return []

  const trends = []
  const now = new Date()

  if (interval === 'daily') {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)

      const uniqueCount = new Set(
        visits
          .filter(v => {
            const vd = new Date(v.created_at || v.date)
            return vd >= start && vd <= end
          })
          .map(v => v.visitor_id)
      ).size

      const label = d.toLocaleString('id-ID', { day: 'numeric', month: 'short' })
      trends.push({ label, count: uniqueCount })
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

      const uniqueCount = new Set(
        visits
          .filter(v => {
            const vd = new Date(v.created_at || v.date)
            return vd >= startOfWeek && vd <= endOfWeek
          })
          .map(v => v.visitor_id)
      ).size

      trends.push({ label: `Min ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`, count: uniqueCount })
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

      const uniqueInMonth = new Set(
        visits
          .filter(v => {
            const vd = new Date(v.created_at || v.date)
            return vd >= monthStart && vd <= monthEnd
          })
          .map(v => v.visitor_id)
      ).size

      const monthName = d.toLocaleString('id-ID', { month: 'short' })
      trends.push({ label: `${monthName} ${year}`, count: uniqueInMonth })
    }
  } else if (interval === 'yearly') {
    // Last 5 years
    const currentYear = now.getFullYear()
    for (let i = 4; i >= 0; i--) {
      const targetYear = currentYear - i
      const yearStart = new Date(targetYear, 0, 1)
      const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59)

      const uniqueInYear = new Set(
        visits
          .filter(v => {
            const vd = new Date(v.created_at || v.date)
            return vd >= yearStart && vd <= yearEnd
          })
          .map(v => v.visitor_id)
      ).size

      trends.push({ label: `${targetYear}`, count: uniqueInYear })
    }
  } else if (interval === 'alltime') {
    // Group all historical visits by month
    if (visits.length === 0) return []

    const sortedVisits = [...visits].sort((a, b) => {
      return new Date(a.created_at || a.date) - new Date(b.created_at || b.date)
    })

    const earliestVisitDate = new Date(sortedVisits[0].created_at || sortedVisits[0].date)
    
    let current = new Date(earliestVisitDate.getFullYear(), earliestVisitDate.getMonth(), 1)
    while (current <= now) {
      const monthIndex = current.getMonth()
      const year = current.getFullYear()

      const monthStart = new Date(year, monthIndex, 1)
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)

      const uniqueInMonth = new Set(
        visits
          .filter(v => {
            const vd = new Date(v.created_at || v.date)
            return vd >= monthStart && vd <= monthEnd
          })
          .map(v => v.visitor_id)
      ).size

      const monthName = current.toLocaleString('id-ID', { month: 'short' })
      trends.push({ label: `${monthName} ${year}`, count: uniqueInMonth })

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
    visitorStats: { weekly: 0, monthly: 0, yearly: 0, trends: [] },
    rawVisits: [],
    participantAnalytics: { popularTournaments: [], yearlyDistribution: [] }
  })
  const [statsLoading, setStatsLoading] = useState(false)

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
        .neq('status', 'selesai')
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
    setStatsLoading(true)
    try {
      let views = []

      if (isSupabaseConfigured()) {
        // 1. Tournaments
        const { data: tourneys, error: tErr } = await supabase
          .from('tournaments')
          .select('id, name, type, category, status, years(year_number)')
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

        // 5. Page views
        try {
          const oneYearAgo = new Date()
          oneYearAgo.setDate(oneYearAgo.getDate() - 365)
          const { data: vData, error: vErr } = await supabase
            .from('page_views')
            .select('visitor_id, created_at')
            .gte('created_at', oneYearAgo.toISOString())
          if (!vErr && vData) {
            views = vData
          }
        } catch (vErr) {
          console.warn('Failed to fetch page views:', vErr)
        }


        // Fetch rows for participant analytics
        let allParticipants = []
        let allTeams = []
        let allRegistrations = []

        try {
          const { data: pData } = await supabase.from('participants').select('id, tournament_id, origin_block')
          allParticipants = pData || []

          const { data: tData } = await supabase.from('teams').select('id, tournament_id, origin_block')
          allTeams = tData || []

          const { data: rData } = await supabase.from('registrations').select('id, age, tournament_id')
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
          visitorStats: calculateVisitorStats(views),
          rawVisits: views,
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

        setStats({
          activeTournamentsCount: activeT.length,
          totalParticipantsCount: localParts.length + localTeams.length,
          totalNewsCount: allNewsCount,
          totalMediaCount: allMediaCount,
          activeTournamentsList: activeT.slice(0, 3),
          visitorStats: calculateVisitorStats(views),
          rawVisits: views,
          participantAnalytics: calculateParticipantAnalytics(localParts, localTeams, localRegs, localTourneys)
        })
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Fetch tournaments and stats when user is authenticated
  useEffect(() => {
    if (user) {
      fetchTournaments()
      fetchDashboardStats()
      // Run background one-time sync of news images to media table
      syncAllExistingNewsImages().then(() => {
        // Re-fetch stats after sync completes to update counts
        fetchDashboardStats()
      })
    }
  }, [user, fetchTournaments, fetchDashboardStats])

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
    <div className="max-w-4xl mx-auto px-4 py-8">
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
        className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-row lg:flex-nowrap lg:justify-start gap-2 lg:gap-1.5 xl:gap-2 p-1.5 bg-abu-200/50 rounded-2xl mb-8 overflow-x-auto scrollbar-none"
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
            className={`w-full lg:w-auto min-h-[42px] px-3.5 py-2.5 lg:px-2.5 xl:px-3.5 lg:py-2 rounded-xl flex items-center justify-center lg:justify-start gap-2 lg:gap-1.5 xl:gap-2 text-xs md:text-sm lg:text-[13px] xl:text-sm font-semibold transition-all duration-300 cursor-pointer focus-ring whitespace-nowrap lg:flex-none
              ${activeTab === tab.id
                ? 'bg-white text-merah-700 shadow-sm'
                : 'text-abu-600 hover:text-abu-900 hover:bg-white/55'
              }`}
          >
            <Icon icon={tab.icon} className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="truncate lg:overflow-visible lg:whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {activeTab === 'overview' && (() => {
          const trends = calculateVisitorTrends(stats.rawVisits || [], visitorTrendInterval)
          const maxVal = Math.max(...trends.map(t => t.count), 1)
          const popularTournaments = stats.participantAnalytics?.popularTournaments || []
          const yearlyDistribution = stats.participantAnalytics?.yearlyDistribution || []

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
              {/* Overview Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-abu-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Lomba Aktif</span>
                    <Icon icon="solar:cup-bold" className="w-5 h-5 text-merah-500" />
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                      {stats.activeTournamentsCount}
                    </div>
                    <p className="text-[11px] text-abu-400 mt-1">Belum/sedang berjalan</p>
                  </div>
                </div>

                <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-abu-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Peserta Lomba</span>
                    <Icon icon="solar:users-group-two-rounded-bold" className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                      {stats.totalParticipantsCount}
                    </div>
                    <p className="text-[11px] text-abu-400 mt-1">Total peserta aktif</p>
                  </div>
                </div>

                <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-abu-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Berita</span>
                    <Icon icon="solar:document-bold" className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                      {stats.totalNewsCount}
                    </div>
                    <p className="text-[11px] text-abu-400 mt-1">Artikel di home page</p>
                  </div>
                </div>

                <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-abu-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Galeri Foto</span>
                    <Icon icon="solar:gallery-bold" className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                      {stats.totalMediaCount}
                    </div>
                    <p className="text-[11px] text-abu-400 mt-1">Foto kegiatan warga</p>
                  </div>
                </div>
              </div>

              {/* Analytics Section Grid */}
              <div className="grid grid-cols-1 gap-6">
                {/* Visitor Stats Section */}
                <div className="bg-white border border-abu-200 rounded-2xl p-6 space-y-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-abu-50/50 border border-abu-150 p-4 rounded-xl flex flex-row items-center justify-between sm:flex-col sm:items-stretch sm:justify-between">
                      <span className="text-[10px] font-bold text-abu-500 uppercase tracking-wider">Per Minggu</span>
                      <div className="mt-0 sm:mt-1.5 text-right sm:text-left">
                        <div className="text-2xl md:text-3xl font-heading font-black text-abu-950 leading-none sm:leading-tight">
                          {stats.visitorStats?.weekly || 0}
                        </div>
                        <span className="text-[9px] text-abu-400">Pengunjung Weekly</span>
                      </div>
                    </div>

                    <div className="bg-abu-50/50 border border-abu-150 p-4 rounded-xl flex flex-row items-center justify-between sm:flex-col sm:items-stretch sm:justify-between">
                      <span className="text-[10px] font-bold text-abu-500 uppercase tracking-wider">Per Bulan</span>
                      <div className="mt-0 sm:mt-1.5 text-right sm:text-left">
                        <div className="text-2xl md:text-3xl font-heading font-black text-abu-950 leading-none sm:leading-tight">
                          {stats.visitorStats?.monthly || 0}
                        </div>
                        <span className="text-[9px] text-abu-400">Pengunjung Monthly</span>
                      </div>
                    </div>

                    <div className="bg-abu-50/50 border border-abu-150 p-4 rounded-xl flex flex-row items-center justify-between sm:flex-col sm:items-stretch sm:justify-between">
                      <span className="text-[10px] font-bold text-abu-500 uppercase tracking-wider">Per Tahun</span>
                      <div className="mt-0 sm:mt-1.5 text-right sm:text-left">
                        <div className="text-2xl md:text-3xl font-heading font-black text-abu-950 leading-none sm:leading-tight">
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

                {/* Participant Stats Section */}
                <div className="bg-white border border-abu-200 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-abu-100 pb-3">
                      <div>
                        <h3 className="font-heading text-lg font-bold text-abu-900 flex items-center gap-2">
                          <Icon icon="solar:users-group-two-rounded-bold-duotone" className="w-6 h-6 text-merah-500" />
                          Analisis Peserta Lomba
                        </h3>
                        <p className="text-xs text-abu-400 mt-0.5">Statistik keseluruhan partisipasi warga per tahun dan lomba terpopuler</p>
                      </div>
                    </div>

                    {/* Partisipasi per Tahun */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-abu-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon icon="solar:calendar-bold-duotone" className="w-4 h-4 text-abu-500" />
                        Total Keseluruhan Peserta per Tahun
                      </h4>
                      {stats.participantAnalytics?.yearlyDistribution && stats.participantAnalytics.yearlyDistribution.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {stats.participantAnalytics.yearlyDistribution.map((item, idx) => (
                            <div key={idx} className="bg-abu-50 border border-abu-150 p-4 rounded-xl flex flex-col justify-between animate-fade-in">
                              <span className="text-[10px] font-bold text-abu-500 uppercase tracking-wider">{item.label}</span>
                              <div className="mt-1">
                                <div className="text-2xl font-heading font-black text-abu-950">
                                  {item.count}
                                </div>
                                <span className="text-[9px] text-abu-400">Total Peserta/Tim</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-abu-400 italic">Belum ada data partisipasi tahunan.</div>
                      )}
                    </div>

                    {/* 5 Lomba Terpopuler */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-abu-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon icon="solar:fire-bold-duotone" className="w-4 h-4 text-abu-500" />
                        5 Lomba Terpopuler (Antusias/Pendaftar Terbanyak)
                      </h4>
                      {stats.participantAnalytics?.popularTournaments && stats.participantAnalytics.popularTournaments.length > 0 ? (
                        <div className="space-y-2.5">
                          {stats.participantAnalytics.popularTournaments.map((t, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-abu-50/70 border border-abu-150 rounded-xl text-xs hover:bg-abu-50 transition-colors">
                              <span className="font-semibold text-abu-850 truncate max-w-[220px]">
                                {t.label}
                              </span>
                              <span className="font-bold text-merah-600 bg-merah-50 px-2 py-0.5 rounded-md">
                                {t.count} Pendaftar
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-abu-400 italic">Belum ada data lomba terpopuler.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {activeTab === 'tournaments' && (
          <div className="grid grid-cols-1 gap-6">
            <FormBuatLomba onTournamentAdded={handleTournamentAdded} />
            <FormKunciPemenang
              tournaments={tournaments}
              onTournamentUpdated={handleTournamentUpdated}
            />
            <FormDaftarLomba
              tournaments={tournaments}
              onTournamentUpdated={handleTournamentUpdated}
            />
          </div>
        )}

        {activeTab === 'participants' && (
          <FormInputPeserta tournaments={tournaments} />
        )}

        {activeTab === 'news-media' && (
          <div className="space-y-6">
            <FormKelolaBerita onNewsAdded={handleMediaAdded} />
            <FormKelolaMedia onMediaAdded={handleMediaAdded} />
          </div>
        )}

        {activeTab === 'organization' && (
          <FormKelolaOrganisasi />
        )}

        {activeTab === 'announcements' && (
          <FormKelolaTicker />
        )}
      </div>
    </div>
  )
}
