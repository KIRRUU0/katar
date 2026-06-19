import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'

const parseImages = (imageUrl) => {
  if (!imageUrl) return []
  if (imageUrl.startsWith('[') && imageUrl.endsWith(']')) {
    try {
      return JSON.parse(imageUrl)
    } catch (e) {
      console.error('Failed to parse image_url JSON:', e)
    }
  }
  if (imageUrl.includes(',')) {
    return imageUrl.split(',').map(u => u.trim()).filter(Boolean)
  }
  return [imageUrl.trim()].filter(Boolean)
}

/**
 * NewsCarousel — Horizontal swipeable news/gallery section
 *
 * Features:
 * - Fetches from Supabase `news` table, falls back to demo data
 * - CSS scroll-snap for mobile swipe, arrow buttons for desktop
 * - Stagger entrance animation when section enters viewport
 * - Card hover effects via .card class
 */


/** Format a date string to a readable Indonesian locale date */
const formatDate = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function NewsCarousel() {
  const [news, setNews] = useState([])
  const [selectedNews, setSelectedNews] = useState(null)
  const scrollRef = useRef(null)
  const sectionRef = useRef(null)
  const hasAnimated = useRef(false)

  // ── Fetch news ───────────────────────────────────────────
  useEffect(() => {
    const fetchNews = async () => {
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
          console.warn('NewsCarousel: Supabase query failed, using demo/local data.', err)
        }
      }

      // Merge with local storage news
      const localData = localStorage.getItem('katar_news_articles')
      let localNews = []
      if (localData) {
        try {
          localNews = JSON.parse(localData)
        } catch {
          localNews = []
        }
      }

      const combined = [...localNews, ...supabaseNews]
      if (combined.length > 0) {
        setNews(combined.slice(0, 3))
      } else {
        setNews([])
      }
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
            animate(cards, {
              opacity: [0, 1],
              translateY: ['1.5rem', '0rem'],
              delay: (_el, i) => i * 120,
              duration: 600,
              ease: 'outCubic',
            })
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

      {news.length === 0 ? (
        <div className="text-center py-10 text-abu-500 font-medium border border-dashed border-abu-200 rounded-2xl bg-abu-50/50 mx-4 md:mx-0">
          tidak ada berita atau data disini
        </div>
      ) : (
        /* ── Grid card row ─────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-4 md:px-0">
          {news.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.id}`}
              className="news-card card block overflow-hidden opacity-0 hover:scale-[1.02] transition-transform hover:shadow-md cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={parseImages(item.image_url)[0]}
                  alt={item.title}
                  className="w-full h-full object-cover rounded-t-2xl"
                  loading="lazy"
                />
                {/* Subtle gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-2xl" />
              </div>

              {/* Text content */}
              <div className="p-5">
                <h3 className="font-heading text-lg font-bold text-abu-900 leading-snug mb-2 line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-sm text-abu-500 leading-relaxed mb-4 line-clamp-2">
                  {item.description}
                </p>
                {item.created_at && (
                  <time
                    dateTime={item.created_at}
                    className="text-xs text-abu-400 font-semibold flex items-center gap-1"
                  >
                    <Icon icon="solar:calendar-bold" className="w-3.5 h-3.5" />
                    {formatDate(item.created_at)}
                  </time>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
