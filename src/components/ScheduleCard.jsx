import { memo, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { getNormalizedCategory } from './admin/adminUtils'

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
function ScheduleCard({ tournament, customCategories = [] }) {
  const getCatLabel = (id, fallback) => {
    return customCategories.find(c => c.id === id)?.name || fallback
  }

  const resolvedCategory = useMemo(
    () => getNormalizedCategory(tournament.category, tournament.type, tournament.name),
    [tournament.category, tournament.type, tournament.name]
  )

  const formattedSchedule = useMemo(
    () => formatScheduleRange(tournament.schedule, tournament.end_time),
    [tournament.schedule, tournament.end_time]
  )

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
      label: getCatLabel('anak_4_6', 'Anak 4-6 Tahun'),
      icon: 'solar:smile-circle-bold-duotone',
    },
    'anak_7_12': {
      className: 'badge bg-teal-50 text-teal-700 border border-teal-200/50',
      label: getCatLabel('anak_7_12', 'Anak 7-12 Tahun'),
      icon: 'solar:smile-circle-bold-duotone',
    },
    'remaja_pria': {
      className: 'badge bg-blue-50 text-blue-700 border border-blue-200/50',
      label: getCatLabel('remaja_pria', 'Remaja Pria'),
      icon: 'solar:user-bold-duotone',
    },
    'remaja_putri': {
      className: 'badge bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/50',
      label: getCatLabel('remaja_putri', 'Remaja Putri'),
      icon: 'solar:user-bold-duotone',
    },
    'ibu_ibu': {
      className: 'badge bg-pink-50 text-pink-700 border border-pink-200/50',
      label: getCatLabel('ibu_ibu', 'Ibu-Ibu'),
      icon: 'solar:user-bold-duotone',
    },
    'bapak_bapak': {
      className: 'badge bg-amber-50 text-amber-800 border border-amber-200/50',
      label: getCatLabel('bapak_bapak', 'Bapak-Bapak'),
      icon: 'solar:user-bold-duotone',
    },
    'pasangan': {
      className: 'badge bg-indigo-50 text-indigo-700 border border-indigo-200/50',
      label: getCatLabel('pasangan', 'Pasangan / Grup'),
      icon: 'solar:users-group-two-rounded-bold-duotone',
    },
  }

  // ─── Left border color by status ──────────────────────────────
  const borderColorMap = {
    jalan: 'border-l-merah-600',
    belum: 'border-l-abu-300',
    selesai: 'border-l-merah-200',
  }

  const status = statusConfig[tournament.status] || statusConfig.belum
  const category = detailedCategoryConfig[resolvedCategory] || categoryConfig[tournament.type] || categoryConfig.individu
  const borderColor = borderColorMap[tournament.status] || 'border-l-abu-300'

  /**
   * Format the start and end dates as a readable Indonesian range.
   * Example:
   * - "Sabtu, 1 Agustus 2026 • 08:00 - 10:00 WIB" (same day)
   * - "Sabtu, 1 Agustus 2026 • 08:00 WIB - Minggu, 2 Agustus 2026 • 10:00 WIB" (different days)
   * - "Sabtu, 1 Agustus 2026 • 08:00 WIB" (only start time)
   * - "Waktu belum ditentukan" (no schedule)
   */
  const formatScheduleRange = (startIso, endIso) => {
    if (!startIso) return 'Waktu belum ditentukan'

    const startDate = new Date(startIso)

    // Date formatter
    const formatDateStr = (date) =>
      new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }).format(date)

    // Time formatter
    const formatTimeStr = (date) =>
      new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      }).format(date)

    const startDayStr = formatDateStr(startDate)
    const startTimeStr = formatTimeStr(startDate)

    if (!endIso) {
      return `${startDayStr} • ${startTimeStr} WIB`
    }

    const endDate = new Date(endIso)
    const endDayStr = formatDateStr(endDate)
    const endTimeStr = formatTimeStr(endDate)

    if (startDayStr === endDayStr) {
      return `${startDayStr} • ${startTimeStr} - ${endTimeStr} WIB`
    } else {
      return `${startDayStr} • ${startTimeStr} WIB - ${endDayStr} • ${endTimeStr} WIB`
    }
  }



  return (
    <div
      className={`card p-4 md:p-5 border-l-4 ${borderColor} hover-lift`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Date / Time */}
      <p className="text-sm text-abu-500 flex items-center gap-1.5 mb-2">
        <Icon icon="solar:calendar-date-bold-duotone" className="w-4 h-4 text-abu-400" />
        {formattedSchedule}
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

export default memo(ScheduleCard)
