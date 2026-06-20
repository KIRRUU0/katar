import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'
import { uploadImage } from './adminUtils'

export default function FormKelolaOrganisasi() {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  const [orgYear, setOrgYear] = useState(2026)
  
  // Core roles states
  const [coreNames, setCoreNames] = useState({
    rt: '',
    katar: '',
    sekretaris: '',
    bendahara: '',
  })
  
  // Core role photos states
  const [coreImages, setCoreImages] = useState({
    rt: '',
    katar: '',
    sekretaris: '',
    bendahara: '',
  })
  
  // Members state
  const [members, setMembers] = useState([])
  const [newMemberName, setNewMemberName] = useState('')
  const [editingMember, setEditingMember] = useState(null)
  const [editMemberName, setEditMemberName] = useState('')

  const fetchOrgData = useCallback(async () => {
    setLoading(true)
    try {
      let data = null
      let isFetched = false

      if (isSupabaseConfigured()) {
        try {
          const { data: resData, error } = await supabase
            .from('organization')
            .select('*')
          
          if (!error) {
            data = resData || []
            isFetched = true
          } else if (error) {
            console.warn('Supabase organization query failed, falling back to local storage:', error.message)
          }
        } catch (dbErr) {
          console.warn('Supabase organization query failed, falling back to local storage:', dbErr.message)
        }
      }

      if (isFetched && data && data.length > 0) {
        // Dynamically get the year from database rows
        const yearVal = data[0]?.year || 2026
        setOrgYear(yearVal)

        // Parse core roles and photos
        const cores = { rt: '', katar: '', sekretaris: '', bendahara: '' }
        const imgs = { rt: '', katar: '', sekretaris: '', bendahara: '' }
        data.forEach(item => {
          if (['rt', 'katar', 'sekretaris', 'bendahara'].includes(item.role_key)) {
            cores[item.role_key] = item.name
            imgs[item.role_key] = item.image_url || ''
          }
        })
        setCoreNames(cores)
        setCoreImages(imgs)
        
        // Parse members
        const mems = data.filter(item => item.role_key === 'member').sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        setMembers(mems)
      } else {
        // Fallback localStorage
        const localOrg = localStorage.getItem('katar_organization')
        if (localOrg) {
          const parsed = JSON.parse(localOrg)
          const yearVal = parsed[0]?.year || 2026
          setOrgYear(yearVal)

          const cores = { rt: '', katar: '', sekretaris: '', bendahara: '' }
          const imgs = { rt: '', katar: '', sekretaris: '', bendahara: '' }
          parsed.forEach(item => {
            if (['rt', 'katar', 'sekretaris', 'bendahara'].includes(item.role_key)) {
              cores[item.role_key] = item.name
              imgs[item.role_key] = item.image_url || ''
            }
          })
          setCoreNames(cores)
          setCoreImages(imgs)
          
          const mems = parsed.filter(item => item.role_key === 'member').sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          setMembers(mems)
        } else {
          // Default initialization (empty)
          setOrgYear(2026)
          setMembers([])
          setCoreNames({
            rt: '',
            katar: '',
            sekretaris: '',
            bendahara: '',
          })
          setCoreImages({
            rt: '',
            katar: '',
            sekretaris: '',
            bendahara: '',
          })
        }
      }
    } catch (err) {
      console.error('Error fetching organization data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrgData()
  }, [fetchOrgData])

  const handleImageUpload = async (e, roleKey) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setToast({ message: '', type: '' })
    try {
      const url = await uploadImage(file)
      setCoreImages(prev => ({ ...prev, [roleKey]: url }))
      setToast({ message: 'Foto berhasil diunggah! Klik tombol "Simpan Pengurus Inti" untuk menyimpan secara permanen.', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: `Gagal mengunggah foto: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const saveCoreRoles = async (e) => {
    e.preventDefault()
    setLoading(true)
    setToast({ message: '', type: '' })
    try {
      const payload = [
        { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt, image_url: coreImages.rt || null, display_order: 0, year: orgYear },
        { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar, image_url: coreImages.katar || null, display_order: 0, year: orgYear },
        { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris, image_url: coreImages.sekretaris || null, display_order: 0, year: orgYear },
        { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara, image_url: coreImages.bendahara || null, display_order: 0, year: orgYear },
      ]

      if (isSupabaseConfigured()) {
        // Delete all existing core roles first to prevent unique constraint conflicts
        const { error: deleteError } = await supabase
          .from('organization')
          .delete()
          .in('role_key', ['rt', 'katar', 'sekretaris', 'bendahara'])
        
        if (deleteError) throw deleteError

        // Insert the new core roles
        const { error: insertError } = await supabase
          .from('organization')
          .insert(payload)
        
        if (insertError) throw insertError
        
        // Also update all members' year so they stay in sync
        const { error: memberYearError } = await supabase
          .from('organization')
          .update({ year: orgYear })
          .eq('role_key', 'member')
        if (memberYearError) throw memberYearError
      } else {
        // Save locally
        const localOrg = localStorage.getItem('katar_organization')
        let parsed = []
        if (localOrg) {
          parsed = JSON.parse(localOrg).filter(item => item.role_key === 'member')
        }
        const combined = [...payload.map((p, idx) => ({ ...p, id: 'demo-core-' + idx })), ...parsed].map(item => ({ ...item, year: orgYear }))
        localStorage.setItem('katar_organization', JSON.stringify(combined))
      }
      setToast({ message: 'Struktur pengurus inti berhasil disimpan!', type: 'success' })
      fetchOrgData()
    } catch (err) {
      setToast({ message: `Gagal menyimpan pengurus inti: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!newMemberName.trim()) return
    setLoading(true)
    setToast({ message: '', type: '' })
    try {
      const nextOrder = members.length > 0 ? Math.max(...members.map(m => m.display_order || 0)) + 1 : 1
      const newMember = {
        role_key: 'member',
        role_name: 'Anggota',
        name: newMemberName.trim(),
        display_order: nextOrder,
        year: orgYear,
      }

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('organization')
          .insert(newMember)
        if (error) throw error
      } else {
        // Local fallback
        const localOrg = localStorage.getItem('katar_organization')
        let parsed = []
        if (localOrg) {
          parsed = JSON.parse(localOrg)
        } else {
          // Initialize defaults
          parsed = [
            { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt, year: orgYear },
            { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar, year: orgYear },
            { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris, year: orgYear },
            { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara, year: orgYear },
            ...members
          ]
        }
        parsed.push({ ...newMember, id: 'mem-' + Date.now() })
        localStorage.setItem('katar_organization', JSON.stringify(parsed))
      }
      setToast({ message: `Anggota "${newMemberName.trim()}" berhasil ditambahkan!`, type: 'success' })
      setNewMemberName('')
      fetchOrgData()
    } catch (err) {
      setToast({ message: `Gagal menambahkan anggota: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditMemberClick = (m) => {
    setEditingMember(m)
    setEditMemberName(m.name)
  }

  const handleUpdateMember = async (e) => {
    e.preventDefault()
    if (!editMemberName.trim()) return
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('organization')
          .update({ name: editMemberName.trim() })
          .eq('id', editingMember.id)
        if (error) throw error
      } else {
        const localOrg = localStorage.getItem('katar_organization')
        if (localOrg) {
          const parsed = JSON.parse(localOrg)
          const idx = parsed.findIndex(item => item.id === editingMember.id || (item.role_key === 'member' && item.name === editingMember.name))
          if (idx !== -1) {
            parsed[idx].name = editMemberName.trim()
            localStorage.setItem('katar_organization', JSON.stringify(parsed))
          }
        } else {
          const updatedMems = members.map(m => m.id === editingMember.id ? { ...m, name: editMemberName.trim() } : m)
          const payload = [
            { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt, year: orgYear },
            { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar, year: orgYear },
            { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris, year: orgYear },
            { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara, year: orgYear },
            ...updatedMems
          ]
          localStorage.setItem('katar_organization', JSON.stringify(payload))
        }
      }
      setToast({ message: 'Nama anggota berhasil diperbarui!', type: 'success' })
      setEditingMember(null)
      fetchOrgData()
    } catch (err) {
      setToast({ message: `Gagal memperbarui: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMember = async (m) => {
    if (!window.confirm(`Hapus anggota "${m.name}" dari struktur organisasi?`)) return
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('organization')
          .delete()
          .eq('id', m.id)
        if (error) throw error
      } else {
        const localOrg = localStorage.getItem('katar_organization')
        if (localOrg) {
          const parsed = JSON.parse(localOrg)
          const updated = parsed.filter(item => !(item.role_key === 'member' && (item.id === m.id || item.name === m.name)))
          localStorage.setItem('katar_organization', JSON.stringify(updated))
        } else {
          const updatedMems = members.filter(item => item.id !== m.id)
          const payload = [
            { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt, year: orgYear },
            { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar, year: orgYear },
            { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris, year: orgYear },
            { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara, year: orgYear },
            ...updatedMems
          ]
          localStorage.setItem('katar_organization', JSON.stringify(payload))
        }
      }
      setToast({ message: `Anggota "${m.name}" berhasil dihapus!`, type: 'success' })
      fetchOrgData()
    } catch (err) {
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="admin-section bg-white p-6 rounded-2xl border border-abu-200 shadow-sm">
        <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
          <Icon icon="solar:crown-minimalistic-bold-duotone" className="w-5 h-5 text-merah-600" />
          Kelola Pengurus Inti
        </h2>

        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

        <form onSubmit={saveCoreRoles} className="space-y-6">
          {/* Tahun Kepengurusan Field */}
          <div className="bg-abu-50/50 p-4 rounded-xl border border-abu-200 space-y-2 max-w-xs">
            <label className="block text-sm font-semibold text-abu-700">Tahun Kepengurusan</label>
            <input
              type="number"
              required
              className="form-input focus-ring text-sm"
              placeholder="Contoh: 2026"
              value={orgYear}
              onChange={(e) => setOrgYear(Number(e.target.value))}
            />
            <span className="text-[11px] text-abu-500 block">Mengubah tahun ini akan otomatis memperbarui periode kepengurusan yang ditampilkan ke user.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pelindung / Ketua RT */}
            <div className="bg-abu-50/50 p-4 rounded-xl border border-abu-200 space-y-3">
              <label className="block text-sm font-bold text-abu-800">Pelindung / Ketua RT</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-abu-200 bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                  {coreImages.rt ? (
                    <img src={coreImages.rt} alt="Pelindung / Ketua RT" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Icon icon="solar:user-bold" className="w-7 h-7 text-abu-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    required
                    className="form-input text-xs sm:text-sm"
                    placeholder="Nama Ketua RT"
                    value={coreNames.rt || ''}
                    onChange={(e) => setCoreNames(prev => ({ ...prev, rt: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="upload-rt"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'rt')}
                    />
                    <label
                      htmlFor="upload-rt"
                      className="text-[11px] bg-white border border-abu-300 text-abu-700 px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer hover:bg-abu-50 transition-colors inline-flex items-center gap-1 focus-ring"
                    >
                      <Icon icon="solar:camera-bold" className="w-3.5 h-3.5" />
                      <span>Pilih Foto</span>
                    </label>
                    {coreImages.rt && (
                      <button
                        type="button"
                        onClick={() => setCoreImages(prev => ({ ...prev, rt: '' }))}
                        className="text-[11px] text-merah-600 hover:text-merah-800 font-semibold py-1.5 px-1.5 cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ketua Karang Taruna */}
            <div className="bg-abu-50/50 p-4 rounded-xl border border-abu-200 space-y-3">
              <label className="block text-sm font-bold text-abu-800">Ketua Karang Taruna</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-abu-200 bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                  {coreImages.katar ? (
                    <img src={coreImages.katar} alt="Ketua Karang Taruna" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Icon icon="solar:crown-minimalistic-bold" className="w-7 h-7 text-abu-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    required
                    className="form-input text-xs sm:text-sm"
                    placeholder="Nama Ketua Karang Taruna"
                    value={coreNames.katar || ''}
                    onChange={(e) => setCoreNames(prev => ({ ...prev, katar: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="upload-katar"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'katar')}
                    />
                    <label
                      htmlFor="upload-katar"
                      className="text-[11px] bg-white border border-abu-300 text-abu-700 px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer hover:bg-abu-50 transition-colors inline-flex items-center gap-1 focus-ring"
                    >
                      <Icon icon="solar:camera-bold" className="w-3.5 h-3.5" />
                      <span>Pilih Foto</span>
                    </label>
                    {coreImages.katar && (
                      <button
                        type="button"
                        onClick={() => setCoreImages(prev => ({ ...prev, katar: '' }))}
                        className="text-[11px] text-merah-600 hover:text-merah-800 font-semibold py-1.5 px-1.5 cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sekretaris */}
            <div className="bg-abu-50/50 p-4 rounded-xl border border-abu-200 space-y-3">
              <label className="block text-sm font-bold text-abu-800">Sekretaris</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-abu-200 bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                  {coreImages.sekretaris ? (
                    <img src={coreImages.sekretaris} alt="Sekretaris" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Icon icon="solar:document-text-bold" className="w-7 h-7 text-abu-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    required
                    className="form-input text-xs sm:text-sm"
                    placeholder="Nama Sekretaris"
                    value={coreNames.sekretaris || ''}
                    onChange={(e) => setCoreNames(prev => ({ ...prev, sekretaris: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="upload-sekretaris"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'sekretaris')}
                    />
                    <label
                      htmlFor="upload-sekretaris"
                      className="text-[11px] bg-white border border-abu-300 text-abu-700 px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer hover:bg-abu-50 transition-colors inline-flex items-center gap-1 focus-ring"
                    >
                      <Icon icon="solar:camera-bold" className="w-3.5 h-3.5" />
                      <span>Pilih Foto</span>
                    </label>
                    {coreImages.sekretaris && (
                      <button
                        type="button"
                        onClick={() => setCoreImages(prev => ({ ...prev, sekretaris: '' }))}
                        className="text-[11px] text-merah-600 hover:text-merah-800 font-semibold py-1.5 px-1.5 cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bendahara */}
            <div className="bg-abu-50/50 p-4 rounded-xl border border-abu-200 space-y-3">
              <label className="block text-sm font-bold text-abu-800">Bendahara</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-abu-200 bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                  {coreImages.bendahara ? (
                    <img src={coreImages.bendahara} alt="Bendahara" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Icon icon="solar:wallet-money-bold" className="w-7 h-7 text-abu-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    required
                    className="form-input text-xs sm:text-sm"
                    placeholder="Nama Bendahara"
                    value={coreNames.bendahara || ''}
                    onChange={(e) => setCoreNames(prev => ({ ...prev, bendahara: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="upload-bendahara"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'bendahara')}
                    />
                    <label
                      htmlFor="upload-bendahara"
                      className="text-[11px] bg-white border border-abu-300 text-abu-700 px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer hover:bg-abu-50 transition-colors inline-flex items-center gap-1 focus-ring"
                    >
                      <Icon icon="solar:camera-bold" className="w-3.5 h-3.5" />
                      <span>Pilih Foto</span>
                    </label>
                    {coreImages.bendahara && (
                      <button
                        type="button"
                        onClick={() => setCoreImages(prev => ({ ...prev, bendahara: '' }))}
                        className="text-[11px] text-merah-600 hover:text-merah-800 font-semibold py-1.5 px-1.5 cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary min-h-[44px] cursor-pointer"
          >
            {loading ? 'Menyimpan...' : 'Simpan Pengurus Inti'}
          </button>
        </form>
      </div>

      <div className="admin-section bg-white p-6 rounded-2xl border border-abu-200 shadow-sm">
        <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
          <Icon icon="solar:users-group-two-rounded-bold-duotone" className="w-5 h-5 text-merah-600" />
          Kelola Anggota Karang Taruna
        </h2>

        <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
          <input
            type="text"
            required
            className="form-input text-sm"
            placeholder="Ketik nama anggota baru..."
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !newMemberName.trim()}
            className="btn btn-primary min-h-[44px] flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Icon icon="solar:add-square-bold" className="w-4 h-4 text-white" />
            <span>Tambah</span>
          </button>
        </form>

        {members.length === 0 ? (
          <p className="text-sm text-abu-400 text-center py-6">Belum ada anggota terdaftar.</p>
        ) : (
          <div className="overflow-x-auto border border-abu-200 rounded-2xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-abu-100 text-abu-700 font-semibold border-b border-abu-200">
                  <th className="p-3 text-center w-12">No.</th>
                  <th className="p-3">Nama Anggota</th>
                  <th className="p-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-abu-200">
                {members.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-abu-50/50 transition-colors">
                    <td className="p-3 text-center font-medium text-abu-500">{idx + 1}</td>
                    <td className="p-3 font-semibold text-abu-900">{m.name}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditMemberClick(m)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                          title="Edit Nama"
                        >
                          <Icon icon="solar:pen-bold" className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m)}
                          className="p-1.5 text-merah-600 hover:text-merah-800 hover:bg-merah-50 rounded-lg transition-colors focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                          title="Hapus Anggota"
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

      {editingMember && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-merah-700 to-merah-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-white" />
                Ubah Nama Anggota
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white text-lg font-bold cursor-pointer focus-ring"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Nama Anggota</label>
                <input
                  type="text"
                  required
                  className="form-input focus-ring text-sm"
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-abu-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="btn btn-secondary cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary cursor-pointer min-h-[44px]"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Nama'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
