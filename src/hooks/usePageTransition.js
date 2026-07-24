import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

/**
 * usePageTransition — drives the GSAP enter animation for a page wrapper.
 *
 * Ownership rule:
 *   GSAP owns the page-level wrapper element (the ref returned here).
 *   useReveal (IntersectionObserver) owns checkpoint cards — never attach
 *   this hook to elements that useReveal also watches.
 *
 * Reduced-motion:
 *   If the user has `prefers-reduced-motion: reduce` set, the animation is
 *   skipped entirely (opacity snaps to 1, no translate).
 *
 * @returns {React.RefObject} — attach to the outermost div of your page.
 */
export function usePageTransition() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect user accessibility preference
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReduced) {
      // Skip animation — just make sure the element is visible
      gsap.set(el, { opacity: 1 })
      gsap.set(el, { clearProps: 'all' })
      return
    }

    // Use gsap.context() so all tweens are scoped and cleaned up on unmount
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.32,
          ease: 'power2.out',
          clearProps: 'all', // hand CSS back control after animation
        },
      )
    }, el)

    return () => ctx.revert()
  }, [])

  return ref
}
