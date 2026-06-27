import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'

// ── Child Components ────────────────────────────────────────
import NewsCarousel from '../components/NewsCarousel'
import MediaPreview from '../components/MediaPreview'

// ── Media Assets ────────────────────────────────────────────
const welcomeVideo = '/video/Welcome.mp4'

/**
 * HomePage — Main landing page for warga (residents).
 *
 * Sections:
 *  1. Hero Banner       — GIF background with animated title
 *  2. Kutipan Soekarno  — Inspirational quote
 *  3. Visi & Misi       — Accordion dropdowns side by side
 *  4. Berita & Media    — News carousel and media preview
 */
export default function HomePage() {
  const root = useRef(null)
  const scope = useRef(null)
  const quoteRef = useRef(null)
  const quoteAnimated = useRef(false)
  const heroTitleRef = useRef(null)
  const heroWelcomeRef = useRef(null)
  const heroButtonsRef = useRef(null)

  // Accordion: only one can be open at a time
  const [activeAccordion, setActiveAccordion] = useState(null)
  const toggleAccordion = (key) => setActiveAccordion(prev => prev === key ? null : key)

  // ── Hero entrance animations ────────────────────────────────
  useEffect(() => {
    document.title = 'Karang Taruna RT 02/03 - Beranda'
    let mounted = true
    let localScope = null
    import('animejs').then((mod) => {
      if (!mounted) return
      const { createScope, animate } = mod
      localScope = createScope({ root: root.current }).add(() => {
        animate([heroTitleRef.current, heroWelcomeRef.current, heroButtonsRef.current], {
          translateY: [20, 0],
          duration: 900,
          delay: (el, i) => i * 175,
          easing: 'easeOutExpo',
        })
      })
      scope.current = localScope
    }).catch(() => {})

    return () => {
      mounted = false
      try { localScope?.revert() } catch { /* ignore */ }
    }
  }, [])

  // Fallback: ensure hero elements become visible after animation time
  useEffect(() => {
    const timer = setTimeout(() => {
      [heroTitleRef.current, heroWelcomeRef.current, heroButtonsRef.current].forEach((el) => {
        if (!el) return
        el.style.transform = 'none'
        el.style.filter = 'none'
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // ── Scroll-driven sink/emerge effect for hero text ───────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const refs = [heroTitleRef, heroWelcomeRef, heroButtonsRef]
    let frame = null
    let prev = -1

    const max = () => Math.max(window.innerHeight * 0.6, 200)

    const update = () => {
      const y = window.scrollY || 0
      const p = Math.min(Math.max(y / max(), 0), 1)
      if (Math.abs(p - prev) < 0.01) return
      prev = p

      refs.forEach((r, i) => {
        const el = r.current
        if (!el) return
        // slight stagger so deeper elements sink a bit later
        const stagger = i * 0.06
        const localP = Math.min(1, Math.max(0, (p - stagger) / (1 - stagger)))

        const translateY = localP * 36 // pixels to move down (sink)
        const scale = 1 - localP * 0.06 // subtle shrink
        const opacity = Math.max(0, 1 - localP * 0.95)
        const blur = localP * 6 // px

        el.style.transform = `translateY(${translateY}px) scale(${scale})`
        el.style.opacity = String(opacity)
        el.style.filter = `blur(${blur}px)`
        el.style.willChange = 'transform, opacity, filter'
      })
    }

    const onScroll = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        update()
        frame = null
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // set initial state based on current scroll
    onScroll()

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      // restore styles
      refs.forEach((r) => {
        const el = r.current
        if (!el) return
        el.style.transform = ''
        el.style.opacity = ''
        el.style.filter = ''
        el.style.willChange = ''
      })
    }
  }, [])

  // ── Quote fade-in animation on scroll into view ────────────
  useEffect(() => {
    const quoteEl = quoteRef.current
    if (!quoteEl) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !quoteAnimated.current) {
          quoteAnimated.current = true
          import('animejs').then(({ animate }) => {
            animate(quoteEl, {
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 800,
              ease: 'outExpo',
            })

            const attr = quoteEl.parentElement?.querySelector('.quote-attribution')
            if (attr) {
              animate(attr, {
                opacity: [0, 1],
                translateY: [10, 0],
                duration: 600,
                delay: 200,
                ease: 'outExpo',
              })
            }
          }).catch(() => {})
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(quoteEl)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={root}>
      {/* ─── 1. HERO BANNER ──────────────────────────────────────── */}
      <section className="fixed top-0 left-0 w-full h-screen overflow-hidden bg-merah-950 z-0">
        {/* Video background */}
        <video
          src={welcomeVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />

        {/* Overlay — gradient for better text readability */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/70"
          style={{ zIndex: 1 }}
        />

        {/* Hero content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center max-w-4xl mx-auto px-4 text-center pt-24 pb-8 md:pt-20 md:pb-0"
          style={{ zIndex: 2 }}
        >
          <h1
            ref={heroTitleRef}
            className="hero-title font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 md:mb-5 uppercase tracking-wide"
            style={{ 
              color: '#FFFFFF', 
              textShadow: '0 4px 20px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.6)' 
            }}
          >
            Selamat Datang<br />
            <span className="text-white">Karang Taruna </span>
            <span className="text-emas drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">RT 02/03</span>
          </h1>

          <p
            ref={heroWelcomeRef}
            className="hero-welcome text-sm md:text-lg lg:text-xl font-normal mb-6 md:mb-8 max-w-3xl leading-relaxed text-white/85"
            style={{ 
              textShadow: '0 2px 10px rgba(0,0,0,0.7)' 
            }}
          >
            Wadah <span className="font-semibold text-white">kolaborasi, komunikasi, dan kompetisi</span> pemuda-pemudi <span className="font-semibold text-emas">RT 02/03</span>.
            <br className="hidden md:inline" />
            {' '}Bersama menyemarakkan <span className="font-semibold text-white">HUT Kemerdekaan Republik Indonesia</span> melalui sportivitas dan kreativitas tanpa batas!
          </p>

          {/* CTA Buttons — Berita & Organisasi */}
          <div ref={heroButtonsRef} className="hero-buttons flex flex-row items-center justify-center gap-3 sm:gap-4 w-full px-2 sm:px-0">
            <Link
              to="/news"
              className="group relative overflow-hidden rounded-xl px-4 py-2.5 sm:px-8 sm:py-3 font-bold text-merah-700 flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-xl hover:scale-105 text-sm sm:text-base flex-1 sm:flex-none max-w-[150px] sm:max-w-none"
              style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="absolute inset-0 bg-merah-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <svg viewBox="0 0 24 24" className="w-5 h-5 relative z-10 group-hover:text-white transition-colors duration-300" fill="currentColor" aria-hidden="true">
                <path d="M6 2h9a1 1 0 0 1 .707.293l5 5A1 1 0 0 1 21 8v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm3 3v3h5V5H9Zm-2 9h10v-2H7v2Zm0 4h10v-2H7v2Z" />
              </svg>
              <span className="relative z-10 group-hover:text-white transition-colors duration-300">Berita</span>
            </Link>
            <Link
              to="/org"
              className="group relative overflow-hidden rounded-xl px-4 py-2.5 sm:px-8 sm:py-3 font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 text-sm sm:text-base flex-1 sm:flex-none max-w-[150px] sm:max-w-none"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '2px solid rgba(255,255,255,0.4)',
              }}
            >
              <span className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <svg viewBox="0 0 24 24" className="w-5 h-5 relative z-10 group-hover:text-merah-700 transition-colors duration-300" fill="currentColor" aria-hidden="true">
                <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm2 2h-1.143a6.005 6.005 0 0 1-11.714 0H6a5 5 0 0 0-5 5v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1a5 5 0 0 0-5-5Z" />
              </svg>
              <span className="relative z-10 group-hover:text-merah-700 transition-colors duration-300">Organisasi</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. SCROLLABLE CONTENT ───────────────────────────────── */}
      <div className="relative mt-[100vh] z-10 bg-white shadow-[0_-20px_40px_rgba(15,23,42,0.08)] rounded-t-[2rem] overflow-hidden border-t border-abu-100">

        {/* ── Kutipan Soekarno ──────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 pt-8 pb-4 md:pt-14 md:pb-8 text-center">
          <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-8">
            {/* Decorative quote mark */}
            <svg viewBox="0 0 24 24" className="w-10 h-10 md:w-12 md:h-12 text-merah-200 mx-auto mb-3 md:mb-4" fill="currentColor" aria-hidden="true">
              <path d="M7 5h4l-3 7h3L8 19H4l3-7H4l3-7Zm10 0h4l-3 7h3l-3 7h-4l3-7h-3l3-7Z" />
            </svg>
            <blockquote
              ref={quoteRef}
              className="font-heading text-lg md:text-2xl lg:text-3xl font-semibold text-abu-900 leading-relaxed italic text-center tracking-tight max-w-5xl mx-auto text-balance"
              style={{ opacity: 0 }}
            >
              “Beri aku 1.000&nbsp;orang&nbsp;tua, niscaya akan kucabut Semeru dari&nbsp;akarnya.
              <br />
              Beri aku 10&nbsp;pemuda, niscaya akan kuguncangkan&nbsp;dunia!”
            </blockquote>
            <p
              className="quote-attribution mt-4 md:mt-6 text-sm md:text-base font-medium text-abu-500 tracking-wide"
              style={{ opacity: 0 }}
            >
              — Ir. Soekarno
            </p>
          </div>
        </section>

        {/* ── Visi & Misi Dropdown ──────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">

            {/* Visi */}
            <div className="card overflow-hidden">
              <button
                onClick={() => toggleAccordion('visi')}
                className="w-full flex items-center justify-between p-6 md:p-7 text-left transition-colors duration-200 hover:bg-abu-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-merah-50 flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:eye-bold-duotone" className="w-6 h-6 text-merah-600" />
                  </div>
                  <h3 className="font-heading text-xl md:text-2xl font-bold text-abu-900">Visi</h3>
                </div>
                <Icon
                  icon="solar:alt-arrow-down-bold"
                  className={`w-5 h-5 text-abu-400 transition-transform duration-300 ${activeAccordion === 'visi' ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-400 ease-in-out"
                style={{
                  maxHeight: activeAccordion === 'visi' ? '500px' : '0',
                  opacity: activeAccordion === 'visi' ? 1 : 0,
                }}
              >
                <div className="px-6 pb-6 md:px-7 md:pb-7 pt-0">
                  <div className="border-t border-abu-100 pt-4">
                    <p className="text-abu-600 text-base md:text-lg leading-relaxed">
                      Menjadi wadah pemberdayaan pemuda-pemudi RT 02/03 yang kreatif, inovatif, dan berdaya saing tinggi dalam membangun lingkungan yang harmonis, sejahtera, dan berbudaya gotong royong.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Misi */}
            <div className="card overflow-hidden">
              <button
                onClick={() => toggleAccordion('misi')}
                className="w-full flex items-center justify-between p-6 md:p-7 text-left transition-colors duration-200 hover:bg-abu-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-merah-50 flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:target-bold-duotone" className="w-6 h-6 text-merah-600" />
                  </div>
                  <h3 className="font-heading text-xl md:text-2xl font-bold text-abu-900">Misi</h3>
                </div>
                <Icon
                  icon="solar:alt-arrow-down-bold"
                  className={`w-5 h-5 text-abu-400 transition-transform duration-300 ${activeAccordion === 'misi' ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-400 ease-in-out"
                style={{
                  maxHeight: activeAccordion === 'misi' ? '500px' : '0',
                  opacity: activeAccordion === 'misi' ? 1 : 0,
                }}
              >
                <div className="px-6 pb-6 md:px-7 md:pb-7 pt-0">
                  <div className="border-t border-abu-100 pt-4">
                    <ul className="space-y-3 text-abu-600 text-sm md:text-base leading-relaxed">
                      <li className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-merah-500 flex-shrink-0 mt-0.5" />
                        Menyelenggarakan kegiatan yang meningkatkan kebersamaan dan solidaritas antar warga.
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-merah-500 flex-shrink-0 mt-0.5" />
                        Mengembangkan potensi pemuda melalui pelatihan, olahraga, dan seni budaya.
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-merah-500 flex-shrink-0 mt-0.5" />
                        Mempererat tali silaturahmi melalui event tahunan HUT Kemerdekaan RI.
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-merah-500 flex-shrink-0 mt-0.5" />
                        Mendorong partisipasi aktif warga dalam pembangunan lingkungan yang bersih dan sehat.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Berita & Media ────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 pb-24">
          <NewsCarousel />
          <MediaPreview />
        </section>
      </div>
    </div>
  )
}
