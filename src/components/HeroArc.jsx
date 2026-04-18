import { useEffect, useRef } from 'react';

/**
 * HeroArc — pure canvas glowing semicircular dome effect.
 * No image files, no npm packages. Resizes with the container.
 *
 * Props:
 *   color      — RGB string, e.g. "74, 222, 128"  (default: green)
 *   arcWidthPct— arc diameter as % of canvas width (default: 0.72)
 *   glowLayers — number of glow halos stacked     (default: 6)
 *   opacity    — overall opacity                   (default: 1)
 */
export default function HeroArc({
  color = '74, 222, 128',
  arcWidthPct = 0.72,
  glowLayers = 6,
  opacity = 1,
}) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function draw() {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;

      // Match actual pixel ratio for sharp rendering on HiDPI
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, W, H);

      const cx     = W / 2;           // horizontal center
      const cy     = H;               // circle center sits at the very bottom edge
      const radius = (W * arcWidthPct) / 2;

      // ── 1. Layered atmospheric glow (filled radial gradients) ───────────────
      const glowConfigs = [
        { r: radius * 1.8, alpha: 0.06 },
        { r: radius * 1.4, alpha: 0.09 },
        { r: radius * 1.1, alpha: 0.12 },
        { r: radius * 0.85, alpha: 0.08 },
        { r: radius * 0.55, alpha: 0.07 },
        { r: radius * 0.30, alpha: 0.06 },
      ];

      glowConfigs.slice(0, glowLayers).forEach(({ r, alpha }) => {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0,   `rgba(${color}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(${color}, ${alpha * 0.4})`);
        grad.addColorStop(1,   `rgba(${color}, 0)`);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // ── 2. The arc stroke itself ─────────────────────────────────────────────
      // Draw multiple concentric strokes with decreasing width + opacity
      // to simulate a natural bloom/glow around the arc line.
      const strokeLayers = [
        { width: 28, alpha: 0.04  },
        { width: 14, alpha: 0.09  },
        { width:  6, alpha: 0.20  },
        { width:  2, alpha: 0.55  },
        { width:  1, alpha: 0.80  },
      ];

      strokeLayers.forEach(({ width, alpha }) => {
        ctx.beginPath();
        // Draw only the top half — π to 0 (left foot → top → right foot)
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.lineWidth   = width;
        ctx.lineCap     = 'round';
        ctx.stroke();
      });

      // ── 3. Bright apex spot at the very top of the arc ──────────────────────
      const apexX = cx;
      const apexY = cy - radius; // top of the semicircle
      const apexGrad = ctx.createRadialGradient(apexX, apexY, 0, apexX, apexY, radius * 0.35);
      apexGrad.addColorStop(0,   `rgba(${color}, 0.35)`);
      apexGrad.addColorStop(0.4, `rgba(${color}, 0.10)`);
      apexGrad.addColorStop(1,   `rgba(${color}, 0)`);

      ctx.beginPath();
      ctx.arc(apexX, apexY, radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = apexGrad;
      ctx.fill();
    }

    draw();

    // Re-draw on resize
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [color, arcWidthPct, glowLayers]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      'absolute',
        inset:          0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        opacity,
        display:       'block',
      }}
    />
  );
}
