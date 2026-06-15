import { useState, useEffect, useRef } from 'react'
import { animate, createScope } from 'animejs'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'
import CountdownTimer from '../components/CountdownTimer'
import ScheduleCard from '../components/ScheduleCard'
import MedalTable from '../components/MedalTable'

/**
 * LeaguePage — League & Agenda 17-an RT 03.
 *
 * Layout:
 *   Mobile:  countdown → schedule cards → medal table (single column)
 *   Desktop: countdown full-width, then 2-column (3/5 schedule | 2/5 medals)
 *
 * Data: fetches tournament schedule from Supabase for the current year (2026).
 * Falls back to demo data when Supabase is not configured or the query fails.
 */

// ─── Fallback demo tournaments ──────────────────────────────────
const demoTournaments = [
  {
    id: 'demo-1',
    name: 'Lomba Balap Karung',
    type: 'individu',
    category: 'bapak_bapak',
    status: 'belum',
    location: 'Lapangan Gang 3',
    schedule: '2026-08-01T08:00:00+07:00',
    pj: 'Hirzan Arziqi'
  },
  {
    id: 'demo-2',
    name: 'Lomba Tarik Tambang',
    type: 'grup',
    category: 'pasangan',
    status: 'belum',
    location: 'Pos Ronda RT 03',
    schedule: '2026-08-01T10:00:00+07:00',
    pj: 'Ridho Ramadhani'
  },
  {
    id: 'demo-3',
    name: 'Lomba Panjat Pinang',
    type: 'grup',
    category: 'remaja_pria',
    status: 'belum',
    location: 'Jalan Utama Depan Musholla',
    schedule: '2026-08-02T09:00:00+07:00',
    pj: 'Muhammad Haekal Arrafi'
  },
  {
    id: 'demo-4',
    name: 'Lomba Makan Kerupuk',
    type: 'individu',
    category: 'anak_7_12',
    status: 'belum',
    location: 'Lapangan Gang 3',
    schedule: '2026-08-02T14:00:00+07:00',
    pj: 'Tri Dewi Setyawati'
  },
  {
    id: 'demo-5',
    name: 'Lomba 17an Anak: Estafet Kelereng',
    type: 'individu',
    category: 'anak_4_6',
    status: 'belum',
    location: 'Gang 2',
    schedule: '2026-08-03T08:00:00+07:00',
    pj: 'Nadia Istifana'
  },
  {
    id: 'demo-6',
    name: 'Lomba Futsal Antar Gang',
    type: 'grup',
    category: 'remaja_pria',
    status: 'belum',
    location: 'Lapangan Gang 3',
    schedule: '2026-08-03T15:00:00+07:00',
    pj: 'Bintang R Sinaga'
  },
]

