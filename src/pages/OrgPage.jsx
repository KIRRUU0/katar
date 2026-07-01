import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'

/**
 * OrgPage — Organizational structure diagram for Karang Taruna RT 002/003.
 * Renders logo, titles, period, and full hierarchical structure (RT, Ketua, Core, Members).
 * Loads data dynamically from database/localStorage.
 */

const DEFAULT_ORG = {
  rt: {
    role: 'Ketua RT',
    name: '',
    image_url: '',
    icon: 'solar:user-bold-duotone',
    color: 'border-amber-500 bg-amber-50 text-amber-950',
    iconColor: 'text-amber-600',
  },
  katar: {
    role: 'Ketua Karang Taruna',
    name: '',
    image_url: '',
    icon: 'solar:crown-minimalistic-bold-duotone',
    color: 'border-merah-650 bg-merah-50 text-merah-950',
    iconColor: 'text-merah-600',
  },
  core: [
    {
      role: 'Sekretaris',
      name: '',
      image_url: '',
      icon: 'solar:document-text-bold-duotone',
      color: 'border-blue-500 bg-blue-50 text-blue-950',
      iconColor: 'text-blue-600',
    },
    {
      role: 'Bendahara',
      name: '',
      image_url: '',
      icon: 'solar:wallet-money-bold-duotone',
      color: 'border-emerald-500 bg-emerald-50 text-emerald-950',
      iconColor: 'text-emerald-600',
    },
  ],
  members: []
}

const mapRowsToStructure = (rows) => {
  const rtRow = rows.find(r => r.role_key === 'rt')
  const katarRow = rows.find(r => r.role_key === 'katar')
  const sekretarisRow = rows.find(r => r.role_key === 'sekretaris')
  const bendaharaRow = rows.find(r => r.role_key === 'bendahara')
  const memberRows = rows.filter(r => r.role_key === 'member').sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  return {
    rt: {
      role: 'Ketua RT',
      name: rtRow ? rtRow.name : '',
      image_url: rtRow ? rtRow.image_url : '',
      icon: 'solar:user-bold-duotone',
      color: 'border-amber-500 bg-amber-50 text-amber-950',
      iconColor: 'text-amber-600',
    },
    katar: {
      role: 'Ketua Karang Taruna',
      name: katarRow ? katarRow.name : '',
      image_url: katarRow ? katarRow.image_url : '',
      icon: 'solar:crown-minimalistic-bold-duotone',
      color: 'border-merah-650 bg-merah-50 text-merah-950',
      iconColor: 'text-merah-600',
    },
    core: [
      {
        role: 'Sekretaris',
        name: sekretarisRow ? sekretarisRow.name : '',
        image_url: sekretarisRow ? sekretarisRow.image_url : '',
        icon: 'solar:document-text-bold-duotone',
        color: 'border-blue-500 bg-blue-50 text-blue-950',
        iconColor: 'text-blue-600',
      },
      {
        role: 'Bendahara',
        name: bendaharaRow ? bendaharaRow.name : '',
        image_url: bendaharaRow ? bendaharaRow.image_url : '',
        icon: 'solar:wallet-money-bold-duotone',
        color: 'border-emerald-500 bg-emerald-50 text-emerald-950',
        iconColor: 'text-emerald-600',
      },
    ],
    members: memberRows.map(r => r.name)
  }
}

