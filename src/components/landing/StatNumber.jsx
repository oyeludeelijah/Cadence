/**
 * StatNumber — Scroll-triggered animated counter.
 *
 * Design decisions (UI Designer):
 *   - The numeric portion animates independently from prefix/suffix
 *     so the unit ("%" / "s") is always readable, never garbled mid-animation.
 *   - Ease-out curve: fast start → slow finish gives the "settling into truth"
 *     feeling that premium dashboards use.
 *   - The integer display is wrapped in a visually distinct class so you can
 *     style the number larger/bolder than the surrounding unit text in CSS.
 *
 * Performance decisions (Frontend Developer):
 *   - Uses requestAnimationFrame — no setInterval, no React state thrashing.
 *   - A single RAF callback runs per frame; it calculates elapsed time and
 *     updates the DOM node directly (via ref) without triggering re-renders.
 *   - IntersectionObserver with { once: true } so the engine only ever fires
 *     once per page load — no cleanup complexity, minimal memory footprint.
 *   - prefers-reduced-motion: immediately jumps to the final value, no scroll
 *     dependent behaviour removed — the number is still correct, just instant.
 *
 * Props:
 *   end       {number}  — Target integer to count up to (required)
 *   prefix    {string}  — String prepended before the number (e.g. "<")
 *   suffix    {string}  — String appended after the number (e.g. "%" / "s")
 *   duration  {number}  — Animation duration in ms (default: 2000)
 *   decimals  {number}  — Decimal places to show (default: 0)
 */
import { useRef, useEffect } from 'react';

// Ease-out cubic: fast start, decelerates to the target
// t ∈ [0, 1] → returns eased progress ∈ [0, 1]
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Detect motion preference once at module load (no re-detection needed)
const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function StatNumber({
  end,
  prefix = '',
  suffix = '',
  duration = 2000,
  decimals = 0,
}) {
  const numRef  = useRef(null); // ref to the <span> that shows the digit
  const rafRef  = useRef(null); // requestAnimationFrame ID for cleanup

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;

    // Format helper — keeps consistent decimal places
    const fmt = (v) => v.toFixed(decimals);

    // If user prefers reduced motion → show final value immediately
    if (REDUCED_MOTION) {
      el.textContent = fmt(end);
      return;
    }

    // ── Intersection Observer ─────────────────────────────────────────────
    // Sits completely idle until the element enters the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;

        // Disconnect immediately — we only ever want to animate once.
        observer.disconnect();

        // ── RAF Animation Engine ────────────────────────────────────────
        let startTime = null;

        function tick(timestamp) {
          if (!startTime) startTime = timestamp;

          const elapsed  = timestamp - startTime;
          const rawProgress = Math.min(elapsed / duration, 1); // clamp 0→1
          const easedProgress = easeOutCubic(rawProgress);
          const current = easedProgress * end;

          el.textContent = fmt(current);

          if (rawProgress < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            // Guarantee the final value is pixel-perfect
            el.textContent = fmt(end);
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      },
      { threshold: 0.3 } // 30% of the element must be visible to trigger
    );

    observer.observe(el);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, decimals]);

  return (
    <span
      className="lp-stat-num-display"
      aria-label={`${prefix}${end}${suffix}`}
    >
      {/* prefix is static — e.g. "<" in "<5s" */}
      {prefix && <span className="lp-stat-unit">{prefix}</span>}

      {/* This is the only node the RAF engine touches */}
      <span ref={numRef} className="lp-stat-digit">
        0
      </span>

      {/* suffix is static — e.g. "%" or "s" */}
      {suffix && <span className="lp-stat-unit">{suffix}</span>}
    </span>
  );
}
