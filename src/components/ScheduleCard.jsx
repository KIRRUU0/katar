import { memo, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { getNormalizedCategory, getCategoryStyle } from './admin/adminUtils'

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
  const resolvedCategory = useMemo(
    () => getNormalizedCategory(tournament.category, tournament.type, tournament.name),
    [tournament.category, tournament.type, tournament.name]
  )

  const formattedSchedule = useMemo(() => formatScheduleRange(tournament.schedule, tournament.end_time), [
    tournament.schedule,
    tournament.end_time,
  ])

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

  // ─── Left border color by status ──────────────────────────────
  const borderColorMap = {
    jalan: 'border-l-merah-600',
    belum: 'border-l-abu-300',
    selesai: 'border-l-merah-200',
  }

  const status = statusConfig[tournament.status] || statusConfig.belum
  const borderColor = borderColorMap[tournament.status] || 'border-l-abu-300'

  // ─── Category badge styling ────────────────────────────────────
  const category = useMemo(() => {
    if (customCategories.length === 0) return null
    const catObj = customCategories.find((c) => c.id === resolvedCategory)
    if (catObj) {
      return getCategoryStyle(catObj.name, catObj.type)
    }
    return getCategoryStyle(resolvedCategory, tournament.type)
  }, [resolvedCategory, customCategories, tournament.type])

  

// Move formatScheduleRange to module-level to avoid re-creation on each render
function formatScheduleRange(startIso, endIso) {
  if (!startIso) return 'Waktu belum ditentukan'

  const startDate = new Date(startIso)

  const formatDateStr = (date) =>
    new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date)

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



  const titleId = `schedule-${tournament.id || String(tournament.name).replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div
      role="article"
      aria-labelledby={titleId}
      className={`card p-4 md:p-5 border-l-4 ${borderColor} hover-lift`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Date / Time */}
      <p className="text-sm text-abu-500 flex items-center gap-1.5 mb-2">
        <Icon icon="solar:calendar-date-bold-duotone" className="w-4 h-4 text-abu-400" />
        {formattedSchedule}
      </p>

      {/* Tournament name */}
      <h4 id={titleId} className="font-heading text-lg font-bold text-abu-900 mb-1">
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
          {category && category.label && (
            <span className={`${category.className} flex items-center gap-1`}>
              {category.icon && <Icon icon={category.icon} className="w-3.5 h-3.5" />}
              {category.label}
            </span>
          )}
        </div>

          {/* Register button removed; registration handled by admin */}
      </div>
    </div>
  )
}

export default memo(ScheduleCard)
