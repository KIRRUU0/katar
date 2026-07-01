import { memo, useEffect, useRef, useState } from 'react'
import LazyImage from './LazyImage'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'
import { generateSlug } from '../lib/slug'
import { parseImages } from './admin/adminUtils'
import { formatDate } from '../lib/formatUtils'

/**
 * NewsCarousel — Horizontal swipeable news/gallery section
 *
 * Features:
 * - Fetches from Supabase `news` table, falls back to demo data
 * - CSS scroll-snap for mobile swipe, arrow buttons for desktop
 * - Stagger entrance animation when section enters viewport
 * - Card hover effects via .card class
 */



function NewsCarousel() {
  const [news, setNews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const sectionRef = useRef(null)
  const hasAnimated = useRef(false)

  // ── Fetch news ───────────────────────────────────────────
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true)
      let supabaseNews = []
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)
          if (!error && data) {
            supabaseNews = data
          }
        } catch (err) {
          console.warn('NewsCarousel: Supabase query failed.', err)
        }
      }

      // Sort news by date/created_at descending (newest first)
      const combined = [...supabaseNews]
      combined.sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || 0)
        const dateB = new Date(b.date || b.created_at || 0)
        return dateB - dateA
      })

      if (combined.length > 0) {
        setNews(combined.slice(0, 3))
      } else {
        setNews([])
      }
      setIsLoading(false)
    }

    fetchNews()
  }, [])

  // ── Stagger entrance animation on intersection ───────────
  useEffect(() => {
    if (!sectionRef.current || !news.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true

          // Select all card elements inside the container
          const cards = sectionRef.current.querySelectorAll('.news-card')
          if (cards.length) {
            import('animejs').then(({ animate }) => {
              animate(cards, {
                opacity: [0, 1],
                translateY: ['1.5rem', '0rem'],
                delay: (_el, i) => i * 120,
                duration: 600,
                ease: 'outCubic',
              })
            }).catch(() => {})
          }
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [news])

  return (
    <section ref={sectionRef} className="py-10 md:py-14">
      {/* ── Section header ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 px-4 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-abu-900 flex items-center gap-2">
          <Icon icon="solar:document-text-bold-duotone" className="w-6 h-6 text-abu-900" />
          Berita Kegiatan Terbaru
        </h2>

        <Link
          to="/news"
          className="text-sm font-bold text-merah-600 hover:text-merah-700 flex items-center gap-1.5 focus-ring px-3 py-1.5 rounded-lg border border-merah-200 bg-white hover:bg-merah-50 transition-all min-h-[36px]"
        >
          <span>Selengkapnya</span>
          <Icon icon="solar:arrow-right-bold" className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 mx-4 md:mx-0">
          <div className="w-10 h-10 border-4 border-abu-200 border-t-merah-600 rounded-full animate-spin" />
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-10 text-abu-500 font-medium border border-dashed border-abu-200 rounded-2xl bg-abu-50/50 mx-4 md:mx-0">
          tidak ada berita atau data disini
        </div>
      ) : (
        /* ── Grid card row ─────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-4 md:px-0">
          {news.map((item, i) => {
            const imageUrl = parseImages(item.image_url)[0]
            const srcSet = imageUrl ? `${imageUrl} 1x, ${imageUrl} 2x` : undefined
            const sizes = '(max-width: 768px) 100vw, 33vw'
            return (
              <Link
                key={item.id}
                to={`/news/${generateSlug(item.title) || item.id}`}
                className="news-card card flex flex-col overflow-hidden border border-abu-150 hover:scale-[1.02] transition-transform hover:shadow-md cursor-pointer opacity-0"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-abu-100 flex-shrink-0">
                  <LazyImage
                    src={imageUrl}
                    srcSet={srcSet}
                    sizes={sizes}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-t-2xl"
                    fetchPriority={i === 0 ? 'high' : 'low'}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    forceVisible={i === 0}
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent rounded-t-2xl" />
                </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-heading text-lg font-bold text-abu-900 leading-snug mb-2 line-clamp-2 min-h-[3.25rem]">
                  {item.title}
                </h3>
                <p className="text-sm text-abu-600 leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">
                  {item.description}
                </p>
                {(item.date || item.created_at) && (
                  <time
                    dateTime={item.date || item.created_at}
                    className="text-xs text-abu-500 font-semibold flex items-center gap-1 mt-auto pt-2 border-t border-abu-100"
                  >
                    <Icon icon="solar:calendar-bold" className="w-3.5 h-3.5 text-abu-450" />
                    {formatDate(item.date || item.created_at)}
                  </time>
                )}
              </div>
            </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default memo(NewsCarousel)
