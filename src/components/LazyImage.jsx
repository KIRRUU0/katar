import { useRef, useEffect, useState } from 'react'

export default function LazyImage({ src, alt = '', className = '', style = {}, sizes, srcSet, fetchPriority = 'auto', loading = 'lazy', decoding = 'async', forceVisible = false }) {
  const imgRef = useRef(null)
  const [visible, setVisible] = useState(() => {
    return !!forceVisible || (typeof window !== 'undefined' && !('IntersectionObserver' in window))
  })

  useEffect(() => {
    if (visible) return // already visible or fallback active

    const el = imgRef.current
    if (!el) return

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
  }, [src, forceVisible, visible])

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
