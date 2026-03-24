import { useRef, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'

/**
 * useModalAnimation — GSAP-driven enter + exit for modal panels.
 *
 * Ownership rule:
 *   This hook owns the panel element (the ref returned here).
 *   The backdrop (.modal-overlay) is still animated by CSS keyframes — we only
 *   touch the glass panel card, not the backdrop, so CSS and GSAP never compete.
 *
 * Usage:
 *   const { panelRef, close } = useModalAnimation(onClose)
 *
 *   - Attach `panelRef` to your glass panel div.
 *   - Call `close()` instead of calling `onClose` directly — it plays the exit
 *     animation first, then calls `onClose` once it finishes.
 *
 * @param {function} onClose  — the parent's setter (e.g. () => setShowDelete(false))
 * @param {number}   [duration=0.25]
 */
export function useModalAnimation(onClose, duration = 0.25) {
  const panelRef = useRef(null)

  // Enter animation on mount
  useEffect(() => {
    const el = panelRef.current
    if (!el) return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReduced) {
      gsap.set(el, { opacity: 1, scale: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.94, y: 20 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration,
          ease: 'back.out(1.4)',
          clearProps: 'opacity,transform',
        },
      )
    }, el)

    return () => ctx.revert()
  }, [duration])

  // Exit: play animation, THEN call onClose
  const close = useCallback(() => {
    const el = panelRef.current

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!el || prefersReduced) {
      onClose()
      return
    }

    gsap.to(el, {
      opacity: 0,
      scale: 0.96,
      y: 12,
      duration: duration * 0.7,   // exit is snappier than enter
      ease: 'power2.in',
      onComplete: onClose,
    })
  }, [onClose, duration])

  return { panelRef, close }
}
