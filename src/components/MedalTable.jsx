import { useState, useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'

/**
 * MedalTable — Historical medal standings with year selector.
 * Pulls live data from Supabase when configured, otherwise shows demo data.
 */

// ─── Demo / Fallback Data ─────────────────────────────────────
const DEMO_YEARS = [2025, 2024]

const DEMO_MEDALS = {
  2025: {
    'semua': [
      { block: 'Gang 1', gold: 2, silver: 1, bronze: 0 },
      { block: 'Gang 2', gold: 1, silver: 1, bronze: 1 },
      { block: 'Gang 3', gold: 0, silver: 1, bronze: 2 },
    ],
    'anak-anak': [
      { block: 'Gang 2', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 3', gold: 0, silver: 1, bronze: 0 },
      { block: 'Gang 1', gold: 0, silver: 0, bronze: 1 },
    ],
    'remaja': [
      { block: 'Gang 1', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 2', gold: 0, silver: 1, bronze: 0 },
      { block: 'Gang 3', gold: 0, silver: 0, bronze: 1 },
    ],
    'bapak-bapak': [
      { block: 'Gang 1', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 3', gold: 0, silver: 1, bronze: 0 },
      { block: 'Gang 2', gold: 0, silver: 0, bronze: 1 },
    ],
    'ibu-ibu': [
      { block: 'Gang 2', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 1', gold: 0, silver: 1, bronze: 0 },
      { block: 'Gang 3', gold: 0, silver: 0, bronze: 1 },
    ],
    'segala-umur': [
      { block: 'Gang 3', gold: 0, silver: 1, bronze: 1 },
      { block: 'Gang 2', gold: 0, silver: 0, bronze: 1 },
      { block: 'Gang 1', gold: 0, silver: 0, bronze: 0 },
    ]
  },
  2024: {
    'semua': [
      { block: 'Gang 2', gold: 2, silver: 0, bronze: 1 },
      { block: 'Gang 1', gold: 1, silver: 2, bronze: 0 },
      { block: 'Gang 3', gold: 1, silver: 0, bronze: 1 },
    ],
    'anak-anak': [
      { block: 'Gang 2', gold: 1, silver: 0, bronze: 1 },
      { block: 'Gang 1', gold: 0, silver: 1, bronze: 0 },
      { block: 'Gang 3', gold: 0, silver: 0, bronze: 1 },
    ],
    'remaja': [
      { block: 'Gang 1', gold: 1, silver: 1, bronze: 0 },
      { block: 'Gang 3', gold: 0, silver: 0, bronze: 1 },
      { block: 'Gang 2', gold: 0, silver: 0, bronze: 0 },
    ],
    'bapak-bapak': [
      { block: 'Gang 2', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 3', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 1', gold: 0, silver: 1, bronze: 0 },
    ],
    'ibu-ibu': [
      { block: 'Gang 1', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 2', gold: 0, silver: 0, bronze: 1 },
      { block: 'Gang 3', gold: 0, silver: 0, bronze: 0 },
    ],
    'segala-umur': [
      { block: 'Gang 3', gold: 1, silver: 0, bronze: 0 },
      { block: 'Gang 2', gold: 0, silver: 0, bronze: 1 },
      { block: 'Gang 1', gold: 0, silver: 0, bronze: 0 },
    ]
  }
}

export default function MedalTable() {
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('semua')
  const [medals, setMedals] = useState([])
  const [loading, setLoading] = useState(true)
  const tableRef = useRef(null)

  // ─── Fetch available years on mount ───────────────────────────
  useEffect(() => {
    async function fetchYears() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('years')
            .select('year_number')
            .order('year_number', { ascending: false })

          if (!error && data?.length) {
            const yearList = data.map((row) => row.year_number)
            setYears(yearList)
            setSelectedYear(yearList[0]) // default to latest
            return
          }
        } catch (err) {
          console.warn('MedalTable: Supabase years fetch failed, using demo data.', err)
        }
      }

      // Fallback to demo years
      setYears(DEMO_YEARS)
      setSelectedYear(DEMO_YEARS[0])
    }

    fetchYears()
  }, [])

  // ─── Fetch medal data when year/category changes ──────────────
  useEffect(() => {
    if (selectedYear === null) return

    async function fetchMedals() {
      setLoading(true)

      if (isSupabaseConfigured()) {
        try {
          // Fetch winners joined with tournaments for the selected year.
          let query = supabase
            .from('winners')
            .select('rank, origin_block, tournaments!inner(type, category, year_id, years!inner(year_number))')
            .eq('tournaments.years.year_number', selectedYear)
            .in('rank', [1, 2, 3])

          const { data, error } = await query

          if (!error && data) {
            const getTournamentCategory = (t) => {
              const cat = t.category || ''
              if (cat === 'anak_4_6' || cat === '4-6') return 'anak_4_6'
              if (cat === 'anak_7_12' || cat === '7-12') return 'anak_7_12'
              if (cat === 'remaja_pria' || cat === 'remaja pria') return 'remaja_pria'
              if (cat === 'remaja_putri' || cat === 'remaja putri') return 'remaja_putri'
              if (cat === 'ibu_ibu' || cat === 'ibu-ibu' || cat === 'ibu_individu' || cat === 'ibu_grup') return 'ibu_ibu'
              if (cat === 'bapak_bapak' || cat === 'bapak-bapak' || cat === 'bapak_individu' || cat === 'bapak_grup') return 'bapak_bapak'
              if (cat === 'pasangan' || cat === 'segala_umur' || cat === 'remaja_grup' || t.type === 'grup') return 'pasangan'

              const name = (t.name || '').toLowerCase()
              if (name.includes('4-6') || name.includes('balita')) return 'anak_4_6'
              if (name.includes('7-12') || name.includes('anak') || name.includes('kelereng') || name.includes('kerupuk')) return 'anak_7_12'
              if (name.includes('remaja pria') || name.includes('remaja putra') || name.includes('remaja lak')) return 'remaja_pria'
              if (name.includes('remaja putri') || name.includes('remaja putri') || name.includes('remaja peremp')) return 'remaja_putri'
              if (name.includes('ibu')) return 'ibu_ibu'
              if (name.includes('bapak') || name.includes('pria')) return 'bapak_bapak'
              if (name.includes('pasangan') || name.includes('grup') || t.type === 'grup') return 'pasangan'

              return 'bapak_bapak'
            }

            // Client side filtering for micro-categories
            const filteredData = data.filter((item) => {
              if (selectedCategory === 'semua') return true
              const cat = getTournamentCategory(item.tournaments || {})
              return cat === selectedCategory
            })

            // Aggregate medals by origin_block
            const aggregated = {}

            filteredData.forEach((winner) => {
              const block = winner.origin_block || 'Tidak Diketahui'
              if (!aggregated[block]) {
                aggregated[block] = { block, gold: 0, silver: 0, bronze: 0 }
              }
              if (winner.rank === 1) aggregated[block].gold += 1
              if (winner.rank === 2) aggregated[block].silver += 1
              if (winner.rank === 3) aggregated[block].bronze += 1
            })

            // Sort: gold desc → silver desc → bronze desc
            const sorted = Object.values(aggregated).sort((a, b) => {
              if (b.gold !== a.gold) return b.gold - a.gold
              if (b.silver !== a.silver) return b.silver - a.silver
              return b.bronze - a.bronze
            })

            setMedals(sorted)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('MedalTable: Supabase medals fetch failed, using demo data.', err)
        }
      }

      // Fallback to demo data
      const demoYear = DEMO_MEDALS[selectedYear] || {}
      const demo = demoYear[selectedCategory] || []
      // Sort demo data consistently
      const sorted = [...demo].sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        return b.bronze - a.bronze
      })
      setMedals(sorted)
      setLoading(false)
    }

    fetchMedals()
  }, [selectedYear, selectedCategory])

  // ─── Entrance animation when table data loads ─────────────────
  useEffect(() => {
    if (!loading && tableRef.current) {
      animate(tableRef.current, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 450,
        ease: 'outCubic',
      })
    }
  }, [loading, medals])

  return (
    <div className="card p-5 md:p-8">
      {/* Header row: Title + Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h3 className="font-heading text-lg md:text-xl font-bold text-abu-900 flex items-center gap-2">
          <Icon icon="solar:medal-ribbon-star-bold-duotone" className="w-6 h-6 text-merah-600" />
          Klasemen Medali Historis
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kategori dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select w-auto min-w-[160px] focus-ring text-sm"
            aria-label="Pilih kategori"
          >
            <option value="semua">Semua Kategori</option>
            <option value="anak_4_6">Anak-Anak 4-6</option>
            <option value="anak_7_12">Anak-Anak 7-12</option>
            <option value="remaja_pria">Remaja Pria</option>
            <option value="remaja_putri">Remaja Putri</option>
            <option value="ibu_ibu">Ibu-Ibu</option>
            <option value="bapak_bapak">Bapak-Bapak</option>
            <option value="pasangan">Pasangan</option>
          </select>

          {/* Year dropdown */}
          <select
            value={selectedYear ?? ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="form-select w-auto min-w-[120px] focus-ring text-sm"
            aria-label="Pilih tahun"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                Tahun {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-merah-200 border-t-merah-600 rounded-full animate-spin" />
        </div>
      ) : medals.length === 0 ? (
        /* Empty state */
        <p className="text-center text-abu-500 py-8">
          Belum ada data medali untuk tahun {selectedYear}.
        </p>
      ) : (
        /* Medal table — scrolls horizontally on small screens */
        <div className="overflow-x-auto -mx-5 md:-mx-8 px-5 md:px-8" ref={tableRef} style={{ opacity: 0 }}>
          <table className="w-full min-w-[420px] text-sm md:text-base">
            <thead>
              <tr className="border-b-2 border-abu-200 text-abu-600 text-left">
                <th className="py-3 pr-2 w-10 text-center">#</th>
                <th className="py-3 px-2">Gang/Blok</th>
                <th className="py-3 px-2 text-center w-16">
                  <div className="flex justify-center" title="Emas"><Icon icon="solar:cup-first-bold" className="w-5.5 h-5.5 text-amber-500" /></div>
                </th>
                <th className="py-3 px-2 text-center w-16">
                  <div className="flex justify-center" title="Perak"><Icon icon="solar:cup-first-bold" className="w-5.5 h-5.5 text-slate-400" /></div>
                </th>
                <th className="py-3 px-2 text-center w-16">
                  <div className="flex justify-center" title="Perunggu"><Icon icon="solar:cup-first-bold" className="w-5.5 h-5.5 text-amber-700" /></div>
                </th>
                <th className="py-3 pl-2 text-center w-18">Total</th>
              </tr>
            </thead>
            <tbody>
              {medals.map((row, index) => {
                const total = row.gold + row.silver + row.bronze
                const isJuaraUmum = index === 0

                return (
                  <tr
                    key={row.block}
                    className={`border-b border-abu-100 transition-colors ${
                      isJuaraUmum ? 'gold-row hover:bg-amber-100/60' : 'hover:bg-abu-50'
                    }`}
                  >
                    {/* Rank number */}
                    <td className="py-3 pr-2 text-center font-bold text-abu-500">
                      {index + 1}
                    </td>

                    {/* Block/Gang name — trophy for Juara Umum */}
                    <td className="py-3 px-2 font-semibold text-abu-900 flex items-center gap-1.5">
                      {isJuaraUmum && (
                        <Icon icon="solar:cup-bold" className="w-5 h-5 text-yellow-500 flex-shrink-0 animate-pulse" />
                      )}
                      <span>{row.block}</span>
                    </td>

                    {/* Medal counts */}
                    <td className="py-3 px-2 text-center font-semibold">
                      {row.gold}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold">
                      {row.silver}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold">
                      {row.bronze}
                    </td>
                    <td className="py-3 pl-2 text-center font-bold text-merah-700">
                      {total}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
