import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'

export default function FormEditKategori({ onCategoriesUpdated }) {
  const [categories, setCategories] = useState({
    anak_4_6: 'Anak-Anak 4-6 Tahun',
    anak_7_12: 'Anak-Anak 7-12 Tahun',
    remaja_pria: 'Remaja Pria',
    remaja_putri: 'Remaja Putri',
    ibu_ibu: 'Ibu-Ibu',
    bapak_bapak: 'Bapak-Bapak',
    pasangan: 'Pasangan',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      let customList = []
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('category_settings')
          .select('*')
        
        if (!error && data && data.length > 0) {
          customList = data.map(item => ({
            id: item.category_id,
            name: item.display_name
          }))
        }
      }

      if (customList.length === 0) {
        const local = localStorage.getItem('katar_custom_categories')
        if (local) {
          customList = JSON.parse(local)
        }
      }

      if (customList.length > 0) {
        const catMap = {
          anak_4_6: 'Anak-Anak 4-6 Tahun',
          anak_7_12: 'Anak-Anak 7-12 Tahun',
          remaja_pria: 'Remaja Pria',
          remaja_putri: 'Remaja Putri',
          ibu_ibu: 'Ibu-Ibu',
          bapak_bapak: 'Bapak-Bapak',
          pasangan: 'Pasangan',
        }
        customList.forEach(item => {
          if (catMap[item.id] !== undefined) {
            catMap[item.id] = item.name
          }
        })
        setCategories(catMap)
      }
    } catch (err) {
      console.warn('Failed to load category settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 4000)
  }

  const handleFieldChange = (key, value) => {
    setCategories(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setToast({ message: '', type: '' })

    const listData = Object.keys(categories).map(key => ({
      id: key,
      name: categories[key].trim()
    }))

    try {
      if (isSupabaseConfigured()) {
        const upsertData = Object.keys(categories).map(key => ({
          category_id: key,
          display_name: categories[key].trim()
        }))

        const { error } = await supabase
          .from('category_settings')
          .upsert(upsertData)

        if (error) throw error
      }

      // Save to local storage for instant sync
      localStorage.setItem('katar_custom_categories', JSON.stringify(listData))

      // Trigger update event
      window.dispatchEvent(new Event('katar_categories_updated'))
      onCategoriesUpdated?.()

      showToast('Rentang usia / penamaan kategori partisipan berhasil diperbarui!')
    } catch (err) {
      showToast(`Gagal menyimpan perubahan: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const categoryLabels = {
    anak_4_6: 'Anak 4-6 Tahun (Default)',
    anak_7_12: 'Anak 7-12 Tahun (Default)',
    remaja_pria: 'Remaja Pria (Default)',
    remaja_putri: 'Remaja Putri (Default)',
    ibu_ibu: 'Ibu-Ibu (Default)',
    bapak_bapak: 'Bapak-Bapak (Default)',
    pasangan: 'Pasangan / Campuran (Default)',
  }

  return (
    <div className="card p-6 bg-white border border-abu-200 shadow-sm">
      <h3 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-4">
        <Icon icon="solar:user-speak-bold-duotone" className="w-6 h-6 text-merah-600" />
        Batasan Usia & Kategori Partisipan
      </h3>

      <p className="text-sm text-abu-500 mb-6">
        Sesuaikan penamaan batasan usia kategori lomba di bawah ini. Rentang usia terkadang berubah setiap tahunnya. Nama baru ini akan langsung ter-update di menu pendaftaran warga, klasemen, jadwal lomba, dan statistik dashboard.
      </p>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      )}

      {loading && Object.values(categories).every(v => v === '') ? (
        <div className="flex justify-center items-center py-6">
          <Icon icon="solar:spinner-linear" className="w-6 h-6 animate-spin text-merah-600" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(categories).map((key) => (
              <div key={key} className="space-y-1">
                <label className="block text-xs font-bold text-abu-600 uppercase">
                  {categoryLabels[key]}
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Masukkan nama kategori...`}
                  className="form-input text-sm focus-ring"
                  value={categories[key]}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-abu-150">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary min-h-[42px] px-6 flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Icon icon="solar:diskette-bold" className="w-5 h-5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Batasan Usia'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
