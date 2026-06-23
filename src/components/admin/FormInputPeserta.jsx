import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Toast from './Toast'
import { getNormalizedCategory, getCustomCategories, validateAgeForCategory } from './adminUtils'

export default function FormInputPeserta({ tournaments }) {
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  const [customCategories, setCustomCategories] = useState(getCustomCategories())

  // Listen to custom categories updates
  useEffect(() => {
    const handleCatsUpdate = () => {
      setCustomCategories(getCustomCategories())
    }
    window.addEventListener('katar_categories_updated', handleCatsUpdate)
    return () => window.removeEventListener('katar_categories_updated', handleCatsUpdate)
  }, [])

  // Individu state
  const [participantName, setParticipantName] = useState('')
  const [participantAge, setParticipantAge] = useState('')

  // Grup state
  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState([''])

  // Fetch list state
  const [entriesList, setEntriesList] = useState([])
  const [fetchingList, setFetchingList] = useState(false)

  // Grouping by Category state
  const [allParticipants, setAllParticipants] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [allTeamMembers, setAllTeamMembers] = useState([])
  const [fetchingAll, setFetchingAll] = useState(false)
  const [expandedTournament, setExpandedTournament] = useState(null)

  // Edit states
  const [editingItem, setEditingItem] = useState(null) // participant or team
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editMembers, setEditMembers] = useState([''])

  const selected = tournaments.find((t) => t.id === selectedId) || null
  const isIndividu = selected?.type === 'individu'

  const fetchAllData = useCallback(async () => {
    setFetchingAll(true)
    try {
      if (isSupabaseConfigured()) {
        const { data: parts, error: partsErr } = await supabase.from('participants').select('*')
        if (partsErr) throw partsErr
        setAllParticipants(parts || [])

        const { data: tms, error: tmsErr } = await supabase.from('teams').select('*')
        if (tmsErr) throw tmsErr
        setAllTeams(tms || [])

        const { data: mems, error: memsErr } = await supabase.from('team_members').select('*')
        if (memsErr) throw memsErr
        setAllTeamMembers(mems || [])
      } else {
        const parts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
        setAllParticipants(parts)
        const tms = JSON.parse(localStorage.getItem('katar_teams') || '[]')
        setAllTeams(tms)
        const mems = JSON.parse(localStorage.getItem('katar_team_members') || '[]')
        setAllTeamMembers(mems)
      }
    } catch (err) {
      console.error('fetchAllData error:', err)
    } finally {
      setFetchingAll(false)
    }
  }, [])

  const fetchList = useCallback(async () => {
    if (!selectedId) {
      setEntriesList([])
      fetchAllData()
      return
    }
    setFetchingList(true)
    try {
      if (isSupabaseConfigured()) {
        if (isIndividu) {
          const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('tournament_id', selectedId)
            .order('created_at', { ascending: true })
          if (error) throw error
          setEntriesList(data || [])
        } else {
          // Fetch teams
          const { data: teamsData, error: teamsErr } = await supabase
            .from('teams')
            .select('*')
            .eq('tournament_id', selectedId)
            .order('created_at', { ascending: true })
          if (teamsErr) throw teamsErr

          // Fetch all members for these teams
          const teamIds = (teamsData || []).map(t => t.id)
          let membersData = []
          if (teamIds.length > 0) {
            const { data: mData, error: mErr } = await supabase
              .from('team_members')
              .select('*')
              .in('team_id', teamIds)
            if (mErr) throw mErr
            membersData = mData || []
          }

          const combined = (teamsData || []).map(team => ({
            ...team,
            members: membersData.filter(m => m.team_id === team.id).map(m => m.member_name)
          }))
          setEntriesList(combined)
        }
      } else {
        // Local fallback
        if (isIndividu) {
          const allParts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
          const filtered = allParts.filter(p => p.tournament_id === selectedId)
          setEntriesList(filtered)
        } else {
          const allTeams = JSON.parse(localStorage.getItem('katar_teams') || '[]')
          const allMembers = JSON.parse(localStorage.getItem('katar_team_members') || '[]')
          const filteredTeams = allTeams.filter(t => t.tournament_id === selectedId)
          const combined = filteredTeams.map(team => ({
            ...team,
            members: allMembers.filter(m => m.team_id === team.id).map(m => m.member_name)
          }))
          setEntriesList(combined)
        }
      }
      fetchAllData()
    } catch (err) {
      console.error('fetchList error:', err)
      setToast({ message: `Gagal memuat peserta: ${err.message}`, type: 'error' })
    } finally {
      setFetchingList(false)
    }
  }, [selectedId, isIndividu, fetchAllData])

  // Reset and Fetch when switching tournaments
  useEffect(() => {
    setParticipantName('')
    setParticipantAge('')
    setGroupName('')
    setMembers([''])
    setToast({ message: '', type: '' })
    fetchList()
  }, [selectedId, fetchList])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // ── Individu Add ──
  const addParticipant = async () => {
    if (!participantName.trim() || !participantAge) return
    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      const validation = validateAgeForCategory(participantAge, selected?.category)
      if (!validation.valid) {
        throw new Error(validation.message)
      }

      if (!isSupabaseConfigured()) {
        const allParts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
        const newPart = {
          id: 'part-' + Date.now(),
          tournament_id: selectedId,
          name: participantName.trim(),
          origin_block: participantAge.toString(), // Age stored as string in origin_block
          created_at: new Date().toISOString()
        }
        localStorage.setItem('katar_participants', JSON.stringify([...allParts, newPart]))
      } else {
        const { error } = await supabase.from('participants').insert({
          tournament_id: selectedId,
          name: participantName.trim(),
          origin_block: participantAge.toString() // Age stored as string in origin_block
        })
        if (error) throw error
      }
      setToast({ message: `Peserta "${participantName.trim()}" berhasil ditambahkan!`, type: 'success' })
      setParticipantName('')
      setParticipantAge('')
      fetchList()
    } catch (err) {
      setToast({ message: `Gagal: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ── Grup Add ──
  const addMemberRow = () => setMembers((m) => [...m, ''])
  const removeMemberRow = (idx) => setMembers((m) => m.filter((_, i) => i !== idx))
  const updateMember = (idx, val) => setMembers((m) => m.map((v, i) => (i === idx ? val : v)))

  const saveTeam = async () => {
    if (!groupName.trim()) return
    const validMembers = members.filter((m) => m.trim())
    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      if (!isSupabaseConfigured()) {
        const allTeams = JSON.parse(localStorage.getItem('katar_teams') || '[]')
        const allMembers = JSON.parse(localStorage.getItem('katar_team_members') || '[]')

        const newTeamId = 'team-' + Date.now()
        const newTeam = {
          id: newTeamId,
          tournament_id: selectedId,
          team_name: groupName.trim(),
          created_at: new Date().toISOString()
        }

        const newMembers = validMembers.map((name, i) => ({
          id: `member-${Date.now()}-${i}`,
          team_id: newTeamId,
          member_name: name.trim()
        }))

        localStorage.setItem('katar_teams', JSON.stringify([...allTeams, newTeam]))
        localStorage.setItem('katar_team_members', JSON.stringify([...allMembers, ...newMembers]))
      } else {
        // Insert team
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .insert({
            tournament_id: selectedId,
            team_name: groupName.trim()
          })
          .select()
          .single()
        if (teamErr) throw teamErr

        // Insert members
        if (validMembers.length > 0) {
          const { error: memErr } = await supabase.from('team_members').insert(
            validMembers.map((name) => ({ team_id: team.id, member_name: name.trim() }))
          )
          if (memErr) throw memErr
        }
      }
      setToast({ message: `Tim "${groupName.trim()}" berhasil disimpan!`, type: 'success' })
      setGroupName('')
      setMembers([''])
      fetchList()
    } catch (err) {
      setToast({ message: `Gagal: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ── Delete Handler ──
  const handleDelete = async (item) => {
    const displayName = isIndividu ? item.name : item.team_name
    if (!window.confirm(`Hapus ${isIndividu ? 'peserta' : 'tim'} "${displayName}"?`)) return
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const table = isIndividu ? 'participants' : 'teams'
        const { error } = await supabase.from(table).delete().eq('id', item.id)
        if (error) throw error
      } else {
        if (isIndividu) {
          const allParts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
          localStorage.setItem('katar_participants', JSON.stringify(allParts.filter(p => p.id !== item.id)))
        } else {
          const allTeams = JSON.parse(localStorage.getItem('katar_teams') || '[]')
          const allMembers = JSON.parse(localStorage.getItem('katar_team_members') || '[]')
          localStorage.setItem('katar_teams', JSON.stringify(allTeams.filter(t => t.id !== item.id)))
          localStorage.setItem('katar_team_members', JSON.stringify(allMembers.filter(m => m.team_id !== item.id)))
        }
      }
      setToast({ message: `"${displayName}" berhasil dihapus!`, type: 'success' })
      fetchList()
    } catch (err) {
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ── Edit Handler (Open Modal) ──
  const handleEditClick = (item) => {
    setEditingItem(item)
    setEditName(isIndividu ? item.name : item.team_name)
    if (isIndividu) {
      setEditAge(item.origin_block || '')
    } else {
      setEditMembers(item.members && item.members.length ? item.members : [''])
    }
  }

  // ── Edit Member handlers ──
  const addEditMemberRow = () => setEditMembers((m) => [...m, ''])
  const removeEditMemberRow = (idx) => setEditMembers((m) => m.filter((_, i) => i !== idx))
  const updateEditMember = (idx, val) => setEditMembers((m) => m.map((v, i) => (i === idx ? val : v)))

  // ── Edit Submit ──
  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    if (!window.confirm("Yakin ingin memperbarui data ini?")) return;
    setLoading(true)
    try {
      if (isIndividu) {
        const tourneyId = editingItem.tournament_id || selectedId
        const tourneyObj = tournaments.find(t => t.id === tourneyId)
        const validation = validateAgeForCategory(editAge, tourneyObj?.category)
        if (!validation.valid) {
          throw new Error(validation.message)
        }
      }

      if (isSupabaseConfigured()) {
        if (isIndividu) {
          const { error } = await supabase
            .from('participants')
            .update({
              name: editName.trim(),
              origin_block: editAge ? editAge.toString() : null
            })
            .eq('id', editingItem.id)
          if (error) throw error
        } else {
          // Update team name
          const { error: teamErr } = await supabase
            .from('teams')
            .update({ team_name: editName.trim() })
            .eq('id', editingItem.id)
          if (teamErr) throw teamErr

          // Update members: delete first, then insert
          const { error: delErr } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', editingItem.id)
          if (delErr) throw delErr

          const validEditMems = editMembers.filter(m => m.trim())
          if (validEditMems.length > 0) {
            const { error: insErr } = await supabase.from('team_members').insert(
              validEditMems.map(name => ({ team_id: editingItem.id, member_name: name.trim() }))
            )
            if (insErr) throw insErr
          }
        }
      } else {
        // Local fallback
        if (isIndividu) {
          const allParts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
          const idx = allParts.findIndex(p => p.id === editingItem.id)
          if (idx !== -1) {
            allParts[idx] = {
              ...allParts[idx],
              name: editName.trim(),
              origin_block: editAge ? editAge.toString() : null
            }
            localStorage.setItem('katar_participants', JSON.stringify(allParts))
          }
        } else {
          const allTeams = JSON.parse(localStorage.getItem('katar_teams') || '[]')
          const idx = allTeams.findIndex(t => t.id === editingItem.id)
          if (idx !== -1) {
            allTeams[idx] = {
              ...allTeams[idx],
              team_name: editName.trim()
            }
            localStorage.setItem('katar_teams', JSON.stringify(allTeams))
          }

          const allMembers = JSON.parse(localStorage.getItem('katar_team_members') || '[]')
          const filteredMems = allMembers.filter(m => m.team_id !== editingItem.id)
          const validEditMems = editMembers.filter(m => m.trim())
          const newMembers = validEditMems.map((name, i) => ({
            id: `member-${Date.now()}-${i}`,
            team_id: editingItem.id,
            member_name: name.trim()
          }))
          localStorage.setItem('katar_team_members', JSON.stringify([...filteredMems, ...newMembers]))
        }
      }
      setToast({ message: `Data berhasil diperbarui!`, type: 'success' })
      setEditingItem(null)
      fetchList()
    } catch (err) {
      setToast({ message: `Gagal memperbarui: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
        <Icon icon="solar:user-plus-bold-duotone" className="w-5 h-5 text-merah-600" />
        Input Peserta / Tim
      </h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Tournament selector */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-abu-700 mb-1">Pilih Lomba</label>
        <select
          className="form-select focus-ring"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Pilih lomba —</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.type === 'individu' ? 'Individu' : 'Grup'}) — {t.year}
            </option>
          ))}
        </select>
      </div>

      {/* Conditional form based on tournament type */}
      {selected && isIndividu && (
        <div className="space-y-4 pt-2 border-t border-abu-200">
          <p className="text-sm text-abu-500 pt-3">
            Mode: <span className="badge badge-individu">Individu</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-abu-700 mb-1">Nama Peserta</label>
              <input
                type="text"
                className="form-input focus-ring"
                placeholder="Nama lengkap"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-abu-700 mb-1">Umur (Tahun)</label>
              <input
                type="number"
                min="1"
                className="form-input focus-ring"
                placeholder="Contoh: 15"
                value={participantAge}
                onChange={(e) => setParticipantAge(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addParticipant}
            disabled={loading || !participantName.trim() || !participantAge}
            className="btn btn-primary min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-ring"
          >
            {loading ? 'Menambah...' : 'Tambah Peserta'}
          </button>
        </div>
      )}

      {selected && !isIndividu && (
        <div className="space-y-4 pt-2 border-t border-abu-200">
          <p className="text-sm text-abu-500 pt-3">
            Mode: <span className="badge badge-grup">Grup</span>
          </p>

          <div>
            <label className="block text-sm font-semibold text-abu-700 mb-1">Nama Grup / Tim</label>
            <input
              type="text"
              className="form-input focus-ring"
              placeholder="Nama tim"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Dynamic team members */}
          <div>
            <p className="text-sm font-semibold text-abu-700 mb-2">Anggota Tim:</p>
            <div className="space-y-2">
              {members.map((member, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="form-input focus-ring"
                    placeholder={`Anggota ${idx + 1}`}
                    value={member}
                    onChange={(e) => updateMember(idx, e.target.value)}
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemberRow(idx)}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg
                                 text-merah-500 hover:bg-merah-50 transition-colors text-lg cursor-pointer focus-ring"
                      aria-label={`Hapus anggota ${idx + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMemberRow}
              className="btn btn-secondary text-sm mt-2 min-h-[44px] cursor-pointer focus-ring"
            >
              + Tambah Anggota
            </button>
          </div>

          <button
            type="button"
            onClick={saveTeam}
            disabled={loading || !groupName.trim()}
            className="btn btn-primary min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-ring"
          >
            {loading ? 'Menyimpan...' : 'Simpan Tim'}
          </button>
        </div>
      )}

      {/* Daftar Peserta / Tim yang Terdaftar */}
      {selected && (
        <div className="mt-8 pt-6 border-t border-abu-200">
          <h3 className="font-heading text-lg font-bold text-abu-900 mb-4">
            Daftar {isIndividu ? 'Peserta' : 'Tim'} Terdaftar ({entriesList.length})
          </h3>

          {fetchingList ? (
            <p className="text-sm text-abu-400 text-center py-4">Memuat daftar...</p>
          ) : entriesList.length === 0 ? (
            <p className="text-sm text-abu-400 text-center py-4">Belum ada {isIndividu ? 'peserta' : 'tim'} terdaftar untuk lomba ini.</p>
          ) : (
            <div className="overflow-x-auto border border-abu-200 rounded-2xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-abu-100 text-abu-700 font-semibold border-b border-abu-200">
                    <th className="p-3 text-center w-12">No.</th>
                    <th className="p-3">Nama {isIndividu ? 'Peserta' : 'Tim'}</th>
                    {isIndividu ? <th className="p-3">Umur</th> : <th className="p-3">Anggota</th>}
                    <th className="p-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-abu-200">
                  {entriesList.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-abu-50/50 transition-colors">
                      <td className="p-3 text-center font-medium text-abu-500">{idx + 1}</td>
                      <td className="p-3 font-semibold text-abu-900">
                        {isIndividu ? entry.name : entry.team_name}
                      </td>
                      <td className="p-3 text-abu-600">
                        {isIndividu ? (
                          entry.origin_block ? `${entry.origin_block} Tahun` : '-'
                        ) : (
                          entry.members && entry.members.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {entry.members.map((m, i) => (
                                <span key={i} className="text-xs bg-abu-100 text-abu-700 px-2 py-0.5 rounded">
                                  {m}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-abu-400 italic">Tidak ada anggota</span>
                          )
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(entry)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                            title="Edit"
                          >
                            <Icon icon="solar:pen-bold" className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
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
      )}

      {/* Daftar Semua Peserta per Kategori Lomba */}
      <div className="mt-10 pt-8 border-t border-abu-200">
        <h3 className="font-heading text-lg md:text-xl font-bold text-abu-900 mb-6 flex items-center gap-2">
          <Icon icon="solar:users-group-rounded-bold-duotone" className="w-5 h-5 text-merah-600" />
          Daftar Semua Peserta Berdasarkan Kategori Lomba
        </h3>

        {fetchingAll ? (
          <p className="text-sm text-abu-400 text-center py-4">Memuat daftar kategori...</p>
        ) : (
          <div className="space-y-8">
            {(() => {
              const getDivName = (id, defaultName) => {
                const found = customCategories.find(c => c.id === id)
                return found ? `Divisi ${found.name}` : defaultName
              }

              const DIVISIONS = [
                { id: 'anak_4_6', name: getDivName('anak_4_6', 'Divisi Anak-Anak 4-6 Tahun'), icon: 'solar:smile-circle-bold' },
                { id: 'anak_7_12', name: getDivName('anak_7_12', 'Divisi Anak-Anak 7-12 Tahun'), icon: 'solar:smile-circle-bold' },
                { id: 'remaja_pria', name: getDivName('remaja_pria', 'Divisi Remaja Pria'), icon: 'solar:bolt-circle-bold' },
                { id: 'remaja_putri', name: getDivName('remaja_putri', 'Divisi Remaja Putri'), icon: 'solar:bolt-circle-bold' },
                { id: 'ibu_ibu', name: getDivName('ibu_ibu', 'Divisi Ibu-Ibu'), icon: 'solar:user-bold' },
                { id: 'bapak_bapak', name: getDivName('bapak_bapak', 'Divisi Bapak-Bapak'), icon: 'solar:user-bold' },
                { id: 'pasangan', name: getDivName('pasangan', 'Divisi Pasangan'), icon: 'solar:users-group-two-rounded-bold' },
              ]

              const getTournamentDivision = (t) => {
                return getNormalizedCategory(t.category, t.type, t.name)
              }

              return DIVISIONS.map((div) => {
                const divTournaments = tournaments.filter(t => getTournamentDivision(t) === div.id)

                if (divTournaments.length === 0) return null

                return (
                  <div key={div.id} className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 border-b border-abu-200 pb-2">
                      <Icon icon={div.icon} className="w-5 h-5 text-merah-600" />
                      <h4 className="font-heading text-sm font-bold text-abu-900 uppercase tracking-wider">
                        {div.name}
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {divTournaments.map((t) => {
                        const isInd = t.type === 'individu'
                        const parts = isInd 
                          ? allParticipants.filter(p => p.tournament_id === t.id)
                          : allTeams.filter(team => team.tournament_id === t.id)

                        const isExpanded = expandedTournament === t.id

                        return (
                          <div key={t.id} className="border border-abu-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            {/* Tournament Header Accordion Button */}
                            <button
                              type="button"
                              onClick={() => setExpandedTournament(isExpanded ? null : t.id)}
                              className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-abu-50/50 transition-colors focus-ring cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-merah-50 flex items-center justify-center text-merah-600">
                                  <Icon 
                                    icon={t.type === 'grup' ? "solar:users-group-two-rounded-bold" : "solar:user-bold"} 
                                    className="w-4.5 h-4.5" 
                                  />
                                </div>
                                <div>
                                  <span className="font-semibold text-abu-900 text-sm">{t.name}</span>
                                  <span className="ml-2 text-xs bg-abu-150 text-abu-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    {t.type}
                                  </span>
                                  <span className="ml-2 text-xs text-abu-500">({t.year})</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-abu-500">
                                  {parts.length} {t.type === 'grup' ? 'Tim' : 'Peserta'}
                                </span>
                                <Icon 
                                  icon="solar:alt-arrow-down-bold" 
                                  className={`w-5 h-5 text-abu-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-merah-600' : ''}`} 
                                />
                              </div>
                            </button>

                            {/* Tournament Content (Participants/Teams List) */}
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-3 border-t border-abu-150 bg-abu-50/20">
                                {parts.length === 0 ? (
                                  <p className="text-xs text-abu-400 italic">Belum ada peserta terdaftar.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {parts.map((p, pIdx) => {
                                      if (isInd) {
                                        return (
                                          <div key={p.id} className="flex items-center justify-between text-xs text-abu-600 py-1.5 border-b border-abu-100 last:border-0">
                                            <span className="font-medium">{pIdx + 1}. {p.name}</span>
                                            <span className="text-abu-400 font-semibold">{p.origin_block ? `${p.origin_block} Tahun` : '-'}</span>
                                          </div>
                                        )
                                      } else {
                                        const teamMems = allTeamMembers.filter(m => m.team_id === p.id).map(m => m.member_name)
                                        return (
                                          <div key={p.id} className="text-xs text-abu-600 py-2 border-b border-abu-100 last:border-0 space-y-1">
                                            <div className="font-bold text-abu-800">{pIdx + 1}. {p.team_name}</div>
                                            {teamMems.length > 0 ? (
                                              <div className="pl-3 text-[11px] text-abu-500 flex flex-wrap gap-x-2 gap-y-0.5">
                                                {teamMems.map((m, mIdx) => (
                                                  <span key={mIdx} className="bg-abu-100 text-abu-700 px-1.5 py-0.5 rounded text-[10px]">
                                                    {m}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="pl-3 text-[11px] text-abu-400 italic">Tidak ada anggota</div>
                                            )}
                                          </div>
                                        )
                                      }
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-merah-700 to-merah-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-white" />
                Edit Detail {isIndividu ? 'Peserta' : 'Tim'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white text-lg font-bold cursor-pointer focus-ring"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">
                  Nama {isIndividu ? 'Peserta' : 'Tim'}
                </label>
                <input
                  type="text"
                  required
                  className="form-input focus-ring"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {isIndividu ? (
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Umur (Tahun)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-input focus-ring"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-abu-700 mb-2">Anggota Tim:</p>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {editMembers.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          className="form-input focus-ring"
                          placeholder={`Anggota ${idx + 1}`}
                          value={member}
                          onChange={(e) => updateEditMember(idx, e.target.value)}
                        />
                        {editMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEditMemberRow(idx)}
                            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg
                                       text-merah-500 hover:bg-merah-50 transition-colors text-lg cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addEditMemberRow}
                    className="btn btn-secondary text-xs mt-2 min-h-[38px] cursor-pointer focus-ring"
                  >
                    + Tambah Anggota
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-abu-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
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
