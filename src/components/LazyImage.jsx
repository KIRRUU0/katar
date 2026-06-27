import { useRef, useEffect, useState } from 'react'

export default function LazyImage({ src, alt = '', className = '', style = {}, sizes, srcSet, fetchPriority = 'auto', loading = 'lazy', decoding = 'async', forceVisible = false }) {
  const imgRef = useRef(null)
  const [visible, setVisible] = useState(!!forceVisible)

  useEffect(() => {
    if (forceVisible) return // already visible

    const el = imgRef.current
    if (!el) return

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            obs.disconnect()
          }
        })
      }, { rootMargin: '200px' })
      obs.observe(el)
      return () => obs.disconnect()
    }

    // Fallback: mark visible immediately
    setVisible(true)
  }, [src, forceVisible])

  return (
    <img
      ref={imgRef}
      src={visible ? src : undefined}
      srcSet={visible ? srcSet : undefined}
      sizes={visible ? sizes : undefined}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
    />
  )
}
