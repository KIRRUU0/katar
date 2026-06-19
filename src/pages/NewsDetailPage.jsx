import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const parseImages = (imageUrl) => {
  if (!imageUrl) return []
  
  const getDirectImageUrl = (url) => {
    if (!url) return ''
    const trimmed = url.trim()
    const match = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=view&id=|uc\?export=download&id=)|lh3\.googleusercontent\.com\/d\/|docs\.google\.com\/uc\?export=download&id=)([a-zA-Z0-9_-]{25,})/i)
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`
    }
    return trimmed
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

export default function NewsDetailPage() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [otherNews, setOtherNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePhotoIndex, setActivePhotoIndex] = useState(null)
  const galleryScrollRef = useRef(null)

  // All parsed images for current article
  const allImages = article ? parseImages(article.image_url) : []

  // Navigate lightbox
  const goToPrev = useCallback(() => {
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
  }, [allImages.length])

  const goToNext = useCallback(() => {
    setActivePhotoIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
  }, [allImages.length])

  // Toggle body class to hide LiveTicker and disable scroll when lightbox is open
  useEffect(() => {
    if (activePhotoIndex !== null) {
      document.body.classList.add('lightbox-open')
      const handleKey = (e) => {
        if (e.key === 'ArrowLeft') goToPrev()
        else if (e.key === 'ArrowRight') goToNext()
        else if (e.key === 'Escape') setActivePhotoIndex(null)
      }
      window.addEventListener('keydown', handleKey)
      return () => {
        document.body.classList.remove('lightbox-open')
        window.removeEventListener('keydown', handleKey)
      }
    } else {
      document.body.classList.remove('lightbox-open')
    }
    return () => {
      document.body.classList.remove('lightbox-open')
    }
  }, [activePhotoIndex, goToPrev, goToNext])

  // Format date
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

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true)
      let found = null
      let others = []

      // 1. Check local storage first
      const localData = localStorage.getItem('katar_news_articles')
      let localNews = []
      if (localData) {
        try {
          localNews = JSON.parse(localData)
          found = localNews.find((item) => String(item.id) === String(id))
        } catch {
          localNews = []
        }
      }

      // 2. Check Supabase
      let supabaseNews = []
      if (isSupabaseConfigured()) {
        try {
          if (!found) {
            const { data, error } = await supabase
              .from('news')
              .select('*')
              .eq('id', id)
              .single()

            if (!error && data) {
              found = data
            }
          }

          // Fetch other news for sidebar
          const { data: othersData } = await supabase
            .from('news')
            .select('*')
            .neq('id', id)
            .limit(3)
          supabaseNews = othersData || []
        } catch (err) {
          console.warn('NewsDetailPage: Supabase query failed', err)
        }
      }

      const combinedOthers = [
        ...localNews.filter((item) => String(item.id) !== String(id)),
        ...supabaseNews
      ]

      others = combinedOthers.slice(0, 3)

      setArticle(found || null)
      setOtherNews(others)
      setLoading(false)
    }

    fetchArticle()
  }, [id])

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Back to Home Button Skeleton */}
        <div className="mb-6">
          <div className="w-40 h-[44px] rounded-xl bg-white border border-abu-200 animate-shimmer" />
        </div>

        {/* Main Layout Skeleton */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 animate-pulse">
          {/* Left Column: Article Details Skeleton */}
          <div className="lg:w-2/3">
            {/* Article Banner Image Skeleton */}
            <div className="h-64 sm:h-96 w-full rounded-2xl animate-shimmer mb-6 md:mb-8 bg-abu-100" />

            {/* Metadata Skeleton */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-36 h-6 rounded-md animate-shimmer bg-abu-100" />
              <div className="w-24 h-4 rounded animate-shimmer ml-2 bg-abu-100" />
            </div>

            {/* Title Skeleton */}
            <div className="w-5/6 h-9 rounded animate-shimmer mb-6 bg-abu-100" />

            {/* Description Paragraph Skeletons */}
            <div className="space-y-3">
              <div className="w-full h-4 rounded animate-shimmer bg-abu-100" />
              <div className="w-full h-4 rounded animate-shimmer bg-abu-100" />
              <div className="w-11/12 h-4 rounded animate-shimmer bg-abu-100" />
              <div className="w-full h-4 rounded animate-shimmer bg-abu-100" />
              <div className="w-10/12 h-4 rounded animate-shimmer bg-abu-100" />
              <div className="w-3/4 h-4 rounded animate-shimmer bg-abu-100" />
            </div>
          </div>

          {/* Right Column: Other Activities Skeleton */}
          <div className="lg:w-1/3 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:border-abu-200 lg:pl-8">
            <div className="w-44 h-7 rounded animate-shimmer mb-6 bg-abu-100" />

            <div className="flex flex-col gap-5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex gap-3.5 items-start bg-white p-3 rounded-xl border border-abu-150 shadow-sm">
                  {/* Thumb Skeleton */}
                  <div className="w-20 h-20 rounded-lg animate-shimmer flex-shrink-0 bg-abu-100" />
                  {/* Text info Skeleton */}
                  <div className="flex-grow space-y-2">
                    <div className="w-full h-4 rounded animate-shimmer bg-abu-100" />
                    <div className="w-5/6 h-4 rounded animate-shimmer bg-abu-100" />
                    <div className="w-16 h-3 rounded animate-shimmer mt-2 bg-abu-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-abu-900 mb-4">Artikel Tidak Ditemukan</h2>
        <p className="text-abu-500 mb-6">Maaf, artikel yang Anda cari tidak ditemukan atau telah dihapus.</p>
        <Link to="/" className="btn btn-primary inline-flex items-center gap-2">
          Kembali ke Home
        </Link>
      </div>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* Back to Home Button */}
      <div className="mb-6">
        <Link
          to="/"
          className="btn btn-secondary inline-flex items-center gap-2 min-h-[44px]"
        >
          ✕ Kembali ke Home
        </Link>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Left Column: Article Details */}
        <article className="lg:w-2/3">
          {/* Article Banner Image */}
          <div className="relative h-64 sm:h-96 w-full rounded-2xl overflow-hidden shadow-md mb-6 md:mb-8">
            <img
              src={parseImages(article.image_url)[0]}
              alt={article.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-merah-600 bg-merah-50 border border-merah-100 font-bold px-2.5 py-1 rounded-md uppercase flex items-center gap-1">
              <Icon icon="solar:gallery-bold-duotone" className="w-3.5 h-3.5" />
              Kegiatan Karang Taruna
            </span>
            <time className="text-sm text-abu-400 font-medium ml-2">
              {formatDate(article.date || article.created_at)}
            </time>
          </div>

          {/* Title */}
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-abu-900 leading-tight mb-6">
            {article.title}
          </h1>

          {/* Description */}
          <p className="text-abu-600 text-sm sm:text-base leading-relaxed whitespace-pre-line md:text-lg">
            {article.description}
          </p>

          {/* Secondary images gallery */}
          {allImages.length > 1 && (
            <div className="mt-8 pt-8 border-t border-abu-200">
              <h3 className="font-heading text-lg font-bold text-abu-900 mb-4 flex items-center gap-2">
                <Icon icon="solar:gallery-bold-duotone" className="w-5 h-5 text-merah-600" />
                Galeri Foto Terkait
                <span className="text-sm font-normal text-abu-400 ml-1">({allImages.length} foto)</span>
              </h3>
              <div className="relative">
                {/* Scroll left button */}
                <button
                  onClick={() => { galleryScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' }) }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md border border-abu-200 flex items-center justify-center hover:bg-merah-50 transition-colors cursor-pointer"
                  aria-label="Geser kiri"
                >
                  <Icon icon="solar:alt-arrow-left-bold" className="w-4 h-4 text-abu-700" />
                </button>
                {/* Scroll right button */}
                <button
                  onClick={() => { galleryScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' }) }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md border border-abu-200 flex items-center justify-center hover:bg-merah-50 transition-colors cursor-pointer"
                  aria-label="Geser kanan"
                >
                  <Icon icon="solar:alt-arrow-right-bold" className="w-4 h-4 text-abu-700" />
                </button>
                <div
                  ref={galleryScrollRef}
                  className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-abu-300 scrollbar-track-abu-100 px-10"
                >
                  {allImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative snap-start min-w-[180px] sm:min-w-[220px] h-28 sm:h-36 rounded-xl overflow-hidden shadow-sm group cursor-pointer hover:shadow-md transition-all bg-abu-50 flex-shrink-0 ring-2 ${
                        activePhotoIndex === idx ? 'ring-merah-500' : 'ring-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      {/* Image number badge */}
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </article>

        {/* Right Column: Other Activities */}
        <aside className="lg:w-1/3 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:border-abu-200 lg:pl-8">
          <h3 className="font-heading text-lg md:text-xl font-bold text-abu-900 flex items-center gap-2 mb-6">
            <Icon icon="solar:gallery-bold-duotone" className="w-5 h-5 text-merah-600" />
            Kegiatan Lainnya
          </h3>

          <div className="flex flex-col gap-5">
            {otherNews.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="group flex gap-3.5 items-start bg-white p-3 rounded-xl border border-abu-150 transition-all hover:shadow-sm hover:scale-[1.01]"
              >
                {/* Thumb */}
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={parseImages(item.image_url)[0]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Text info */}
                <div>
                  <h4 className="font-heading text-sm font-semibold text-abu-900 group-hover:text-merah-600 transition-colors line-clamp-2 leading-snug mb-1">
                    {item.title}
                  </h4>
                  <time className="text-xs text-abu-400 font-medium">
                    {formatDate(item.created_at)}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
      {/* Lightbox for news gallery with slider navigation */}
      {activePhotoIndex !== null && allImages[activePhotoIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setActivePhotoIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-abu-800 hover:bg-merah-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md border border-abu-700 z-10"
            aria-label="Tutup"
          >
            <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
          </button>

          {/* Image counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/80 text-sm font-semibold bg-black/50 px-3 py-1 rounded-full z-10">
            {activePhotoIndex + 1} / {allImages.length}
          </div>

          {/* Previous button */}
          {allImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev() }}
              className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm z-10"
              aria-label="Foto sebelumnya"
            >
              <Icon icon="solar:alt-arrow-left-bold" className="w-7 h-7" />
            </button>
          )}

          {/* Next button */}
          {allImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext() }}
              className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm z-10"
              aria-label="Foto berikutnya"
            >
              <Icon icon="solar:alt-arrow-right-bold" className="w-7 h-7" />
            </button>
          )}

          <img
            src={allImages[activePhotoIndex]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </main>
  )
}
