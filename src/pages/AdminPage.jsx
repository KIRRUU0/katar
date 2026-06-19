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

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loggingOut, setLoggingOut] = useState(false)
  
  // Dashboard tab state
  const [activeTab, setActiveTab] = useState('overview')
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
  })
  const [statsLoading, setStatsLoading] = useState(false)

  /**
   * Fetch active tournaments (status != 'selesai')
   * Used by both participant input and winner forms.
   */
  const fetchTournaments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
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

        setStats({
          activeTournamentsCount: activeT.length,
          totalParticipantsCount: participantsCount || 0,
          totalNewsCount: newsCount || 0,
          totalMediaCount: mediaCount || 0,
          activeTournamentsList: activeT.slice(0, 3),
        })
      } else {
        // Demo fallback
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

        setStats({
          activeTournamentsCount: activeT.length,
          totalParticipantsCount: localParts.length,
          totalNewsCount: allNewsCount,
          totalMediaCount: allMediaCount,
          activeTournamentsList: activeT.slice(0, 3),
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
        {activeTab === 'overview' && (
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

            {/* Quick Actions & Recent Activity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Quick Actions & Overview info (Col-5) */}
              <div className="md:col-span-5 bg-white border border-abu-200 rounded-2xl p-6 space-y-5">
                <h3 className="font-heading text-lg font-bold text-abu-900 border-b border-abu-100 pb-2">
                  Aksi Cepat
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setActiveTab('tournaments')}
                    className="w-full flex items-center justify-between p-3.5 bg-abu-50 rounded-xl hover:bg-merah-50 hover:text-merah-700 border border-abu-200/60 hover:border-merah-200 transition-all duration-200 text-sm font-semibold text-left group cursor-pointer focus-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:add-square-bold-duotone" className="w-5 h-5 text-merah-500" />
                      Buat Lomba Baru
                    </span>
                    <Icon icon="solar:arrow-right-bold" className="w-4 h-4 text-abu-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('participants')}
                    className="w-full flex items-center justify-between p-3.5 bg-abu-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 border border-abu-200/60 hover:border-blue-200 transition-all duration-200 text-sm font-semibold text-left group cursor-pointer focus-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:users-group-two-rounded-bold-duotone" className="w-5 h-5 text-blue-500" />
                      Input & Kelola Peserta
                    </span>
                    <Icon icon="solar:arrow-right-bold" className="w-4 h-4 text-abu-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('news-media')}
                    className="w-full flex items-center justify-between p-3.5 bg-abu-50 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 border border-abu-200/60 hover:border-emerald-200 transition-all duration-200 text-sm font-semibold text-left group cursor-pointer focus-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:camera-add-bold-duotone" className="w-5 h-5 text-emerald-500" />
                      Unggah Berita / Galeri
                    </span>
                    <Icon icon="solar:arrow-right-bold" className="w-4 h-4 text-abu-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Right Column: Lomba Berjalan (Col-7) */}
              <div className="md:col-span-7 bg-white border border-abu-200 rounded-2xl p-6">
                <h3 className="font-heading text-lg font-bold text-abu-900 border-b border-abu-100 pb-2 mb-4">
                  Lomba Berjalan
                </h3>

                {statsLoading ? (
                  <p className="text-sm text-abu-400 text-center py-8">Memuat data...</p>
                ) : !stats.activeTournamentsList || stats.activeTournamentsList.length === 0 ? (
                  <div className="text-center py-8 text-abu-400 text-sm italic">
                    Belum ada lomba yang sedang berjalan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.activeTournamentsList.map((tourney) => {
                      return (
                        <div key={tourney.id} className="p-3.5 bg-abu-50/50 border border-abu-200 rounded-xl flex items-center justify-between gap-4">
                          <div>
                            <div className="font-semibold text-sm text-abu-900">{tourney.name}</div>
                            <div className="text-[11px] text-abu-500 mt-1 flex items-center gap-1.5">
                              <span className="capitalize font-bold text-merah-600 bg-merah-50/80 px-1.5 py-0.5 rounded text-[10px]">
                                {tourney.category ? tourney.category.replace('_', ' ') : 'Umum'}
                              </span>
                              <span className="capitalize font-bold text-amber-600 bg-amber-50/80 px-1.5 py-0.5 rounded text-[10px]">
                                {tourney.status ? tourney.status.replace('_', ' ') : 'belum mulai'}
                              </span>
                              <span className="capitalize text-abu-500 text-[10px]">
                                ({tourney.type})
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('tournaments')}
                            className="text-xs font-semibold text-merah-600 bg-merah-50 hover:bg-merah-100 px-3 py-1.5 rounded-lg border border-merah-200 flex items-center gap-1 transition-colors min-h-[38px] cursor-pointer"
                          >
                            <span>Kelola</span>
                          </button>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => setActiveTab('tournaments')}
                      className="w-full text-center text-xs text-merah-600 hover:text-merah-700 hover:underline pt-3 font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Lihat Semua Lomba</span>
                      <Icon icon="solar:alt-arrow-right-bold" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
