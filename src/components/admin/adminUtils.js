import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const FALLBACK_YEARS = [2026, 2025, 2024]
export const DEMO_TOURNAMENTS = []

export const CATEGORIES = [
  { id: 'anak_4_6', name: 'Anak-Anak 4-6 Tahun', type: 'individu' },
  { id: 'anak_7_12', name: 'Anak-Anak 7-12 Tahun', type: 'individu' },
  { id: 'remaja_pria', name: 'Remaja Pria', type: 'individu' },
  { id: 'remaja_putri', name: 'Remaja Putri', type: 'individu' },
  { id: 'ibu_ibu', name: 'Ibu-Ibu', type: 'individu' },
  { id: 'bapak_bapak', name: 'Bapak-Bapak', type: 'individu' },
  { id: 'pasangan', name: 'Pasangan', type: 'grup' },
]

export const getCustomCategories = () => {
  const defaultCats = [
    { id: 'anak_4_6', name: 'Anak-Anak 4-6 Tahun', type: 'individu' },
    { id: 'anak_7_12', name: 'Anak-Anak 7-12 Tahun', type: 'individu' },
    { id: 'remaja_pria', name: 'Remaja Pria', type: 'individu' },
    { id: 'remaja_putri', name: 'Remaja Putri', type: 'individu' },
    { id: 'ibu_ibu', name: 'Ibu-Igu', type: 'individu' },
    { id: 'bapak_bapak', name: 'Bapak-Bapak', type: 'individu' },
    { id: 'pasangan', name: 'Pasangan', type: 'grup' },
  ]
  
  // Fix typo in Ibu-Igu to Ibu-Ibu
  defaultCats[4].name = 'Ibu-Ibu'
  
  const local = localStorage.getItem('katar_custom_categories')
  if (local) {
    try {
      const parsed = JSON.parse(local)
      return defaultCats.map(cat => {
        const found = parsed.find(p => p.id === cat.id || p.category_id === cat.id)
        return found ? { ...cat, name: found.name || found.display_name } : cat
      })
    } catch (e) {
      console.warn('Failed to parse katar_custom_categories:', e)
      return defaultCats
    }
  }
  return defaultCats
}

export const getCategoryName = (categoryId) => {
  const categories = getCustomCategories()
  const found = categories.find(c => c.id === categoryId)
  return found ? found.name : categoryId
}

export const uploadImage = async (file) => {
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

    const { data: publicUrlData, error: publicUrlError } = supabase.storage
      .from('katar-images')
      .getPublicUrl(filePath)

    if (publicUrlError) {
      console.warn('Supabase storage public URL failed, trying signed URL:', publicUrlError)
    }

    let publicUrl = publicUrlData?.publicUrl || publicUrlData?.data?.publicUrl
    if (publicUrl && publicUrl.includes('/storage/v1/object/') && !publicUrl.includes('/storage/v1/object/public/')) {
      publicUrl = publicUrl.replace('/storage/v1/object/', '/storage/v1/object/public/')
    }

    if (!publicUrl) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('katar-images')
        .createSignedUrl(filePath, 3600)

      if (signedError || !signedData?.signedUrl) {
        console.warn('Supabase signed URL failed, falling back to base64:', signedError)
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
      }

      publicUrl = signedData.signedUrl
    }

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

export const parseImages = (imageUrl) => {
  if (!imageUrl) return []
  
  const getDirectImageUrl = (url) => {
    if (!url) return ''
    const trimmed = url.trim()
    const match = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=view&id=|uc\?export=download&id=)|lh3\.googleusercontent\.com\/d\/|docs\.google\.com\/uc\?export=download&id=)([a-zA-Z0-9_-]{25,})/i)
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`
    }
    return trimmed
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

export const getNormalizedCategory = (category, type, name = '') => {
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

export const syncAllExistingNewsImages = async () => {
  // No-op: news images are dynamically merged on the client-side public page
  console.log('syncAllExistingNewsImages: News and media are merged dynamically on the client side.')
}

export const validateAgeForCategory = (ageStr, categoryId) => {
  if (!categoryId) return { valid: true }
  
  const age = parseInt(ageStr, 10)
  if (isNaN(age)) return { valid: false, message: 'Umur harus berupa angka valid.' }

  const customCategories = getCustomCategories()
  const categoryObj = customCategories.find(c => c.id === categoryId)
  if (!categoryObj) return { valid: true }

  const categoryName = categoryObj.name || ''

  // 1. Try to parse "min-max" pattern, e.g., "3-5 Tahun", "7-12", "4 - 6"
  const rangeMatch = categoryName.match(/(\d+)\s*[-–—]\s*(\d+)/)
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10)
    const max = parseInt(rangeMatch[2], 10)
    if (age < min || age > max) {
      return { 
        valid: false, 
        message: `Umur tidak sesuai kategori! Kategori "${categoryName}" hanya untuk usia ${min} sampai ${max} tahun.` 
      }
    }
    return { valid: true }
  }

  // 2. Try to parse "maksimal X" or "X ke bawah" or "<= X"
  const maxMatch = categoryName.match(/(?:maksimal|maks|ke bawah|s\/d|<=|<)\s*(\d+)/i)
  if (maxMatch) {
    const max = parseInt(maxMatch[1], 10)
    if (age > max) {
      return { 
        valid: false, 
        message: `Umur tidak sesuai kategori! Kategori "${categoryName}" maksimal berusia ${max} tahun.` 
      }
    }
    return { valid: true }
  }

  // 3. Try to parse "minimal X" or "X ke atas" or ">= X"
  const minMatch = categoryName.match(/(?:minimal|min|ke atas|>=|>)\s*(\d+)/i)
  if (minMatch) {
    const min = parseInt(minMatch[1], 10)
    if (age < min) {
      return { 
        valid: false, 
        message: `Umur tidak sesuai kategori! Kategori "${categoryName}" minimal berusia ${min} tahun.` 
      }
    }
    return { valid: true }
  }

  // 4. Default fallbacks based on category ID if parsing fails
  let minFallback = null
  let maxFallback = null
  if (categoryId === 'anak_4_6') {
    minFallback = 4; maxFallback = 6;
  } else if (categoryId === 'anak_7_12') {
    minFallback = 7; maxFallback = 12;
  } else if (categoryId === 'remaja_pria' || categoryId === 'remaja_putri') {
    minFallback = 13; maxFallback = 19;
  } else if (categoryId === 'ibu_ibu' || categoryId === 'bapak_bapak') {
    minFallback = 20; maxFallback = 120;
  }

  if (minFallback !== null && maxFallback !== null) {
    if (age < minFallback || age > maxFallback) {
      return {
        valid: false,
        message: `Umur tidak sesuai kategori! Kategori "${categoryName}" hanya untuk usia ${minFallback} sampai ${maxFallback} tahun.`
      }
    }
  }

  return { valid: true }
}

