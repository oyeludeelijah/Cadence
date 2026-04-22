import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import LandingNav from '../components/landing/LandingNav';
import LandingFooter from '../components/landing/LandingFooter';
import AmbientOrbs from '../components/landing/AmbientOrbs';
import TiltCard from '../components/landing/TiltCard';
import StatNumber from '../components/landing/StatNumber';
import ParticlesBackground from '../components/landing/ParticlesBackground';
import '../pages/landing.css';

/* ── Small reusable reveal wrapper ─────────────────────────────────────── */
function Reveal({ children, delay = 0 }) {
  const ref = useReveal(0.1);
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const handleScroll = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp-page">
      <LandingNav />

      <main>
        {/* ── SECTION 1: HERO ────────────────────────────────────────────── */}
        <section className="lp-hero" id="hero">
          {/* Layer 0a: Ambient drifting colour orbs — pure CSS */}
          <AmbientOrbs variant="hero" />
          {/* Layer 0b: Canvas particle system — GPU RAF loop */}
          <ParticlesBackground />
          <div className="lp-wrap lp-hero-inner">
            <div className="lp-hero-eyebrow">
              <span className="lp-hero-eyebrow-dot" />
              Cadence — Checkpoint Intelligence
            </div>

            <h1 className="lp-hero-h1">
              Stop{' '}
              <span className="lp-orange-text">Abandoning</span>
              <br />
              Your Assignments
            </h1>

            <p className="lp-hero-sub">
              We bridge the gap between intent and completion using AI-generated
              checkpoints and real-time urgency tracking.
            </p>

            <div className="lp-hero-actions">
              <button
                className="lp-btn-primary"
                onClick={() => navigate('/auth')}
              >
                Get Started — It's Free
              </button>
              <button
                className="lp-btn-secondary"
                onClick={() => handleScroll('how-it-works')}
              >
                See How It Works ↓
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: PROBLEM ─────────────────────────────────────────── */}
        <section className="lp-section" id="problem">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header">
                <span className="lp-eyebrow">The Problem</span>
                <h2 className="lp-section-h">The Cognitive Friction</h2>
                <p className="lp-section-sub">
                  Academic burnout isn't a lack of discipline. It's a failure
                  of system architecture. We target the two primary failure points.
                </p>
              </div>
            </Reveal>

            <div className="lp-problem-grid">
              <Reveal delay={0}>
                <TiltCard className="lp-card">
                  <div className="lp-card-icon">⏳</div>
                  <h3>Temporal Discounting</h3>
                  <p>
                    Your brain devalues future rewards. A deadline three weeks away
                    feels abstract — until it's tomorrow night and you're in crisis
                    mode. AI Accountability creates artificial urgency before the
                    panic sets in.
                  </p>
                </TiltCard>
              </Reveal>
              <Reveal delay={80}>
                <TiltCard className="lp-card">
                  <div className="lp-card-icon">🔀</div>
                  <h3>Decision Fatigue</h3>
                  <p>
                    Choosing <em>what</em> to work on consumes the same energy
                    needed to actually work. The system eliminates that choice
                    entirely — serving you the single next action at the perfect time.
                  </p>
                </TiltCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: HOW IT WORKS ────────────────────────────────────── */}
        <section className="lp-section-alt" id="how-it-works">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">The Workflow</span>
                <h2 className="lp-section-h">How It Works</h2>
                <p className="lp-section-sub">
                  Three steps. No planning required.
                </p>
              </div>
            </Reveal>

            <div className="lp-steps-row">
              <Reveal delay={0}>
                <div className="lp-step">
                  <div className="lp-step-num">📄</div>
                  <div className="lp-step-title">Create Your Task</div>
                  <p className="lp-step-body">
                    Give the AI your assignment title, type (essay, problem set,
                    exam prep), and deadline. That's all it needs.
                  </p>
                </div>
              </Reveal>

              <div className="lp-step-arrow">→</div>

              <Reveal delay={100}>
                <div className="lp-step">
                  <div className="lp-step-num active">✨</div>
                  <div className="lp-step-title">AI Builds Your Plan</div>
                  <p className="lp-step-body">
                    The Llama 3.1 model generates a personalised checkpoint
                    roadmap in under 5 seconds — contextual, not generic.
                  </p>
                </div>
              </Reveal>

              <div className="lp-step-arrow">→</div>

              <Reveal delay={200}>
                <div className="lp-step">
                  <div className="lp-step-num">✅</div>
                  <div className="lp-step-title">Work Through It</div>
                  <p className="lp-step-body">
                    Each checkpoint has a due date and a status. Complete them
                    one by one. The system keeps you honest.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FEATURES ────────────────────────────────────────── */}
        <section className="lp-section" id="features">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header">
                <span className="lp-eyebrow">Features</span>
                <h2 className="lp-section-h">
                  Built for the way students actually work
                </h2>
              </div>
            </Reveal>

            <div className="lp-features-grid">
              {[
                {
                  icon: '🤖',
                  title: 'AI Checkpoint Generation',
                  body: 'Powered by the Llama 3.1 8B Instruct model via NVIDIA NIM. Generates contextual, task-specific checkpoints — not generic templates.',
                },
                {
                  icon: '🎯',
                  title: '4-State Urgency Tracking',
                  body: 'Every checkpoint is classified as Pending, Urgent, Overdue, or Completed in real time. You always know exactly where you stand.',
                },
                {
                  icon: '⏪',
                  title: 'Accountability Undo Window',
                  body: 'Mark a checkpoint complete and get 10 seconds to change your mind. After that, it locks. Progress should mean something.',
                },
                {
                  icon: '🛡️',
                  title: 'Intelligent Fallback',
                  body: 'If the AI is unavailable, the system falls back to predefined templates silently. Task creation never fails.',
                },
              ].map(({ icon, title, body }, i) => (
                <Reveal key={title} delay={i * 60}>
                  <TiltCard className="lp-card">
                    <div className="lp-card-icon">{icon}</div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: STATS ───────────────────────────────────────────── */}
        <section className="lp-section-alt" id="stats">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">By the Numbers</span>
                <h2 className="lp-section-h">Engineered for reliability</h2>
              </div>
            </Reveal>

            <div className="lp-stats-row">
              {[
                { end: 3,   prefix: '',  suffix: '',  label: 'Task types supported',      duration: 1200 },
                { end: 5,   prefix: '<', suffix: 's', label: 'Average AI response time',  duration: 1500 },
                { end: 100, prefix: '',  suffix: '%', label: 'Tasks created successfully', duration: 2000 },
              ].map(({ end, prefix, suffix, label, duration }, i) => (
                <Reveal key={label} delay={i * 80}>
                  <TiltCard className="lp-stat-card" maxTilt={4} scaleOnHover={1.04}>
                    <StatNumber end={end} prefix={prefix} suffix={suffix} duration={duration} />
                    <p className="lp-stat-label">{label}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 6: CTA BANNER ──────────────────────────────────────── */}
        <section className="lp-section" id="cta">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-cta-banner">
                <h2>Ready to stop procrastinating?</h2>
                <p>Join students who are finishing what they start.</p>
                <div className="lp-cta-banner-actions">
                  <a
                    className="lp-btn-primary"
                    href="https://elijah-fyp.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open the App ↗
                  </a>
                  <button
                    className="lp-btn-secondary"
                    onClick={() => navigate('/features')}
                  >
                    Explore Features
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
