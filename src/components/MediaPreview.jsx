import { memo, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate } from 'animejs'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'
import { parseImages } from './admin/adminUtils'


function MediaPreview() {
  const [photos, setPhotos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const sectionRef = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    async function loadPhotos() {
      setIsLoading(true)

      // Collect all news image URLs to exclude from gallery
      const newsUrls = new Set()

      let supabasePhotos = []
      if (isSupabaseConfigured()) {
        try {
          // Fetch news URLs for filtering
          const { data: newsData } = await supabase.from('news').select('image_url')
          newsData?.forEach(n => {
            parseImages(n.image_url).forEach(url => {
              if (url) newsUrls.add(url.trim())
            })
          })

          const { data, error } = await supabase
            .from('media')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)
          if (!error && data) {
            supabasePhotos = data
          }
        } catch (err) {
          console.warn('MediaPreview: Supabase query failed', err)
        }
      }

      // Also collect local news URLs for filtering
      const localNewsData = localStorage.getItem('katar_news_articles')
      if (localNewsData) {
        try {
          const localNews = JSON.parse(localNewsData)
          localNews.forEach(n => {
            parseImages(n.image_url).forEach(url => {
              if (url) newsUrls.add(url.trim())
            })
          })
        } catch {
          // ignore
        }
      }

      const localData = localStorage.getItem('katar_media_photos')
      let localPhotos = []
      if (localData) {
        try {
          localPhotos = JSON.parse(localData)
        } catch {
          localPhotos = []
        }
      }

      // Merge, filter out news images, and deduplicate
      const allEntries = [...localPhotos, ...supabasePhotos].filter((entry) => {
        const entryUrl = (entry.image_url || '').trim()
        if (!entryUrl) return false
        // Exclude entries whose images all belong to news
        const mediaUrls = parseImages(entryUrl)
        if (mediaUrls.length > 0 && mediaUrls.every(url => newsUrls.has(url.trim()))) {
          return false
        }
        return true
      })

      const seen = new Set()
      const deduped = []
      allEntries.forEach(entry => {
        const urls = parseImages(entry.image_url)
        const primaryUrl = urls[0] ? urls[0].trim() : ''
        if (primaryUrl && !seen.has(primaryUrl)) {
          seen.add(primaryUrl)
          deduped.push(entry)
        }
      })

      // Sort by date/created_at descending
      deduped.sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || 0)
        const dateB = new Date(b.date || b.created_at || 0)
        return dateB - dateA
      })

      setPhotos(deduped.slice(0, 4))
      setIsLoading(false)
    }

    loadPhotos()
  }, [])

  // Stagger entrance animation on intersection
  useEffect(() => {
    if (!sectionRef.current || !photos.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true

          const cards = sectionRef.current.querySelectorAll('.media-card')
          if (cards.length) {
            animate(cards, {
              opacity: [0, 1],
              scale: [0.95, 1],
              translateY: ['1.5rem', '0rem'],
              delay: (_el, i) => i * 100,
              duration: 600,
              ease: 'outBack',
            })
          }
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [photos])

  return (
    <section ref={sectionRef} className="py-10 md:py-14 border-t border-abu-200">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6 px-4 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-abu-900 flex items-center gap-2">
          <Icon icon="solar:camera-bold-duotone" className="w-6 h-6 text-abu-900" />
          Galeri Foto Kegiatan
        </h2>

        <Link
          to="/media"
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
      ) : photos.length === 0 ? (
        <div className="text-center py-10 text-abu-500 font-medium border border-dashed border-abu-200 rounded-2xl bg-abu-50/50 mx-4 md:mx-0">
          tidak ada media atau gambar disini
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-0">
          {photos.map((item) => (
            <Link
              key={item.id}
              to="/media"
              className="media-card group relative block h-48 md:h-60 overflow-hidden rounded-2xl shadow-sm hover:shadow-md cursor-pointer transform opacity-0"
              style={{ willChange: 'transform, opacity' }}
            >
              <img
                src={parseImages(item.image_url)[0]}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              {/* Overlay with title — uses dedicated CSS for guaranteed visibility */}
              <div className="media-card-overlay">
                <div className="media-card-info">
                  <span className="media-card-badge inline-flex items-center self-start text-[10px] uppercase font-extrabold tracking-wider bg-merah-600 text-white px-2 py-0.5 rounded">
                    Tahun {item.year}
                  </span>
                  <h3 className="media-card-title">
                    {item.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default memo(MediaPreview)
