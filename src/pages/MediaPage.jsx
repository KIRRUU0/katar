import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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

// ── Fallback Demo Photos ────────────────────────────────────────
const DEMO_PHOTOS = [
  {
    id: 'm1',
    title: 'Gotong Royong Lapangan Gang 3',
    year: 2025,
    description: 'Warga bahu-membahu membersihkan dan menyiapkan area panggung kemerdekaan.',
    image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
  },
  {
    id: 'm2',
    title: 'Keseruan Balap Karung Anak-Anak',
    year: 2025,
    description: 'Tawa ceria anak-anak RT 03 beradu cepat di garis finish balap karung.',
    image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
  },
  {
    id: 'm3',
    title: 'Latihan Futsal Bersama',
    year: 2025,
    description: 'Sesi latihan pemuda karang taruna mempererat keakraban antar gang.',
    image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
  },
  {
    id: 'm4',
    title: 'Pemasangan Bendera Lingkungan',
    year: 2024,
    description: 'Kerja sama memasang umbul-umbul merah putih di sepanjang gang jalan utama.',
    image_url: 'https://images.unsplash.com/photo-1577401132921-cb39bb12c7e0?w=800',
  },
  {
    id: 'm5',
    title: 'Malam Tirakatan & Doa Bersama',
    year: 2024,
    description: 'Malam penuh khidmat merenungkan jasa pahlawan diikuti seluruh warga RT 03.',
    image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
  },
  {
    id: 'm6',
    title: 'Pembagian Hadiah Juara Lomba',
    year: 2024,
    description: 'Momen penyerahan piala dan hadiah hiburan bagi para juara di panggung utama.',
    image_url: 'https://images.unsplash.com/photo-1531058020387-3be344559be6?w=800',
  },
]