export default function LeaguePage() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRegisterTournament, setActiveRegisterTournament] = useState(null)
  const [toast, setToast] = useState({ message: '', type: '' })
  const [activeFilter, setActiveFilter] = useState('semua')

  const handleRegisterClick = (tournament) => {
    setActiveRegisterTournament(tournament)
  }

  const handleRegisterSuccess = (msg) => {
    setActiveRegisterTournament(null)
    setToast({ message: msg, type: 'success' })
    setTimeout(() => {
      setToast({ message: '', type: '' })
    }, 4000)
  }

  // Ref for the schedule list — used by createScope for Anime.js cleanup
  const scheduleListRef = useRef(null)
  const scopeRef = useRef(null)

  // ─── Fetch tournament data on mount ─────────────────────────────
  useEffect(() => {
    async function fetchTournaments() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('tournaments')
            .select('*, years!inner(year_number)')
            .eq('years.year_number', 2026)
            .order('schedule', { ascending: true })

          if (!error && data?.length) {
            setTournaments(data)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn(
            'LeaguePage: Supabase fetch failed, using demo data.',
            err
          )
        }
      }

      // Fallback to demo data
      setTournaments(demoTournaments)
      setLoading(false)
    }

    fetchTournaments()
  }, [])

  // ─── Stagger animation on schedule cards after data or filter changes ───────
  useEffect(() => {
    if (loading || !scheduleListRef.current) return

    // Create a scope tied to the schedule list container for automatic cleanup
    scopeRef.current = createScope({ root: scheduleListRef })

    // Small delay so the DOM has time to paint the cards
    const timer = setTimeout(() => {
      animate('.schedule-card', {
        translateY: [30, 0],
        opacity: [0, 1],
        delay: (el, i) => i * 100,
        duration: 600,
        ease: 'outExpo',
      })
    }, 50)

    return () => {
      clearTimeout(timer)
      // Revert all animations scoped to the list on unmount
      if (scopeRef.current) {
        scopeRef.current.revert()
      }
    }
  }, [loading, tournaments, activeFilter])

  const getTournamentCategory = (t) => {
    const cat = t.category || ''
    if (cat === 'anak_4_6' || cat === '4-6') return 'anak_4_6'
    if (cat === 'anak_7_12' || cat === '7-12') return 'anak_7_12'
    if (cat === 'remaja_pria' || cat === 'remaja pria') return 'remaja_pria'
    if (cat === 'remaja_putri' || cat === 'remaja putri') return 'remaja_putri'
    if (cat === 'ibu_ibu' || cat === 'ibu-ibu' || cat === 'ibu_individu' || cat === 'ibu_grup') return 'ibu_ibu'
    if (cat === 'bapak_bapak' || cat === 'bapak-bapak' || cat === 'bapak_individu' || cat === 'bapak_grup') return 'bapak_bapak'
    if (cat === 'pasangan' || cat === 'segala_umur' || cat === 'remaja_grup' || t.type === 'grup') return 'pasangan'

    const name = (t.name || '').toLowerCase()
    if (name.includes('4-6') || name.includes('balita')) return 'anak_4_6'
    if (name.includes('7-12') || name.includes('anak') || name.includes('kelereng') || name.includes('kerupuk')) return 'anak_7_12'
    if (name.includes('remaja pria') || name.includes('remaja putra') || name.includes('remaja lak')) return 'remaja_pria'
    if (name.includes('remaja putri') || name.includes('remaja putri') || name.includes('remaja peremp')) return 'remaja_putri'
    if (name.includes('ibu')) return 'ibu_ibu'
    if (name.includes('bapak') || name.includes('pria')) return 'bapak_bapak'
    if (name.includes('pasangan') || name.includes('grup') || t.type === 'grup') return 'pasangan'

    return 'bapak_bapak'
  }

  const filteredTournaments = tournaments.filter((t) => {
    if (activeFilter === 'semua') return true
    const cat = getTournamentCategory(t)
    return cat === activeFilter
  })

  const filterOptions = [
    { id: 'semua', label: 'Semua Lomba', icon: 'solar:list-bold-duotone' },
    { id: 'anak_4_6', label: 'Anak 4-6', icon: 'solar:user-bold-duotone' },
    { id: 'anak_7_12', label: 'Anak 7-12', icon: 'solar:user-bold-duotone' },
    { id: 'remaja_pria', label: 'Remaja Pria', icon: 'solar:user-bold-duotone' },
    { id: 'remaja_putri', label: 'Remaja Putri', icon: 'solar:user-bold-duotone' },
    { id: 'ibu_ibu', label: 'Ibu-Ibu', icon: 'solar:user-bold-duotone' },
    { id: 'bapak_bapak', label: 'Bapak-Bapak', icon: 'solar:user-bold-duotone' },
    { id: 'pasangan', label: 'Pasangan', icon: 'solar:users-group-two-rounded-bold-duotone' },
  ]

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* ─── Page Title ──────────────────────────────────────────── */}
      <h1 className="font-heading text-2xl md:text-3xl font-bold text-abu-900 flex items-center justify-center md:justify-start gap-2 mb-8 md:mb-10">
        <Icon icon="solar:cup-first-bold-duotone" className="w-8 h-8 text-merah-600" />
        League 17-an RT 02/03
      </h1>

      {/* ─── Section 1: Countdown Timer ──────────────────────────── */}
      <section className="mb-8 md:mb-10 animate-fade-in">
        <CountdownTimer />
      </section>

      {/* ─── Section 2: Medal Standings (Full Width) ──────────────── */}
      <section className="mb-8 md:mb-12 animate-fade-in">
        <MedalTable />
      </section>

      {/* ─── Section 3: Rundown Jadwal Lomba 2026 (Full Width) ─────── */}
      <section className="mb-8 md:mb-10 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-abu-900 flex items-center justify-center md:justify-start gap-2">
            <Icon icon="solar:calendar-date-bold-duotone" className="w-6 h-6 text-merah-600" />
            Rundown Jadwal Lomba 2026
          </h2>
        </div>

        {/* Horizontal Scroll Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
          {filterOptions.map((opt) => {
            const isActive = activeFilter === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setActiveFilter(opt.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all focus-ring min-h-[38px] cursor-pointer
                  ${isActive
                    ? 'bg-merah-600 text-white shadow-md'
                    : 'bg-white text-abu-600 border border-abu-200 hover:bg-abu-50'
                  }`}
              >
                <Icon icon={opt.icon} className="w-4 h-4" />
                {opt.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          /* Shimmer Skeleton Cards */
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="card p-4 md:p-5 border-l-4 border-l-abu-200 bg-white flex flex-col space-y-2.5 shadow-sm">
                {/* Date skeleton */}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full animate-shimmer" />
                  <div className="w-48 h-3.5 rounded animate-shimmer" />
                </div>
                {/* Title skeleton */}
                <div className="w-2/3 h-5 rounded animate-shimmer" />
                {/* Location skeleton */}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full animate-shimmer" />
                  <div className="w-36 h-3.5 rounded animate-shimmer" />
                </div>
                {/* PJ skeleton */}
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full animate-shimmer" />
                  <div className="w-56 h-3 rounded animate-shimmer" />
                </div>
                {/* Badges footer skeleton */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-abu-100">
                  <div className="flex gap-2">
                    <div className="w-24 h-6 rounded-full animate-shimmer" />
                    <div className="w-28 h-6 rounded-full animate-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTournaments.length === 0 ? (
          /* Empty state */
          <div className="card p-10 text-center border border-dashed border-abu-300 bg-white">
            <p className="text-abu-500 font-medium">
              Tidak ada jadwal lomba untuk kategori ini.
            </p>
          </div>
        ) : (
          /* Schedule card list */
          <div ref={scheduleListRef} className="flex flex-col gap-4">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="schedule-card"
                style={{ opacity: 0 }}
              >
                <ScheduleCard tournament={tournament} onRegister={handleRegisterClick} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Registration Modal Popup ────────────────────────────── */}
      {activeRegisterTournament && (
        <RegistrationModal
          tournament={activeRegisterTournament}
          onClose={() => setActiveRegisterTournament(null)}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}

      {/* ─── Toast Notification ───────────────────────────────────── */}
      {toast.message && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-lg border flex items-center justify-between gap-3 animate-fade-in
                      ${toast.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                      }`}
        >
          <span className="text-sm font-semibold">{toast.message}</span>
          <button onClick={() => setToast({ message: '', type: '' })} className="text-xs hover:opacity-75">✕</button>
        </div>
      )}
    </main>
  )
}

/**
 * RegistrationModal Component
 */
function RegistrationModal({ tournament, onClose, onRegisterSuccess }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [contact, setContact] = useState('')
  const [members, setMembers] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const backdropRef = useRef(null)
  const modalContentRef = useRef(null)

  // Spring entrance animations on mount
  useEffect(() => {
    if (backdropRef.current) {
      animate(backdropRef.current, {
        opacity: [0, 1],
        duration: 250,
        ease: 'linear',
      })
    }
    if (modalContentRef.current) {
      animate(modalContentRef.current, {
        opacity: [0, 1],
        scale: [0.95, 1],
        translateY: [30, 0],
        duration: 500,
        ease: 'outBack',
      })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !age) return
    setSubmitting(true)
    setErrorMsg('')

    const registrationData = {
      tournament_id: tournament.id,
      name: name.trim(),
      age: parseInt(age) || 0,
      contact: contact.trim(),
      members: tournament.type === 'grup' ? members.trim() : null,
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('registrations')
          .insert(registrationData)

        if (error) throw error
        onRegisterSuccess('Pendaftaran berhasil disimpan ke panitia!')
      } catch (err) {
        console.error('Registration error:', err)
        setErrorMsg('Gagal mengirim pendaftaran: ' + err.message)
        setSubmitting(false)
      }
    } else {
      // Local fallback
      try {
        const localRegs = JSON.parse(localStorage.getItem('katar_registrations') || '[]')
        const regWithId = {
          ...registrationData,
          id: 'reg-' + Date.now(),
          tournament_name: tournament.name,
          created_at: new Date().toISOString()
        }
        localRegs.push(regWithId)
        localStorage.setItem('katar_registrations', JSON.stringify(localRegs))
        onRegisterSuccess('(Demo) Pendaftaran berhasil disimpan secara lokal!')
      } catch (err) {
        setErrorMsg('Gagal menyimpan pendaftaran lokal.')
        setSubmitting(false)
      }
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ opacity: 0 }}
    >
      <div
        ref={modalContentRef}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-abu-200/50 transform opacity-0"
        onClick={(e) => e.stopPropagation()}
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-merah-700 to-merah-600 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h3 className="font-heading text-lg font-bold">Formulir Pendaftaran Lomba</h3>
            <p className="text-xs text-white/80 font-medium">Lomba: {tournament.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors focus-ring"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs uppercase font-bold text-abu-500 flex items-center gap-1.5 mb-1">
              <Icon
                icon={tournament.type === 'grup' ? 'solar:users-group-two-rounded-bold-duotone' : 'solar:user-circle-bold-duotone'}
                className="w-4 h-4 text-merah-600"
              />
              {tournament.type === 'grup' ? 'Nama Tim / Kelompok' : 'Nama Lengkap Pendaftar'}
            </label>
            <input
              type="text"
              required
              className="form-input focus-ring text-sm"
              placeholder={tournament.type === 'grup' ? 'Contoh: Tim Rajawali' : 'Contoh: Ahmad Hidayat'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-bold text-abu-500 flex items-center gap-1.5 mb-1">
                <Icon icon="solar:user-id-bold-duotone" className="w-4 h-4 text-merah-600" />
                Umur (Tahun)
              </label>
              <input
                type="number"
                required
                min="1"
                max="120"
                className="form-input focus-ring text-sm"
                placeholder="Contoh: 17"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-abu-500 flex items-center gap-1.5 mb-1">
                <Icon icon="solar:phone-calling-bold-duotone" className="w-4 h-4 text-merah-600" />
                No. WA / Telepon
              </label>
              <input
                type="tel"
                required
                className="form-input focus-ring text-sm"
                placeholder="Contoh: 081234567890"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>

          {tournament.type === 'grup' && (
            <div>
              <label className="block text-xs uppercase font-bold text-abu-500 flex items-center gap-1.5 mb-1">
                <Icon icon="solar:clipboard-list-bold-duotone" className="w-4 h-4 text-merah-600" />
                Nama Anggota Kelompok
              </label>
              <textarea
                required
                className="form-input focus-ring text-sm min-h-[80px] py-2"
                placeholder="Tuliskan nama anggota kelompok dipisahkan dengan koma atau baris baru..."
                value={members}
                onChange={(e) => setMembers(e.target.value)}
              />
            </div>
          )}

          <div className="pt-2 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-2 px-4 focus-ring"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary text-xs py-2 px-6 disabled:opacity-50 focus-ring"
            >
              {submitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
