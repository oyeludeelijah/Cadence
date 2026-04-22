/**
 * CadenceLogo — renders the correct logo variant for each surface.
 *
 * Variants:
 *   "dark"  → cadence-knockout-dark.svg  (white text on dark bg — navbar, footer)
 *   "light" → cadence-fullcolor-white.svg (dark text on white bg — auth, light cards)
 *   "mono"  → cadence-monochrome.svg     (pure black — fallback, print)
 *
 * Props:
 *   variant   {string}  — "dark" | "light" | "mono"  (default: "dark")
 *   width     {number}  — rendered width in px        (default: 140)
 *   className {string}  — extra class names
 *   style     {object}  — extra inline styles
 */
const VARIANTS = {
  dark:  '/logos/cadence-knockout-dark.svg',
  light: '/logos/cadence-fullcolor-white.svg',
  mono:  '/logos/cadence-monochrome.svg',
};

export default function CadenceLogo({
  variant   = 'dark',
  width     = 140,
  className = '',
  style     = {},
}) {
  const src    = VARIANTS[variant] ?? VARIANTS.dark;
  // Keep the native SVG aspect ratio (600×200 → 3:1)
  const height = Math.round(width / 3);

  return (
    <img
      src={src}
      alt="Cadence"
      width={width}
      height={height}
      className={className}
      style={{ display: 'block', ...style }}
      draggable={false}
    />
  );
}
