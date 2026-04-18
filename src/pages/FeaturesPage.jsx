import { useReveal } from '../hooks/useReveal';
import LandingNav from '../components/landing/LandingNav';
import LandingFooter from '../components/landing/LandingFooter';
import '../pages/landing.css';

function Reveal({ children, delay = 0 }) {
  const ref = useReveal(0.1);
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const CORE_FEATURES = [
  {
    icon: '🤖',
    title: 'AI Checkpoint Generation',
    body1: 'Powered by Meta\'s Llama 3.1 8B Instruct model via NVIDIA NIM — one of the fastest open-weight models available. When you create a task, the system composes a structured prompt with your title, task type, and deadline, and receives a complete checkpoint plan in under 5 seconds.',
    body2: 'Unlike generic to-do apps, the AI understands academic context. An essay gets a different checkpoint structure than an exam revision session. The plan is always proportional to your available time.',
    body3: 'Every AI-generated checkpoint is marked with a badge so you can always distinguish AI plans from template fallbacks.',
    visual: (
      <div className="lp-feature-visual-inner">
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          AI-Generated Plan — 3000-word Essay
        </div>
        {['Research & outline ✨', 'Thesis statement ✨', 'First draft ✨', 'Revise & edit ✨', 'Final submission ✨'].map((cp, i) => (
          <div key={i} className={`lp-demo-checkpoint ${i === 0 ? 'done' : i === 1 ? 'urgent' : 'pending'}`}>
            <span>{i === 0 ? '✓' : i === 1 ? '!' : '○'}</span>
            <span>{cp}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '🎯',
    title: '4-State Urgency Tracking',
    body1: 'Every checkpoint passes through four states: Pending (on track), Urgent (due within 24 hours), Overdue (missed and incomplete), and Completed. The status is computed in real time on every render — no polling, no manual refresh.',
    body2: 'Overdue checkpoints surface prominent warning banners you can\'t ignore. Urgent items are highlighted in amber. The visual hierarchy is intentional — it creates the psychological pressure needed to overcome present bias.',
    body3: 'Tasks also auto-complete: if all their checkpoints are marked done, the parent task transitions to completed automatically.',
    visual: (
      <div className="lp-feature-visual-inner">
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Checkpoint Status Board
        </div>
        {[
          { label: '● Completed', cls: 'done',    text: 'Research notes' },
          { label: '▲ Urgent',    cls: 'urgent',  text: 'Outline (due in 4h)' },
          { label: '○ Pending',   cls: 'pending', text: 'First draft' },
          { label: '○ Pending',   cls: 'pending', text: 'Revision' },
        ].map(({ label, cls, text }, i) => (
          <div key={i} className={`lp-demo-checkpoint ${cls}`}>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{label.split(' ')[0]}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '⏪',
    title: 'Accountability Undo Window',
    body1: 'Marking a checkpoint complete triggers a 10-second countdown toast. During that window you can undo the action with one click. After 10 seconds, the completion locks in permanently and cannot be reversed.',
    body2: 'This is a deliberate behavioral design decision, not a convenience feature. It forces you to be intentional. Accidental taps are forgiven; deliberate revisionism is not.',
    body3: 'The timer persists across page refreshes via sessionStorage — so navigating away doesn\'t reset the countdown or give you an escape hatch.',
    visual: (
      <div className="lp-feature-visual-inner" style={{ textAlign: 'center', padding: 'var(--s5)' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>7</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>seconds to undo</div>
        <div style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--r-pill)', padding: '10px 20px', color: '#a5b4fc', fontSize: 13, display: 'inline-block' }}>
          "First draft" marked complete — Tap to undo
        </div>
        <div style={{ marginTop: 16, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '70%', background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: 4 }} />
        </div>
      </div>
    ),
  },
  {
    icon: '🛡️',
    title: 'Intelligent Fallback',
    body1: 'The AI call has a 20-second hard timeout enforced by AbortController. If it times out, errors, or returns a malformed response, the system silently falls back to curated checkpoint templates stored in Supabase.',
    body2: 'Users never see an error. The task is always created. Fallback checkpoints are marked with a different badge so you can see which path was taken — but the experience is never broken.',
    body3: 'This resilience is critical for a prototype: NVIDIA NIM free tier can be slow or unavailable. The fallback ensures the core use case always works, regardless of AI availability.',
    visual: (
      <div className="lp-feature-visual-inner">
        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System Reliability</div>
        {[
          { label: 'AI Generation',  pct: 92, color: 'var(--success)' },
          { label: 'Template Fallback', pct: 8, color: 'var(--warning)' },
          { label: 'Task Failure',     pct: 0, color: 'var(--danger)'  },
        ].map(({ label, pct, color }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-2)' }}>{label}</span>
              <span style={{ color, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

const ADDITIONAL = [
  { icon: '🕘', title: 'Working Hours Scheduling',    body: 'Checkpoints are automatically adjusted to land between 9 AM–9 PM. No 3 AM deadlines.' },
  { icon: '🌙', title: 'Dark / Light Mode',           body: 'Full theme support with anti-FOUC — no flash on load, persisted to localStorage.' },
  { icon: '📱', title: 'Mobile Responsive',           body: 'The full app works on any device at 768px breakpoint with bottom-sheet modals.' },
  { icon: '🚀', title: 'Deployed on Vercel',          body: 'Always accessible from any device. Live at elijah-fyp.vercel.app with zero downtime deploys.' },
  { icon: '📧', title: 'Automated Email Reminders',   body: 'Supabase Edge Functions ping hourly via pg_cron and send reminders through Resend API.' },
  { icon: '🔒', title: 'Row-Level Security',          body: 'Supabase RLS ensures users can only ever read and write their own tasks and checkpoints.' },
];

const TECH_STACK = [
  { icon: '⚛️',  name: 'React 19'     },
  { icon: '⚡',  name: 'Vite'         },
  { icon: '🗄️',  name: 'Supabase'     },
  { icon: '🤖',  name: 'NVIDIA NIM'   },
  { icon: '🦙',  name: 'Llama 3.1 8B' },
  { icon: '▲',   name: 'Vercel'       },
  { icon: '🎨',  name: 'Vanilla CSS'  },
];

export default function FeaturesPage() {
  return (
    <div className="lp-page">
      <LandingNav />

      <main>
        {/* Page Hero */}
        <section className="lp-page-hero">
          <div className="lp-wrap">
            <Reveal>
              <span className="lp-eyebrow">Everything It Does</span>
              <h1 className="lp-section-h" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
                Everything the<br />system does
              </h1>
              <p className="lp-section-sub">
                Designed around behavioral science. Built with modern AI.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Core Features — expanded */}
        {CORE_FEATURES.map(({ icon, title, body1, body2, body3, visual }, i) => (
          <section key={title} className={i % 2 === 0 ? 'lp-section' : 'lp-section-alt'}>
            <div className="lp-wrap">
              <Reveal>
                <div className={`lp-feature-full${i % 2 !== 0 ? ' reversed' : ''}`}>
                  <div className="lp-feature-full-content">
                    <div className="lp-feature-full-icon">{icon}</div>
                    <h2 className="lp-feature-full-title">{title}</h2>
                    <p className="lp-feature-full-body">{body1}</p>
                    <p className="lp-feature-full-body">{body2}</p>
                    <p className="lp-feature-full-body" style={{ marginBottom: 0 }}>{body3}</p>
                  </div>
                  <div className="lp-feature-visual">
                    {visual}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        ))}

        {/* Additional Features */}
        <section className="lp-section">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header">
                <span className="lp-eyebrow">Also Included</span>
                <h2 className="lp-section-h">More out of the box</h2>
              </div>
            </Reveal>
            <div className="lp-add-features">
              {ADDITIONAL.map(({ icon, title, body }, i) => (
                <Reveal key={title} delay={i * 50}>
                  <div className="lp-add-feature">
                    <div className="lp-add-feature-icon">{icon}</div>
                    <div>
                      <h4>{title}</h4>
                      <p>{body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="lp-section-alt">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">Stack</span>
                <h2 className="lp-section-h">What it's built with</h2>
              </div>
            </Reveal>
            <div className="lp-tech-grid">
              {TECH_STACK.map(({ icon, name }, i) => (
                <Reveal key={name} delay={i * 40}>
                  <div className="lp-tech-item">
                    <div className="lp-tech-item-icon">{icon}</div>
                    <p className="lp-tech-item-name">{name}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
