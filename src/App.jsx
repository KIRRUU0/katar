import { memo, useState, useEffect, useRef } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Icon } from '@iconify/react'
import Navbar from './components/Navbar'
import LiveTicker from './components/LiveTicker'
import HomePage from './pages/HomePage'
import LeaguePage from './pages/LeaguePage'
import AdminPage from './pages/AdminPage'
import NewsDetailPage from './pages/NewsDetailPage'
import NewsListPage from './pages/NewsListPage'
import OrgPage from './pages/OrgPage'
import MediaPage from './pages/MediaPage'
import { recordPageView } from './lib/analytics'
import PopupBanner from './components/PopupBanner'
import { supabase, isSupabaseConfigured } from './lib/supabase'

const BackToTopButton = memo(function BackToTopButton() {
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const frameRef = useRef(null)
  const prevProgressRef = useRef(-1)
  const prevShowRef = useRef(null)

  useEffect(() => {
    const updateScrollState = () => {
      const scrollY = window.scrollY
      const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const shouldShow = scrollY > 300
      const progress = totalScrollHeight > 0 ? Math.min(Math.max(scrollY / totalScrollHeight, 0), 1) : 0

      if (prevShowRef.current !== shouldShow) {
        prevShowRef.current = shouldShow
        setShowScrollBtn(shouldShow)
      }

      if (Math.abs(progress - prevProgressRef.current) > 0.01) {
        prevProgressRef.current = progress
        setScrollProgress(progress)
      }

      frameRef.current = null
    }

    const handleScroll = () => {
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(updateScrollState)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      className={`fixed bottom-16 right-6 z-40 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md hover:shadow-lg border border-abu-200/50 transition-all duration-300 focus-ring cursor-pointer hover:-translate-y-1 ${
        showScrollBtn ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
      }`}
    >
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r="21"
          fill="transparent"
          stroke="#F3F4F6"
          strokeWidth="2.5"
        />
        <circle
          cx="24"
          cy="24"
          r="21"
          fill="transparent"
          stroke="#DC2626"
          strokeWidth="2.5"
          strokeDasharray="132"
          strokeDashoffset={132 - 132 * scrollProgress}
          strokeLinecap="round"
          className="transition-all duration-150 ease-out"
        />
      </svg>
      <Icon icon="solar:arrow-up-linear" className="w-5 h-5 text-merah-600 relative z-10" />
    </button>
  )
})

/**
 * PageTransition — Animates page entrance on route change (fade-in)
 * Uses native CSS transitions for robust performance and React 19 compatibility.
 * Avoids using 'transform' to preserve the 'fixed' viewport context of the hero banner.
 */
function PageTransition({ children }) {
  const location = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const raf = requestAnimationFrame(() => {
      setVisible(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [location.pathname])

  return (
    <div
      className={`transition-opacity duration-350 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  )
}


/**
 * App — Root component with routing and auth context.
 * Layout: Fixed Navbar + scrollable page content below.
 */
export default function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  // Record page view on mount (once per session)
  useEffect(() => {
    recordPageView()
  }, [])

  // Sync custom category settings from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const syncCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('category_settings')
          .select('*')
        if (!error && data && data.length > 0) {
          const list = data.map(item => ({
            id: item.category_id,
            name: item.display_name
          }))
          localStorage.setItem('katar_custom_categories', JSON.stringify(list))
          // Trigger event in case components have already loaded default names
          window.dispatchEvent(new Event('katar_categories_updated'))
        }
      } catch (err) {
        console.warn('Failed to sync categories:', err)
      }
    }
    syncCategories()
  }, [])

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])


  return (
    <AuthProvider>
      <div className="min-h-screen bg-abu-50 pb-10">
        {/* Banner Announcement Popup */}
        <PopupBanner />

        {/* Persistent navigation */}
        <Navbar />

        {/* Page content with top padding for fixed navbar */}
        <main className={isHome ? "" : "pt-20"}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/league" element={<LeaguePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/news" element={<NewsListPage />} />
              <Route path="/news/:slug" element={<NewsDetailPage />} />
              <Route path="/org" element={<OrgPage />} />
              <Route path="/media" element={<MediaPage />} />
            </Routes>
          </PageTransition>
        </main>

        {/* Footer */}
        <footer className={`relative bg-white border-t border-abu-200 text-abu-800 ${isHome ? 'mt-0' : 'mt-12'}`}>
          {/* Top Decorative bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-merah-700 via-emas to-merah-600" />

          <div className="max-w-6xl mx-auto px-4 py-8 pb-20 md:pb-24">
            <div className="flex flex-col items-center justify-center text-center space-y-5">
              
              {/* Brand and Socials */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Brand Logo & Name */}
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/logo.png" 
                    alt="Logo Katar" 
                    className="w-8 h-8 object-contain" 
                  />
                  <div>
                    <h3 className="font-heading font-black text-lg tracking-wide uppercase text-abu-900 leading-none">
                      IREMDA <span className="text-merah-600">RT 02/03</span>
                    </h3>
                    <p className="text-[9px] text-abu-500 uppercase tracking-widest font-bold text-left leading-none mt-1">
                      Karang Taruna
                    </p>
                  </div>
                </div>

                {/* Divider (Hidden on mobile) */}
                <div className="hidden sm:block h-6 w-px bg-abu-200" />

                {/* Social media icons */}
                <div className="flex items-center gap-2">
                  {[
                    { href: "https://www.instagram.com/iremda_02/", icon: "ri:instagram-line", label: "Instagram" },
                    { href: "https://wa.me/6285781300161", icon: "ri:whatsapp-line", label: "WhatsApp" },
                    { href: "https://www.tiktok.com/@iremdaa02", icon: "ri:tiktok-line", label: "TikTok" }
                  ].map((social, idx) => (
                    <a 
                      key={idx}
                      href={social.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      aria-label={social.label} 
                      className="w-8 h-8 rounded-lg bg-abu-50 border border-abu-200 flex items-center justify-center text-abu-500 hover:text-white hover:border-merah-650 hover:bg-merah-600 transition-all duration-200 focus-ring"
                    >
                      <Icon icon={social.icon} className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs font-semibold">
                {[
                  { to: "/", label: "Beranda" },
                  { to: "/league", label: "League & Klasemen" },
                  { to: "/org", label: "Pengurus" },
                  { to: "/media", label: "Galeri" },
                  { to: "/news", label: "Berita" },
                ].map((link, idx) => (
                  <Link 
                    key={idx}
                    to={link.to} 
                    className="text-abu-500 hover:text-merah-600 transition-colors duration-200 focus-ring py-0.5"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Divider line */}
              <div className="w-full max-w-md border-t border-abu-200" />

              {/* Bottom Copyright */}
              <div className="flex items-center justify-center w-full text-xs text-abu-500 pt-1 text-center">
                <p>
                  &copy; {new Date().getFullYear()} Karang Taruna RT 02/03. Hak Cipta Dilindungi.
                </p>
              </div>

            </div>
          </div>
        </footer>

        <BackToTopButton />

        {/* Global sticky bottom ticker */}
        <LiveTicker />
      </div>
    </AuthProvider>
  )
}