export default function MediaPage() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter & upload states
  const [selectedYear, setSelectedYear] = useState('Semua')
  const [lightboxPhotosList, setLightboxPhotosList] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  
  // Upload form states
  const [uploadOpen, setUploadOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  // Load photos
  useEffect(() => {
    async function loadPhotos() {
      setLoading(true)
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('media')
            .select('*')
            .order('created_at', { ascending: false })

          if (!error && data?.length) {
            setPhotos(data)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('MediaPage: Supabase query failed, falling back to demo photos', err)
        }
      }

      // Check local storage for added photos
      const localData = localStorage.getItem('katar_media_photos')
      if (localData) {
        setPhotos(JSON.parse(localData))
      } else {
        setPhotos(DEMO_PHOTOS)
      }
      setLoading(false)
    }

    loadPhotos()
  }, [])

  // Save new photo
  const handleUpload = async (e) => {
    e.preventDefault()
    if (!title.trim() || !imageUrl.trim()) return
    setUploading(true)
    setToast({ message: '', type: '' })

    const newPhoto = {
      title: title.trim(),
      year: Number(year),
      image_url: imageUrl.trim(),
      description: description.trim(),
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('media')
          .insert(newPhoto)
          .select()
          .single()

        if (error) throw error
        setPhotos((prev) => [data, ...prev])
        setToast({ message: 'Foto berhasil diunggah ke galeri!', type: 'success' })
      } catch (err) {
        setToast({ message: `Gagal mengunggah: ${err.message}`, type: 'error' })
      } finally {
        setUploading(false)
      }
    } else {
      // Local storage fallback
      const photoWithId = {
        ...newPhoto,
        id: 'local-' + Date.now(),
      }
      const updatedList = [photoWithId, ...photos]
      setPhotos(updatedList)
      localStorage.setItem('katar_media_photos', JSON.stringify(updatedList))
      
      setToast({ message: '(Demo) Foto berhasil disimpan secara lokal!', type: 'success' })
      setUploading(false)
    }

    // Reset Form
    setTitle('')
    setImageUrl('')
    setDescription('')
  }

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

        {/* Admin upload trigger */}
        {user && (
          <button
            onClick={() => setUploadOpen((prev) => !prev)}
            className="btn btn-primary self-start md:self-auto min-h-[44px] flex items-center gap-2 shadow-md"
          >
            <Icon icon="solar:upload-bold" className="w-5 h-5 text-white" />
            {uploadOpen ? 'Tutup Form' : 'Unggah Foto Baru'}
          </button>
        )}
      </div>

      {/* ── Admin Upload Form ────────────────────────────────────── */}
      {user && uploadOpen && (
        <div className="card p-6 border-merah-200 border bg-white mb-8 transition-all max-w-2xl">
          <h3 className="font-heading text-lg font-bold text-abu-900 flex items-center gap-2 mb-4">
            <Icon icon="solar:upload-bold" className="w-5 h-5 text-merah-600" />
            Unggah Foto Baru
          </h3>

          {toast.message && (
            <div
              className={`p-3.5 rounded-xl border text-sm font-medium mb-4 flex items-center justify-between
                          ${toast.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-merah-50 border-merah-200 text-merah-800'
                          }`}
            >
              <span>{toast.message}</span>
              <button onClick={() => setToast({ message: '', type: '' })} className="ml-2">✕</button>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Judul Foto</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Juara Tarik Tambang"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Tahun Kegiatan</label>
                <select
                  required
                  className="form-select"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-abu-700 mb-1">URL Gambar</label>
              <input
                type="url"
                required
                placeholder="https://images.unsplash.com/... atau tautan gambar lainnya"
                className="form-input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-abu-700 mb-1">Keterangan / Deskripsi</label>
              <textarea
                placeholder="Tuliskan keterangan momen dalam foto tersebut secara singkat..."
                className="form-input min-h-[80px] py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="btn btn-primary w-full sm:w-auto min-h-[44px] disabled:opacity-60"
            >
              {uploading ? 'Mengunggah...' : 'Simpan Foto'}
            </button>
          </form>
        </div>
      )}

      {/* ── Year Filters ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {yearsList.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px]
                        ${selectedYear === y
                          ? 'bg-merah-600 text-white shadow-sm'
                          : 'bg-white border border-abu-200 text-abu-600 hover:bg-abu-50'
                        }`}
          >
            {y === 'Semua' ? 'Semua Tahun' : `Tahun ${y}`}
          </button>
        ))}
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
        <div className="card p-12 text-center">
          <p className="text-abu-500">Belum ada foto kenangan diunggah.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Loop through each year that should be displayed */}
          {(selectedYear === 'Semua' ? uniqueYears : [Number(selectedYear)])
            .filter((y) => photos.some((p) => p.year === y))
            .map((y) => {
              const yearPhotos = photos.filter((p) => p.year === y)
              return (
                <div key={y} className="space-y-4">
                  {/* Year Header */}
                  <div className="flex items-center gap-3 border-b border-abu-200 pb-2">
                    <h2 className="font-heading text-lg md:text-xl font-bold text-abu-900">
                      Tahun {y}
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-merah-50 text-merah-700 border border-merah-100">
                      {yearPhotos.length} Foto
                    </span>
                  </div>

                  {/* Horizontal Scroll Grid (2 rows high) — Seamless photo wall */}
                  <div className="grid grid-rows-2 grid-flow-col gap-3 justify-start overflow-x-auto pb-4 pt-1 px-1 -mx-4 md:mx-0 rounded-3xl border border-abu-200/50 shadow-sm scrollbar-thin h-[380px] md:h-[430px]">
                    {yearPhotos.map((photo, index) => {
                      const isFeatured = index === 0
                      
                      if (isFeatured) {
                        return (
                          <div
                            key={photo.id}
                            onClick={() => { setLightboxPhotosList(yearPhotos); setLightboxIndex(index); }}
                            className="row-span-2 relative overflow-hidden group cursor-pointer w-[340px] sm:w-[460px] md:w-[580px] h-full flex-shrink-0 bg-white border border-abu-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.015] focus-ring flex flex-col rounded-2xl"
                          >
                            <div className="w-full h-[70%] overflow-hidden rounded-t-2xl">
                              <img
                                src={parseImages(photo.image_url)[0]}
                                alt={photo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            </div>
                            {/* Caption below image */}
                            <div className="p-4 bg-white text-abu-850 flex flex-col justify-start rounded-b-2xl h-[30%] border-t border-abu-150">
                              <span className="bg-merah-50 border border-merah-200 text-merah-700 font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider mb-2 self-start shadow-sm">
                                Tahun {photo.year}
                              </span>
                              <h4 className="font-heading text-sm md:text-base font-extrabold text-abu-900 line-clamp-1 leading-snug">
                                {photo.title}
                              </h4>
                              {photo.description && (
                                <p className="text-xs text-abu-500 mt-1 leading-relaxed line-clamp-2">
                                  {photo.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div
                            key={photo.id}
                            onClick={() => { setLightboxPhotosList(yearPhotos); setLightboxIndex(index); }}
                            className="relative overflow-hidden group cursor-pointer w-[210px] sm:w-[240px] md:w-[270px] h-full flex-shrink-0 bg-abu-900 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.015] focus-ring"
                          >
                            <img
                              src={parseImages(photo.image_url)[0]}
                              alt={photo.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                              loading="lazy"
                            />
                          </div>
                        )
                      }
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      )}
 
      {/* ── Photo Lightbox ────────────────────────────────────────── */}
      {lightboxIndex >= 0 && lightboxPhotosList.length > 0 && (() => {
        const activePhoto = lightboxPhotosList[lightboxIndex]
        if (!activePhoto) return null
        const imageList = parseImages(activePhoto.image_url)
        const currentImg = imageList[0] || activePhoto.image_url
 
        return (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
            onClick={() => { setLightboxIndex(-1); setLightboxPhotosList([]); }}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => { setLightboxIndex(-1); setLightboxPhotosList([]); }}
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-lg cursor-pointer z-20"
              aria-label="Tutup foto"
            >
              ✕
            </button>
            
            <div 
              className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Carousel navigation controls for all photos in the year */}
              {lightboxPhotosList.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIndex((prev) => (prev - 1 + lightboxPhotosList.length) % lightboxPhotosList.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/75 hover:scale-105 transition-all text-xl font-bold cursor-pointer z-10 focus-ring"
                    aria-label="Foto sebelumnya"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxPhotosList.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/75 hover:scale-105 transition-all text-xl font-bold cursor-pointer z-10 focus-ring"
                    aria-label="Foto berikutnya"
                  >
                    ›
                  </button>
                  {/* Page indicator */}
                  <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white z-10">
                    {lightboxIndex + 1} / {lightboxPhotosList.length}
                  </div>
                </>
              )}
 
              <img
                src={currentImg}
                alt={activePhoto.title}
                className="max-w-full max-h-[65vh] object-contain rounded-t-2xl shadow-2xl animate-fade-in bg-black"
              />
              <div className="w-full bg-abu-900 border-t border-white/10 p-5 text-white rounded-b-2xl max-w-full text-center">
                <span className="inline-block bg-merah-650 text-white font-bold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider mb-2.5">
                  Tahun {activePhoto.year}
                </span>
                <h4 className="font-heading text-lg font-bold">{activePhoto.title}</h4>
                {activePhoto.description && (
                  <p className="text-sm text-abu-300 mt-1.5 max-w-2xl mx-auto leading-relaxed">{activePhoto.description}</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </main>
  )
}
