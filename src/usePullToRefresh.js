import { useEffect, useRef, useState } from 'react'

// Touch pull-to-refresh for the page (window) scroll. Fires onRefresh when the
// user drags down past `threshold` while already scrolled to the very top -
// the standard iPad / iOS gesture. onRefresh may return a promise; the spinner
// stays until it resolves (min ~500ms so it never just flashes).
export function usePullToRefresh(onRefresh, { threshold = 70, max = 120 } = {}) {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const distRef = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    const setDist = d => { distRef.current = d; setDistance(d) }
    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0

    function onStart(e) {
      if (busy.current || !atTop()) { startY.current = null; return }
      startY.current = e.touches[0].clientY
    }
    function onMove(e) {
      if (startY.current == null || busy.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && atTop()) {
        setDist(Math.min(dy * 0.5, max)) // rubber-band resistance
        if (e.cancelable) e.preventDefault() // block native overscroll while pulling
      } else if (dy <= 0) {
        startY.current = null
        setDist(0)
      }
    }
    async function onEnd() {
      if (startY.current == null) { setDist(0); return }
      const go = distRef.current >= threshold
      startY.current = null
      if (go && onRefresh) {
        busy.current = true
        setRefreshing(true)
        setDist(threshold)
        const t0 = performance.now()
        try { await onRefresh() } catch { /* keep UI responsive on failure */ }
        const elapsed = performance.now() - t0
        if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed))
        busy.current = false
        setRefreshing(false)
      }
      setDist(0)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [onRefresh, threshold, max])

  return { distance, refreshing }
}
