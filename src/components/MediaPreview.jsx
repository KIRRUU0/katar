import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate } from 'animejs'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'

const parseImages = (imageUrl) => {
  if (!imageUrl) return []
  
  const getDirectImageUrl = (url) => {
    if (!url) return ''
    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{25,})/i
    const match = url.match(driveRegex)
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`
    }
    return url
  }

  let urls = []
  if (imageUrl.startsWith('[') && imageUrl.endsWith(']')) {
    try {
      urls = JSON.parse(imageUrl)
    } catch (e) {
      console.error('Failed to parse image_url JSON:', e)
    }
  } else if (imageUrl.includes(',')) {
    urls = imageUrl.split(',').map(u => u.trim()).filter(Boolean)
  } else {
    urls = [imageUrl.trim()].filter(Boolean)
  }

  return urls.map(getDirectImageUrl)
}


export default function MediaPreview() {
  const [photos, setPhotos] = useState([])
  const sectionRef = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    async function loadPhotos() {
      let supabasePhotos = []
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('media')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)
          if (!error && data) {
            supabasePhotos = data
          }
        } catch (err) {
          console.warn('MediaPreview: Supabase query failed', err)
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

      const combined = [...localPhotos, ...supabasePhotos]
      setPhotos(combined.slice(0, 4))
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

      {photos.length === 0 ? (
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
              />
              {/* Dark Overlay with Title */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 rounded-2xl opacity-90 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] uppercase font-extrabold text-merah-400 tracking-wider mb-1">
                  Tahun {item.year}
                </span>
                <h3 className="text-xs md:text-sm font-heading font-bold text-white line-clamp-2 leading-tight">
                  {item.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
