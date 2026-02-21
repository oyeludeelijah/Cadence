import { useRef, useEffect } from 'react'

/**
 * Adds 'visible' class to the returned ref element once it enters the viewport.
 * Disconnects the observer immediately after — one-shot animation trigger.
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
