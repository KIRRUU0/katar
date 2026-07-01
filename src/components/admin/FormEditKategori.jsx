/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'
import { getCustomCategories } from './adminUtils'

export default function FormEditKategori({ onCategoriesUpdated }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [toast, setToast] = useState({ message: '', type: '' })
  
  // Use ref to track initial mount loading to prevent auto-saving the initial load
  const isInitialMount = useRef(true)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      let list = []
      let success = false
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('category_settings')
          .select('*')
          .order('updated_at', { ascending: true })
        
        if (!error && data) {
          success = true
          list = data.map(item => ({
            id: item.category_id,
            name: item.display_name,
            type: item.category_id.startsWith('grup_') ? 'grup' : 'individu'
          }))
        }
      }

      // If Supabase is not configured or query failed, fall back to local storage
      if (!success) {
        list = getCustomCategories()
      }

      setCategories(list)
    } catch (err) {
      console.warn('Failed to load category settings:', err)
    } finally {
      setLoading(false)
      // Allow auto-save only after the first load is done
      setTimeout(() => {
        isInitialMount.current = false
      }, 500)
    }
  }, [])

  useEffect(() => {
    if (loading) {
      loadCategories()
    }
  }, [loadCategories, loading])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 4000)
  }

  const handleFieldChange = (index, field, value) => {
    setCategories(prev => {
      const updated = [...prev]
      let item = { ...updated[index], [field]: value }
      
      if (field === 'type') {
        const cleanId = item.id.replace(/^(grup_|ind_)/, '')
        item.id = (value === 'grup' ? 'grup_' : 'ind_') + cleanId
      }
      
      updated[index] = item
      return updated
    })
  }

  const handleAddCategory = () => {
    const newId = `ind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    setCategories(prev => [...prev, { id: newId, name: '', type: 'individu' }])
  }

  const handleRemoveCategory = (index) => {
    setCategories(prev => prev.filter((_, i) => i !== index))
  }

  // Auto-save debounced effect
  useEffect(() => {
    if (isInitialMount.current || loading) return

    setSyncStatus('saving')

    const timer = setTimeout(async () => {
      const cleanList = categories.filter(c => c.name.trim() !== '')

      try {
        if (isSupabaseConfigured()) {
          // Fetch existing keys in database to know which ones to delete
          const { data: dbData } = await supabase
            .from('category_settings')
            .select('category_id')
          
          const dbIds = dbData ? dbData.map(d => d.category_id) : []
          const currentIds = cleanList.map(c => c.id)
          
          // Find deleted category IDs
          const toDelete = dbIds.filter(id => !currentIds.includes(id))
          
          // 1. Delete removed categories
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase
              .from('category_settings')
              .delete()
              .in('category_id', toDelete)
            if (delErr) throw delErr
          }

          // 2. Upsert current categories
          if (cleanList.length > 0) {
            const upsertData = cleanList.map(cat => ({
              category_id: cat.id,
              display_name: cat.name.trim()
            }))
            const { error: upsertErr } = await supabase
              .from('category_settings')
              .upsert(upsertData)
            if (upsertErr) throw upsertErr
          }
        }

        // Format for local storage
        const listData = cleanList.map(cat => ({
          id: cat.id,
          name: cat.name.trim(),
          type: cat.type
        }))

        // Save to local storage for instant sync
        localStorage.setItem('katar_custom_categories', JSON.stringify(listData))

        // Trigger update event
        window.dispatchEvent(new Event('katar_categories_updated'))
        onCategoriesUpdated?.()

        setSyncStatus('saved')
      } catch (err) {
        console.warn('Auto-save failed:', err)
        setSyncStatus('error')
        showToast(`Gagal menyimpan otomatis: ${err.message}. Pastikan constraint check tabel tournaments sudah dihapus di dashboard Supabase.`, 'error')
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [categories, loading, onCategoriesUpdated])

  return (
    <div className="card p-6 bg-white border border-abu-200 shadow-sm relative">
      {/* Auto save indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-1.5 text-xs font-semibold">
        {syncStatus === 'saving' && (
          <span className="text-blue-600 flex items-center gap-1">
            <Icon icon="solar:spinner-linear" className="w-3.5 h-3.5 animate-spin" />
            Menyimpan otomatis...
          </span>
        )}
        {syncStatus === 'saved' && (
          <span className="text-emerald-600 flex items-center gap-1">
            <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5" />
            Perubahan tersimpan
          </span>
        )}
        {syncStatus === 'error' && (
          <span className="text-merah-600 flex items-center gap-1">
            <Icon icon="solar:danger-bold" className="w-3.5 h-3.5" />
            Gagal menyimpan
          </span>
        )}
      </div>

      <h3 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-4">
        <Icon icon="solar:user-speak-bold-duotone" className="w-6 h-6 text-merah-600" />
        Batasan Usia & Kategori Partisipan
      </h3>

      <p className="text-sm text-abu-500 mb-6">
        Kelola batasan usia kategori lomba di bawah ini. Perubahan akan disimpan secara otomatis. Kategori yang Anda tambahkan di sini akan otomatis muncul sebagai opsi di formulir pendaftaran warga, klasemen, jadwal lomba, dan statistik dashboard.
      </p>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Icon icon="solar:spinner-linear" className="w-6 h-6 animate-spin text-merah-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {categories.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-abu-200 rounded-2xl bg-abu-50/50">
              <Icon icon="solar:users-group-two-rounded-broken" className="w-10 h-10 text-abu-400 mx-auto mb-2" />
              <p className="text-sm text-abu-500 font-medium">Belum ada kategori partisipan dikonfigurasi.</p>
              <p className="text-xs text-abu-400 mt-1">Klik tombol di bawah untuk menambahkan kategori baru.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="flex items-center gap-3 bg-abu-50/50 p-3 rounded-xl border border-abu-150">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Anak-Anak (4-6 Tahun)"
                      className="form-input text-sm focus-ring bg-white"
                      value={cat.name}
                      onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <select
                      className="form-select text-sm focus-ring bg-white"
                      value={cat.type}
                      onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                    >
                      <option value="individu">Individu</option>
                      <option value="grup">Grup/Tim</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(idx)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center border border-merah-200 bg-white hover:bg-merah-50 text-merah-600 hover:text-merah-700 transition-all cursor-pointer"
                    title="Hapus Kategori"
                  >
                    <Icon icon="solar:trash-bin-trash-bold" className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-start items-center pt-4 border-t border-abu-150">
            <button
              type="button"
              onClick={handleAddCategory}
              className="btn border border-abu-200 bg-white hover:bg-abu-50 text-abu-700 min-h-[42px] px-5 flex items-center gap-2 cursor-pointer w-full sm:w-auto"
            >
              <Icon icon="solar:add-circle-bold" className="w-5 h-5 text-abu-500" />
              <span>Tambah Kategori Baru ({categories.length})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
