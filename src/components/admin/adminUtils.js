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
