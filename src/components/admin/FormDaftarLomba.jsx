import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'
import { getCustomCategories, getCategoryName } from './adminUtils'

export default function FormDaftarLomba({ tournaments, onTournamentUpdated }) {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  const [categories, setCategories] = useState(getCustomCategories())

  // Listen to custom categories updates
  useEffect(() => {
    const handleCatsUpdate = () => {
      setCategories(getCustomCategories())
    }
    window.addEventListener('katar_categories_updated', handleCatsUpdate)
    return () => window.removeEventListener('katar_categories_updated', handleCatsUpdate)
  }, [])
  
  // Edit modal state
  const [editingTournament, setEditingTournament] = useState(null)
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    type: 'individu',
    category: 'anak_4_6',
    status: 'belum',
    location: '',
    schedule: '',
    endTime: '',
    pj: '',
    year_id: '',
    year_number: 2026
  })
  const [dbYears, setDbYears] = useState([])
  const [yearsList, setYearsList] = useState([])
  
  // Load dbYears to map in edit modal
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    ;(async () => {
      const { data } = await supabase.from('years').select('id, year_number')
      if (data && data.length > 0) {
        setDbYears(data)
        setYearsList(data.map(y => y.year_number).sort((a, b) => b - a))
      }
    })()
  }, [])

  const handleEditClick = (t) => {
    const yearObj = dbYears.find(y => y.year_number === t.year)
    setEditForm({
      id: t.id,
      name: t.name,
      type: t.type,
      category: t.category || 'anak_4_6',
      status: t.status,
      location: t.location || '',
      schedule: t.schedule ? t.schedule.substring(0, 16) : '',
      endTime: t.end_time ? t.end_time.substring(0, 16) : '',
      pj: t.pj || '',
      year_id: yearObj ? yearObj.id : (t.year_id || ''),
      year_number: t.year
    })
    setEditingTournament(t)
  }

  const handleEditChange = (field, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'category') {
        const catObj = categories.find(c => c.id === value)
        if (catObj) {
          updated.type = catObj.type
        }
      }
      if (field === 'year_number') {
        const yearObj = dbYears.find(y => y.year_number === Number(value))
        if (yearObj) {
          updated.year_id = yearObj.id
        }
      }
      return updated
    })
  }

  const handleUpdate = async (e) => {
    if (!window.confirm("Yakin ingin memperbarui data ini?")) return;
    e.preventDefault()
    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      if (!isSupabaseConfigured()) {
        let localTourneys = JSON.parse(localStorage.getItem('katar_tournaments') || '[]')
        if (localTourneys.length === 0) {
          localTourneys = [...tournaments]
        }
        
        const idx = localTourneys.findIndex(t => t.id === editForm.id)
        if (idx !== -1) {
          localTourneys[idx] = {
            ...localTourneys[idx],
            name: editForm.name,
            type: editForm.type,
            category: editForm.category,
            status: editForm.status,
            location: editForm.location,
            schedule: editForm.schedule ? new Date(editForm.schedule).toISOString() : null,
            end_time: editForm.endTime ? new Date(editForm.endTime).toISOString() : null,
            pj: editForm.pj || null,
            year: editForm.year_number
          }
          localStorage.setItem('katar_tournaments', JSON.stringify(localTourneys))
        }
        
        setToast({ message: `(Demo) Lomba "${editForm.name}" berhasil diperbarui!`, type: 'success' })
      } else {
        let updateError = null
        try {
          const { error } = await supabase.rpc('update_tournament', {
            t_id: editForm.id,
            t_name: editForm.name,
            t_type: editForm.type,
            t_category: editForm.category,
            t_status: editForm.status,
            t_location: editForm.location,
            t_schedule: editForm.schedule ? new Date(editForm.schedule).toISOString() : null,
            t_end_time: editForm.endTime ? new Date(editForm.endTime).toISOString() : null,
            t_pj: editForm.pj || null,
            t_year_id: editForm.year_id
          })
          updateError = error
        } catch (err) {
          console.warn('RPC call threw exception, falling back to standard PATCH:', err)
          const { error } = await supabase
            .from('tournaments')
            .update({
              name: editForm.name,
              type: editForm.type,
              category: editForm.category,
              status: editForm.status,
              location: editForm.location,
              schedule: editForm.schedule ? new Date(editForm.schedule).toISOString() : null,
              end_time: editForm.endTime ? new Date(editForm.endTime).toISOString() : null,
              pj: editForm.pj || null,
              year_id: editForm.year_id
            })
            .eq('id', editForm.id)
          updateError = error
        }

        if (updateError) throw updateError
        setToast({ message: `Lomba "${editForm.name}" berhasil diperbarui!`, type: 'success' })
      }
      
      setEditingTournament(null)
      onTournamentUpdated?.()
    } catch (err) {
      setToast({ message: `Gagal memperbarui: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (t) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus lomba "${t.name}"? Semua data peserta dan pemenang terkait akan ikut terhapus.`)) return
    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      if (!isSupabaseConfigured()) {
        let localTourneys = JSON.parse(localStorage.getItem('katar_tournaments') || '[]')
        if (localTourneys.length === 0) {
          localTourneys = [...tournaments]
        }
        const updated = localTourneys.filter(item => item.id !== t.id)
        localStorage.setItem('katar_tournaments', JSON.stringify(updated))
        setToast({ message: `(Demo) Lomba "${t.name}" berhasil dihapus!`, type: 'success' })
      } else {
        const { error } = await supabase
          .from('tournaments')
          .delete()
          .eq('id', t.id)
        if (error) throw error
        setToast({ message: `Lomba "${t.name}" berhasil dihapus!`, type: 'success' })
      }
      onTournamentUpdated?.()
    } catch (err) {
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section mt-6">
      <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
        <Icon icon="solar:settings-bold-duotone" className="w-5 h-5 text-merah-600" />
        Daftar &amp; Kelola Detail Lomba
      </h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {tournaments.length === 0 ? (
        <p className="text-sm text-abu-400 text-center py-6">Tidak ada data lomba.</p>
      ) : (
        <div className="overflow-x-auto border border-abu-200 rounded-2xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-abu-100 text-abu-700 font-semibold border-b border-abu-200">
                <th className="p-3 text-center w-12">No.</th>
                <th className="p-3">Nama Lomba</th>
                <th className="p-3">Tahun</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Lokasi</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abu-200">
              {tournaments.map((t, idx) => (
                <tr key={t.id} className="hover:bg-abu-50/50 transition-colors">
                  <td className="p-3 text-center font-medium text-abu-500">{idx + 1}</td>
                  <td className="p-3 font-semibold text-abu-900">{t.name}</td>
                  <td className="p-3 text-abu-600 font-medium">{t.year}</td>
                  <td className="p-3">
                    <span className="capitalize text-xs font-bold text-merah-600 bg-merah-50 px-2 py-0.5 rounded-full">
                      {t.category ? getCategoryName(t.category) : t.type}
                    </span>
                  </td>
                  <td className="p-3 text-abu-600">{t.location || '-'}</td>
                  <td className="p-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full
                      ${t.status === 'selesai' ? 'bg-green-50 text-green-700 border border-green-200' :
                        t.status === 'jalan' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-abu-100 text-abu-600'
                      }`}
                    >
                      {t.status === 'selesai' ? 'Selesai' : t.status === 'jalan' ? 'Berjalan' : 'Belum Mulai'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEditClick(t)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                        title="Edit Lomba"
                      >
                        <Icon icon="solar:pen-bold" className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 text-merah-600 hover:text-merah-800 hover:bg-merah-50 rounded-lg transition-colors focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                        title="Hapus Lomba"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingTournament && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-merah-700 to-merah-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-white" />
                Edit Detail Lomba
              </h3>
              <button
                onClick={() => setEditingTournament(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Nama Lomba</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Tahun</label>
                  {isSupabaseConfigured() ? (
                    <select
                      className="form-select"
                      value={editForm.year_number}
                      onChange={(e) => handleEditChange('year_number', Number(e.target.value))}
                      required
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      className="form-input"
                      value={editForm.year_number}
                      onChange={(e) => handleEditChange('year_number', Number(e.target.value))}
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Kategori</label>
                  <select
                     className="form-select"
                     value={editForm.category}
                     onChange={(e) => handleEditChange('category', e.target.value)}
                     required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Lokasi</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.location}
                    onChange={(e) => handleEditChange('location', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Penanggung Jawab (PJ)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Hirzan Arziqi"
                    value={editForm.pj}
                    onChange={(e) => handleEditChange('pj', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Status</label>
                  <select
                    className="form-select"
                    value={editForm.status}
                    onChange={(e) => handleEditChange('status', e.target.value)}
                    required
                  >
                    <option value="belum">Belum Mulai</option>
                    <option value="jalan">Sedang Berjalan</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Waktu Mulai</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editForm.schedule}
                    onChange={(e) => handleEditChange('schedule', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Waktu Selesai</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editForm.endTime}
                    onChange={(e) => handleEditChange('endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-abu-100">
                <button
                  type="button"
                  onClick={() => setEditingTournament(null)}
                  className="btn btn-secondary cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary cursor-pointer min-h-[44px]"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
