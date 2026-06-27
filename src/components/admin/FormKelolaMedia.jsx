/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Icon } from '@iconify/react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'
import ImageEditorModal from './ImageEditorModal'
import { uploadImage, parseImages } from './adminUtils'

const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

export default function FormKelolaMedia({ onMediaAdded }) {
  const [form, setForm] = useState({
    title: '',
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    imageUrl: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  const [mediaList, setMediaList] = useState([])
  const [fetchingList, setFetchingList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return mediaList.filter(item => {
      if (!query) return true
      return (
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.date && item.date.includes(query)) ||
        (item.year && String(item.year).includes(query))
      )
    })
  }, [mediaList, searchQuery])

  // Adjust page state during render if out of bounds or search changed
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE)
  const maxPage = totalPages
  if (currentPage > maxPage && maxPage > 0) {
    setCurrentPage(maxPage)
  }

  // Edit states
  const [editingMedia, setEditingMedia] = useState(null)
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    year: new Date().getFullYear(),
    date: '',
    imageUrl: '',
    description: '',
  })
  const [editUploading, setEditUploading] = useState(false)
  const [tempGalleryInput, setTempGalleryInput] = useState('')
  const [tempEditGalleryInput, setTempEditGalleryInput] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [editorImage, setEditorImage] = useState(null) // { url: '', index: -1, type: 'add' | 'edit' }

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

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

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

  const fetchMedia = useCallback(async () => {
    setFetchingList(true)
    try {
      let rawMedia = []
      let newsUrls = new Set()

      // Fetch news image URLs to filter them out from the media list
      if (isSupabaseConfigured()) {
        try {
          const { data: newsData } = await supabase.from('news').select('image_url')
          newsData?.forEach(n => {
            parseImages(n.image_url).forEach(url => {
              if (url) newsUrls.add(url.trim())
            })
          })
        } catch (e) {
          console.warn('Failed to fetch news for filtering:', e)
        }

        const { data: mediaData, error } = await supabase
          .from('media')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        rawMedia = mediaData || []
      } else {
        const localNewsData = localStorage.getItem('katar_news_articles')
        if (localNewsData) {
          try {
            const localNews = JSON.parse(localNewsData)
            localNews.forEach(n => {
              parseImages(n.image_url).forEach(url => {
                if (url) newsUrls.add(url.trim())
              })
            })
          } catch {
            // ignore
          }
        }

        const localData = localStorage.getItem('katar_media_photos')
        if (localData) {
          try {
            rawMedia = JSON.parse(localData)
          } catch {
            rawMedia = []
          }
        }
      }

      // Filter out synced news images (where the image URL is present in the news list)
      const filtered = rawMedia.filter(item => {
        const mediaUrls = parseImages(item.image_url)
        if (mediaUrls.length > 0 && mediaUrls.every(url => newsUrls.has(url.trim()))) {
          return false
        }
        return true
      })

      setMediaList(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setFetchingList(false)
    }
  }, [])

  useEffect(() => {
    // One-time cleanup of local storage katar_media_photos
    try {
      const localMediaData = localStorage.getItem('katar_media_photos')
      const localNewsData = localStorage.getItem('katar_news_articles')
      if (localMediaData && localNewsData) {
        const localMedia = JSON.parse(localMediaData)
        const localNews = JSON.parse(localNewsData)
        
        const newsUrls = new Set()
        localNews.forEach(n => {
          parseImages(n.image_url).forEach(url => {
            if (url) newsUrls.add(url.trim())
          })
        })

        const cleanedMedia = localMedia.filter(item => {
          const mediaUrls = parseImages(item.image_url)
          return !(mediaUrls.length > 0 && mediaUrls.every(url => newsUrls.has(url.trim())))
        })

        if (cleanedMedia.length !== localMedia.length) {
          localStorage.setItem('katar_media_photos', JSON.stringify(cleanedMedia))
          console.log(`Cleaned up ${localMedia.length - cleanedMedia.length} synced news entries from local storage.`)
        }
      }
    } catch (e) {
      console.warn('Failed to clean local storage:', e)
    }

    if (fetchingList) {
      fetchMedia()
    }
  }, [fetchMedia, fetchingList])

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
      setToast({ message: `Berhasil mengunggah ${files.length} foto!`, type: 'success' })
    } catch (err) {
      setToast({ message: `Gagal mengunggah foto: ${err.message}`, type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    if (!window.confirm("Yakin ingin menyimpan data ini?")) return;
    e.preventDefault()
    if (!form.title.trim() || !form.imageUrl.trim()) return
    setLoading(true)
    setToast({ message: '', type: '' })

    const newPhoto = {
      title: form.title.trim(),
      year: Number(form.year),
      date: form.date,
      image_url: form.imageUrl.trim(),
      description: form.description.trim(),
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('media').insert(newPhoto)
        if (error) throw error
        setToast({ message: `Foto "${form.title}" berhasil diunggah ke galeri!`, type: 'success' })
      } else {
        // Fallback local storage
        const photoWithId = {
          ...newPhoto,
          id: 'local-media-' + Date.now(),
          created_at: new Date().toISOString(),
        }
        const updatedList = [photoWithId, ...mediaList]
        localStorage.setItem('katar_media_photos', JSON.stringify(updatedList))
        setToast({ message: `(Demo) Foto "${form.title}" berhasil disimpan secara lokal!`, type: 'success' })
      }
      setForm({ title: '', year: new Date().getFullYear(), date: new Date().toISOString().split('T')[0], imageUrl: '', description: '' })
      fetchMedia()
      onMediaAdded?.()
    } catch (err) {
      setToast({ message: `Gagal mengunggah foto: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus foto "${item.title}" dari galeri?`)) return
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('media').delete().eq('id', item.id)
        if (error) throw error
      } else {
        const updatedList = mediaList.filter(m => m.id !== item.id)
        localStorage.setItem('katar_media_photos', JSON.stringify(updatedList))
      }
      setToast({ message: 'Foto berhasil dihapus dari galeri!', type: 'success' })
      fetchMedia()
      onMediaAdded?.()
    } catch (err) {
      setToast({ message: `Gagal menghapus foto: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (item) => {
    setEditingMedia(item)
    setEditForm({
      id: item.id,
      title: item.title,
      year: item.year,
      date: item.date ? item.date.split('T')[0] : (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      imageUrl: item.image_url || '',
      description: item.description || '',
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
      setToast({ message: `Berhasil mengunggah ${files.length} foto baru!`, type: 'success' })
    } catch (err) {
      setToast({ message: `Gagal mengunggah foto: ${err.message}`, type: 'error' })
    } finally {
      setEditUploading(false)
    }
  }

  const handleUpdate = async (e) => {
    if (!window.confirm("Yakin ingin memperbarui data ini?")) return;
    e.preventDefault()
    if (!editForm.title.trim() || !editForm.imageUrl.trim()) return
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('media')
          .update({
            title: editForm.title.trim(),
            year: Number(editForm.year),
            date: editForm.date,
            image_url: editForm.imageUrl.trim(),
            description: editForm.description.trim(),
          })
          .eq('id', editForm.id)
        if (error) throw error
      } else {
        const updatedList = mediaList.map(m => m.id === editForm.id ? {
          ...m,
          title: editForm.title.trim(),
          year: Number(editForm.year),
          date: editForm.date,
          image_url: editForm.imageUrl.trim(),
          description: editForm.description.trim(),
        } : m)
        localStorage.setItem('katar_media_photos', JSON.stringify(updatedList))
      }
      setToast({ message: 'Media berhasil diperbarui!', type: 'success' })
      setEditingMedia(null)
      fetchMedia()
      onMediaAdded?.()
    } catch (err) {
      setToast({ message: `Gagal memperbarui: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
        <Icon icon="solar:camera-add-bold-duotone" className="w-5 h-5 text-merah-600" />
        Posting Foto Galeri Baru
      </h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Judul Foto</label>
            <input
              type="text"
              required
              className="form-input focus-ring text-sm"
              placeholder="Contoh: Malam Tirakatan 2026"
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
              onChange={(e) => {
                const dateVal = e.target.value
                updateField('date', dateVal)
                if (dateVal) {
                  const extractedYear = new Date(dateVal).getFullYear()
                  updateField('year', extractedYear)
                }
              }}
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
              id="media-photo-file"
              onChange={handleFileChange}
            />
            <div className="flex flex-wrap gap-3 items-center">
              <label
                htmlFor="media-photo-file"
                className="btn btn-secondary cursor-pointer min-h-[44px] flex items-center gap-2"
              >
                <Icon icon="solar:upload-bold" className="w-4 h-4" />
                <span>Pilih Foto</span>
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
                    onError={(e) => {
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
          <label className="block text-sm font-semibold text-abu-700 mb-1">Deskripsi / Keterangan</label>
          <ReactQuill
            theme="snow"
            value={form.description}
            onChange={(content) => updateField('description', content)}
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
              ]
            }}
            placeholder="Keterangan singkat mengenai momen di dalam foto..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || uploading || !form.imageUrl}
          className="btn btn-primary w-full sm:w-auto min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-ring"
        >
          {loading ? 'Mengunggah...' : 'Unggah Foto'}
        </button>
      </form>

      {/* Daftar Media */}
      <div className="mt-8 pt-6 border-t border-abu-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-abu-900">Daftar Foto Galeri</h3>
            <p className="text-xs text-abu-400 mt-0.5">Mengelola dokumentasi foto yang diunggah langsung ke galeri.</p>
          </div>
          
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Icon icon="solar:magnifer-linear" className="w-4 h-4 text-abu-400" />
            </span>
            <input
              type="text"
              placeholder="Cari foto galeri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-9 pr-8 py-1.5 focus-ring text-xs min-h-[36px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-abu-400 hover:text-abu-600 transition-colors"
              >
                <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {fetchingList ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <svg className="animate-spin h-6 w-6 text-merah-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-xs text-abu-400">Memuat data foto...</span>
          </div>
        ) : (() => {
          const formatDateLabel = (dateStr) => {
            if (!dateStr) return ''
            try {
              return new Date(dateStr).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            } catch {
              return dateStr
            }
          }

          if (filteredList.length === 0) {
            return (
              <div className="text-center py-12 border border-dashed border-abu-200 bg-abu-50/50 rounded-2xl">
                <Icon icon="solar:gallery-wide-linear" className="w-10 h-10 text-abu-300 mx-auto mb-2" />
                <p className="text-sm text-abu-500 font-medium">
                  {searchQuery ? 'Tidak ada foto yang cocok dengan pencarian.' : 'Belum ada foto galeri.'}
                </p>
              </div>
            )
          }

          const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE)
          const paginatedMedia = filteredList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

          return (
            <div className="overflow-x-auto border border-abu-200 rounded-2xl bg-white shadow-sm scrollbar-thin">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-abu-50 text-[11px] uppercase tracking-wider font-bold text-abu-500 border-b border-abu-200">
                    <th className="px-4 py-3.5 text-center w-14">No.</th>
                    <th className="px-4 py-3.5 w-20">Foto</th>
                    <th className="px-4 py-3.5 w-60">Judul Foto</th>
                    <th className="px-4 py-3.5 w-44">Tanggal / Tahun</th>
                    <th className="px-4 py-3.5">Keterangan</th>
                    <th className="px-4 py-3.5 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-abu-150 align-middle">
                  {paginatedMedia.map((item, idx) => {
                    const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx
                    const images = parseImages(item.image_url)
                    const primaryImg = images[0] || ''
                    return (
                      <tr key={item.id} className="hover:bg-abu-50/40 transition-colors group">
                        <td className="px-4 py-3 text-center font-semibold text-abu-400 text-xs">{globalIdx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="relative w-14 h-10 rounded-lg overflow-hidden border border-abu-200 bg-abu-50 shadow-sm group-hover:border-abu-300 transition-colors flex-shrink-0">
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt=""
                                className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                                referrerPolicy="no-referrer"
                                onClick={() => setLightboxUrl(primaryImg)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-abu-100 text-abu-350">
                                <Icon icon="solar:gallery-wide-bold" className="w-4 h-4" />
                              </div>
                            )}
                            {images.length > 1 && (
                              <div className="absolute bottom-0 right-0 bg-black/75 backdrop-blur-[1px] text-[8px] font-extrabold text-white px-1 py-0.5 rounded-tl flex items-center gap-0.5 pointer-events-none leading-none scale-90 origin-bottom-right">
                                <Icon icon="solar:gallery-bold" className="w-2 h-2" />
                                {images.length}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-abu-900 text-sm block truncate max-w-[220px]" title={item.title}>
                            {item.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-abu-50 text-abu-700 border border-abu-200/60 whitespace-nowrap">
                            <Icon icon="solar:calendar-bold" className="w-3.5 h-3.5 text-abu-500" />
                            {item.date ? formatDateLabel(item.date) : `Tahun ${item.year}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-abu-500 line-clamp-2 leading-relaxed max-w-xs md:max-w-md whitespace-normal" title={stripHtml(item.description) || '-'}>
                            {stripHtml(item.description) || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="w-8 h-8 rounded-lg text-blue-600 hover:text-blue-800 border border-blue-100 hover:bg-blue-50/50 flex items-center justify-center transition-all cursor-pointer focus-ring"
                              title="Edit"
                            >
                              <Icon icon="solar:pen-bold" className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="w-8 h-8 rounded-lg text-merah-600 hover:text-merah-800 border border-merah-100 hover:bg-merah-50/50 flex items-center justify-center transition-all cursor-pointer focus-ring"
                              title="Hapus"
                            >
                              <Icon icon="solar:trash-bin-trash-bold" className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-abu-200 bg-abu-50/50 rounded-b-2xl">
                  <span className="text-xs text-abu-500 font-medium">
                    Menampilkan {Math.min(filteredList.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredList.length, currentPage * ITEMS_PER_PAGE)} dari {filteredList.length} foto
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-1 rounded-lg border border-abu-250 bg-white hover:bg-abu-50 text-abu-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-ring min-w-[32px] min-h-[32px] inline-flex items-center justify-center transition-all"
                    >
                      ←
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border focus-ring min-w-[32px] min-h-[32px] cursor-pointer transition-all ${
                          currentPage === i + 1
                            ? 'border-merah-600 bg-merah-600 text-white shadow-sm'
                            : 'border-abu-250 bg-white hover:bg-abu-50 text-abu-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="p-1 rounded-lg border border-abu-250 bg-white hover:bg-abu-50 text-abu-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-ring min-w-[32px] min-h-[32px] inline-flex items-center justify-center transition-all"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Edit Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-merah-700 to-merah-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-white" />
                Edit Detail Foto Galeri
              </h3>
              <button
                onClick={() => setEditingMedia(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white cursor-pointer focus-ring"
                title="Tutup"
              >
                <Icon icon="solar:close-circle-bold" className="w-6 h-6 text-white/80 hover:text-white transition-colors" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Judul Foto</label>
                  <input
                    type="text"
                    required
                    className="form-input focus-ring text-sm"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    className="form-input focus-ring text-sm"
                    value={editForm.date}
                    onChange={(e) => {
                      const dateVal = e.target.value
                      setEditForm(prev => {
                        const updated = { ...prev, date: dateVal }
                        if (dateVal) {
                          updated.year = new Date(dateVal).getFullYear()
                        }
                        return updated
                      })
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Tahun</label>
                  <input
                    type="number"
                    className="form-input focus-ring text-sm bg-abu-50 text-abu-500 cursor-not-allowed"
                    value={editForm.year}
                    readOnly
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
                    id="edit-media-photo-file"
                    onChange={handleEditFileChange}
                  />
                  <div className="flex flex-wrap gap-3 items-center">
                    <label
                      htmlFor="edit-media-photo-file"
                      className="btn btn-secondary cursor-pointer min-h-[44px] flex items-center gap-2"
                    >
                      <Icon icon="solar:upload-bold" className="w-4 h-4" />
                      <span>Unggah Foto Baru</span>
                    </label>
                    {editUploading && <span className="text-xs text-abu-400">Mengunggah...</span>}
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
                              onError={(e) => {
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
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Deskripsi / Keterangan</label>
                <ReactQuill
                  theme="snow"
                  value={editForm.description}
                  onChange={(content) => setEditForm(prev => ({ ...prev, description: content }))}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                  placeholder="Keterangan singkat mengenai momen di dalam foto..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-abu-100">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
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
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/35 backdrop-blur-lg animate-fade-in"
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
