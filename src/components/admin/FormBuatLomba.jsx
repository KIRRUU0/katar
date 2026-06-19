import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'
import { FALLBACK_YEARS, DEMO_TOURNAMENTS, CATEGORIES } from './adminUtils'

export default function FormBuatLomba({ onTournamentAdded }) {
  const [years, setYears] = useState(FALLBACK_YEARS)
  const [dbYears, setDbYears] = useState([])
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    name: '',
    category: 'anak_4_6',
    location: '',
    schedule: '',
    pj: '',
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  // Fetch distinct years from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    ;(async () => {
      const { data } = await supabase
        .from('years')
        .select('id, year_number')
      if (data && data.length > 0) {
        setDbYears(data)
        const sortedYears = [...data].map(y => y.year_number).sort((a, b) => b - a)
        setYears(sortedYears)
      }
    })()
  }, [])

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!window.confirm("Yakin ingin menyimpan data ini?")) return;
    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      const selectedCat = CATEGORIES.find(c => c.id === form.category) || CATEGORIES[0]
      const resolvedType = selectedCat.type

      if (!isSupabaseConfigured()) {
        // Demo mode — simulate success
        await new Promise((r) => setTimeout(r, 600))
        
        let localTourneys = JSON.parse(localStorage.getItem('katar_tournaments') || '[]')
        if (localTourneys.length === 0) {
          localTourneys = [...DEMO_TOURNAMENTS]
        }
        const newLocalT = {
          id: 'local-tourney-' + Date.now(),
          name: form.name,
          type: resolvedType,
          category: form.category,
          location: form.location,
          schedule: form.schedule ? new Date(form.schedule).toISOString() : null,
          pj: form.pj || null,
          status: 'belum',
          year: form.year
        }
        localStorage.setItem('katar_tournaments', JSON.stringify([newLocalT, ...localTourneys]))

        setToast({ message: `(Demo) Lomba "${form.name}" berhasil disimpan!`, type: 'success' })
      } else {
        const chosenYearObj = dbYears.find(y => y.year_number === form.year)
        const yearId = chosenYearObj ? chosenYearObj.id : null

        if (!yearId) {
          throw new Error(`Tahun ${form.year} tidak ditemukan di database. Pastikan tabel years sudah terisi.`)
        }

        const { error } = await supabase.from('tournaments').insert({
          year_id: yearId,
          name: form.name,
          type: resolvedType,
          category: form.category,
          location: form.location,
          schedule: form.schedule || null,
          pj: form.pj || null,
          status: 'belum',
        })
        if (error) throw error
        setToast({ message: `Lomba "${form.name}" berhasil disimpan!`, type: 'success' })
      }
      // Reset form
      setForm({ year: new Date().getFullYear(), name: '', category: 'anak_4_6', location: '', schedule: '', pj: '' })
      onTournamentAdded?.()
    } catch (err) {
      setToast({ message: `Gagal: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
        <Icon icon="solar:add-square-bold-duotone" className="w-5 h-5 text-merah-600" />
        Buat Lomba Baru
      </h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Year + Category row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Tahun</label>
            <select
              className="form-select focus-ring"
              value={form.year}
              onChange={(e) => updateField('year', Number(e.target.value))}
              required
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Kategori Partisipan</label>
            <select
              className="form-select focus-ring"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nama Lomba */}
        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Nama Lomba</label>
          <input
            type="text"
            className="form-input focus-ring"
            placeholder="Contoh: Balap Karung"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
        </div>

        {/* Lokasi & PJ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Lokasi</label>
            <input
              type="text"
              className="form-input focus-ring"
              placeholder="Contoh: Lapangan Blok A"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Penanggung Jawab (PJ)</label>
            <input
              type="text"
              className="form-input focus-ring"
              placeholder="Contoh: Hirzan Arziqi"
              value={form.pj}
              onChange={(e) => updateField('pj', e.target.value)}
            />
          </div>
        </div>

        {/* Jadwal */}
        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Jadwal</label>
          <input
            type="datetime-local"
            className="form-input focus-ring"
            value={form.schedule}
            onChange={(e) => updateField('schedule', e.target.value)}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full sm:w-auto min-h-[44px] focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Menyimpan...' : 'Simpan Lomba'}
        </button>
      </form>
    </div>
  )
}
