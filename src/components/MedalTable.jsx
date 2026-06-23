import { useState, useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getNormalizedCategory } from './admin/adminUtils'

import { Icon } from '@iconify/react'
import { getCustomCategories } from './admin/adminUtils'

/**
 * MedalTable — Historical medal standings with year selector.
 * Pulls live data from Supabase when configured, otherwise shows demo data.
 */


export default function MedalTable() {
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('semua')
  const [medals, setMedals] = useState([])
  const [loading, setLoading] = useState(true)
  const [customCategories, setCustomCategories] = useState(getCustomCategories())
  const tableRef = useRef(null)

  useEffect(() => {
    const handleCatsUpdate = () => {
      setCustomCategories(getCustomCategories())
    }
    window.addEventListener('katar_categories_updated', handleCatsUpdate)
    return () => window.removeEventListener('katar_categories_updated', handleCatsUpdate)
  }, [])

  const getCatLabel = (id, fallback) => {
    return customCategories.find(c => c.id === id)?.name || fallback
  }

  // ─── Fetch available years on mount ───────────────────────────
  useEffect(() => {
    async function fetchYears() {
      setLoading(true)
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('years')
            .select('year_number')
            .order('year_number', { ascending: false })

          if (!error && data) {
            const yearList = data.map((row) => row.year_number)
            setYears(yearList)
            if (yearList.length > 0) {
              setSelectedYear(yearList[0]) // default to latest
            }
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('MedalTable: Supabase years fetch failed', err)
        }
      }

      setYears([])
      setSelectedYear(null)
      setLoading(false)
    }

    fetchYears()
  }, [])

  // ─── Fetch medal data when year/category changes ──────────────
  useEffect(() => {
    if (selectedYear === null) {
      setMedals([])
      setLoading(false)
      return
    }

    async function fetchMedals() {
      setLoading(true)

      if (isSupabaseConfigured()) {
        try {
          // Fetch winners joined with tournaments for the selected year.
          let query = supabase
            .from('winners')
            .select('rank, winner_name_or_team, origin_block, tournaments!inner(type, category, year_id, years!inner(year_number))')
            .eq('tournaments.years.year_number', selectedYear)
            .in('rank', [1, 2, 3])

          const { data, error } = await query

          if (!error && data) {
            // Client side filtering for micro-categories
            const filteredData = data.filter((item) => {
              if (selectedCategory === 'semua') return true
              const t = item.tournaments || {}
              const cat = getNormalizedCategory(t.category, t.type, t.name)
              return cat === selectedCategory
            })

            // Aggregate medals by name (winner_name_or_team)
            const aggregated = {}

            filteredData.forEach((winner) => {
              const name = winner.winner_name_or_team || 'Tidak Diketahui'
              if (!aggregated[name]) {
                aggregated[name] = { name, gold: 0, silver: 0, bronze: 0 }
              }
              if (winner.rank === 1) aggregated[name].gold += 1
              if (winner.rank === 2) aggregated[name].silver += 1
              if (winner.rank === 3) aggregated[name].bronze += 1
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
          console.warn('MedalTable: Supabase medals fetch failed', err)
        }
      }

      setMedals([])
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
            <option value="anak_4_6">{getCatLabel('anak_4_6', 'Anak-Anak 4-6')}</option>
            <option value="anak_7_12">{getCatLabel('anak_7_12', 'Anak-Anak 7-12')}</option>
            <option value="remaja_pria">{getCatLabel('remaja_pria', 'Remaja Pria')}</option>
            <option value="remaja_putri">{getCatLabel('remaja_putri', 'Remaja Putri')}</option>
            <option value="ibu_ibu">{getCatLabel('ibu_ibu', 'Ibu-Ibu')}</option>
            <option value="bapak_bapak">{getCatLabel('bapak_bapak', 'Bapak-Bapak')}</option>
            <option value="pasangan">{getCatLabel('pasangan', 'Pasangan')}</option>
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
                <th className="py-3 px-2">Nama Peserta / Tim</th>
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
                    key={row.name}
                    className={`border-b border-abu-100 transition-colors ${
                      isJuaraUmum ? 'gold-row hover:bg-amber-100/60' : 'hover:bg-abu-50'
                    }`}
                  >
                    {/* Rank number */}
                    <td className="py-3 pr-2 text-center font-bold text-abu-500">
                      {index + 1}
                    </td>

                    {/* Participant/Team name — trophy for Juara Umum */}
                    <td className="py-3 px-2 font-semibold text-abu-900 flex items-center gap-1.5">
                      {isJuaraUmum && (
                        <Icon icon="solar:cup-bold" className="w-5 h-5 text-yellow-500 flex-shrink-0 animate-pulse" />
                      )}
                      <span>{row.name}</span>
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
