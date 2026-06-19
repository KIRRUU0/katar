import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'

const loadCorsSafeImage = (src, onLoad, onError) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => onLoad(img)
  img.onerror = (err) => {
    console.warn('Failed to load image with CORS anonymous, trying with image proxy fallback...', err)
    
    // Fallback 1: Try images.weserv.nl proxy (highly reliable for Google Drive & images)
    if (src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && !src.includes('weserv.nl')) {
      const weservImg = new Image()
      weservImg.crossOrigin = 'anonymous'
      weservImg.onload = () => onLoad(weservImg)
      weservImg.onerror = (err2) => {
        console.warn('Failed to load image via weserv.nl proxy, trying corsproxy.io fallback...', err2)
        
        // Fallback 2: Try corsproxy.io
        const corsProxyImg = new Image()
        corsProxyImg.crossOrigin = 'anonymous'
        corsProxyImg.onload = () => onLoad(corsProxyImg)
        corsProxyImg.onerror = (err3) => {
          console.warn('Failed to load image via corsproxy.io, trying allorigins fallback...', err3)
          
          // Fallback 3: Try allorigins
          const allOriginsImg = new Image()
          allOriginsImg.crossOrigin = 'anonymous'
          allOriginsImg.onload = () => onLoad(allOriginsImg)
          allOriginsImg.onerror = onError
          allOriginsImg.src = `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`
        }
        corsProxyImg.src = `https://corsproxy.io/?${encodeURIComponent(src)}`
      }
      weservImg.src = `https://images.weserv.nl/?url=${encodeURIComponent(src)}`
    } else {
      onError()
    }
  }
  
  img.src = src
}

