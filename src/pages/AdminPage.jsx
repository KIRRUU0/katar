import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Icon } from '@iconify/react'

/* ================================================================
   AdminPage — Protected dashboard for managing tournaments,
   participants, and winners. Requires Supabase email/password auth.
   Touch-friendly: all interactive elements ≥ 44px hit area.
   ================================================================ */

// ─── Demo / fallback data when Supabase is not configured ────────
const FALLBACK_YEARS = [2026, 2025, 2024]
const DEMO_TOURNAMENTS = []

const CATEGORIES = [
  { id: 'anak_4_6', name: 'Anak-Anak 4-6 Tahun', type: 'individu' },
  { id: 'anak_7_12', name: 'Anak-Anak 7-12 Tahun', type: 'individu' },
  { id: 'remaja_pria', name: 'Remaja Pria', type: 'individu' },
  { id: 'remaja_putri', name: 'Remaja Putri', type: 'individu' },
  { id: 'ibu_ibu', name: 'Ibu-Ibu', type: 'individu' },
  { id: 'bapak_bapak', name: 'Bapak-Bapak', type: 'individu' },
  { id: 'pasangan', name: 'Pasangan', type: 'grup' },
]

// ─── Shared Image Upload Helper ──────────────────────────────────
const uploadImage = async (file) => {
  if (!isSupabaseConfigured()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { data, error } = await supabase.storage
      .from('katar-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.warn('Supabase storage upload failed, falling back to base64:', error)
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(file)
      })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('katar-images')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (err) {
    console.warn('Upload exception, falling back to base64:', err)
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })
  }
}

