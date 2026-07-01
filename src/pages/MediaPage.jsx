import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { parseImages } from '../components/admin/adminUtils'
import { formatDate } from '../lib/formatUtils'

const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

export default function MediaPage() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [selectedYear, setSelectedYear] = useState('Semua')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [lightboxPhotosList, setLightboxPhotosList] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  // Toggle body class to hide LiveTicker and disable scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex >= 0) {
      document.body.classList.add('lightbox-open')
    } else {
      document.body.classList.remove('lightbox-open')
    }
    return () => {
      document.body.classList.remove('lightbox-open')
    }
  }, [lightboxIndex])

  // Load photos
  useEffect(() => {
    document.title = 'Galeri Foto Kegiatan - Karang Taruna RT 02/03'
    async function loadPhotos() {
      setLoading(true)
      let supabasePhotos = []
      let supabaseNewsPhotos = []
      let hasSupabase = false

      if (isSupabaseConfigured()) {
        try {
          // Fetch media entries only
          const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .select('*')
            .order('created_at', { ascending: false })

          if (!mediaError) {
            supabasePhotos = mediaData || []
            hasSupabase = true
          }

          // Fetch news entries to merge dynamically
          const { data: newsData, error: newsError } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })

          if (!newsError && newsData) {
            newsData.forEach(n => {
              const urls = parseImages(n.image_url)
              const year = n.date ? new Date(n.date).getFullYear() : new Date().getFullYear()
              urls.forEach((url, idx) => {
                if (url) {
                  supabaseNewsPhotos.push({
                    id: `news-sync-${n.id}-${idx}`,
                    title: n.title,
                    year: year,
                    date: n.date,
                    image_url: JSON.stringify([url]),
                    description: n.description || '',
                    is_news_sync: true
                  })
                }
              })
            })
          }
        } catch (err) {
          console.warn('MediaPage: Supabase query failed', err)
        }
      }

      // Merge media entries and news virtual entries
      const allEntries = [...supabasePhotos, ...supabaseNewsPhotos].filter((entry) => {
        const entryUrl = (entry.image_url || '').trim()
        return !!entryUrl
      })

      // Deduplicate by the actual image URL to prevent duplicate entries
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

      if (deduped.length > 0 || hasSupabase) {
        setPhotos(deduped)
      } else {
        setPhotos([])
      }
      setLoading(false)
    }

    loadPhotos()
  }, [])



  // Available filters (computed dynamically from photo years)
  const uniqueYears = [...new Set(photos.map((p) => p.year))].sort((a, b) => b - a)
  const yearsList = ['Semua', ...uniqueYears.map(String)]

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-abu-900 flex items-center gap-2">
            <Icon icon="solar:gallery-bold-duotone" className="w-8 h-8 text-merah-600" />
            Galeri Foto Kenangan RT 02/03
          </h1>
          <p className="text-abu-500 text-sm md:text-base mt-1.5 max-w-2xl">
            Menyimpan dokumentasi momen gotong royong, perlombaan kemerdekaan, malam tirakatan, serta kegiatan sosial warga RT 02/03.
          </p>
        </div>

      </div>

      {/* ── Year Filters Dropdown ───────────────────────────────── */}
      <div className="relative mb-8 z-30 max-w-[240px]">
        <label htmlFor="year-select" className="sr-only">Pilih Tahun</label>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-abu-200 text-abu-850 rounded-xl text-sm font-semibold hover:bg-abu-50/70 hover:border-abu-300 transition-all cursor-pointer shadow-sm focus-ring"
        >
          <span className="flex items-center gap-2">
            <Icon icon="solar:calendar-bold-duotone" className="w-5 h-5 text-merah-600" />
            {selectedYear === 'Semua' ? 'Semua Tahun' : `Tahun ${selectedYear}`}
          </span>
          <Icon 
            icon="solar:alt-arrow-down-bold" 
            className={`w-4 h-4 text-abu-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
            <div className="absolute left-0 right-0 mt-2 bg-white border border-abu-150 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in max-h-60 overflow-y-auto">
              {yearsList.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setSelectedYear(y)
                    setIsDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between cursor-pointer
                            ${selectedYear === y
                              ? 'bg-merah-50 text-merah-700 font-bold'
                              : 'text-abu-700 hover:bg-abu-50'
                            }`}
                >
                  <span>{y === 'Semua' ? 'Semua Tahun' : `Tahun ${y}`}</span>
                  {selectedYear === y && (
                    <Icon icon="solar:check-read-linear" className="w-4.5 h-4.5 text-merah-600" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Photo Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6 pt-4">
          {/* Year Header Skeleton */}
          <div className="flex items-center gap-3 border-b border-abu-200 pb-2">
            <div className="w-24 h-6 rounded animate-shimmer" />
            <div className="w-16 h-5 rounded-full animate-shimmer" />
          </div>

          {/* Shimmer Photo Collage wall */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[380px]">
            {/* Featured Item (Col-span-2, Row-span-2) */}
            <div className="md:col-span-2 md:row-span-2 rounded-2xl animate-shimmer border border-abu-150 shadow-sm bg-white" />
            
            {/* Small Items */}
            <div className="rounded-2xl animate-shimmer border border-abu-150 shadow-sm bg-white" />
            <div className="rounded-2xl animate-shimmer border border-abu-150 shadow-sm bg-white" />
            <div className="rounded-2xl animate-shimmer border border-abu-150 shadow-sm bg-white" />
            <div className="rounded-2xl animate-shimmer border border-abu-150 shadow-sm bg-white" />
          </div>
        </div>
      ) : photos.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center border border-dashed border-abu-300 bg-white rounded-3xl animate-fade-in">
          <img src="/empty-media.svg" alt="Belum ada foto" className="w-32 h-32 mb-4 object-contain" />
          <p className="text-abu-850 font-heading text-lg font-bold">
            Belum ada foto
          </p>
          <p className="text-abu-500 text-sm mt-1 max-w-sm">
            Saat ini belum ada dokumentasi foto kenangan yang diunggah. Silakan hubungi admin.
          </p>
        </div>
      ) : (() => {
        // Flatten all photos: each image in a multi-image entry becomes its own grid item
        const flatPhotos = photos.flatMap(photo => {
          const imgs = parseImages(photo.image_url)
          if (imgs.length === 0) return []
          return imgs.map((imgUrl, imgIdx) => ({
            ...photo,
            _flatImgUrl: imgUrl,
            _flatImgIdx: imgIdx,
            _totalImages: imgs.length,
            _allImages: imgs,
            _flatId: photo.id + '-img-' + imgIdx,
          }))
        })

        const groupByAlbum = (items) => {
          const groups = items.reduce((acc, item) => {
            const dateVal = item.date || item.created_at?.split('T')[0] || 'unknown'
            const titleVal = item.title || 'Tanpa Judul'
            const isNews = item.is_news_sync ? 'news' : 'media'
            const key = `${dateVal}|||${titleVal}|||${isNews}`
            if (!acc[key]) acc[key] = []
            acc[key].push(item)
            return acc
          }, {})

          return Object.entries(groups)
            .sort(([keyA], [keyB]) => {
              const dateA = keyA.split('|||')[0]
              const dateB = keyB.split('|||')[0]
              if (dateA === 'unknown') return 1
              if (dateB === 'unknown') return -1
              return new Date(dateB).getTime() - new Date(dateA).getTime()
            })
            .map(([key, items]) => {
              const [date, title, isNews] = key.split('|||')
              return {
                date,
                title,
                isNewsSync: isNews === 'news',
                items
              }
            })
        }

        return (
        <div className="space-y-12">
          {(selectedYear === 'Semua' ? uniqueYears : [Number(selectedYear)])
            .filter((y) => flatPhotos.some((p) => p.year === y))
            .map((y) => {
              const yearItems = flatPhotos.filter((p) => p.year === y)
              const albumGroups = groupByAlbum(yearItems)
              return (
                <div key={y} className="space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-abu-200 pb-2">
                    <div>
                      <h2 className="font-heading text-lg md:text-xl font-bold text-abu-900">
                        Tahun {y}
                      </h2>
                      <p className="text-sm text-abu-500 mt-1">
                        Terbagi menjadi {albumGroups.length} album kegiatan
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-merah-50 text-merah-700 border border-merah-100 self-start sm:self-auto">
                      {yearItems.length} Foto
                    </span>
                  </div>

                  <div className="space-y-8">
                    {albumGroups.map(({ date, title, isNewsSync, items }) => {
                      return (
                        <div key={`${date}-${title}`} className="space-y-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <h3 className="font-heading text-base md:text-lg font-bold text-abu-900 leading-tight">
                                {title}
                              </h3>
                              {isNewsSync && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 leading-none">
                                  <Icon icon="solar:document-text-bold" className="w-3.5 h-3.5" />
                                  Berita
                                </span>
                              )}
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-abu-100 text-abu-700 border border-abu-200">
                                {items.length} Foto
                              </span>
                            </div>
                            <p className="text-xs text-abu-500 font-medium">
                              {date === 'unknown' ? 'Tanpa Tanggal' : formatDate(date)}
                            </p>
                          </div>

                          <div className="grid grid-rows-2 grid-flow-col gap-3 justify-start overflow-x-auto pb-4 pt-1 px-1 -mx-4 md:mx-0 rounded-3xl border border-abu-200/50 shadow-sm scrollbar-thin h-[380px] md:h-[430px]">
                            {items.map((item, index) => {
                              const isFeatured = index === 0

                              if (isFeatured) {
                                return (
                                  <div
                                    key={item._flatId}
                                    onClick={() => { setLightboxPhotosList(items); setLightboxIndex(index); }}
                                    className="row-span-2 relative overflow-hidden group cursor-pointer w-[340px] sm:w-[460px] md:w-[580px] h-full flex-shrink-0 bg-white border border-abu-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.015] focus-ring flex flex-col rounded-2xl"
                                  >
                                    <div className="w-full h-[70%] overflow-hidden rounded-t-2xl relative">
                                      <img
                                        src={item._flatImgUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                      />
                                      {item._totalImages > 1 && item._flatImgIdx === 0 && (
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                                          <Icon icon="solar:gallery-bold" className="w-3 h-3" />
                                          {item._totalImages}
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-4 bg-white text-abu-850 flex flex-col justify-start rounded-b-2xl h-[30%] border-t border-abu-150">
                                      <span className="bg-merah-50 border border-merah-200 text-merah-700 font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider mb-2 self-start shadow-sm">
                                        {item.date ? formatDate(item.date) : `Tahun ${item.year}`}
                                      </span>
                                      <h4 className="font-heading text-sm md:text-base font-extrabold text-abu-900 line-clamp-1 leading-snug">
                                        {item.title}
                                      </h4>
                                      {item.description && (
                                        <p className="text-xs text-abu-500 mt-1 leading-relaxed line-clamp-2">
                                          {stripHtml(item.description)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )
                              } else {
                                return (
                                  <div
                                    key={item._flatId}
                                    onClick={() => { setLightboxPhotosList(items); setLightboxIndex(index); }}
                                    className="relative overflow-hidden group cursor-pointer w-[210px] sm:w-[240px] md:w-[270px] h-full flex-shrink-0 bg-abu-900 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.015] focus-ring"
                                  >
                                    <img
                                      src={item._flatImgUrl}
                                      alt={item.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex flex-col justify-end p-3">
                                      <span className="text-white text-xs font-bold line-clamp-1">{item.title}</span>
                                      <span className="text-white/70 text-[10px] mt-0.5">
                                        {item.date ? formatDate(item.date) : `Tahun ${item.year}`}
                                      </span>
                                    </div>
                                    {item._totalImages > 1 && item._flatImgIdx === 0 && (
                                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                        <Icon icon="solar:gallery-bold" className="w-3 h-3" />
                                        {item._totalImages}
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
        )
      })()}
 
      {/* ── Photo Lightbox (Redesigned) ─────────────────────────────── */}
      {lightboxIndex >= 0 && lightboxPhotosList.length > 0 && (() => {
        const activeItem = lightboxPhotosList[lightboxIndex]
        if (!activeItem) return null
 
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-lg"
            onClick={() => { setLightboxIndex(-1); setLightboxPhotosList([]); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setLightboxIndex(-1); setLightboxPhotosList([]); }
              if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev - 1 + lightboxPhotosList.length) % lightboxPhotosList.length)
              if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev + 1) % lightboxPhotosList.length)
            }}
            tabIndex={0}
            ref={(el) => el && el.focus()}
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button Desktop */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(-1); setLightboxPhotosList([]); }}
              className="hidden md:flex absolute top-6 right-6 w-11 h-11 rounded-full bg-abu-800 hover:bg-merah-600 text-white items-center justify-center transition-all cursor-pointer z-[60] backdrop-blur-sm border border-abu-700 shadow-md"
              aria-label="Tutup foto"
            >
              <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
            </button>

            {/* Content Container */}
            <div 
              className="w-[95%] max-w-6xl max-h-[90vh] flex flex-col md:flex-row bg-abu-900 border border-abu-800 rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Side: Main Image */}
              <div className="w-full md:w-[65%] lg:w-[70%] bg-abu-950 flex items-center justify-center relative min-h-[40vh] md:min-h-0 border-b md:border-b-0 md:border-r border-abu-800">
                <img
                  key={activeItem._flatImgUrl}
                  src={activeItem._flatImgUrl}
                  alt={activeItem.title}
                  className="max-w-full max-h-[40vh] md:max-h-[90vh] object-contain animate-fade-in"
                  style={{ transition: 'opacity 0.3s ease' }}
                  referrerPolicy="no-referrer"
                />
                
                {/* Navigation inside Image Container */}
                {lightboxPhotosList.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev - 1 + lightboxPhotosList.length) % lightboxPhotosList.length); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer z-30 border border-white/20"
                      aria-label="Foto sebelumnya"
                    >
                      <Icon icon="solar:alt-arrow-left-bold" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev + 1) % lightboxPhotosList.length); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer z-30 border border-white/20"
                      aria-label="Foto berikutnya"
                    >
                      <Icon icon="solar:alt-arrow-right-bold" className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Counter Badge inside Image Container */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-white z-30 border border-white/10 shadow-sm">
                  {lightboxIndex + 1} / {lightboxPhotosList.length}
                </div>
              </div>

              {/* Right Side: Caption Sidebar */}
              <div className="w-full md:w-[35%] lg:w-[30%] bg-white flex flex-col max-h-[50vh] md:max-h-none relative">
                {/* Close Button Mobile */}
                <div className="md:hidden absolute top-3 right-3 z-30">
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(-1); setLightboxPhotosList([]); }}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-merah-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  >
                    <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
                  </button>
                </div>

                {/* 1. Header/Top Area (Red Background) */}
                <div className="p-6 bg-merah-700 text-white flex-shrink-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3.5 pr-6 md:pr-0">
                    <span className="inline-flex items-center justify-center h-6 bg-white text-merah-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm leading-none whitespace-nowrap">
                      {activeItem.date ? formatDate(activeItem.date) : `Tahun ${activeItem.year}`}
                    </span>
                    {activeItem.is_news_sync && (
                      <span className="inline-flex items-center justify-center h-6 bg-white/20 text-white border border-white/30 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm gap-1 leading-none whitespace-nowrap">
                        <Icon icon="solar:document-text-bold" className="w-3 h-3 text-white" />
                        Dari Berita
                      </span>
                    )}
                    {activeItem._totalImages > 1 && (
                      <span className="inline-flex items-center justify-center h-6 bg-white/20 text-white border border-white/30 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider leading-none whitespace-nowrap">
                        Gambar {activeItem._flatImgIdx + 1} dari {activeItem._totalImages}
                      </span>
                    )}
                  </div>

                  {activeItem.title ? (
                    <h4 className="font-heading text-lg md:text-xl font-extrabold text-white leading-snug" style={{ color: '#ffffff' }}>
                      {activeItem.title}
                    </h4>
                  ) : (
                    <h4 className="font-heading text-lg md:text-xl font-extrabold text-white/90 leading-snug italic" style={{ color: '#ffffff' }}>
                      Dokumentasi Foto
                    </h4>
                  )}
                </div>

                {/* 2. Description Area (White Background) */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-white">
                  {activeItem.description ? (
                    <div 
                      className="text-sm md:text-base text-abu-800 leading-relaxed text-justify prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: activeItem.description }}
                    />
                  ) : (
                    <p className="text-sm text-abu-400 italic">
                      Tidak ada deskripsi tambahan untuk foto ini.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </main>
  )
}
