import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { animate } from 'animejs'
import { Icon } from '@iconify/react'

// Target: 17 Agustus 2026, 08:00 WIB (UTC+7)
const TARGET_DATE = new Date('2026-08-17T08:00:00+07:00')

/**
 * CountdownTimer — Digital countdown to the RT 03 Independence Day event.
 * Displays days, hours, minutes, seconds with animated digit transitions.
 */
function CountdownTimer() {
  /**
   * Calculate remaining time between now and the target date.
   * Returns an object with days, hours, minutes, seconds.
   */
  const calculateTimeLeft = useCallback(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Target is August 17th, 08:00 WIB of the current year
    let target = new Date(`${currentYear}-08-17T08:00:00+07:00`)
    // End of 17th / Start of 18th
    let finishedDate = new Date(`${currentYear}-08-18T00:00:00+07:00`)
    // Reset date is August 19th, 00:00 WIB of the current year
    let resetDate = new Date(`${currentYear}-08-19T00:00:00+07:00`)

    let status = 'COUNTDOWN'

    if (now >= resetDate) {
      // If we are past August 19th, countdown to next year's August 17th
      target = new Date(`${currentYear + 1}-08-17T08:00:00+07:00`)
    } else if (now >= finishedDate && now < resetDate) {
      // August 18th
      status = 'FINISHED'
    } else if (now >= target && now < finishedDate) {
      // August 17th after 08:00
      status = 'STARTED'
    }

    const diff = target - now
    if (status !== 'COUNTDOWN') {
      return { status, days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    return {
      status,
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    }
  }, [])

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft)
  const prevTimeRef = useRef(timeLeft)

  // Refs for each digit element — used for Anime.js animations
  const daysRef = useRef(null)
  const hoursRef = useRef(null)
  const minutesRef = useRef(null)
  const secondsRef = useRef(null)

  // Tick every second, but only update state when the document is visible.
  useEffect(() => {
    const update = () => setTimeLeft(calculateTimeLeft())

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        update()
      }
    }

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        update()
      }
    }, 1000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [calculateTimeLeft])

  // Animate any digit that changed since the last tick
  useEffect(() => {
    const prev = prevTimeRef.current

    const refMap = {
      days: daysRef,
      hours: hoursRef,
      minutes: minutesRef,
      seconds: secondsRef,
    }

    Object.keys(timeLeft).forEach((key) => {
      const ref = refMap[key]
      if (prev[key] !== timeLeft[key] && ref.current) {
        animate(ref.current, {
          scale: [1.15, 1],
          duration: 400,
          ease: 'outElastic(1, 0.5)',
        })
      }
    })

    prevTimeRef.current = timeLeft
  }, [timeLeft])

  /**
   * Pad a number to at least `len` digits with leading zeros.
   * Days use 3 digits, everything else uses 2.
   */
  const pad = (n, len = 2) => String(n).padStart(len, '0')

  return (
    <div className="card p-6 md:p-8">
      {/* Section title */}
      <h3 className="font-heading text-lg md:text-xl font-bold text-abu-900 flex items-center justify-center gap-2 mb-6">
        <Icon icon="solar:clock-square-bold-duotone" className="w-5 h-5 text-merah-600" />
        Hitung Mundur Menuju 17-an
      </h3>

      {timeLeft.status === 'STARTED' ? (
        <div className="text-center py-8 flex flex-col items-center justify-center gap-3">
          <p className="text-3xl md:text-4xl font-bold font-heading text-merah-600 animate-pulse">
            Acara Sedang Dimulai
          </p>
          <p className="text-base md:text-lg text-abu-600 font-medium mt-2 max-w-lg text-center">
            Selamat mengikuti dan memeriahkan acara peringatan 17 Agustus! Semangat dan junjung tinggi sportivitas.
          </p>
        </div>
      ) : timeLeft.status === 'FINISHED' ? (
        <div className="text-center py-8 flex flex-col items-center justify-center gap-3">
          <p className="text-3xl md:text-4xl font-bold font-heading text-merah-600 animate-pulse">
            Terima Kasih Atas Partisipasinya!
          </p>
          <p className="text-base md:text-lg text-abu-600 font-medium mt-2 max-w-lg text-center">
            Terima kasih telah mengikuti seluruh rangkaian acara peringatan 17 Agustus yang telah sukses diselenggarakan pada tahun ini.
          </p>
        </div>
      ) : (
        /* Digit boxes row */
        <div className="flex items-center justify-center gap-3 md:gap-5">
          <Digit value={pad(timeLeft.days, 3)} label="Hari" innerRef={daysRef} />
          <Digit value={pad(timeLeft.hours)} label="Jam" innerRef={hoursRef} />
          <Digit value={pad(timeLeft.minutes)} label="Menit" innerRef={minutesRef} />
          <Digit value={pad(timeLeft.seconds)} label="Detik" innerRef={secondsRef} />
        </div>
      )}
    </div>
  )
}

// Memoized Digit component so only changed digits re-render
const Digit = memo(function Digit({ value, label, innerRef }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 md:gap-5">
        <div
          ref={innerRef}
          className="countdown-digit flex items-center justify-center
                     w-16 h-18 md:w-24 md:h-28
                     text-2xl md:text-4xl font-heading font-bold
                     select-none"
        >
          {value}
        </div>
      </div>

      <span className="mt-2 text-xs md:text-sm text-abu-500 font-medium">
        {label}
      </span>
    </div>
  )
}, (prev, next) => prev.value === next.value && prev.label === next.label)

export default memo(CountdownTimer)
