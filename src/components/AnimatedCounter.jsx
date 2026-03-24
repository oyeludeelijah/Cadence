import { useState, useEffect } from 'react'
import { gsap } from 'gsap'

/**
 * AnimatedCounter
 * 
 * GSAP-driven number counter. Starts from 0 and scrubs to `value` over 1.5s.
 * Safe for React unmounting via gsap.context.
 * Respects prefers-reduced-motion.
 *
 * @param {number|null} value - The target number to count up to.
 * @param {string} suffix - Optional string to append to the end (e.g., "%", "h early").
 * @param {number} decimals - Number of decimal places to round to during animation.
 */
export function AnimatedCounter({ value, suffix = '', decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    // Basic guard
    if (value === null || isNaN(value)) return

    // Accessibility
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplayValue(Number(Number(value).toFixed(decimals)))
      return
    }

    // GSAP tweening a standalone JS object
    const counterObj = { val: 0 }
    
    const ctx = gsap.context(() => {
      gsap.to(counterObj, {
        val: value,
        duration: 1.5,
        ease: 'power3.out', // Snaps fast at the beginning, scrubs nicely at the end
        onUpdate: () => {
          setDisplayValue(Number(counterObj.val.toFixed(decimals)))
        }
      })
    })

    return () => ctx.revert()
  }, [value, decimals])

  if (value === null || isNaN(value)) return <span>—</span>

  // Add a small space before multi-character suffixes so "1.5h early" is spaced correctly, 
  // but "85%" is tight.
  const isWordSuffix = suffix.startsWith('h ') || suffix.startsWith(' ')
  const formattedSuffix = isWordSuffix ? ` ${suffix.trim()}` : suffix

  return (
    <span>
      {displayValue.toFixed(decimals)}
      {formattedSuffix}
    </span>
  )
}
