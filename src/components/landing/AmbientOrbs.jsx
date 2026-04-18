/**
 * AmbientOrbs — Pure CSS drifting blurred orbs for hero/page backgrounds.
 *
 * UI Design notes:
 *   – Three orbs with 3 intentionally different colours to create chroma depth:
 *       Orb 1: Deep teal (matches brand --accent)
 *       Orb 2: Warm orange (matches CTA gradient start)
 *       Orb 3: Muted indigo (adds shadow-side cool contrast)
 *   – Blur radius: 120px–160px so they read as atmospheric haze, not blobs.
 *   – Sizes: 500–700px. Large enough to dominate the background, not compete
 *     with foreground text.
 *   – Opacity kept below 0.35 to preserve dark-mode classiness.
 *
 * Performance notes:
 *   – Uses `transform` only — no top/left animation (forces compositor layer).
 *   – `will-change: transform` on each orb for GPU promotion.
 *   – `pointer-events: none` — zero interaction cost.
 *   – Respects `prefers-reduced-motion` via CSS media query.
 *
 * Usage:
 *   <section style={{ position: 'relative', overflow: 'hidden' }}>
 *     <AmbientOrbs />
 *     <YourContent />
 *   </section>
 */
export default function AmbientOrbs({ variant = 'hero' }) {
  return (
    <div className={`orbs-root orbs-${variant}`} aria-hidden="true">
      <div className="orb orb-teal"   />
      <div className="orb orb-orange" />
      <div className="orb orb-indigo" />
    </div>
  );
}