export default function ImageEditorModal({ imageUrl, onSave, onClose }) {
  const [rotation, setRotation] = useState(0)
  const [cropLeft, setCropLeft] = useState(0)
  const [cropRight, setCropRight] = useState(0)
  const [cropTop, setCropTop] = useState(0)
  const [cropBottom, setCropBottom] = useState(0)
  
  const [imgSrc, setImgSrc] = useState(imageUrl)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const imageRef = useRef(null)

  // Reset values ketika URL gambar berubah
  useEffect(() => {
    setImgSrc(imageUrl)
    setRotation(0)
    setCropLeft(0)
    setCropRight(0)
    setCropTop(0)
    setCropBottom(0)
    setErrorMsg('')
  }, [imageUrl])

  // Menangani rotasi gambar menggunakan HTML5 Canvas
  const handleRotate = () => {
    setLoading(true)
    setErrorMsg('')
    
    loadCorsSafeImage(
      imgSrc,
      (img) => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Rotasikan 90 derajat searah jarum jam
          canvas.width = img.naturalHeight
          canvas.height = img.naturalWidth
          
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((90 * Math.PI) / 180)
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
          
          const rotatedUrl = canvas.toDataURL('image/jpeg', 0.9)
          setImgSrc(rotatedUrl)
          
          // Reset persentase pemotongan karena dimensi gambar berubah
          setCropLeft(0)
          setCropRight(0)
          setCropTop(0)
          setCropBottom(0)
        } catch (err) {
          console.error('Rotasi gagal:', err)
          setErrorMsg('Gagal memutar gambar. Server penyimpanan membatasi akses edit langsung (CORS).')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setErrorMsg('Gagal memuat gambar untuk proses rotasi (CORS/Koneksi).')
        setLoading(false)
      }
    )
  }

  // Menangani proses crop gambar & simpan ke format base64
  const handleSave = () => {
    setLoading(true)
    setErrorMsg('')
    
    loadCorsSafeImage(
      imgSrc,
      (img) => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          const leftPx = (cropLeft / 100) * img.naturalWidth
          const topPx = (cropTop / 100) * img.naturalHeight
          const rightPx = (cropRight / 100) * img.naturalWidth
          const bottomPx = (cropBottom / 100) * img.naturalHeight
          
          const cropWidth = img.naturalWidth - leftPx - rightPx
          const cropHeight = img.naturalHeight - topPx - bottomPx
          
          if (cropWidth <= 10 || cropHeight <= 10) {
            setErrorMsg('Ukuran potongan terlalu kecil!')
            setLoading(false)
            return
          }
          
          canvas.width = cropWidth
          canvas.height = cropHeight
          
          ctx.drawImage(
            img,
            leftPx, topPx, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          )
          
          const resultUrl = canvas.toDataURL('image/jpeg', 0.9)
          onSave(resultUrl)
        } catch (err) {
          console.error('Pemotongan gambar gagal:', err)
          setErrorMsg('Gagal memotong gambar. Server penyimpanan membatasi akses edit langsung (CORS).')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setErrorMsg('Gagal memuat gambar untuk proses penyimpanan (CORS/Koneksi).')
        setLoading(false)
      }
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-abu-200 flex items-center justify-between bg-abu-50">
          <h3 className="font-heading text-lg font-bold text-abu-900 flex items-center gap-2">
            <Icon icon="solar:crop-rotate-bold-duotone" className="w-6 h-6 text-merah-600 animate-pulse" />
            Edit Gambar (Crop & Rotasi)
          </h3>
          <button 
            onClick={onClose}
            className="text-abu-400 hover:text-abu-600 transition-colors p-1.5 rounded-full hover:bg-abu-200/50 cursor-pointer focus-ring"
            title="Tutup"
          >
            <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl font-medium animate-fade-in">
              {errorMsg}
            </div>
          )}
          
          {/* Preview Container */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-abu-200 bg-abu-100 flex items-center justify-center">
            {loading && (
              <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-merah-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
            
            <div className="relative max-h-full max-w-full flex items-center justify-center p-2">
              <img 
                ref={imageRef}
                src={imgSrc} 
                alt="Editing Preview" 
                className="max-h-[35vh] object-contain rounded shadow-sm select-none"
                referrerPolicy="no-referrer"
              />
              {/* Crop Boundary Overlay */}
              <div 
                className="absolute border-2 border-dashed border-red-500 bg-red-500/15 pointer-events-none z-10"
                style={{
                  left: `${cropLeft}%`,
                  right: `${cropRight}%`,
                  top: `${cropTop}%`,
                  bottom: `${cropBottom}%`,
                  transition: 'all 0.1s ease-out'
                }}
              >
                {/* Crop Box Handles decorations */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-600 border border-white rounded-sm shadow-sm"></div>
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-600 border border-white rounded-sm shadow-sm"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-red-600 border border-white rounded-sm shadow-sm"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-red-600 border border-white rounded-sm shadow-sm"></div>
              </div>
            </div>
          </div>
          
          {/* Edit Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-abu-100 pb-2">
              <span className="text-xs font-bold text-abu-500 uppercase tracking-wider">Potong Margin Gambar (Crop)</span>
              <button 
                type="button"
                onClick={() => {
                  setCropLeft(0)
                  setCropRight(0)
                  setCropTop(0)
                  setCropBottom(0)
                }}
                className="text-[11px] font-bold text-merah-600 hover:text-merah-700 cursor-pointer"
              >
                Reset Potongan
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-abu-700 flex justify-between">
                  <span>Kiri (Left)</span>
                  <span>{cropLeft}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="45" 
                  value={cropLeft}
                  onChange={(e) => setCropLeft(Number(e.target.value))}
                  className="w-full h-1.5 bg-abu-200 rounded-lg appearance-none cursor-pointer accent-merah-600"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-abu-700 flex justify-between">
                  <span>Kanan (Right)</span>
                  <span>{cropRight}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="45" 
                  value={cropRight}
                  onChange={(e) => setCropRight(Number(e.target.value))}
                  className="w-full h-1.5 bg-abu-200 rounded-lg appearance-none cursor-pointer accent-merah-600"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-abu-700 flex justify-between">
                  <span>Atas (Top)</span>
                  <span>{cropTop}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="45" 
                  value={cropTop}
                  onChange={(e) => setCropTop(Number(e.target.value))}
                  className="w-full h-1.5 bg-abu-200 rounded-lg appearance-none cursor-pointer accent-merah-600"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-abu-700 flex justify-between">
                  <span>Bawah (Bottom)</span>
                  <span>{cropBottom}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="45" 
                  value={cropBottom}
                  onChange={(e) => setCropBottom(Number(e.target.value))}
                  className="w-full h-1.5 bg-abu-200 rounded-lg appearance-none cursor-pointer accent-merah-600"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-abu-100 flex items-center justify-between">
              <span className="text-xs font-bold text-abu-500 uppercase tracking-wider">Rotasi Gambar</span>
              <button
                type="button"
                onClick={handleRotate}
                disabled={loading}
                className="btn btn-secondary py-1.5 px-4 min-h-[38px] flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Icon icon="solar:round-alt-arrow-right-bold-duotone" className="w-4.5 h-4.5 text-merah-600" />
                <span>Putar 90°</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-abu-200 bg-abu-50 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="btn btn-secondary min-h-[44px] cursor-pointer"
          >
            Batal
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary min-h-[44px] cursor-pointer flex items-center gap-2"
          >
            <Icon icon="solar:diskette-bold-duotone" className="w-4.5 h-4.5" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  )
}
