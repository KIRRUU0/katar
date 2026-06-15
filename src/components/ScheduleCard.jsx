import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { Icon } from '@iconify/react'

/**
 * ScheduleCard — Displays a single tournament schedule entry.
 *
 * @param {Object} props
 * @param {Object} props.tournament - Tournament data object
 * @param {string} props.tournament.name     - Tournament name
 * @param {string} props.tournament.type     - 'individu' | 'grup'
 * @param {string} props.tournament.status   - 'belum' | 'jalan' | 'selesai'
 * @param {string} props.tournament.location - Venue / location name
 * @param {string} props.tournament.schedule - ISO date string for the event
 */
export default function ScheduleCard({ tournament, onRegister }) {
  const cardRef = useRef(null)

  // Entrance animation — fade in with slight upward slide
  useEffect(() => {
    if (cardRef.current) {
      animate(cardRef.current, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        ease: 'outCubic',
      })
    }
  }, [])

  // ─── Status badge config ──────────────────────────────────────
  const statusConfig = {
    belum: {
      className: 'badge badge-belum',
      label: 'Belum Mulai',
      icon: 'solar:clock-square-bold-duotone',
    },
    jalan: {
      className: 'badge badge-jalan',
      label: 'Sedang Berjalan',
      icon: 'solar:play-bold',
    },
    selesai: {
      className: 'badge badge-selesai',
      label: 'Selesai',
      icon: 'solar:check-circle-bold',
    },
  }

  // ─── Category badge config ────────────────────────────────────
  const categoryConfig = {
    individu: {
      className: 'badge badge-individu',
      label: 'Individu/Anak',
      icon: 'solar:user-bold',
    },
    grup: {
      className: 'badge badge-grup',
      label: 'Grup/Bapak-Bapak',
      icon: 'solar:users-group-rounded-bold',
    },
  }

  const detailedCategoryConfig = {
    'anak_4_6': {
      className: 'badge bg-emerald-50 text-emerald-700 border border-emerald-200/50',
      label: 'Anak 4-6 Tahun',
      icon: 'solar:smile-circle-bold-duotone',
    },
    'anak_7_12': {
      className: 'badge bg-teal-50 text-teal-700 border border-teal-200/50',
      label: 'Anak 7-12 Tahun',
      icon: 'solar:smile-circle-bold-duotone',
    },
    'remaja_pria': {
      className: 'badge bg-blue-50 text-blue-700 border border-blue-200/50',
      label: 'Remaja Pria',
      icon: 'solar:user-bold-duotone',
    },
    'remaja_putri': {
      className: 'badge bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/50',
      label: 'Remaja Putri',
      icon: 'solar:user-bold-duotone',
    },
    'ibu_ibu': {
      className: 'badge bg-pink-50 text-pink-700 border border-pink-200/50',
      label: 'Ibu-Ibu',
      icon: 'solar:user-bold-duotone',
    },
    'bapak_bapak': {
      className: 'badge bg-amber-50 text-amber-800 border border-amber-200/50',
      label: 'Bapak-Bapak',
      icon: 'solar:user-bold-duotone',
    },
    'pasangan': {
      className: 'badge bg-indigo-50 text-indigo-700 border border-indigo-200/50',
      label: 'Pasangan / Grup',
      icon: 'solar:users-group-two-rounded-bold-duotone',
    },
  }

  // ─── Left border color by status ──────────────────────────────
  const borderColorMap = {
    jalan: 'border-l-merah-600',
    belum: 'border-l-abu-300',
    selesai: 'border-l-merah-200',
  }

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

  const status = statusConfig[tournament.status] || statusConfig.belum
  const resolvedCategory = getTournamentCategory(tournament)
  const category = detailedCategoryConfig[resolvedCategory] || categoryConfig[tournament.type] || categoryConfig.individu
  const borderColor = borderColorMap[tournament.status] || 'border-l-abu-300'

  /**
   * Format the schedule date as a readable Indonesian string.
   * Example: "Sabtu, 1 Agustus 2026 • 08:00 WIB"
   */
  const formatSchedule = (isoString) => {
    const date = new Date(isoString)

    // Day + full date
    const dateStr = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date)

    // Time portion
    const timeStr = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(date)

    return `${dateStr} • ${timeStr} WIB`
  }

  const tournamentDate = new Date(tournament.schedule)
  const now = new Date()
  const startOfAugust = new Date(tournamentDate.getFullYear(), 7, 1)
  const isRegistrationOpen = now >= startOfAugust

  return (
    <div
      ref={cardRef}
      className={`card p-4 md:p-5 border-l-4 ${borderColor} opacity-0 hover-lift`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Date / Time */}
      <p className="text-sm text-abu-500 flex items-center gap-1.5 mb-2">
        <Icon icon="solar:calendar-date-bold-duotone" className="w-4 h-4 text-abu-400" />
        {formatSchedule(tournament.schedule)}
      </p>

      {/* Tournament name */}
      <h4 className="font-heading text-lg font-bold text-abu-900 mb-1">
        {tournament.name}
      </h4>

      {/* Location */}
      <p className="text-sm text-abu-600 flex items-center gap-1.5 mb-2">
        <Icon icon="solar:map-pin-bold-duotone" className="w-4 h-4 text-abu-400" />
        {tournament.location}
      </p>

      {/* Penanggung Jawab */}
      {tournament.pj && (
        <p className="text-xs text-abu-500 flex items-center gap-1.5 mb-3">
          <Icon icon="solar:user-circle-bold-duotone" className="w-3.5 h-3.5 text-abu-400" />
          <span>Penanggung Jawab: <strong className="text-abu-700 font-semibold">{tournament.pj}</strong></span>
        </p>
      )}

      {/* Badges row & Register button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-abu-100">
        <div className="flex flex-wrap gap-2">
          <span className={`${status.className} flex items-center gap-1`}>
            {status.icon && <Icon icon={status.icon} className="w-3.5 h-3.5" />}
            {status.label}
          </span>
          <span className={`${category.className} flex items-center gap-1`}>
            {category.icon && <Icon icon={category.icon} className="w-3.5 h-3.5" />}
            {category.label}
          </span>
        </div>

          {/* Register button removed; registration handled by admin */}
      </div>
    </div>
  )
}
