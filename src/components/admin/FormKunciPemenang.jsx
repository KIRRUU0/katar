import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'

export default function FormKunciPemenang({ tournaments, onTournamentUpdated }) {
  const [selectedId, setSelectedId] = useState('')
  const [entries, setEntries] = useState([])   // participants or teams
  const [winners, setWinners] = useState({ gold: '', silver: '', bronze: '' })
  const [loading, setLoading] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  const selected = tournaments.find((t) => t.id === selectedId) || null

  const [prevSelectedId, setPrevSelectedId] = useState(selectedId)

  // Adjust state during render when selectedId changes
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId)
    setEntries([])
    setWinners({ gold: '', silver: '', bronze: '' })
    setToast({ message: '', type: '' })
  }

  // Fetch participants/teams when tournament changes
  useEffect(() => {
    if (!selectedId) return

    const fetchEntries = async () => {
      setLoadingEntries(true)
      try {
        if (!isSupabaseConfigured()) {
          // Demo entries
          await new Promise((r) => setTimeout(r, 300))
          setEntries([
            { id: 'e1', name: 'Peserta Demo A' },
            { id: 'e2', name: 'Peserta Demo B' },
            { id: 'e3', name: 'Peserta Demo C' },
            { id: 'e4', name: 'Peserta Demo D' },
          ])
        } else {
          const table = selected?.type === 'individu' ? 'participants' : 'teams'
          const selectCols = selected?.type === 'individu' ? 'id, name' : 'id, team_name'
          const { data, error } = await supabase
            .from(table)
            .select(selectCols)
            .eq('tournament_id', selectedId)
          if (error) throw error
          setEntries(data || [])
        }
      } catch (err) {
        setToast({ message: `Gagal memuat data: ${err.message}`, type: 'error' })
      } finally {
        setLoadingEntries(false)
      }
    }
    fetchEntries()
  }, [selectedId, selected?.type])

  const handlePublish = async () => {
    if (!winners.gold || !winners.silver || !winners.bronze) {
      setToast({ message: 'Pilih semua juara (1, 2, 3) terlebih dahulu.', type: 'error' })
      return
    }
    // Prevent duplicate selections in the same tournament
    if (new Set([winners.gold, winners.silver, winners.bronze]).size < 3) {
      setToast({ message: 'Juara 1, 2, dan 3 harus berbeda.', type: 'error' })
      return
    }

    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      const goldEntry = entries.find(e => e.id === winners.gold)
      const silverEntry = entries.find(e => e.id === winners.silver)
      const bronzeEntry = entries.find(e => e.id === winners.bronze)

      if (!goldEntry || !silverEntry || !bronzeEntry) {
        setToast({ message: 'Juara yang dipilih tidak valid.', type: 'error' })
        return
      }

      const goldName = goldEntry.name || goldEntry.team_name
      const silverName = silverEntry.name || silverEntry.team_name
      const bronzeName = bronzeEntry.name || bronzeEntry.team_name

      // Check if Juara 1 winner has already won Juara 1 in another tournament this year
      let alreadyWonGold = false
      if (!isSupabaseConfigured()) {
        const localWinners = JSON.parse(localStorage.getItem('katar_winners') || '[]')
        const localTourneys = JSON.parse(localStorage.getItem('katar_tournaments') || '[]')
        const targetYear = selected ? selected.year : new Date().getFullYear()

        const existingGoldWins = localWinners.filter(w => {
          const t = localTourneys.find(lt => lt.id === w.tournament_id)
          return w.rank === 1 && t && t.year === targetYear
        })

        if (existingGoldWins.some(w => w.winner_name_or_team === goldName)) {
          alreadyWonGold = true
        }
      } else {
        const { data: existingWins, error: fetchErr } = await supabase
          .from('winners')
          .select('winner_name_or_team, tournaments!inner(year_id)')
          .eq('rank', 1)
          .eq('tournaments.year_id', selected?.year_id)
        
        if (fetchErr) throw fetchErr

        if (existingWins && existingWins.some(w => w.winner_name_or_team === goldName)) {
          alreadyWonGold = true
        }
      }

      if (alreadyWonGold) {
        setToast({ 
          message: `Gagal: Peserta/Tim "${goldName}" sudah pernah mendapatkan Juara 1 di lomba lain pada tahun ini.`, 
          type: 'error' 
        })
        return
      }

      if (!isSupabaseConfigured()) {
        // Save to local storage for demo mode
        const localWinners = JSON.parse(localStorage.getItem('katar_winners') || '[]')
        const newWinners = [
          {
            id: 'winner-' + Date.now() + '-1',
            tournament_id: selectedId,
            rank: 1,
            winner_name_or_team: goldName,
            origin_block: null,
            created_at: new Date().toISOString()
          },
          {
            id: 'winner-' + Date.now() + '-2',
            tournament_id: selectedId,
            rank: 2,
            winner_name_or_team: silverName,
            origin_block: null,
            created_at: new Date().toISOString()
          },
          {
            id: 'winner-' + Date.now() + '-3',
            tournament_id: selectedId,
            rank: 3,
            winner_name_or_team: bronzeName,
            origin_block: null,
            created_at: new Date().toISOString()
          }
        ]
        localStorage.setItem('katar_winners', JSON.stringify([...localWinners, ...newWinners]))

        // Update local tournament status
        let localTourneys = JSON.parse(localStorage.getItem('katar_tournaments') || '[]')
        const idx = localTourneys.findIndex(t => t.id === selectedId)
        if (idx !== -1) {
          localTourneys[idx].status = 'selesai'
          localStorage.setItem('katar_tournaments', JSON.stringify(localTourneys))
        }
      } else {
        // Insert winners in Supabase database using correct schema columns
        const { error: winErr } = await supabase.from('winners').insert([
          { tournament_id: selectedId, rank: 1, winner_name_or_team: goldName, origin_block: null },
          { tournament_id: selectedId, rank: 2, winner_name_or_team: silverName, origin_block: null },
          { tournament_id: selectedId, rank: 3, winner_name_or_team: bronzeName, origin_block: null },
        ])
        if (winErr) throw winErr

        // Update tournament status to selesai
        const { error: updErr } = await supabase
          .from('tournaments')
          .update({ status: 'selesai' })
          .eq('id', selectedId)
        if (updErr) throw updErr
      }

      setToast({ message: 'Hasil league berhasil dipublish! Selamat kepada para juara!', type: 'success' })
      setSelectedId('')
      setEntries([])
      setWinners({ gold: '', silver: '', bronze: '' })
      onTournamentUpdated?.()
    } catch (err) {
      setToast({ message: `Gagal publish: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const renderWinnerSelect = (label, icon, iconColorClass, key) => (
    <div>
      <label className="block text-sm font-semibold text-abu-700 flex items-center gap-1.5 mb-1">
        <Icon icon={icon} className={`w-4 h-4 ${iconColorClass}`} />
        {label}
      </label>
      <select
        className="form-select"
        value={winners[key]}
        onChange={(e) => setWinners((w) => ({ ...w, [key]: e.target.value }))}
      >
        <option value="">— Pilih —</option>
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name || entry.team_name}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="admin-section">
      <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
        <Icon icon="solar:cup-bold-duotone" className="w-5 h-5 text-merah-600" />
        Kunci Pemenang
      </h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Tournament selector */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-abu-700 mb-1">Pilih Lomba</label>
        <select
          className="form-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Pilih lomba —</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.type}) — {t.year}
            </option>
          ))}
        </select>
      </div>

      {/* Winner dropdowns */}
      {selected && (
        <div className="space-y-4 pt-2 border-t border-abu-200">
          {loadingEntries ? (
            <p className="text-sm text-abu-400 py-4 text-center">Memuat peserta...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-abu-400 py-4 text-center">
              Belum ada peserta/tim terdaftar untuk lomba ini.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                {renderWinnerSelect('Juara 1', 'solar:cup-first-bold', 'text-amber-500', 'gold')}
                {renderWinnerSelect('Juara 2', 'solar:cup-first-bold', 'text-slate-400', 'silver')}
                {renderWinnerSelect('Juara 3', 'solar:cup-first-bold', 'text-amber-700', 'bronze')}
              </div>

              {/* Big publish button */}
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className="btn btn-success w-full min-h-[56px] font-bold text-lg mt-4
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Mempublish...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Icon icon="solar:upload-bold" className="w-5 h-5 text-white" />
                    PUBLISH HASIL LEAGUE
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
