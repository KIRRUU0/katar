import { useState, useEffect, useRef, useMemo } from 'react'
import { animate, createScope } from 'animejs'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'
import CountdownTimer from '../components/CountdownTimer'
import ScheduleCard from '../components/ScheduleCard'
import MedalTable from '../components/MedalTable'
import { getCustomCategories, getNormalizedCategory, validateAgeForCategory } from '../components/admin/adminUtils'

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

export default function LeaguePage() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRegisterTournament, setActiveRegisterTournament] = useState(null)
  const [toast, setToast] = useState({ message: '', type: '' })
  const [activeFilter, setActiveFilter] = useState('semua')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [customCategories, setCustomCategories] = useState(getCustomCategories())

  useEffect(() => {
    const handleCatsUpdate = () => {
      setCustomCategories(getCustomCategories())
    }
    window.addEventListener('katar_categories_updated', handleCatsUpdate)
    return () => window.removeEventListener('katar_categories_updated', handleCatsUpdate)
  }, [])



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
  const hasAnimatedSchedule = useRef(false)

  // ─── Fetch tournament data on mount ─────────────────────────────
  useEffect(() => {
    document.title = 'League & Agenda - Karang Taruna RT 02/03'
    async function fetchTournaments() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('tournaments')
            .select('*, years!inner(year_number)')
            .eq('years.year_number', 2026)
            .order('schedule', { ascending: true })

          if (!error) {
            setTournaments(data || [])
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

      // Fallback to empty array
      setTournaments([])
      setLoading(false)
    }

    fetchTournaments()
  }, [])

  // ─── Stagger animation on schedule cards after data or filter changes ───────
  useEffect(() => {
    if (loading || !scheduleListRef.current || hasAnimatedSchedule.current) return

    hasAnimatedSchedule.current = true
    scopeRef.current = createScope({ root: scheduleListRef.current })

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
      if (scopeRef.current) {
        scopeRef.current.revert()
      }
    }
  }, [loading])

  const filteredTournaments = useMemo(
    () => tournaments.filter((t) => {
      if (activeFilter === 'semua') return true
      const cat = getNormalizedCategory(t.category, t.type, t.name)
      return cat === activeFilter
    }),
    [tournaments, activeFilter]
  )

  const filterOptions = useMemo(() => {
    const list = [
      { id: 'semua', label: 'Semua Lomba', icon: 'solar:list-bold-duotone' }
    ]
    customCategories.forEach(cat => {
      list.push({
        id: cat.id,
        label: cat.name,
        icon: cat.type === 'grup' ? 'solar:users-group-two-rounded-bold-duotone' : 'solar:user-bold-duotone'
      })
    })
    return list
  }, [customCategories])

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

        {/* Category Filter Dropdown */}
        <div className="relative mb-6 z-30 max-w-[280px]">
          <label htmlFor="category-select" className="sr-only">Pilih Kategori Lomba</label>
          <button
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-abu-200 text-abu-850 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-abu-50/70 hover:border-abu-300 transition-all cursor-pointer shadow-sm focus-ring"
          >
            <span className="flex items-center gap-2">
              {(() => {
                const currentOpt = filterOptions.find(opt => opt.id === activeFilter)
                return (
                  <>
                    <Icon icon={currentOpt?.icon || 'solar:user-bold-duotone'} className="w-4.5 h-4.5 text-merah-600" />
                    <span>{currentOpt?.label || 'Semua Lomba'}</span>
                  </>
                )
              })()}
            </span>
            <Icon 
              icon="solar:alt-arrow-down-bold" 
              className={`w-4 h-4 text-abu-500 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {isFilterDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
              <div className="absolute left-0 right-0 mt-2 bg-white border border-abu-150 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in max-h-60 overflow-y-auto">
                {filterOptions.map((opt) => {
                  const isActive = activeFilter === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setActiveFilter(opt.id)
                        setIsFilterDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-between cursor-pointer
                                ${isActive
                                  ? 'bg-merah-50 text-merah-700'
                                  : 'text-abu-700 hover:bg-abu-50'
                                }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon icon={opt.icon} className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </span>
                      {isActive && (
                        <Icon icon="solar:check-read-linear" className="w-4.5 h-4.5 text-merah-600" />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
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
          <div className="card p-10 flex flex-col items-center justify-center text-center border border-dashed border-abu-300 bg-white rounded-3xl animate-fade-in">
            <img src="/empty-lomba.svg" alt="Belum ada lomba" className="w-32 h-32 mb-4 object-contain" />
            <p className="text-abu-850 font-heading text-lg font-bold">
              Belum ada lomba
            </p>
            <p className="text-abu-500 text-sm mt-1 max-w-sm">
              Tidak ada jadwal lomba untuk kategori ini. Hubungi admin untuk informasi lebih lanjut.
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
                <ScheduleCard tournament={tournament} customCategories={customCategories} />
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

    const validation = validateAgeForCategory(age, tournament.category)
    if (!validation.valid) {
      setErrorMsg(validation.message)
      return
    }

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
      } catch {
        setErrorMsg('Gagal menyimpan pendaftaran lokal.')
        setSubmitting(false)
      }
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md"
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
