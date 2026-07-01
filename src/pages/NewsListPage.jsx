import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'
import { generateSlug } from '../lib/slug'
import { parseImages } from '../components/admin/adminUtils'
import { formatDate } from '../lib/formatUtils'

const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

export default function NewsListPage() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Berita & Kegiatan - Karang Taruna RT 02/03'
    const fetchNews = async () => {
      setLoading(true)
      let supabaseNews = []
      let hasSupabase = false
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })
          if (!error) {
            supabaseNews = data || []
            hasSupabase = true
          }
        } catch (err) {
          console.warn('NewsListPage: Supabase query failed', err)
        }
      }

      // Sort news by date/created_at descending (newest first)
      const combined = [...supabaseNews]
      combined.sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || 0)
        const dateB = new Date(b.date || b.created_at || 0)
        return dateB - dateA
      })

      if (combined.length > 0 || hasSupabase) {
        setNews(combined)
      } else {
        setNews([])
      }
      setLoading(false)
    }

    fetchNews()
  }, [])

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* Page Header */}
      <div className="mb-8 md:mb-10 text-center md:text-left">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-abu-900 flex items-center justify-center md:justify-start gap-2">
          <Icon icon="solar:gallery-bold-duotone" className="w-8 h-8 text-merah-600" />
          Berita &amp; Kegiatan Karang Taruna
        </h1>
        <p className="text-abu-500 text-sm md:text-base mt-2 max-w-2xl">
          Informasi terkini mengenai agenda rapat, kerja bakti, turnamen perlombaan, dan kegiatan positif pemuda-pemudi RT 02/03.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="card bg-white overflow-hidden border border-abu-150 flex flex-col h-[380px] shadow-sm">
              {/* Image skeleton */}
              <div className="h-48 sm:h-52 w-full animate-shimmer" />
              {/* Content skeleton */}
              <div className="p-5 flex flex-col flex-grow space-y-3">
                <div className="w-3/4 h-5 rounded animate-shimmer" />
                <div className="w-full h-3.5 rounded animate-shimmer" />
                <div className="w-full h-3.5 rounded animate-shimmer" />
                <div className="w-1/2 h-3.5 rounded animate-shimmer" />
                <div className="w-24 h-3 rounded animate-shimmer mt-auto pt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center border border-dashed border-abu-300 bg-white rounded-3xl animate-fade-in">
          <img src="/empty-berita.svg" alt="Belum ada berita" className="w-32 h-32 mb-4 object-contain" />
          <p className="text-abu-850 font-heading text-lg font-bold">
            Belum ada berita
          </p>
          <p className="text-abu-500 text-sm mt-1 max-w-sm">
            Saat ini belum ada berita atau kegiatan yang diunggah. Silakan hubungi admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {news.map((item) => (
            <Link
              key={item.id}
              to={`/news/${generateSlug(item.title) || item.id}`}
              className="card bg-white overflow-hidden group hover:scale-[1.01] hover:shadow-md transition-all border border-abu-150 flex flex-col h-full"
            >
              {/* Image Frame */}
              <div className="relative h-48 sm:h-52 overflow-hidden bg-abu-100 flex-shrink-0">
                <img
                  src={parseImages(item.image_url)[0]}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors" />
              </div>
              {/* Card content */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-heading text-lg font-bold text-abu-900 mb-2 group-hover:text-merah-600 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm text-abu-500 mb-4 line-clamp-3 leading-relaxed flex-grow">
                  {stripHtml(item.description)}
                </p>
                {(item.date || item.created_at) && (
                  <time className="text-xs text-abu-400 font-semibold mt-auto pt-2 block border-t border-abu-100">
                    {formatDate(item.date || item.created_at)}
                  </time>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
