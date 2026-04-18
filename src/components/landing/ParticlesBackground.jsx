/**
 * ParticlesBackground — "AI Dust" floating particle system.
 *
 * Architecture (Frontend Developer):
 *   - A single <canvas> element holds ALL particles — no DOM node per particle.
 *   - requestAnimationFrame drives the loop entirely on the GPU compositor thread.
 *   - Mouse repulsion is calculated per-frame using direct vector math (no physics lib).
 *   - Sinusoidal wobble per particle: each has its own phase + frequency so no two
 *     particles ever move identically — it looks organic, not robotic.
 *   - On unmount, the RAF ID and all event listeners are fully cleaned up.
 *   - prefers-reduced-motion: canvas renders nothing and immediately returns.
 *
 * Visual design (UI Designer):
 *   - Particle radius: 0.6–1.8px → they read as dust/light, not circles.
 *   - Opacity range: 0.08–0.43 → enough to see in layers without cluttering text.
 *   - 35% of particles get a teal tint (brand colour), 65% are pure white.
 *     This subconsciously aligns the "atmosphere" with your brand palette.
 *   - Drift direction: strictly upward. AI/tech sites use upward drift because it
 *     subconsciously reads as "data flowing" / "ideas rising" rather than "confetti".
 *   - Mouse repulsion radius: 120px — wide enough to feel responsive but not aggressive.
 */
import { useRef, useEffect } from 'react';

// ── Tuning Constants ─────────────────────────────────────────────────────────
// Mobile GPUs are significantly weaker — drop particle count to avoid frame drops.
// Detected once at module load; changing viewport size mid-session keeps the
// original count (acceptable — a hard refresh on a resized window would re-detect).
const PARTICLE_COUNT =
  typeof window !== 'undefined' && window.innerWidth < 768 ? 25 : 65;

const MOUSE_RADIUS        = 120;   // px — interaction detection radius
const REPULSION_STRENGTH  = 2.8;   // multiplier — how hard particles flee
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory — creates one particle randomised within the canvas dimensions.
 * Called once per particle on init and whenever the canvas resizes.
 */
function spawnParticle(w, h, startAnywhere = true) {
  return {
    x:           Math.random() * w,
    y:           startAnywhere ? Math.random() * h : h + Math.random() * 20,
    radius:      Math.random() * 1.2 + 0.6,             // 0.6 → 1.8 px
    alpha:       Math.random() * 0.35 + 0.08,           // 0.08 → 0.43
    baseVx:      (Math.random() - 0.5) * 0.25,          // slight horizontal drift
    baseVy:      -(Math.random() * 0.35 + 0.12),        // upward: -0.12 → -0.47
    wobblePhase: Math.random() * Math.PI * 2,           // random start phase
    wobbleFreq:  Math.random() * 0.007 + 0.002,         // individual oscillation rate
    wobbleAmp:   Math.random() * 0.25 + 0.08,           // oscillation width in px
    teal:        Math.random() < 0.35,                  // 35% brand teal, 65% white
  };
}

// ── prefers-reduced-motion — detected once at module load ───────────────────
const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ParticlesBackground() {
  const canvasRef    = useRef(null);
  const mouseRef     = useRef({ x: -9999, y: -9999 }); // off-screen default
  const rafRef       = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    // Respect reduced motion — render nothing, just bail out cleanly.
    if (REDUCED_MOTION) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Resize handler — syncs canvas pixel dimensions to CSS size ──────────
    // canvas.width/height ≠ CSS width/height. We must set both correctly
    // or particles will render at wrong coordinates on high-DPI screens.
    const resize = () => {
      const rect    = canvas.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
      // Re-scatter existing particles into the new bounds
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        spawnParticle(canvas.width, canvas.height, true)
      );
    };

    // ── Mouse tracking — stored in a ref (not state) to avoid re-renders ───
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    // Attach listeners
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    // Reset when cursor leaves the page entirely
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    // ── RAF animation loop ──────────────────────────────────────────────────
    let frame = 0;

    function tick() {
      const { width, height } = canvas;
      const mouse             = mouseRef.current;
      const particles         = particlesRef.current;

      // Clear last frame
      ctx.clearRect(0, 0, width, height);
      frame++;

      particles.forEach((p) => {
        // 1. Sinusoidal wobble — each particle oscillates at its own frequency
        const wobble = Math.sin(frame * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp;

        // 2. Mouse repulsion — inverse linear falloff within MOUSE_RADIUS
        const dx   = p.x - mouse.x;
        const dy   = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let repelX = 0;
        let repelY = 0;

        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * REPULSION_STRENGTH;
          repelX = (dx / dist) * force;
          repelY = (dy / dist) * force;
        }

        // 3. Update position
        p.x += p.baseVx + wobble + repelX;
        p.y += p.baseVy         + repelY;

        // 4. Boundary wrapping
        //    Y: when particle drifts above top → respawn at bottom
        if (p.y < -p.radius * 3) {
          p.y = height + p.radius * 2;
          p.x = Math.random() * width;
        }
        //    X: wrap left/right with a buffer so particles don't pop into view
        if (p.x < -20) p.x = width  + 20;
        if (p.x > width  + 20) p.x = -20;

        // 5. Draw — a soft, faint circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.teal
          ? `rgba(100, 220, 170, ${p.alpha})`   // Brand teal
          : `rgba(255, 255, 255, ${p.alpha})`;  // Pure white
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    // ── Cleanup — critical to prevent memory leaks on route changes ─────────
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []); // runs once on mount

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',    // mouse events pass through to content below
        zIndex:        0,
        display:       REDUCED_MOTION ? 'none' : 'block',
      }}
    />
  );
}
