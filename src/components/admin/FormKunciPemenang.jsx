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

  // Fetch participants/teams when tournament changes
  useEffect(() => {
    if (!selectedId) {
      setEntries([])
      setWinners({ gold: '', silver: '', bronze: '' })
      return
    }
    setWinners({ gold: '', silver: '', bronze: '' })
    setToast({ message: '', type: '' })

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
    // Prevent duplicate selections
    if (new Set([winners.gold, winners.silver, winners.bronze]).size < 3) {
      setToast({ message: 'Juara 1, 2, dan 3 harus berbeda.', type: 'error' })
      return
    }

    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      if (!isSupabaseConfigured()) {
        await new Promise((r) => setTimeout(r, 800))
      } else {
        const entityType = selected?.type === 'individu' ? 'participant' : 'team'
        // Insert winners
        const { error: winErr } = await supabase.from('winners').insert([
          { tournament_id: selectedId, [`${entityType}_id`]: winners.gold, rank: 1 },
          { tournament_id: selectedId, [`${entityType}_id`]: winners.silver, rank: 2 },
          { tournament_id: selectedId, [`${entityType}_id`]: winners.bronze, rank: 3 },
        ])
        if (winErr) throw winErr

        // Update tournament status
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
              <div className="grid grid-cols-1 gap-4 pt-3">
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
