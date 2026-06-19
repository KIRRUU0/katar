import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'
import ImageEditorModal from './ImageEditorModal'
import { uploadImage, parseImages } from './adminUtils'

export default function FormKelolaBerita({ onNewsAdded }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  
  // List state
  const [newsList, setNewsList] = useState([])
  const [fetchingList, setFetchingList] = useState(false)

  // Edit states
  const [editingNews, setEditingNews] = useState(null)
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    description: '',
    imageUrl: '',
    date: '',
  })
  const [editUploading, setEditUploading] = useState(false)
  const [tempGalleryInput, setTempGalleryInput] = useState('')
  const [tempEditGalleryInput, setTempEditGalleryInput] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)
  
  const [editorImage, setEditorImage] = useState(null) // { url: '', index: -1, type: 'add' | 'edit' }

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSaveEditedImage = (newUrl) => {
    if (!editorImage) return
    if (editorImage.type === 'add') {
      const urls = parseImages(form.imageUrl)
      urls[editorImage.index] = newUrl
      updateField('imageUrl', JSON.stringify(urls))
    } else {
      const urls = parseImages(editForm.imageUrl)
      urls[editorImage.index] = newUrl
      setEditForm(prev => ({ ...prev, imageUrl: JSON.stringify(urls) }))
    }
    setEditorImage(null)
  }

  const handleReorderImage = (idx, direction) => {
    const urls = parseImages(form.imageUrl)
    if (direction === 'left' && idx > 0) {
      const temp = urls[idx]
      urls[idx] = urls[idx - 1]
      urls[idx - 1] = temp
    } else if (direction === 'right' && idx < urls.length - 1) {
      const temp = urls[idx]
      urls[idx] = urls[idx + 1]
      urls[idx + 1] = temp
    }
    updateField('imageUrl', urls.length > 0 ? JSON.stringify(urls) : '')
  }

  const handleDragDropImage = (draggedIdx, targetIdx) => {
    if (draggedIdx === targetIdx) return
    const urls = parseImages(form.imageUrl)
    const draggedItem = urls[draggedIdx]
    const remaining = urls.filter((_, i) => i !== draggedIdx)
    remaining.splice(targetIdx, 0, draggedItem)
    updateField('imageUrl', remaining.length > 0 ? JSON.stringify(remaining) : '')
  }

  const handleEditReorderImage = (idx, direction) => {
    const urls = parseImages(editForm.imageUrl)
    if (direction === 'left' && idx > 0) {
      const temp = urls[idx]
      urls[idx] = urls[idx - 1]
      urls[idx - 1] = temp
    } else if (direction === 'right' && idx < urls.length - 1) {
      const temp = urls[idx]
      urls[idx] = urls[idx + 1]
      urls[idx + 1] = temp
    }
    setEditForm(prev => ({ ...prev, imageUrl: urls.length > 0 ? JSON.stringify(urls) : '' }))
  }

  const handleEditDragDropImage = (draggedIdx, targetIdx) => {
    if (draggedIdx === targetIdx) return
    const urls = parseImages(editForm.imageUrl)
    const draggedItem = urls[draggedIdx]
    const remaining = urls.filter((_, i) => i !== draggedIdx)
    remaining.splice(targetIdx, 0, draggedItem)
    setEditForm(prev => ({ ...prev, imageUrl: remaining.length > 0 ? JSON.stringify(remaining) : '' }))
  }

  const fetchNews = useCallback(async () => {
    setFetchingList(true)
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setNewsList(data || [])
      } else {
        const localData = localStorage.getItem('katar_news_articles')
        let list = []
        if (localData) {
          try {
            list = JSON.parse(localData)
          } catch {
            list = []
          }
        }
        setNewsList(list)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFetchingList(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setUploading(true)
    setToast({ message: '', type: '' })
    try {
      const uploadedUrls = []
      for (const file of files) {
        const url = await uploadImage(file)
        uploadedUrls.push(url)
      }
      const currentUrls = parseImages(form.imageUrl)
      const combined = [...currentUrls, ...uploadedUrls]
      updateField('imageUrl', JSON.stringify(combined))
      setToast({ message: `Berhasil mengunggah ${files.length} gambar!`, type: 'success' })
    } catch (err) {
      setToast({ message: `Gagal mengunggah gambar: ${err.message}`, type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const syncNewsImagesToMedia = async (title, description, imageUrl, date) => {
    // No-op: news images are dynamically merged on the client-side public page
    return
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.imageUrl.trim()) return
    if (!window.confirm("Yakin ingin menyimpan data ini?")) return;
    setLoading(true)
    setToast({ message: '', type: '' })

    const newNews = {
      title: form.title.trim(),
      description: form.description.trim(),
      image_url: form.imageUrl.trim(),
      date: form.date,
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('news').insert(newNews)
        if (error) throw error

        await syncNewsImagesToMedia(newNews.title, newNews.description, newNews.image_url, newNews.date)

        setToast({ message: `Berita "${form.title}" berhasil diposting!`, type: 'success' })
      } else {
        // Fallback local storage - News only
        const newsWithId = {
          ...newNews,
          id: 'local-news-' + Date.now(),
          created_at: new Date().toISOString(),
        }
        const updatedList = [newsWithId, ...newsList]
        localStorage.setItem('katar_news_articles', JSON.stringify(updatedList))

        await syncNewsImagesToMedia(newNews.title, newNews.description, newNews.image_url, newNews.date)

        setToast({ message: `Berita "${form.title}" berhasil disimpan!`, type: 'success' })
      }
      setForm({ title: '', description: '', imageUrl: '', date: new Date().toISOString().split('T')[0] })
      fetchNews()
      onNewsAdded?.()
    } catch (err) {
      setToast({ message: `Gagal memposting berita: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus berita "${item.title}"?`)) return
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('news').delete().eq('id', item.id)
        if (error) throw error
      } else {
        const updatedList = newsList.filter(n => n.id !== item.id)
        localStorage.setItem('katar_news_articles', JSON.stringify(updatedList))
      }
      setToast({ message: 'Berita berhasil dihapus!', type: 'success' })
      fetchNews()
    } catch (err) {
      setToast({ message: `Gagal menghapus berita: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (item) => {
    setEditingNews(item)
    setEditForm({
      id: item.id,
      title: item.title,
      description: item.description || '',
      imageUrl: item.image_url || '',
      date: item.date ? item.date.split('T')[0] : (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    })
  }

  const handleEditFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setEditUploading(true)
    setToast({ message: '', type: '' })
    try {
      const uploadedUrls = []
      for (const file of files) {
        const url = await uploadImage(file)
        uploadedUrls.push(url)
      }
      const currentUrls = parseImages(editForm.imageUrl)
      const combined = [...currentUrls, ...uploadedUrls]
      setEditForm(prev => ({ ...prev, imageUrl: JSON.stringify(combined) }))
      setToast({ message: `Berhasil mengunggah ${files.length} gambar baru!`, type: 'success' })
    } catch (err) {
      setToast({ message: `Gagal mengunggah gambar: ${err.message}`, type: 'error' })
    } finally {
      setEditUploading(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editForm.title.trim() || !editForm.imageUrl.trim()) return
    if (!window.confirm("Yakin ingin memperbarui data ini?")) return;
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('news')
          .update({
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            image_url: editForm.imageUrl.trim(),
            date: editForm.date,
          })
          .eq('id', editForm.id)
        if (error) throw error

        await syncNewsImagesToMedia(editForm.title.trim(), editForm.description.trim(), editForm.imageUrl.trim(), editForm.date)
      } else {
        const updatedList = newsList.map(n => n.id === editForm.id ? {
          ...n,
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          image_url: editForm.imageUrl.trim(),
          date: editForm.date,
        } : n)
        localStorage.setItem('katar_news_articles', JSON.stringify(updatedList))

        await syncNewsImagesToMedia(editForm.title.trim(), editForm.description.trim(), editForm.imageUrl.trim(), editForm.date)
      }
      setToast({ message: 'Berita berhasil diperbarui!', type: 'success' })
      setEditingNews(null)
      fetchNews()
      onNewsAdded?.()
    } catch (err) {
      setToast({ message: `Gagal memperbarui: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
        <Icon icon="solar:gallery-bold-duotone" className="w-5 h-5 text-merah-600" />
        Posting Berita Kegiatan Baru
      </h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Judul Berita</label>
            <input
              type="text"
              required
              className="form-input focus-ring text-sm"
              placeholder="Contoh: Pembukaan Turnamen Futsal RT 02/03"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Tanggal Kegiatan</label>
            <input
              type="date"
              required
              className="form-input focus-ring text-sm"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Tautan Gambar (Otomatis masuk preview)</label>
          <input
            type="text"
            className="form-input focus-ring text-sm"
            placeholder="Tempel (Paste) URL gambar di sini"
            value={tempGalleryInput}
            onChange={(e) => setTempGalleryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const url = tempGalleryInput.trim()
                if (url) {
                  const current = parseImages(form.imageUrl)
                  const combined = [...current, url]
                  updateField('imageUrl', JSON.stringify(combined))
                  setTempGalleryInput('')
                }
              }
            }}
            onPaste={(e) => {
              const clipboardData = e.clipboardData || window.clipboardData
              const pastedText = clipboardData.getData('Text') || ''
              const urlRegex = /(https?:\/\/[^\s,]+|drive\.google\.com[^\s,]*|lh3\.googleusercontent\.com[^\s,]*)/gi
              const matches = pastedText.match(urlRegex) || []
              const items = pastedText.split(/[\s,\n]+/).map(item => item.trim()).filter(Boolean)
              const newUrls = []
              items.forEach(item => {
                if (item.startsWith('http://') || item.startsWith('https://') || item.includes('drive.google.com') || item.includes('lh3.googleusercontent')) {
                  newUrls.push(item)
                }
              })
              if (newUrls.length > 0) {
                e.preventDefault()
                const current = parseImages(form.imageUrl)
                const combined = [...current, ...newUrls]
                updateField('imageUrl', JSON.stringify(combined))
                setTempGalleryInput('')
              }
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Atau Unggah dari Perangkat (Bisa lebih dari 1)</label>
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="news-banner-file"
              onChange={handleFileChange}
            />
            <div className="flex flex-wrap gap-3 items-center">
              <label
                htmlFor="news-banner-file"
                className="btn btn-secondary cursor-pointer min-h-[44px] flex items-center gap-2"
              >
                <Icon icon="solar:upload-bold" className="w-4 h-4" />
                <span>Pilih Gambar</span>
              </label>
              {uploading && <span className="text-xs text-abu-400">Mengunggah...</span>}
            </div>
          </div>
        </div>

        {form.imageUrl && parseImages(form.imageUrl).length > 0 && (
          <div className="space-y-1.5 pt-2">
            <span className="block text-xs font-bold text-abu-400 uppercase tracking-wider">Preview Galeri ({parseImages(form.imageUrl).length} Gambar) - Seret gambar atau gunakan panah untuk mengatur urutan</span>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {parseImages(form.imageUrl).map((url, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', idx.toString())
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                  }}
                  onDrop={(e) => {
                    const draggedIdx = Number(e.dataTransfer.getData('text/plain'))
                    handleDragDropImage(draggedIdx, idx)
                  }}
                  className="relative aspect-video rounded-xl overflow-hidden group border border-abu-200 shadow-sm bg-abu-50 cursor-move transition-all duration-200 hover:border-abu-400"
                >
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-200"
                    onClick={() => setLightboxUrl(url)}
                    referrerPolicy="no-referrer"
                    onError={(e) => { console.error('Img load error for URL:', e.target.src.substring(0, 100)); console.error('Img load error for URL:', url.substring(0, 100));
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='8' font-weight='bold' fill='%23ef4444'>Gambar Gagal Load</text><text x='50%' y='60%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='6.5' fill='%2364748b'>Link Privat / Tidak Valid</text></svg>";
                    }}
                  />
                  <div className="absolute top-1 right-1 flex items-center gap-1 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleReorderImage(idx, 'left')}
                        className="w-5.5 h-5.5 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer text-[10px] font-extrabold shadow"
                        title="Geser Kiri"
                      >
                        ←
                      </button>
                    )}
                    {idx < parseImages(form.imageUrl).length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleReorderImage(idx, 'right')}
                        className="w-5.5 h-5.5 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer text-[10px] font-extrabold shadow"
                        title="Geser Kanan"
                      >
                        →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditorImage({ url, index: idx, type: 'add' })}
                      className="w-5.5 h-5.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow"
                      title="Edit (Crop / Rotasi)"
                    >
                      <Icon icon="solar:crop-rotate-bold" className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = parseImages(form.imageUrl).filter((_, i) => i !== idx)
                        updateField('imageUrl', remaining.length > 0 ? JSON.stringify(remaining) : '')
                      }}
                      className="w-5.5 h-5.5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer text-[10px] font-extrabold shadow"
                      title="Hapus"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Isi Berita / Deskripsi Kegiatan</label>
          <textarea
            required
            className="form-input focus-ring min-h-[250px] py-3 text-sm resize-y leading-relaxed"
            placeholder="Tuliskan berita lengkap..."
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading || uploading || !form.imageUrl}
          className="btn btn-primary w-full sm:w-auto min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-ring"
        >
          {loading ? 'Memposting...' : 'Posting Berita'}
        </button>
      </form>

      {/* Daftar Berita */}
      <div className="mt-8 pt-6 border-t border-abu-200">
        <h3 className="font-heading text-lg font-bold text-abu-900 mb-4">Daftar Berita</h3>
        {fetchingList ? (
          <p className="text-sm text-abu-400 text-center py-4">Memuat data...</p>
        ) : newsList.length === 0 ? (
          <p className="text-sm text-abu-400 text-center py-4">Belum ada berita diposting.</p>
        ) : (
          <div className="overflow-x-auto border border-abu-200 rounded-2xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-abu-100 text-abu-700 font-semibold border-b border-abu-200">
                  <th className="p-3 text-center w-12">No.</th>
                  <th className="p-3">Banner</th>
                  <th className="p-3">Judul Berita</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-abu-200">
                {newsList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-abu-50/50 transition-colors">
                    <td className="p-3 text-center font-medium text-abu-500">{idx + 1}</td>
                    <td className="p-3">
                      <div className="w-14 h-10 rounded overflow-hidden border border-abu-200">
                        <img
                          src={parseImages(item.image_url)[0]}
                          alt=""
                          className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                          onClick={() => {
                            const imgUrl = parseImages(item.image_url)[0]
                            if (imgUrl) setLightboxUrl(imgUrl)
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-abu-900">{item.title}</td>
                    <td className="p-3 text-abu-500">
                      {item.date ? new Date(item.date).toLocaleDateString('id-ID') : (item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-')}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                          title="Edit"
                        >
                          <Icon icon="solar:pen-bold" className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-merah-600 hover:text-merah-800 hover:bg-merah-50 rounded-lg transition-colors focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                          title="Hapus"
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
      </div>

      {/* Edit Modal */}
      {editingNews && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-merah-700 to-merah-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-white" />
                Edit Detail Berita
              </h3>
              <button
                onClick={() => setEditingNews(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white cursor-pointer focus-ring"
                title="Tutup"
              >
                <Icon icon="solar:close-circle-bold" className="w-6 h-6 text-white/80 hover:text-white transition-colors" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Judul Berita</label>
                  <input
                    type="text"
                    required
                    className="form-input focus-ring text-sm"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    required
                    className="form-input focus-ring text-sm"
                    value={editForm.date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Tautan Gambar (Otomatis masuk preview)</label>
                <input
                  type="text"
                  className="form-input focus-ring text-sm"
                  placeholder="Tempel (Paste) URL gambar di sini"
                  value={tempEditGalleryInput}
                  onChange={(e) => setTempEditGalleryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const url = tempEditGalleryInput.trim()
                      if (url) {
                        const current = parseImages(editForm.imageUrl)
                        const combined = [...current, url]
                        setEditForm(prev => ({ ...prev, imageUrl: JSON.stringify(combined) }))
                        setTempEditGalleryInput('')
                      }
                    }
                  }}
                  onPaste={(e) => {
                    const clipboardData = e.clipboardData || window.clipboardData
                    const pastedText = clipboardData.getData('Text') || ''
                    const urlRegex = /(https?:\/\/[^\s,]+|drive\.google\.com[^\s,]*|lh3\.googleusercontent\.com[^\s,]*)/gi
                    const matches = pastedText.match(urlRegex) || []
                    const items = pastedText.split(/[\s,\n]+/).map(item => item.trim()).filter(Boolean)
                    const newUrls = []
                    items.forEach(item => {
                      if (item.startsWith('http://') || item.startsWith('https://') || item.includes('drive.google.com') || item.includes('lh3.googleusercontent')) {
                        newUrls.push(item)
                      }
                    })
                    if (newUrls.length > 0) {
                      e.preventDefault()
                      const current = parseImages(editForm.imageUrl)
                      const combined = [...current, ...newUrls]
                      setEditForm(prev => ({ ...prev, imageUrl: JSON.stringify(combined) }))
                      setTempEditGalleryInput('')
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Atau Unggah dari Perangkat (Bisa lebih dari 1)</label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="edit-news-banner-file"
                    onChange={handleEditFileChange}
                  />
                  <div className="flex flex-wrap gap-3 items-center">
                    <label
                      htmlFor="edit-news-banner-file"
                      className="btn btn-secondary cursor-pointer min-h-[44px] flex items-center gap-2"
                    >
                      <Icon icon="solar:upload-bold" className="w-4 h-4" />
                      <span>Pilih Gambar Baru</span>
                    </label>
                    {editUploading && <span className="text-xs text-abu-400">Mengunggah...</span>}
                  </div>
                </div>
              </div>

              {editForm.imageUrl && parseImages(editForm.imageUrl).length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="block text-xs font-bold text-abu-400 uppercase tracking-wider">Preview Galeri ({parseImages(editForm.imageUrl).length} Gambar) - Seret gambar atau gunakan panah untuk mengatur urutan</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {parseImages(editForm.imageUrl).map((url, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', idx.toString())
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                        }}
                        onDrop={(e) => {
                          const draggedIdx = Number(e.dataTransfer.getData('text/plain'))
                          handleEditDragDropImage(draggedIdx, idx)
                        }}
                        className="relative aspect-video rounded-xl overflow-hidden group border border-abu-200 shadow-sm bg-abu-50 cursor-move transition-all duration-200 hover:border-abu-400"
                      >
                        <img
                          src={url}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-200"
                          onClick={() => setLightboxUrl(url)}
                          referrerPolicy="no-referrer"
                          onError={(e) => { console.error('Img load error for URL:', e.target.src.substring(0, 100)); console.error('Img load error for URL:', url.substring(0, 100));
                            e.target.onerror = null;
                            e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='8' font-weight='bold' fill='%23ef4444'>Gambar Gagal Load</text><text x='50%' y='60%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='6.5' fill='%2364748b'>Link Privat / Tidak Valid</text></svg>";
                          }}
                        />
                        <div className="absolute top-1 right-1 flex items-center gap-1 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleEditReorderImage(idx, 'left')}
                              className="w-5.5 h-5.5 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer text-[10px] font-extrabold shadow"
                              title="Geser Kiri"
                            >
                              ←
                            </button>
                          )}
                          {idx < parseImages(editForm.imageUrl).length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleEditReorderImage(idx, 'right')}
                              className="w-5.5 h-5.5 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer text-[10px] font-extrabold shadow"
                              title="Geser Kanan"
                            >
                              →
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditorImage({ url, index: idx, type: 'edit' })}
                            className="w-5.5 h-5.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow"
                            title="Edit (Crop / Rotasi)"
                          >
                            <Icon icon="solar:crop-rotate-bold" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = parseImages(editForm.imageUrl).filter((_, i) => i !== idx)
                              setEditForm(prev => ({ ...prev, imageUrl: remaining.length > 0 ? JSON.stringify(remaining) : '' }))
                            }}
                            className="w-5.5 h-5.5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer text-[10px] font-extrabold shadow"
                            title="Hapus"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Isi Berita / Deskripsi</label>
                <textarea
                  required
                  className="form-input focus-ring min-h-[250px] py-3 text-sm resize-y leading-relaxed"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-abu-100">
                <button
                  type="button"
                  onClick={() => setEditingNews(null)}
                  className="btn btn-secondary cursor-pointer min-h-[44px] flex items-center gap-1.5"
                >
                  <Icon icon="solar:close-square-bold" className="w-4 h-4" />
                  <span>Batal</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || editUploading}
                  className="btn btn-primary cursor-pointer min-h-[44px] flex items-center gap-1.5"
                >
                  <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
                  <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-12 right-0 w-9 h-9 flex items-center justify-center rounded-full bg-abu-800 hover:bg-merah-600 text-white cursor-pointer transition-all border border-abu-700 shadow-md focus-ring"
              title="Tutup"
            >
              <Icon icon="solar:close-circle-bold" className="w-5.5 h-5.5" />
            </button>
            <img 
              src={lightboxUrl} 
              alt="Preview Full" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
            <div className="mt-4 text-white/80 text-sm break-all text-center px-4 bg-black/40 py-2 rounded-lg max-w-full">
              {lightboxUrl}
            </div>
          </div>
        </div>
      )}

      {editorImage && (
        <ImageEditorModal
          imageUrl={editorImage.url}
          onSave={handleSaveEditedImage}
          onClose={() => setEditorImage(null)}
        />
      )}
    </div>
  )
}
