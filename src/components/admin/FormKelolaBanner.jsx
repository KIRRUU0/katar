/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { uploadImage } from './adminUtils'
import Toast from './Toast'

export default function FormKelolaBanner() {
  const [banners, setBanners] = useState([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  const [form, setForm] = useState({
    imageUrl: '',
    ratio: 'horizontal',
    linkUrl: '',
    isActive: true
  })

  const fetchBanners = useCallback(async () => {
    setFetching(true)
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('popup_banners')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          setBanners(data)
          setFetching(false)
          return
        }
      }

      // Local storage fallback
      const localData = localStorage.getItem('katar_popup_banners')
      if (localData) {
        setBanners(JSON.parse(localData))
      } else {
        setBanners([])
      }
    } catch (err) {
      console.warn('Failed to load popup banners:', err)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (fetching) {
      fetchBanners()
    }
  }, [fetchBanners, fetching])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 4000)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setToast({ message: '', type: '' })
    try {
      const url = await uploadImage(file)
      setForm(prev => ({ ...prev, imageUrl: url }))
      showToast('Gambar banner berhasil diunggah!')
    } catch (err) {
      showToast(`Gagal mengunggah gambar: ${err.message}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.imageUrl.trim()) return

    setLoading(true)
    setToast({ message: '', type: '' })

    const newBanner = {
      image_url: form.imageUrl.trim(),
      ratio: form.ratio,
      link_url: form.linkUrl.trim() || null,
      is_active: form.isActive
    }

    try {
      if (isSupabaseConfigured()) {
        // If the new banner is active, deactivate other banners first
        if (newBanner.is_active) {
          await supabase
            .from('popup_banners')
            .update({ is_active: false })
            .neq('id', '00000000-0000-0000-0000-000000000000') // Deactivate all
        }

        const { error } = await supabase
          .from('popup_banners')
          .insert(newBanner)

        if (error) throw error
        await fetchBanners()
        showToast('Banner baru berhasil disimpan!')
      } else {
        // Local storage fallback
        const id = 'local-banner-' + Date.now()
        const demoObj = {
          id,
          image_url: newBanner.image_url,
          ratio: newBanner.ratio,
          link_url: newBanner.link_url,
          is_active: newBanner.is_active,
          created_at: new Date().toISOString()
        }

        let updatedList = [...banners]
        if (demoObj.is_active) {
          updatedList = updatedList.map(b => ({ ...b, is_active: false }))
        }
        updatedList = [demoObj, ...updatedList]

        setBanners(updatedList)
        localStorage.setItem('katar_popup_banners', JSON.stringify(updatedList))
        showToast('Banner baru berhasil disimpan secara lokal (Mode Demo)!')
      }

      setForm({ imageUrl: '', ratio: 'horizontal', linkUrl: '', isActive: true })
    } catch (err) {
      showToast(`Gagal menyimpan banner: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (banner) => {
    const newStatus = !banner.is_active
    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      if (isSupabaseConfigured()) {
        // If activating, deactivate others first
        if (newStatus) {
          const { error: deactivateError } = await supabase
            .from('popup_banners')
            .update({ is_active: false })
            .neq('id', banner.id)
          if (deactivateError) throw deactivateError
        }

        const { error } = await supabase
          .from('popup_banners')
          .update({ is_active: newStatus })
          .eq('id', banner.id)

        if (error) throw error
        await fetchBanners()
        showToast(`Banner berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}!`)
      } else {
        const updatedList = banners.map(b => {
          if (b.id === banner.id) {
            return { ...b, is_active: newStatus }
          }
          if (newStatus) {
            return { ...b, is_active: false }
          }
          return b
        })
        setBanners(updatedList)
        localStorage.setItem('katar_popup_banners', JSON.stringify(updatedList))
        showToast(`Banner berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}!`)
      }
    } catch (err) {
      showToast(`Gagal mengubah status: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus banner ini?')) return
    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('popup_banners')
          .delete()
          .eq('id', id)

        if (error) throw error
        await fetchBanners()
        showToast('Banner berhasil dihapus!')
      } else {
        const updatedList = banners.filter(b => b.id !== id)
        setBanners(updatedList)
        localStorage.setItem('katar_popup_banners', JSON.stringify(updatedList))
        showToast('Banner berhasil dihapus secara lokal!')
      }
    } catch (err) {
      showToast(`Gagal menghapus banner: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 bg-white border border-abu-200 shadow-sm mt-6">
      <h3 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-4">
        <Icon icon="solar:gallery-round-bold-duotone" className="w-6 h-6 text-merah-600" />
        Kelola Banner Pengumuman
      </h3>

      <p className="text-sm text-abu-500 mb-6">
        Gunakan panel ini untuk mengatur banner promo/pengumuman popup yang otomatis muncul di halaman awal (Landing Page) ketika website dibuka. Banner akan tampil selama 8 detik sebelum menutup otomatis, atau dapat ditutup manual dengan tombol close (X).
      </p>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form area (5 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-abu-50 border border-abu-200/60 p-5 rounded-2xl space-y-4">
          <h4 className="font-heading text-sm font-bold text-abu-800 uppercase tracking-wider">Tambah Banner Baru</h4>
          
          {/* File upload */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-abu-600 uppercase">File Gambar Banner</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
                id="banner-file-input"
              />
              <label
                htmlFor="banner-file-input"
                className="btn btn-secondary text-xs flex items-center gap-2 min-h-[38px] px-4 cursor-pointer hover:bg-abu-150 transition-colors"
              >
                <Icon icon="solar:upload-linear" className="w-4 h-4" />
                {uploading ? 'Mengunggah...' : 'Pilih Gambar'}
              </label>
              {form.imageUrl && (
                <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                  <Icon icon="solar:check-circle-bold" className="w-4.5 h-4.5" />
                  Siap diunggah
                </span>
              )}
            </div>
          </div>

          {/* Image URL input (manual URL) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-abu-600 uppercase">Atau Paste URL Gambar</label>
            <input
              type="text"
              placeholder="https://example.com/banner.jpg"
              className="form-input text-sm"
              value={form.imageUrl}
              onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
            />
          </div>

          {/* Image preview box */}
          {form.imageUrl && (
            <div className="mt-2 border border-abu-200 rounded-xl overflow-hidden bg-abu-100 relative">
              <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Preview ({form.ratio})
              </div>
              <div className={`flex items-center justify-center p-2 ${
                form.ratio === 'horizontal' ? 'aspect-[16/9]' : 'aspect-[3/4]'
              }`}>
                <img
                  src={form.imageUrl}
                  alt="Banner preview"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=640'
                  }}
                />
              </div>
            </div>
          )}

          {/* Aspect Ratio Selector */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-abu-600 uppercase">Rasio Tampilan Banner</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'horizontal', label: 'Landscape (16:9)', icon: 'solar:slider-horizontal-linear' },
                { id: 'vertical', label: 'Portrait (3:4)', icon: 'solar:slider-vertical-linear' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setForm(prev => ({ ...prev, ratio: opt.id }))}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 ${
                    form.ratio === opt.id
                      ? 'bg-merah-50 border-merah-200 text-merah-700 font-bold'
                      : 'bg-white border-abu-200 text-abu-600 hover:bg-abu-100'
                  }`}
                >
                  <Icon icon={opt.icon} className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link URL */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-abu-600 uppercase">Link URL Tujuan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: /league atau https://..."
              className="form-input text-sm"
              value={form.linkUrl}
              onChange={(e) => setForm(prev => ({ ...prev, linkUrl: e.target.value }))}
            />
            <p className="text-[10px] text-abu-400">Jika diisi, banner dapat diklik dan akan mengarahkan pengguna ke halaman tersebut.</p>
          </div>

          {/* Toggle Active status */}
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-abu-600 uppercase">Langsung Aktifkan</label>
              <span className="text-[10px] text-abu-400">Jadikan banner popup aktif sekarang.</span>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none focus-ring ${
                form.isActive ? 'bg-merah-600' : 'bg-abu-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform ${
                  form.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !form.imageUrl}
            className="btn btn-primary w-full min-h-[44px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            <Icon icon="solar:diskette-bold" className="w-5 h-5" />
            <span>{loading ? 'Menyimpan...' : 'Simpan Banner'}</span>
          </button>
        </form>

        {/* Banners list area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h4 className="font-heading text-sm font-bold text-abu-800 uppercase tracking-wider">Daftar Banner</h4>

          {fetching ? (
            <div className="flex flex-col items-center justify-center py-12 text-abu-400 gap-2">
              <Icon icon="solar:spinner-linear" className="w-8 h-8 animate-spin text-merah-600" />
              <span className="text-xs">Memuat daftar banner...</span>
            </div>
          ) : banners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-abu-200 rounded-2xl bg-abu-50/50 text-center">
              <Icon icon="solar:gallery-round-broken" className="w-12 h-12 text-abu-350 mb-2" />
              <p className="text-sm font-bold text-abu-700">Belum Ada Banner</p>
              <p className="text-xs text-abu-400 max-w-xs mt-1">Silakan upload banner promo atau pengumuman pertamamu di panel kiri.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banners.map((b) => (
                <div key={b.id} className="border border-abu-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col relative group">
                  
                  {/* Aspect Ratio container */}
                  <div className={`relative bg-abu-100 flex items-center justify-center overflow-hidden ${
                    b.ratio === 'horizontal' ? 'aspect-[16/9]' : 'aspect-[3/4]'
                  }`}>
                    <img
                      src={b.image_url}
                      alt="Banner list item"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Overlay badge for Ratio */}
                    <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                      <Icon icon={b.ratio === 'horizontal' ? 'solar:slider-horizontal-linear' : 'solar:slider-vertical-linear'} className="w-3 h-3" />
                      {b.ratio === 'horizontal' ? 'Landscape' : 'Portrait'}
                    </div>

                    {/* Active Status Badge */}
                    {b.is_active && (
                      <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Aktif
                      </div>
                    )}
                  </div>

                  {/* Body description */}
                  <div className="p-3.5 flex-grow flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs text-abu-500 truncate flex items-center gap-1.5">
                        <Icon icon="solar:link-linear" className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{b.link_url || 'Tidak ada link'}</span>
                      </p>
                      <p className="text-[10px] text-abu-400">
                        Diunggah: {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-abu-150 pt-2.5">
                      {/* Toggle status */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(b)}
                        disabled={loading}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 cursor-pointer transition-all duration-200 ${
                          b.is_active
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-abu-50 border-abu-200 text-abu-600 hover:bg-abu-150'
                        }`}
                      >
                        <Icon icon={b.is_active ? 'solar:check-circle-bold' : 'solar:play-bold'} className="w-4 h-4" />
                        <span>{b.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(b.id)}
                        disabled={loading}
                        className="p-2 border border-abu-200 text-abu-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 cursor-pointer"
                        title="Hapus banner"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
