import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'

/**
 * AnimatedToast
 *
 * Keeps a local copy of the toast so it can animate out after the parent sets toast to null.
 *
 * @param {object|null} toast - { text, type, isUndo }
 * @param {function} onClick  - handler for when the toast is clicked
 */
export function AnimatedToast({ toast, onClick }) {
  const [activeToast, setActiveToast] = useState(toast)
  const elRef = useRef(null)

  // Sync state and run animations
  useEffect(() => {
    const el = elRef.current
    if (!el) {
      if (toast) setActiveToast(toast)
      return
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (toast) {
      // Entering or updating
      const isNew = !activeToast || toast.text !== activeToast.text
      setActiveToast(toast)

      if (isNew && !prefersReduced) {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.96, y: -16 },
          { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)', clearProps: 'transform' }
        )
      }
    } else if (activeToast && !toast) {
      // Exiting
      if (prefersReduced) {
        setActiveToast(null)
        return
      }

      gsap.to(el, {
        opacity: 0,
        scale: 0.96,
        y: -12,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => setActiveToast(null),
      })
    }
  }, [toast, activeToast])

  if (!activeToast) return null

  const toastClass = activeToast.type === 'undo'
    ? 'toast toast-undo'
    : activeToast.type === 'error'
    ? 'toast toast-error'
    : 'toast toast-success'

  return (
    <div
      ref={elRef}
      className={toastClass}
      onClick={activeToast.isUndo ? onClick : undefined}
    >
      {activeToast.text}
    </div>
  )
}