// ─── Shared Parse Image Helper ───────────────────────────────────
const parseImages = (imageUrl) => {
  if (!imageUrl) return []
  
  const getDirectImageUrl = (url) => {
    if (!url) return ''
    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{25,})/i
    const match = url.match(driveRegex)
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`
    }
    return url
  }

  let urls = []
  if (imageUrl.startsWith('[') && imageUrl.endsWith(']')) {
    try {
      urls = JSON.parse(imageUrl)
    } catch (e) {
      console.error('Failed to parse image_url JSON:', e)
    }
  } else if (imageUrl.includes(',')) {
    urls = imageUrl.split(',').map(u => u.trim()).filter(Boolean)
  } else {
    urls = [imageUrl.trim()].filter(Boolean)
  }

  return urls.map(getDirectImageUrl)
}

// ─── Shared Normalize Category Helper ─────────────────────────────
const getNormalizedCategory = (category, type, name = '') => {
  const cat = category || ''
  if (cat === 'anak_4_6' || cat === '4-6') return 'anak_4_6'
  if (cat === 'anak_7_12' || cat === '7-12') return 'anak_7_12'
  if (cat === 'remaja_pria' || cat === 'remaja pria') return 'remaja_pria'
  if (cat === 'remaja_putri' || cat === 'remaja putri') return 'remaja_putri'
  if (cat === 'ibu_ibu' || cat === 'ibu-ibu' || cat === 'ibu_individu' || cat === 'ibu_grup') return 'ibu_ibu'
  if (cat === 'bapak_bapak' || cat === 'bapak-bapak' || cat === 'bapak_individu' || cat === 'bapak_grup') return 'bapak_bapak'
  if (cat === 'pasangan' || cat === 'segala_umur' || cat === 'remaja_grup' || type === 'grup') return 'pasangan'

  const lowerName = name.toLowerCase()
  if (lowerName.includes('4-6') || lowerName.includes('balita')) return 'anak_4_6'
  if (lowerName.includes('7-12') || lowerName.includes('anak')) return 'anak_7_12'
  if (lowerName.includes('remaja pria') || lowerName.includes('remaja putra')) return 'remaja_pria'
  if (lowerName.includes('remaja putri') || lowerName.includes('remaja putri')) return 'remaja_putri'
  if (lowerName.includes('ibu')) return 'ibu_ibu'
  if (lowerName.includes('bapak') || lowerName.includes('pria')) return 'bapak_bapak'
  if (lowerName.includes('pasangan') || lowerName.includes('grup') || type === 'grup') return 'pasangan'

  return 'bapak_bapak'
}

// ─── Toast helper component ──────────────────────────────────────
function Toast({ message, type, onClose }) {
  if (!message) return null
  const bg = type === 'success'
    ? 'bg-green-100 border-green-400 text-green-800'
    : 'bg-merah-100 border-merah-400 text-merah-800'

  return (
    <div className={`${bg} border rounded-xl px-4 py-3 mb-4 flex items-center justify-between`}>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-3 text-lg leading-none opacity-60 hover:opacity-100"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
//  LOGIN FORM
// ═════════════════════════════════════════════════════════════════
function LoginForm() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Login gagal, cek kembali email dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md p-8 space-y-5"
      >
        {/* Title */}
        <h1 className="font-heading text-2xl font-bold flex items-center justify-center gap-2 text-abu-900">
          <Icon icon="solar:lock-password-bold-duotone" className="w-6 h-6 text-merah-600" />
          Login Admin Katar RT 02/03
        </h1>

        {/* Error message */}
        {error && (
          <p className="text-merah-600 text-sm text-center bg-merah-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="admin@katar.rt0203"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Masuk...
            </span>
          ) : (
            'Masuk'
          )}
        </button>
      </form>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
//  SECTION 1 — Form Buat Lomba
// ═════════════════════════════════════════════════════════════════
function FormBuatLomba({ onTournamentAdded }) {
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

// ═════════════════════════════════════════════════════════════════
//  SECTION 2 — Form Input Peserta Dinamis
// ═════════════════════════════════════════════════════════════════
function FormInputPeserta({ tournaments }) {
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

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
      if (!isSupabaseConfigured()) {
        const allParts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
        const newPart = {
          id: 'part-' + Date.now(),
          tournament_id: selectedId,
          name: participantName.trim(),
          origin_block: participantAge.toString() // Age stored as string in origin_block
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
          team_name: groupName.trim()
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
    setLoading(true)
    try {
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
              const DIVISIONS = [
                { id: 'anak_4_6', name: 'Divisi Anak-Anak 4-6 Tahun', icon: 'solar:smile-circle-bold' },
                { id: 'anak_7_12', name: 'Divisi Anak-Anak 7-12 Tahun', icon: 'solar:smile-circle-bold' },
                { id: 'remaja_pria', name: 'Divisi Remaja Pria', icon: 'solar:bolt-circle-bold' },
                { id: 'remaja_putri', name: 'Divisi Remaja Putri', icon: 'solar:bolt-circle-bold' },
                { id: 'ibu_ibu', name: 'Divisi Ibu-Ibu', icon: 'solar:user-bold' },
                { id: 'bapak_bapak', name: 'Divisi Bapak-Bapak', icon: 'solar:user-bold' },
                { id: 'pasangan', name: 'Divisi Pasangan', icon: 'solar:users-group-two-rounded-bold' },
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
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
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

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
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

// ═════════════════════════════════════════════════════════════════
//  SECTION 3 — Form Kunci Pemenang
// ═════════════════════════════════════════════════════════════════
function FormKunciPemenang({ tournaments, onTournamentUpdated }) {
  const [selectedId, setSelectedId] = useState('')
  const [entries, setEntries] = useState([])   // participants or teams
  const [winners, setWinners] = useState({ gold: '', silver: '', bronze: '' })
  const [loading, setLoading] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  const selected = tournaments.find((t) => t.id === selectedId) || null

  // Fetch participants/teams when tournament changes
  useEffect(() => {
    if (!selectedId) {
      setEntries([])
      setWinners({ gold: '', silver: '', bronze: '' })
      return
    }
    setWinners({ gold: '', silver: '', bronze: '' })
    setToast({ message: '', type: '' })

    const fetchEntries = async () => {
      setLoadingEntries(true)
      try {
        if (!isSupabaseConfigured()) {
          // Demo entries
          await new Promise((r) => setTimeout(r, 300))
          setEntries([
            { id: 'e1', name: 'Peserta Demo A' },
            { id: 'e2', name: 'Peserta Demo B' },
            { id: 'e3', name: 'Peserta Demo C' },
            { id: 'e4', name: 'Peserta Demo D' },
          ])
        } else {
          const table = selected?.type === 'individu' ? 'participants' : 'teams'
          const selectCols = selected?.type === 'individu' ? 'id, name' : 'id, team_name'
          const { data, error } = await supabase
            .from(table)
            .select(selectCols)
            .eq('tournament_id', selectedId)
          if (error) throw error
          setEntries(data || [])
        }
      } catch (err) {
        setToast({ message: `Gagal memuat data: ${err.message}`, type: 'error' })
      } finally {
        setLoadingEntries(false)
      }
    }
    fetchEntries()
  }, [selectedId, selected?.type])

  const handlePublish = async () => {
    if (!winners.gold || !winners.silver || !winners.bronze) {
      setToast({ message: 'Pilih semua juara (1, 2, 3) terlebih dahulu.', type: 'error' })
      return
    }
    // Prevent duplicate selections
    if (new Set([winners.gold, winners.silver, winners.bronze]).size < 3) {
      setToast({ message: 'Juara 1, 2, dan 3 harus berbeda.', type: 'error' })
      return
    }

    setLoading(true)
    setToast({ message: '', type: '' })

    try {
      if (!isSupabaseConfigured()) {
        await new Promise((r) => setTimeout(r, 800))
      } else {
        const entityType = selected?.type === 'individu' ? 'participant' : 'team'
        // Insert winners
        const { error: winErr } = await supabase.from('winners').insert([
          { tournament_id: selectedId, [`${entityType}_id`]: winners.gold, rank: 1 },
          { tournament_id: selectedId, [`${entityType}_id`]: winners.silver, rank: 2 },
          { tournament_id: selectedId, [`${entityType}_id`]: winners.bronze, rank: 3 },
        ])
        if (winErr) throw winErr

        // Update tournament status
        const { error: updErr } = await supabase
          .from('tournaments')
          .update({ status: 'selesai' })
          .eq('id', selectedId)
        if (updErr) throw updErr
      }

      setToast({ message: 'Hasil league berhasil dipublish! Selamat kepada para juara!', type: 'success' })
      setSelectedId('')
      setEntries([])
      setWinners({ gold: '', silver: '', bronze: '' })
      onTournamentUpdated?.()
    } catch (err) {
      setToast({ message: `Gagal publish: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const renderWinnerSelect = (label, icon, iconColorClass, key) => (
    <div>
      <label className="block text-sm font-semibold text-abu-700 flex items-center gap-1.5 mb-1">
        <Icon icon={icon} className={`w-4 h-4 ${iconColorClass}`} />
        {label}
      </label>
      <select
        className="form-select"
        value={winners[key]}
        onChange={(e) => setWinners((w) => ({ ...w, [key]: e.target.value }))}
      >
        <option value="">— Pilih —</option>
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name || entry.team_name}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="admin-section">
      <h2 className="font-heading text-xl font-bold text-abu-900 flex items-center gap-2 mb-5">
        <Icon icon="solar:cup-bold-duotone" className="w-5 h-5 text-merah-600" />
        Kunci Pemenang
      </h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* Tournament selector */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-abu-700 mb-1">Pilih Lomba</label>
        <select
          className="form-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Pilih lomba —</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.type}) — {t.year}
            </option>
          ))}
        </select>
      </div>

      {/* Winner dropdowns */}
      {selected && (
        <div className="space-y-4 pt-2 border-t border-abu-200">
          {loadingEntries ? (
            <p className="text-sm text-abu-400 py-4 text-center">Memuat peserta...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-abu-400 py-4 text-center">
              Belum ada peserta/tim terdaftar untuk lomba ini.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 pt-3">
                {renderWinnerSelect('Juara 1', 'solar:cup-first-bold', 'text-amber-500', 'gold')}
                {renderWinnerSelect('Juara 2', 'solar:cup-first-bold', 'text-slate-400', 'silver')}
                {renderWinnerSelect('Juara 3', 'solar:cup-first-bold', 'text-amber-700', 'bronze')}
              </div>

              {/* Big publish button */}
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className="btn btn-success w-full min-h-[56px] font-bold text-lg mt-4
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Mempublish...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Icon icon="solar:upload-bold" className="w-5 h-5 text-white" />
                    PUBLISH HASIL LEAGUE
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
//  SECTION 4 — Form Posting Berita Baru
// ═════════════════════════════════════════════════════════════════
function FormKelolaBerita() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
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
  })
  const [editUploading, setEditUploading] = useState(false)
  const [tempGalleryInput, setTempGalleryInput] = useState('')
  const [tempEditGalleryInput, setTempEditGalleryInput] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.imageUrl.trim()) return
    setLoading(true)
    setToast({ message: '', type: '' })

    const newNews = {
      title: form.title.trim(),
      description: form.description.trim(),
      image_url: form.imageUrl.trim(),
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('news').insert(newNews)
        if (error) throw error
        setToast({ message: `Berita "${form.title}" berhasil diposting!`, type: 'success' })
      } else {
        // Fallback local storage
        const newsWithId = {
          ...newNews,
          id: 'local-news-' + Date.now(),
          created_at: new Date().toISOString(),
        }
        const updatedList = [newsWithId, ...newsList]
        localStorage.setItem('katar_news_articles', JSON.stringify(updatedList))
        setToast({ message: `(Demo) Berita "${form.title}" berhasil disimpan secara lokal!`, type: 'success' })
      }
      setForm({ title: '', description: '', imageUrl: '' })
      fetchNews()
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
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('news')
          .update({
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            image_url: editForm.imageUrl.trim(),
          })
          .eq('id', editForm.id)
        if (error) throw error
      } else {
        const updatedList = newsList.map(n => n.id === editForm.id ? {
          ...n,
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          image_url: editForm.imageUrl.trim(),
        } : n)
        localStorage.setItem('katar_news_articles', JSON.stringify(updatedList))
      }
      setToast({ message: 'Berita berhasil diperbarui!', type: 'success' })
      setEditingNews(null)
      fetchNews()
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
          <label className="block text-sm font-semibold text-abu-700 mb-1">Tautan Gambar (Otomatis masuk preview saat ditempel/paste)</label>
          <input
            type="text"
            className="form-input focus-ring text-sm"
            placeholder="Tempel (Paste) URL gambar di sini (bisa Google Drive / URL lainnya) atau ketik lalu tekan Enter"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
            {parseImages(form.imageUrl).map((url, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-abu-200 shadow-sm bg-abu-50">
                <img
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                  onClick={() => setLightboxUrl(url)}
                />
                <button
                  type="button"
                  onClick={() => {
                    const remaining = parseImages(form.imageUrl).filter((_, i) => i !== idx)
                    updateField('imageUrl', remaining.length > 0 ? JSON.stringify(remaining) : '')
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer text-xs z-20"
                  title="Hapus"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Isi Berita / Deskripsi Kegiatan</label>
          <textarea
            required
            className="form-input focus-ring min-h-[120px] py-2 text-sm"
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
                          onClick={() => {
                            const imgUrl = parseImages(item.image_url)[0]
                            if (imgUrl) setLightboxUrl(imgUrl)
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-abu-900">{item.title}</td>
                    <td className="p-3 text-abu-500">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
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
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-merah-700 to-merah-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-white" />
                Edit Detail Berita
              </h3>
              <button
                onClick={() => setEditingNews(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white text-lg font-bold cursor-pointer focus-ring"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
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
                <label className="block text-sm font-semibold text-abu-700 mb-1">Tautan Gambar (Otomatis masuk preview saat ditempel/paste)</label>
                <input
                  type="text"
                  className="form-input focus-ring text-sm"
                  placeholder="Tempel (Paste) URL gambar di sini (bisa Google Drive / URL lainnya) atau ketik lalu tekan Enter"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {parseImages(editForm.imageUrl).map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-abu-200 shadow-sm bg-abu-50">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                        onClick={() => setLightboxUrl(url)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const remaining = parseImages(editForm.imageUrl).filter((_, i) => i !== idx)
                          setEditForm(prev => ({ ...prev, imageUrl: remaining.length > 0 ? JSON.stringify(remaining) : '' }))
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer text-xs z-20"
                        title="Hapus"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Isi Berita / Deskripsi</label>
                <textarea
                  required
                  className="form-input focus-ring min-h-[120px] py-2 text-sm"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-abu-100">
                <button
                  type="button"
                  onClick={() => setEditingNews(null)}
                  className="btn btn-secondary cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || editUploading}
                  className="btn btn-primary cursor-pointer min-h-[44px]"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
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
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold cursor-pointer transition-colors focus-ring"
              title="Tutup"
            >
              ✕
            </button>
            <img 
              src={lightboxUrl} 
              alt="Preview Full" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 text-white/80 text-sm break-all text-center px-4 bg-black/40 py-2 rounded-lg max-w-full">
              {lightboxUrl}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════
//  SECTION 6 — Form Posting Media Baru (Foto Galeri)
// ═════════════════════════════════════════════════════════════════
function FormKelolaMedia({ onMediaAdded }) {
  const [form, setForm] = useState({
    title: '',
    year: new Date().getFullYear(),
    imageUrl: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  // List state
  const [mediaList, setMediaList] = useState([])
  const [fetchingList, setFetchingList] = useState(false)

  // Edit states
  const [editingMedia, setEditingMedia] = useState(null)
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    year: new Date().getFullYear(),
    imageUrl: '',
    description: '',
  })
  const [editUploading, setEditUploading] = useState(false)
  const [tempGalleryInput, setTempGalleryInput] = useState('')
  const [tempEditGalleryInput, setTempEditGalleryInput] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const fetchMedia = useCallback(async () => {
    setFetchingList(true)
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('media')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setMediaList(data || [])
      } else {
        const localData = localStorage.getItem('katar_media_photos')
        let list = []
        if (localData) {
          try {
            list = JSON.parse(localData)
          } catch {
            list = []
          }
        }
        setMediaList(list)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFetchingList(false)
    }
  }, [])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

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
    e.preventDefault()
    if (!form.title.trim() || !form.imageUrl.trim()) return
    setLoading(true)
    setToast({ message: '', type: '' })

    const newPhoto = {
      title: form.title.trim(),
      year: Number(form.year),
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
      setForm({ title: '', year: new Date().getFullYear(), imageUrl: '', description: '' })
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="block text-sm font-semibold text-abu-700 mb-1">Tahun Kegiatan</label>
            <select
              className="form-select focus-ring text-sm"
              value={form.year}
              onChange={(e) => updateField('year', Number(e.target.value))}
              required
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Tautan Gambar (Otomatis masuk preview saat ditempel/paste)</label>
          <input
            type="text"
            className="form-input focus-ring text-sm"
            placeholder="Tempel (Paste) URL gambar di sini (bisa Google Drive / URL lainnya) atau ketik lalu tekan Enter"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
            {parseImages(form.imageUrl).map((url, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-abu-200 shadow-sm bg-abu-50">
                <img
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                  onClick={() => setLightboxUrl(url)}
                />
                <button
                  type="button"
                  onClick={() => {
                    const remaining = parseImages(form.imageUrl).filter((_, i) => i !== idx)
                    updateField('imageUrl', remaining.length > 0 ? JSON.stringify(remaining) : '')
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer text-xs z-20"
                  title="Hapus"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Deskripsi / Keterangan</label>
          <textarea
            className="form-input focus-ring min-h-[100px] py-2 text-sm"
            placeholder="Keterangan singkat mengenai momen di dalam foto..."
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
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
        <h3 className="font-heading text-lg font-bold text-abu-900 mb-4">Daftar Foto Galeri</h3>
        {fetchingList ? (
          <p className="text-sm text-abu-400 text-center py-4">Memuat data...</p>
        ) : mediaList.length === 0 ? (
          <p className="text-sm text-abu-400 text-center py-4">Belum ada foto galeri.</p>
        ) : (
          <div className="overflow-x-auto border border-abu-200 rounded-2xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-abu-100 text-abu-700 font-semibold border-b border-abu-200">
                  <th className="p-3 text-center w-12">No.</th>
                  <th className="p-3">Foto</th>
                  <th className="p-3">Judul Foto</th>
                  <th className="p-3">Tahun</th>
                  <th className="p-3">Keterangan</th>
                  <th className="p-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-abu-200">
                {mediaList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-abu-50/50 transition-colors">
                    <td className="p-3 text-center font-medium text-abu-500">{idx + 1}</td>
                    <td className="p-3">
                      <div className="w-14 h-10 rounded overflow-hidden border border-abu-200">
                        <img
                          src={parseImages(item.image_url)[0]}
                          alt=""
                          className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                          onClick={() => {
                            const imgUrl = parseImages(item.image_url)[0]
                            if (imgUrl) setLightboxUrl(imgUrl)
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-abu-900">{item.title}</td>
                    <td className="p-3 text-abu-600 font-medium">{item.year}</td>
                    <td className="p-3 text-abu-500 max-w-xs truncate">{item.description || '-'}</td>
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
      {editingMedia && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-merah-700 to-merah-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                <Icon icon="solar:pen-bold" className="w-5 h-5 text-white" />
                Edit Detail Foto Galeri
              </h3>
              <button
                onClick={() => setEditingMedia(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white text-lg font-bold cursor-pointer focus-ring"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Tahun Kegiatan</label>
                  <select
                    className="form-select focus-ring text-sm"
                    value={editForm.year}
                    onChange={(e) => setEditForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                    required
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Tautan Gambar (Otomatis masuk preview saat ditempel/paste)</label>
                <input
                  type="text"
                  className="form-input focus-ring text-sm"
                  placeholder="Tempel (Paste) URL gambar di sini (bisa Google Drive / URL lainnya) atau ketik lalu tekan Enter"
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {parseImages(editForm.imageUrl).map((url, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-abu-200 shadow-sm bg-abu-50">
                          <img
                            src={url}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                            onClick={() => setLightboxUrl(url)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = parseImages(editForm.imageUrl).filter((_, i) => i !== idx)
                              setEditForm(prev => ({ ...prev, imageUrl: remaining.length > 0 ? JSON.stringify(remaining) : '' }))
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer text-xs z-20"
                            title="Hapus"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-abu-700 mb-1">Deskripsi / Keterangan</label>
                <textarea
                  className="form-input focus-ring min-h-[100px] py-2 text-sm"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-abu-100">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="btn btn-secondary cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || editUploading}
                  className="btn btn-primary cursor-pointer min-h-[44px]"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
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
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold cursor-pointer transition-colors focus-ring"
              title="Tutup"
            >
              ✕
            </button>
            <img 
              src={lightboxUrl} 
              alt="Preview Full" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 text-white/80 text-sm break-all text-center px-4 bg-black/40 py-2 rounded-lg max-w-full">
              {lightboxUrl}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
//  SECTION 7 — Form Daftar & Edit Lomba
// ═════════════════════════════════════════════════════════════════
function FormDaftarLomba({ tournaments, onTournamentUpdated }) {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  
  // Edit modal state
  const [editingTournament, setEditingTournament] = useState(null)
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    type: 'individu',
    category: 'anak-anak',
    status: 'belum',
    location: '',
    schedule: '',
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
      category: t.category || 'anak-anak',
      status: t.status,
      location: t.location || '',
      schedule: t.schedule ? t.schedule.substring(0, 16) : '',
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
        const catObj = CATEGORIES.find(c => c.id === value)
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
                      {t.category ? t.category.replace('_', ' ') : t.type}
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
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
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

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
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
                    {CATEGORIES.map(cat => (
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
                <div>
                  <label className="block text-sm font-semibold text-abu-700 mb-1">Jadwal Lomba</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editForm.schedule}
                    onChange={(e) => handleEditChange('schedule', e.target.value)}
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

// ═════════════════════════════════════════════════════════════════
//  SECTION 8 — Form Kelola Organisasi (Pengurus & Anggota)
// ═════════════════════════════════════════════════════════════════
function FormKelolaOrganisasi() {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  
  // Core roles states
  const [coreNames, setCoreNames] = useState({
    rt: 'Bapak Abdul Mukmin',
    katar: 'Ridho Ramadhani',
    sekretaris: 'Tri Dewi Setyawati',
    bendahara: 'Bintang R Sinaga',
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
          
          if (!error && resData && resData.length > 0) {
            data = resData
            isFetched = true
          } else if (error) {
            console.warn('Supabase organization query failed, falling back to local storage:', error.message)
          }
        } catch (dbErr) {
          console.warn('Supabase organization query failed, falling back to local storage:', dbErr.message)
        }
      }

      if (isFetched && data) {
        // Parse core roles and photos
        const cores = { ...coreNames }
        const imgs = { ...coreImages }
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
          const cores = { ...coreNames }
          const imgs = { ...coreImages }
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
          // If no localStorage, initialize with default members from OrgPage
          const defaultMembers = [
            'Muhammad Haekal Arrafi', 'Hirzan Arziqi', 'Rizq Ahmad Pratama', 'Muhamad Rifai',
            'Syazkiya Alifah An Nur', 'Nadia Istifana', 'Mutiara Fatharani Nurdiana', 'Kenzi Alfaruq',
            'Tri Dewi Setyawati', 'Cakra Aditia', 'Syakira Harisma Putri', 'Siti Aisyah', 'Hadiil Alwan',
            'Fatia Isnaini Yulman', 'Muhammad Rizki Arifi', 'Syifa Auliya Ilmi', 'Muhamad Iqbal',
            'Ning Fauziah Pratiwi', 'Bunga Reyfan Ramadhani',
          ].map((name, idx) => ({
            id: 'demo-mem-' + idx,
            role_key: 'member',
            role_name: 'Anggota',
            name,
            display_order: idx + 1
          }))
          setMembers(defaultMembers)
          
          // Seed default demo images
          setCoreImages({
            rt: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
            katar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
            sekretaris: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
            bendahara: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
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
        { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt, image_url: coreImages.rt || null, display_order: 0 },
        { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar, image_url: coreImages.katar || null, display_order: 0 },
        { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris, image_url: coreImages.sekretaris || null, display_order: 0 },
        { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara, image_url: coreImages.bendahara || null, display_order: 0 },
      ]

      if (isSupabaseConfigured()) {
        for (const role of payload) {
          const { data: existing, error: checkError } = await supabase
            .from('organization')
            .select('id')
            .eq('role_key', role.role_key)
            .maybeSingle()
          
          if (checkError) throw checkError

          if (existing) {
            const { error: updateError } = await supabase
              .from('organization')
              .update({ name: role.name, image_url: role.image_url })
              .eq('id', existing.id)
            if (updateError) throw updateError
          } else {
            const { error: insertError } = await supabase
              .from('organization')
              .insert(role)
            if (insertError) throw insertError
          }
        }
      } else {
        // Save locally
        const localOrg = localStorage.getItem('katar_organization')
        let parsed = []
        if (localOrg) {
          parsed = JSON.parse(localOrg).filter(item => item.role_key === 'member')
        }
        const combined = [...payload.map((p, idx) => ({ ...p, id: 'demo-core-' + idx })), ...parsed]
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
        display_order: nextOrder
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
            { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt },
            { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar },
            { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris },
            { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara },
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
            { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt },
            { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar },
            { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris },
            { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara },
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
            { role_key: 'rt', role_name: 'Pelindung / Ketua RT', name: coreNames.rt },
            { role_key: 'katar', role_name: 'Ketua Karang Taruna', name: coreNames.katar },
            { role_key: 'sekretaris', role_name: 'Sekretaris', name: coreNames.sekretaris },
            { role_key: 'bendahara', role_name: 'Bendahara', name: coreNames.bendahara },
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pelindung / Ketua RT */}
            <div className="bg-abu-50/50 p-4 rounded-xl border border-abu-200 space-y-3">
              <label className="block text-sm font-bold text-abu-800">Pelindung / Ketua RT</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-abu-200 bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                  {coreImages.rt ? (
                    <img src={coreImages.rt} alt="Pelindung / Ketua RT" className="w-full h-full object-cover" />
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
                    value={coreNames.rt}
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
                    <img src={coreImages.katar} alt="Ketua Karang Taruna" className="w-full h-full object-cover" />
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
                    value={coreNames.katar}
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
                    <img src={coreImages.sekretaris} alt="Sekretaris" className="w-full h-full object-cover" />
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
                    value={coreNames.sekretaris}
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
                    <img src={coreImages.bendahara} alt="Bendahara" className="w-full h-full object-cover" />
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
                    value={coreNames.bendahara}
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
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-abu-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
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

function FormKelolaTicker() {
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
            placeholder="Ketik pengumuman baru disini... (contoh: Lomba tarik tambang akan dimulai besok pagi!)"
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

// ═════════════════════════════════════════════════════════════════
//  MAIN ADMIN PAGE
// ═════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loggingOut, setLoggingOut] = useState(false)
  
  // Dashboard tab state
  const [activeTab, setActiveTab] = useState('overview')
  
  // Dashboard summary stats state
  const [stats, setStats] = useState({
    activeTournamentsCount: 0,
    totalParticipantsCount: 0,
    totalNewsCount: 0,
    totalMediaCount: 0,
    activeTournamentsList: [],
  })
  const [statsLoading, setStatsLoading] = useState(false)

  /**
   * Fetch active tournaments (status != 'selesai')
   * Used by both participant input and winner forms.
   */
  const fetchTournaments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      const localTourneys = localStorage.getItem('katar_tournaments')
      if (localTourneys) {
        setTournaments(JSON.parse(localTourneys))
      } else {
        setTournaments(DEMO_TOURNAMENTS)
        localStorage.setItem('katar_tournaments', JSON.stringify(DEMO_TOURNAMENTS))
      }
      return
    }
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, years(year_number)')
        .neq('status', 'selesai')
      if (error) throw error

      const mapped = (data || []).map(t => ({
        ...t,
        year: t.years?.year_number || 2026
      })).sort((a, b) => b.year - a.year)

      setTournaments(mapped)
    } catch (err) {
      console.error('fetchTournaments error, using demo fallback:', err)
      setTournaments(DEMO_TOURNAMENTS)
    }
  }, [])

  /**
   * Fetch summary statistics for dashboard Overview tab
   */
  const fetchDashboardStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      if (isSupabaseConfigured()) {
        // 1. Tournaments
        const { data: tourneys, error: tErr } = await supabase
          .from('tournaments')
          .select('id, name, type, category, status, years(year_number)')
        if (tErr) throw tErr

        const mappedTourneys = (tourneys || []).map(t => ({
          ...t,
          year: t.years?.year_number || 2026
        }))

        const activeT = mappedTourneys.filter(t => t.status !== 'selesai')

        // 2. Participants
        const { count: participantsCount, error: pErr } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
        if (pErr) throw pErr

        // 3. News
        const { count: newsCount, error: nErr } = await supabase
          .from('news')
          .select('*', { count: 'exact', head: true })
        if (nErr) throw nErr

        // 4. Media
        const { count: mediaCount, error: mErr } = await supabase
          .from('media')
          .select('*', { count: 'exact', head: true })
        if (mErr) throw mErr

        setStats({
          activeTournamentsCount: activeT.length,
          totalParticipantsCount: participantsCount || 0,
          totalNewsCount: newsCount || 0,
          totalMediaCount: mediaCount || 0,
          activeTournamentsList: activeT.slice(0, 3),
        })
      } else {
        // Demo fallback
        const localParts = JSON.parse(localStorage.getItem('katar_participants') || '[]')
        const localNews = JSON.parse(localStorage.getItem('katar_news_articles') || '[]')
        const localMedia = JSON.parse(localStorage.getItem('katar_media_photos') || '[]')
        
        let localTourneys = JSON.parse(localStorage.getItem('katar_tournaments') || '[]')
        if (localTourneys.length === 0) {
          localTourneys = DEMO_TOURNAMENTS
        }
        
        const activeT = localTourneys.filter(t => t.status !== 'selesai')
        const allNewsCount = localNews.length || 4
        const allMediaCount = localMedia.length || 6

        setStats({
          activeTournamentsCount: activeT.length,
          totalParticipantsCount: localParts.length,
          totalNewsCount: allNewsCount,
          totalMediaCount: allMediaCount,
          activeTournamentsList: activeT.slice(0, 3),
        })
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Fetch tournaments and stats when user is authenticated
  useEffect(() => {
    if (user) {
      fetchTournaments()
      fetchDashboardStats()
    }
  }, [user, fetchTournaments, fetchDashboardStats])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
    } catch {
      // Swallow — AuthContext handles state
    } finally {
      setLoggingOut(false)
    }
  }

  const handleTournamentAdded = () => {
    fetchTournaments()
    fetchDashboardStats()
  }

  const handleTournamentUpdated = () => {
    fetchTournaments()
    fetchDashboardStats()
  }

  const handleMediaAdded = () => {
    fetchDashboardStats()
  }

  // ── Auth loading state ──
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-merah-500 mx-auto" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-abu-500 text-sm">Memeriksa autentikasi...</p>
        </div>
      </div>
    )
  }

  // ── Login gate ──
  if (!user) return <LoginForm />

  // ── Authenticated dashboard ──
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Dashboard header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-abu-900">
            Dashboard Admin
          </h1>
          <p className="text-sm text-abu-500 mt-1 flex items-center gap-1.5 font-medium">
            <Icon icon="solar:user-circle-bold-duotone" className="w-4 h-4 text-merah-600" />
            {user.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn btn-secondary min-h-[44px] self-start sm:self-auto disabled:opacity-60 cursor-pointer"
        >
          {loggingOut ? 'Keluar...' : 'Logout'}
        </button>
      </div>

      {/* Not-configured banner */}
      {!isSupabaseConfigured() && (
        <div className="bg-emas-light/50 border border-emas rounded-xl px-4 py-3 mb-6 text-sm text-abu-700 flex items-center gap-2">
          <Icon icon="solar:info-circle-bold-duotone" className="w-5 h-5 text-emas flex-shrink-0" />
          <span><strong>Mode Demo</strong> — Supabase belum dikonfigurasi. Data tidak akan tersimpan ke database.</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-abu-200/50 rounded-2xl mb-8">
        {[
          { id: 'overview', label: 'Ringkasan', icon: 'solar:chart-square-bold-duotone' },
          { id: 'tournaments', label: 'Kelola Lomba', icon: 'solar:cup-bold-duotone' },
          { id: 'participants', label: 'Input Peserta', icon: 'solar:user-plus-bold-duotone' },
          { id: 'news-media', label: 'Berita & Media', icon: 'solar:gallery-bold-duotone' },
          { id: 'organization', label: 'Kelola Organisasi', icon: 'solar:users-group-rounded-bold-duotone' },
          { id: 'announcements', label: 'Ticker Pengumuman', icon: 'solar:bullhorn-bold-duotone' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 min-h-[42px] px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all duration-300 cursor-pointer focus-ring whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-white text-merah-700 shadow-sm'
                : 'text-abu-600 hover:text-abu-900 hover:bg-white/55'
              }`}
          >
            <Icon icon={tab.icon} className="w-4.5 h-4.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-abu-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Lomba Aktif</span>
                  <Icon icon="solar:cup-bold" className="w-5 h-5 text-merah-500" />
                </div>
                <div>
                  <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                    {stats.activeTournamentsCount}
                  </div>
                  <p className="text-[11px] text-abu-400 mt-1">Belum/sedang berjalan</p>
                </div>
              </div>

              <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-abu-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Peserta Lomba</span>
                  <Icon icon="solar:users-group-two-rounded-bold" className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                    {stats.totalParticipantsCount}
                  </div>
                  <p className="text-[11px] text-abu-400 mt-1">Total peserta aktif</p>
                </div>
              </div>

              <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-abu-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Berita</span>
                  <Icon icon="solar:document-bold" className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                    {stats.totalNewsCount}
                  </div>
                  <p className="text-[11px] text-abu-400 mt-1">Artikel di home page</p>
                </div>
              </div>

              <div className="bg-white border border-abu-200 p-5 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-abu-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Galeri Foto</span>
                  <Icon icon="solar:gallery-bold" className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-3xl font-heading font-black text-abu-900 leading-tight">
                    {stats.totalMediaCount}
                  </div>
                  <p className="text-[11px] text-abu-400 mt-1">Foto kegiatan warga</p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Quick Actions & Overview info (Col-5) */}
              <div className="md:col-span-5 bg-white border border-abu-200 rounded-2xl p-6 space-y-5">
                <h3 className="font-heading text-lg font-bold text-abu-900 border-b border-abu-100 pb-2">
                  Aksi Cepat
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setActiveTab('tournaments')}
                    className="w-full flex items-center justify-between p-3.5 bg-abu-50 rounded-xl hover:bg-merah-50 hover:text-merah-700 border border-abu-200/60 hover:border-merah-200 transition-all duration-200 text-sm font-semibold text-left group cursor-pointer focus-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:add-square-bold-duotone" className="w-5 h-5 text-merah-500" />
                      Buat Lomba Baru
                    </span>
                    <Icon icon="solar:arrow-right-bold" className="w-4 h-4 text-abu-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('participants')}
                    className="w-full flex items-center justify-between p-3.5 bg-abu-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 border border-abu-200/60 hover:border-blue-200 transition-all duration-200 text-sm font-semibold text-left group cursor-pointer focus-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:users-group-two-rounded-bold-duotone" className="w-5 h-5 text-blue-500" />
                      Input & Kelola Peserta
                    </span>
                    <Icon icon="solar:arrow-right-bold" className="w-4 h-4 text-abu-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('news-media')}
                    className="w-full flex items-center justify-between p-3.5 bg-abu-50 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 border border-abu-200/60 hover:border-emerald-200 transition-all duration-200 text-sm font-semibold text-left group cursor-pointer focus-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:camera-add-bold-duotone" className="w-5 h-5 text-emerald-500" />
                      Unggah Berita / Galeri
                    </span>
                    <Icon icon="solar:arrow-right-bold" className="w-4 h-4 text-abu-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Right Column: Lomba Berjalan (Col-7) */}
              <div className="md:col-span-7 bg-white border border-abu-200 rounded-2xl p-6">
                <h3 className="font-heading text-lg font-bold text-abu-900 border-b border-abu-100 pb-2 mb-4">
                  Lomba Berjalan
                </h3>

                {statsLoading ? (
                  <p className="text-sm text-abu-400 text-center py-8">Memuat data...</p>
                ) : !stats.activeTournamentsList || stats.activeTournamentsList.length === 0 ? (
                  <div className="text-center py-8 text-abu-400 text-sm italic">
                    Belum ada lomba yang sedang berjalan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.activeTournamentsList.map((tourney) => {
                      return (
                        <div key={tourney.id} className="p-3.5 bg-abu-50/50 border border-abu-200 rounded-xl flex items-center justify-between gap-4">
                          <div>
                            <div className="font-semibold text-sm text-abu-900">{tourney.name}</div>
                            <div className="text-[11px] text-abu-500 mt-1 flex items-center gap-1.5">
                              <span className="capitalize font-bold text-merah-600 bg-merah-50/80 px-1.5 py-0.5 rounded text-[10px]">
                                {tourney.category ? tourney.category.replace('_', ' ') : 'Umum'}
                              </span>
                              <span className="capitalize font-bold text-amber-600 bg-amber-50/80 px-1.5 py-0.5 rounded text-[10px]">
                                {tourney.status ? tourney.status.replace('_', ' ') : 'belum mulai'}
                              </span>
                              <span className="capitalize text-abu-500 text-[10px]">
                                ({tourney.type})
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('tournaments')}
                            className="text-xs font-semibold text-merah-600 bg-merah-50 hover:bg-merah-100 px-3 py-1.5 rounded-lg border border-merah-200 flex items-center gap-1 transition-colors min-h-[38px] cursor-pointer"
                          >
                            <span>Kelola</span>
                          </button>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => setActiveTab('tournaments')}
                      className="w-full text-center text-xs text-merah-600 hover:text-merah-700 hover:underline pt-3 font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Lihat Semua Lomba</span>
                      <Icon icon="solar:alt-arrow-right-bold" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="grid grid-cols-1 gap-6">
            <FormBuatLomba onTournamentAdded={handleTournamentAdded} />
            <FormKunciPemenang
              tournaments={tournaments}
              onTournamentUpdated={handleTournamentUpdated}
            />
            <FormDaftarLomba
              tournaments={tournaments}
              onTournamentUpdated={handleTournamentUpdated}
            />
          </div>
        )}

        {activeTab === 'participants' && (
          <FormInputPeserta tournaments={tournaments} />
        )}

        {activeTab === 'news-media' && (
          <div className="space-y-6">
            <FormKelolaBerita />
            <FormKelolaMedia onMediaAdded={handleMediaAdded} />
          </div>
        )}

        {activeTab === 'organization' && (
          <FormKelolaOrganisasi />
        )}

        {activeTab === 'announcements' && (
          <FormKelolaTicker />
        )}
      </div>
    </div>
  )
}

