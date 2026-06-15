import { useState, useEffect } from 'react'
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

const DEMO_NEWS = [
  {
    id: '1',
    title: 'Rapat Perdana Panitia 17-an 2026',
    description: 'Rapat koordinasi panitia menyepakati rangkaian kompetisi kemerdekaan yang akan diselenggarakan mulai awal Agustus 2026.',
    image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640',
    created_at: '2026-06-10T10:00:00',
  },
  {
    id: '2',
    title: 'Gotong Royong Bersihkan Lapangan',
    description: 'Warga RT 03 bergotong royong membersihkan lapangan utama yang akan menjadi pusat arena perlombaan Semarak Agustus.',
    image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=640',
    created_at: '2026-06-08T09:00:00',
  },
  {
    id: '3',
    title: 'Latihan Futsal Tim Gang 1',
    description: 'Tim futsal perwakilan Gang 1 mengadakan sesi latihan intensif di lapangan utama untuk turnamen antar gang.',
    image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=640',
    created_at: '2026-06-05T16:00:00',
  },
  {
    id: '4',
    title: 'Dekorasi Merah Putih Dimulai',
    description: 'Karang taruna bersama warga RT 03 mulai menghias jalan utama dengan bendera merah putih dan umbul-umbul.',
    image_url: 'https://images.unsplash.com/photo-1577401132921-cb39bb12c7e0?w=640',
    created_at: '2026-06-01T08:00:00',
  },
]

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

export default function NewsListPage() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true)
      let supabaseNews = []
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })
          if (!error && data?.length) {
            supabaseNews = data
          }
        } catch (err) {
          console.warn('NewsListPage: Supabase query failed', err)
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
        setNews(combined)
      } else {
        setNews(DEMO_NEWS)
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
        <div className="card p-12 text-center">
          <p className="text-abu-500">Belum ada berita kegiatan diunggah.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {news.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.id}`}
              className="card bg-white overflow-hidden group hover:scale-[1.01] hover:shadow-md transition-all border border-abu-150 flex flex-col h-full"
            >
              {/* Image Frame */}
              <div className="relative h-48 sm:h-52 overflow-hidden bg-abu-100 flex-shrink-0">
                <img
                  src={parseImages(item.image_url)[0]}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors" />
              </div>
              {/* Card content */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-heading text-lg font-bold text-abu-900 mb-2 group-hover:text-merah-600 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm text-abu-500 mb-4 line-clamp-3 leading-relaxed flex-grow">
                  {item.description}
                </p>
                {item.created_at && (
                  <time className="text-xs text-abu-400 font-semibold mt-auto pt-2 block border-t border-abu-100">
                    {formatDate(item.created_at)}
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