export default function OrgPage() {
  const [activeYear, setActiveYear] = useState(2026)
  const [structure, setStructure] = useState(DEFAULT_ORG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Struktur Organisasi - Karang Taruna RT 02/03'
    async function fetchOrg() {
      try {
        let rows = []
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('organization')
            .select('*')
          
          if (!error && data && data.length > 0) {
            rows = data
          }
        }
        
        if (rows.length > 0) {
          const yearVal = rows[0]?.year || 2026
          setActiveYear(yearVal)
          setStructure(mapRowsToStructure(rows))
        } else {
          setActiveYear(2026)
          setStructure(DEFAULT_ORG)
        }
      } catch (err) {
        console.error('Error loading org structure:', err)
        setStructure(DEFAULT_ORG)
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [])

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Skeleton Header */}
        <div className="mb-14 text-center">
          <div className="w-28 h-28 md:w-36 md:h-36 mx-auto mb-5 rounded-full animate-shimmer" />
          <div className="w-56 h-8 mx-auto rounded-lg animate-shimmer mb-2" />
          <div className="w-36 h-5 mx-auto rounded-lg animate-shimmer mb-4" />
          <div className="w-28 h-7 mx-auto rounded-full animate-shimmer" />
        </div>

        {/* Skeleton Chart */}
        <div className="flex flex-col items-center justify-center w-full gap-8">
          {/* RT */}
          <div className="w-64 h-32 rounded-2xl border border-abu-200 p-4 bg-white flex flex-col items-center justify-center space-y-2 shadow-sm">
            <div className="w-12 h-12 rounded-full animate-shimmer" />
            <div className="w-24 h-3.5 rounded animate-shimmer" />
            <div className="w-32 h-5 rounded animate-shimmer" />
          </div>
          <div className="w-0.5 h-8 bg-abu-200"></div>

          {/* Ketua */}
          <div className="w-64 h-36 rounded-2xl border border-abu-200 p-5 bg-white flex flex-col items-center justify-center space-y-2.5 shadow-sm">
            <div className="w-16 h-16 rounded-full animate-shimmer" />
            <div className="w-24 h-3.5 rounded animate-shimmer" />
            <div className="w-32 h-5 rounded animate-shimmer" />
          </div>
          <div className="w-0.5 h-8 bg-abu-200"></div>

          {/* Core */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
            <div className="h-32 rounded-2xl border border-abu-200 p-4 bg-white flex flex-col items-center justify-center space-y-2 shadow-sm">
              <div className="w-12 h-12 rounded-full animate-shimmer" />
              <div className="w-20 h-3.5 rounded animate-shimmer" />
              <div className="w-28 h-4.5 rounded animate-shimmer" />
            </div>
            <div className="h-32 rounded-2xl border border-abu-200 p-4 bg-white flex flex-col items-center justify-center space-y-2 shadow-sm">
              <div className="w-12 h-12 rounded-full animate-shimmer" />
              <div className="w-20 h-3.5 rounded animate-shimmer" />
              <div className="w-28 h-4.5 rounded animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Skeleton Grid Members */}
        <div className="mt-16 pt-8 border-t border-abu-200">
          <div className="w-40 h-8 rounded-lg animate-shimmer mb-6" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="w-40 h-10 rounded-xl border border-abu-200 bg-white px-3 flex items-center gap-2 shadow-sm">
                <div className="w-5 h-5 rounded-full animate-shimmer" />
                <div className="w-20 h-3 rounded animate-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* ── Page Header (Logo, Title, Sub-title, Period) ─────────── */}
      <div className="mb-14 text-center">
        {/* Uploaded Logo Image */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 mx-auto mb-5">
          <img
            src="/logo.webp"
            alt="Logo Karang Taruna Iremda"
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 drop-shadow-md"
          />
        </div>

        {/* Title & Subtitle */}
        <h1 className="font-heading text-2xl md:text-4xl font-extrabold text-abu-900 leading-tight">
          Karang Taruna RT 02/03
        </h1>
        <p className="text-abu-500 text-sm md:text-lg font-bold mt-1">
          Struktur Pengurusan
        </p>

        {/* Subtle Pill for Period */}
        <div className="inline-block bg-merah-50/70 border border-merah-200 text-merah-700 font-bold text-xs px-4 py-1.5 rounded-full mt-3 shadow-sm uppercase tracking-wider">
          Periode {activeYear}/{activeYear + 3}
        </div>
      </div>

      {/* ── Organizational chart container ──────────────────────── */}
      <div className="flex flex-col items-center justify-center w-full gap-8">
        
        {/* Tier 1: Pelindung / Ketua RT */}
        <div className="flex flex-col items-center relative w-full">
          <div className={`card w-64 p-4 border-2 text-center shadow-md ${structure.rt.color} transition-transform hover:scale-[1.02]`}>
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white flex items-center justify-center mx-auto mb-2 border border-abu-200 shadow-sm">
              {structure.rt.image_url ? (
                <img src={structure.rt.image_url} alt={structure.rt.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Icon icon={structure.rt.icon} className={`w-7 h-7 ${structure.rt.iconColor}`} />
              )}
            </div>
            <span className="text-xs font-bold uppercase tracking-wider block opacity-75">{structure.rt.role}</span>
            <h3 className="font-heading font-extrabold text-sm md:text-base mt-0.5">{structure.rt.name}</h3>
            <span className="text-[10px] text-abu-500 font-medium block mt-1">Pelindung &amp; Penanggung Jawab</span>
          </div>
          {/* Vertical connecting line */}
          <div className="w-0.5 h-8 bg-abu-300"></div>
        </div>

        {/* Tier 2: Ketua Karang Taruna */}
        <div className="flex flex-col items-center relative w-full">
          <div className={`card w-64 p-5 border-2 text-center shadow-md ${structure.katar.color} transition-transform hover:scale-[1.02]`}>
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white flex items-center justify-center mx-auto mb-2.5 border border-abu-200 shadow-sm">
              {structure.katar.image_url ? (
                <img src={structure.katar.image_url} alt={structure.katar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Icon icon={structure.katar.icon} className={`w-9 h-9 ${structure.katar.iconColor} animate-pulse`} />
              )}
            </div>
            <span className="text-xs font-bold uppercase tracking-wider block opacity-85">{structure.katar.role}</span>
            <h3 className="font-heading font-black text-base md:text-lg mt-0.5">{structure.katar.name}</h3>
            <span className="text-[10px] text-abu-500 font-medium block mt-1">Koordinator Utama Kegiatan</span>
          </div>
          {/* Vertical connecting line */}
          <div className="w-0.5 h-8 bg-abu-300"></div>
        </div>

        {/* Tier 3: Core Executives (Sekretaris & Bendahara) */}
        <div className="relative w-full max-w-3xl flex flex-col items-center">
          {/* Horizontal crossbar connecting Sekretaris and Bendahara */}
          <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-abu-300 hidden md:block"></div>
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-16 w-full justify-center">
            {structure.core.map((node) => (
              <div key={node.role} className="flex flex-col items-center w-full md:w-64 relative">
                {/* Horizontal marker for desktop connector */}
                <div className="w-0.5 h-4 bg-abu-300 hidden md:block"></div>
                <div className={`card w-full p-4 border text-center shadow-sm ${node.color} transition-transform hover:scale-[1.01]`}>
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white flex items-center justify-center mx-auto mb-2 border border-abu-150 shadow-sm">
                    {node.image_url ? (
                      <img src={node.image_url} alt={node.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Icon icon={node.icon} className={`w-7 h-7 ${node.iconColor}`} />
                    )}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider block opacity-75">{node.role}</span>
                  <h3 className="font-heading font-bold text-sm md:text-base mt-0.5">{node.name}</h3>
                </div>
                {/* Connector pointing down to divisions */}
                <div className="w-0.5 h-8 bg-abu-300"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier 4: Anggota Karang Taruna */}
        <div className="relative w-full mt-4">
          <div className="text-center mb-8">
            <h3 className="font-heading text-xl md:text-2xl font-extrabold text-abu-900 flex items-center justify-center gap-2">
              <Icon icon="solar:users-group-two-rounded-bold-duotone" className="w-6 h-6 text-merah-600" />
              Anggota Karang Taruna
            </h3>
            <p className="text-xs md:text-sm text-abu-500 mt-1">Pemuda-pemudi aktif yang berkontribusi bagi lingkungan RT 02/03.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto w-full">
            {structure.members.map((name, index) => (
              <div
                key={index}
                className="bg-white border border-abu-150 rounded-2xl p-3.5 flex items-center gap-2.5 shadow-sm hover-lift w-[160px] sm:w-[190px] md:w-[220px] flex-shrink-0"
              >
                <div className="w-7 h-7 rounded-full bg-merah-50 border border-merah-100 flex items-center justify-center flex-shrink-0">
                  <Icon icon="solar:user-bold-duotone" className="w-3.5 h-3.5 text-merah-600" />
                </div>
                <span className="text-xs md:text-sm font-semibold text-abu-800 line-clamp-1">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
