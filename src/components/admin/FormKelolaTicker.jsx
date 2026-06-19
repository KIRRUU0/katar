import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export default function FormKelolaTicker() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  
  const [newMessage, setNewMessage] = useState('')
  const [editingTicker, setEditingTicker] = useState(null)
  const [editText, setEditText] = useState('')

  const fetchTickerData = useCallback(async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          setAnnouncements(data)
          setLoading(false)
          return
        }
      }

      // Local storage fallback
      const localData = localStorage.getItem('katar_announcements')
      if (localData) {
        setAnnouncements(JSON.parse(localData))
      } else {
        const defaultData = [
          { id: '1', message: 'Pendaftaran Lomba 17 Agustus 2026 dibuka!', is_active: true, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', message: 'Lomba Futsal Antar Gang — segera daftar!', is_active: true, created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: '3', message: 'Rapat koordinasi panitia hari Minggu jam 19:00', is_active: true, created_at: new Date(Date.now() - 10800000).toISOString() },
        ]
        setAnnouncements(defaultData)
        localStorage.setItem('katar_announcements', JSON.stringify(defaultData))
      }
    } catch (err) {
      console.warn('Failed to load announcements:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTickerData()
  }, [fetchTickerData])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 4000)
  }

  const handleAddTicker = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const newTickerObj = {
      message: newMessage.trim(),
      is_active: true
    }

    setLoading(true)
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .insert(newTickerObj)
          .select()
          .single()

        if (error) throw error
        setAnnouncements(prev => [data, ...prev])
        setNewMessage('')
        showToast('Pengumuman baru berhasil ditambahkan!')
      } catch (err) {
        showToast(`Gagal menambahkan: ${err.message}`, 'error')
      } finally {
        setLoading(false)
      }
    } else {
      const demoObj = {
        id: 'local-' + Date.now(),
        message: newTickerObj.message,
        is_active: true,
        created_at: new Date().toISOString()
      }
      const updatedList = [demoObj, ...announcements]
      setAnnouncements(updatedList)
      localStorage.setItem('katar_announcements', JSON.stringify(updatedList))
      setNewMessage('')
      showToast('(Demo) Pengumuman baru disimpan secara lokal!')
      setLoading(false)
    }
  }

  const handleToggleActive = async (ticker) => {
    const updatedStatus = !ticker.is_active
    setLoading(true)

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('announcements')
          .update({ is_active: updatedStatus })
          .eq('id', ticker.id)

        if (error) throw error

        setAnnouncements(prev => prev.map(t => t.id === ticker.id ? { ...t, is_active: updatedStatus } : t))
        showToast(`Pengumuman telah ${updatedStatus ? 'diaktifkan' : 'dinonaktifkan'}!`)
      } catch (err) {
        showToast(`Gagal merubah status: ${err.message}`, 'error')
      } finally {
        setLoading(false)
      }
    } else {
      const updatedList = announcements.map(t => t.id === ticker.id ? { ...t, is_active: updatedStatus } : t)
      setAnnouncements(updatedList)
      localStorage.setItem('katar_announcements', JSON.stringify(updatedList))
      showToast(`(Demo) Pengumuman telah ${updatedStatus ? 'diaktifkan' : 'dinonaktifkan'}!`)
      setLoading(false)
    }
  }

  const handleEditTicker = (ticker) => {
    setEditingTicker(ticker)
    setEditText(ticker.message)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editText.trim()) return

    setLoading(true)
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('announcements')
          .update({ message: editText.trim() })
          .eq('id', editingTicker.id)

        if (error) throw error

        setAnnouncements(prev => prev.map(t => t.id === editingTicker.id ? { ...t, message: editText.trim() } : t))
        setEditingTicker(null)
        showToast('Pengumuman berhasil diperbarui!')
      } catch (err) {
        showToast(`Gagal menyimpan: ${err.message}`, 'error')
      } finally {
        setLoading(false)
      }
    } else {
      const updatedList = announcements.map(t => t.id === editingTicker.id ? { ...t, message: editText.trim() } : t)
      setAnnouncements(updatedList)
      localStorage.setItem('katar_announcements', JSON.stringify(updatedList))
      setEditingTicker(null)
      showToast('(Demo) Pengumuman berhasil diperbarui secara lokal!')
      setLoading(false)
    }
  }

  const handleDeleteTicker = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return
    setLoading(true)

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id)

        if (error) throw error

        setAnnouncements(prev => prev.filter(t => t.id !== id))
        showToast('Pengumuman berhasil dihapus!')
      } catch (err) {
        showToast(`Gagal menghapus: ${err.message}`, 'error')
      } finally {
        setLoading(false)
      }
    } else {
      const updatedList = announcements.filter(t => t.id !== id)
      setAnnouncements(updatedList)
      localStorage.setItem('katar_announcements', JSON.stringify(updatedList))
      showToast('(Demo) Pengumuman berhasil dihapus secara lokal!')
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 bg-white border border-abu-200 shadow-sm">
      <h3 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-4">
        <Icon icon="solar:bullhorn-bold-duotone" className="w-6 h-6 text-merah-600 animate-pulse" />
        Kelola Ticker Pengumuman (Marquee)
      </h3>

      <p className="text-sm text-abu-500 mb-6">
        Gunakan panel ini untuk mengelola pengumuman running-text yang tampil di bagian paling bawah website. Teks pengumuman yang aktif akan otomatis ditampilkan berputar bergantian.
      </p>

      {toast.message && (
        <div className={`p-4 mb-4 rounded-xl border text-sm font-semibold flex items-center justify-between animate-fade-in
          ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ message: '', type: '' })} className="hover:opacity-75">✕</button>
        </div>
      )}

      {/* Form Tambah Pengumuman */}
      <form onSubmit={handleAddTicker} className="bg-abu-50 border border-abu-200/60 p-4 rounded-2xl mb-6">
        <h4 className="font-heading text-sm font-bold text-abu-800 mb-3 uppercase tracking-wider">Tambah Ticker Baru</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Ketik pengumuman new disini... (contoh: Lomba tarik tambang akan dimulai besok pagi!)"
            className="form-input flex-grow"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary sm:w-auto w-full min-h-[44px] flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Icon icon="solar:add-circle-bold" className="w-5 h-5" />
            <span>Tambah</span>
          </button>
        </div>
      </form>

      {/* Tabel Ticker Pengumuman */}
      <div className="overflow-x-auto rounded-2xl border border-abu-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-abu-50 border-b border-abu-200 text-xs font-bold text-abu-500 uppercase tracking-wider">
              <th className="p-4 w-12 text-center">No</th>
              <th className="p-4">Isi Pengumuman</th>
              <th className="p-4 w-32 text-center">Status</th>
              <th className="p-4 w-36 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-abu-150">
            {announcements.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-abu-400 font-medium">
                  Belum ada pengumuman ticker. Silahkan buat pengumuman baru di atas.
                </td>
              </tr>
            ) : (
              announcements.map((ticker, index) => (
                <tr key={ticker.id} className="hover:bg-abu-50/50 transition-colors">
                  <td className="p-4 text-center font-semibold text-abu-500">{index + 1}</td>
                  <td className="p-4 font-semibold text-abu-800 break-words max-w-xs sm:max-w-md">
                    {ticker.message}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleActive(ticker)}
                      disabled={loading}
                      className={`badge border transition-all cursor-pointer font-bold uppercase tracking-wider text-[10px] py-1 px-3.5 rounded-full
                        ${ticker.is_active 
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                          : 'bg-abu-100 border-abu-200 text-abu-600 hover:bg-abu-200/50'}`}
                    >
                      {ticker.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditTicker(ticker)}
                        disabled={loading}
                        className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Edit Teks"
                      >
                        <Icon icon="solar:pen-bold" className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTicker(ticker.id)}
                        disabled={loading}
                        className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-650 hover:bg-red-100 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit Pengumuman */}
      {editingTicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-xl max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-abu-200 pb-4 mb-4">
              <h3 className="font-heading text-lg font-bold text-abu-900 flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-merah-600" />
                Edit Pengumuman
              </h3>
              <button 
                onClick={() => setEditingTicker(null)} 
                className="w-8 h-8 rounded-full hover:bg-abu-100 flex items-center justify-center text-abu-400 hover:text-abu-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1.5">Teks Pengumuman</label>
                <textarea
                  required
                  rows="3"
                  className="form-input min-h-[90px] py-2"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTicker(null)}
                  className="btn btn-secondary min-h-[44px] px-5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary min-h-[44px] px-5"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
