import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { Icon } from '@iconify/react'

/**
 * FinanceCard — Single finance statistic with animated counter
 *
 * Props:
 * @param {string}  title  — Label (e.g. "Pemasukan", "Pengeluaran", "Saldo")
 * @param {number}  amount — Target numeric value in Rupiah
 * @param {string}  type   — 'masuk' | 'keluar' | 'saldo' (determines accent color)
 * @param {string}  icon   — Emoji icon displayed above the title
 * @param {number}  delay  — Delay (ms) before counter starts (default 0)
 *
 * Features:
 * - Glassmorphism card (glass-card class)
 * - Counter animates from 0 → amount on first viewport intersection
 * - Formatted as Indonesian Rupiah (Rp)
 */

/** Color map per finance type */
const TYPE_STYLES = {
  masuk: {
    accent: '#059669',         // emerald-600
    bg: 'bg-green-50',
    ring: 'ring-green-200',
  },
  keluar: {
    accent: 'var(--color-merah-600)', // merah-600
    bg: 'bg-merah-50',
    ring: 'ring-merah-200',
  },
  saldo: {
    accent: 'var(--color-emas)',      // gold
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
  },
}

/** Rupiah formatter */
const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)

export default function FinanceCard({ title, amount, type, icon, delay = 0 }) {
  const [displayAmount, setDisplayAmount] = useState(0)
  const cardRef = useRef(null)
  const hasAnimated = useRef(false)

  const styles = TYPE_STYLES[type] || TYPE_STYLES.saldo

  // ── Counter animation on intersection ────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true

          // Animate a plain object; update React state on each frame
          const obj = { val: 0 }
          animate(obj, {
            val: amount,
            duration: 1500,
            delay: delay,
            ease: 'outExpo',
            onUpdate: () => setDisplayAmount(Math.floor(obj.val)),
          })
        }
      },
      { threshold: 0.3 }
    )

    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [amount, delay])

  return (
    <div
      ref={cardRef}
      className="glass-card p-6 flex flex-col items-center text-center transition-transform hover:scale-[1.02]"
    >
      {/* Icon circle */}
      <div
        className={`
          w-14 h-14 rounded-full flex items-center justify-center mb-4
          ${styles.bg} ring-1 ${styles.ring}
        `}
      >
        <Icon icon={icon} className="w-7 h-7 text-merah-600" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-abu-500 uppercase tracking-wider mb-2">
        {title}
      </h3>

      {/* Animated amount */}
      <p
        className="text-2xl md:text-3xl font-bold font-heading tabular-nums"
        style={{ color: styles.accent }}
      >
        {formatRupiah(displayAmount)}
      </p>
    </div>
  )
}
