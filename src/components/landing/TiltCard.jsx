/**
 * TiltCard — Physics-based mouse-tracking 3D tilt wrapper.
 *
 * Uses Framer Motion's useMotionValue + useTransform + useSpring:
 *   1. Mouse position is tracked relative to the card's center (normalized -0.5 → 0.5)
 *   2. useTransform maps normalized coords to rotation degrees
 *   3. useSpring adds mass/damping so the card trails the cursor with physics drag
 *   4. On mouseLeave, values reset to 0 — spring settles the card back flat
 *
 * Props:
 *   className  — forwarded to the motion.div (e.g. "lp-card")
 *   style      — forwarded style object
 *   maxTilt    — max rotation in degrees (default 7). Lower = subtler.
 *   scaleOnHover — scale factor on hover (default 1.03)
 *   children   — card content
 */
import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

const SPRING_CONFIG = {
  stiffness: 160,
  damping:    18,
  mass:        0.5,
};

// Detected once at module load — no re-detection needed per render
const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function TiltCard({
  children,
  className = '',
  style = {},
  maxTilt = 7,
  scaleOnHover = 1.05,
}) {
  // If the user prefers reduced motion, skip ALL spring/tilt logic and
  // render a plain div — zero Framer Motion overhead, fully accessible.
  if (REDUCED_MOTION) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const ref = useRef(null);

  // Raw mouse offset values — updated on every mousemove
  const mouseX = useMotionValue(0); // normalized -0.5 → 0.5
  const mouseY = useMotionValue(0);

  // Map normalized position → rotation degrees
  // When mouse is right (+0.5) → card tilts right (rotateY positive)
  // When mouse is top  (-0.5) → card tilts back (rotateX positive)
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]);

  // Wrap in springs for physics-based trailing
  const springRotateX = useSpring(rotateX, SPRING_CONFIG);
  const springRotateY = useSpring(rotateY, SPRING_CONFIG);
  const springScale   = useSpring(1, SPRING_CONFIG);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect    = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;

    // Normalize to -0.5 → 0.5
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseEnter = () => springScale.set(scaleOnHover);

  const handleMouseLeave = () => {
    // Reset — spring physics handles the smooth settle-back
    mouseX.set(0);
    mouseY.set(0);
    springScale.set(1);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        rotateX: springRotateX,
        rotateY: springRotateY,
        scale:   springScale,
        // Depth perspective — makes the 3D rotation look convincing
        transformPerspective: 900,
        // Needed for nested 3D elements to preserve depth
        transformStyle: 'preserve-3d',
        // Ensures Framer Motion's transform takes over — no CSS transform conflict
        willChange: 'transform',
        // Disable the CSS :hover transform on lp-card so it doesn't fight FM
        cursor: 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}
