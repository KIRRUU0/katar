import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function PopupBanner() {
  const [banner, setBanner] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [animate, setAnimate] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if the popup banner has already been shown in this browser session
    const hasBeenShown = sessionStorage.getItem('katar_popup_banner_shown')
    if (hasBeenShown === 'true') return

    const getActiveBanner = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('popup_banners')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)

          if (!error) {
            if (data && data.length > 0) {
              setBanner(data[0])
              setIsOpen(true)
            }
            return
          }
        }

        // Local storage fallback (when Supabase is down or in demo mode)
        let localData = localStorage.getItem('katar_popup_banners')
        if (!localData) {
          const mockBanners = [
            {
              id: 'mock-banner-1',
              image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
              ratio: 'horizontal',
              link_url: '/league',
              is_active: true,
              created_at: new Date().toISOString()
            }
          ]
          localStorage.setItem('katar_popup_banners', JSON.stringify(mockBanners))
          localData = JSON.stringify(mockBanners)
        }

        const parsed = JSON.parse(localData)
        const activeLocal = parsed.find(b => b.is_active === true)
        if (activeLocal) {
          setBanner(activeLocal)
          setIsOpen(true)
        }
      } catch (err) {
        console.warn('Failed to fetch active popup banner:', err)
      }
    }

    getActiveBanner()
  }, [])

  // Auto-close after 8 seconds once opened
  useEffect(() => {
    if (!isOpen || !banner) return

    // Trigger scale-in animation slightly after mounting
    const animationTimeout = setTimeout(() => setAnimate(true), 50)

    const closeTimeout = setTimeout(() => {
      handleClose()
    }, 8000)

    return () => {
      clearTimeout(animationTimeout)
      clearTimeout(closeTimeout)
    }
  }, [isOpen, banner])

  const handleClose = () => {
    setAnimate(false)
    // Wait for fade-out transition before unmounting
    setTimeout(() => {
      setIsOpen(false)
      sessionStorage.setItem('katar_popup_banner_shown', 'true')
    }, 300)
  }

  const handleBannerClick = () => {
    if (!banner || !banner.link_url) return

    const link = banner.link_url.trim()
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer')
    } else {
      navigate(link)
    }
    handleClose()
  }

  if (!isOpen || !banner) return null

  // Layout sizing based on aspect ratio
  const ratioClasses = banner.ratio === 'horizontal'
    ? 'max-w-3xl w-[92%] aspect-[16/9] max-h-[80vh]'
    : 'max-w-[420px] w-[88%] aspect-[3/4] max-h-[85vh]'

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
      animate ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0 cursor-default" onClick={handleClose} />

      {/* Banner Card Container */}
      <div 
        className={`relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-abu-900 transition-all duration-300 ease-out transform ${
          animate ? 'scale-100' : 'scale-95'
        } ${ratioClasses}`}
      >
        
        {/* Close Button (X) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
          className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-black/55 text-white/90 hover:text-white hover:bg-black/75 flex items-center justify-center transition-all duration-200 shadow-md backdrop-blur-sm cursor-pointer border border-white/10"
          aria-label="Tutup Banner"
        >
          <Icon icon="solar:close-circle-bold" className="w-6.5 h-6.5" />
        </button>

        {/* Banner Content (Clickable if link_url is provided) */}
        <div 
          onClick={handleBannerClick}
          className={`w-full h-full select-none ${banner.link_url ? 'cursor-pointer hover:brightness-95 transition-all duration-200' : 'cursor-default'}`}
        >
          <img
            src={banner.image_url}
            alt="Pengumuman"
            className="w-full h-full object-cover"
            draggable="false"
          />

          {/* Optional clickable indicator hint */}
          {banner.link_url && (
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-[10px] md:text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow border border-white/5 select-none pointer-events-none animate-pulse">
              <Icon icon="solar:arrow-right-up-linear" className="w-3.5 h-3.5" />
              <span>Lihat Detail</span>
            </div>
          )}
        </div>

        {/* 8-second Visual Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-white/20">
          <div className="h-full bg-gradient-to-r from-merah-600 to-emas animate-popup-progress" />
        </div>

      </div>
    </div>
  )
}
