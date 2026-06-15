import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
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

// ── Fallback Demo News ──────────────────────────────────────────
const DEMO_NEWS = [
  {
    id: '1',
    title: 'Rapat Perdana Panitia 17-an 2026',
    description: 'Rapat koordinasi perdana panitia menyepakati rangkaian kompetisi kemerdekaan yang akan diselenggarakan mulai awal Agustus 2026. Seluruh perwakilan gang dari Blok A hingga Blok D turut hadir untuk menyusun teknis pelaksanaan dan anggaran dana.\n\nDalam rapat ini dibahas pembentukan seksi-seksi panitia, termasuk seksi perlombaan anak-anak, seksi dekorasi lingkungan, seksi konsumsi, serta seksi dokumentasi. Selain itu, panitia menyepakati penambahan perlombaan baru seperti estafet kelereng kelompok dan cerdas cermat kebangsaan demi memupuk semangat nasionalisme warga sejak usia dini.',
    image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200',
    created_at: '2026-06-10T10:00:00',
  },
  {
    id: '2',
    title: 'Gotong Royong Bersihkan Lapangan',
    description: 'Warga RT 03 bergotong royong membersihkan lapangan utama yang akan menjadi pusat arena perlombaan Semarak Agustus. Kegiatan ini dipimpin langsung oleh Ketua RT dan diikuti oleh bapak-bapak serta pemuda karang taruna.\n\nSelain memotong rumput liar dan membersihkan sampah, panitia juga mulai melakukan pengecatan garis lapangan futsal serta mempersiapkan tiang untuk lomba panjat pinang yang legendaris. Ibu-ibu warga RT 03 juga turut mendukung dengan menyediakan konsumsi berupa makanan tradisional dan minuman segar untuk menyemangati para warga yang bekerja bakti.',
    image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200',
    created_at: '2026-06-08T09:00:00',
  },
  {
    id: '3',
    title: 'Latihan Futsal Tim Gang 1',
    description: 'Tim futsal perwakilan Gang 1 mengadakan sesi latihan intensif di lapangan utama untuk menghadapi laga pembuka Turnamen Futsal Antar Gang RT 03 yang dijadwalkan pada 3 Agustus 2026.\n\nLatihan dipimpin oleh kapten tim dengan fokus peningkatan stamina, kerja sama tim, dan strategi penyerangan. Antusiasme para pemain sangat tinggi, didukung oleh para warga Gang 1 yang datang langsung untuk menyaksikan jalannya latihan dari pinggir lapangan. Turnamen futsal tahun ini diprediksi akan berjalan sangat ketat karena masing-masing gang memiliki pemain-pemain andalan.',
    image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200',
    created_at: '2026-06-05T16:00:00',
  },
  {
    id: '4',
    title: 'Dekorasi Merah Putih Dimulai',
    description: 'Karang taruna bersama warga RT 03 mulai menghias jalan utama dengan bendera merah putih, umbul-umbul, dan lampu hias kelap-kelip bernuansa kemerdekaan untuk memeriahkan suasana lingkungan menjelang Agustus.\n\nSetiap gang dikoordinasikan untuk membuat dekorasi sekreatif mungkin karena akan ada penilaian khusus untuk dekorasi gang terbaik di malam puncak syukuran kemerdekaan. Langkah ini diharapkan dapat menumbuhkan kreativitas warga dan membuat suasana lingkungan RT 03 menjadi meriah, indah, dan penuh semangat nasionalisme.',
    image_url: 'https://images.unsplash.com/photo-1577401132921-cb39bb12c7e0?w=1200',
    created_at: '2026-06-01T08:00:00',
  },
]

export default function NewsDetailPage() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [otherNews, setOtherNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePhotoUrl, setActivePhotoUrl] = useState(null)

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

      // 3. Fallback to DEMO_NEWS
      if (!found) {
        found = DEMO_NEWS.find((item) => String(item.id) === String(id))
      }

      const combinedOthers = [
        ...localNews.filter((item) => String(item.id) !== String(id)),
        ...supabaseNews
      ]

      if (combinedOthers.length > 0) {
        others = combinedOthers.slice(0, 3)
      } else {
        others = DEMO_NEWS.filter((item) => String(item.id) !== String(id)).slice(0, 3)
      }

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
              {formatDate(article.created_at)}
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
          {parseImages(article.image_url).length > 1 && (
            <div className="mt-8 pt-8 border-t border-abu-200">
              <h3 className="font-heading text-lg font-bold text-abu-900 mb-4 flex items-center gap-2">
                <Icon icon="solar:gallery-bold-duotone" className="w-5 h-5 text-merah-600" />
                Galeri Foto Terkait
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {parseImages(article.image_url).map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActivePhotoUrl(img)}
                    className="relative h-28 sm:h-36 rounded-xl overflow-hidden shadow-sm group cursor-pointer hover:shadow-md transition-shadow bg-abu-50"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                ))}
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
      {/* Lightbox for news gallery */}
      {activePhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setActivePhotoUrl(null)}
        >
          <button
            onClick={() => setActivePhotoUrl(null)}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
          <img
            src={activePhotoUrl}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  )
}
