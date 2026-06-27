/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'

/**
 * Navbar — Fixed top navigation for Katar RT 03
 *
 * Features:
 * - Logo "Katar RT 03" on the left
 * - Desktop: inline horizontal nav links
 * - Mobile: hamburger button → dropdown menu (slide-down via Anime.js)
 * - Hamburger icon animates into an X when open
 * - Active route receives a red underline indicator
 */

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Berita', to: '/news' },
  { label: 'Organisasi', to: '/org' },
  { label: 'Media', to: '/media' },
  { label: '17an', to: '/league' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(prev => prev ? false : prev)
  }, [location.pathname])

  /** Check if a link is active */
  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-6xl z-50 backdrop-blur-md bg-white/85 border border-white/20 shadow-md rounded-2xl transition-all duration-300">
      <div className="px-4 sm:px-6 relative">
        <div className="flex h-14 items-center justify-between">

          {/* ── Logo (Sisi Kiri) ───────────────────────────── */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.webp" alt="Logo Iremda" className="w-8 h-8 object-contain flex-shrink-0" />
            <span className="text-lg md:text-xl font-bold font-heading text-merah-700 tracking-tight">
              02/03
            </span>
          </Link>

          {/* ── Desktop Navigation (Sisi Tengah) ────────────── */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex md:items-center md:gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`
                  relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus-ring
                  min-h-[40px] flex items-center
                  ${isActive(link.to)
                    ? 'text-merah-700 bg-merah-50/50'
                    : 'text-abu-600 hover:text-merah-600 hover:bg-merah-50/30'
                  }
                `}
              >
                {link.label}
                {/* Active underline indicator */}
                {isActive(link.to) && (
                  <span className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-merah-600" />
                )}
              </Link>
            ))}
          </div>

          {/* ── Admin Login Profile Icon (Sisi Kanan - Desktop) ── */}
          <div className="hidden md:flex md:items-center">
            <Link
              to="/admin"
              className={`
                w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 focus-ring
                ${isActive('/admin')
                  ? 'border-merah-600 bg-merah-50 text-merah-700 shadow-sm'
                  : 'border-abu-200 text-abu-600 hover:border-merah-400 hover:bg-merah-50 hover:text-merah-700'
                }
              `}
              title="Login Admin"
            >
              <Icon icon="ph:user-bold" className="w-5 h-5" />
            </Link>
          </div>

          {/* ── Mobile Controls (Right Side on Mobile) ────────── */}
          <div className="flex md:hidden items-center gap-2">
            {/* Quick Profile/Admin login on Mobile */}
            <Link
              to="/admin"
              className={`
                w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 focus-ring
                ${isActive('/admin')
                  ? 'border-merah-600 bg-merah-50 text-merah-700'
                  : 'border-abu-200 text-abu-600 hover:bg-abu-50'
                }
              `}
              aria-label="Login Admin"
            >
              <Icon icon="ph:user-bold" className="w-5 h-5" />
            </Link>

            {/* Hamburger button */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg
                         text-abu-700 hover:bg-abu-100 transition-colors focus-ring"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <div className="relative flex flex-col items-center justify-center w-6 h-6">
                <span
                  className={`absolute block h-0.5 w-5 rounded-full bg-current origin-center transition-all duration-300 top-[5px] ${
                    menuOpen ? 'rotate-45 translate-y-[6px]' : ''
                  }`}
                />
                <span
                  className={`absolute block h-0.5 w-5 rounded-full bg-current origin-center transition-all duration-300 top-[11px] ${
                    menuOpen ? 'opacity-0 scale-0' : ''
                  }`}
                />
                <span
                  className={`absolute block h-0.5 w-5 rounded-full bg-current origin-center transition-all duration-300 top-[17px] ${
                    menuOpen ? '-rotate-45 -translate-y-[6px]' : ''
                  }`}
                />
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* ── Mobile dropdown menu ────────────────────────── */}
      <div
        className={`absolute top-[62px] left-0 right-0 flex flex-col gap-1 px-4 py-3 md:hidden bg-white/95 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl transition-all duration-300 origin-top ${
          menuOpen ? 'opacity-100 scale-y-100 translate-y-0 visible' : 'opacity-0 scale-y-95 -translate-y-2 invisible pointer-events-none'
        }`}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`
              block px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px]
              flex items-center transition-all duration-200 focus-ring
              ${isActive(link.to)
                ? 'text-merah-700 bg-merah-50/50 border-l-4 border-merah-600'
                : 'text-abu-700 hover:bg-abu-50 hover:text-merah-600'
              }
            `}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
