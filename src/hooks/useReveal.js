import { useRef, useEffect } from 'react'

/**
 * Adds 'visible' class to the returned ref element once it enters the viewport.
 *
 * Design note (7.3): obs.disconnect() is called immediately after the first
 * intersection — this is intentional. The animation is one-shot; once the element
 * has entered the viewport, the observer's job is done. The 'visible' class is
 * added by the browser's own class mutation and is never removed by React state,
 * so there is no mechanism that would require re-observation. The cleanup
 * return also calls disconnect() in case the component unmounts before the
 * element enters the viewport.
 *
 * Used by TaskCard, UrgencyGroup, CheckpointCard.
 *
 * @param {number} [threshold=0.12] - IntersectionObserver threshold
 */
export function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}
